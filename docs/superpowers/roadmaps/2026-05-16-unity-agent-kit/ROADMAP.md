# Unity Agent Kit Roadmap

## Metadata

- **Title:** Unity Agent Kit
- **Slug:** `unity-agent-kit`
- **Roadmap Path:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- **Status:** `active`
- **Created:** 2026-05-16
- **Last Sync:** 2026-05-27
- **Reference Inputs:**
  - `references/unity-mcp-v2`
  - `references/Unity-Skills`

## Goal

设计并逐步实现 **Unity Agent Kit**：一套面向 AI Agent 的 Unity Editor 操作体系，而不是单纯的 MCP server。

Unity Agent Kit 包含：

```text
Skills 调用指导层
+ Public MCP tools
+ Internal operations
+ Unity Editor host runtime
+ Project Editor Command Registry
+ Artifact / report resources
+ 验证闭环
```

核心目标：

- 以 `unity-mcp-v2` 的可靠运行时架构为基线继续演进。
- 吸收 `Unity-Skills` 的 Unity 操作领域经验，但不照搬其 skill 结构或 JSON 文件队列模型。
- 重新设计 Claude-facing public MCP tools，避免“一 Unity 操作一个 MCP tool”导致工具膨胀。
- 重新设计 public tool 参数、action、异步语义和验证规则，而不是直接照搬 v2 schema。
- 将 skills 设计成调用指导层，负责意图路由、调用顺序、安全规则和验证闭环。
- 保留并强化 v2 的项目级 Editor Command Registry，用于承载项目自定义 Unity 编辑器自动化。
- 明确 TS 与 Unity C# 的职责边界：TS 负责编排、轮询、超时、host rebind 和最终判定；Unity C# 负责短主线程动作、状态读取、job/report 记录。
- 首版只为 artifacts/reports 引入 MCP Resources，不系统性 resource 化所有只读状态。
- 先覆盖高频日常闭环，再逐步扩展创作和项目能力。

## Non-goals

- 不从零重写 `unity-mcp-v2` 的底层架构，除非后续证据证明其核心方向错误。
- 不把所有 internal operations 一比一暴露为 public MCP tools。
- 不把 public tool 退化为万能 `unity_execute_command`。
- 不照搬 `Unity-Skills` 的 skill 分类、命令格式或文件队列模型。
- 不让 Unity C# host 承担长时间阻塞等待、轮询或复杂 workflow 编排。
- 不一次性实现所有 Unity 操作域。
- 不系统性把 editor status、scene hierarchy、asset index 等只读状态全部改为 MCP Resources。
- 不在首版实现完整 artifact store、retention 或 cleanup 子系统。
- 不在 roadmap 中写详细实现步骤；实现步骤进入后续 spec 和 plan。
- 不在没有验证证据的情况下标记 phase completed。

## Shared Constraints

### 1. 名称与定位

新体系命名为 **Unity Agent Kit**。

它不是单纯 MCP 工具，而是：

```text
AI Agent 使用 Unity Editor 的完整操作体系
```

MCP runtime 是其中一层，而不是全部。

### 2. 基于 v2 演进

`unity-mcp-v2` 的以下设计作为基线保留：

- Contract Kernel
- operation envelope
- action/workflow 分层
- Unity host runtime
- loopback HTTP host
- registry/probe
- host rebirth / rebind
- 稳定错误语义
- TS + Unity 双侧测试策略

如果要放弃 v2 架构，必须通过结构性 `change-roadmap`。

### 3. Public MCP tools 与 internal operations 分离

Internal operations 可以继续细粒度：

```text
compile.request
compile.state.get
component.add
component.set
screenshot.capture
```

但 public MCP tools 面向 Claude，应按使用意图和领域聚合：

```text
unity_compile
unity_console
unity_test
unity_scene
unity_object
unity_component
```

原则：

- internal operations 服务 host routing、测试、workflow 编排；
- public tools 服务 Claude 选择和用户任务；
- workflow tools 只暴露高价值任务级能力；
- read-only state 可以继续使用 read actions，只有 artifacts/reports 首版进入 MCP Resources。

### 4. Public tool 命名

Public MCP tool 命名采用：

```text
snake_case + unity_ 前缀
```

示例：

```text
unity_editor
unity_compile
unity_console
unity_test
unity_playmode
unity_screenshot
unity_scene
unity_object
unity_component
unity_material
unity_asset
unity_prefab
unity_ui
unity_validation
unity_project_command
unity_animation
```

Tool 内部 action 也使用 `snake_case`，但不重复 `unity_` 前缀。

示例：

```text
unity_compile:
  get_state
  request
  wait_for_idle
  compile_and_check

unity_test:
  list
  start
  get_status
  get_result
  run_and_collect
  run_and_verify
```

### 5. Public 参数模型重新设计

v2 schema 只能作为 internal schema 参考，不能直接成为 public tool schema。

Public tool 参数应重新设计：

- 使用 typed discriminated union；
- 使用统一 target model；
- 使用明确 action enum；
- 使用安全字段；
- 输出必须包含验证线索；
- 禁止自由形态 `{ action: string, params: object }` 作为主接口。

### 6. Action 完成语义以用户期望为准

Public action 的完成语义不能以底层 Unity API 是否返回为准，而应以用户期望的最终结果为准。

例如：

- 截图 action 返回时，截图文件必须真实存在、非空、尺寸有效。
- 编译 action 必须区分“状态空闲”和“编译无错误”。
- 测试 action 必须区分“测试报告已收集”和“测试通过”。
- PlayMode action 必须区分“请求进入”和“已稳定进入”。
- 写操作必须返回已验证的最终效果，而不是“命令已发送”。

### 7. Action 命名语义

Public action 命名应表达语义：

```text
get_* / snapshot / count       只读观察
request / start / begin        请求已接受，不代表完成
wait_for_*                     等待状态稳定，不代表业务成功
*_and_check / *_and_verify     等待并判断成功
capture / create / assign      返回时必须验证最终效果
```

避免模糊名称。如果只表示状态收敛，应使用：

```text
wait_for_idle
```

如果表示最终成功判断，应使用：

```text
compile_and_check
run_and_verify
enter_and_verify
```

### 8. Tool/action 描述质量

每个 public tool 和 action 必须有最小但不可缺失的语义描述。

描述必须说明：

- 用途；
- action 完成语义；
- 是否等待；
- 是否代表业务成功；
- sideEffectLevel；
- 返回内容；
- 主要失败条件。

详细调用顺序和多工具 recipe 放在 skills 中，不塞进 tool description。

### 9. 异步与 Job 边界

TS 层负责：

- workflow 编排；
- 等待；
- 轮询；
- timeout；
- host rebind；
- diagnostics；
- result convergence；
- 最终 success/failure 判定。

Unity C# 层负责：

- Unity API 主线程执行；
- 短动作；
- 状态 snapshot；
- job record；
- test report / operation report；
- artifact 落盘与基础校验。

禁止：

- Unity host 中长时间 `Thread.Sleep`；
- HTTP handler 内忙等；
- `Task.Wait` 阻塞 Unity 主线程；
- 后台线程直接调用 Unity API；
- Unity C# host 独占复杂 workflow 编排。

### 10. 编译诊断与 Console 诊断分工

`unity_compile.compile_and_check` 的编译成功判定以 Unity CompilationPipeline 的 compiler messages 为主。

规则：

- C# 编译成功/失败的主依据是 `CompilationPipeline.assemblyCompilationFinished` 收集到的 `CompilerMessage[]`。
- `CompilationPipeline.compilationFinished`、Editor idle 或相关状态用于判断本轮编译生命周期结束。
- Console diagnostic cursor 只作为补充诊断，用于捕获非编译器错误。
- Console 当前错误列表不得替代 compiler messages 作为 `compile_and_check` 的主要成功判定。
- 如果编译诊断无法可靠归属于本轮编译，必须返回 `uncertain` 或明确 diagnostics，禁止假成功。

### 11. Console diagnostic cursor

Console diagnostic cursor 用于归因操作期间新增的非编译器日志。

适用场景：

- PlayMode verification；
- test verification；
- project command verification；
- UI workflow diagnostics；
- screenshot workflow diagnostics；
- assembly reload 后 Editor callback 报错。

若 cursor 实现不可靠，必须定义保守 fallback，并在结果中返回 `uncertain` 或 diagnostics。

### 12. Safety model

首版每个 public action 必须标注核心 safety 字段：

```text
sideEffectLevel: read | write | destructive
confirmationPolicy: never | when_destructive | always
dryRunMode: unsupported | supported | required_first
```

后续涉及明确目标、覆盖、删除、移动、重命名等能力时，对应能力域 spec 必须补充：

```text
targetStrictness
overwritePolicy
```

必须重点设计安全策略的 actions：

```text
unity_object.delete
unity_component.remove
unity_asset.move
unity_asset.rename
unity_asset.delete
unity_prefab.apply_overrides
unity_prefab.revert_overrides
unity_prefab.unpack
unity_validation.cleanup_empty_folders
unity_project_command.invoke when destructive
```

### 13. MCP Resources 范围

首版 MCP Resources 只用于工具生成的 artifacts/reports，不系统性 resource 化所有只读状态。

Public read tools 仍负责高频状态读取，例如：

```text
editor status
scene hierarchy
console query
asset search
object snapshot
```

首版 Resource 范围：

```text
unity://screenshots/{artifactId}
unity://test-reports/{reportId}
unity://console-snapshots/{snapshotId}
unity://validation-reports/{reportId}
```

### 14. Artifact model

工具产生的可复读结果必须使用统一 artifact model。

基础字段：

```text
artifactId
type
uri
path?
relativePath?
createdAt
sizeBytes?
validationStatus
diagnostics
metadata
```

