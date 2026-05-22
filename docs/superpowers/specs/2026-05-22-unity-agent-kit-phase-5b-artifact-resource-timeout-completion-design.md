# Unity Agent Kit Phase 5B Artifact / Resource / Timeout / Completion 设计

## 状态

- 状态：设计已批准，等待实现计划。
- 日期：2026-05-22
- Roadmap：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- Phase：Phase 5 / Phase 5B subplan
- Plan Index：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 上游 Spec：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- Split Design：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`

## 背景

Phase 5A Host Runtime foundation 和 Phase 5A post-completion Host Runtime hardening 已完成并提交。Phase 5A remains completed。Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。

Phase 5B 是 Phase 5C / 5D / 5E 的共享基础设施层。它把 Phase 5A 中 opaque pass-through 的 `resource`、`resources`、`job`、`nextStep`、`safeToRetry` 和 `mayStillBeRunning` 收敛为可测试的通用契约，同时不提前实现 Phase 5C / 5D / 5E 的 public workflow、MCP Resource handlers 或 `/unity` skill。

## 目标

Phase 5B 建立 Artifact / Resource / Timeout / Completion 基础设施：

1. 定义通用 artifact/resource/job/nextStep/timeout/completion contract。
2. 建立内部 Resource store/readback API，支持 safe URI parsing、metadata validation、safe path resolution 和 explicit failure classification。
3. 定义 `.ai-debug/unity-agent-kit/artifacts/` 作为受控 artifact root。
4. 定义 category-level timeout / polling policy table。
5. 提供通用 TS completion rule helpers，防止 request accepted、state settled、artifact complete、job complete、verified success 语义漂移。
6. 提供 Unity C# internal/test-only artifact contract smoke，证明 Unity producer-side evidence 能按 contract 写出 synthetic artifact metadata。
7. 提供 completion evidence，作为 Phase 5C / 5D / 5E 的前置 contract。

## 非目标

Phase 5B 不实现：

- MCP Resource handler registration。
- public MCP tools。
- `/unity` skill。
- real screenshot capture。
- real Unity Test Runner jobs。
- real console snapshot workflow。
- compile/editor/playmode workflows。
- action-specific compile/test/playmode/screenshot/console result schema。
- generic job store。
- fake/synthetic job producer。
- `unity://validation-reports/{reportId}` readback。
- durable request queue。
- retention / cleanup subsystem。
- final daily loop E2E。
- Phase 5C / 5D / 5E completion wording。

## 已确认决策

### Resource readback 层级

采用内部 Resource store/readback API，不注册 MCP Resource handlers。

Phase 5B 在 TS 侧实现 URI parsing、metadata lookup、safe file/report readback、failure classification 和 tests。Phase 5E 再把这些内部 API 接到 MCP Resource handlers。

### Store ownership

采用分层所有权：

- Unity C# 负责 producer-side evidence：写 artifact 文件、基础 metadata record 和 basic validation。
- TS 负责 consumer-side Resource contract：URI assembly、safe readback、metadata validation、failure classification 和 public result mapping。
- artifact root 和 safe relative path 规则由 TS contract 定义，Unity producer 必须遵守。

### Optional public-result fields 粒度

Phase 5B 只定义通用基础契约，不定义 action-specific result schema。

包含：

- `UnityAgentKitResourceReference`
- `UnityAgentKitArtifactMetadata`
- `UnityAgentKitJobReference`
- `UnityAgentKitNextStep`
- timeout continuation fields
- Resource read failure diagnostics
- 最小 artifact/resource/job/timeout/completion rules

不定义 screenshot、test report、console snapshot、compile、test、playmode 或 screenshot 的完整 action-specific public result data schema。

### Validation reports

Phase 5B 不实现 `unity://validation-reports/{reportId}`。

`validation-reports` 归属 Phase 5E final daily loop / completion evidence。Phase 5B 只实现三类内部 Resource readback：

- `unity://screenshots/{artifactId}`
- `unity://test-reports/{reportId}`
- `unity://console-snapshots/{artifactId}`

### Job store

Phase 5B 不实现 generic / persistent job store。

Phase 5B 只定义 job reference contract、job state enum、minimum fields、continuity rules、timeout/completion 对 job 的 nextStep 规则。真实 job producer/store 等到 Phase 5D 的 `unity_test.start` / test workflows 实现。

### Timeout policy

