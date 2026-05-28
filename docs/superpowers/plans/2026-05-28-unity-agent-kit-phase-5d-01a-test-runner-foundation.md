# Unity Agent Kit Phase 5D-01a Test Runner Foundation 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5D-01a 的 EditMode-only Test selector、真实 TestRunner discovery/start foundation、job/status/result readback，以及 `unity_test.list` / `start` / `get_status` / `get_result` internal workflows。

**架构：** Unity C# 新增 TestRunner 短主线程 operations：`test.list`、`test.start`、`test.status.get`、`test.result.get`；其中 `test.list` 是唯一的 discovery API，production path 必须使用真实 `TestRunnerApi.RetrieveTestList` callback 和 session-local in-memory discovery cache，不新增单独 discovery job/status/result API，并拒绝 `playmode`、`all`、unknown mode 与非空 `selector.assembly`。`test.start` / `test.status.get` / `test.result.get` 继续使用真实 `TestRunnerApi.Execute` callbacks，把 job lifecycle/report summary 写入 session-local store，并通过 Phase 5B artifact writer 写 report metadata/payload。TS 新增 `test` diagnostics/result mapping 与 internal workflows，负责 selector validation、unsupported selector rejection、host continuity classification、`unity://test-reports/{reportId}` Resource readback、payload minimal summary parse/mismatch diagnostics 和 final status judgment；本计划不实现 aggregate `run_and_collect` / `run_and_verify`。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`、`UnityEditor.TestTools.TestRunner.Api.TestRunnerApi`、Phase 5B artifact/resource/readback helpers。
**拆分检查：** 已检查；Phase 5D Test workflow 已拆分，当前计划只覆盖 5D-01a foundation，不覆盖 5D-01b aggregate workflows。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5D subplan / plan card 5D-01a
**Spec:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md`
**Execution Index:** `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
**Depends on:** Phase 5A Host Runtime completed；Phase 5B Artifact / Resource / Timeout / Completion completed；Phase 5C Core Diagnostics completed。

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在任务汇报中列出未提交修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/tests/test-workflows.test.ts` — TS 行为测试，覆盖 selector parsing、`mode: all` rejected、list/start/status/result mapping、job state semantics、test report Resource readback requirement、Resource payload minimal summary parse/mismatch diagnostics、failed report not treated as verified pass、host continuity and scope guard inputs。
- 创建：`plugins/unity-agent-kit/src/diagnostics/test.ts` — 定义 Test selector/job/report data contract、host data parser、payload summary parser、unsupported selector rejection、host-result 到 `unity_test` action result 的 mapping。
- 创建：`plugins/unity-agent-kit/src/workflows/test.ts` — 调用 `executeWithRebindAwareness` 执行 `test.list` / `test.start` / `test.status.get` / `test.result.get`，提供 `listTests`、`startTestRun`、`getTestStatus`、`getTestResult` internal workflows；`getTestResult` 负责 `unity://test-reports/{reportId}` Resource readback、payload minimal summary parse 和 host/resource summary consistency check。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 增加 Test selector、test case、job record、report summary、failure record DTO，使 JSON roundtrip 和 operation tests 有明确字段。
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` — 增加 production `WriteTestReportArtifact` wrapper，复用 Phase 5B `test_report` metadata layout，不创建 MCP Resource handler。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitTestDiagnostics.cs` — Unity C# 短 operation：normalize selector、reject `all` if host receives it、真实 TestRunner discovery、真实 TestRunner Execute callback registration、session-local job/status/report records、terminal report artifact metadata/payload write。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 增加 `test.list`、`test.start`、`test.status.get`、`test.result.get` operation 常量、main-thread dispatch 分类和 `RunOnMainThread` routing。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs` — Unity EditMode tests，覆盖 DTO roundtrip、selector normalization、operation dispatch classification、deterministic adapter seam、real API adapter invocation seam、callback-driven job/report store、report artifact metadata、status/result readback shape。
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` — 5D-01a 完成后记录 status/evidence；不要把 Phase 5D 标记 completed。
- 不修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 的 Phase 5D completed state；5D-01a 不同步 parent completion，parent completion 留给 5D-04。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。
- 不创建：`plugins/unity-agent-kit/src/workflows/playmode.ts`、`plugins/unity-agent-kit/src/workflows/screenshot.ts`、`plugins/unity-agent-kit/src/workflows/daily-loop.ts`。

## 上游约束摘要

- **Roadmap Shared Constraints:** Public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、轮询、timeout、host rebind、diagnostics convergence、Resource URI assembly/readback 和最终 success/failure 判定；Unity C# 负责 Unity API 主线程短动作、状态 snapshot、job/report 基础记录；action completion semantics 以用户期望最终结果为准；artifacts/reports 使用 MCP Resources；Console diagnostic cursor 只作 Test workflow supplemental diagnostics；禁止 Unity host 长时间 `Thread.Sleep`、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程、后台线程直接调用 Unity API、Unity C# host 承担复杂 workflow 编排。
- **Phase Scope:** Phase 5D 覆盖 Test / PlayMode / Screenshot workflows。5D-01a 只交付 Test selector、TestRunner bridge foundation、job/status/result readback，以及 `list` / `start` / `get_status` / `get_result` internal workflows。
- **Phase Out-of-scope:** 5D-01a 不实现 `run_and_collect`、`run_and_verify`、PlayMode workflows、Screenshot workflows、public MCP registration、MCP Resource handlers、actual `/unity` skill、final daily loop E2E、Phase 6/7/8 domain work、`mode: all` aggregation。
- **Success Criteria:** TS `test-workflows.test.ts` passes；existing TS editor/compile/console/host/artifact/timeout tests remain pass；Unity `TestWorkflowTests` passes；Unity `HostRuntimeTests` regression passes；test report Resource readback and payload summary parse evidence passes；scope guard confirms no public MCP/tools/skill/playmode/screenshot/E2E/domain files；`git -c core.autocrlf=false diff --check` passes；Phase 5 remains incomplete because 5D-01b、5D-02、5D-03、5D-04、Phase 5E and final E2E remain incomplete。
- **用户确认事项:** `mode: all` 固定返回 `status: rejected`，unsupported 仅作为 diagnostic code/reason；`unsupported` 不进入 public status enum；`5D-01a` 必须覆盖真实 `RetrieveTestList` + `Execute` callbacks/job lifecycle/report store，但不提前实现 `run_and_collect/run_and_verify`；`get_result` success 必须解析 Resource payload minimal report summary 并校验 `reportId`、URI、counts 与 host summary 一致；`5D-01a` 必须新增专门 TS host continuity tests；Test success/failure 主依据是 Test Runner report，不是 Console-clean；5D internal-first，不创建 public MCP surface。
- **本计划不包含:** 不提前完成 Phase 5D 或 Phase 5；不创建 public MCP tool registration/export/action-dispatch wiring；不创建 MCP Resource handlers；不创建 actual skill；不实现 PlayMode/Screenshot；不实现 aggregate test workflows；不支持 `mode: all` aggregation；不使用 fixed pass report、fake in-memory job as completion evidence、Console-clean proof、weak Resource read 或只检查符号存在作为通过理由。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md` | 5D action semantics、`mode: all` rejected rule、Test report Resource proof、TS/Unity ownership、host continuity rules、5D scope boundary | PlayMode and Screenshot implementation details | 当前计划只执行 5D-01a Test foundation | 任务 1-6 |
| `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` | 5D-01a requirement IDs、depends_on、completion rule、scope boundary | 执行 index 本身 | Index 是覆盖和状态入口，不是 executable plan | 任务 5-6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | Phase 5A/5B/5C completed state、Phase 5 completion rule | 把 Phase 5D 或 Phase 5 标记 completed | 5D-01a 只是第一张 5D card | 任务 6 |
| `plugins/unity-agent-kit/src/resources/readback.ts` | `readUnityResource(projectRoot, uri)` metadata + payload readback success/failure semantics；success returns `contentBytes` for payload parse | 直接读 report payload path without metadata validation | Test report success requires Phase 5B readback proof | 任务 1-2 |
| `plugins/unity-agent-kit/src/artifacts/metadata.ts` / `paths.ts` / `types.ts` | `test_report` metadata validation、safe relative path、`unity://test-reports/{reportId}` identity | Full artifact retention/cleanup | Phase 5B excludes full artifact store | 任务 1-4 |
| `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` | `WriteSyntheticReport` layout and safe artifact path checks | MCP Resource server/handler | Resource handler belongs Phase 5E | 任务 3-4 |
| `plugins/unity-agent-kit/src/workflows/console.ts` | Resource-backed workflow pattern: host metadata first, TS Resource readback before final success | Console cursor behavior as primary Test success | Console diagnostics are supplemental only | 任务 1-2 |
| `plugins/unity-agent-kit/tests/console-workflows.test.ts` | fake registry/transport queue style、Resource fixture helper style、action-specific result assertions | Console-specific parser and clear semantics | Test workflows use job/report semantics | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | operation constants、main-thread dispatch guard、`RunOnMainThread` branch pattern | Direct route TestRunner API calls | Unity API must run on main thread | 任务 3-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/TestService.cs` | `RetrieveTestList` callback pattern、`Execute(new ExecutionSettings(filter))` pattern、`ICallbacks` lifecycle、selector-to-test-name resolution ideas、recursive report count/failure collection | v2 public contract、v2 request files、v2 provider storage、fixed/fake pass report behavior、direct adoption of v2 result schema | Unity Agent Kit uses new schema/resource/result semantics and no fixed pass reports | 任务 3-4 |

## 质量门

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS selector/result mapping | Strict selector parser, `mode: all` rejected before host, action-specific public result mapping | 8 | Remove ambiguous status wording and add rejected diagnostic tests |
| TS report Resource readback | `getTestResult` succeeds only after metadata, non-empty payload, Resource readback, minimal summary parse, and host/resource consistency check | 8 | Report readback or payload mismatch returns failed; no collection success without Resource proof |
| Unity TestRunner bridge | Real TestRunner API discovery/execute adapter plus session-local job/report records and artifact write | 7 | If real TestRunner callback behavior cannot be proven through adapter seam and focused Unity tests, keep 5D-01a incomplete or revise plan before evidence |
| Job continuity | Job-specific calls return lost/failed when host/job/project/resource continuity cannot be proven | 8 | Add status/result host identity tests; no stale job success |
| Scope boundary | No public MCP, no MCP Resource handlers, no `/unity`, no PlayMode/Screenshot/E2E/domain files | 9 | Remove scope leak and rerun scope guard |

低于 7/10 的对象不得进入 5D-01a completion evidence。处理方式只能是修订方案、缩小 5D-01a evidence，或由用户逐条明确接受风险；不得使用 stub、fixed pass report、fake job completion、Console-clean proof、weak Resource read 或只检查符号存在作为通过理由。

---

### 任务 1：TS test workflow contract tests

**文件：**
- 创建：`plugins/unity-agent-kit/tests/test-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/console-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`

**Task 1 reset acceptance contract:**

- 本 reset contract 只约束任务 1；计划顶部“文件结构”描述的是整个 5D-01a plan（含后续任务），不是本次 Task 1 reset 的允许修改范围。
- Task 1 reset 只允许创建/整理 `plugins/unity-agent-kit/tests/test-workflows.test.ts`，以及对本段 reset contract 做必要文字澄清；不允许修改任何 production source。
- red command 仍应失败于缺少 production module（`../src/workflows/test.ts` 或 `../src/diagnostics/test.ts`），而不是 syntax/filter error。
- Parser 接受 `editmode`、`playmode`、reserved `all` selector；拒绝 `mode: "edit"`。
- Parser 还必须拒绝未计划 public contract substitutes：list snapshot 用 `filterMode` 替代 `selector`、job snapshot 用 `requestedMode` 且缺少或提供无效字符串 `reportId`、list test case 用 `assemblyName` 替代必需的 `assembly`。
- `list` / `start` 都必须拒绝 `mode: all`，且不调用 transport probe/invoke。
- `get_status` 不读取 Resource、不声明 artifact completion、不声明 verified pass。
- `get_result` 覆盖 failed report success、passed report success、missing resource、invalid payload、mismatch payload。
- failed report success 与 passed report success 除 evidence 外，都必须直接断言 result data-level final judgment：`verifiedTestPass === false/true`，并保留 `payloadSummary` minimal summary deep equals。
- invalid/mismatch failure 必须有 diagnostics code。
- artifact metadata `sizeBytes` 必须匹配 payload byte length。
- 不改 package scripts、不提交、不写 production code。

- [x] **步骤 1：编写失败的 TS test workflow tests**

创建 `plugins/unity-agent-kit/tests/test-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getTestResult,
  getTestStatus,
  listTests,
  startTestRun,
  type TestWorkflowOptions,
} from "../src/workflows/test.ts";
import {
  parseTestJobData,
  parseTestListData,
  parseTestReportData,
  parseTestReportPayloadData,
  testListOperation,
  testResultOperation,
  testStartOperation,
  testStatusOperation,
  type TestJobSnapshot,
  type TestListSnapshot,
  type TestReportPayloadSummary,
  type TestReportSummary,
  type TestSelector,
} from "../src/diagnostics/test.ts";
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
    hostId: "host-test",
    hostEpoch: 21,
    port: 49500,
    status: "ready",
    startedAt: "2026-05-28T10:00:00.000Z",
    lastProbeAt: "2026-05-28T10:00:01.000Z",
    ...overrides,
  };
}

