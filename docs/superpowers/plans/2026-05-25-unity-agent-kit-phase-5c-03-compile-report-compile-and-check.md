# Unity Agent Kit Phase 5C-03 Compile Report / Compile And Check 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5C-03 的 compiler report collector、valid recent complete report proof，以及 `unity_compile.compile_and_check` internal workflow，使编译成功只能由 current-cycle compiler proof 或 valid recent complete compile report 证明。

**架构：** 复用 5C-02 的 `compile.state.get`、`compile.request` 和 `waitForCompileIdle` primitives；Unity C# 只新增 compiler lifecycle collector、recent complete report record 和 internal-only `compile.report.get` 短主线程 operation。TS 负责 `compile_and_check` 编排、timeout budget、host continuity 判断、report validity proof 和最终 succeeded / failed / uncertain 判定；idle settled、request accepted、Console clean 都不能作为 compile success proof。`getCompileReport` 只作为 internal TS helper，不成为 approved `unity_compile` public action。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `CompilationPipeline`、Unity `CompilerMessage[]`、Unity `JsonUtility`。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-03
**Spec:** `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md`
**Execution Index:** `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
**Depends on:** Phase 5C-02 completed with evidence in `docs/superpowers/plans/2026-05-24-unity-agent-kit-phase-5c-02-compile-state-request-idle.md`

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在任务汇报中列出未提交修改文件。

## 文件结构

- 修改：`plugins/unity-agent-kit/tests/compile-workflows.test.ts` — 扩展 5C-02 TS 行为测试，覆盖 compile report parser、report judgment、recent report success/failure、current-cycle success/failure、missing proof uncertain、token mismatch uncertain、workflow host continuity loss、lightweight recent-report timeout budget 和 `120s` long-wait guard。
- 修改：`plugins/unity-agent-kit/src/diagnostics/compile.ts` — 在既有 compile diagnostics contract 中增加 internal-only `compile.report.get` operation constant、compile report DTO/parser、internal report-result mapping 和 `judgeCompileReport` final status logic；不得把 `get_report` 添加为 approved public action。
- 修改：`plugins/unity-agent-kit/src/workflows/compile.ts` — 在既有 compile workflows 中增加 internal-only `getCompileReport` helper 和 `compileAndCheck`，复用 5C-02 `getCompileState`、`requestCompile`、`waitForCompileIdle`，不创建 public MCP tool registration。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 增加 compiler message/report DTO 和 report request DTO；保留 5C-02 compile state/request DTO。
- 修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs` — 扩展为 compile diagnostics collector：订阅 CompilationPipeline callbacks、维护 session-local invalidation token、active cycle、recent complete report，并提供 deterministic test seams。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 增加 `compile.report.get` operation constant、main-thread dispatch classification 和 `RunOnMainThread` routing。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` — Unity EditMode tests，覆盖 DTO roundtrip、collector seam、report missing uncertain、operation routing 和 callback subscription smoke。
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` — 5C-03 完成后记录 expanded plan path/status/evidence；Phase 5C 仍不 completed，因为 5C-04 未完成。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 5C-03 完成后同步 partial evidence；Phase 5 仍不 completed。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 仅记录 5C-03 partial completion evidence 和下一步 5C-04 plan review，不改变 roadmap goal、phase scope 或 completed 状态。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/src/server.ts`、`plugins/unity-agent-kit/src/index.ts`、`plugins/unity-agent-kit/src/resources/handlers.ts`、`plugins/unity-agent-kit/src/resources/mcp.ts`。
- 不创建：`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。
- 不创建：`plugins/unity-agent-kit/src/diagnostics/console.ts`、`plugins/unity-agent-kit/src/workflows/console.ts`、`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`。
- 不创建：`plugins/unity-agent-kit/src/workflows/test.ts`、`plugins/unity-agent-kit/src/workflows/playmode.ts`、`plugins/unity-agent-kit/src/workflows/screenshot.ts`、`plugins/unity-agent-kit/src/workflows/daily-loop.ts`。

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 v2 operation envelope、Unity host runtime、loopback HTTP host、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、轮询、timeout、host rebind 和最终判定；Unity C# 负责 Unity API 主线程短动作、状态 snapshot、job/report 记录；`compile_and_check` 的成功判定以 `CompilationPipeline.assemblyCompilationFinished` 的 `CompilerMessage[]` 为主，`compilationFinished` 和 Editor idle 只证明 lifecycle 结束；Console clean 不替代 compiler messages；缺少归属 proof 必须返回 `uncertain`。
- **Phase Scope:** Phase 5C 覆盖 editor / compile / console core diagnostics workflows。5C-03 只交付 compile report collector、valid recent compile report proof 和 `compile_and_check` attribution，建立在 5C-02 compile state/request/wait idle primitives 之上。
- **Phase Out-of-scope:** 5C-03 不实现 5C-04 console workflows，不实现 Phase 5D test/playmode/screenshot workflows，不实现 Phase 5E public MCP tool registration、MCP Resource handlers、`/unity` skill 或 final daily loop E2E，不把 Phase 5C 或 Phase 5 标记 completed。
- **Success Criteria:** TS `compile-workflows.test.ts` 覆盖 compile report + `compile_and_check` 并通过；existing TS editor/host/runtime/Phase 5B tests remain pass；Unity `CoreDiagnosticsTests` 覆盖 compile collector seam 和 callback subscription smoke 并通过；Unity `HostRuntimeTests` regression pass；scope guard confirms no public MCP/tools/skill/console/5D/5E files；`git -c core.autocrlf=false diff --check` pass；docs evidence sync 只记录 5C-03 partial completion，Phase 5C remains incomplete because 5C-04 is not completed，Phase 5 remains incomplete because Phase 5C/5D/5E/final E2E remain incomplete。
- **用户确认事项:** 5C-01 completed；5C-02 completed with evidence；5C-03 pending scope is compile report + `compile_and_check` attribution；5C-04 remains outside this plan；compile request accepted and idle settled are not compile success proof；`compile_and_check` success may only come from current-cycle compiler proof or valid recent complete compile report；`getCompileReport` may remain exported only as an internal TS helper and must not become an approved `unity_compile` public action；lightweight recent-report/no-new-compile path must not consume the full `120s` cap；current-cycle proof must track host continuity across the workflow, while recent-report proof can stand alone when it matches the current host/session/token/idle state；unproven invalidation-token lifecycle events must return `uncertain` rather than success；5C-03 must include TDD tasks、TS tests、Unity EditMode tests、scope guard、docs evidence sync、upstream constraints summary、reference input mapping、文件结构、任务拆分和自检结果。
- **本计划不包含:** 不完成 5C-04；不实现 Console count/snapshot/clear/cursor/resource；不实现 public MCP registration/export/action-dispatch wiring；不实现 MCP Resource handlers；不创建 actual skill；不实现 TestRunner、PlayMode、Screenshot 或 daily loop E2E；不以 idle settled、request accepted、Console clean、无错误 Console 当前列表作为 compile success proof。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | 5C-03 action semantics、compile lifecycle/report fields、recent report validity、invalidation token、timeout policy、host rebind/continuity rules、Unity callback seam expectations | 5C-04 console cursor/snapshot/resource implementation；Phase 5D/5E actions | 本计划只执行 5C-03 | 任务 1-6 |
| `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | 5C-03 requirement IDs、depends_on 5C-02、120s upper default cap、scope boundary、completion rules | 执行 index 本身；5C-04 plan card execution | Index 是状态入口，不是 executable plan | 任务 1-6 |
| `docs/superpowers/plans/2026-05-24-unity-agent-kit-phase-5c-02-compile-state-request-idle.md` | 现有 `getCompileState`、`requestCompile`、`waitForCompileIdle` semantics；accepted/no-op evidence；idle settled 不证明 success；scope guard and docs sync style | 5C-02 的“不创建 compile report / collector / compile_and_check” scope guard | 该禁止只适用于 5C-02；5C-03 正是补上 compile report 和 check attribution | 任务 1-6 |
| `plugins/unity-agent-kit/src/diagnostics/compile.ts` | Existing compile state/request DTO parser、projectRoot validation、`unity_compile` result mapping style | 把 request/idle evidence 改写为 success proof | 5C-02 semantics 必须保持 | 任务 1-2 |
| `plugins/unity-agent-kit/src/workflows/compile.ts` | Existing workflow options、rebind-aware operation invocation、idle wait timeout helper、diagnostic carrying style | 新建单独 public workflow tool 或 MCP handler | Phase 5E 才注册 public MCP tools；5C-03 仅 internal workflow | 任务 1-2 |
| `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs` | Existing invalidation token and request busy guard foundation | Unity C# 长时间等待 compile completion | TS owns waiting and final judgment | 任务 3-4 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | Operation constant、main-thread dispatch requirement、`RunOnMainThread` routing pattern、operation envelope response | Direct route Unity API reads or background-thread compiler API access | Unity API must remain main-thread short operation | 任务 3-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/CompileService.cs` | CompilationPipeline callback collection direction、compiler messages as primary proof、request script compilation baseline | v2 public contract、v2 status names、request/status as success proof | Unity Agent Kit uses Phase 4 result semantics and stricter attribution | 任务 3-4 |
| Roadmap Shared Constraints `compile_and_check` rules | Compiler messages primary；Console diagnostic cursor supplemental；uncertain when report attribution cannot be proven | Console-clean success shortcut | Explicitly forbidden by roadmap | 任务 1-6 |

