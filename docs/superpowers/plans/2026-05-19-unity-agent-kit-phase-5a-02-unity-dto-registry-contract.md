# Unity Agent Kit Phase 5A-02 Unity DTO + Registry Contract 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建 Phase 5A-02 的 Unity C# DTO、registry path/project identity、host identity/epoch continuity contract。

**架构：** 在唯一 Unity C# host source tree `unity/Assets/UnityAgentKit/` 下创建 Editor assembly、DTO models、registry foundation 和 EditMode tests。5A-02 只定义 DTO + registry contract，不启动 loopback HTTP server，不实现 `/probe`、`/operations`、lifecycle cleanup、main-thread dispatch 或 TS registry client。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、`UnityEngine.JsonUtility` DTO JSON、project-scoped registry file under `unity/Library/UnityAgentKit/host.json`。
**拆分检查：** 已检查；无需拆分。本计划只展开 execution index 中的 5A-02 plan card，覆盖 `5A-DTO-01`、`5A-REG-01`、`5A-REG-02`，不触碰 5A-03 到 5A-08 的 HTTP、lifecycle、dispatch、TS rebind 或 vertical smoke 内容。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-02 — Unity DTO + registry contract

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；保留 Unity host runtime、registry/probe、host rebirth / rebind 的底层可靠性方向；Unity C# host source of truth 只放在 `unity/Assets/UnityAgentKit/`；TS 与 Unity C# 边界清楚；不在 Unity C# host 中做长 workflow 编排或阻塞等待。
- **Phase Scope:** Phase 5 交付高频日常闭环；Phase 5A 先建立 Host Runtime foundation。5A-02 只创建 Unity DTO、registry foundation、project root derivation 和 host identity/epoch continuity contract。
- **Phase Out-of-scope:** 5A-02 不实现 loopback HTTP server、`GET /probe`、`POST /operations`、host lifecycle callback、main-thread dispatch、non-blocking timeout hook、TS registry/probe/invoke/rebind client、MCP public tool registration、artifact/resource store、workflow timeout/polling、`/unity` skill 或 final daily loop E2E。
- **Success Criteria:** Unity EditMode tests 证明 DTOs 使用 `JsonUtility` round-trip；`UnityAgentKitHostRecord` 最小字段存在且逐字段保存；registry path 位于 `Library/UnityAgentKit/host.json`；`projectRoot` 从 `Application.dataPath` 推导且不依赖 `Environment.CurrentDirectory`；new host record 使用新 `hostId` 且 `hostEpoch = previousEpoch + 1`；continuity identity 由 `hostId + hostEpoch` 决定。
- **用户确认事项:** 新插件不做 v2 旧 public tools 兼容层；v2 正确底层机制必须映射进 plan，不能降级为 stub；Unity host/runtime/test 不能通过阻塞 Unity main thread 或 HTTP handler 制造 timeout；5A technical contract 不可直接执行，必须执行 expanded strict execution plan。
- **本计划不包含:** 不更新 Phase 5A completion evidence；不把 Phase 5A 或 Phase 5 标记 completed；不创建 HTTP transport 文件；不创建 TS host client 文件；不采用 v2 `.ai-debug/unity-mcp-v2/host.json` registry path；不采用 v2 `instanceId` / `epoch` 字段名作为新 public contract，统一映射为 `hostId` / `hostEpoch`。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本计划如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚；基于 v2 host runtime 演进 | 只在 `unity/Assets/UnityAgentKit/` 创建 C# source tree 和 tests；不复制 C# host 到 TS plugin；吸收 v2 registry/project-root/epoch 底层机制 | 任务 1-3 | Unity EditMode tests 覆盖 DTO、registry path、projectRoot、hostId/hostEpoch continuity |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / Unity host | 本计划不创建 skill 文件，只交付后续 runtime 能依赖的 C# DTO/registry contract | 任务 1-4 | 文件清单不包含 `plugins/unity-agent-kit/skills/` |
| Phase 3 | Public action contract 稳定；public/internal 分离；schema 有界 | 只定义 internal host DTO 与 operation response envelope foundation；不注册 public MCP tools，不暴露 free-form public action params | 任务 1 | DTO tests 证明 request/response fields 稳定，未创建 public tool schema |
| Phase 4 | async/job/workflow/artifact 语义可靠；Unity C# 不承担长阻塞 workflow；host rebirth continuity 必须可判定 | 只定义 `hostId + hostEpoch` continuity identity 和 registry evidence；不实现 workflow timeout、job 或 artifact | 任务 2-3 | `ReadExistingEpochAndIncrementOnRestart` 与 `ContinuityIdentityUsesHostIdAndHostEpoch` 证明 continuity foundation |

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 采用 `5A-DTO-01`、`5A-REG-01`、`5A-REG-02` 的 DTO minimum fields、registry field list、`Application.dataPath` project root、`hostId + hostEpoch` continuity rule | 不执行 5A-03+ 的 `/probe`、HTTP server、lifecycle、dispatch、TS rebind、vertical smoke 内容 | 5A-02 plan card 只覆盖 Unity DTO + registry contract | 任务 1-4 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 采用 5A-02 scope、requirement IDs、wave 1、无 depends_on | 不更改 5A-03 到 5A-08 的 wave、scope 或 candidate status | execution index 是 current-truth coverage map；本计划只创建 expanded plan | 任务 1-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2Models.cs` | 采用 `[Serializable]` + public fields + `JsonUtility.ToJson` / `FromJson<T>` DTO style | 不采用 v2 `UnityMcpV2OperationRequest` / `UnityMcpV2OperationResponse` nested compatibility shape as-is | 新 contract 使用 `UnityAgentKit*` names 和 top-level response envelope；5A-02 不实现 operation router | 任务 1 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2HostRegistry.cs` | 采用 `Directory.GetParent(Application.dataPath)` 推导 project root、tmp write + replace/move、read existing epoch before new record | 不采用 `.ai-debug/unity-mcp-v2/host.json` registry root；不采用 `instanceId` / `epoch` field names | 新 contract 固定 registry path 为 `Library/UnityAgentKit/host.json`，identity fields 为 `hostId` / `hostEpoch` | 任务 2-3 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/discovery/host-registry.ts` | 采用 strict registry record mindset：protocolVersion/status/port/identity fields are explicit and validated by readers | 不在 5A-02 实现 TS `readHostRegistry` validation and failure classification | TS registry validation belongs to 5A-07; 5A-02 only produces the Unity-side DTO/registry contract it will validate later | 任务 2-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs` | 仅记录其 `/probe` / `/operations` DTO usage as later reference | 不创建 HTTP listener、URL helpers、route handling、status code handling | These belong to 5A-03, 5A-04, and 5A-05 | 无 |

## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
| Unity DTO models | `UnityMcpV2Models.cs` | `[Serializable]` classes with public fields and `JsonUtility` round-trip tests | v2 public compatibility names and nested response compatibility | Unity Agent Kit has a new contract and no v2 public tool compatibility layer | 任务 1 |
| Registry project root | `UnityMcpV2HostRegistry.GetProjectRoot()` | `Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath` | `Environment.CurrentDirectory` | cwd may not equal Unity project root in batchmode, tests, or external launchers | 任务 2 |
| Registry persistence | `WriteRecord` tmp file + replace/move pattern | project-scoped registry body written as DTO JSON under controlled Unity project root | `.ai-debug/unity-mcp-v2` runtime root | 5A contract uses `unity/Library/UnityAgentKit/host.json` | 任务 2 |
| Host identity / epoch | v2 `instanceId` + `epoch`, `ReadExistingEpoch`, `Guid.NewGuid().ToString("N")` | new `hostId` each record and `hostEpoch = previousEpoch + 1`; continuity identity is `hostId + hostEpoch` | preserving old identity after restart/reload | restart/reload invalidates old continuity for later TS lost/rebind decisions | 任务 3 |
| HTTP/probe/operations | v2 loopback server and route tests | none in 5A-02 | listener, `/probe`, `/operations`, URL helper, 404/405/400 structured response tests | assigned to 5A-03 through 5A-05 | 无 |

## 文件结构

- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef` — Unity Agent Kit Editor assembly definition, Editor-only.
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — DTO models for host record, probe response, operation request/response, diagnostics, and thread check result.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` — Unity-side registry path/project root/read/write/identity foundation.
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef` — Unity Agent Kit EditMode test assembly definition.
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — EditMode tests for DTO JSON round-trip, registry path/root, registry persistence, and identity/epoch continuity.

## Plan Card Coverage

| Requirement ID | 覆盖任务 | 行为证据 |
|---|---|---|
| `5A-DTO-01` | 任务 1 | `HostRecordRoundTripsAllMinimumFields`、`ProbeResponseRoundTripsActiveValidationFields`、`OperationRequestJsonDeserializesToDto`、`OperationResponseDtoSerializesAndDeserializesRoundTrip`、`ThreadCheckResultRoundTripsMainThreadFields` prove DTO field shape and `JsonUtility` round-trip. |
| `5A-REG-01` | 任务 2 | `ProjectRootDerivedFromApplicationDataPath` and `HostRegistryDoesNotUseEnvironmentCurrentDirectory` prove `projectRoot` comes from `Application.dataPath`, not cwd. |
| `5A-REG-02` | 任务 3 | `CreateRecordUsesNewHostId`、`ReadExistingEpochAndIncrementOnRestart`、`ContinuityIdentityUsesHostIdAndHostEpoch`、`RestartRecordChangesHostIdentityAndIncrementsEpoch` prove continuity identity and restart epoch behavior. |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| DTO field contract | Minimal `[Serializable]` DTOs with public fields and explicit round-trip tests for every required field | 8 | Stop and revise `UnityAgentKitModels.cs`; do not create HTTP transport or operation router |
| Registry project root | Derive project root from `Application.dataPath` parent and test cwd independence | 9 | Stop and revise `UnityAgentKitHostRegistry.GetProjectRoot`; do not accept cwd fallback |
| Registry path | `Library/UnityAgentKit/host.json` under Unity project root, not v2 `.ai-debug` | 8 | Stop and revise registry path helpers before writing records |
| Registry persistence | DTO JSON write/read with tmp file and replace/move pattern | 8 | Stop and revise write/read foundation; do not create host bootstrap |
| Host identity / epoch | New `hostId` per record and `hostEpoch = previousEpoch + 1`; continuity compare uses both fields | 8 | Stop and revise identity helpers; do not enter 5A-03 lifecycle |
| Scope boundary | No HTTP server, `/probe`, `/operations`, lifecycle callbacks, TS client, or MCP registration in 5A-02 | 9 | Remove out-of-scope files or split into the proper 5A-03+ expanded plan |

低分处理规则：任何对象低于 7/10 时，5A-02 保持 incomplete，只允许修复该对象；不得用 HTTP server、TS simulations、string search 或 stubbed fake host 成功状态补强 evidence。

## 任务 1：创建 Unity Editor assemblies 和 DTO JSON contract

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`

