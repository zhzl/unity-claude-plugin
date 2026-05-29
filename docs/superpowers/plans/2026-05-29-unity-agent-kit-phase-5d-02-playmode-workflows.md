# Unity Agent Kit Phase 5D-02 PlayMode Workflows 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Unity Agent Kit 添加内部 `unity_playmode.get_state`、`enter_and_verify`、`exit_and_verify` PlayMode workflow foundation，证明 PlayMode 状态快照、no-op、请求进入/退出、timeout 和 host continuity 语义正确。

**架构：** TypeScript 新增 `diagnostics/playmode.ts` 与 `workflows/playmode.ts`，保持 public-result-shaped internal workflow facade；Unity C# 新增短主线程 PlayMode diagnostics/operations，并通过现有 loopback operation router 暴露 internal operations。TS 负责轮询、timeout、host continuity 和最终判定；Unity C# 只读取状态或请求 `EditorApplication.isPlaying`，不做等待或 workflow 编排。

**技术栈:** TypeScript ESM、Node.js built-in test runner、Unity Editor C# EditMode tests、Unity `EditorApplication` PlayMode state APIs、Unity Agent Kit host transport/result contracts。
**拆分检查：** 已检查；无需拆分。5D-02 是单一可交付软件单元：PlayMode state/request bridge + TS verified transition workflow；Test、Screenshot、combined evidence sync 已拆到 5D-01a/5D-01b、5D-03、5D-04。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5D-02
**Spec:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md`
**Parent Index:** `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`

---

## 文件结构

- 创建：`plugins/unity-agent-kit/src/diagnostics/playmode.ts`
  - 定义 internal operation names：`playmode.state.get`、`playmode.enter.request`、`playmode.exit.request`。
  - 定义并解析 PlayMode state / request DTO。
  - 将 Unity host result 映射为 `unity_playmode.get_state`、internal request result，并验证 projectRoot / host continuity / stable state evidence。
- 创建：`plugins/unity-agent-kit/src/workflows/playmode.ts`
  - 暴露 `getPlayModeState()`、`enterPlayModeAndVerify()`、`exitPlayModeAndVerify()`。
  - 内部组合 `getPlayModeState()`、`requestEnterPlayMode()`、`requestExitPlayMode()`。
  - 实现 bounded polling、no-op proof、timeout continuation、host continuity guard 和 final state judgment。
- 创建：`plugins/unity-agent-kit/tests/playmode-workflows.test.ts`
  - TS parser、state mapping、no-op、transition success、timeout、project mismatch、host continuity regression tests。
  - 使用 fake registry/transport，不启动真实 Unity。
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
  - 添加 PlayMode state/request result DTO。
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitPlayModeDiagnostics.cs`
  - 添加 PlayMode state read 和 request-enter/request-exit short operations。
  - 添加 test adapter seam，Unity tests 不直接触发真实 PlayMode 切换。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
  - 注册 internal operations 并保持 main-thread dispatch requirement。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs`
  - Unity DTO/router/diagnostics adapter seam tests。
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
  - 实现和验证完成后，只更新 5D-02 row/evidence/next action。
  - 不标记 Phase 5D completed；不标记 Phase 5 completed。

## 上游约束摘要

- **Roadmap Shared Constraints:** 基于 v2 演进；Public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、等待、轮询、timeout、host rebind、diagnostics convergence 和最终判定；Unity C# 负责短主线程动作、状态 snapshot、job/report/artifact basics；Unity host 禁止长 `Thread.Sleep`、HTTP handler busy-wait、Unity main thread `Task.Wait`、复杂 workflow 编排；PlayMode action 必须区分“请求进入/退出”和“已稳定进入/退出”。
- **Phase Scope:** Phase 5 高频日常闭环基础设施；Phase 5D 子计划实现 Test / PlayMode / Screenshot workflows 的内部 workflow 与证据基础。本计划只实现 Phase 5D-02 PlayMode state/enter/exit workflows。
- **Phase Out-of-scope:** 不实现 screenshot；不实现 public MCP tool registration；不实现 MCP Resource handlers；不创建或修改 `/unity` skill；不实现 final daily loop E2E；不实现 Phase 6/7/8 domain workflows；不实现 object/component/material/scene authoring；不做 Scene View 或 EditorWindow capture。
- **Success Criteria:** `getPlayModeState` 返回真实 EditMode/PlayMode/transition snapshot 且不变更 Editor；`enterPlayModeAndVerify` 和 `exitPlayModeAndVerify` 对 already-stable target 返回 no-op success；非目标稳定状态下只发出短 request，再由 TS 轮询到 stable target；timeout 返回 `nextStep` 指向 `unity_playmode.get_state`、`mayStillBeRunning` 和 `safeToRetry`；host continuity / projectRoot 破坏时不得成功；TS focused tests、Unity focused tests、HostRuntime regression、scope guard 和 `git diff --check` 通过。
- **用户确认事项:** 继续 Phase 5D，不推进 Phase 6/7/8；5D-02 只做 `unity_playmode.get_state`、`enter_and_verify`、`exit_and_verify` 的 internal TS workflow / Unity bridge / focused tests；不在 5D-02 中实现 screenshot、public MCP registration、`/unity` skill 或 final daily loop E2E；TS 负责等待/轮询/timeout/final judgment，Unity C# 只做短主线程 PlayMode 状态/请求/记录。
- **本计划不包含:** MCP server registration/export/action-dispatch surface、MCP Resource handler、actual skill file、screenshot capture、Test Runner 变更、Phase 5D combined evidence sync、Phase 5E final E2E、roadmap structural change、Phase 6/7/8 work。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md` | 5D-02 PlayMode public surface、stable state definition、no-op evidence、timeout/continuity requirements、scope boundary | Test/Screenshot/combined Phase 5D completion work | 已拆到 5D-01a/5D-01b、5D-03、5D-04 | 全部任务 |
| `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` | 5D-02 requirement IDs、depends-on、scope/evidence sync rule、next-action wording | 标记 Phase 5D/Phase 5 completed | 5D-03、5D-04、Phase 5E 仍未完成 | 任务 7-8 |
| `plugins/unity-agent-kit/src/workflows/editor.ts` | `executeWithRebindAwareness`、polling、timeout continuation、carried host rebound diagnostics pattern | Editor readiness semantics | PlayMode target-state verification 和 safe retry semantics 不同 | 任务 2、6 |
| `plugins/unity-agent-kit/src/workflows/test.ts` | internal workflow facade style、host transport test harness pattern、aggregate timeout style | Job/report/resource logic | PlayMode 不产生 job/report/resource | 任务 1、5-6 |
| `plugins/unity-agent-kit/src/diagnostics/editor.ts` | Editor state field names and projectRoot validation style | `unity_editor` action names | 5D-02 must use `unity_playmode` tool/actions | 任务 1-2 |
| `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitEditorDiagnostics.cs` | Unity `EditorApplication.isPlaying` / `isPlayingOrWillChangePlaymode` / `isCompiling` / `isUpdating` snapshot source | Reusing `editor.status.get` as public PlayMode implementation | PlayMode must have its own internal operation/result semantics | 任务 3-4 |
| `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` | main-thread dispatch registration and routing pattern | Direct non-main-thread PlayMode execution | Unity API access must stay on captured Unity main thread | 任务 3-4 |
| `references/unity-mcp-v2` | High-level PlayMode status/request/no-op ideas | v2 public helper actions as stable actions | Phase 5D stable surface excludes public `enter` / `exit` / `wait_for_state` | 任务 2、4、6 |