## 质量门

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS compile report parser/judgment | Strict report shape parser + validity checks for projectRoot, hostId/hostEpoch, completeness and invalidation token | 8 | 删除 weak success path，补 token/host/completeness tests |
| `compileAndCheck` orchestration | Reuse 5C-02 state/request/wait idle, then read report and judge; lightweight recent-report path does not consume the `120s` cap; request/current-cycle path keeps `120s` as upper cap with explicit long-wait intent beyond cap | 8 | Keep workflow inside TS and add timeout budget + continuity guard tests |
| Unity compiler collector | CompilationPipeline callback collector + deterministic seams + recent complete report; unproven collector reset/subscription-loss proof clears trust and returns `uncertain` | 7 | If callback lifecycle is hard to prove, return `uncertain`; do not claim success from idle |
| Recent report proof | valid only when current host/project/unity/token/completeness/idle all match; it is independent proof for the current host session, not a continuation of a prior current-cycle request | 8 | Any missing field maps to `uncertain` with diagnostic |
| Scope boundary | No public MCP, Resource handlers, `/unity`, console workflows, Phase 5D/5E | 9 | Remove scope leak and rerun scope guard |

低于 7/10 的对象不得进入 5C-03 completion evidence。处理方式只能是修订方案、缩小 5C-03 evidence，或由用户逐条明确接受风险；不得使用 stub、固定成功、Console clean、idle settled 或只检查符号存在作为通过理由。

## 审查确认决策

- `compile.report.get` 是 internal Unity operation；`getCompileReport` 可以作为 internal TS helper 暴露给本包测试，但不得成为 approved `unity_compile.get_report` public action、catalog entry 或 Phase 5E registration target。
- `120s` 是 `compile_and_check` request/current-cycle path 的 upper default cap；lightweight recent-report/no-new-compile path must use state/report reads only and must not enter the long compile wait budget.
- Current-cycle proof must keep state/request/idle/report on one host continuity chain; if hostId/hostEpoch changes mid-cycle, return `uncertain` unless a valid recent complete report for the current host/session independently proves success.
- Invalidation-token lifecycle coverage stays conservative: request/current-cycle and completed-report token equality are strong proof; collector reset, callback subscription loss, or other unproven evidence-breaking lifecycle events clear report trust or return `uncertain`.

---

### 任务 1：TS compile report and `compile_and_check` contract tests

**文件：**
- 修改：`plugins/unity-agent-kit/tests/compile-workflows.test.ts:4-18`
- 修改：`plugins/unity-agent-kit/tests/compile-workflows.test.ts:42-73`
- 修改：`plugins/unity-agent-kit/tests/compile-workflows.test.ts:400` 后追加测试
- 读取参考：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`

- [x] **步骤 1：扩展 TS imports 和 test helpers**

把 `plugins/unity-agent-kit/tests/compile-workflows.test.ts` 顶部 workflow import 改为：

```ts
import {
  compileAndCheck,
  getCompileReport,
  getCompileState,
  requestCompile,
  waitForCompileIdle,
  type CompileWorkflowOptions,
} from "../src/workflows/compile.ts";
```

把 diagnostics import 改为：

```ts
import {
  compileReportGetOperation,
  compileRequestOperation,
  compileStateOperation,
  isCompileIdle,
  judgeCompileReport,
  parseCompileReportData,
  parseCompileRequestData,
  parseCompileStateData,
  type CompileReportSnapshot,
  type CompileRequestSnapshot,
  type CompileStateSnapshot,
} from "../src/diagnostics/compile.ts";
```

在现有 `compileRequest` helper 后追加：

```ts
function compileReport(overrides: Partial<CompileReportSnapshot> = {}): CompileReportSnapshot {
  return {
    reportId: "compile-report-3",
    compileCycleId: "compile-cycle-3",
    hostId: "host-compile",
    hostEpoch: 7,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    completedAt: "2026-05-25T10:00:05.000Z",
    invalidationTokenAtCompletion: 3,
    compilerErrorCount: 0,
    compilerWarningCount: 0,
    compilerMessagesSummary: "0 errors, 0 warnings",
    compilerMessages: [],
    assemblyCompilationFinishedSeen: true,
    compilationFinishedSeen: true,
    editorIdleAfterCompilation: true,
    ...overrides,
  };
}

function uncertainEnvelope(record: UnityAgentKitHostRecord, operation: string, requestId: string, code: string, message: string): Record<string, unknown> {
  return {
    status: "uncertain",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: message,
    data: "",
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code,
        message,
        attribution: { operation, requestId },
      },
    ],
    startedAt: "2026-05-25T10:00:00.000Z",
    completedAt: "2026-05-25T10:00:00.010Z",
    durationMs: 10,
    code,
    message,
  };
}
```

- [x] **步骤 2：追加 compile report parser/judgment tests**

在 `plugins/unity-agent-kit/tests/compile-workflows.test.ts` 现有 parser tests 后追加：

```ts
test("parseCompileReportDataAcceptsCompleteReportAndRejectsInvalidShape", () => {
  const report = compileReport();

  assert.deepEqual(parseCompileReportData(JSON.stringify(report)), report);
  assert.equal(parseCompileReportData("not-json"), null);
  assert.equal(parseCompileReportData(JSON.stringify({ reportId: report.reportId })), null);
});

test("parseCompileReportDataPreservesCompilerMessages", () => {
  const report = compileReport({
    compilerErrorCount: 1,
    compilerWarningCount: 1,
    compilerMessagesSummary: "1 error, 1 warning",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "CS1002: ; expected",
      },
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Warning.cs",
        line: 3,
        column: 1,
        type: "warning",
        message: "CS0168: variable is declared but never used",
      },
    ],
  });

  assert.deepEqual(parseCompileReportData(JSON.stringify(report)), report);
});

test("judgeCompileReportSucceedsOnlyFromCompleteMatchingReport", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport();

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-success",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "compile_and_check");
  assert.equal(result.data?.["compilerMessagesAttributed"], true);
  assert.equal(result.data?.["compilerErrorCount"], 0);
  assert.equal(result.data?.["usedRecentCompileReport"], true);
  assert.deepEqual(result.evidence, {
    completion: "compile_verified",
    proof: "recent_complete_report",
    verifiedCompileSuccess: true,
  });
});

test("judgeCompileReportFailsOnCompilerErrors", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({
    compilerErrorCount: 1,
    compilerMessagesSummary: "1 error, 0 warnings",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "CS1002: ; expected",
      },
    ],
  });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-errors",
    usedRecentCompileReport: false,
    requestedInvalidationToken: 3,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "compile.compiler_error");
  assert.equal(result.data?.["compilerErrorCount"], 1);
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
});

test("judgeCompileReportReturnsUncertainForTokenMismatch", () => {
  const state = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ invalidationTokenAtCompletion: 3 });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-token",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.recent_report_invalidated");
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
});

test("judgeCompileReportReturnsUncertainForIncompleteLifecycle", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ compilationFinishedSeen: false });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-incomplete",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.lifecycle_incomplete");
});
```

- [x] **步骤 3：追加 workflow tests for recent/current-cycle proof and timeout guard**

在 `plugins/unity-agent-kit/tests/compile-workflows.test.ts` 文件末尾追加：

```ts
test("getCompileReportMapsTrustedHostEnvelopeAsInternalHelper", async () => {
  const record = sampleHostRecord();
  const report = compileReport();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileReportGetOperation, requestId: "req-report", inputJson: JSON.stringify({ reportId: "compile-report-3" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-report") } },
  ]);

  const result = await getCompileReport(options(record, transport.transport, registry.readRegistry), { requestId: "req-report", reportId: "compile-report-3" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile_internal");
  assert.equal(result.action, "read_compile_report");
  assert.equal(result.operation, compileReportGetOperation);
  assert.equal(result.metadata?.["publicAction"], false);
  assert.deepEqual(result.data, report);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckUsesValidRecentCompleteReportWithoutRequestingCompilationOrLongWait", async () => {
  const record = sampleHostRecord();
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport();
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-check-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, state, "req-check-state-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-check-report", inputJson: JSON.stringify({ reportId: "compile-report-3" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-check-report") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-check",
    timeoutMs: 120_000,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "compile_and_check");
  assert.equal(result.data?.["usedRecentCompileReport"], true);
  assert.equal(result.data?.["compilerMessagesAttributed"], true);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckRequestsWaitsAndChecksCurrentCycleReport", async () => {
  const record = sampleHostRecord();
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-4" });
  const report = compileReport({
    reportId: "compile-report-4",
    compileCycleId: "compile-cycle-4",
    invalidationTokenAtCompletion: 4,
  });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-cycle-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, initial, "req-cycle-state-1") } },
    { port: record.port, operation: compileRequestOperation, requestId: "req-cycle-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-cycle-request") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-cycle-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, settled, "req-cycle-idle-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-cycle-report", inputJson: JSON.stringify({ reportId: "compile-report-4" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-cycle-report") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-cycle",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.data?.["usedRecentCompileReport"], false);
  assert.equal(result.data?.["invalidationTokenAtCheck"], 4);
  assert.equal(result.evidence?.["proof"], "current_cycle_report");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckReturnsUncertainWhenIdleSettlesWithoutCompileReport", async () => {
  const record = sampleHostRecord();
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: false });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-missing-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, initial, "req-missing-state-1") } },
    { port: record.port, operation: compileRequestOperation, requestId: "req-missing-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-missing-request") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-missing-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, settled, "req-missing-idle-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-missing-report", result: { ok: true, statusCode: 200, body: uncertainEnvelope(record, compileReportGetOperation, "req-missing-report", "compile.report_missing", "No complete compile report is available.") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-missing",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.report_missing");
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckRejectsLongTimeoutWithoutExplicitIntent", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await compileAndCheck(options(record, transport.transport), {
    requestId: "req-long-timeout",
    timeoutMs: 120_001,
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "compile.long_wait_requires_intent");
  transport.assertConsumed();
});

