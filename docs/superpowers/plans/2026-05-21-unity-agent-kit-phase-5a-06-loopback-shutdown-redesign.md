# Unity Agent Kit Phase 5A-06 Loopback Shutdown Redesign 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5A-06 task 4.2 的 loopback HTTP shutdown lifecycle redesign，使 accepted、complete/readable `/operations POST` 在 Stop 后返回 stopped envelope，并避免继续 task 4.1 patch loop。

**架构：** 保留同步 `HttpListener.GetContext()`，但把 shutdown lifecycle ownership 收敛到 `ListenerState`。`ListenLoop` 在进入 `GetContext()` 前登记 accept reservation；complete/readable `/operations POST` 转移为 guaranteed handler ownership；Stop 统一异步返回并通过 deterministic wake、listener-loop-exited signal、background closer 和 stable drain 完成 close。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity coroutine tests (`UnityEngine.TestTools`)、`HttpListener` loopback HTTP、`ManualResetEventSlim`、`ThreadPool`、`HttpWebRequest` test helpers。
**拆分检查：** 已检查；无需拆分。该计划只覆盖 Unity C# loopback shutdown lifecycle，一个可独立验证的软件单元；不包含 TS client、MCP public tools、vertical smoke、workflow timeout 或 Phase 5A completion 同步。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5A
**Design Spec:** `docs/superpowers/specs/2026-05-21-unity-agent-kit-phase-5a-06-loopback-shutdown-redesign.md`
**Existing Execution Plan Context:** `docs/superpowers/plans/2026-05-20-unity-agent-kit-phase-5a-06-main-thread-dispatch-timeout.md`
**Plan Card:** 5A-06 task 4.2 — Loopback shutdown architecture redesign checkpoint