---

### 任务 1：添加 TypeScript PlayMode parser 与 get_state 红灯测试

**文件：**
- 创建：`plugins/unity-agent-kit/tests/playmode-workflows.test.ts`

- [x] **步骤 1：创建测试文件与 imports**

创建 `plugins/unity-agent-kit/tests/playmode-workflows.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlayModeRequestData,
  parsePlayModeStateData,
  playModeStateOperation,
  type PlayModeRequestResult,
  type PlayModeStateSnapshot,
} from "../src/diagnostics/playmode.ts";
import { getPlayModeState, type PlayModeWorkflowOptions } from "../src/workflows/playmode.ts";
import {
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type HostRegistryReadResult,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
import type { HostTransport, HostTransportResult } from "../src/host/transport.ts";
```

- [x] **步骤 2：添加测试 harness helpers**

继续写入同一文件：

```ts
function sampleHostRecord(overrides: Partial<UnityAgentKitHostRecord> = {}): UnityAgentKitHostRecord {
  return {
    hostName: UNITY_AGENT_KIT_HOST_NAME,
    protocolVersion: UNITY_AGENT_KIT_PROTOCOL_VERSION,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    hostId: "host-playmode",
    hostEpoch: 7,
    port: 49510,
    status: "ready",
    startedAt: "2026-05-29T10:00:00.000Z",
    lastProbeAt: "2026-05-29T10:00:01.000Z",
    ...overrides,
  };
}

function stateSnapshot(overrides: Partial<PlayModeStateSnapshot> = {}): PlayModeStateSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-playmode",
    hostEpoch: 7,
    state: "editmode",
    stable: true,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: false,
    isPlayModeChanging: false,
    isCompiling: false,
    isUpdating: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

function requestResult(overrides: Partial<PlayModeRequestResult> = {}): PlayModeRequestResult {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-playmode",
    hostEpoch: 7,
    targetState: "playmode",
    requested: true,
    noOp: false,
    noOpReason: "",
    stateBeforeRequest: stateSnapshot(),
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
    summary: `${operation} completed.`,
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-29T10:00:00.000Z",
    completedAt: "2026-05-29T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: PlayModeWorkflowOptions["readRegistry"];
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
type InvokeExpectation = { port: number; requestId: string; operation: string; inputJson?: string; result: HostTransportResult };

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): {
  transport: HostTransport;
  assertConsumed(): void;
} {
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
        assert.equal(request.requestId, next.requestId);
        assert.equal(request.operation, next.operation);
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

function options(record: UnityAgentKitHostRecord, transport: HostTransport, overrides: Partial<PlayModeWorkflowOptions> = {}): PlayModeWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: overrides.readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
    ...overrides,
  };
}
```

- [x] **步骤 3：添加 parser contract tests**

继续写入同一文件：

```ts
test("parser contracts accept editmode, playmode, and transitioning snapshots", () => {
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot())), stateSnapshot());
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  }))), stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  }));
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  }))), stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  }));
});

test("parser contracts reject invalid playmode state and request shapes", () => {
  assert.equal(parsePlayModeStateData("not-json"), null);
  assert.equal(parsePlayModeStateData(JSON.stringify({ state: "editmode" })), null);
  assert.equal(parsePlayModeStateData(JSON.stringify(stateSnapshot({ state: "bad" as PlayModeStateSnapshot["state"] }))), null);
  assert.equal(parsePlayModeRequestData("not-json"), null);
  assert.equal(parsePlayModeRequestData(JSON.stringify({ requested: true })), null);
  assert.equal(parsePlayModeRequestData(JSON.stringify(requestResult({ targetState: "bad" as PlayModeRequestResult["targetState"] }))), null);
});
```

- [x] **步骤 4：添加 get_state behavior test**

继续写入同一文件：

```ts
test("getPlayModeState maps state snapshot without mutation", async () => {
  const record = sampleHostRecord();
  const snapshot = stateSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-playmode-state",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, snapshot, "req-playmode-state") },
    },
  ]);

  const result = await getPlayModeState(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-playmode-state",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_playmode");
  assert.equal(result.action, "get_state");
  assert.equal(result.operation, playModeStateOperation);
  assert.equal(result.data?.["state"], "editmode");
  assert.deepEqual(result.evidence, {
    completion: "state_snapshot",
    playModeState: "editmode",
    stable: true,
    mutation: "none",
  });
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 5：运行测试验证红灯**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/playmode-workflows.test.ts"
```

预期：FAIL，包含 module export/import 错误，例如：

```text
Cannot find module '../src/diagnostics/playmode.ts'
```

- [x] **步骤 6：Commit 测试红灯**

```bash
git add plugins/unity-agent-kit/tests/playmode-workflows.test.ts
git commit -m "test: add phase 5d playmode workflow contracts"
```

---

### 任务 2：实现 TypeScript PlayMode diagnostics 和 get_state

**文件：**
- 创建：`plugins/unity-agent-kit/src/diagnostics/playmode.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/playmode.ts`
- 测试：`plugins/unity-agent-kit/tests/playmode-workflows.test.ts`

- [x] **步骤 1：创建 PlayMode diagnostics contract**

