# Unity Agent Kit Phase 5A Host Runtime Hardening 设计

## 状态

- 状态：设计已批准，等待实现计划。
- 日期：2026-05-22
- 适用范围：Phase 5A completed 后、Phase 5B 前的 Host Runtime hardening patch。
- Roadmap 边界：Phase 5A 保持 completed；Phase 5 保持 incomplete / partial；next handoff 保持 `continue-5b`。

## 背景

Phase 5A 已完成 Host Runtime foundation，并通过 TS non-live tests、Unity `HostRuntimeTests`、Unity-driven vertical smoke 和 roadmap/index evidence。后续 review 发现若进入 Phase 5B/5C 前不补强，真实 public workflows 接入后会放大以下风险：

1. TS 可能信任 request 或 host identity 不匹配的 operation envelope。
2. Unity pending dispatch 可能在 timeout 后仍被主线程执行，造成结果已 timeout 但副作用发生。
3. `/operations` request body 只有 per-chunk timeout，缺少 absolute read deadline 和 size limit，slow client 可能拖住 shutdown。
4. TS host envelope mapping 可能丢掉 `UnityAgentKitPublicResult` 已声明的 optional fields。
5. completion docs 中存在 `5A-01 through 5A-08 completed` 这类容易误读 5A-04 folded 状态的 wording，且 5A-08 plan 文件未标明已执行。

## 已确认决策

### Phase 状态

采用 post-completion hardening：

- 不重新打开 Phase 5A。
- Phase 5A 继续保持 completed。
- hardening 记录为 Phase 5A completed 后、Phase 5B 前的补丁 evidence。
- Roadmap Phase 5 继续保持 incomplete，因为 Phase 5B-5E 和 final daily loop E2E 仍 pending。

### Hardening 范围

本 patch 包含：

1. TS envelope operation/requestId/hostId/hostEpoch validation。
2. Unity dispatch timeout atomic claim race 修复。
3. `/operations` body absolute deadline + size limit。
4. docs wording / completed plan cleanup。
5. TS host envelope opaque pass-through existing public-result optional fields。

本 patch 不包含：

- Phase 5B-5E。
- public MCP tools。
- `/unity` skill。
- artifact/resource store。
- workflow timeout。
- final daily loop E2E。

### Optional fields 边界

采用 opaque pass-through：

- TS 只白名单保留 `UnityAgentKitPublicResult` 已声明的 optional fields。
- 不定义 `resource`、`resources`、`job`、`nextStep` 的内部语义。
- 不新增 resource/job schema。
- 不实现 store、handler 或 workflow system。

### `/operations` body bounds

采用 Phase 5A host runtime 固定边界：

- `MaxOperationRequestBodyBytes = 64 * 1024`
- `OperationRequestBodyDeadlineMs = 2000`

后续 phase 如需更大 payload，必须通过明确的 Phase 5B+ 设计或 artifact/resource 机制处理，不在本 hardening patch 中隐式扩大。

## 设计方案

采用方案 B：surgical hardening + 小型边界重整。

该方案修复当前 review 发现的 runtime 漏洞，并只整理被 hardening 直接触碰的边界函数和 test-visible constants；不做无关重构，不提前实现 Phase 5B。

## 设计 1：TS envelope trust boundary

### 修改范围

- `plugins/unity-agent-kit/src/host/http-client.ts`
- `plugins/unity-agent-kit/tests/host-runtime.test.ts`

### 行为

`mapEnvelopeToPublicResult` 从单纯 `envelope` shape mapping 调整为带上下文的 trust validation：

```ts
mapEnvelopeToPublicResult(envelope, { record, request })
```

校验分两层：

1. shape validation：status、operation、requestId、hostId、hostEpoch、summary、diagnostics、timing 和 optional code/message shape 合法。
2. trust validation：
   - `envelope.operation === request.operation`
   - `envelope.requestId === request.requestId`
   - `envelope.hostId === record.hostId`
   - `envelope.hostEpoch === record.hostEpoch`

失败语义：

- operation/requestId mismatch：`failed + host.invalid_envelope`。
- hostId/hostEpoch mismatch：`lost + host.identity_mismatch`。

