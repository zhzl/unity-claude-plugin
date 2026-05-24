# Unity Agent Kit Phase 5C-01 Editor Status / Readiness 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5C-01 的 editor status snapshot 和 `wait_ready` internal workflow，使 TS 能通过 Unity host 读取真实 Editor 状态并等待 ready。

**架构：** Unity C# 新增 `editor.status.get` 短主线程 operation，只读取 Editor 状态并返回 JSON snapshot。TS 新增 shared rebind-aware workflow helper、editor diagnostics/result mapping 与 `getEditorStatus`、`waitForEditorReady` workflows，复用 Phase 5A host trust boundary 和 Phase 5B timeout/completion semantics。计划不注册 public MCP tools，不创建 MCP Resource handlers，不创建 `/unity` skill，也不实现 compile/console/test/playmode/screenshot workflows。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`、`EditorApplication`、`Application`。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-01
**Spec:** `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md`
**Execution Index:** `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在任务汇报中列出未提交修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/src/diagnostics/editor.ts` — 定义 editor status snapshot contract、host data parser、ready predicate、host-result 到 `unity_editor` action result 的 mapping。
- 创建：`plugins/unity-agent-kit/src/workflows/rebind.ts` — 包装 Phase 5A `executeWithRebind`，在 successful pre-operation rebind 后返回 `rebound` 标志并追加 `host.rebound` diagnostic，供 5C-01 到 5C-04 复用。
- 创建：`plugins/unity-agent-kit/src/workflows/editor.ts` — 调用 shared rebind-aware helper 执行 `editor.status.get`，提供 `getEditorStatus` 和 `waitForEditorReady` internal workflows。
- 创建：`plugins/unity-agent-kit/tests/editor-workflows.test.ts` — TS 行为测试，覆盖 status mapping、ready judgment、timeout continuation、successful rebind diagnostic、`get_status` continuity failure propagation、`wait_ready` stop-on-lost。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs` — Unity C# 短操作读取 `EditorApplication` / `Application` 状态，计算 `isPlayModeChanging` 和 `isReady`。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 增加 `UnityAgentKitEditorStatusResult` DTO，使 JSON roundtrip 和 tests 有明确字段。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 增加 `editor.status.get` operation 常量、main-thread dispatch 分类和 `RunOnMainThread` routing。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` — Unity EditMode tests，覆盖 DTO roundtrip、operation dispatch classification、real status snapshot shape。
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` — 5C-01 完成后记录 status/evidence；执行本计划时只更新 5C-01 行。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 5C-01 完成后保留 Phase 5C `contract-ready`，并记录 execution index 已存在；不要把 Phase 5C 或 Phase 5 标记 completed。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 是 skills + public tools + internal operations + host runtime + resources 的完整操作体系；保留 v2 的 operation envelope、Unity host runtime、loopback HTTP host、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；TS 负责 workflow 编排、等待、轮询、timeout、host rebind、diagnostics、result convergence、最终 success/failure 判定；Unity C# 负责 Unity API 主线程执行、短动作、状态 snapshot、artifact/report 基础记录；禁止 Unity host 中长时间 `Thread.Sleep`、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程、后台线程直接调用 Unity API、Unity C# host 独占复杂 workflow 编排。
- **Phase Scope:** Phase 5C 覆盖 editor / compile / console core diagnostics workflows。5C-01 只交付 editor status snapshot 和 `wait_ready` internal workflow。
- **Phase Out-of-scope:** 5C-01 不实现 compile、console、test、playmode、screenshot、public MCP tool registration、MCP Resource handlers、`/unity` skill、Phase 5E E2E、artifact store 变更或 project command fallback。
- **Success Criteria:** TS `editor-workflows.test.ts` pass；existing TS host/runtime and Phase 5B tests remain pass；Unity `CoreDiagnosticsTests` pass；scope guard confirms no public MCP/tools/skill/Phase 5D/Phase 5E files; `git diff --check` pass；Phase 5A and Phase 5B remain completed；Phase 5 remains incomplete because 5C-02、5C-03、5C-04、Phase 5D、Phase 5E and final daily loop E2E are not completed by 5C-01。
- **用户确认事项:** Phase 5C covers all 9 editor/compile/console actions through plan cards；Phase 5C outputs internal TS workflows + Unity C# short operations only；`wait_ready` stays read-only and does not exit PlayMode；timeout values follow the Phase 5C table；host rebind invalidates in-flight proof unless evidence is re-established；5C-01 plan review decisions use deterministic per-poll request IDs (`<base>-1`, `<base>-2`), generic `Route()` dispatch-required guard via `RequiresMainThreadDispatch()`, shared rebind-aware workflow helper, and `get_status` failure propagation + `wait_ready` stop-on-lost tests。
- **本计划不包含:** 不提前完成 Phase 5C；不提前完成 Phase 5；不创建 public MCP tool registration/export/action-dispatch wiring；不创建 MCP Resource handlers；不创建 actual skill；不实现 compile/console workflows；不把 Unity C# host 变成 workflow 编排层。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | 5C-01 action semantics、TS/Unity ownership、timeout policy、host rebind/continuity rules、expected file ownership、verification matrix | 5C-02/5C-03/5C-04 implementation details | 本计划只执行 5C-01 | 任务 1-6 |
| `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | 5C-01 requirement IDs、scope boundary、completion rule、plan-card sequencing | 执行 index 本身 | Index 是覆盖和状态入口，不是 executable plan | 任务 6 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Shared Constraints：v2 host/runtime baseline、TS/Unity ownership、action completion semantics、artifact/test output path约束 | 修改 roadmap phase 结构或把 Phase 5 标记 completed | 5C-01 是 Phase 5C 内部 plan card | 任务 1-6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | Phase 5A/5B completed state、Phase 5C contract-ready/execution status rules、Phase 5 completion rule | 把 Phase 5C row 标记 completed 或把 Phase 5 标记 completed | 5C-01 只完成 editor card | 任务 6 |
| `plugins/unity-agent-kit/src/host/rebind.ts` | `executeWithRebind` registry/probe/invoke/continuity classification | 在 editor workflow 中重新实现 host rebind | Phase 5A 已提供 trust boundary；5C-01 只通过 shared helper 观察 successful rebind 并追加 diagnostic | 任务 1-2 |
| `plugins/unity-agent-kit/src/workflows/rebind.ts` | 新增 shared rebind-aware helper，记录 `host.rebound` diagnostic，但不改变 Phase 5A `executeWithRebind` 默认行为 | 修改 `executeWithRebind` 让所有调用自动追加 diagnostic | Phase 5A 已完成；compile/console 对 rebind 的 action-specific 判断不同 | 任务 1-2 |
| `plugins/unity-agent-kit/src/workflows/timeout.ts` | `timeoutContinuationResult` 和 readiness timeout category semantics | 在 Unity C# handler 内等待 ready | TS owns polling/timeout | 任务 1-2 |
| `plugins/unity-agent-kit/tests/host-runtime.test.ts` | Node built-in test style、fake transport/registry pattern、host continuity assertions | 把 editor workflow tests 塞入 host runtime tests | 保持 editor workflow tests 专注 | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | Operation normalization、main-thread dispatch classification、response envelope helper pattern | 新增 HTTP route 或绕过 `/operations` | Phase 5A `/operations` 已是 internal operation surface | 任务 3-4 |
| `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` 和 `HostRuntimeDispatchTests.cs` | NUnit/EditMode style、`AssertOperationEnvelopeMinimumFields` pattern、main-thread dispatch tests | 扩大 HostRuntimeTests 责任 | Core diagnostics tests 放入专门 test file | 任务 3 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/State/EditorStateProvider.cs` | Unity state API 读取方向：Editor busy/playmode/project/unity version | v2 public status shape、v2 operation names | Unity Agent Kit 使用 Phase 4 result enum 和 5C action contract | 任务 3-4 |

## 质量门

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS status workflow | shared rebind-aware helper + status data parser + action-specific result mapping | 8 | 缩小 fields 到 readiness 必需字段并补 parser tests |
| TS readiness polling | `waitForEditorReady` 在 TS 循环读取 status，使用 deterministic per-poll request IDs，timeout 使用 `timeoutContinuationResult` | 8 | 减少 polling API surface，不移入 Unity C# |
| Unity status operation | `editor.status.get` 主线程短操作读取 Editor state | 8 | 保留只读 snapshot，不加入状态变更 |
| PlayMode transition判断 | `isPlayModeChanging = isPlayingOrWillChangePlaymode != isPlaying`，不自动退出 PlayMode | 7 | 如果 Unity behavior 证据不稳定，只把该字段作为 diagnostic，并让 `wait_ready` 按 compile/update ready 判定；必须记录风险 |
| Scope boundary | 不创建 tools/mcp/skills/Phase 5D/Phase 5E files | 9 | 立刻移除越界文件并重跑 scope guard |

低于 7/10 的对象不得进入 5C-01 completion evidence。处理方式只能是修订方案、缩小 5C-01 evidence，或由用户逐条明确接受风险；不得使用 stub、固定结果、弱测试或只检查符号存在作为通过理由。

---

### 任务 1：TS editor workflow contract tests

**文件：**
- 创建：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`
- 读取参考：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 editor workflow tests**

