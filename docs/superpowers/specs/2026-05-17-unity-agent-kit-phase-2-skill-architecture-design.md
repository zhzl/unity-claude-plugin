# Unity Agent Kit Phase 2 Skill 体系设计

## 背景

Unity Agent Kit 使用 skills 作为 AI Agent 调用 Unity Editor 的指导层。Phase 1 已确认四层主干：

```text
Skills 调用指导层
→ Public MCP tools
→ Internal operations
→ Unity Host Runtime
```

Phase 2 的职责是设计 skill architecture、`/unity` 路由规则、P0 daily loop recipe contract、机器可检查 recipe block、安全与验证规则，以及 Phase 6/7/8 的 handoff contract。Phase 2 不创建实际 skill 文件，也不实现 MCP tool、Unity C# host 或 audit 脚本。

## 目标

- 定义 `/unity` 作为首版唯一实际 skill 入口。
- 定义 intent routing model，避免 Claude 直接面对过多 public tools。
- 定义 P0 daily loop 的 6 个基础 recipe contract 和 1 个组合 recipe contract。
- 定义 Markdown `yaml` fenced recipe block 格式，供 Phase 9 半自动审计。
- 定义 skill safety、confirmation、dryRun、verificationPath 和 onFailure 的合同边界。
- 定义 project command explicit / strict fallback 规则。
- 定义 Phase 6/7/8 的 handoff category，而不是预留后续 slash command 名称。

## 非目标

- 不照搬 `Unity-Skills` 原目录、skill 分类或文件队列 JSON。
- 不创建实际 skill 文件。
- 不实现 MCP tools、Unity C# host、tests 或 audit 脚本。
- 不定义完整 public tool/action schema。
- 不定义完整 result/error schema。
- 不定义 Console diagnostic cursor 数据结构。
- 不设计 Phase 6 的 project command 详细 recipe。
- 不设计 Phase 7 的 creation vertical slice 详细 recipe。
- 不设计 Phase 8 的 UI、prefab、asset、animation 或 validation expansion 详细 recipe。
- 不把 project command 当作标准 public tools 的替代入口。

## 继承约束

Phase 2 继承 Phase 1 和 roadmap 的硬约束：

- Skills 是调用指导层，负责 intent routing、tool recipe、risk handling、verification loop 和 fallback to project commands。
- Skill recipe 面向 Claude 时只能引用 public tool/action，不直接引用 internal operation 作为调用步骤。
- Public tool/action 使用 `unity_` 前缀和 `snake_case` action。
- Public tool/action 参数、metadata 和 result schema 的最终设计归 Phase 3/4。
- `paramsExample` 只是 recipe 最小示例，不是 Phase 3 public schema 真相来源。
- `compile_and_check` 的编译成功判定以 compiler messages 为主，Console diagnostics 只作补充。
- Skill 不是唯一安全来源；public tool metadata 和 handler 负责强制 safety gate。
- 写操作和 destructive 操作不能在 ambiguous target 上继续执行。
- dryRun success 不等于真实执行成功。
- 验证失败、验证缺失或 `uncertain` 不得报告为成功。

## 已确认设计决策

- Recipe block 采用 contract + audit fields，不锁完整 public schema。
- `/unity` 是 Phase 2 唯一实际入口。
- Phase 2 不预留后续 slash command 名称，只定义 handoff category。
- P0 daily loop 使用 6 个基础 recipe + 1 个组合 recipe。
- P0 recipe 可以引用候选 public tool/action；必须在对应 tool/action 引用节点标注 `referenceStatus: candidate` 与 `owningPhase: Phase 3`；recipe 顶层 `owningPhase` 表示该 recipe contract 自身归属的 phase。
- Project command fallback 采用 explicit entry + strict fallback。
- `verificationPath` 采用轻量结构化字段，不定义完整 assertion DSL。
- `onFailure` 是每个 recipe step 的轻量必填字段。
- `daily_health_check` 默认不包含 screenshot；screenshot 作为 optional enhancement。

## `/unity` 入口职责

