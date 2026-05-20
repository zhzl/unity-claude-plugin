# Unity Agent Kit Phase 5A-03 Host Lifecycle + Probe Contract 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5A-03 的 Unity host bootstrap、lifecycle cleanup、restart/epoch continuity，以及 canonical `GET /probe` HTTP contract。

**架构：** 5A-03 合并原 5A-04 ownership：同一 Unity loopback host 同时承载 lifecycle evidence 和 canonical `/probe` evidence，避免为了证明 old listener stopped 而发明内部 endpoint 或弱化验证。Unity C# host 负责 dynamic port、registry write、compile/update start guard、reload/quitting/Stop cleanup、`GET /probe` DTO response、JSON content-type/framing/closed body；不实现 `/operations`、operation router、dispatch/timeout、TS rebind/client 或 vertical smoke。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、`HttpListener` loopback HTTP、`UnityEngine.JsonUtility` DTO JSON、project-scoped registry file under `unity/Library/UnityAgentKit/host.json`。
**拆分检查：** 已检查；无需拆分。原 5A-04 folded into 5A-03，因为 lifecycle cleanup 的强验证依赖 canonical `/probe` runtime behavior。合并后仍为 3 个 strict writing-plans tasks，覆盖 `5A-LIFE-01`、`5A-LIFE-02`、`5A-REG-02`、`5A-HTTP-01`、`5A-HTTP-03`，不触碰 5A-05 到 5A-08。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-03 — Host bootstrap + lifecycle cleanup + GET /probe HTTP contract

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；保留 Unity host runtime、loopback HTTP、registry/probe、host rebirth / rebind 的底层可靠性方向；Unity C# host source of truth 只放在 `unity/Assets/UnityAgentKit/`；TS 与 Unity C# 边界清楚；Unity C# 不承担长 workflow 编排或阻塞等待。
- **Phase Scope:** Phase 5A 建立 Host Runtime foundation。合并后的 5A-03 只实现 Unity host bootstrap、dynamic port loopback listener、project-scoped registry write、restart/epoch continuity、reload/quitting/Stop cleanup、canonical `GET /probe` active host validation fields、JSON response content type/framing/closed stream。
- **Phase Out-of-scope:** 5A-03 不实现 `POST /operations`、operation normalization/router、`host.echo`、`host.threadCheck`、main-thread dispatch result execution、host-level timeout hook、TS registry/probe/invoke/rebind client、MCP public tool registration、artifact/resource store、workflow timeout/polling、`/unity` skill 或 final daily loop E2E。
- **Success Criteria:** Unity EditMode tests 证明：compiling/updating 时 host 不启动；compile/updating 结束后 update tick 可启动；`_started == true` 但 server stopped 时会重启；host start 使用 dynamic port 并写 registry；restart/reload 产生新 `hostId` 且 `hostEpoch = previousEpoch + 1`；`GET /probe` 通过真实 HTTP 返回 active validation fields；probe response 设置 JSON content type、UTF-8 body/framing 且 body readable；record unavailable 时 `/probe` 返回 structured not_ready；unknown route 和 wrong method 返回 structured JSON；reload/quitting/Stop 关闭 listener、清空 in-memory record、注销 drain callback、清理 lifecycle-owned pending work；old listener no longer responds。
- **用户确认事项:** 新插件不做 v2 旧 public tools 兼容层；v2 正确底层机制必须映射进 plan，不能降级为 stub；Unity host/runtime/test 不能通过阻塞 Unity main thread 或 HTTP handler 制造 timeout；若相邻 plan 的强验证依赖同一个 canonical runtime behavior，应调整 plan ownership，而不是发明 internal endpoint、test-only route 或弱 port 状态检查。
- **本计划不包含:** 不更新 Phase 5A completion evidence；不把 Phase 5A 或 Phase 5 标记 completed；不创建 TS host client 文件；不实现 canonical `/operations`；不实现 operation catalog；不采用 v2 `.ai-debug/unity-mcp-v2/host.json` registry path；不采用 v2 `instanceId` / `epoch` 字段名作为新 public contract，统一映射为 `hostId` / `hostEpoch`。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本计划如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚；基于 v2 host runtime 演进 | 只在 `unity/Assets/UnityAgentKit/` 新增 C# host bootstrap、loopback lifecycle、probe contract 和 cleanup foundation；不复制 C# host 到 TS plugin | 任务 1-3 | Unity EditMode tests 覆盖 host start guard、dynamic port、registry write、restart identity、real `/probe`、Stop cleanup |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / Unity host | 本计划不创建 skill 文件，只交付 runtime lifecycle + probe foundation | 任务 1-3 | 文件清单不包含 `plugins/unity-agent-kit/skills/` |
| Phase 3 | Public action contract 稳定；public/internal 分离；schema 有界 | 本计划不注册 public MCP tools，不实现 public action schema；`/probe` 只暴露 host availability DTO，不承载 operation result envelope | 任务 2 | Unity tests 只断言 `UnityAgentKitProbeResponse` active fields，不断言 operation result envelope |
| Phase 4 | TS 负责 timeout/polling/final judgment；Unity 负责短主线程动作、DTO/result envelope、host rebirth / rebind 限制恢复 | Stop/reload/quitting cleanup 和 restart identity evidence 建立 host rebirth foundation；不加入 workflow timeout、job 或 artifact | 任务 1、3 | `RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap`、`StopForReloadStopsLoopbackServerAndClearsHostRecord`、`StoppedOldListenerNoLongerResponds` |

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 采用 `5A-LIFE-01`、`5A-LIFE-02`、`5A-REG-02`、`5A-HTTP-01`、`5A-HTTP-03` 的 lifecycle、restart identity、canonical `/probe` 和 response framing contract | 不执行 `5A-HTTP-02`、`5A-DISPATCH-*`、`5A-TIMEOUT-*`、`5A-REBIND-*`、`5A-EVIDENCE-*` | 合并只解决 lifecycle + `/probe` 强依赖，不扩大到 operations 或 TS client | 任务 1-3 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 采用 merged 5A-03 ownership：原 5A-04 folded into 5A-03；后续 5A-05/5A-07/5A-08 依赖 5A-03 | 不新增第 9 个 sibling plan；不保留 5A-04 重复 ownership | 避免 lifecycle plan 为了证明 old listener stopped 而引入非 contract endpoint | 任务 1-3 |
| `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` | 采用 5A-02 已完成的 `UnityAgentKitHostRecord`、`UnityAgentKitProbeResponse` DTO fields | 不新增 5A-05 operation response behavior | `/probe` uses `UnityAgentKitProbeResponse`; `/operations` belongs to 5A-05 | 任务 2 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` | 采用 5A-02 已完成的 project root、registry path、`CreateRecord`、`ReadExistingEpoch`、`WriteRecord`、continuity identity helpers | 不改变 registry path 或 DTO field names | 5A-03 依赖 5A-02 contract，不重新设计 registry | 任务 1-3 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2HostEntry.cs` | 采用 `[InitializeOnLoad]` host entry、callback registration、`ShouldSkipStart`、update tick retry、restart when started flag and server running diverge | 不采用 fixed default port `38123`；不采用 v2 `instanceId` / `epoch` names | 5A contract requires dynamic port and new `hostId` / `hostEpoch` contract | 任务 1 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs` | 采用 `Start()` first calls `Stop()`、background listener thread、`listener.Stop()` + `listener.Close()`、shutdown exceptions as normal exit、`127.0.0.1` prefix、real `/probe` route、JSON content type/framing/closed stream | 不采用 blocking main-thread wait, `ManualResetEvent.WaitOne` timeout path, `/operations` handling, string extraction as protocol, v2 `host.probe` operation compatibility | 5A-03 covers only lifecycle + canonical `/probe`; dispatch/timeout and operations belong to 5A-05/5A-06 | 任务 2-3 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Tests/UnityMcpV2HttpServerTests.cs` | 采用 real loopback request style, assigned-port URL assertions, and route start/stop evidence | 不采用 string contains assertions for protocol fields | New tests deserialize DTO JSON through `JsonUtility` and inspect HTTP response status/content-type/body | 任务 2-3 |