test("compileAndCheckReturnsUncertainOnReportHostMismatch", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ hostId: "other-host" });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-host-mismatch",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "host.continuity_lost");
});

test("compileAndCheckReturnsUncertainWhenCurrentCycleContinuityChangesBeforeReport", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 7, port: 49300 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 8, port: 49301 });
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-4" });
  const report = compileReport({ hostId: rebound.hostId, hostEpoch: rebound.hostEpoch, reportId: "compile-report-4", invalidationTokenAtCompletion: 4 });
  const registry = registrySequence([
    { ok: true, record: first }, { ok: true, record: first },
    { ok: true, record: first }, { ok: true, record: first },
    { ok: true, record: rebound }, { ok: true, record: rebound },
    { ok: true, record: rebound }, { ok: true, record: rebound },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: first } },
    { port: first.port, result: { ok: true, statusCode: 200, body: first } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: first.port, operation: compileStateOperation, requestId: "req-continuity-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(first, compileStateOperation, initial, "req-continuity-state-1") } },
    { port: first.port, operation: compileRequestOperation, requestId: "req-continuity-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(first, compileRequestOperation, request, "req-continuity-request") } },
    { port: rebound.port, operation: compileStateOperation, requestId: "req-continuity-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, compileStateOperation, settled, "req-continuity-idle-1") } },
    { port: rebound.port, operation: compileReportGetOperation, requestId: "req-continuity-report", inputJson: JSON.stringify({ reportId: "compile-report-4" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, compileReportGetOperation, report, "req-continuity-report") } },
  ]);

  const result = await compileAndCheck({ registryPath: "ignored", projectRoot: first.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, {
    requestId: "req-continuity",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "host.continuity_lost");
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 4：运行 TS test 验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/compile-workflows.test.ts
```

预期：FAIL，报错包含 `compileReportGetOperation`、`parseCompileReportData`、`judgeCompileReport`、`getCompileReport` 或 `compileAndCheck` 未导出。

证明：该 red 证明 5C-03 compile report + `compile_and_check` TS contract 尚未实现。

- [x] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/tests/compile-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: add phase 5c compile report workflow contracts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：TS compile report diagnostics and `compileAndCheck` workflow

**文件：**
- 修改：`plugins/unity-agent-kit/src/diagnostics/compile.ts:7-361`
- 修改：`plugins/unity-agent-kit/src/workflows/compile.ts:6-213`
- 测试：`plugins/unity-agent-kit/tests/compile-workflows.test.ts`

- [x] **步骤 1：扩展 compile diagnostics contract**

在 `plugins/unity-agent-kit/src/diagnostics/compile.ts` 中增加 operation constant、types、parser 和 judgment。保留既有 `compileStateOperation`、`compileRequestOperation`、`parseCompileStateData`、`parseCompileRequestData`、`isCompileIdle`、state/request result mapping。

新增代码：

```ts
export const compileReportGetOperation = "compile.report.get" as const;

export type CompileCompilerMessageType = "error" | "warning" | "info";

export interface CompileCompilerMessageSnapshot {
  assemblyPath: string;
  file: string;
  line: number;
  column: number;
  type: CompileCompilerMessageType;
  message: string;
}

export interface CompileReportSnapshot {
  reportId: string;
  compileCycleId: string;
  hostId: string;
  hostEpoch: number;
  projectRoot: string;
  unityVersion: string;
  completedAt: string;
  invalidationTokenAtCompletion: number;
  compilerErrorCount: number;
  compilerWarningCount: number;
  compilerMessagesSummary: string;
  compilerMessages: CompileCompilerMessageSnapshot[];
  assemblyCompilationFinishedSeen: boolean;
  compilationFinishedSeen: boolean;
  editorIdleAfterCompilation: boolean;
}

export interface CompileReportJudgmentInput {
  report: CompileReportSnapshot;
  state: CompileStateSnapshot;
  hostId: string;
  hostEpoch: number;
  requestId?: string;
  usedRecentCompileReport: boolean;
  requestedInvalidationToken?: number;
}

export function parseCompileReportData(data: unknown): CompileReportSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.reportId === "string" && value.reportId.length > 0 &&
    typeof value.compileCycleId === "string" && value.compileCycleId.length > 0 &&
    typeof value.hostId === "string" && value.hostId.length > 0 &&
    isNonNegativeInteger(value.hostEpoch) &&
    typeof value.projectRoot === "string" && value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" && value.unityVersion.length > 0 &&
    typeof value.completedAt === "string" && value.completedAt.length > 0 &&
    isNonNegativeInteger(value.invalidationTokenAtCompletion) &&
    isNonNegativeInteger(value.compilerErrorCount) &&
    isNonNegativeInteger(value.compilerWarningCount) &&
    typeof value.compilerMessagesSummary === "string" &&
    Array.isArray(value.compilerMessages) && value.compilerMessages.every(isCompileCompilerMessageSnapshot) &&
    typeof value.assemblyCompilationFinishedSeen === "boolean" &&
    typeof value.compilationFinishedSeen === "boolean" &&
    typeof value.editorIdleAfterCompilation === "boolean"
  )) {
    return null;
  }

  return {
    reportId: value.reportId,
    compileCycleId: value.compileCycleId,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    completedAt: value.completedAt,
    invalidationTokenAtCompletion: value.invalidationTokenAtCompletion,
    compilerErrorCount: value.compilerErrorCount,
    compilerWarningCount: value.compilerWarningCount,
    compilerMessagesSummary: value.compilerMessagesSummary,
    compilerMessages: value.compilerMessages,
    assemblyCompilationFinishedSeen: value.assemblyCompilationFinishedSeen,
    compilationFinishedSeen: value.compilationFinishedSeen,
    editorIdleAfterCompilation: value.editorIdleAfterCompilation,
  };
}

