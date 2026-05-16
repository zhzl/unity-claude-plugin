# Unity Agent Kit Phase 1 架构与边界蓝图设计

## 背景

Unity Agent Kit 是一个新的 Unity Editor Agent 操作体系，不是 `unity-mcp-v2` 的兼容层，也不是单纯 MCP server。它以 `unity-mcp-v2` 和 `Unity-Skills` 为参考输入，设计新的 Claude-facing public tools、internal operations、Unity host runtime、skills、project command registry、artifact/report resources 和验证闭环。

Phase 1 的职责是产出硬边界蓝图：确定系统身份、分层、职责边界、参考实现采纳规则、安全与完成语义原则，以及后续 phase 必须继承的约束。Phase 1 不展开完整 tool schema 或实现计划。

## 目标

- 明确 Unity Agent Kit 的新插件身份和命名边界。
- 明确四层主干和横切能力。
- 明确 `Contract Kernel` 是 public/internal 之间的机器真相来源。
- 明确 public tools、internal operations、Unity Host Runtime、skills、resources 和 project commands 的职责边界。
- 明确 `unity-mcp-v2` 只作为 reference input 和 candidate implementation source。
- 明确默认持久化、dryRun、safety、target、artifact、result、error、`uncertain` 等硬边界。
- 明确多 host discovery 与 single active binding 的 project scope。
- 明确 Phase 2-9 的交接输入和不得违反的边界。

## 非目标

- 不设计完整 public tool/action catalog。
- 不定义完整 input/output schema。
- 不定义完整 host registry 文件格式。
- 不定义完整 artifact URI 生成算法。
- 不设计完整 C# class structure。
- 不设计完整 TS implementation plan。
- 不编写完整 skill 内容。
- 不设计完整外部项目安装/更新机制。
- 不提供 `unity-mcp-v2` public tool compatibility layer。
- 不实现代码。

## Identity / Naming Table

| 项 | 决策 |
|---|---|
| Product name | `Unity Agent Kit` |
| Plugin directory | `plugins/unity-agent-kit/` |
| Unity runtime directory | `unity/Assets/UnityAgentKit/` |
| MCP server name | `unity-agent-kit` |
| Public tool prefix | `unity_` |
| Unity C# namespace | `UnityAgentKit` |
| Artifact / registry root | 使用新插件 identity，例如 `.ai-debug/unity-agent-kit/`；精确格式由 Phase 4/5 细化 |
| Skills directory | `plugins/unity-agent-kit/skills/` |
| Reference-only v2 name | `unity-mcp-v2` |

禁止：

- 不使用 `ClaudePlugins` 作为 runtime 目录名。
- 不复用 `UnityMcpV2` namespace。
- 不复用 `.ai-debug/unity-mcp-v2/`。
- 不注册 `compile.request`、`tests.run_and_collect`、`screenshot.capture` 等 v2 旧名称作为新插件 public tools。

## 新插件与参考输入边界

Unity Agent Kit 是 `plugins/` 下的新插件：

```text
plugins/unity-agent-kit/
unity/Assets/UnityAgentKit/
```

参考输入只读：

```text
references/unity-mcp-v2
references/Unity-Skills
```

规则：

- 不直接修改 reference input 来实现新插件。
- v2 旧 tools / operations / workflows 只作为源码审查、候选实现和领域参考。
- 任何 v2 名称、实现或 workflow 被采用，原因只能是语义匹配、源码验证通过且符合新 `Contract Kernel`，不能是 legacy compatibility。
- 如果参考项目存在 bug，在 `plugins/unity-agent-kit/` 或 `unity/Assets/UnityAgentKit/` 中修正、移植或重新实现，不修改 reference input。

## Root / Project Scope

必须区分三类 root：

```text
developmentRepoRoot:
  Unity Agent Kit 源码仓库根，例如 D:/ai/unity-claude-plugin

pluginRoot:
  plugins/unity-agent-kit/

unityProjectRoot:
  实际被控制的 Unity project root，必须包含 Assets/ Packages/ ProjectSettings/
```

本仓库开发模式：

```text
unityProjectRoot = unity/
Unity runtime = unity/Assets/UnityAgentKit/
Registry/artifacts = unity/.ai-debug/unity-agent-kit/
```

外部消费项目模式：