`validationStatus` 取值：

```text
valid
invalid
uncertain
```

首版核心类型：

```text
screenshot
test_report
console_snapshot
validation_report
```

预留类型：

```text
compile_report
project_command_report
```

首版不实现完整 artifact store、retention 或 cleanup 子系统。

验证与临时输出路径约束：

- Unity Agent Kit 显式生成的 artifact metadata / payload root 保持为 repo 根目录下 `.ai-debug/unity-agent-kit/artifacts/`。
- Unity Test Runner 结果 XML、临时 evidence 和本项目显式生成的测试 fixture 统一写入 repo 根目录下 `.ai-debug/unity-agent-kit/test-results/`，或按功能细分到 `.ai-debug/unity-agent-kit/<feature>/`。
- Unity test 命令必须使用绝对 `-testResults` 路径，或使用不重复 `unity/` 前缀的 project-relative path；禁止使用 `-projectPath unity` 搭配 `-testResults unity/Library/...` 生成 `unity/unity/...`。
- 不移动 Unity 自管缓存目录，例如 `unity/Library/`、`unity/Temp/`、`unity/Logs/`。

### 15. Skill-guided 调用体系

Skills 是调用指导层。

职责：

- intent routing；
- tool recipe；
- risk handling；
- verification loop；
- fallback to project commands。

不照搬 Unity-Skills，而是以 **用户任务优先，Unity API 领域辅助** 设计。

### 16. Actual skill materialization 与上下文预算

Actual skill 文件与 MCP public tools 不是一一对应关系：

```text
用户任务
→ skill routing / recipe
→ 一个或多个 public tool/action
→ verification path
```

首版只保证一个 actual skill 入口：

```text
/unity
```

规则：

- Phase 2 只定义 skill architecture、recipe contract 和 handoff category，不创建实际 skill 文件。
- Phase 5 首次创建最小 actual `/unity` skill 文件。
- `/unity` 是薄路由入口，不是完整 Unity 操作手册。
- `/unity` 只内联短 P0 recipe、通用 safety / confirmation / dryRun / verification 规则、stable tool/action 引用和 handoff category。
- Actual skill 的 executable recipe steps 只能引用 stable public tool/action。
- Handoff / `requiredCapabilities` 可以引用 candidate public tool/action，但不得作为执行步骤。
- Phase 6/7/8 默认扩展 `/unity`；复杂 domain 由对应 phase spec 决定 `extend_unity_entry`、`create_domain_skill`、`defer` 或 `reject`。
- Phase 9 审计已有 actual skill files 与 public tool/action catalog、schema 和 docs 的一致性，不负责首次创建核心 `/unity` skill。

Context budget 规则：

- 不把完整 public schema、完整 result/error schema、大段 JSON 示例、长篇 Unity 教程或复杂 domain 手册塞进 `/unity`。
- 若 domain recipe 需要独立背景、长参数示例、长故障处理或大量专有词表，对应 phase 必须选择 `create_domain_skill` 或 `defer`。
- Public MCP tools 默认返回短摘要、状态、关键 diagnostics、验证信号和 artifact/report URI；完整 reports、snapshots 和 artifacts 通过 Resources 读取。

### 17. Editor Command Registry 是项目扩展层

保留并强化：

```text
editor.command.list
editor.command.invoke
```

作为项目自定义能力入口。

项目注册命令必须声明：

```text
name
description
category
inputSchema
sideEffectLevel
executionKind
requiresConfirmation
supportsDryRun
verificationHint
```

标准 tools 能表达的任务，优先标准 tools；只有项目特定能力才走 registry。

### 18. Skill/schema 防漂移

Skills、public MCP schema、tool descriptions 和 docs 必须保持一致。

Skill recipe 中引用 public tool/action 时应使用可机器检查的格式：

```text
tool: unity_compile
action: compile_and_check
```

参数示例必须能通过对应 public schema。

Phase 9 至少实现半自动一致性检查，覆盖：

- skill 引用的 tool/action 存在；
- skill 中 JSON 参数示例通过 schema；
- sideEffectLevel 一致；
- verification path 存在；
- public tool 文档与实际注册一致；
- action 完成语义在 tool description 与 skill 中不冲突。

### 19. 验证闭环

写操作不能只返回 `ok=true`。

必须有至少一种验证路径：

- object snapshot；
- scene hierarchy；
- component get；
- console snapshot；
- test result；
- screenshot artifact；
- validation report；
- project command verificationHint。

## Success Criteria

整体 roadmap 完成时，应满足：

- Unity Agent Kit 有清晰的四层结构：
  - Skills 调用指导层
  - Public MCP tools
  - Internal operations
  - Unity Host Runtime
- Public MCP tools 数量可控，不再一 operation 一 tool。
- Public MCP tool 命名采用 `unity_compile` 风格。
- 高频能力一等暴露：
  - `unity_editor`
  - `unity_compile`
  - `unity_console`
  - `unity_test`
  - `unity_playmode`
  - `unity_screenshot`
- Public action 有明确完成语义、异步语义、safety metadata 和验证规则。
- `compile_and_check` 基于 compiler messages 判断编译成功/失败。
- Console diagnostic cursor 用于非编译器诊断归因。
- 首版 Resources 用于 screenshots、test reports、console snapshots、validation reports。
- Artifacts 使用统一 artifact model。
- Skills 能指导 Claude 选择工具、组合调用、处理风险并验证结果。
- Editor Command Registry 能承载项目自定义能力，且有 metadata、安全和验证约束。
- TS 与 Unity C# 异步边界清楚，不通过 Unity 主线程长阻塞实现 workflow。
- 至少完成两个 vertical slice：
  - 高频日常闭环；
  - 简单创作闭环。
- Phase 8 作为扩展能力池，不一次性实现所有扩展域。
- 文档、skills、public schema、internal mapping 和测试保持一致。

## Decisions

- 2026-05-17：批准 actual skill materialization 与 skill/tool context budget 澄清；Phase 5 首次创建最小 actual `/unity` skill，actual executable recipe 只引用 stable tool/action，Phase 6/7/8 默认扩展 `/unity` 或按 spec 拆 domain skill，Phase 9 只审计已有 skill。
- 2026-05-17：Phase 2 保持 completed；Phase 2 的 `/unity` 是 architecture-level actual entry decision，不是实际 skill 文件创建动作。
- 2026-05-17：Phase 6/7/8 的 recipe 不预先承诺 slash command 名；各 phase 必须决定 `extend_unity_entry`、`create_domain_skill`、`defer` 或 `reject`。
- 2026-05-17：Phase 2 skill 设计改为 skill architecture + P0 daily loop recipe contract，不再使用“首批任务型 / 后续能力型”批次划分。
- 2026-05-16：新体系命名为 **Unity Agent Kit**。
- 2026-05-16：整体不是单纯 MCP 工具，而是 skills + MCP tools + host + project commands + resources 的 Agent 操作体系。
- 2026-05-16：基于 `unity-mcp-v2` 架构演进，不全新重写。
- 2026-05-16：Public MCP tool 命名采用 `snake_case` + `unity_` 前缀，例如 `unity_compile`；tool 内 action 也使用 `snake_case`。
- 2026-05-16：不再把每个 internal operation 直接暴露为 MCP tool。
- 2026-05-16：Public tool 参数和 action 按新架构重新设计，不照搬 v2。
- 2026-05-16：Skills 不照搬 Unity-Skills，而采用“任务型 skill 优先，能力型 skill 辅助”。
- 2026-05-16：保留并强化 Editor Command Registry。
- 2026-05-16：TS 层负责长流程编排和最终判定，Unity C# 层负责短动作和状态/产物记录。
- 2026-05-16：截图必须等待最终文件产物可验证后才算成功。
- 2026-05-16：编译必须区分 `idle` 与 `success`，不能只等 compile 状态结束。
- 2026-05-16：`compile_and_check` 的编译成功判定以 Unity CompilationPipeline 的 compiler messages 为主；Console diagnostic cursor 作为补充诊断。
- 2026-05-16：测试必须区分 `collected` 与 `passed`。
- 2026-05-16：首版 MCP Resources 仅用于工具生成的 artifacts/reports，不系统性 resource 化所有只读状态。
- 2026-05-16：定义统一 artifact model；首版只实现核心 artifact 类型，不实现完整 artifact store、retention 或 cleanup。
- 2026-05-16：Safety model 首版采用核心字段 `sideEffectLevel`、`confirmationPolicy`、`dryRunMode`；`targetStrictness` 和 `overwritePolicy` 在高风险能力域中按 phase 补充。
- 2026-05-16：Phase 8 定义为扩展能力池，不是一口气实现所有候选能力域。
- 2026-05-16：采用半自动 skill/schema 防漂移检查。
- 2026-05-16：先实现高频日常闭环，再实现创作闭环和扩展域。

## Current State

- Discovery 已完成。
- 已对比 `unity-mcp-v2` 与 `Unity-Skills`。
- 已确认：
  - v2 架构保留；
  - public tool surface 重设；
  - public tool 命名；
  - skill-guided 调用；
  - project command registry；
  - TS/Unity 异步边界；
  - action 完成语义以用户期望结果为准；
  - compiler messages 与 console diagnostics 分工；
  - Resources 和 artifact model 范围；
  - safety model；
  - skill/schema 防漂移机制；
  - actual `/unity` skill materialization 与 skill/tool context budget 边界。