创建 `plugins/unity-agent-kit/src/diagnostics/playmode.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const playModeStateOperation = "playmode.state.get" as const;
export const playModeEnterRequestOperation = "playmode.enter.request" as const;
export const playModeExitRequestOperation = "playmode.exit.request" as const;

export type PlayModeStateName = "editmode" | "playmode" | "transitioning";
export type PlayModeTargetState = "editmode" | "playmode";

export interface PlayModeStateSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  state: PlayModeStateName;
  stable: boolean;
  isPlaying: boolean;
  isPlayingOrWillChangePlaymode: boolean;
  isPlayModeChanging: boolean;
  isCompiling: boolean;
  isUpdating: boolean;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface PlayModeRequestResult {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  targetState: PlayModeTargetState;
  requested: boolean;
  noOp: boolean;
  noOpReason: string;
  stateBeforeRequest: PlayModeStateSnapshot;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export function parsePlayModeStateData(data: unknown): PlayModeStateSnapshot | null {
  const value = parseRecord(data);
  if (value === null || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isPlayModeStateName(value.state) && typeof value.stable === "boolean" &&
    typeof value.isPlaying === "boolean" && typeof value.isPlayingOrWillChangePlaymode === "boolean" &&
    typeof value.isPlayModeChanging === "boolean" && typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" && isNonNegativeInteger(value.capturedMainThreadId) &&
    isNonNegativeInteger(value.executionThreadId) && isDiagnosticArray(value.diagnostics)
  )) return null;

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    state: value.state,
    stable: value.stable,
    isPlaying: value.isPlaying,
    isPlayingOrWillChangePlaymode: value.isPlayingOrWillChangePlaymode,
    isPlayModeChanging: value.isPlayModeChanging,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function parsePlayModeRequestData(data: unknown): PlayModeRequestResult | null {
  const value = parseRecord(data);
  if (value === null || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isPlayModeTargetState(value.targetState) && typeof value.requested === "boolean" &&
    typeof value.noOp === "boolean" && typeof value.noOpReason === "string" &&
    parsePlayModeStateData(value.stateBeforeRequest) !== null &&
    isNonNegativeInteger(value.capturedMainThreadId) && isNonNegativeInteger(value.executionThreadId) &&
    isDiagnosticArray(value.diagnostics)
  )) return null;

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    targetState: value.targetState,
    requested: value.requested,
    noOp: value.noOp,
    noOpReason: value.noOpReason,
    stateBeforeRequest: parsePlayModeStateData(value.stateBeforeRequest) as PlayModeStateSnapshot,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function isStablePlayModeTarget(snapshot: PlayModeStateSnapshot, targetState: PlayModeTargetState): boolean {
  if (!snapshot.stable || snapshot.isCompiling || snapshot.isUpdating || snapshot.isPlayModeChanging) return false;
  return targetState === "playmode"
    ? snapshot.isPlaying && snapshot.isPlayingOrWillChangePlaymode && snapshot.state === "playmode"
    : !snapshot.isPlaying && !snapshot.isPlayingOrWillChangePlaymode && snapshot.state === "editmode";
}

export function playModeStateResultFromHostResult(hostResult: UnityAgentKitPublicResult, expectedProjectRoot: string): UnityAgentKitPublicResult {
  return mapPlayModeResult(hostResult, playModeStateOperation, "get_state", expectedProjectRoot, parsePlayModeStateData, (snapshot, diagnostics) => definePublicResult({
    status: "succeeded",
    tool: "unity_playmode",
    action: "get_state",
    operation: playModeStateOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: `PlayMode state is ${snapshot.state}.`,
    data: snapshot,
    diagnostics,
    evidence: {
      completion: "state_snapshot",
      playModeState: snapshot.state,
      stable: snapshot.stable,
      mutation: "none",
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  }));
}

export function playModeRequestResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "enter_and_verify" | "exit_and_verify",
  operation: typeof playModeEnterRequestOperation | typeof playModeExitRequestOperation,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  return mapPlayModeResult(hostResult, operation, action, expectedProjectRoot, parsePlayModeRequestData, (request, diagnostics) => definePublicResult({
    status: "succeeded",
    tool: "unity_playmode",
    action,
    operation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: request.noOp ? `PlayMode ${request.targetState} request was a no-op.` : `PlayMode ${request.targetState} request accepted.`,
    data: request,
    diagnostics,
    evidence: {
      completion: request.noOp ? "request_noop" : "request_accepted",
      targetState: request.targetState,
      requested: request.requested,
      noOp: request.noOp,
      noOpReason: request.noOpReason,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  }));
}

function mapPlayModeResult<T>(
  hostResult: UnityAgentKitPublicResult,
  operation: string,
  action: string,
  expectedProjectRoot: string,
  parse: (data: unknown) => T | null,
  success: (parsed: T, diagnostics: UnityAgentKitDiagnostic[]) => UnityAgentKitPublicResult,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({ ...hostResult, tool: "unity_playmode", action, summary: hostResult.summary || `PlayMode ${action} could not be completed.` });
  }

  const parsed = parse(hostResult.data);
  if (parsed === null) {
    return invalidPlayModeResult(hostResult, operation, action, `playmode.${action}_invalid_shape`, `PlayMode ${action} operation returned an invalid data shape.`);
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.projectRoot !== "string" || normalizeProjectRoot(record.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidPlayModeResult(hostResult, operation, action, "playmode.project_root_mismatch", `PlayMode ${action} projectRoot does not match the expected Unity project root.`, { expectedProjectRoot, actualProjectRoot: record.projectRoot });
  }

  if (record.hostId !== hostResult.hostId || record.hostEpoch !== hostResult.hostEpoch) {
    return continuityLostResult(hostResult, operation, action, { expectedHostId: hostResult.hostId, expectedHostEpoch: hostResult.hostEpoch, actualHostId: record.hostId, actualHostEpoch: record.hostEpoch });
  }

  return success(parsed, [...hostResult.diagnostics, ...(Array.isArray(record.diagnostics) ? cloneDiagnostics(record.diagnostics) : [])]);
}

function invalidPlayModeResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, code: string, message: string, details?: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "workflow", severity: "error", code, message, ...(details ? { details } : {}), attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({
    status: "failed",
    tool: "unity_playmode",
    action,
    operation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [...hostResult.diagnostics, diagnostic],
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics before retrying the PlayMode workflow." },
  });
}

function continuityLostResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, details: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "host", severity: "error", code: "host.continuity_lost", message: "PlayMode host continuity changed before the result could be trusted.", details, attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({
    status: "lost",
    tool: "unity_playmode",
    action,
    operation,
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
    nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics because PlayMode proof crossed a host continuity boundary." },
  });
}

function parseRecord(data: unknown): Record<string, unknown> | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPlayModeStateName(value: unknown): value is PlayModeStateName {
  return value === "editmode" || value === "playmode" || value === "transitioning";
}

function isPlayModeTargetState(value: unknown): value is PlayModeTargetState {
  return value === "editmode" || value === "playmode";
}

function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] {
  return Array.isArray(value) && value.every(isDiagnostic);
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) return false;
  const diagnostic = value as Record<string, unknown>;
  return isNonEmptyString(diagnostic.source) &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    isNonEmptyString(diagnostic.message) &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string");
}

function cloneDiagnostics(diagnostics: UnityAgentKitDiagnostic[]): UnityAgentKitDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}
```

- [x] **步骤 2：创建 get_state workflow**

创建 `plugins/unity-agent-kit/src/workflows/playmode.ts`：

```ts
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import {
  isStablePlayModeTarget,
  parsePlayModeStateData,
  playModeEnterRequestOperation,
  playModeExitRequestOperation,
  playModeRequestResultFromHostResult,
  playModeStateOperation,
  playModeStateResultFromHostResult,
  type PlayModeTargetState,
} from "../diagnostics/playmode.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";

export interface PlayModeWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface PlayModeActionOptions {
  requestId?: string;
}

export interface PlayModeVerifyOptions extends PlayModeActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getPlayModeState(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `playmode-state-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: playModeStateOperation, requestId },
  });

  return playModeStateResultFromHostResult(hostResult.result, workflow.projectRoot);
}
```

- [x] **步骤 3：运行 task 1 tests 验证通过**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/playmode-workflows.test.ts"
```

预期：PASS for parser/get_state tests。
证明：该检查证明 TS PlayMode DTO parser、invalid shape rejection、host operation mapping、project/host validation 基础路径可运行。

- [x] **步骤 4：Commit TS PlayMode state foundation**

```bash
git add plugins/unity-agent-kit/src/diagnostics/playmode.ts plugins/unity-agent-kit/src/workflows/playmode.ts plugins/unity-agent-kit/tests/playmode-workflows.test.ts
git commit -m "feat: add phase 5d playmode state workflow"
```

---

### 任务 3：添加 Unity PlayMode bridge 红灯测试

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs`

- [x] **步骤 1：创建 Unity focused tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs`：

