# Unity Agent Kit Phase 5A-06 Loopback Shutdown Redesign 设计规格

**目标：** 为 Phase 5A-06 task 4.2 重新设计 loopback HTTP server shutdown 边界，停止 task 4.1 的补丁循环，并用清晰的 lifecycle ownership 覆盖 stop-window、reload/quitting、guarantee-range handler、async write 和 listener close 竞态。

**非目标：** 不重写 RuntimeHost；不替换 `HttpListener`；不引入 listener adapter / fake driver；不实现 TS client、MCP public tools、vertical smoke、workflow timeout 或 public action logic；不恢复 5A-06 completed wording。

**输入：**
- Roadmap：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- Execution plan：`docs/superpowers/plans/2026-05-20-unity-agent-kit-phase-5a-06-main-thread-dispatch-timeout.md`
- Runtime code：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- Dispatch code：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- Runtime tests：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs` and `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

---

## 已确认决策

| 类别 | 决策 |
|---|---|
| Stopped envelope 边界 | 只严格保证已被 `HttpListener.GetContext()` 返回、path/method 为 `/operations POST`、且 body 完整可读取的 request。Stop 后尚未被 listener 接收的新连接，以及 accepted 但 body incomplete/stalled 的请求，不承诺 stopped envelope。 |
| Listener 路线 | 保留同步 `HttpListener.GetContext()`，不切换异步 accept，不引入 adapter。 |
| Stop 返回语义 | `Stop(...)` 统一异步返回：发起 shutdown、发 wake、启动 close worker 后尽快返回。 |
| 4.1 补丁处理 | 保留有价值的行为测试和 stopped envelope 行为；替换 post-`GetContext()` counter 等失败边界机制。 |
| 设计方案 | 采用 `ListenerState`-owned lifecycle coordinator。 |

---

## RuntimeHost 复杂度边界

当前目标不是扩大 RuntimeHost 架构，而是减少 task 4.1 patch loop 造成的分散状态和隐式 ownership。

Phase 5A-06 的 RuntimeHost 职责本身仍是必要边界：Unity main-thread dispatch、host-level timeout、stop/reload/quitting cleanup、HTTP lifecycle 都属于当前 host runtime foundation。过度复杂来自 shutdown 实现方式：多个 static counter/event、test hook 和补丁式 admission gate 分散在 server 类中，使 review 难以证明 ownership 成对释放。

4.2 的设计约束是：把已经存在的 shutdown lifecycle 复杂度收敛到 `ListenerState`，不引入通用 lifecycle framework，不增加 TS 或 MCP 层能力。

---

## 架构

`ListenerState` 是 loopback listener lifecycle 的唯一 owner。它统一持有 guarantee-range shutdown ownership：

- stop reason；
- accepting / stopping / closed 状态；
- accept reservation count；
- guaranteed `/operations` handler count；
- guaranteed async write count；
- listener-loop-exited signal；
- close-idle signal。

Wake、`/probe`、unknown path、wrong method、accepted `/operations` incomplete/stalled body 等非保证范围请求不进入 close worker 的 drain ownership；它们必须快速释放或 abort，不能延迟 final close。

`Stop(...)` 不再直接判断多个全局 counter 后 close listener。它只执行：

1. 读取并清空 `_currentState`；
2. `state.BeginStopping(reason)`；
3. `UnityAgentKitMainThread.Stop(reason)`；
4. `state.RequestWake()`；
5. schedule background close worker；
6. 返回。

`ListenLoop` 保留同步 `GetContext()`，但进入 `GetContext()` 前必须先登记 accept reservation。`GetContext()` 返回后，reservation 必须按请求类别处理：guarantee-range `/operations POST` with complete readable body 转移为 guaranteed handler ownership；wake / non-guarantee routes / incomplete or stalled body 快速释放 reservation 并退出或 abort，不加入 drain ownership。loop 退出时必须设置 listener-loop-exited signal。

Background close worker 只在以下条件同时满足后 final close：

