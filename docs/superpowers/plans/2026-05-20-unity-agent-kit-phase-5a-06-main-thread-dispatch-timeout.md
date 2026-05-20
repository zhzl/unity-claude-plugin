# Unity Agent Kit Phase 5A-06 Main-thread Dispatch + Host-level Timeout 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5A-06 的 Unity main-thread dispatch、dispatch failure diagnostics、non-blocking host-level timeout 和 pending work cleanup。

**架构：** 在 5A-05 已完成的 `/operations` router 和 loopback HTTP endpoint 上，把需要 Unity main thread 的 internal operations 交给 `UnityAgentKitMainThread` 队列执行。HTTP handler 只解析 DTO 并安排 response completion；`host.threadCheck` 通过 captured Unity main thread 返回 `UnityAgentKitThreadCheckResult`，`host.throw` 和 `host.pendingDispatchTimeout` 只作为 5A dispatch/timeout contract 的最小测试 operations。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity coroutine tests (`UnityEngine.TestTools`)、`HttpListener` loopback HTTP、`UnityEngine.JsonUtility` DTO JSON、`System.Threading.Timer` host-level deadline。
**拆分检查：** 已检查；无需拆分。5A-06 是一个独立可验证的软件单元：输入为已完成的 5A-05 `/operations` envelope/router foundation，输出为 main-thread dispatch、dispatch exception、pending stop/reload failure、host-level timeout 和 expired work cleanup evidence。TS registry/probe/invoke/rebind classification、MCP public registration、vertical smoke 和 Phase 5A completion 仍由 5A-07/5A-08 处理。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-06 — Main-thread dispatch + host-level timeout

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 5A-06 边界裁决