- 当前阶段：5C-03 Compile report + compile_and_check attribution completed with evidence; 5C-04 remains incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending. Phase 5B Artifact / Resource / Timeout / Completion remains completed；Phase 5A remains completed。5C-03 evidence 覆盖 TS focused verification `tests 129`、`pass 129`、`fail 0`，Unity focused verification XML `phase5c-03-compile-report-compile-and-check.xml` `total="27"`、`passed="27"`、`failed="0"`，Unity HostRuntime regression XML `phase5c-03-host-runtime-regression.xml` `total="82"`、`passed="82"`、`failed="0"`，scope boundary check（未创建 public MCP tools / registration / action-dispatch surface、MCP Resource handlers、`/unity` skill、console diagnostics/workflows、Phase 5D test/playmode/screenshot workflows、Phase 5E final daily loop E2E files）以及 `git -c core.autocrlf=false diff --check` 无输出。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- Phase 3 已完成 Public MCP Tool Action Design 规格和计划，并记录 completion evidence。
- Phase 4 已完成 Async / Job / Workflow / Artifact Semantics 规格验证和计划执行，并记录 completion evidence。
- **Next Manual Action:** 5C-03 Compile report + `compile_and_check` attribution completed with evidence；下一步创建并审查 5C-04 console count/snapshot/clear + cursor/resource 的 expanded execution plan。Phase 5C remains incomplete because 5C-04 尚未完成。Phase 5 remains incomplete because Phase 5C、Phase 5D、Phase 5E and final daily loop E2E remain pending。
- 当前不实现 Phase 6/7/8 能力域。

## Blockers

| Blocker | Affects | Status | Resolution |
|---------|---------|--------|------------|
| None | None | clear | No active blockers |

## Phase Summary

| Phase | Status | Goal | Spec | Plan | Verification | Next |
|-------|--------|------|------|------|--------------|------|
| Phase 1 — 架构与边界蓝图 | completed | 定义 Unity Agent Kit 总体结构和硬约束 | `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md` | `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md` | recorded | completed |
| Phase 2 — Unity Agent Skill 体系设计 | completed | 设计 skill 架构、/unity 路由、P0 daily loop recipe contract 和跨 phase handoff | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` | recorded | completed |
| Phase 3 — Public MCP Tool Action Design | completed | 逐个设计 public tool、action、参数、异步语义、safety、验证路径和 action catalog | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | recorded | completed |
| Phase 4 — Async / Job / Workflow / Artifact Semantics | completed | 明确 TS 与 Unity C# 的异步职责、job 协议、diagnostics 和 artifact model | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` | recorded | completed |
| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | partial | continue-5c |
| Phase 6 — Project Editor Command Registry 增强 | not-started | 强化项目自定义命令发现、schema、安全、验证和 recipe landing strategy | pending | pending | pending | after Phase 5 |
| Phase 7 — 简单创作 vertical slice | not-started | object/component/material/screenshot/validation 创作闭环和 recipe landing strategy | pending | pending | pending | after Phase 6 |
| Phase 8 — 扩展能力池 | not-started | 将 asset、prefab、ui、animation、validation 等作为可独立推进的扩展池，并为选定域决定 recipe landing strategy | pending | pending | pending | after Phase 7 |
| Phase 9 — 验证、文档与迁移收口 | not-started | 收口测试、文档、已有 skills、命名、resource 和迁移策略 | pending | pending | pending | after Phase 8 |

## Phase Details

### Phase 1：架构与边界蓝图

**Status:** `completed`

**Goal:**
定义 Unity Agent Kit 的总体结构、继承自 v2 的部分、需要重设的部分，以及后续 phase 的硬约束。

**Scope:**

- 确认 Unity Agent Kit 是完整 Agent 操作体系，不只是 MCP server。
- 定义四层结构：
  - Skills 调用指导层
  - Public MCP tools
  - Internal operations
  - Unity Host Runtime
- 明确 v2 架构保留范围。
- 明确 public tools 与 internal operations 分离。
- 明确 public action 完成语义规则。
- 明确 TS 与 Unity C# 异步边界。
- 明确验证闭环原则。
- 明确 Project Editor Command Registry 的系统位置。
- 明确首批能力不追求全覆盖。
- 明确 Resources 首版只用于 artifacts/reports。

**Out of Scope:**

- 不设计所有 tool action 的完整 schema。
- 不实现代码。
- 不写 skill 文件。
- 不做命名迁移。

**Reference Input Mapping:**

- `unity-mcp-v2`：架构基线、runtime、registry/probe、host rebirth、workflow/action 分层。
- `Unity-Skills`：领域词表和调用场景参考。

**Success Criteria:**

- 明确 Unity Agent Kit 不是单纯 MCP 工具。
- 明确不采用“一 operation 一 MCP tool”。
- 明确哪些职责在 TS，哪些在 Unity C#。
- 明确 Resources、artifacts、skills、public tools 和 internal operations 的边界。
- 明确后续 phase 的设计输入。

**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md`
- **Implementation Summary:** Phase 1 完成 Unity Agent Kit 架构与边界蓝图规格，明确新插件 identity、四层主干、Contract Kernel、public/internal/host 边界、v2 candidate baseline 采纳规则、安全/完成语义/持久化/target/artifact/result/error 边界，以及 Phase 2-9 的交接输入。
- **Verification Evidence:** 2026-05-17：`docs/superpowers/specs/2026-05-16-unity-agent-kit-phase-1-architecture-boundary-design.md` 和 `docs/superpowers/plans/2026-05-16-unity-agent-kit-phase-1-architecture-boundary.md` 已验证。规格自检通过：TODO/FIXME/TBD 检查通过、裸延后表述检查通过、legacy compatibility 正向表述检查通过；关键内容存在性检查覆盖 `developmentRepoRoot`、`pluginRoot`、`unityProjectRoot`、`Transport Security 与 Host 最低校验`、`Contract Kernel 与 C# host 的关系`、`默认持久化与保存范围`、`Phase Handoff Table`。Success criteria 覆盖证据：规格明确 Unity Agent Kit 不是单纯 MCP server；public/internal/host 边界明确；Public MCP tools 与 Internal operations 分离；Unity C# 不读取 public metadata；Resources 首版只用于 tool-generated artifacts/reports；Phase Handoff Table 明确 Phase 2-9 交接输入。计划执行证据：Phase 1 plan 中任务 1-5 关键步骤均已勾选，包含新版 roadmap 表格检查、Current State/Blockers 检查、pending completion evidence 检查、规格自检、completion evidence 交接和最终工作区检查。

**Next Manual Action:**
Phase 1 已完成；下一步手动命令见 Current State 中的 Phase 4 `write-spec`。

---

### Phase 2：Unity Agent Skill 体系设计

**Status:** `completed`

**Goal:**
设计 Unity Agent Kit 的 skill 架构、`/unity` 路由规则、P0 高频日常闭环 recipe contract、机器可检查 recipe block、安全/验证规则，以及 Phase 6/7/8 的 skill handoff。

**Scope:**

设计入口 skill：

```text
/unity
```

职责：

- 判断用户意图；
- 路由到 P0 daily loop recipe、project command fallback、Phase 7 creation handoff 或 Phase 8 extension handoff；
- 避免 Claude 直接面对过多 public tools；
- 不把能力域列表当作实现批次。

P0 daily loop recipe contracts 对齐 Phase 5 的高频闭环：

```text
editor readiness
compile check
console diagnostics
test verify
playmode verify
screenshot artifact
daily health check
```

候选 public tool/action 引用来自 Phase 5 P0 tools/actions：

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

定义 recipe block contract：

- Phase 2 spec 必须定义 Markdown 中的 `yaml` fenced block 格式；
- 顶层字段为 `recipe:`；
- block 必须能表达 `id`、`intent`、`steps`、每个 step 的 `tool` 和 `action`、`paramsExample`、`expects`、`verificationPath`、safety / confirmation / dryRun 相关提示，以及 fallback 规则；
- `paramsExample` 只作为最小示例，不代表 Phase 3 完整 schema。

定义 safety / verification rules：

- Skill 负责指导 Claude 识别风险、请求用户确认、选择 dryRun、避免模糊 target，并执行验证闭环；
- public tool metadata 和 handler 负责强制 safety gate；
- skill 不是唯一安全来源。

定义 project command fallback contract：

- 标准 public tools 优先；
- project command 允许显式入口和严格 fallback；
- metadata 不足不得调用；
- destructive command 必须 confirmation 或 dryRun；
- invoke 后按 `verificationHint` 验证；
- fallback 必须记录 `fallbackReason`。

Project command recipe landing strategy 与详细 recipe 由 Phase 6 设计；Phase 2 不预留 actual slash command 名。

定义 P1 creation handoff：

- creation vertical slice recipe landing strategy 与详细 recipe 由 Phase 7 设计；
- Phase 2 只定义 handoff 规则，不设计 object/component/material 创作 recipe 细节。

定义 extension domain handoff：

- `unity_ui`、prefab、asset、animation、validation expansion 的 recipe landing strategy 与详细 task/domain recipe 由 Phase 8 按被选扩展域设计。

**Out of Scope:**

- 不照搬 Unity-Skills 原目录。
- 不写文件队列 JSON。
- 不一次性创建所有 skills。
- 不把所有 skill recipe 做成 MCP workflow。
- 不设计 creation vertical slice 的详细 recipe；该责任属于 Phase 7。
- 不设计 `unity_ui` 或扩展域的详细 recipe；该责任属于 Phase 8。
- 不把能力型 skill 列表当作 Phase 2 实现批次。
- 不创建实际 skill 文件。
- 不锁死 Phase 3 public tool/action 完整 schema。
- 不把 project command 当作标准 public tools 的替代入口。

**Reference Input Mapping:**

- `Unity-Skills`：领域分类、命令示例、自然语言任务拆解。
- `unity-mcp-v2`：实际执行能力和 envelope 参考。
- Phase 5：P0 高频日常闭环 tools/actions。
- Phase 6/7/8：project command、creation 和 extension domain skill handoff 接收方。