**Current Status:** completed；implementation、final Unity verification、spec compliance review 和 code quality review 已通过；Commit 步骤因未获授权而保持跳过。

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 保留 `unity-mcp-v2` 的 loopback HTTP host、operation envelope、Unity host runtime、稳定错误语义和 TS + Unity 双侧测试策略；Unity C# 只负责短主线程动作和 host runtime foundation；禁止 Unity host 长时间 `Thread.Sleep`、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程、后台线程调用 Unity API。
- **Phase Scope:** Phase 5A Host Runtime foundation。当前只修复 5A-06 loopback shutdown lifecycle：main-thread dispatch、host-level timeout、stop/reload/quitting cleanup 与 HTTP listener close 边界。
- **Phase Out-of-scope:** 不实现 TS registry/probe/invoke/rebind client；不创建 MCP public tools；不创建 vertical smoke；不创建 `/unity` skill；不实现 workflow timeout、artifact/resource store 或 public action catalog；不标记 Phase 5A/Phase 5 completed。
- **Success Criteria:** `UnityAgentKit.Editor.Tests.HostRuntimeTests` 通过；new evidence 覆盖 pre-`GetContext()` accept reservation、complete/readable accepted `/operations POST` stopped envelope、no normal dispatch enqueue in stopping、deterministic wake / listener-loop-exited、nonblocking `Stop(...)`、stable guaranteed handler/write drain、non-guarantee routes / incomplete body 不阻塞 close、reload/quitting reason codes 不变成 timeout。
- **用户确认事项:** stopped envelope 严格保证边界只包含已被 `GetContext()` 返回、path/method 为 `/operations POST` 且 body 完整可读取的 request；Stop 统一异步返回；保留同步 `GetContext()`；采用 `ListenerState`-owned lifecycle coordinator；保留有价值的 4.1 行为测试但替换 post-`GetContext()` counter 等失败边界机制。
- **本计划不包含:** 不重写 RuntimeHost；不替换 `HttpListener`；不引入 listener adapter / fake driver；不扩大 stopped envelope guarantee；不提交 `.superpowers/` 视觉伴侣临时文件；review gates 通过前不恢复 5A-06 completed wording。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-21-unity-agent-kit-phase-5a-06-loopback-shutdown-redesign.md` | 采用 `ListenerState` ownership、accepted complete/readable `/operations POST` guarantee、wake fallback、non-guarantee routes 不阻塞 close、完整 HostRuntimeTests 验证 | 不采用 adapter/fake driver、不扩大 stopped envelope 到所有 Stop 后新连接 | 用户已选择最小架构收敛，不做框架化重写 | 任务 1-6 |
| `docs/superpowers/plans/2026-05-20-unity-agent-kit-phase-5a-06-main-thread-dispatch-timeout.md` task 4.1/4.2 | 采用 task 4.1 已暴露的 failure modes、final XML path、`HostRuntimeDispatchTests.cs` partial test location、`HostRuntimeTests` final filter | 不按 task 4.1 原 patch loop 继续执行 | task 4.1 已被 task 4.2 superseded | 任务 1、3、5、6 |
| `UnityAgentKitLoopbackHttpServer.cs` current implementation | 采用 existing URL builders、request parse helpers、JSON writer、stopped envelope flow、background close idea | 不保留 post-`GetContext()` accepted counter as strict boundary；不保留 scattered static ownership as final design | 这些是多轮 review 暴露的失败边界 | 任务 2、4、5 |
| `UnityAgentKitMainThread.cs` current implementation | 采用 `Stop(reason)` pending dispatch completion、timeout timer disposal、`IsCapturedMainThread`、enqueue instrumentation | 不修改 main-thread dispatch contract，不新增 TS/workflow timeout | 4.2 只修 loopback shutdown lifecycle | 任务 3、4、6 |
| `HostRuntimeDispatchTests.cs` / `HostRuntimeTests.cs` | 采用 existing HTTP helpers、envelope assertions、pending dispatch tests、stop/reload/quitting tests | 不保留仅证明 post-`GetContext()` counter 的测试作为最终 evidence | 4.2 要证明 pre-`GetContext()` reservation 和 guarantee ownership | 任务 1、3、5、6 |

## 文件结构

- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — 将 shutdown lifecycle ownership 收敛到 `ListenerState`；新增 accept reservation、guaranteed operation handler、guaranteed async write、listener-loop-exited、close-idle、wake request 和 wake fallback；替换 post-`GetContext()` counter / scattered static events。
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — 仅在需要时保留/复用 enqueue instrumentation；不改变 dispatch queue 语义。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs` — 放置 task 4.2 的 HTTP shutdown behavior red/green tests 和 HTTP helper extensions。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — 放置 lifecycle-level close/drain/nonblocking Stop tests 和 final evidence name validation helper updates。
- 生成：`unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml` — task 4.2 final Unity evidence。
- 不修改：TS/MCP files、vertical smoke files、public action catalog、`.superpowers/`。

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 8 分处理 |
|---|---|---:|---|
| Accept reservation | `ListenLoop` 进入 `GetContext()` 前 acquire reservation，异常/非保证路径 release | 8 | 不实现 wake/close；先修 reservation pairing |
| Complete readable operation guarantee | body 完整可读后 `/operations POST` 转为 guaranteed handler ownership，再生成 stopped envelope | 8 | 不做 final close；先修 body classification / ownership transfer |
| Non-guarantee boundary | wake、`/probe`、unknown、wrong method、incomplete/stalled body 不 acquire drain ownership | 8 | 不扩大 guarantee；补测试后再实现 close worker |
| Wake / loop exit | Stop 发 wake；wake failure fallback 只解除 non-guarantee accept blocking | 8 | 不继续 final close；先证明 listener-loop-exited/fallback |
| Nonblocking Stop | `Stop(...)` 统一异步返回，captured main thread 不等待 close/drain | 9 | 删除同步 wait；只通过 close signal 验证最终 close |
| Stable drain | close worker 等 guaranteed handlers + guaranteed writes 稳定归零 | 8 | 不恢复 completed wording；修 drain loop |
| Scope boundary | 不改 TS/MCP/vertical smoke/public actions，不标记 completed | 10 | 移除越界文件/roadmap wording |

---

## 执行前置条件

执行任务 1 前确认：

```bash
git status --short
```

预期：可能存在 pre-redesign task 4.1 code changes；执行者不得把 `.superpowers/` 加入 commit。若工作区包含不属于 5A-06 shutdown 的未知修改，先停止并询问。

---

## 任务 1：Red tests for accept reservation, wake, and loop exit

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [x] **步骤 1：编写失败测试：Stop waits for pre-`GetContext()` reservation before close**

在 `HostRuntimeDispatchTests.cs` 的 stop-window tests 附近加入：

