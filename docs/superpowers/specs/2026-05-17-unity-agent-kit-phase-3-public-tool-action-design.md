# Unity Agent Kit Phase 3 Public MCP Tool Action Design

## 背景

Unity Agent Kit 使用四层结构：

```text
Skills 调用指导层
→ Public MCP tools
→ Internal operations
→ Unity Host Runtime
```

Phase 1 已定义 Contract Kernel、public/internal/host 边界、result/safety/target/artifact 基础语义。Phase 2 已定义 `/unity` 入口、P0 daily loop recipe contract、Project Command fallback contract 和 Phase 6/7/8 handoff category。Phase 3 的职责是设计 Claude-facing public MCP tool/action contract，并产出可供 Phase 5 实现、Phase 7/8 继续设计、Phase 9 audit 使用的 public tool/action catalog。

Phase 3 不实现 MCP server、Unity C# host、actual skill 文件或审计脚本。

## 目标

- 定义 public MCP tool/action 的 shared parameter model、shared target model、result 最低共同语义、safety metadata、completion semantics、Resource 引用边界和 catalog contract。
- 将 P0 daily loop tools/actions 设计到 `specStatus: stable_ready`，为 Phase 5 实现计划提供输入。
- 将 Phase 7 简单创作 vertical slice 相关 tools/actions 设计为较详细 `candidate`，为 Phase 7 规格提供输入。
- 将 Phase 8 extension pool 相关 tools/actions 保持为 taxonomy + safety notes，不提前锁死完整 schema。
- 为 `unity_project_command` 登记 candidate 壳和不可变安全边界，详细 registry 设计交给 Phase 6。
- 明确 public schema 与 internal operation schema 的边界，避免 v2 public 兼容层或万能 JSON 调用口。
- 提供 Phase 9 可检查的 catalog 字段和稳定引用格式。

## 非目标

- 不实现任何 tool/action。
- 不创建 actual `/unity` skill 文件。
- 不定义完整 diagnostics schema、job result schema、artifact lifecycle、console cursor 或 compiler diagnostics attribution；这些属于 Phase 4。
- 不定义完整 Project Editor Command Registry metadata、invoke 流程或 recipe landing strategy；这些属于 Phase 6。
- 不定义完整 material property value model、UI query language、animation controller model、nested prefab 语义或 batch asset selector；这些属于 Phase 7/8 对应规格。
- 不复制 `unity-mcp-v2` 的 public operation names。
- 不复制 `Unity-Skills` 的 JSON 文件队列或 PascalCase command format。
- 不把 `unity_project_command.invoke` 视为标准 public tools 之外的通用后备入口。

## 已确认设计决策

- Phase 3 采用分层深度：P0 daily loop 为 `stable_ready`，Phase 7 创作相关工具为 detailed candidate，Phase 8 extension pool 只做 taxonomy + safety notes。
- `unity_project_command` 只保留收缩版最低边界：candidate 壳、不得绕过标准 public tools、`invoke` 必须依赖 metadata / safety / `verificationHint`。
- Public parameter model 采用混合模型：顶层最小 contract + 每个 tool 的 action-specific discriminated union。
- Catalog 区分 `specStatus` 与 `referenceStatus`。Phase 3 可交付 `specStatus: stable_ready`，但 Phase 5/7/8 对应实现和验证通过后才允许 `referenceStatus: stable`。
- Phase 3 只定义 tool result 的最低 Resource 引用字段和 read-tool 边界；resource payload schema、diagnostics 细节和 artifact lifecycle 属于 Phase 4。
- `unity_editor.get_status`、`unity_editor.wait_ready`、`unity_editor.get_current_host` 属于 P0 `stable_ready`；`unity_editor.list_hosts`、`unity_editor.select_host` 保持 candidate。
- Phase 3 定义最低共同 result envelope 和每个 action 的关键 output signals；diagnostics shape、job result 和 artifact lifecycle 属于 Phase 4。
- Phase 3 使用轻量 `completionKind` tag；Phase 4 可细化 job/workflow/lifecycle，但不得改变 Phase 3 action 的用户可见语义。
- P0 stable-ready actions 使用 compact mapping record；Phase 7 candidate 写 mapping intent；Phase 8 taxonomy 只写 candidate source domain。
- Phase 3 定义最小 shared target model：`host_binding`、`test_selector`、`scene_object`、`component_on_object`、`material_asset`、`asset_path`、`prefab_asset`。

## 继承约束

Phase 3 继承 Phase 1、Phase 2 和 roadmap 的约束：

- Unity Agent Kit 是新的 Agent 操作体系，不是 `unity-mcp-v2` public compatibility layer。
- Public tools 面向 Claude tool selection；internal operations 面向 TS orchestration、host routing、测试和 Unity C# operation router。
- Unity C# host 只接收 internal operations，不读取 public metadata，也不承担 public action 聚合、长 workflow 编排或最终业务成功判定。
- Public tool 使用 `unity_` 前缀；tool 内 action 使用 `snake_case`。
- Public schema 必须明确，禁止自由形态 `{ action: string, payload: unknown }` 这类未约束主接口。
- Public action 必须声明完成语义、安全 metadata 和验证路径。
- 写操作不能只返回 `ok=true`；必须能表达对应的 state/effect/artifact/report 信号、验证结果和失败/不确定原因。
- `uncertain` 是一等结果；无法证明 `successMeans` 时不得返回 verified success。
- 首版 Resources 只用于 tool-generated artifacts/reports；editor status、scene hierarchy、asset search、object snapshot 等保持 tool result。
- Actual skill executable recipe steps 只能引用 `referenceStatus: stable` 的 public tool/action。
- Handoff / `requiredCapabilities` 可以引用 `referenceStatus: candidate`，但不得作为 actual executable step。

## Scope depth

### P0 daily loop：stable-ready spec

P0 tools/actions 写到可进入 Phase 5 实现计划的深度：

```text
unity_editor
unity_compile
unity_console
unity_test
unity_playmode
unity_screenshot
```

P0 action catalog entries 使用：

```text
specStatus: stable_ready
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 5
```

`referenceStatus` 保持 `candidate`，直到 Phase 5 实现并完成验证证据后才允许改为 `stable`。

