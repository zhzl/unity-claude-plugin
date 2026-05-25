# Unity Agent Kit Phase 5C-02 Compile State / Request / Wait Idle 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5C-02 的 compile state snapshot、compile request busy guard 和 `wait_for_idle` internal workflow，使 TS 能通过 Unity host 读取真实编译状态、请求脚本编译并等待 compile/update idle。

**架构：** Unity C# 新增 `compile.state.get` 和 `compile.request` 两个短主线程 operation；前者只读取 Editor compile/update 状态，后者在 idle 时执行 `AssetDatabase.Refresh()` + `CompilationPipeline.RequestScriptCompilation()` 并记录 session-local invalidation token。TS 新增 compile diagnostics/result mapping 与 `getCompileState`、`requestCompile`、`waitForCompileIdle` internal workflows，复用 Phase 5A host trust boundary、5C-01 rebind-aware helper 和 Phase 5B timeout semantics；本计划不实现 compiler message collector、compile report 或 `compile_and_check`。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`、`EditorApplication`、`AssetDatabase`、`CompilationPipeline`。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-02
**Spec:** `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md`
**Execution Index:** `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在任务汇报中列出未提交修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/tests/compile-workflows.test.ts` — TS 行为测试，覆盖 compile state parsing、request mapping、busy no-op、projectRoot mismatch、host rebind diagnostic、`wait_for_idle` polling、continuity failure 和 timeout continuation。
- 创建：`plugins/unity-agent-kit/src/diagnostics/compile.ts` — 定义 compile state/request data contract、host data parser、idle predicate、host-result 到 `unity_compile` action result 的 mapping。
- 创建：`plugins/unity-agent-kit/src/workflows/compile.ts` — 调用 5C-01 `executeWithRebindAwareness` 执行 `compile.state.get` / `compile.request`，提供 `getCompileState`、`requestCompile`、`waitForCompileIdle` internal workflows。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 增加 compile state/request DTO，使 JSON roundtrip 和 tests 有明确字段。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs` — Unity C# 短操作读取 `EditorApplication` compile/update 状态，并在 idle request 中调用 `AssetDatabase.Refresh()` 与 `CompilationPipeline.RequestScriptCompilation()`。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 增加 `compile.state.get` 和 `compile.request` operation 常量、main-thread dispatch 分类和 `RunOnMainThread` routing。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` — Unity EditMode tests，覆盖 compile DTO roundtrip、dispatch classification、real state snapshot、busy no-op seam、idle request seam。
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` — 本计划创建时同步 5C-02 expanded plan 路径；执行本计划完成后才允许记录 5C-02 evidence。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 5C-02 完成后仅记录 5C-02 completion evidence；不要把 Phase 5C 或 Phase 5 标记 completed。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。
- 不创建：`plugins/unity-agent-kit/src/diagnostics/console.ts`、`plugins/unity-agent-kit/src/workflows/console.ts`、`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 是 skills + public tools + internal operations + host runtime + resources 的完整操作体系；保留 v2 operation envelope、Unity host runtime、loopback HTTP host、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；TS 负责 workflow 编排、等待、轮询、timeout、host rebind、diagnostics、result convergence、最终 success/failure 判定；Unity C# 负责 Unity API 主线程执行、短动作、状态 snapshot、artifact/report 基础记录；禁止 Unity host 中长时间 `Thread.Sleep`、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程、后台线程直接调用 Unity API、Unity C# host 承担复杂 workflow 编排。
- **Phase Scope:** Phase 5C 覆盖 editor / compile / console core diagnostics workflows。5C-02 只交付 compile state、compile request 和 `wait_for_idle` internal workflow。
- **Phase Out-of-scope:** 5C-02 不实现 compiler collector、compile report、recent complete report validity、`compile_and_check`、console workflows、test/playmode/screenshot workflows、public MCP tool registration、MCP Resource handlers、`/unity` skill、Phase 5E E2E、artifact store 变更或 project command fallback。
- **Success Criteria:** TS `compile-workflows.test.ts` pass；existing TS editor/host/runtime and Phase 5B tests remain pass；Unity `CoreDiagnosticsTests` pass；Unity `HostRuntimeTests` regression pass；scope guard confirms no public MCP/tools/skill/console diagnostics/Phase 5D/Phase 5E files；`git -c core.autocrlf=false diff --check` pass；Phase 5A、Phase 5B and 5C-01 remain completed；Phase 5 remains incomplete because 5C-03、5C-04、Phase 5D、Phase 5E and final daily loop E2E are not completed by 5C-02。
- **用户确认事项:** 5C-02 覆盖 compile state/request/wait idle；compile request accepted 不证明 compilation success；`wait_for_idle` 只证明 compiling/updating settled，不证明 compile success；`compile_and_check` 归属 5C-03；Phase 5C outputs internal TS workflows + Unity C# short operations only。
- **本计划不包含:** 不提前完成 Phase 5C；不提前完成 Phase 5；不创建 public MCP tool registration/export/action-dispatch wiring；不创建 MCP Resource handlers；不创建 actual skill；不实现 compiler message collector、recent report validity、console workflows、Phase 5D workflows 或 final daily loop E2E。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | 5C-02 action semantics、TS/Unity ownership、timeout policy、host rebind/continuity rules、expected file ownership、verification matrix | 5C-03 compiler collector/report/check details；5C-04 console details | 本计划只执行 5C-02 | 任务 1-6 |
| `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | 5C-02 requirement IDs、scope boundary、depends_on、completion rule、current next action | 执行 index 本身 | Index 是覆盖和状态入口，不是 executable plan | 任务 6 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Shared Constraints：v2 host/runtime baseline、TS/Unity ownership、action completion semantics、verification discipline | 修改 roadmap phase 结构或把 Phase 5 标记 completed | 5C-02 是 Phase 5C 内部 plan card | 任务 6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | Phase 5A/5B completed state、5C-01 completed state、Phase 5C contract-ready/execution status rules、Phase 5 completion rule | 把 Phase 5C row 标记 completed 或把 Phase 5 标记 completed | 5C-02 只完成 compile primitives card | 任务 6 |
| `plugins/unity-agent-kit/src/workflows/rebind.ts` | `executeWithRebindAwareness` successful pre-operation rebind diagnostic behavior | 修改 Phase 5A `executeWithRebind` 或把 all workflows 诊断聚合抽成新框架 | 5C-02 复用 5C-01 helper，避免扩大 Phase 5A/5C shared layer | 任务 1-2 |
| `plugins/unity-agent-kit/src/workflows/editor.ts` | deterministic polling request IDs、timeout clamp、read-only wait loop、carried `host.rebound` diagnostic ordering | editor-specific status fields / PlayMode readiness | compile idle 的 success evidence 不同，不能复用 editor predicate | 任务 1-2 |
| `plugins/unity-agent-kit/tests/editor-workflows.test.ts` | strict fake registry/transport queues、port/requestId assertions、host rebind and timeout test style | editor-only snapshot helpers | compile tests define separate state/request envelopes | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs` | short main-thread state snapshot pattern | editor playmode readiness fields | compile operations read compile/update state and may request compilation | 任务 3-4 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | operation normalization、generic main-thread dispatch guard、`RunOnMainThread` branch pattern | direct route Unity API reads | direct route must keep returning `host.dispatch_required` | 任务 3-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/CompileService.cs` | busy guard pattern、`AssetDatabase.Refresh()` + `CompilationPipeline.RequestScriptCompilation()` request sequence、compile state read direction | v2 public contract、v2 operation names、compile success judgment | Unity Agent Kit 使用 Phase 4/5 result semantics；compile success judgment belongs to 5C-03 | 任务 3-4 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/tests/mcp/workflow-tools.test.ts` | run-and-wait high-level compile polling idea | public workflow contract、retry policy, `compile.run_and_wait` naming | 5C-02 implements internal `wait_for_idle` only, not public workflow tools | 任务 1-2 |