```csharp
using System;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class PlayModeWorkflowTests
    {
        [Test]
        public void PlayModeStateResultRoundTripsStableEditMode()
        {
            var result = new UnityAgentKitPlayModeStateResult
            {
                projectRoot = "D:/repo/unity",
                unityVersion = "2022.3.61f1",
                hostId = "host-playmode",
                hostEpoch = 7,
                state = "editmode",
                stable = true,
                isPlaying = false,
                isPlayingOrWillChangePlaymode = false,
                isPlayModeChanging = false,
                isCompiling = false,
                isUpdating = false,
                capturedMainThreadId = 1,
                executionThreadId = 1,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            var roundTrip = JsonUtility.FromJson<UnityAgentKitPlayModeStateResult>(JsonUtility.ToJson(result));

            Assert.AreEqual("editmode", roundTrip.state);
            Assert.IsTrue(roundTrip.stable);
            Assert.IsFalse(roundTrip.isPlaying);
            Assert.IsFalse(roundTrip.isPlayingOrWillChangePlaymode);
            Assert.IsFalse(roundTrip.isPlayModeChanging);
        }

        [Test]
        public void PlayModeOperationsRequireMainThreadDispatch()
        {
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.state.get "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.enter.request "));
            Assert.IsTrue(UnityAgentKitOperationRouter.RequiresMainThreadDispatch(" playmode.exit.request "));

            var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
            {
                operation = "playmode.state.get",
                requestId = "req-playmode-state-direct"
            }, TestHostRecord());

            Assert.AreEqual("rejected", response.status);
            Assert.AreEqual("host.dispatch_required", response.code);
        }

        [Test]
        public void PlayModeStateForTestsReadsAdapterSnapshotWithoutMutation()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = false,
                IsPlayingOrWillChangePlaymode = false,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.ReadStateForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeStateResult>(response.data);
            Assert.AreEqual("editmode", result.state);
            Assert.IsTrue(result.stable);
            Assert.AreEqual(11, result.capturedMainThreadId);
            Assert.AreEqual(0, adapter.EnterRequests);
            Assert.AreEqual(0, adapter.ExitRequests);
        }

        [Test]
        public void PlayModeEnterForTestsNoOpsWhenAlreadyStablePlayMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = true,
                IsPlayingOrWillChangePlaymode = true,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestEnterForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("playmode", result.targetState);
            Assert.IsFalse(result.requested);
            Assert.IsTrue(result.noOp);
            Assert.AreEqual("already_playmode", result.noOpReason);
            Assert.AreEqual(0, adapter.EnterRequests);
        }

        [Test]
        public void PlayModeEnterForTestsRequestsEnterFromStableEditMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = false,
                IsPlayingOrWillChangePlaymode = false,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestEnterForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("playmode", result.targetState);
            Assert.IsTrue(result.requested);
            Assert.IsFalse(result.noOp);
            Assert.AreEqual(1, adapter.EnterRequests);
            Assert.AreEqual(0, adapter.ExitRequests);
        }

        [Test]
        public void PlayModeExitForTestsRequestsExitFromStablePlayMode()
        {
            var adapter = new RecordingPlayModeAdapter
            {
                IsPlaying = true,
                IsPlayingOrWillChangePlaymode = true,
                IsCompiling = false,
                IsUpdating = false
            };

            var response = UnityAgentKitPlayModeDiagnostics.RequestExitForTests(TestHostRecord(), capturedMainThreadId: 11, adapter);

            Assert.AreEqual("succeeded", response.status);
            var result = JsonUtility.FromJson<UnityAgentKitPlayModeRequestResult>(response.data);
            Assert.AreEqual("editmode", result.targetState);
            Assert.IsTrue(result.requested);
            Assert.IsFalse(result.noOp);
            Assert.AreEqual(0, adapter.EnterRequests);
            Assert.AreEqual(1, adapter.ExitRequests);
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = UnityAgentKitHostRegistry.HostName,
                protocolVersion = UnityAgentKitHostRegistry.ProtocolVersion,
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-playmode",
                hostEpoch = 7,
                port = 49510,
                status = UnityAgentKitHostRegistry.ReadyStatus,
                startedAt = DateTimeOffset.UtcNow.ToString("O"),
                lastProbeAt = DateTimeOffset.UtcNow.ToString("O")
            };
        }

        private sealed class RecordingPlayModeAdapter : UnityAgentKitPlayModeDiagnostics.IPlayModeEditorAdapter
        {
            public bool IsPlaying { get; set; }
            public bool IsPlayingOrWillChangePlaymode { get; set; }
            public bool IsCompiling { get; set; }
            public bool IsUpdating { get; set; }
            public int EnterRequests { get; private set; }
            public int ExitRequests { get; private set; }

            public void RequestEnter()
            {
                EnterRequests++;
            }

            public void RequestExit()
            {
                ExitRequests++;
            }
        }
    }
}
```

- [x] **步骤 2：运行 Unity focused tests 验证红灯**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-playmode-workflows-red.xml" -testFilter UnityAgentKit.Editor.Tests.PlayModeWorkflowTests
```

预期：FAIL，编译错误包含缺失类型，例如：

```text
The type or namespace name 'UnityAgentKitPlayModeStateResult' could not be found
```

- [x] **步骤 3：Commit Unity 红灯测试**

```bash
git add unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs
git commit -m "test: add phase 5d playmode Unity bridge coverage"
```

---

### 任务 4：实现 Unity PlayMode short operations 和 router wiring

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitPlayModeDiagnostics.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 测试：`unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs`

- [x] **步骤 1：添加 C# DTOs**

在 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` 的 `UnityAgentKitEditorStatusResult` 附近添加：

```csharp
    [Serializable]
    public sealed class UnityAgentKitPlayModeStateResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string state = string.Empty;
        public bool stable;
        public bool isPlaying;
        public bool isPlayingOrWillChangePlaymode;
        public bool isPlayModeChanging;
        public bool isCompiling;
        public bool isUpdating;
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }

    [Serializable]
    public sealed class UnityAgentKitPlayModeRequestResult
    {
        public string projectRoot = string.Empty;
        public string unityVersion = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string targetState = string.Empty;
        public bool requested;
        public bool noOp;
        public string noOpReason = string.Empty;
        public UnityAgentKitPlayModeStateResult stateBeforeRequest = new UnityAgentKitPlayModeStateResult();
        public int capturedMainThreadId;
        public int executionThreadId;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
```

- [x] **步骤 2：创建 PlayMode diagnostics service**

