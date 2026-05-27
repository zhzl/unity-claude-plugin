# Unity Agent Kit Phase 5C-04 Console Count / Snapshot / Clear / Cursor / Resource 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5C-04 的 `unity_console.count`、`unity_console.snapshot`、`unity_console.clear` internal workflows，提供真实 bounded Console readback、cursor continuity proof、explicit clear verification，以及 Phase 5B-compatible console snapshot Resource readback evidence。

**架构：** Unity C# 新增 `console.count`、`console.snapshot`、`console.clear` 三个短主线程 operation，使用 Unity `LogEntries` reflection 做真实 bounded count/snapshot/clear，并在 verified clear 后递增 session-local `consoleGeneration`。TS 新增 console diagnostics/result mapping 与 `countConsole`、`snapshotConsole`、`clearConsole` internal workflows，负责 input bounds、host rebind classification、timeout/resource readback、Resource URI assembly 和 final status judgment；Unity C# 只做短 Unity API/read/write/artifact metadata operation。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`、`UnityEditor.LogEntries` reflection、Phase 5B artifact/resource/readback helpers。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-04
**Spec:** `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md`
**Execution Index:** `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
**Depends on:** Phase 5A Host Runtime completed；Phase 5B Artifact / Resource / Timeout / Completion completed。

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在任务汇报中列出未提交修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/tests/console-workflows.test.ts` — TS 行为测试，覆盖 console count parser、snapshot parser、cursor validation、bounded count/snapshot semantics、Resource readback requirement、clear explicit gate、clear generation evidence、host continuity loss 和 timeout/resource failure mapping。
- 创建：`plugins/unity-agent-kit/src/diagnostics/console.ts` — 定义 console count/snapshot/clear/cursor data contract、host data parser、cursor validator、host-result 到 `unity_console` action result 的 mapping。
- 创建：`plugins/unity-agent-kit/src/workflows/console.ts` — 调用 5C-01 shared `executeWithRebindAwareness` 执行 `console.count` / `console.snapshot` / `console.clear`，提供 `countConsole`、`snapshotConsole`、`clearConsole` internal workflows；snapshot workflow 负责 `unity://console-snapshots/{artifactId}` Resource URI assembly/readback 和 final judgment。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 增加 console cursor/count/snapshot/clear DTO，使 JSON roundtrip 和 tests 有明确字段。
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` — 增加 production `WriteConsoleSnapshotArtifact` wrapper，复用 Phase 5B metadata layout，不创建 MCP Resource handler。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs` — Unity C# 短 operation：resolve `LogEntries` reflection、bounded severity scan、bounded snapshot payload write、cursor validity check、explicit clear + count verification + generation increment。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 增加 `console.count`、`console.snapshot`、`console.clear` operation 常量、main-thread dispatch 分类和 `RunOnMainThread` routing。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` — Unity EditMode tests，覆盖 DTO roundtrip、dispatch classification、deterministic seam、real `LogEntries` controlled-entry readback smoke、real reflected clear verification smoke、bounded snapshot artifact metadata、clear explicit/verified generation behavior。
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` — 5C-04 完成后记录 expanded plan path/status/evidence；只有所有 5C active cards completed 且 combined evidence 通过后，才允许把 Phase 5C completion evidence 写清楚。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 5C-04 完成后同步 Phase 5C partial/subplan evidence；Phase 5 仍不 completed，因为 Phase 5D、Phase 5E 和 final daily loop E2E 未完成。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 仅记录 5C-04 partial completion evidence 和下一步 Phase 5D planning/implementation handoff；不修改 roadmap Goal、Non-goals、Shared Constraints、Phase 5 scope 或 Phase 5 success criteria。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/src/server.ts`、`plugins/unity-agent-kit/src/index.ts`、`plugins/unity-agent-kit/src/resources/handlers.ts`、`plugins/unity-agent-kit/src/resources/mcp.ts`。
- 不创建：`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。
- 不创建：`plugins/unity-agent-kit/src/workflows/test.ts`、`plugins/unity-agent-kit/src/workflows/playmode.ts`、`plugins/unity-agent-kit/src/workflows/screenshot.ts`、`plugins/unity-agent-kit/src/workflows/daily-loop.ts`。

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 v2 operation envelope、Unity host runtime、loopback HTTP host、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、轮询、timeout、host rebind、Resource URI assembly/readback 和最终判定；Unity C# 负责 Unity API 主线程短动作、状态 snapshot、artifact/report 基础记录；首版 Resources 只用于 artifacts/reports；Console diagnostic cursor 用于非编译器诊断归因；禁止 Unity host 长时间 `Thread.Sleep`、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程、后台线程直接调用 Unity API、Unity C# host 承担复杂 workflow 编排。
- **Phase Scope:** Phase 5C 覆盖 editor / compile / console core diagnostics workflows。5C-04 只交付 console count、bounded snapshot、explicit clear、cursor continuity proof 和 Phase 5B-compatible console snapshot Resource readback evidence。
- **Phase Out-of-scope:** 5C-04 不实现 Phase 5D test/playmode/screenshot workflows，不实现 Phase 5E public MCP tool registration、MCP Resource handlers、`/unity` skill 或 final daily loop E2E，不创建 public action-dispatch surface，不把 Phase 5C 或 Phase 5 标记 completed。
- **Success Criteria:** TS `console-workflows.test.ts` 覆盖 count/snapshot/clear/cursor/resource behavior 并通过；existing TS editor/compile/host/runtime/Phase 5B tests remain pass；Unity `CoreDiagnosticsTests` 覆盖 console seam + real `LogEntries` smoke + clear verification 并通过；Unity `HostRuntimeTests` regression pass；console snapshot Resource readback evidence pass；scope guard confirms no public MCP/tools/skill/5D/5E files and no extra MCP Resource handlers；`git -c core.autocrlf=false diff --check` pass；docs evidence sync only records 5C-04 completion and Phase 5C evidence, while Phase 5 remains incomplete because Phase 5D/5E/final E2E remain incomplete。
- **用户确认事项:** 5C-04 scope only console count/snapshot/clear + cursor/resource；console count must be real and bounded, never fixed empty counts；console snapshot must be bounded, never unbounded full-buffer scan；console clear must be explicit only and verify clear generation/count evidence；cursor must include `hostId`、`hostEpoch`、`consoleGeneration`、`startIndex`、`createdAt` continuity/proof fields；Unity C# only short main-thread Unity API operations；TS owns workflow orchestration、polling、timeout、resource URI assembly and final judgment；clean/empty Console is not compile success proof。
- **本计划不包含:** 不实现 test/playmode/screenshot workflows；不实现 public MCP tool registration、`/unity` skill 或 final daily loop E2E；不创建 MCP Resource handlers beyond 5C-04 scoped console snapshot Resource evidence through existing Phase 5B file readback；不把 console clean / empty console 当作 compile success proof；不创建 unbounded console scans。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | 5C-04 action semantics、cursor shape、bounded snapshot payload schema、Resource readback requirement、timeout policy、host continuity rules、TS/Unity ownership | Compile report/compile_and_check implementation；Phase 5D/5E workflows | 本计划只执行 5C-04 | 任务 1-6 |
| `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | 5C-04 requirement IDs、review-carried bounded count constraint、scope boundary、completion rules、Phase 5C combined evidence requirements | 执行 index 本身；5D/5E work | Index 是状态入口，不是 executable plan | 任务 1-6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | Phase 5A/5B completed state、5C-01/02/03 completed evidence、Phase 5 completion rule | 把 Phase 5 标记 completed | Phase 5D/5E/final E2E 未完成 | 任务 6 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Shared Constraints：TS/Unity ownership、Console cursor、Resources/artifact model、test output path constraints、public/internal boundary | 修改 roadmap Goal/Non-goals/Shared Constraints/phase order | 5C-04 是 Phase 5 内部 plan card | 任务 5-6 |
| `plugins/unity-agent-kit/src/resources/uri.ts` | `unity://console-snapshots/{artifactId}` URI format and safe id validation | 新增 validation-reports URI 或新的 MCP handler | 5C-04 只使用 existing Phase 5B file-backed readback | 任务 1-2 |
| `plugins/unity-agent-kit/src/resources/readback.ts` | `readUnityResource(projectRoot, uri)` metadata + payload readback success/failure semantics | 直接读取 payload file without metadata validation | Artifact success requires Phase 5B readback proof | 任务 1-2 |
| `plugins/unity-agent-kit/src/artifacts/metadata.ts` / `types.ts` / `paths.ts` | Phase 5B metadata schema、safe relative path、console-snapshots collection | 完整 artifact store、retention、cleanup | Phase 5B explicitly excludes full artifact store | 任务 1-2、任务 4 |
| `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` | `.ai-debug/unity-agent-kit/artifacts` root、metadata path layout、safe relative path validation、console_snapshot metadata support | MCP Resource server/handler | Resource handler belongs Phase 5E; file-backed metadata readback exists in TS | 任务 3-4 |
| `plugins/unity-agent-kit/src/workflows/rebind.ts` | `executeWithRebindAwareness` successful pre-operation rebind diagnostic behavior | Recovering `console.clear` across host rebind | Clear is a write/effect action; continuity cannot be recovered across host change | 任务 1-2 |
| `plugins/unity-agent-kit/tests/editor-workflows.test.ts` and `compile-workflows.test.ts` | strict fake registry/transport queues、port/requestId assertions、host rebind and timeout test style | Mixing console tests into compile/editor test files | Console tests should stay focused and independent | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | operation constants、generic main-thread dispatch guard、`RunOnMainThread` branch pattern、operation envelope response | Direct route Unity Console API reads | Unity API must remain main-thread short operation | 任务 3-4 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ConsoleService.cs` | `UnityEditor.LogEntries` / `LogEntry` reflection、`GetCount`、`GetEntryInternal` method resolution、message/mode/stackTrace field read direction | v2 empty fallback snapshot；unbounded full-buffer count; v2 public contract | 5C-04 must fail/uncertain on reflection unavailable and must use bounded readback with new result semantics | 任务 3-4 |

## 质量门

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS count/snapshot/clear mapping | Strict data parsers + action-specific result mapping + Resource readback final judgment | 8 | 删除 weak success path，补 parser/resource failure tests |
| Bounded Console counting | Exact `totalCount` from `LogEntries.GetCount()` plus bounded severity scan window; partial severity uses diagnostics, never fixed empty counts | 7 | If exact severity cannot be proven without unbounded scan, return totalCount + bounded partial breakdown + `severityBreakdownComplete: false` |
| Cursor continuity | Cursor includes host identity + generation + start index + createdAt; TS/Unity reject or mark uncertain when invalid | 8 | Missing field returns rejected/uncertain; do not attribute old logs |
| Snapshot Resource evidence | Unity writes bounded payload + Phase 5B metadata; TS readback must succeed before public success | 8 | Resource readback failure returns failed with `console.snapshot_resource_failed` |
| Clear explicit verification | TS and Unity both require explicit `confirmClear: true`; generation increments only after count verification | 8 | Do not run clear by default; no success if count evidence missing |
| Scope boundary | No public MCP, no MCP Resource handlers, no `/unity`, no Phase 5D/5E workflows | 9 | Remove scope leak and rerun scope guard |

低于 7/10 的对象不得进入 5C-04 completion evidence。处理方式只能是修订方案、缩小 5C-04 evidence，或由用户逐条明确接受风险；不得使用 stub、固定空 counts、Console-clean compile proof、unbounded scan、weak Resource read 或只检查符号存在作为通过理由。

## 审查确认决策

- `unity_console.count` returns exact `totalCount` from Unity Console and a bounded severity breakdown with `scannedCount` / `severityBreakdownComplete`; if the Console has more entries than the scan limit, severity counts are explicitly partial and diagnostic-bearing rather than fabricated.
- `unity_console.snapshot` is artifact-backed and succeeds only when Unity writes a bounded payload + Phase 5B-compatible metadata and TS `readUnityResource` succeeds for `unity://console-snapshots/{artifactId}`.
- `unity_console.clear` requires explicit `confirmClear: true` at TS boundary and Unity boundary; it increments `consoleGeneration` only after verified post-clear count evidence.
- Cursor validity requires `hostId`、`hostEpoch`、`consoleGeneration` match and `currentCount >= startIndex`; invalid cursor returns `uncertain` for workflow evidence or `rejected` for malformed input.
- No 5C-04 result may state or imply compile success. Console count/snapshot/clear are supplemental diagnostics only.

