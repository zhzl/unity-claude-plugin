# plugin-dev 中文化路线图

## Metadata

- **Title:** plugin-dev 中文化路线图
- **Slug:** plugin-dev-zh-translation
- **Status:** active
- **Created:** 2026-05-15
- **Last Sync:** 2026-05-15
- **Roadmap Path:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- **Target Path:** `plugins/plugin-dev`

## Goal

将 `plugins/plugin-dev` 下的用户可读内容系统翻译为中文，同时保持插件、技能、命令、代理、示例和脚本的行为不变。

## Non-goals

- 不重构目录结构或实现逻辑。
- 不翻译代码标识符、文件路径、命令名、JSON/YAML/frontmatter 键名、工具名或 schema 字段。
- 不新增插件功能、校验器、CLI 命令或自动同步机制。
- 不把详细翻译规范或执行步骤写进 `ROADMAP.md`。

## Shared Constraints

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- frontmatter 的 `description` 若会影响触发或发现，应保留关键英文触发词或采用中英混排以避免语义丢失。
- 每个阶段完成前必须提供具体验证证据，例如 diff 抽查、格式校验、脚本/manifest 校验或相关测试输出。

## Success Criteria

- `plugins/plugin-dev` 中计划范围内的用户可读英文内容已翻译为中文。
- 插件 manifest、技能 frontmatter、命令 frontmatter、代理 frontmatter、JSON 示例和 shell 脚本仍保持语法有效。
- 代码块、命令、路径、schema 字段、工具名和其他机器可读内容未被误译。
- 各阶段都有具体的 `Verification Evidence`，且最终阶段完成整体一致性抽查。

## Decisions

- 2026-05-15: 采用五阶段路线图：盘点术语、核心插件内容、核心开发技能、集成工具技能、示例脚本和最终一致性验证。
- 2026-05-15: 翻译范围以用户可读自然语言为主；机器可读字段默认保持原文，必要时在触发描述中保留关键英文词。

## Current State

