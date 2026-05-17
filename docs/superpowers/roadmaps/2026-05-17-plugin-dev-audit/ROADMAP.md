# plugin-dev 文档与组件校验路线图

## Metadata

- **Roadmap:** plugin-dev-audit
- **Status:** active
- **Created:** 2026-05-17
- **Last Sync:** 2026-05-17
- **Owner:** user
- **Roadmap Path:** `docs/superpowers/roadmaps/2026-05-17-plugin-dev-audit/ROADMAP.md`
- **Target:** `plugins/plugin-dev/`

## Goal

对 `plugins/plugin-dev/` 做系统化审计与修复，确保其作为 Claude Code plugin development 工具包时：

1. 中文文档主体自然、一致，不过度翻译；
2. 关键触发区保留中英文用户可能说法，避免不自然中英混排；
3. `agents/`、`commands/`、`skills/` 的 frontmatter、触发描述、权限边界、工作流说明符合 Claude Code plugin 约定；
4. 所有 Markdown 文档经过逐文档校验，`references/`、`examples/`、`scripts/README.md` 不被遗漏；
5. shell/json 支撑文件完成引用正确性、安全性和示例可运行性抽查；
6. 修复后有明确验证证据，可用于后续发布或继续迭代。

## Non-goals

- 不重新设计 `plugin-dev` 的产品定位或对外功能范围。
- 不新增新的 plugin 组件、CLI 命令、schema validator 或后台机制。
- 不把 shell scripts 和 JSON examples 纳入完整逐文件代码审计；它们只做引用、安全和示例可运行性抽查。
- 不要求把所有英文自然语言移除；必要英文触发短语、命令、字段名、API 名、路径、代码标识符应保留。
- 不从聊天记忆推断完成度；完成状态必须基于文件内容和验证证据。

## Shared Constraints

- 中文文档主体统一中文；英文仅保留在必要触发短语、命令、字段名、API 名、状态枚举、路径、代码标识符、产品术语和用户可能实际输入的短语中。
- 关键触发区采用双语覆盖：`description`、agent examples、关键指南中同时覆盖英文和中文用户可能说法。
- 避免不自然混排，例如 `Use this agent when 触发` 这类句式应改为自然中文或清晰双语结构。
- 对 `commands/*.md` 的正文，保持“写给 Claude 的指令”，不要改成面向用户的说明页。
- 对 `agents/*.md`，保留 `Use this agent when...` 触发意图，但中文说明和 examples 应自然、清晰。
- 对 `skills/*/SKILL.md`，保持渐进式披露；不要把 references 的详细内容塞回核心 `SKILL.md`。
- 修改应外科手术式进行：只修与审计发现直接相关的问题，不做无关重构。
- 所有变更都必须能追溯到审计标准、具体文件问题或验证失败。
- 不自动提交 git，不自动创建 PR。

## Success Criteria

- 已建立覆盖所有目标 Markdown 的审计矩阵。
- `plugins/plugin-dev/` 下所有 Markdown 均完成逐文档校验：
  - 顶层 `docs/`
  - `commands/*.md`
  - `agents/*.md`
  - `skills/*/SKILL.md`
  - `skills/*/references/*.md`
  - `skills/*/examples/*.md`
  - `skills/*/scripts/README.md`
- 关键组件入口完成结构校验：
  - `.claude-plugin/plugin.json`
  - 4 个 commands
  - 3 个 agents
  - 10 个 skills
- 审计发现按 `critical / major / minor` 分类，并完成应修复项。
- 中文化修复符合已确认标准：中文主体 + 关键触发区双语化。
- shell/json 支撑文件完成引用、安全和示例可运行性抽查，并修复相关文档引用问题。
- 已运行必要验证命令或静态检查，并记录输出作为完成证据。
- Roadmap 当前 phase 的 `Verification Evidence` 已覆盖该 phase 的 success criteria。

## Decisions

- 2026-05-17: Roadmap 目标选择“审计 + 修复”，不是只产出报告。
- 2026-05-17: “逐文档校验”覆盖所有 Markdown；shell/json 只做引用、安全和示例可运行性抽查。
- 2026-05-17: 英文处理标准采用“中文主体 + 关键触发区双语化”。
- 2026-05-17: Phase strategy 采用“先建立审计矩阵，再按风险修复”。

## Current State

- **Current Phase:** Phase 1 — 审计标准与文件矩阵
- **Next Manual Action:** `/superpowers:roadmap-management progress docs/superpowers/roadmaps/2026-05-17-plugin-dev-audit/ROADMAP.md`
- **Summary:** 已通过 discovery 确认目标、范围、英文保留标准和 phase strategy；roadmap 已创建，下一步进入 Phase 1 spec discussion。

## Blockers

- 无。

## Phase Summary