**Success Criteria:**

- `/unity` routing 规则明确。
- P0 daily loop recipe contracts 覆盖 Phase 5 高频闭环。
- Recipe block 使用可机器检查格式，可供 Phase 9 audit 解析。
- Skills 明确：
  - 何时用标准 public tools；
  - 何时允许 project command fallback；
  - 何时需要确认；
  - 如何验证结果。
- Skill safety 规则与 public tool metadata / handler 的强制 safety gate 边界明确。
- Phase 6/7/8 的 skill handoff 明确。
- Skill 结构以 P0 任务闭环为主，以能力域 handoff 为辅。

**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`
- **Implementation Summary:** Phase 2 完成 Unity Agent Skill 体系设计规格和计划，明确 `/unity` 单入口路由、P0 daily loop recipe contract、机器可检查 recipe block、轻量结构化 `verificationPath`、每步必填 `onFailure`、skill safety 与 public handler safety gate 分工、project command explicit / strict fallback，以及 Phase 6/7/8 handoff category 边界。
- **Verification Evidence:** 2026-05-17：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` 和 `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` 已验证。Roadmap artifact 同步验证通过，输出 `PASS Phase 2 roadmap planned state and artifact links are present`，确认 Phase 2 Spec/Plan artifact 已链接。Phase 2 规格自检通过，覆盖占位符、裸延后表述、禁止预留后续 slash command 名称、handoff category、candidate tool/action、`verificationPath`、`onFailure`、`daily_health_check` default/full mode、Phase 9 audit handoff，以及 `recipe.mode` / `recipe.optionalModes` 静态 contract 标记边界。Phase 2 计划自检通过，success-criteria coverage 全部 PASS，checklist 结构检查输出 `PASS checklist step count: 21`，计划头部、roadmap/spec 路径、任务结构和禁止范围完整。最终整体审查子代理返回 PASS；roadmap 同步子代理返回 NO_CHANGE_NEEDED。Success criteria 覆盖证据：规格明确 `/unity` routing；P0 daily loop 覆盖 6 个基础 recipe 和 `daily_health_check` default/full mode；recipe block 可供 Phase 9 半自动审计；skill safety 与 public tool handler safety gate 分工明确；project command fallback 不是万能后门；Phase 6/7/8 handoff category 明确；未定义实际 skill 文件、MCP tools、Unity C# host 或 audit 脚本。

---

### Phase 3：Public MCP Tool Action Design

**Status:** `completed`

**Goal:**
逐个设计 public MCP tools 的 action、参数、完成语义、异步语义、safety metadata、验证路径和可供 actual skill / audit 使用的 public tool/action catalog。

**Scope:**

Core daily loop tools：

```text
unity_editor
unity_compile
unity_console
unity_test
unity_playmode
unity_screenshot
```

Authoring/editing tools：

```text
unity_scene
unity_object
unity_component
unity_material
unity_asset
unity_prefab
unity_ui
```

Extension/quality tools：

```text
unity_validation
unity_project_command
unity_animation
```

每个 tool 需要设计：

- action enum；
- 每个 action 的参数模型；
- 每个 action 的完成语义；
- 每个 action 的异步类型；
- `sideEffectLevel`；
- `confirmationPolicy`；
- `dryRunMode`；
- 是否需要 `targetStrictness` / `overwritePolicy`；
- public action 到 internal operation 的 mapping；
- 验证路径；
- 最小 tool/action description。

需要导出的 public tool/action catalog metadata：

```text
toolName
actionName
referenceStatus: candidate | stable | deprecated
owningPhase
inputSchema
sideEffectLevel
completionSemantics
verificationMeaning
```

Catalog 规则：

- actual skill executable recipe steps 只能引用 `referenceStatus: stable` 的 public tool/action；
- handoff / `requiredCapabilities` 可以引用 `referenceStatus: candidate` 的 public tool/action，但不得作为执行步骤；
- Phase 9 audit 以 catalog 判断 skill/schema/docs 是否漂移。

MCP Resources 设计范围：

- 定义 artifact resource URI 规则；
- 定义 public tool 返回 `artifactId` / `reportId` 的规则；
- 明确哪些 read action 保持 tool，不迁移为 Resource。

**关键 action 语义要求：**

`unity_compile`：

| Action | 语义 |
|---|---|
| `get_state` | 只读当前 compile/update 状态 |
| `request` | 请求编译，不等待完成 |
| `wait_for_idle` | 等 Unity 不再 compiling/updating，不代表成功 |
| `compile_and_check` | 请求编译，等待 lifecycle 完成，并基于 compiler messages 判断是否成功 |

`unity_screenshot`：

| Action | 语义 |
|---|---|
| `capture_game_view` | 返回时 PNG 必须存在、非空、尺寸有效、路径安全，并返回 screenshot artifact |

`unity_test`：

| Action | 语义 |
|---|---|
| `list` | 列出测试 |
| `start` | 启动测试 job，不代表通过 |
| `get_status` | 查询测试状态 |
| `get_result` | 获取测试 report |
| `run_and_collect` | 测试结束并拿到 report，不代表通过 |
| `run_and_verify` | 测试结束且通过成功规则 |

`unity_playmode`：

| Action | 语义 |
|---|---|
| `get_state` | 获取当前状态 |
| `enter` | 请求进入，不代表完成 |
| `exit` | 请求退出，不代表完成 |
| `wait_for_state` | 等待目标稳定状态 |
| `enter_and_verify` | 稳定进入 PlayMode |
| `exit_and_verify` | 稳定退出到 EditMode |

`unity_console`：

| Action | 语义 |
|---|---|
| `snapshot` | 获取日志快照，可返回 console snapshot artifact |
| `count` | 获取日志计数 |
| `clear` | 清空后验证计数符合预期 |

**Out of Scope:**

- 不实现所有 action。
- 不直接照搬 v2 `operations.ts`。
- 不允许万能自由 JSON 参数。
- 不在本 phase 决定所有扩展域最终字段。

**Reference Input Mapping:**

- `unity-mcp-v2`：internal operation 和现有 schema 参考。
- `Unity-Skills`：能力词表参考。
- MCP 设计原则：tool 数量可控、schema 明确、描述可指导模型选择。

**Success Criteria:**

- 高频 tools 的 action 语义清晰。
- 截图、编译、测试、PlayMode 等异步/验证语义不再模糊。
- 每个 public action 有 safety metadata。
- 每个写 action 有验证路径。
- Public schema 与 internal schema 的边界明确。
- Resources 首版范围与 artifact model 对齐。
- Public tool/action catalog 可供 actual skill 和 Phase 9 audit 判断 stable/candidate 引用。
- Action metadata 可供 skill/schema consistency audit 使用。

**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- **Implementation Summary:** Phase 3 完成 Public MCP Tool Action Design 规格与计划执行，定义 shared public parameter model、result envelope、completion semantics、shared target model、safety metadata、Resource reference boundary、catalog contract、P0 `stable_ready` action / `inputSchemaRef` 清单、Phase 5 required executable subset、Phase 7 detailed candidate、Phase 8 taxonomy 和 `unity_project_command` candidate boundary；执行过程中同步 roadmap planned artifact 状态，修复 project command 后备入口措辞和未约束参数反例，补充 P0 与 candidate/taxonomy catalog 覆盖边界说明，并完成 plan 自检和 completion evidence 交接。
- **Verification Evidence:** 2026-05-17：Phase 3 artifacts 已验证，Spec `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` 和 Plan `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` 存在。Roadmap planned 状态检查输出 `PASS Phase 3 roadmap planned state and artifact links are present`。规格边界检查输出 `PASS placeholder markers`、`PASS vague time wording`、`PASS old result rule`、`PASS unbounded params`、`PASS Phase 3 approved review revisions are present`。Catalog 覆盖检查输出 `PASS P0 inputSchemaRef coverage: 23 rows`、`PASS Phase 5 handoff split: 19 required actions, 4 helper actions`、`PASS Phase 3 success criteria coverage is present`。Plan 自检输出 `PASS plan placeholder/vague wording`、`PASS checklist step count: 26 total, 26 checked`、`PASS required command snippets present`、`PASS roadmap/spec/plan paths are consistent`。Completion evidence draft 输出 spec/plan 路径并确认 `No code/runtime/reference/skill implementation was created by this plan.` 最终整体审查子代理返回 `PASS`，roadmap 同步子代理返回 `PASS_NO_CHANGES`。Success criteria 覆盖证据：规格覆盖高频 tools action 语义、编译/测试/PlayMode/screenshot 异步验证语义、safety metadata、写操作验证路径、public/internal schema 边界、Resource 范围、catalog stable/candidate 引用和 Phase 9 audit metadata。

---

### Phase 4：Async / Job / Workflow / Artifact Semantics

**Status:** `completed`

**Goal:**
定义异步操作、job-backed operation、workflow 编排、diagnostics、artifact model 和最终判定规则。

**Scope:**

定义 action 语义类别：

```text
R  read snapshot
C  command/request accepted
S  state settled
E  effect complete
A  artifact complete
V  verified
J  job-backed
D  destructive
```

明确：

- `compile.wait_for_idle` 是 `S`；
- `compile.compile_and_check` 是 `S + V`；
- `screenshot.capture_game_view` 是 `A + V`；
- `test.start` 是 `C + J`；
- `test.run_and_collect` 是 `S + J`；
- `test.run_and_verify` 是 `S + J + V`；
- `playmode.enter_and_verify` 是 `S + V`；
- `console.clear` 是 `E + V`；
- project command 根据 metadata 决定 immediate/job/destructive。

定义 compilation diagnostics：