---

### 任务 1：TS console workflow contract tests

**文件：**
- 创建：`plugins/unity-agent-kit/tests/console-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`

- [x] **步骤 1：编写失败的 console workflow tests**

创建 `plugins/unity-agent-kit/tests/console-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  clearConsole,
  countConsole,
  snapshotConsole,
  type ConsoleWorkflowOptions,
} from "../src/workflows/console.ts";
import {
  consoleClearOperation,
  consoleCountOperation,
  consoleSnapshotOperation,
  parseConsoleClearData,
  parseConsoleCountData,
  parseConsoleSnapshotData,
  validateConsoleCursor,
  type ConsoleClearSnapshot,
  type ConsoleCountSnapshot,
  type ConsoleCursor,
  type ConsoleSnapshotSummary,
} from "../src/diagnostics/console.ts";
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
    hostId: "host-console",
    hostEpoch: 9,
    port: 49400,
    status: "ready",
    startedAt: "2026-05-27T10:00:00.000Z",
    lastProbeAt: "2026-05-27T10:00:01.000Z",
    ...overrides,
  };
}

function cursor(overrides: Partial<ConsoleCursor> = {}): ConsoleCursor {
  return {
    hostId: "host-console",
    hostEpoch: 9,
    consoleGeneration: 2,
    startIndex: 12,
    createdAt: "2026-05-27T10:00:00.000Z",
    ...overrides,
  };
}

function countSnapshot(overrides: Partial<ConsoleCountSnapshot> = {}): ConsoleCountSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-console",
    hostEpoch: 9,
    totalCount: 12,
    counts: { error: 1, warning: 2, log: 9 },
    severityScan: {
      scannedCount: 12,
      startIndex: 0,
      endIndexExclusive: 12,
      limit: 500,
      severityBreakdownComplete: true,
    },
    cursor: cursor(),
    consoleGeneration: 2,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

function snapshotSummary(overrides: Partial<ConsoleSnapshotSummary> = {}): ConsoleSnapshotSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-console",
    hostEpoch: 9,
    artifactId: "console-20260527-100000",
    uri: "unity://console-snapshots/console-20260527-100000",
    counts: { error: 1, warning: 1, log: 1 },
    cursor: cursor({ startIndex: 15 }),
    range: {
      startIndex: 12,
      endIndexExclusive: 15,
      totalCountAtCapture: 15,
      limit: 200,
      truncated: false,
    },
    entryCount: 3,
    includeStackTrace: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

function clearSnapshot(overrides: Partial<ConsoleClearSnapshot> = {}): ConsoleClearSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-console",
    hostEpoch: 9,
    explicitClear: true,
    cleared: true,
    countBeforeClear: 12,
    countAfterClear: 0,
    consoleGenerationBeforeClear: 2,
    consoleGenerationAfterClear: 3,
    cursor: cursor({ consoleGeneration: 3, startIndex: 0 }),
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
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
    summary: "Console operation completed.",
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-27T10:00:00.000Z",
    completedAt: "2026-05-27T10:00:00.010Z",
    durationMs: 10,
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
    diagnostics: [{ source: "console", severity: "error", code, message, attribution: { operation, requestId } }],
    code,
    message,
    startedAt: "2026-05-27T10:00:00.000Z",
    completedAt: "2026-05-27T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): { readRegistry: ConsoleWorkflowOptions["readRegistry"]; assertConsumed(): void } {
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

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: ConsoleWorkflowOptions["readRegistry"]): ConsoleWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
  };
}

async function withArtifactProject(testBody: (projectRoot: string, artifactRoot: string) => Promise<void>): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-console-"));
  const artifactRoot = path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeConsoleSnapshotResource(artifactRoot: string, artifactId: string, payload: string): Promise<void> {
  const payloadRelativePath = `console-snapshots/${artifactId}.json`;
  const metadataRelativePath = `metadata/console-snapshots/${artifactId}.json`;
  await import("node:fs/promises").then(async ({ mkdir }) => {
    await mkdir(path.dirname(path.join(artifactRoot, payloadRelativePath)), { recursive: true });
    await mkdir(path.dirname(path.join(artifactRoot, metadataRelativePath)), { recursive: true });
  });
  await writeFile(path.join(artifactRoot, payloadRelativePath), payload, "utf8");
  await writeFile(path.join(artifactRoot, metadataRelativePath), JSON.stringify({
    schemaVersion: 1,
    id: artifactId,
    type: "console_snapshot",
    uri: `unity://console-snapshots/${artifactId}`,
    relativePath: payloadRelativePath,
    createdAt: "2026-05-27T10:00:00.000Z",
    validationStatus: "valid",
    hostId: "host-console",
    hostEpoch: 9,
    producerTool: "unity_console",
    producerAction: "snapshot",
    sizeBytes: Buffer.byteLength(payload),
    diagnostics: [],
  }, null, 2), "utf8");
}

test("parseConsoleCountDataAcceptsRealBoundedSnapshotAndRejectsInvalidShape", () => {
  const snapshot = countSnapshot();
  assert.deepEqual(parseConsoleCountData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleCountData("not-json"), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ totalCount: 0 })), null);
});

test("parseConsoleSnapshotDataPreservesCursorRangeAndResourceFields", () => {
  const summary = snapshotSummary();
  assert.deepEqual(parseConsoleSnapshotData(JSON.stringify(summary)), summary);
  assert.equal(parseConsoleSnapshotData(JSON.stringify({ artifactId: summary.artifactId })), null);
});

test("parseConsoleClearDataRequiresGenerationAndCountEvidence", () => {
  const snapshot = clearSnapshot();
  assert.deepEqual(parseConsoleClearData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleClearData(JSON.stringify({ explicitClear: true, cleared: true })), null);
});

test("validateConsoleCursorRequiresHostEpochGenerationStartIndexAndCreatedAt", () => {
  const current = countSnapshot({ totalCount: 15 });
  assert.deepEqual(validateConsoleCursor(cursor(), current), { ok: true });
  assert.equal(validateConsoleCursor(cursor({ hostId: "other" }), current).ok, false);
  assert.equal(validateConsoleCursor(cursor({ hostEpoch: 10 }), current).ok, false);
  assert.equal(validateConsoleCursor(cursor({ consoleGeneration: 1 }), current).ok, false);
  assert.equal(validateConsoleCursor(cursor({ startIndex: 99 }), current).ok, false);
});

test("countConsoleMapsRealTotalAndBoundedPartialSeverityWithoutClaimingExactBreakdown", async () => {
  const record = sampleHostRecord();
  const snapshot = countSnapshot({
    totalCount: 1000,
    counts: { error: 1, warning: 2, log: 497 },
    severityScan: { scannedCount: 500, startIndex: 500, endIndexExclusive: 1000, limit: 500, severityBreakdownComplete: false },
    diagnostics: [{ source: "console", severity: "warning", code: "console.severity_breakdown_partial", message: "Severity breakdown scanned the bounded tail window only." }],
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: consoleCountOperation, requestId: "req-count", inputJson: JSON.stringify({ maxSeverityScan: 500 }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, consoleCountOperation, snapshot, "req-count") } },
  ]);

  const result = await countConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-count", maxSeverityScan: 500 });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_console");
  assert.equal(result.action, "count");
  assert.equal(result.data?.["totalCount"], 1000);
  assert.deepEqual(result.evidence, { completion: "state_snapshot", totalCount: 1000, severityBreakdownComplete: false });
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "console.severity_breakdown_partial"), true);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const artifactId = "console-20260527-100000";
    const payload = JSON.stringify({ schemaVersion: 1, artifactId, entries: [{ index: 12, severity: "warning", message: "hello" }] });
    await writeConsoleSnapshotResource(artifactRoot, artifactId, payload);
    const summary = snapshotSummary({ projectRoot, artifactId, uri: `unity://console-snapshots/${artifactId}` });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, operation: consoleSnapshotOperation, requestId: "req-snapshot", inputJson: JSON.stringify({ limit: 200, includeStackTrace: false }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, consoleSnapshotOperation, summary, "req-snapshot") } },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-snapshot", limit: 200 });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "snapshot");
    assert.equal(result.resource?.uri, `unity://console-snapshots/${artifactId}`);
    assert.equal(result.evidence?.["completion"], "artifact_complete");
    assert.equal(Buffer.from(result.metadata?.["resourceContentBytes"] as Uint8Array).toString("utf8"), payload);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleFailsWhenResourceReadbackFails", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({ projectRoot, artifactId: "console-missing", uri: "unity://console-snapshots/console-missing" });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      { port: record.port, operation: consoleSnapshotOperation, requestId: "req-snapshot-missing", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, consoleSnapshotOperation, summary, "req-snapshot-missing") } },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-snapshot-missing" });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "console.snapshot_resource_failed");
    assert.equal(result.nextStep?.kind, "inspect_diagnostics");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleMapsInvalidCursorToUncertainWithoutReadingResource", async () => {
  const record = sampleHostRecord();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const inputJson = JSON.stringify({ limit: 200, includeStackTrace: false, cursor: cursor({ consoleGeneration: 1 }) });
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: consoleSnapshotOperation, requestId: "req-invalid-cursor", inputJson, result: { ok: true, statusCode: 200, body: uncertainEnvelope(record, consoleSnapshotOperation, "req-invalid-cursor", "console.cursor_invalid", "Console cursor is not valid for the active host generation.") } },
  ]);

  const result = await snapshotConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-invalid-cursor", cursor: cursor({ consoleGeneration: 1 }) });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "console.cursor_invalid");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("clearConsoleRejectsWithoutExplicitConfirmationBeforeCallingUnity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await clearConsole(options(record, transport.transport), { requestId: "req-clear-no-confirm" });

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "console.clear_requires_explicit_confirmation");
  transport.assertConsumed();
});

