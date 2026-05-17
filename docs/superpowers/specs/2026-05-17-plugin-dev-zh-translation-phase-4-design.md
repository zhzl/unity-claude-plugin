# plugin-dev 中文化 Phase 4 规格：集成和工具类技能

## 背景与目标

本规格对应路线图：

`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

Phase 4 的目标是翻译 `plugins/plugin-dev` 中集成和工具类技能的用户可读自然语言，使 `agent-development`、`hook-development`、`mcp-integration`、`lsp-integration`、`plugin-settings` 和 `marketplace-structure` 的技能说明、流程、示例文字和参考文档中文化；同时校验并矫正本阶段涉及的技能（skill）既有质量问题，保持插件（plugin）、技能触发语义、示例、代码块和所有机器可读结构的行为不变。

本阶段采用“严格全量、触发安全、代码块保护、集成 token 保护”的翻译策略：覆盖 6 个集成和工具类技能目录下全部 Markdown 文件；翻译代码块外的自然语言；在 `SKILL.md` 和同范围命令示例的 frontmatter `description` 中保留关键英文触发词；所有 Markdown 代码块逐字保留。翻译后还必须检查同范围技能文档的结构、触发描述、示例指令、资源索引和用户可读说明；若发现既有错误、不一致或影响使用体验的问题，应在不改变插件功能边界的前提下，在目标 Markdown 文件内一并矫正。

## 范围

Phase 4 包含以下 36 个 Markdown 文件，并在同范围内校验、优化或矫正 skill 文档的结构与内容问题：

| 分组 | 路径 | 处理方式 |
|---|---|---|
| Agent development | `plugins/plugin-dev/skills/agent-development/SKILL.md` | 翻译 agent 开发流程、frontmatter 说明、工具字段、触发策略和资源索引；frontmatter `description` 保留关键英文触发词。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md` | 翻译代码块外的 agent 创建提示说明；保护提示模板、路径和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md` | 翻译代码块外的完整 agent 示例说明；保护示例结构、frontmatter 模板和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md` | 翻译高级 agent 字段说明；保护字段名、模型名、工具名和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md` | 翻译代码块外的 agent 创建系统提示说明；保护系统提示示例和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md` | 翻译权限模式规则说明；保护 permission mode 名称、字段名和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md` | 翻译 system prompt 设计说明；保护提示词示例、标记结构和代码块。 |
| Agent development | `plugins/plugin-dev/skills/agent-development/references/triggering-examples.md` | 翻译触发示例说明；保护用户短语示例、agent 名称和代码块。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/SKILL.md` | 翻译 hook 开发流程、事件说明、配置模式和资源索引；frontmatter `description` 保留关键英文触发词。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/references/advanced.md` | 翻译高级 hook 说明；保护 hook 事件名、matcher、命令和代码块。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md` | 翻译 hook 输入 schema 说明；保护 schema 字段、事件名、JSON 结构和代码块。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/references/migration.md` | 翻译迁移说明；保护配置字段、路径、命令和代码块。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/references/patterns.md` | 翻译 hook 模式说明；保护 shell 命令、配置结构、matcher 和代码块。 |
| Hook development | `plugins/plugin-dev/skills/hook-development/scripts/README.md` | 翻译脚本 README 的代码块外说明；保护脚本名、命令、路径和代码块。 |
| MCP integration | `plugins/plugin-dev/skills/mcp-integration/SKILL.md` | 翻译 MCP 集成流程、server 类型、配置说明和资源索引；frontmatter `description` 保留关键英文触发词。 |
| MCP integration | `plugins/plugin-dev/skills/mcp-integration/references/authentication.md` | 翻译认证说明；保护 auth 字段、header 名称、token 示例和代码块。 |
| MCP integration | `plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md` | 翻译 server discovery 说明；保护 server 名称、路径、命令和代码块。 |
| MCP integration | `plugins/plugin-dev/skills/mcp-integration/references/server-types.md` | 翻译 server 类型说明；保护 stdio、SSE、HTTP、WebSocket、transport 字段和代码块。 |
| MCP integration | `plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md` | 翻译 tool 使用说明；保护 tool/resource/prompt 字段、工具调用语法和代码块。 |
| LSP integration | `plugins/plugin-dev/skills/lsp-integration/SKILL.md` | 翻译 LSP 集成流程、capability 说明、配置策略和资源索引；frontmatter `description` 保留关键英文触发词。 |
| LSP integration | `plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md` | 翻译代码块外的 LSP JSON 配置说明；保护 JSON 示例、server 名称和代码块。 |
| LSP integration | `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md` | 翻译最小 LSP 插件示例说明；保护 manifest 字段、命令、路径和代码块。 |
| LSP integration | `plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md` | 翻译 LSP capabilities 说明；保护 capability 名称、方法名和代码块。 |
| LSP integration | `plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md` | 翻译常见 LSP server 说明；保护 server 名称、安装命令、语言 ID 和代码块。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/SKILL.md` | 翻译 plugin settings 开发流程、配置说明、解析策略和资源索引；frontmatter `description` 保留关键英文触发词。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md` | 翻译设置命令示例说明；保护 command frontmatter、`$ARGUMENTS`、工具名和代码块。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md` | 翻译代码块外的设置示例说明；保护 YAML/JSON 字段、路径和代码块。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md` | 翻译 memory rules system 说明；保护规则字段、路径、命令和代码块。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md` | 翻译解析技术说明；保护 parser 示例、字段名、命令和代码块。 |
| Plugin settings | `plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md` | 翻译真实示例说明；保护配置片段、路径、字段名和代码块。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/SKILL.md` | 翻译 marketplace 结构、schema、发布模式和资源索引；frontmatter `description` 保留关键英文触发词。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md` | 翻译社区 marketplace 示例说明；保护 marketplace 文件结构、schema 字段和代码块。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md` | 翻译最小 marketplace 示例说明；保护索引结构、manifest 字段和代码块。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md` | 翻译团队 marketplace 示例说明；保护权限字段、路径和代码块。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md` | 翻译分发模式说明；保护 URL、路径、命令和代码块。 |
| Marketplace structure | `plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md` | 翻译 schema 参考说明；保护 schema 字段、JSON 示例和代码块。 |