### Phase 7 creation slice：detailed candidate

Phase 7 创作相关 tools/actions 写成较详细 candidate：

```text
unity_scene
unity_object
unity_component
unity_material
unity_validation.check_scene
```

Candidate 条目使用：

```text
specStatus: draft
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 7
```

Phase 3 提供 action taxonomy、最低 schema 边界、target model、验证 readback 和 safety notes。Phase 7 负责完整 value model、schema 收敛、实现和 recipe landing strategy。

### Phase 8 extension pool：taxonomy + safety notes

Phase 8 extension tools/actions 只写 taxonomy 和 safety notes：

```text
unity_asset
unity_prefab
unity_ui
unity_animation
unity_validation expansion
```

Entries 使用：

```text
specStatus: draft
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 8
```

Phase 8 中被选择的 extension domain 必须编写独立 spec、plan、implementation 和 verification。

## Shared public parameter model

每个 public tool input 使用混合模型：

```text
PublicToolInput =
  action
  + requestId?
  + dryRun?
  + action-specific payload
```

### 顶层字段

| 字段 | 规则 |
|---|---|
| `action` | 每个 public tool 自己的 discriminant，使用 `snake_case`。 |
| `requestId?` | 用于幂等性、日志和诊断关联；不作为 job identity。 |
| `dryRun?` | 顶层统一字段；只有 action metadata 声明 `dryRunMode: supported` 或 `required_first` 时才允许为 `true`。 |

### 规则

- 每个 public tool 定义自己的 discriminated union。
- action-specific payload 必须是 typed schema，不得退化为 arbitrary options bag。
- shared types 可以复用，例如 target、resource reference、safety confirmation summary。
- 顶层 `dryRun` 对 read action 默认无效；read action schema 可以拒绝 `dryRun: true`。
- `requestId` 不替代 `jobId`、`artifactId`、`reportId` 或 host identity。

## Public result minimum envelope

Phase 3 定义最低共同 result envelope，不定义完整 diagnostics/job/artifact schema。

```text
status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected
tool
action
summary
changed?
persisted?
dryRun?
validationStatus?
artifacts?
reports?
verificationSignals?
diagnostics
nextStep?
```

### 字段语义

| 字段 | 语义 |
|---|---|
| `status` | action 结果：`succeeded`、`failed`、`uncertain`、`cancelled`、`timeout`、`lost` 或 `rejected`；该枚举由 Phase 4 细化并作为最终 result status contract。 |
| `tool` / `action` | 机器可检查引用。 |
| `summary` | 面向 Claude 和用户的短摘要。 |
| `changed?` | 是否修改 Unity project/editor state、transient editor state、job state 或 artifact/report state。 |
| `persisted?` | 仅用于修改并保存 Unity project/editor persistence unit 的 effect actions；request、transient editor state、diagnostic view mutation 和 artifact/report-producing actions 可省略或返回 `false`。 |
| `dryRun?` | 本次是否为 dryRun。 |
| `validationStatus?` | artifact 或 effect verification 的 `valid`、`invalid`、`uncertain`。 |
| `artifacts?` | screenshot、console snapshot 等 artifact references。 |
| `reports?` | test report、validation report 等 report references。 |
| `verificationSignals?` | 每个 action 的关键验证信号，如 compiler messages 无 error、object snapshot readback matched。 |
| `diagnostics` | 诊断摘要；内部结构由 Phase 4 细化。 |
| `nextStep?` | `failed` 或 `uncertain` 时建议的下一步。 |

### 规则

- 只读 action 至少返回 `status`、`summary` 和对应 snapshot/count/state。
- 修改并保存 Unity project/editor persistence unit 的 effect action，success 必须表达 `changed=true`、`persisted=true` 和验证信号。
- `request_accepted` action 的 `status: succeeded` 必须表达请求已接受的信号；不得伪装成最终 effect verified。
- Transient editor state 或 diagnostic view mutation 的 `status: succeeded` 必须表达对应 readback 信号；`persisted` 可省略或为 `false`。
- 产出 artifact 的 action 必须返回 artifact reference、`validationStatus` 和 artifact verification signals；`persisted` 可省略或为 `false`。
- 产出 report 的 action 必须返回 report reference 和 report collection / verification signals；`persisted` 可省略或为 `false`。
- `dryRun` 的 `status: succeeded` 必须表达 `changed=false`、`persisted=false`。
- `uncertain` 必须包含 `diagnostics` 和 `nextStep`。
- 部分生效必须显式表达，不能伪装成 clean success。

## Shared target model

Phase 3 定义最小 target model，不定义复杂查询语言。

### Target kinds

```text
host_binding
test_selector
scene_object
component_on_object
material_asset
asset_path
prefab_asset
```

每个 target kind 只定义：

```text
identity fields
ambiguity rules
confirmation summary
applicable actions
validation readback path
```

### `host_binding`

用于 `unity_editor.get_current_host`、candidate `list_hosts`、candidate `select_host`。

最小 identity fields：

```text
hostId
projectRoot
projectName?
unityVersion?
pluginVersion?
protocolVersion?
instanceId?
epoch?
```

规则：

- Active binding 绑定 project identity + host identity，不只依赖 port。
- `get_current_host` 只读当前绑定。
- `select_host` 必须目标明确；多个 host 匹配时不得自动选择。

### `test_selector`

用于 `unity_test.list`、`start`、`run_and_collect`、`run_and_verify`。

最小 identity fields：

```text
testMode?: editmode | playmode | all
assemblyName?
className?
testName?
filterExpression?
```

规则：

- `list` 可返回多个候选。
- `start` / `run_*` 的 selector 必须能被 Unity Test Runner 解释；无效 selector 返回 `failed`。
- selector 为空时表示默认测试集合，具体默认范围由 action schema 明确。

### `scene_object`

用于 object create/find/snapshot/set_transform/delete 以及 component/material assignment。

最小 identity fields：

```text
scenePath?
hierarchyPath?
name?
instanceId?
globalObjectId?
```

规则：

- Read/search action 可以返回多个候选。
- Write/destructive action 必须唯一命中。
- Destructive confirmation summary 必须包含 scene、hierarchy path、object name 和 destructive impact。

### `component_on_object`