创建 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitPlayModeDiagnostics.cs`：

```csharp
using System;
using System.Threading;
using UnityEditor;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitPlayModeDiagnostics
    {
        internal interface IPlayModeEditorAdapter
        {
            bool IsPlaying { get; }
            bool IsPlayingOrWillChangePlaymode { get; }
            bool IsCompiling { get; }
            bool IsUpdating { get; }
            void RequestEnter();
            void RequestExit();
        }

        internal static UnityAgentKitOperationResponse ReadState(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return ReadStateForTests(record, capturedMainThreadId, new UnityPlayModeEditorAdapter(), requestId);
        }

        internal static UnityAgentKitOperationResponse RequestEnter(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return RequestEnterForTests(record, capturedMainThreadId, new UnityPlayModeEditorAdapter(), requestId);
        }

        internal static UnityAgentKitOperationResponse RequestExit(UnityAgentKitHostRecord record, int capturedMainThreadId, string requestId = "")
        {
            return RequestExitForTests(record, capturedMainThreadId, new UnityPlayModeEditorAdapter(), requestId);
        }

        internal static UnityAgentKitOperationResponse ReadStateForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            var startedAt = Now();
            var state = CreateState(record, capturedMainThreadId, adapter, Array.Empty<UnityAgentKitDiagnostic>());
            return Succeeded("playmode.state.get", record, "PlayMode state read.", JsonUtility.ToJson(state), startedAt, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestEnterForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            return RequestForTests("playmode.enter.request", "playmode", record, capturedMainThreadId, adapter, requestId);
        }

        internal static UnityAgentKitOperationResponse RequestExitForTests(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId = "")
        {
            return RequestForTests("playmode.exit.request", "editmode", record, capturedMainThreadId, adapter, requestId);
        }

        private static UnityAgentKitOperationResponse RequestForTests(string operation, string targetState, UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, string requestId)
        {
            var startedAt = Now();
            var before = CreateState(record, capturedMainThreadId, adapter, Array.Empty<UnityAgentKitDiagnostic>());
            var result = new UnityAgentKitPlayModeRequestResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                targetState = targetState,
                stateBeforeRequest = before,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };

            if (IsStableTarget(before, targetState))
            {
                result.requested = false;
                result.noOp = true;
                result.noOpReason = targetState == "playmode" ? "already_playmode" : "already_editmode";
                return Succeeded(operation, record, "PlayMode request was already satisfied.", JsonUtility.ToJson(result), startedAt, requestId);
            }

            if (!before.stable)
            {
                result.requested = false;
                result.noOp = true;
                result.noOpReason = "transition_or_busy";
                result.diagnostics = new[] { Diagnostic("warning", "playmode.transition_or_busy", "PlayMode request skipped because Unity is already transitioning, compiling, or updating.", operation, requestId) };
                return Succeeded(operation, record, "PlayMode request skipped because Unity is already transitioning or busy.", JsonUtility.ToJson(result), startedAt, requestId);
            }

            if (targetState == "playmode")
            {
                adapter.RequestEnter();
            }
            else
            {
                adapter.RequestExit();
            }

            result.requested = true;
            result.noOp = false;
            result.noOpReason = string.Empty;
            return Succeeded(operation, record, "PlayMode request accepted.", JsonUtility.ToJson(result), startedAt, requestId);
        }

        private static UnityAgentKitPlayModeStateResult CreateState(UnityAgentKitHostRecord record, int capturedMainThreadId, IPlayModeEditorAdapter adapter, UnityAgentKitDiagnostic[] diagnostics)
        {
            var isPlaying = adapter != null && adapter.IsPlaying;
            var isPlayingOrWillChangePlaymode = adapter != null && adapter.IsPlayingOrWillChangePlaymode;
            var isCompiling = adapter != null && adapter.IsCompiling;
            var isUpdating = adapter != null && adapter.IsUpdating;
            var isPlayModeChanging = isPlayingOrWillChangePlaymode != isPlaying;
            var stable = !isPlayModeChanging && !isCompiling && !isUpdating;
            var state = isPlayModeChanging ? "transitioning" : isPlaying ? "playmode" : "editmode";
            return new UnityAgentKitPlayModeStateResult
            {
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                unityVersion = Application.unityVersion,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                state = state,
                stable = stable,
                isPlaying = isPlaying,
                isPlayingOrWillChangePlaymode = isPlayingOrWillChangePlaymode,
                isPlayModeChanging = isPlayModeChanging,
                isCompiling = isCompiling,
                isUpdating = isUpdating,
                capturedMainThreadId = capturedMainThreadId,
                executionThreadId = Thread.CurrentThread.ManagedThreadId,
                diagnostics = diagnostics ?? Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static bool IsStableTarget(UnityAgentKitPlayModeStateResult state, string targetState)
        {
            if (state == null || !state.stable)
            {
                return false;
            }

            return targetState == "playmode"
                ? state.isPlaying && state.isPlayingOrWillChangePlaymode && state.state == "playmode"
                : !state.isPlaying && !state.isPlayingOrWillChangePlaymode && state.state == "editmode";
        }

        private static UnityAgentKitOperationResponse Succeeded(string operation, UnityAgentKitHostRecord record, string summary, string data, string startedAt, string requestId)
        {
            var completedAt = Now();
            return new UnityAgentKitOperationResponse
            {
                status = "succeeded",
                operation = operation,
                requestId = requestId ?? string.Empty,
                hostId = record != null ? record.hostId : string.Empty,
                hostEpoch = record != null ? record.hostEpoch : 0,
                summary = summary ?? string.Empty,
                data = data ?? string.Empty,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>(),
                startedAt = startedAt,
                completedAt = completedAt,
                durationMs = DurationMs(startedAt, completedAt),
                code = string.Empty,
                message = string.Empty,
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

        private sealed class UnityPlayModeEditorAdapter : IPlayModeEditorAdapter
        {
            public bool IsPlaying => EditorApplication.isPlaying;
            public bool IsPlayingOrWillChangePlaymode => EditorApplication.isPlayingOrWillChangePlaymode;
            public bool IsCompiling => EditorApplication.isCompiling;
            public bool IsUpdating => EditorApplication.isUpdating;
            public void RequestEnter() => EditorApplication.isPlaying = true;
            public void RequestExit() => EditorApplication.isPlaying = false;
        }
    }
}
```

- [x] **步骤 3：wire operation router**

在 `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` 中添加 constants：

```csharp
        internal const string PlayModeStateGetOperation = "playmode.state.get";
        internal const string PlayModeEnterRequestOperation = "playmode.enter.request";
        internal const string PlayModeExitRequestOperation = "playmode.exit.request";
```

在 `RequiresMainThreadDispatch()` 中追加：

```csharp
                normalized == PlayModeStateGetOperation ||
                normalized == PlayModeEnterRequestOperation ||
                normalized == PlayModeExitRequestOperation ||
```

在 `RunOnMainThread()` 的 test operation routing 后、`ThrowOperation` 前添加：

```csharp
            if (operation == PlayModeStateGetOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.ReadState(record, capturedMainThreadId, requestId);
            }

            if (operation == PlayModeEnterRequestOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.RequestEnter(record, capturedMainThreadId, requestId);
            }

            if (operation == PlayModeExitRequestOperation)
            {
                return UnityAgentKitPlayModeDiagnostics.RequestExit(record, capturedMainThreadId, requestId);
            }
```

- [x] **步骤 4：运行 Unity focused tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-playmode-workflows.xml" -testFilter UnityAgentKit.Editor.Tests.PlayModeWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。
证明：该检查证明 Unity DTO、router dispatch boundary、state read no mutation、enter/exit short request adapter seam 都通过 Unity EditMode test runner。

- [x] **步骤 5：Commit Unity PlayMode bridge**

```bash
git add unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitPlayModeDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs
git commit -m "feat: add phase 5d playmode Unity bridge"
```

---

### 任务 5：添加 enter/exit verify workflow 红灯测试

**文件：**
- 修改：`plugins/unity-agent-kit/tests/playmode-workflows.test.ts`

- [x] **步骤 1：更新 imports**

将 `plugins/unity-agent-kit/tests/playmode-workflows.test.ts` 的 workflow import 改为：

```ts
import {
  enterPlayModeAndVerify,
  exitPlayModeAndVerify,
  getPlayModeState,
  type PlayModeWorkflowOptions,
} from "../src/workflows/playmode.ts";
import {
  parsePlayModeRequestData,
  parsePlayModeStateData,
  playModeEnterRequestOperation,
  playModeExitRequestOperation,
  playModeStateOperation,
  type PlayModeRequestResult,
  type PlayModeStateSnapshot,
} from "../src/diagnostics/playmode.ts";
```

- [x] **步骤 2：添加 no-op tests**

在现有 get_state test 后添加：

```ts
test("enterPlayModeAndVerify succeeds as no-op when already stable PlayMode", async () => {
  const record = sampleHostRecord();
  const playmode = stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-enter-noop-state-1",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, playmode, "req-enter-noop-state-1") },
    },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-noop",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "enter_and_verify");
  assert.deepEqual(result.evidence, {
    completion: "state_settled",
    targetState: "playmode",
    request: "noop",
    initialState: "playmode",
    finalState: "playmode",
    stable: true,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("exitPlayModeAndVerify succeeds as no-op when already stable EditMode", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-exit-noop-state-1",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-exit-noop-state-1") },
    },
  ]);

  const result = await exitPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-exit-noop",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "exit_and_verify");
  assert.equal(result.evidence?.["request"], "noop");
  assert.equal(result.evidence?.["finalState"], "editmode");
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 3：添加 request + poll success test**

```ts
test("enterPlayModeAndVerify requests enter and waits for stable PlayMode", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const transitioning = stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  });
  const playmode = stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const request = requestResult({
    targetState: "playmode",
    requested: true,
    noOp: false,
    stateBeforeRequest: editmode,
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
    { port: record.port, requestId: "req-enter-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-state-1") } },
    { port: record.port, requestId: "req-enter-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-request") } },
    { port: record.port, requestId: "req-enter-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, transitioning, "req-enter-state-2") } },
    { port: record.port, requestId: "req-enter-state-3", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, playmode, "req-enter-state-3") } },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter",
    pollIntervalMs: 1,
    sleep: async () => {},
    now: (() => {
      let current = 1_000;
      return () => current++;
    })(),
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.data?.["state"], "playmode");
  assert.deepEqual(result.evidence, {
    completion: "state_settled",
    targetState: "playmode",
    request: "accepted",
    initialState: "editmode",
    finalState: "playmode",
    stable: true,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 4：添加 timeout 和 host continuity tests**

```ts
test("enterPlayModeAndVerify timeout points nextStep to get_state", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const transitioning = stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  });
  const request = requestResult({ targetState: "playmode", requested: true, noOp: false, stateBeforeRequest: editmode });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-enter-timeout-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-timeout-state-1") } },
    { port: record.port, requestId: "req-enter-timeout-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-timeout-request") } },
    { port: record.port, requestId: "req-enter-timeout-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, transitioning, "req-enter-timeout-state-2") } },
  ]);
  const nowValues = [1_000, 1_000, 1_004, 1_006];

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-timeout",
    timeoutMs: 5,
    pollIntervalMs: 1,
    sleep: async () => {},
    now: () => nowValues.shift() ?? 1_006,
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.mayStillBeRunning, true);
  assert.equal(result.safeToRetry, false);
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.nextStep?.tool, "unity_playmode");
  assert.equal(result.nextStep?.action, "get_state");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("enterPlayModeAndVerify does not succeed when host continuity changes after request", async () => {
  const record = sampleHostRecord();
  const reboundRecord = sampleHostRecord({ hostId: "host-rebound", hostEpoch: 8 });
  const editmode = stateSnapshot();
  const request = requestResult({ targetState: "playmode", requested: true, noOp: false, stateBeforeRequest: editmode });
  const reboundPlaymode = stateSnapshot({
    hostId: "host-rebound",
    hostEpoch: 8,
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, reboundRecord }, { ok: true, reboundRecord },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: reboundRecord.port, result: { ok: true, statusCode: 200, body: reboundRecord } },
  ], [
    { port: record.port, requestId: "req-enter-lost-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-lost-state-1") } },
    { port: record.port, requestId: "req-enter-lost-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-lost-request") } },
    { port: reboundRecord.port, requestId: "req-enter-lost-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(reboundRecord, playModeStateOperation, reboundPlaymode, "req-enter-lost-state-2") } },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-lost",
    sleep: async () => {},
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.code, "host.continuity_lost");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "host.continuity_lost"));
  registry.assertConsumed();
  transport.assertConsumed();
});
```

- [x] **步骤 5：运行 TS PlayMode tests 验证红灯**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/playmode-workflows.test.ts"
```

