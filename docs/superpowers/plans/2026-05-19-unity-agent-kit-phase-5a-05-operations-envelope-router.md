# Unity Agent Kit Phase 5A-05 Operations Envelope + Router 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5A-05 的 canonical `POST /operations` HTTP endpoint、top-level operation response envelope、operation normalization 和 router foundation。

**架构：** 在 5A-03 已完成的 Unity loopback host 上新增 `/operations` 分支，并把 request JSON parsing、operation normalization、failure envelope creation 放入独立 `UnityAgentKitOperationRouter`。本计划只执行不依赖 Unity main thread 的 router/envelope 行为：`host.echo` 可同步返回 request payload，`host.threadCheck` 只被分类为 dispatch-required operation，不执行 main-thread dispatch、不制造 timeout、不证明 Unity API thread affinity。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、`HttpListener` loopback HTTP、`UnityEngine.JsonUtility` DTO JSON、top-level `UnityAgentKitOperationResponse` envelope。
**拆分检查：** 已检查；无需与 5A-06 合并。5A-05 的强验证可以通过 `/operations` HTTP envelope、request parsing、operation normalization、known/unknown route classification、`host.echo` direct operation、400/404/405 structured operation envelopes 和 HTTP response framing 完成；`host.threadCheck` main-thread execution、dispatch exception、host-level timeout 和 pending work cleanup 仍属于 5A-06。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-05 — POST `/operations` envelope + router

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 5A-05 / 5A-06 边界裁决