| Phase | Status | Goal | Spec | Plan | Verification | Next |
|-------|--------|------|------|------|--------------|------|
| Phase 1 — 审计标准与文件矩阵 | needs-spec | 定义校验标准并建立全量 Markdown 文件矩阵 | pending | pending | pending | write-spec |
| Phase 2 — 组件入口审计 | not-started | 审计 manifest、commands、agents、skills 入口文件 | pending | pending | pending | write-spec |
| Phase 3 — 支撑文档审计 | not-started | 逐文档审计 docs、references、examples、scripts README | pending | pending | pending | write-spec |
| Phase 4 — 优先级修复 | not-started | 按 critical / major / minor 修复审计发现 | pending | pending | pending | write-spec |
| Phase 5 — 验证与完成证据 | not-started | 运行验证、记录 evidence、确认 plugin-dev 质量门通过 | pending | pending | pending | write-spec |

## Phase Details

### Phase 1 — 审计标准与文件矩阵

**Status:** needs-spec

**Scope:**

- 建立本次审计的可执行标准：
  - 中文主体标准；
  - 关键触发区双语化标准；
  - agent description / examples 标准；
  - skill description / progressive disclosure 标准；
  - command 指令风格标准；
  - 文档示例安全标准；
  - shell/json 抽查标准。
- 生成覆盖所有目标 Markdown 的文件矩阵。
- 标记每个文件的类别、预期检查重点和是否需要后续修复。
- 明确哪些 shell/json 文件只做抽查，以及抽查维度。

**Out of Scope:**

- 不直接大规模改写文档。
- 不开始修复具体 agent、command、skill 问题。
- 不新增验证脚本。

**Success Criteria:**

- 文件矩阵覆盖 `plugins/plugin-dev/` 下所有目标 Markdown。
- 每类文件都有明确检查标准。
- shell/json 抽查范围和抽查维度已列明。
- 审计结果分类标准 `critical / major / minor` 已定义。

**Artifacts:**

- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

### Phase 2 — 组件入口审计

**Status:** not-started

**Scope:**

- 审计 `.claude-plugin/plugin.json`：
  - metadata 是否准确；
  - description 是否自然；
  - keywords、repository、homepage 等是否合理。
- 审计 `commands/*.md`：
  - frontmatter 字段；
  - `allowed-tools` 是否必要且有安全说明；
  - command 是否写给 Claude；
  - 工作流阶段是否存在跳步、过度授权、缺少确认点。
- 审计 `agents/*.md`：
  - `name`、`description`、examples、model、color、tools、skills；
  - 触发描述是否自然双语；
  - 是否存在不支持字段；
  - system prompt 是否清晰、不过度泛化。
- 审计 `skills/*/SKILL.md`：
  - description 是否具体且不过长；
  - 触发覆盖是否中英文合理；
  - 正文是否自然中文；
  - progressive disclosure 是否合理；
  - references/examples/scripts 引用是否准确。

**Out of Scope:**

- 不逐段修复 references/examples 的具体内容；这属于 Phase 3 和 Phase 4。
- 不改变组件数量和插件整体功能范围。

**Success Criteria:**

- manifest、4 个 commands、3 个 agents、10 个 `SKILL.md` 均有审计记录。
- 已识别 critical / major / minor 问题。
- 与组件入口相关的修复候选项已明确。
- 不自然混排、触发覆盖缺口、frontmatter 风险已分类记录。

**Artifacts:**

- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

### Phase 3 — 支撑文档审计

**Status:** not-started

**Scope:**

- 逐文档审计：
  - `plugins/plugin-dev/docs/*.md`
  - `plugins/plugin-dev/skills/*/references/*.md`
  - `plugins/plugin-dev/skills/*/examples/*.md`
  - `plugins/plugin-dev/skills/*/scripts/README.md`
- 检查内容：
  - 是否过度翻译或不自然中英混排；
  - 术语是否一致；
  - 示例是否安全；
  - `!` / `[BANG]` 约定是否按上下文正确使用；
  - 路径、命令、字段名是否准确；
  - 是否有事实漂移或与入口 `SKILL.md` 冲突；
  - reference/example 是否与 progressive disclosure 目标匹配。
- 对 shell/json 文件做抽查：
  - 被文档引用的脚本路径是否存在；
  - shell 示例是否明显存在注入风险或不可移植风险；
  - JSON 示例是否与文档描述一致；
  - 不做完整代码审计。

**Out of Scope:**

- 不重写整个参考文档体系。
- 不把 references 合并回 `SKILL.md`。
- 不为每个 shell/json 文件建立完整单元测试。

**Success Criteria:**

- 所有目标 Markdown 都有审计结论。
- 每个发现都能追溯到具体文件和问题类型。
- 支撑文档中影响用户复制使用的关键示例问题已标记为 high priority。
- shell/json 抽查发现已记录，必要修复项进入 Phase 4。