预期：FAIL，包含 missing export：

```text
The requested module '../src/workflows/playmode.ts' does not provide an export named 'enterPlayModeAndVerify'
```

- [x] **步骤 6：Commit workflow 红灯 tests**

```bash
git add plugins/unity-agent-kit/tests/playmode-workflows.test.ts
git commit -m "test: add phase 5d playmode verify workflow coverage"
```

---

### 任务 6：实现 TypeScript enter/exit verify workflows

**文件：**
- 修改：`plugins/unity-agent-kit/src/workflows/playmode.ts`
- 测试：`plugins/unity-agent-kit/tests/playmode-workflows.test.ts`

- [x] **步骤 1：添加 request helpers 和 exported verify functions**

在 `plugins/unity-agent-kit/src/workflows/playmode.ts` 的 `getPlayModeState()` 后添加：

```ts
export async function enterPlayModeAndVerify(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeVerifyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  return verifyPlayModeTarget(workflow, "playmode", "enter_and_verify", playModeEnterRequestOperation, options);
}

export async function exitPlayModeAndVerify(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeVerifyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  return verifyPlayModeTarget(workflow, "editmode", "exit_and_verify", playModeExitRequestOperation, options);
}

async function requestPlayModeTarget(
  workflow: PlayModeWorkflowOptions,
  action: "enter_and_verify" | "exit_and_verify",
  operation: typeof playModeEnterRequestOperation | typeof playModeExitRequestOperation,
  requestId: string,
): Promise<UnityAgentKitPublicResult> {
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation, requestId },
  });

  return playModeRequestResultFromHostResult(hostResult.result, action, operation, workflow.projectRoot);
}
```

- [x] **步骤 2：添加 verify loop implementation**

继续添加：