## 不在范围

Phase 4 不包含：

- 翻译或校验 Phase 2/3 已处理的核心插件内容和核心开发技能目录。
- 翻译 shell 脚本、JSON 示例、YAML/JSON 键名、schema 字段、路径、命令名、slash command 名称、工具名、模型名或 API 名。
- 翻译任何 Markdown 代码块内部内容，即使代码块语言是 `text`、`markdown` 或未标注语言。
- 修改技能触发语义、插件功能边界、目录结构、脚本逻辑、校验器、CI 配置或新增自动化工具。
- 修改 `mcp-integration/examples/*.json` 或 `lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json`；这些 JSON 示例归 Phase 5 处理。
- 修改 `agent-development/scripts/*.sh`、`hook-development/examples/*.sh`、`hook-development/scripts/*.sh` 或 `plugin-settings/scripts/*.sh`；这些 shell 文件归 Phase 5 处理。
- 为解决超出本阶段文件范围的问题而修改其他文件；这类问题应记录为需另行确认的后续项。
- 对 Phase 4 范围外文件做格式化、重构或顺手清理。

## 翻译规则

### 通用规则

- 只翻译用户可读自然语言。
- Markdown 标题、段落、列表项、引用块和表格中的解释性文字应中文化。
- Markdown 链接的可见文字可以翻译；链接目标和锚点保持原文。
- 术语遵循 Phase 1 规则：核心术语在关键位置使用中文加英文关键词，例如插件（plugin）、技能（skill）、命令（command）、代理（agent）、hook、市场（marketplace）、frontmatter、清单（manifest）。
- `Claude Code`、`MCP`、`LSP`、`JSON`、`YAML`、`API`、工具名、模型名、协议名和 capability 名称保持英文。
- `$ARGUMENTS`、`$1`、`${CLAUDE_PLUGIN_ROOT}`、环境变量、文件路径、命令示例和 slash command 名称保持原文。
- `stdio`、`SSE`、`HTTP`、`WebSocket`、`tool`、`resource`、`prompt`、`matcher`、`capability` 等协议、配置或 schema token 在字段、表格和示例附近保持英文；需要解释时使用中文说明加英文原词。