## 文件结构

- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs` — Editor host bootstrap, callback registration, update tick retry, dynamic port start, registry write, restart identity/epoch continuity, lifecycle Stop entry points.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — Loopback listener lifecycle, assigned-port `127.0.0.1` prefix, background listener thread, canonical `GET /probe`, JSON response writer, `Start()`/`Stop()` cleanup.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — Minimal lifecycle drain registration and lifecycle-owned pending work cleanup foundation; no operation dispatch execution in 5A-03.
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — EditMode tests for host bootstrap, lifecycle skip/retry, restart identity, real `/probe`, HTTP response framing, listener cleanup, reload/quitting cleanup, update/drain callback cleanup, old listener no longer responds.
- 已存在依赖：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — DTOs from 5A-02.
- 已存在依赖：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` — Registry foundation from 5A-02.

## Plan Card Coverage

| Requirement ID | 覆盖任务 | 行为证据 |
|---|---|---|
| `5A-LIFE-01` | 任务 1 | `HostLifecycleSkipRulesCoverCompileUpdateAndStoppedServer`、`HostDoesNotStartWhileCompilingOrUpdatingOnTick`、`HostRetriesStartOnUpdateTickAfterCompileEnds` prove host does not start during compiling/updating and retries after those states end. |
| `5A-LIFE-02` | 任务 3 | `StartStopsExistingListenerBeforeBinding`、`StopForReloadStopsLoopbackServerAndClearsHostRecord`、`EditorQuittingStopsLoopbackServerAndClearsLifecyclePendingWork`、`StopClosesListenerAndUnregistersDrain`、`StoppedOldListenerNoLongerResponds` prove cleanup of listener, record, drain callback, lifecycle-owned pending work, and old listener. |
| `5A-REG-02` | 任务 1 | `StartForTestsWritesRegistryWithDynamicPort` and `RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap` prove host bootstrap uses previous registry epoch, creates new `hostId`, and increments `hostEpoch`. |
| `5A-HTTP-01` | 任务 2 | `BuildProbeUrlUsesAssignedPortAndCanonicalPath`、`ProbeEndpointReturnsHostIdentityOverHttp`、`ProbeReturnsNotReadyWhenHostRecordUnavailable` prove canonical `GET /probe` and active host fields. |
| `5A-HTTP-03` | 任务 2-3 | `ProbeEndpointReturnsJsonContentTypeAndReadableUtf8Body`、`UnknownRouteReturns404StructuredJson`、`WrongMethodReturns405StructuredJson`、`StoppedOldListenerNoLongerResponds` prove JSON content type/framing/closed readable response streams and stopped listener behavior. |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 8 分处理 |
|---|---|---:|---|
| Lifecycle start guard | Pure `ShouldSkipStart` plus tick-driven tests for compiling/updating and stopped-server restart | 8 | Stop and revise `UnityAgentKitHost`; do not add operation router |
| Dynamic port + registry write | Select loopback dynamic port, create registry record with 5A-02 helper, write DTO JSON to registry | 8 | Stop and revise host bootstrap; do not hardcode port |
| Restart identity / epoch | Read existing epoch, create new `hostId`, write `hostEpoch = previousEpoch + 1` | 8 | Stop and revise bootstrap continuity; do not enter TS rebind simulations |
| Probe HTTP contract | Real `GET /probe` returns DTO fields over `127.0.0.1:{port}/probe`, including not_ready response when record unavailable | 8 | Stop and revise probe handler; do not add `/operations` |
| HTTP response framing | Status code, JSON content-type, UTF-8 body, content length, closed readable output stream verified with `HttpWebResponse` | 8 | Stop and revise response writer; do not use string search as protocol evidence |
| Lifecycle cleanup | `Start()` first `Stop()`s old listener; reload/quitting/Stop close listener, clear current record, unregister drain, clear lifecycle-owned pending work, and old URL fails | 8 | Stop and revise lifecycle cleanup; do not implement dispatch execution or timeout |
| Scope boundary | No `/operations`, operation router, dispatch timeout, TS client/rebind, vertical smoke, workflow timeout, or public MCP tool registration | 8 | Remove out-of-scope files/tests and rerun consistency review |