```text
unityProjectRoot = <consumer-project>/
Unity runtime = <consumer-project>/Assets/UnityAgentKit/
Registry/artifacts = <consumer-project>/.ai-debug/unity-agent-kit/
```

Unity project root discovery 优先级：

1. 显式配置的 `unityProjectRoot`。
2. 已绑定 host 的 `projectRoot`。
3. 从 Unity runtime path 向上查找最近的 Unity project root。
4. 从 MCP server cwd 向上查找唯一 Unity project root。
5. 如果不唯一或找不到，要求 `select_host` 或显式配置，不猜测。

自动绑定只在 `host.projectRoot == resolved unityProjectRoot` 时发生。

## 目录职责边界

### `plugins/unity-agent-kit/`

负责：

- MCP server；
- `Contract Kernel`；
- public tool registration；
- TS orchestration / workflow；
- resources reader；
- Unity Agent Kit 使用侧 skills；
- TS / contract / skill audit tests；
- docs/tool reference generation scripts，如需要。

### `unity/Assets/UnityAgentKit/`

负责：

- Unity Editor host entry；
- loopback transport；
- operation router；
- internal operation handlers；
- domain services；
- state providers；
- job/report writers；
- artifact file generation / producer-local structural validation；
- Unity EditMode tests。

不维护两份 Unity C# host runtime。`unity/Assets/UnityAgentKit/` 是 Unity runtime source of truth。

## 总体架构

主结构采用四层：

```text
Skills 调用指导层
→ Public MCP tools
→ Internal operations
→ Unity Host Runtime
```

横切能力：

```text
Contract Kernel
Artifact / report Resources
Project Editor Command Registry
Verification Loop
```

### Contract Kernel 位置

`Contract Kernel` 不作为第五个用户可见层，而是 Public MCP tools 与 Internal operations 之间的横切协议真相来源。

Phase 1 只定义 `Contract Kernel` 的 invariants 和 named contract surfaces，不定义完整字段 schema、代码生成机制或完整 metadata schema。具体 schema 和生成/校验机制由 Phase 3/4/5 按能力切片细化。

`Contract Kernel` 负责约束或派生：

- public tool/action metadata；
- public input schema；
- internal operation catalog；
- public action 到 internal operation / workflow 的 mapping；
- envelope；
- error category；
- safety metadata；
- completion semantics metadata；
- artifact/resource 引用格式；
- skill/schema consistency audit 的机器真相。

禁止 MCP registration、TS workflow、Unity C# model、docs、skills 各自成为独立 schema 真相来源。

## Contract Kernel 与 C# host 的关系

`Contract Kernel` 分为 public metadata 和 internal operation contract。

### Public metadata

用于 Claude-facing public surface：

```text
tool/action semantics
short descriptions
safety metadata
completion metadata
public schema
skill/schema audit
docs generation/validation
```

Unity C# 不读取 public metadata。

### Internal operation contract

用于 TS ↔ Unity host 对齐：

```text
internal operation ID
request envelope
response envelope
error category
target identity fields
jobId / reportId references
changed / persisted / validationStatus fields where relevant
artifact/report reference fields
safety-relevant request fields where host-side minimum checks are required
```

Unity C# host 必须实现并被测试约束到 internal operation contract subset。

Phase 1 不决定具体机制，Phase 3/4/5 可选择：

- shared JSON schema；
- generated C# stubs；
- golden request/response fixtures；
- contract tests 调 C# router；
- 手写 C# model + contract tests。

## Public / Internal / Host 边界

### Public MCP tools

Public MCP tools 面向 Claude tool selection。

命名：

```text
unity_compile
unity_test
unity_screenshot
unity_scene
unity_object
unity_component
```

特点：

- 使用 `unity_` 前缀；
- tool 内 action 使用 `snake_case`；
- description 极短；
- schema 明确；
- safety / completion semantics 进入 metadata；
- 不暴露 v2 旧 operation names。

### Internal operations

Internal operations 面向 TS orchestration、host routing、测试和 Unity C# operation router。

可以采用新的 `domain.operation` 命名风格，例如：

```text
compile.request
compile.state.get
screenshot.capture
```

这不是 v2 兼容承诺。每个 internal operation 名称必须由新 `Contract Kernel` 接受。

### Unity Host Runtime

Unity host `/operations` 只承载 internal operations，不直接解释 public tools。

示例：

```text
MCP public:
  tool: unity_compile
  action: compile_and_check

TS orchestration:
  internal operations:
    compile.request
    compile.state.get
    compile.diagnostics.get

Unity host:
  receives internal operations only
```