Phase 5B 定义 category-level timeout / polling policy table，不锁每个 P0 action 的具体 timeout / poll interval。

5C / 5D 的具体 action 值必须落在 5B category policy 内。超出 max cap 需要显式用户意图或设计说明。

### Artifact root

Phase 5B artifact root 使用仓库根目录：

```text
.ai-debug/unity-agent-kit/artifacts/
```

默认结构：

```text
.ai-debug/unity-agent-kit/artifacts/
├─ screenshots/
├─ test-reports/
└─ console-snapshots/
```

### Unity-side producer smoke

Phase 5B 实现最小 Unity-side artifact contract smoke：internal/test-only artifact metadata writer / smoke。

它只验证 artifact root 解析、safe relative path、metadata shape、`validationStatus` 和 Unity producer-side evidence 能被 TS Resource contract 消费。不实现真实 screenshot/test/console workflow，不注册 public action。

### Completion rules

Phase 5B 实现通用 TS completion rule helpers，不实现 action-specific evaluator。

## 总体架构

Phase 5B 是 contract-first 基础设施层：

```text
Unity C# producer-side evidence
→ TS artifact/resource contract + readback
→ TS timeout/completion public-result helpers
```

Unity C# 只做最小 producer-side evidence：

- 解析 `.ai-debug/unity-agent-kit/artifacts/` root。
- 写 internal/test-only artifact file + metadata。
- 做 basic validation：file exists、size > 0、safe relative path、type recognized、validationStatus 合法。
- 返回或记录 contract-compatible metadata。

TS 拥有 consumer-side contract：

- artifact/resource/job/nextStep 类型定义。
- Resource URI parser。
- metadata validation。
- safe path resolution / traversal rejection。
- internal Resource readback API。
- Resource read failure classification。
- timeout continuation helper。
- completion rule helper。

## Artifact / Resource contract

### Resource URI

Phase 5B 只支持：

```text
unity://screenshots/{artifactId}
unity://test-reports/{reportId}
unity://console-snapshots/{artifactId}
```

Rules:

- ID 由插件生成，不来自用户路径。
- URI 从 ID 派生。
- `unity://validation-reports/{reportId}` 在 Phase 5B 返回 unsupported type，不实现 readback。
- malformed URI、empty ID、encoded traversal 和 path-like ID 必须被拒绝。

### Resource reference

`UnityAgentKitResourceReference` 从 opaque object 收敛为通用形状：

```ts
interface UnityAgentKitResourceReference {
  uri: string;
  type: "screenshot" | "test_report" | "console_snapshot";
  artifactId?: string;
  reportId?: string;
  validationStatus: "valid" | "invalid" | "uncertain";
  summary: string;
}
```

Rules:

- screenshot / console snapshot 使用 `artifactId`。
- test report 使用 `reportId`。
- `summary` 是短摘要，不包含完整 artifact 内容。
- Resource reference 可出现在 `resource` 或 `resources` 中。

### Artifact metadata

最小 metadata 语义：

```ts
interface UnityAgentKitArtifactMetadata {
  schemaVersion: 1;
  id: string;
  type: "screenshot" | "test_report" | "console_snapshot";
  uri: string;
  relativePath?: string;
  reportLocator?: string;
  createdAt: string;
  validationStatus: "valid" | "invalid" | "uncertain";
  hostId?: string;
  hostEpoch?: number;
  producerTool: string;
  producerAction: string;
  producerJobId?: string;
  sizeBytes?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}
```

Rules:

- `relativePath` 必须是 artifact root 内的 safe relative path。
- `reportLocator` 只允许 controlled report location，不允许任意绝对路径。
- `metadata` 是 ID 到 file/report locator 的 trusted binding。
- metadata missing 时，不能扫描文件夹猜 artifact。
- file exists but metadata missing = orphaned evidence，不升级为 valid artifact。

### Read failure classification

Resource readback 必须明确失败原因：

```text
metadata_missing
file_missing
path_outside_artifact_root
validation_failed
unsupported_type
host_unavailable
artifact_lost
```

Rules:

- failed readback 不能作为 action success evidence。
- traversal attempt 返回 rejected 或 read failure result，不读文件。
- `validationStatus != valid` 时不能当作 completed artifact。
- host rebind 后，metadata + file/report readable 可 recover；running job continuity 不 recover。

## Job / NextStep / Timeout contract