export function internalCompileReportResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_compile_internal",
      action: "read_compile_report",
      metadata: { ...(hostResult.metadata ?? {}), publicAction: false },
      summary: hostResult.summary || "Compile report could not be read.",
    });
  }

  const report = parseCompileReportData(hostResult.data);
  if (report === null) {
    return compileReportUncertainResult(
      hostResult.requestId,
      hostResult.hostId,
      hostResult.hostEpoch,
      "compile.report_invalid_shape",
      "Compile report operation returned an invalid data shape.",
      hostResult.diagnostics,
      { completion: "compile_report", verifiedCompileSuccess: false },
    );
  }

  if (normalizeProjectRoot(report.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return compileReportUncertainResult(
      hostResult.requestId,
      hostResult.hostId,
      hostResult.hostEpoch,
      "compile.project_root_mismatch",
      "Compile report projectRoot does not match the expected Unity project root.",
      hostResult.diagnostics,
      { completion: "compile_report", verifiedCompileSuccess: false },
      { expectedProjectRoot, actualProjectRoot: report.projectRoot },
    );
  }

  if (report.hostId !== hostResult.hostId || report.hostEpoch !== hostResult.hostEpoch) {
    return compileReportUncertainResult(
      hostResult.requestId,
      hostResult.hostId,
      hostResult.hostEpoch,
      "host.continuity_lost",
      "Compile report host identity does not match the active host response.",
      hostResult.diagnostics,
      { completion: "compile_report", verifiedCompileSuccess: false },
      { reportHostId: report.hostId, reportHostEpoch: report.hostEpoch, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch },
    );
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile_internal",
    action: "read_compile_report",
    operation: compileReportGetOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: "Compile report read for internal compile_and_check proof.",
    data: report,
    diagnostics: hostResult.diagnostics,
    evidence: { completion: "compile_report", complete: true, verifiedCompileSuccess: false },
    metadata: { publicAction: false },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function judgeCompileReport(input: CompileReportJudgmentInput): UnityAgentKitPublicResult {
  const reportDiagnostic = validateCompileReportForJudgment(input);
  if (reportDiagnostic !== null) {
    return definePublicResult({
      status: "uncertain",
      tool: "unity_compile",
      action: "compile_and_check",
      requestId: input.requestId,
      hostId: input.hostId,
      hostEpoch: input.hostEpoch,
      summary: reportDiagnostic.message,
      code: reportDiagnostic.code,
      message: reportDiagnostic.message,
      data: compileCheckData(input, false),
      diagnostics: [reportDiagnostic],
      evidence: {
        completion: "compile_proof_incomplete",
        proof: input.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
        verifiedCompileSuccess: false,
      },
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Compile report proof is incomplete; inspect diagnostics before retrying compile_and_check.",
      },
    });
  }

  if (input.report.compilerErrorCount > 0) {
    return definePublicResult({
      status: "failed",
      tool: "unity_compile",
      action: "compile_and_check",
      requestId: input.requestId,
      hostId: input.hostId,
      hostEpoch: input.hostEpoch,
      summary: input.report.compilerMessagesSummary,
      code: "compile.compiler_error",
      message: input.report.compilerMessagesSummary,
      data: compileCheckData(input, true),
      diagnostics: compilerDiagnostics(input.report, input.requestId),
      evidence: {
        completion: "compile_verified",
        proof: input.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
        verifiedCompileSuccess: false,
      },
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action: "compile_and_check",
    requestId: input.requestId,
    hostId: input.hostId,
    hostEpoch: input.hostEpoch,
    summary: input.report.compilerMessagesSummary,
    data: compileCheckData(input, true),
    diagnostics: compilerDiagnostics(input.report, input.requestId),
    evidence: {
      completion: "compile_verified",
      proof: input.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
      verifiedCompileSuccess: true,
    },
  });
}

function validateCompileReportForJudgment(input: CompileReportJudgmentInput): UnityAgentKitDiagnostic | null {
  if (input.report.hostId !== input.hostId || input.report.hostEpoch !== input.hostEpoch) {
    return compileDiagnostic("host.continuity_lost", "Compile report host identity does not match the active workflow host.", input.requestId, {
      reportHostId: input.report.hostId,
      reportHostEpoch: input.report.hostEpoch,
      hostId: input.hostId,
      hostEpoch: input.hostEpoch,
    });
  }

  if (normalizeProjectRoot(input.report.projectRoot) !== normalizeProjectRoot(input.state.projectRoot) || input.report.unityVersion !== input.state.unityVersion) {
    return compileDiagnostic("compile.report_binding_mismatch", "Compile report project or Unity version does not match the state snapshot.", input.requestId, {
      reportProjectRoot: input.report.projectRoot,
      stateProjectRoot: input.state.projectRoot,
      reportUnityVersion: input.report.unityVersion,
      stateUnityVersion: input.state.unityVersion,
    });
  }

  if (!isCompileIdle(input.state) || !input.report.editorIdleAfterCompilation) {
    return compileDiagnostic("compile.editor_idle_missing", "Compile report cannot prove Editor idle after compilation.", input.requestId);
  }

  if (!input.report.assemblyCompilationFinishedSeen || !input.report.compilationFinishedSeen) {
    return compileDiagnostic("compile.lifecycle_incomplete", "Compile lifecycle callbacks did not produce complete compiler proof.", input.requestId, {
      assemblyCompilationFinishedSeen: input.report.assemblyCompilationFinishedSeen,
      compilationFinishedSeen: input.report.compilationFinishedSeen,
    });
  }

  if (input.report.invalidationTokenAtCompletion !== input.state.invalidationToken) {
    return compileDiagnostic("compile.recent_report_invalidated", "Compile report invalidation token does not match the current compile state.", input.requestId, {
      invalidationTokenAtCompletion: input.report.invalidationTokenAtCompletion,
      invalidationTokenAtCheck: input.state.invalidationToken,
    });
  }

  if (input.requestedInvalidationToken !== undefined && input.report.invalidationTokenAtCompletion < input.requestedInvalidationToken) {
    return compileDiagnostic("compile.current_cycle_not_proven", "Compile report predates the compile request that compile_and_check issued.", input.requestId, {
      requestedInvalidationToken: input.requestedInvalidationToken,
      invalidationTokenAtCompletion: input.report.invalidationTokenAtCompletion,
    });
  }

  return null;
}

function compileCheckData(input: CompileReportJudgmentInput, compilerMessagesAttributed: boolean): Record<string, unknown> {
  return {
    compileCycleId: input.report.compileCycleId,
    compilerMessagesAttributed,
    compilerErrorCount: input.report.compilerErrorCount,
    compilerWarningCount: input.report.compilerWarningCount,
    compilerMessagesSummary: input.report.compilerMessagesSummary,
    usedRecentCompileReport: input.usedRecentCompileReport,
    recentCompileReportId: input.usedRecentCompileReport ? input.report.reportId : undefined,
    invalidationTokenAtCheck: input.state.invalidationToken,
    invalidationTokenAtReport: input.report.invalidationTokenAtCompletion,
  };
}

function compilerDiagnostics(report: CompileReportSnapshot, requestId: string | undefined): UnityAgentKitDiagnostic[] {
  return report.compilerMessages.map((message) => ({
    source: "compiler",
    severity: message.type === "error" ? "error" : message.type === "warning" ? "warning" : "info",
    code: message.type === "error" ? "compile.compiler_error" : message.type === "warning" ? "compile.compiler_warning" : "compile.compiler_info",
    message: message.message,
    details: {
      assemblyPath: message.assemblyPath,
      file: message.file,
      line: message.line,
      column: message.column,
      type: message.type,
    },
    attribution: { operation: "compile_and_check", requestId, compileCycleId: report.compileCycleId, reportId: report.reportId },
  }));
}

function compileReportUncertainResult(
  requestId: string | undefined,
  hostId: string | undefined,
  hostEpoch: number | undefined,
  code: string,
  message: string,
  existingDiagnostics: UnityAgentKitDiagnostic[],
  evidence: Record<string, unknown>,
  details?: Record<string, unknown>,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: "unity_compile_internal",
    action: "read_compile_report",
    operation: compileReportGetOperation,
    requestId,
    hostId,
    hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [...existingDiagnostics, compileDiagnostic(code, message, requestId, details)],
    evidence,
    metadata: { publicAction: false },
    nextStep: { kind: "inspect_diagnostics", reason: "Compile report proof is missing or invalid." },
  });
}

function compileDiagnostic(code: string, message: string, requestId: string | undefined, details?: Record<string, unknown>): UnityAgentKitDiagnostic {
  return {
    source: code.startsWith("host.") ? "host" : "workflow",
    severity: "error",
    code,
    message,
    ...(details === undefined ? {} : { details }),
    attribution: { operation: "compile_and_check", requestId },
  };
}

function isCompileCompilerMessageSnapshot(value: unknown): value is CompileCompilerMessageSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    typeof message.assemblyPath === "string" &&
    typeof message.file === "string" &&
    isNonNegativeInteger(message.line) &&
    isNonNegativeInteger(message.column) &&
    (message.type === "error" || message.type === "warning" || message.type === "info") &&
    typeof message.message === "string" &&
    message.message.length > 0
  );
}
```

- [x] **步骤 2：实现 compile report workflow helpers**

在 `plugins/unity-agent-kit/src/workflows/compile.ts` imports 中增加：

```ts
  compileReportGetOperation,
  internalCompileReportResultFromHostResult,
  judgeCompileReport,
  parseCompileReportData,
  parseCompileRequestData,
  type CompileReportSnapshot,
  type CompileRequestSnapshot,
  type CompileStateSnapshot,
```

在 option interfaces 后追加：

```ts
export interface CompileReportOptions extends CompileActionOptions {
  reportId?: string;
}

export interface CompileAndCheckOptions extends CompileActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  allowLongWait?: boolean;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}
```

在 `requestCompile` 后追加：

```ts
export async function getCompileReport(
  workflow: CompileWorkflowOptions,
  options: CompileReportOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-report-${Date.now()}`;
  const inputJson = options.reportId === undefined ? undefined : JSON.stringify({ reportId: options.reportId });
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileReportGetOperation,
      requestId,
      ...(inputJson === undefined ? {} : { inputJson }),
    },
  });

  return internalCompileReportResultFromHostResult(hostResult.result, workflow.projectRoot);
}
```

- [x] **步骤 3：实现 `compileAndCheck` orchestration**

在 `plugins/unity-agent-kit/src/workflows/compile.ts` 的 `waitForCompileIdle` 后追加：

```ts
const compileAndCheckDefaultTimeoutMs = 120_000;

export async function compileAndCheck(
  workflow: CompileWorkflowOptions,
  options: CompileAndCheckOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-and-check-${Date.now()}`;
  const timeoutValidation = validateCompileAndCheckTimeout(requestId, options.timeoutMs, options.allowLongWait === true);
  if (timeoutValidation.status === "rejected") {
    return timeoutValidation;
  }

  const timeoutMs = timeoutValidation.timeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();
  let currentCycleHost: { hostId?: string; hostEpoch?: number } | undefined;
  const initialStateResult = await getCompileState(workflow, { requestId: `${requestId}-state-1` });
  if (initialStateResult.status !== "succeeded") {
    return remapCompileAction(initialStateResult, "compile_and_check");
  }

  const initialState = parseCompileStateData(initialStateResult.data);
  if (initialState === null) {
    return remapCompileAction(initialStateResult, "compile_and_check");
  }

  if (isCompileIdle(initialState) && initialState.hasRecentCompileReport) {
    const recentResult = await readReportAndJudge(workflow, requestId, `${requestId}-report`, initialState, true, undefined, undefined);
    if (recentResult.status !== "uncertain" || recentResult.code !== "compile.report_missing") {
      return recentResult;
    }
  }

  currentCycleHost = { hostId: initialStateResult.hostId, hostEpoch: initialStateResult.hostEpoch };
  const requestResult = await requestCompile(workflow, { requestId: `${requestId}-request`, reason: "compile_and_check" });
  if (requestResult.status !== "succeeded") {
    return remapCompileAction(requestResult, "compile_and_check");
  }
  if (!sameWorkflowHost(currentCycleHost, requestResult)) {
    return hostContinuityLostResult(requestId, currentCycleHost, requestResult);
  }

  const requestSnapshot = parseCompileRequestData(requestResult.data);
  const remainingAfterRequest = remainingTimeoutMs(startedAt, timeoutMs, now);
  if (remainingAfterRequest <= 0) {
    return compileAndCheckTimeoutResult(requestId, true);
  }

  const idleResult = await waitForCompileIdle(workflow, {
    requestId: `${requestId}-idle`,
    timeoutMs: remainingAfterRequest,
    pollIntervalMs,
    sleep,
    now,
  });
  if (idleResult.status !== "succeeded") {
    return idleResult.status === "timeout"
      ? compileAndCheckTimeoutResult(requestId, true)
      : remapCompileAction(idleResult, "compile_and_check");
  }
  if (!sameWorkflowHost(currentCycleHost, idleResult)) {
    return hostContinuityLostResult(requestId, currentCycleHost, idleResult);
  }

  const settledState = parseCompileStateData(idleResult.data);
  if (settledState === null) {
    return remapCompileAction(idleResult, "compile_and_check");
  }

  return readReportAndJudge(
    workflow,
    requestId,
    `${requestId}-report`,
    settledState,
    false,
    requestSnapshot?.requested === true ? requestSnapshot.invalidationTokenAfterRequest : undefined,
    currentCycleHost,
  );
}

