# Unity Agent Kit Phase 5B Artifact / Resource / Timeout / Completion 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5B Artifact / Resource / Timeout / Completion 基础设施，使 Phase 5C / 5D / 5E 能复用稳定的 artifact metadata、internal Resource readback、timeout continuation 和 completion semantics。

**架构：** TS 侧拥有 consumer contract：类型收敛、URI parsing、safe path resolution、metadata validation、file-backed Resource readback、timeout/completion helpers。Unity C# 侧只实现 internal/test-only artifact contract smoke：解析 artifact root、写 fixed synthetic artifact payload + metadata、做 basic validation，不注册 public action 或真实 producer workflow。最终 evidence 记录 Phase 5B completed，但 Phase 5 保持 incomplete，因为 Phase 5C-5E 和 final daily loop E2E 未完成。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Node `fs/promises`、Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5B subplan
**Spec:** `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion-design.md`

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交修改文件。

## 文件结构

- 修改：`plugins/unity-agent-kit/src/contracts/result.ts` — 将 Phase 5A opaque `resource` / `resources` / `job` / `nextStep` 收敛为 Phase 5B typed contract，并让 `definePublicResult` 验证这些 optional public-result fields。
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — 将 Phase 5A optional-field preservation test 更新为 Phase 5B 合法 shapes，证明 host envelope 仍保留字段但不再接受 opaque invalid shapes。
- 创建：`plugins/unity-agent-kit/src/artifacts/types.ts` — 定义 artifact metadata、report locator、readback failure reason 和 readback result 类型。
- 创建：`plugins/unity-agent-kit/src/artifacts/paths.ts` — 定义 artifact root、metadata path、safe relative path 和 artifact-root 内路径解析。
- 创建：`plugins/unity-agent-kit/src/artifacts/metadata.ts` — 验证 `UnityAgentKitArtifactMetadata` schema、URI/type/id binding、locator safety、generic content validity 前置条件。
- 创建：`plugins/unity-agent-kit/src/resources/uri.ts` — 解析/格式化 Phase 5B 支持的三类 `unity://` Resource URI，拒绝 malformed / unsupported / path-like IDs。
- 创建：`plugins/unity-agent-kit/src/resources/readback.ts` — 实现内部 file-backed Resource readback API，不注册 MCP Resource handlers。
- 创建：`plugins/unity-agent-kit/src/workflows/timeout.ts` — 定义 category-level timeout / polling policy table 和 timeout continuation helper。
- 创建：`plugins/unity-agent-kit/src/workflows/completion.ts` — 实现最小 completion helpers，防止 request accepted、state settled、artifact complete、job report required、timeout 和 uncertain semantics 漂移。
- 创建：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts` — TS 行为测试：typed public result contract、URI parsing、safe paths、metadata/readback、scope boundary。
- 创建：`plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts` — TS 行为测试：timeout policy、timeout continuation、completion helpers。
- 创建：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` — Unity internal/test-only artifact metadata writer 和 basic validation contract。
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeArtifactTests.cs` — Unity EditMode smoke，证明 fixed synthetic artifact metadata 能按 Phase 5B contract 写出。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — Phase 5B evidence 通过后记录 direct executable plan、completed status 和下一步 Phase 5C handoff；保持 Phase 5 incomplete。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Phase 5B evidence 通过后记录事实性 partial evidence；保持 Phase 5 非 completed，Next Manual Action 指向 Phase 5C。
- 不创建：`plugins/unity-agent-kit/src/tools/`、`plugins/unity-agent-kit/src/mcp/`、`plugins/unity-agent-kit/skills/unity`、`plugins/unity-agent-kit/skills/unity.md`。

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 v2 的 host runtime、loopback HTTP、registry/probe、operation envelope、host rebirth/rebind 和稳定错误语义；TS 负责 workflow 编排、轮询、timeout、host rebind、Resource URI assembly、diagnostics convergence 和最终 status judgment；Unity C# 负责短主线程动作、状态 snapshot、job/report record、artifact 落盘与基础校验；禁止 Unity 主线程长阻塞、HTTP handler 忙等、后台线程直接调用 Unity API 或把复杂 workflow 编排移入 Unity C# host。
- **Phase Scope:** Phase 5B 只实现 Artifact / Resource / Timeout / Completion 基础设施：artifact metadata + safe path、内部 Resource readback、job/nextStep contract、timeout policy/helper、completion helper、Unity internal artifact smoke。
- **Phase Out-of-scope:** 不实现 Phase 5C editor/compile/console workflows；不实现 Phase 5D TestRunner/PlayMode/screenshot workflows；不实现 MCP Resource handlers、public MCP tools、`/unity` skill、validation-reports readback、generic job store、durable request queue、retention/cleanup subsystem 或 final daily loop E2E。
- **Success Criteria:** TS Resource/contract tests pass；TS timeout/completion tests pass；existing host runtime tests continue to pass；Unity artifact contract smoke tests pass；scope boundary check pass；docs/state check pass；`git diff --check` pass；Phase 5A remains completed；Phase 5B completion evidence recorded；Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。
- **用户确认事项:** Phase 5A remains completed，不重新打开；Phase 5B 使用 direct executable implementation plan，不创建 execution index；metadata 固定放在 `.ai-debug/unity-agent-kit/artifacts/metadata/...`；`reportLocator.kind` 只允许 `artifact_relative_path`；Phase 5B validation 是 generic infrastructure validity；file-backed readback 不要求 live host；completion helper 名称是语义示例，implementation 选择最小 helper API。
- **本计划不包含:** 不提前完成 Phase 5；不实现 Phase 5C / 5D / 5E；不创建 public MCP tool registration/export/action-dispatch wiring；不创建 actual skill；不把 Unity C# host 变成 workflow 编排层；不实现真实 screenshot/test/console business workflow；不实现 `unity://validation-reports/{reportId}`。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion-design.md` | 已批准的 metadata layout、supported URI、generic validation、readback failure classification、job/nextStep/timeout/completion rules、Unity internal smoke、verification matrix | MCP Resource handlers、public tools、real screenshot/test/console workflows、validation-reports、generic job store | Phase 5B 明确只做基础设施 contract | 任务 1-6 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Shared Constraints、TS/Unity ownership、artifact/resource 范围、Phase 5 partial 状态、Phase 5B 后移交 Phase 5C | 修改 roadmap Goal/Non-goals/Shared Constraints/phase 顺序 | 本计划只能做事实性 evidence sync | 任务 6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | 5A completed、5B pending、Phase 5 completed rule、direct subplan state sync 入口 | 创建 5B execution index | Phase 5B spec 已批准直接 executable plan | 任务 6 |
| `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md` | 5B scope：Artifact store、Resource readback、timeout/polling、completion rules；5C/5D/5E 边界 | 5C/5D/5E workflows 和 MCP/skill/E2E landing | 本 plan 只覆盖 Phase 5B | 任务 1-6 |
| `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | Timeout contract、TS/Unity ownership、Resource URI assembly、completion evidence boundary | 19 个 P0 action 的 business implementation | P0 workflows 分属 5C/5D/5E | 任务 3-6 |
| `plugins/unity-agent-kit/src/contracts/result.ts` | Existing public result status、diagnostics shape、`definePublicResult` gate | Opaque resource/job/nextStep shape | Phase 5B 要收敛 optional public-result contract | 任务 1 |
| `plugins/unity-agent-kit/tests/host-runtime.test.ts` | Node test runner 风格、sample helpers、host client optional field preservation evidence | 继续用 opaque invalid optional field shapes | Phase 5B 后这些字段必须 typed | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` | `GetProjectRoot()` 基于 `Application.dataPath`，避免 `Environment.CurrentDirectory` | 把 artifact root 放进 `Library/UnityAgentKit` | Phase 5B artifact root 固定在 repo `.ai-debug/unity-agent-kit/artifacts/` | 任务 5 |
| `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` | NUnit/EditMode 风格、`TemporaryRegistryPath`、path normalization、DTO roundtrip tests | 把 artifact smoke 塞入 existing HostRuntimeTests partial class | 保持 artifact smoke 文件职责独立 | 任务 5 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ScreenshotService.cs` | 仅作为 Phase 5D screenshot producer 参考：Game View lookup / focus / repaint / target-size 机制 | Phase 5B 中实现真实 screenshot capture 或直接 pixel read path | Phase 5B 只做 synthetic artifact contract smoke；真实 screenshot 属于 Phase 5D | 任务 5 scope guard |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ConsoleService.cs` | 仅作为 Phase 5C console producer 参考：`UnityEditor.LogEntries` reflection readback 经验 | Phase 5B 中实现 console snapshot workflow | Phase 5B 只定义 console snapshot resource contract | 任务 3 scope guard |
| Phase 5A hardening evidence | TS optional fields pass-through、host-level timeout 与 workflow timeout 分层、Phase 5A remains completed | 重新打开 Phase 5A 或修改 host-level timeout semantics | Phase 5B 在 TS workflow layer 上建立 timeout continuation | 任务 1、4、6 |

## Phase 1-4 合规矩阵

| 上游阶段 | 本计划采用的约束 | 验证方式 |
|---|---|---|
| Phase 1 — 架构与边界蓝图 | Unity Agent Kit 是 skills + public tools + internal operations + host runtime + resources 的体系；TS/Unity 职责分离；不把 internal operations 全暴露成 public tools | Scope guard 确认不创建 `src/tools`、`src/mcp`、`skills/unity.md`；TS/Unity tests 只覆盖基础 contract |
| Phase 2 — Skill 体系设计 | actual `/unity` skill 归 Phase 5E；Phase 5B 不写 skill recipe | Scope guard 确认 skill 文件不存在；docs state 保持 Phase 5E pending |
| Phase 3 — Public MCP Tool Action Design | Resource reference、artifact ID/report ID、completion semantics 与 public result envelope 对齐；public tools 不在本计划注册 | `definePublicResult` typed field tests；readback tests；scope guard |
| Phase 4 — Async / Job / Workflow / Artifact Semantics | request accepted、state settled、artifact complete、job report required、timeout/lost/uncertain 语义分离 | `timeout-completion-contract.test.ts` 证明 accepted/settled 不伪装 verified success，artifact success 依赖 Resource readback |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS Resource URI/readback contract | 独立 `resources/uri.ts` + `resources/readback.ts`，不注册 MCP handler | 8 | 缩小 supported URI type 或增加 red test 后再实现 |
| Artifact metadata schema | `generated ID + metadata binding + safe relative path`，metadata deterministic lookup | 8 | 移除非必要字段或保留为 optional，不用 payload directory scan |
| Safe path/traversal rejection | `artifacts/paths.ts` 统一拒绝 absolute、drive path、`../`、backslash、encoded traversal | 8 | 先补 traversal red test，再修 resolver |
| Timeout continuation contract | category table + helper 输出 `mayStillBeRunning`、`safeToRetry`、bounded `nextStep` | 8 | 降低 policy 粒度，但不得移入 Unity C# host |
| Completion rule helpers | 最小 helper API，仅编码通用 semantics | 8 | 删除越界 helper，不实现 action-specific evaluator |
| Unity internal artifact smoke | internal/test-only writer + NUnit smoke；不注册 operation | 7 | 缩小为 metadata-only smoke，不能引入 producer lifecycle |
| v2 reference mapping | 只吸收底层经验，不继承 public contract | 8 | 在 plan 或 code review 中补采用/不采用原因 |