- [x] **步骤 1：编写失败的 DTO round-trip tests**

运行：

```bash
mkdir -p unity/Assets/UnityAgentKit/Editor/Models unity/Assets/UnityAgentKit/Editor/Tests
cat > unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef <<'JSON'
{
  "name": "UnityAgentKit.Editor",
  "rootNamespace": "UnityAgentKit.Editor",
  "references": [],
  "includePlatforms": ["Editor"],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
JSON
cat > unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef <<'JSON'
{
  "name": "UnityAgentKit.Editor.Tests",
  "rootNamespace": "UnityAgentKit.Editor.Tests",
  "references": ["UnityAgentKit.Editor"],
  "includePlatforms": ["Editor"],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "optionalUnityReferences": ["TestAssemblies"],
  "noEngineReferences": false
}
JSON
cat > unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs <<'CS'
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeTests
    {
        [Test]
        public void HostRecordRoundTripsAllMinimumFields()
        {
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = "/repo/unity",
                hostId = "host-a",
                hostEpoch = 7,
                port = 49152,
                status = "ready",
                startedAt = "2026-05-19T10:00:00.0000000Z",
                lastProbeAt = "2026-05-19T10:00:01.0000000Z"
            };

            var json = JsonUtility.ToJson(record);
            var roundTrip = JsonUtility.FromJson<UnityAgentKitHostRecord>(json);

            Assert.AreEqual("Unity Agent Kit", roundTrip.hostName);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual("/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("host-a", roundTrip.hostId);
            Assert.AreEqual(7, roundTrip.hostEpoch);
            Assert.AreEqual(49152, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
            Assert.AreEqual("2026-05-19T10:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T10:00:01.0000000Z", roundTrip.lastProbeAt);
        }

        [Test]
        public void ProbeResponseRoundTripsActiveValidationFields()
        {
            var response = new UnityAgentKitProbeResponse
            {
                hostId = "host-probe",
                hostEpoch = 3,
                projectRoot = "/repo/unity",
                protocolVersion = "2026-05-19",
                port = 49153,
                status = "not_ready",
                code = "host.not_ready",
                message = "Editor is compiling."
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitProbeResponse>(JsonUtility.ToJson(response));

            Assert.AreEqual("host-probe", roundTrip.hostId);
            Assert.AreEqual(3, roundTrip.hostEpoch);
            Assert.AreEqual("/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual(49153, roundTrip.port);
            Assert.AreEqual("not_ready", roundTrip.status);
            Assert.AreEqual("host.not_ready", roundTrip.code);
            Assert.AreEqual("Editor is compiling.", roundTrip.message);
        }

        [Test]
        public void OperationRequestJsonDeserializesToDto()
        {
            var json = "{\"operation\":\"host.echo\",\"requestId\":\"req-1\",\"inputJson\":\"{\\\"text\\\":\\\"hello\\\"}\"}";

            var request = JsonUtility.FromJson<UnityAgentKitOperationRequest>(json);

            Assert.AreEqual("host.echo", request.operation);
            Assert.AreEqual("req-1", request.requestId);
            Assert.AreEqual("{\"text\":\"hello\"}", request.inputJson);
        }

        [Test]
        public void OperationResponseDtoSerializesAndDeserializesRoundTrip()
        {
            var response = new UnityAgentKitOperationResponse
            {
                status = "failed",
                operation = "host.echo",
                requestId = "req-2",
                hostId = "host-response",
                hostEpoch = 9,
                summary = "Echo failed.",
                data = "{\"ok\":false}",
                diagnostics = new[]
                {
                    new UnityAgentKitDiagnostic
                    {
                        source = "unity-host",
                        severity = "error",
                        code = "host.dispatch_exception",
                        message = "Dispatch failed.",
                        details = "{\"exceptionType\":\"InvalidOperationException\"}",
                        attribution = "{\"operation\":\"host.echo\",\"requestId\":\"req-2\"}"
                    }
                },
                startedAt = "2026-05-19T10:00:00.0000000Z",
                completedAt = "2026-05-19T10:00:01.2500000Z",
                durationMs = 1250,
                code = "host.dispatch_exception",
                message = "Dispatch failed.",
                metadata = "{\"continuity\":\"same host\"}"
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitOperationResponse>(JsonUtility.ToJson(response));

            Assert.AreEqual("failed", roundTrip.status);
            Assert.AreEqual("host.echo", roundTrip.operation);
            Assert.AreEqual("req-2", roundTrip.requestId);
            Assert.AreEqual("host-response", roundTrip.hostId);
            Assert.AreEqual(9, roundTrip.hostEpoch);
            Assert.AreEqual("Echo failed.", roundTrip.summary);
            Assert.AreEqual("{\"ok\":false}", roundTrip.data);
            Assert.AreEqual(1, roundTrip.diagnostics.Length);
            Assert.AreEqual("unity-host", roundTrip.diagnostics[0].source);
            Assert.AreEqual("error", roundTrip.diagnostics[0].severity);
            Assert.AreEqual("host.dispatch_exception", roundTrip.diagnostics[0].code);
            Assert.AreEqual("Dispatch failed.", roundTrip.diagnostics[0].message);
            Assert.AreEqual("{\"exceptionType\":\"InvalidOperationException\"}", roundTrip.diagnostics[0].details);
            Assert.AreEqual("{\"operation\":\"host.echo\",\"requestId\":\"req-2\"}", roundTrip.diagnostics[0].attribution);
            Assert.AreEqual("2026-05-19T10:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T10:00:01.2500000Z", roundTrip.completedAt);
            Assert.AreEqual(1250, roundTrip.durationMs);
            Assert.AreEqual("host.dispatch_exception", roundTrip.code);
            Assert.AreEqual("Dispatch failed.", roundTrip.message);
            Assert.AreEqual("{\"continuity\":\"same host\"}", roundTrip.metadata);
        }

        [Test]
        public void ThreadCheckResultRoundTripsMainThreadFields()
        {
            var result = new UnityAgentKitThreadCheckResult
            {
                capturedMainThreadId = 12,
                executionThreadId = 12,
                ranOnMainThread = true
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(JsonUtility.ToJson(result));

            Assert.AreEqual(12, roundTrip.capturedMainThreadId);
            Assert.AreEqual(12, roundTrip.executionThreadId);
            Assert.IsTrue(roundTrip.ranOnMainThread);
        }
    }
}
CS
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，Unity compile/test output 包含 `CS0246` 或等价 missing type error，例如：

```text
The type or namespace name 'UnityAgentKitHostRecord' could not be found
```

证明：该失败证明 EditMode tests 已编译并引用 `UnityAgentKit.Editor` assembly，DTO model contract 尚未实现。

- [x] **步骤 3：编写最少 DTO models 实现**

创建 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`：