## 质量门

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS compile state mapping | `compile.state.get` host result parser + projectRoot validation + `unity_compile.get_state` result mapping | 8 | 缩小 fields 到 compile/update/token/readiness 必需字段并补 parser tests |
| TS compile request mapping | busy no-op / accepted request evidence，不声称 compile success | 8 | 删除任何 `verifiedCompileSuccess` 成功暗示，只保留 request evidence |
| TS wait idle polling | `waitForCompileIdle` 只轮询 state，timeout 返回 read_state nextStep，不调用 request | 8 | 保留 read-only workflow，不移入 Unity C# |
| Unity compile request seam | production 使用真实 `AssetDatabase.Refresh` + `CompilationPipeline.RequestScriptCompilation`；tests 使用 internal seam 验证 busy/idle 分支 | 7 | 如果 seam 与生产入口漂移，增加 CoreDiagnosticsTests 覆盖 production branch dispatch envelope |
| Scope boundary | 不创建 tools/mcp/skills/console/compile report/collector files | 9 | 立刻移除越界文件并重跑 scope guard |

低于 7/10 的对象不得进入 5C-02 completion evidence。处理方式只能是修订方案、缩小 5C-02 evidence，或由用户逐条明确接受风险；不得使用 stub、固定结果、弱测试或只检查符号存在作为通过理由。

---

### 任务 1：TS compile workflow contract tests

**文件：**
- 创建：`plugins/unity-agent-kit/tests/compile-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`

- [ ] **步骤 1：编写失败的 compile workflow tests**