低于 7/10 的对象不得进入 Phase 5B completion evidence。处理方式只能是修订方案、排除出 completion evidence，或由用户逐条明确接受风险。

## Roadmap Phase Upgrade Check

当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。

理由：Phase 5B 是 Phase 5 内部共享基础设施 gate，依赖 Phase 5A，输出供 Phase 5C / 5D / 5E 使用，不具备独立 roadmap goal，不独立解锁 Phase 6 / 7 / 8。

如果执行中发现 Phase 5B 获得独立 roadmap goal、独立跨 phase blocker、需要独立 blocker/current-state，或 strict plan 无法覆盖单一 cohesive infrastructure patch，停止并进入 roadmap structural change 或 subplan split review。

---

### 任务 1：TS public result optional fields typed contract

**文件：**
- 创建：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`
- 修改：`plugins/unity-agent-kit/src/contracts/result.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 typed public result tests**

创建 `plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`，先写 public-result contract tests：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";

const emptyDiagnostics: UnityAgentKitDiagnostic[] = [];

function baseResult(overrides: Partial<UnityAgentKitPublicResult> = {}): UnityAgentKitPublicResult {
  return {
    status: "succeeded",
    tool: "unity_test",
    action: "get_result",
    summary: "Base result.",
    diagnostics: [],
    ...overrides,
  };
}

test("publicResultAcceptsPhase5BResourceJobAndNextStepShapes", () => {
  const result = definePublicResult(baseResult({
    status: "timeout",
    summary: "Test job may still be running.",
    resource: {
      uri: "unity://screenshots/shot-1",
      type: "screenshot",
      artifactId: "shot-1",
      validationStatus: "valid",
      summary: "Synthetic screenshot artifact.",
    },
    resources: [
      {
        uri: "unity://console-snapshots/console-1",
        type: "console_snapshot",
        artifactId: "console-1",
        validationStatus: "uncertain",
        summary: "Console snapshot reference.",
      },
    ],
    job: {
      jobId: "job-1",
      tool: "unity_test",
      action: "run_and_collect",
      state: "running",
      createdAt: "2026-05-22T10:00:00.000Z",
      updatedAt: "2026-05-22T10:00:01.000Z",
      hostId: "host-a",
      hostEpoch: 3,
      reportId: "report-1",
      artifactIds: ["shot-1"],
      lastKnownContinuity: "current",
      diagnostics: emptyDiagnostics,
    },
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-1",
      reason: "The job was accepted and may still be running.",
    },
    safeToRetry: false,
    mayStillBeRunning: true,
  }));

  assert.equal(result.resource?.uri, "unity://screenshots/shot-1");
  assert.equal(result.resources?.[0]?.type, "console_snapshot");
  assert.equal(result.job?.state, "running");
  assert.equal(result.nextStep?.kind, "check_job_status");
});

test("publicResultRejectsMalformedResourceJobAndNextStepShapes", () => {
  assert.throws(
    () => definePublicResult(baseResult({
      resource: {
        uri: "unity://screenshots/shot-1",
        type: "test_report",
        artifactId: "shot-1",
        validationStatus: "valid",
        summary: "Mismatched resource shape.",
      },
    })),
    /resource/i,
  );

  assert.throws(
    () => definePublicResult(baseResult({
      job: {
        jobId: "job-1",
        tool: "unity_test",
        action: "run_and_collect",
        state: "done",
        createdAt: "2026-05-22T10:00:00.000Z",
        lastKnownContinuity: "current",
        diagnostics: [{ source: "workflow", severity: "info", message: "done" }],
      },
    })),
    /job/i,
  );

  assert.throws(
    () => definePublicResult(baseResult({
      nextStep: {
        kind: "retry_later",
        reason: "Invalid kind.",
      } as never,
    })),
    /nextStep/i,
  );
});
```

- [x] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts
```

预期：FAIL，`publicResultRejectsMalformedResourceJobAndNextStepShapes` 不会抛出 resource/job/nextStep shape error，或因为后续 import 文件尚不存在而失败。

证明：该 red 证明 Phase 5A 的 optional fields 仍是 opaque pass-through，尚未被 Phase 5B typed contract 收敛。

- [x] **步骤 3：实现 `result.ts` typed contract validators**

在 `plugins/unity-agent-kit/src/contracts/result.ts` 中，用以下类型替换现有 opaque `UnityAgentKitResourceReference` / `UnityAgentKitJobReference` / `UnityAgentKitNextStep`，并在 `definePublicResult` 中增加 optional field validation：

```ts
export type UnityAgentKitResourceType = "screenshot" | "test_report" | "console_snapshot";
export type UnityAgentKitValidationStatus = "valid" | "invalid" | "uncertain";

export interface UnityAgentKitResourceReference {
  uri: string;
  type: UnityAgentKitResourceType;
  artifactId?: string;
  reportId?: string;
  validationStatus: UnityAgentKitValidationStatus;
  summary: string;
}

export type UnityAgentKitJobState =
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout"
  | "lost"
  | "unknown";

export type UnityAgentKitJobContinuity = "current" | "recovered" | "lost" | "unknown";

export interface UnityAgentKitJobReference {
  jobId: string;
  tool: string;
  action: string;
  state: UnityAgentKitJobState;
  createdAt: string;
  updatedAt?: string;
  hostId?: string;
  hostEpoch?: number;
  reportId?: string;
  artifactIds?: string[];
  lastKnownContinuity: UnityAgentKitJobContinuity;
  diagnostics?: UnityAgentKitDiagnostic[];
}

export type UnityAgentKitNextStepKind =
  | "read_resource"
  | "check_job_status"
  | "get_job_result"
  | "read_state"
  | "rerun_with_confirmation"
  | "inspect_diagnostics";

export interface UnityAgentKitNextStep {
  kind: UnityAgentKitNextStepKind;
  tool?: string;
  action?: string;
  resourceUri?: string;
  jobId?: string;
  reason: string;
}
```

在 `definePublicResult` 之前添加 validators：

```ts
const resourceTypes = ["screenshot", "test_report", "console_snapshot"] as const;
const validationStatuses = ["valid", "invalid", "uncertain"] as const;
const jobStates = ["accepted", "running", "completed", "failed", "cancelled", "timeout", "lost", "unknown"] as const;
const jobContinuities = ["current", "recovered", "lost", "unknown"] as const;
const nextStepKinds = ["read_resource", "check_job_status", "get_job_result", "read_state", "rerun_with_confirmation", "inspect_diagnostics"] as const;

function isResourceReference(value: unknown): value is UnityAgentKitResourceReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const resource = value as Record<string, unknown>;
  if (!(
    typeof resource.uri === "string" &&
    resource.uri.length > 0 &&
    typeof resource.type === "string" &&
    resourceTypes.includes(resource.type as UnityAgentKitResourceType) &&
    typeof resource.validationStatus === "string" &&
    validationStatuses.includes(resource.validationStatus as UnityAgentKitValidationStatus) &&
    typeof resource.summary === "string" &&
    resource.summary.length > 0
  )) {
    return false;
  }

  if (resource.type === "test_report") {
    return typeof resource.reportId === "string" && resource.reportId.length > 0 && resource.artifactId === undefined;
  }

  return typeof resource.artifactId === "string" && resource.artifactId.length > 0 && resource.reportId === undefined;
}

function isJobReference(value: unknown): value is UnityAgentKitJobReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const job = value as Record<string, unknown>;
  return (
    typeof job.jobId === "string" &&
    job.jobId.length > 0 &&
    typeof job.tool === "string" &&
    job.tool.length > 0 &&
    typeof job.action === "string" &&
    job.action.length > 0 &&
    typeof job.state === "string" &&
    jobStates.includes(job.state as UnityAgentKitJobState) &&
    typeof job.createdAt === "string" &&
    job.createdAt.length > 0 &&
    (job.updatedAt === undefined || typeof job.updatedAt === "string") &&
    (job.hostId === undefined || typeof job.hostId === "string") &&
    (job.hostEpoch === undefined || (typeof job.hostEpoch === "number" && Number.isInteger(job.hostEpoch))) &&
    (job.reportId === undefined || typeof job.reportId === "string") &&
    (job.artifactIds === undefined || (Array.isArray(job.artifactIds) && job.artifactIds.every((id) => typeof id === "string" && id.length > 0))) &&
    typeof job.lastKnownContinuity === "string" &&
    jobContinuities.includes(job.lastKnownContinuity as UnityAgentKitJobContinuity) &&
    (job.diagnostics === undefined || (Array.isArray(job.diagnostics) && job.diagnostics.every(isDiagnostic)))
  );
}

function isNextStep(value: unknown): value is UnityAgentKitNextStep {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const nextStep = value as Record<string, unknown>;
  return (
    typeof nextStep.kind === "string" &&
    nextStepKinds.includes(nextStep.kind as UnityAgentKitNextStepKind) &&
    (nextStep.tool === undefined || typeof nextStep.tool === "string") &&
    (nextStep.action === undefined || typeof nextStep.action === "string") &&
    (nextStep.resourceUri === undefined || typeof nextStep.resourceUri === "string") &&
    (nextStep.jobId === undefined || typeof nextStep.jobId === "string") &&
    typeof nextStep.reason === "string" &&
    nextStep.reason.length > 0
  );
}
```