```csharp
using System;

namespace UnityAgentKit.Editor
{
    [Serializable]
    public sealed class UnityAgentKitHostRecord
    {
        public string hostName = string.Empty;
        public string protocolVersion = string.Empty;
        public string projectRoot = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public int port;
        public string status = string.Empty;
        public string startedAt = string.Empty;
        public string lastProbeAt = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitProbeResponse
    {
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string protocolVersion = string.Empty;
        public int port;
        public string status = string.Empty;
        public string code = string.Empty;
        public string message = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitOperationRequest
    {
        public string operation = string.Empty;
        public string requestId = string.Empty;
        public string inputJson = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitOperationResponse
    {
        public string status = string.Empty;
        public string operation = string.Empty;
        public string requestId = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string summary = string.Empty;
        public string data = string.Empty;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
        public string startedAt = string.Empty;
        public string completedAt = string.Empty;
        public int durationMs;
        public string code = string.Empty;
        public string message = string.Empty;
        public string metadata = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitDiagnostic
    {
        public string source = string.Empty;
        public string severity = string.Empty;
        public string code = string.Empty;
        public string message = string.Empty;
        public string details = string.Empty;
        public string attribution = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitThreadCheckResult
    {
        public int capturedMainThreadId;
        public int executionThreadId;
        public bool ranOnMainThread;
    }
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，test results XML 或 Unity output 显示 `HostRuntimeTests` 中 5 个 tests passed，0 failures。

证明：该检查证明 5A-02 的 host record、probe response、operation request、operation response、diagnostic 和 thread check DTO minimum fields 均可通过 Unity `JsonUtility` round-trip，且没有用 string search 作为 DTO contract evidence。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs
git commit -m "feat: add Unity Agent Kit host DTO contract"
```