创建 `plugins/unity-agent-kit/tests/compile-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  getCompileState,
  requestCompile,
  waitForCompileIdle,
  type CompileWorkflowOptions,
} from "../src/workflows/compile.ts";
import {
  compileRequestOperation,
  compileStateOperation,
  isCompileIdle,
  parseCompileRequestData,
  parseCompileStateData,
  type CompileRequestSnapshot,
  type CompileStateSnapshot,
} from "../src/diagnostics/compile.ts";
import {
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type HostRegistryReadResult,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
import type { HostTransport, HostTransportResult } from "../src/host/transport.ts";

function sampleHostRecord(overrides: Partial<UnityAgentKitHostRecord> = {}): UnityAgentKitHostRecord {
  return {
    hostName: UNITY_AGENT_KIT_HOST_NAME,
    protocolVersion: UNITY_AGENT_KIT_PROTOCOL_VERSION,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    hostId: "host-compile",
    hostEpoch: 7,
    port: 49300,
    status: "ready",
    startedAt: "2026-05-24T10:00:00.000Z",
    lastProbeAt: "2026-05-24T10:00:01.000Z",
    ...overrides,
  };
}

function compileState(overrides: Partial<CompileStateSnapshot> = {}): CompileStateSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    isCompiling: false,
    isUpdating: false,
    isIdle: true,
    invalidationToken: 3,
    hasRecentCompileReport: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function compileRequest(overrides: Partial<CompileRequestSnapshot> = {}): CompileRequestSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    requested: true,
    noOpReason: "",
    usedAssetDatabaseRefresh: true,
    usedCompilationPipeline: true,
    invalidationTokenBeforeRequest: 3,
    invalidationTokenAfterRequest: 4,
    isCompiling: false,
    isUpdating: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, operation: string, data: unknown, requestId: string): Record<string, unknown> {
  return {
    status: "succeeded",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: "Compile operation completed.",
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-24T10:00:00.000Z",
    completedAt: "2026-05-24T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: CompileWorkflowOptions["readRegistry"];
  assertConsumed(): void;
} {
  const queue = [...results];
  return {
    readRegistry: async () => {
      const next = queue.shift();
      assert.ok(next, "registry queue exhausted");
      return next;
    },
    assertConsumed() {
      assert.deepEqual(queue, []);
    },
  };
}

type ProbeExpectation = { port: number; result: HostTransportResult };
type InvokeExpectation = { port: number; operation: string; requestId: string; inputJson?: string; result: HostTransportResult };
type TransportHarness = { transport: HostTransport; assertConsumed(): void };

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): TransportHarness {
  const probeQueue = [...probes];
  const invokeQueue = [...invokes];
  return {
    transport: {
      async probe(port) {
        const next = probeQueue.shift();
        assert.ok(next, "probe queue exhausted");
        assert.equal(port, next.port);
        return next.result;
      },
      async invokeOperation(port, request) {
        const next = invokeQueue.shift();
        assert.ok(next, "invoke queue exhausted");
        assert.equal(port, next.port);
        assert.equal(request.operation, next.operation);
        assert.equal(request.requestId, next.requestId);
        if (next.inputJson !== undefined) {
          assert.equal(request.inputJson, next.inputJson);
        }
        return next.result;
      },
    },
    assertConsumed() {
      assert.deepEqual(probeQueue, []);
      assert.deepEqual(invokeQueue, []);
    },
  };
}

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: CompileWorkflowOptions["readRegistry"]): CompileWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
  };
}

function diagnosticCount(result: { diagnostics: { code?: string }[] }, code: string): number {
  return result.diagnostics.filter((diagnostic) => diagnostic.code === code).length;
}

test("parseCompileStateDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const state = compileState();

  assert.deepEqual(parseCompileStateData(JSON.stringify(state)), state);
  assert.equal(parseCompileStateData("not-json"), null);
  assert.equal(parseCompileStateData(JSON.stringify({ projectRoot: state.projectRoot })), null);
});

test("parseCompileRequestDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const request = compileRequest();

  assert.deepEqual(parseCompileRequestData(JSON.stringify(request)), request);
  assert.equal(parseCompileRequestData("not-json"), null);
  assert.equal(parseCompileRequestData(JSON.stringify({ requested: true })), null);
});

test("isCompileIdleUsesCompilingAndUpdatingOnly", () => {
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: false, isIdle: false })), true);
  assert.equal(isCompileIdle(compileState({ isCompiling: true, isUpdating: false, isIdle: true })), false);
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: true, isIdle: true })), false);
});

test("getCompileStateMapsTrustedHostEnvelopeToUnityCompileAction", async () => {
  const record = sampleHostRecord();
  const state = compileState();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-state", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, state, "req-state") } },
  ]);

  const result = await getCompileState(options(record, transport.transport, registry.readRegistry), { requestId: "req-state" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile");
  assert.equal(result.action, "get_state");
  assert.equal(result.operation, compileStateOperation);
  assert.deepEqual(result.data, state);
  assert.deepEqual(result.evidence, { completion: "state_snapshot", idle: true, verifiedCompileSuccess: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getCompileStateRejectsSnapshotProjectRootMismatch", async () => {
  const record = sampleHostRecord();
  const mismatched = compileState({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-state-root", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, mismatched, "req-state-root") } },
  ]);

  const result = await getCompileState(options(record, transport.transport, registry.readRegistry), { requestId: "req-state-root" });

  assert.equal(result.status, "failed");
  assert.equal(result.action, "get_state");
  assert.equal(result.diagnostics[0]?.code, "compile.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("requestCompileMapsAcceptedRequestWithoutClaimingCompileSuccess", async () => {
  const record = sampleHostRecord();
  const request = compileRequest();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const inputJson = JSON.stringify({ reason: "unit-test" });
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileRequestOperation, requestId: "req-compile", inputJson, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-compile") } },
  ]);

  const result = await requestCompile(options(record, transport.transport, registry.readRegistry), { requestId: "req-compile", reason: "unit-test" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile");
  assert.equal(result.action, "request");
  assert.deepEqual(result.evidence, { completion: "request_accepted", requested: true, verifiedCompileSuccess: false });
  assert.equal(result.data?.["requested"], true);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("requestCompileMapsBusyNoOpEvidence", async () => {
  const record = sampleHostRecord();
  const noOp = compileRequest({
    requested: false,
    noOpReason: "already_compiling_or_updating",
    usedAssetDatabaseRefresh: false,
    usedCompilationPipeline: false,
    invalidationTokenAfterRequest: 3,
    isCompiling: true,
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileRequestOperation, requestId: "req-compile-busy", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, noOp, "req-compile-busy") } },
  ]);

  const result = await requestCompile(options(record, transport.transport, registry.readRegistry), { requestId: "req-compile-busy" });

  assert.equal(result.status, "succeeded");
  assert.deepEqual(result.evidence, { completion: "no_op", requested: false, noOpReason: "already_compiling_or_updating", verifiedCompileSuccess: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getCompileStateRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49300 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49301 });
  const registry = registrySequence([{ ok: true, record: first }, { ok: true, record: rebound }, { ok: true, record: rebound }]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, operation: compileStateOperation, requestId: "req-rebound-state", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, compileStateOperation, compileState(), "req-rebound-state") } },
  ]);

  const result = await getCompileState({ registryPath: "ignored", projectRoot: first.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, { requestId: "req-rebound-state" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.equal(diagnosticCount(result, "host.rebound"), 1);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdlePollsUntilIdleWithoutVerifyingCompileSuccess", async () => {
  const record = sampleHostRecord();
  const busy = compileState({ isCompiling: true, isIdle: false });
  const idle = compileState();
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, busy, "req-idle-1") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-idle-2", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, idle, "req-idle-2") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-idle",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_for_idle");
  assert.deepEqual(result.evidence, { completion: "state_settled", idle: true, verifiedCompileSuccess: false });
  assert.deepEqual(sleeps, [25]);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdleStopsOnHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-lost-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(stale, compileStateOperation, compileState({ isCompiling: true, isIdle: false }), "req-lost-1") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-lost",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "wait_for_idle");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdleReturnsReadStateTimeoutWithoutClaimingCompileFailure", async () => {
  const record = sampleHostRecord();
  const busy = compileState({ isUpdating: true, isIdle: false });
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-timeout-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, busy, "req-timeout-1") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-timeout",
    timeoutMs: 0,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
    now: (() => {
      const values = [0, 0];
      return () => values.shift() ?? 0;
    })(),
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_for_idle");
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [ ] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/compile-workflows.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/workflows/compile.ts'` 或 `Cannot find module '../src/diagnostics/compile.ts'`。

证明：该 red 证明 5C-02 的 TS compile workflow 入口尚未存在。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/tests/compile-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: add phase 5c compile workflow contract tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：TS compile diagnostics and workflows

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/compile.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/compile.ts`
- 测试：`plugins/unity-agent-kit/tests/compile-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/src/workflows/editor.ts`

- [ ] **步骤 1：实现 compile diagnostics contract**

创建 `plugins/unity-agent-kit/src/diagnostics/compile.ts`：

```ts
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