在 `definePublicResult` 中保留既有 status/diagnostics validation，并追加：

```ts
  if (result.resource !== undefined && !isResourceReference(result.resource)) {
    throw new Error("Public result resource must use the UnityAgentKitResourceReference shape.");
  }

  if (result.resources !== undefined && (!Array.isArray(result.resources) || !result.resources.every(isResourceReference))) {
    throw new Error("Public result resources must use the UnityAgentKitResourceReference shape.");
  }

  if (result.job !== undefined && !isJobReference(result.job)) {
    throw new Error("Public result job must use the UnityAgentKitJobReference shape.");
  }

  if (result.nextStep !== undefined && !isNextStep(result.nextStep)) {
    throw new Error("Public result nextStep must use the UnityAgentKitNextStep shape.");
  }
```

- [x] **步骤 4：更新 Phase 5A optional field preservation test 为合法 Phase 5B shapes**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 的 `invokeOperationPreservesPublicResultOptionalFields` 中，将 `optionalFields` 替换为：

```ts
  const optionalFields = {
    evidence: { phase: "5B-contract" },
    resource: {
      uri: "unity://screenshots/shot-opaque",
      type: "screenshot",
      artifactId: "shot-opaque",
      validationStatus: "valid",
      summary: "Opaque host screenshot reference using the Phase 5B shape.",
    },
    resources: [
      {
        uri: "unity://console-snapshots/console-opaque",
        type: "console_snapshot",
        artifactId: "console-opaque",
        validationStatus: "uncertain",
        summary: "Opaque host console snapshot reference using the Phase 5B shape.",
      },
    ],
    metadata: { owner: "unity-host", timeoutLayer: "host" },
    job: {
      jobId: "job-opaque",
      tool: "unity_test",
      action: "run_and_collect",
      state: "running",
      createdAt: "2026-05-22T10:00:00.000Z",
      lastKnownContinuity: "current",
    },
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-opaque",
      reason: "The host reported an opaque running job with a Phase 5B next step.",
    },
    safeToRetry: false,
    mayStillBeRunning: true,
  };
```

- [x] **步骤 5：运行 TS tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/host-runtime.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 public-result optional fields 已从 opaque object 收敛为 Phase 5B typed shapes，且 Phase 5A host-runtime optional-field preservation evidence 仍然成立。

- [x] **步骤 6：Commit**

```bash
git add plugins/unity-agent-kit/src/contracts/result.ts plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5b public result contracts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：Artifact paths and Resource URI parsing

**文件：**
- 修改：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`
- 创建：`plugins/unity-agent-kit/src/artifacts/types.ts`
- 创建：`plugins/unity-agent-kit/src/artifacts/paths.ts`
- 创建：`plugins/unity-agent-kit/src/resources/uri.ts`

- [x] **步骤 1：编写失败的 URI 和 path tests**

在 `plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts` 的 imports 中追加：

```ts
import {
  artifactRootForProject,
  metadataRelativePathForParsedResource,
  resolveArtifactRelativePath,
} from "../src/artifacts/paths.ts";
import { formatUnityResourceUri, parseUnityResourceUri } from "../src/resources/uri.ts";
```

在文件末尾追加 tests：

```ts
test("resourceUriParsingAcceptsOnlyPhase5BSupportedTypes", () => {
  assert.deepEqual(parseUnityResourceUri("unity://screenshots/shot-1"), {
    ok: true,
    resource: {
      uri: "unity://screenshots/shot-1",
      collection: "screenshots",
      type: "screenshot",
      id: "shot-1",
      artifactId: "shot-1",
    },
  });
  assert.deepEqual(parseUnityResourceUri("unity://test-reports/report-1"), {
    ok: true,
    resource: {
      uri: "unity://test-reports/report-1",
      collection: "test-reports",
      type: "test_report",
      id: "report-1",
      reportId: "report-1",
    },
  });
  assert.deepEqual(parseUnityResourceUri("unity://console-snapshots/console-1"), {
    ok: true,
    resource: {
      uri: "unity://console-snapshots/console-1",
      collection: "console-snapshots",
      type: "console_snapshot",
      id: "console-1",
      artifactId: "console-1",
    },
  });

  assert.equal(formatUnityResourceUri("screenshot", "shot-2"), "unity://screenshots/shot-2");
  assert.equal(formatUnityResourceUri("test_report", "report-2"), "unity://test-reports/report-2");
  assert.equal(formatUnityResourceUri("console_snapshot", "console-2"), "unity://console-snapshots/console-2");
});

test("resourceUriParsingRejectsMalformedUnsupportedAndPathLikeIds", () => {
  for (const uri of [
    "unity://validation-reports/report-1",
    "unity://screenshots/",
    "unity://screenshots/../secret",
    "unity://screenshots/%2e%2e%2fsecret",
    "unity://screenshots/C:%5Csecret",
    "unity://screenshots/shot/extra",
    "file:///tmp/shot-1",
  ]) {
    const parsed = parseUnityResourceUri(uri);
    assert.equal(parsed.ok, false, uri);
  }
});

test("artifactPathsUseDeterministicMetadataLayoutAndRejectTraversal", () => {
  const projectRoot = path.join(os.tmpdir(), "phase5b-project");
  const artifactRoot = artifactRootForProject(projectRoot);
  assert.equal(
    artifactRoot,
    path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts"),
  );

  const screenshot = parseUnityResourceUri("unity://screenshots/shot-1");
  assert.equal(screenshot.ok, true);
  if (screenshot.ok) {
    assert.equal(metadataRelativePathForParsedResource(screenshot.resource), "metadata/screenshots/shot-1.json");
  }

  const report = parseUnityResourceUri("unity://test-reports/report-1");
  assert.equal(report.ok, true);
  if (report.ok) {
    assert.equal(metadataRelativePathForParsedResource(report.resource), "metadata/test-reports/report-1.json");
  }

  assert.equal(resolveArtifactRelativePath(artifactRoot, "screenshots/shot-1.txt").ok, true);
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "../outside.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "screenshots/%2e%2e/secret.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "C:/secret.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "screenshots\\shot-1.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
});
```

- [x] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/artifacts/paths.ts'` 或 `Cannot find module '../src/resources/uri.ts'`。

证明：该 red 证明 Resource URI parsing 和 deterministic metadata path infrastructure 尚未实现。

- [x] **步骤 3：创建 artifact/readback shared types**

创建 `plugins/unity-agent-kit/src/artifacts/types.ts`：

```ts
import type {
  UnityAgentKitDiagnostic,
  UnityAgentKitResourceReference,
  UnityAgentKitResourceType,
  UnityAgentKitValidationStatus,
} from "../contracts/result.ts";

export type UnityAgentKitArtifactType = UnityAgentKitResourceType;
export type UnityAgentKitResourceCollection = "screenshots" | "test-reports" | "console-snapshots";
export type UnityAgentKitReadbackFailureReason =
  | "metadata_missing"
  | "file_missing"
  | "path_outside_artifact_root"
  | "validation_failed"
  | "unsupported_type"
  | "host_unavailable"
  | "artifact_lost";

export interface UnityAgentKitReportLocator {
  kind: "artifact_relative_path";
  relativePath: string;
}

export interface UnityAgentKitArtifactMetadata {
  schemaVersion: 1;
  id: string;
  type: UnityAgentKitArtifactType;
  uri: string;
  relativePath?: string;
  reportLocator?: UnityAgentKitReportLocator;
  createdAt: string;
  validationStatus: UnityAgentKitValidationStatus;
  hostId?: string;
  hostEpoch?: number;
  producerTool: string;
  producerAction: string;
  producerJobId?: string;
  sizeBytes?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ParsedUnityResource {
  uri: string;
  collection: UnityAgentKitResourceCollection;
  type: UnityAgentKitArtifactType;
  id: string;
  artifactId?: string;
  reportId?: string;
}

export type UnityAgentKitResourceReadResult =
  | {
      ok: true;
      resource: UnityAgentKitResourceReference;
      metadata: UnityAgentKitArtifactMetadata;
      filePath: string;
      contentBytes: Uint8Array;
    }
  | {
      ok: false;
      reason: UnityAgentKitReadbackFailureReason;
      diagnostic: UnityAgentKitDiagnostic;
    };
```

- [x] **步骤 4：创建 artifact path helpers**

创建 `plugins/unity-agent-kit/src/artifacts/paths.ts`：

```ts
import path from "node:path";
import type { ParsedUnityResource, UnityAgentKitReadbackFailureReason } from "./types.ts";

export function artifactRootForProject(projectRoot: string): string {
  return path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
}

export function metadataRelativePathForParsedResource(resource: ParsedUnityResource): string {
  return path.posix.join("metadata", resource.collection, `${resource.id}.json`);
}

export function resolveArtifactRelativePath(
  artifactRoot: string,
  relativePath: string,
): { ok: true; path: string } | { ok: false; reason: UnityAgentKitReadbackFailureReason } {
  if (!isSafeArtifactRelativePath(relativePath)) {
    return { ok: false, reason: "path_outside_artifact_root" };
  }

  const root = path.resolve(artifactRoot);
  const target = path.resolve(root, relativePath.split("/").join(path.sep));
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (target !== root && !target.startsWith(rootPrefix)) {
    return { ok: false, reason: "path_outside_artifact_root" };
  }

  return { ok: true, path: target };
}

export function isSafeArtifactRelativePath(relativePath: string): boolean {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return false;
  }

  if (relativePath.includes("\\") || relativePath.includes("\0")) {
    return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    return false;
  }

  if (decoded !== relativePath && hasUnsafePathSegments(decoded)) {
    return false;
  }

  if (path.isAbsolute(relativePath) || /^[A-Za-z]:/.test(relativePath)) {
    return false;
  }

  return !hasUnsafePathSegments(relativePath);
}

function hasUnsafePathSegments(value: string): boolean {
  if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/.test(value)) {
    return true;
  }

  const parts = value.split("/");
  return parts.some((part) => part.length === 0 || part === "." || part === "..");
}
```

- [x] **步骤 5：创建 Resource URI parser/formatter**

创建 `plugins/unity-agent-kit/src/resources/uri.ts`：