- 5A-05 owns：`POST /operations` URL helper、request body read、empty/malformed JSON classification、operation trim、missing/empty/unknown operation classification、top-level `UnityAgentKitOperationResponse` envelope、`host.echo` direct operation、`host.threadCheck` dispatch-required classification、400/404/405 structured operation envelopes、JSON content-type/UTF-8/content-length/closed response stream evidence。
- 5A-06 owns：captured Unity main-thread dispatch、`host.threadCheck` success result、dispatch exception、non-blocking pending dispatch timeout hook、`host.dispatch_timeout`、pending work stop/reload failure、expired queued work not executing later。
- 本计划中任何测试不得要求 `host.threadCheck` 返回 `succeeded`、不得断言 execution thread id、不得使用 `Thread.Sleep`、busy wait、`Task.Wait`、blocking wait 或 workflow polling 来证明 timeout。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；保留 loopback HTTP host、operation envelope、stable error semantics、TS + Unity 双侧测试策略；public MCP tools 与 internal operations 分离；Unity C# host source of truth 只放在 `unity/Assets/UnityAgentKit/`；Unity C# 不承担长 workflow 编排或阻塞等待。
- **Phase Scope:** Phase 5A 建立 Host Runtime foundation。5A-05 只实现 Unity-side `/operations` envelope + router foundation，依赖已完成的 5A-01 result/mapping foundation、5A-02 Unity DTO/registry foundation、5A-03 host lifecycle + `/probe` foundation。
- **Phase Out-of-scope:** 5A-05 不实现 main-thread dispatch execution、host-level timeout hook、dispatch exception diagnostics、pending dispatch cleanup、TS registry/probe/invoke/rebind client、MCP public tool registration、artifact/resource store、workflow timeout/polling、`/unity` skill 或 final daily loop E2E。
- **Success Criteria:** Unity EditMode tests 证明：`BuildOperationsUrl` 使用 assigned port 和 canonical `/operations` path；valid `POST /operations` 返回 top-level `UnityAgentKitOperationResponse`；operation trim 后路由；missing/empty operation 返回 `rejected + operation.empty`；unknown operation 返回 `rejected + operation.unknown`；empty body 和 malformed JSON 返回 400 structured `failed` envelope；unknown route 返回 404 structured operation envelope；wrong method on `/operations` 返回 405 structured operation envelope；HTTP responses 使用 `application/json; charset=utf-8`、UTF-8 byte length framing，并且 body readable；`host.echo` over real HTTP preserves `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`, `code`, `message` fields。
- **用户确认事项:** 新插件不做 v2 旧 public tools 兼容层；v2 正确实现应映射进 plan，不用弱 stub 代替；Unity host/runtime/test 不能通过阻塞 Unity main thread 或 HTTP handler 制造 timeout；如果强验证依赖相同 canonical runtime behavior，应调整 ownership，不发明 internal endpoint 或 test-only route；当前 5A-05 不需要合并 5A-06，因为 router/envelope 可独立强验证。
- **本计划不包含:** 不把 Phase 5A 或 Phase 5 标记 completed；不执行 5A-06 dispatch/timeout；不创建 TS host client 文件；不创建 vertical smoke test；不注册 MCP tools；不创建 `/unity` skill；不新增 business action catalog；不采用 nested v2 data envelope compatibility。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本计划如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚；基于 v2 host runtime 演进 | 只在 `unity/Assets/UnityAgentKit/` 增加 Unity-side router 和 loopback `/operations` HTTP branch，不复制 host runtime 到 TS plugin | 任务 1-3 | Unity EditMode tests 覆盖 router、real HTTP `/operations`、scope guard |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / Unity host | 本计划不创建 skill 文件，只交付 runtime endpoint foundation | 任务 1-3 | 文件清单不包含 `plugins/unity-agent-kit/skills/` |
| Phase 3 | Public/internal 分离；public MCP tools 不等于 internal operations | `/operations` 只处理 internal operations `host.echo` 和 `host.threadCheck` classification，不注册 public MCP tools | 任务 1-2 | Tests call internal `/operations` endpoint and do not assert public MCP tool schema |
| Phase 4 | Unity C# 只负责短主线程动作、DTO/result envelope、host rebirth foundation；TS 负责 workflow timeout/polling/final judgment | 5A-05 只实现 non-blocking HTTP parsing/serialization and direct `host.echo`; no workflow timeout or long polling | 任务 2-3 | Forbidden scope guard rejects `dispatch_timeout`, `pendingDispatchTimeout`, TS rebind, vertical smoke |

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 采用 `5A-DTO-02`、`5A-HTTP-02`、`5A-HTTP-03`、`5A-OPS-01`、`5A-OPS-02` 中 top-level response envelope、canonical `/operations`、operation trim、missing/unknown/malformed status/code table、HTTP framing | 不执行 `5A-DISPATCH-*`、`5A-TIMEOUT-*`、`5A-REBIND-*`、`5A-EVIDENCE-*` | 这些 requirement 属于 5A-06、5A-07、5A-08；5A-05 只证明 envelope + router foundation | 任务 1-3 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 采用 5A-05 scope、wave 3、depends on 5A-01/5A-02/5A-03；保留 5A-06 为 dispatch/timeout sibling | 不新增第 9 个 sibling plan；不把 5A-06 folded into 5A-05 | 5A-05 can be validated without main-thread dispatch success or timeout evidence | 任务 1-3 |
| `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` | 采用 5A-02 已完成的 `UnityAgentKitOperationRequest`、`UnityAgentKitOperationResponse`、`UnityAgentKitDiagnostic` fields and `JsonUtility` DTO style | 不改 DTO 为 nested v2 compatibility envelope | `5A-DTO-02` requires top-level `UnityAgentKitOperationResponse` | 任务 1-2 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` | 采用 5A-03 已完成的 listener lifecycle、per-listener record snapshot、`WriteJson` content-type/framing/stream close pattern | 不改变 `/probe` success behavior；不 add blocking dispatch wait | 5A-05 only adds `/operations` branch and operation envelopes | 任务 2-3 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2OperationRouter.cs` | 采用 `NormalizeOperation` trim、unknown operation stable failure、router helper centralization | 不采用 v2 large business operation catalog、`ok` boolean response, or legacy operation names as public compatibility | New plugin has top-level `UnityAgentKitOperationResponse` and only minimal internal operations in 5A | 任务 1 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Transport/UnityMcpV2LoopbackHttpServer.cs` | 采用 `BuildOperationsUrl` canonical helper、real body read、JSON DTO parse/serialize、404/405/400 structured transport failures | 不采用 string extraction as primary protocol, `host.probe` operation compatibility, or blocking main-thread queue wait | 5A-05 must parse DTO JSON first and preserve request context; `GET /probe` is canonical probe | 任务 2-3 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Tests/UnityMcpV2HttpServerTests.cs` | 采用 assigned-port URL assertion and real HTTP route tests as evidence style | 不采用 `StringAssert.Contains` as protocol proof | New tests deserialize `UnityAgentKitOperationResponse` and assert fields directly | 任务 2-3 |

## 文件结构

- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — Operation normalization、known operation classification、top-level envelope construction、direct `host.echo` routing、dispatch-required `host.threadCheck` classification、transport failure envelope helpers。
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — Add `BuildOperationsUrl`、read request body、canonical `POST /operations` branch、405 for `/operations` wrong method、404 operation envelope for unknown routes、400 operation envelopes for invalid operation requests。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — Add router tests, real HTTP `/operations` tests, operation envelope field assertions, response framing assertions, and 5A-06 boundary guard expectations。
- 已存在依赖：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — DTOs from 5A-02; no field rename in this plan.
- 已存在依赖：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — Lifecycle drain cleanup from 5A-03; no dispatch execution changes in this plan.

## Plan Card Coverage