### Job reference

```ts
type UnityAgentKitJobState =
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout"
  | "lost"
  | "unknown";

interface UnityAgentKitJobReference {
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
  lastKnownContinuity: "current" | "recovered" | "lost" | "unknown";
  diagnostics?: UnityAgentKitDiagnostic[];
}
```

Rules:

- `requestId` 不等于 `jobId`。
- `reportId` / `artifactId` 是 output evidence，不是 job identity。
- host rebind 后 running job continuity 无法证明时，job-specific calls 返回 `status: lost`，aggregate workflows 返回 `status: uncertain`。

### Next step

```ts
type UnityAgentKitNextStepKind =
  | "read_resource"
  | "check_job_status"
  | "get_job_result"
  | "read_state"
  | "rerun_with_confirmation"
  | "inspect_diagnostics";

interface UnityAgentKitNextStep {
  kind: UnityAgentKitNextStepKind;
  tool?: string;
  action?: string;
  resourceUri?: string;
  jobId?: string;
  reason: string;
}
```

Rules:

- `nextStep` 是 bounded guidance，不是 free-form instruction blob。
- 如果 timeout 有 `jobId`，`nextStep` 指向 status/result action。
- 如果 timeout 没有 job，`nextStep` 指向 state read、resource read 或 diagnostics inspection。
- `rerun_with_confirmation` 只在重复 side effect 需要用户明确确认时使用。

### Timeout continuation

```ts
interface UnityAgentKitTimeoutContinuation {
  mayStillBeRunning: boolean;
  safeToRetry: boolean;
  nextStep: UnityAgentKitNextStep;
  diagnostics: UnityAgentKitDiagnostic[];
}
```

Public result 对齐：

```text
status: timeout
mayStillBeRunning: boolean
safeToRetry: boolean
nextStep: UnityAgentKitNextStep
diagnostics: UnityAgentKitDiagnostic[]
job?: UnityAgentKitJobReference
```

Rules:

- `timeout` 不证明 Unity operation failed。
- `safeToRetry` 默认 `false`，只有重复 side effect 被排除时才可为 `true`。
- `mayStillBeRunning` 对 job-backed / accepted workflows 默认 `true`，除非证据证明已停止。
- Timeout 结果必须包含可执行 nextStep。
- Claude 不应 blind retry。

### Category-level timeout / polling policy

| Category | 默认范围 | Max cap | safeToRetry | nextStep |
|---|---:|---:|---|---|
| lightweight read | 1-5s | 10s | true if read-only | read_state / inspect_diagnostics |
| readiness | 10-30s | 60s | true if no side effect | read_state |
| compile | 30-120s | explicit long wait | false unless no-op proof | read_state / inspect_diagnostics |
| test | 60-300s | explicit long wait | false | check_job_status / get_job_result |
| playmode transition | 10-60s | explicit long wait | false unless no-op proof | read_state |
| screenshot / artifact | 10-30s | 60s | false unless no artifact write occurred | read_resource / inspect_diagnostics |
| resource readback | 1-10s | 30s | true if read-only | read_resource / inspect_diagnostics |

Rules:

- 5C / 5D 可以选具体值，但必须落在 category policy 内。
- 超出 max cap 需要显式用户意图或设计说明。
- 不新增 broad user-facing timeout configuration。
- policy table 是 design/contract 输入，不代表 5B 实现真实 compile/test/playmode wait workflows。

## Completion rule helpers

Phase 5B 在 TS 侧实现通用 completion helpers，不实现 action-specific evaluator。

建议 helper 语义：

```text
requestAcceptedResult(...)
stateSettledResult(...)
artifactCompleteResult(...)
jobReportRequiredResult(...)
timeoutContinuationResult(...)
uncertainEvidenceResult(...)
resourceReadFailureResult(...)
```

### Completion rules

1. `requestAcceptedResult(...)` 可以返回 `status: "succeeded"`，但 summary/evidence 必须明确 request accepted, not completed。
2. `stateSettledResult(...)` 只证明状态收敛，不证明业务成功。
3. `artifactCompleteResult(...)` 只有 metadata exists、URI supported、relative path safe、file/report exists、content valid、`validationStatus == "valid"` 且 Resource readback succeeds 时才能作为成功证据。
4. `jobReportRequiredResult(...)` 规定 job state completed 不等于 public success；没有 readable report 不能 verified success。
5. `timeoutContinuationResult(...)` 必须包含 `mayStillBeRunning`、`safeToRetry`、`nextStep` 和 diagnostics。
6. `uncertainEvidenceResult(...)` 用于证据不足时保持 `uncertain`，不把 missing evidence 报成 success。