- listener loop 已退出；
- accept reservation count 为 0；
- guaranteed `/operations` handler count 为 0；
- guaranteed async write count 为 0。

---

## 状态机

```text
accepting
→ stopping
→ wake requested
→ listener-loop-exited
→ draining
→ closed
```

状态含义：

- `accepting`：正常接受请求；每次进入 `GetContext()` 前登记 accept reservation。
- `stopping`：Stop 已开始；不再允许新业务请求进入 normal dispatch。
- `wake requested`：Stop 已发内部 loopback wake request，用于唤醒阻塞中的 `GetContext()`。
- `listener-loop-exited`：listen loop 已停止接受新 context。
- `draining`：close worker 等待 accept reservations、guaranteed `/operations` handlers 和 guaranteed async writes 稳定归零。
- `closed`：final listener close/dispose 完成，close idle signal 置位。

核心不变量：

1. 进入 `GetContext()` 前必须已经持有 accept reservation。
2. `GetContext()` 返回且 body 完整可读取的 `/operations POST` context 必须转移为 guaranteed handler ownership；non-guarantee routes 和 incomplete/stalled body 不加入 drain ownership。
3. Stop 后已接收且 body 完整可读取的 valid `/operations` 返回 `failed + host.stopped*`，不能进入 normal main-thread dispatch。
4. Final close 不能抢在 guarantee-range accepted `/operations` stopped envelope 写入前发生。
5. Stop 在 captured Unity main thread 和非主线程上都统一异步返回。

---

## 请求数据流

正常 `/operations`：

```text
EnterAcceptReservation
→ GetContext
→ AdmitAcceptedOperationContext
→ HandleOperation
→ UnityAgentKitMainThread.Enqueue or UnityAgentKitOperationRouter.Route
→ WriteJson / QueueWriteJson
→ ReleaseGuaranteedHandler
```

Stop 后已接收且 body 完整可读取的 `/operations POST`：

```text
EnterAcceptReservation
→ GetContext returns context
→ Stop sets stopping
→ read complete body
→ AdmitAcceptedOperationContext
→ parse request body
→ UnityAgentKitOperationRouter.Stopped(request, record, reason)
→ WriteJson / QueueWriteJson(failed + host.stopped*)
→ ReleaseGuaranteedHandler
```

Stop 后已接收但 body incomplete/stalled 的 `/operations POST` 不进入 guaranteed handler ownership；它可以 abort 或沿用现有 body/read error behavior，但不能阻塞 final close。

Wake request：

```text
Stop
→ state.BeginStopping(reason)
→ state.RequestWake()
→ internal loopback wake request reaches GetContext()
→ ListenLoop observes stopping / wake path
→ no normal dispatch
→ MarkListenerLoopExited
→ close worker drains and final closes
```

Wake failure fallback：

- If wake fails because the listener is already closed/disposed, close worker observes that state and marks listener-loop-exited / closed as appropriate.
- If wake cannot complete its bounded internal attempt, close worker may use listener close/abort only to unblock synchronous `GetContext()` for non-guarantee accept state.
- Wake failure fallback must not expand stopped envelope guarantees beyond complete readable accepted `/operations POST` requests.

---

## Component API 设计

`ListenerState` 建议提供以下内部 API。最终实现可以用小型 lease object 或 `try/finally` 方法表达，不要求引入公共抽象。

```csharp
BeginStopping(reason)
TryEnterAcceptReservation()
LeaveAcceptReservation()
AdmitAcceptedOperationContext(context) // transfers complete readable /operations POST to guaranteed handler ownership
ReleaseGuaranteedHandler()
TrackGuaranteedAsyncWrite()
ReleaseGuaranteedAsyncWrite()
RequestWake()
MarkListenerLoopExited()
WaitUntilSafeToClose()
MarkClosed()
```

API 设计原则：

- 每个 guarantee-range ownership acquire 都必须有对应 release。
- Non-guarantee routes 和 incomplete/stalled body 不能 acquire drain ownership；它们只能释放 accept reservation 后快速返回或 abort。
- Stop reason 只由 `BeginStopping` 写入，所有 stopped envelope 读取同一个 reason。
- `UnityAgentKitMainThread.Stop(reason)` 继续负责 pending dispatch completion 和 timer disposal。
- Test-only instrumentation 必须围绕状态机边界，不能重新制造分散 ownership。