function selector(overrides: Partial<TestSelector> = {}): TestSelector {
  return { mode: "editmode", assembly: "UnityAgentKit.Editor.Tests", className: "UnityAgentKit.Editor.Tests.TestWorkflowTests", methodName: "SamplePassingTest", ...overrides };
}

function listSnapshot(overrides: Partial<TestListSnapshot> = {}): TestListSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    selector: selector(),
    tests: [{ id: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest", name: "SamplePassingTest", fullName: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest", assembly: "UnityAgentKit.Editor.Tests", className: "UnityAgentKit.Editor.Tests.TestWorkflowTests", mode: "editmode" }],
    total: 1,
    diagnostics: [],
    ...overrides,
  };
}

function jobSnapshot(overrides: Partial<TestJobSnapshot> = {}): TestJobSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    jobId: "test-job-1",
    state: "accepted",
    selector: selector(),
    createdAt: "2026-05-28T10:00:02.000Z",
    updatedAt: "2026-05-28T10:00:02.000Z",
    reportId: "",
    diagnostics: [],
    ...overrides,
  };
}

function reportSummary(overrides: Partial<TestReportSummary> = {}): TestReportSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    jobId: "test-job-1",
    reportId: "test-report-1",
    uri: "unity://test-reports/test-report-1",
    mode: "editmode",
    selector: selector(),
    total: 2,
    passed: 1,
    failed: 1,
    errors: 0,
    skipped: 0,
    inconclusive: 0,
    verifiedTestPass: false,
    terminalState: "failed",
    failures: [{ name: "SampleFailingTest", fullName: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SampleFailingTest", message: "expected failure", stackTrace: "stack" }],
    diagnostics: [],
    ...overrides,
  };
}

function reportPayload(overrides: Partial<TestReportPayloadSummary> = {}): TestReportPayloadSummary {
  return {
    schemaVersion: 1,
    reportId: "test-report-1",
    uri: "unity://test-reports/test-report-1",
    total: 2,
    passed: 1,
    failed: 1,
    errors: 0,
    skipped: 0,
    inconclusive: 0,
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, operation: string, data: unknown, requestId: string): Record<string, unknown> {
  return { status: "succeeded", operation, requestId, hostId: record.hostId, hostEpoch: record.hostEpoch, summary: `${operation} completed.`, data: JSON.stringify(data), diagnostics: [], startedAt: "2026-05-28T10:00:00.000Z", completedAt: "2026-05-28T10:00:00.010Z", durationMs: 10 };
}

function registrySequence(results: HostRegistryReadResult[]): { readRegistry: TestWorkflowOptions["readRegistry"]; assertConsumed(): void } {
  const queue = [...results];
  return {
    readRegistry: async () => {
      const next = queue.shift();
      assert.ok(next, "registry queue exhausted");
      return next;
    },
    assertConsumed() { assert.deepEqual(queue, []); },
  };
}

type ProbeExpectation = { port: number; result: HostTransportResult };
type InvokeExpectation = { port: number; operation: string; requestId: string; inputJson?: string; result: HostTransportResult };

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): { transport: HostTransport; assertConsumed(): void } {
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
        if (next.inputJson !== undefined) assert.equal(request.inputJson, next.inputJson);
        return next.result;
      },
    },
    assertConsumed() { assert.deepEqual(probeQueue, []); assert.deepEqual(invokeQueue, []); },
  };
}

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: TestWorkflowOptions["readRegistry"]): TestWorkflowOptions {
  return { registryPath: "ignored", projectRoot: record.projectRoot, transport, readRegistry: readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry };
}

async function withArtifactProject(testBody: (projectRoot: string, artifactRoot: string) => Promise<void>): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-test-"));
  const artifactRoot = path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
  try { await testBody(projectRoot, artifactRoot); } finally { await rm(projectRoot, { recursive: true, force: true }); }
}