test("clearConsoleMapsVerifiedClearGenerationAndCountEvidence", async () => {
  const record = sampleHostRecord();
  const snapshot = clearSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const inputJson = JSON.stringify({ confirmClear: true });
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: consoleClearOperation, requestId: "req-clear", inputJson, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, consoleClearOperation, snapshot, "req-clear") } },
  ]);

  const result = await clearConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-clear", confirmClear: true });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "clear");
  assert.deepEqual(result.evidence, {
    completion: "effect_verified",
    countBeforeClear: 12,
    countAfterClear: 0,
    consoleGenerationBeforeClear: 2,
    consoleGenerationAfterClear: 3,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("clearConsoleReturnsFailedWhenUnityCannotVerifyCountAfterClear", async () => {
  const record = sampleHostRecord();
  const failedClear = clearSnapshot({ cleared: false, countAfterClear: 2, consoleGenerationAfterClear: 2 });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: consoleClearOperation, requestId: "req-clear-failed", inputJson: JSON.stringify({ confirmClear: true }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, consoleClearOperation, failedClear, "req-clear-failed") } },
  ]);

  const result = await clearConsole(options(record, transport.transport, registry.readRegistry), { requestId: "req-clear-failed", confirmClear: true });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "console.clear_verification_failed");
  assert.equal(result.evidence?.["consoleGenerationAfterClear"], 2);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("countConsoleRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49400 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49401 });
  const registry = registrySequence([{ ok: true, record: first }, { ok: true, record: rebound }, { ok: true, record: rebound }]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, operation: consoleCountOperation, requestId: "req-rebound-count", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, consoleCountOperation, countSnapshot({ hostId: rebound.hostId, hostEpoch: rebound.hostEpoch, cursor: cursor({ hostId: rebound.hostId, hostEpoch: rebound.hostEpoch }) }), "req-rebound-count") } },
  ]);

  const result = await countConsole({ registryPath: "ignored", projectRoot: first.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, { requestId: "req-rebound-count" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "host.rebound"), true);
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 2：运行 TS test 验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/workflows/console.ts'` 或 `Cannot find module '../src/diagnostics/console.ts'`。

证明：该 red 证明 5C-04 console workflow TS contract 尚未实现。

- [x] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/tests/console-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: add phase 5c console workflow contracts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：TS console diagnostics and workflows

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/console.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/console.ts`
- 测试：`plugins/unity-agent-kit/tests/console-workflows.test.ts`

- [x] **步骤 1：实现 console diagnostics contract**

创建 `plugins/unity-agent-kit/src/diagnostics/console.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const consoleCountOperation = "console.count" as const;
export const consoleSnapshotOperation = "console.snapshot" as const;
export const consoleClearOperation = "console.clear" as const;

export type ConsoleSeverity = "error" | "warning" | "log";

export interface ConsoleCounts {
  error: number;
  warning: number;
  log: number;
}

export interface ConsoleCursor {
  hostId: string;
  hostEpoch: number;
  consoleGeneration: number;
  startIndex: number;
  createdAt: string;
}

export interface ConsoleSeverityScan {
  scannedCount: number;
  startIndex: number;
  endIndexExclusive: number;
  limit: number;
  severityBreakdownComplete: boolean;
}

export interface ConsoleCountSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  totalCount: number;
  counts: ConsoleCounts;
  severityScan: ConsoleSeverityScan;
  cursor: ConsoleCursor;
  consoleGeneration: number;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ConsoleSnapshotRange {
  startIndex: number;
  endIndexExclusive: number;
  totalCountAtCapture: number;
  limit: number;
  truncated: boolean;
}

export interface ConsoleSnapshotSummary {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  artifactId: string;
  uri: string;
  counts: ConsoleCounts;
  cursor: ConsoleCursor;
  range: ConsoleSnapshotRange;
  entryCount: number;
  includeStackTrace: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ConsoleClearSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  explicitClear: boolean;
  cleared: boolean;
  countBeforeClear: number;
  countAfterClear: number;
  consoleGenerationBeforeClear: number;
  consoleGenerationAfterClear: number;
  cursor: ConsoleCursor;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export function parseConsoleCountData(data: unknown): ConsoleCountSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (!isObject(parsed)) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    isCommonConsoleSnapshot(value) &&
    isNonNegativeInteger(value.totalCount) &&
    isConsoleCounts(value.counts) &&
    isConsoleSeverityScan(value.severityScan) &&
    isConsoleCursor(value.cursor) &&
    isNonNegativeInteger(value.consoleGeneration) &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    totalCount: value.totalCount,
    counts: value.counts,
    severityScan: value.severityScan,
    cursor: value.cursor,
    consoleGeneration: value.consoleGeneration,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId as number }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId as number }),
    diagnostics: value.diagnostics,
  };
}

export function parseConsoleSnapshotData(data: unknown): ConsoleSnapshotSummary | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (!isObject(parsed)) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    isCommonConsoleSnapshot(value) &&
    typeof value.artifactId === "string" && value.artifactId.length > 0 &&
    typeof value.uri === "string" && value.uri === `unity://console-snapshots/${value.artifactId}` &&
    isConsoleCounts(value.counts) &&
    isConsoleCursor(value.cursor) &&
    isConsoleSnapshotRange(value.range) &&
    isNonNegativeInteger(value.entryCount) &&
    typeof value.includeStackTrace === "boolean" &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    artifactId: value.artifactId,
    uri: value.uri,
    counts: value.counts,
    cursor: value.cursor,
    range: value.range,
    entryCount: value.entryCount,
    includeStackTrace: value.includeStackTrace,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId as number }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId as number }),
    diagnostics: value.diagnostics,
  };
}

export function parseConsoleClearData(data: unknown): ConsoleClearSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (!isObject(parsed)) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    isCommonConsoleSnapshot(value) &&
    typeof value.explicitClear === "boolean" &&
    typeof value.cleared === "boolean" &&
    isNonNegativeInteger(value.countBeforeClear) &&
    isNonNegativeInteger(value.countAfterClear) &&
    isNonNegativeInteger(value.consoleGenerationBeforeClear) &&
    isNonNegativeInteger(value.consoleGenerationAfterClear) &&
    isConsoleCursor(value.cursor) &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    explicitClear: value.explicitClear,
    cleared: value.cleared,
    countBeforeClear: value.countBeforeClear,
    countAfterClear: value.countAfterClear,
    consoleGenerationBeforeClear: value.consoleGenerationBeforeClear,
    consoleGenerationAfterClear: value.consoleGenerationAfterClear,
    cursor: value.cursor,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId as number }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId as number }),
    diagnostics: value.diagnostics,
  };
}

export function validateConsoleCursor(cursor: ConsoleCursor, current: Pick<ConsoleCountSnapshot, "hostId" | "hostEpoch" | "consoleGeneration" | "totalCount">): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  if (cursor.hostId !== current.hostId || cursor.hostEpoch !== current.hostEpoch) {
    return { ok: false, diagnostic: cursorDiagnostic("host.continuity_lost", "Console cursor host identity does not match the active host.", { cursorHostId: cursor.hostId, cursorHostEpoch: cursor.hostEpoch, hostId: current.hostId, hostEpoch: current.hostEpoch }) };
  }

  if (cursor.consoleGeneration !== current.consoleGeneration) {
    return { ok: false, diagnostic: cursorDiagnostic("console.cursor_generation_mismatch", "Console cursor generation does not match the active console generation.", { cursorGeneration: cursor.consoleGeneration, consoleGeneration: current.consoleGeneration }) };
  }

  if (cursor.startIndex > current.totalCount) {
    return { ok: false, diagnostic: cursorDiagnostic("console.cursor_invalid", "Console cursor startIndex is greater than the current Console count.", { startIndex: cursor.startIndex, totalCount: current.totalCount }) };
  }

  return { ok: true };
}

export function consoleCountResultFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapConsoleHostResult(hostResult, "count");
  }

  const snapshot = parseConsoleCountData(hostResult.data);
  if (snapshot === null) {
    return consoleFailureResult(hostResult, "count", "console.count_invalid_shape", "Console count operation returned an invalid data shape.");
  }

  const bindingFailure = validateConsoleBinding(snapshot, expectedProjectRoot, hostResult);
  if (bindingFailure !== null) {
    return bindingFailure("count");
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_console",
    action: "count",
    operation: consoleCountOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: snapshot.severityScan.severityBreakdownComplete ? "Console count read with complete bounded severity evidence." : "Console total count read with bounded partial severity evidence.",
    data: snapshot,
    diagnostics: [...hostResult.diagnostics, ...snapshot.diagnostics],
    evidence: {
      completion: "state_snapshot",
      totalCount: snapshot.totalCount,
      severityBreakdownComplete: snapshot.severityScan.severityBreakdownComplete,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function consoleSnapshotSummaryFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapConsoleHostResult(hostResult, "snapshot");
  }

  const snapshot = parseConsoleSnapshotData(hostResult.data);
  if (snapshot === null) {
    return consoleFailureResult(hostResult, "snapshot", "console.snapshot_invalid_shape", "Console snapshot operation returned an invalid data shape.");
  }

  const bindingFailure = validateConsoleBinding(snapshot, expectedProjectRoot, hostResult);
  if (bindingFailure !== null) {
    return bindingFailure("snapshot");
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_console",
    action: "snapshot",
    operation: consoleSnapshotOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: "Console snapshot artifact metadata was produced by Unity; Resource readback is still required before final success.",
    data: snapshot,
    diagnostics: [...hostResult.diagnostics, ...snapshot.diagnostics],
    evidence: { completion: "artifact_metadata_written", resourceUri: snapshot.uri, bounded: true },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function consoleClearResultFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapConsoleHostResult(hostResult, "clear");
  }

  const snapshot = parseConsoleClearData(hostResult.data);
  if (snapshot === null) {
    return consoleFailureResult(hostResult, "clear", "console.clear_invalid_shape", "Console clear operation returned an invalid data shape.");
  }

  const bindingFailure = validateConsoleBinding(snapshot, expectedProjectRoot, hostResult);
  if (bindingFailure !== null) {
    return bindingFailure("clear");
  }

  const verified = snapshot.explicitClear && snapshot.cleared && snapshot.countAfterClear === 0 && snapshot.consoleGenerationAfterClear > snapshot.consoleGenerationBeforeClear;
  return definePublicResult({
    status: verified ? "succeeded" : "failed",
    tool: "unity_console",
    action: "clear",
    operation: consoleClearOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: verified ? "Console clear verified by count and generation evidence." : "Console clear could not be verified by count and generation evidence.",
    ...(verified ? {} : { code: "console.clear_verification_failed", message: "Console clear could not be verified by count and generation evidence." }),
    data: snapshot,
    diagnostics: [...hostResult.diagnostics, ...snapshot.diagnostics],
    evidence: {
      completion: verified ? "effect_verified" : "effect_unverified",
      countBeforeClear: snapshot.countBeforeClear,
      countAfterClear: snapshot.countAfterClear,
      consoleGenerationBeforeClear: snapshot.consoleGenerationBeforeClear,
      consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    ...(verified ? {} : { nextStep: { kind: "inspect_diagnostics", reason: "Console clear did not produce verified zero-count and generation evidence." } }),
  });
}

function remapConsoleHostResult(hostResult: UnityAgentKitPublicResult, action: "count" | "snapshot" | "clear"): UnityAgentKitPublicResult {
  return definePublicResult({ ...hostResult, tool: "unity_console", action, summary: hostResult.summary || "Console operation could not be completed." });
}

function validateConsoleBinding(
  snapshot: Pick<ConsoleCountSnapshot, "projectRoot" | "hostId" | "hostEpoch">,
  expectedProjectRoot: string,
  hostResult: UnityAgentKitPublicResult,
): ((action: "count" | "snapshot" | "clear") => UnityAgentKitPublicResult) | null {
  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return (action) => consoleFailureResult(hostResult, action, "console.project_root_mismatch", "Console operation projectRoot does not match the expected Unity project root.");
  }

  if (snapshot.hostId !== hostResult.hostId || snapshot.hostEpoch !== hostResult.hostEpoch) {
    return (action) => definePublicResult({
      status: "uncertain",
      tool: "unity_console",
      action,
      operation: action === "count" ? consoleCountOperation : action === "snapshot" ? consoleSnapshotOperation : consoleClearOperation,
      requestId: hostResult.requestId,
      hostId: hostResult.hostId,
      hostEpoch: hostResult.hostEpoch,
      summary: "Console evidence host identity does not match the active host envelope.",
      code: "host.continuity_lost",
      message: "Console evidence host identity does not match the active host envelope.",
      diagnostics: [cursorDiagnostic("host.continuity_lost", "Console evidence host identity does not match the active host envelope.", { snapshotHostId: snapshot.hostId, snapshotHostEpoch: snapshot.hostEpoch, hostId: hostResult.hostId, hostEpoch: hostResult.hostEpoch })],
      evidence: { completion: "console_proof_incomplete" },
      nextStep: { kind: "inspect_diagnostics", reason: "Console proof cannot cross host identity changes." },
    });
  }

  return null;
}