| Requirement ID | 覆盖任务 | 行为证据 |
|---|---|---|
| `5A-DTO-02` | 任务 1-3 | `HostEchoOverOperationsReturnsTopLevelOperationEnvelope` and `AssertOperationEnvelopeMinimumFields` prove `/operations` returns top-level `UnityAgentKitOperationResponse`, not nested v2 data envelope. |
| `5A-HTTP-02` | 任务 2-3 | `BuildOperationsUrlUsesAssignedPortAndCanonicalPath`、`OperationsEmptyBodyReturnsStructuredFailedEnvelope`、`OperationsMalformedJsonReturnsStructuredFailedEnvelope`、`OperationsMissingOperationReturnsStructuredRejectedEnvelope`、`UnknownRouteReturns404StructuredOperationEnvelope`、`OperationsWrongMethodReturns405StructuredEnvelope` prove canonical `POST /operations` and structured 400/404/405 failures. |
| `5A-HTTP-03` | 任务 2-3 | `OperationsEndpointReturnsJsonContentTypeAndReadableUtf8Body` proves JSON content type, UTF-8 byte length, and readable closed body; existing `/probe` tests remain in the same test suite. |
| `5A-OPS-01` | 任务 1-2 | `OperationNameIsTrimmedBeforeRouting`、`MissingOperationReturnsRejectedEnvelope`、`EmptyOperationReturnsRejectedEnvelope`、`UnknownOperationReturnsRejectedEnvelopeWithCode`、`OperationsMalformedJsonReturnsStructuredFailedEnvelope` prove normalization and status/code table for router-owned failures. |
| `5A-OPS-02` | 任务 1-2 | `HostEchoRoutesWithoutMainThreadDispatch` proves direct minimal operation; `ThreadCheckIsClassifiedAsDispatchRequiredWithoutExecuting` proves `host.threadCheck` is recognized but not executed until 5A-06. |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 8 分处理 |
|---|---|---:|---|
| Top-level operation envelope | All `/operations` responses serialize `UnityAgentKitOperationResponse` directly and tests deserialize that DTO | 8 | Stop and revise router/HTTP response shape; do not add dispatch code |
| Operation normalization | Central `NormalizeOperation` trims whitespace and handles null/missing/empty uniformly | 8 | Stop and revise `UnityAgentKitOperationRouter`; do not add HTTP branch until router tests pass |
| HTTP 400/404/405 contract | Empty body, malformed JSON, missing operation, unknown route, wrong method return structured operation envelopes with status code evidence | 8 | Stop and revise `UnityAgentKitLoopbackHttpServer`; do not weaken tests to string contains |
| HTTP framing | Reuse 5A-03 `WriteJson` pattern and assert content type, UTF-8 byte length, readable body | 8 | Stop and revise response writer; do not accept partial stream evidence |
| 5A-06 boundary | `host.threadCheck` classification does not execute main-thread dispatch; no timeout hook or pending dispatch work is created | 8 | Remove dispatch/timeout code and keep 5A-06 separate |
| Scope boundary | No TS client, MCP registration, vertical smoke, workflow timeout, artifact/resource store, `/unity` skill | 9 | Remove out-of-scope files/tests before review |

低分处理规则：任何对象低于 8/10 时，5A-05 保持 incomplete，只允许修复 operation envelope/router/HTTP protocol foundation；不得通过 main-thread dispatch success、timeout simulation、TS rebind simulation、string search 或 fake public MCP result 补强 evidence。

## 执行前置条件

执行任务 1 前先确认 5A-01、5A-02、5A-03 foundation 已存在且最近验证通过：

- `plugins/unity-agent-kit/src/contracts/result.ts` and `plugins/unity-agent-kit/src/contracts/mcp-result.ts` exist from 5A-01.
- `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` defines `UnityAgentKitOperationRequest`, `UnityAgentKitOperationResponse`, and `UnityAgentKitDiagnostic`.
- `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` defines `BuildProbeUrl`, `BuildLoopbackPrefix`, `Start`, `Stop`, and a JSON writer that sets content type, content length, and closes the output stream.
- Run the existing Unity EditMode command before changing 5A-05 files:

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05PreconditionResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；现有 5A-01/5A-02/5A-03 foundation tests pass。该检查只确认 dependencies are present，不作为 5A-05 `/operations` evidence。

## 任务 1：Operation router normalization and top-level envelope foundation

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 依赖：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`

- [x] **步骤 1：编写失败的 router/envelope tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 中、HTTP tests 前加入：

```csharp
[Test]
public void OperationNameIsTrimmedBeforeRouting()
{
    var record = TestHostRecord(49170);
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = " host.echo ",
        requestId = "req-trim",
        inputJson = "{\"text\":\"trimmed\"}"
    }, record);

    Assert.AreEqual("succeeded", response.status);
    Assert.AreEqual("host.echo", response.operation);
    Assert.AreEqual("req-trim", response.requestId);
    Assert.AreEqual("host-router", response.hostId);
    Assert.AreEqual(3, response.hostEpoch);
    Assert.AreEqual("{\"text\":\"trimmed\"}", response.data);
    Assert.AreEqual(string.Empty, response.code);
    Assert.AreEqual(string.Empty, response.message);
}