- 5A-06 owns：captured Unity main thread id、main-thread dispatch queue、`host.threadCheck` success result、dispatch exception envelope、non-blocking pending dispatch timeout hook、`timeout + host.dispatch_timeout` envelope、stop/reload/quitting pending failure、expired queued work not executing later。
- 5A-05 remains owned：top-level `UnityAgentKitOperationResponse` DTO shape、operation trim、missing/empty/unknown operation classification、empty/malformed body handling、400/404/405 structured envelopes、HTTP JSON content-type/framing/closed stream。
- 5A-06 does not own：TS registry/probe/invoke/rebind client、transport/request timeout classification in TS、MCP public tool registration、vertical smoke harness、workflow timeout/polling、19 public action business logic、Phase 5A completion marking。
- Timeout evidence must use a non-blocking pending dispatch hook. Do not use `Thread.Sleep`, busy wait, `Task.Wait`, blocking Unity main thread, or blocking the HTTP handler to manufacture timeout behavior.

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` host runtime pattern 演进；Unity C# host source of truth 只在 `unity/Assets/UnityAgentKit/`；Unity 负责短 main-thread actions、DTO JSON 收发、registry 写入和 operation routing；TS 与 MCP public surface 保持在 5A-07/5A-08 sibling plans。
- **Phase Scope:** Phase 5A 建立 Host Runtime foundation。5A-06 只补齐 Unity-side main-thread dispatch、dispatch failure、host-level timeout 和 pending cleanup；依赖已完成的 5A-03 lifecycle/probe foundation 与 5A-05 `/operations` envelope/router foundation。
- **Phase Out-of-scope:** 不实现 TS registry/probe/invoke/rebind classification；不创建 `plugins/unity-agent-kit/src/host/*`；不创建 `phase5a-vertical-smoke.test.ts` 或 `HostRuntimeVerticalSmokeTests.cs`；不注册 MCP tools；不创建 `/unity` skill；不实现 workflow-level timeout、artifact/resource store 或 public action catalog。
- **Success Criteria:** Unity EditMode tests prove `host.threadCheck` over real HTTP `/operations` returns `succeeded` and `UnityAgentKitThreadCheckResult` with `ranOnMainThread == true` and matching captured/execution thread ids；`host.throw` produces `failed + host.dispatch_exception` with structured diagnostics；`host.pendingDispatchTimeout` produces `timeout + host.dispatch_timeout` with `mayStillBeRunning` metadata；pending work failed by stop/reload/quitting is not timeout；expired queued work is skipped if drained later；HTTP handler returns to listener loop after scheduling dispatch work.
- **用户确认事项:** 新插件不做 v2 旧 public tools 兼容层；v2 正确实现应映射进 plan，不用弱 stub 代替；Unity host/runtime/tests 不能通过阻塞 Unity main thread 或 HTTP handler 制造 timeout；5A-06 只接管已在 5A-05 识别的 `host.threadCheck` dispatch boundary。
- **本计划不包含:** 不把 Phase 5A 或 Phase 5 标记 completed；不执行 5A-07 TS client/rebind；不执行 5A-08 vertical smoke；不更新 roadmap completion evidence；不改变 `UnityAgentKitOperationResponse` top-level DTO contract；不采用 nested v2 data envelope compatibility。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 采用 `5A-DISPATCH-01`、`5A-DISPATCH-02`、`5A-OPS-02`、`5A-TIMEOUT-01`、`5A-TIMEOUT-02` 中 captured main thread、dispatch exception、pending timeout、stop/reload pending failure、timeout layering 要求 | 不采用 Contract Area 5 TS registry/probe/invoke/rebind client；不采用 Contract Area 6 vertical smoke/completion evidence | 这些 requirement 属于 5A-07 和 5A-08；5A-06 只产出 Unity-side dispatch/timeout evidence | 任务 1-5 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 采用 5A-06 plan card、requirement IDs、wave 4、depends on 5A-05；保持 active execution plans within 8-plan limit | 不修改 5A-07/5A-08 scope；不把 Phase 5A marked completed | Index 明确 5A-06 只是 sibling execution plan，不是 subplan 收尾 | 任务 1-5 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-05-operations-envelope-router.md` | 采用已完成的 `/operations` top-level envelope、`BuildOperationsUrl`、real HTTP tests、request context preservation、structured 400/404/405 handling | 不保留 final behavior 中的 `host.threadCheck` dispatch-required response | 5A-05 只作为 boundary evidence；5A-06 正式实现 `host.threadCheck` success dispatch | 任务 2 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` | 采用 existing drain registration、Stop cleanup hook、`host.stopped` / reload / quitting reason code storage | 不保留 lifecycle-only pending list as dispatch mechanism | 5A-06 需要 real dispatch queue、completion callbacks、deadline and failed pending work evidence | 任务 1、3、4 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | 采用 `NormalizeOperation`、top-level response creation、diagnostic field style、`host.echo` direct success、structured failure helpers | 不把 `host.threadCheck` 继续作为 rejected `host.dispatch_required` over HTTP final behavior | 5A-06 owns actual `host.threadCheck` execution on captured Unity main thread | 任务 1、2、3、4 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` | 采用 5A-05 request parse、status code selection、`WriteJson` content-type/framing/stream close pattern | 不 make HTTP handler wait/block to manufacture dispatch timeout | Timeout evidence must come from non-blocking pending dispatch hook and deadline callback | 任务 2、3 |
| `unity-mcp-v2` reference mapping in the technical contract | 采用 captured main thread + queue drain + fail pending work + deadline boundary as conceptual pattern | 不 adopt v2 public tool compatibility layer, large business operation catalog, or legacy public operation names | New plugin only implements 5A internal host runtime foundation | 任务 1、3、4 |

## 文件结构

- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — Captures Unity main thread id, queues dispatch work, drains on `EditorApplication.update`, completes responses through callbacks, fails pending work on stop/reload/quitting, supports non-blocking host-level deadline for `host.pendingDispatchTimeout`, skips expired queued work.
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — Adds dispatch-required operation recognition, `host.threadCheck` main-thread result builder, `host.throw` dispatch exception failure, `host.pendingDispatchTimeout` timeout failure, stopped/reload/quitting pending failure envelopes.
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — Schedules main-thread operations asynchronously after DTO parse, writes response from completion callback, exposes test-only active handler count to prove handler return after scheduling.
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — Adds direct dispatch queue tests, coroutine real HTTP dispatch tests, timeout tests, stop/reload pending failure tests, and final 5A-06 envelope assertions.
- 依赖不改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — Existing `UnityAgentKitThreadCheckResult`, `UnityAgentKitOperationRequest`, `UnityAgentKitOperationResponse`, and `UnityAgentKitDiagnostic` DTOs are sufficient.

## Plan Card Coverage

| Requirement ID | 覆盖任务 | 行为证据 |
|---|---|---|
| `5A-DISPATCH-01` | 任务 1-2 | `MainThreadDispatchRunsThreadCheckOnCapturedThread` and `HostThreadCheckOverOperationsRunsOnCapturedMainThread` prove `host.threadCheck` runs through captured Unity main thread and returns matching thread ids. |
| `5A-DISPATCH-02` | 任务 1、4 | `DispatchExceptionReturnsStructuredDiagnostics`, `StopFailsPendingDispatchWork`, `ReloadStopFailsPendingWorkWithoutTimeoutStatus`, and `ExpiredDispatchWorkDoesNotExecuteLater` prove exception and expired/stopped pending work behavior. |
| `5A-OPS-02` | 任务 1-2 | `host.echo` remains direct from 5A-05; `host.threadCheck` is upgraded from recognition boundary to actual dispatch success. No public action business logic is added. |
| `5A-TIMEOUT-01` | 任务 3 | `PendingDispatchTimeoutReturnsHostTimeout`, `PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler`, and `PendingDispatchTimeoutMarksMayStillBeRunning` prove host-level timeout via non-blocking pending dispatch hook. |
| `5A-TIMEOUT-02` | 任务 3、5 | Timeout evidence is limited to Unity host-level `timeout + host.dispatch_timeout`; plan scope excludes TS transport/request timeout and workflow timeout. |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 8 分处理 |
|---|---|---:|---|
| Main-thread dispatch | `UnityAgentKitMainThread` captures main thread during drain registration and executes queued short work only from `Drain` | 8 | Stop and fix dispatch queue; do not add timeout or TS code |
| HTTP dispatch integration | `/operations` schedules main-thread work and returns from handler; completion callback writes operation envelope | 8 | Stop and fix `UnityAgentKitLoopbackHttpServer`; do not block handler to pass tests |
| Dispatch exception diagnostics | `host.throw` returns `failed + host.dispatch_exception` with exact exception type details | 8 | Stop and fix router diagnostic creation; do not weaken assertion to string-only protocol checks |
| Host-level timeout | `host.pendingDispatchTimeout` uses deadline callback and never requires main-thread/handler blocking | 8 | Stop and fix pending deadline path; do not use sleep, busy wait, or `Task.Wait` |
| Pending cleanup | Stop/reload/quitting fail pending work with reason-specific codes and skip expired work if drained later | 8 | Stop and fix pending work lifecycle; do not map stop/reload to timeout |
| Scope boundary | No TS client, MCP registration, vertical smoke, workflow timeout, public action catalog, or Phase 5A completion marking | 9 | Remove out-of-scope files/tests before review |

低分处理规则：任何对象低于 8/10 时，5A-06 保持 incomplete，只允许修复 Unity dispatch/timeout foundation；不得通过 TS simulation、vertical smoke, MCP payload mapping, workflow polling, or public action code 补强 evidence。

## 执行前置条件

执行任务 1 前先确认 5A-03 和 5A-05 foundation 已存在并通过：

- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` defines `BuildOperationsUrl`, `Start`, `Stop`, request body read, JSON writer, and `/operations` branch.
- `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` defines `NormalizeOperation`, `host.echo`, `host.threadCheck` recognition, and operation envelope helpers.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` defines drain registration and Stop cleanup foundation.
- `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` defines `UnityAgentKitThreadCheckResult`.

Run:

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06PreconditionResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。该检查只证明 5A-03/5A-05 dependencies still pass，不作为 5A-06 dispatch/timeout evidence。

## 任务 1：Main-thread dispatch queue and router-owned dispatch operations

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [x] **步骤 1：编写失败的 dispatch queue tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 的 using 区域加入：

```csharp
using System.Threading;
```

在 router tests 附近加入：

```csharp
[Test]
public void ThreadCheckOperationIsMarkedAsMainThreadDispatch()
{
    Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" host.threadCheck "));
    Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.throw"));
    Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("host.echo"));
    Assert.IsFalse(UnityAgentKitOperationRouter.RequiresMainThreadDispatch("unknown.operation"));
}

[Test]
public void MainThreadDispatchRunsThreadCheckOnCapturedThread()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitOperationResponse response = null;

    UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
    {
        operation = "host.threadCheck",
        requestId = "req-thread-direct"
    }, TestHostRecord(49210), completed => response = completed);

    UnityAgentKitMainThread.DrainForTests();

    AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-direct", TestHostRecord(49210));
    var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
    Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
    Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
    Assert.IsTrue(data.ranOnMainThread);
}

[Test]
public void DispatchExceptionReturnsStructuredDiagnostics()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitOperationResponse response = null;

    UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
    {
        operation = "host.throw",
        requestId = "req-throw"
    }, TestHostRecord(49211), completed => response = completed);

    UnityAgentKitMainThread.DrainForTests();

    AssertOperationEnvelopeMinimumFields(response, "failed", "host.throw", "req-throw", TestHostRecord(49211));
    Assert.AreEqual("host.dispatch_exception", response.code);
    Assert.AreEqual(1, response.diagnostics.Length);
    Assert.AreEqual("error", response.diagnostics[0].severity);
    Assert.AreEqual("host.dispatch_exception", response.diagnostics[0].code);
    Assert.AreEqual("{\"exceptionType\":\"InvalidOperationException\"}", response.diagnostics[0].details);
}
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06DispatchQueueRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL，compiler errors mention missing `UnityAgentKitOperationRouter.RequiresMainThreadDispatch`, `UnityAgentKitMainThread.Enqueue`, `UnityAgentKitMainThread.DrainForTests`, or `UnityAgentKitMainThread.CapturedMainThreadIdForTests`。该失败证明 tests target missing 5A-06 dispatch foundation rather than already completed 5A-05 router behavior。

- [x] **步骤 3：实现最少 dispatch queue 和 router helpers**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中加入 dispatch constants and helpers：

```csharp
internal const string ThrowOperation = "host.throw";
internal const string PendingDispatchTimeoutOperation = "host.pendingDispatchTimeout";

internal static bool RequiresMainThreadDispatch(string operation)
{
    var normalized = NormalizeOperation(operation);
    return normalized == ThreadCheckOperation || normalized == ThrowOperation || normalized == PendingDispatchTimeoutOperation;
}

internal static UnityAgentKitOperationResponse RunOnMainThread(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, int capturedMainThreadId)
{
    var startedAt = Now();
    var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
    var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;

    if (operation == ThreadCheckOperation)
    {
        var result = new UnityAgentKitThreadCheckResult
        {
            capturedMainThreadId = capturedMainThreadId,
            executionThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId,
            ranOnMainThread = capturedMainThreadId == System.Threading.Thread.CurrentThread.ManagedThreadId
        };
        return Succeeded(operation, requestId, record, "Thread check completed.", UnityEngine.JsonUtility.ToJson(result), startedAt);
    }

    if (operation == ThrowOperation)
    {
        throw new InvalidOperationException("Synthetic dispatch exception.");
    }

    return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
}

internal static UnityAgentKitOperationResponse DispatchException(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Exception error)
{
    var startedAt = Now();
    var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
    var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
    var message = "Main-thread dispatch failed.";
    var response = Failed(operation, requestId, record, "host.dispatch_exception", message, startedAt);
    response.diagnostics[0].details = "{\"exceptionType\":\"" + Escape(error != null ? error.GetType().Name : "Exception") + "\"}";
    return response;
}
```

Keep the existing 5A-05 `Route` behavior for direct calls; HTTP integration changes happen in task 2.

Replace `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` with this minimal dispatch queue foundation while preserving lifecycle cleanup APIs:

```csharp
using System;
using System.Collections.Generic;
using System.Threading;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitMainThread
    {
        private sealed class PendingDispatch
        {
            internal PendingDispatch(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
            {
                this.request = request;
                this.record = record;
                this.complete = complete;
            }

            internal readonly UnityAgentKitOperationRequest request;
            internal readonly UnityAgentKitHostRecord record;
            internal readonly Action<UnityAgentKitOperationResponse> complete;
        }

        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static readonly List<PendingDispatch> PendingDispatches = new List<PendingDispatch>();
        private static bool _drainRegistered;
        private static string _lastStopCode = string.Empty;
        private static int _capturedMainThreadId;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;
        internal static int CapturedMainThreadIdForTests => _capturedMainThreadId;

        internal static int PendingLifecycleWorkCountForTests
        {
            get
            {
                lock (PendingLock)
                {
                    return PendingLifecycleWork.Count;
                }
            }
        }

        internal static int PendingDispatchCountForTests
        {
            get
            {
                lock (PendingLock)
                {
                    return PendingDispatches.Count;
                }
            }
        }

        internal static void RegisterDrain()
        {
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
            EditorApplication.update -= Drain;
            EditorApplication.update += Drain;
            _drainRegistered = true;
        }

        internal static void Enqueue(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
        {
            lock (PendingLock)
            {
                PendingDispatches.Add(new PendingDispatch(request, record, complete));
            }
        }

        internal static void DrainForTests()
        {
            Drain();
        }

        internal static void EnqueueLifecycleWorkForTests(string itemId)
        {
            lock (PendingLock)
            {
                PendingLifecycleWork.Add(itemId ?? string.Empty);
            }
        }

        internal static void Stop(string reasonCode)
        {
            EditorApplication.update -= Drain;
            _drainRegistered = false;
            _lastStopCode = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
            lock (PendingLock)
            {
                PendingLifecycleWork.Clear();
                PendingDispatches.Clear();
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
            _capturedMainThreadId = Thread.CurrentThread.ManagedThreadId;
        }

        private static void Drain()
        {
            List<PendingDispatch> work;
            lock (PendingLock)
            {
                if (PendingDispatches.Count == 0)
                {
                    return;
                }

                work = new List<PendingDispatch>(PendingDispatches);
                PendingDispatches.Clear();
            }

            foreach (var item in work)
            {
                try
                {
                    item.complete?.Invoke(UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId));
                }
                catch (Exception error)
                {
                    item.complete?.Invoke(UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error));
                }
            }
        }
    }
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06DispatchQueueGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。证明：direct dispatch queue can execute `host.threadCheck` on the captured Unity main thread and convert a dispatch exception into a structured operation envelope。

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add phase 5a main-thread dispatch queue"
```

## 任务 2：Real HTTP `/operations` dispatch integration

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [x] **步骤 1：编写失败的 real HTTP dispatch test**

在 `HostRuntimeTests.cs` 的 using 区域加入：

```csharp
using System.Collections;
using UnityEngine.TestTools;
```

Replace the old 5A-05 boundary test `ThreadCheckOverOperationsIsDispatchRequiredWithoutMainThreadResult` with:

```csharp
[UnityTest]
public IEnumerator HostThreadCheckOverOperationsRunsOnCapturedMainThread()
{
    var registryPath = TemporaryRegistryPath("operations-threadcheck-main-thread");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-thread-http\"}");

        yield return WaitForPendingDispatch();
        UnityAgentKitMainThread.DrainForTests();
        yield return WaitForRequestDone(request);

        if (request.error != null)
        {
            throw request.error;
        }

        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.result.body);
        Assert.AreEqual(200, request.result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-thread-http", record);
        Assert.AreEqual(string.Empty, response.code);
        Assert.AreEqual(0, response.diagnostics.Length);
        var data = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(response.data);
        Assert.AreEqual(UnityAgentKitMainThread.CapturedMainThreadIdForTests, data.capturedMainThreadId);
        Assert.AreEqual(data.capturedMainThreadId, data.executionThreadId);
        Assert.IsTrue(data.ranOnMainThread);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

Add these helpers near the existing HTTP helpers:

```csharp
private static BackgroundHttpRequest StartPostInBackground(string url, string body)
{
    var request = new BackgroundHttpRequest();
    request.thread = new Thread(() =>
    {
        try
        {
            request.result = Post(url, body);
        }
        catch (Exception error)
        {
            request.error = error;
        }
        finally
        {
            request.done = true;
        }
    });
    request.thread.IsBackground = true;
    request.thread.Start();
    return request;
}

private static IEnumerator WaitForPendingDispatch()
{
    var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
    while (UnityAgentKitMainThread.PendingDispatchCountForTests == 0 && DateTimeOffset.UtcNow < deadline)
    {
        yield return null;
    }

    Assert.Greater(UnityAgentKitMainThread.PendingDispatchCountForTests, 0);
}

private static IEnumerator WaitForRequestDone(BackgroundHttpRequest request)
{
    var deadline = DateTimeOffset.UtcNow.AddSeconds(2);
    while (!request.done && DateTimeOffset.UtcNow < deadline)
    {
        yield return null;
    }

    Assert.IsTrue(request.done);
}

private sealed class BackgroundHttpRequest
{
    internal Thread thread;
    internal bool done;
    internal Exception error;
    internal HttpResult result;
}
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06HttpDispatchRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL；`HostThreadCheckOverOperationsRunsOnCapturedMainThread` fails because existing `/operations` returns `rejected + host.dispatch_required` or never enqueues pending dispatch work. This proves the failing behavior is the missing HTTP-to-main-thread dispatch bridge.

- [x] **步骤 3：实现 non-blocking HTTP dispatch scheduling**

In `UnityAgentKitLoopbackHttpServer.HandleOperation`, after JSON parse and before `UnityAgentKitOperationRouter.Route`, insert:

```csharp
var operation = UnityAgentKitOperationRouter.NormalizeOperation(request.operation);
if (UnityAgentKitOperationRouter.RequiresMainThreadDispatch(operation))
{
    UnityAgentKitMainThread.Enqueue(request, record, response =>
    {
        ThreadPool.QueueUserWorkItem(_ => WriteJson(context.Response, 200, JsonUtility.ToJson(response)));
    });
    return;
}
```

Keep the existing direct route path for `host.echo`, missing/empty operation, and unknown operation:

```csharp
var response = UnityAgentKitOperationRouter.Route(request, record);
var statusCode = response.status == "rejected" && response.code == "operation.empty" ? 400 : 200;
WriteJson(context.Response, statusCode, JsonUtility.ToJson(response));
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06HttpDispatchGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。证明：real HTTP `POST /operations` can schedule `host.threadCheck`, the Unity test main thread can drain the dispatch queue, and the HTTP response preserves the top-level operation envelope fields from 5A-05.

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: dispatch operations from loopback HTTP"
```

## 任务 3：Non-blocking host-level timeout hook

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：编写失败的 host-level timeout tests**

Add these tests after `HostThreadCheckOverOperationsRunsOnCapturedMainThread`:

```csharp
[UnityTest]
public IEnumerator PendingDispatchTimeoutReturnsHostTimeout()
{
    var registryPath = TemporaryRegistryPath("operations-pending-timeout");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
        var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout\"}");

        yield return WaitForPendingDispatch();
        yield return WaitForRequestDone(request);

        if (request.error != null)
        {
            throw request.error;
        }

        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.result.body);
        Assert.AreEqual(200, request.result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout", record);
        Assert.AreEqual("host.dispatch_timeout", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("host.dispatch_timeout", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitHost.ResetForTests();
    }
}

[UnityTest]
public IEnumerator PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler()
{
    var registryPath = TemporaryRegistryPath("operations-timeout-nonblocking");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-nonblocking\"}");

        yield return WaitForPendingDispatch();

        Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.ActiveHandlerCountForTests);
        Assert.IsFalse(request.done);

        yield return WaitForRequestDone(request);
        Assert.IsNull(request.error);
    }
    finally
    {
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitHost.ResetForTests();
    }
}

[UnityTest]
public IEnumerator PendingDispatchTimeoutMarksMayStillBeRunning()
{
    var registryPath = TemporaryRegistryPath("operations-timeout-may-still-run");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
        var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-timeout-metadata\"}");

        yield return WaitForPendingDispatch();
        yield return WaitForRequestDone(request);

        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(request.result.body);
        AssertOperationEnvelopeMinimumFields(response, "timeout", "host.pendingDispatchTimeout", "req-timeout-metadata", record);
        Assert.AreEqual("{\"mayStillBeRunning\":true}", response.metadata);
        Assert.AreEqual("{\"mayStillBeRunning\":true}", response.diagnostics[0].details);
    }
    finally
    {
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitHost.ResetForTests();
    }
}

[UnityTest]
public IEnumerator ExpiredDispatchWorkDoesNotExecuteLater()
{
    var registryPath = TemporaryRegistryPath("operations-expired-not-executed");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(75);
        var request = StartPostInBackground(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.pendingDispatchTimeout\",\"requestId\":\"req-expired\"}");

        yield return WaitForPendingDispatch();
        yield return WaitForRequestDone(request);
        UnityAgentKitMainThread.DrainForTests();
        UnityAgentKitMainThread.DrainForTests();

        Assert.AreEqual(0, UnityAgentKitMainThread.ExpiredDispatchExecutionCountForTests);
    }
    finally
    {
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06TimeoutRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL，compiler errors mention missing `ConfigureDispatchTimeoutForTests`, `ExpiredDispatchExecutionCountForTests`, or `ActiveHandlerCountForTests`; if those symbols already exist from an implementation attempt, tests fail because `host.pendingDispatchTimeout` does not return `timeout + host.dispatch_timeout` with `mayStillBeRunning` metadata.

- [ ] **步骤 3：实现 deadline-based timeout without blocking handler or main thread**

In `UnityAgentKitOperationRouter.cs`, add this helper:

```csharp
internal static UnityAgentKitOperationResponse DispatchTimeout(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record)
{
    var startedAt = Now();
    var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
    var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
    var message = "Main-thread dispatch timed out.";
    var response = Create("timeout", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", "host.dispatch_timeout", message, operation, requestId) }, "host.dispatch_timeout", message, startedAt);
    response.metadata = "{\"mayStillBeRunning\":true}";
    response.diagnostics[0].details = "{\"mayStillBeRunning\":true}";
    return response;
}
```

In `UnityAgentKitMainThread.cs`, extend `PendingDispatch` with completion state and timer:

```csharp
internal Timer timeoutTimer;
internal bool completed;
internal bool holdForTimeout;
```

Add test properties and timeout configuration:

```csharp
private static int _dispatchTimeoutMs = 250;
private static int _expiredDispatchExecutionCount;

internal static int ExpiredDispatchExecutionCountForTests => _expiredDispatchExecutionCount;

internal static void ConfigureDispatchTimeoutForTests(int timeoutMs)
{
    _dispatchTimeoutMs = timeoutMs;
}
```

Update `Enqueue` to attach a deadline and mark `host.pendingDispatchTimeout` as the non-blocking pending hook:

```csharp
internal static void Enqueue(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, Action<UnityAgentKitOperationResponse> complete)
{
    var item = new PendingDispatch(request, record, complete);
    item.holdForTimeout = UnityAgentKitOperationRouter.NormalizeOperation(request != null ? request.operation : string.Empty) == UnityAgentKitOperationRouter.PendingDispatchTimeoutOperation;
    item.timeoutTimer = new Timer(_ => TryComplete(item, UnityAgentKitOperationRouter.DispatchTimeout(item.request, item.record)), null, _dispatchTimeoutMs, Timeout.Infinite);

    lock (PendingLock)
    {
        PendingDispatches.Add(item);
    }
}
```

Add `TryComplete`:

```csharp
private static bool TryComplete(PendingDispatch item, UnityAgentKitOperationResponse response)
{
    lock (PendingLock)
    {
        if (item.completed)
        {
            return false;
        }

        item.completed = true;
        PendingDispatches.Remove(item);
    }

    item.timeoutTimer?.Dispose();
    item.complete?.Invoke(response);
    return true;
}
```

Update `Drain` so expired/timeout-held items do not execute later:

```csharp
if (item.holdForTimeout)
{
    continue;
}

try
{
    TryComplete(item, UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId));
}
catch (Exception error)
{
    TryComplete(item, UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error));
}
```

In `ResetForTests`, reset the test counters and timeout:

```csharp
_expiredDispatchExecutionCount = 0;
_dispatchTimeoutMs = 250;
```

In `UnityAgentKitLoopbackHttpServer.cs`, add active handler count:

```csharp
private static int _activeHandlerCount;
internal static int ActiveHandlerCountForTests => _activeHandlerCount;
```

Wrap `HandleContext` body with increment/decrement:

```csharp
Interlocked.Increment(ref _activeHandlerCount);
try
{
    // existing route handling body
}
finally
{
    Interlocked.Decrement(ref _activeHandlerCount);
}
```

Keep the task 2 async response callback. The test passes only if the handler returns after scheduling dispatch while the response remains pending until the deadline callback completes it.

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06TimeoutGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。证明：host-level timeout comes from a deadline on pending dispatch work, includes `mayStillBeRunning`, leaves the Unity main thread free to keep running coroutine frames, and the HTTP handler has returned before timeout completion.

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add phase 5a host dispatch timeout"
```

## 任务 4：Stop/reload/quitting pending dispatch failure

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：编写失败的 pending cleanup tests**

Add these tests near existing lifecycle cleanup tests:

```csharp
[Test]
public void StopFailsPendingDispatchWork()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitOperationResponse response = null;

    UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
    {
        operation = "host.threadCheck",
        requestId = "req-stop-pending"
    }, TestHostRecord(49240), completed => response = completed);

    UnityAgentKitMainThread.Stop("host.stopped");

    AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-stop-pending", TestHostRecord(49240));
    Assert.AreEqual("host.stopped", response.code);
    Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
}

[Test]
public void StopFailsPendingWorkWithStoppedDiagnostic()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitOperationResponse response = null;

    UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
    {
        operation = "host.threadCheck",
        requestId = "req-stopped-diagnostic"
    }, TestHostRecord(49241), completed => response = completed);

    UnityAgentKitMainThread.Stop("host.stopped");

    Assert.AreEqual("failed", response.status);
    Assert.AreEqual("host.stopped", response.code);
    Assert.AreEqual(1, response.diagnostics.Length);
    Assert.AreEqual("host.stopped", response.diagnostics[0].code);
    Assert.AreEqual("error", response.diagnostics[0].severity);
}

[Test]
public void ReloadStopFailsPendingWorkWithoutTimeoutStatus()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitOperationResponse response = null;

    UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
    {
        operation = "host.threadCheck",
        requestId = "req-reload-pending"
    }, TestHostRecord(49242), completed => response = completed);

    UnityAgentKitMainThread.Stop("host.stopped_for_reload");

    AssertOperationEnvelopeMinimumFields(response, "failed", "host.threadCheck", "req-reload-pending", TestHostRecord(49242));
    Assert.AreEqual("host.stopped_for_reload", response.code);
    Assert.AreNotEqual("timeout", response.status);
    Assert.AreNotEqual("host.dispatch_timeout", response.code);
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06PendingCleanupRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL；pending cleanup tests fail because current `Stop` clears dispatch work without completing callbacks, or because no `host.stopped` / `host.stopped_for_reload` operation envelope helper exists.

- [ ] **步骤 3：实现 pending failure envelopes on Stop**

In `UnityAgentKitOperationRouter.cs`, add:

```csharp
internal static UnityAgentKitOperationResponse Stopped(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record, string reasonCode)
{
    var startedAt = Now();
    var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
    var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;
    var code = string.IsNullOrEmpty(reasonCode) ? "host.stopped" : reasonCode;
    return Failed(operation, requestId, record, code, "Pending dispatch work was stopped.", startedAt);
}
```

In `UnityAgentKitMainThread.Stop`, replace direct `PendingDispatches.Clear()` with failure completion:

```csharp
List<PendingDispatch> pendingDispatches;
lock (PendingLock)
{
    PendingLifecycleWork.Clear();
    pendingDispatches = new List<PendingDispatch>(PendingDispatches);
}

foreach (var item in pendingDispatches)
{
    TryComplete(item, UnityAgentKitOperationRouter.Stopped(item.request, item.record, _lastStopCode));
}
```

Keep `_lastStopCode` set before the pending failure loop. `TryComplete` disposes each item deadline timer, so a stop/reload failure cannot later turn into `host.dispatch_timeout`.

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06PendingCleanupGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。证明：Stop/reload/quitting pending work is completed with reason-specific structured failure, pending queue is cleared, and pending stop failure is not classified as timeout.

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: fail pending dispatch work on host stop"
```

## 任务 5：Final 5A-06 verification and scope guard

**文件：**
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 验证：`unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml`

- [ ] **步骤 1：运行完整 Unity HostRuntimeTests**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；result XML contains `result="Passed"` and `failed="0"`。证明：5A-01 through 5A-06 Unity host runtime foundation tests remain green in the same `HostRuntimeTests` suite。

- [ ] **步骤 2：验证 5A-06 evidence names present in result XML**

运行：

```bash
python - <<'PY'
from pathlib import Path
xml = Path('unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml').read_text(encoding='utf-8')
required = [
    'HostThreadCheckOverOperationsRunsOnCapturedMainThread',
    'DispatchExceptionReturnsStructuredDiagnostics',
    'PendingDispatchTimeoutReturnsHostTimeout',
    'PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler',
    'PendingDispatchTimeoutMarksMayStillBeRunning',
    'StopFailsPendingDispatchWork',
    'StopFailsPendingWorkWithStoppedDiagnostic',
    'ReloadStopFailsPendingWorkWithoutTimeoutStatus',
    'ExpiredDispatchWorkDoesNotExecuteLater',
]
missing = [name for name in required if name not in xml]
if missing:
    raise SystemExit('missing evidence tests: ' + ', '.join(missing))
print('PASS Phase 5A-06 evidence names present')
PY
```

预期输出：

```text
PASS Phase 5A-06 evidence names present
```

证明：final result file includes the dispatch, timeout, pending cleanup, and expired work tests required by 5A-06.

- [ ] **步骤 3：运行 scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
forbidden_paths = [
    Path('plugins/unity-agent-kit/src/host'),
    Path('plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts'),
    Path('unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs'),
]
existing = [str(path).replace('\\', '/') for path in forbidden_paths if path.exists()]
if existing:
    raise SystemExit('5A-06 scope guard found out-of-scope paths: ' + ', '.join(existing))
print('PASS Phase 5A-06 scope guard clean')
PY
```

预期输出：

```text
PASS Phase 5A-06 scope guard clean
```

证明：5A-06 implementation did not create TS host client, vertical smoke, or Unity vertical smoke files. If a forbidden path already exists from a completed sibling plan in the working tree, replace this check with a git diff path check against the 5A-06 implementation commits and require no 5A-06 diff under those paths.

- [ ] **步骤 4：Commit final verification notes only if files changed**

If task execution changed only code and tests already committed in tasks 1-4, do not create an empty commit. If plan checkbox synchronization or execution index synchronization is part of the selected workflow, commit those documentation edits separately after review.

```bash
git status --short
```

预期：no uncommitted code changes after implementation commits, except plan checkbox updates performed by the execution workflow.

## 自检结果

- **规格覆盖度：** `5A-DISPATCH-01` is covered by tasks 1-2；`5A-DISPATCH-02` by tasks 1 and 4；`5A-OPS-02` by tasks 1-2；`5A-TIMEOUT-01` by task 3；`5A-TIMEOUT-02` by tasks 3 and 5.
- **禁止词扫描：** Plan text avoids deferred implementation markers and vague repair instructions; every behavior task has concrete tests, commands, expected failure, implementation target, expected pass, and commit step.
- **类型一致性：** Tests and implementation use existing DTO names `UnityAgentKitOperationRequest`, `UnityAgentKitOperationResponse`, `UnityAgentKitDiagnostic`, `UnityAgentKitThreadCheckResult`; new helpers are consistently named `RequiresMainThreadDispatch`, `RunOnMainThread`, `DispatchTimeout`, `Stopped`, `Enqueue`, and `DrainForTests`.
- **拆分检查：** Recorded in the header; 5A-06 remains separate from 5A-07 TS client/rebind and 5A-08 vertical smoke/completion evidence.
- **上游约束覆盖：** Roadmap/contract/index constraints are mapped to boundary裁决, upstream summary, reference input mapping, Plan Card Coverage, and final scope guard.
- **参考输入映射：** Each reference input lists adopted content, excluded content, exclusion reason, and landing tasks.
- **验证强度：** Behavior is proven through Unity DTO deserialization and real HTTP `/operations` coroutine tests, not only file or symbol existence. Scope guard is explicitly non-behavioral and only protects sibling-plan boundaries.