理由：operation/requestId mismatch 是响应协议不可信；host identity mismatch 是 host continuity 不可信。

### Optional fields preservation

trusted envelope 透传以下 `UnityAgentKitPublicResult` 已有字段：

- `evidence`
- `resource`
- `resources`
- `metadata`
- `job`
- `nextStep`
- `safeToRetry`
- `mayStillBeRunning`

这些字段只做 opaque pass-through，不验证内部 schema。

### 测试

新增 red → green tests：

- `invokeOperationRejectsMismatchedEnvelopeOperation`
- `invokeOperationRejectsMismatchedEnvelopeRequestId`
- `invokeOperationRejectsMismatchedEnvelopeHostId`
- `invokeOperationRejectsMismatchedEnvelopeHostEpoch`
- `invokeOperationPreservesPublicResultOptionalFields`

保留既有 tests：

- invalid envelope mapping。
- unknown status fail closed。
- timeout envelope metadata preservation。
- post-response identity drift classification。

### 边界

不修改 `transport.ts` policy 边界；`transport.ts` 仍只返回 low-level HTTP result。不把 post-response registry drift 复制进 `http-client.ts`；`rebind.ts` 继续拥有 lifecycle finalization。

## 设计 2：Unity dispatch timeout atomic claim

### 修改范围

- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 或 `HostRuntimeDispatchTests.cs`

### 行为

为 pending dispatch 引入明确 ownership：

- pending：仍在队列，timer 可以 timeout。
- claimed：主线程已获得执行权，timer 不能再 timeout 完成它。
- completed：已完成 response。

`Drain()` 不再 snapshot 后直接执行，而是在 `PendingLock` 下原子完成：

1. 找到第一个非 hold item。
2. 从 `PendingDispatches` 移除。
3. 标记 `claimed = true`。
4. unlock。
5. 执行 `RunOnMainThread`。
6. 用 `ownsItem: true` complete。

Timeout timer 只能完成仍 pending 且未 claimed 的 work。claimed work 不再被 timeout 覆盖。

核心保证：一个 dispatch 要么 timeout 且不执行，要么被主线程 claim 后执行；不会 timeout 后仍执行。

### 测试

新增 red → green race test：

- 第二个 pending dispatch 在未 claimed 前 timeout。
- 后续 drain 不执行该 expired work。
- `ExpiredDispatchExecutionCountForTests` 不增加。
- timeout response 保持 `timeout + host.dispatch_timeout`。

如现有 test hooks 不足，只新增最小 test-only hook 或 helper，例如 `DrainOneForTests()` / `BeforeClaimDispatchForTests`。不得通过 `Thread.Sleep`、busy wait、`Task.Wait`、阻塞 Unity main thread 或阻塞 HTTP handler 制造 timeout。

### 边界

不新增 workflow timeout。不新增 operation catalog。不改变 `host.threadCheck` / `host.pendingDispatchTimeout` 的 Phase 5A internal operation 定位。

## 设计 3：`/operations` body deadline + size limit

### 修改范围

- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 或 `HostRuntimeDispatchTests.cs`

### 常量

新增 host runtime internal constants：

```csharp
internal const int MaxOperationRequestBodyBytes = 64 * 1024;
internal const int OperationRequestBodyDeadlineMs = 2000;
```

### 读取规则

`ReadRequestBody` 增加三层边界：

1. Content-Length 超限：如果 `ContentLength64 > MaxOperationRequestBodyBytes`，直接拒绝，不继续读取 body。
2. 累计 bytes 超限：chunk read 后累计，超过 64 KiB 即终止读取并关闭 input stream。
3. Absolute deadline：读取开始记录 deadline，每次 read 前计算 remaining time；`ReadChunkWithTimeout` 使用 `min(250ms, remainingMs)`；remaining <= 0 时终止读取。

### 错误语义

- 明确 oversized body：structured 400 envelope，code `http.request_body_too_large`。
- 读取中超限：structured 400 envelope，code `http.request_body_too_large`。
- deadline / incomplete slow body：abort response，并释放 accept reservation。