[Test]
public void MissingOperationReturnsRejectedEnvelope()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        requestId = "req-missing",
        inputJson = "{\"text\":\"missing\"}"
    }, TestHostRecord(49171));

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual(string.Empty, response.operation);
    Assert.AreEqual("req-missing", response.requestId);
    Assert.AreEqual("operation.empty", response.code);
    Assert.IsNotEmpty(response.message);
    Assert.AreEqual(1, response.diagnostics.Length);
    Assert.AreEqual("operation.empty", response.diagnostics[0].code);
    Assert.AreEqual("warning", response.diagnostics[0].severity);
}

[Test]
public void EmptyOperationReturnsRejectedEnvelope()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "   ",
        requestId = "req-empty"
    }, TestHostRecord(49172));

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual(string.Empty, response.operation);
    Assert.AreEqual("req-empty", response.requestId);
    Assert.AreEqual("operation.empty", response.code);
}

[Test]
public void UnknownOperationReturnsRejectedEnvelopeWithCode()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "unknown.operation",
        requestId = "req-unknown"
    }, TestHostRecord(49173));

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual("unknown.operation", response.operation);
    Assert.AreEqual("req-unknown", response.requestId);
    Assert.AreEqual("operation.unknown", response.code);
    Assert.AreEqual(1, response.diagnostics.Length);
    Assert.AreEqual("operation.unknown", response.diagnostics[0].code);
}

[Test]
public void HostEchoRoutesWithoutMainThreadDispatch()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "host.echo",
        requestId = "req-echo-router",
        inputJson = "{\"value\":42}"
    }, TestHostRecord(49174));

    Assert.AreEqual("succeeded", response.status);
    Assert.AreEqual("host.echo", response.operation);
    Assert.AreEqual("req-echo-router", response.requestId);
    Assert.AreEqual("{\"value\":42}", response.data);
    Assert.AreEqual(0, response.diagnostics.Length);
    Assert.IsNotEmpty(response.startedAt);
    Assert.IsNotEmpty(response.completedAt);
    Assert.GreaterOrEqual(response.durationMs, 0);
}

[Test]
public void ThreadCheckIsClassifiedAsDispatchRequiredWithoutExecuting()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = " host.threadCheck ",
        requestId = "req-thread-check"
    }, TestHostRecord(49175));

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual("host.threadCheck", response.operation);
    Assert.AreEqual("req-thread-check", response.requestId);
    Assert.AreEqual("host.dispatch_required", response.code);
    Assert.AreEqual(1, response.diagnostics.Length);
    Assert.AreEqual("host.dispatch_required", response.diagnostics[0].code);
    Assert.AreEqual(string.Empty, response.data);
}
```

在 `HostRuntimeTests` helper section 中加入：

```csharp
private static UnityAgentKitHostRecord TestHostRecord(int port)
{
    return new UnityAgentKitHostRecord
    {
        hostName = UnityAgentKitHostRegistry.HostName,
        protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
        projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
        hostId = "host-router",
        hostEpoch = 3,
        port = port,
        status = UnityAgentKitHostRegistry.ReadyStatus,
        startedAt = "2026-05-20T10:00:00.0000000Z",
        lastProbeAt = "2026-05-20T10:00:01.0000000Z"
    };
}
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05RouterRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL，compiler error mentions `UnityAgentKitOperationRouter` does not exist。该失败证明 tests are exercising the missing 5A-05 router, not existing 5A-03 probe/lifecycle code。

- [x] **步骤 3：编写最少 router/envelope 实现**