export const compileStateOperation = "compile.state.get" as const;
export const compileRequestOperation = "compile.request" as const;

export interface CompileStateSnapshot {
  projectRoot: string;
  unityVersion: string;
  isCompiling: boolean;
  isUpdating: boolean;
  isIdle: boolean;
  invalidationToken: number;
  hasRecentCompileReport: boolean;
  recentCompileReportId?: string;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export interface CompileRequestSnapshot {
  projectRoot: string;
  unityVersion: string;
  requested: boolean;
  noOpReason: string;
  usedAssetDatabaseRefresh: boolean;
  usedCompilationPipeline: boolean;
  invalidationTokenBeforeRequest: number;
  invalidationTokenAfterRequest: number;
  isCompiling: boolean;
  isUpdating: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export function parseCompileStateData(data: unknown): CompileStateSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" &&
    value.unityVersion.length > 0 &&
    typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" &&
    typeof value.isIdle === "boolean" &&
    isInteger(value.invalidationToken) &&
    value.invalidationToken >= 0 &&
    typeof value.hasRecentCompileReport === "boolean" &&
    (value.recentCompileReportId === undefined || typeof value.recentCompileReportId === "string") &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    isIdle: value.isIdle,
    invalidationToken: value.invalidationToken,
    hasRecentCompileReport: value.hasRecentCompileReport,
    ...(value.recentCompileReportId === undefined ? {} : { recentCompileReportId: value.recentCompileReportId }),
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function parseCompileRequestData(data: unknown): CompileRequestSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" &&
    value.unityVersion.length > 0 &&
    typeof value.requested === "boolean" &&
    typeof value.noOpReason === "string" &&
    typeof value.usedAssetDatabaseRefresh === "boolean" &&
    typeof value.usedCompilationPipeline === "boolean" &&
    isInteger(value.invalidationTokenBeforeRequest) &&
    value.invalidationTokenBeforeRequest >= 0 &&
    isInteger(value.invalidationTokenAfterRequest) &&
    value.invalidationTokenAfterRequest >= 0 &&
    typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    requested: value.requested,
    noOpReason: value.noOpReason,
    usedAssetDatabaseRefresh: value.usedAssetDatabaseRefresh,
    usedCompilationPipeline: value.usedCompilationPipeline,
    invalidationTokenBeforeRequest: value.invalidationTokenBeforeRequest,
    invalidationTokenAfterRequest: value.invalidationTokenAfterRequest,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function isCompileIdle(snapshot: Pick<CompileStateSnapshot, "isCompiling" | "isUpdating">): boolean {
  return !snapshot.isCompiling && !snapshot.isUpdating;
}

export function compileStateResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_state" | "wait_for_idle",
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapCompileHostResult(hostResult, action);
  }

  const snapshot = parseCompileStateData(hostResult.data);
  if (snapshot === null) {
    return compileFailureResult(hostResult, action, invalidShapeDiagnostic("compile.state_invalid_shape", "Compile state operation returned an invalid data shape.", hostResult.requestId), "Inspect diagnostics for the invalid compile state payload before retrying.");
  }

  const mismatch = projectRootMismatchDiagnostic(snapshot.projectRoot, expectedProjectRoot, hostResult.requestId);
  if (mismatch !== null) {
    return compileFailureResult(hostResult, action, mismatch, "Inspect diagnostics before retrying because the compile state came from a different project root.");
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action,
    operation: compileStateOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: isCompileIdle(snapshot) ? "Compile state is idle." : "Compile state read; Unity is compiling or updating.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "state_snapshot",
      idle: isCompileIdle(snapshot),
      verifiedCompileSuccess: false,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function compileRequestResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapCompileHostResult(hostResult, "request");
  }

  const snapshot = parseCompileRequestData(hostResult.data);
  if (snapshot === null) {
    return compileFailureResult(hostResult, "request", invalidShapeDiagnostic("compile.request_invalid_shape", "Compile request operation returned an invalid data shape.", hostResult.requestId), "Inspect diagnostics for the invalid compile request payload before retrying.");
  }

  const mismatch = projectRootMismatchDiagnostic(snapshot.projectRoot, expectedProjectRoot, hostResult.requestId);
  if (mismatch !== null) {
    return compileFailureResult(hostResult, "request", mismatch, "Inspect diagnostics before retrying because the compile request came from a different project root.");
  }

  const evidence = snapshot.requested
    ? { completion: "request_accepted", requested: true, verifiedCompileSuccess: false }
    : { completion: "no_op", requested: false, noOpReason: snapshot.noOpReason, verifiedCompileSuccess: false };

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action: "request",
    operation: compileRequestOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: snapshot.requested ? "Compile request accepted." : "Compile request skipped because Unity is already compiling or updating.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence,
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function remapCompileHostResult(hostResult: UnityAgentKitPublicResult, action: "get_state" | "request" | "wait_for_idle"): UnityAgentKitPublicResult {
  return definePublicResult({
    ...hostResult,
    tool: "unity_compile",
    action,
    summary: hostResult.summary || "Compile operation could not be completed.",
  });
}

function compileFailureResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_state" | "request" | "wait_for_idle",
  diagnostic: UnityAgentKitDiagnostic,
  reason: string,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_compile",
    action,
    operation: action === "request" ? compileRequestOperation : compileStateOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: diagnostic.message,
    code: diagnostic.code,
    message: diagnostic.message,
    diagnostics: [...hostResult.diagnostics, diagnostic],
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    nextStep: { kind: "inspect_diagnostics", reason },
  });
}

function invalidShapeDiagnostic(code: string, message: string, requestId: string | undefined): UnityAgentKitDiagnostic {
  return {
    source: "workflow",
    severity: "error",
    code,
    message,
    attribution: { operation: "compile", requestId },
  };
}