### Markdown 代码块

- 所有 Markdown 代码块保持逐字原文。
- 不翻译代码块 fence、语言标记或代码块内部任何文本。
- 该规则覆盖 `bash`、`json`、`yaml`、`text`、`markdown` 和未标注语言的代码块。
- 如果代码块内部存在明显用户可读英文说明，也不在 Phase 4 中翻译；如确需处理，应记录为后续项或留给 Phase 5/后续决策。

### Skill frontmatter

`SKILL.md` 的处理规则：

- frontmatter 键名和结构保持原文。
- `name` 保持原文值。
- frontmatter `description` 翻译自然语言说明，但保留原始关键英文触发词和短语，尤其是用户可能直接输入的短语和插件开发领域关键词。
- 不新增或删除 frontmatter 字段，除非发现同文件内明显不改变行为的结构问题且能清楚说明原因。
- `allowed-tools`、`model`、`context`、`agent`、`skills`、`user-invocable`、`disable-model-invocation`、`hooks`、`argument-hint` 等字段名和机器可读值保持原文。

### Command frontmatter 示例

`plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md` 是 Phase 4 范围内带 frontmatter 的命令示例 Markdown。处理规则：

- frontmatter 键名和结构保持原文。
- `argument-hint`、`allowed-tools`、`model`、`disable-model-invocation` 等机器可读字段值保持原文。
- frontmatter `description` 可以中文化，但保留 `settings`、`plugin settings`、`command` 等关键英文触发词。
- 正文说明可以中文化；代码块、命令示例、`$ARGUMENTS`、工具名、路径和字段名保持原文。

### 示例和参考资料

`examples/`、`references/` 和同范围 `scripts/README.md` 的处理规则：

- 翻译代码块外的示例介绍、操作说明、权衡说明、表格解释和故障排查文字。
- 保留示例文件树、命令、路径、字段名、工具调用语法、模型名、协议字段和配置片段。
- 表格行需逐项判断：字段名、示例值、枚举值和机器可读 token 保持原文；解释性文字中文化。
- 不因翻译调整示例行为、命令顺序、配置结构、schema 结构或脚本调用方式。

## 质量矫正规则

翻译完成后必须对本阶段涉及的 6 个集成和工具类 skill 及其 references/examples 做正确性校验。校验范围包括：

- `SKILL.md` frontmatter 是否包含必要字段，字段名和字段值类型是否符合技能约定。
- `description` 是否保留关键英文触发词，且中文说明不会削弱触发意图。
- `plugin-settings/examples/create-settings-command.md` 的 command frontmatter 是否仍保持可解析结构，关键字段是否未被误译。
- 技能正文、示例说明、参考文档和资源索引是否互相一致。
- MCP、LSP、hook、settings、marketplace、schema、tool、resource、prompt、capability、matcher 等术语和 token 是否一致。
- 路径、链接文字、文件名、组件名、工具名、事件名、schema 字段和示例指令是否与目标文件职责一致。
- 用户可读说明是否存在明显过时、不准确、矛盾或会误导使用的问题。

允许在 36 个目标 Markdown 文件内修复：

- 翻译前已经存在的拼写、措辞、结构说明、触发描述或示例说明问题。
- 与当前文件职责不一致的用户可读说明。
- 同文件内不改变功能边界的链接文字、资源索引、术语或说明不一致问题。
- 不改变行为的 frontmatter `description` 表达问题。

不允许直接修复：