创建 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`：

```csharp
using System;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitOperationRouter
    {
        internal const string InvalidRequestOperation = "host.invalidRequest";
        internal const string EchoOperation = "host.echo";
        internal const string ThreadCheckOperation = "host.threadCheck";

        internal static string NormalizeOperation(string operation)
        {
            return (operation ?? string.Empty).Trim();
        }

        internal static UnityAgentKitOperationResponse Route(UnityAgentKitOperationRequest request, UnityAgentKitHostRecord record)
        {
            var startedAt = Now();
            var operation = NormalizeOperation(request != null ? request.operation : string.Empty);
            var requestId = request != null ? request.requestId ?? string.Empty : string.Empty;

            if (string.IsNullOrEmpty(operation))
            {
                return Rejected(operation, requestId, record, "operation.empty", "Operation is required.", startedAt);
            }

            if (operation == EchoOperation)
            {
                return Succeeded(operation, requestId, record, "Echo completed.", request != null ? request.inputJson ?? string.Empty : string.Empty, startedAt);
            }

            if (operation == ThreadCheckOperation)
            {
                return Rejected(operation, requestId, record, "host.dispatch_required", "Operation requires main-thread dispatch.", startedAt);
            }

            return Rejected(operation, requestId, record, "operation.unknown", "Unknown operation: " + operation, startedAt);
        }

        internal static UnityAgentKitOperationResponse EmptyBody(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "protocol.empty_body", "Operation request body is empty.", Now());
        }

        internal static UnityAgentKitOperationResponse MalformedJson(UnityAgentKitHostRecord record, string message)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "protocol.malformed_json", string.IsNullOrEmpty(message) ? "Operation request JSON is malformed." : message, Now());
        }

        internal static UnityAgentKitOperationResponse HttpNotFound(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "http.not_found", "Unknown route.", Now());
        }

        internal static UnityAgentKitOperationResponse MethodNotAllowed(UnityAgentKitHostRecord record)
        {
            return Failed(InvalidRequestOperation, string.Empty, record, "http.method_not_allowed", "Method not allowed.", Now());
        }

        private static UnityAgentKitOperationResponse Succeeded(string operation, string requestId, UnityAgentKitHostRecord record, string summary, string data, string startedAt)
        {
            return Create("succeeded", operation, requestId, record, summary, data, Array.Empty<UnityAgentKitDiagnostic>(), string.Empty, string.Empty, startedAt);
        }

        private static UnityAgentKitOperationResponse Rejected(string operation, string requestId, UnityAgentKitHostRecord record, string code, string message, string startedAt)
        {
            return Create("rejected", operation, requestId, record, message, string.Empty, new[] { Diagnostic("warning", code, message, operation, requestId) }, code, message, startedAt);
        }

        private static UnityAgentKitOperationResponse Failed(string operation, string requestId, UnityAgentKitHostRecord record, string code, string message, string startedAt)
        {
            return Create("failed", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt);
        }

        private static UnityAgentKitOperationResponse Create(string status, string operation, string requestId, UnityAgentKitHostRecord record, string summary, string data, UnityAgentKitDiagnostic[] diagnostics, string code, string message, string startedAt)
        {
            var completedAt = Now();
            return new UnityAgentKitOperationResponse
            {
                status = status,
                operation = operation ?? string.Empty,
                requestId = requestId ?? string.Empty,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                summary = summary ?? string.Empty,
                data = data ?? string.Empty,
                diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>(),
                startedAt = startedAt,
                completedAt = completedAt,
                durationMs = DurationMs(startedAt, completedAt),
                code = code ?? string.Empty,
                message = message ?? string.Empty,
                metadata = string.Empty
            };
        }

        private static UnityAgentKitDiagnostic Diagnostic(string severity, string code, string message, string operation, string requestId)
        {
            return new UnityAgentKitDiagnostic
            {
                source = "unity-host",
                severity = severity,
                code = code ?? string.Empty,
                message = message ?? string.Empty,
                details = string.Empty,
                attribution = "{\"operation\":\"" + Escape(operation) + "\",\"requestId\":\"" + Escape(requestId) + "\"}"
            };
        }

        private static string Now()
        {
            return DateTimeOffset.UtcNow.ToString("O");
        }

        private static int DurationMs(string startedAt, string completedAt)
        {
            if (DateTimeOffset.TryParse(startedAt, out var started) && DateTimeOffset.TryParse(completedAt, out var completed))
            {
                var duration = completed - started;
                return duration.TotalMilliseconds < 0 ? 0 : (int)Math.Round(duration.TotalMilliseconds);
            }

            return 0;
        }

        private static string Escape(string value)
        {
            return (value ?? string.Empty).Replace("\\", "\\\\").Replace("\"", "\\\"");
        }
    }
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05RouterGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS。证明：router can normalize operation names, return top-level `UnityAgentKitOperationResponse`, preserve request/host metadata, handle `host.echo`, classify `host.threadCheck` without executing dispatch, and produce stable `operation.empty` / `operation.unknown` / `host.dispatch_required` diagnostics。

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add unity agent kit operation router foundation"
```

## 任务 2：Canonical `POST /operations` HTTP endpoint and transport failure envelopes

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 依赖：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [x] **步骤 1：编写失败的 real HTTP `/operations` tests**

在 `HostRuntimeTests` 中加入：

```csharp
[Test]
public void BuildOperationsUrlUsesAssignedPortAndCanonicalPath()
{
    Assert.AreEqual("http://127.0.0.1:49180/operations", UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(49180));
}