创建 `plugins/unity-agent-kit/tests/editor-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  getEditorStatus,
  waitForEditorReady,
  type EditorWorkflowOptions,
} from "../src/workflows/editor.ts";
import {
  editorStatusOperation,
  isEditorReady,
  parseEditorStatusData,
  type EditorStatusSnapshot,
} from "../src/diagnostics/editor.ts";
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
    hostId: "host-editor",
    hostEpoch: 5,
    port: 49200,
    status: "ready",
    startedAt: "2026-05-23T10:00:00.000Z",
    lastProbeAt: "2026-05-23T10:00:01.000Z",
    ...overrides,
  };
}

function editorSnapshot(overrides: Partial<EditorStatusSnapshot> = {}): EditorStatusSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    isCompiling: false,
    isUpdating: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: false,
    isPlayModeChanging: false,
    isReady: true,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, snapshot: EditorStatusSnapshot, requestId: string): Record<string, unknown> {
  return {
    status: "succeeded",
    operation: editorStatusOperation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: "Editor status read.",
    data: JSON.stringify(snapshot),
    diagnostics: [],
    startedAt: "2026-05-23T10:00:00.000Z",
    completedAt: "2026-05-23T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): EditorWorkflowOptions["readRegistry"] {
  const queue = [...results];
  return async () => {
    const next = queue.shift();
    assert.ok(next, "registry queue exhausted");
    return next;
  };
}

function transportWithInvokes(record: UnityAgentKitHostRecord, invokes: HostTransportResult[]): HostTransport {
  return transportWithProbesAndInvokes([{ ok: true, statusCode: 200, body: record }], invokes);
}

function transportWithProbesAndInvokes(probes: HostTransportResult[], invokes: HostTransportResult[]): HostTransport {
  const probeQueue = [...probes];
  const invokeQueue = [...invokes];
  return {
    async probe() {
      const next = probeQueue.length > 1 ? probeQueue.shift() : probeQueue[0];
      assert.ok(next, "probe queue exhausted");
      return next;
    },
    async invokeOperation(_port, request) {
      assert.equal(request.operation, editorStatusOperation);
      assert.equal(typeof request.requestId, "string");
      const next = invokeQueue.shift();
      assert.ok(next, "invoke queue exhausted");
      return next;
    },
  };
}

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: EditorWorkflowOptions["readRegistry"]): EditorWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: readRegistry ?? (async () => ({ ok: true, record })),
  };
}

test("parseEditorStatusDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const snapshot = editorSnapshot();

  assert.deepEqual(parseEditorStatusData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseEditorStatusData("not-json"), null);
  assert.equal(parseEditorStatusData(JSON.stringify({ projectRoot: snapshot.projectRoot })), null);
});

test("isEditorReadyUsesCompileUpdateAndPlayModeTransitionOnly", () => {
  assert.equal(isEditorReady(editorSnapshot()), true);
  assert.equal(isEditorReady(editorSnapshot({ isCompiling: true, isReady: false })), false);
  assert.equal(isEditorReady(editorSnapshot({ isUpdating: true, isReady: false })), false);
  assert.equal(isEditorReady(editorSnapshot({ isPlayModeChanging: true, isReady: false })), false);
  assert.equal(isEditorReady(editorSnapshot({ isPlaying: true, isPlayingOrWillChangePlaymode: true, isReady: true })), true);
});

test("getEditorStatusMapsTrustedHostEnvelopeToUnityEditorAction", async () => {
  const record = sampleHostRecord();
  const snapshot = editorSnapshot();

  const result = await getEditorStatus(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-editor-status") },
  ])), { requestId: "req-editor-status" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_editor");
  assert.equal(result.action, "get_status");
  assert.equal(result.operation, editorStatusOperation);
  assert.deepEqual(result.data, snapshot);
  assert.deepEqual(result.evidence, { completion: "state_snapshot", ready: true });
});

test("getEditorStatusRejectsSnapshotProjectRootMismatch", async () => {
  const record = sampleHostRecord();
  const mismatched = editorSnapshot({ projectRoot: "D:/other/unity" });

  const result = await getEditorStatus(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(record, mismatched, "req-root-mismatch") },
  ])), { requestId: "req-root-mismatch" });

  assert.equal(result.status, "failed");
  assert.equal(result.action, "get_status");
  assert.equal(result.diagnostics[0]?.code, "editor.project_root_mismatch");
});

test("getEditorStatusRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const snapshot = editorSnapshot();

  const result = await getEditorStatus({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registrySequence([
      { ok: true, record: first },
      { ok: true, record: rebound },
      { ok: true, record: rebound },
    ]),
    transport: transportWithProbesAndInvokes([
      { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } },
      { ok: true, statusCode: 200, body: rebound },
    ], [
      { ok: true, statusCode: 200, body: succeededEnvelope(rebound, snapshot, "req-rebound") },
    ]),
  }, { requestId: "req-rebound" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === "host.rebound"));
});

test("getEditorStatusPreservesHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });

  const result = await getEditorStatus(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(stale, editorSnapshot(), "req-lost") },
  ])), { requestId: "req-lost" });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "get_status");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
});

test("waitForEditorReadyPollsUntilReadyWithoutMutatingPlayMode", async () => {
  const record = sampleHostRecord();
  const busy = editorSnapshot({ isCompiling: true, isReady: false });
  const ready = editorSnapshot();
  const sleeps: number[] = [];

  const result = await waitForEditorReady(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-ready-1") },
    { ok: true, statusCode: 200, body: succeededEnvelope(record, ready, "req-ready-2") },
  ])), {
    requestId: "req-ready",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async ms => { sleeps.push(ms); },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.evidence?.["completion"], "state_settled");
  assert.equal(result.evidence?.["playModeMutation"], "none");
  assert.deepEqual(sleeps, [25]);
});

test("waitForEditorReadyStopsOnHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });
  const sleeps: number[] = [];

  const result = await waitForEditorReady(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(stale, editorSnapshot({ isCompiling: true, isReady: false }), "req-lost-1") },
  ])), {
    requestId: "req-lost",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async ms => { sleeps.push(ms); },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  assert.deepEqual(sleeps, []);
});

test("waitForEditorReadyReturnsTimeoutWithReadStateNextStep", async () => {
  const record = sampleHostRecord();
  const busy = editorSnapshot({ isUpdating: true, isReady: false });

  const result = await waitForEditorReady(options(record, transportWithInvokes(record, [
    { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-timeout-1") },
    { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-timeout-2") },
  ])), {
    requestId: "req-timeout",
    timeoutMs: 1,
    pollIntervalMs: 1,
    sleep: async () => {},
    now: (() => {
      const values = [0, 2];
      return () => values.shift() ?? 2;
    })(),
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
});
```