```csharp
[Test]
public void StopWaitsForAcceptReservationBeforeClosingListener()
{
    var registryPath = TemporaryRegistryPath("stop-waits-for-accept-reservation");
    var beforeGetContext = new ManualResetEventSlim(false);
    var releaseGetContext = new ManualResetEventSlim(false);

    try
    {
        UnityAgentKitLoopbackHttpServer.BeforeGetContextHookForTests = () =>
        {
            beforeGetContext.Set();
            Assert.IsTrue(releaseGetContext.Wait(1000), "Expected test to release GetContext entry.");
        };

        UnityAgentKitHost.StartForTests(registryPath);

        Assert.IsTrue(beforeGetContext.Wait(1000), "Expected listener to hold accept reservation before GetContext.");
        Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.AcceptReservationCountForTests);

        UnityAgentKitHost.StopForTests("host.stopped");

        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(100), "Close worker must wait while accept reservation is held.");
        releaseGetContext.Set();
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected listener to close after accept reservation release.");
    }
    finally
    {
        UnityAgentKitLoopbackHttpServer.BeforeGetContextHookForTests = null;
        releaseGetContext.Set();
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 2：编写失败测试：Stop requests deterministic wake and listener loop exit**

在同一区域加入：

```csharp
[Test]
public void StopRequestsWakeAndSignalsListenerLoopExited()
{
    var registryPath = TemporaryRegistryPath("stop-wake-loop-exit");

    try
    {
        UnityAgentKitHost.StartForTests(registryPath);

        UnityAgentKitHost.StopForTests("host.stopped");

        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WakeRequestCountForTests >= 1, "Stop must issue a deterministic wake request.");
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerLoopExitedForTests(1000), "Expected listener loop exit signal after Stop wake.");
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Expected close worker to close after listener loop exit.");
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 3：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42ReservationRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.StopWaitsForAcceptReservationBeforeClosingListener -projectPath unity -logFile -
```

预期：FAIL，compiler errors mention missing `UnityAgentKitLoopbackHttpServer.BeforeGetContextHookForTests`, `AcceptReservationCountForTests`, `WakeRequestCountForTests`, or `WaitForListenerLoopExitedForTests`。该失败证明测试正在要求 4.2 的 pre-`GetContext()` reservation / wake / loop-exit boundary，而不是复用 task 4.1 post-`GetContext()` counter。

- [ ] **步骤 4：Commit red tests**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "test: cover loopback shutdown reservation wake boundary"
```

## 任务 2：Implement ListenerState lifecycle coordinator skeleton

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`

- [x] **步骤 1：实现 `ListenerState` ownership fields and test instrumentation**

在 `ListenerState` 内替换 task 4.1 的 `_handlerAdmissionGate` / `_isClosing` ownership model，加入：

```csharp
private readonly ManualResetEventSlim _acceptReservationsIdle = new ManualResetEventSlim(true);
private readonly ManualResetEventSlim _guaranteedHandlersIdle = new ManualResetEventSlim(true);
private readonly ManualResetEventSlim _guaranteedAsyncWritesIdle = new ManualResetEventSlim(true);
private readonly ManualResetEventSlim _listenerLoopExited = new ManualResetEventSlim(false);
private readonly ManualResetEventSlim _closeIdle = new ManualResetEventSlim(true);
private int _acceptReservationCount;
private int _guaranteedHandlerCount;
private int _guaranteedAsyncWriteCount;
private int _isStopping;
private int _isClosed;
private int _wakeRequestCount;
private string _stopReason = string.Empty;

internal int AcceptReservationCount => Volatile.Read(ref _acceptReservationCount);
internal int GuaranteedHandlerCount => Volatile.Read(ref _guaranteedHandlerCount);
internal int GuaranteedAsyncWriteCount => Volatile.Read(ref _guaranteedAsyncWriteCount);
internal int WakeRequestCount => Volatile.Read(ref _wakeRequestCount);
internal bool IsStopping => Volatile.Read(ref _isStopping) != 0;
internal string StopReason => Volatile.Read(ref _stopReason) ?? string.Empty;
```

- [x] **步骤 2：实现 reservation and guaranteed ownership methods**

在 `ListenerState` 内加入：

```csharp
internal bool TryEnterAcceptReservation()
{
    if (Volatile.Read(ref _isClosed) != 0)
    {
        return false;
    }

    _acceptReservationsIdle.Reset();
    Interlocked.Increment(ref _acceptReservationCount);
    return true;
}

internal void LeaveAcceptReservation()
{
    if (Interlocked.Decrement(ref _acceptReservationCount) == 0)
    {
        _acceptReservationsIdle.Set();
    }
}

internal void AdmitAcceptedOperationContext()
{
    LeaveAcceptReservation();
    _guaranteedHandlersIdle.Reset();
    Interlocked.Increment(ref _guaranteedHandlerCount);
}

internal void ReleaseGuaranteedHandler()
{
    if (Interlocked.Decrement(ref _guaranteedHandlerCount) == 0)
    {
        _guaranteedHandlersIdle.Set();
    }
}

internal void TrackGuaranteedAsyncWrite()
{
    _guaranteedAsyncWritesIdle.Reset();
    Interlocked.Increment(ref _guaranteedAsyncWriteCount);
}

internal void ReleaseGuaranteedAsyncWrite()
{
    if (Interlocked.Decrement(ref _guaranteedAsyncWriteCount) == 0)
    {
        _guaranteedAsyncWritesIdle.Set();
    }
}
```

- [x] **步骤 3：实现 stopping, wake, loop exit, and close waiting**

在 `ListenerState` 内加入：

```csharp
internal void BeginStopping(string reasonCode)
{
    Volatile.Write(ref _stopReason, string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode);
    Interlocked.Exchange(ref _isStopping, 1);
    _closeIdle.Reset();
}