用于 component list/get/add/set_property。

最小 identity fields：

```text
objectTarget: scene_object | prefab_asset component context
componentType
componentIndex?
componentId?
propertyPath?
```

规则：

- `add` 必须明确 component type。
- `set_property` 必须有 typed property path/value 边界。
- 多个同类型组件存在时，write action 必须指定 index 或唯一 component identity。

### `material_asset`

用于 material create/get_properties/set_property/assign。

最小 identity fields：

```text
assetPath?
guid?
shaderName?
materialName?
```

规则：

- `find_shader` 可以返回候选，但 `create` 不得猜测 ambiguous shader。
- `assign` 必须明确 renderer target 和 slot。
- `set_property` 必须支持 readback verification。

### `asset_path`

用于 Phase 8 `unity_asset` taxonomy。

最小 identity fields：

```text
path
guid?
assetType?
```

规则：

- Path 必须在 Unity project assets boundary 内。
- Move/rename/delete 需要 collision/overwrite/destructive policy。
- Batch selectors 不在 Phase 3 定义。

### `prefab_asset`

用于 Phase 7/8 prefab-adjacent actions。

最小 identity fields：

```text
assetPath?
guid?
prefabRootPath?
```

规则：

- Prefab asset、scene instance、prefab stage 不得混淆。
- Nested prefab、prefab stage、apply/revert overrides 属于 Phase 8 独立 spec。

## Safety metadata

每个 public action 必须声明：

```text
sideEffectLevel: read | write | destructive
confirmationPolicy: never | when_destructive | always
dryRunMode: unsupported | supported | required_first
```

### 规则

- `write` / `destructive` action 必须有 verification path。
- `destructive` action 的 `confirmationPolicy` 不得为 `never`。
- 覆盖、移动、重命名、删除、批量修改等 action 需要 confirmation 或 dryRun。
- `targetStrictness` / `overwritePolicy` 只在对应 action 需要时声明。
- Dry run 只能说明影响分析成功，不能说明真实执行完成。
- Confirmation 必须绑定 target summary、operation summary 和 destructive impact。
- 如果 target 或 impact 在确认后变化，必须重新确认。

## Completion semantics

Phase 3 使用轻量 `completionKind` tag。Phase 4 可细化 job/workflow/lifecycle，但不得改变 Phase 3 的用户可见语义。

```text
read_snapshot
request_accepted
state_settled
effect_verified
artifact_verified
report_collected
result_verified
```

每个 action 必须声明：

```text
completionKind
waitsFor
successMeans
doesNotMean
verificationMeaning
```

### Tag 语义

| completionKind | 语义 |
|---|---|
| `read_snapshot` | 返回当前可观察状态，不修改目标。 |
| `request_accepted` | 请求已被接受，不代表目标状态已完成。 |
| `state_settled` | 等待某状态收敛，不代表业务成功。 |
| `effect_verified` | 写入或状态变化已执行并通过 readback 验证。 |
| `artifact_verified` | artifact 已生成并通过最低结构校验。 |
| `report_collected` | report 已收集，不代表业务通过。 |
| `result_verified` | 操作结束并满足成功规则。 |

### 固定反例

```text
unity_compile.wait_for_idle != compile success
unity_compile.compile_and_check != tests passed
unity_test.run_and_collect != tests passed
unity_playmode.enter != stable PlayMode
unity_screenshot.capture_game_view != visual acceptance
```

## Resource reference boundary

Phase 3 只定义 tool result 如何引用 Resource，不定义 resource payload schema、diagnostics shape、artifact lifecycle、retention 或 cleanup。

### 最低引用字段

```text
artifactId?
reportId?
uri
type
validationStatus
summary
```

### 首版 Resource 类型

```text
screenshot
test_report
console_snapshot
validation_report
```

### 规则

- Screenshot/test/console/validation 产生的可复读结果返回 Resource URI。
- Editor status、scene hierarchy、asset search、object snapshot 等高频 read state 继续作为 tool result。
- Local file path 只能作为 optional diagnostics，不是 primary identity。
- Resource layer 根据 artifact/report reference 读取，不重新定义 identity。
- Artifact lifecycle、diagnostics shape、console cursor、compiler diagnostics attribution 属于 Phase 4。

## Catalog contract

每个 action catalog entry 至少包含：

```text
toolName
actionName
owningPhase
implementationOwner
specStatus: draft | stable_ready
referenceStatus: candidate | stable | deprecated
inputSchemaRef
resultSignals
sideEffectLevel
confirmationPolicy
dryRunMode
completionKind
verificationMeaning
resourceRefs?
targetModel?
internalMapping?
description
```

### 规则

- Phase 3 可以将 P0 actions 标为 `specStatus: stable_ready`。
- Phase 3 不把未实现 action 标为 `referenceStatus: stable`。
- Actual skill executable recipe steps 只能引用 `referenceStatus: stable`。
- Handoff / `requiredCapabilities` 可以引用 `referenceStatus: candidate`。
- Phase 9 audit 以 catalog 校验 skill/schema/docs 是否漂移。
- Catalog 中的 `description` 是最小 tool/action description，不包含多步骤 recipe、长示例或 troubleshooting。

### `inputSchemaRef` 命名规则

P0 `stable_ready` action 必须有稳定的 `inputSchemaRef`，格式为：

```text
<toolName>.<PascalCaseActionName>Input
```

示例：

```text
unity_compile.CompileAndCheckInput
unity_test.RunAndVerifyInput
unity_screenshot.CaptureGameViewInput
```

规则：

- Phase 3 的 `inputSchemaRef` 是稳定引用名，不是完整 JSON/Zod schema。
- Phase 3 只定义 bounded fields / hints，例如 timeout、polling、diagnostic collection、target selector。
- Phase 5 materialize 具体 schema 时，必须使用这些 refs 对齐 catalog。
- 对没有 action-specific payload 的 action，也必须保留 zero-payload input schema ref。
- 仍未锁定的字段必须在对应 action 的输入 schema 说明中标为 Phase 5-owned bounded hint，不能留成自由 `params`。

### Catalog entry 形状示例