---

## Error handling 与边界行为

Stop 后已接收且 body 完整可读取的 `/operations POST`：

- empty body：沿用现有 400 empty body 行为；
- malformed JSON：沿用现有 400 malformed JSON 行为；
- valid request：返回 `200 failed + host.stopped*`；
- dispatch-required operation：不得进入 `UnityAgentKitMainThread.Enqueue`；
- pending dispatch timeout：不得被 late timeout 覆盖 stopped result。

Stop 后已接收但 body incomplete/stalled 的 `/operations POST`：

- 不承诺 stopped envelope；
- 不 acquire drain ownership；
- 可以 abort 或沿用现有 body/read error behavior；
- 不能阻塞 final close。

非 `/operations` shutdown 行为：

- wake path 只用于唤醒 listener loop，不进入 normal dispatch；
- wake failure fallback 只能用于解除 non-guarantee accept blocking，不能扩大 stopped envelope guarantees；
- `/probe`、unknown path、wrong method、incomplete/stalled body 不承诺 stopped envelope；
- shutdown 中可 abort 非保证范围请求；
- 非保证范围请求不 acquire drain ownership，不能阻塞 close worker。

Async write error handling：

- HTTP close/dispose 类异常可以吞掉；
- 未知异常保留 warning；
- 异常不能跳过 ownership release。

---

## 测试策略

4.2 必须先写 red tests，再改 production code。Red tests 必须证明当前 4.1 补丁形态不能满足 4.2 设计边界，尤其是 post-`GetContext()` counter 漏洞。

测试组：

1. **Accept reservation**
   - listener 进入 `GetContext()` 前已有 reservation；
   - Stop 不会在 reservation 未释放时 final close。

2. **Stopped envelope for accepted `/operations`**
   - 已被 `GetContext()` 返回的 `/operations` 在 stopping 后返回 `failed + host.stopped*`；
   - 不进入 normal main-thread dispatch queue；
   - 不 timeout，不 connection abort。

3. **Deterministic wake / listener-loop-exited**
   - Stop 发 wake request；
   - wake 不进入 dispatch；
   - ListenLoop 退出后设置 listener-loop-exited signal；
   - wake failure fallback 不扩大 stopped envelope guarantees；
   - close worker 等该 signal，或在 listener already gone / non-guarantee accept unblock fallback 后完成 close。

4. **Nonblocking Stop**
   - `Stop(...)` 统一异步返回；
   - captured Unity main thread 不等待 drain/close；
   - 测试通过 explicit close signal 等待最终 close。

5. **Stable drain**
   - guarantee-range `/operations` handler 在 close worker 初次观察 async idle 后 enqueue guaranteed async write 时，close worker 仍等待该 async write；
   - non-guarantee routes 不进入 drain ownership；
   - drain 终止条件是稳定归零，不是单次检查。

6. **Reason codes**
   - `host.stopped`、`host.stopped_for_reload`、`host.editor_quitting` 必须透传到 stopped envelope；
   - stopped completion 后不能变成 `host.dispatch_timeout`。

最终验证命令：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode \
  -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml" \
  -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests \
  -projectPath unity \
  -logFile -
```

验收要求：

- result XML contains `result="Passed"` and `failed="0"`；
- XML includes 4.2 evidence test names；
- `unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml` remains pre-redesign historical evidence；
- spec review passes；
- code quality review passes；
- before all gates pass, roadmap completion wording must not be restored.

---

## Plan / roadmap 同步边界

- 5A-06 remains in progress until task 4.2 implementation, verification, spec review and code quality review pass.
- The execution plan should cite this spec as task 4.2 design source of truth.
- Roadmap Current State should remain redesign-oriented until final evidence passes.
- The final evidence path remains `unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml` to avoid conflicting historical XML paths.