function consoleFailureResult(hostResult: UnityAgentKitPublicResult, action: "count" | "snapshot" | "clear", code: string, message: string): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_console",
    action,
    operation: action === "count" ? consoleCountOperation : action === "snapshot" ? consoleSnapshotOperation : consoleClearOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [...hostResult.diagnostics, { source: "workflow", severity: "error", code, message, attribution: { operation: "console", requestId: hostResult.requestId } }],
    nextStep: { kind: "inspect_diagnostics", reason: message },
  });
}

function cursorDiagnostic(code: string, message: string, details: Record<string, unknown>): UnityAgentKitDiagnostic {
  return { source: code.startsWith("host.") ? "host" : "console", severity: "error", code, message, details };
}

function isCommonConsoleSnapshot(value: Record<string, unknown>): value is Record<string, unknown> & { projectRoot: string; unityVersion: string; hostId: string; hostEpoch: number } {
  return typeof value.projectRoot === "string" && value.projectRoot.length > 0 && typeof value.unityVersion === "string" && value.unityVersion.length > 0 && typeof value.hostId === "string" && value.hostId.length > 0 && isNonNegativeInteger(value.hostEpoch) && isOptionalInteger(value.capturedMainThreadId) && isOptionalInteger(value.executionThreadId);
}

function isConsoleCounts(value: unknown): value is ConsoleCounts {
  return isObject(value) && isNonNegativeInteger(value.error) && isNonNegativeInteger(value.warning) && isNonNegativeInteger(value.log);
}

function isConsoleCursor(value: unknown): value is ConsoleCursor {
  return isObject(value) && typeof value.hostId === "string" && value.hostId.length > 0 && isNonNegativeInteger(value.hostEpoch) && isNonNegativeInteger(value.consoleGeneration) && isNonNegativeInteger(value.startIndex) && typeof value.createdAt === "string" && value.createdAt.length > 0;
}

function isConsoleSeverityScan(value: unknown): value is ConsoleSeverityScan {
  return isObject(value) && isNonNegativeInteger(value.scannedCount) && isNonNegativeInteger(value.startIndex) && isNonNegativeInteger(value.endIndexExclusive) && isNonNegativeInteger(value.limit) && typeof value.severityBreakdownComplete === "boolean";
}

function isConsoleSnapshotRange(value: unknown): value is ConsoleSnapshotRange {
  return isObject(value) && isNonNegativeInteger(value.startIndex) && isNonNegativeInteger(value.endIndexExclusive) && isNonNegativeInteger(value.totalCountAtCapture) && isNonNegativeInteger(value.limit) && typeof value.truncated === "boolean";
}

function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] {
  return Array.isArray(value) && value.every((diagnostic) => isObject(diagnostic) && typeof diagnostic.source === "string" && (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") && typeof diagnostic.message === "string");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isOptionalInteger(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value));
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}
```

- [x] **步骤 2：实现 console workflows**

创建 `plugins/unity-agent-kit/src/workflows/console.ts`：

```ts
import { readUnityResource } from "../resources/readback.ts";
import { definePublicResult, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import {
  consoleClearOperation,
  consoleClearResultFromHostResult,
  consoleCountOperation,
  consoleCountResultFromHostResult,
  consoleSnapshotOperation,
  consoleSnapshotSummaryFromHostResult,
  parseConsoleSnapshotData,
  type ConsoleCursor,
} from "../diagnostics/console.ts";

export interface ConsoleWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface ConsoleActionOptions {
  requestId?: string;
}

export interface ConsoleCountOptions extends ConsoleActionOptions {
  maxSeverityScan?: number;
}

export interface ConsoleSnapshotOptions extends ConsoleActionOptions {
  limit?: number;
  includeStackTrace?: boolean;
  cursor?: ConsoleCursor;
}

export interface ConsoleClearOptions extends ConsoleActionOptions {
  confirmClear?: boolean;
}

export async function countConsole(workflow: ConsoleWorkflowOptions, options: ConsoleCountOptions = {}): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-count-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleCountOperation,
      requestId,
      inputJson: JSON.stringify({ maxSeverityScan: boundedInteger(options.maxSeverityScan, 1, 1_000, 500) }),
    },
  });

  return consoleCountResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function snapshotConsole(workflow: ConsoleWorkflowOptions, options: ConsoleSnapshotOptions = {}): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-snapshot-${Date.now()}`;
  const input = {
    limit: boundedInteger(options.limit, 1, 500, 200),
    includeStackTrace: options.includeStackTrace === true,
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
  };
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleSnapshotOperation,
      requestId,
      inputJson: JSON.stringify(input),
    },
  });

  const mapped = consoleSnapshotSummaryFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") {
    return mapped;
  }

  const summary = parseConsoleSnapshotData(mapped.data);
  if (summary === null) {
    return definePublicResult({
      status: "failed",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId,
      hostId: mapped.hostId,
      hostEpoch: mapped.hostEpoch,
      summary: "Console snapshot summary could not be parsed before Resource readback.",
      code: "console.snapshot_invalid_shape",
      message: "Console snapshot summary could not be parsed before Resource readback.",
      diagnostics: [{ source: "workflow", severity: "error", code: "console.snapshot_invalid_shape", message: "Console snapshot summary could not be parsed before Resource readback." }],
      nextStep: { kind: "inspect_diagnostics", reason: "Inspect the host snapshot summary shape." },
    });
  }

  const readback = await readUnityResource(workflow.projectRoot, summary.uri);
  if (!readback.ok) {
    return definePublicResult({
      status: "failed",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId,
      hostId: mapped.hostId,
      hostEpoch: mapped.hostEpoch,
      summary: "Console snapshot Resource readback failed.",
      code: "console.snapshot_resource_failed",
      message: "Console snapshot Resource readback failed.",
      data: summary,
      diagnostics: [...mapped.diagnostics, { ...readback.diagnostic, code: "console.snapshot_resource_failed" }],
      evidence: { completion: "artifact_readback_failed", resourceUri: summary.uri, reason: readback.reason },
      nextStep: { kind: "inspect_diagnostics", reason: `Console snapshot Resource readback failed with ${readback.reason}.` },
    });
  }

  return definePublicResult({
    ...mapped,
    summary: "Console snapshot Resource is readable.",
    resource: readback.resource,
    evidence: {
      completion: "artifact_complete",
      resourceUri: readback.resource.uri,
      bounded: true,
      entryCount: summary.entryCount,
      truncated: summary.range.truncated,
    },
    metadata: {
      resourceFilePath: readback.filePath,
      resourceContentBytes: readback.contentBytes,
    },
  });
}

export async function clearConsole(workflow: ConsoleWorkflowOptions, options: ConsoleClearOptions = {}): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-clear-${Date.now()}`;
  if (options.confirmClear !== true) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_console",
      action: "clear",
      requestId,
      summary: "Console clear requires explicit confirmation.",
      code: "console.clear_requires_explicit_confirmation",
      message: "Console clear requires explicit confirmation.",
      diagnostics: [{ source: "validation", severity: "error", code: "console.clear_requires_explicit_confirmation", message: "Console clear requires explicit confirmation." }],
      nextStep: { kind: "rerun_with_confirmation", reason: "Rerun clear with confirmClear: true only after an explicit user request." },
    });
  }

  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleClearOperation,
      requestId,
      inputJson: JSON.stringify({ confirmClear: true }),
    },
  });

  if (hostResult.result.status === "timeout") {
    return timeoutContinuationResult({
      tool: "unity_console",
      action: "clear",
      requestId,
      summary: "Timed out waiting for Console clear verification.",
      mayStillBeRunning: true,
      safeToRetry: false,
      nextStep: { kind: "read_state", tool: "unity_console", action: "count", reason: "Read Console count before deciding whether to retry clear." },
    });
  }

  return consoleClearResultFromHostResult(hostResult.result, workflow.projectRoot);
}

function boundedInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
```

- [x] **步骤 3：运行 TS console tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 TS 能把 trusted Unity host console envelopes 映射为 `unity_console` results，snapshot success 依赖 Phase 5B Resource readback，clear 需要 explicit confirmation，并且 count/snapshot/cursor/clear evidence 不声称 compile success。

- [x] **步骤 4：运行 existing TS regression tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-04 没有破坏 5C-01 editor workflows、5C-02/03 compile workflows、Phase 5A host runtime 或 Phase 5B artifact/resource/timeout/completion contracts。

- [x] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/console.ts plugins/unity-agent-kit/src/workflows/console.ts plugins/unity-agent-kit/tests/console-workflows.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5c console workflows

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Unity console diagnostics contract tests

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [x] **步骤 1：编写失败的 Unity console diagnostics tests**

在 `unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` 的 `CompileCollectorSubscriptionLossClearsRecentReportProof` 测试后追加：

```csharp
        [Test]
        public void ConsoleCursorRoundTripsContinuityFields()
        {
            var cursor = new UnityAgentKitConsoleCursor
            {
                hostId = "host-console",
                hostEpoch = 9,
                consoleGeneration = 2,
                startIndex = 12,
                createdAt = "2026-05-27T10:00:00.0000000Z"
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleCursor>(JsonUtility.ToJson(cursor));

            Assert.AreEqual("host-console", roundTrip.hostId);
            Assert.AreEqual(9, roundTrip.hostEpoch);
            Assert.AreEqual(2, roundTrip.consoleGeneration);
            Assert.AreEqual(12, roundTrip.startIndex);
            Assert.IsNotEmpty(roundTrip.createdAt);
        }

        [Test]
        public void ConsoleCountResultRoundTripsBoundedSeverityEvidence()
        {
            var result = new UnityAgentKitConsoleCountResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                totalCount = 1000,
                counts = new UnityAgentKitConsoleCounts { error = 1, warning = 2, log = 497 },
                severityScan = new UnityAgentKitConsoleSeverityScan
                {
                    scannedCount = 500,
                    startIndex = 500,
                    endIndexExclusive = 1000,
                    limit = 500,
                    severityBreakdownComplete = false
                },
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 2, startIndex = 1000, createdAt = "2026-05-27T10:00:00.0000000Z" },
                consoleGeneration = 2,
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new[] { new UnityAgentKitDiagnostic { source = "console", severity = "warning", code = "console.severity_breakdown_partial", message = "Severity breakdown scanned the bounded tail window only." } }
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleCountResult>(JsonUtility.ToJson(result));

            Assert.AreEqual(1000, roundTrip.totalCount);
            Assert.AreEqual(1, roundTrip.counts.error);
            Assert.AreEqual(500, roundTrip.severityScan.scannedCount);
            Assert.IsFalse(roundTrip.severityScan.severityBreakdownComplete);
            Assert.AreEqual(1000, roundTrip.cursor.startIndex);
            Assert.AreEqual("console.severity_breakdown_partial", roundTrip.diagnostics[0].code);
        }

        [Test]
        public void ConsoleSnapshotResultRoundTripsResourceAndRangeFields()
        {
            var result = new UnityAgentKitConsoleSnapshotResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                artifactId = "console-20260527-100000",
                uri = "unity://console-snapshots/console-20260527-100000",
                counts = new UnityAgentKitConsoleCounts { error = 1, warning = 1, log = 1 },
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 2, startIndex = 15, createdAt = "2026-05-27T10:00:00.0000000Z" },
                range = new UnityAgentKitConsoleSnapshotRange { startIndex = 12, endIndexExclusive = 15, totalCountAtCapture = 15, limit = 200, truncated = false },
                entryCount = 3,
                includeStackTrace = false,
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new UnityAgentKitDiagnostic[0]
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleSnapshotResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("console-20260527-100000", roundTrip.artifactId);
            Assert.AreEqual("unity://console-snapshots/console-20260527-100000", roundTrip.uri);
            Assert.AreEqual(12, roundTrip.range.startIndex);
            Assert.AreEqual(15, roundTrip.range.endIndexExclusive);
            Assert.AreEqual(3, roundTrip.entryCount);
            Assert.IsFalse(roundTrip.includeStackTrace);
        }

        [Test]
        public void ConsoleClearResultRoundTripsVerifiedCountAndGenerationEvidence()
        {
            var result = new UnityAgentKitConsoleClearResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-console",
                hostEpoch = 9,
                explicitClear = true,
                cleared = true,
                countBeforeClear = 12,
                countAfterClear = 0,
                consoleGenerationBeforeClear = 2,
                consoleGenerationAfterClear = 3,
                cursor = new UnityAgentKitConsoleCursor { hostId = "host-console", hostEpoch = 9, consoleGeneration = 3, startIndex = 0, createdAt = "2026-05-27T10:00:00.0000000Z" },
                capturedMainThreadId = 7,
                executionThreadId = 7,
                diagnostics = new UnityAgentKitDiagnostic[0]
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitConsoleClearResult>(JsonUtility.ToJson(result));

            Assert.IsTrue(roundTrip.explicitClear);
            Assert.IsTrue(roundTrip.cleared);
            Assert.AreEqual(12, roundTrip.countBeforeClear);
            Assert.AreEqual(0, roundTrip.countAfterClear);
            Assert.AreEqual(2, roundTrip.consoleGenerationBeforeClear);
            Assert.AreEqual(3, roundTrip.consoleGenerationAfterClear);
            Assert.AreEqual(3, roundTrip.cursor.consoleGeneration);
        }

        [Test]
        public void ConsoleOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.count "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.snapshot "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" console.clear "));

            var countResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.count", requestId = "req-console-count-direct" }, TestHostRecord());
            var snapshotResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.snapshot", requestId = "req-console-snapshot-direct" }, TestHostRecord());
            var clearResponse = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest { operation = "console.clear", requestId = "req-console-clear-direct" }, TestHostRecord());

            Assert.AreEqual("rejected", countResponse.status);
            Assert.AreEqual("host.dispatch_required", countResponse.code);
            Assert.AreEqual("rejected", snapshotResponse.status);
            Assert.AreEqual("host.dispatch_required", snapshotResponse.code);
            Assert.AreEqual("rejected", clearResponse.status);
            Assert.AreEqual("host.dispatch_required", clearResponse.code);
        }

        [Test]
        public void ConsoleCountSeamUsesRealTotalAndBoundedSeverityScan()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var entries = new[]
            {
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(0, "old error", string.Empty, "Error"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(1, "new warning", string.Empty, "Warning"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(2, "new log", string.Empty, "Log")
            };

            var result = UnityAgentKitConsoleDiagnostics.CountForTests(TestHostRecord(), 7, maxSeverityScan: 2, entries: entries);

            Assert.AreEqual(3, result.totalCount);
            Assert.AreEqual(0, result.counts.error);
            Assert.AreEqual(1, result.counts.warning);
            Assert.AreEqual(1, result.counts.log);
            Assert.AreEqual(2, result.severityScan.scannedCount);
            Assert.AreEqual(1, result.severityScan.startIndex);
            Assert.AreEqual(3, result.severityScan.endIndexExclusive);
            Assert.IsFalse(result.severityScan.severityBreakdownComplete);
            Assert.AreEqual("console.severity_breakdown_partial", result.diagnostics[0].code);
        }

        [Test]
        public void ConsoleSnapshotSeamWritesBoundedArtifactAndMetadata()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var artifactRoot = TemporaryConsoleArtifactRoot("snapshot");
            var record = TestHostRecord();
            var entries = new[]
            {
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(0, "old error", "stack", "Error"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(1, "new warning", "stack", "Warning"),
                UnityAgentKitConsoleDiagnostics.CreateEntryForTests(2, "new log", "stack", "Log")
            };

            var result = UnityAgentKitConsoleDiagnostics.SnapshotForTests(record, 7, "{\"limit\":2,\"includeStackTrace\":false}", entries, artifactRoot);
            var payloadPath = System.IO.Path.Combine(artifactRoot, "console-snapshots", result.artifactId + ".json");
            var metadataPath = System.IO.Path.Combine(artifactRoot, "metadata", "console-snapshots", result.artifactId + ".json");
            var payloadText = System.IO.File.ReadAllText(payloadPath);
            var metadata = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(System.IO.File.ReadAllText(metadataPath));

            Assert.AreEqual(2, result.entryCount);
            Assert.AreEqual(1, result.range.startIndex);
            Assert.AreEqual(3, result.range.endIndexExclusive);
            Assert.IsTrue(result.range.truncated);
            Assert.IsTrue(System.IO.File.Exists(payloadPath));
            Assert.IsTrue(payloadText.Contains("new warning"));
            Assert.IsFalse(payloadText.Contains("old error"));
            Assert.AreEqual("console_snapshot", metadata.type);
            Assert.AreEqual("unity_console", metadata.producerTool);
            Assert.AreEqual("snapshot", metadata.producerAction);
            Assert.AreEqual("valid", metadata.validationStatus);
        }

        [Test]
        public void ConsoleSnapshotInvalidCursorReturnsUncertainOperationResponse()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var inputJson = "{\"limit\":10,\"cursor\":{\"hostId\":\"other\",\"hostEpoch\":7,\"consoleGeneration\":0,\"startIndex\":0,\"createdAt\":\"2026-05-27T10:00:00.0000000Z\"}}";

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.snapshot",
                requestId = "req-console-invalid-cursor",
                inputJson = inputJson
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("uncertain", response.status);
            Assert.AreEqual("console.cursor_invalid", response.code);
        }

        [Test]
        public void ConsoleClearRequiresExplicitInputAndDoesNotIncrementGeneration()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.clear",
                requestId = "req-console-clear-not-explicit",
                inputJson = "{}"
            }, TestHostRecord(), System.Threading.Thread.CurrentThread.ManagedThreadId);

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("console.clear_requires_explicit_confirmation", response.code);
        }

        [Test]
        public void ConsoleClearSeamVerifiesCountAndIncrementsGenerationOnlyAfterSuccess()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var clearCalls = 0;
            var result = UnityAgentKitConsoleDiagnostics.ClearForTests(
                TestHostRecord(),
                7,
                "{\"confirmClear\":true}",
                countBeforeClear: 3,
                countAfterClear: 0,
                clearConsole: () => clearCalls += 1);

            Assert.IsTrue(result.explicitClear);
            Assert.IsTrue(result.cleared);
            Assert.AreEqual(3, result.countBeforeClear);
            Assert.AreEqual(0, result.countAfterClear);
            Assert.AreEqual(0, result.consoleGenerationBeforeClear);
            Assert.AreEqual(1, result.consoleGenerationAfterClear);
            Assert.AreEqual(1, clearCalls);
        }

        [Test]
        public void ConsoleClearSeamDoesNotIncrementGenerationWhenVerificationFails()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var result = UnityAgentKitConsoleDiagnostics.ClearForTests(
                TestHostRecord(),
                7,
                "{\"confirmClear\":true}",
                countBeforeClear: 3,
                countAfterClear: 2,
                clearConsole: () => { });

            Assert.IsFalse(result.cleared);
            Assert.AreEqual(0, result.consoleGenerationBeforeClear);
            Assert.AreEqual(0, result.consoleGenerationAfterClear);
            Assert.AreEqual(2, result.countAfterClear);
        }

        [Test]
        public void ConsoleLogEntriesReflectionSmokeReadsControlledLogEntry()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var uniqueMessage = "UnityAgentKit console reflection smoke " + System.Guid.NewGuid().ToString("N");
            Debug.Log(uniqueMessage);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.snapshot",
                requestId = "req-console-snapshot-smoke",
                inputJson = "{\"limit\":50,\"includeStackTrace\":false}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.snapshot", "req-console-snapshot-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleSnapshotResult>(response.data);
            var payloadPath = System.IO.Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), "console-snapshots", data.artifactId + ".json");
            var payloadText = System.IO.File.ReadAllText(payloadPath);

            Assert.LessOrEqual(data.entryCount, 50);
            Assert.GreaterOrEqual(data.range.totalCountAtCapture, 1);
            Assert.IsTrue(payloadText.Contains(uniqueMessage));
        }

        [Test]
        public void ConsoleClearReflectionSmokeClearsControlledLogAndIncrementsGeneration()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            Debug.Log("UnityAgentKit console clear smoke " + System.Guid.NewGuid().ToString("N"));

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.clear",
                requestId = "req-console-clear-smoke",
                inputJson = "{\"confirmClear\":true}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.clear", "req-console-clear-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleClearResult>(response.data);
            Assert.IsTrue(data.explicitClear);
            Assert.IsTrue(data.cleared);
            Assert.GreaterOrEqual(data.countBeforeClear, 1);
            Assert.AreEqual(0, data.countAfterClear);
            Assert.Greater(data.consoleGenerationAfterClear, data.consoleGenerationBeforeClear);
            Assert.AreEqual(data.consoleGenerationAfterClear, data.cursor.consoleGeneration);
        }
```

在 `CoreDiagnosticsTests` class 内现有 helper 附近追加：

```csharp
        private static string TemporaryConsoleArtifactRoot(string testName)
        {
            var directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "UnityAgentKitConsoleTests", testName, System.Guid.NewGuid().ToString("N"), "artifacts");
            System.IO.Directory.CreateDirectory(directory);
            return directory;
        }
```

- [x] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-red.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：FAIL，Unity compile error 包含 `UnityAgentKitConsoleCursor`、`UnityAgentKitConsoleCountResult`、`UnityAgentKitConsoleDiagnostics` 或 `console.count` 相关 symbol 不存在。

证明：该 red 证明 Unity C# 侧尚未实现 5C-04 console diagnostics operations。

- [x] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5c console diagnostics tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Unity console diagnostics operations

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`

- [x] **步骤 1：添加 Unity console DTOs**