**Artifacts:**

- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

### Phase 4 — 优先级修复

**Status:** not-started

**Scope:**

- 修复 Phase 2 和 Phase 3 中确认的 critical / major 问题。
- 按需修复 minor 问题，前提是不会扩大范围或引入无关重写。
- 重点修复：
  - 不自然中英混排；
  - 缺失中文触发覆盖；
  - 过度翻译导致的字段、命令、API、产品术语失真；
  - command/agent/skill frontmatter 问题；
  - 不安全或误导性的示例；
  - 损坏或错误的引用路径；
  - 与当前 Claude Code plugin 约定不一致的说明。
- 保持外科手术式 diff。

**Out of Scope:**

- 不新增新 commands、agents、skills。
- 不重新组织目录结构。
- 不做未被审计发现支持的大规模文风重写。
- 不改变 `plugin-dev` 的功能目标。

**Success Criteria:**

- 所有 critical 问题已修复或明确记录为不修复及原因。
- 所有 major 问题已修复或明确记录为不修复及原因。
- 修复后的文档符合中文主体 + 关键触发区双语化标准。
- 入口组件仍符合 plugin 结构约定。
- diff 中每个变更都能追溯到审计发现。

**Artifacts:**

- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

### Phase 5 — 验证与完成证据

**Status:** not-started

**Scope:**

- 运行结构和内容验证：
  - 文件覆盖检查；
  - grep 检查不自然混排模式；
  - grep 检查 `[BANG]` / `!` 示例风险；
  - command、agent、skill frontmatter 抽查；
  - 可用脚本的结构校验。
- 根据可用性决定是否运行：
  - `plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh`
  - `plugins/plugin-dev/skills/command-development/scripts/validate-command.sh`
  - `plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh`
  - `plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh`，仅当存在 hooks 配置时。
- 记录无法自动验证的项目和手动测试建议，例如 `claude --plugin-dir plugins/plugin-dev`。
- 更新 roadmap evidence 和 current state。

**Out of Scope:**

- 不要求发布版本。
- 不要求创建 PR。
- 不要求实际安装到用户全局 Claude Code 环境，除非用户另行要求。

**Success Criteria:**

- 已记录所有验证命令、输出摘要和结果。
- 已确认本 roadmap 的整体 Success Criteria 被覆盖。
- 如果存在未解决问题，已记录 blocker 或后续建议。
- Roadmap 可被标记为 completed，或明确说明剩余 phase / blocker。

**Artifacts:**

- **Spec:** pending
- **Plan:** pending
- **Implementation Summary:** pending
- **Verification Evidence:** pending

## Pending Proposals

- 无。

## Proposal Rules

需要 `Proposal Brief` 的变更：

- 修改 Goal。
- 修改 Non-goals。
- 修改 Shared Constraints。
- 修改整体 Success Criteria。
- 新增、删除、合并、拆分或重排 phase。
- 大幅修改 phase scope。
- 大幅修改 phase success criteria。

不需要 `Proposal Brief` 的事实更新：

- 回填 artifact 路径。
- 标记 artifact missing。
- 更新 `Last Sync`。
- 添加 blocker。
- 记录 `Verification Evidence`。
- 追加 `Change Log`。
- 最终验收通过后的事实性 roadmap 同步，仅限 Sync Rules 允许字段。

## Sync Rules

验收同步允许更新：

- 当前 phase 的 `Status`
- `Phase Summary` 中对应 phase 的 status 和 artifact 摘要
- `Phase Details` 中对应 phase 的 `Implementation Summary`
- `Phase Details` 中对应 phase 的 `Verification Evidence`
- `Current State`
- `Last Sync`
- `Next Manual Action`
- `Change Log`

验收同步不得修改：

- `Goal`
- `Non-goals`
- `Shared Constraints`
- 整体 `Success Criteria`
- phase scope
- phase out-of-scope
- phase success criteria
- phase 顺序
- `Proposal Rules`
- `Sync Rules`
- `Handoff Rules`

同步前必须有具体 `Verification Evidence`，并确认 phase success criteria 已被证据覆盖。

## Handoff Rules

- `write-spec` handoff 必须包含：
  - Roadmap path；
  - phase 名称；
  - Goal；
  - Shared Constraints；
  - phase scope / out of scope / success criteria；
  - 参考输入映射；
  - 主动挑战扫描。
- `write-plan` handoff 必须读取 roadmap 和已完成 spec。
- `implement-plan` handoff 必须读取 roadmap 和已完成 plan。
- `complete-phase` 必须记录具体 Verification Evidence。
- 不要从聊天记忆推断完成度；以文件和验证输出为准。

## Change Log

- 2026-05-17: Created roadmap from roadmap-management discovery for `plugins/plugin-dev` audit and repair initiative.