- [x] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/workflows/editor.ts'` 或 `Cannot find module '../src/diagnostics/editor.ts'`。

证明：该 red 证明 5C-01 的 TS editor workflow 入口尚未存在。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/tests/editor-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: add phase 5c editor workflow contract tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：TS editor diagnostics and workflows

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/editor.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/rebind.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/editor.ts`
- 测试：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`

- [x] **步骤 1：实现 editor diagnostics contract**

创建 `plugins/unity-agent-kit/src/diagnostics/editor.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const editorStatusOperation = "editor.status.get" as const;

export interface EditorStatusSnapshot {
  projectRoot: string;
  unityVersion: string;
  isCompiling: boolean;
  isUpdating: boolean;
  isPlaying: boolean;
  isPlayingOrWillChangePlaymode: boolean;
  isPlayModeChanging: boolean;
  isReady: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export function parseEditorStatusData(data: unknown): EditorStatusSnapshot | null {
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
    typeof value.isPlaying === "boolean" &&
    typeof value.isPlayingOrWillChangePlaymode === "boolean" &&
    typeof value.isPlayModeChanging === "boolean" &&
    typeof value.isReady === "boolean" &&
    (value.capturedMainThreadId === undefined || (typeof value.capturedMainThreadId === "number" && Number.isInteger(value.capturedMainThreadId))) &&
    (value.executionThreadId === undefined || (typeof value.executionThreadId === "number" && Number.isInteger(value.executionThreadId)))
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    isPlaying: value.isPlaying,
    isPlayingOrWillChangePlaymode: value.isPlayingOrWillChangePlaymode,
    isPlayModeChanging: value.isPlayModeChanging,
    isReady: value.isReady,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function isEditorReady(snapshot: EditorStatusSnapshot): boolean {
  return !snapshot.isCompiling && !snapshot.isUpdating && !snapshot.isPlayModeChanging;
}

export function editorStatusResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_status" | "wait_ready",
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_editor",
      action,
      summary: hostResult.summary || "Editor status could not be read.",
    });
  }

  const snapshot = parseEditorStatusData(hostResult.data);
  if (snapshot === null) {
    const diagnostic: UnityAgentKitDiagnostic = {
      source: "workflow",
      severity: "error",
      code: "editor.status_invalid_shape",
      message: "Editor status operation returned an invalid data shape.",
      attribution: { operation: editorStatusOperation, requestId: hostResult.requestId },
    };

    return editorStatusFailureResult(hostResult, action, diagnostic, "The Unity host returned a status envelope that could not be parsed as an editor status snapshot.");
  }

  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    const diagnostic: UnityAgentKitDiagnostic = {
      source: "validation",
      severity: "error",
      code: "editor.project_root_mismatch",
      message: "Editor status projectRoot does not match the expected Unity project root.",
      details: {
        expectedProjectRoot,
        actualProjectRoot: snapshot.projectRoot,
      },
      attribution: { operation: editorStatusOperation, requestId: hostResult.requestId },
    };

    return editorStatusFailureResult(hostResult, action, diagnostic, "The Editor status snapshot did not match the expected Unity project root.");
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_editor",
    action,
    operation: editorStatusOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: snapshot.isReady ? "Editor is ready." : "Editor status read; Editor is not ready.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "state_snapshot",
      ready: isEditorReady(snapshot),
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function editorStatusFailureResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_status" | "wait_ready",
  diagnostic: UnityAgentKitDiagnostic,
  nextStepReason: string,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_editor",
    action,
    operation: editorStatusOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: diagnostic.message,
    code: diagnostic.code,
    message: diagnostic.message,
    diagnostics: [diagnostic],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: nextStepReason,
    },
  });
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
```

