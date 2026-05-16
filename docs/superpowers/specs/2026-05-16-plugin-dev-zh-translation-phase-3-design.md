# plugin-dev 中文化 Phase 3 规格：核心开发技能

## Context and Goal

本规格对应路线图：

`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

Phase 3 的目标是翻译 `plugins/plugin-dev` 中核心开发类技能的用户可读自然语言，使 `plugin-dev-guide`、`plugin-structure`、`command-development` 和 `skill-development` 的技能说明、流程、示例文字和参考文档中文化；同时校验并矫正本阶段涉及的技能（skill）既有质量问题，保持插件（plugin）、技能触发语义、示例、代码块和所有机器可读结构的行为不变。

本阶段采用“严格全量、触发安全、代码块保护”的翻译策略：覆盖四个核心技能目录下全部 Markdown 文件；翻译代码块外的自然语言；在 `SKILL.md` frontmatter `description` 中保留关键英文触发词；所有 Markdown 代码块逐字保留。翻译后还必须检查同范围技能文档的结构、触发描述、示例指令和用户可读说明；若发现既有错误、不一致或影响使用体验的问题，应在不改变插件功能边界的前提下，在目标文件内一并矫正。

## Scope

Phase 3 包含以下 31 个 Markdown 文件，并在同范围内校验、优化或矫正 skill 文档的结构与内容问题：

| Group | Path | Handling |
|---|---|---|
| Guide | `plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md` | 翻译技能总览、路由说明、表格解释和用户请求处理说明；frontmatter `description` 保留关键英文触发词。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/SKILL.md` | 翻译插件结构、组件说明、最佳实践、排障说明和资源索引；保护代码块、路径、字段名和命令。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md` | 翻译代码块外的高级插件示例说明；保护示例结构和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md` | 翻译代码块外的最小插件示例说明；保护示例结构和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md` | 翻译代码块外的标准插件示例说明；保护示例结构和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md` | 翻译高级主题说明；保护命令、路径、字段名和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md` | 翻译组件模式说明；保护组件路径、frontmatter 示例和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/github-actions.md` | 翻译 GitHub Actions 集成说明；保护 workflow、action 名称、命令和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md` | 翻译 headless/CI 模式说明；保护 CLI 命令、flag、路径和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md` | 翻译 manifest 字段说明；保护 JSON 字段名、示例值和代码块。 |
| Plugin structure | `plugins/plugin-dev/skills/plugin-structure/references/output-styles.md` | 翻译 output styles 说明；保护字段名、路径、命令和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/SKILL.md` | 翻译命令开发流程、frontmatter 字段说明、示例解释和排障说明；frontmatter `description` 保留关键英文触发词。 |
| Command development | `plugins/plugin-dev/skills/command-development/examples/plugin-commands.md` | 翻译代码块外的插件命令示例说明；保护命令文件示例和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/examples/simple-commands.md` | 翻译代码块外的简单命令示例说明；保护命令示例和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/advanced-workflows.md` | 翻译高级工作流说明；保护命令、路径、状态示例和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/documentation-patterns.md` | 翻译文档模式说明；保护模板、字段名和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md` | 翻译 frontmatter 字段参考说明；保护字段名、YAML 示例和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/interactive-commands.md` | 翻译交互式命令说明；保护 `AskUserQuestion`、工具名、代码块和示例结构。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md` | 翻译 marketplace 发布说明；保护 marketplace、路径、命令和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md` | 翻译插件功能参考说明；保护 `${CLAUDE_PLUGIN_ROOT}`、字段名、命令和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/plugin-integration.md` | 翻译插件集成说明；保护组件名、路径、工具名和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/skill-tool.md` | 翻译 Skill tool 说明；保护 `Skill`、工具调用语法、命令名和代码块。 |
| Command development | `plugins/plugin-dev/skills/command-development/references/testing-strategies.md` | 翻译测试策略说明；保护命令、脚本路径和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/SKILL.md` | 翻译技能开发流程、frontmatter 字段说明、最佳实践和校验清单；frontmatter `description` 保留关键英文触发词。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/examples/complete-skill.md` | 翻译代码块外的完整技能示例说明；保护示例文件结构和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md` | 翻译代码块外的 frontmatter 模板说明；保护 YAML 模板和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md` | 翻译代码块外的最小技能示例说明；保护示例结构和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md` | 翻译高级 frontmatter 说明；保护字段名、YAML 示例和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md` | 翻译 commands 与 skills 对比说明；保护命令名、路径和技术 token。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md` | 翻译技能创建工作流说明；保护命令、路径、文件名和代码块。 |
| Skill development | `plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md` | 翻译原始 skill-creator 方法说明；frontmatter `description` 保留关键英文触发词；保护代码块。 |

## Out of Scope

Phase 3 不包含：

- 翻译或校验 Phase 4 的集成和工具类技能目录：`agent-development`、`hook-development`、`mcp-integration`、`lsp-integration`、`plugin-settings`、`marketplace-structure`。
- 翻译 shell 脚本、JSON 示例、YAML/JSON 键名、schema 字段、路径、命令名、slash command 名称、工具名、模型名或 API 名。
- 翻译任何 Markdown 代码块内部内容，即使代码块语言是 `text`、`markdown` 或未标注语言。
- 修改技能触发语义、插件功能边界、目录结构、脚本逻辑、校验器、CI 配置或新增自动化工具。
- 为解决超出本阶段文件范围的问题而修改其他文件；这类问题应记录为需另行确认的后续项。
- 对 Phase 3 范围外文件做格式化、重构或顺手清理。

## Translation Rules

### General Rules

- 只翻译用户可读自然语言。
- Markdown 标题、段落、列表项、引用块和表格中的解释性文字应中文化。
- Markdown 链接的可见文字可以翻译；链接目标和锚点保持原文。
- 术语遵循 Phase 1 规则：核心术语在关键位置使用中文加英文关键词，例如插件（plugin）、技能（skill）、命令（command）、代理（agent）、hook、市场（marketplace）、frontmatter、清单（manifest）。
- `Claude Code`、`MCP`、`LSP`、`JSON`、`YAML`、`API`、工具名和模型名保持英文。
- `$ARGUMENTS`、`$1`、`${CLAUDE_PLUGIN_ROOT}`、环境变量、文件路径、命令示例和 slash command 名称保持原文。

### Markdown Code Blocks

- 所有 Markdown 代码块保持逐字原文。
- 不翻译代码块 fence、语言标记或代码块内部任何文本。
- 该规则覆盖 `bash`、`json`、`yaml`、`text`、`markdown` 和未标注语言的代码块。
- 如果代码块内部存在明显用户可读英文说明，也不在 Phase 3 中翻译；如确需处理，应记录为后续项或留给 Phase 5/后续决策。

### Skill Frontmatter

`SKILL.md` 的处理规则：

- frontmatter 键名和结构保持原文。
- `name` 保持原文值。
- frontmatter `description` 翻译自然语言说明，但保留原始关键英文触发词和短语，尤其是用户可能直接输入的短语和插件开发领域关键词。
- 不新增或删除 frontmatter 字段，除非发现同文件内明显不改变行为的结构问题且能清楚说明原因。
- `allowed-tools`、`model`、`context`、`agent`、`skills`、`user-invocable`、`disable-model-invocation`、`hooks`、`argument-hint` 等字段名和机器可读值保持原文。

### Examples and References

`examples/` 和 `references/` 的处理规则：

- 翻译代码块外的示例介绍、操作说明、权衡说明、表格解释和故障排查文字。
- 保留示例文件树、命令、路径、字段名、工具调用语法、模型名和配置片段。
- 表格行需逐项判断：字段名、示例值和机器可读 token 保持原文；解释性文字中文化。
- 不因翻译调整示例行为、命令顺序或配置结构。

## Quality Correction Rules

翻译完成后必须对本阶段涉及的 4 个核心 skill 及其 references/examples 做正确性校验。校验范围包括：

- `SKILL.md` frontmatter 是否包含必要字段，字段名和字段值类型是否符合技能约定。
- `description` 是否保留关键英文触发词，且中文说明不会削弱触发意图。
- 技能正文、示例说明、参考文档和资源索引是否互相一致。
- 路径、链接文字、文件名、组件名、工具名和示例指令是否与目标文件职责一致。
- 用户可读说明是否存在明显过时、不准确、矛盾或会误导使用的问题。

允许在 31 个目标文件内修复：

- 翻译前已经存在的拼写、措辞、结构说明、触发描述或示例说明问题。
- 与当前文件职责不一致的用户可读说明。
- 同文件内不改变功能边界的链接文字、资源索引、术语或说明不一致问题。

不允许直接修复：

- 需要新增功能、改变技能或插件行为、改目录结构或新增校验器的问题。
- 需要修改 Phase 3 范围外文件的问题。
- 需要改变代码块、脚本、JSON 示例或机器可读字段的问题。

这类问题应记录为需另行确认的后续项。

## File Group Strategy

### Guide

目标文件：

- `plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md`

该文件是 plugin-dev 技能体系入口。翻译应保持技能路由判断清晰，保留 9 个 specialized skills 的英文技能名、命令名和技术关键词。`description` 应保留 `Claude Code plugins`、`plugin development`、`plugin architecture`、`extending Claude Code` 等关键英文触发词。

### Plugin Structure

目标文件：

- `plugins/plugin-dev/skills/plugin-structure/SKILL.md`
- `plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md`
- `plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md`
- `plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md`
- `plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md`
- `plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md`
- `plugins/plugin-dev/skills/plugin-structure/references/github-actions.md`
- `plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md`
- `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md`
- `plugins/plugin-dev/skills/plugin-structure/references/output-styles.md`

这些文件说明插件目录、manifest、组件组织、CI/headless 模式、output styles 和高级主题。翻译应保护 `plugin.json` 字段、组件目录名、`${CLAUDE_PLUGIN_ROOT}`、CLI 命令、GitHub Actions 名称和代码块。`description` 应保留 `create a plugin`、`plugin structure`、`plugin.json`、`headless mode`、`CI mode`、`github actions`、`output styles` 等关键英文触发词。

### Command Development

目标文件：

- `plugins/plugin-dev/skills/command-development/SKILL.md`
- `plugins/plugin-dev/skills/command-development/examples/plugin-commands.md`
- `plugins/plugin-dev/skills/command-development/examples/simple-commands.md`
- `plugins/plugin-dev/skills/command-development/references/advanced-workflows.md`
- `plugins/plugin-dev/skills/command-development/references/documentation-patterns.md`
- `plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md`
- `plugins/plugin-dev/skills/command-development/references/interactive-commands.md`
- `plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md`
- `plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md`
- `plugins/plugin-dev/skills/command-development/references/plugin-integration.md`
- `plugins/plugin-dev/skills/command-development/references/skill-tool.md`
- `plugins/plugin-dev/skills/command-development/references/testing-strategies.md`

这些文件说明 slash command 结构、frontmatter 字段、动态参数、文件引用、bash 预执行、交互模式、Skill tool 和测试策略。翻译应保持命令是“给 Claude 的指令”这一关键规则不弱化，并保护 `$ARGUMENTS`、`$1`、`[BANG]`、`AskUserQuestion`、`Skill`、`allowed-tools`、`disable-model-invocation`、路径和代码块。`description` 应保留 `create a slash command`、`command frontmatter`、`interactive command`、`AskUserQuestion`、`Skill tool`、`debug command` 等关键英文触发词。

### Skill Development

目标文件：

- `plugins/plugin-dev/skills/skill-development/SKILL.md`
- `plugins/plugin-dev/skills/skill-development/examples/complete-skill.md`
- `plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md`
- `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md`
- `plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md`
- `plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md`
- `plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md`
- `plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md`

这些文件说明技能结构、progressive disclosure、frontmatter 字段、资源目录、技能创建流程和 commands vs skills 边界。翻译应保护 `SKILL.md`、`references/`、`examples/`、`scripts/`、frontmatter 字段、`Skill()` 语法、`SLASH_COMMAND_TOOL_CHAR_BUDGET` 和代码块。`description` 应保留 `create a skill`、`SKILL.md format`、`skill frontmatter`、`skill triggers`、`progressive disclosure`、`Skill() syntax` 等关键英文触发词。

## Success Criteria

Phase 3 完成时必须满足：

- 31 个目标 Markdown 文件中代码块外的用户可读英文说明已按本规格中文化。
- 4 个 `SKILL.md` 的 frontmatter 仍保持可解析结构，`name` 等 protected fields 未被修改。
- 4 个 `SKILL.md` 的 `description` 已中文化，并保留关键英文触发词和插件开发技术词。
- 技能名、路径、工具名、模型名、schema 字段、frontmatter 字段、示例命令和 `$ARGUMENTS` 等机器可读 token 未被误译。
- 所有 Markdown 代码块内部内容、fence 和语言标记保持原文。
- 本阶段涉及的 skill 文档已完成结构、触发描述、示例指令和用户可读说明校验；发现的既有问题已在不改变功能边界的前提下矫正，或记录为需另行确认的后续问题。
- 未修改 Phase 4 技能目录、shell 脚本、JSON 示例、目录结构或插件功能边界。

## Verification Evidence Requirements

Phase 3 实现完成前必须提供具体证据，不能只写“done”“tested”或“looks good”。

最低证据集：

1. **范围证据**：记录 Phase 3 目标文件清单为 31 个 Markdown 文件，并记录 `git diff --name-only` 或等价输出，确认插件内容修改只涉及 Phase 3 的目标 Markdown 文件；如有 roadmap、spec 或 plan artifact 更新，需单独说明其原因。
2. **frontmatter 证据**：检查 4 个 `SKILL.md` 的 YAML frontmatter 仍以 `---` 包裹，`name` 保持原文，`description` 保留关键英文触发词；如存在其他 frontmatter 字段，确认字段名和机器可读值未被误译。
3. **代码块保护证据**：确认所有目标 Markdown 文件的代码块 fence、语言标记和块内内容保持原文；可以使用脚本比对或记录人工抽查结果。
4. **术语证据**：抽查至少 7 个核心术语，确认 plugin、skill、command、frontmatter、manifest、workflow、validation、Skill tool、Claude Code 等按 Phase 1 术语规则处理。
5. **质量矫正证据**：记录本阶段同范围小修的文件和问题类型；若发现超出范围的问题，记录为后续项而不是直接修改。
6. **行为不变证据**：说明未修改 Phase 4 目录、shell 脚本、JSON 示例、技能名、命令名、路径、目录结构或插件功能边界。

可接受的验证方式包括：

- `git diff --name-only` 和重点文件 diff 摘要。
- frontmatter 边界和 protected fields 的脚本检查或人工抽查记录。
- 代码块 diff 抽查或全量比对记录。
- 关键术语抽查记录。
- 同范围 skill 文档结构、触发和示例说明检查记录。

## Handoff to Planning

下一步应基于本规格创建 Phase 3 实现计划。计划应分组处理 guide、plugin-structure、command-development 和 skill-development，并把 skill 文档质量校验、必要矫正和验证步骤安排在实现后执行。

建议下一条手动命令：

```text
/superpowers:roadmap-management write-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 3
```