```ts
import type { ParsedUnityResource, UnityAgentKitResourceCollection } from "../artifacts/types.ts";
import type { UnityAgentKitResourceType } from "../contracts/result.ts";

const collectionByType = {
  screenshot: "screenshots",
  test_report: "test-reports",
  console_snapshot: "console-snapshots",
} as const satisfies Record<UnityAgentKitResourceType, UnityAgentKitResourceCollection>;

const typeByCollection = {
  screenshots: "screenshot",
  "test-reports": "test_report",
  "console-snapshots": "console_snapshot",
} as const satisfies Record<UnityAgentKitResourceCollection, UnityAgentKitResourceType>;

export type ResourceUriParseResult =
  | { ok: true; resource: ParsedUnityResource }
  | { ok: false; reason: "unsupported_type" };

export function formatUnityResourceUri(type: UnityAgentKitResourceType, id: string): string {
  if (!isSafeResourceId(id)) {
    throw new Error(`Resource id is not safe: ${id}`);
  }

  return `unity://${collectionByType[type]}/${id}`;
}

export function parseUnityResourceUri(uri: string): ResourceUriParseResult {
  const match = /^unity:\/\/([^/]+)\/([^/?#]+)$/.exec(uri);
  if (match === null) {
    return { ok: false, reason: "unsupported_type" };
  }

  const collection = match[1];
  const id = match[2];
  if (!isSupportedCollection(collection) || !isSafeResourceId(id)) {
    return { ok: false, reason: "unsupported_type" };
  }

  const type = typeByCollection[collection];
  return {
    ok: true,
    resource: {
      uri,
      collection,
      type,
      id,
      ...(type === "test_report" ? { reportId: id } : { artifactId: id }),
    },
  };
}

function isSupportedCollection(value: string): value is UnityAgentKitResourceCollection {
  return value === "screenshots" || value === "test-reports" || value === "console-snapshots";
}

function isSafeResourceId(id: string): boolean {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)) {
    return false;
  }

  return !id.includes("%") && !id.includes(".") && !id.includes("/") && !id.includes("\\") && !/^[A-Za-z]:/.test(id);
}
```

- [x] **步骤 6：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 URI parsing 只接受 Phase 5B 三类 supported Resources，`validation-reports` 不被实现，metadata lookup path deterministic，safe relative path resolver 拒绝 traversal、encoded traversal、Windows drive path 和 backslash path。

- [x] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/artifacts/types.ts plugins/unity-agent-kit/src/artifacts/paths.ts plugins/unity-agent-kit/src/resources/uri.ts plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5b resource uri paths

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Metadata validation and internal file-backed Resource readback

**文件：**
- 修改：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`
- 创建：`plugins/unity-agent-kit/src/artifacts/metadata.ts`
- 创建：`plugins/unity-agent-kit/src/resources/readback.ts`

- [x] **步骤 1：编写失败的 metadata/readback tests**

在 `plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts` 的 imports 中追加：

```ts
import { readUnityResource } from "../src/resources/readback.ts";
```

在文件末尾追加 helpers 和 tests：

```ts
async function withArtifactProject(testBody: (projectRoot: string, artifactRoot: string) => Promise<void>): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-phase5b-"));
  const artifactRoot = artifactRootForProject(projectRoot);
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function writeArtifactFixture(
  artifactRoot: string,
  metadataRelativePath: string,
  metadata: Record<string, unknown>,
  payloadRelativePath: string,
  payload: string,
): Promise<void> {
  const payloadPath = path.join(artifactRoot, ...payloadRelativePath.split("/"));
  const metadataPath = path.join(artifactRoot, ...metadataRelativePath.split("/"));
  await writeFile(payloadPath, payload, { encoding: "utf8", flag: "w" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await import("node:fs/promises").then(async ({ mkdir }) => {
      await mkdir(path.dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, payload, "utf8");
    });
  });
  await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
  await writeJsonFile(metadataPath, metadata);
}

function screenshotMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "shot-1",
    type: "screenshot",
    uri: "unity://screenshots/shot-1",
    relativePath: "screenshots/shot-1.txt",
    createdAt: "2026-05-22T10:00:00.000Z",
    validationStatus: "valid",
    hostId: "host-a",
    hostEpoch: 3,
    producerTool: "unity_screenshot",
    producerAction: "capture_game_view",
    sizeBytes: 12,
    diagnostics: [],
    ...overrides,
  };
}

function reportMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "report-1",
    type: "test_report",
    uri: "unity://test-reports/report-1",
    reportLocator: {
      kind: "artifact_relative_path",
      relativePath: "test-reports/report-1.txt",
    },
    createdAt: "2026-05-22T10:00:00.000Z",
    validationStatus: "valid",
    producerTool: "unity_test",
    producerAction: "run_and_collect",
    sizeBytes: 13,
    diagnostics: [],
    ...overrides,
  };
}

test("resourceReadbackSucceedsForExistingMetadataAndReadableFileWithoutLiveHost", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    await writeArtifactFixture(
      artifactRoot,
      "metadata/screenshots/shot-1.json",
      screenshotMetadata(),
      "screenshots/shot-1.txt",
      "synthetic image",
    );

    const result = await readUnityResource(projectRoot, "unity://screenshots/shot-1");

    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) {
      return;
    }
    assert.equal(result.resource.uri, "unity://screenshots/shot-1");
    assert.equal(result.resource.type, "screenshot");
    assert.equal(result.resource.artifactId, "shot-1");
    assert.equal(result.resource.validationStatus, "valid");
    assert.equal(Buffer.from(result.contentBytes).toString("utf8"), "synthetic image");
  });
});

test("resourceReadbackUsesReportLocatorOnlyUnderTestReports", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    await writeArtifactFixture(
      artifactRoot,
      "metadata/test-reports/report-1.json",
      reportMetadata(),
      "test-reports/report-1.txt",
      "synthetic report",
    );

    const result = await readUnityResource(projectRoot, "unity://test-reports/report-1");

    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) {
      return;
    }
    assert.equal(result.resource.type, "test_report");
    assert.equal(result.resource.reportId, "report-1");
    assert.equal(Buffer.from(result.contentBytes).toString("utf8"), "synthetic report");
  });
});

test("resourceReadbackDoesNotScanPayloadDirectoriesWhenMetadataIsMissing", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const payloadPath = path.join(artifactRoot, "screenshots", "shot-1.txt");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(payloadPath), { recursive: true }));
    await writeFile(payloadPath, "orphaned evidence", "utf8");

    const result = await readUnityResource(projectRoot, "unity://screenshots/shot-1");

    assert.deepEqual(result.ok ? result : { ok: result.ok, reason: result.reason }, {
      ok: false,
      reason: "metadata_missing",
    });
  });
});

test("resourceReadbackClassifiesFileMissingAndValidationFailures", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const metadataPath = path.join(artifactRoot, "metadata", "screenshots", "shot-1.json");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
    await writeJsonFile(metadataPath, screenshotMetadata({ sizeBytes: 12 }));

    const missingFile = await readUnityResource(projectRoot, "unity://screenshots/shot-1");
    assert.equal(missingFile.ok, false);
    if (!missingFile.ok) {
      assert.equal(missingFile.reason, "file_missing");
    }

    await writeJsonFile(metadataPath, screenshotMetadata({ validationStatus: "uncertain" }));
    const uncertain = await readUnityResource(projectRoot, "unity://screenshots/shot-1");
    assert.equal(uncertain.ok, false);
    if (!uncertain.ok) {
      assert.equal(uncertain.reason, "validation_failed");
    }
  });
});

test("resourceReadbackRejectsUnsafeReportLocatorAndUnsupportedValidationReports", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const metadataPath = path.join(artifactRoot, "metadata", "test-reports", "report-1.json");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
    await writeJsonFile(metadataPath, reportMetadata({
      reportLocator: {
        kind: "artifact_relative_path",
        relativePath: "screenshots/not-a-report.txt",
      },
    }));

    const invalidLocator = await readUnityResource(projectRoot, "unity://test-reports/report-1");
    assert.equal(invalidLocator.ok, false);
    if (!invalidLocator.ok) {
      assert.equal(invalidLocator.reason, "path_outside_artifact_root");
    }
  });

  const unsupported = await readUnityResource(os.tmpdir(), "unity://validation-reports/report-1");
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(unsupported.reason, "unsupported_type");
  }
});
```

- [x] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/resources/readback.ts'`。

证明：该 red 证明内部 file-backed Resource readback 尚未实现，metadata missing / file missing / validation failure 等语义没有载体。

- [x] **步骤 3：实现 metadata validation**

创建 `plugins/unity-agent-kit/src/artifacts/metadata.ts`：