```yaml
catalogEntry:
  toolName: unity_compile
  actionName: compile_and_check
  owningPhase: Phase 3
  implementationOwner: Phase 5
  specStatus: stable_ready
  referenceStatus: candidate
  inputSchemaRef: unity_compile.CompileAndCheckInput
  resultSignals:
    - compilerMessagesAttributed
    - compilerErrorCount
    - supplementalConsoleDiagnostics
  sideEffectLevel: write
  confirmationPolicy: never
  dryRunMode: unsupported
  completionKind: result_verified
  verificationMeaning: "Compilation lifecycle finished and attributed compiler messages contain no errors."
  resourceRefs: []
  targetModel: []
  internalMapping:
    owner: ts_workflow
    operations:
      - compile.request
      - compile.state.get
      - compile.diagnostics.get
  description: "Request Unity C# compilation, wait for lifecycle completion, and verify success from compiler messages."
```

## P0 stable-ready action specs

所有 P0 actions 使用：

```text
specStatus: stable_ready
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 5
```

P0 compact mapping records 使用：

```text
internal operations / workflow owner
v2 source reference
known semantic gap
Phase 5 implementation note
```

### P0 `inputSchemaRef` 清单

这些 refs 是 Phase 3 的稳定 schema 引用名。Phase 5 负责 materialize 具体 JSON/Zod/schema，并保持 refs 与 catalog 对齐。

本节 23 行 `inputSchemaRef` 清单只覆盖 P0 `stable_ready` actions，并作为这部分 catalog 的稳定引用检查基线。Phase 7 candidate actions、Phase 8 taxonomy actions，以及 `unity_project_command` 的 candidate shell 条目不由这 23 行证明 catalog 完整性；它们在 Phase 3 只保留有界候选信息，完整 domain schema、metadata 与 registry 细节分别由 Phase 7、Phase 8、Phase 6 收敛。与 diagnostics、artifact lifecycle 相关的验证细节仍由 Phase 4 负责。

| Tool | Action | inputSchemaRef | Phase 3 bounded fields / hints |
|---|---|---|---|
| `unity_editor` | `get_status` | `unity_editor.GetStatusInput` | zero-payload |
| `unity_editor` | `wait_ready` | `unity_editor.WaitReadyInput` | timeout / polling hints |
| `unity_editor` | `get_current_host` | `unity_editor.GetCurrentHostInput` | zero-payload |
| `unity_compile` | `get_state` | `unity_compile.GetStateInput` | zero-payload |
| `unity_compile` | `request` | `unity_compile.RequestInput` | optional compile trigger hint if Phase 5 proves it is bounded |
| `unity_compile` | `wait_for_idle` | `unity_compile.WaitForIdleInput` | timeout / polling hints |
| `unity_compile` | `compile_and_check` | `unity_compile.CompileAndCheckInput` | timeout / diagnostic collection hints |
| `unity_console` | `snapshot` | `unity_console.SnapshotInput` | severity / since-cursor hints after Phase 4 defines cursor |
| `unity_console` | `count` | `unity_console.CountInput` | optional severity filter |
| `unity_console` | `clear` | `unity_console.ClearInput` | explicit clear request; no hidden cleanup |
| `unity_test` | `list` | `unity_test.ListInput` | `test_selector` |
| `unity_test` | `start` | `unity_test.StartInput` | `test_selector`, timeout hints |
| `unity_test` | `get_status` | `unity_test.GetStatusInput` | test job/report identity |
| `unity_test` | `get_result` | `unity_test.GetResultInput` | test report identity |
| `unity_test` | `run_and_collect` | `unity_test.RunAndCollectInput` | `test_selector`, timeout hints |
| `unity_test` | `run_and_verify` | `unity_test.RunAndVerifyInput` | `test_selector`, timeout hints, pass criteria bounded by Phase 5 |
| `unity_playmode` | `get_state` | `unity_playmode.GetStateInput` | zero-payload |
| `unity_playmode` | `enter` | `unity_playmode.EnterInput` | timeout / diagnostic hints only if Phase 5 uses helper action |
| `unity_playmode` | `exit` | `unity_playmode.ExitInput` | timeout / diagnostic hints only if Phase 5 uses helper action |
| `unity_playmode` | `wait_for_state` | `unity_playmode.WaitForStateInput` | target state, timeout / polling hints |
| `unity_playmode` | `enter_and_verify` | `unity_playmode.EnterAndVerifyInput` | timeout / diagnostic collection hints |
| `unity_playmode` | `exit_and_verify` | `unity_playmode.ExitAndVerifyInput` | timeout / diagnostic collection hints |
| `unity_screenshot` | `capture_game_view` | `unity_screenshot.CaptureGameViewInput` | safe output naming / capture hints bounded by Phase 5 |

P0 mapping 的参考输入来源：

```text
references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/operations.ts
references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2OperationRouter.cs
references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpV2Models.cs
```

### `unity_editor`

#### `stable_ready` actions

```text
get_status
wait_ready
get_current_host
```

#### 候选 host-management actions

```text
list_hosts
select_host
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `get_status` | `read_snapshot` | `read` | `never` | `unsupported` | Current active host/editor state returned. | Editor is ready for writes. | Result includes readiness, project identity, busy state signals. |
| `wait_ready` | `state_settled` | `read` | `never` | `unsupported` | Active host for resolved Unity project is reachable and Editor is not in a blocking transition. | Compilation or tests succeeded. | Poll status until ready or timeout. |
| `get_current_host` | `read_snapshot` | `read` | `never` | `unsupported` | Current active binding and project identity returned. | Host selection is correct for every task. | Result includes host binding identity. |
| `list_hosts` | `read_snapshot` | `read` | `never` | `unsupported` | 返回候选 hosts。 | 已选择 host。 | Result 列出 host identities。 |
| `select_host` | `effect_verified` | `write` | `always` | `unsupported` | Active binding changed to the explicit selected host. | The selected project is safe for all operations. | Read back active binding and project identity. |

#### 输入 schema 说明

- `get_status` accepts no target.
- `wait_ready` accepts timeout/polling hints owned by TS.
- `get_current_host` accepts no target.
- `select_host` requires `host_binding` target and is not part of P0 daily loop stable-ready implementation.

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `get_status` | TS read + host probe | `editor.status.get` | Must include active binding/project identity, not only editor state. | Implement against new host registry and status contract. |
| `wait_ready` | TS polling workflow | `editor.open_and_wait_ready` / status polling references | v2 workflow semantics may include open behavior; Phase 3 requires readiness wait, not Unity launch. | Bound timeout and host rebind behavior in Phase 4/5. |
| `get_current_host` | TS read | registry/probe reference | v2 may not expose exactly this public action. | Use new host binding registry contract. |

### `unity_compile`

#### Actions

```text
get_state
request
wait_for_idle
compile_and_check
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `get_state` | `read_snapshot` | `read` | `never` | `unsupported` | Current compiling/updating state returned. | Compilation succeeded. | Read compile/update state. |
| `request` | `request_accepted` | `write` | `never` | `unsupported` | Compile request accepted. | Compile finished or succeeded. | Request accepted signal. |
| `wait_for_idle` | `state_settled` | `read` | `never` | `unsupported` | Unity is no longer compiling/updating. | Compiler messages contain no errors. | Poll compile/update state until idle or timeout. |
| `compile_and_check` | `result_verified` | `write` | `never` | `unsupported` | Compile lifecycle completed and attributed compiler messages contain no errors. | Tests passed or Console is clean. | Compiler messages are primary; console diagnostics supplemental. |