```ts
async function verifyPlayModeTarget(
  workflow: PlayModeWorkflowOptions,
  targetState: PlayModeTargetState,
  action: "enter_and_verify" | "exit_and_verify",
  requestOperation: typeof playModeEnterRequestOperation | typeof playModeExitRequestOperation,
  options: PlayModeVerifyOptions,
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `playmode-${action}-${Date.now()}`;
  const timeoutMs = positiveFiniteOrDefault(options.timeoutMs, 60_000);
  const pollIntervalMs = positiveFiniteOrDefault(options.pollIntervalMs, 500);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();
  const carriedDiagnostics: UnityAgentKitDiagnostic[] = [];

  const initialResult = await getPlayModeState(workflow, { requestId: `${requestId}-state-1` });
  collectReboundDiagnostics(initialResult.diagnostics, carriedDiagnostics);
  if (initialResult.status !== "succeeded") {
    return withCarriedDiagnostics(remapPlayModeAction(initialResult, action), carriedDiagnostics);
  }

  const initialState = parsePlayModeStateData(initialResult.data);
  if (initialState === null) {
    return withCarriedDiagnostics(remapPlayModeAction(initialResult, action), carriedDiagnostics);
  }

  const expectedHost = { hostId: initialResult.hostId, hostEpoch: initialResult.hostEpoch };
  if (isStablePlayModeTarget(initialState, targetState)) {
    return withCarriedDiagnostics(settledPlayModeResult(initialResult, action, targetState, "noop", initialState.state), carriedDiagnostics);
  }

  let requestSent = false;
  let latestState = initialState;
  let pollIndex = 2;

  for (;;) {
    const remainingMs = remainingTimeoutMs(startedAt, timeoutMs, now());
    if (remainingMs <= 0) {
      return withCarriedDiagnostics(playModeTimeoutResult(requestId, action, requestSent), carriedDiagnostics);
    }

    if (!requestSent && latestState.stable) {
      const requestResult = await requestPlayModeTarget(workflow, action, requestOperation, `${requestId}-request`);
      collectReboundDiagnostics(requestResult.diagnostics, carriedDiagnostics);
      if (requestResult.status !== "succeeded") {
        return withCarriedDiagnostics(remapPlayModeAction(requestResult, action), carriedDiagnostics);
      }
      if (!sameWorkflowHost(expectedHost, requestResult)) {
        return withCarriedDiagnostics(hostContinuityLostResult(requestId, action, expectedHost, requestResult), carriedDiagnostics);
      }
      requestSent = true;
    }

    const stateResult = await getPlayModeState(workflow, { requestId: `${requestId}-state-${pollIndex++}` });
    collectReboundDiagnostics(stateResult.diagnostics, carriedDiagnostics);
    if (stateResult.status !== "succeeded") {
      return withCarriedDiagnostics(remapPlayModeAction(stateResult, action), carriedDiagnostics);
    }
    if (!sameWorkflowHost(expectedHost, stateResult)) {
      return withCarriedDiagnostics(hostContinuityLostResult(requestId, action, expectedHost, stateResult), carriedDiagnostics);
    }

    const state = parsePlayModeStateData(stateResult.data);
    if (state === null) {
      return withCarriedDiagnostics(remapPlayModeAction(stateResult, action), carriedDiagnostics);
    }

    latestState = state;
    if (isStablePlayModeTarget(state, targetState)) {
      return withCarriedDiagnostics(settledPlayModeResult(stateResult, action, targetState, requestSent ? "accepted" : "observed_transition", initialState.state), carriedDiagnostics);
    }

    const sleepMs = Math.min(pollIntervalMs, remainingMs);
    await sleep(sleepMs);
  }
}
```

- [x] **步骤 3：添加 private result helpers**

继续添加：

```ts
function settledPlayModeResult(
  result: UnityAgentKitPublicResult,
  action: "enter_and_verify" | "exit_and_verify",
  targetState: PlayModeTargetState,
  request: "noop" | "accepted" | "observed_transition",
  initialState: string,
): UnityAgentKitPublicResult {
  const finalState = parsePlayModeStateData(result.data);
  return definePublicResult({
    ...result,
    tool: "unity_playmode",
    action,
    summary: targetState === "playmode" ? "PlayMode is stable." : "EditMode is stable.",
    evidence: {
      completion: "state_settled",
      targetState,
      request,
      initialState,
      finalState: finalState?.state ?? targetState,
      stable: finalState?.stable === true,
    },
  });
}

function remapPlayModeAction(
  result: UnityAgentKitPublicResult,
  action: "get_state" | "enter_and_verify" | "exit_and_verify",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_playmode",
    action,
    summary: result.summary || "PlayMode workflow could not establish trusted evidence.",
  });
}

function playModeTimeoutResult(
  requestId: string,
  action: "enter_and_verify" | "exit_and_verify",
  requestSent: boolean,
): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_playmode",
    action,
    requestId,
    summary: `Timed out waiting for ${action} to reach stable target state.`,
    mayStillBeRunning: requestSent,
    safeToRetry: false,
    nextStep: {
      kind: "read_state",
      tool: "unity_playmode",
      action: "get_state",
      reason: "Read the latest PlayMode state before deciding whether to retry the transition workflow.",
    },
  });
}

function hostContinuityLostResult(
  requestId: string,
  action: "enter_and_verify" | "exit_and_verify",
  expected: { hostId?: string; hostEpoch?: number },
  actual: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "error",
    code: "host.continuity_lost",
    message: "PlayMode workflow host continuity changed before the final state proof could be trusted.",
    details: { expected, actual: { hostId: actual.hostId, hostEpoch: actual.hostEpoch } },
    attribution: { operation: action, requestId },
  };
  return definePublicResult({
    status: "lost",
    tool: "unity_playmode",
    action,
    requestId,
    summary: diagnostic.message,
    code: diagnostic.code,
    message: diagnostic.message,
    diagnostics: [diagnostic],
    nextStep: {
      kind: "read_state",
      tool: "unity_playmode",
      action: "get_state",
      reason: "Read the current PlayMode state because the transition proof crossed a host continuity boundary.",
    },
  });
}

function sameWorkflowHost(expected: { hostId?: string; hostEpoch?: number }, result: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">): boolean {
  return expected.hostId === result.hostId && expected.hostEpoch === result.hostEpoch;
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, currentTime: number): number {
  return timeoutMs - Math.max(0, currentTime - startedAt);
}

function positiveFiniteOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function collectReboundDiagnostics(diagnostics: UnityAgentKitDiagnostic[], carriedDiagnostics: UnityAgentKitDiagnostic[]): void {
  const carriedIdentities = new Set(carriedDiagnostics.map(diagnosticIdentity));
  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== "host.rebound") continue;
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
  return diagnosticsToCarry.length === 0 ? result : definePublicResult({ ...result, diagnostics: [...result.diagnostics, ...diagnosticsToCarry] });
}

function diagnosticIdentity(diagnostic: UnityAgentKitDiagnostic): string {
  return JSON.stringify({ source: diagnostic.source, severity: diagnostic.severity, code: diagnostic.code, message: diagnostic.message, attribution: diagnostic.attribution });
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [x] **步骤 4：运行 TS PlayMode focused tests 验证通过**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/playmode-workflows.test.ts"
```

预期：PASS，`fail 0`。
证明：该检查证明 TS PlayMode no-op、request + poll、timeout continuation、host continuity guard 和 state parser/mapping 都通过 fake host transport 的 behavior tests。

- [x] **步骤 5：Commit TS PlayMode verify workflows**

```bash
git add plugins/unity-agent-kit/src/diagnostics/playmode.ts plugins/unity-agent-kit/src/workflows/playmode.ts plugins/unity-agent-kit/tests/playmode-workflows.test.ts
git commit -m "feat: add phase 5d playmode verify workflows"
```

---

### 任务 7：运行 focused verification 并同步 5D-02 execution evidence