function projectRootMismatchDiagnostic(actualProjectRoot: string, expectedProjectRoot: string, requestId: string | undefined): UnityAgentKitDiagnostic | null {
  if (normalizeProjectRoot(actualProjectRoot) === normalizeProjectRoot(expectedProjectRoot)) {
    return null;
  }

  return {
    source: "validation",
    severity: "error",
    code: "compile.project_root_mismatch",
    message: "Compile operation projectRoot does not match the expected Unity project root.",
    details: { expectedProjectRoot, actualProjectRoot },
    attribution: { operation: "compile", requestId },
  };
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isOptionalInteger(value: unknown): value is number | undefined {
  return value === undefined || isInteger(value);
}
```

- [ ] **步骤 2：实现 compile workflows**

创建 `plugins/unity-agent-kit/src/workflows/compile.ts`：

```ts
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import {
  compileRequestOperation,
  compileRequestResultFromHostResult,
  compileStateOperation,
  compileStateResultFromHostResult,
  isCompileIdle,
  parseCompileStateData,
} from "../diagnostics/compile.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import { executeWithRebindAwareness } from "./rebind.ts";

export interface CompileWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface CompileActionOptions {
  requestId?: string;
}

export interface CompileRequestOptions extends CompileActionOptions {
  reason?: string;
}

export interface WaitForCompileIdleOptions extends CompileActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getCompileState(
  workflow: CompileWorkflowOptions,
  action: CompileActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = action.requestId ?? `compile-state-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileStateOperation,
      requestId,
    },
  });

  return compileStateResultFromHostResult(hostResult.result, "get_state", workflow.projectRoot);
}

export async function requestCompile(
  workflow: CompileWorkflowOptions,
  options: CompileRequestOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-request-${Date.now()}`;
  const inputJson = options.reason === undefined ? undefined : JSON.stringify({ reason: options.reason });
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileRequestOperation,
      requestId,
      ...(inputJson === undefined ? {} : { inputJson }),
    },
  });

  return compileRequestResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function waitForCompileIdle(
  workflow: CompileWorkflowOptions,
  options: WaitForCompileIdleOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const baseRequestId = options.requestId ?? `compile-wait-idle-${Date.now()}`;
  const deadline = now() + timeoutMs;
  const carriedDiagnostics: UnityAgentKitDiagnostic[] = [];
  let attempt = 0;

  while (true) {
    attempt += 1;
    const stateResult = await getCompileState(workflow, { requestId: `${baseRequestId}-${attempt}` });
    collectReboundDiagnostics(stateResult.diagnostics, carriedDiagnostics);
    if (stateResult.status !== "succeeded") {
      return withCarriedDiagnostics(remapCompileAction(stateResult, "wait_for_idle"), carriedDiagnostics);
    }

    const snapshot = parseCompileStateData(stateResult.data);
    if (snapshot === null) {
      return withCarriedDiagnostics(
        compileStateResultFromHostResult(stateResult, "wait_for_idle", workflow.projectRoot),
        carriedDiagnostics,
      );
    }

    if (isCompileIdle(snapshot)) {
      return withCarriedDiagnostics(
        definePublicResult({
          ...stateResult,
          action: "wait_for_idle",
          summary: "Compile state is idle.",
          evidence: {
            completion: "state_settled",
            idle: true,
            verifiedCompileSuccess: false,
          },
        }),
        carriedDiagnostics,
      );
    }

    const stateReadAt = now();
    if (stateReadAt >= deadline) {
      return withCarriedDiagnostics(timeoutResult(baseRequestId), carriedDiagnostics);
    }

    await sleep(Math.min(pollIntervalMs, deadline - stateReadAt));

    if (now() >= deadline) {
      return withCarriedDiagnostics(timeoutResult(baseRequestId), carriedDiagnostics);
    }
  }
}

function timeoutResult(requestId: string): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_compile",
    action: "wait_for_idle",
    requestId,
    summary: "Timed out waiting for Unity compile/update state to become idle.",
    mayStillBeRunning: false,
    safeToRetry: true,
    nextStep: {
      kind: "read_state",
      tool: "unity_compile",
      action: "get_state",
      reason: "Read the latest compile state before retrying idle wait.",
    },
  });
}

function remapCompileAction(result: UnityAgentKitPublicResult, action: "get_state" | "request" | "wait_for_idle"): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_compile",
    action,
    summary: result.summary || "Compile workflow could not establish idle state.",
  });
}

function collectReboundDiagnostics(diagnostics: UnityAgentKitDiagnostic[], carriedDiagnostics: UnityAgentKitDiagnostic[]): void {
  const carriedIdentities = new Set(carriedDiagnostics.map(diagnosticIdentity));
  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== "host.rebound") {
      continue;
    }

    const identity = diagnosticIdentity(diagnostic);
    if (!carriedIdentities.has(identity)) {
      carriedDiagnostics.push(diagnostic);
      carriedIdentities.add(identity);
    }
  }
}

function withCarriedDiagnostics(result: UnityAgentKitPublicResult, carriedDiagnostics: UnityAgentKitDiagnostic[]): UnityAgentKitPublicResult {
  const resultIdentities = new Set(result.diagnostics.map(diagnosticIdentity));
  const diagnosticsToCarry = carriedDiagnostics.filter((diagnostic) => !resultIdentities.has(diagnosticIdentity(diagnostic)));

  if (diagnosticsToCarry.length === 0) {
    return result;
  }

  return definePublicResult({
    ...result,
    diagnostics: [...result.diagnostics, ...diagnosticsToCarry],
  });
}