`/unity` 是 Phase 2 规格中的唯一实际入口。它把用户自然语言 Unity 任务路由到 P0 recipe、project command explicit / strict fallback、Phase 6/7/8 handoff category，或返回澄清问题。

`/unity` 不直接暴露 internal operations，不作为万能执行器，也不实现 Phase 6/7/8 的详细 recipe。

### Routing 输入

`/unity` 从用户请求中判断：

```text
intent
target
risk
requested evidence / evidence needs
available standard public capability
whether project-specific command is explicitly requested
whether task belongs to Phase 6/7/8 scope
```

Phase 2 不定义完整 target schema，但要求 skill 在 write、destructive 和 project command fallback 前识别 target 是否明确。

Evidence needs 不是所有任务的统一必填输入。普通 P0 recipe 使用自身默认 `verificationPath`，不因用户未声明 evidence 而追问；只有 artifact、visual validation、acceptance evidence 或 destructive/fallback 风险场景需要补充 evidence。

### Routing 输出

`/unity` 的路由结果只允许以下类别：

```text
p0_recipe
project_command_explicit
project_command_strict_fallback
phase_6_project_command_handoff
phase_7_creation_handoff
phase_8_extension_domain_handoff
unsupported_or_needs_spec
ask_clarifying_question
```

### 分层决策模型

`/unity` routing 按三层判断，避免把路由、fallback 和安全追问混成一个大分支。

第 1 层：护栏筛查

```text
missing critical target/risk/evidence for categories that require them
ambiguous write/destructive target
unsupported or out-of-roadmap request
```

第 2 层：标准能力路由

```text
P0 recipe match
daily_health_check default/full/optional enhancement selection
Phase 6/7/8 handoff category if outside P0
```

第 3 层：Project command fallback 路由

```text
explicit project command
strict fallback only when standard public tools are none/insufficient and metadata complete
```

Project command fallback 不能早于 standard capability routing 评估。

### 路由优先级

1. 如果请求缺少当前 category 所需的关键 target、risk 或 evidence 信息，选择 `ask_clarifying_question`。
2. 如果请求超出 roadmap 或需要结构性调整，选择 `unsupported_or_needs_spec`。
3. 如果标准 P0 recipe 可覆盖，选择 `p0_recipe`。
4. 如果任务属于 Project Command Registry 详细 recipe 设计范围，选择 `phase_6_project_command_handoff`。
5. 如果任务属于 object/component/material creation vertical slice，选择 `phase_7_creation_handoff`。
6. 如果任务属于 UI、prefab、asset、animation 或 validation expansion，选择 `phase_8_extension_domain_handoff`。
7. 如果用户显式要求 project command，选择 `project_command_explicit`，但仍检查 metadata、安全和 `verificationHint`。
8. 如果标准 public tools 无法表达任务，且 project command metadata 完整，允许 `project_command_strict_fallback`。

### 禁止路由

`/unity` 不允许：

- 因为 project command 更方便就跳过标准 public tools。
- 直接引用 internal operations。
- 把 dryRun 当作真实执行成功。
- 在 ambiguous target 上继续 write/destructive 操作。
- 在验证失败或 `uncertain` 时报告成功。
- 调用 Phase 6/7/8 尚未设计的详细 recipe。

## Recipe block contract

Phase 2 定义 Markdown 中的 `yaml` fenced block，顶层字段固定为 `recipe:`。该 block 是后续 skill 文档和 Phase 9 audit 的稳定输入，但不是 Phase 3 public schema 的真相来源。

### 示例

```yaml
recipe:
  id: compile_check
  title: Compile check
  intent:
    - "Verify current Unity C# compilation result"
  appliesWhen:
    - "User asks whether the project compiles"
    - "Before running tests or PlayMode validation"
  referenceStatus: candidate
  owningPhase: Phase 2
  steps:
    - id: compile_and_check
      tool: unity_compile
      action: compile_and_check
      toolActionReference:
        referenceStatus: candidate
        owningPhase: Phase 3
      paramsExample:
        action: compile_and_check
      expects:
        completion: "Compilation lifecycle finished"
        successMeans: "Compiler messages for this compile cycle contain no errors"
        doesNotMean:
          - "Tests passed"
          - "Console contains no unrelated runtime errors"
      verificationPath:
        kind: tool_result
        source:
          tool: unity_compile
          action: compile_and_check
        successSignal:
          - "result reports compile success based on compiler messages"
        failureSignal:
          - "compiler errors present"
          - "result is uncertain"
      safety:
        sideEffectLevel: write
        confirmationPolicy: never
        dryRunMode: unsupported
      onFailure:
        behavior: collect_diagnostics
        report:
          - diagnostics
          - nextStep
  fallback:
    allowed: false
```