```ts
import { isSafeArtifactRelativePath } from "./paths.ts";
import type { ParsedUnityResource, UnityAgentKitArtifactMetadata, UnityAgentKitReadbackFailureReason } from "./types.ts";
import type { UnityAgentKitDiagnostic } from "../contracts/result.ts";

export type MetadataValidationResult =
  | { ok: true; metadata: UnityAgentKitArtifactMetadata; payloadRelativePath: string }
  | { ok: false; reason: UnityAgentKitReadbackFailureReason; diagnostic: UnityAgentKitDiagnostic };

export function validateArtifactMetadata(value: unknown, resource: ParsedUnityResource): MetadataValidationResult {
  if (typeof value !== "object" || value === null) {
    return fail("validation_failed", "artifact.metadata_invalid_shape", "Artifact metadata is not an object.");
  }

  const metadata = value as Record<string, unknown>;
  if (!(
    metadata.schemaVersion === 1 &&
    metadata.id === resource.id &&
    metadata.type === resource.type &&
    metadata.uri === resource.uri &&
    typeof metadata.createdAt === "string" &&
    metadata.createdAt.length > 0 &&
    (metadata.validationStatus === "valid" || metadata.validationStatus === "invalid" || metadata.validationStatus === "uncertain") &&
    typeof metadata.producerTool === "string" &&
    metadata.producerTool.length > 0 &&
    typeof metadata.producerAction === "string" &&
    metadata.producerAction.length > 0 &&
    Array.isArray(metadata.diagnostics) &&
    metadata.diagnostics.every(isDiagnostic) &&
    (metadata.hostId === undefined || typeof metadata.hostId === "string") &&
    (metadata.hostEpoch === undefined || (typeof metadata.hostEpoch === "number" && Number.isInteger(metadata.hostEpoch))) &&
    (metadata.producerJobId === undefined || typeof metadata.producerJobId === "string") &&
    (metadata.sizeBytes === undefined || (typeof metadata.sizeBytes === "number" && metadata.sizeBytes > 0))
  )) {
    return fail("validation_failed", "artifact.metadata_invalid_shape", "Artifact metadata failed Phase 5B schema validation.");
  }

  if (metadata.validationStatus !== "valid") {
    return fail("validation_failed", "artifact.validation_status_not_valid", "Artifact metadata validationStatus is not valid.");
  }

  const payloadRelativePath = payloadPathFromMetadata(metadata, resource);
  if (payloadRelativePath === null) {
    return fail("path_outside_artifact_root", "artifact.locator_invalid", "Artifact metadata locator is invalid for the resource type.");
  }

  if (metadata.sizeBytes !== undefined && metadata.sizeBytes <= 0) {
    return fail("validation_failed", "artifact.size_invalid", "Artifact metadata sizeBytes must be greater than zero.");
  }

  return { ok: true, metadata: metadata as unknown as UnityAgentKitArtifactMetadata, payloadRelativePath };
}

function payloadPathFromMetadata(metadata: Record<string, unknown>, resource: ParsedUnityResource): string | null {
  if (resource.type === "test_report") {
    const locator = metadata.reportLocator;
    if (typeof locator !== "object" || locator === null) {
      return null;
    }

    const reportLocator = locator as Record<string, unknown>;
    if (reportLocator.kind !== "artifact_relative_path" || typeof reportLocator.relativePath !== "string") {
      return null;
    }

    if (!reportLocator.relativePath.startsWith("test-reports/") || !isSafeArtifactRelativePath(reportLocator.relativePath)) {
      return null;
    }

    return reportLocator.relativePath;
  }

  if (typeof metadata.relativePath !== "string" || !isSafeArtifactRelativePath(metadata.relativePath)) {
    return null;
  }

  const expectedPrefix = resource.type === "screenshot" ? "screenshots/" : "console-snapshots/";
  return metadata.relativePath.startsWith(expectedPrefix) ? metadata.relativePath : null;
}

function fail(reason: UnityAgentKitReadbackFailureReason, code: string, message: string): MetadataValidationResult {
  return {
    ok: false,
    reason,
    diagnostic: {
      source: "resource-readback",
      severity: "error",
      code,
      message,
    },
  };
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  return (
    typeof diagnostic.source === "string" &&
    diagnostic.source.length > 0 &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    typeof diagnostic.message === "string" &&
    diagnostic.message.length > 0 &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string")
  );
}
```

- [x] **步骤 4：实现 internal Resource readback API**

创建 `plugins/unity-agent-kit/src/resources/readback.ts`：

```ts
import { readFile } from "node:fs/promises";
import { artifactRootForProject, metadataRelativePathForParsedResource, resolveArtifactRelativePath } from "../artifacts/paths.ts";
import { validateArtifactMetadata } from "../artifacts/metadata.ts";
import type { UnityAgentKitResourceReadResult, UnityAgentKitReadbackFailureReason } from "../artifacts/types.ts";
import type { UnityAgentKitDiagnostic, UnityAgentKitResourceReference } from "../contracts/result.ts";
import { parseUnityResourceUri } from "./uri.ts";

export async function readUnityResource(projectRoot: string, uri: string): Promise<UnityAgentKitResourceReadResult> {
  const parsed = parseUnityResourceUri(uri);
  if (!parsed.ok) {
    return fail("unsupported_type", "resource.unsupported_type", `Resource URI is not supported in Phase 5B: ${uri}`);
  }

  const artifactRoot = artifactRootForProject(projectRoot);
  const metadataPathResolution = resolveArtifactRelativePath(artifactRoot, metadataRelativePathForParsedResource(parsed.resource));
  if (!metadataPathResolution.ok) {
    return fail(metadataPathResolution.reason, "resource.metadata_path_invalid", "Resource metadata path is outside the artifact root.");
  }

  let metadataJson: string;
  try {
    metadataJson = await readFile(metadataPathResolution.path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("metadata_missing", "resource.metadata_missing", `Resource metadata is missing for ${uri}.`);
    }

    return fail("validation_failed", "resource.metadata_read_failed", formatErrorMessage(error));
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataJson);
  } catch {
    return fail("validation_failed", "resource.metadata_invalid_json", `Resource metadata is not valid JSON for ${uri}.`);
  }

  const validation = validateArtifactMetadata(metadata, parsed.resource);
  if (!validation.ok) {
    return validation;
  }

  const payloadPathResolution = resolveArtifactRelativePath(artifactRoot, validation.payloadRelativePath);
  if (!payloadPathResolution.ok) {
    return fail(payloadPathResolution.reason, "resource.payload_path_invalid", "Resource payload path is outside the artifact root.");
  }

  let contentBytes: Uint8Array;
  try {
    contentBytes = await readFile(payloadPathResolution.path);
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("file_missing", "resource.file_missing", `Resource payload is missing for ${uri}.`);
    }

    return fail("artifact_lost", "resource.file_read_failed", formatErrorMessage(error));
  }

  if (contentBytes.byteLength === 0) {
    return fail("validation_failed", "resource.content_empty", `Resource payload is empty for ${uri}.`);
  }

  return {
    ok: true,
    resource: toResourceReference(validation.metadata),
    metadata: validation.metadata,
    filePath: payloadPathResolution.path,
    contentBytes,
  };
}

function toResourceReference(metadata: { uri: string; type: string; id: string; validationStatus: string }): UnityAgentKitResourceReference {
  return {
    uri: metadata.uri,
    type: metadata.type as UnityAgentKitResourceReference["type"],
    ...(metadata.type === "test_report" ? { reportId: metadata.id } : { artifactId: metadata.id }),
    validationStatus: metadata.validationStatus as UnityAgentKitResourceReference["validationStatus"],
    summary: `${metadata.type} resource ${metadata.id} is readable.`,
  };
}

function fail(reason: UnityAgentKitReadbackFailureReason, code: string, message: string): UnityAgentKitResourceReadResult {
  return {
    ok: false,
    reason,
    diagnostic: {
      source: "resource-readback",
      severity: "error",
      code,
      message,
    },
  };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return String(error);
}
```

- [x] **步骤 5：运行 TS readback tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 Resource readback 通过 URI type + generated ID deterministic metadata path lookup，不扫描 payload directory；metadata/file mismatch 不会变 success；reportLocator 只接受 `test-reports/` 下 safe relative path；generic content validity 只要求 metadata/schema/locator/file readable/content non-empty/size/validationStatus/diagnostics，不进入 PNG/TestRunner/console schema；normal file-backed readback 不要求 live host。

- [x] **步骤 6：Commit**

```bash
git add plugins/unity-agent-kit/src/artifacts/metadata.ts plugins/unity-agent-kit/src/resources/readback.ts plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5b resource readback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Timeout policy and completion semantics helpers

**文件：**
- 创建：`plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/timeout.ts`
- 创建：`plugins/unity-agent-kit/src/workflows/completion.ts`

- [x] **步骤 1：编写失败的 timeout/completion tests**

创建 `plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import type { UnityAgentKitResourceReadResult } from "../src/artifacts/types.ts";
import {
  timeoutContinuationResult,
  timeoutPolicies,
} from "../src/workflows/timeout.ts";
import {
  artifactCompleteResult,
  jobReportRequiredResult,
  requestAcceptedResult,
  resourceReadFailureResult,
  stateSettledResult,
  uncertainEvidenceResult,
} from "../src/workflows/completion.ts";

test("timeoutPoliciesEncodeCategoryCapsAndRetryRules", () => {
  assert.equal(timeoutPolicies.lightweightRead.maxCapMs, 10_000);
  assert.equal(timeoutPolicies.readiness.maxCapMs, 60_000);
  assert.equal(timeoutPolicies.screenshotArtifact.maxCapMs, 60_000);
  assert.equal(timeoutPolicies.resourceReadback.maxCapMs, 30_000);
  assert.equal(timeoutPolicies.test.safeToRetry, "false");
  assert.ok(timeoutPolicies.test.nextStepKinds.includes("check_job_status"));
  assert.ok(timeoutPolicies.resourceReadback.nextStepKinds.includes("read_resource"));
});

test("timeoutContinuationResultIncludesBoundedNextStepAndDoesNotClaimFailure", () => {
  const result = timeoutContinuationResult({
    tool: "unity_test",
    action: "run_and_collect",
    requestId: "req-test-timeout",
    summary: "Test run timed out before report collection.",
    mayStillBeRunning: true,
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-1",
      reason: "The test job may still be running after the workflow timeout.",
    },
    job: {
      jobId: "job-1",
      tool: "unity_test",
      action: "run_and_collect",
      state: "timeout",
      createdAt: "2026-05-22T10:00:00.000Z",
      lastKnownContinuity: "current",
    },
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.safeToRetry, false);
  assert.equal(result.mayStillBeRunning, true);
  assert.equal(result.nextStep?.kind, "check_job_status");
  assert.equal(result.job?.jobId, "job-1");
  assert.equal(result.diagnostics[0].code, "workflow.timeout");
});

test("completionHelpersSeparateAcceptedSettledArtifactAndVerifiedSuccess", () => {
  const accepted = requestAcceptedResult({
    tool: "unity_test",
    action: "start",
    requestId: "req-start",
    jobId: "job-1",
    summary: "Test request accepted.",
  });
  assert.equal(accepted.status, "succeeded");
  assert.equal(accepted.job?.state, "accepted");
  assert.match(accepted.summary, /accepted/i);
  assert.match(accepted.summary, /not completed/i);

  const settled = stateSettledResult({
    tool: "unity_compile",
    action: "wait_for_idle",
    summary: "Unity compile state is idle.",
  });
  assert.equal(settled.status, "succeeded");
  assert.match(settled.summary, /state settled/i);
  assert.match(settled.summary, /not verified/i);

  const uncertain = uncertainEvidenceResult({
    tool: "unity_console",
    action: "snapshot",
    summary: "Console snapshot evidence is incomplete.",
    code: "console.snapshot_uncertain",
  });
  assert.equal(uncertain.status, "uncertain");
  assert.equal(uncertain.diagnostics[0].code, "console.snapshot_uncertain");
});