[Test]
public void HostEchoOverOperationsReturnsTopLevelOperationEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-echo");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.echo\",\"requestId\":\"req-http-echo\",\"inputJson\":\"{\\\"text\\\":\\\"hello\\\"}\"}");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.echo", "req-http-echo", record);
        Assert.AreEqual("{\"text\":\"hello\"}", response.data);
        Assert.AreEqual(string.Empty, response.code);
        Assert.AreEqual(string.Empty, response.message);
        Assert.AreEqual(0, response.diagnostics.Length);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsMissingOperationReturnsStructuredRejectedEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-missing");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"requestId\":\"req-missing-http\"}");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(400, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "rejected", string.Empty, "req-missing-http", record);
        Assert.AreEqual("operation.empty", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("operation.empty", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsEmptyBodyReturnsStructuredFailedEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-empty-body");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), string.Empty);
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(400, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
        Assert.AreEqual("protocol.empty_body", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("protocol.empty_body", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsMalformedJsonReturnsStructuredFailedEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-malformed-json");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{not-json");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(400, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
        Assert.AreEqual("protocol.malformed_json", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("protocol.malformed_json", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsUnknownOperationReturnsStructuredRejectedEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-unknown");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"unknown.operation\",\"requestId\":\"req-unknown-http\"}");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "rejected", "unknown.operation", "req-unknown-http", record);
        Assert.AreEqual("operation.unknown", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

在 helper section 加入：

```csharp
private static void AssertOperationEnvelopeMinimumFields(UnityAgentKitOperationResponse response, string status, string operation, string requestId, UnityAgentKitHostRecord record)
{
    Assert.NotNull(response);
    Assert.AreEqual(status, response.status);
    Assert.AreEqual(operation, response.operation);
    Assert.AreEqual(requestId, response.requestId);
    Assert.AreEqual(record.hostId, response.hostId);
    Assert.AreEqual(record.hostEpoch, response.hostEpoch);
    Assert.IsNotEmpty(response.summary);
    Assert.IsNotNull(response.data);
    Assert.IsNotNull(response.diagnostics);
    Assert.IsNotEmpty(response.startedAt);
    Assert.IsNotEmpty(response.completedAt);
    Assert.GreaterOrEqual(response.durationMs, 0);
    Assert.IsNotNull(response.code);
    Assert.IsNotNull(response.message);
}
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05OperationsHttpRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL，compiler error mentions `BuildOperationsUrl` does not exist, or HTTP tests receive 404/probe-shaped JSON before `/operations` branch is implemented。

- [x] **步骤 3：编写最少 `/operations` HTTP 实现**

在 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` 顶部加入：

```csharp
using System.IO;
```

在 `UnityAgentKitLoopbackHttpServer` 中加入 URL helper：

```csharp
internal static string BuildOperationsUrl(int port)
{
    return "http://127.0.0.1:" + port + "/operations";
}
```

将 `HandleContext` 改为先处理 `/operations`，保留 `/probe` success behavior：

```csharp
private static void HandleContext(HttpListenerContext context, UnityAgentKitHostRecord record)
{
    var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
    if (path == "/operations" && context.Request.HttpMethod == "POST")
    {
        HandleOperation(context, record);
        return;
    }

    if (path == "/operations")
    {
        WriteJson(context.Response, 405, JsonUtility.ToJson(UnityAgentKitOperationRouter.MethodNotAllowed(record)));
        return;
    }

    if (path == "/probe" && context.Request.HttpMethod == "GET")
    {
        WriteJson(context.Response, 200, JsonUtility.ToJson(CreateProbeResponse(record)));
        return;
    }

    if (path == "/probe")
    {
        WriteJson(context.Response, 405, JsonUtility.ToJson(FailureProbe("http.method_not_allowed", "Method not allowed.")));
        return;
    }

    WriteJson(context.Response, 404, JsonUtility.ToJson(UnityAgentKitOperationRouter.HttpNotFound(record)));
}
```

在同一 class 内加入 request body parsing：

```csharp
private static void HandleOperation(HttpListenerContext context, UnityAgentKitHostRecord record)
{
    var body = ReadRequestBody(context.Request);
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

    var response = UnityAgentKitOperationRouter.Route(request, record);
    var statusCode = response.status == "rejected" && response.code == "operation.empty" ? 400 : 200;
    WriteJson(context.Response, statusCode, JsonUtility.ToJson(response));
}

private static string ReadRequestBody(HttpListenerRequest request)
{
    using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
    {
        return reader.ReadToEnd();
    }
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05OperationsHttpGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```
预期：PASS。证明：real loopback HTTP `POST /operations` returns top-level operation envelopes, valid `host.echo` succeeds over real HTTP, invalid transport/request cases return structured 400 envelopes, and unknown internal operation returns structured rejected envelope without entering main-thread dispatch。

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "feat: add unity agent kit operations http endpoint"
```

## 任务 3：HTTP protocol framing, 404/405 operation envelopes, and 5A-06 boundary guard

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 依赖：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [x] **步骤 1：编写失败的 protocol/boundary tests**

将 existing `UnknownRouteReturns404StructuredJson` test 改为 operation envelope assertion：

```csharp
[Test]
public void UnknownRouteReturns404StructuredOperationEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-unknown-route");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Get("http://127.0.0.1:" + record.port + "/unknown");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(404, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
        Assert.AreEqual("http.not_found", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("http.not_found", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

保留 existing `/probe` wrong method test, 并新增 `/operations` wrong method、framing、threadCheck boundary tests：

```csharp
[Test]
public void OperationsWrongMethodReturns405StructuredEnvelope()
{
    var registryPath = TemporaryRegistryPath("operations-wrong-method");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Get(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port));
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(405, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.invalidRequest", string.Empty, record);
        Assert.AreEqual("http.method_not_allowed", response.code);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("http.method_not_allowed", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsEndpointReturnsJsonContentTypeAndReadableUtf8Body()
{
    var registryPath = TemporaryRegistryPath("operations-content-type");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\" host.echo \",\"requestId\":\"req-framing\",\"inputJson\":\"{\\\"text\\\":\\\"utf8-✓\\\"}\"}");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        Assert.AreEqual("application/json; charset=utf-8", result.contentType);
        Assert.AreEqual(System.Text.Encoding.UTF8.GetByteCount(result.body), result.contentLength);
        AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.echo", "req-framing", record);
        Assert.AreEqual("{\"text\":\"utf8-✓\"}", response.data);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void ThreadCheckOverOperationsIsDispatchRequiredWithoutMainThreadResult()
{
    var registryPath = TemporaryRegistryPath("operations-threadcheck-boundary");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-thread-http\"}");
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(200, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "rejected", "host.threadCheck", "req-thread-http", record);
        Assert.AreEqual("host.dispatch_required", response.code);
        Assert.AreEqual(string.Empty, response.data);
        Assert.AreEqual(1, response.diagnostics.Length);
        Assert.AreEqual("host.dispatch_required", response.diagnostics[0].code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}
```

- [x] **步骤 2：运行测试验证失败或暴露旧 404 shape**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05ProtocolRedResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：FAIL if unknown route still returns `UnityAgentKitProbeResponse`, `/operations` wrong method is not operation envelope, or response framing is missing. If task 2 already satisfies some checks, remaining failures should be limited to tests introduced in this task。

- [x] **步骤 3：补齐 protocol behavior without dispatch/timeout**

Replace `HandleContext` with this exact route order so the implementation and tests use one canonical protocol shape:

```csharp
private static void HandleContext(HttpListenerContext context, UnityAgentKitHostRecord record)
{
    var path = context.Request.Url != null ? context.Request.Url.AbsolutePath : string.Empty;
    if (path == "/operations" && context.Request.HttpMethod == "POST")
    {
        HandleOperation(context, record);
        return;
    }

    if (path == "/operations")
    {
        WriteJson(context.Response, 405, JsonUtility.ToJson(UnityAgentKitOperationRouter.MethodNotAllowed(record)));
        return;
    }

    if (path == "/probe" && context.Request.HttpMethod == "GET")
    {
        WriteJson(context.Response, 200, JsonUtility.ToJson(CreateProbeResponse(record)));
        return;
    }

    if (path == "/probe")
    {
        WriteJson(context.Response, 405, JsonUtility.ToJson(FailureProbe("http.method_not_allowed", "Method not allowed.")));
        return;
    }

    WriteJson(context.Response, 404, JsonUtility.ToJson(UnityAgentKitOperationRouter.HttpNotFound(record)));
}
```

Do not modify `UnityAgentKitMainThread.cs` in this task. Do not add `host.pendingDispatchTimeout`, `host.throw`, `Thread.Sleep`, busy wait, blocking waits, or any timeout hook.

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05ProtocolGreenResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS。证明：5A-05 structured 404/405 failures use operation envelopes, `/probe` behavior remains intact, `/operations` responses use JSON content type + UTF-8 byte framing + readable closed response body, and `host.threadCheck` is recognized without crossing into 5A-06 dispatch evidence。

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "test: verify unity agent kit operations protocol contract"
```

## 最终验证

- [x] **步骤 1：运行 5A-05 Unity HostRuntimeTests**

运行：

```bash
UNITY_EDITOR="D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe"
"$UNITY_EDITOR" -batchmode -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/unity/Library/UnityAgentKit/Phase5A05OperationsRouterResults.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests -projectPath unity -logFile -
```

预期：PASS；结果 XML contains `result="Passed"` and `failed="0"`，并覆盖以下 evidence groups：

- router normalization：`OperationNameIsTrimmedBeforeRouting`、`MissingOperationReturnsRejectedEnvelope`、`EmptyOperationReturnsRejectedEnvelope`、`UnknownOperationReturnsRejectedEnvelopeWithCode`。
- direct minimal operation：`HostEchoRoutesWithoutMainThreadDispatch`、`HostEchoOverOperationsReturnsTopLevelOperationEnvelope`。
- dispatch boundary：`ThreadCheckIsClassifiedAsDispatchRequiredWithoutExecuting`、`ThreadCheckOverOperationsIsDispatchRequiredWithoutMainThreadResult`。
- HTTP `/operations` contract：`BuildOperationsUrlUsesAssignedPortAndCanonicalPath`、`OperationsMissingOperationReturnsStructuredRejectedEnvelope`、`OperationsEmptyBodyReturnsStructuredFailedEnvelope`、`OperationsMalformedJsonReturnsStructuredFailedEnvelope`、`OperationsUnknownOperationReturnsStructuredRejectedEnvelope`。
- HTTP protocol/framing：`OperationsEndpointReturnsJsonContentTypeAndReadableUtf8Body`、`UnknownRouteReturns404StructuredOperationEnvelope`、`OperationsWrongMethodReturns405StructuredEnvelope` plus existing `/probe` framing tests。

- [x] **步骤 2：检查 5A-05 scope 没有越界文件**

运行：

```bash
git diff --name-only
```

预期输出只包含以下 code/test files、本 plan 文件、必要 Unity `.meta` 文件，以及执行完成后由文档同步步骤修改的 execution index / roadmap 文件：

```text
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-05-operations-envelope-router.md
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs
unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs
unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
```

- [x] **步骤 3：检查 forbidden scope symbols 未出现在本次 diff**

运行：

```bash
git diff -- unity/Assets/UnityAgentKit/Editor | grep -E "host\.pendingDispatchTimeout|host\.throw|dispatch_timeout|request_timeout|workflow timeout|phase5a-vertical-smoke|Thread\.Sleep|Task\.Wait|WaitOne|MainThreadQueue|Run\(|capturedMainThreadId|executionThreadId|ranOnMainThread" && exit 1 || true
```

预期：命令 exit 0 且不输出匹配行。该检查只是 boundary guard，不是行为验收；行为验收来自 Unity EditMode tests。

- [x] **步骤 4：同步 completion evidence 到 execution index / roadmap**

仅在步骤 1-3 通过后更新：

- `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
  - 5A-05 row `Expanded Plan` points to this plan file。
  - 5A-05 row `Status` becomes `completed`。
  - `Current Next Manual Action` states that 5A-05 completed and next action is to create/review 5A-06 strict execution plan for main-thread dispatch + host-level timeout。
  - Do not mark Phase 5A completed。
- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
  - Phase 5 implementation summary mentions 5A-05 completed with `Phase5A05OperationsRouterResults.xml` evidence。
  - 5A-06 through 5A-08 remain pending。
  - Roadmap Phase 5 remains `planned` / incomplete。

- [x] **步骤 5：复审入口**

实现前必须重新运行 consistency review：

```text
/superpowers:reviewing-specs docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-05-operations-envelope-router.md 是否严格遵循 technical contract，且是否只覆盖 5A-DTO-02、5A-HTTP-02、5A-HTTP-03、5A-OPS-01、5A-OPS-02，并且没有纳入 5A-06 main-thread dispatch/timeout
```

复审通过前不要进入 `subagent-driven-development`。

- [x] **步骤 6：Commit plan checkbox sync only after implementation review passes**

此步骤只在所有任务通过两阶段审查后由文档同步子代理执行：勾选本 plan 中已完成任务的 checkbox。不要在实现前勾选任务，不要改写任务正文。

## 自检

- **规格覆盖度：** `5A-DTO-02` 映射到 top-level operation response tests；`5A-HTTP-02` 映射到 `/operations` real HTTP 200/400/404/405 tests；`5A-HTTP-03` 映射到 content type / UTF-8 byte length / readable body tests；`5A-OPS-01` 映射到 trim/missing/empty/unknown/malformed tests；`5A-OPS-02` 映射到 `host.echo` direct operation and `host.threadCheck` dispatch-required classification。`5A-DISPATCH-*`、`5A-TIMEOUT-*`、`5A-REBIND-*`、`5A-EVIDENCE-*` are explicitly excluded。
- **占位符扫描：** 计划已移除模糊占位表述；每个 behavior task 都给出 concrete test names、commands、expected FAIL/PASS 和 implementation snippets。
- **类型一致性：** Code snippets use existing `UnityAgentKitOperationRequest.operation/requestId/inputJson`、`UnityAgentKitOperationResponse.status/operation/requestId/hostId/hostEpoch/summary/data/diagnostics/startedAt/completedAt/durationMs/code/message/metadata`、`UnityAgentKitDiagnostic.source/severity/code/message/details/attribution` fields from 5A-02。
- **拆分检查：** 计划头部记录 5A-05 不与 5A-06 合并的理由，并在 final verification 中加入 forbidden scope symbols guard。
- **上游约束覆盖：** Roadmap shared constraints、Phase 5A contract、execution index dependencies、用户确认事项均映射到 boundary section、Plan Card Coverage、Quality Gate 和 final verification。
- **参考输入映射：** Technical contract、execution index、current 5A-02/5A-03 files、v2 operation router、v2 loopback server、v2 HTTP tests all have adopt/reject rationale and task mapping。
- **验证强度：** 行为验收通过 Unity EditMode tests and real `HttpWebRequest` `/operations` calls；scope guard only checks forbidden diff symbols and is not used as behavior evidence。