- [x] **步骤 2：实现 shared rebind-aware workflow helper**

创建 `plugins/unity-agent-kit/src/workflows/rebind.ts`：

```ts
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import { readHostRegistry, type UnityAgentKitHostRecord } from "../host/registry.ts";
import { executeWithRebind, type ExecuteWithRebindOptions, type RegistryReader } from "../host/rebind.ts";
import type { HostTransport, HostTransportResult, UnityAgentKitOperationRequest } from "../host/transport.ts";

export interface RebindAwareWorkflowResult {
  result: UnityAgentKitPublicResult;
  rebound: boolean;
}

export async function executeWithRebindAwareness(options: ExecuteWithRebindOptions): Promise<RebindAwareWorkflowResult> {
  let initialRecord: UnityAgentKitHostRecord | undefined;
  let firstProbeRequiredRebind = false;
  let probeCount = 0;
  const baseReadRegistry = options.readRegistry ?? readHostRegistry;

  const readRegistry: RegistryReader = async (registryPath, readOptions) => {
    const result = await baseReadRegistry(registryPath, readOptions);
    if (result.ok && initialRecord === undefined) {
      initialRecord = result.record;
    }

    return result;
  };

  const transport: HostTransport = {
    async probe(port: number): Promise<HostTransportResult> {
      const result = await options.transport.probe(port);
      probeCount += 1;
      if (probeCount === 1 && probeResultRequiresRebind(result, initialRecord)) {
        firstProbeRequiredRebind = true;
      }

      return result;
    },
    invokeOperation(port: number, request: UnityAgentKitOperationRequest): Promise<HostTransportResult> {
      return options.transport.invokeOperation(port, request);
    },
  };

  const result = await executeWithRebind({ ...options, readRegistry, transport });
  const rebound = firstProbeRequiredRebind && result.status === "succeeded";

  return {
    rebound,
    result: rebound ? appendRebindDiagnostic(result) : result,
  };
}

function probeResultRequiresRebind(result: HostTransportResult, initialRecord: UnityAgentKitHostRecord | undefined): boolean {
  if (!result.ok) {
    return true;
  }

  if (initialRecord === undefined) {
    return false;
  }

  const body = result.body;
  return (
    body.status === "not_ready" ||
    body.hostId !== initialRecord.hostId ||
    body.hostEpoch !== initialRecord.hostEpoch ||
    body.protocolVersion !== initialRecord.protocolVersion ||
    body.projectRoot !== initialRecord.projectRoot ||
    body.port !== initialRecord.port
  );
}

function appendRebindDiagnostic(result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "info",
    code: "host.rebound",
    message: "Workflow continued after a successful pre-operation host rebind.",
    attribution: {
      operation: result.operation,
      requestId: result.requestId,
      hostId: result.hostId,
      hostEpoch: result.hostEpoch,
    },
  };

  return definePublicResult({
    ...result,
    diagnostics: [...result.diagnostics, diagnostic],
  });
}
```