原因：slow/incomplete body 无法可信解析 operation/requestId，不伪造某个 operation 的 stopped/failed envelope。

### Shutdown ownership

完整 readable `/operations POST` body 才能进入 `AdmitAcceptedOperationContext()` 和 guaranteed handler ownership。读 body 期间如果 stop/close 发生，deadline 最多 2 秒内释放 accept reservation；slow/incomplete body request 不保证获得 stopped envelope。

### 测试

新增 red → green tests：

- `OperationsRejectsContentLengthOverBodyLimit`
- `OperationsRejectsBodyThatExceedsLimitWhileReading`
- `SlowOperationBodyDoesNotBlockListenerClosePastDeadline`

Slow body test 使用 background socket/client drip body，并验证 listener close eventually completes、accept reservation returns idle、old listener no longer responds。不得阻塞 Unity main thread 或 HTTP handler。

## 设计 4：docs / evidence sync

### 修改范围

- `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md`

### 文档规则

- Phase 5A 继续 completed。
- 5A-08 继续 completed。
- Phase 5 继续 partial / incomplete。
- Next 继续 `continue-5b`。
- hardening 记录为 Phase 5A completed 后、Phase 5B 前的 Host Runtime hardening evidence。

### 文案修正

把容易误读的 wording：

```text
5A-01 through 5A-08 completed
```

改为：

```text
5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03
```

在 5A-08 plan 顶部增加 status note：

- `Status: executed / completed`
- checklist retained as historical execution plan text
- current truth lives in execution index / Phase 5 plan index / roadmap

Roadmap current state 和 change log 增加 hardening note，说明修复：

- TS envelope trust boundary。
- Unity dispatch timeout claim race。
- body read bounds。
- optional result field preservation。

并明确没有实现 Phase 5B-5E、public tools、`/unity` skill、artifact/resource store、workflow timeout 或 final daily loop E2E。

## 验证矩阵

### TS evidence

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

要求：新增 hardening tests 通过，整体 `fail 0`。

### Unity HostRuntime hardening evidence

本机 Unity 2022.3.61f1 使用不带 `-quit` 的 batchmode test command，因为此前验证 `-quit` 在该环境会在 Test Runner 前退出。

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeHardeningResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

要求：新增 dispatch claim 和 body bound tests 通过，整体 `failed="0"`。

### Vertical smoke regression

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

要求：`total="1"`、`passed="1"`、`failed="0"`，Node stdout 包含 `tests 1`、`pass 1`、`fail 0`。

### Scope boundary

验证 required evidence files 存在，并继续禁止：

- `plugins/unity-agent-kit/skills/unity.md`
- `plugins/unity-agent-kit/src/tools`
- `plugins/unity-agent-kit/src/mcp`
- `plugins/unity-agent-kit/src/actions`

### Docs check

验证：

- roadmap 包含 hardening evidence。
- Phase 5A 仍 completed。
- Phase 5 row 仍 partial / `continue-5b`。
- 不包含 misleading `5A-01 through 5A-08 completed`。
- 包含 folded wording。
- 不出现 public tools / `/unity` skill completed wording。
- 5A-08 plan 顶部包含 executed/completed status note。

### Diff check

```bash
git diff --check
```

要求：无 whitespace errors。CRLF normalization warnings 不算失败，但应在汇报中注明。

## 实现计划交接

后续 writing-plans 应拆为 5 个任务：

1. TS envelope trust boundary + optional fields preservation。
2. Unity dispatch atomic claim。
3. `/operations` body deadline + size limit。
4. Docs / evidence sync。
5. Final verification gate。

每个 runtime 任务必须先写 red test，再实现，再运行 targeted evidence。不得通过删除测试、降低断言、引入 skip、阻塞 Unity main thread 或阻塞 HTTP handler 来通过验证。

## 完成标准

hardening 完成必须同时满足：

- TS tests pass。
- Unity HostRuntime hardening/full suite pass。
- Unity vertical smoke pass。
- Docs check pass。
- Scope boundary check pass。
- `git diff --check` pass。
- Phase 5A remains completed。
- Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