**文件：**
- 修改：`docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
- 验证：TS focused tests、Unity focused tests、HostRuntime regression、scope guard、diff check

- [x] **步骤 1：运行 TS focused verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/playmode-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。
证明：该检查覆盖 5D-02 PlayMode workflow tests，并确认 editor/compile/console/test regressions、host runtime mapping、artifact Resource readback contract 和 timeout continuation contract 未被破坏。

- [x] **步骤 2：运行 Unity PlayMode focused verification**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-playmode-workflows.xml" -testFilter UnityAgentKit.Editor.Tests.PlayModeWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。
证明：该检查覆盖 Unity PlayMode DTO/router/adapter seam，证明 Unity C# 只做短主线程状态/请求操作。

- [x] **步骤 3：运行 Unity HostRuntime regression**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。
证明：该检查确认新增 PlayMode router entries 未破坏 Phase 5A host runtime、dispatch、shutdown、timeout 和 loopback behavior。

- [x] **步骤 4：运行 changed-file scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
expected_paths = {
    'plugins/unity-agent-kit/src/diagnostics/playmode.ts',
    'plugins/unity-agent-kit/src/workflows/playmode.ts',
    'plugins/unity-agent-kit/tests/playmode-workflows.test.ts',
    'unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs',
    'unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitPlayModeDiagnostics.cs',
    'unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs',
    'unity/Assets/UnityAgentKit/Editor/Tests/PlayModeWorkflowTests.cs',
    'docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md',
    'docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-02-playmode-workflows.md',
}
forbidden_markers = [
    'capture_game_view', 'unity_screenshot', 'screenshot.capture',
    'server.tool(', 'registerTool(', 'server.resource(', 'registerResource', 'ResourceTemplate',
    'plugins/unity-agent-kit/skills/',
    'unity_scene', 'unity_object', 'unity_component', 'unity_material', 'unity_asset', 'unity_prefab', 'unity_ui', 'unity_validation', 'unity_animation',
]
violations = []
for path_text in expected_paths:
    path = Path(path_text)
    if not path.exists():
        violations.append(f'missing expected 5D-02 file: {path_text}')
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    for marker in forbidden_markers:
        if marker in text:
            violations.append(f'forbidden marker {marker!r} in {path_text}')
print('PASS Phase 5D-02 changed-file scope guard' if not violations else '\n'.join(violations))
raise SystemExit(1 if violations else 0)
PY
```

预期：

```text
PASS Phase 5D-02 changed-file scope guard
```

- [x] **步骤 5：运行 whitespace check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 6：更新 Phase 5D execution index row**

在 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` 的 Candidate Plan Cards 表中，将 5D-02 row 从：

```markdown
| 5D-02 | PlayMode state snapshot, no-op evidence, enter/exit verify workflows, transition timeout/continuity | 5D-PLAYMODE-STATE-01, 5D-PLAYMODE-ENTER-01, 5D-PLAYMODE-EXIT-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | Phase 5A, Phase 5B, Phase 5C | pending | pending |
```

改为：

```markdown
| 5D-02 | PlayMode state snapshot, no-op evidence, enter/exit verify workflows, transition timeout/continuity | 5D-PLAYMODE-STATE-01, 5D-PLAYMODE-ENTER-01, 5D-PLAYMODE-EXIT-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | Phase 5A, Phase 5B, Phase 5C | `docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-02-playmode-workflows.md` | completed |
```

- [x] **步骤 7：追加 Phase 5D-02 completion evidence section**

在 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md` 的 5D-01b evidence section 后追加：

```markdown
## Phase 5D-02 Completion Evidence

5D-02 is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

- Focused TS verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/playmode-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `fail 0`.
- Unity PlayMode focused verification passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-playmode-workflows.xml` with `failed="0"`.
- Unity HostRuntime regression passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-host-runtime-regression.xml` with `failed="0"`.
- TS coverage for 5D-02 includes PlayMode state parser/mapping, `getPlayModeState`, `enterPlayModeAndVerify` no-op, `exitPlayModeAndVerify` no-op, request + poll to stable PlayMode, transition timeout continuation with `unity_playmode.get_state` nextStep, and host continuity loss guard.
- Unity coverage for 5D-02 includes PlayMode DTO roundtrip, main-thread dispatch requirement, state read no-mutation adapter evidence, enter no-op, enter request, and exit request short-operation evidence.
- Scope guard passed: `PASS Phase 5D-02 changed-file scope guard`.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.
```

Replace `fail 0` with exact pass/fail counts if the test runner prints them in the final verified run.

- [x] **步骤 8：更新 Current Next Manual Action**

Replace the current next action with:

```markdown
Review the next pending Phase 5D card and prepare expanded plan work for `5D-03`. Do not execute this index or re-execute completed `5D-01a` / `5D-01b` / `5D-02`; proceed to the next pending card only after its expanded plan is ready and approved.
```

- [x] **步骤 9：Commit evidence sync**

```bash
git add docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md
git commit -m "docs: record phase 5d playmode workflow evidence"
```

---

### 任务 8：最终自检和交接

**文件：**
- 修改：`docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-02-playmode-workflows.md`
- 验证：focused tests、scope guard、diff check、completion boundaries

- [x] **步骤 1：运行 final focused TS verification**

运行：

```bash
node --experimental-strip-types --test "plugins/unity-agent-kit/tests/playmode-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"
```

预期：PASS，`fail 0`。
证明：该检查重新覆盖 5D-02 PlayMode workflows、host runtime mapping 和 timeout continuation contract。

- [x] **步骤 2：运行 final Unity focused verification**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-final-playmode-workflows.xml" -testFilter UnityAgentKit.Editor.Tests.PlayModeWorkflowTests
```

预期：PASS，XML 中 `failed="0"`。
证明：该检查重新覆盖 Unity PlayMode DTO/router/short-operation evidence。

- [x] **步骤 3：运行 final diff check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：无输出，exit 0。

- [x] **步骤 4：确认 Phase 5D/Phase 5 completion boundaries**

检查 `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`：

- 5D-01a remains completed。
- 5D-01b remains completed。
- 5D-02 is completed。
- 5D-03 and 5D-04 remain pending。
- Completion Rule 仍要求 all active 5D cards complete。
- Phase 5D not marked completed。
- Phase 5 not marked completed。

- [x] **步骤 5：Commit plan checkbox sync if needed**

Only if this plan file was updated during execution, commit the checkbox sync:

```bash
git add docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-02-playmode-workflows.md
git commit -m "docs: update phase 5d playmode workflow plan progress"
```

- [x] **步骤 6：交接下一步提示词**

Return this handoff prompt:

```text
Phase 5D-02 PlayMode Workflows is complete with evidence. Next pending card is Phase 5D-03 Screenshot capture-method feasibility / artifact validation / Resource readback. Use superpowers:writing-plans to prepare the expanded 5D-03 implementation plan. Preserve Phase 5D scope boundaries: no public MCP tools, no /unity skill, no Phase 5E final daily loop E2E, and no Phase 6/7/8 domain workflows.
```

---

## 自检结果

- **规格覆盖度:** Covered. 5D-PLAYMODE-STATE-01 maps to tasks 1-2 and Unity task 4; 5D-PLAYMODE-ENTER-01 / 5D-PLAYMODE-EXIT-01 map to tasks 3-6; 5D-TIMEOUT-01 and 5D-HOST-01 map to tasks 5-7; 5D-SCOPE-01 maps to tasks 7-8.
- **占位符扫描:** Executable steps contain concrete code, commands, expected failures, expected passes, evidence wording, and commit commands; no placeholder step remains.
- **类型一致性:** TS operation names are `playmode.state.get`, `playmode.enter.request`, `playmode.exit.request`; public-shaped actions are `get_state`, `enter_and_verify`, `exit_and_verify`; C# DTO names match TS parser names.
- **拆分检查:** Recorded in header; 5D-02 remains a single PlayMode workflow unit and does not include Screenshot or combined evidence sync.
- **上游约束覆盖:** Roadmap/spec/user constraints are summarized and mapped to tasks; TS/Unity ownership boundary is enforced by task design and tests.
- **参考输入映射:** Reference inputs include roadmap, Phase 5D spec/index, existing workflow/diagnostics/router patterns, Unity editor diagnostics, and v2 reference; each maps to concrete tasks.
- **验证强度:** Behavior tasks use Node workflow tests through fake host transport and Unity EditMode tests through adapter seams; verification includes regressions, scope guard, HostRuntime regression, and diff check rather than symbol-only checks.