- 需要新增功能、改变技能或插件行为、改目录结构或新增校验器的问题。
- 需要修改 Phase 4 范围外文件的问题。
- 需要改变代码块、脚本、JSON 示例或机器可读字段的问题。

这类问题应记录为需另行确认的后续项。

## 文件分组策略

### Agent development

目标文件：

- `plugins/plugin-dev/skills/agent-development/SKILL.md`
- `plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md`
- `plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md`
- `plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md`
- `plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md`
- `plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md`
- `plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md`
- `plugins/plugin-dev/skills/agent-development/references/triggering-examples.md`

这些文件说明 agent 创建、触发设计、系统提示、工具权限、permission modes 和高级字段。翻译应保护 `Agent`、`tools`、`model`、`color`、`skills`、permission mode 名称、系统提示标记、用户触发短语、路径和代码块。`description` 应保留 `create an agent`、`subagent`、`agent frontmatter`、`agent triggers`、`system prompt`、`permission modes` 等关键英文触发词。

### Hook development

目标文件：

- `plugins/plugin-dev/skills/hook-development/SKILL.md`
- `plugins/plugin-dev/skills/hook-development/references/advanced.md`
- `plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md`
- `plugins/plugin-dev/skills/hook-development/references/migration.md`
- `plugins/plugin-dev/skills/hook-development/references/patterns.md`
- `plugins/plugin-dev/skills/hook-development/scripts/README.md`

这些文件说明 hook 事件、matcher、输入 schema、迁移模式、配置模式和脚本辅助工具。翻译应保护 `PreToolUse`、`PostToolUse`、`Notification`、`Stop`、`SubagentStop`、`UserPromptSubmit`、`SessionStart`、`PreCompact`、`matcher`、JSON 字段、shell 命令、脚本名、路径和代码块。`description` 应保留 `hook`、`Claude Code hooks`、`hook event`、`matcher`、`settings.json`、`PreToolUse` 等关键英文触发词。

### MCP integration

目标文件：

- `plugins/plugin-dev/skills/mcp-integration/SKILL.md`
- `plugins/plugin-dev/skills/mcp-integration/references/authentication.md`
- `plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md`
- `plugins/plugin-dev/skills/mcp-integration/references/server-types.md`
- `plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md`

这些文件说明 MCP server 配置、server discovery、server 类型、认证和 tool/resource/prompt 使用。翻译应保护 `MCP`、`Model Context Protocol`、`stdio`、`SSE`、`HTTP`、`WebSocket`、`tool`、`resource`、`prompt`、header 名称、token 示例、JSON 字段、路径和代码块。`description` 应保留 `MCP server`、`Model Context Protocol`、`mcpServers`、`stdio`、`SSE`、`HTTP`、`tool usage` 等关键英文触发词。

### LSP integration

目标文件：

- `plugins/plugin-dev/skills/lsp-integration/SKILL.md`
- `plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md`
- `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md`
- `plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md`
- `plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md`

这些文件说明 LSP server 集成、capabilities、JSON 配置和常见语言 server。翻译应保护 `LSP`、`Language Server Protocol`、capability 名称、server 名称、语言 ID、安装命令、manifest 字段、路径和代码块。`description` 应保留 `LSP server`、`Language Server Protocol`、`language server`、`lspServers`、`capabilities` 等关键英文触发词。

### Plugin settings

目标文件：

- `plugins/plugin-dev/skills/plugin-settings/SKILL.md`
- `plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md`
- `plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md`
- `plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md`
- `plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md`
- `plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md`

这些文件说明插件设置、命令读取设置、hook 读取设置、frontmatter/YAML 解析、memory rules 和真实配置示例。翻译应保护 `settings.json`、`settings.local.json`、frontmatter 字段、`$ARGUMENTS`、工具名、路径、配置字段和代码块。`description` 应保留 `plugin settings`、`settings.json`、`configuration`、`frontmatter`、`YAML`、`memory rules` 等关键英文触发词。

### Marketplace structure

目标文件：