- `CompilationPipeline.assemblyCompilationFinished` 如何收集 `CompilerMessage[]`；
- `compilationFinished` / editor idle 如何表示本轮生命周期完成；
- compile report/job record 如何持久化；
- `compile_and_check` 如何读取本轮 compiler diagnostics；
- 如何处理 diagnostics 归属不确定场景。

定义 Console diagnostic cursor：

- cursor 数据结构；
- `console.snapshot` 如何返回 cursor；
- `sinceCursor` 如何工作；
- cursor 不可靠时的 fallback；
- `uncertain` 语义；
- PlayMode/test/project command/screenshot/UI workflow 如何使用 cursor。

定义 artifact model：

```text
artifactId
type
uri
path?
relativePath?
createdAt
sizeBytes?
validationStatus
diagnostics
metadata
```

定义：

- artifact ID 生成；
- resource URI 规则；
- validationStatus 语义；
- diagnostics 结构；
- 文件型 artifact 与报告型 artifact 的区别；
- tool result 如何引用 artifact；
- resource 如何读取 artifact。

**Out of Scope:**

- 不实现复杂持久化请求队列。
- 不把所有异步任务都做成 Unity job。
- 不在 Unity 主线程内长等待。
- 不实现完整 artifact store、retention 或 cleanup 子系统。

**Reference Input Mapping:**

- `unity-mcp-v2`：compile/playmode/test 可靠性设计。
- Unity 官方约束：Unity API 主线程访问、Editor tick、CompilationPipeline callback、Awaitable main/background thread 切换。

**Success Criteria:**

- 每个异步 public action 都有明确 owner。
- 不再出现“请求已发送但伪装成成功”的 action。
- Host rebirth 后的状态恢复或失败语义清晰。
- Unity C# host 不承担长阻塞 workflow。
- 编译诊断与 Console 诊断分工明确。
- Artifact model 与 Resources 设计一致。

**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`
- **Implementation Summary:** Phase 4 完成 Async / Job / Workflow / Artifact Semantics 规格与计划执行，定义统一 public result status enum、TS/C# ownership、evidence model、host rebind limited recovery、job lifecycle、compile diagnostics、console cursor、artifact/report/resource contract、P0 daily loop action semantics matrix 和 candidate action rules；未创建 runtime、reference、actual skill 或测试实现。
- **Verification Evidence:** 2026-05-18：Phase 4 artifacts 已验证。Spec `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` 和 Plan `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` 存在。最终文档验证输出 `PASS roadmap planned link`、`PASS phase3 status enum`、`PASS phase4 required contracts`、`PASS phase4 timeout policy`、`PASS phase4 job record`、`PASS phase4 report locator`、`PASS plan all checkboxes: 26/26`。Phase 4 spec 检查输出 `PASS placeholder markers`、`PASS vague time wording`、`PASS runtime implementation scope`、`PASS Phase 4 required contracts are present`、`PASS P0 matrix rows: 23`、`PASS P0 action names are covered`、`PASS candidate action boundary is preserved`。Phase 3 result envelope 同步检查输出 `PASS Phase 3 result envelope is synchronized with Phase 4`。Plan 自检输出 `PASS placeholder/vague wording`、`PASS checklist step count: 26`、`PASS plan required structure`、`PASS roadmap/spec/plan paths are consistent`。`git diff --check` 未发现 whitespace errors；最终整体审查返回 `PASS: final review passed`；roadmap 同步检查返回 `NO_CHANGES_NEEDED`。提交 `733920d` 记录 Phase 4 plan、roadmap handoff state 和 workspace guidance。Success criteria 覆盖证据：规格明确 P0 async public action owner、request acceptance 与 final success 区分、host rebirth 后 `lost` / `uncertain` 语义、Unity C# host 不承担长阻塞 workflow、编译诊断与 Console 诊断分工、Artifact model 与 Resources 对齐。

---

### Phase 5：高频日常闭环基础设施

**Status:** `planned`

**Goal:**
优先实现 Unity Agent 最常用的日常闭环，并首次创建最小 actual `/unity` skill，而不是先做所有创作工具。

**Scope:**

首批 P0 tools/actions：

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

目标闭环：

```text
Editor status
→ compile and check
→ console snapshot
→ run tests and verify
→ enter/exit playmode
→ capture screenshot
```

同步创建最小 actual `/unity` skill 文件：

```text
plugins/unity-agent-kit/skills/unity.md
```

`/unity` 只包含：

- thin routing；
- P0 stable daily loop executable recipes；
- 通用 safety / confirmation / dryRun / verification 规则；
- Resource 读取纪律；
- Phase 6/7/8 handoff category。

Actual `/unity` executable recipe steps 只允许引用 Phase 3 catalog 中已标记为 stable、并由 Phase 5 实现和验证的 P0 public tool/action。

优先实现 artifact 类型：

```text
screenshot
test_report
console_snapshot
```

**Out of Scope:**

- 不实现 object/component/material 创作工具。
- 不实现 Phase 6/7/8 domain recipe。
- 不实现所有 test runner 高级参数。
- 不实现 Scene View 或 EditorWindow 截图。
- 不实现全量 workflow 大杂烩。
- 不实现完整 artifact store、retention 或 cleanup。
- 不把 candidate tool/action 写成 actual skill executable recipe step。
- 不把 `/unity` 写成大型 Unity 操作手册。

**Reference Input Mapping:**

- `unity-mcp-v2`：已有 compile、console、test、playmode、screenshot 能力。
- Phase 3/4：重新定义后的 public action 语义、artifact model 和 diagnostics 规则。

**Success Criteria:**

- 高频日常闭环可通过 public tools 完成。
- 编译能区分 idle 与 checked success。
- 编译成功/失败基于 compiler messages。
- 截图返回真实有效 artifact。
- 测试能区分 report collected 与 verified pass。
- Console snapshot 可作为 artifact/resource 读取。
- 最小 actual `/unity` skill 已创建，并能通过 P0 stable recipes 指导 daily loop。
- `/unity` executable recipe steps 只引用 stable P0 public tool/action。
- `/unity` 符合 context budget，不内联完整 schema、长示例或大型结果。
- TS/MCP tests 与至少一轮 E2E 验证通过。

**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- **Implementation Summary:** partial: Phase 5A Host Runtime foundation 已完成；5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03。5A-06 最终实现收敛了 strict shutdown state / boundary、accept reservation before `GetContext`、deterministic wake、listener-loop-exited signal、background closer、guaranteed handler / async write stable drain，以及基于 `ReadChunkWithTimeout` 的 bounded body read；5A-07 实现 strict registry validation、active probe validation、low-level Node HTTP transport seam、single trusted operation envelope mapping、bounded pre-operation rebind、in-flight no replay、post-response stale/restarted classification、diagnostic priority 和 timeout layering；5A-08 增加 live vertical smoke evidence，Unity 启动真实 loopback host、Node 运行 `phase5a-vertical-smoke.test.ts`、`host.threadCheck` 在 captured Unity main thread 执行，并完成 envelope/public result/MCP payload mapping 与 host cleanup。Phase 5A Host Runtime hardening 作为 completed 后、Phase 5B 前的补丁记录了 TS envelope trust boundary、dispatch timeout claim race、body read bounds、optional result field preservation 和 docs cleanup；final verification 通过，TS tests 为 `tests 65`、`pass 65`、`fail 0`，Unity `HostRuntimeTests` 为 `total="82"`、`passed="82"`、`failed="0"`，Unity vertical smoke 为 `total="1"`、`passed="1"`、`failed="0"`，并额外记录 Node vertical smoke stdout、scope/docs checks 和 clean `git diff --check`。Phase 5A remains completed。Phase 5B Artifact / Resource / Timeout / Completion completed with evidence: TS command `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts` passed with `fail 0`; Unity `HostRuntimeArtifactTests` passed with `failed="0"`; Unity `HostRuntimeTests` regression passed with `failed="0"`; scope boundary check confirmed no public MCP tools, no MCP Resource handlers, no `/unity` skill, no validation-reports readback, no real screenshot/test/console workflow, and no final daily loop E2E。5C-02 Compile state/request/wait idle completed with evidence; 5C-03 and 5C-04 remain incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending.
- **Verification Evidence:** partial: `unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml` 保留为 Phase 5A-06 pre-redesign historical evidence，结果为 `result="Passed"`、`total="64"`、`passed="64"`、`failed="0"`；5A-06 final evidence 为 `unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml`，结果为 `result="Passed"`、`total="78"`、`passed="78"`、`failed="0"`，evidence names 包含 `StopWaitsForAcceptReservationBeforeClosingListener`、`StopRequestsWakeAndSignalsListenerLoopExited`、`CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope`、`IncompleteAcceptedOperationBodyDoesNotBlockFinalClose`、`WakeFallbackDoesNotCloseGuaranteedStoppedWrite`、`ReadChunkWithTimeoutTreatsSignaledReadAsCompleteWithoutCallback`、`HttpPendingDispatchOnReloadReturnsStoppedEnvelope`、`HttpPendingDispatchOnEditorQuittingReturnsStoppedEnvelope`；task 4.2 final re-verification、spec compliance review 和 code quality review 均已通过。5A-07/5A-08 + hardening final TS evidence 为 `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts`，结果为 `tests 65`、`pass 65`、`fail 0`；最终 Unity `HostRuntimeTests` evidence 为 `total="82"`、`passed="82"`、`failed="0"`；最终 Unity `HostRuntimeVerticalSmokeTests` evidence 为 `total="1"`、`passed="1"`、`failed="0"`；Node vertical smoke stdout 为 `tests 1`、`pass 1`、`fail 0`。Evidence covers registry validation、active probe validation、operation envelope mapping、bounded pre-operation rebind、in-flight no replay、post-response stale/restarted classification、diagnostic priority、timeout layering、TS envelope trust boundary、dispatch timeout claim race、`/operations` body read bounds、optional result field preservation，以及 HostRuntimeTests、phase5a-vertical-smoke.test.ts、HostRuntimeVerticalSmokeTests、host.threadCheck、captured Unity main thread、non-blocking pending dispatch hook、old hostId / hostEpoch continuity is invalidated、lost or rebind decision 和 host cleanup。Scope check 输出 `PASS Phase 5A hardening scope boundary`，确认未把 Phase 5A 扩大为 MCP public tool registration/export/action-dispatch wiring、`/unity` skill、artifact/resource store、workflow timeout 或 final daily loop E2E。Docs check 输出 `PASS Phase 5A hardening docs`，确认 hardening 文本、explicit folded 5A-04 wording 和 continued `partial | continue-5b` roadmap state；`git diff --check` 无输出。Phase 5A remains completed。Additional 5C-02 evidence: `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `pass 113` and `fail 0`; `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-compile-state-request-idle.xml` recorded `total="11"`、`passed="11"`、`failed="0"`; scope boundary confirmed no public MCP tools / registration / action-dispatch surface, no MCP Resource handlers, no `/unity` skill, no console diagnostics/workflows, no compile report / collector / `compile_and_check`, no Phase 5D test/playmode/screenshot workflows, and no Phase 5E final daily loop E2E files; `git -c core.autocrlf=false diff --check` passed with no output.