internal void RequestWake()
{
    Interlocked.Increment(ref _wakeRequestCount);
    ThreadPool.QueueUserWorkItem(_ =>
    {
        try
        {
            var request = (HttpWebRequest)WebRequest.Create(UnityAgentKitLoopbackHttpServer.BuildWakeUrl(record.port));
            request.Method = "GET";
            request.Timeout = 250;
            request.ReadWriteTimeout = 250;
            using (var response = (HttpWebResponse)request.GetResponse())
            {
            }
        }
        catch (WebException)
        {
        }
        catch (ObjectDisposedException)
        {
        }
    });
}

internal void MarkListenerLoopExited()
{
    _listenerLoopExited.Set();
}

internal bool WaitForListenerLoopExited(int millisecondsTimeout)
{
    return _listenerLoopExited.Wait(millisecondsTimeout);
}

internal void WaitUntilSafeToClose()
{
    if (!_listenerLoopExited.Wait(500))
    {
        listener.Close();
        _listenerLoopExited.Wait(500);
    }

    WaitForIdle(_acceptReservationsIdle, () => AcceptReservationCount == 0);
    WaitForIdle(_guaranteedHandlersIdle, () => GuaranteedHandlerCount == 0);
    WaitForIdle(_guaranteedAsyncWritesIdle, () => GuaranteedAsyncWriteCount == 0);
}

internal void MarkClosed()
{
    Interlocked.Exchange(ref _isClosed, 1);
    _closeIdle.Set();
}

internal bool WaitForClosed(int millisecondsTimeout)
{
    return _closeIdle.Wait(millisecondsTimeout);
}
```

- [x] **步骤 4：wire static test accessors**

在 `UnityAgentKitLoopbackHttpServer` static fields 附近加入：

```csharp
internal static Action BeforeGetContextHookForTests;

internal static int AcceptReservationCountForTests => _currentState != null ? _currentState.AcceptReservationCount : 0;
internal static int GuaranteedOperationHandlerCountForTests => _currentState != null ? _currentState.GuaranteedHandlerCount : 0;
internal static int GuaranteedAsyncWriteCountForTests => _currentState != null ? _currentState.GuaranteedAsyncWriteCount : 0;
internal static int WakeRequestCountForTests => _currentState != null ? _currentState.WakeRequestCount : 0;

internal static bool WaitForListenerLoopExitedForTests(int millisecondsTimeout)
{
    var state = _currentState;
    return state == null || state.WaitForListenerLoopExited(millisecondsTimeout);
}
```

- [x] **步骤 5：wire `Stop`, `ScheduleListenerClose`, and `ListenLoop` to state methods**

Replace current `Stop`, `ScheduleListenerClose`, `CloseListenerWhenIdle`, and `ListenLoop` shutdown plumbing with this structure:

```csharp
internal static void Stop(string reasonCode = "host.stopped")
{
    var state = _currentState;
    _currentState = null;
    state?.BeginStopping(reasonCode);
    BeginStopHookForTests?.Invoke();

    UnityAgentKitMainThread.Stop(reasonCode);
    BeforeStopFlushHookForTests?.Invoke();

    if (state != null)
    {
        state.RequestWake();
        ScheduleListenerClose(state);
    }
}

private static void ScheduleListenerClose(ListenerState state)
{
    Interlocked.Increment(ref _pendingListenerCloseCount);
    ListenerCloseIdle.Reset();
    ThreadPool.QueueUserWorkItem(_ => CloseListenerWhenIdle(state));
}

private static void CloseListenerWhenIdle(ListenerState state)
{
    try
    {
        state.WaitUntilSafeToClose();
        state.listener.Close();
    }
    catch (HttpListenerException)
    {
    }
    catch (ObjectDisposedException)
    {
    }
    catch (Exception error)
    {
        Debug.LogWarning("[UnityAgentKit] Failed to stop loopback HTTP listener: " + error.Message);
    }
    finally
    {
        state.MarkClosed();
        if (Interlocked.Decrement(ref _pendingListenerCloseCount) == 0)
        {
            ListenerCloseIdle.Set();
        }
    }
}

private static void ListenLoop(ListenerState state)
{
    try
    {
        while (state.listener.IsListening && !state.IsStopping)
        {
            if (!state.TryEnterAcceptReservation())
            {
                return;
            }

            try
            {
                BeforeGetContextHookForTests?.Invoke();
                var context = state.listener.GetContext();
                HandleAcceptedContext(context, state);
            }
            finally
            {
                if (state.AcceptReservationCount > 0)
                {
                    state.LeaveAcceptReservation();
                }
            }
        }
    }
    catch (HttpListenerException)
    {
    }
    catch (ObjectDisposedException)
    {
    }
    catch (Exception error)
    {
        Debug.LogWarning("[UnityAgentKit] Loopback HTTP listener error: " + error.Message);
    }
    finally
    {
        state.MarkListenerLoopExited();
    }
}
```

- [x] **步骤 6：run reservation / wake tests and verify pass**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42ReservationGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.StopWaitsForAcceptReservationBeforeClosingListener -projectPath unity -logFile -
```