- `plugins/plugin-dev/skills/marketplace-structure/SKILL.md`
- `plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md`
- `plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md`
- `plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md`
- `plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md`
- `plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md`

这些文件说明 marketplace 目录结构、schema、索引、分发模式和团队/社区 marketplace 示例。翻译应保护 `marketplace`、schema 字段、manifest 字段、索引字段、URL、路径、命令、权限字段和代码块。`description` 应保留 `marketplace`、`plugin marketplace`、`marketplace structure`、`schema`、`distribution` 等关键英文触发词。

## 成功标准

Phase 4 完成时必须满足：

- 36 个目标 Markdown 文件中代码块外的用户可读英文说明已按本规格中文化。
- 6 个 `SKILL.md` 的 frontmatter 仍保持可解析结构，`name` 等 protected fields 未被修改。
- `plugin-settings/examples/create-settings-command.md` 的 command frontmatter 仍保持可解析结构，关键机器可读字段未被修改。
- 6 个 `SKILL.md` 的 `description` 已中文化，并保留关键英文触发词和插件开发技术词。
- 技能名、路径、工具名、模型名、schema 字段、frontmatter 字段、示例命令、协议字段和 `$ARGUMENTS` 等机器可读 token 未被误译。
- 所有 Markdown 代码块内部内容、fence 和语言标记保持原文。
- 本阶段涉及的 skill 文档已完成结构、触发描述、示例指令、资源索引和用户可读说明校验；发现的既有问题已在不改变功能边界的前提下矫正，或记录为需另行确认的后续问题。
- 未修改 Phase 4 范围外 Markdown、shell 脚本、JSON 示例、技能名、命令名、路径、目录结构或插件功能边界。

## 验证证据要求

Phase 4 实现完成前必须提供具体证据，不能只写“done”“tested”或“looks good”。

最低证据集：

1. **范围证据**：记录 Phase 4 目标文件清单为 36 个 Markdown 文件，并记录 `git diff --name-only` 或等价输出，确认插件内容修改只涉及 Phase 4 的目标 Markdown 文件；如有 roadmap、spec 或 plan artifact 更新，需单独说明其原因。
2. **frontmatter 证据**：检查 6 个 `SKILL.md` 和 `plugin-settings/examples/create-settings-command.md` 的 YAML frontmatter 仍以 `---` 包裹，`name` 或 command 关键字段保持原文，`description` 保留关键英文触发词；如存在其他 frontmatter 字段，确认字段名和机器可读值未被误译。
3. **代码块保护证据**：确认所有目标 Markdown 文件的代码块 fence、语言标记和块内内容保持原文；应使用 nested-fence-aware 脚本比对或记录等价人工抽查结果。
4. **术语和 token 证据**：抽查至少 10 个集成类术语或 token，确认 MCP、LSP、hook、settings、marketplace、schema、tool、resource、prompt、frontmatter、manifest、capability、matcher、Claude Code 等按 Phase 1 术语规则处理。
5. **质量矫正证据**：记录本阶段同范围小修的文件和问题类型；若发现超出范围的问题，记录为后续项而不是直接修改。
6. **行为不变证据**：说明未修改 shell 脚本、JSON 示例、技能名、命令名、路径、目录结构或插件功能边界。

可接受的验证方式包括：

- `git diff --name-only` 和重点文件 diff 摘要。
- frontmatter 边界和 protected fields 的脚本检查或人工抽查记录。
- nested-fence-aware 代码块 diff 抽查或全量比对记录。
- 关键术语和协议 token 抽查记录。
- 同范围 skill 文档结构、触发、资源索引和示例说明检查记录。

## 计划交接

下一步应基于本规格创建 Phase 4 实现计划。计划应分组处理 agent-development、hook-development、mcp-integration、lsp-integration、plugin-settings 和 marketplace-structure，并把 skill 文档质量校验、必要矫正和验证步骤安排在实现后执行。

建议下一条手动命令：

```text
/superpowers:roadmap-management write-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 4
```