在 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` 的 `UnityAgentKitCompileReportResult` 后追加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitConsoleCursor
    {
        public string hostId = string.Empty;
        public int hostEpoch;
        public int consoleGeneration;
        public int startIndex;
        public string createdAt = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCounts
    {
        public int error;
        public int warning;
        public int log;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSeverityScan
    {
        public int scannedCount;
        public int startIndex;
        public int endIndexExclusive;
        public int limit;
        public bool severityBreakdownComplete;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotRange
    {
        public int startIndex;
        public int endIndexExclusive;
        public int totalCountAtCapture;
        public int limit;
        public bool truncated;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleEntryRecord
    {
        public int index;
        public int entryId;
        public string severity = string.Empty;
        public string message = string.Empty;
        public string stackTrace = string.Empty;
        public string mode = string.Empty;
        public string attribution = string.Empty;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCountInput
    {
        public int maxSeverityScan = 500;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotInput
    {
        public int limit = 200;
        public bool includeStackTrace;
        public UnityAgentKitConsoleCursor cursor = null;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleClearInput
    {
        public bool confirmClear;
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleCountResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public int totalCount;
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleSeverityScan severityScan = new UnityAgentKitConsoleSeverityScan();
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public int consoleGeneration;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotPayload
    {
        public int schemaVersion;
        public string artifactId = string.Empty;
        public string createdAt = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public UnityAgentKitConsoleSnapshotRange range = new UnityAgentKitConsoleSnapshotRange();
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleEntryRecord[] entries = Array.Empty<UnityAgentKitConsoleEntryRecord>();
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleSnapshotResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string artifactId = string.Empty;
        public string uri = string.Empty;
        public UnityAgentKitConsoleCounts counts = new UnityAgentKitConsoleCounts();
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public UnityAgentKitConsoleSnapshotRange range = new UnityAgentKitConsoleSnapshotRange();
        public int entryCount;
        public bool includeStackTrace;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitConsoleClearResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public bool explicitClear;
        public bool cleared;
        public int countBeforeClear;
        public int countAfterClear;
        public int consoleGenerationBeforeClear;
        public int consoleGenerationAfterClear;
        public UnityAgentKitConsoleCursor cursor = new UnityAgentKitConsoleCursor();
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
```

保留文件顶部已有 `using System;`。

- [x] **步骤 2：增加 console snapshot artifact writer wrapper**

在 `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` 的 `WriteSyntheticReport` 后追加：

```csharp
        internal static UnityAgentKitArtifactMetadataRecord WriteConsoleSnapshotArtifact(
            string artifactRoot,
            string artifactId,
            string payload,
            UnityAgentKitHostRecord hostRecord)
        {
            return WriteSyntheticArtifact(
                artifactRoot,
                artifactId,
                "console_snapshot",
                "console-snapshots/" + artifactId + ".json",
                payload,
                hostRecord,
                "snapshot");
        }
```

该 wrapper 复用 Phase 5B metadata layout，并保持 `producerTool = "unity_console"`、`producerAction = "snapshot"`。不要创建 MCP Resource handler。

- [x] **步骤 3：实现 Unity console diagnostics short operations**