## v2 reference mapping

Phase 5B 只吸收 v2 底层机制和经验，不继承 v2 public contract。

### 采用

| 能力域 | v2 参考 | 采用内容 |
|---|---|---|
| artifact identity | v2 artifact/report 输出经验 | generated ID + metadata binding，不用用户路径作为 identity |
| screenshot 后续 producer | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ScreenshotService.cs` | 只记录 Phase 5D 应参考 Game View lookup / focus / repaint / target-size 机制 |
| console 后续 producer | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ConsoleService.cs` | 只记录 Phase 5C 应参考 `UnityEditor.LogEntries` reflection readback |
| host/runtime recovery | v2 host lifecycle / rebind 经验 | host rebind 后 running job 不强恢复；metadata + readable file 可 recover |
| result/evidence semantics | v2 hardening 经验 | request accepted、state settled、artifact complete、verified success 必须分开 |

### 不采用

| v2 内容 | 不采用原因 |
|---|---|
| v2 public tool schema | 新插件不做 legacy compatibility layer |
| v2 MCP public registration | Phase 5E 才接 public tools / handlers |
| 直接 pixel read screenshot path | Phase 5 spec 已禁止作为 screenshot success path |
| request sent implies done | 与 Phase 4 completion semantics 冲突 |
| path-as-primary-identity | 违反 Phase 4 artifact/resource identity rules |
| broad Resource handlers | Phase 5B 只做 internal readback API |

## 预计 implementation 文件职责

本节是 design handoff，不在本轮实现。

### TS contract / infrastructure

```text
plugins/unity-agent-kit/src/contracts/result.ts
plugins/unity-agent-kit/src/artifacts/types.ts
plugins/unity-agent-kit/src/artifacts/paths.ts
plugins/unity-agent-kit/src/artifacts/metadata.ts
plugins/unity-agent-kit/src/resources/uri.ts
plugins/unity-agent-kit/src/resources/readback.ts
plugins/unity-agent-kit/src/workflows/timeout.ts
plugins/unity-agent-kit/src/workflows/completion.ts
```

职责：

- 收敛 resource/job/nextStep 通用 contract。
- 定义 artifact metadata / validation status。
- 定义 artifact root 和 safe path resolution。
- 实现 URI parse/format。
- 实现内部 Resource readback API，不注册 MCP handler。
- 实现 timeout continuation helper。
- 实现通用 completion rule helpers。

### TS tests

```text
plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts
plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts
```

职责：

- 行为测试，不只检查符号存在。
- 覆盖 URI parsing、safe readback、traversal rejection、metadata/file mismatch、completion helpers、timeout nextStep。

### Unity C# internal smoke

```text
unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs
unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeArtifactTests.cs
```

职责：

- internal/test-only artifact contract smoke。
- 解析 `.ai-debug/unity-agent-kit/artifacts/`。
- 写 synthetic artifact + metadata。
- basic validation status。
- 不实现真实 screenshot/test/console producer。
- 不注册 public action。

## Implementation plan handoff

Phase 5B 不创建 execution index。设计规格批准后，直接调用 `superpowers:writing-plans` 创建一份 executable implementation plan：

```text
docs/superpowers/plans/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion.md
```

该 plan 必须记录：

```markdown
**拆分检查：** 已检查；无需拆分。
```

理由：Phase 5B 当前是单一 cohesive infrastructure patch：artifact/resource contract、internal readback、timeout/completion helpers 和 Unity internal artifact smoke 共同构成一个共享基础设施 gate。拆成 technical contract + execution index + wave plans 会分散 contract/evidence；若 implementation plan 自检发现范围超过单 plan，则停止并回到拆分决策。

Phase 5 plan index 可以把 Phase 5B execution entry 指向该 direct executable plan，或明确标注无需 execution index。

## 验证矩阵

### TS evidence

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts
```

要求：fail 0。

证明：URI parsing 只接受支持类型；traversal / malformed IDs 被拒绝；metadata/file mismatch 不会变 success；unsupported `validation-reports` 不被实现；timeout result 带 nextStep / safeToRetry / mayStillBeRunning；completion helpers 不把 accepted/settled 当 verified success。

### Unity evidence

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5BArtifactContractResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeArtifactTests
```

