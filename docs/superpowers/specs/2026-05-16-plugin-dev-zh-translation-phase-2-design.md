# plugin-dev 中文化 Phase 2 规格：核心插件内容

## Context and Goal

本规格对应路线图：

`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

Phase 2 的目标是翻译 `plugins/plugin-dev` 中核心插件内容的用户可读自然语言，使 `.claude-plugin`、`commands`、`agents` 和 `docs` 下的面向用户说明中文化；同时校验并矫正本阶段涉及的命令（command）和代理（agent）既有质量问题，保持插件（plugin）、文档示例和所有机器可读结构的行为不变。

本阶段采用“触发安全的平衡翻译”策略：翻译代码块外的自然语言，并在 frontmatter `description` 等高风险位置保留关键英文触发词，避免影响命令发现、代理触发和插件元数据解析。翻译后还必须检查 command 和 agent 的结构、触发描述、工具字段、示例指令和用户可读说明；若发现既有错误、不一致或影响使用体验的问题，应在不改变插件功能边界的前提下一并矫正。

## Scope

Phase 2 包含以下 13 个文件，并在同范围内校验、优化或矫正 command 和 agent 的结构与内容问题：

| Group | Path | Handling |
|---|---|---|
| Manifest | `plugins/plugin-dev/.claude-plugin/plugin.json` | 只翻译 `description` 字符串值。 |
| Commands | `plugins/plugin-dev/commands/create-marketplace.md` | 翻译代码块外的命令工作流说明；校验并矫正工作流指令、frontmatter、工具字段和用户提示问题；保护工具名、路径和代码块。 |
| Commands | `plugins/plugin-dev/commands/create-plugin.md` | 翻译代码块外的命令工作流说明；校验并矫正工作流指令、frontmatter、工具字段和用户提示问题；保护工具名、路径和代码块。 |
| Commands | `plugins/plugin-dev/commands/plugin-dev-guide.md` | 翻译代码块外的简短说明；校验并矫正命令路由说明、frontmatter 和 `$ARGUMENTS` 使用问题；保护工具名。 |
| Commands | `plugins/plugin-dev/commands/start.md` | 翻译代码块外的入口命令说明；校验并矫正路由逻辑、frontmatter、工具字段和用户提示问题；保护工具名、路径和代码块。 |
| Agents | `plugins/plugin-dev/agents/agent-creator.md` | 翻译 agent 职责、流程和输出要求；校验并矫正触发描述、工具字段、示例结构和系统提示问题；frontmatter `description` 保留关键英文触发词。 |
| Agents | `plugins/plugin-dev/agents/plugin-validator.md` | 翻译 agent 职责、校验流程和输出要求；校验并矫正触发描述、工具字段、示例结构和系统提示问题；frontmatter `description` 保留关键英文触发词。 |
| Agents | `plugins/plugin-dev/agents/skill-reviewer.md` | 翻译 agent 职责、审查流程和输出要求；校验并矫正触发描述、工具字段、示例结构和系统提示问题；frontmatter `description` 保留关键英文触发词。 |
| Docs | `plugins/plugin-dev/docs/ci-cd.md` | 翻译文档正文和表格解释性文字；保护 workflow、label 名称和路径。 |
| Docs | `plugins/plugin-dev/docs/component-patterns.md` | 翻译文档正文和表格解释性文字；保护字段名、代码块和 frontmatter 示例。 |
| Docs | `plugins/plugin-dev/docs/release-procedure.md` | 翻译文档正文；保护命令、路径、PR/release 示例和链接目标。 |
| Docs | `plugins/plugin-dev/docs/troubleshooting.md` | 翻译文档正文和问题表格解释性文字；保护命令、路径和代码块。 |
| Docs | `plugins/plugin-dev/docs/workflow-security.md` | 翻译文档正文；保护 allowed-tools、工具名、路径和代码块。 |

## Out of Scope

Phase 2 不包含：

- 翻译或校验 `plugins/plugin-dev/skills/` 子目录；skills 的质量校验和优化留到 Phase 3/4 的对应范围内处理。
- 翻译任何 Markdown 代码块内部内容，即使代码块语言是 `text` 且内容是用户提示、Claude 回复或 PR body 示例。
- 翻译 shell 脚本、JSON 示例、YAML/JSON 键名、schema 字段、路径、命令名、slash command 名称、工具名、模型名或 API 名。
- 修改插件功能边界、目录结构、脚本逻辑、校验器、CI 配置或新增自动化工具。
- 为解决超出本阶段文件范围的问题而修改其他文件；这类问题应记录为需另行确认的后续项。
- 对 Phase 2 范围外文件做格式化、重构或顺手清理。

## Translation Rules

### General Rules

- 只翻译用户可读自然语言。
- Markdown 标题、段落、列表项、引用块和表格中的解释性文字应中文化。
- Markdown 链接的可见文字可以翻译；链接目标和锚点保持原文。
- 术语遵循 Phase 1 规则：核心术语在关键位置使用中文加英文关键词，例如插件（plugin）、技能（skill）、命令（command）、代理（agent）、hook、市场（marketplace）、frontmatter、清单（manifest）。
- `Claude Code`、`MCP`、`LSP`、`JSON`、`YAML`、`API`、工具名和模型名保持英文。

### Markdown Code Blocks

- 所有 Markdown 代码块保持逐字原文。
- 不翻译代码块 fence、语言标记或代码块内部任何文本。
- 该规则覆盖 `bash`、`json`、`yaml`、`text`、`markdown` 和未标注语言的代码块。

### Manifest JSON

`plugins/plugin-dev/.claude-plugin/plugin.json` 只允许修改：

- `description` 的字符串值。

不得修改：

- JSON 键名。
- `name`、`version`、`author`、`homepage`、`repository`、`license`、`keywords` 等字段值。
- 对象结构、数组结构、字段顺序或格式，除非保存工具仅产生等价空白变化且 diff 可清楚解释。

### Commands

`commands/*.md` 的处理规则：

- frontmatter 键名保持原文。
- `argument-hint`、`allowed-tools`、`model`、`disable-model-invocation` 保持原文值。
- frontmatter `description` 翻译为中文说明，但保留关键英文触发词，例如 `plugin`、`marketplace`、`workflow`、`plugin development`。
- 正文中给 Claude 的工作流指令翻译为中文，并保持指令性语气。
- `$ARGUMENTS`、slash command 名称、工具名、技能名、代理名、路径和命令示例保持原文。

### Agents

`agents/*.md` 的处理规则：

- frontmatter 键名和结构保持原文。
- `name`、`model`、`color`、`tools` 和 `skills` 保持原文值。
- frontmatter `description` 翻译自然语言说明，但保留原始关键英文触发词和短语，例如 `Use this agent when`、`create an agent`、`generate an agent`、`validate my plugin`、`check plugin structure`、`review my skill`、`skill quality`。
- `<example>`、`<commentary>` 等标记结构保持原文。
- agent 系统提示中的职责、流程、质量标准、边界情况和输出格式说明可以翻译为中文。
- 输出格式模板中的 Markdown 结构、字段名、路径示例和命令示例保持原文。

### Docs

`docs/*.md` 的处理规则：

- 翻译文档标题、段落、列表、提示语和表格解释性文字。
- 保留 workflow 文件名、label 名、frontmatter 字段名、manifest 字段名、命令、路径、链接目标和代码块。
- 对表格行做逐项判断：字段名、示例值和机器可读 token 保持原文；解释性文字中文化。

## Quality Correction Rules

翻译完成后必须对本阶段涉及的 4 个 command 和 3 个 agent 做正确性校验。校验范围包括：

- frontmatter 是否包含必要字段，字段名和字段值类型是否符合组件约定。
- `description` 是否保留关键英文触发词，且中文说明不会削弱触发意图。
- `allowed-tools`、`tools`、`skills`、`model`、`color` 等字段是否与文件职责一致。
- 工作流指令、确认点、输出要求和示例说明是否互相一致。
- 用户可读说明是否存在明显过时、不准确、矛盾或会误导使用的问题。

允许在同一目标文件内修复：

- 翻译前已经存在的拼写、措辞、结构说明、触发描述或示例说明问题。
- 与当前文件职责不一致的用户可读说明。
- 不改变功能边界的 frontmatter 表达或工具字段问题。

不允许直接修复：

- 需要新增功能、改变命令/agent 行为、改目录结构或新增校验器的问题。
- 需要修改 Phase 2 范围外文件的问题。

这类问题应记录为需另行确认的后续项。

## File Group Strategy

### Manifest

目标文件：

- `plugins/plugin-dev/.claude-plugin/plugin.json`

实施时只翻译 `description`，并保留 `Comprehensive toolkit`、`Claude Code plugins`、`MCP`、`LSP`、`commands`、`agents` 等关键英文检索词或技术词，确保插件市场和搜索场景不丢失语义。

### Commands

目标文件：

- `plugins/plugin-dev/commands/create-marketplace.md`
- `plugins/plugin-dev/commands/create-plugin.md`
- `plugins/plugin-dev/commands/plugin-dev-guide.md`
- `plugins/plugin-dev/commands/start.md`

这些文件是给 Claude 执行的命令说明。翻译应保持动作明确、顺序清楚、要求强制性不弱化。任何“必须加载某 skill”“等待用户确认”“使用 Task 工具”等要求翻译后仍必须表达为明确约束。翻译后还应校验命令的工具权限、路由说明、确认点和输出要求是否与命令职责一致；发现不改变功能边界即可修复的问题时，应在同文件内一并矫正。

### Agents

目标文件：

- `plugins/plugin-dev/agents/agent-creator.md`
- `plugins/plugin-dev/agents/plugin-validator.md`
- `plugins/plugin-dev/agents/skill-reviewer.md`

这些文件包含 agent 触发条件和系统提示。翻译应提升中文可读性，但不得削弱触发描述的可检索性。frontmatter `description` 中的英文触发短语必须保留，尤其是用户可能直接输入的短语和插件开发领域关键词。翻译后还应校验 agent 的触发示例、工具字段、skills 列表、输出格式和系统提示是否自洽；发现不改变功能边界即可修复的问题时，应在同文件内一并矫正。

### Docs

目标文件：

- `plugins/plugin-dev/docs/ci-cd.md`
- `plugins/plugin-dev/docs/component-patterns.md`
- `plugins/plugin-dev/docs/release-procedure.md`
- `plugins/plugin-dev/docs/troubleshooting.md`
- `plugins/plugin-dev/docs/workflow-security.md`

这些文件面向用户阅读，代码块外的自然语言应尽量中文化。涉及 GitHub Actions、workflow 名称、label 名称、工具名和路径时，应保留机器可读 token，只翻译周围解释。

## Success Criteria

Phase 2 完成时必须满足：

- 13 个目标文件中代码块外的用户可读英文说明已按本规格中文化。
- `plugin.json` 仍是有效 JSON，且只修改用户可读 `description` 值。
- command frontmatter 和 agent frontmatter 仍保持可解析结构，关键字段未丢失。
- 本阶段涉及的 command 和 agent 已完成结构、触发描述、工具字段、示例指令和用户可读说明校验；发现的既有问题已在不改变功能边界的前提下矫正，或记录为需另行确认的后续问题。
- command 名、agent 名、路径、工具名、模型名、schema 字段和示例命令未被误译。
- 所有 Markdown 代码块内部内容保持原文。
- `plugins/plugin-dev/skills/`、shell 脚本、目录结构和插件功能边界未被修改。

## Verification Evidence Requirements

Phase 2 实现完成前必须提供具体证据，不能只写“done”“tested”或“looks good”。

最低证据集：

1. **范围证据**：记录 `git diff --name-only` 或等价输出，确认插件内容修改只涉及 Phase 2 的 13 个目标文件；如有 roadmap、spec 或 plan artifact 更新，需单独说明其原因。
2. **JSON 证据**：解析 `plugins/plugin-dev/.claude-plugin/plugin.json` 成功，并确认 manifest 键名和除 `description` 外的字段值未被修改。
3. **frontmatter 证据**：抽查 4 个 command 文件和 3 个 agent 文件，确认 YAML frontmatter 仍以 `---` 包裹，且关键字段仍存在。
4. **command/agent 校验证据**：记录 4 个 command 和 3 个 agent 的结构、触发描述、工具字段、示例指令和用户可读说明抽查结果；若修复既有问题，列出文件和问题类型；若发现超出范围的问题，记录为后续项。
5. **代码块保护证据**：抽查 `create-plugin.md`、`create-marketplace.md`、`start.md`、`release-procedure.md` 和 `component-patterns.md` 的代码块，确认 fence、语言标记和块内内容未被翻译。
6. **术语证据**：抽查至少 5 个核心术语，确认 plugin、skill、command、agent、hook、marketplace、frontmatter、manifest 等按 Phase 1 术语规则处理。
7. **行为不变证据**：说明未修改 `skills/`、shell 脚本、命令名、代理名、路径或目录结构。

可接受的验证方式包括：

- JSON 解析命令输出。
- frontmatter 边界和关键字段的脚本检查或人工抽查记录。
- command/agent 结构、触发和工具字段检查记录。
- 代码块 diff 抽查记录。
- `git diff --name-only` 和重点文件 diff 摘要。

## Handoff to Planning

下一步应基于本规格创建 Phase 2 实现计划。计划应分组处理 manifest、commands、agents 和 docs，并把 command/agent 质量校验、必要矫正和验证步骤安排在实现后执行。

建议下一条手动命令：

```text
/superpowers:roadmap-management write-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2
```