async function writeTestReportResource(artifactRoot: string, reportId: string, payload: string): Promise<void> {
  const payloadRelativePath = `test-reports/${reportId}.json`;
  const metadataRelativePath = `metadata/test-reports/${reportId}.json`;
  await mkdir(path.dirname(path.join(artifactRoot, payloadRelativePath)), { recursive: true });
  await mkdir(path.dirname(path.join(artifactRoot, metadataRelativePath)), { recursive: true });
  await writeFile(path.join(artifactRoot, payloadRelativePath), payload, "utf8");
  await writeFile(path.join(artifactRoot, metadataRelativePath), JSON.stringify({ schemaVersion: 1, id: reportId, type: "test_report", uri: `unity://test-reports/${reportId}`, reportLocator: { kind: "artifact_relative_path", relativePath: payloadRelativePath }, createdAt: "2026-05-28T10:00:00.000Z", validationStatus: "valid", hostId: "host-test", hostEpoch: 21, producerTool: "unity_test", producerAction: "get_result", producerJobId: "test-job-1", sizeBytes: Buffer.byteLength(payload), diagnostics: [] }, null, 2), "utf8");
}

test("parseTestDataAcceptsExpectedShapesAndRejectsInvalidShapes", () => {
  assert.deepEqual(parseTestListData(JSON.stringify(listSnapshot())), listSnapshot());
  assert.deepEqual(parseTestJobData(JSON.stringify(jobSnapshot())), jobSnapshot());
  assert.deepEqual(parseTestReportData(JSON.stringify(reportSummary())), reportSummary());
  assert.deepEqual(parseTestReportPayloadData(JSON.stringify(reportPayload())), reportPayload());
  assert.equal(parseTestListData("not-json"), null);
  assert.equal(parseTestJobData(JSON.stringify({ jobId: "only" })), null);
  assert.equal(parseTestReportData(JSON.stringify({ reportId: "only" })), null);
  assert.equal(parseTestReportPayloadData(JSON.stringify({ reportId: "only" })), null);
});

test("listTestsRejectsModeAllBeforeCallingUnity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);
  const result = await listTests(options(record, transport.transport), { selector: selector({ mode: "all" }), requestId: "req-list-all" });
  assert.equal(result.status, "rejected");
  assert.equal(result.code, "unsupported_selector_mode");
  assert.equal(result.diagnostics[0]?.code, "unsupported_selector_mode");
  transport.assertConsumed();
});