### 必填字段

```text
recipe.id
recipe.intent
recipe.appliesWhen
recipe.referenceStatus
recipe.owningPhase
recipe.steps
step.id
step.tool
step.action
step.toolActionReference.referenceStatus
step.toolActionReference.owningPhase
step.paramsExample
step.expects
step.verificationPath
step.safety
step.onFailure
recipe.fallback
```

### 可选字段

```text
recipe.title
recipe.composes
recipe.mode
recipe.optionalModes
recipe.optionalEnhancements
step.notes
```

### Recipe block 规则

- `tool` / `action` 只能引用 public tool/action 候选。
- 若 recipe 引用了候选 public tool/action，`referenceStatus: candidate` 与 `owningPhase: Phase 3` 必须标注在对应 tool/action 引用节点；recipe 顶层 `owningPhase` 表示该 recipe contract 自身归属的 phase。
- `paramsExample` 是最小示例，不代表完整 Phase 3 schema。
- `recipe.mode` 仅是组合 recipe contract 的静态标记，用于文档表达和审计。
- `/unity` 通过路由选择相应组合变体，不向 recipe 传递 `mode` 运行时参数。
- `recipe.optionalModes` 只声明可选组合变体清单，不构成用户可传入的 invocation 参数面。
- `recipe.mode` / `recipe.optionalModes` 不是 Phase 3 public tool schema，也不是 recipe invocation parameter 系统。
- `expects` 说明用户语义，不替代 tool description。
- `verificationPath` 只轻量结构化，不定义完整 result assertion DSL。
- `safety` 统一使用 `sideEffectLevel`、`confirmationPolicy`、`dryRunMode`。
- `onFailure` 每个 step 必填。
- `fallback` 必须明确允许或禁止；允许时必须声明条件。

## P0 daily loop recipe contracts

Phase 2 定义 6 个基础 recipe 和 1 个组合 recipe。这些 recipe 是 contract，不是实际 skill 文件，也不是 Phase 5 实现步骤。

### `editor_readiness`

意图：确认 Unity Editor host 可用、绑定正确、Editor 处于可操作状态。

候选引用：

```text
tool: unity_editor
action: get_status

tool: unity_editor
action: wait_ready
```

验证重点：

```text
Editor ready
active host matches resolved unityProjectRoot
not stuck in compiling/updating/transition state
```

### `compile_check`

意图：确认本轮 C# 编译 lifecycle 完成，并基于 compiler messages 判断成功/失败。

候选引用：

```text
tool: unity_compile
action: compile_and_check
```

验证重点：

```text
compiler messages are primary success source
console diagnostics are supplemental only
uncertain is valid if compile diagnostics cannot be attributed
```

### `console_diagnostics`

意图：获取或比较 Console 诊断，辅助定位非编译器错误。

候选引用：

```text
tool: unity_console
action: snapshot

tool: unity_console
action: count
```

设计边界：

```text
cursor-aware wording is allowed
cursor data structure belongs to Phase 4
console diagnostics do not replace compiler messages for compile success
```

### `test_verify`

意图：运行或读取 Unity tests，并区分 collected report 与 verified pass。

候选引用：

```text
tool: unity_test
action: list

tool: unity_test
action: run_and_verify
```

可提及但不作为 verified pass 的默认替代：

```text
tool: unity_test
action: start

tool: unity_test
action: get_status

tool: unity_test
action: get_result

tool: unity_test
action: run_and_collect
```

验证重点：

```text
run_and_collect != run_and_verify
test report collected does not mean tests passed
```