test("artifactCompleteRequiresSuccessfulReadbackAndJobReportRequiresReadableReport", () => {
  const readback: UnityAgentKitResourceReadResult = {
    ok: true,
    resource: {
      uri: "unity://screenshots/shot-1",
      type: "screenshot",
      artifactId: "shot-1",
      validationStatus: "valid",
      summary: "Synthetic screenshot resource.",
    },
    metadata: {
      schemaVersion: 1,
      id: "shot-1",
      type: "screenshot",
      uri: "unity://screenshots/shot-1",
      relativePath: "screenshots/shot-1.txt",
      createdAt: "2026-05-22T10:00:00.000Z",
      validationStatus: "valid",
      producerTool: "unity_screenshot",
      producerAction: "capture_game_view",
      sizeBytes: 10,
      diagnostics: [],
    },
    filePath: "/tmp/artifacts/screenshots/shot-1.txt",
    contentBytes: new Uint8Array([1]),
  };

  const artifact = artifactCompleteResult({
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Screenshot artifact is complete.",
    readback,
  });
  assert.equal(artifact.status, "succeeded");
  assert.equal(artifact.resource?.uri, "unity://screenshots/shot-1");
  assert.deepEqual(artifact.evidence, { completion: "artifact_complete", resourceUri: "unity://screenshots/shot-1" });

  const missingReport = jobReportRequiredResult({
    tool: "unity_test",
    action: "run_and_verify",
    jobId: "job-1",
    summary: "Test job completed but report is not readable.",
  });
  assert.equal(missingReport.status, "uncertain");
  assert.equal(missingReport.nextStep?.kind, "get_job_result");

  const failedReadback = resourceReadFailureResult({
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Screenshot resource cannot be read.",
    readback: {
      ok: false,
      reason: "file_missing",
      diagnostic: {
        source: "resource-readback",
        severity: "error",
        code: "resource.file_missing",
        message: "Resource file is missing.",
      },
    },
  });
  assert.equal(failedReadback.status, "failed");
  assert.equal(failedReadback.diagnostics[0].code, "resource.file_missing");
});
```

- [x] **步骤 2：运行测试验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/timeout-completion-contract.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/workflows/timeout.ts'` 或 `Cannot find module '../src/workflows/completion.ts'`。

证明：该 red 证明 workflow-level timeout/completion semantics 尚未有 TS 基础设施载体。

- [x] **步骤 3：实现 timeout policy 和 timeout continuation helper**

创建 `plugins/unity-agent-kit/src/workflows/timeout.ts`：

```ts
import { definePublicResult, type UnityAgentKitJobReference, type UnityAgentKitNextStep, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const timeoutPolicies = {
  lightweightRead: {
    defaultRangeMs: [1_000, 5_000],
    maxCapMs: 10_000,
    safeToRetry: "true_if_read_only",
    nextStepKinds: ["read_state", "inspect_diagnostics"],
  },
  readiness: {
    defaultRangeMs: [10_000, 30_000],
    maxCapMs: 60_000,
    safeToRetry: "true_if_no_side_effect",
    nextStepKinds: ["read_state"],
  },
  compile: {
    defaultRangeMs: [30_000, 120_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false_unless_no_op_proof",
    nextStepKinds: ["read_state", "inspect_diagnostics"],
  },
  test: {
    defaultRangeMs: [60_000, 300_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false",
    nextStepKinds: ["check_job_status", "get_job_result"],
  },
  playmodeTransition: {
    defaultRangeMs: [10_000, 60_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false_unless_no_op_proof",
    nextStepKinds: ["read_state"],
  },
  screenshotArtifact: {
    defaultRangeMs: [10_000, 30_000],
    maxCapMs: 60_000,
    safeToRetry: "false_unless_no_artifact_write_occurred",
    nextStepKinds: ["read_resource", "inspect_diagnostics"],
  },
  resourceReadback: {
    defaultRangeMs: [1_000, 10_000],
    maxCapMs: 30_000,
    safeToRetry: "true_if_read_only",
    nextStepKinds: ["read_resource", "inspect_diagnostics"],
  },
} as const;

export interface TimeoutContinuationInput {
  tool: string;
  action: string;
  requestId?: string;
  summary: string;
  mayStillBeRunning: boolean;
  safeToRetry?: boolean;
  nextStep: UnityAgentKitNextStep;
  job?: UnityAgentKitJobReference;
}

export function timeoutContinuationResult(input: TimeoutContinuationInput): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "timeout",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: "workflow.timeout",
        message: input.summary,
        details: {
          timeoutLayer: "workflow",
          mayStillBeRunning: input.mayStillBeRunning,
          safeToRetry: input.safeToRetry ?? false,
          nextStep: input.nextStep.kind,
        },
      },
    ],
    mayStillBeRunning: input.mayStillBeRunning,
    safeToRetry: input.safeToRetry ?? false,
    nextStep: input.nextStep,
    ...(input.job === undefined ? {} : { job: input.job }),
  });
}
```

- [x] **步骤 4：实现 completion helpers**

创建 `plugins/unity-agent-kit/src/workflows/completion.ts`：

```ts
import type { UnityAgentKitResourceReadResult } from "../artifacts/types.ts";
import {
  definePublicResult,
  type UnityAgentKitJobReference,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

interface BaseCompletionInput {
  tool: string;
  action: string;
  requestId?: string;
  summary: string;
}

export function requestAcceptedResult(input: BaseCompletionInput & { jobId: string }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: `${input.summary} Request accepted, not completed.`,
    diagnostics: [],
    job: {
      jobId: input.jobId,
      tool: input.tool,
      action: input.action,
      state: "accepted",
      createdAt: new Date().toISOString(),
      lastKnownContinuity: "current",
    },
  });
}

export function stateSettledResult(input: BaseCompletionInput): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: `${input.summary} State settled, not verified business success.`,
    diagnostics: [],
    evidence: { completion: "state_settled" },
  });
}

export function artifactCompleteResult(input: BaseCompletionInput & { readback: UnityAgentKitResourceReadResult }): UnityAgentKitPublicResult {
  if (!input.readback.ok) {
    return resourceReadFailureResult({ ...input, readback: input.readback });
  }

  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [],
    resource: input.readback.resource,
    evidence: {
      completion: "artifact_complete",
      resourceUri: input.readback.resource.uri,
    },
  });
}

export function jobReportRequiredResult(input: BaseCompletionInput & { jobId: string; job?: UnityAgentKitJobReference }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: "job.report_required",
        message: "A completed job requires a readable report before public success can be claimed.",
      },
    ],
    job: input.job ?? {
      jobId: input.jobId,
      tool: input.tool,
      action: input.action,
      state: "completed",
      createdAt: new Date().toISOString(),
      lastKnownContinuity: "current",
    },
    nextStep: {
      kind: "get_job_result",
      tool: input.tool,
      action: "get_result",
      jobId: input.jobId,
      reason: "Read the job report before treating the job as verified success.",
    },
  });
}

export function uncertainEvidenceResult(input: BaseCompletionInput & { code: string }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: input.code,
        message: input.summary,
      },
    ],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Available evidence cannot prove success or failure.",
    },
  });
}

export function resourceReadFailureResult(input: BaseCompletionInput & { readback: Extract<UnityAgentKitResourceReadResult, { ok: false }> }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [input.readback.diagnostic],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: `Resource readback failed with ${input.readback.reason}.`,
    },
  });
}
```

- [x] **步骤 5：运行 timeout/completion tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 workflow-level timeout result 带 `nextStep`、`safeToRetry`、`mayStillBeRunning` 和 diagnostics；completion helpers 不把 request accepted、state settled 或 completed job without report 伪装成 verified success；artifact success 依赖 successful Resource readback。

- [x] **步骤 6：运行 combined TS contract tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 Phase 5B 新 TS contract 不破坏 Phase 5A host-runtime tests。

- [x] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/timeout.ts plugins/unity-agent-kit/src/workflows/completion.ts plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts
git commit -m "$(cat <<'EOF'
feat: add phase 5b completion helpers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：Unity internal/test-only artifact contract smoke

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeArtifactTests.cs`

- [x] **步骤 1：编写失败的 Unity artifact smoke tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeArtifactTests.cs`：