**Next Manual Action:** 5C-02 Compile state/request/wait idle completed；下一步创建并审查 5C-03 compile report + `compile_and_check` attribution 的 expanded execution plan。Phase 5C remains incomplete because 5C-03 和 5C-04 尚未完成。Phase 5 remains incomplete because Phase 5C、Phase 5D、Phase 5E and final daily loop E2E remain pending。

---

### Phase 6：Project Editor Command Registry 增强

**Status:** `not-started`

**Goal:**
强化项目级 Editor Command Registry，使其成为项目自定义能力的安全扩展层。

**Scope:**

Public tools/actions：

```text
unity_project_command.list
unity_project_command.invoke
unity_project_command.get_status
unity_project_command.get_result
```

注册 metadata：

```text
name
description
category
inputSchema
sideEffectLevel
executionKind: immediate | job
requiresConfirmation
supportsDryRun
verificationHint
```

Skill recipe landing strategy：

Phase 6 负责为 project command recipe 决定 landing strategy：

```text
extend_unity_entry
create_domain_skill
defer
reject
```

默认选择 `extend_unity_entry`；只有当 project command 生态需要独立上下文、长示例或复杂风险规则时，Phase 6 spec 才能选择 `create_domain_skill`。

若 Phase 6 决定实现 project command recipe，必须详细设计：

- command discovery；
- metadata 检查；
- `list` / `invoke` / `get_status` / `get_result` 调用顺序；
- destructive command 的 confirmation / dryRun 规则；
- `verificationHint` 执行规则；
- project command report 或 diagnostics 的返回规则。

Skill 调用规则：

- 标准 tool 可完成时，优先标准 tool。
- 只有项目特定能力才使用 project command。
- destructive command 必须确认或 dryRun。
- schema/description 不清楚时不得猜测调用。
- invoke 后必须按 verificationHint 验证。

Artifact 预留：

```text
project_command_report
```

**Out of Scope:**

- 不把所有标准 Unity 操作迁移成项目命令。
- 不允许项目命令绕过 public tool 安全规则。
- 不一次性实现大量示例 command。

**Reference Input Mapping:**

- `unity-mcp-v2`：现有 `editor.command.list/invoke`。
- Unity 项目现实：自定义生成器、菜单、Addressables、资源管线、校验器。

**Success Criteria:**

- 项目命令可发现、可理解、可验证。
- Claude 可以根据 metadata 判断风险。
- Project command 不导致 public tool surface 膨胀。
- Project command metadata 可参与 skill/schema consistency audit。
- Project command recipe landing strategy 已明确为 `extend_unity_entry`、`create_domain_skill`、`defer` 或 `reject`。
- 若实现 project command recipe，其内容与 project command metadata、safety 和 `verificationHint` 对齐。
- Project command recipe 不绕过标准 public tool safety。

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

---

### Phase 7：简单创作 vertical slice

**Status:** `not-started`

**Goal:**
在高频日常闭环之后，实现一个最小但完整的 Unity 创作闭环。

**Scope:**

P1 创作闭环：

```text
创建对象
→ 添加组件
→ 创建材质
→ 应用材质
→ 截图
→ 验证对象状态
```

Skill recipe landing strategy：

Phase 7 负责为创作 vertical slice recipe 决定 landing strategy：

```text
extend_unity_entry
create_domain_skill
defer
reject
```

默认选择 `extend_unity_entry`；只有当创作 recipe 需要独立上下文、长示例或复杂风险规则时，Phase 7 spec 才能选择 `create_domain_skill`。

若 Phase 7 决定实现创作 recipe，recipe 必须引用 Phase 7 已设计或实现的 stable public tool/action，并包含验证路径。

涉及 tools/actions：

```text
unity_scene.get_info
unity_scene.get_hierarchy
unity_scene.create
unity_scene.save

unity_object.find
unity_object.snapshot
unity_object.create
unity_object.set_transform
unity_object.delete

unity_component.list
unity_component.get
unity_component.add
unity_component.set_property

unity_material.create
unity_material.assign
unity_material.get_properties
unity_material.set_property
unity_material.find_shader

unity_validation.check_scene
```

写 action 的成功语义：

- `object.create`：对象存在，路径匹配，snapshot 可读。
- `component.add`：目标存在，组件存在，类型解析明确。
- `material.create`：材质 asset 存在，可读取属性。
- `material.assign`：Renderer slot 确认已更新。
- `object.delete`：目标明确，支持 confirm/dryRun，删除后 find 不存在。

Artifact 按需实现：

```text
validation_report
compile_report
```

**Out of Scope:**

- 不实现所有材质/shader 高级能力。
- 不实现 light、animation、asset、prefab 全量能力。
- 不实现复杂场景生成器。

**Reference Input Mapping:**

- `Unity-Skills`：
  - CreateGameObject
  - AddComponent
  - CreateMaterial
  - SetMaterial
- `unity-mcp-v2`：
  - hierarchy/component/screenshot/snapshot 相关能力。

**Success Criteria:**

- Claude 可以通过 skill recipe 完成“创建一个带组件和材质的对象”。
- 每个写操作均可验证。
- 截图或 snapshot 能证明 Unity 状态变化。
- 失败场景不会假成功。
- Safety model 中的 `targetStrictness` / `overwritePolicy` 已按本 phase 需要补充。
- 创作 recipe landing strategy 已明确为 `extend_unity_entry`、`create_domain_skill`、`defer` 或 `reject`。
- 若实现创作 recipe，该 recipe 能指导 Claude 完成简单创作 vertical slice。
- 创作 recipe 与 object/component/material/screenshot/validation public schema 和验证路径对齐。

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

---

### Phase 8：扩展能力池

**Status:** `not-started`

**Goal:**
在核心闭环和简单创作闭环稳定后，维护候选扩展域池，并按用户确认逐个推进。

**Scope:**

Phase 8 不是一次性实现所有候选工具域。每个候选域进入实现前必须有独立 spec、plan 和验证策略。

Skill recipe landing strategy：

Phase 8 中每个被选扩展域进入 spec 时，必须同时决定对应 recipe landing strategy：

```text
extend_unity_entry
create_domain_skill
defer
reject
```

若选择 project command 路径，必须在 recipe 中以 explicit entry 或 strict fallback 表达，不得作为绕过 standard public tools 的入口。

`unity_ui` 的详细 recipe landing strategy 和 recipe 细节属于 Phase 8；不得在 Phase 2 承诺 `unity_ui` public actions 已存在。

候选域：

```text
unity_asset
unity_prefab
unity_ui
unity_animation
unity_validation 增强
```

候选 actions：

`unity_asset`：

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

`unity_prefab`：

```text
get_info
instantiate
save_from_object
apply_overrides
revert_overrides
unpack
```

`unity_ui`：

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

`unity_animation`：

```text
create_controller
get_controller
add_parameter
set_parameter
play_state
create_clip
```

`unity_validation`：

```text
check_scene
check_assets
find_missing_scripts
find_missing_references
cleanup_empty_folders
```

每个能力域需决定归属：

- 标准 public tool；
- project command；
- skill recipe；
- workflow；
- 暂缓；
- rejected。

**Out of Scope:**

- 不保证一个 phase 完成所有扩展域。
- 不支持任意 Unity API 调用。
- 不跳过验证闭环。
- 不把 `invoke_method` 类能力作为绕过 schema 的万能口。

**Reference Input Mapping:**

- `Unity-Skills`：Asset、Prefab、UI、Animator、Validation 等领域词表。
- `unity-mcp-v2`：已有 prefab、asset、ui、validation 基础能力。

**Success Criteria:**

Phase 8 的完成条件不是完成所有候选能力域，而是：

1. 根据用户确认选择至少一个扩展域 vertical slice；
2. 为该扩展域完成独立 spec、plan、implementation 和 verification；
3. 为剩余候选域记录去向：pending、deferred、project command、standard public tool 或 rejected。
4. 每个被选扩展域都有对应 recipe landing strategy 决策：`extend_unity_entry`、`create_domain_skill`、`defer` 或 `reject`。
5. 若选择 UI 扩展域并实现 recipe，该 recipe 与 `unity_ui` public schema、verification path 和 safety metadata 对齐。

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

---

### Phase 9：验证、文档与迁移收口

**Status:** `not-started`

**Goal:**
收口 Unity Agent Kit 的测试、文档、skills、public schema、Resources 和命名迁移策略。