Unity C# 不读取 Claude-facing public metadata，也不承担 public action 聚合、长 workflow 编排或最终 business success 判定。

## Transport Security 与 Host 最低校验

首版 transport security 是 local-only loopback boundary：

```text
Unity host 只监听 127.0.0.1。
首版不支持 remote host。
首版不要求 capability token / session secret。
```

首版不试图防御同一用户机器上的恶意本地进程直接访问 loopback endpoint。remote host 或更强 auth 需要 `change-roadmap` 或独立 spec。

为了防误用和跨层漂移，Unity host 仍必须执行 internal operation contract 的最低校验：

- 拒绝 unknown operation；
- 拒绝 malformed input；
- 拒绝 arbitrary invoke / eval / free method call；
- write / destructive / high-risk internal operation 必须携带对应 contract 要求的 target、confirmation / dryRun 或 safety 字段；
- host result 必须如实表达 `changed`、`persisted`、`validationStatus`、diagnostics；
- Unity host 不做 public aggregation，也不承诺 final business success；
- TS public layer 仍负责完整 safety gating、workflow orchestration 和最终验证。

## v2 候选实现采纳规则

v2 是 candidate baseline，不是自动继承项。

每个 v2 候选实现采纳前必须记录：

```text
candidate
sourceFiles
observedBehavior
requiredSemantics
evidence
gaps
decision
followUpPhase
```

采纳分类：

```text
reuse_as_is
reuse_with_adapter
extend
replace
reject_for_now
```

含义：

- `reuse_as_is`：核心机制可采纳，但仍需迁移到新插件 identity。
- `reuse_with_adapter`：核心实现可用，但 result、artifact、schema、metadata 需适配。
- `extend`：保留部分实现，补新语义。
- `replace`：不采用该实现路径。
- `reject_for_now`：证据不足或风险太高，暂缓。

禁止：

- 不因为 v2 已存在就默认正确。
- 不因为新架构就无理由重写已验证机制。
- 不机械复制整个 v2 插件再改名。

## Public Tool / Action 准入标准

能力进入 public MCP tool/action 必须满足：

- 高频或对 Agent 任务闭环关键；
- schema 可明确表达；
- safety metadata 可定义；
- completion semantics 可验证；
- 有 internal operation / workflow mapping；
- 有测试或验证策略；
- 不只是项目特定能力；
- 不只是 Unity API 的薄包装。

不满足时归入：

- internal operation；
- project command；
- skill recipe；
- Phase 8 extension pool；
- rejected / deferred。

## Public Description / Metadata / Skills 分工

原则：

```text
Public tools must be compact but not semantically empty.
```

### Public description

MCP 常驻上下文中只放最小信息：

- 用于什么；
- 是否等待；
- 返回时代表什么；
- 是否有副作用；
- 关键不要误解的一句话。

不放：

- 多步骤 recipe；
- troubleshooting；
- 长示例；
- 完整失败条件列表；
- 完整 schema 解释；
- 项目特定说明；
- 长安全说明。

### Contract Kernel metadata

完整语义进 metadata，但不完整塞进 MCP 常驻上下文。

metadata 首版消费者：

- MCP tool registration；
- TS public tool handlers / orchestration guards；
- contract / consistency tests；
- skill/schema audit；
- docs/tool reference generation or validation。

没有明确消费者的 metadata 字段不进入首版。

### Skills

Skills 承载：

- 多步骤 recipe；
- intent routing；
- risk handling；
- verification loop；
- fallback to project command；
- 复杂任务调用顺序。

Skills 是默认指导层，但不是 safety 唯一来源。

## Skill 目录与引用格式

Unity Agent Kit 使用侧 skills 放在：

```text
plugins/unity-agent-kit/skills/
```

示例：

```text
/unity
/unity-prototype
/unity-test
/unity-diagnose
/unity-project-command
```

Superpowers 开发流程 skills 仍在：

```text
plugins/superpowers/skills/
```

Skill recipe 面向 Claude 调用时只能引用 public tool/action：

```text
tool: unity_compile
action: compile_and_check
```

不能直接引用 internal operation 作为调用步骤：

```text
tool: compile.run_and_wait
```

如果提到 internal operation，必须标注：

```text
internalOperation: compile.request
```

## Project Command Registry 边界