#### 输入 schema 说明

- `request` may accept a compile trigger mode if Phase 5 proves Unity distinguishes useful modes; otherwise no user-facing mode.
- `wait_for_idle` accepts timeout/polling hints.
- `compile_and_check` accepts timeout and diagnostic collection hints, but not arbitrary compiler flags.

#### Result signals 说明

```text
isCompiling
isUpdating
compileCycleId?
compilerMessagesAttributed
compilerErrorCount
compilerWarningCount
supplementalConsoleDiagnostics
```

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `get_state` | TS read | `compile.state.get` | Must align update/compile busy semantics with new result envelope. | Reuse/adapter possible. |
| `request` | TS command | `compile.request` | Request accepted is not compile success. | Keep completionKind explicit. |
| `wait_for_idle` | TS polling workflow | `compile.run_and_wait` references | v2 wait result must not be treated as success. | Separate idle from checked success. |
| `compile_and_check` | TS workflow | `compile.request`, `compile.state.get` | Need compiler messages attribution from `CompilationPipeline`. | Add internal diagnostics operation/report path. |

### `unity_console`

#### Actions

```text
snapshot
count
clear
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `snapshot` | `read_snapshot` | `read` | `never` | `unsupported` | Console log snapshot returned, optionally with Resource reference. | Compilation failed or succeeded. | Snapshot contains counts and optional cursor/reference. |
| `count` | `read_snapshot` | `read` | `never` | `unsupported` | Console counts returned. | New logs are attributable to a specific operation. | Count by severity. |
| `clear` | `effect_verified` | `write` | `never` | `unsupported` | Console cleared and count readback matches expected baseline. | Project assets/scenes changed. | Count after clear. |

`clear` is `write`, not `destructive`, because it changes the diagnostic view but does not delete project assets/scenes. It still must not run implicitly when user did not request it.

#### Resource boundary

- `snapshot` may return `console_snapshot` Resource reference.
- Console cursor structure belongs to Phase 4.

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `snapshot` | TS read | `console.snapshot.get` | Cursor and artifact semantics need Phase 4 alignment. | Return minimum snapshot result and optional resource reference. |
| `count` | TS read | console snapshot/count derivation | v2 may not have separate public count action. | Count can derive from snapshot service. |
| `clear` | TS command + readback | Unity-Skills `ClearConsole`, v2 console services if available | Must verify count after clear and not run as hidden cleanup. | Define operation and readback in Phase 5. |

### `unity_test`

#### Actions

```text
list
start
get_status
get_result
run_and_collect
run_and_verify
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `list` | `read_snapshot` | `read` | `never` | `unsupported` | Matching tests listed. | Tests are runnable or passing. | Test list returned. |
| `start` | `request_accepted` | `write` | `never` | `unsupported` | Test job started or accepted. | Tests finished or passed. | Job id/status returned. |
| `get_status` | `read_snapshot` | `read` | `never` | `unsupported` | Test job status returned. | Report is collected. | Job status read. |
| `get_result` | `report_collected` | `read` | `never` | `unsupported` | Test report retrieved if available. | Tests passed. | Report reference or unavailable status. |
| `run_and_collect` | `report_collected` | `write` | `never` | `unsupported` | Tests ended and report was collected. | Tests passed. | Test report reference exists. |
| `run_and_verify` | `result_verified` | `write` | `never` | `unsupported` | Tests ended and pass criteria were met. | PlayMode state remained unchanged. | Test result has zero failures/errors unless schema states otherwise. |

#### 输入 schema 说明

- Test selectors use `test_selector`.
- `start` and `run_*` accept timeout hints; TS owns timeout.
- Advanced Unity Test Runner options can be added by Phase 5 only if needed for P0.

#### Resource boundary

- `get_result`, `run_and_collect`, and `run_and_verify` may return `test_report` Resource reference.

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `list` | TS read | Unity Test Runner references; v2 may lack full list action | Need minimal list contract. | Implement if required for `/unity` routing and user tasks. |
| `start` | TS command | `test.run` | Must separate job accepted from pass. | Expose job id/report id separation. |
| `get_status` | TS read | `test.status.get` | Align job status with new envelope. | Use Phase 4 job status semantics. |
| `get_result` | TS read | `test.result.get` | Report collected is not pass. | Return report reference. |
| `run_and_collect` | TS workflow | `tests.run_and_collect` | Must not imply pass. | Preserve report-only semantics. |
| `run_and_verify` | TS workflow | `test.run`, `test.status.get`, `test.result.get` | Need explicit pass criteria. | Define pass criteria and report reference. |

### `unity_playmode`

#### Actions