## 任务 2：实现 registry path、projectRoot derivation 和 record persistence

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`

- [x] **步骤 1：编写失败的 registry path 和 persistence tests**

将以下 tests 追加到 `HostRuntimeTests` class 内部、最后一个 test 之后：

```csharp
        [Test]
        public void ProjectRootDerivedFromApplicationDataPath()
        {
            var expectedProjectRoot = System.IO.Path.GetFullPath(System.IO.Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath);

            var actualProjectRoot = UnityAgentKitHostRegistry.GetProjectRoot();

            Assert.AreEqual(NormalizePath(expectedProjectRoot), NormalizePath(actualProjectRoot));
        }

        [Test]
        public void HostRegistryDoesNotUseEnvironmentCurrentDirectory()
        {
            var originalCurrentDirectory = Environment.CurrentDirectory;
            var unrelatedDirectory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitCwdTest");
            System.IO.Directory.CreateDirectory(unrelatedDirectory);

            try
            {
                Environment.CurrentDirectory = unrelatedDirectory;

                var projectRoot = UnityAgentKitHostRegistry.GetProjectRoot();

                Assert.AreNotEqual(NormalizePath(unrelatedDirectory), NormalizePath(projectRoot));
                Assert.AreEqual(NormalizePath(System.IO.Directory.GetParent(Application.dataPath)?.FullName ?? Application.dataPath), NormalizePath(projectRoot));
            }
            finally
            {
                Environment.CurrentDirectory = originalCurrentDirectory;
            }
        }

        [Test]
        public void RegistryPathUsesProjectLibraryUnityAgentKitHostJson()
        {
            var projectRoot = UnityAgentKitHostRegistry.GetProjectRoot();
            var expectedPath = System.IO.Path.Combine(projectRoot, "Library", "UnityAgentKit", "host.json");

            var registryPath = UnityAgentKitHostRegistry.GetRegistryPath();

            Assert.AreEqual(NormalizePath(expectedPath), NormalizePath(registryPath));
        }

        [Test]
        public void HostRegistryWritesMinimumFields()
        {
            var registryPath = TemporaryRegistryPath("minimum-fields");
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-write",
                hostEpoch = 11,
                port = 49154,
                status = "ready",
                startedAt = "2026-05-19T11:00:00.0000000Z",
                lastProbeAt = "2026-05-19T11:00:01.0000000Z"
            };

            UnityAgentKitHostRegistry.WriteRecord(record, registryPath);
            var body = System.IO.File.ReadAllText(registryPath);
            var roundTrip = JsonUtility.FromJson<UnityAgentKitHostRecord>(body);

            Assert.AreEqual("Unity Agent Kit", roundTrip.hostName);
            Assert.AreEqual("2026-05-19", roundTrip.protocolVersion);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), roundTrip.projectRoot);
            Assert.AreEqual("host-write", roundTrip.hostId);
            Assert.AreEqual(11, roundTrip.hostEpoch);
            Assert.AreEqual(49154, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
            Assert.AreEqual("2026-05-19T11:00:00.0000000Z", roundTrip.startedAt);
            Assert.AreEqual("2026-05-19T11:00:01.0000000Z", roundTrip.lastProbeAt);
        }

        [Test]
        public void HostRegistryReadRoundTripsWrittenRecord()
        {
            var registryPath = TemporaryRegistryPath("read-roundtrip");
            var record = new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-read",
                hostEpoch = 12,
                port = 49155,
                status = "ready",
                startedAt = "2026-05-19T12:00:00.0000000Z",
                lastProbeAt = ""
            };

            UnityAgentKitHostRegistry.WriteRecord(record, registryPath);
            var roundTrip = UnityAgentKitHostRegistry.ReadRecord(registryPath);

            Assert.NotNull(roundTrip);
            Assert.AreEqual("host-read", roundTrip.hostId);
            Assert.AreEqual(12, roundTrip.hostEpoch);
            Assert.AreEqual(49155, roundTrip.port);
            Assert.AreEqual("ready", roundTrip.status);
        }

        private static string TemporaryRegistryPath(string testName)
        {
            var directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitRegistryTests", testName, Guid.NewGuid().ToString("N"));
            System.IO.Directory.CreateDirectory(directory);
            return System.IO.Path.Combine(directory, "host.json");
        }

        private static string NormalizePath(string path)
        {
            return System.IO.Path.GetFullPath(path).TrimEnd(System.IO.Path.DirectorySeparatorChar, System.IO.Path.AltDirectorySeparatorChar);
        }
```

Also add these `using` statements at the top of `HostRuntimeTests.cs`:

```csharp
using System;
using UnityEngine;
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，Unity compile/test output 包含：

```text
The name 'UnityAgentKitHostRegistry' does not exist
```

证明：该失败证明 registry projectRoot/path/persistence 行为尚未实现，新增 tests 不是只检查文件存在。