function validateCompileAndCheckTimeout(
  requestId: string,
  timeoutMs: number | undefined,
  allowLongWait: boolean,
): (UnityAgentKitPublicResult & { status: "rejected" }) | { status: "accepted"; timeoutMs: number } {
  const resolvedTimeoutMs = timeoutMs ?? compileAndCheckDefaultTimeoutMs;
  if (resolvedTimeoutMs > compileAndCheckDefaultTimeoutMs && !allowLongWait) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_compile",
      action: "compile_and_check",
      requestId,
      summary: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
      code: "compile.long_wait_requires_intent",
      message: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
      diagnostics: [
        {
          source: "workflow",
          severity: "error",
          code: "compile.long_wait_requires_intent",
          message: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
          details: { timeoutMs: resolvedTimeoutMs, maxDefaultTimeoutMs: compileAndCheckDefaultTimeoutMs },
          attribution: { operation: "compile_and_check", requestId },
        },
      ],
      nextStep: { kind: "rerun_with_confirmation", reason: "Rerun with allowLongWait: true if the user explicitly wants to wait beyond 120s." },
    }) as UnityAgentKitPublicResult & { status: "rejected" };
  }

  return { status: "accepted", timeoutMs: resolvedTimeoutMs };
}

async function readReportAndJudge(
  workflow: CompileWorkflowOptions,
  baseRequestId: string,
  reportRequestId: string,
  state: CompileStateSnapshot,
  usedRecentCompileReport: boolean,
  requestedInvalidationToken: number | undefined,
  currentCycleHost: { hostId?: string; hostEpoch?: number } | undefined,
): Promise<UnityAgentKitPublicResult> {
  const reportResult = await getCompileReport(workflow, {
    requestId: reportRequestId,
    ...(state.recentCompileReportId === undefined ? {} : { reportId: state.recentCompileReportId }),
  });

  if (reportResult.status !== "succeeded") {
    return definePublicResult({
      ...reportResult,
      tool: "unity_compile",
      action: "compile_and_check",
      summary: reportResult.summary || "Compile report proof is missing.",
      evidence: { completion: "compile_proof_incomplete", verifiedCompileSuccess: false },
    });
  }
  if (currentCycleHost !== undefined && !sameWorkflowHost(currentCycleHost, reportResult)) {
    return hostContinuityLostResult(baseRequestId, currentCycleHost, reportResult);
  }

  const report = parseCompileReportData(reportResult.data) as CompileReportSnapshot;
  return judgeCompileReport({
    report,
    state,
    hostId: reportResult.hostId ?? "",
    hostEpoch: typeof reportResult.hostEpoch === "number" ? reportResult.hostEpoch : 0,
    requestId: baseRequestId,
    usedRecentCompileReport,
    requestedInvalidationToken,
  });
}

function sameWorkflowHost(
  expected: { hostId?: string; hostEpoch?: number } | undefined,
  result: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">,
): boolean {
  if (expected === undefined) {
    return true;
  }

  return expected.hostId === result.hostId && expected.hostEpoch === result.hostEpoch;
}

function hostContinuityLostResult(
  requestId: string,
  expected: { hostId?: string; hostEpoch?: number } | undefined,
  actual: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: "unity_compile",
    action: "compile_and_check",
    requestId,
    summary: "Host continuity changed during current-cycle compile_and_check proof.",
    code: "host.continuity_lost",
    message: "Host continuity changed during current-cycle compile_and_check proof.",
    diagnostics: [
      {
        source: "host",
        severity: "error",
        code: "host.continuity_lost",
        message: "Host continuity changed during current-cycle compile_and_check proof.",
        details: { expected, actual },
        attribution: { operation: "compile_and_check", requestId },
      },
    ],
    evidence: { completion: "compile_proof_incomplete", verifiedCompileSuccess: false },
    nextStep: { kind: "inspect_diagnostics", reason: "Current-cycle compile proof cannot cross host continuity changes." },
  });
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, now: () => number): number {
  return Math.max(0, startedAt + timeoutMs - now());
}

function compileAndCheckTimeoutResult(requestId: string, requestMayHaveOccurred: boolean): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_compile",
    action: "compile_and_check",
    requestId,
    summary: "Timed out waiting for Unity compile_and_check proof.",
    mayStillBeRunning: true,
    safeToRetry: !requestMayHaveOccurred,
    nextStep: {
      kind: "read_state",
      tool: "unity_compile",
      action: "get_state",
      reason: "Read compile state and report diagnostics before retrying compile_and_check.",
    },
  });
}
```

Update `remapCompileAction` action union so it accepts only approved `unity_compile` workflow actions from this plan:

```ts
function remapCompileAction(
  result: UnityAgentKitPublicResult,
  action: "get_state" | "request" | "wait_for_idle" | "compile_and_check",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_compile",
    action,
    summary: result.summary || "Compile workflow could not establish trusted evidence.",
  });
}
```

Do not add `read_compile_report` or `get_report` to this union; report reads stay internal-only through `getCompileReport` and are consumed by `compileAndCheck`.

- [x] **步骤 4：运行 TS compile workflow tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/compile-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 TS 能解析 Unity compile report、只从 current-cycle 或 valid recent complete report 产生 compile success、在 token/host/lifecycle proof 缺失时返回 `uncertain`，保持 `compile.report.get` internal-only，确保 lightweight recent-report path 不进入 long wait，并强制 `compile_and_check` 超过 `120s` 需要 explicit long-wait intent。

- [x] **步骤 5：运行 existing TS regression tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-03 没有破坏 5C-01 editor workflows、5C-02 compile primitives、Phase 5A host runtime 或 Phase 5B artifact/resource/timeout/completion contracts。

- [x] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/compile.ts plugins/unity-agent-kit/src/workflows/compile.ts plugins/unity-agent-kit/tests/compile-workflows.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5c compile report workflows

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Unity compile collector and report contract tests

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs:87-286`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs:93-129`
- 修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs:1-107`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs:11-12,79-89`

- [x] **步骤 1：编写失败的 Unity compile report tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` 的 `CompileRequestIdleRefreshesAssetsRequestsCompilationAndIncrementsToken` 测试后追加：