```text
get_state
enter
exit
wait_for_state
enter_and_verify
exit_and_verify
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `get_state` | `read_snapshot` | `read` | `never` | `unsupported` | Current PlayMode/EditMode transition state returned. | Enter/exit succeeded. | State snapshot returned. |
| `enter` | `request_accepted` | `write` | `never` | `unsupported` | Enter PlayMode request accepted. | Stable PlayMode reached. | Request accepted signal. |
| `exit` | `request_accepted` | `write` | `never` | `unsupported` | Exit PlayMode request accepted. | Stable EditMode reached. | Request accepted signal. |
| `wait_for_state` | `state_settled` | `read` | `never` | `unsupported` | Target state reached and stable. | User scenario passed. | Poll state until target or timeout. |
| `enter_and_verify` | `result_verified` | `write` | `never` | `unsupported` | Stable PlayMode reached. | Gameplay correctness or tests passed. | State readback plus supplemental console diagnostics. |
| `exit_and_verify` | `result_verified` | `write` | `never` | `unsupported` | Stable EditMode reached. | Scene state is saved. | State readback plus supplemental console diagnostics. |

#### 输入 schema 说明

- `wait_for_state` target is `editmode` or `playmode` plus timeout hints.
- `enter_and_verify` and `exit_and_verify` may accept console diagnostic collection hint; console cursor structure belongs to Phase 4.

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `get_state` | TS read | `playmode.state.get` | Align transition state names with new schema. | Reuse/adapter possible. |
| `enter` | TS command | `playmode.enter` | Request accepted is not settled. | Keep request action separate. |
| `exit` | TS command | `playmode.stop` | Name changes to `exit`. | Adapter maps old stop operation if adopted. |
| `wait_for_state` | TS polling workflow | `playmode.enter_and_wait` references | Wait does not validate scenario. | Generalize state wait. |
| `enter_and_verify` | TS workflow | `playmode.enter`, `playmode.state.get` | Need supplemental console diagnostics without replacing state verification. | Use console cursor after Phase 4. |
| `exit_and_verify` | TS workflow | `playmode.stop`, `playmode.state.get` | Need stable EditMode readback. | Use new state convergence rules. |

### `unity_screenshot`

#### Actions

```text
capture_game_view
```

#### Action table

| Action | completionKind | sideEffectLevel | confirmationPolicy | dryRunMode | successMeans | doesNotMean | Verification |
|---|---|---|---|---|---|---|---|
| `capture_game_view` | `artifact_verified` | `write` | `never` | `unsupported` | PNG artifact exists, is non-empty, has valid dimensions, has safe path, and returns Resource URI. | Visual acceptance or gameplay correctness. | File structural checks plus artifact reference. |

#### 输入 schema 说明

- Accepts output naming hints only if path safety can be enforced.
- Does not accept arbitrary filesystem path outside Unity Agent Kit artifact root.
- May accept capture options that Phase 5 can implement without long UI setup.

#### Result signals 说明

```text
artifactId
uri
validationStatus
sizeBytes
width
height
relativePath?
```

#### Mapping record

| Action | Mapping owner | 候选 v2 source | 已知 gap | Phase 5 note |
|---|---|---|---|---|
| `capture_game_view` | TS workflow + Unity artifact producer | `screenshot.capture` | Must verify file exists, non-empty, dimensions valid, path safe; v2 result may need adaptation. | Produce screenshot artifact and Resource URI. |

## Phase 7 detailed candidate action specs

Phase 7 candidate actions use:

```text
specStatus: draft
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 7
```

Phase 7 mapping records include:

```text
mapping intent
candidate v2 / Unity-Skills source domain
expected verification readback
known safety notes
```

参考输入领域：

```text
references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/operations.ts
references/Unity-Skills/skills/unity-scene.md
references/Unity-Skills/skills/unity-gameobject.md
references/Unity-Skills/skills/unity-component.md
references/Unity-Skills/skills/unity-material.md
references/Unity-Skills/skills/unity-validation.md
```

### `unity_scene`

候选 actions：

```text
get_info
get_hierarchy
create
save
```

| Action | completionKind | sideEffectLevel | Safety / schema boundary | Verification |
|---|---|---|---|---|
| `get_info` | `read_snapshot` | `read` | Current or specified scene identity. | Scene metadata returned. |
| `get_hierarchy` | `read_snapshot` | `read` | Scene selector; result stays tool result, not Resource. | Hierarchy snapshot returned. |
| `create` | `effect_verified` | `write` | Requires scene name/path and overwrite policy. | Scene exists, is active if requested, persistence unit saved. |
| `save` | `effect_verified` | `write` | Requires explicit scene target or current scene. | Saved scene path and persisted signal returned. |

Mapping 意图：

- 候选 v2 sources：`scene.open`、`scene.create`、`scene.save` 和 hierarchy operations。
- Unity-Skills source domain: `unity-scene.md`.
- Phase 7 must decide exact scene path policy and save semantics.

### `unity_object`

候选 actions：

```text
find
snapshot
create
set_transform
delete
```

| Action | completionKind | sideEffectLevel | Safety / schema boundary | Verification |
|---|---|---|---|---|
| `find` | `read_snapshot` | `read` | Search selector 可返回多个候选。 | 返回候选列表。 |
| `snapshot` | `read_snapshot` | `read` | Requires unique `scene_object` target. | Transform/components/material slots returned. |
| `create` | `effect_verified` | `write` | Requires parent/context, name/type, no ambiguous parent. | Object exists, hierarchy path matches, snapshot readable, scene saved. |
| `set_transform` | `effect_verified` | `write` | Requires unique target and transform fields. | Transform readback matches and persistence unit saved. |
| `delete` | `effect_verified` | `destructive` | Requires strict target, confirmation binding or dryRun. | `find` no longer returns target. |

Mapping 意图：

- 候选 v2 sources： `hierarchy.create`, `hierarchy.delete`, `hierarchy.find`, `object.snapshot`, `target.resolve`.
- Unity-Skills source domain: `unity-gameobject.md`.
- Phase 7 must define create object types and transform value schema.

### `unity_component`

候选 actions：

```text
list
get
add
set_property
```

| Action | completionKind | sideEffectLevel | Safety / schema boundary | Verification |
|---|---|---|---|---|
| `list` | `read_snapshot` | `read` | Requires object target. | Component list returned. |
| `get` | `read_snapshot` | `read` | Requires component target. | Component state returned. |
| `add` | `effect_verified` | `write` | Requires unique object target and resolvable component type. | Component exists and is readable. |
| `set_property` | `effect_verified` | `write` | Requires typed property path/value; multiple same-type components must be disambiguated. | Readback matches requested value. |

Mapping 意图：

- 候选 v2 sources： `component.add`, `component.set`, `component.get`, `type.resolve`.
- Unity-Skills source domain: `unity-component.md`.
- Phase 7 must define typed value subset and property path restrictions.

### `unity_material`

候选 actions：

```text
find_shader
create
assign
get_properties
set_property
```

| Action | completionKind | sideEffectLevel | Safety / schema boundary | Verification |
|---|---|---|---|---|
| `find_shader` | `read_snapshot` | `read` | Query may return multiple candidates; no guessing. | Shader candidates returned. |
| `create` | `effect_verified` | `write` | Requires material asset path/name and explicit shader selection. | Material asset exists and properties readable. |
| `assign` | `effect_verified` | `write` | Requires object renderer target and slot. | Renderer slot readback matches material. |
| `get_properties` | `read_snapshot` | `read` | Requires material target. | Material properties returned. |
| `set_property` | `effect_verified` | `write` | Requires typed property path/value. | Material property readback matches. |

Mapping 意图：

- 候选 v2 source domains：如存在 component/object/material-adjacent operations，则作为参考。
- Unity-Skills source domain: `unity-material.md`.
- Phase 7 must define minimum material value model and shader selection policy.

### `unity_validation` for creation slice

候选 action：

```text
check_scene
```

| Action | completionKind | sideEffectLevel | Safety / schema boundary | Verification |
|---|---|---|---|---|
| `check_scene` | `report_collected` | `read` | Validates current or specified scene against defined checks. | Returns validation summary and optional `validation_report` Resource. |

Mapping 意图：

- 候选 v2 source domain：可参考 `validation.ui.check` 等 validation operations。
- Unity-Skills source domain: `unity-validation.md`.
- Phase 7 may use this as supplemental verification for creation slice; Phase 8 owns validation expansion.

## Phase 8 extension taxonomy and safety notes

Phase 8 taxonomy actions use:

```text
specStatus: draft
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 8
```

参考输入领域：

```text
references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/operations.ts
references/Unity-Skills/skills/unity-asset.md
references/Unity-Skills/skills/unity-prefab.md
references/Unity-Skills/skills/unity-ui.md
references/Unity-Skills/skills/unity-animator.md
references/Unity-Skills/skills/unity-validation.md
```

### `unity_asset`

候选 actions：

```text
find
get_info
refresh
import
create_folder
move
rename
delete
```

安全说明：

- `move`、`rename`、`delete` require strict `asset_path`, confirmation binding, and collision/overwrite policy.
- `create_folder` and `import` require path safety and persistence verification.
- `find` / `get_info` remain tool results, not Resources.
- Batch selectors and arbitrary project-wide cleanup are not defined in Phase 3.

### `unity_prefab`

候选 actions：

```text
get_info
instantiate
save_from_object
apply_overrides
revert_overrides
unpack
```

安全说明：

- Prefab asset, scene instance, prefab stage, and nested prefab contexts must not be conflated.
- `apply_overrides`, `revert_overrides`, and `unpack` are destructive-like and require confirmation or dryRun.
- Phase 8 must define target strictness and overwrite policy before implementation.

### `unity_ui`

候选 actions：

```text
query
snapshot
create_element
set_text
set_layout
set_style
simulate_interaction
wait_for_condition
```

安全说明：

- UI query language is not defined in Phase 3.
- UGUI, UI Toolkit, Editor UI, and runtime UI boundaries require Phase 8 decision.
- Screenshot artifact may provide visual evidence, but screenshot success does not mean UI correctness.

### `unity_animation`

候选 actions：

```text
create_controller
get_controller
add_parameter
set_parameter
play_state
create_clip
```

安全说明：

- Animator controller, clip asset, runtime state, and preview state must be separated.
- `play_state` must not report animation acceptance without state/readback evidence.
- Phase 8 must define controller/clip target model before implementation.

### `unity_validation` expansion

候选 actions：

```text
check_scene
check_assets
find_missing_scripts
find_missing_references
cleanup_empty_folders
```

安全说明：

- `cleanup_empty_folders` is destructive-like and requires confirmation or dryRun.
- Validation reports may return `validation_report` Resource references.
- Validation must not become an arbitrary cleanup engine.

## `unity_project_command` candidate boundary

Phase 3 only registers the candidate shell:

```text
unity_project_command.list
unity_project_command.invoke
unity_project_command.get_status
unity_project_command.get_result
```

所有条目使用：

```text
specStatus: draft
referenceStatus: candidate
owningPhase: Phase 3
implementationOwner: Phase 6
```

### Minimum constraints

- Standard public tools take precedence. If a standard public tool can express the task, `unity_project_command.invoke` must not bypass it.
- `invoke` requires complete command metadata, safety metadata, input schema and `verificationHint`.
- Metadata absence or ambiguity blocks invocation; Claude must not guess parameters.
- Destructive command requires confirmation or dryRun.
- `invoke` result must follow `verificationHint`; missing or failed verification returns `failed` or `uncertain`.
- Detailed schema, registry metadata, invoke flow, job/report behavior and recipe landing strategy belong to Phase 6.

### 候选 action 壳

| Action | completionKind | sideEffectLevel | Boundary |
|---|---|---|---|
| `list` | `read_snapshot` | `read` | Lists registered project commands and metadata completeness. |
| `invoke` | depends on command metadata | depends on command metadata | Requires command metadata, safety metadata, input schema, confirmation/dryRun when required, and verificationHint. |
| `get_status` | `read_snapshot` | `read` | Reads command job status if command execution is job-backed. |
| `get_result` | `report_collected` | `read` | Reads command result/report if available. |

参考输入来源：

```text
references/unity-mcp-v2/Assets/UnityMcpV2/Editor/UnityMcpEditorCommandRegistry.cs
```

## Public description template

Each action description should fit the MCP resident context budget and include only:

```text
purpose
wait behavior
success meaning
side effect level
primary return
critical non-meaning
```

Description 不应包含：

```text
multi-step recipe
long troubleshooting
large JSON examples
complete failure taxonomy
project-specific instructions
```

示例：

```text
unity_compile.compile_and_check:
Requests Unity C# compilation, waits for the compile lifecycle to finish, and verifies success from attributed compiler messages. Returns compile status, compiler diagnostics summary and supplemental console diagnostics. Does not mean tests passed.
```

## Phase handoff

### Phase 4 handoff

Phase 4 owns:

- completion lifecycle details;
- job protocol and job result schema;
- diagnostics shape;
- artifact lifecycle;
- Resource payload schema;
- console cursor structure;
- compiler diagnostics attribution;
- host registry/binding format details;
- timeout/rebind semantics for workflows.

Phase 4 must not change Phase 3 action user-visible `successMeans` / `doesNotMean` semantics without a roadmap change.

### Phase 5 handoff

Phase 5 接收 P0 `stable_ready` catalog，但这不自动表示同一个 Phase 5 plan 必须一次性实现全部 schema-ready surface。

#### Phase 5 required P0 executable subset

以下 actions 是 roadmap Phase 5 明确列出的 P0 executable subset。Phase 5 spec/plan 必须覆盖这些 actions；如果为控制首个 executable stable subset 而暂缓其中某项，必须说明如何仍满足 roadmap success criteria。

```text
unity_editor.get_status
unity_editor.wait_ready
unity_compile.get_state
unity_compile.request
unity_compile.wait_for_idle
unity_compile.compile_and_check
unity_console.snapshot
unity_console.count
unity_console.clear
unity_test.list
unity_test.start
unity_test.get_status
unity_test.get_result
unity_test.run_and_collect
unity_test.run_and_verify
unity_playmode.get_state
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify
unity_screenshot.capture_game_view
```

#### Stable-ready helper actions

以下 helper actions 保持 `specStatus: stable_ready`，但不自动构成 Phase 5 必做范围。Phase 5 spec/plan 只有在需要支撑 verified workflow、host binding readback 或内部编排边界时才选择实现。

```text
unity_editor.get_current_host
unity_playmode.enter
unity_playmode.exit
unity_playmode.wait_for_state
```

#### Schema-ready backlog rule

P0 `stable_ready` catalog 是 schema-ready / design-ready surface。Phase 5 spec/plan 可以按 roadmap success criteria 定义首个 executable stable subset；未进入该 subset 的 P0 `stable_ready` actions 保留为 schema-ready backlog，不得自动提升为 `referenceStatus: stable`。

已实现且完成验证的 actions，可在 roadmap completion sync 中从 `referenceStatus: candidate` 提升为 `referenceStatus: stable`。

### Phase 6 handoff

Phase 6 receives `unity_project_command` candidate shell and safety boundary. Phase 6 owns detailed command registry metadata, invoke schema, job/report behavior, `verificationHint` execution and recipe landing strategy.

### Phase 7 handoff

Phase 7 receives detailed candidate actions for scene/object/component/material creation slice, shared target model, expected verification readback and safety notes. Phase 7 owns typed value model, full schema, implementation and creation recipe landing strategy.

### Phase 8 handoff

Phase 8 receives extension taxonomy and safety notes for asset, prefab, UI, animation and validation expansion. Each selected extension domain must define independent scope, schema, target model, implementation plan and verification strategy.

### Phase 9 handoff

Phase 9 audit should verify:

- skill recipe `tool` / `action` references exist in catalog;
- executable recipe steps reference only `referenceStatus: stable` actions;
- handoff / `requiredCapabilities` candidate references use stable structure;
- `paramsExample` conforms to public schema for stable actions;
- action safety metadata matches skill safety text;
- action `completionKind`, `successMeans` and `doesNotMean` do not conflict with docs or skill recipe text;
- Resource references use approved artifact/report types;
- public tool/action docs align with catalog descriptions.

## Success criteria coverage

说明：下表中的“每个 public action 有 safety metadata。”保留 roadmap 原文不变，但其在 Phase 3 的达成口径需要按 scope depth 解读。P0 `stable_ready` actions 具备完整 safety metadata 字段：`sideEffectLevel`、`confirmationPolicy`、`dryRunMode`。Phase 7 candidate actions、Phase 8 taxonomy actions，以及 `unity_project_command` 的 candidate shell 条目在本阶段只承载 safety notes 或部分候选 metadata；这些条目的完整 safety metadata 分别属于 Phase 7、Phase 8、Phase 6 的收敛范围。与 diagnostics、artifact lifecycle 相关的细化边界仍由 Phase 4 持有。

| Roadmap Phase 3 success criteria | Spec coverage |
|---|---|
| 高频 tools 的 action 语义清晰。 | P0 stable-ready action tables define actions, `completionKind`, `successMeans`, `doesNotMean` and verification. |
| 截图、编译、测试、PlayMode 异步/验证语义不再模糊。 | `unity_compile`, `unity_test`, `unity_playmode`, `unity_screenshot` distinguish request, state settled, report collected, result verified and artifact verified. |
| 每个 public action 有 safety metadata。 | Safety metadata contract is mandatory; P0 tables include sideEffect/confirmation/dryRun. |
| 每个写 action 有验证路径。 | Result envelope and action tables require verification signals/readback. |
| Public schema 与 internal schema 的边界明确。 | Shared parameter model and mapping records separate public discriminated unions from internal operations. |
| Resources 首版范围与 artifact model 对齐。 | Resource reference boundary limits Resources to screenshot/test/console/validation references and leaves lifecycle to Phase 4. |
| Public tool/action catalog 可供 actual skill 和 Phase 9 audit 判断 stable/candidate 引用。 | Catalog contract defines `specStatus`, `referenceStatus`, ownership and audit fields. |
| Action metadata 可供 skill/schema consistency audit 使用。 | Catalog fields include safety, completion, verification, result signals, target model and descriptions. |

## 规格自检基线

- 本规格没有实现代码、actual skill 文件或审计脚本。
- P0 action 可以是 `specStatus: stable_ready`，但仍是 `referenceStatus: candidate`。
- `unity_project_command` 没有被设计成万能 escape hatch。
- Resource payload schema、diagnostics shape、job result schema、artifact lifecycle、console cursor 和 compiler attribution 细节明确交给 Phase 4。
- Phase 7/8 candidate actions 没有被承诺为已实现能力。