function diagnosticIdentity(diagnostic: UnityAgentKitDiagnostic): string {
  return JSON.stringify({
    source: diagnostic.source,
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    attribution: diagnostic.attribution,
  });
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **步骤 3：运行 TS compile tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/compile-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 TS 能把 trusted Unity host compile state/request envelope 映射为 `unity_compile` result，并且 `wait_for_idle` 在 TS 层完成 polling、idle judgment 和 timeout continuation。

- [ ] **步骤 4：运行现有 TS contract tests 防回归**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-02 没有破坏 5C-01 editor workflows、Phase 5A host/runtime trust boundary 或 Phase 5B resource/timeout/completion contract。

- [ ] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/compile.ts plugins/unity-agent-kit/src/workflows/compile.ts plugins/unity-agent-kit/tests/compile-workflows.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5c compile workflows

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Unity compile diagnostics contract tests

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs`

- [ ] **步骤 1：编写失败的 Unity compile diagnostics tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` 的 `EditorStatusOperationReturnsRealSnapshotOnMainThread` 测试后追加：

```csharp
        [Test]
        public void CompileStateResultRoundTripsReadinessFields()
        {
            var result = new UnityAgentKitCompileStateResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                isCompiling = false,
                isUpdating = true,
                isIdle = false,
                invalidationToken = 4,
                hasRecentCompileReport = false,
                recentCompileReportId = string.Empty,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileStateResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("D:/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2022.3.61f1", roundTrip.unityVersion);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsTrue(roundTrip.isUpdating);
            Assert.IsFalse(roundTrip.isIdle);
            Assert.AreEqual(4, roundTrip.invalidationToken);
            Assert.IsFalse(roundTrip.hasRecentCompileReport);
            Assert.AreEqual(string.Empty, roundTrip.recentCompileReportId);
            Assert.AreEqual(7, roundTrip.capturedMainThreadId);
            Assert.AreEqual(7, roundTrip.executionThreadId);
        }

        [Test]
        public void CompileRequestResultRoundTripsAcceptedAndNoOpFields()
        {
            var result = new UnityAgentKitCompileRequestResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                requested = true,
                noOpReason = string.Empty,
                usedAssetDatabaseRefresh = true,
                usedCompilationPipeline = true,
                invalidationTokenBeforeRequest = 4,
                invalidationTokenAfterRequest = 5,
                isCompiling = false,
                isUpdating = false,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileRequestResult>(JsonUtility.ToJson(result));

            Assert.IsTrue(roundTrip.requested);
            Assert.AreEqual(string.Empty, roundTrip.noOpReason);
            Assert.IsTrue(roundTrip.usedAssetDatabaseRefresh);
            Assert.IsTrue(roundTrip.usedCompilationPipeline);
            Assert.AreEqual(4, roundTrip.invalidationTokenBeforeRequest);
            Assert.AreEqual(5, roundTrip.invalidationTokenAfterRequest);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsFalse(roundTrip.isUpdating);
        }

        [Test]
        public void CompileOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.state.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.request "));

            var stateResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.state.get",
                requestId = "req-compile-state-direct"
            }, TestHostRecord());
            var requestResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.request",
                requestId = "req-compile-request-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", stateResponse.status);
            Assert.AreEqual("host.dispatch_required", stateResponse.code);
            Assert.AreEqual("rejected", requestResponse.status);
            Assert.AreEqual("host.dispatch_required", requestResponse.code);
        }

        [Test]
        public void CompileStateOperationReturnsRealSnapshotOnMainThread()
        {
            var record = TestHostRecord();
            var currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.state.get",
                requestId = "req-compile-state"
            }, record, currentThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.state.get", "req-compile-state", record);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(0, response.diagnostics.Length);

            var data = JsonUtility.FromJson<UnityAgentKitCompileStateResult>(response.data);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), data.projectRoot);
            Assert.AreEqual(Application.unityVersion, data.unityVersion);
            Assert.AreEqual(EditorApplication.isCompiling, data.isCompiling);
            Assert.AreEqual(EditorApplication.isUpdating, data.isUpdating);
            Assert.AreEqual(!EditorApplication.isCompiling && !EditorApplication.isUpdating, data.isIdle);
            Assert.GreaterOrEqual(data.invalidationToken, 0);
            Assert.IsFalse(data.hasRecentCompileReport);
            Assert.AreEqual(currentThreadId, data.capturedMainThreadId);
            Assert.AreEqual(currentThreadId, data.executionThreadId);
        }

        [Test]
        public void CompileRequestBusyGuardReturnsNoOpWithoutRefreshOrRequest()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var refreshCalls = 0;
            var requestCalls = 0;
            var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                string.Empty,
                7,
                isCompiling: true,
                isUpdating: false,
                refreshAssetDatabase: () => refreshCalls += 1,
                requestScriptCompilation: () => requestCalls += 1);

            Assert.IsFalse(result.requested);
            Assert.AreEqual("already_compiling_or_updating", result.noOpReason);
            Assert.IsFalse(result.usedAssetDatabaseRefresh);
            Assert.IsFalse(result.usedCompilationPipeline);
            Assert.AreEqual(0, refreshCalls);
            Assert.AreEqual(0, requestCalls);
            Assert.AreEqual(result.invalidationTokenBeforeRequest, result.invalidationTokenAfterRequest);
            Assert.IsTrue(result.isCompiling);
            Assert.IsFalse(result.isUpdating);
        }

        [Test]
        public void CompileRequestIdleRefreshesAssetsRequestsCompilationAndIncrementsToken()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var refreshCalls = 0;
            var requestCalls = 0;
            var result = UnityAgentKitCompileDiagnostics.RequestCompileForTests(
                "{\"reason\":\"unit-test\"}",
                7,
                isCompiling: false,
                isUpdating: false,
                refreshAssetDatabase: () => refreshCalls += 1,
                requestScriptCompilation: () => requestCalls += 1);

            Assert.IsTrue(result.requested);
            Assert.AreEqual(string.Empty, result.noOpReason);
            Assert.IsTrue(result.usedAssetDatabaseRefresh);
            Assert.IsTrue(result.usedCompilationPipeline);
            Assert.AreEqual(1, refreshCalls);
            Assert.AreEqual(1, requestCalls);
            Assert.AreEqual(result.invalidationTokenBeforeRequest + 1, result.invalidationTokenAfterRequest);
            Assert.IsFalse(result.isCompiling);
            Assert.IsFalse(result.isUpdating);
            Assert.AreEqual(7, result.capturedMainThreadId);
        }
```

- [ ] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-core-diagnostics-red.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：FAIL，Unity compile error 包含 `UnityAgentKitCompileStateResult`、`UnityAgentKitCompileRequestResult` 或 `UnityAgentKitCompileDiagnostics` 相关 symbol 不存在。

证明：该 red 证明 Unity C# 侧尚未实现 5C-02 compile diagnostics operations。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5c compile diagnostics tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Unity compile diagnostics operations

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`

- [ ] **步骤 1：添加 Unity compile DTOs**

在 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` 的 `UnityAgentKitEditorStatusResult` 后追加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitCompileStateResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool isCompiling;
        public bool isUpdating;
        public bool isIdle;
        public int invalidationToken;
        public bool hasRecentCompileReport;
        public string recentCompileReportId = string.Empty;
        public int capturedMainThreadId;
        public int executionThreadId;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileRequestInput
    {
        public string reason = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileRequestResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool requested;
        public string noOpReason = string.Empty;
        public bool usedAssetDatabaseRefresh;
        public bool usedCompilationPipeline;
        public int invalidationTokenBeforeRequest;
        public int invalidationTokenAfterRequest;
        public bool isCompiling;
        public bool isUpdating;
        public int capturedMainThreadId;
        public int executionThreadId;
    }
```

保留文件顶部已有 `using System;`。

- [ ] **步骤 2：实现 Unity compile diagnostics short operations**

创建 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs`：

```csharp
using System;
using System.Threading;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitCompileDiagnostics
    {
        private static int compileInvalidationToken;

        internal static UnityAgentKitCompileStateResult ReadState(int capturedMainThreadId)
        {
            return CreateState(capturedMainThreadId, EditorApplication.isCompiling, EditorApplication.isUpdating);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompile(string inputJson, int capturedMainThreadId)
        {
            return RequestCompile(
                inputJson,
                capturedMainThreadId,
                EditorApplication.isCompiling,
                EditorApplication.isUpdating,
                AssetDatabase.Refresh,
                CompilationPipeline.RequestScriptCompilation);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompileForTests(
            string inputJson,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            return RequestCompile(inputJson, capturedMainThreadId, isCompiling, isUpdating, refreshAssetDatabase, requestScriptCompilation);
        }

        internal static void ResetForTests()
        {
            compileInvalidationToken = 0;
        }

        private static UnityAgentKitCompileRequestResult RequestCompile(
            string inputJson,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            var tokenBefore = compileInvalidationToken;
            var requested = false;
            var noOpReason = string.Empty;
            var usedAssetDatabaseRefresh = false;
            var usedCompilationPipeline = false;

            if (isCompiling || isUpdating)
            {
                noOpReason = "already_compiling_or_updating";
            }
            else
            {
                refreshAssetDatabase();
                usedAssetDatabaseRefresh = true;
                requestScriptCompilation();
                usedCompilationPipeline = true;
                compileInvalidationToken += 1;
                requested = true;
            }

            return new UnityAgentKitCompileRequestResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                requested = requested,
                noOpReason = noOpReason,
                usedAssetDatabaseRefresh = usedAssetDatabaseRefresh,
                usedCompilationPipeline = usedCompilationPipeline,
                invalidationTokenBeforeRequest = tokenBefore,
                invalidationTokenAfterRequest = compileInvalidationToken,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }

        private static UnityAgentKitCompileStateResult CreateState(int capturedMainThreadId, bool isCompiling, bool isUpdating)
        {
            return new UnityAgentKitCompileStateResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                isIdle = !isCompiling && !isUpdating,
                invalidationToken = compileInvalidationToken,
                hasRecentCompileReport = false,
                recentCompileReportId = string.Empty,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }
    }
}
```

`inputJson` is accepted for operation envelope stability but does not affect 5C-02 behavior. Do not parse compile success options in 5C-02; compile success belongs to 5C-03.

- [ ] **步骤 3：Route compile operations through main-thread dispatch**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中添加 operation 常量：

```csharp
        internal const string CompileStateGetOperation = "compile.state.get";
        internal const string CompileRequestOperation = "compile.request";
```

把 `RequiresMainThreadDispatch` return expression 改为包含 compile operations：

```csharp
            return normalized == ThreadCheckOperation ||
                normalized == EditorStatusGetOperation ||
                normalized == CompileStateGetOperation ||
                normalized == CompileRequestOperation ||
                normalized == ThrowOperation ||
                normalized == PendingDispatchTimeoutOperation;
```

在 `RunOnMainThread` 的 `EditorStatusGetOperation` 分支后、`ThrowOperation` 分支前添加：

```csharp
            if (operation == CompileStateGetOperation)
            {
                var result = UnityAgentKitCompileDiagnostics.ReadState(capturedMainThreadId);
                return Succeeded(operation, requestId, record, "Compile state read.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }

            if (operation == CompileRequestOperation)
            {
                var result = UnityAgentKitCompileDiagnostics.RequestCompile(request != null ? request.inputJson ?? string.Empty : string.Empty, capturedMainThreadId);
                return Succeeded(operation, requestId, record, result.requested ? "Compile request accepted." : "Compile request skipped because Unity is already compiling or updating.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }
```

不要在 `Route` 中直接读取 Unity compile APIs；direct route must keep returning `host.dispatch_required` through the existing generic main-thread guard behavior。

- [ ] **步骤 4：运行 Unity CoreDiagnostics tests 验证通过**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-core-diagnostics.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`，test log 中 `CoreDiagnosticsTests` 全部通过。

证明：该检查证明 Unity C# 能在主线程短操作中读取真实 compile/update 状态，busy 时不重复请求编译，idle 时调用 refresh/request seam 并递增 invalidation token。

- [ ] **步骤 5：运行 HostRuntime dispatch tests 防回归**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-host-runtime.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 compile operations 没有破坏现有 `/operations` envelope、main-thread dispatch、host timeout、stop/reload behavior。

- [ ] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5c compile diagnostics operations

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：5C-02 integrated verification and scope guard

**文件：**
- 读取：`plugins/unity-agent-kit/src/workflows/compile.ts`
- 读取：`plugins/unity-agent-kit/tests/compile-workflows.test.ts`
- 读取：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 检查：public MCP tools / registration / action-dispatch forbidden surface
- 检查：MCP Resource handler forbidden surface
- 检查：`/unity` skill forbidden surface
- 检查：console diagnostics/workflows forbidden surface
- 检查：compile report / collector / `compile_and_check` forbidden surface
- 检查：Phase 5D test/playmode/screenshot workflows forbidden surface
- 检查：Phase 5E final daily loop E2E forbidden surface

- [ ] **步骤 1：运行 TS focused verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-02 TS workflow 与 5C-01、Phase 5A、Phase 5B TS contracts 同时成立。

- [ ] **步骤 2：运行 Unity focused verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-compile-state-request-idle.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity compile state/request operations 可在真实 Unity EditMode runner 中执行，且 request seam 覆盖 busy guard 和 idle request evidence。

- [ ] **步骤 3：运行 scope guard**

运行：

```bash
test ! -e plugins/unity-agent-kit/src/tools && test ! -e plugins/unity-agent-kit/src/mcp && test ! -e plugins/unity-agent-kit/src/server.ts && test ! -e plugins/unity-agent-kit/src/index.ts && test ! -e plugins/unity-agent-kit/src/resources/handlers.ts && test ! -e plugins/unity-agent-kit/src/resources/mcp.ts && test ! -e plugins/unity-agent-kit/skills/unity && test ! -e plugins/unity-agent-kit/skills/unity.md && test ! -e plugins/unity-agent-kit/src/diagnostics/console.ts && test ! -e plugins/unity-agent-kit/src/workflows/console.ts && test ! -e plugins/unity-agent-kit/src/diagnostics/compile-report.ts && test ! -e plugins/unity-agent-kit/src/workflows/compile-and-check.ts && test ! -e unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs && test ! -e unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileReportDiagnostics.cs && test ! -e plugins/unity-agent-kit/src/workflows/test.ts && test ! -e plugins/unity-agent-kit/src/workflows/playmode.ts && test ! -e plugins/unity-agent-kit/src/workflows/screenshot.ts && test ! -e plugins/unity-agent-kit/src/workflows/daily-loop.ts
```

预期：PASS，命令无输出且 exit code 为 `0`。

证明：该检查证明 5C-02 没有越界创建 public MCP tools / registration / action-dispatch surface、MCP Resource handlers、`/unity` skill、console diagnostics/workflows、compile report / collector / `compile_and_check`、Phase 5D test/playmode/screenshot workflows 或 Phase 5E final daily loop E2E files。

- [ ] **步骤 4：运行 diff formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：该检查证明新增/修改文件没有 trailing whitespace 或 patch formatting 问题。

- [ ] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/compile.ts plugins/unity-agent-kit/src/workflows/compile.ts plugins/unity-agent-kit/tests/compile-workflows.test.ts unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: verify phase 5c compile state request idle

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 6：5C-02 documentation state sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：更新 5C execution index 的 5C-02 row**

在 `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` 的 Candidate Plan Cards table 中，把 5C-02 row 的 `Status` 从 `draft` 或 `plan-card` 改为 `completed`，并在文件中追加 5C-02 evidence section：

```markdown
## Phase 5C-02 Completion Evidence

5C-02 Compile state/request/wait idle completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-compile-state-request-idle.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `failed="0"`.
3. Scope guard passed: no public MCP tools / registration / action-dispatch surface, MCP Resource handlers, `/unity` skill, console diagnostics/workflows, compile report / collector / `compile_and_check`, Phase 5D test/playmode/screenshot workflows, or Phase 5E final daily loop E2E files were created by 5C-02.
4. `git -c core.autocrlf=false diff --check` passed with no output.

Phase 5C remains incomplete because 5C-03 and 5C-04 are not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.
```

Use the actual test counts from command output if they differ from the examples above.

- [ ] **步骤 2：同步 parent Phase 5 index 的 plan-ready 状态且不越界完成**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中把 Phase 5C row 同步为 `execution-planned` / `plan-ready`，因为 5C execution index 和当前 5C-02 expanded plan 已通过 plan-set review；同时 completion evidence 必须继续说明 5C-03/5C-04 未完成，Phase 5C 和 Phase 5 不 completed:

```markdown
| Phase 5C | Core Diagnostics Workflows | `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | execution-planned | plan-ready | 5C-01 and 5C-02 completed; 5C-03 and 5C-04 not completed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending | stays subplan |
```

Do not set Phase 5C `Status` to `completed` in this task.

- [ ] **步骤 3：更新 roadmap partial evidence**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中只记录 5C-02 partial completion evidence 和 next manual action：

```markdown
5C-02 Compile state/request/wait idle completed with evidence; 5C-03 and 5C-04 remain incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending.
```

Next Manual Action must point to creating/reviewing the 5C-03 expanded execution plan. Do not mark Phase 5 completed.

- [ ] **步骤 4：运行 docs/state checks**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md && git -c core.autocrlf=false diff --check
```

预期：diff 只包含 5C-02 evidence/status updates、Phase 5C row state sync、roadmap partial evidence 和 next manual action；diff check 无输出。

证明：该检查证明 documentation state 只记录 5C-02 完成事实，不把 Phase 5C 或 Phase 5 提前标记 completed。

- [ ] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record phase 5c compile idle evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：5C-02 covers `unity_compile.get_state`、`unity_compile.request`、`unity_compile.wait_for_idle`、busy guard、request/no-op evidence、state-settled idle polling、timeout/read_state next step、host rebind diagnostic、scope boundary。5C-03 compiler collector / compile report / `compile_and_check` and 5C-04 console workflows are intentionally represented in the execution index and require separate expanded plans before execution.
- 占位符扫描：计划只保留具体步骤、代码片段、命令、预期输出和证明说明；没有执行占位语。
- 类型一致性：TS plan consistently uses `CompileStateSnapshot`、`CompileRequestSnapshot`、`compileStateOperation`、`compileRequestOperation`、`getCompileState`、`requestCompile`、`waitForCompileIdle`、`CompileWorkflowOptions`；Unity plan consistently uses `UnityAgentKitCompileStateResult`、`UnityAgentKitCompileRequestInput`、`UnityAgentKitCompileRequestResult`、`UnityAgentKitCompileDiagnostics.ReadState`、`UnityAgentKitCompileDiagnostics.RequestCompile`、`CompileStateGetOperation` and `CompileRequestOperation`。
- 拆分检查：Phase 5C is split by execution index into 5C-01 through 5C-04. This expanded plan executes only 5C-02 and remains independently testable.
- 上游约束覆盖：Roadmap Shared Constraints、Phase 5C spec、Phase 5 plan index、Phase 5B timeout/completion helper semantics are mapped to tasks and verification.
- 参考输入映射：All referenced specs, plan indexes, existing TS/C# files, and v2 compile reference have adopted/non-adopted decisions mapped to tasks.
- 验证强度：Behavior tasks use TS behavior tests and Unity EditMode tests, not symbol-only checks. Scope guard is explicitly marked as boundary verification, not behavior acceptance.