```csharp
using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeArtifactTests
    {
        [Test]
        public void ArtifactRootUsesProjectAiDebugUnityAgentKitArtifactsDirectory()
        {
            var expected = Path.Combine(UnityAgentKitHostRegistry.GetProjectRoot(), ".ai-debug", "unity-agent-kit", "artifacts");

            var actual = UnityAgentKitArtifactContracts.GetArtifactRoot();

            Assert.AreEqual(NormalizePath(expected), NormalizePath(actual));
        }

        [Test]
        public void SyntheticScreenshotArtifactWritesPayloadAndDeterministicMetadata()
        {
            var artifactRoot = TemporaryArtifactRoot("screenshot");
            var record = TestHostRecord();

            var metadata = UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-1",
                "screenshot",
                "screenshots/shot-1.txt",
                "synthetic image",
                record,
                "capture_game_view");

            var payloadPath = Path.Combine(artifactRoot, "screenshots", "shot-1.txt");
            var metadataPath = Path.Combine(artifactRoot, "metadata", "screenshots", "shot-1.json");
            var roundTrip = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(File.ReadAllText(metadataPath));

            Assert.IsTrue(File.Exists(payloadPath));
            Assert.AreEqual("synthetic image", File.ReadAllText(payloadPath));
            Assert.AreEqual(1, metadata.schemaVersion);
            Assert.AreEqual("shot-1", metadata.id);
            Assert.AreEqual("screenshot", metadata.type);
            Assert.AreEqual("unity://screenshots/shot-1", metadata.uri);
            Assert.AreEqual("screenshots/shot-1.txt", metadata.relativePath);
            Assert.AreEqual("valid", metadata.validationStatus);
            Assert.AreEqual("host-a", metadata.hostId);
            Assert.AreEqual(3, metadata.hostEpoch);
            Assert.AreEqual("unity_screenshot", metadata.producerTool);
            Assert.AreEqual("capture_game_view", metadata.producerAction);
            Assert.Greater(metadata.sizeBytes, 0);
            Assert.AreEqual(0, metadata.diagnostics.Length);
            Assert.AreEqual("shot-1", roundTrip.id);
            Assert.AreEqual("unity://screenshots/shot-1", roundTrip.uri);
        }

        [Test]
        public void SyntheticTestReportUsesReportLocatorUnderTestReports()
        {
            var artifactRoot = TemporaryArtifactRoot("report");
            var record = TestHostRecord();

            var metadata = UnityAgentKitArtifactContracts.WriteSyntheticReport(
                artifactRoot,
                "report-1",
                "test-reports/report-1.txt",
                "synthetic report",
                record,
                "run_and_collect");

            var metadataPath = Path.Combine(artifactRoot, "metadata", "test-reports", "report-1.json");
            var roundTrip = JsonUtility.FromJson<UnityAgentKitArtifactMetadataRecord>(File.ReadAllText(metadataPath));

            Assert.AreEqual("report-1", metadata.id);
            Assert.AreEqual("test_report", metadata.type);
            Assert.AreEqual("unity://test-reports/report-1", metadata.uri);
            Assert.AreEqual(string.Empty, metadata.relativePath);
            Assert.NotNull(metadata.reportLocator);
            Assert.AreEqual("artifact_relative_path", metadata.reportLocator.kind);
            Assert.AreEqual("test-reports/report-1.txt", metadata.reportLocator.relativePath);
            Assert.AreEqual("artifact_relative_path", roundTrip.reportLocator.kind);
            Assert.AreEqual("test-reports/report-1.txt", roundTrip.reportLocator.relativePath);
        }

        [Test]
        public void UnsafeRelativePathIsRejectedBeforeWritingPayload()
        {
            var artifactRoot = TemporaryArtifactRoot("unsafe");
            var record = TestHostRecord();

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-unsafe",
                "screenshot",
                "../outside.txt",
                "payload",
                record,
                "capture_game_view"));

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-drive",
                "screenshot",
                "C:/outside.txt",
                "payload",
                record,
                "capture_game_view"));

            Assert.Throws<InvalidOperationException>(() => UnityAgentKitArtifactContracts.WriteSyntheticArtifact(
                artifactRoot,
                "shot-encoded",
                "screenshot",
                "screenshots/%2e%2e/outside.txt",
                "payload",
                record,
                "capture_game_view"));
        }

        private static UnityAgentKitHostRecord TestHostRecord()
        {
            return new UnityAgentKitHostRecord
            {
                hostName = "Unity Agent Kit",
                protocolVersion = "2026-05-19",
                projectRoot = UnityAgentKitHostRegistry.GetProjectRoot(),
                hostId = "host-a",
                hostEpoch = 3,
                port = 49152,
                status = "ready",
                startedAt = "2026-05-22T10:00:00.0000000Z",
                lastProbeAt = "2026-05-22T10:00:01.0000000Z"
            };
        }

        private static string TemporaryArtifactRoot(string testName)
        {
            var directory = Path.Combine(Path.GetTempPath(), "UnityAgentKitArtifactTests", testName, Guid.NewGuid().ToString("N"), "artifacts");
            Directory.CreateDirectory(directory);
            return directory;
        }

        private static string NormalizePath(string path)
        {
            return Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
    }
}
```

- [x] **步骤 2：运行 Unity tests 验证 red**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
```

预期：FAIL，Unity 编译报错 `UnityAgentKitArtifactContracts` 或 `UnityAgentKitArtifactMetadataRecord` 不存在。本机 Unity 2022.3.61f1 若使用 `-quit` 会在 Test Runner 前退出，因此本计划使用不带 `-quit` 的命令。

证明：该 red 证明 Unity producer-side artifact contract smoke 尚未实现。

- [x] **步骤 3：实现 Unity artifact contract writer**

创建目录 `unity/Assets/UnityAgentKit/Editor/Artifacts/`，再创建 `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`：

```csharp
using System;
using System.IO;
using UnityEngine;

namespace UnityAgentKit.Editor
{
    internal static class UnityAgentKitArtifactContracts
    {
        internal static string GetArtifactRoot()
        {
            return Path.Combine(UnityAgentKitHostRegistry.GetProjectRoot(), ".ai-debug", "unity-agent-kit", "artifacts");
        }