**Scope:**

Actual skill files：

- 审计已有 actual skill files，不负责首次创建核心 `/unity` skill；
- 验证核心 `/unity` actual skill 已由早期 phase 创建；
- 验证 actual skill executable recipe steps 只引用 stable public tool/action；
- 验证 handoff / `requiredCapabilities` 中的 candidate 引用不会作为执行步骤；
- 验证 skill 文件符合 context budget，不内联完整 schema、长示例或大型结果。

测试：

- public tool schema tests；
- action semantics tests；
- async/job behavior tests；
- internal operation mapping tests；
- artifact resource tests；
- Editor Command Registry metadata tests；
- Unity EditMode host service tests；
- E2E MCP verification；
- skill recipe verification。

文档：

- Unity Agent Kit overview；
- public tools reference；
- action semantics guide；
- skill authoring guide；
- project command registration guide；
- async/job behavior guide；
- artifact/resource guide；
- migration guide。

Skill/schema consistency audit：

- 扫描 skill Markdown 文件中的 `yaml` fenced block；
- 解析顶层 `recipe:` block；
- recipe 中引用的 `tool` / `action` 存在；
- executable recipe step 引用的 `tool` / `action` 在 catalog 中为 `stable`；
- handoff / `requiredCapabilities` 中的 candidate 引用格式正确，且不作为执行步骤；
- recipe 中的 `paramsExample` 通过 public schema；
- recipe 中的 `verificationPath` 存在且语义匹配；
- recipe safety 描述与 `sideEffectLevel`、`confirmationPolicy`、`dryRunMode` 不冲突；
- public tool/action catalog、public tool 文档与实际注册一致；
- action 完成语义在 tool description 与 skill 中不冲突。

迁移：

- 是否从 `unity-mcp-v2` 收敛为 `unity-agent-kit`；
- 是否保留 legacy direct-operation tools；
- 是否提供兼容期；
- 是否保留 `unity-mcp-v2` 作为内部 runtime 名称。

**Out of Scope:**

- 不新增大型能力域。
- 不负责首次创建核心 `/unity` actual skill。
- 不做无关重构。
- 不在验证证据不足时标记 roadmap completed。

**Reference Input Mapping:**

- `unity-mcp-v2`：plugin packaging、doctor/install、测试体系。
- `Unity-Skills`：skill 文档和领域导航参考。

**Success Criteria:**

- 每个 public action 有测试或明确验证策略。
- 高频 action 语义有文档。
- 每个 skill recipe 至少有一个验证路径。
- Project command metadata 有校验。
- Artifact/resource 语义有测试和文档。
- 已有 actual skill files 与 public tool/action catalog、schema、docs 不漂移。
- 核心 `/unity` actual skill 已由早期 phase 创建并通过 audit。
- schema、skills、文档不漂移。
- 命名和迁移策略明确。

**Artifacts:**
- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

## Pending Proposals

- 无。

## Proposal Rules

以下变更需要先生成 Proposal Brief 并经用户批准：

- 修改 Goal。
- 修改 Non-goals。
- 修改 Shared Constraints。
- 将实现基线从 v2 改为全新实现。
- 将 public tool 策略改回“一 operation 一 MCP tool”。
- 将长流程 workflow 编排移入 Unity C# host。
- 移除 skill-guided 调用体系。
- 移除 Editor Command Registry。
- 移除 artifact/report Resources。
- 新增、删除、合并、拆分或重排 phase。
- 将高频日常闭环从首批实现中移除。
- 将 Phase 8 从扩展能力池改为一次性实现所有候选域。

以下事实更新不需要 Proposal Brief：

- 回填 artifact 路径。
- 标记 artifact missing。
- 更新 Last Sync。
- 添加 blocker。
- 记录 Verification Evidence。
- 追加 Change Log。
- 最终验收通过后的事实性 roadmap 同步，仅限验收同步规则允许的字段。

## Sync Rules

- `ROADMAP.md` 是长期 current truth。
- spec 保存阶段设计。
- plan 保存阶段实现计划。
- implementation summary 只记录阶段结果，不写详细实现步骤。
- verification evidence 必须具体，包括测试命令、MCP 调用、Unity 测试或可验证输出。
- 不从聊天记忆推断完成度。
- 链接 artifact 路径缺失时，不推进 phase 状态。
- 验收同步不得修改 Goal、Non-goals、Shared Constraints、整体 Success Criteria、phase scope、phase success criteria 或 phase 顺序。

## Handoff Rules

- `write-spec`：为当前 phase 生成 Spec Discussion Brief，并建议手动调用 `/superpowers:brainstorming`。
- `write-plan`：已有 spec 后生成 plan handoff，并建议手动调用 `/superpowers:writing-plans`。
- `implement-plan`：已有 plan 后生成 execution handoff，并建议手动调用 `/superpowers:subagent-driven-development` 或 `/superpowers:executing-plans`。
- `complete-phase`：只有在 Verification Evidence 具体且 phase success criteria 满足时，才能标记 phase completed。
- 不自动实现代码。
- 不自动调用其他技能。

## Change Log