- **Roadmap Status:** active
- **Current Phase:** Phase 2 — Core plugin content
- **Last Sync:** 2026-05-15
- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2`

## Blockers

- None.

## Phase Summary

| Phase | Status | Scope | Artifacts |
|---|---|---|---|
| Phase 1 — Inventory and glossary | completed | 盘点文件、定义术语表和保留规则 | Spec `docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`; Plan `docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`; Implementation Summary recorded; Verification Evidence recorded |
| Phase 2 — Core plugin content | needs-spec | 翻译 `.claude-plugin`、`commands`、`agents`、`docs` | Spec pending; Plan pending; Implementation Summary pending; Verification Evidence pending |
| Phase 3 — Core development skills | needs-spec | 翻译 `plugin-dev-guide`、`plugin-structure`、`command-development`、`skill-development` | Spec pending; Plan pending; Implementation Summary pending; Verification Evidence pending |
| Phase 4 — Integration and tooling skills | needs-spec | 翻译 `agent-development`、`hook-development`、`mcp-integration`、`lsp-integration`、`plugin-settings`、`marketplace-structure` | Spec pending; Plan pending; Implementation Summary pending; Verification Evidence pending |
| Phase 5 — Examples, scripts, and final consistency | needs-spec | 处理 JSON/shell 示例可读文本并做整体一致性验证 | Spec pending; Plan pending; Implementation Summary pending; Verification Evidence pending |

## Phase Details

### Phase 1 — Inventory and glossary

- **Status:** completed
- **Scope:** 盘点 `plugins/plugin-dev` 下的 Markdown、JSON 和 shell 文件；定义中文术语表、保留原文规则和高风险字段清单。
- **Out of scope:** 实际批量翻译内容；修改插件行为；重排目录结构。
- **Success Criteria:**
  - 文件清单覆盖目标目录中的 Markdown、JSON 和 shell 文件。
  - 术语表明确常见插件、技能、命令、代理、hook、MCP、LSP、marketplace 等术语译法。
  - 高风险字段和不可翻译 token 有明确规则。
- **Artifacts:**
  - **Spec:** `docs/superpowers/specs/2026-05-15-plugin-dev-zh-translation-phase-1-design.md`
  - **Plan:** `docs/superpowers/plans/2026-05-15-plugin-dev-zh-translation-phase-1.md`
  - **Implementation Summary:** Phase 1 established a complete 99-file inventory, Chinese+English glossary, non-translatable rules, high-risk field rules, and verification evidence requirements in the approved spec.
  - **Verification Evidence:** 2026-05-15: `target_count 99`, `listed_count 99`, `missing_count 0`, `extra_count 0`, suffix counts `{'.json': 6, '.md': 79, '.sh': 14}`, top-level counts `{'.claude-plugin': 1, 'agents': 3, 'commands': 4, 'docs': 5, 'skills': 86}`, required terms covered, required risk sections covered.

### Phase 2 — Core plugin content

- **Status:** needs-spec
- **Scope:** 翻译 `.claude-plugin`、`commands`、`agents` 和 `docs` 下的用户可读自然语言内容。
- **Out of scope:** `skills` 子目录；shell/JSON 示例的最终一致性处理；任何行为变更。
- **Success Criteria:**
  - 核心插件 manifest、命令、代理和 docs 中的用户可读内容已中文化。
  - frontmatter、manifest 字段、命令名、代理名和路径保持可解析。
  - 相关文件经抽查确认没有误译代码块或机器可读字段。
- **Artifacts:**
  - **Spec:** pending
  - **Plan:** pending
  - **Implementation Summary:** pending
  - **Verification Evidence:** pending

### Phase 3 — Core development skills

- **Status:** needs-spec
- **Scope:** 翻译 `skills/plugin-dev-guide`、`skills/plugin-structure`、`skills/command-development` 和 `skills/skill-development` 的 Markdown 用户可读内容。
- **Out of scope:** 集成类技能目录；非 Markdown 示例脚本；改变技能触发语义。
- **Success Criteria:**
  - 核心开发技能的说明、流程、示例文字和参考文档已中文化。
  - 技能 frontmatter 保留必要触发信息，且不会丢失关键英文技术词。
  - 代码块、命令示例、路径和字段名未被误译。
- **Artifacts:**
  - **Spec:** pending
  - **Plan:** pending
  - **Implementation Summary:** pending
  - **Verification Evidence:** pending

### Phase 4 — Integration and tooling skills

- **Status:** needs-spec
- **Scope:** 翻译 `skills/agent-development`、`skills/hook-development`、`skills/mcp-integration`、`skills/lsp-integration`、`skills/plugin-settings` 和 `skills/marketplace-structure` 的 Markdown 用户可读内容。
- **Out of scope:** 前面阶段已处理的核心技能；最终全局一致性验证；修改脚本行为。
- **Success Criteria:**
  - 集成和工具类技能的说明、流程、示例文字和参考文档已中文化。
  - MCP、LSP、hook、settings、marketplace 等术语保持一致。
  - frontmatter、代码块、命令示例、路径和字段名保持语义和格式正确。
- **Artifacts:**
  - **Spec:** pending
  - **Plan:** pending
  - **Implementation Summary:** pending
  - **Verification Evidence:** pending

### Phase 5 — Examples, scripts, and final consistency

- **Status:** needs-spec
- **Scope:** 处理 JSON 示例、shell 脚本中的用户可读文本、剩余示例内容，并执行最终术语、格式和行为一致性验证。
- **Out of scope:** 新增测试框架；新增校验器；重新拆分前面阶段范围。
- **Success Criteria:**
  - JSON 示例仍为有效 JSON，shell 脚本行为未改变。
  - 用户可读示例文本、脚本输出或注释按规则中文化。
  - 完成全局抽查，确认术语一致、格式有效、机器可读内容未被误译。
- **Artifacts:**
  - **Spec:** pending
  - **Plan:** pending
  - **Implementation Summary:** pending
  - **Verification Evidence:** pending

## Pending Proposals

- None.

## Proposal Rules

需要 `Proposal Brief` 并获得批准后才能修改：

- `Goal`
- `Non-goals`
- `Shared Constraints`
- 整体 `Success Criteria`
- 新增、删除、合并、拆分或重排 phase
- 大幅修改 phase scope
- 大幅修改 phase success criteria

以下事实更新不需要 `Proposal Brief`：

- 回填 artifact 路径
- 标记 artifact missing
- 更新 `Last Sync`
- 添加 blocker
- 记录 `Verification Evidence`
- 追加 `Change Log`

## Sync Rules

- 不从聊天记忆推断完成度；只根据 `ROADMAP.md` 和已链接 artifacts 的磁盘证据同步状态。
- 如果 artifact 路径缺失，不推进 phase 状态，先标记 artifact missing 或提示修正。
- `Spec: pending` 对应 `needs-spec`。
- `Spec` 路径存在且 `Plan: pending` 对应 `designed`。
- `Spec` 和 `Plan` 路径存在且验证证据缺失时，新阶段对应 `planned`；如果 roadmap 明确记录执行已开始，则保持 `in-progress`。
- `Verification Evidence` 存在且 phase success criteria 已满足时，才能标记 `completed`。

## Handoff Rules

- 本 roadmap 只保存长期状态、共享约束、phase 状态、artifact 映射和下一步手动交接。
- 详细规格应写入 `docs/superpowers/specs/`。
- 详细执行计划应写入 `docs/superpowers/plans/`。
- Implementation Summary 只记录主要变更、commit/PR 引用或执行摘要，不记录详细实现步骤。
- 下一步建议手动调用 `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2`。

## Change Log

- 2026-05-15: Completed Phase 1 with validated inventory, glossary, non-translatable rules, and high-risk field rules; current phase advanced to Phase 2.
- 2026-05-15: Added Phase 1 implementation plan artifact and marked Phase 1 as planned.
- 2026-05-15: Added Phase 1 spec artifact and marked Phase 1 as designed.
- 2026-05-15: Created roadmap from approved draft for translating `plugins/plugin-dev` content into Chinese.