        internal static UnityAgentKitArtifactMetadataRecord WriteSyntheticArtifact(
            string artifactRoot,
            string id,
            string type,
            string relativePath,
            string payload,
            UnityAgentKitHostRecord hostRecord,
            string producerAction)
        {
            if (type != "screenshot" && type != "console_snapshot")
            {
                throw new InvalidOperationException("Synthetic artifact type must be screenshot or console_snapshot.");
            }

            var expectedPrefix = type == "screenshot" ? "screenshots/" : "console-snapshots/";
            if (!relativePath.StartsWith(expectedPrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Synthetic artifact relative path does not match artifact type.");
            }

            var payloadPath = ResolveArtifactPath(artifactRoot, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(payloadPath));
            File.WriteAllText(payloadPath, payload ?? string.Empty);

            var metadata = CreateBaseMetadata(id, type, hostRecord, type == "screenshot" ? "unity_screenshot" : "unity_console", producerAction, new FileInfo(payloadPath).Length);
            metadata.uri = type == "screenshot" ? "unity://screenshots/" + id : "unity://console-snapshots/" + id;
            metadata.relativePath = relativePath;
            WriteMetadata(artifactRoot, metadata);
            return metadata;
        }

        internal static UnityAgentKitArtifactMetadataRecord WriteSyntheticReport(
            string artifactRoot,
            string reportId,
            string relativePath,
            string payload,
            UnityAgentKitHostRecord hostRecord,
            string producerAction)
        {
            if (!relativePath.StartsWith("test-reports/", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Synthetic report relative path must be under test-reports/.");
            }

            var payloadPath = ResolveArtifactPath(artifactRoot, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(payloadPath));
            File.WriteAllText(payloadPath, payload ?? string.Empty);

            var metadata = CreateBaseMetadata(reportId, "test_report", hostRecord, "unity_test", producerAction, new FileInfo(payloadPath).Length);
            metadata.uri = "unity://test-reports/" + reportId;
            metadata.relativePath = string.Empty;
            metadata.reportLocator = new UnityAgentKitReportLocatorRecord
            {
                kind = "artifact_relative_path",
                relativePath = relativePath
            };
            WriteMetadata(artifactRoot, metadata);
            return metadata;
        }

        internal static bool IsSafeRelativePath(string relativePath)
        {
            if (string.IsNullOrEmpty(relativePath) || relativePath.Contains("\\") || relativePath.Contains("\0"))
            {
                return false;
            }

            string decoded;
            try
            {
                decoded = Uri.UnescapeDataString(relativePath);
            }
            catch (UriFormatException)
            {
                return false;
            }

            return IsSafePathSegments(relativePath) && IsSafePathSegments(decoded);
        }

        private static string ResolveArtifactPath(string artifactRoot, string relativePath)
        {
            if (!IsSafeRelativePath(relativePath))
            {
                throw new InvalidOperationException("Artifact relative path is unsafe.");
            }

            var root = Path.GetFullPath(artifactRoot);
            var target = Path.GetFullPath(Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
            var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal) ? root : root + Path.DirectorySeparatorChar;

            if (target != root && !target.StartsWith(rootPrefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Artifact path escapes the artifact root.");
            }

            return target;
        }

        private static bool IsSafePathSegments(string value)
        {
            if (value.StartsWith("/", StringComparison.Ordinal) || value.Contains("\\") || HasWindowsDrivePrefix(value))
            {
                return false;
            }

            var parts = value.Split('/');
            foreach (var part in parts)
            {
                if (string.IsNullOrEmpty(part) || part == "." || part == "..")
                {
                    return false;
                }
            }

            return true;
        }

        private static bool HasWindowsDrivePrefix(string value)
        {
            return value.Length >= 2 && char.IsLetter(value[0]) && value[1] == ':';
        }

        private static UnityAgentKitArtifactMetadataRecord CreateBaseMetadata(
            string id,
            string type,
            UnityAgentKitHostRecord hostRecord,
            string producerTool,
            string producerAction,
            long sizeBytes)
        {
            return new UnityAgentKitArtifactMetadataRecord
            {
                schemaVersion = 1,
                id = id ?? string.Empty,
                type = type ?? string.Empty,
                createdAt = DateTimeOffset.UtcNow.ToString("O"),
                validationStatus = sizeBytes > 0 ? "valid" : "invalid",
                hostId = hostRecord != null ? hostRecord.hostId : string.Empty,
                hostEpoch = hostRecord != null ? hostRecord.hostEpoch : 0,
                producerTool = producerTool ?? string.Empty,
                producerAction = producerAction ?? string.Empty,
                producerJobId = string.Empty,
                sizeBytes = sizeBytes,
                diagnostics = Array.Empty<UnityAgentKitDiagnostic>()
            };
        }

        private static void WriteMetadata(string artifactRoot, UnityAgentKitArtifactMetadataRecord metadata)
        {
            var relativeMetadataPath = MetadataRelativePath(metadata);
            var metadataPath = ResolveArtifactPath(artifactRoot, relativeMetadataPath);
            Directory.CreateDirectory(Path.GetDirectoryName(metadataPath));
            File.WriteAllText(metadataPath, JsonUtility.ToJson(metadata, true) + Environment.NewLine);
        }

        private static string MetadataRelativePath(UnityAgentKitArtifactMetadataRecord metadata)
        {
            if (metadata.type == "screenshot")
            {
                return "metadata/screenshots/" + metadata.id + ".json";
            }

            if (metadata.type == "test_report")
            {
                return "metadata/test-reports/" + metadata.id + ".json";
            }

            if (metadata.type == "console_snapshot")
            {
                return "metadata/console-snapshots/" + metadata.id + ".json";
            }

            throw new InvalidOperationException("Unsupported artifact metadata type.");
        }
    }

    [Serializable]
    internal sealed class UnityAgentKitReportLocatorRecord
    {
        public string kind = string.Empty;
        public string relativePath = string.Empty;
    }

    [Serializable]
    internal sealed class UnityAgentKitArtifactMetadataRecord
    {
        public int schemaVersion;
        public string id = string.Empty;
        public string type = string.Empty;
        public string uri = string.Empty;
        public string relativePath = string.Empty;
        public UnityAgentKitReportLocatorRecord reportLocator = null;
        public string createdAt = string.Empty;
        public string validationStatus = string.Empty;
        public string hostId = string.Empty;
        public int hostEpoch;
        public string producerTool = string.Empty;
        public string producerAction = string.Empty;
        public string producerJobId = string.Empty;
        public long sizeBytes;
        public UnityAgentKitDiagnostic[] diagnostics = Array.Empty<UnityAgentKitDiagnostic>();
    }
}
```

- [x] **步骤 4：运行 Unity artifact tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
```

预期：PASS，`unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml` 中 `failed="0"`。

证明：该检查证明 Unity 能按 contract 解析 artifact root、按固定 metadata layout 写 fixed synthetic artifact + metadata、设置 basic validation status、拒绝 unsafe relative path，并且没有实现真实 screenshot/test/console producer、producer lifecycle、job simulation 或 fake workflow state。

- [x] **步骤 5：运行 existing Unity host runtime tests 验证未回归**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BHostRuntimeRegressionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Phase 5B Unity artifact smoke 不破坏 Phase 5A Host Runtime foundation。

- [x] **步骤 6：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeArtifactTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5b unity artifact smoke

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 6：Scope guard, completion evidence, and Phase 5 handoff state

**文件：**
- 修改：`plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：添加 Phase 5B scope guard test**

在 `plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts` 末尾追加：

```ts
async function pathExists(repoRelativePath: string): Promise<boolean> {
  try {
    await stat(new URL(`../../../${repoRelativePath}`, import.meta.url));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

test("phase5bScopeGuardDoesNotCreatePublicMcpToolsOrUnitySkill", async () => {
  assert.equal(await pathExists("plugins/unity-agent-kit/src/tools"), false);
  assert.equal(await pathExists("plugins/unity-agent-kit/src/mcp"), false);
  assert.equal(await pathExists("plugins/unity-agent-kit/skills/unity"), false);
  assert.equal(await pathExists("plugins/unity-agent-kit/skills/unity.md"), false);

  const validationReports = parseUnityResourceUri("unity://validation-reports/report-1");
  assert.equal(validationReports.ok, false);
});
```

- [x] **步骤 2：运行 full TS evidence**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 Phase 5B TS Resource/contract tests、timeout/completion tests 和 existing host-runtime tests 全部通过；scope guard 确认未创建 MCP public tools、MCP Resource handlers、`/unity` skill 或 validation-reports readback。

- [x] **步骤 3：运行 Unity artifact evidence**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity internal/test-only artifact contract smoke 通过。

- [x] **步骤 4：运行 Unity Host Runtime regression evidence**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BHostRuntimeRegressionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Phase 5B 未破坏 Phase 5A Host Runtime foundation。

- [x] **步骤 5：运行 diff check**

运行：

```bash
git diff --check
```

预期：无 whitespace errors。CRLF normalization warnings 可记录但不算失败。

证明：该检查证明待提交 diff 不含 whitespace error。

- [x] **步骤 6：同步 Phase 5 plan index**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中，将 Subplans 表的 Phase 5B row 改为：

```markdown
| Phase 5B | Artifact / Resource / Timeout / Completion 基础设施 | `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion-design.md` | `docs/superpowers/plans/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion.md` | completed | completed | completed: TS artifact/resource contract tests, timeout/completion tests, existing host-runtime tests, Unity `HostRuntimeArtifactTests`, Unity `HostRuntimeTests`, scope boundary check, and `git diff --check` passed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending | stays subplan |
```

将 `## Next Manual Action` 内容改为：

```markdown
Phase 5B Artifact / Resource / Timeout / Completion completed with evidence. Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending.

Next action: create/review Phase 5C Core Diagnostics Workflows artifacts before implementing Phase 5C. Do not mark Roadmap Phase 5 completed from Phase 5B evidence alone.
```

- [x] **步骤 7：同步 Roadmap Phase 5 partial evidence**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中做事实性状态同步，不修改 Goal、Non-goals、Shared Constraints 或 phase 顺序：

1. 将 Metadata 的 `Last Sync` 保持为 `2026-05-22`。
2. 在 `## Current State` 的当前阶段 bullet 中追加 Phase 5B evidence 句子：

```markdown
Phase 5B Artifact / Resource / Timeout / Completion completed with evidence: TS command `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts` passed with `fail 0`; Unity `HostRuntimeArtifactTests` passed with `failed="0"`; Unity `HostRuntimeTests` regression passed with `failed="0"`; scope boundary check confirmed no public MCP tools, no MCP Resource handlers, no `/unity` skill, no validation-reports readback, no real screenshot/test/console workflow, and no final daily loop E2E. Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending.
```

3. 在 Phase 5 row 的 `Verification` cell 保持 `partial`，`Next` cell 改为 `continue-5c`。
4. 在 Phase 5 `Artifacts` 的 `Implementation Summary` 末尾追加同一 Phase 5B completion summary，保持 Phase 5 非 completed。
5. 在 `## Change Log` 顶部追加：

```markdown
- 2026-05-22：完成 Phase 5B Artifact / Resource / Timeout / Completion 基础设施，覆盖 typed resource/job/nextStep public-result contract、deterministic artifact metadata layout、safe Resource URI parsing、safe relative path resolution、internal file-backed Resource readback、generic content validity、timeout continuation helper、completion semantics helpers 和 Unity internal artifact contract smoke。TS evidence 命令 `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts` 通过并输出 `fail 0`；Unity `HostRuntimeArtifactTests` 和 `HostRuntimeTests` regression 均通过并输出 `failed="0"`；scope boundary 保持 no public MCP tools、no MCP Resource handlers、no `/unity` skill、no validation-reports readback、no real screenshot/test/console workflow、no final daily loop E2E。Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。
```

- [x] **步骤 8：运行 docs/state check**

运行：

```bash
python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md').read_text(encoding='utf-8')
index = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md').read_text(encoding='utf-8')
checks = {
    'phase5b_completed_in_index': '| Phase 5B |' in index and '| completed | completed | completed:' in index,
    'phase5_incomplete_index': 'Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending' in index,
    'next_phase5c': 'Phase 5C Core Diagnostics Workflows' in index and 'before implementing Phase 5C' in index,
    'roadmap_partial': '| Phase 5 — 高频日常闭环基础设施 | planned |' in roadmap and '| partial | continue-5c |' in roadmap,
    'phase5b_evidence_roadmap': 'Phase 5B Artifact / Resource / Timeout / Completion completed with evidence' in roadmap,
    'no_phase5_completed_claim': 'Phase 5 completed with evidence' not in roadmap,
    'no_public_tools_completed_claim': 'public MCP tools completed' not in roadmap and '/unity skill completed' not in roadmap,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('FAIL docs/state check: ' + ', '.join(failed))
print('PASS Phase 5B docs/state check')
PY
```

预期：输出 `PASS Phase 5B docs/state check`。

证明：该检查证明 Phase 5B evidence 已记录，Phase 5A remains completed，Phase 5 remains incomplete / partial，next handoff 指向 Phase 5C，没有 public MCP tools / `/unity` skill / Phase 5 completed wording。

- [x] **步骤 9：最终 full evidence rerun**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BHostRuntimeRegressionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
git diff --check
```

预期：TS 命令 PASS 且输出 `# fail 0`；两个 Unity XML 均包含 `failed="0"`；`git diff --check` 无 whitespace errors。

证明：该检查证明 Phase 5B completion evidence 同步后，代码、Unity smoke、docs/state 和 diff check 全部保持通过。

- [x] **步骤 10：Commit**

```bash
git add plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: record phase 5b completion evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Subplan Completion Evidence

Phase 5B 只有在以下 evidence 全部通过后才能标记 completed：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BHostRuntimeRegressionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
git diff --check
```

Evidence 必须证明：

- typed resource/job/nextStep contract 已验证。
- URI parsing 只支持 screenshots、test-reports、console-snapshots。
- malformed/path-like/encoded traversal IDs 被拒绝。
- deterministic metadata layout 生效。
- metadata missing 不扫描 payload directory。
- file exists but metadata missing 不升级为 valid artifact。
- reportLocator 只支持 `artifact_relative_path` 且只允许 `test-reports/` safe relative path。
- generic content validity 不进入 PNG/TestRunner/console action-specific schema。
- file-backed Resource readback 不要求 live host，不 emit `host_unavailable`。
- timeout continuation 包含 `mayStillBeRunning`、`safeToRetry`、bounded `nextStep` 和 diagnostics。
- completion helpers 不把 request accepted、state settled、completed job without report 或 failed readback 伪装成 verified success。
- Unity internal artifact smoke 只写 fixed synthetic artifact metadata，不实现真实 screenshot/test/console producer。
- Phase 5A remains completed。
- Phase 5B completed only after evidence。
- Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。
- no public MCP tools、no MCP Resource handlers、no `/unity` skill、no validation-reports readback、no final daily loop E2E。

## 自检结果

- **规格覆盖度：** 覆盖 Resource URI、Resource reference、Artifact metadata、generic content validity、read failure classification、job/nextStep/timeout contract、timeout policy、completion rules、v2 reference boundary、Unity internal smoke、TS/Unity evidence、scope boundary、docs/state check。
- **占位符扫描：** 已检查；未发现未完成标记、模糊交接语、重复引用语或无落点验证语。
- **类型一致性：** `UnityAgentKitResourceReference`、`UnityAgentKitArtifactMetadata`、`UnityAgentKitReportLocator`、`UnityAgentKitJobReference`、`UnityAgentKitNextStep`、`UnityAgentKitResourceReadResult` 在 tasks 之间名称一致。
- **拆分检查：** 已在计划头部记录 `已检查；无需拆分`；Phase 5B 保持单一 cohesive infrastructure patch。
- **上游约束覆盖：** Roadmap Shared Constraints、Phase 5 split scope、Phase 5B spec、Phase 5A hardening boundary、用户确认事项均进入上游约束摘要和任务验证。
- **参考输入映射：** 已说明采用内容、不采用内容、不采用原因和落地任务。
- **验证强度：** 行为任务均用 red test → minimal implementation → pass command 证明语义；存在性检查只用于 scope guard，并明确证明 Phase 5B 边界而非功能行为。