Project Command Registry 是项目扩展层，不是标准能力逃生口。

规则：

- 标准 public tools 能表达的任务，优先标准 public tools。
- 不得绕过 safety、target strictness、confirmation 或 verification。
- metadata 不足时不得调用。
- destructive command 必须 confirmation / dryRun。
- invoke 后必须按 `verificationHint` 验证。
- skill fallback 必须说明原因。

Project command recipe 格式：

```text
tool: unity_project_command
action: invoke
command: <command-name>
fallbackReason: <why standard public tools cannot express this task>
verificationHint: <how to verify result>
```

## Completion Semantics

`action/workflow` 是实现组织方式，不能推出用户语义。

每个 public action 必须声明：

```text
completionCategory
waitsFor
successMeans
doesNotMean
verificationPath
```

示例：

```text
unity_compile.wait_for_idle
completionCategory: state_settled
successMeans: Unity 不再 compiling/updating
doesNotMean: 编译无错误
```

```text
unity_compile.compile_and_check
completionCategory: state_settled + verified
successMeans: 本轮 compiler messages 无错误
doesNotMean: 测试通过
```

```text
unity_screenshot.capture_game_view
completionCategory: artifact_complete + verified
successMeans: PNG artifact 存在、非空、尺寸有效
doesNotMean: 画面符合用户审美
```

## `uncertain` 语义

`uncertain` 是一等结果语义。

规则：

```text
如果 action 无法证明 successMeans 已满足，
必须返回 failure 或 uncertain，
不得返回 verified success。
```

适用场景：

- diagnostics 无法归属；
- host lifecycle 使结果不可信；
- artifact/report 存在但校验不完整；
- verification path 无法完成；
- project command 缺少或无法执行 `verificationHint`。

## Public Result 最小共同语义

Phase 1 不定完整 result schema，但要求所有 public result 能表达：

```text
status: success | failed | uncertain
tool
action
summary
changed?
persisted?
dryRun?
validationStatus?
artifacts?
diagnostics
nextStep?
```

规则：

- write success 必须表达 `changed=true`、`persisted=true` 和验证结果。
- dryRun success 必须表达 `changed=false`、`persisted=false`。
- artifact-producing action 必须返回 artifact reference。
- partial effect 必须显式表达。
- `uncertain` 必须包含 diagnostics 和 `nextStep`。

## 错误分类最小集合

Phase 1 定义错误分类，不定完整 error code 表。

最小分类：

```text
input_invalid
target_ambiguous
target_not_found
confirmation_required
safety_blocked
editor_not_ready
host_unavailable
host_restarted
operation_timeout
execution_failed
verification_failed
artifact_invalid
persistence_failed
unsupported
uncertain
```

v2 error codes 可参考，但不是兼容承诺。

## Safety Gating

任何 public action 缺少以下字段，不得进入 public surface：

```text
sideEffectLevel
confirmationPolicy
dryRunMode
```

`write` / `destructive` action 还必须有 `verificationPath`。

规则：

- `write` action 必须有 verification path。
- `destructive` action 的 `confirmationPolicy` 不得为 `never`。
- destructive / overwrite / move / rename / batch action 需要 confirmation 或 dryRun。
- Project command metadata 不足时不得自动调用。

## Destructive Confirmation Binding

裸 `confirm: true` 不足以作为 destructive confirmation。

confirmation 必须绑定：

- target summary；
- operation summary；
- destructive impact。

如果目标解析或影响变化，必须重新确认。

## Target Strictness

规则：

```text
write/destructive action 不允许模糊 target。
```

- read/search action 可以返回多个候选。
- write action 必须唯一 target，否则返回 `ambiguous` / `uncertain`。
- destructive action 必须 strict target + confirmation binding。
- skill recipe 不能在 ambiguous target 上继续写操作。

Phase 3 定统一 target model。Phase 7 实现 `scene_object` / `prefab_asset`。Phase 8 扩展复杂 target contexts。

## 默认持久化与保存范围

默认写语义：

```text
Default write semantics are persistent unless the action explicitly declares dryRun behavior.
```

首版不支持 non-persisting edit / preview edit。

更精确地说：

```text
write success =
  affected target changed
  + directly affected persistence unit saved
  + verification passed
```

`persistence unit` 示例：