预期：PASS。证明：Stop 不会在 pre-`GetContext()` reservation 未释放时 close listener，并且 close 在 release 后完成。

- [ ] **步骤 7：Commit reservation / wake coordinator**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "fix: coordinate loopback shutdown reservation wake"
```

## 任务 3：Red tests for complete/readable `/operations POST` guarantee ownership

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`（仅复用 enqueue instrumentation）

- [x] **步骤 1：编写失败测试：body classification transition is protected**

在 `HostRuntimeDispatchTests.cs` 的 accepted operation tests 附近加入：

```csharp
[Test]
public void CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-complete-body-guaranteed-stop");
    var bodyRead = new ManualResetEventSlim(false);
    var releaseClassification = new ManualResetEventSlim(false);
    BackgroundHttpRequest request = null;

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.ResetEnqueueInstrumentationForTests();
        UnityAgentKitLoopbackHttpServer.AfterCompleteOperationBodyReadHookForTests = () =>
        {
            bodyRead.Set();
            Assert.IsTrue(releaseClassification.Wait(1000), "Expected test to release operation ownership transfer.");
        };

        request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-complete-body-stop\"}");

        Assert.IsTrue(bodyRead.Wait(1000), "Expected complete request body to be read before stopping.");
        UnityAgentKitHost.StopForTests("host.stopped");
        Assert.AreEqual(1, UnityAgentKitLoopbackHttpServer.AcceptReservationCountForTests, "Complete body classification remains protected by accept reservation before transfer.");
        releaseClassification.Set();

        Assert.IsTrue(request.WaitUntilDone(1000), "Expected stopped envelope response for complete readable accepted operation.");
        Assert.IsNull(request.GetError());

        var result = request.GetResult();
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);
        Assert.AreEqual(200, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-complete-body-stop", record);
        Assert.AreEqual("host.stopped", response.code);
        Assert.IsFalse(UnityAgentKitMainThread.WasRequestIdEnqueuedForTests("req-complete-body-stop"));
        Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedOperationHandlerCountForTests);
    }
    finally
    {
        UnityAgentKitLoopbackHttpServer.AfterCompleteOperationBodyReadHookForTests = null;
        releaseClassification.Set();
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42OperationOwnershipRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope -projectPath unity -logFile -
```

预期：FAIL，compiler error mentions missing `AfterCompleteOperationBodyReadHookForTests` or assertion fails because current implementation uses task 4.1 post-`GetContext()` counter and does not expose guarantee-range ownership.

- [ ] **步骤 3：Commit red test**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "test: cover accepted operation ownership transfer"
```

## 任务 4：Implement complete/readable operation guarantee and async write ownership

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`

- [x] **步骤 1：add test hook and `HandleAcceptedContext` split**

在 static test hooks 附近加入：

```csharp
internal static Action AfterCompleteOperationBodyReadHookForTests;
```

新增 `HandleAcceptedContext`：

```csharp
private static void HandleAcceptedContext(HttpListenerContext context, ListenerState state)
{
    var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
    if (path == "/__unity_agent_kit_stop_wake")
    {
        AbortResponse(context.Response);
        return;
    }

    if (path == "/operations" && context.Request.HttpMethod == "POST")
    {
        HandleAcceptedOperationContext(context, state);
        return;
    }

    state.LeaveAcceptReservation();
    HandleNonGuaranteeContext(context, state);
}
```

- [x] **步骤 2：implement complete/readable operation ownership transfer**

Replace `HandleOperation` usage from accepted contexts with:

```csharp
private static void HandleAcceptedOperationContext(HttpListenerContext context, ListenerState state)
{
    var record = state != null ? state.record : null;
    string body;
    try
    {
        body = ReadRequestBody(context.Request);
    }
    catch (IOException)
    {
        state.LeaveAcceptReservation();
        AbortResponse(context.Response);
        return;
    }
    catch (ObjectDisposedException)
    {
        state.LeaveAcceptReservation();
        AbortResponse(context.Response);
        return;
    }

    AfterCompleteOperationBodyReadHookForTests?.Invoke();
    state.AdmitAcceptedOperationContext();
    try
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.EmptyBody(record)));
            return;
        }

        UnityAgentKitOperationRequest request;
        try
        {
            request = JsonUtility.FromJson<UnityAgentKitOperationRequest>(body);
        }
        catch (Exception error)
        {
            WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.MalformedJson(record, "Operation request JSON is malformed: " + error.Message)));
            return;
        }

        if (request == null)
        {
            WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.MalformedJson(record, "Operation request JSON is malformed.")));
            return;
        }

        var operation = UnityAgentKitOperationRouter.NormalizeOperation(request.operation);
        if (state.IsStopping && !string.IsNullOrEmpty(operation))
        {
            WriteJson(context.Response, 200, JsonUtility.ToJson(UnityAgentKitOperationRouter.Stopped(request, record, state.StopReason)));
            return;
        }

        if (UnityAgentKitOperationRouter.RequiresMainThreadDispatch(operation))
        {
            UnityAgentKitMainThread.Enqueue(request, record, response =>
            {
                QueueWriteJson(state, context.Response, 200, JsonUtility.ToJson(response));
            });
            return;
        }

        var response = UnityAgentKitOperationRouter.Route(request, record);
        var statusCode = response.status == "rejected" && response.code == "operation.empty" ? 400 : 200;
        WriteJson(context.Response, statusCode, JsonUtility.ToJson(response));
    }
    finally
    {
        state.ReleaseGuaranteedHandler();
    }
}
```

- [x] **步骤 3：wire guaranteed async write ownership**

Replace `QueueWriteJson(HttpListenerResponse response, int statusCode, string json)` with state-owned tracking:

```csharp
private static void QueueWriteJson(ListenerState state, HttpListenerResponse response, int statusCode, string json)
{
    state.TrackGuaranteedAsyncWrite();
    ThreadPool.QueueUserWorkItem(_ =>
    {
        try
        {
            WriteJson(response, statusCode, json);
        }
        catch (HttpListenerException)
        {
        }
        catch (ObjectDisposedException)
        {
        }
        catch (InvalidOperationException)
        {
        }
        catch (IOException)
        {
        }
        finally
        {
            state.ReleaseGuaranteedAsyncWrite();
        }
    });
}
```

- [x] **步骤 4：make `WaitForPendingWorkToFlush` delegate to ListenerState**

Remove `_activeHandlerCount`, `_acceptedContextBeforeAdmissionCount`, `_pendingAsyncWriteCount`, `ActiveHandlersIdle`, `AsyncWriteIdle`, `AcceptedContextsAdmittedIdle`, `IncrementActiveHandlerCount`, `DecrementActiveHandlerCount`, `IncrementAcceptedContextBeforeAdmissionCount`, and `DecrementAcceptedContextBeforeAdmissionCount` from production shutdown. Keep compatibility test accessors only if a historical test still compiles, and map them to new state counters:

```csharp
internal static int ActiveHandlerCountForTests => _currentState != null ? _currentState.GuaranteedHandlerCount : 0;
```

- [x] **步骤 5：run operation ownership test and verify pass**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42OperationOwnershipGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope -projectPath unity -logFile -
```

预期：PASS。证明：complete/readable accepted `/operations POST` 在 Stop 后生成 stopped envelope，不进入 main-thread dispatch queue，且 guaranteed handler ownership 成对释放。

- [ ] **步骤 6：Commit operation ownership implementation**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "fix: return stopped envelopes for guaranteed operations"
```