test("listTestsMapsRealDiscoverySnapshotWithoutClaimingPass", async () => {
  const record = sampleHostRecord();
  const snapshot = listSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testListOperation, requestId: "req-list", inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testListOperation, snapshot, "req-list") } }]);
  const result = await listTests(options(record, transport.transport, registry.readRegistry), { selector: selector(), requestId: "req-list" });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "list");
  assert.deepEqual(result.evidence, { completion: "state_snapshot", total: 1, verifiedTestPass: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("startTestRunReturnsAcceptedJobWithoutClaimingCompletionOrPass", async () => {
  const record = sampleHostRecord();
  const job = jobSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testStartOperation, requestId: "req-start", inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, job, "req-start") } }]);
  const result = await startTestRun(options(record, transport.transport, registry.readRegistry), { selector: selector(), requestId: "req-start" });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "start");
  assert.equal(result.job?.jobId, "test-job-1");
  assert.equal(result.job?.state, "accepted");
  assert.deepEqual(result.evidence, { completion: "request_accepted", jobState: "accepted", verifiedTestPass: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getTestStatusReadsJobLifecycleWithoutCollectingReport", async () => {
  const record = sampleHostRecord();
  const job = jobSnapshot({ state: "running", reportId: "" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testStatusOperation, requestId: "req-status", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, job, "req-status") } }]);
  const result = await getTestStatus(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-status" });
  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "get_status");
  assert.equal(result.job?.state, "running");
  assert.equal(result.resource, undefined);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getTestResultRequiresResourcePayloadSummaryBeforeSuccess", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    await writeTestReportResource(artifactRoot, "test-report-1", JSON.stringify(reportPayload()));
    const summary = reportSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testResultOperation, requestId: "req-result", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, summary, "req-result") } }]);
    const result = await getTestResult(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-result" });
    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "get_result");
    assert.equal(result.resource?.uri, "unity://test-reports/test-report-1");
    assert.equal(result.data?.["verifiedTestPass"], false);
    assert.deepEqual(result.evidence, { completion: "artifact_complete", reportId: "test-report-1", verifiedTestPass: false });
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("getTestResultFailsWhenReportResourceReadbackFails", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = reportSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testResultOperation, requestId: "req-result-missing", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, summary, "req-result-missing") } }]);
    const result = await getTestResult(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-result-missing" });
    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_failed");
    assert.equal(result.nextStep?.kind, "get_job_result");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("getTestResultFailsWhenResourcePayloadIsInvalid", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    await writeTestReportResource(artifactRoot, "test-report-1", JSON.stringify({ reportId: "test-report-1" }));
    const summary = reportSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testResultOperation, requestId: "req-result-invalid", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, summary, "req-result-invalid") } }]);
    const result = await getTestResult(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-result-invalid" });
    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_payload_invalid");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("getTestResultFailsWhenResourcePayloadMismatchesHostSummary", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    await writeTestReportResource(artifactRoot, "test-report-1", JSON.stringify(reportPayload({ failed: 0 })));
    const summary = reportSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testResultOperation, requestId: "req-result-mismatch", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, summary, "req-result-mismatch") } }]);
    const result = await getTestResult(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-result-mismatch" });
    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_payload_mismatch");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("testWorkflowMarksHostIdentityMismatchAsLost", async () => {
  const record = sampleHostRecord();
  const snapshot = jobSnapshot({ hostId: "old-host", hostEpoch: 20 });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testStatusOperation, requestId: "req-stale-status", inputJson: JSON.stringify({ jobId: "test-job-1" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, snapshot, "req-stale-status") } }]);
  const result = await getTestStatus(options(record, transport.transport, registry.readRegistry), { jobId: "test-job-1", requestId: "req-stale-status" });
  assert.equal(result.status, "lost");
  assert.equal(result.code, "host.continuity_lost");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("testWorkflowRejectsProjectRootMismatchAsSuccessEvidence", async () => {
  const record = sampleHostRecord();
  const snapshot = listSnapshot({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([{ port: record.port, result: { ok: true, statusCode: 200, body: record } }], [{ port: record.port, operation: testListOperation, requestId: "req-project-mismatch", inputJson: JSON.stringify({ selector: selector() }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testListOperation, snapshot, "req-project-mismatch") } }]);
  const result = await listTests(options(record, transport.transport, registry.readRegistry), { selector: selector(), requestId: "req-project-mismatch" });
  assert.equal(result.status, "failed");
  assert.equal(result.code, "test.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 2：运行 TS test 验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/test-workflows.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/workflows/test.ts'` 或 `Cannot find module '../src/diagnostics/test.ts'`。

证明：该 red 证明 5D-01a Test workflow TS contract 尚未实现。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/tests/test-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: add phase 5d test workflow contracts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：TS test diagnostics and workflows

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/test.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/test.ts`
- 测试：`plugins/unity-agent-kit/tests/test-workflows.test.ts`

- [x] **步骤 1：实现 TS test diagnostics contract**

Parser policy：拒绝 `filterMode`、`requestedMode`、`assemblyName` 等已知 legacy/unplanned substitute fields，避免接受旧/错误 DTO contract；允许未知额外字段以支持 forward-compatible schema evolution，并只 clone 输出计划内字段。

创建 `plugins/unity-agent-kit/src/diagnostics/test.ts`，定义以下 public constants、types 和 functions：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitJobReference, type UnityAgentKitJobState, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const testListOperation = "test.list" as const;
export const testStartOperation = "test.start" as const;
export const testStatusOperation = "test.status.get" as const;
export const testResultOperation = "test.result.get" as const;

export type TestMode = "editmode" | "playmode" | "all";

export interface TestSelector { mode: TestMode; assembly?: string; className?: string; methodName?: string; }
export interface TestCaseRecord { id: string; name: string; fullName: string; assembly: string; className: string; mode: "editmode" | "playmode"; }
export interface TestFailureRecord { name: string; fullName: string; message: string; stackTrace: string; }
export interface TestListSnapshot { projectRoot: string; unityVersion: string; hostId: string; hostEpoch: number; selector: TestSelector; tests: TestCaseRecord[]; total: number; diagnostics: UnityAgentKitDiagnostic[]; }
export interface TestJobSnapshot { projectRoot: string; unityVersion: string; hostId: string; hostEpoch: number; jobId: string; state: UnityAgentKitJobState; selector: TestSelector; createdAt: string; updatedAt: string; reportId: string; diagnostics: UnityAgentKitDiagnostic[]; }
export interface TestReportSummary { projectRoot: string; unityVersion: string; hostId: string; hostEpoch: number; jobId: string; reportId: string; uri: string; mode: "editmode" | "playmode"; selector: TestSelector; total: number; passed: number; failed: number; errors: number; skipped: number; inconclusive: number; verifiedTestPass: boolean; terminalState: UnityAgentKitJobState; failures: TestFailureRecord[]; diagnostics: UnityAgentKitDiagnostic[]; }
export interface TestReportPayloadSummary { schemaVersion: 1; reportId: string; uri: string; total: number; passed: number; failed: number; errors: number; skipped: number; inconclusive: number; }

export function rejectUnsupportedSelectorMode(toolAction: "list" | "start", requestId: string | undefined): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "rejected",
    tool: "unity_test",
    action: toolAction,
    requestId,
    summary: "Test selector mode all is reserved but unsupported in Phase 5D.",
    code: "unsupported_selector_mode",
    message: "Test selector mode all is reserved but unsupported in Phase 5D.",
    diagnostics: [{ source: "validation", severity: "error", code: "unsupported_selector_mode", message: "Use mode editmode or playmode in Phase 5D.", attribution: { action: toolAction, requestId } }],
    nextStep: { kind: "inspect_diagnostics", reason: "Use a single test mode: editmode or playmode." },
  });
}

export function parseTestListData(data: unknown): TestListSnapshot | null { const parsed = parseInput(data); if (!isRecord(parsed)) return null; if (!(isCommonSnapshot(parsed) && isSelector(parsed.selector) && Array.isArray(parsed.tests) && parsed.tests.every(isTestCaseRecord) && isNonNegativeInteger(parsed.total) && isDiagnosticArray(parsed.diagnostics))) return null; return { projectRoot: parsed.projectRoot, unityVersion: parsed.unityVersion, hostId: parsed.hostId, hostEpoch: parsed.hostEpoch, selector: cloneSelector(parsed.selector), tests: parsed.tests.map(cloneTestCase), total: parsed.total, diagnostics: cloneDiagnostics(parsed.diagnostics) }; }
export function parseTestJobData(data: unknown): TestJobSnapshot | null { const parsed = parseInput(data); if (!isRecord(parsed)) return null; if (!(isCommonSnapshot(parsed) && isNonEmptyString(parsed.jobId) && isJobState(parsed.state) && isSelector(parsed.selector) && isNonEmptyString(parsed.createdAt) && isNonEmptyString(parsed.updatedAt) && typeof parsed.reportId === "string" && isDiagnosticArray(parsed.diagnostics))) return null; return { projectRoot: parsed.projectRoot, unityVersion: parsed.unityVersion, hostId: parsed.hostId, hostEpoch: parsed.hostEpoch, jobId: parsed.jobId, state: parsed.state, selector: cloneSelector(parsed.selector), createdAt: parsed.createdAt, updatedAt: parsed.updatedAt, reportId: parsed.reportId, diagnostics: cloneDiagnostics(parsed.diagnostics) }; }
export function parseTestReportData(data: unknown): TestReportSummary | null { const parsed = parseInput(data); if (!isRecord(parsed)) return null; if (!(isCommonSnapshot(parsed) && isNonEmptyString(parsed.jobId) && isNonEmptyString(parsed.reportId) && parsed.uri === `unity://test-reports/${parsed.reportId}` && (parsed.mode === "editmode" || parsed.mode === "playmode") && isSelector(parsed.selector) && hasCounts(parsed) && typeof parsed.verifiedTestPass === "boolean" && isJobState(parsed.terminalState) && Array.isArray(parsed.failures) && parsed.failures.every(isFailureRecord) && isDiagnosticArray(parsed.diagnostics))) return null; return { projectRoot: parsed.projectRoot, unityVersion: parsed.unityVersion, hostId: parsed.hostId, hostEpoch: parsed.hostEpoch, jobId: parsed.jobId, reportId: parsed.reportId, uri: parsed.uri, mode: parsed.mode, selector: cloneSelector(parsed.selector), total: parsed.total, passed: parsed.passed, failed: parsed.failed, errors: parsed.errors, skipped: parsed.skipped, inconclusive: parsed.inconclusive, verifiedTestPass: parsed.verifiedTestPass, terminalState: parsed.terminalState, failures: parsed.failures.map(cloneFailure), diagnostics: cloneDiagnostics(parsed.diagnostics) }; }
export function parseTestReportPayloadData(data: unknown): TestReportPayloadSummary | null { const parsed = parseInput(data); if (!isRecord(parsed)) return null; if (!(parsed.schemaVersion === 1 && isNonEmptyString(parsed.reportId) && parsed.uri === `unity://test-reports/${parsed.reportId}` && hasCounts(parsed))) return null; return { schemaVersion: 1, reportId: parsed.reportId, uri: parsed.uri, total: parsed.total, passed: parsed.passed, failed: parsed.failed, errors: parsed.errors, skipped: parsed.skipped, inconclusive: parsed.inconclusive }; }

export function testListResultFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult { if (hostResult.status !== "succeeded") return remap(hostResult, "list"); const snapshot = parseTestListData(hostResult.data); if (snapshot === null) return failure(hostResult, "list", "test.list_invalid_shape", "Test list operation returned invalid data."); const binding = validateBinding(snapshot, expectedProjectRoot, hostResult); if (binding !== null) return binding("list"); return definePublicResult({ status: "succeeded", tool: "unity_test", action: "list", operation: testListOperation, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: "Test list snapshot read.", data: snapshot, diagnostics: [...hostResult.diagnostics, ...snapshot.diagnostics], evidence: { completion: "state_snapshot", total: snapshot.total, verifiedTestPass: false }, startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs }); }
export function testJobResultFromHostResult(hostResult: UnityAgentKitPublicResult, action: "start" | "get_status", expectedProjectRoot: string): UnityAgentKitPublicResult { if (hostResult.status !== "succeeded") return remap(hostResult, action); const snapshot = parseTestJobData(hostResult.data); if (snapshot === null) return failure(hostResult, action, "test.job_invalid_shape", "Test job operation returned invalid data."); const binding = validateBinding(snapshot, expectedProjectRoot, hostResult); if (binding !== null) return binding(action); return definePublicResult({ status: "succeeded", tool: "unity_test", action, operation: action === "start" ? testStartOperation : testStatusOperation, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: action === "start" ? "Test job accepted." : "Test job status read.", data: snapshot, diagnostics: [...hostResult.diagnostics, ...snapshot.diagnostics], evidence: { completion: action === "start" ? "request_accepted" : "job_status_snapshot", jobState: snapshot.state, verifiedTestPass: false }, job: toJobReference(snapshot, action), startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs }); }
export function testReportSummaryFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult { if (hostResult.status !== "succeeded") return remap(hostResult, "get_result"); const summary = parseTestReportData(hostResult.data); if (summary === null) return failure(hostResult, "get_result", "test.report_invalid_shape", "Test result operation returned invalid data."); const binding = validateBinding(summary, expectedProjectRoot, hostResult); if (binding !== null) return binding("get_result"); return definePublicResult({ status: "succeeded", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: "Test report metadata was read; Resource readback is still required before final result success.", data: summary, diagnostics: [...hostResult.diagnostics, ...summary.diagnostics], evidence: { completion: "artifact_metadata_written", reportId: summary.reportId, verifiedTestPass: summary.verifiedTestPass }, job: toJobReference({ ...summary, state: summary.terminalState, createdAt: "unknown", updatedAt: "unknown", reportId: summary.reportId }, "get_result"), startedAt: hostResult.startedAt, completedAt: hostResult.completedAt, durationMs: hostResult.durationMs }); }
export function reportPayloadMatchesSummary(payload: TestReportPayloadSummary, summary: TestReportSummary): boolean { return payload.reportId === summary.reportId && payload.uri === summary.uri && payload.total === summary.total && payload.passed === summary.passed && payload.failed === summary.failed && payload.errors === summary.errors && payload.skipped === summary.skipped && payload.inconclusive === summary.inconclusive; }

function toJobReference(snapshot: Pick<TestJobSnapshot, "jobId" | "state" | "createdAt" | "updatedAt" | "hostId" | "hostEpoch" | "reportId" | "diagnostics">, action: string): UnityAgentKitJobReference { return { jobId: snapshot.jobId, tool: "unity_test", action, state: snapshot.state, createdAt: snapshot.createdAt || "unknown", updatedAt: snapshot.updatedAt || undefined, hostId: snapshot.hostId, hostEpoch: snapshot.hostEpoch, reportId: snapshot.reportId || undefined, lastKnownContinuity: "current", diagnostics: snapshot.diagnostics }; }
function remap(hostResult: UnityAgentKitPublicResult, action: "list" | "start" | "get_status" | "get_result"): UnityAgentKitPublicResult { return definePublicResult({ ...hostResult, tool: "unity_test", action, summary: hostResult.summary || "Test operation could not be completed." }); }
function failure(hostResult: UnityAgentKitPublicResult, action: "list" | "start" | "get_status" | "get_result", code: string, message: string): UnityAgentKitPublicResult { return definePublicResult({ status: "failed", tool: "unity_test", action, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: message, code, message, diagnostics: [...hostResult.diagnostics, { source: "workflow", severity: "error", code, message, attribution: { operation: "unity_test", requestId: hostResult.requestId } }], nextStep: { kind: "inspect_diagnostics", reason: message } }); }
function validateBinding(snapshot: { projectRoot: string; hostId: string; hostEpoch: number }, expectedProjectRoot: string, hostResult: UnityAgentKitPublicResult): ((action: "list" | "start" | "get_status" | "get_result") => UnityAgentKitPublicResult) | null { if (normalize(snapshot.projectRoot) !== normalize(expectedProjectRoot)) return (action) => failure(hostResult, action, "test.project_root_mismatch", "Test operation projectRoot does not match the expected Unity project root."); if (snapshot.hostId !== hostResult.hostId || snapshot.hostEpoch !== hostResult.hostEpoch) return (action) => definePublicResult({ status: "lost", tool: "unity_test", action, requestId: hostResult.requestId, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch, summary: "Test evidence host identity does not match the active host envelope.", code: "host.continuity_lost", message: "Test evidence host identity does not match the active host envelope.", diagnostics: [{ source: "host", severity: "error", code: "host.continuity_lost", message: "Test evidence host identity does not match the active host envelope." }], nextStep: { kind: "inspect_diagnostics", reason: "Test proof cannot cross host identity changes." } }); return null; }
function parseInput(data: unknown): unknown { if (typeof data !== "string") return data; try { return JSON.parse(data); } catch { return null; } }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isCommonSnapshot(value: Record<string, unknown>): value is Record<string, unknown> & { projectRoot: string; unityVersion: string; hostId: string; hostEpoch: number } { return isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) && isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch); }
function isSelector(value: unknown): value is TestSelector { return isRecord(value) && (value.mode === "editmode" || value.mode === "playmode" || value.mode === "all") && (value.assembly === undefined || typeof value.assembly === "string") && (value.className === undefined || typeof value.className === "string") && (value.methodName === undefined || typeof value.methodName === "string"); }
function isTestCaseRecord(value: unknown): value is TestCaseRecord { return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.name) && isNonEmptyString(value.fullName) && typeof value.assembly === "string" && typeof value.className === "string" && (value.mode === "editmode" || value.mode === "playmode"); }
function isFailureRecord(value: unknown): value is TestFailureRecord { return isRecord(value) && typeof value.name === "string" && typeof value.fullName === "string" && typeof value.message === "string" && typeof value.stackTrace === "string"; }
function isJobState(value: unknown): value is UnityAgentKitJobState { return value === "accepted" || value === "running" || value === "completed" || value === "failed" || value === "cancelled" || value === "timeout" || value === "lost" || value === "unknown"; }
function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] { return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.source === "string" && (item.severity === "info" || item.severity === "warning" || item.severity === "error") && typeof item.message === "string"); }
function hasCounts(value: Record<string, unknown>): value is Record<string, unknown> & { total: number; passed: number; failed: number; errors: number; skipped: number; inconclusive: number } { return isNonNegativeInteger(value.total) && isNonNegativeInteger(value.passed) && isNonNegativeInteger(value.failed) && isNonNegativeInteger(value.errors) && isNonNegativeInteger(value.skipped) && isNonNegativeInteger(value.inconclusive); }
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function isNonNegativeInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0; }
function cloneSelector(value: TestSelector): TestSelector { return { mode: value.mode, ...(value.assembly === undefined ? {} : { assembly: value.assembly }), ...(value.className === undefined ? {} : { className: value.className }), ...(value.methodName === undefined ? {} : { methodName: value.methodName }) }; }
function cloneTestCase(value: TestCaseRecord): TestCaseRecord { return { id: value.id, name: value.name, fullName: value.fullName, assembly: value.assembly, className: value.className, mode: value.mode }; }
function cloneFailure(value: TestFailureRecord): TestFailureRecord { return { name: value.name, fullName: value.fullName, message: value.message, stackTrace: value.stackTrace }; }
function cloneDiagnostics(value: UnityAgentKitDiagnostic[]): UnityAgentKitDiagnostic[] { return value.map((diagnostic) => ({ ...diagnostic })); }
function normalize(projectRoot: string): string { return projectRoot.replace(/\\/g, "/").replace(/\/+$/, ""); }
```

- [x] **步骤 2：实现 TS test workflows**

创建 `plugins/unity-agent-kit/src/workflows/test.ts`：

```ts
import { definePublicResult, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { readUnityResource } from "../resources/readback.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { rejectUnsupportedSelectorMode, reportPayloadMatchesSummary, testJobResultFromHostResult, testListOperation, testListResultFromHostResult, testReportSummaryFromHostResult, testResultOperation, testStartOperation, testStatusOperation, parseTestReportData, parseTestReportPayloadData, type TestSelector } from "../diagnostics/test.ts";

export interface TestWorkflowOptions { registryPath: string; projectRoot: string; transport: HostTransport; readRegistry?: RegistryReader; }
export interface TestSelectorActionOptions { selector: TestSelector; requestId?: string; }
export interface TestJobActionOptions { jobId: string; requestId?: string; }

export async function listTests(workflow: TestWorkflowOptions, options: TestSelectorActionOptions): Promise<UnityAgentKitPublicResult> {
  if (options.selector.mode === "all") return rejectUnsupportedSelectorMode("list", options.requestId);
  const requestId = options.requestId ?? `test-list-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({ registryPath: workflow.registryPath, projectRoot: workflow.projectRoot, readRegistry: workflow.readRegistry, transport: workflow.transport, request: { operation: testListOperation, requestId, inputJson: JSON.stringify({ selector: options.selector }) } });
  return testListResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function startTestRun(workflow: TestWorkflowOptions, options: TestSelectorActionOptions): Promise<UnityAgentKitPublicResult> {
  if (options.selector.mode === "all") return rejectUnsupportedSelectorMode("start", options.requestId);
  const requestId = options.requestId ?? `test-start-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({ registryPath: workflow.registryPath, projectRoot: workflow.projectRoot, readRegistry: workflow.readRegistry, transport: workflow.transport, request: { operation: testStartOperation, requestId, inputJson: JSON.stringify({ selector: options.selector }) } });
  return testJobResultFromHostResult(hostResult.result, "start", workflow.projectRoot);
}

export async function getTestStatus(workflow: TestWorkflowOptions, options: TestJobActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-status-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({ registryPath: workflow.registryPath, projectRoot: workflow.projectRoot, readRegistry: workflow.readRegistry, transport: workflow.transport, request: { operation: testStatusOperation, requestId, inputJson: JSON.stringify({ jobId: options.jobId }) } });
  return testJobResultFromHostResult(hostResult.result, "get_status", workflow.projectRoot);
}

export async function getTestResult(workflow: TestWorkflowOptions, options: TestJobActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-result-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({ registryPath: workflow.registryPath, projectRoot: workflow.projectRoot, readRegistry: workflow.readRegistry, transport: workflow.transport, request: { operation: testResultOperation, requestId, inputJson: JSON.stringify({ jobId: options.jobId }) } });
  const mapped = testReportSummaryFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") return mapped;
  const summary = parseTestReportData(mapped.data);
  if (summary === null) return definePublicResult({ status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch, summary: "Test result summary could not be parsed before Resource readback.", code: "test.report_invalid_shape", message: "Test result summary could not be parsed before Resource readback.", diagnostics: [...mapped.diagnostics, { source: "workflow", severity: "error", code: "test.report_invalid_shape", message: "Test result summary could not be parsed before Resource readback." }], nextStep: { kind: "inspect_diagnostics", reason: "Inspect the host test report summary shape." } });
  const readback = await readUnityResource(workflow.projectRoot, summary.uri);
  if (!readback.ok) return definePublicResult({ status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch, summary: "Test report Resource readback failed.", code: "test.report_resource_failed", message: "Test report Resource readback failed.", data: summary, diagnostics: [...mapped.diagnostics, { ...readback.diagnostic, code: "test.report_resource_failed" }], evidence: { completion: "artifact_readback_failed", reportId: summary.reportId, verifiedTestPass: false, reason: readback.reason }, nextStep: { kind: "get_job_result", tool: "unity_test", action: "get_result", jobId: summary.jobId, reason: "Retry result read only after report Resource evidence is available." } });
  const payload = new TextDecoder().decode(readback.contentBytes);
  const payloadSummary = parseTestReportPayloadData(payload);
  if (payloadSummary === null) return definePublicResult({ status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch, summary: "Test report Resource payload is not a valid minimal report summary.", code: "test.report_payload_invalid", message: "Test report Resource payload is not a valid minimal report summary.", data: summary, resource: readback.resource, diagnostics: [...mapped.diagnostics, { source: "resource-readback", severity: "error", code: "test.report_payload_invalid", message: "Test report Resource payload is not a valid minimal report summary." }], evidence: { completion: "artifact_payload_invalid", reportId: summary.reportId, verifiedTestPass: false }, nextStep: { kind: "get_job_result", tool: "unity_test", action: "get_result", jobId: summary.jobId, reason: "Regenerate the report before trusting test result evidence." } });
  if (!reportPayloadMatchesSummary(payloadSummary, summary)) return definePublicResult({ status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation, requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch, summary: "Test report Resource payload does not match host report summary.", code: "test.report_payload_mismatch", message: "Test report Resource payload does not match host report summary.", data: summary, resource: readback.resource, diagnostics: [...mapped.diagnostics, { source: "resource-readback", severity: "error", code: "test.report_payload_mismatch", message: "Test report Resource payload does not match host report summary." }], evidence: { completion: "artifact_payload_mismatch", reportId: summary.reportId, verifiedTestPass: false }, nextStep: { kind: "get_job_result", tool: "unity_test", action: "get_result", jobId: summary.jobId, reason: "Regenerate the report before trusting test result evidence." } });
  return definePublicResult({ ...mapped, summary: "Test report Resource is readable and matches host summary.", resource: readback.resource, evidence: { completion: "artifact_complete", reportId: summary.reportId, verifiedTestPass: summary.verifiedTestPass }, metadata: { resourceFilePath: readback.filePath, resourceContentBytes: readback.contentBytes.byteLength } });
}
```

- [x] **步骤 3：运行 TS test workflow tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/test-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 TS 能拒绝 `mode: all`、映射 TestRunner list/start/status/result host envelope，`get_result` success 依赖 Phase 5B Resource readback、parseable payload summary、payload/host summary consistency，并且 host identity/projectRoot mismatch 不会成为成功 evidence。

- [x] **步骤 4：运行现有 TS regression tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/test-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5D-01a TS changes 没有破坏 Phase 5A host runtime、Phase 5B artifact/resource/timeout/completion、Phase 5C editor/compile/console workflows。

- [ ] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/test.ts plugins/unity-agent-kit/src/workflows/test.ts plugins/unity-agent-kit/tests/test-workflows.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5d test workflow foundation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Unity test workflow contract tests

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitTestDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [x] **步骤 1：编写失败的 Unity tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs`：

```csharp
using System;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class TestWorkflowTests
    {
        [Test]
        public void TestSelectorRoundTripsEditModeFields()
        {
            var input = new UnityAgentKitTestSelectorInput { mode = "editmode", className = "Class", methodName = "Method" };
            var roundTrip = JsonUtility.FromJson<UnityAgentKitTestSelectorInput>(JsonUtility.ToJson(input));
            Assert.AreEqual("editmode", roundTrip.mode);
            Assert.AreEqual("Class", roundTrip.className);
            Assert.AreEqual("Method", roundTrip.methodName);
            Assert.AreEqual(string.Empty, roundTrip.assembly);
        }

        [Test]
        public void TestReportSummaryRoundTripsCountsFailuresAndResourceUri()
        {
            var summary = new UnityAgentKitTestReportSummary
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-test",
                hostEpoch = 21,
                jobId = "job-1",
                reportId = "report-1",
                uri = "unity://test-reports/report-1",
                mode = "editmode",
                selector = new UnityAgentKitTestSelectorInput { mode = "editmode" },
                total = 2,
                passed = 1,
                failed = 1,
                errors = 0,
                skipped = 0,
                inconclusive = 0,
                verifiedTestPass = false,
                terminalState = "failed",
                failures = new[] { new UnityAgentKitTestFailureRecord { name = "SampleFailingTest", fullName = "UnityAgentKit.Editor.Tests.SampleFailingTest", message = "expected failure", stackTrace = "stack" } },
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
            var roundTrip = JsonUtility.FromJson<UnityAgentKitTestReportSummary>(JsonUtility.ToJson(summary));
            Assert.AreEqual("report-1", roundTrip.reportId);
            Assert.AreEqual("unity://test-reports/report-1", roundTrip.uri);
            Assert.AreEqual(2, roundTrip.total);
            Assert.AreEqual(1, roundTrip.failed);
            Assert.IsFalse(roundTrip.verifiedTestPass);
            Assert.AreEqual("SampleFailingTest", roundTrip.failures[0].name);
        }

        [Test]
        public void TestOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.list "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.start "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.status.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" test.result.get "));
            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "test.list", requestId = "req-test-list-direct" }, TestHostRecord());
            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void TestListForTestsRejectsUnsupportedModesAndAssemblySelectors()
        {
            var playMode = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"playmode\"}}", TestHostRecord(), new RecordingDiscoveryAdapter());
            Assert.AreEqual("rejected", playMode.status);
            Assert.AreEqual("unsupported_selector_mode", playMode.code);

            var allMode = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"all\"}}", TestHostRecord(), new RecordingDiscoveryAdapter());
            Assert.AreEqual("rejected", allMode.status);
            Assert.AreEqual("unsupported_selector_mode", allMode.code);

            var unknownMode = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"unsupported-mode\"}}", TestHostRecord(), new RecordingDiscoveryAdapter());
            Assert.AreEqual("rejected", unknownMode.status);
            Assert.AreEqual("unsupported_selector_mode", unknownMode.code);

            var assemblySelector = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"editmode\",\"assembly\":\"UnityAgentKit.Editor.Tests\"}}", TestHostRecord(), new RecordingDiscoveryAdapter());
            Assert.AreEqual("rejected", assemblySelector.status);
            Assert.AreEqual("unsupported_selector_assembly", assemblySelector.code);
        }

        [Test]
        public void TestListForTestsReturnsDiscoverySnapshotWithoutPassClaim()
        {
            var adapter = new RecordingDiscoveryAdapter();
            adapter.EnqueueCompleted(new UnityAgentKitTestDiscoveryResult
            {
                state = "completed",
                tests = new[] { new UnityAgentKitTestCaseRecord { id = "id", name = "SamplePassingTest", fullName = "UnityAgentKit.Editor.Tests.SamplePassingTest", assembly = "unknown", className = "UnityAgentKit.Editor.Tests.TestWorkflowTests", mode = "editmode" } },
                diagnostics = new[] { new UnityAgentKitDiagnostic { source = "test.discovery", severity = "warning", code = "test.discovery_assembly_unknown", message = "Assembly could not be proven from Unity TestRunner discovery." } }
            });

            var result = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"editmode\"}}", TestHostRecord(), adapter);
            Assert.AreEqual("succeeded", result.status);
            var data = JsonUtility.FromJson<UnityAgentKitTestListResult>(result.data);
            Assert.AreEqual(1, data.total);
            Assert.AreEqual("SamplePassingTest", data.tests[0].name);
            Assert.AreEqual("unknown", data.tests[0].assembly);
            Assert.AreEqual("test.discovery_assembly_unknown", data.diagnostics[0].code);
        }

        [Test]
        public void TestListForTestsReturnsPendingThenCompletedCacheSnapshot()
        {
            var adapter = new RecordingDiscoveryAdapter();
            var first = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"editmode\",\"className\":\"UnityAgentKit.Editor.Tests.TestWorkflowTests\"}}", TestHostRecord(), adapter);
            Assert.AreEqual("uncertain", first.status);
            Assert.AreEqual("test.discovery_pending", first.code);

            adapter.CompletePending(new UnityAgentKitTestDiscoveryResult
            {
                state = "completed",
                tests = new[] { new UnityAgentKitTestCaseRecord { id = "id", name = "SamplePassingTest", fullName = "UnityAgentKit.Editor.Tests.SamplePassingTest", assembly = "unknown", className = "UnityAgentKit.Editor.Tests.TestWorkflowTests", mode = "editmode" } },
                diagnostics = new[] { new UnityAgentKitDiagnostic { source = "test.discovery", severity = "warning", code = "test.discovery_assembly_unknown", message = "Assembly could not be proven from Unity TestRunner discovery." } }
            });

            var second = UnityAgentKitTestDiagnostics.ListForTests("{\"selector\":{\"mode\":\"editmode\",\"className\":\"UnityAgentKit.Editor.Tests.TestWorkflowTests\"}}", TestHostRecord(), adapter);
            Assert.AreEqual("succeeded", second.status);
            var data = JsonUtility.FromJson<UnityAgentKitTestListResult>(second.data);
            Assert.AreEqual(1, data.total);
            Assert.AreEqual("SamplePassingTest", data.tests[0].name);
        }

        [Test]
        public void TestStartForTestsInvokesRunnerAdapterAndStoresAcceptedJob()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var adapter = new RecordingRunnerAdapter(record, store);
            var start = UnityAgentKitTestDiagnostics.StartForTests("{\"selector\":{\"mode\":\"editmode\"}}", record, store, adapter);
            Assert.AreEqual("succeeded", start.status);
            Assert.IsTrue(adapter.ExecuteCalled);
            var job = JsonUtility.FromJson<UnityAgentKitTestJobResult>(start.data);
            Assert.AreEqual("accepted", job.state);
            Assert.IsTrue(store.TryGetJob(job.jobId, out var stored));
            Assert.AreEqual(job.jobId, stored.jobId);
        }

        [Test]
        public void TestCallbacksUpdateJobStoreAndResultWritesReportArtifact()
        {
            var record = TestHostRecord();
            var store = new UnityAgentKitTestDiagnostics.TestJobStore();
            var job = UnityAgentKitTestDiagnostics.CreateAcceptedJobForTests(record, new UnityAgentKitTestSelectorInput { mode = "editmode" }, "job-1");
            store.WriteJob(job);
            UnityAgentKitTestDiagnostics.MarkJobRunningForTests(record, store, "job-1");
            Assert.IsTrue(store.TryGetJob("job-1", out var running));
            Assert.AreEqual("running", running.state);
            var report = UnityAgentKitTestDiagnostics.CompleteJobForTests(record, store, "job-1", failed: 1);
            Assert.AreEqual("failed", report.terminalState);
            var status = UnityAgentKitTestDiagnostics.GetStatusForTests("{\"jobId\":\"job-1\"}", record, store);
            Assert.AreEqual("succeeded", status.status);
            var result = UnityAgentKitTestDiagnostics.GetResultForTests("{\"jobId\":\"job-1\"}", record, store, UnityAgentKitArtifactContracts.GetArtifactRoot());
            Assert.AreEqual("succeeded", result.status);
            var summary = JsonUtility.FromJson<UnityAgentKitTestReportSummary>(result.data);
            Assert.AreEqual("job-1", summary.jobId);
            Assert.AreEqual(1, summary.failed);
            Assert.IsFalse(summary.verifiedTestPass);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord { hostName = "unity-agent-kit", protocolVersion = "1", projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(), hostId = "host-test", hostEpoch = 21, port = 49500, status = "ready", startedAt = DateTimeOffset.UtcNow.ToString("O") };
        }

        private sealed class RecordingDiscoveryAdapter : UnityAgentKitTestDiagnostics.ITestDiscoveryAdapter
        {
            private readonly Queue<UnityAgentKitTestDiscoveryResult> completed = new Queue<UnityAgentKitTestDiscoveryResult>();
            private Action<UnityAgentKitTestDiscoveryResult> pendingCallback;

            internal void EnqueueCompleted(UnityAgentKitTestDiscoveryResult result)
            {
                completed.Enqueue(result);
            }

            internal void CompletePending(UnityAgentKitTestDiscoveryResult result)
            {
                var callback = pendingCallback;
                pendingCallback = null;
                callback?.Invoke(result);
            }

            public void Retrieve(UnityAgentKitTestSelectorInput selector, Action<UnityAgentKitTestDiscoveryResult> onCompleted)
            {
                if (completed.Count > 0)
                {
                    onCompleted(completed.Dequeue());
                    return;
                }

                pendingCallback = onCompleted;
            }
        }

        private sealed class RecordingRunnerAdapter : UnityAgentKitTestDiagnostics.ITestRunnerAdapter
        {
            private readonly UnityAgentKitHostRecord record;
            private readonly UnityAgentKitTestDiagnostics.TestJobStore store;
            internal bool ExecuteCalled;

            internal RecordingRunnerAdapter(UnityAgentKitHostRecord record, UnityAgentKitTestDiagnostics.TestJobStore store)
            {
                this.record = record;
                this.store = store;
            }

            public UnityAgentKitTestJobResult Start(UnityAgentKitTestSelectorInput selector, string jobId)
            {
                ExecuteCalled = true;
                return UnityAgentKitTestDiagnostics.CreateAcceptedJobForTests(record, selector, jobId);
            }
        }
    }
}
```

- [ ] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-test-runner-foundation-red.xml" -testFilter UnityAgentKit.Editor.Tests.TestWorkflowTests
```

预期：FAIL，编译或测试失败包含缺少 `UnityAgentKitTestSelectorInput`、`UnityAgentKitTestDiagnostics` 或 `test.list` operation。

证明：该 red 证明 Unity Test workflow DTO、operation routing 和 TestRunner bridge foundation 尚未实现。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5d unity test workflow contracts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Unity TestRunner bridge foundation

> Clarification: 5D-01a Unity bridge is EditMode-only. Unity rejects `playmode`、`all`、unknown selector modes, and non-empty `assembly` selectors before discovery/start. PlayMode execution and assembly-scoped selectors are deferred to later Phase 5D work.

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitTestDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs`

- [x] **步骤 1：添加 Test DTOs**

在 `UnityAgentKitModels.cs` 文件末尾、namespace 结束前追加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitTestSelectorInput
    {
        public string mode = "editmode";
        public string assembly = string.Empty;
        public string className = string.Empty;
        public string methodName = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestOperationInput
    {
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public string jobId = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestCaseRecord
    {
        public string id = string.Empty;
        public string name = string.Empty;
        public string fullName = string.Empty;
        public string assembly = string.Empty;
        public string className = string.Empty;
        public string mode = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestListResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public UnityAgentKitTestCaseRecord[] tests = Array.Empty<UnityAgentKitTestCaseRecord>();
        public int total;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitTestJobResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string jobId = string.Empty;
        public string state = string.Empty;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public string createdAt = string.Empty;
        public string updatedAt = string.Empty;
        public string reportId = string.Empty;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitTestFailureRecord
    {
        public string name = string.Empty;
        public string fullName = string.Empty;
        public string message = string.Empty;
        public string stackTrace = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitTestReportSummary
    {
        public int schemaVersion = 1;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string jobId = string.Empty;
        public string reportId = string.Empty;
        public string uri = string.Empty;
        public string mode = string.Empty;
        public UnityAgentKitTestSelectorInput selector = new UnityAgentKitTestSelectorInput();
        public int total;
        public int passed;
        public int failed;
        public int errors;
        public int skipped;
        public int inconclusive;
        public bool verifiedTestPass;
        public string terminalState = string.Empty;
        public UnityAgentKitTestFailureRecord[] failures = Array.Empty<UnityAgentKitTestFailureRecord>();
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
```

- [x] **步骤 2：添加 test report artifact wrapper**

在 `UnityAgentKitArtifactContracts.cs` 的 `WriteConsoleSnapshotArtifact` 方法后追加：

```csharp
        internal static UnityAgentKitArtifactMetadataRecord WriteTestReportArtifact(
            string artifactRoot,
            string reportId,
            string payload,
            UnityAgentKitHostRecord hostRecord,
            string producerAction)
        {
            return WriteSyntheticReport(
                artifactRoot,
                reportId,
                "test-reports/" + reportId + ".json",
                payload,
                hostRecord,
                producerAction);
        }
```

- [x] **步骤 3：实现 Unity Test diagnostics foundation**

Discovery contract:
- `test.list` remains the only discovery API in 5D-01a. Do not add separate discovery job/status/result operations.
- Normalize selector input before lookup: trim strings, default empty `mode` to `editmode`, and use normalized `mode` / `className` / `methodName` / `assembly` to form the selector key.
- Reject selector modes `playmode`, `all`, and any unknown value with `status: rejected` and diagnostic code `unsupported_selector_mode`.
- Reject any non-empty `selector.assembly` with `status: rejected` and diagnostic code `unsupported_selector_assembly`; assembly selector support is explicitly deferred beyond 5D-01a.
- Supported `test.list` selectors in 5D-01a are only: broad EditMode list, `className`, `methodName`, and `className + methodName`.
- `test.list` uses a session-local memory cache only. No files, registry writes, asset persistence, or cross-restart recovery are allowed.
- On `test.list`, implement this exact recovery flow: (1) validate selector; (2) return cached completed snapshot if present; (3) return pending diagnostic if the same selector key is already pending; (4) if no cache entry exists, write a pending entry and invoke `RetrieveTestList`; (5) callback filters/converts tests and writes completed cache; (6) if callback completed synchronously before `test.list` returns, return the completed snapshot immediately; (7) otherwise first call returns `status: uncertain` with diagnostic code `test.discovery_pending`, and retrying the same `test.list` in the same Unity host session returns the cached snapshot after callback completion.
- No blocking, sleeps, polling loops, `Thread.Sleep`, waiting on events/tasks, or any wait for Unity main-thread completion is allowed.
- Discovery callback conversion must not fabricate requested assembly values. If assembly cannot be proven from TestRunner data, emit non-empty `assembly: "unknown"` and diagnostic `test.discovery_assembly_unknown` on the affected record/result payload.

创建 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitTestDiagnostics.cs`，但这里不再维护过时的整段实现样例；按以下合同实现：

1. 保留 `List`, `Start`, `GetStatus`, `GetResult` 入口，但 `List` 的内部计划 API 必须改为 callback-aware discovery cache contract，而不是旧的同步 `Discover(UnityAgentKitTestSelectorInput selector) -> UnityAgentKitTestCaseRecord[]`。
2. `UnityAgentKitTestDiagnostics` 内部应拥有 session-local discovery cache/store，用于表示 `pending` 与 `completed` discovery state；同一 Unity host 进程内复用，host 重启后丢失。
3. `List`/`ListForTests` 需要先规范化并校验 selector；对不支持的 `mode` 和非空 `assembly` 立即拒绝，不进入 `RetrieveTestList`。
4. 适配器层 discovery 设计必须允许 `RetrieveTestList` 异步回调落地 completed snapshot，而不是假设当前调用总能同步拿到 `UnityAgentKitTestCaseRecord[]`。
5. callback 中只允许筛选 `className` / `methodName`；不得把 `selector.assembly` 当作活动过滤条件。
6. broad list 与定向 list 的返回记录都固定为 EditMode discovery 结果；5D-01a 不提供 PlayMode bridge 行为。
7. `Start` / `GetStatus` / `GetResult` 仍然维持本任务既定 foundation 范围：真实 TestRunner adapter seam、session-local job store、callback-driven result/report write path，以及 `test_report` artifact metadata write path。
8. 如需在 `TestWorkflowTests` 中添加或更新断言，验收至少覆盖：
   - broad EditMode `test.list` 成功返回；
   - `className`、`methodName`、`className + methodName` selector 成功返回过滤后的列表；
   - `mode=playmode`、`mode=all`、未知 mode 被 `unsupported_selector_mode` 拒绝；
   - 非空 `selector.assembly` 被 `unsupported_selector_assembly` 拒绝；
   - 首次 discovery miss 在异步 callback 未完成时返回 `uncertain` + `test.discovery_pending`；
   - 同 selector 重试在 callback 完成后命中 completed cache；
   - 无法证明 assembly 时返回 `assembly: "unknown"` 且携带 `test.discovery_assembly_unknown`。

- [x] **步骤 4：wire operation router**

在 `UnityAgentKitOperationRouter.cs` 中：

1. 在 console operation constants 后增加：

```csharp
        internal const string TestListOperation = "test.list";
        internal const string TestStartOperation = "test.start";
        internal const string TestStatusOperation = "test.status.get";
        internal const string TestResultOperation = "test.result.get";
```

2. 在 `RequiresMainThreadDispatch` 中把四个 test operations 加入返回条件。

3. 在 `RunOnMainThread` 的 console branches 后增加这些分支，并继续调用 `UnityAgentKitTestDiagnostics.List(...)`, `Start(...)`, `GetStatus(...)`, `GetResult(...)`；router contract 不引入新的 discovery-specific operation names，也不要求旧同步 discovery method signature。

- [x] **步骤 5：运行 Unity TestWorkflowTests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-test-runner-foundation.xml" -testFilter UnityAgentKit.Editor.Tests.TestWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity C# DTO、operation routing、real TestRunner adapter seam、callback-driven session-local job/status/result records 和 `test_report` artifact metadata write path 存在并满足 5D-01a foundation 语义；它不证明 aggregate `run_and_verify`。

- [x] **步骤 6：运行 HostRuntime regression**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 Test operations 没有破坏 Phase 5A host runtime routing、dispatch、timeout、stop/reload behavior。

- [ ] **步骤 7：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitTestDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/TestWorkflowTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5d unity test runner foundation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：Focused verification and scope guard

**文件：**
- 测试：`plugins/unity-agent-kit/tests/test-workflows.test.ts`
- 测试：Unity XML outputs under `.ai-debug/unity-agent-kit/test-results/`
- 不修改代码，除非验证暴露本计划内缺陷。

- [x] **步骤 1：运行 focused TS verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/test-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5D-01a TS test workflows 与 Phase 5A/5B/5C regression contracts 兼容。

- [x] **步骤 2：运行 focused Unity verification**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-test-runner-foundation.xml" -testFilter UnityAgentKit.Editor.Tests.TestWorkflowTests
"${UNITY_EDITOR}" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：两个 XML 均记录 `failed="0"`。

证明：该检查证明 Unity TestRunner foundation 和 HostRuntime regression 通过。

- [x] **步骤 3：运行 scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
forbidden = [
    'plugins/unity-agent-kit/src/tools',
    'plugins/unity-agent-kit/src/mcp',
    'plugins/unity-agent-kit/skills/unity',
    'plugins/unity-agent-kit/skills/unity.md',
    'plugins/unity-agent-kit/src/workflows/playmode.ts',
    'plugins/unity-agent-kit/src/workflows/screenshot.ts',
    'plugins/unity-agent-kit/src/workflows/daily-loop.ts',
]
violations = [path for path in forbidden if Path(path).exists()]
if violations:
    raise SystemExit('Phase 5D-01a scope violations: ' + ', '.join(violations))
print('PASS Phase 5D-01a scope guard')
PY
```

预期：输出 `PASS Phase 5D-01a scope guard`。

证明：该检查证明 5D-01a 没有创建 public MCP tools、MCP Resource handlers、`/unity` skill、PlayMode/Screenshot/daily-loop workflows。

- [x] **步骤 4：运行 whitespace check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出。

证明：该检查证明本计划修改没有 whitespace errors。

### 任务 6：5D-01a evidence sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
- 不修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 不修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 的 Phase 5D completed state

- [x] **步骤 1：更新 5D execution index 中 5D-01a status**

在 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` 中把 `5D-01a` row 的 `Status` 从 `plan-ready` 改为 `completed`，并追加 `## Phase 5D-01a Completion Evidence`：

```markdown
## Phase 5D-01a Completion Evidence

5D-01a Test Runner foundation completed with evidence:

1. TS focused verification passed: `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/test-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` reported `fail 0`.
2. Unity Test workflow verification passed: `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-test-runner-foundation.xml` recorded `failed="0"`.
3. Unity HostRuntime regression passed: `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-host-runtime-regression.xml` recorded `failed="0"`.
4. Test report Resource readback evidence passed through `getTestResult` TS tests, proving `unity://test-reports/{reportId}` metadata + non-empty payload readback + minimal payload summary parse + host/resource counts consistency are required before `get_result` success.
5. Host continuity evidence passed through focused TS tests, proving hostId/hostEpoch mismatch returns `host.continuity_lost` and projectRoot mismatch cannot become success evidence.
6. Unity TestRunner foundation evidence passed through Unity tests that verify real adapter start path invokes the runner adapter, callbacks update the job/report store, and result readback writes `test_report` artifact metadata/payload.
7. Scope guard passed: no public MCP tools, no MCP Resource handlers, no `/unity` skill, no PlayMode/Screenshot workflows, no final daily loop E2E, and no Phase 6/7/8 domain files were created by 5D-01a.
8. `git -c core.autocrlf=false diff --check` passed with no output.

5D-01a does not complete Phase 5D. Phase 5D remains incomplete because 5D-01b, 5D-02, 5D-03, and 5D-04 remain pending. Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E remain pending.
```

- [x] **步骤 2：不要同步 parent completion**

确认 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 的 Phase 5D row 仍不是 `completed`。5D-01a 只更新 Phase 5D execution index，不更新 parent Phase 5 plan index completion evidence。

- [ ] **步骤 3：Commit evidence sync**

仅在用户授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md
git commit -m "$(cat <<'EOF'
docs: record phase 5d test foundation evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检清单

- [x] 规格覆盖度：5D-01a 覆盖 selector、real TestRunner discovery/start foundation、list/start/status/result、test report Resource readback、payload minimal summary parse、host continuity、scope boundary；不覆盖 5D-01b aggregate workflows。
- [x] 占位符扫描：计划正文没有禁用占位符、模糊延期措辞或缺少具体操作的步骤。
- [x] 类型一致性：TS uses `TestSelector` / `TestJobSnapshot` / `TestReportSummary` / `TestReportPayloadSummary` consistently；Unity uses `UnityAgentKitTestSelectorInput` / `UnityAgentKitTestJobResult` / `UnityAgentKitTestReportSummary` consistently。
- [x] 拆分检查：计划头部记录 5D Test workflow split；execution index records 5D-01a/01b split.
- [x] 上游约束覆盖：TS final judgment、Unity short operations、public/internal separation、Resource readback、Console supplemental diagnostics、Phase 5 incomplete state all appear in tasks or verification.
- [x] 参考输入映射：v2 TestService adopted mechanisms and non-adopted public contract are mapped to tasks.
- [x] 验证强度：Behavior tasks prove rejected `mode: all`、real TestRunner adapter start/callback store、Resource payload parse/mismatch requirement, host continuity, not just symbol existence.