该 helper 只观察 successful pre-operation rebind 并追加 diagnostic；不要修改 Phase 5A `executeWithRebind` 的默认返回语义。

- [x] **步骤 3：实现 editor workflows**

创建 `plugins/unity-agent-kit/src/workflows/editor.ts`：

```ts
import { definePublicResult, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import {
  editorStatusOperation,
  editorStatusResultFromHostResult,
  isEditorReady,
  parseEditorStatusData,
} from "../diagnostics/editor.ts";
import { timeoutContinuationResult } from "./timeout.ts";

export interface EditorWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface EditorActionOptions {
  requestId?: string;
}

export interface WaitForEditorReadyOptions extends EditorActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getEditorStatus(
  workflow: EditorWorkflowOptions,
  action: EditorActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = action.requestId ?? `editor-status-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: editorStatusOperation,
      requestId,
    },
  });

  return editorStatusResultFromHostResult(hostResult.result, "get_status", workflow.projectRoot);
}

export async function waitForEditorReady(
  workflow: EditorWorkflowOptions,
  options: WaitForEditorReadyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const requestId = options.requestId ?? `editor-wait-ready-${Date.now()}`;
  const deadline = now() + timeoutMs;
  let lastStatus: UnityAgentKitPublicResult | undefined;
  let attempt = 0;

  while (now() <= deadline) {
    attempt += 1;
    lastStatus = await getEditorStatus(workflow, { requestId: `${requestId}-${attempt}` });
    if (lastStatus.status !== "succeeded") {
      return definePublicResult({
        ...lastStatus,
        tool: "unity_editor",
        action: "wait_ready",
        summary: lastStatus.summary || "Editor readiness could not be established.",
      });
    }

    const snapshot = parseEditorStatusData(lastStatus.data);
    if (snapshot !== null && isEditorReady(snapshot)) {
      return definePublicResult({
        ...lastStatus,
        action: "wait_ready",
        summary: "Editor is ready.",
        evidence: {
          completion: "state_settled",
          ready: true,
          playModeMutation: "none",
        },
      });
    }

    if (now() + pollIntervalMs > deadline) {
      break;
    }

    await sleep(pollIntervalMs);
  }

  return timeoutContinuationResult({
    tool: "unity_editor",
    action: "wait_ready",
    requestId,
    summary: "Timed out waiting for Unity Editor to become ready.",
    mayStillBeRunning: false,
    safeToRetry: true,
    nextStep: {
      kind: "read_state",
      tool: "unity_editor",
      action: "get_status",
      reason: "Read the latest Editor status before retrying readiness wait.",
    },
  });
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

- [x] **步骤 4：运行 TS editor tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 TS 能把 trusted Unity host status envelope 映射为 `unity_editor.get_status` result，并且 `wait_ready` 在 TS 层完成 polling、ready judgment 和 timeout continuation。

- [x] **步骤 5：运行现有 TS contract tests 防回归**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/editor-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-01 没有破坏 Phase 5A host/runtime trust boundary 或 Phase 5B resource/timeout/completion contract。

- [ ] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/editor.ts plugins/unity-agent-kit/src/workflows/rebind.ts plugins/unity-agent-kit/src/workflows/editor.ts plugins/unity-agent-kit/tests/editor-workflows.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5c editor workflows

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Unity editor diagnostics contract tests

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs`

- [x] **步骤 1：编写失败的 Unity CoreDiagnostics tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`：

```csharp
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class CoreDiagnosticsTests
    {
        [Test]
        public void EditorStatusResultRoundTripsReadinessFields()
        {
            var result = new UnityAgentKitEditorStatusResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                isCompiling = false,
                isUpdating = false,
                isPlaying = true,
                isPlayingOrWillChangePlaymode = true,
                isPlayModeChanging = false,
                isReady = true,
                capturedMainThreadId = 7,
                executionThreadId = 7
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitEditorStatusResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("D:/repo/unity", roundTrip.projectRoot);
            Assert.AreEqual("2022.3.61f1", roundTrip.unityVersion);
            Assert.IsFalse(roundTrip.isCompiling);
            Assert.IsFalse(roundTrip.isUpdating);
            Assert.IsTrue(roundTrip.isPlaying);
            Assert.IsTrue(roundTrip.isPlayingOrWillChangePlaymode);
            Assert.IsFalse(roundTrip.isPlayModeChanging);
            Assert.IsTrue(roundTrip.isReady);
            Assert.AreEqual(7, roundTrip.capturedMainThreadId);
            Assert.AreEqual(7, roundTrip.executionThreadId);
        }

        [Test]
        public void EditorStatusOperationRequiresMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" editor.status.get "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "editor.status.get",
                requestId = "req-editor-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("editor.status.get", response.operation);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void EditorStatusOperationReturnsRealSnapshotOnMainThread()
        {
            var record = TestHostRecord();

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "editor.status.get",
                requestId = "req-editor-status"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "editor.status.get", "req-editor-status", record);
            Assert.AreEqual(string.Empty, response.code);
            Assert.AreEqual(0, response.diagnostics.Length);

            var data = JsonUtility.FromJson<UnityAgentKitEditorStatusResult>(response.data);
            Assert.AreEqual(UnityAgentKitHostRegistry.GetProjectRoot(), data.projectRoot);
            Assert.IsNotEmpty(data.unityVersion);
            Assert.AreEqual(data.isPlayingOrWillChangePlaymode != data.isPlaying, data.isPlayModeChanging);
            Assert.AreEqual(!data.isCompiling && !data.isUpdating && !data.isPlayModeChanging, data.isReady);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-editor-tests",
                hostEpoch = 7,
                port = 49220,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = "2026-05-23T10:00:00.0000000Z",
                lastProbeAt = "2026-05-23T10:00:01.0000000Z"
            };
        }

        private static void AssertOperationEnvelopeMinimumFields(UnityAgentKitOperationResponse response, string status, string operation, string requestId, UnityAgentKitHostRecord record)
        {
            Assert.NotNull(response);
            Assert.AreEqual(status, response.status);
            Assert.AreEqual(operation, response.operation);
            Assert.AreEqual(requestId, response.requestId);
            Assert.AreEqual(record.hostId, response.hostId);
            Assert.AreEqual(record.hostEpoch, response.hostEpoch);
            Assert.IsNotEmpty(response.summary);
            Assert.IsNotEmpty(response.startedAt);
            Assert.IsNotEmpty(response.completedAt);
            Assert.GreaterOrEqual(response.durationMs, 0);
        }
    }
}
```

- [x] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "$(pwd)/.ai-debug/unity-agent-kit/test-results/phase5c-01-core-diagnostics-red.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：FAIL，Unity compile error 包含 `UnityAgentKitEditorStatusResult` 或 `editor.status.get` 相关 symbol 不存在。

证明：该 red 证明 Unity C# 侧尚未实现 5C-01 editor diagnostics operation。

- [ ] **步骤 3：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: add phase 5c editor diagnostics tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Unity editor diagnostics operation

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`

- [x] **步骤 1：添加 Unity editor status DTO**

在 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` 的 `UnityAgentKitThreadCheckResult` 后追加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitEditorStatusResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public bool isCompiling;
        public bool isUpdating;
        public bool isPlaying;
        public bool isPlayingOrWillChangePlaymode;
        public bool isPlayModeChanging;
        public bool isReady;
        public int capturedMainThreadId;
        public int executionThreadId;
    }