### `playmode_verify`

意图：确认 PlayMode 进入或退出后的稳定状态。

候选引用：

```text
tool: unity_playmode
action: get_state

tool: unity_playmode
action: enter_and_verify

tool: unity_playmode
action: exit_and_verify
```

验证重点：

```text
requested transition != stable state
console cursor may provide supplemental diagnostics
```

### `screenshot_artifact`

意图：生成可复读 screenshot artifact，并验证文件存在、非空、尺寸有效。

候选引用：

```text
tool: unity_screenshot
action: capture_game_view
```

验证重点：

```text
artifact exists
sizeBytes > 0
dimensions valid
resource URI returned
validationStatus is valid or diagnostics explain uncertain/failed
```

### `daily_health_check`

意图：用于日常开发健康检查，按 default mode 或 full mode 组合基础 recipe。

Default mode 默认组合：

```yaml
recipe:
  id: daily_health_check
  referenceStatus: candidate
  owningPhase: Phase 2
  mode: default
  composes:
    - editor_readiness
    - compile_check
    - console_diagnostics
  optionalModes:
    - full
  optionalEnhancements:
    - screenshot_artifact
```

Full mode 组合：

```yaml
recipe:
  id: daily_health_check
  referenceStatus: candidate
  owningPhase: Phase 2
  mode: full
  composes:
    - editor_readiness
    - compile_check
    - console_diagnostics
    - test_verify
    - playmode_verify
  optionalEnhancements:
    - screenshot_artifact
```

启用 full mode 的条件：

```text
user asks for full validation
before release/acceptance evidence
before risky write/destructive sequence
/unity routing determines tests/playmode are required
```

默认不包含 screenshot。启用 `screenshot_artifact` 的条件：

```text
user requests visual evidence
task involves visual/UI/game view validation
release/acceptance evidence asks for artifact
/unity routing determines screenshot evidence is required
```

`daily_health_check` 不重新定义各基础 recipe 的 tool/action 语义，只表达组合关系。

## Safety / confirmation / dryRun contract

Phase 2 不重新设计完整 safety metadata schema，但 recipe 必须统一引用三个字段：

```text
sideEffectLevel: read | write | destructive
confirmationPolicy: never | when_destructive | always
dryRunMode: unsupported | supported | required_first
```

Skill 侧职责：

- 识别模糊 target。
- 识别 write/destructive 风险。
- 在需要时请求用户确认。
- 在 destructive 或高风险操作中优先考虑 dryRun。
- 不把 dryRun 结果当作真实执行成功。
- 执行后必须走 `verificationPath`。

Public tool / handler 职责：

- 强制 safety gate。
- 拒绝 metadata 缺失或 confirmation 不足的调用。
- 返回真实 `success`、`failed` 或 `uncertain`。

## VerificationPath contract

`verificationPath` 采用轻量结构化格式：

```yaml
verificationPath:
  kind: tool_result | artifact | followup_read | console_cursor | test_report
  source:
    tool: unity_compile
    action: compile_and_check
  successSignal:
    - "compiler messages contain no errors"
  failureSignal:
    - "compiler errors present"
    - "result is uncertain"
```

规则：

- `kind` 是有限枚举。
- `source.tool` / `source.action` 可机器检查。
- `successSignal` / `failureSignal` 使用字符串描述。
- 不定义完整 assertion DSL。
- 不锁 Phase 3/4 result schema。

## onFailure contract

每个 step 必填轻量字段：

```yaml
onFailure:
  behavior: stop | collect_diagnostics | fallback | ask_user
  report:
    - diagnostics
    - nextStep
```

行为含义：

- `stop`：验证失败或风险不可继续时停止。
- `collect_diagnostics`：失败后读取或报告诊断，不继续假成功。
- `fallback`：只在 recipe 明确允许 fallback 时使用。
- `ask_user`：target、risk 或 evidence 需求不明确时询问用户。

失败、`uncertain`、验证缺失都不得报告成功。

## Project command fallback contract

Project command 是项目扩展层，不是标准能力逃生口。

允许两种入口：

```text
project_command_explicit
project_command_strict_fallback
```