低分处理规则：任何对象低于 8/10 时，5A-03 保持 incomplete，只允许修复 lifecycle/bootstrap/probe foundation；不得用 TS simulation、operation stub、blocking wait、string search 或 fake success result 补强 evidence。

## 执行前置条件

执行任务 1 前先确认 5A-02 foundation 已存在且最近验证通过：

- `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` exists and defines `UnityAgentKitHostRecord` and `UnityAgentKitProbeResponse`.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` exists and exposes `CreateRecord`, `ReadExistingEpoch`, `WriteRecord`, and `HasSameContinuityIdentity`.
- Run the existing Unity EditMode command before changing 5A-03 files:

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03PreconditionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，现有 5A-02 DTO/registry tests pass。该检查只确认 5A-02 dependency is present，不作为 5A-03 lifecycle/probe behavior evidence。

## 任务 1：Host bootstrap、dynamic registry 和 lifecycle start guard

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 依赖：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`

- [x] **步骤 1：编写失败的 host bootstrap 和 lifecycle guard tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 顶部补充 imports：

```csharp
using System.IO;
using System.Net;
using System.Net.Sockets;
```

在 `HostRuntimeTests` class 内、`TemporaryRegistryPath` helper 前加入：

```csharp
[Test]
public void HostLifecycleSkipRulesCoverCompileUpdateAndStoppedServer()
{
    Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: true, serverRunning: true, isCompiling: false, isUpdating: false));
    Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: true, isUpdating: false));
    Assert.IsTrue(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: false, isUpdating: true));
    Assert.IsFalse(UnityAgentKitHost.ShouldSkipStart(started: false, serverRunning: false, isCompiling: false, isUpdating: false));
    Assert.IsFalse(UnityAgentKitHost.ShouldSkipStart(started: true, serverRunning: false, isCompiling: false, isUpdating: false));
}

[Test]
public void StartForTestsWritesRegistryWithDynamicPort()
{
    var registryPath = TemporaryRegistryPath("host-start");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var roundTrip = UnityAgentKitHostRegistry.ReadRecord(registryPath);

        Assert.NotNull(record);
        Assert.NotNull(roundTrip);
        Assert.AreEqual(record.hostId, roundTrip.hostId);
        Assert.AreEqual(record.hostEpoch, roundTrip.hostEpoch);
        Assert.AreEqual(UnityAgentKitHostRegistry.ReadyStatus, roundTrip.status);
        Assert.Greater(roundTrip.port, 0);
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap()
{
    var registryPath = TemporaryRegistryPath("host-bootstrap-restart");

    try
    {
        var first = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitHost.StopForTests("host.stopped");
        var second = UnityAgentKitHost.StartForTests(registryPath);

        Assert.AreNotEqual(first.hostId, second.hostId);
        Assert.AreEqual(first.hostEpoch + 1, second.hostEpoch);
        Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(first, second));
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void HostDoesNotStartWhileCompilingOrUpdatingOnTick()
{
    var registryPath = TemporaryRegistryPath("tick-skip");

    try
    {
        UnityAgentKitHost.TickForTests(isCompiling: true, isUpdating: false, now: 1.0, registryPath: registryPath);
        UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: true, now: 2.0, registryPath: registryPath);

        Assert.IsFalse(UnityAgentKitHost.IsStartedForTests);
        Assert.IsFalse(File.Exists(registryPath));
        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void HostRetriesStartOnUpdateTickAfterCompileEnds()
{
    var registryPath = TemporaryRegistryPath("tick-retry");

    try
    {
        UnityAgentKitHost.TickForTests(isCompiling: true, isUpdating: false, now: 1.0, registryPath: registryPath);
        UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: false, now: 2.0, registryPath: registryPath);
        var record = UnityAgentKitHostRegistry.ReadRecord(registryPath);

        Assert.IsTrue(UnityAgentKitHost.IsStartedForTests);
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
        Assert.NotNull(record);
        Assert.AreEqual(1, record.hostEpoch);
        Assert.IsNotEmpty(record.hostId);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void RestartsWhenStartedFlagTrueButServerStopped()
{
    var registryPath = TemporaryRegistryPath("server-stopped-restart");

    try
    {
        var first = UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitLoopbackHttpServer.Stop("host.stopped");

        UnityAgentKitHost.TickForTests(isCompiling: false, isUpdating: false, now: 3.0, registryPath: registryPath);
        var second = UnityAgentKitHost.CurrentRecordForTests;

        Assert.NotNull(second);
        Assert.AreNotEqual(first.hostId, second.hostId);
        Assert.AreEqual(first.hostEpoch + 1, second.hostEpoch);
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.IsRunning);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，编译错误包含 `UnityAgentKitHost` 和 `UnityAgentKitLoopbackHttpServer` 不存在，或等价 missing type error。

- [x] **步骤 3：实现最少 host bootstrap 和 listener lifecycle skeleton**

创建 `unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`：

```csharp
using System;
using System.Net;
using System.Net.Sockets;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    [InitializeOnLoad]
    public static class UnityAgentKitHost
    {
        private const double RetryDelaySeconds = 2.0;
        private static bool _started;
        private static int _lastKnownEpoch = -1;
        private static double _nextStartAttemptAt;
        private static UnityAgentKitHostRecord _currentRecord;
        private static string _registryPathForTests;

        static UnityAgentKitHost()
        {
            RegisterCallbacks();
        }

        internal static bool IsStartedForTests => _started;
        internal static UnityAgentKitHostRecord CurrentRecordForTests => _currentRecord;

        internal static void RegisterCallbacks()
        {
            AssemblyReloadEvents.beforeAssemblyReload -= StopForReload;
            AssemblyReloadEvents.beforeAssemblyReload += StopForReload;
            EditorApplication.quitting -= StopForQuitting;
            EditorApplication.quitting += StopForQuitting;
            EditorApplication.update -= Tick;
            EditorApplication.update += Tick;
        }

        internal static bool ShouldSkipStart(bool started, bool serverRunning, bool isCompiling, bool isUpdating)
        {
            return (started && serverRunning) || isCompiling || isUpdating;
        }

        internal static void TickForTests(bool isCompiling, bool isUpdating, double now, string registryPath)
        {
            _registryPathForTests = registryPath;
            Tick(isCompiling, isUpdating, now);
        }

        internal static UnityAgentKitHostRecord StartForTests(string registryPath)
        {
            _registryPathForTests = registryPath;
            return StartHost();
        }

        internal static void StopForTests(string reasonCode)
        {
            Stop(reasonCode);
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastKnownEpoch = -1;
            _nextStartAttemptAt = 0;
            _registryPathForTests = null;
        }

        private static void Tick()
        {
            Tick(EditorApplication.isCompiling, EditorApplication.isUpdating, EditorApplication.timeSinceStartup);
        }

        private static void Tick(bool isCompiling, bool isUpdating, double now)
        {
            if (ShouldSkipStart(_started, UnityAgentKitLoopbackHttpServer.IsRunning, isCompiling, isUpdating))
            {
                return;
            }

            if (now < _nextStartAttemptAt)
            {
                return;
            }

            try
            {
                StartHost();
                _nextStartAttemptAt = 0;
            }
            catch (Exception error)
            {
                _nextStartAttemptAt = now + RetryDelaySeconds;
                Debug.LogWarning("[UnityAgentKit] Failed to start host; retrying in " + RetryDelaySeconds + " seconds. " + error.Message);
            }
        }

        private static UnityAgentKitHostRecord StartHost()
        {
            var previousEpoch = _lastKnownEpoch >= 0
                ? _lastKnownEpoch
                : UnityAgentKitHostRegistry.ReadExistingEpoch(_registryPathForTests);
            var record = UnityAgentKitHostRegistry.CreateRecord(SelectDynamicPort(), previousEpoch);
            UnityAgentKitLoopbackHttpServer.Start(record);
            UnityAgentKitHostRegistry.WriteRecord(record, _registryPathForTests);
            _currentRecord = record;
            _lastKnownEpoch = record.hostEpoch;
            _started = true;
            return record;
        }

        private static int SelectDynamicPort()
        {
            var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            try
            {
                return ((IPEndPoint)listener.LocalEndpoint).Port;
            }
            finally
            {
                listener.Stop();
            }
        }

        private static void StopForReload()
        {
            Stop("host.stopped_for_reload");
        }

        private static void StopForQuitting()
        {
            Stop("host.editor_quitting");
        }

        private static void Stop(string reasonCode)
        {
            UnityAgentKitLoopbackHttpServer.Stop(reasonCode);
            _currentRecord = null;
            _started = false;
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`：

```csharp
using System;
using System.Net;
using System.Threading;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitLoopbackHttpServer
    {
        private static HttpListener _listener;
        private static Thread _thread;
        private static UnityAgentKitHostRecord _record;

        internal static bool IsRunning
        {
            get
            {
                var listener = _listener;
                return listener != null && listener.IsListening;
            }
        }

        internal static string BuildLoopbackPrefix(int port)
        {
            return "http://127.0.0.1:" + port + "/";
        }

        internal static void Start(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                throw new ArgumentNullException(nameof(record));
            }

            Stop("host.restarting");
            _record = record;
            var listener = new HttpListener();
            listener.Prefixes.Add(BuildLoopbackPrefix(record.port));
            listener.Start();
            _listener = listener;
            _thread = new Thread(ListenLoop)
            {
                IsBackground = true,
                Name = "UnityAgentKitLoopbackHttpServer"
            };
            _thread.Start();
        }

        internal static void Stop(string reasonCode = "host.stopped")
        {
            var listener = _listener;
            _listener = null;
            _record = null;
            _thread = null;
            if (listener == null)
            {
                return;
            }

            try
            {
                listener.Stop();
                listener.Close();
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
        }

        private static void ListenLoop()
        {
        }
    }
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS；结果 XML 包含 `result="Passed"`，并且新增 tests `HostLifecycleSkipRulesCoverCompileUpdateAndStoppedServer`、`StartForTestsWritesRegistryWithDynamicPort`、`RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap`、`HostDoesNotStartWhileCompilingOrUpdatingOnTick`、`HostRetriesStartOnUpdateTickAfterCompileEnds`、`RestartsWhenStartedFlagTrueButServerStopped` 通过。该检查证明 host bootstrap guard、dynamic port registry write、restart identity/epoch continuity 和 lifecycle retry 成立，因为断言来自真实 registry DTO 和 listener state。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add unity agent kit host bootstrap lifecycle"
```

## 任务 2：Canonical GET /probe HTTP contract

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 依赖：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`

- [x] **步骤 1：编写失败的 real `/probe` HTTP tests**

在 `HostRuntimeTests` class 内、`TemporaryRegistryPath` helper 前加入 tests：

```csharp
[Test]
public void BuildProbeUrlUsesAssignedPortAndCanonicalPath()
{
    Assert.AreEqual("http://127.0.0.1:49152/", UnityAgentKitLoopbackHttpServer.BuildLoopbackPrefix(49152));
    Assert.AreEqual("http://127.0.0.1:49152/probe", UnityAgentKitLoopbackHttpServer.BuildProbeUrl(49152));
}

[Test]
public void ProbeEndpointReturnsHostIdentityOverHttp()
{
    var registryPath = TemporaryRegistryPath("probe-identity");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var response = ReadProbe(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));

        Assert.AreEqual(record.hostId, response.hostId);
        Assert.AreEqual(record.hostEpoch, response.hostEpoch);
        Assert.AreEqual(record.projectRoot, response.projectRoot);
        Assert.AreEqual(UnityAgentKitHostRegistry.ProtocolVersion, response.protocolVersion);
        Assert.AreEqual(record.port, response.port);
        Assert.AreEqual(UnityAgentKitHostRegistry.ReadyStatus, response.status);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void ProbeEndpointReturnsJsonContentTypeAndReadableUtf8Body()
{
    var registryPath = TemporaryRegistryPath("probe-content-type");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Get(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));
        var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        StringAssert.StartsWith("application/json", result.contentType);
        Assert.Greater(result.contentLength, 0);
        Assert.AreEqual(record.hostId, response.hostId);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void ProbeReturnsNotReadyWhenHostRecordUnavailable()
{
    var port = FreeTcpPort();

    try
    {
        UnityAgentKitLoopbackHttpServer.StartWithoutRecordForTests(port);
        var result = Get(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(port));
        var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        Assert.AreEqual("not_ready", response.status);
        Assert.AreEqual("host.not_ready", response.code);
        Assert.IsNotEmpty(response.message);
    }
    finally
    {
        UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
    }
}

[Test]
public void UnknownRouteReturns404StructuredJson()
{
    var registryPath = TemporaryRegistryPath("probe-unknown-route");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Get("http://127.0.0.1:" + record.port + "/unknown");
        var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

        Assert.AreEqual(404, result.statusCode);
        StringAssert.StartsWith("application/json", result.contentType);
        Assert.AreEqual("not_ready", response.status);
        Assert.AreEqual("http.not_found", response.code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void WrongMethodReturns405StructuredJson()
{
    var registryPath = TemporaryRegistryPath("probe-wrong-method");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port), "{}");
        var response = JsonUtility.FromJson<UnityAgentKitProbeResponse>(result.body);

        Assert.AreEqual(405, result.statusCode);
        StringAssert.StartsWith("application/json", result.contentType);
        Assert.AreEqual("not_ready", response.status);
        Assert.AreEqual("http.method_not_allowed", response.code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

Add these helpers before `TemporaryRegistryPath`:

```csharp
private static UnityAgentKitProbeResponse ReadProbe(string url)
{
    return JsonUtility.FromJson<UnityAgentKitProbeResponse>(Get(url).body);
}

private static HttpResult Get(string url)
{
    return Request(url, "GET", string.Empty);
}

private static HttpResult Post(string url, string body)
{
    return Request(url, "POST", body);
}

private static HttpResult Request(string url, string method, string body)
{
    var request = (HttpWebRequest)WebRequest.Create(url);
    request.Method = method;
    request.Timeout = 1000;
    request.ReadWriteTimeout = 1000;
    if (method == "POST")
    {
        var payload = System.Text.Encoding.UTF8.GetBytes(body ?? string.Empty);
        request.ContentType = "application/json";
        request.ContentLength = payload.Length;
        using (var stream = request.GetRequestStream())
        {
            stream.Write(payload, 0, payload.Length);
        }
    }

    try
    {
        return ReadHttpResponse((HttpWebResponse)request.GetResponse());
    }
    catch (WebException error)
    {
        if (error.Response is HttpWebResponse response)
        {
            return ReadHttpResponse(response);
        }

        throw;
    }
}

private static HttpResult ReadHttpResponse(HttpWebResponse response)
{
    using (response)
    using (var stream = response.GetResponseStream())
    using (var reader = new StreamReader(stream))
    {
        return new HttpResult
        {
            statusCode = (int)response.StatusCode,
            contentType = response.ContentType,
            contentLength = response.ContentLength,
            body = reader.ReadToEnd()
        };
    }
}

private static int FreeTcpPort()
{
    var listener = new TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    try
    {
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }
    finally
    {
        listener.Stop();
    }
}

private struct HttpResult
{
    public int statusCode;
    public string contentType;
    public long contentLength;
    public string body;
}
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，编译错误包含 `BuildProbeUrl` 或 `StartWithoutRecordForTests` 不存在，或 real HTTP `/probe` request fails because `ListenLoop` does not handle requests.

- [x] **步骤 3：实现 canonical `/probe` and JSON response writer**

In `UnityAgentKitLoopbackHttpServer.cs`, replace the skeleton with:

```csharp
using System;
using System.Net;
using System.Text;
using System.Threading;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitLoopbackHttpServer
    {
        private static HttpListener _listener;
        private static Thread _thread;
        private static UnityAgentKitHostRecord _record;

        internal static bool IsRunning
        {
            get
            {
                var listener = _listener;
                return listener != null && listener.IsListening;
            }
        }

        internal static string BuildProbeUrl(int port)
        {
            return "http://127.0.0.1:" + port + "/probe";
        }

        internal static string BuildLoopbackPrefix(int port)
        {
            return "http://127.0.0.1:" + port + "/";
        }

        internal static void Start(UnityAgentKitHostRecord record)
        {
            if (record == null)
            {
                throw new ArgumentNullException(nameof(record));
            }

            StartListener(record, record.port);
        }

        internal static void StartWithoutRecordForTests(int port)
        {
            StartListener(null, port);
        }

        internal static void Stop(string reasonCode = "host.stopped")
        {
            var listener = _listener;
            _listener = null;
            _record = null;
            _thread = null;
            if (listener == null)
            {
                return;
            }

            try
            {
                listener.Stop();
                listener.Close();
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
        }

        private static void StartListener(UnityAgentKitHostRecord record, int port)
        {
            Stop("host.restarting");
            _record = record;
            var listener = new HttpListener();
            listener.Prefixes.Add(BuildLoopbackPrefix(port));
            listener.Start();
            _listener = listener;
            _thread = new Thread(ListenLoop)
            {
                IsBackground = true,
                Name = "UnityAgentKitLoopbackHttpServer"
            };
            _thread.Start();
        }

        private static void ListenLoop()
        {
            while (true)
            {
                var listener = _listener;
                if (listener == null || !listener.IsListening)
                {
                    return;
                }

                try
                {
                    HandleContext(listener.GetContext());
                }
                catch (HttpListenerException)
                {
                    return;
                }
                catch (ObjectDisposedException)
                {
                    return;
                }
                catch (Exception error)
                {
                    Debug.LogWarning("[UnityAgentKit] Loopback HTTP listener error: " + error.Message);
                }
            }
        }

        private static void HandleContext(HttpListenerContext context)
        {
            var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
            if (path == "/probe" && context.Request.HttpMethod == "GET")
            {
                WriteJson(context.Response, 200, JsonUtility.ToJson(CreateProbeResponse()));
                return;
            }

            if (path == "/probe")
            {
                WriteJson(context.Response, 405, JsonUtility.ToJson(FailureProbe("http.method_not_allowed", "Method not allowed.")));
                return;
            }

            WriteJson(context.Response, 404, JsonUtility.ToJson(FailureProbe("http.not_found", "Unknown route.")));
        }

        private static UnityAgentKitProbeResponse CreateProbeResponse()
        {
            var record = _record;
            if (record == null)
            {
                return FailureProbe("host.not_ready", "Unity Agent Kit host record is not available.");
            }

            return new UnityAgentKitProbeResponse
            {
                hostId = record.hostId,
                hostEpoch = record.hostEpoch,
                projectRoot = record.projectRoot,
                protocolVersion = record.protocolVersion,
                port = record.port,
                status = record.status,
                code = string.Empty,
                message = string.Empty
            };
        }

        private static UnityAgentKitProbeResponse FailureProbe(string code, string message)
        {
            return new UnityAgentKitProbeResponse
            {
                status = "not_ready",
                code = code ?? string.Empty,
                message = message ?? string.Empty
            };
        }

        private static void WriteJson(HttpListenerResponse response, int statusCode, string json)
        {
            var payload = Encoding.UTF8.GetBytes(string.IsNullOrEmpty(json) ? "{}" : json);
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = payload.Length;
            response.OutputStream.Write(payload, 0, payload.Length);
            response.OutputStream.Close();
        }
    }
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS；结果 XML 包含 `result="Passed"`，并且新增 tests `BuildProbeUrlUsesAssignedPortAndCanonicalPath`、`ProbeEndpointReturnsHostIdentityOverHttp`、`ProbeEndpointReturnsJsonContentTypeAndReadableUtf8Body`、`ProbeReturnsNotReadyWhenHostRecordUnavailable`、`UnknownRouteReturns404StructuredJson`、`WrongMethodReturns405StructuredJson` 通过。该检查证明 `5A-HTTP-01` 和 `5A-HTTP-03`，因为 tests 通过真实 HTTP request 读取 DTO fields、status code、content type、content length 和 readable body。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add unity agent kit probe http contract"
```

## 任务 3：Reload/quitting/Stop cleanup and old listener evidence

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [x] **步骤 1：编写失败的 cleanup tests**

在 `HostRuntimeTests` class 内、`TemporaryRegistryPath` helper 前加入 tests：

```csharp
[Test]
public void StopForReloadStopsLoopbackServerAndClearsHostRecord()
{
    var registryPath = TemporaryRegistryPath("reload-stop");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var url = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port);
        Assert.AreEqual(record.hostId, ReadProbe(url).hostId);

        UnityAgentKitHost.StopForReloadForTests();

        Assert.IsFalse(UnityAgentKitHost.IsStartedForTests);
        Assert.IsNull(UnityAgentKitHost.CurrentRecordForTests);
        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
        AssertRequestFails(url);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void EditorQuittingStopsLoopbackServerAndClearsLifecyclePendingWork()
{
    var registryPath = TemporaryRegistryPath("quitting-stop");

    try
    {
        UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.EnqueueLifecycleWorkForTests("quit-cleanup");

        UnityAgentKitHost.StopForQuittingForTests();

        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
        Assert.IsFalse(UnityAgentKitMainThread.IsDrainRegisteredForTests);
        Assert.AreEqual(0, UnityAgentKitMainThread.PendingLifecycleWorkCountForTests);
        Assert.AreEqual("host.editor_quitting", UnityAgentKitMainThread.LastStopCodeForTests);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void StopClosesListenerAndUnregistersDrain()
{
    var registryPath = TemporaryRegistryPath("stop-drain");

    try
    {
        UnityAgentKitHost.StartForTests(registryPath);
        UnityAgentKitMainThread.EnqueueLifecycleWorkForTests("stop-cleanup");
        Assert.IsTrue(UnityAgentKitMainThread.IsDrainRegisteredForTests);

        UnityAgentKitHost.StopForTests("host.stopped");

        Assert.IsFalse(UnityAgentKitLoopbackHttpServer.IsRunning);
        Assert.IsFalse(UnityAgentKitMainThread.IsDrainRegisteredForTests);
        Assert.AreEqual(0, UnityAgentKitMainThread.PendingLifecycleWorkCountForTests);
        Assert.AreEqual("host.stopped", UnityAgentKitMainThread.LastStopCodeForTests);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void StartStopsExistingListenerBeforeBinding()
{
    var firstPort = FreeTcpPort();
    var secondPort = FreeTcpPort();
    var first = UnityAgentKitHostRegistry.CreateRecord(firstPort, 0, DateTimeOffset.Parse("2026-05-19T14:00:00.0000000Z"));
    var second = UnityAgentKitHostRegistry.CreateRecord(secondPort, first.hostEpoch, DateTimeOffset.Parse("2026-05-19T14:01:00.0000000Z"));
    var firstUrl = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(first.port);
    var secondUrl = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(second.port);

    try
    {
        UnityAgentKitLoopbackHttpServer.Start(first);
        Assert.AreEqual(first.hostId, ReadProbe(firstUrl).hostId);

        UnityAgentKitLoopbackHttpServer.Start(second);

        AssertRequestFails(firstUrl);
        Assert.AreEqual(second.hostId, ReadProbe(secondUrl).hostId);
    }
    finally
    {
        UnityAgentKitLoopbackHttpServer.Stop("host.stopped");
        UnityAgentKitMainThread.ResetForTests();
    }
}

[Test]
public void StoppedOldListenerNoLongerResponds()
{
    var registryPath = TemporaryRegistryPath("old-listener-stopped");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var url = UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port);
        Assert.AreEqual(record.hostId, ReadProbe(url).hostId);

        UnityAgentKitHost.StopForTests("host.stopped");

        AssertRequestFails(url);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void ShutdownListenerExceptionsDoNotFailStop()
{
    var registryPath = TemporaryRegistryPath("shutdown-exceptions");

    try
    {
        UnityAgentKitHost.StartForTests(registryPath);

        Assert.DoesNotThrow(() => UnityAgentKitLoopbackHttpServer.Stop("host.stopped"));
        Assert.DoesNotThrow(() => UnityAgentKitLoopbackHttpServer.Stop("host.stopped"));
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

Add helper before `TemporaryRegistryPath` if it is not already present:

```csharp
private static void AssertRequestFails(string url)
{
    Assert.Throws<WebException>(() => Get(url));
}
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，编译错误包含 `UnityAgentKitMainThread`、`StopForReloadForTests` 或 `StopForQuittingForTests` 不存在，或 cleanup tests 断言 drain/lifecycle cleanup 未发生。

- [x] **步骤 3：实现 lifecycle drain cleanup and stop test entry points**

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`：

```csharp
using System.Collections.Generic;
using UnityEditor;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitMainThread
    {
        private static readonly object PendingLock = new object();
        private static readonly List<string> PendingLifecycleWork = new List<string>();
        private static bool _drainRegistered;
        private static string _lastStopCode = string.Empty;

        internal static bool IsDrainRegisteredForTests => _drainRegistered;
        internal static string LastStopCodeForTests => _lastStopCode;

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

        internal static void RegisterDrain()
        {
            EditorApplication.update -= Drain;
            EditorApplication.update += Drain;
            _drainRegistered = true;
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
            }
        }

        internal static void ResetForTests()
        {
            Stop("host.stopped");
            _lastStopCode = string.Empty;
        }

        private static void Drain()
        {
        }
    }
}
```

In `UnityAgentKitLoopbackHttpServer.StartListener`, after `_record = record;` add:

```csharp
UnityAgentKitMainThread.RegisterDrain();
```

In `UnityAgentKitLoopbackHttpServer.Stop`, after `_thread = null;` add:

```csharp
UnityAgentKitMainThread.Stop(reasonCode);
```

In `UnityAgentKitHost.cs`, expose test stop entry points near `StopForTests`:

```csharp
internal static void StopForReloadForTests()
{
    StopForReload();
}