```

保留文件顶部已有 `using System;`。

- [x] **步骤 2：实现 Unity editor diagnostics short operation**

创建 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs`：

```csharp
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitEditorDiagnostics
    {
        internal static UnityAgentKitEditorStatusResult ReadStatus(int capturedMainThreadId)
        {
            var isPlaying = EditorApplication.isPlaying;
            var isPlayingOrWillChangePlaymode = EditorApplication.isPlayingOrWillChangePlaymode;
            var isPlayModeChanging = isPlayingOrWillChangePlaymode != isPlaying;
            var isCompiling = EditorApplication.isCompiling;
            var isUpdating = EditorApplication.isUpdating;

            return new UnityAgentKitEditorStatusResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                isPlaying = isPlaying,
                isPlayingOrWillChangePlaymode = isPlayingOrWillChangePlaymode,
                isPlayModeChanging = isPlayModeChanging,
                isReady = !isCompiling && !isUpdating && !isPlayModeChanging,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId
            };
        }
    }
}
```

- [x] **步骤 3：Route `editor.status.get` through main-thread dispatch**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中添加 operation 常量：

```csharp
        internal const string EditorStatusGetOperation = "editor.status.get";
```

把 `RequiresMainThreadDispatch` return expression 改为：

```csharp
            return normalized == ThreadCheckOperation ||
                normalized == ThrowOperation ||
                normalized == PendingDispatchTimeoutOperation ||
                normalized == EditorStatusGetOperation;
```