```csharp
        [Test]
        public void CompileReportResultRoundTripsCompilerMessagesAndCompleteness()
        {
            var report = new UnityAgentKitCompileReportResult
            {
                reportId = "compile-report-1",
                compileCycleId = "compile-cycle-1",
                hostId = "host-editor-tests",
                hostEpoch = 7,
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                completedAt = "2026-05-25T10:00:00.0000000Z",
                invalidationTokenAtCompletion = 5,
                compilerErrorCount = 1,
                compilerWarningCount = 1,
                compilerMessagesSummary = "1 error, 1 warning",
                compilerMessages = new[]
                {
                    new UnityAgentKitCompilerMessageRecord
                    {
                        assemblyPath = "Library/ScriptAssemblies/Assembly-CSharp.dll",
                        file = "Assets/Broken.cs",
                        line = 12,
                        column = 7,
                        type = "error",
                        message = "CS1002: ; expected"
                    },
                    new UnityAgentKitCompilerMessageRecord
                    {
                        assemblyPath = "Library/ScriptAssemblies/Assembly-CSharp.dll",
                        file = "Assets/Warning.cs",
                        line = 3,
                        column = 1,
                        type = "warning",
                        message = "CS0168: variable is declared but never used"
                    }
                },
                assemblyCompilationFinishedSeen = true,
                compilationFinishedSeen = true,
                editorIdleAfterCompilation = true
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitCompileReportResult>(JsonUtility.ToJson(report));

            Assert.AreEqual("compile-report-1", roundTrip.reportId);
            Assert.AreEqual("compile-cycle-1", roundTrip.compileCycleId);
            Assert.AreEqual("host-editor-tests", roundTrip.hostId);
            Assert.AreEqual(7, roundTrip.hostEpoch);
            Assert.AreEqual(5, roundTrip.invalidationTokenAtCompletion);
            Assert.AreEqual(1, roundTrip.compilerErrorCount);
            Assert.AreEqual(1, roundTrip.compilerWarningCount);
            Assert.AreEqual(2, roundTrip.compilerMessages.Length);
            Assert.IsTrue(roundTrip.assemblyCompilationFinishedSeen);
            Assert.IsTrue(roundTrip.compilationFinishedSeen);
            Assert.IsTrue(roundTrip.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileReportOperationRequiresMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" compile.report.get "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void CompileCollectorRecordsCompletedReportWithCompilerMessages()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var messages = new[]
            {
                UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                    "Assets/Broken.cs",
                    12,
                    7,
                    UnityEditor.Compilation.CompilerMessageType.Error,
                    "CS1002: ; expected"),
                UnityAgentKitCompileDiagnostics.CreateCompilerMessageForTests(
                    "Assets/Warning.cs",
                    3,
                    1,
                    UnityEditor.Compilation.CompilerMessageType.Warning,
                    "CS0168: variable is declared but never used")
            };

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", messages);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out var report, out var code, out var message));
            Assert.AreEqual(string.Empty, code);
            Assert.AreEqual(string.Empty, message);
            Assert.AreEqual(record.hostId, report.hostId);
            Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            Assert.AreEqual(5, report.invalidationTokenAtCompletion);
            Assert.AreEqual(1, report.compilerErrorCount);
            Assert.AreEqual(1, report.compilerWarningCount);
            Assert.AreEqual("1 error, 1 warning", report.compilerMessagesSummary);
            Assert.AreEqual(2, report.compilerMessages.Length);
            Assert.IsTrue(report.assemblyCompilationFinishedSeen);
            Assert.IsTrue(report.compilationFinishedSeen);
            Assert.IsTrue(report.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileCollectorDoesNotCompleteReportBeforeEditorIdle()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();

            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: true, isUpdating: false);

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void CompileReportOperationReturnsUncertainWhenReportMissing()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-missing"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("uncertain", response.status);
            Assert.AreEqual("compile.report.get", response.operation);
            Assert.AreEqual("compile.report_missing", response.code);
            Assert.AreEqual(1, response.diagnostics.Length);
            Assert.AreEqual("compile.report_missing", response.diagnostics[0].code);
        }

        [Test]
        public void CompileReportOperationReturnsRecentCompletedReport()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "compile.report.get",
                requestId = "req-report-read"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "compile.report.get", "req-report-read", record);
            var report = JsonUtility.FromJson<UnityAgentKitCompileReportResult>(response.data);
            Assert.AreEqual(record.hostId, report.hostId);
            Assert.AreEqual(record.hostEpoch, report.hostEpoch);
            Assert.AreEqual(5, report.invalidationTokenAtCompletion);
            Assert.AreEqual(0, report.compilerErrorCount);
            Assert.AreEqual(0, report.compilerWarningCount);
            Assert.IsTrue(report.assemblyCompilationFinishedSeen);
            Assert.IsTrue(report.compilationFinishedSeen);
            Assert.IsTrue(report.editorIdleAfterCompilation);
        }

        [Test]
        public void CompileCallbackSubscriptionSmokeCanAttachAndDetach()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();

            UnityAgentKitCompileDiagnostics.EnsureCompilerCallbacksSubscribedForTests();
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());

            UnityAgentKitCompileDiagnostics.DetachCompilerCallbacksForTests();
            Assert.IsFalse(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());

            UnityAgentKitCompileDiagnostics.EnsureCompilerCallbacksSubscribedForTests();
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.HasCompilerCallbackSubscriptionsForTests());
        }

        [Test]
        public void CompileCollectorResetClearsRecentReportProof()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out _, out _));

            UnityAgentKitCompileDiagnostics.ResetForTests();

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }

        [Test]
        public void CompileCollectorSubscriptionLossClearsRecentReportProof()
        {
            UnityAgentKitCompileDiagnostics.ResetForTests();
            var record = TestHostRecord();
            UnityAgentKitCompileDiagnostics.StartCompileCycleForTests(record, invalidationTokenAtStart: 5);
            UnityAgentKitCompileDiagnostics.RecordAssemblyCompilationFinishedForTests("Library/ScriptAssemblies/Assembly-CSharp.dll", new UnityEditor.Compilation.CompilerMessage[0]);
            UnityAgentKitCompileDiagnostics.RecordCompilationFinishedForTests();
            UnityAgentKitCompileDiagnostics.CompleteActiveCycleIfIdleForTests(isCompiling: false, isUpdating: false);
            Assert.IsTrue(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out _, out _));

            UnityAgentKitCompileDiagnostics.DetachCompilerCallbacksForTests();

            Assert.IsFalse(UnityAgentKitCompileDiagnostics.TryReadRecentReportForTests(record, out _, out var code, out var message));
            Assert.AreEqual("compile.report_missing", code);
            Assert.AreEqual("No complete compile report is available.", message);
        }
```

- [ ] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report-red.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：FAIL，Unity compile error 包含 `UnityAgentKitCompileReportResult`、`UnityAgentKitCompilerMessageRecord`、`compile.report.get` 或 `EnsureCompilerCallbacksSubscribedForTests` 相关 symbol 不存在。