- 2026-05-27：记录 5C-03 Compile report + compile_and_check attribution partial completion evidence。TS focused verification `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` 通过并输出 `tests 129`、`pass 129`、`fail 0`；Unity focused verification `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report-compile-and-check.xml` 记录 `total="27"`、`passed="27"`、`failed="0"`；Unity HostRuntime regression verification `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-host-runtime-regression.xml` 记录 `total="82"`、`passed="82"`、`failed="0"`；scope boundary 保持 no public MCP tools / registration / action-dispatch surface、no MCP Resource handlers、no `/unity` skill、no console diagnostics/workflows、no Phase 5D test/playmode/screenshot workflows、no Phase 5E final daily loop E2E files；`git -c core.autocrlf=false diff --check` 无输出。5C-03 Compile report + compile_and_check attribution completed with evidence; 5C-04 remains incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending。
- 2026-05-25：记录 5C-02 Compile state/request/wait idle partial completion evidence。TS focused verification `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` 通过并输出 `pass 113`、`fail 0`；Unity focused verification `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-compile-state-request-idle.xml` 记录 `total="11"`、`passed="11"`、`failed="0"`；scope boundary 保持 no public MCP tools / registration / action-dispatch surface、no MCP Resource handlers、no `/unity` skill、no console diagnostics/workflows、no compile report / collector / `compile_and_check`、no Phase 5D test/playmode/screenshot workflows、no Phase 5E final daily loop E2E files；`git -c core.autocrlf=false diff --check` 无输出。5C-02 Compile state/request/wait idle completed with evidence; 5C-03 and 5C-04 remain incomplete; Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E remain pending。
- 2026-05-24：完成 Phase 5C-01 Editor status/readiness evidence sync，记录 TS focused verification `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` 通过并输出 `tests 98`、`pass 98`、`fail 0`；Unity focused verification `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-01-editor-status-readiness.xml` 记录 `passed="3"`、`failed="0"`；scope boundary 保持 no public MCP tools、no MCP Resource handlers、no `/unity` skill、no compile diagnostics file、no console diagnostics file；`git -c core.autocrlf=false diff --check` 无输出。Phase 5C remains incomplete because 5C-02、5C-03 and 5C-04 remain pending；Phase 5 remains incomplete because Phase 5C、Phase 5D、Phase 5E and final daily loop E2E remain pending。
- 2026-05-22：统一 Unity Agent Kit 显式测试输出路径：Unity Test Runner 结果 XML、临时 evidence 和测试 fixture 写入 repo 根目录 `.ai-debug/unity-agent-kit/test-results/` 或 `.ai-debug/unity-agent-kit/<feature>/`，避免 `-projectPath unity` 搭配 `-testResults unity/Library/...` 生成 `unity/unity/...`；Unity 自管 `Library/`、`Temp/`、`Logs/` 不移动。
- 2026-05-22：完成 Phase 5B Artifact / Resource / Timeout / Completion 基础设施，覆盖 typed resource/job/nextStep public-result contract、deterministic artifact metadata layout、safe Resource URI parsing、safe relative path resolution、internal file-backed Resource readback、generic content validity、timeout continuation helper、completion semantics helpers 和 Unity internal artifact contract smoke。TS evidence 命令 `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts tests/host-runtime.test.ts` 通过并输出 `fail 0`；Unity `HostRuntimeArtifactTests` 和 `HostRuntimeTests` regression 均通过并输出 `failed="0"`；scope boundary 保持 no public MCP tools、no MCP Resource handlers、no `/unity` skill、no validation-reports readback、no real screenshot/test/console workflow、no final daily loop E2E。Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。
- 2026-05-22：记录 Phase 5A Host Runtime hardening，作为 Phase 5A completed 后、Phase 5B 前的补丁 evidence；覆盖 TS envelope trust boundary、Unity dispatch timeout claim race、`/operations` body read bounds、optional result field preservation 和 docs cleanup。final verification 通过：TS tests `tests 65`、`pass 65`、`fail 0`；Unity `HostRuntimeTests` `total="82"`、`passed="82"`、`failed="0"`；Unity vertical smoke `total="1"`、`passed="1"`、`failed="0"`；Node vertical smoke stdout `tests 1`、`pass 1`、`fail 0`；scope/docs checks 分别输出 `PASS Phase 5A hardening scope boundary` 和 `PASS Phase 5A hardening docs`；`git diff --check` 无输出。Phase 5A remains completed；Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
- 2026-05-21：完成 Phase 5A-08 Vertical smoke + completion evidence，覆盖 `5A-EVIDENCE-01`、`5A-EVIDENCE-02`、`5A-EVIDENCE-03`、`5A-EVIDENCE-04`。TS non-live evidence `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` 通过，`tests 60`、`pass 60`、`fail 0`；Unity `HostRuntimeTests` 通过，`total="78"`、`passed="78"`、`failed="0"`；Unity `HostRuntimeVerticalSmokeTests` 通过，`total="1"`、`passed="1"`、`failed="0"`，并由 Unity 启动真实 loopback host、运行 `phase5a-vertical-smoke.test.ts`、验证 `host.threadCheck` 在 captured Unity main thread 执行、TS 映射 envelope/public result/MCP payload、Unity 停止 host 并验证 cleanup。Phase 5A completed；Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
- 2026-05-21：完成 Phase 5A-07 TS registry/probe/invoke/rebind classification，实现 strict registry validation、active probe validation、low-level Node HTTP transport seam、single trusted operation envelope mapping、bounded pre-operation rebind、in-flight no replay、post-response stale/restarted classification、diagnostic priority 和 timeout layering；验证命令 `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` 通过，结果 `tests 60`、`pass 60`、`fail 0`；textual scope guard 输出 `PASS 5A-07 scope guard`，确认未创建 vertical smoke、`/unity` skill 或 MCP public tool registration/export/action-dispatch wiring；最终整体审查 PASS。Phase 5A 后续由 2026-05-21 Phase 5A-08 completion entry 关闭；Phase 5 仍不标记 completed。
- 2026-05-21：完成 Phase 5A-06 task 4.2 loopback shutdown redesign 实现与文档回填。`unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml` 已验证 `result="Passed"`、`total="78"`、`passed="78"`、`failed="0"`；关键 evidence names 包含 `StopWaitsForAcceptReservationBeforeClosingListener`、`StopRequestsWakeAndSignalsListenerLoopExited`、`CompleteReadableAcceptedOperationTransfersToGuaranteedOwnershipBeforeStoppedEnvelope`、`IncompleteAcceptedOperationBodyDoesNotBlockFinalClose`、`WakeFallbackDoesNotCloseGuaranteedStoppedWrite`、`ReadChunkWithTimeoutTreatsSignaledReadAsCompleteWithoutCallback`、`HttpPendingDispatchOnReloadReturnsStoppedEnvelope`、`HttpPendingDispatchOnEditorQuittingReturnsStoppedEnvelope`。task 4.2 final re-verification、spec compliance review 和 code quality review 均通过；scope guard 维持 clean，未创建 TS host client、vertical smoke、MCP/public action 文件；历史证据 `unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml` 继续保留为 pre-redesign evidence。Phase 5A 后续由 2026-05-21 Phase 5A-07 和 Phase 5A-08 completion entries 关闭；Phase 5 仍不标记 completed。
- 2026-05-21：Phase 5A-06 选择 C direction：task 4.1 patch loop 暂停；repeated repair/review failures 暴露 loopback shutdown architecture-level boundary issue，必须先完成 plan task 4.2 architecture redesign checkpoint，明确 strict shutdown state/boundaries、accept reservation before `GetContext`、deterministic wake、listener-loop-exited signal、background closer、nonblocking Unity main thread、active handlers + async writes stable drain，并用 red tests、完整 `HostRuntimeTests`、spec review 和 code-quality review 验证后才能恢复实现与 completion wording。`unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml` 继续保留为 pre-redesign historical evidence；redesigned implementation final evidence path 保持 `unity/Library/UnityAgentKit/Phase5A06Task41StopWindowRemediationResults.xml`。Phase 5A/Phase 5 不标记 completed。
- 2026-05-20：历史记录（pre-remediation，后续结论已被 2026-05-21 reopened entry superseded）：曾记录 Phase 5A-06 Main-thread dispatch + host-level timeout 初始完成，覆盖 `5A-DISPATCH-01`、`5A-DISPATCH-02`、`5A-OPS-02`、`5A-TIMEOUT-01`、`5A-TIMEOUT-02`；记录官方 Unity 证据 `unity/Library/UnityAgentKit/Phase5A06MainThreadDispatchTimeoutResults.xml` total 64、passed 64、failed 0，evidence names 包含 `HostThreadCheckOverOperationsRunsOnCapturedMainThread`、`DispatchExceptionReturnsStructuredDiagnostics`、`PendingDispatchTimeoutReturnsHostTimeout`、`PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler`、`PendingDispatchTimeoutMarksMayStillBeRunning`、`StopFailsPendingDispatchWork`、`StopFailsPendingWorkWithStoppedDiagnostic`、`ReloadStopFailsPendingWorkWithoutTimeoutStatus`、`ExpiredDispatchWorkDoesNotExecuteLater`；当时的“最终整体代码审查通过”与“可以合并：是”判断现已被 2026-05-21 reopened entry superseded，当前状态以后续 reopened entry 和 Current State 为准；scope guard clean，未创建 `plugins/unity-agent-kit/src/host`、`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`、`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`；Phase 5A 后续由 2026-05-21 completion entries 关闭，5A-04 已 folded into 5A-03。
- 2026-05-20：完成 Phase 5A-05 POST `/operations` envelope + router，覆盖 `5A-DTO-02`、`5A-HTTP-02`、`5A-HTTP-03`、`5A-OPS-01`、`5A-OPS-02`；记录官方 Unity 证据 `unity/Library/UnityAgentKit/Phase5A05OperationsRouterResults.xml` total 48、passed 48、failed 0，最终 code review 为 PASS；Phase 5A 后续由 2026-05-21 completion entries 关闭，5A-04 已 folded into 5A-03。
- 2026-05-19：完成 Phase 5A-03 Host bootstrap + lifecycle cleanup + GET /probe HTTP contract，覆盖 `5A-LIFE-01`、`5A-LIFE-02`、`5A-REG-02`、`5A-HTTP-01`、`5A-HTTP-03`；记录官方 Unity 证据 `unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml` total 33、passed 33、failed 0，最终 code review 为 PASS；Phase 5A 后续由 2026-05-21 completion entries 关闭，5A-04 已 folded into 5A-03。
- 2026-05-19：完成 Phase 5A-02 Unity DTO + registry contract，记录官方 Unity 证据 `HostRuntimeTests` total 15、passed 15、failed 0；Phase 5A 后续由 2026-05-21 completion entries 关闭；历史下一步为创建并审查 Phase 5A-03 strict execution plan。
- 2026-05-19：完成 Phase 5A-01 TS result + MCP mapping foundation，记录 TS 测试证据 `tests 12`、`pass 12`、`fail 0` 和 code review PASS；Phase 5A 仍未完成，下一步创建并审查 Phase 5A-02 strict execution plan。
- 2026-05-18：完成 Phase 5 split design、plan index 和 5A Host Runtime technical contract；Phase 5 进入 split-plan `planned` 状态，5A execution index 作为执行入口，下一步创建并审查 Phase 5A-01 strict execution plan。
- 2026-05-18：完成 Phase 4 Async / Job / Workflow / Artifact Semantics，记录 verification evidence，并将当前阶段推进到 Phase 5 `needs-spec`。
- 2026-05-17：完成 Phase 4 Async / Job / Workflow / Artifact Semantics spec 和 plan artifact 接入；Phase 4 进入 `planned`，下一步为 `implement-plan`。
- 2026-05-17：完成 Phase 3 Public MCP Tool Action Design，记录 verification evidence，并将当前阶段推进到 Phase 4 `needs-spec`。
- 2026-05-17：完成 Phase 3 Public MCP Tool Action Design spec 和 plan artifact 接入；Phase 3 进入 `planned`，下一步为 `implement-plan`。
- 2026-05-17：批准并同步 actual skill materialization 与 skill/tool context budget roadmap 澄清；Phase 5 首次创建最小 actual `/unity` skill，Phase 9 只审计已有 skill。
- 2026-05-17：完成 Phase 2 Unity Agent Skill 体系设计，记录 verification evidence，并将当前阶段推进到 Phase 3 `needs-spec`。
- 2026-05-17：完成 Phase 2 Skill 体系设计 spec 和 plan artifact 接入；Phase 2 进入 `planned`，下一步为 `implement-plan`。
- 2026-05-17：批准 Phase 2 skill 类型和批次划分修正 proposal；Phase 2 聚焦 P0 daily loop recipe contract，并将 project command、creation、UI/extension recipe 责任分别交接给 Phase 6、Phase 7、Phase 8。
- 2026-05-17：完成 Phase 1 架构与边界蓝图，记录规格验证证据，并将当前阶段推进到 Phase 2 `needs-spec`。
- 2026-05-16：创建 Unity Agent Kit roadmap。
- 2026-05-16：确认基于 `unity-mcp-v2` 演进，不全新重写。
- 2026-05-16：确认 public MCP tools 与 internal operations 分离。
- 2026-05-16：确认 public tool 命名采用 `unity_compile` 风格。
- 2026-05-16：确认 skills 采用任务型优先、能力型辅助，不照搬 Unity-Skills。
- 2026-05-16：确认高频日常闭环优先于全量创作能力。
- 2026-05-16：确认 public action 完成语义以用户期望结果为准。
- 2026-05-16：确认 TS 层负责 workflow 编排和最终判定，Unity C# 层负责短动作、状态与产物记录。
- 2026-05-16：确认 compiler messages 是编译成功判定主依据，Console cursor 是补充诊断机制。
- 2026-05-16：确认 Resources 首版只用于 artifacts/reports。
- 2026-05-16：确认统一 artifact model。
- 2026-05-16：确认 safety model 首版采用核心字段并延后扩展 target/overwrite 规则。
- 2026-05-16：确认 Phase 8 是扩展能力池。
- 2026-05-16：确认采用半自动 skill/schema 防漂移检查。
- 2026-05-16：按最新 roadmap-management 规范同步 Phase Summary 和 Phase 1 spec/plan artifact 映射。