创建 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`：

```csharp
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitConsoleDiagnostics
    {
        private const int ErrorMask = 0x804100;
        private const int WarningMask = 0x804200;
        private const int LogMask = 0x804400;
        private static int consoleGeneration;

        internal static UnityAgentKitConsoleCountResult Count(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson)
        {
            var input = ReadCountInput(inputJson);
            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var totalCount = reader.GetCount();
            var maxSeverityScan = Bound(input.maxSeverityScan, 1, 1000, 500);
            var startIndex = Math.Max(0, totalCount - maxSeverityScan);
            var boundedEntries = reader.ReadEntries(startIndex, totalCount, includeStackTrace: false);
            return CountFromBoundedEntries(record, capturedMainThreadId, totalCount, startIndex, maxSeverityScan, boundedEntries);
        }

        internal static UnityAgentKitConsoleSnapshotResult Snapshot(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, string artifactRoot)
        {
            var input = ReadSnapshotInput(inputJson);
            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var totalCount = reader.GetCount();
            var limit = Bound(input.limit, 1, 500, 200);
            var requestedStartIndex = input.cursor != null ? input.cursor.startIndex : 0;
            if (input.cursor != null && !CursorMatches(record, input.cursor, totalCount))
            {
                throw new ConsoleCursorInvalidException();
            }

            var startIndex = Math.Max(0, Math.Min(requestedStartIndex, totalCount));
            var endIndexExclusive = totalCount;
            var rawRangeCount = Math.Max(0, endIndexExclusive - startIndex);
            var truncated = rawRangeCount > limit;
            if (truncated)
            {
                startIndex = endIndexExclusive - limit;
            }

            var boundedEntries = reader.ReadEntries(startIndex, endIndexExclusive, input.includeStackTrace);
            return SnapshotFromBoundedEntries(record, capturedMainThreadId, input.includeStackTrace, limit, totalCount, startIndex, endIndexExclusive, truncated, boundedEntries, artifactRoot);
        }

        internal static UnityAgentKitConsoleClearResult Clear(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson)
        {
            var input = ReadClearInput(inputJson);
            if (!input.confirmClear)
            {
                throw new ConsoleClearNotExplicitException();
            }

            var reader = UnityConsoleReader.Create();
            if (!reader.available)
            {
                throw new ConsoleReflectionUnavailableException(reader.errorMessage);
            }

            var before = reader.GetCount();
            var generationBefore = consoleGeneration;
            reader.Clear();
            var after = reader.GetCount();
            var cleared = after == 0;
            if (cleared)
            {
                consoleGeneration += 1;
            }

            return CreateClearResult(record, capturedMainThreadId, explicitClear: true, cleared, before, after, generationBefore, consoleGeneration);
        }

        internal static UnityAgentKitConsoleEntryRecord CreateEntryForTests(int index, string message, string stackTrace, string severity)
        {
            return new UnityAgentKitConsoleEntryRecord
            {
                index = index,
                entryId = index,
                severity = severity.ToLowerInvariant(),
                message = message ?? string.Empty,
                stackTrace = stackTrace ?? string.Empty,
                mode = severity ?? string.Empty,
                attribution = "unattributed"
            };
        }

        internal static UnityAgentKitConsoleCountResult CountForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, int maxSeverityScan, UnityAgentKitConsoleEntryRecord[] entries)
        {
            var allEntries = entries ?? Array.Empty<UnityAgentKitConsoleEntryRecord>();
            var limit = Bound(maxSeverityScan, 1, 1000, 500);
            var startIndex = Math.Max(0, allEntries.Length - limit);
            return CountFromBoundedEntries(record, capturedMainThreadId, allEntries.Length, startIndex, limit, SliceEntries(allEntries, startIndex, allEntries.Length, includeStackTrace: false));
        }

        internal static UnityAgentKitConsoleSnapshotResult SnapshotForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, UnityAgentKitConsoleEntryRecord[] entries, string artifactRoot)
        {
            var input = ReadSnapshotInput(inputJson);
            var allEntries = entries ?? Array.Empty<UnityAgentKitConsoleEntryRecord>();
            var limit = Bound(input.limit, 1, 500, 200);
            var totalCount = allEntries.Length;
            var requestedStartIndex = input.cursor != null ? input.cursor.startIndex : 0;
            if (input.cursor != null && !CursorMatches(record, input.cursor, totalCount))
            {
                throw new ConsoleCursorInvalidException();
            }

            var startIndex = Math.Max(0, Math.Min(requestedStartIndex, totalCount));
            var endIndexExclusive = totalCount;
            var rawRangeCount = Math.Max(0, endIndexExclusive - startIndex);
            var truncated = rawRangeCount > limit;
            if (truncated)
            {
                startIndex = endIndexExclusive - limit;
            }

            return SnapshotFromBoundedEntries(record, capturedMainThreadId, input.includeStackTrace, limit, totalCount, startIndex, endIndexExclusive, truncated, SliceEntries(allEntries, startIndex, endIndexExclusive, input.includeStackTrace), artifactRoot);
        }

        internal static UnityAgentKitConsoleClearResult ClearForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, string inputJson, int countBeforeClear, int countAfterClear, Action clearConsole)
        {
            var input = ReadClearInput(inputJson);
            if (!input.confirmClear)
            {
                throw new ConsoleClearNotExplicitException();
            }

            var beforeGeneration = consoleGeneration;
            clearConsole();
            var cleared = countAfterClear == 0;
            if (cleared)
            {
                consoleGeneration += 1;
            }

            return CreateClearResult(record, capturedMainThreadId, true, cleared, countBeforeClear, countAfterClear, beforeGeneration, consoleGeneration);
        }

        internal static void ResetForTests()
        {
            consoleGeneration = 0;
        }

        private static UnityAgentKitConsoleCountResult CountFromBoundedEntries(UnityAgentKitHostRecord record, int capturedMainThreadId, int totalCount, int startIndex, int maxSeverityScan, UnityAgentKitConsoleEntryRecord[] boundedEntries)
        {
            var counts = CountRange(boundedEntries, 0, boundedEntries.Length);
            var complete = startIndex == 0;
            return new UnityAgentKitConsoleCountResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                totalCount = totalCount,
                counts = counts,
                severityScan = new UnityAgentKitConsoleSeverityScan
                {
                    scannedCount = boundedEntries.Length,
                    startIndex = startIndex,
                    endIndexExclusive = totalCount,
                    limit = maxSeverityScan,
                    severityBreakdownComplete = complete
                },
                cursor = CreateCursor(record, totalCount),
                consoleGeneration = consoleGeneration,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = complete ? Array.Empty<UnityAgentKitDiagnostic>() : new[] { Diagnostic("warning", "console.severity_breakdown_partial", "Severity breakdown scanned the bounded tail window only.") }
            };
        }

        private static UnityAgentKitConsoleSnapshotResult SnapshotFromBoundedEntries(UnityAgentKitHostRecord record, int capturedMainThreadId, bool includeStackTrace, int limit, int totalCount, int startIndex, int endIndexExclusive, bool truncated, UnityAgentKitConsoleEntryRecord[] selected, string artifactRoot)
        {
            var artifactId = "console-" + DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff");
            var createdAt = DateTimeOffset.UtcNow.ToString("O");
            var cursor = CreateCursor(record, totalCount);
            var counts = CountRange(selected, 0, selected.Length);
            var range = new UnityAgentKitConsoleSnapshotRange
            {
                startIndex = startIndex,
                endIndexExclusive = endIndexExclusive,
                totalCountAtCapture = totalCount,
                limit = limit,
                truncated = truncated
            };
            var payload = new UnityAgentKitConsoleSnapshotPayload
            {
                schemaVersion = 1,
                artifactId = artifactId,
                createdAt = createdAt,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                cursor = cursor,
                range = range,
                counts = counts,
                entries = selected,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            UnityAgentKitArtifactContracts.WriteConsoleSnapshotArtifact(artifactRoot, artifactId, JsonUtility.ToJson(payload, true) + Environment.NewLine, record);

            return new UnityAgentKitConsoleSnapshotResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                artifactId = artifactId,
                uri = "unity://console-snapshots/" + artifactId,
                counts = counts,
                cursor = cursor,
                range = range,
                entryCount = selected.Length,
                includeStackTrace = includeStackTrace,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static UnityAgentKitConsoleClearResult CreateClearResult(UnityAgentKitHostRecord record, int capturedMainThreadId, bool explicitClear, bool cleared, int before, int after, int generationBefore, int generationAfter)
        {
            return new UnityAgentKitConsoleClearResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                explicitClear = explicitClear,
                cleared = cleared,
                countBeforeClear = before,
                countAfterClear = after,
                consoleGenerationBeforeClear = generationBefore,
                consoleGenerationAfterClear = generationAfter,
                cursor = CreateCursor(record, after),
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = cleared ? Array.Empty<UnityAgentKitDiagnostic>() : new[] { Diagnostic("error", "console.clear_verification_failed", "Console clear did not produce zero-count evidence.") }
            };
        }

        private static UnityAgentKitConsoleEntryRecord[] SliceEntries(UnityAgentKitConsoleEntryRecord[] entries, int startIndex, int endIndexExclusive, bool includeStackTrace)
        {
            var list = new List<UnityAgentKitConsoleEntryRecord>();
            for (var index = startIndex; index < endIndexExclusive && index < entries.Length; index++)
            {
                var entry = entries[index];
                list.Add(new UnityAgentKitConsoleEntryRecord
                {
                    index = index,
                    entryId = entry.entryId,
                    severity = entry.severity,
                    message = entry.message,
                    stackTrace = includeStackTrace ? entry.stackTrace : string.Empty,
                    mode = entry.mode,
                    attribution = "unattributed"
                });
            }

            return list.ToArray();
        }

        private static UnityAgentKitConsoleCounts CountRange(UnityAgentKitConsoleEntryRecord[] entries, int startIndex, int endIndexExclusive)
        {
            var counts = new UnityAgentKitConsoleCounts();
            for (var index = startIndex; index < endIndexExclusive && index < entries.Length; index++)
            {
                var severity = (entries[index].severity ?? string.Empty).ToLowerInvariant();
                if (severity == "error")
                {
                    counts.error += 1;
                }
                else if (severity == "warning")
                {
                    counts.warning += 1;
                }
                else
                {
                    counts.log += 1;
                }
            }

            return counts;
        }

        private static UnityAgentKitConsoleCursor CreateCursor(UnityAgentKitHostRecord record, int startIndex)
        {
            return new UnityAgentKitConsoleCursor
            {
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                consoleGeneration = consoleGeneration,
                startIndex = Math.Max(0, startIndex),
                createdAt = DateTimeOffset.UtcNow.ToString("O")
            };
        }

        private static bool CursorMatches(UnityAgentKitHostRecord record, UnityAgentKitConsoleCursor cursor, int totalCount)
        {
            return cursor.hostId == (record != null ? record.hostId : string.Empty) &&
                cursor.hostEpoch == (record != null ? record.hostEpoch : 0) &&
                cursor.consoleGeneration == consoleGeneration &&
                cursor.startIndex <= totalCount;
        }

        private static UnityAgentKitConsoleCountInput ReadCountInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleCountInput();
            }

            try { return JsonUtility.FromJson<UnityAgentKitConsoleCountInput>(inputJson) ?? new UnityAgentKitConsoleCountInput(); }
            catch (ArgumentException) { return new UnityAgentKitConsoleCountInput(); }
        }

        private static UnityAgentKitConsoleSnapshotInput ReadSnapshotInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleSnapshotInput();
            }

            try { return JsonUtility.FromJson<UnityAgentKitConsoleSnapshotInput>(inputJson) ?? new UnityAgentKitConsoleSnapshotInput(); }
            catch (ArgumentException) { return new UnityAgentKitConsoleSnapshotInput(); }
        }

        private static UnityAgentKitConsoleClearInput ReadClearInput(string inputJson)
        {
            if (string.IsNullOrWhiteSpace(inputJson))
            {
                return new UnityAgentKitConsoleClearInput();
            }

            try { return JsonUtility.FromJson<UnityAgentKitConsoleClearInput>(inputJson) ?? new UnityAgentKitConsoleClearInput(); }
            catch (ArgumentException) { return new UnityAgentKitConsoleClearInput(); }
        }

        private static int Bound(int value, int min, int max, int fallback)
        {
            if (value <= 0)
            {
                value = fallback;
            }

            return Math.Min(max, Math.Max(min, value));
        }

        private static UnityAgentKitDiagnostic Diagnostic(string severity, string code, string message)
        {
            return new UnityAgentKitDiagnostic { source = "console", severity = severity, code = code, message = message };
        }

        private sealed class UnityConsoleReader
        {
            internal readonly bool available;
            internal readonly string errorMessage;
            private readonly Type logEntriesType;
            private readonly Type logEntryType;
            private readonly MethodInfo getCountMethod;
            private readonly MethodInfo getEntryMethod;
            private readonly MethodInfo clearMethod;
            private readonly FieldInfo messageField;
            private readonly FieldInfo conditionField;
            private readonly FieldInfo modeField;
            private readonly FieldInfo instanceIdField;
            private readonly FieldInfo stackTraceField;

            private UnityConsoleReader(string errorMessage)
            {
                available = false;
                this.errorMessage = errorMessage;
            }

            private UnityConsoleReader(Type logEntriesType, Type logEntryType, MethodInfo getCountMethod, MethodInfo getEntryMethod, MethodInfo clearMethod)
            {
                available = true;
                errorMessage = string.Empty;
                this.logEntriesType = logEntriesType;
                this.logEntryType = logEntryType;
                this.getCountMethod = getCountMethod;
                this.getEntryMethod = getEntryMethod;
                this.clearMethod = clearMethod;
                const BindingFlags fieldFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance;
                messageField = logEntryType.GetField("message", fieldFlags);
                conditionField = logEntryType.GetField("condition", fieldFlags);
                modeField = logEntryType.GetField("mode", fieldFlags);
                instanceIdField = logEntryType.GetField("instanceID", fieldFlags);
                stackTraceField = logEntryType.GetField("stackTrace", fieldFlags);
            }

            internal static UnityConsoleReader Create()
            {
                var logEntriesType = Type.GetType("UnityEditor.LogEntries,UnityEditor.dll");
                var logEntryType = Type.GetType("UnityEditor.LogEntry,UnityEditor.dll");
                if (logEntriesType == null || logEntryType == null)
                {
                    return new UnityConsoleReader("Console reflection types are unavailable for this Unity version.");
                }

                const BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
                var getCountMethod = logEntriesType.GetMethod("GetCount", flags);
                var getEntryMethod = ResolveGetEntryInternalMethod(logEntriesType, logEntryType);
                var clearMethod = logEntriesType.GetMethod("Clear", flags);
                if (getCountMethod == null || getEntryMethod == null || clearMethod == null)
                {
                    return new UnityConsoleReader("Console reflection methods are unavailable for this Unity version.");
                }

                return new UnityConsoleReader(logEntriesType, logEntryType, getCountMethod, getEntryMethod, clearMethod);
            }

            internal int GetCount()
            {
                return (int)(getCountMethod.Invoke(null, null) ?? 0);
            }

            internal UnityAgentKitConsoleEntryRecord[] ReadEntries(int startIndex, int endIndexExclusive, bool includeStackTrace)
            {
                var safeStartIndex = Math.Max(0, startIndex);
                var safeEndIndexExclusive = Math.Max(safeStartIndex, endIndexExclusive);
                var entries = new List<UnityAgentKitConsoleEntryRecord>(safeEndIndexExclusive - safeStartIndex);
                var entry = Activator.CreateInstance(logEntryType);
                var secondParameterIsByRef = getEntryMethod.GetParameters()[1].ParameterType.IsByRef;
                for (var index = safeStartIndex; index < safeEndIndexExclusive; index++)
                {
                    var args = new[] { (object)index, entry };
                    getEntryMethod.Invoke(null, args);
                    if (secondParameterIsByRef && args[1] != null)
                    {
                        entry = args[1];
                    }

                    var message = (string)(messageField?.GetValue(entry) ?? conditionField?.GetValue(entry) ?? string.Empty);
                    var rawMode = (int)(modeField?.GetValue(entry) ?? 0);
                    var severity = NormalizeSeverity(rawMode, message);
                    entries.Add(new UnityAgentKitConsoleEntryRecord
                    {
                        index = index,
                        entryId = (int)(instanceIdField?.GetValue(entry) ?? index),
                        severity = severity.ToLowerInvariant(),
                        message = message,
                        stackTrace = includeStackTrace ? (string)(stackTraceField?.GetValue(entry) ?? string.Empty) : string.Empty,
                        mode = severity,
                        attribution = "unattributed"
                    });
                }

                return entries.ToArray();
            }

            internal void Clear()
            {
                clearMethod.Invoke(null, null);
            }
        }

        private static MethodInfo ResolveGetEntryInternalMethod(Type logEntriesType, Type logEntryType)
        {
            const BindingFlags methodFlags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
            foreach (var method in logEntriesType.GetMethods(methodFlags))
            {
                if (!string.Equals(method.Name, "GetEntryInternal", StringComparison.Ordinal))
                {
                    continue;
                }

                var parameters = method.GetParameters();
                if (parameters.Length != 2 || parameters[0].ParameterType != typeof(int))
                {
                    continue;
                }

                var secondType = parameters[1].ParameterType;
                if (secondType.IsByRef)
                {
                    secondType = secondType.GetElementType();
                }

                if (secondType == typeof(object) || secondType.IsAssignableFrom(logEntryType) || logEntryType.IsAssignableFrom(secondType))
                {
                    return method;
                }
            }

            return null;
        }

        private static string NormalizeSeverity(int rawModeValue, string message)
        {
            if ((rawModeValue & ErrorMask) == ErrorMask)
            {
                return "Error";
            }

            if ((rawModeValue & WarningMask) == WarningMask)
            {
                return "Warning";
            }

            if ((rawModeValue & LogMask) == LogMask)
            {
                return "Log";
            }

            if (!string.IsNullOrEmpty(message) && message.IndexOf("error", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Error";
            }

            if (!string.IsNullOrEmpty(message) && message.IndexOf("warning", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Warning";
            }

            return "Log";
        }
    }

    internal sealed class ConsoleReflectionUnavailableException : Exception
    {
        internal ConsoleReflectionUnavailableException(string message) : base(message) { }
    }

    internal sealed class ConsoleCursorInvalidException : Exception
    {
        internal ConsoleCursorInvalidException() : base("Console cursor is not valid for the active host generation.") { }
    }

    internal sealed class ConsoleClearNotExplicitException : Exception
    {
        internal ConsoleClearNotExplicitException() : base("Console clear requires explicit confirmation.") { }
    }
}
```

- [x] **步骤 4：Route console operations through main-thread dispatch**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中添加 operation constants：

```csharp
        internal const string ConsoleCountOperation = "console.count";
        internal const string ConsoleSnapshotOperation = "console.snapshot";
        internal const string ConsoleClearOperation = "console.clear";
```

把 `RequiresMainThreadDispatch` return expression 改为包含 console operations：

```csharp
            return normalized == ThreadCheckOperation ||
                normalized == EditorStatusGetOperation ||
                normalized == CompileStateGetOperation ||
                normalized == CompileRequestOperation ||
                normalized == CompileReportGetOperation ||
                normalized == ConsoleCountOperation ||
                normalized == ConsoleSnapshotOperation ||
                normalized == ConsoleClearOperation ||
                normalized == ThrowOperation ||
                normalized == PendingDispatchTimeoutOperation;