- [x] **步骤 3：编写最少 registry path 和 persistence 实现**

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`：

```csharp
using System;
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitHostRegistry
    {
        public const string HostName = "Unity Agent Kit";
        public const string ProtocolVersion = "2026-05-19";
        public const string ReadyStatus = "ready";

        public static string GetProjectRoot()
        {
            var assetsPath = Application.dataPath;
            var projectDirectory = Directory.GetParent(assetsPath);
            return Path.GetFullPath(projectDirectory?.FullName ?? assetsPath);
        }

        public static string GetRegistryPath()
        {
            return Path.Combine(GetProjectRoot(), "Library", "UnityAgentKit", "host.json");
        }

        public static void WriteRecord(UnityAgentKitHostRecord record, string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            var directory = Path.GetDirectoryName(targetPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var tempPath = targetPath + ".tmp";
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }

            File.WriteAllText(tempPath, JsonUtility.ToJson(record, true) + Environment.NewLine);

            if (File.Exists(targetPath))
            {
                ReplaceExisting(tempPath, targetPath);
            }
            else
            {
                File.Move(tempPath, targetPath);
            }
        }

        public static UnityAgentKitHostRecord ReadRecord(string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            if (!File.Exists(targetPath))
            {
                return null;
            }

            return JsonUtility.FromJson<UnityAgentKitHostRecord>(File.ReadAllText(targetPath));
        }

        private static void ReplaceExisting(string tempPath, string targetPath)
        {
            try
            {
                File.Replace(tempPath, targetPath, null);
            }
            catch (PlatformNotSupportedException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
            catch (IOException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
        }
    }
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，`HostRuntimeTests` 中 10 个 tests passed，0 failures。

证明：该检查证明 registry path 位于 Unity project `Library/UnityAgentKit/host.json`，`projectRoot` 从 `Application.dataPath` 推导且不依赖 cwd，registry body 使用 DTO JSON 写入和读取并保留全部 minimum fields。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs
git commit -m "feat: add Unity Agent Kit host registry foundation"
```

## 任务 3：实现 host identity 和 epoch continuity contract

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`

- [x] **步骤 1：编写失败的 host identity / epoch tests**

将以下 tests 追加到 `HostRuntimeTests` class 内部、helper methods 前：

```csharp
        [Test]
        public void CreateRecordUsesNewHostId()
        {
            var first = UnityAgentKitHostRegistry.CreateRecord(49156, 0, DateTimeOffset.Parse("2026-05-19T13:00:00.0000000Z"));
            var second = UnityAgentKitHostRegistry.CreateRecord(49156, 0, DateTimeOffset.Parse("2026-05-19T13:00:01.0000000Z"));

            Assert.IsNotEmpty(first.hostId);
            Assert.IsNotEmpty(second.hostId);
            Assert.AreNotEqual(first.hostId, second.hostId);
            Assert.AreEqual(1, first.hostEpoch);
            Assert.AreEqual(1, second.hostEpoch);
        }

        [Test]
        public void ReadExistingEpochAndIncrementOnRestart()
        {
            var registryPath = TemporaryRegistryPath("epoch-increment");
            UnityAgentKitHostRegistry.WriteRecord(new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "old-host",
                hostEpoch = 41,
                port = 49157,
                status = "ready",
                startedAt = "2026-05-19T13:10:00.0000000Z"
            }, registryPath);

            var previousEpoch = UnityAgentKitHostRegistry.ReadExistingEpoch(registryPath);
            var restartRecord = UnityAgentKitHostRegistry.CreateRecord(49158, previousEpoch, DateTimeOffset.Parse("2026-05-19T13:11:00.0000000Z"));

            Assert.AreEqual(41, previousEpoch);
            Assert.AreEqual(42, restartRecord.hostEpoch);
            Assert.AreNotEqual("old-host", restartRecord.hostId);
        }

        [Test]
        public void ContinuityIdentityUsesHostIdAndHostEpoch()
        {
            var current = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 5 };
            var same = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 5 };
            var differentHost = new UnityAgentKitHostRecord { hostId = "host-b", hostEpoch = 5 };
            var differentEpoch = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 6 };

            Assert.IsTrue(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, same));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, differentHost));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(current, differentEpoch));
        }

        [Test]
        public void ContinuityIdentityRejectsMissingHostId()
        {
            var missingCurrent = new UnityAgentKitHostRecord { hostId = string.Empty, hostEpoch = 0 };
            var missingSame = new UnityAgentKitHostRecord { hostId = string.Empty, hostEpoch = 0 };
            var valid = new UnityAgentKitHostRecord { hostId = "host-a", hostEpoch = 0 };

            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(missingCurrent, missingSame));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(missingCurrent, valid));
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(valid, missingSame));
        }

        [Test]
        public void RestartRecordChangesHostIdentityAndIncrementsEpoch()
        {
            var previous = UnityAgentKitHostRegistry.CreateRecord(49159, 6, DateTimeOffset.Parse("2026-05-19T13:20:00.0000000Z"));
            var restart = UnityAgentKitHostRegistry.CreateRecord(49160, previous.hostEpoch, DateTimeOffset.Parse("2026-05-19T13:21:00.0000000Z"));

            Assert.AreNotEqual(previous.hostId, restart.hostId);
            Assert.AreEqual(previous.hostEpoch + 1, restart.hostEpoch);
            Assert.IsFalse(UnityAgentKitHostRegistry.HasSameContinuityIdentity(previous, restart));
        }
```

- [x] **步骤 2：运行 Unity tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：FAIL，Unity compile/test output 包含 missing method errors for `CreateRecord`、`ReadExistingEpoch` 或 `HasSameContinuityIdentity`。

证明：该失败证明 host identity/epoch continuity contract 尚未实现。

- [x] **步骤 3：补齐 host identity / epoch 实现**

Replace `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` with:

```csharp
using System;
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    public static class UnityAgentKitHostRegistry
    {
        public const string HostName = "Unity Agent Kit";
        public const string ProtocolVersion = "2026-05-19";
        public const string ReadyStatus = "ready";

        public static string GetProjectRoot()
        {
            var assetsPath = Application.dataPath;
            var projectDirectory = Directory.GetParent(assetsPath);
            return Path.GetFullPath(projectDirectory?.FullName ?? assetsPath);
        }

        public static string GetRegistryPath()
        {
            return Path.Combine(GetProjectRoot(), "Library", "UnityAgentKit", "host.json");
        }

        public static UnityAgentKitHostRecord CreateRecord(int port, int previousEpoch, DateTimeOffset? now = null)
        {
            var timestamp = (now ?? DateTimeOffset.UtcNow).UtcDateTime.ToString("O");
            return new UnityAgentKitHostRecord
            {
                hostName = HostName,
                protocolVersion = ProtocolVersion,
                projectRoot = GetProjectRoot(),
                hostId = Guid.NewGuid().ToString("N"),
                hostEpoch = previousEpoch + 1,
                port = port,
                status = ReadyStatus,
                startedAt = timestamp,
                lastProbeAt = string.Empty
            };
        }

        public static int ReadExistingEpoch(string registryPath = null)
        {
            var record = ReadRecord(registryPath);
            return record?.hostEpoch ?? 0;
        }

        public static bool HasSameContinuityIdentity(UnityAgentKitHostRecord first, UnityAgentKitHostRecord second)
        {
            if (first == null || second == null || string.IsNullOrEmpty(first.hostId) || string.IsNullOrEmpty(second.hostId))
            {
                return false;
            }

            return first.hostId == second.hostId && first.hostEpoch == second.hostEpoch;
        }

        public static void WriteRecord(UnityAgentKitHostRecord record, string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            var directory = Path.GetDirectoryName(targetPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var tempPath = targetPath + ".tmp";
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }

            File.WriteAllText(tempPath, JsonUtility.ToJson(record, true) + Environment.NewLine);

            if (File.Exists(targetPath))
            {
                ReplaceExisting(tempPath, targetPath);
            }
            else
            {
                File.Move(tempPath, targetPath);
            }
        }

        public static UnityAgentKitHostRecord ReadRecord(string registryPath = null)
        {
            var targetPath = registryPath ?? GetRegistryPath();
            if (!File.Exists(targetPath))
            {
                return null;
            }

            return JsonUtility.FromJson<UnityAgentKitHostRecord>(File.ReadAllText(targetPath));
        }

        private static void ReplaceExisting(string tempPath, string targetPath)
        {
            try
            {
                File.Replace(tempPath, targetPath, null);
            }
            catch (PlatformNotSupportedException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
            catch (IOException)
            {
                File.Delete(targetPath);
                File.Move(tempPath, targetPath);
            }
        }
    }
}
```

- [x] **步骤 4：运行 Unity tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，`HostRuntimeTests` 中 15 个 tests passed，0 failures。

证明：该检查证明 restart/reload foundation 会生成新的 `hostId`，`hostEpoch` 按 existing record 递增，并且后续 TS/client 层可用 `hostId + hostEpoch` 判断旧 continuity 是否失效。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs
git commit -m "feat: add Unity Agent Kit host identity continuity"
```

## 任务 4：验证 5A-02 evidence 并保持 sibling plan 边界

**文件：**
- 验证：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 验证：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 可选回归：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：运行 5A-02 Unity evidence 命令**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，`HostRuntimeTests` 中 15 个 tests passed，0 failures。

证明：该命令是 5A-02 official evidence，证明 DTO JSON、registry path/projectRoot、registry persistence、host identity/epoch continuity 已由 Unity EditMode tests 覆盖。

- [x] **步骤 2：可选运行 5A-01 TS non-gating regression command**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含：

```text
# tests 12
# pass 12
# fail 0
```

证明：该回归检查只用于提前发现 5A-01 TS result + MCP mapping foundation 是否被意外破坏。它不是 5A-02 acceptance gate，不覆盖任何 5A-02 requirement ID，不进入 5A-02 completion evidence；若失败，单独报告为 regression，不把 5A-02 DTO/registry evidence 判为失败。

- [x] **步骤 3：检查 5A-02 未越界创建 HTTP/TS host client/MCP registration 文件**

运行：

```bash
git status --short -- unity/Assets/UnityAgentKit plugins/unity-agent-kit/src plugins/unity-agent-kit/tests
```

预期：输出可以包含本计划允许的 Unity DTO/registry/test 文件和既有 5A-01 TS files 的变更状态，但不得包含以下 tracked 或 untracked 路径：

```text
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs
unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs
plugins/unity-agent-kit/src/host/registry.ts
plugins/unity-agent-kit/src/host/http-client.ts
plugins/unity-agent-kit/src/host/rebind.ts
plugins/unity-agent-kit/src/mcp/
plugins/unity-agent-kit/skills/
```

证明：该 scope guard 覆盖 tracked 与 untracked 文件，只证明 5A-02 没有越界到 5A-03+；behavior evidence 仍以步骤 1 的 Unity tests 为准。

- [x] **步骤 4：记录 5A-02 completion evidence 摘要**

在执行汇报中记录：

```text
Phase 5A-02 evidence:
- Command: "${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
- Result: HostRuntimeTests 15 passed, 0 failed
- Covers: 5A-DTO-01, 5A-REG-01, 5A-REG-02
- Key tests: HostRecordRoundTripsAllMinimumFields, OperationRequestJsonDeserializesToDto, OperationResponseDtoSerializesAndDeserializesRoundTrip, ProjectRootDerivedFromApplicationDataPath, HostRegistryDoesNotUseEnvironmentCurrentDirectory, HostRegistryWritesMinimumFields, CreateRecordUsesNewHostId, ReadExistingEpochAndIncrementOnRestart, ContinuityIdentityUsesHostIdAndHostEpoch, ContinuityIdentityRejectsMissingHostId, RestartRecordChangesHostIdentityAndIncrementsEpoch
- Boundary: no HTTP server, no /probe, no /operations, no TS registry client, no MCP registration
```

证明：该摘要给 execution index / plan index partial sync 提供事实输入；它不能把 Phase 5A 标记 completed，因为 5A-03 through 5A-08 仍 pending。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "test: verify Unity Agent Kit DTO registry contract"
```

## Subplan Completion Evidence

5A-02 completed evidence requires fresh execution of:

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

Expected evidence:

```text
HostRuntimeTests: 15 passed, 0 failed
```

Behavior coverage:

- **DTO:** `UnityAgentKitHostRecord`, `UnityAgentKitProbeResponse`, `UnityAgentKitOperationRequest`, `UnityAgentKitOperationResponse`, `UnityAgentKitDiagnostic`, `UnityAgentKitThreadCheckResult` round-trip via `UnityEngine.JsonUtility`.
- **Registry:** project-scoped path under `Library/UnityAgentKit/host.json`; body written/read as DTO JSON; all minimum fields preserved.
- **Project identity:** `projectRoot` derived from `Application.dataPath` parent; test proves `Environment.CurrentDirectory` does not control project root.
- **Continuity identity:** new non-empty `hostId` per host record; `hostEpoch = previousEpoch + 1`; same continuity only when both non-empty `hostId` and `hostEpoch` match.

Optional non-gating regression check, not part of 5A-02 completion evidence:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

Expected optional regression output remains:

```text
# tests 12
# pass 12
# fail 0
```

This optional regression check does not cover any 5A-02 requirement ID. If it fails, report it separately as a 5A-01 regression and do not use it to mark 5A-02 DTO/registry evidence failed.

5A-02 completion does not complete Phase 5A. After implementation, current-truth sync may mark only the 5A-02 execution plan as completed and move Next Manual Action to 5A-03 strict execution plan.

## Roadmap Phase Upgrade Check

| 检查项 | 结论 | 说明 |
|---|---|---|
| independent roadmap goal? | no | 5A-02 is a sibling execution plan inside Phase 5A Host Runtime foundation. |
| cross-phase blocker/current-state needs? | no | Its state can be represented in the 5A execution index and Phase 5 plan index partial evidence. |
| independently unlock Phase 6/7/8? | no | DTO + registry contract alone does not unlock later roadmap phases. |
| singly satisfy Phase 5 success criteria? | no | Phase 5 still needs 5A-03 through 5A-08, 5B-5E, public tools, Resources, `/unity`, and final E2E. |
| remains Phase 5 internal subplan? | yes | Keep as Phase 5A sibling execution plan; do not upgrade roadmap structure. |

当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。

## Plan Review Handoff

Before execution, run a manual review that explicitly asks whether this expanded plan strictly follows the technical contract:

```text
/superpowers:reviewing-specs docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-02-unity-dto-registry-contract.md 是否严格遵循 technical contract，且是否只覆盖 5A-DTO-01、5A-REG-01、5A-REG-02
```

If review passes, update `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` 5A-02 row from `pending/candidate` to the reviewed expanded plan path and `planned`, then execute this expanded plan with `subagent-driven-development` or `executing-plans`.