```text
scene_object      → 目标所在 scene
prefab_asset      → 指定 prefab asset
material_asset    → 指定 material asset
project_settings  → 指定 settings asset/file
generated_asset   → 新创建的 asset
```

规则：

- 普通 write：执行 + 保存直接受影响的 persistence unit + 验证。
- write success 表示 `changed=true`、`persisted=true`。
- 不允许无声明地保存无关 dirty state。
- 如果 Unity API 只能执行更大范围保存，result 必须披露 `saveScope`、`savedItems` 和 diagnostics。
- 如果无法判断是否保存了无关内容，不能干净返回 verified success；应返回 `uncertain` 或带明确 diagnostics。
- 多目标 / batch action 必须列出保存范围。
- Unity Agent Kit 不负责 VCS dirty state 管理；不想要的改动由用户通过版本控制还原。

### 保存失败

如果 action 承诺持久化，但保存失败，必须返回 failed 或 `uncertain`，并表达：

```text
changed
persisted=false
validationStatus
diagnostics
nextStep
rollbackStatus?
```

## dryRun 边界

```text
dryRun success only means impact analysis succeeded.
It does not mean the write/destructive operation was performed.
```

规则：

- dryRun 不修改项目状态。
- dryRun result 必须 `changed=false`、`persisted=false`。
- skill 不能把 dryRun 当成执行成功。
- 真实执行后必须重新验证。

## Undo 边界

Undo 是编辑体验增强，不是首版 safety 的唯一依赖。

规则：

- 首版不要求所有 write action 支持 Undo。
- 不能用 Undo 替代 confirmation / dryRun。
- 不能因为支持 Undo 就跳过 verification。
- 默认回滚机制是版本控制。
- 如果 action 支持 Undo，必须声明 undo behavior。

## Scene / Prefab Target Model

Phase 7 首版编辑目标只要求：

```text
scene_object
prefab_asset
```

规则：

```text
target.kind = scene_object:
  成功表示目标所在 scene 已修改、已保存、已验证。
  不表示 prefab asset 被修改。

target.kind = prefab_asset:
  成功表示 prefab asset 已修改、已保存、已验证。
  不表示当前 scene instance 被修改。
```

复杂项进入 Phase 8 extension pool：

- prefab instance overrides；
- nested prefab；
- prefab stage；
- additive scenes；
- advanced prefab apply / revert / unpack；
- complex asset workflows。

## Component Property Edit

首版支持结构化属性修改，不支持 arbitrary invoke。

规则：

```text
unity_component.set_property 是标准能力候选。
```

要求：

- strict target；
- component type 解析明确；
- property path 可验证；
- typed value model；
- read back 验证；
- 默认持久化保存。

Typed value model：

- 禁止自由 `value: any`。
- value 必须带 type tag。
- object / asset reference 必须 strict resolve。
- enum 必须验证可选值。
- unsupported type 返回 `unsupported`。
- arrays / lists / nested custom types 放 Phase 8 extension pool。

## Arbitrary Invoke 边界

首版 public surface 不提供：

```text
execute_csharp
eval
任意 invoke_method
任意 run_menu_item
自由 methodName + argsJson
```

方法调用支持路径：

1. 通用高频能力 → 标准 public action。
2. 项目特定能力 → Project Command Registry。
3. 受限 invoke → Phase 8 extension candidate，单独 spec/plan。

## Artifact / Resources 边界

首版 MCP Resources 只是 tool-generated artifacts/reports 的最小读取入口，不是完整 artifact store。

首版包含：

- screenshots；
- test reports；
- console snapshots；
- validation reports。

不做：

- retention policy；
- cleanup subsystem；
- full artifact index；
- cross-project artifact browser；
- thumbnail/cache system；
- editor status / scene hierarchy / asset search resource 化。

### Artifact ownership

Unity C# host：

- 生成文件/报告；
- 做 producer-local structural checks。

TS/MCP layer：

- 收敛统一 artifact model；
- 分配 artifactId / reportId；
- 生成 Resource URI；
- 做 final contract-level normalization；
- 判定最终 `validationStatus`；
- 给出最终 success / failure / `uncertain`。

Resource layer：

- 根据 artifact reference 读取；
- 不重新定义 artifact identity。

主引用：

```text
artifactId / Resource URI
```

本地 `path` 只是 optional diagnostics，不是 primary identity。

## Host Binding / 多项目边界

采用：

```text
multi-host discovery + single active binding
```

规则：