internal static void StopForQuittingForTests()
{
    StopForQuitting();
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS；结果 XML 包含 `result="Passed"`，并且新增 tests `StopForReloadStopsLoopbackServerAndClearsHostRecord`、`EditorQuittingStopsLoopbackServerAndClearsLifecyclePendingWork`、`StopClosesListenerAndUnregistersDrain`、`StartStopsExistingListenerBeforeBinding`、`StoppedOldListenerNoLongerResponds`、`ShutdownListenerExceptionsDoNotFailStop` 通过。该检查证明 `5A-LIFE-02` cleanup evidence 成立，因为 tests 使用真实 canonical `/probe` URL 观察 old listener no longer responds，并验证 record、drain callback 和 lifecycle-owned pending work cleanup；没有 `/operations`、operation dispatch 或 timeout。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add unity agent kit host lifecycle cleanup"
```

## 最终验证

- [x] **步骤 1：运行 merged 5A-03 Unity HostRuntimeTests**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS；结果 XML 包含 `result="Passed"`、`failed="0"`，并覆盖以下 evidence groups：

- lifecycle start guard：`HostLifecycleSkipRulesCoverCompileUpdateAndStoppedServer`、`HostDoesNotStartWhileCompilingOrUpdatingOnTick`、`HostRetriesStartOnUpdateTickAfterCompileEnds`。
- registry continuity：`StartForTestsWritesRegistryWithDynamicPort`、`RestartRecordChangesHostIdentityAndIncrementsEpochThroughHostBootstrap`、existing 5A-02 registry identity tests。
- probe HTTP contract：`BuildProbeUrlUsesAssignedPortAndCanonicalPath`、`ProbeEndpointReturnsHostIdentityOverHttp`、`ProbeReturnsNotReadyWhenHostRecordUnavailable`。
- HTTP framing：`ProbeEndpointReturnsJsonContentTypeAndReadableUtf8Body`、`UnknownRouteReturns404StructuredJson`、`WrongMethodReturns405StructuredJson`。
- listener cleanup：`StartStopsExistingListenerBeforeBinding`、`StoppedOldListenerNoLongerResponds`、`ShutdownListenerExceptionsDoNotFailStop`。
- reload/quitting/Stop cleanup：`StopForReloadStopsLoopbackServerAndClearsHostRecord`、`EditorQuittingStopsLoopbackServerAndClearsLifecyclePendingWork`、`StopClosesListenerAndUnregistersDrain`。
- scope boundary：no tests invoke `POST /operations`、no tests reference `UnityAgentKitOperationRouter`、no tests reference `host.threadCheck`、no tests use TS rebind client.

- [x] **步骤 2：检查 merged 5A-03 scope 没有越界文件**

运行：

```bash
git diff --name-only
```

预期输出只包含以下 code/test files 和本 plan/index 文件；如果 workflow experience 记录已单独提交或保留为文档变更，可在执行汇报中单独说明：

```text
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-03-host-lifecycle-probe-contract.md
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs
unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
```

- [x] **步骤 3：检查 forbidden scope symbols 未出现**

运行：

```bash
git diff -- unity/Assets/UnityAgentKit/Editor | grep -E "POST /operations|BuildOperationsUrl|UnityAgentKitOperationRouter|host\.echo|host\.threadCheck|host\.pendingDispatchTimeout|dispatch_timeout|request_timeout|workflow timeout|phase5a-vertical-smoke" && exit 1 || true
```

预期：命令 exit 0 且不输出匹配行。该检查只是 boundary guard，不是行为验收；行为验收来自 Unity EditMode tests。

- [x] **步骤 4：复审入口**

实现前必须重新运行 consistency review：

```text
/superpowers:reviewing-specs docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-03-host-lifecycle-probe-contract.md 是否严格遵循 technical contract，且是否只覆盖 5A-LIFE-01、5A-LIFE-02、5A-REG-02、5A-HTTP-01、5A-HTTP-03
```

复审通过前不要进入 `subagent-driven-development`。

- [x] **步骤 5：Commit plan checkbox sync only after implementation review passes**

此步骤只在所有任务通过两阶段审查后由文档同步子代理执行：勾选本 plan 中已完成任务的 checkbox。不要在实现前勾选任务，不要改写任务正文。