```

在 `RunOnMainThread` 的 `CompileReportGetOperation` 分支后添加：

```csharp
            if (operation == ConsoleCountOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Count(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty);
                    return Succeeded(operation, requestId, record, "Console count read.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }

            if (operation == ConsoleSnapshotOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Snapshot(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty, UnityAgentKitArtifactContracts.GetArtifactRoot());
                    return Succeeded(operation, requestId, record, "Console snapshot artifact written.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleCursorInvalidException exception)
                {
                    return Uncertain(operation, requestId, record, "console.cursor_invalid", exception.Message, startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }

            if (operation == ConsoleClearOperation)
            {
                try
                {
                    var result = UnityAgentKitConsoleDiagnostics.Clear(record, capturedMainThreadId, request != null ? request.inputJson ?? string.Empty : string.Empty);
                    return Succeeded(operation, requestId, record, result.cleared ? "Console clear verified." : "Console clear verification failed.", JsonUtility.ToJson(result), startedAt);
                }
                catch (ConsoleClearNotExplicitException exception)
                {
                    return Rejected(operation, requestId, record, "console.clear_requires_explicit_confirmation", exception.Message, startedAt);
                }
                catch (ConsoleReflectionUnavailableException exception)
                {
                    return Failed(operation, requestId, record, "console.reflection_unavailable", exception.Message, startedAt);
                }
            }
```

Do not route these operations in `Route`; direct route must keep returning `host.dispatch_required` through the generic main-thread guard.

- [x] **步骤 5：运行 Unity CoreDiagnostics tests 验证通过**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`，test log 中 `CoreDiagnosticsTests` 全部通过。

证明：该检查证明 Unity C# 能通过 deterministic seam 验证 bounded count/snapshot/cursor/clear generation，并通过真实 Unity EditMode runner 进行 `LogEntries` reflection smoke；Unity C# 没有执行长等待或 workflow polling。

- [x] **步骤 6：运行 HostRuntime dispatch regression tests**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 console operations 没有破坏 existing `/operations` envelope、main-thread dispatch、host timeout、stop/reload behavior。

- [x] **步骤 7：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5c console diagnostics operations

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：5C-04 integrated verification and scope guard

**文件：**
- 检查：`plugins/unity-agent-kit/src/diagnostics/console.ts`
- 检查：`plugins/unity-agent-kit/src/workflows/console.ts`
- 检查：`plugins/unity-agent-kit/tests/console-workflows.test.ts`
- 检查：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
- 检查：public MCP tools / registration / action-dispatch forbidden surface
- 检查：MCP Resource handler forbidden surface
- 检查：`/unity` skill forbidden surface
- 检查：Phase 5D test/playmode/screenshot workflows forbidden surface
- 检查：Phase 5E final daily loop E2E forbidden surface

- [ ] **步骤 1：运行 TS focused verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-04 TS workflow 与 5C-01、5C-02、5C-03、Phase 5A、Phase 5B TS contracts 同时成立。

- [ ] **步骤 2：运行 Unity focused verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity console count/snapshot/clear operations 在真实 Unity EditMode runner 中执行，并覆盖 deterministic seam + real `LogEntries` controlled-entry readback smoke + real reflected clear verification smoke。

- [ ] **步骤 3：运行 HostRuntime regression verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 console operations 没有破坏 host runtime routing、dispatch timeout、operation envelope 或 lifecycle cleanup。

- [ ] **步骤 4：运行 console snapshot Resource readback evidence check**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts --test-name-pattern "snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess"
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 `unity_console.snapshot` success path 需要 Phase 5B metadata + payload readback，而不是只信任 Unity operation envelope。

- [ ] **步骤 5：运行 scope guard**

运行：

```bash
test ! -e plugins/unity-agent-kit/src/tools && test ! -e plugins/unity-agent-kit/src/mcp && test ! -e plugins/unity-agent-kit/src/server.ts && test ! -e plugins/unity-agent-kit/src/index.ts && test ! -e plugins/unity-agent-kit/src/resources/handlers.ts && test ! -e plugins/unity-agent-kit/src/resources/mcp.ts && test ! -e plugins/unity-agent-kit/skills/unity && test ! -e plugins/unity-agent-kit/skills/unity.md && test ! -e plugins/unity-agent-kit/src/workflows/test.ts && test ! -e plugins/unity-agent-kit/src/workflows/playmode.ts && test ! -e plugins/unity-agent-kit/src/workflows/screenshot.ts && test ! -e plugins/unity-agent-kit/src/workflows/daily-loop.ts
```

预期：PASS，命令无输出且 exit code 为 `0`。

证明：该检查证明 5C-04 没有越界创建 public MCP tools / registration / action-dispatch surface、MCP Resource handlers、`/unity` skill、Phase 5D workflows 或 Phase 5E final daily loop E2E files。该 scope guard 是边界验证，不是 console behavior 验收；behavior 验收由 TS/Unity tests 完成。

- [ ] **步骤 6：运行 compile-success boundary textual check**

运行：

```bash
node -e "const fs=require('fs'); const paths=['plugins/unity-agent-kit/src/diagnostics/console.ts','plugins/unity-agent-kit/src/workflows/console.ts','unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs']; const text=paths.map(p=>fs.readFileSync(p,'utf8')).join('\n'); if (/verifiedCompileSuccess|compile_verified|compile success|编译成功/i.test(text)) { throw new Error('console code must not claim compile success'); }"
```

预期：PASS，命令无输出。

证明：该检查证明 5C-04 console code 不把 clean/empty Console 当作 compile success proof。

- [ ] **步骤 7：运行 diff formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：该检查证明新增/修改文件没有 trailing whitespace 或 patch formatting 问题。

- [ ] **步骤 8：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/console.ts plugins/unity-agent-kit/src/workflows/console.ts plugins/unity-agent-kit/tests/console-workflows.test.ts unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: verify phase 5c console workflows

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 6：5C-04 documentation evidence sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [ ] **步骤 1：更新 5C execution index 的 5C-04 row 和 evidence**

在 `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` 的 Candidate Plan Cards table 中，把 5C-04 row 的 `Expanded Plan` 改为：

```markdown
`docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`
```

执行完成后把 5C-04 row 的 `Status` 改为 `completed`，并追加：

```markdown
## Phase 5C-04 Completion Evidence

5C-04 Console count/snapshot/clear + cursor/resource completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `failed="0"`.
3. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` passed with `failed="0"`.
4. Console snapshot Resource readback evidence passed through `tests/console-workflows.test.ts` and proved Phase 5B metadata + payload readback is required for `unity_console.snapshot` success.
5. Scope guard passed: no public MCP tools / registration / action-dispatch surface, no MCP Resource handlers, no `/unity` skill, no Phase 5D test/playmode/screenshot workflows, and no Phase 5E final daily loop E2E files were created by 5C-04.
6. Compile-success boundary check passed: console code does not claim `verifiedCompileSuccess`, `compile_verified`, or compile success from clean/empty Console evidence.
7. `git -c core.autocrlf=false diff --check` passed with no output.

5C-04 success evidence proves real bounded Console count/snapshot/clear behavior, cursor continuity fields, explicit clear verification, and Phase 5B-compatible Resource readback. It does not prove compile success; Console diagnostics remain supplemental.
```

Use the actual test counts from command output when filling evidence.

- [ ] **步骤 2：同步 Phase 5C combined completion evidence without completing Phase 5**

在 `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` 中确认 all active 5C cards are completed only after 5C-04 verification passes, then add a Phase 5C subplan evidence paragraph that includes:

```markdown
Phase 5C Core Diagnostics Workflows completed with evidence from 5C-01, 5C-02, 5C-03, and 5C-04. Combined evidence covers TS editor/compile/console workflow tests, Unity CoreDiagnosticsTests, Unity HostRuntimeTests regression for 5C-03 and 5C-04, targeted real Unity smoke for compile callback subscription and Console LogEntries readback, console snapshot Resource readback, scope boundary checks, and `git -c core.autocrlf=false diff --check`.

Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E are not completed.
```

Do not mark Roadmap Phase 5 completed in this task.

- [ ] **步骤 3：同步 parent Phase 5 plan index 的 Phase 5C row**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中把 Phase 5C row evidence text 改为：

```markdown
5C-01, 5C-02, 5C-03, and 5C-04 completed with evidence; Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E remain pending
```

把 Phase 5C row `Status` 只改为 `completed` when 5C execution index has combined evidence from all active cards. Do not set parent Phase 5 to `completed`.

- [ ] **步骤 4：更新 roadmap partial evidence 和 Next Manual Action**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中仅记录 5C-04 / Phase 5C partial completion evidence：

```markdown
5C-04 Console count/snapshot/clear + cursor/resource completed with evidence. Phase 5C Core Diagnostics Workflows completed with 5C-01 through 5C-04 evidence; Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E remain pending.
```

Next Manual Action 改为创建并审查 Phase 5D Test / PlayMode / Screenshot Workflows 的 spec/plan entry according to the Phase 5 plan index. Do not modify roadmap Goal、Non-goals、Shared Constraints、Phase 5 scope、Phase 5 success criteria or mark Phase 5 completed.

- [ ] **步骤 5：运行 docs/state checks**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md && git -c core.autocrlf=false diff --check
```

预期：diff 只包含 5C-04 expanded plan path、5C-04 evidence/status updates、Phase 5C combined completion evidence、Phase 5 plan index subplan evidence、roadmap partial evidence 和 next manual action；diff check 无输出。

证明：该检查证明 documentation state 只记录 5C-04/Phase 5C 完成事实，不把 Phase 5 提前标记 completed。

- [ ] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record phase 5c console evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：5C-04 covers `5C-CONSOLE-COUNT-01` real total count + bounded severity breakdown without fixed empty shortcut、`5C-CONSOLE-SNAPSHOT-01` bounded snapshot payload + short result、`5C-CONSOLE-CURSOR-01` hostId/hostEpoch/consoleGeneration/startIndex/createdAt cursor continuity fields、`5C-CONSOLE-CLEAR-01` explicit clear + verified count/generation evidence、`5C-RESOURCE-01` Phase 5B-compatible console snapshot metadata + Resource readback、`5C-HOST-01` rebind/continuity result boundaries、`5C-SCOPE-01` no public MCP tools/handlers/skill/5D/5E. Phase 5D workflows, Phase 5E public registration/skill/E2E, and compile success judgment are explicitly excluded and guarded.
- 占位符扫描：计划包含 concrete file paths、code snippets、commands、expected red/green outputs、proof statements and commit commands；未使用待定式执行语、裸泛化执行语或交叉引用式省略步骤。
- 类型一致性：TS consistently uses `ConsoleCursor`、`ConsoleCountSnapshot`、`ConsoleSnapshotSummary`、`ConsoleClearSnapshot`、`consoleCountOperation`、`consoleSnapshotOperation`、`consoleClearOperation`、`countConsole`、`snapshotConsole`、`clearConsole`；Unity consistently uses `UnityAgentKitConsoleCursor`、`UnityAgentKitConsoleCounts`、`UnityAgentKitConsoleCountResult`、`UnityAgentKitConsoleSnapshotResult`、`UnityAgentKitConsoleClearResult`、`UnityAgentKitConsoleDiagnostics.Count/Snapshot/Clear` and router constants `ConsoleCountOperation`、`ConsoleSnapshotOperation`、`ConsoleClearOperation`.
- 拆分检查：Phase 5C is already split by execution index into 5C-01 through 5C-04. This expanded plan executes only 5C-04 and remains independently testable after Phase 5A/5B.
- 上游约束覆盖：Roadmap Shared Constraints、Phase 5C spec、Phase 5C execution index review-carried bounded count constraint、Phase 5B Resource/readback semantics、host continuity and scope boundary decisions are mapped to tasks and verification.
- 参考输入映射：All referenced roadmap/spec/index/previous plan/current TS/C# files/Phase 5B Resource files/v2 console reference inputs have adopted and non-adopted decisions mapped to tasks.
- 验证强度：Behavior tasks use TS behavior tests and Unity EditMode tests for bounded count, snapshot Resource readback, invalid cursor, explicit clear, generation increment, reflection smoke, resource failure, and host rebind diagnostics; scope guard is explicitly boundary verification, not behavior acceptance. Plan requires red tests before implementation, green focused tests after implementation, regression tests, Resource evidence check, scope guard, compile-success boundary check, docs/state diff check and `git diff --check`.