严格 fallback 条件：

```text
standardToolCoverage: none | insufficient
fallbackReason: required
command metadata complete
inputSchema present
sideEffectLevel present
executionKind present
verificationHint present
destructive requires confirmation or dryRun
target not ambiguous
```

Recipe block 中允许 fallback 时必须表达：

```yaml
fallback:
  allowed: true
  allowedWhen:
    - "standard public tools cannot express the task"
    - "project command metadata is complete"
  requires:
    - fallbackReason
    - inputSchema
    - sideEffectLevel
    - executionKind
    - verificationHint
```

禁止：

- 因为 project command 方便就绕过标准 public tools。
- metadata 不完整时猜测调用。
- destructive command 缺少确认或 dryRun。
- invoke 后不按 `verificationHint` 验证。
- 将 project command 当作标准 public tools 的替代入口。

## Phase 6/7/8 handoff contract

Phase 2 不预留后续 slash command 名称，只定义 handoff category：

```text
phase_6_project_command_handoff
phase_7_creation_handoff
phase_8_extension_domain_handoff
```

Phase 6/7/8 各自决定是否创建独立 skill、是否扩展 `/unity`、slash command 名称是什么，以及 recipe 细节如何组织。

### Handoff block

当 `/unity` 识别出任务属于 Phase 6/7/8 范围，handoff 必须表达：

```yaml
handoff:
  category: phase_7_creation_handoff
  owningPhase: Phase 7
  handoffReason: "Task requires object/component/material creation recipe"
  requiredCapabilities:
    - tool: unity_object
      action: create
      referenceStatus: candidate
      owningPhase: Phase 3
    - tool: unity_component
      action: add
      referenceStatus: candidate
      owningPhase: Phase 3
    - tool: unity_material
      action: create
      referenceStatus: candidate
      owningPhase: Phase 3
    - tool: unity_material
      action: assign
      referenceStatus: candidate
      owningPhase: Phase 3
  expectedVerification:
    - object snapshot
    - component get
    - material property readback
```

规则：

- `requiredCapabilities` 使用结构化 `tool` / `action` 引用格式，并标注 candidate 状态。
- `requiredCapabilities` 可写候选能力，但不得承诺 Phase 2 已设计对应 schema。
- `expectedVerification` 表达验证需求，不定义 Phase 6/7/8 的完整 verification implementation。
- Phase 2 不写 Phase 6/7/8 的具体调用步骤。

## Phase 9 audit handoff

Phase 9 至少检查：

```text
skill Markdown 中存在 yaml fenced recipe block
顶层字段为 recipe:
recipe 必填字段存在
step.tool / step.action 存在且格式稳定
step.toolActionReference.referenceStatus 存在
step.paramsExample 存在
step.verificationPath.kind/source 存在
step.safety.sideEffectLevel / confirmationPolicy / dryRunMode 存在
step.onFailure.behavior / report 存在
recipe.fallback.allowed 明确
handoff.category 若存在，属于 Phase 2 定义的 handoff category 或后续 phase 已声明的 category
handoff.requiredCapabilities 若存在，使用结构化 tool/action 引用格式
```

Phase 9 不从 Phase 2 继承：

```text
完整 public schema
完整 result assertion DSL
Console cursor 数据结构
project command implementation
actual skill file creation requirement
```

## 成功标准

Phase 2 完成后，应满足：

- `/unity` routing 规则明确。
- P0 daily loop recipe contracts 覆盖 6 个基础 recipe + 1 个组合 recipe，并区分 `daily_health_check` default mode 与 full mode。
- Recipe block 可被 Phase 9 半自动审计。
- P0 tool/action 引用标注为 candidate，并把最终 catalog 决策留给 Phase 3。
- Skill safety 与 public tool handler safety gate 分工明确。
- `verificationPath` 可检查但不锁 Phase 3/4 result schema。
- `onFailure` 能防止 recipe 只描述成功路径。
- Project command fallback 不是万能后门。
- Phase 6/7/8 handoff category 和字段明确。
- 没有越界定义 Phase 3/4/5/6/7/8 的实现细节。