在 `Route` 的 `EchoOperation` 分支后添加统一 main-thread guard：

```csharp
            if (RequiresMainThreadDispatch(operation))
            {
                return Rejected(operation, requestId, record, "host.dispatch_required", "Operation requires main-thread dispatch.", startedAt);
            }
```

删除 `Route` 中只针对 `ThreadCheckOperation` 的 hard-coded dispatch-required 分支，避免新增主线程 operation 时 direct route guard 漂移。

在 `RunOnMainThread` 的 `ThreadCheckOperation` 分支后、`ThrowOperation` 分支前添加：

```csharp
            if (operation == EditorStatusGetOperation)
            {
                var result = UnityAgentKitEditorDiagnostics.ReadStatus(capturedMainThreadId);
                return Succeeded(operation, requestId, record, "Editor status read.", UnityEngine.JsonUtility.ToJson(result), startedAt);
            }
```

不要在 `Route` 中直接读取 Unity Editor APIs；direct route must keep returning `host.dispatch_required` through the existing main-thread guard behavior.

- [x] **步骤 4：运行 Unity CoreDiagnostics tests 验证通过**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "$(pwd)/.ai-debug/unity-agent-kit/test-results/phase5c-01-core-diagnostics.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`，test log 中 `CoreDiagnosticsTests` 全部通过。

证明：该检查证明 Unity C# 能在主线程短操作中读取真实 Editor 状态，并通过 Phase 5A operation envelope 返回可解析 snapshot。

- [x] **步骤 5：运行 HostRuntime dispatch tests 防回归**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "$(pwd)/.ai-debug/unity-agent-kit/test-results/phase5c-01-host-runtime.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 `editor.status.get` 没有破坏现有 `/operations` envelope、main-thread dispatch、host timeout、stop/reload behavior。

- [ ] **步骤 6：Commit**

仅在用户授权 commit 时运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5c editor diagnostics operation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：5C-01 integrated verification and scope guard

**文件：**
- 读取：`plugins/unity-agent-kit/src/workflows/rebind.ts`
- 读取：`plugins/unity-agent-kit/tests/editor-workflows.test.ts`
- 读取：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 检查：`plugins/unity-agent-kit/src/tools/`
- 检查：`plugins/unity-agent-kit/src/mcp/`
- 检查：`plugins/unity-agent-kit/skills/unity`
- 检查：`plugins/unity-agent-kit/skills/unity.md`

- [x] **步骤 1：运行 TS focused verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 5C-01 TS workflow 与 Phase 5A/5B TS contracts 同时成立。