证明：该 red 证明 Unity C# 侧尚未实现 5C-03 compile collector/report operation。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5c compile report diagnostics tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Unity compile collector and report operation

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`

- [x] **步骤 1：添加 Unity compile report DTOs**

在 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` 的 `UnityAgentKitCompileRequestResult` 后追加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitCompileReportRequestInput
    {
        public string reportId = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompilerMessageRecord
    {
        public string assemblyPath = string.Empty;
        public string file = string.Empty;
        public int line;
        public int column;
        public string type = string.Empty;
        public string message = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitCompileReportResult
    {
        public string reportId = string.Empty;
        public string compileCycleId = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string completedAt = string.Empty;
        public int invalidationTokenAtCompletion;
        public int compilerErrorCount;
        public int compilerWarningCount;
        public string compilerMessagesSummary = string.Empty;
        public UnityAgentKitCompilerMessageRecord[] compilerMessages = Array.Empty<UnityAgentKitCompilerMessageRecord>();
        public bool assemblyCompilationFinishedSeen;
        public bool compilationFinishedSeen;
        public bool editorIdleAfterCompilation;
    }
```

保留文件顶部已有 `using System;`，不要新增 public MCP schema 类型。

- [x] **步骤 2：扩展 Unity compile diagnostics collector**

替换 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs` 为包含 5C-02 primitives 和 5C-03 collector 的实现。关键约束：Unity C# 不等待编译完成；callback 只记录 lifecycle 和 messages；TS 仍负责 polling 和 final judgment。

```csharp
using System;
using System.Collections.Generic;
using System.Threading;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitCompileDiagnostics
    {
        private static int compileInvalidationToken;
        private static CompileCycleRecord activeCycle;
        private static UnityAgentKitCompileReportResult recentCompleteReport;
        private static bool callbacksSubscribed;

        static UnityAgentKitCompileDiagnostics()
        {
            EnsureCompilerCallbacksSubscribed();
        }

        internal static UnityAgentKitCompileStateResult ReadState(int capturedMainThreadId)
        {
            CompleteActiveCycleIfIdle(EditorApplication.isCompiling, EditorApplication.isUpdating);
            return CreateState(capturedMainThreadId, EditorApplication.isCompiling, EditorApplication.isUpdating);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompile(string inputJson, int capturedMainThreadId, UnityAgentKitHostRecord record)
        {
            return RequestCompile(
                inputJson,
                capturedMainThreadId,
                record,
                EditorApplication.isCompiling,
                EditorApplication.isUpdating,
                AssetDatabase.Refresh,
                CompilationPipeline.RequestScriptCompilation);
        }

        internal static bool TryReadRecentReport(UnityAgentKitHostRecord record, string inputJson, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            CompleteActiveCycleIfIdle(EditorApplication.isCompiling, EditorApplication.isUpdating);
            return TrySelectRecentReport(record, inputJson, out report, out code, out message);
        }

        internal static UnityAgentKitCompileRequestResult RequestCompileForTests(
            string inputJson,
            int capturedMainThreadId,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            return RequestCompile(inputJson, capturedMainThreadId, TestHostRecord(), isCompiling, isUpdating, refreshAssetDatabase, requestScriptCompilation);
        }

        internal static void ResetForTests()
        {
            compileInvalidationToken += 1;
            activeCycle = null;
            recentCompleteReport = null;
            EnsureCompilerCallbacksSubscribed();
        }

        internal static CompilerMessage CreateCompilerMessageForTests(string file, int line, int column, CompilerMessageType type, string message)
        {
            return new CompilerMessage
            {
                file = file,
                line = line,
                column = column,
                type = type,
                message = message
            };
        }

        internal static void StartCompileCycleForTests(UnityAgentKitHostRecord record, int invalidationTokenAtStart)
        {
            compileInvalidationToken = invalidationTokenAtStart;
            activeCycle = new CompileCycleRecord(record, invalidationTokenAtStart);
        }

        internal static void RecordAssemblyCompilationFinishedForTests(string assemblyPath, CompilerMessage[] messages)
        {
            RecordAssemblyCompilationFinished(assemblyPath, messages);
        }

        internal static void RecordCompilationFinishedForTests()
        {
            RecordCompilationFinished(null);
        }

        internal static void CompleteActiveCycleIfIdleForTests(bool isCompiling, bool isUpdating)
        {
            CompleteActiveCycleIfIdle(isCompiling, isUpdating);
        }

        internal static bool TryReadRecentReportForTests(UnityAgentKitHostRecord record, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            return TrySelectRecentReport(record, string.Empty, out report, out code, out message);
        }

        internal static void EnsureCompilerCallbacksSubscribedForTests()
        {
            EnsureCompilerCallbacksSubscribed();
        }

        internal static void DetachCompilerCallbacksForTests()
        {
            if (!callbacksSubscribed)
            {
                return;
            }

            CompilationPipeline.assemblyCompilationFinished -= RecordAssemblyCompilationFinished;
            CompilationPipeline.compilationFinished -= RecordCompilationFinished;
            callbacksSubscribed = false;
            compileInvalidationToken += 1;
            activeCycle = null;
            recentCompleteReport = null;
        }

        internal static bool HasCompilerCallbackSubscriptionsForTests()
        {
            return callbacksSubscribed;
        }

        private static UnityAgentKitCompileRequestResult RequestCompile(
            string inputJson,
            int capturedMainThreadId,
            UnityAgentKitHostRecord record,
            bool isCompiling,
            bool isUpdating,
            Action refreshAssetDatabase,
            Action requestScriptCompilation)
        {
            EnsureCompilerCallbacksSubscribed();
            CompleteActiveCycleIfIdle(isCompiling, isUpdating);
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
                compileInvalidationToken += 1;
                StartCompileCycle(record, compileInvalidationToken);
                requestScriptCompilation();
                usedCompilationPipeline = true;
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

        private static void EnsureCompilerCallbacksSubscribed()
        {
            if (callbacksSubscribed)
            {
                return;
            }

            CompilationPipeline.assemblyCompilationFinished += RecordAssemblyCompilationFinished;
            CompilationPipeline.compilationFinished += RecordCompilationFinished;
            callbacksSubscribed = true;
        }

        private static void RecordAssemblyCompilationFinished(string assemblyPath, CompilerMessage[] messages)
        {
            EnsureActiveCycleForExternalCallback();
            activeCycle.assemblyCompilationFinishedSeen = true;
            activeCycle.AddMessages(assemblyPath, messages ?? Array.Empty<CompilerMessage>());
        }

        private static void RecordCompilationFinished(object context)
        {
            EnsureActiveCycleForExternalCallback();
            activeCycle.compilationFinishedSeen = true;
            activeCycle.completedAt = Now();
        }

        private static void EnsureActiveCycleForExternalCallback()
        {
            if (activeCycle != null)
            {
                return;
            }

            compileInvalidationToken += 1;
            activeCycle = new CompileCycleRecord(TestHostRecord(), compileInvalidationToken);
        }

        private static void StartCompileCycle(UnityAgentKitHostRecord record, int invalidationTokenAtStart)
        {
            activeCycle = new CompileCycleRecord(record ?? TestHostRecord(), invalidationTokenAtStart);
        }

        private static void CompleteActiveCycleIfIdle(bool isCompiling, bool isUpdating)
        {
            if (activeCycle == null || isCompiling || isUpdating || !activeCycle.compilationFinishedSeen)
            {
                return;
            }

            recentCompleteReport = activeCycle.ToReport(compileInvalidationToken, editorIdleAfterCompilation: true);
            activeCycle = null;
        }

        private static bool TrySelectRecentReport(UnityAgentKitHostRecord record, string inputJson, out UnityAgentKitCompileReportResult report, out string code, out string message)
        {
            report = null;
            code = string.Empty;
            message = string.Empty;

            if (recentCompleteReport == null)
            {
                code = "compile.report_missing";
                message = "No complete compile report is available.";
                return false;
            }

            var requestedReportId = ReadRequestedReportId(inputJson);
            if (!string.IsNullOrEmpty(requestedReportId) && requestedReportId != recentCompleteReport.reportId)
            {
                code = "compile.report_missing";
                message = "Requested compile report is not available in this host session.";
                return false;
            }

            if (record != null && (recentCompleteReport.hostId != record.hostId || recentCompleteReport.hostEpoch != record.hostEpoch))
            {
                code = "host.continuity_lost";
                message = "Recent compile report belongs to a different host identity.";
                return false;
            }

            report = recentCompleteReport;
            return true;
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
                hasRecentCompileReport = recentCompleteReport != null,
                recentCompileReportId = recentCompleteReport != null ? recentCompleteReport.reportId : string.Empty,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }

        private static string ReadRequestedReportId(string inputJson)
        {
            if (string.IsNullOrEmpty(inputJson))
            {
                return string.Empty;
            }

            try
            {
                var input = JsonUtility.FromJson<UnityAgentKitCompileReportRequestInput>(inputJson);
                return input != null ? input.reportId ?? string.Empty : string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-editor-tests",
                hostEpoch = 7,
                port = 49220,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = Now(),
                lastProbeAt = Now()
            };
        }

        private static string Now()
        {
            return DateTimeOffset.UtcNow.ToString("O");
        }

        private sealed class CompileCycleRecord
        {
            private readonly UnityAgentKitHostRecord record;
            private readonly List<UnityAgentKitCompilerMessageRecord> compilerMessages = new List<UnityAgentKitCompilerMessageRecord>();
            internal readonly string compileCycleId;
            internal readonly int invalidationTokenAtStart;
            internal bool assemblyCompilationFinishedSeen;
            internal bool compilationFinishedSeen;
            internal string completedAt = string.Empty;

            internal CompileCycleRecord(UnityAgentKitHostRecord record, int invalidationTokenAtStart)
            {
                this.record = record;
                this.invalidationTokenAtStart = invalidationTokenAtStart;
                compileCycleId = "compile-cycle-" + invalidationTokenAtStart;
            }

            internal void AddMessages(string assemblyPath, CompilerMessage[] messages)
            {
                foreach (var message in messages)
                {
                    compilerMessages.Add(new UnityAgentKitCompilerMessageRecord
                    {
                        assemblyPath = assemblyPath ?? string.Empty,
                        file = message.file ?? string.Empty,
                        line = Math.Max(0, message.line),
                        column = Math.Max(0, message.column),
                        type = NormalizeCompilerMessageType(message.type),
                        message = message.message ?? string.Empty
                    });
                }
            }

            internal UnityAgentKitCompileReportResult ToReport(int invalidationTokenAtCompletion, bool editorIdleAfterCompilation)
            {
                var errors = 0;
                var warnings = 0;
                foreach (var message in compilerMessages)
                {
                    if (message.type == "error")
                    {
                        errors += 1;
                    }
                    else if (message.type == "warning")
                    {
                        warnings += 1;
                    }
                }

                return new UnityAgentKitCompileReportResult
                {
                    reportId = "compile-report-" + invalidationTokenAtCompletion,
                    compileCycleId = compileCycleId,
                    hostId = record != null ? record.hostId : string.Empty,
                    hostEpoch = record != null ? record.hostEpoch : 0,
                    projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                    unityVersion = Application.unityVersion,
                    completedAt = string.IsNullOrEmpty(completedAt) ? Now() : completedAt,
                    invalidationTokenAtCompletion = invalidationTokenAtCompletion,
                    compilerErrorCount = errors,
                    compilerWarningCount = warnings,
                    compilerMessagesSummary = errors + " errors, " + warnings + " warnings",
                    compilerMessages = compilerMessages.ToArray(),
                    assemblyCompilationFinishedSeen = assemblyCompilationFinishedSeen,
                    compilationFinishedSeen = compilationFinishedSeen,
                    editorIdleAfterCompilation = editorIdleAfterCompilation
                };
            }

            private static string NormalizeCompilerMessageType(CompilerMessageType type)
            {
                if (type == CompilerMessageType.Error)
                {
                    return "error";
                }

                if (type == CompilerMessageType.Warning)
                {
                    return "warning";
                }

                return "info";
            }
        }
    }
}
```

- [x] **步骤 3：Route `compile.report.get` through main-thread dispatch**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中添加 operation constant：

```csharp
        internal const string CompileReportGetOperation = "compile.report.get";
```

把 `RequiresMainThreadDispatch` return expression 改为包含 report operation：

```csharp
            return normalized == ThreadCheckOperation ||
                normalized == EditorStatusGetOperation ||
                normalized == CompileStateGetOperation ||
                normalized == CompileRequestOperation ||
                normalized == CompileReportGetOperation ||
                normalized == ThrowOperation ||
                normalized == PendingDispatchTimeoutOperation;
```

把 existing `CompileRequestOperation` branch 改为传入 host record：

```csharp
            if (operation == CompileRequestOperation)
            {
                var result = UnityAgentKitCompileDiagnostics.RequestCompile(request != null ? request.inputJson ?? string.Empty : string.Empty, capturedMainThreadId, record);
                return Succeeded(operation, requestId, record, result.requested ? "Compile request accepted." : "Compile request skipped because Unity is already compiling or updating.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }
```

在 `CompileRequestOperation` branch 后添加：

```csharp
            if (operation == CompileReportGetOperation)
            {
                if (UnityAgentKitCompileDiagnostics.TryReadRecentReport(record, request != null ? request.inputJson ?? string.Empty : string.Empty, out var report, out var code, out var message))
                {
                    return Succeeded(operation, requestId, record, "Compile report read.", UnityEngine.JsonUtility.ToJson(report), startedAt);
                }

                return Create("uncertain", operation, requestId, record, message, string.Empty, new[] { Diagnostic("error", code, message, operation, requestId) }, code, message, startedAt);
            }
```

`Create` and `Diagnostic` are already private static methods in the same router class; no public API is added.

- [x] **步骤 4：运行 Unity CoreDiagnostics tests 验证通过**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`，test log 中 `CoreDiagnosticsTests` 全部通过。

证明：该检查证明 Unity C# 能记录 compiler callback lifecycle、compiler messages、recent complete report、report missing uncertain、`compile.report.get` main-thread dispatch 和 callback subscription smoke；Unity C# 没有执行长等待或 workflow polling。

- [x] **步骤 5：运行 HostRuntime dispatch regression tests**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-host-runtime.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 `compile.report.get` 没有破坏 existing `/operations` envelope、main-thread dispatch、host timeout、stop/reload behavior。

- [x] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5c compile report collector

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：5C-03 integrated verification and scope guard

**文件：**
- 检查：`plugins/unity-agent-kit/src/diagnostics/compile.ts`
- 检查：`plugins/unity-agent-kit/src/workflows/compile.ts`
- 检查：`plugins/unity-agent-kit/tests/compile-workflows.test.ts`
- 检查：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs`
- 检查：public MCP tools / registration / action-dispatch forbidden surface
- 检查：MCP Resource handler forbidden surface
- 检查：`/unity` skill forbidden surface
- 检查：5C-04 console workflows forbidden surface
- 检查：Phase 5D test/playmode/screenshot workflows forbidden surface
- 检查：Phase 5E final daily loop E2E forbidden surface

- [x] **步骤 1：运行 TS focused verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-03 TS workflow 与 5C-01、5C-02、Phase 5A、Phase 5B TS contracts 同时成立。

- [x] **步骤 2：运行 Unity focused verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report-compile-and-check.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity compile collector/report operation 在真实 Unity EditMode runner 中执行，并覆盖 deterministic seam + callback subscription smoke。

- [x] **步骤 3：运行 HostRuntime regression verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 compile report operation 没有破坏 host runtime routing、dispatch timeout、operation envelope 或 lifecycle cleanup。

- [x] **步骤 4：运行 scope guard**

运行：

```bash
test ! -e plugins/unity-agent-kit/src/tools && test ! -e plugins/unity-agent-kit/src/mcp && test ! -e plugins/unity-agent-kit/src/server.ts && test ! -e plugins/unity-agent-kit/src/index.ts && test ! -e plugins/unity-agent-kit/src/resources/handlers.ts && test ! -e plugins/unity-agent-kit/src/resources/mcp.ts && test ! -e plugins/unity-agent-kit/skills/unity && test ! -e plugins/unity-agent-kit/skills/unity.md && test ! -e plugins/unity-agent-kit/src/diagnostics/console.ts && test ! -e plugins/unity-agent-kit/src/workflows/console.ts && test ! -e unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs && test ! -e plugins/unity-agent-kit/src/workflows/test.ts && test ! -e plugins/unity-agent-kit/src/workflows/playmode.ts && test ! -e plugins/unity-agent-kit/src/workflows/screenshot.ts && test ! -e plugins/unity-agent-kit/src/workflows/daily-loop.ts
```

预期：PASS，命令无输出且 exit code 为 `0`。

证明：该检查证明 5C-03 没有越界创建 public MCP tools / registration / action-dispatch surface、MCP Resource handlers、`/unity` skill、5C-04 console diagnostics/workflows、Phase 5D workflows 或 Phase 5E final daily loop E2E files。该 scope guard 是边界验证，不是 compile behavior 验收；behavior 验收由 TS/Unity tests 完成。

- [x] **步骤 5：运行 diff formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：该检查证明新增/修改文件没有 trailing whitespace 或 patch formatting 问题。

- [x] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/compile.ts plugins/unity-agent-kit/src/workflows/compile.ts plugins/unity-agent-kit/tests/compile-workflows.test.ts unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: verify phase 5c compile report attribution

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 6：5C-03 documentation evidence sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：更新 5C execution index 的 5C-03 row 和 evidence**

在 `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` 的 Candidate Plan Cards table 中，把 5C-03 row 的 `Expanded Plan` 改为：

```markdown
`docs/superpowers/plans/2026-05-25-unity-agent-kit-phase-5c-03-compile-report-compile-and-check.md`
```

执行完成后把 5C-03 row 的 `Status` 改为 `completed`，并追加：

```markdown
## Phase 5C-03 Completion Evidence

5C-03 Compile report + compile_and_check attribution completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report-compile-and-check.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `failed="0"`.
3. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` passed with `failed="0"`.
4. Scope guard passed: no public MCP tools / registration / action-dispatch surface, MCP Resource handlers, `/unity` skill, console diagnostics/workflows, Phase 5D test/playmode/screenshot workflows, or Phase 5E final daily loop E2E files were created by 5C-03.
5. `git -c core.autocrlf=false diff --check` passed with no output.

5C-03 success evidence proves compile success only from current-cycle compiler report proof or valid recent complete compile report. Compile request accepted, idle settled, Console clean, and internal `compile.report.get` read success are not recorded as compile success proof. `compile.report.get` remains internal-only and is not an approved `unity_compile` public action.

Phase 5C remains incomplete because 5C-04 is not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.
```

Use the actual test counts from command output when filling evidence.

- [x] **步骤 2：同步 parent Phase 5 plan index 的 partial state**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中只更新 Phase 5C row evidence text：

```markdown
5C-01, 5C-02, and 5C-03 completed; 5C-04 not completed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending
```

保持 Phase 5C row `Status` 为 `execution-planned`，`Execution Status` 为 `plan-ready`，不要把 Phase 5C 或 Phase 5 标记为 `completed`。

- [x] **步骤 3：更新 roadmap partial evidence 和 Next Manual Action**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中仅记录 5C-03 partial completion evidence：

```markdown
5C-03 Compile report + compile_and_check attribution completed with evidence; 5C-04 remains incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending.
```

Next Manual Action 改为创建并审查 5C-04 console count/snapshot/clear + cursor/resource expanded execution plan。不要修改 roadmap Goal、Non-goals、Shared Constraints、Phase 5 scope 或 Phase 5 success criteria。

- [x] **步骤 4：运行 docs/state checks**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md && git -c core.autocrlf=false diff --check
```

预期：diff 只包含 5C-03 expanded plan path、5C-03 evidence/status updates、Phase 5C partial state sync、roadmap partial evidence 和 next manual action；diff check 无输出。

证明：该检查证明 documentation state 只记录 5C-03 完成事实，不把 Phase 5C 或 Phase 5 提前标记 completed。

- [x] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record phase 5c compile report evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：5C-03 covers `5C-COMPILE-REPORT-01` compiler collector / report lifecycle / compiler messages / invalidation token、`5C-COMPILE-REPORT-02` valid recent complete report proof and `uncertain` on missing proof、`5C-COMPILE-CHECK-01` current-cycle or valid recent report success only、`5C-TIMEOUT-01` 120s upper default cap plus lightweight recent-report no-long-wait behavior、`5C-HOST-01` current-cycle host continuity loss to `uncertain`。Internal `compile.report.get` is guarded from public action drift. 5C-04 console workflows、Phase 5D workflows、Phase 5E public registration/skill/E2E are explicitly excluded and guarded.
- 占位符扫描：计划包含 concrete file paths、code snippets、commands、expected red/green outputs、proof statements and commit commands；未发现禁止占位语、裸泛化执行语或交叉引用式省略步骤。
- 类型一致性：TS consistently uses `CompileReportSnapshot`、`CompileCompilerMessageSnapshot`、`compileReportGetOperation`、`parseCompileReportData`、`internalCompileReportResultFromHostResult`、`judgeCompileReport`、`getCompileReport`、`compileAndCheck`、`CompileAndCheckOptions`；Unity consistently uses `UnityAgentKitCompileReportRequestInput`、`UnityAgentKitCompilerMessageRecord`、`UnityAgentKitCompileReportResult`、`UnityAgentKitCompileDiagnostics.TryReadRecentReport`、`StartCompileCycleForTests`、`RecordAssemblyCompilationFinishedForTests`、`RecordCompilationFinishedForTests`、`CompleteActiveCycleIfIdleForTests` and `CompileReportGetOperation`.
- 拆分检查：Phase 5C is already split by execution index into 5C-01 through 5C-04. This expanded plan executes only 5C-03 and remains independently testable after 5C-02.
- 上游约束覆盖：Roadmap Shared Constraints、Phase 5C spec、Phase 5C execution index review-carried 120s upper cap / normal-path budget constraint、5C-02 primitive semantics、internal-only report read boundary、host continuity and conservative token proof decisions are mapped to tasks and verification.
- 参考输入映射：All referenced roadmap/spec/index/previous plan/current TS/C# files/v2 reference inputs have adopted and non-adopted decisions mapped to tasks.
- 验证强度：Behavior tasks use TS behavior tests and Unity EditMode tests for current-cycle proof, recent-report proof, internal report read mapping, lightweight timeout budget, host continuity loss, collector reset/subscription-loss proof clearing, and missing proof `uncertain`; scope guard is explicitly boundary verification, not behavior acceptance. Plan requires red tests before implementation, green focused tests after implementation, regression tests, scope guard, docs/state diff check and `git diff --check`.