- 支持发现多个 Unity hosts。
- 任一时刻只有一个 active bound host。
- 普通 public tools 不携带 project 参数。
- 切换 project 必须显式 host selection。
- 不自动猜测目标 project。
- 不支持单个 workflow 跨 project。

最小能力：

```text
unity_editor.list_hosts
unity_editor.get_current_host
unity_editor.select_host
```

### 自动绑定

根据 resolved `unityProjectRoot` 自动绑定对应 Unity project：

- 显式配置优先。
- 如果唯一匹配 host，自动绑定，不需要用户确认。
- 多 host 但只有一个匹配当前 `unityProjectRoot`，也自动绑定。
- 多个匹配同一 project identity 时，按 ready / epoch / lastSeenAt 选择；仍不唯一则报错。
- 不匹配当前 `unityProjectRoot` 的其他 Unity Editor 不会被自动选中。

### 性能边界

普通 public tools 使用 cached active binding。完整 host discovery 只在 `list_hosts` / `select_host` / recovery path 执行。cached binding 需要 bounded freshness check，避免每个 tool call 做完整 discovery。

## Host Identity / Registry

Host identity 最小语义：

```text
hostId
projectRoot
projectName
unityVersion
pluginVersion
protocolVersion
instanceId
epoch
status
lastSeenAt
```

规则：

- active binding 绑定 project identity + host identity，不只依赖 port。
- rebind 必须回到同一 project identity。
- project identity 不能悄悄变化。
- registry record 必须包含最小 identity。
- registry / artifact root 使用新插件 identity。

Registry 具体路径和格式由 Phase 4/5 细化。

## Async / Job / Workflow

规则：

```text
Internal operation 可以是 immediate 或 job-backed；
Public action 的等待/验证由 TS orchestration 决定；
Unity C# job 只记录 Unity-side long-running operation status/report，不承担 public workflow。
```

- 短 Unity API 动作：immediate internal operation。
- Unity 内部天然异步任务：job-backed internal operation。
- 等待状态收敛：TS polling。
- public `*_and_verify`：TS 组合 internal operations 和 job/report。
- job 必须有 status/result 读取路径。
- C# host 不做长 busy wait 或复杂 public workflow。

## Editor State Preconditions / Concurrency

每个 public write / workflow action 由 Phase 3/4/5 声明：

- editor state preconditions；
- 是否可在 compiling / updating / playmode / transition / test-running 时执行；
- 是否允许并发；
- 遇到 busy state 是 fail、wait、request-only 还是 no-op；
- timeout owner 是 TS，不是 Unity C# host。

## 自动恢复边界

自动恢复只允许 safe、reversible、low-surprise 动作。

可自动：

- host rebind；
- retry transient probe；
- wait for compile/update idle；
- read status again；
- refresh diagnostic snapshot。

需要确认：

- restart Unity；
- destructive asset/object operations；
- switch/open scene；
- stop PlayMode 如果可能丢失用户运行态；
- clear Console 如果用户没有要求；
- cleanup / delete / overwrite。

## 测试证据分层

后续 phase 的 Verification Evidence 不能只写“测试通过”，必须说明覆盖哪些层。

测试层：

```text
Contract tests
TS unit tests
Unity EditMode tests
MCP integration tests
Unity E2E / smoke tests
Docs/skills consistency tests
```

每个 action 声明 applicable evidence layers。最低证据层按 action risk/category 决定。低风险 read action 不需要和 destructive write 同等测试矩阵。

## 机器可检查引用格式

任何机器可检查的引用，都应使用稳定格式。

示例：

```text
tool: unity_compile
action: compile_and_check
```

```text
internalOperation: compile.request
```

```text
resourceType: screenshot
```

```text
errorCategory: target_ambiguous
```

规则：

- prose 可以解释，但机器引用必须稳定。
- skills/docs/spec 中引用 tool/action 时必须使用可检查格式。
- Phase 9 audit 以 `Contract Kernel` 为真相。

## 反例 / 禁止示例

Phase 1 固定以下反例：

```text
compile.request completed ≠ compile success
wait_for_idle ≠ compile_and_check
tests.run_and_collect ≠ run_and_verify
unity_project_command.invoke 不应替代标准 unity_object.create
scene hierarchy / editor status 不应首版 resource 化
Unity C# host 不负责长轮询和最终业务成功判定
artifact 未验证时不得返回 verified success
dryRun success ≠ operation executed
```