- [x] **步骤 2：运行 Unity focused verification**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "$(pwd)/.ai-debug/unity-agent-kit/test-results/phase5c-01-editor-status-readiness.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity editor status operation 可在真实 Unity EditMode runner 中执行，不依赖 fake Editor state。

- [x] **步骤 3：运行 scope guard**

运行：

```bash
test ! -e plugins/unity-agent-kit/src/tools && test ! -e plugins/unity-agent-kit/src/mcp && test ! -e plugins/unity-agent-kit/skills/unity && test ! -e plugins/unity-agent-kit/skills/unity.md && test ! -e unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitCompileDiagnostics.cs && test ! -e unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs
```

预期：PASS，命令无输出且 exit code 为 `0`。

证明：该检查证明 5C-01 没有越界创建 public MCP surface、actual skill、compile diagnostics 或 console diagnostics。

- [x] **步骤 4：运行 diff formatting check**

运行：

```bash
git diff --check
```

预期：PASS，命令无输出。

证明：该检查证明新增/修改文件没有 trailing whitespace 或 patch formatting 问题。

- [ ] **步骤 5：Commit**

仅在用户授权 commit 时运行：

```bash
git add plugins/unity-agent-kit/src/diagnostics/editor.ts plugins/unity-agent-kit/src/workflows/rebind.ts plugins/unity-agent-kit/src/workflows/editor.ts plugins/unity-agent-kit/tests/editor-workflows.test.ts unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: verify phase 5c editor readiness workflow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 6：5C-01 documentation state sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- [x] **步骤 1：更新 5C execution index 的 5C-01 row**

在 `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` 的 Candidate Plan Cards table 中，把 5C-01 row 的 `Status` 从 `draft` 改为 `completed`，并在文件中追加 5C-01 evidence section：

```markdown
## Phase 5C-01 Completion Evidence

5C-01 Editor status/readiness completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "$(pwd)/.ai-debug/unity-agent-kit/test-results/phase5c-01-editor-status-readiness.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `failed="0"`.
3. Scope guard passed: no `plugins/unity-agent-kit/src/tools`, no `plugins/unity-agent-kit/src/mcp`, no `plugins/unity-agent-kit/skills/unity`, no `plugins/unity-agent-kit/skills/unity.md`, no compile diagnostics file, and no console diagnostics file were created by 5C-01.
4. `git diff --check` passed.

Phase 5C remains incomplete because 5C-02, 5C-03, and 5C-04 are not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.
```

Use the actual test counts from command output if they differ from the examples above.

- [x] **步骤 2：保持 parent Phase 5 index 状态不越界**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中确认 Phase 5C row still reads:

```markdown
| Phase 5C | Core Diagnostics Workflows | `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | contract-ready | plan-cards-pending | 5C-01 completed; 5C-02, 5C-03, and 5C-04 not completed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending | stays subplan |
```

Do not set Phase 5C `Status` to `completed` in this task.

- [x] **步骤 3：运行 docs/state checks**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md && git diff --check
```

预期：diff 只包含 5C-01 evidence/status updates 和 Phase 5C row state sync；`git diff --check` 无输出。

证明：该检查证明 documentation state 只记录 5C-01 完成事实，不把 Phase 5C 或 Phase 5 提前标记 completed。

- [ ] **步骤 4：Commit**

仅在用户授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
git commit -m "$(cat <<'EOF'
docs: record phase 5c editor readiness evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：5C-01 covers `unity_editor.get_status`、`unity_editor.wait_ready`、snapshot `projectRoot` validation、deterministic per-poll request IDs、successful rebind diagnostic、host continuity failure propagation、timeout/read_state next step、scope boundary。5C-02/5C-03/5C-04 are intentionally represented in the execution index and require separate expanded plans before execution.
- 占位符扫描：计划只保留具体步骤、代码片段、命令、预期输出和证明说明；没有执行占位语。
- 类型一致性：TS plan consistently uses `EditorStatusSnapshot`、`editorStatusOperation`、`executeWithRebindAwareness`、`getEditorStatus`、`waitForEditorReady`、`EditorWorkflowOptions`；Unity plan consistently uses `UnityAgentKitEditorStatusResult`、`UnityAgentKitEditorDiagnostics.ReadStatus`、`EditorStatusGetOperation` and generic `RequiresMainThreadDispatch(operation)` route guard。
- 拆分检查：Phase 5C is split by execution index into 5C-01 through 5C-04. This expanded plan executes only 5C-01 and remains independently testable.
- 上游约束覆盖：Roadmap Shared Constraints、Phase 5C spec、Phase 5 plan index、Phase 5B timeout/completion helper semantics are mapped to tasks and verification.
- 参考输入映射：All referenced specs, plan indexes, existing TS/C# files, and v2 editor state reference have adopted/non-adopted decisions mapped to tasks.
- 验证强度：Behavior tasks use TS behavior tests and Unity EditMode tests, not symbol-only checks. Scope guard is explicitly marked as boundary verification, not behavior acceptance.