## 任务 5：Red tests and implementation for non-guarantee body/wake fallback boundaries

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`

- [x] **步骤 1：add raw partial POST helper**

在 `HostRuntimeDispatchTests.cs` helper area 加入：

```csharp
private static TcpClient StartPartialOperationsPost(int port, string partialBody, int declaredContentLength)
{
    var client = new TcpClient("127.0.0.1", port);
    var payload = System.Text.Encoding.UTF8.GetBytes(
        "POST /operations HTTP/1.1\r\n" +
        "Host: 127.0.0.1:" + port + "\r\n" +
        "Content-Type: application/json\r\n" +
        "Content-Length: " + declaredContentLength + "\r\n" +
        "Connection: keep-alive\r\n" +
        "\r\n" +
        partialBody);
    client.GetStream().Write(payload, 0, payload.Length);
    return client;
}
```

- [x] **步骤 2：编写失败测试：incomplete body does not block close**

在 stop-window tests 附近加入：

```csharp
[Test]
public void IncompleteAcceptedOperationBodyDoesNotBlockFinalClose()
{
    var registryPath = TemporaryRegistryPath("operations-incomplete-body-non-guarantee");
    TcpClient client = null;

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        client = StartPartialOperationsPost(record.port, "{\"operation\":\"host.threadCheck\"", 200);

        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForAcceptedContextForTests(1000), "Expected listener to accept partial request.");
        UnityAgentKitHost.StopForTests("host.stopped");

        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000), "Incomplete body must not hold drain ownership or block final close.");
        Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedOperationHandlerCountForTests);
        Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.GuaranteedAsyncWriteCountForTests);
    }
    finally
    {
        client?.Close();
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 3：编写失败测试：wake fallback is non-guarantee only**

加入：

```csharp
[UnityTest]
public IEnumerator WakeFallbackDoesNotCloseGuaranteedStoppedWrite()
{
    var registryPath = TemporaryRegistryPath("wake-fallback-preserves-guaranteed-write");
    var guaranteedWriteHeld = new ManualResetEventSlim(false);
    var releaseGuaranteedWrite = new ManualResetEventSlim(false);
    BackgroundHttpRequest request = null;

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitLoopbackHttpServer.BeforeGuaranteedAsyncWriteForTests = () =>
        {
            guaranteedWriteHeld.Set();
            Assert.IsTrue(releaseGuaranteedWrite.Wait(1000), "Expected test to release guaranteed write.");
        };

        request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-wake-fallback-write\"}");
        yield return WaitForPendingDispatch();
        UnityAgentKitHost.StopForTests("host.stopped");

        Assert.IsTrue(guaranteedWriteHeld.Wait(1000), "Expected stopped envelope write to be held.");
        UnityAgentKitLoopbackHttpServer.ForceWakeFailureFallbackForTests();
        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(100), "Fallback must not close while guaranteed stopped write is held.");

        releaseGuaranteedWrite.Set();
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(1000));
    }
    finally
    {
        UnityAgentKitLoopbackHttpServer.BeforeGuaranteedAsyncWriteForTests = null;
        releaseGuaranteedWrite.Set();
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitHost.ResetForTests();
    }
}
```


- [x] **步骤 4：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42NonGuaranteeRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.IncompleteAcceptedOperationBodyDoesNotBlockFinalClose -projectPath unity -logFile -
```

预期：FAIL，compiler errors mention missing `WaitForAcceptedContextForTests`, `BeforeGuaranteedAsyncWriteForTests`, or `ForceWakeFailureFallbackForTests`，or the partial-body close assertion fails. This proves the plan covers the reviewing-specs concerns.

- [x] **步骤 5：implement non-guarantee body and wake fallback instrumentation**

In `UnityAgentKitLoopbackHttpServer.cs`, add:

```csharp
internal static Action BeforeGuaranteedAsyncWriteForTests;
internal static bool ForceWakeFailureFallbackForTestsFlag;

internal static bool WaitForAcceptedContextForTests(int millisecondsTimeout)
{
    var state = _currentState;
    return state != null && state.WaitForAcceptedContext(millisecondsTimeout);
}

internal static void ForceWakeFailureFallbackForTests()
{
    ForceWakeFailureFallbackForTestsFlag = true;
    var state = _currentState;
    state?.ForceNonGuaranteeWakeFallbackForTests();
}
```

In `ListenerState`, add an accepted context signal and a test-only fallback trigger:

```csharp
private readonly ManualResetEventSlim _acceptedContextSeen = new ManualResetEventSlim(false);

internal void MarkAcceptedContextSeen()
{
    _acceptedContextSeen.Set();
}

internal bool WaitForAcceptedContext(int millisecondsTimeout)
{
    return _acceptedContextSeen.Wait(millisecondsTimeout);
}

internal void ForceNonGuaranteeWakeFallbackForTests()
{
    try
    {
        listener.Close();
    }
    catch (HttpListenerException)
    {
    }
    catch (ObjectDisposedException)
    {
    }

    MarkListenerLoopExited();
}
```

Call `state.MarkAcceptedContextSeen()` immediately after `GetContext()` returns.

For body read, use bounded classification only for shutdown/non-guarantee reads:

```csharp
private static bool TryReadCompleteBody(HttpListenerRequest request, out string body)
{
    body = string.Empty;
    try
    {
        if (request.InputStream.CanTimeout)
        {
            request.InputStream.ReadTimeout = 250;
        }

        body = ReadRequestBody(request);
        return true;
    }
    catch (IOException)
    {
        return false;
    }
    catch (ObjectDisposedException)
    {
        return false;
    }
}
```

Use `TryReadCompleteBody` in `HandleAcceptedOperationContext`; if it returns false, release accept reservation and abort without acquiring guaranteed handler ownership.

In `QueueWriteJson`, run the test hook after `state.TrackGuaranteedAsyncWrite()` and before `WriteJson`:

```csharp
state.TrackGuaranteedAsyncWrite();
ThreadPool.QueueUserWorkItem(_ =>
{
    try
    {
        BeforeGuaranteedAsyncWriteForTests?.Invoke();
        WriteJson(response, statusCode, json);
    }
    finally
    {
        state.ReleaseGuaranteedAsyncWrite();
    }
});
```

- [x] **步骤 6：run non-guarantee / fallback tests and verify pass**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task42NonGuaranteeGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.IncompleteAcceptedOperationBodyDoesNotBlockFinalClose -projectPath unity -logFile -
```

预期：PASS。证明：incomplete/stalled accepted body 不进入 drain ownership，不阻塞 final close。

- [ ] **步骤 7：Commit non-guarantee boundary implementation**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "fix: exclude non-guarantee requests from shutdown drain"
```

## 任务 6：Final verification, evidence, and scope guard

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`（仅当 evidence name check helper 需要更新）
- 验证：`unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml`
- 验证：`docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-06-loopback-shutdown-redesign.md`

- [x] **步骤 1：运行完整 HostRuntimeTests**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；XML contains `result="Passed"` and `failed="0"`。

- [x] **步骤 2：验证 4.2 evidence test names present**

运行：

```bash
python - <<'PY'
from pathlib import Path
xml = Path('unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml').read_text(encoding='utf-8')
required = [
    'StopWaitsForAcceptReservationBeforeClosingListener',
    'StopRequestsWakeAndSignalsListenerLoopExited',
    'CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope',
    'IncompleteAcceptedOperationBodyDoesNotBlockFinalClose',
    'WakeFallbackDoesNotCloseGuaranteedStoppedWrite',
    'HttpPendingDispatchOnReloadReturnsStoppedEnvelope',
    'HttpPendingDispatchOnEditorQuittingReturnsStoppedEnvelope',
]
missing = [name for name in required if name not in xml]
if missing:
    raise SystemExit('missing task 4.2 evidence tests: ' + ', '.join(missing))
print('PASS Phase 5A-06 task 4.2 evidence names present')
PY
```

预期输出：

```text
PASS Phase 5A-06 task 4.2 evidence names present
```

- [x] **步骤 3：运行 scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
forbidden_paths = [
    Path('plugins/unity-agent-kit/src/host'),
    Path('plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts'),
    Path('unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs'),
]
created = [str(path) for path in forbidden_paths if path.exists()]
if created:
    raise SystemExit('out-of-scope paths created: ' + ', '.join(created))
print('PASS scope guard: no TS host client, vertical smoke, or MCP/public action files created')
PY
```

预期输出：

```text
PASS scope guard: no TS host client, vertical smoke, or MCP/public action files created
```

- [x] **步骤 4：确认 roadmap wording still incomplete**

运行：

```bash
python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md').read_text(encoding='utf-8')
forbidden = [
    'Phase 5A-06 Main-thread dispatch + host-level timeout 已完成',
    '最终整体代码审查通过，可合并',
]
found = [text for text in forbidden if text in roadmap and '历史记录' not in roadmap]
if found:
    raise SystemExit('roadmap restored completed wording too early: ' + ', '.join(found))
print('PASS roadmap remains incomplete for task 4.2 review gates')
PY
```

预期输出：

```text
PASS roadmap remains incomplete for task 4.2 review gates
```

- [ ] **步骤 5：Commit final verification evidence**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml
git commit -m "test: verify phase 5a-06 shutdown redesign"
```

- [x] **步骤 6：Post-implementation review gates**

After implementation commits are created, run the plan through subagent-driven development review gates:

1. Spec compliance review must verify every requirement in `docs/superpowers/specs/2026-05-21-unity-agent-kit-phase-5a-06-loopback-shutdown-redesign.md` maps to tests and implementation.
2. Code quality review must specifically inspect ownership pairing, body-read classification, wake fallback, async write drain, and no Unity main-thread blocking.
3. Do not update roadmap completion wording until both reviews pass.

## 自检记录

- **规格覆盖度：** Spec 的 stopped envelope boundary、sync GetContext route、async Stop semantics、4.1 patch handling、ListenerState coordinator、wake fallback、non-guarantee body boundary、stable drain、final verification 均映射到任务 1-6。
- **红旗词扫描：** 未发现禁止占位语或模糊执行指令。
- **类型一致性：** 新 test-only APIs 使用统一命名：`BeforeGetContextHookForTests`、`AfterCompleteOperationBodyReadHookForTests`、`WaitForListenerLoopExitedForTests`、`AcceptReservationCountForTests`、`GuaranteedOperationHandlerCountForTests`、`GuaranteedAsyncWriteCountForTests`。
- **拆分检查：** 已记录；无需拆分。
- **上游约束覆盖：** Roadmap shared constraints、Phase scope/out-of-scope、用户确认事项已进入上游约束摘要并映射到任务。
- **参考输入映射：** 已列出 spec、existing plan、runtime code、dispatch code、tests 的采用/不采用内容和落地任务。
- **验证强度：** 行为任务使用 real loopback HTTP、raw partial HTTP request、Unity HostRuntimeTests 和 XML evidence names，不只检查文件或符号存在。