## Phase 后续映射规则

Phase 1 不裸写“后续支持”。所有延后内容必须归入以下四类之一：

```text
Phase N will decide / implement
Phase 8 extension candidate
Out of scope for this roadmap
Requires change-roadmap
```

已确认落点：

| 内容 | 落点 |
|---|---|
| Unity Agent Skill 体系 | Phase 2 |
| public tool/action/schema/metadata | Phase 3 |
| target model 基础字段 | Phase 3 |
| `targetStrictness` / `overwritePolicy` 基础字段 | Phase 3 |
| async/job/artifact/Resource URI/console cursor/compiler diagnostics 细节 | Phase 4 |
| host registry/binding 语义和格式 | Phase 4 |
| 高频日常闭环实现 | Phase 5 |
| 本 repo 内 `unity/Assets/UnityAgentKit/` runtime 可运行 | Phase 5 |
| Project Command Registry 增强 | Phase 6 |
| `scene_object` / `prefab_asset` 简单创作闭环 | Phase 7 |
| 有限 typed value model | Phase 7 |
| prefab instance overrides / nested prefab / prefab stage / additive scenes | Phase 8 extension pool |
| arrays/lists/nested custom component values | Phase 8 extension pool |
| 受限 method invoke | Phase 8 extension pool |
| Undo 增强 | Phase 8 extension candidate |
| artifact store retention / cleanup / full index | Out of scope 或 Phase 8 extension candidate |
| remote Unity host | Out of scope；需要 `change-roadmap` |
| capability token / session secret | Deferred；安全需求变化时 proposal |
| per-call multi-project routing / cross-project workflow | Out of scope；需要 `change-roadmap` |
| docs/skills/schema consistency audit | Phase 9 |
| 外部项目安装/更新体验 | Phase 9 |

## Phase Handoff Table

| Phase | Consumes from Phase 1 | Must decide | Must not violate | Evidence expected |
|---|---|---|---|---|
| Phase 2 | skills 作为指导层、短 description、public-only recipe 引用 | skill 分类、recipe 格式、fallback 规则 | 不引用 v2 old public names；不把 internal op 当直接 tool | skill/schema 引用检查 |
| Phase 3 | public/internal/Contract Kernel 边界、metadata、result/error/target 原则 | public tool/action enum、schema、mapping | 不做 arbitrary invoke；不做 v2 public compatibility surface | contract/schema tests |
| Phase 4 | async/job/artifact/host binding/registry/result semantics | job protocol、artifact URI、console cursor、compiler diagnostics、registry format | 不让 C# host 承担 public workflow；不假成功 | TS + contract + host tests |
| Phase 5 | P0 vertical slice、single active binding、默认持久化 | 高频工具实现细节 | 不平均铺开工具面；不跳过 verified semantics | E2E smoke + MCP integration |
| Phase 6 | Project Command Registry 边界 | metadata、safety、verificationHint、invoke flow | 不把 registry 变万能后门 | registry metadata tests |
| Phase 7 | `scene_object` / `prefab_asset`、typed value、默认持久化 | object/component/material 创作 slice | 不塞复杂 prefab contexts；不模糊 target | Unity EditMode + E2E |
| Phase 8 | extension pool 规则 | 选择具体扩展域并单独 spec/plan | 不一次性全做；不绕过验证 | per-extension evidence |
| Phase 9 | consistency/audit/文档边界 | audit 范围、docs/tool reference、外部安装体验 | 不引入 legacy v2 compatibility | docs/skills/schema audit |

## 成功标准

Phase 1 完成后，应满足：

- Unity Agent Kit 新插件 identity 明确。
- `developmentRepoRoot`、`pluginRoot`、`unityProjectRoot` 区分明确。
- 四层主干和横切能力明确。
- `Contract Kernel` 作为机器真相来源明确，但没有过早定义完整 mega-schema。
- v2 只作为 reference input / candidate baseline。
- public/internal/host 边界明确。
- transport threat model 明确为 local-only loopback，不防御恶意本地进程。
- Unity host 最低 internal contract 校验明确。
- C# host 对齐 internal operation contract subset 的要求明确。
- persistence / dryRun / safety / target / artifact / result / error / `uncertain` 边界明确。
- single active host binding 与 cached active binding 边界明确。
- Phase 2-9 的交接输入明确。
- 没有未落地的延后范围表述。