本机 Unity 2022.3.61f1 使用不带 `-quit` 的 batchmode test command，因为此前验证 `-quit` 在该环境会在 Test Runner 前退出。

要求：XML 中 `failed="0"`。

证明：Unity 能按 contract 解析 artifact root、写 synthetic artifact + metadata、设置 basic validation status、拒绝或标 invalid unsafe relative path，并且没有实现真实 screenshot/test/console producer。

### Scope boundary check

必须证明这些路径不存在：

```text
plugins/unity-agent-kit/src/tools
plugins/unity-agent-kit/src/mcp
plugins/unity-agent-kit/skills/unity
plugins/unity-agent-kit/skills/unity.md
```

并证明：

- no MCP Resource handler registration。
- no public tool registration。
- no validation-reports readback support。
- no real screenshot/test/console workflow。

### Docs / state check

必须证明：

- Phase 5A remains completed。
- Phase 5B completed only after evidence。
- Phase 5 remains incomplete / partial。
- next handoff moves to Phase 5C。
- no Phase 5 completed wording。
- no public MCP tools / `/unity` skill completed wording。

### Diff check

```bash
git diff --check
```

要求：无 whitespace errors。CRLF normalization warnings 可记录但不算失败。

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| TS Resource URI/readback contract | 内部 readback API，不注册 MCP handler | 8 | 修订 contract 或减少 supported type |
| Artifact metadata schema | generated ID + metadata binding + safe relative path | 8 | 缩小 metadata 字段或延后非必要字段 |
| Safe path/traversal rejection | TS path resolver 拒绝 traversal / absolute / encoded traversal | 8 | 先补测试再实现 |
| Timeout continuation contract | category policy + helper 输出 nextStep/safeToRetry/mayStillBeRunning | 8 | 降低 policy 粒度或补充决策 |
| Completion rule helpers | 通用 helpers，不做 action-specific evaluator | 8 | 移除越界 helper 或拆到 Phase 5C/5D |
| Unity internal artifact smoke | internal/test-only producer contract smoke | 7 | 保持 internal/test-only 或缩小为 metadata-only smoke |
| v2 reference mapping | 只吸收底层机制，不继承 public contract | 8 | 补充采用/不采用原因 |

低于 7/10 的对象不得进入 completion evidence。处理方式只能是修订方案、排除出 completion evidence，或由用户逐条明确接受风险。

## Roadmap Phase Upgrade Check

当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。

理由：Phase 5B 是 Phase 5 内部共享基础设施 gate，依赖 Phase 5A，交付给 Phase 5C / 5D / 5E，不具备独立 roadmap goal，不独立解锁 Phase 6 / 7 / 8。

如果 implementation planning 发现 Phase 5B 获得独立 roadmap goal、独立跨 phase blocker、需要独立 blocker/current-state，或超过单份 strict implementation plan 的范围，停止并进入 roadmap structural change 或 subplan split review。

## 完成标准

Phase 5B 完成必须同时满足：

- TS Resource/contract tests pass。
- TS timeout/completion tests pass。
- Existing host runtime tests continue to pass。
- Unity artifact contract smoke tests pass。
- Scope boundary check pass。
- Docs/state check pass。
- `git diff --check` pass。
- Phase 5A remains completed。
- Phase 5B completion evidence recorded。
- Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。
- No public MCP tools, MCP Resource handlers, `/unity` skill, real screenshot/test/console workflows, validation-reports readback, generic job store, workflow business implementation, or final daily loop E2E are implemented.

## 自检结果

- 范围聚焦在 Phase 5B Artifact / Resource / Timeout / Completion 基础设施，没有进入 Phase 5C / 5D / 5E。
- 已记录不创建 execution index，spec 批准后直接写 executable implementation plan。
- 已明确 validation-reports 归属 Phase 5E，不作为 Phase 5B readback type。
- 已明确 job store 不在 Phase 5B 实现。
- 已明确 MCP Resource handlers 和 public tools 不在 Phase 5B 实现。
- 验证矩阵包含 TS 行为测试、Unity EditMode smoke、scope boundary、docs/state 和 diff check。
- 设计中没有未决问题或占位内容。
