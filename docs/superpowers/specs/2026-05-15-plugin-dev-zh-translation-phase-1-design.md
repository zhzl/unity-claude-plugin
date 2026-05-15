# plugin-dev 中文化 Phase 1 规格：盘点与术语表

## Context and Goal

本规格对应路线图：

`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

Phase 1 的目标是盘点 `plugins/plugin-dev` 下的 Markdown、JSON 和 shell 文件，并定义后续中文化工作共用的术语表、保留原文规则、高风险字段清单和验证证据要求。

整体目标是将 `plugins/plugin-dev` 下的用户可读内容系统翻译为中文，同时保持插件（plugin）、技能（skill）、命令（command）、代理（agent）、示例和脚本行为不变。

## Scope

Phase 1 包含：

- 盘点目标目录中的 Markdown、JSON 和 shell 文件。
- 为每个文件标注后续负责阶段、主要风险类别和处理备注。
- 定义中文化术语表。
- 定义不可翻译 token 和允许谨慎翻译的内容。
- 定义高风险字段和后续验证证据要求。

## Out of Scope

Phase 1 不包含：

- 批量翻译 `plugins/plugin-dev` 内容。
- 修改插件行为、脚本逻辑或目录结构。
- 新增插件功能、校验器、CLI 命令、后台同步或新工具。
- 将详细执行步骤写入路线图。

## Shared Constraints

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- frontmatter 的 `description` 若会影响触发或发现，应保留关键英文触发词或采用中英混排以避免语义丢失。
- 每个阶段完成前必须提供具体验证证据，例如 diff 抽查、格式校验、脚本/manifest 校验或相关测试输出。
- 不覆盖或清理与 Phase 1 规格无关的既有工作区修改。

## Inventory Summary

目标文件基线：

| Metric | Count |
|---|---:|
| Total target files | 99 |
| Markdown files | 79 |
| JSON files | 6 |
| Shell files | 14 |
| Markdown files with frontmatter | 19 |
| Markdown files with code fences | 76 |
| Frontmatter Markdown files that also contain code fences | 18 |

按顶层目录分布：

| Top-level group | Count |
|---|---:|
| `.claude-plugin` | 1 |
| `agents` | 3 |
| `commands` | 4 |
| `docs` | 5 |
| `skills` | 86 |

按后续负责阶段分布：

| Owner Phase | Count | Scope |
|---|---:|---|
| Phase 2 | 13 | `.claude-plugin`、`commands`、`agents`、`docs` |
| Phase 3 | 31 | 核心开发技能 Markdown：`plugin-dev-guide`、`plugin-structure`、`command-development`、`skill-development` |
| Phase 4 | 36 | 集成和工具类技能 Markdown：`agent-development`、`hook-development`、`mcp-integration`、`lsp-integration`、`plugin-settings`、`marketplace-structure` |
| Phase 5 | 19 | JSON 示例、shell 脚本和最终一致性验证 |

主要风险类别：

| Risk Category | Meaning |
|---|---|
| `frontmatter` | Markdown 文件以 YAML frontmatter 开头；键名不可翻译，`description` 需保留关键英文触发词。 |
| `code-fence-heavy` | Markdown 文件包含代码块；代码、配置、命令和路径默认不可翻译。 |
| `json-config` | JSON manifest 或示例；键名不可翻译，修改后必须保持 JSON 有效。 |
| `shell-behavior` | shell 脚本；逻辑、变量、命令和退出码不可改变。 |
| `standard-doc` | 普通 Markdown 文档；以自然语言翻译为主。 |

## Full File Inventory

| Path | Type | Owner Phase | Risk Category | Notes |
|---|---|---|---|---|
| `plugins/plugin-dev/.claude-plugin/plugin.json` | JSON | Phase 2 | `json-config` | manifest JSON；键名不变，`description` 谨慎处理。 |
| `plugins/plugin-dev/agents/agent-creator.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/agents/plugin-validator.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/agents/skill-reviewer.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/commands/create-marketplace.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/commands/create-plugin.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/commands/plugin-dev-guide.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词。 |
| `plugins/plugin-dev/commands/start.md` | Markdown | Phase 2 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/docs/ci-cd.md` | Markdown | Phase 2 | `standard-doc` | 翻译自然语言正文。 |
| `plugins/plugin-dev/docs/component-patterns.md` | Markdown | Phase 2 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/docs/release-procedure.md` | Markdown | Phase 2 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/docs/troubleshooting.md` | Markdown | Phase 2 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/docs/workflow-security.md` | Markdown | Phase 2 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/references/triggering-examples.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/command-development/SKILL.md` | Markdown | Phase 3 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/command-development/examples/plugin-commands.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/examples/simple-commands.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/advanced-workflows.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/documentation-patterns.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/interactive-commands.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/plugin-integration.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/skill-tool.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/references/testing-strategies.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/command-development/scripts/validate-command.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/examples/load-context.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/examples/validate-write.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/references/advanced.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/references/migration.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/references/patterns.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/scripts/README.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/lsp-integration/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json` | JSON | Phase 5 | `json-config` | JSON 示例 manifest；键名不变，`description` 谨慎处理。 |
| `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/mcp-integration/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/mcp-integration/examples/http-server.json` | JSON | Phase 5 | `json-config` | JSON 示例；键名不变，仅处理 `_comment` 等说明字符串。 |
| `plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json` | JSON | Phase 5 | `json-config` | JSON 示例；键名不变，仅处理 `_comment` 等说明字符串。 |
| `plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json` | JSON | Phase 5 | `json-config` | JSON 示例；键名不变，仅处理 `_comment` 等说明字符串。 |
| `plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json` | JSON | Phase 5 | `json-config` | JSON 示例；键名不变，仅处理 `_comment` 等说明字符串。 |
| `plugins/plugin-dev/skills/mcp-integration/references/authentication.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/mcp-integration/references/server-types.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md` | Markdown | Phase 3 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/SKILL.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md` | Markdown | Phase 4 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md` | Markdown | Phase 4 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh` | Shell | Phase 5 | `shell-behavior` | 逻辑、变量、命令和退出码不变；仅处理注释和用户可读 `echo`。 |
| `plugins/plugin-dev/skills/plugin-structure/SKILL.md` | Markdown | Phase 3 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/github-actions.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/plugin-structure/references/output-styles.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/SKILL.md` | Markdown | Phase 3 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/examples/complete-skill.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md` | Markdown | Phase 3 | `standard-doc` | 翻译自然语言正文。 |
| `plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md` | Markdown | Phase 3 | `code-fence-heavy` | 保护代码块。 |
| `plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md` | Markdown | Phase 3 | `frontmatter` | 保护 frontmatter 键名；`description` 保留关键英文触发词；保护代码块。 |

## Glossary

默认风格为“中文+英文”：核心术语在首次或关键位置使用“中文（English）”，后续中文为主；触发、检索、frontmatter `description` 等高风险位置保留关键英文词。

| English | 中文写法 |
|---|---|
| plugin | 插件（plugin） |
| skill | 技能（skill） |
| command | 命令（command） |
| slash command | 斜杠命令（slash command） |
| agent | 代理（agent） |
| hook | hook / 钩子（hook） |
| MCP | MCP |
| LSP | LSP |
| marketplace | 市场（marketplace） |
| manifest | 清单（manifest） |
| frontmatter | frontmatter |
| schema | schema |
| tool | 工具（tool） |
| trigger | 触发条件（trigger） |
| validation | 校验（validation） |
| workflow | 工作流（workflow） |
| permission | 权限（permission） |
| settings | 设置（settings） |
| component | 组件（component） |
| reference | 参考资料（reference） |
| example | 示例（example） |
| prompt | 提示词（prompt） |
| model | 模型（model） |
| server | 服务器（server） |
| client | 客户端（client） |
| manifest file | 清单文件（manifest file） |
| JSON schema | JSON schema |
| YAML frontmatter | YAML frontmatter |

## Non-translatable Rules

默认不得翻译：

- 文件路径、目录名、文件名。
- 命令名、斜杠命令名称、参数占位符。
- JSON、YAML、frontmatter 键名。
- schema 字段名、manifest 字段名。
- shell 命令、环境变量、函数名、变量名、退出码。
- 工具名、模型 ID、API 名。
- Markdown 链接目标、锚点、代码块 fence。
- 代码块中的可执行代码、配置示例、命令示例和路径。

允许翻译但必须谨慎处理：

- Markdown 正文自然语言。
- Markdown 表格中的解释性文字。
- frontmatter `description` 的自然语言部分。
- JSON `_comment` 和 `description` 字符串值。
- shell 脚本注释和 `echo` 输出中的用户可读文案。

## High-risk Fields

### frontmatter `description`

风险：`description` 可能影响技能、命令或代理的触发、发现和检索。

规则：

- frontmatter 键名保持原文。
- `description` 可翻译为中文，但保留原始关键英文触发词。
- 技术对象名、工具名、命令名、模型名和路径保持原文。

### Markdown 代码块

风险：代码块可能包含命令、JSON/YAML、路径、frontmatter 模板、shell 示例和工具调用示例。

规则：

- 代码块默认不翻译。
- 只有明确是面向用户的纯文案示例时，后续阶段才可按人工判断处理。
- 代码块 fence 的语言标记保持原文。

### JSON 文件

风险：JSON 键名、对象结构和字符串值可能被混淆。

规则：

- JSON 键名保持原文。
- 只允许谨慎处理 `_comment`、`description` 等用户可读字符串值。
- 每次修改后必须验证 JSON 解析通过。

### Shell 脚本

风险：翻译可能破坏命令、变量、条件判断、管道、退出码或 stderr/stdout 行为。

规则：

- shebang、命令、变量、函数名、参数、退出码和控制流保持不变。
- 只允许翻译注释和用户可读 `echo` 输出。
- 修改后必须做语法或等效行为验证。

### 工具名与 Claude Code 专有名词

风险：工具名和专有名词被翻译后会降低可执行性或可检索性。

规则：

- `Skill`、`Agent`、`Bash`、`Read`、`Write`、`Edit`、`Glob`、`Grep`、`AskUserQuestion`、`TaskCreate`、`TaskUpdate`、`TaskList` 等工具名保持原文。
- `Claude Code`、`MCP`、`LSP`、`JSON`、`YAML`、`API` 等专有词保持英文。
- 需要解释时使用中文说明加英文原词。

## Verification Evidence Requirements

Phase 1 完成时必须提供具体证据，不能只写“done”“tested”或“looks good”。

最低证据集：

1. 盘点证据：记录目标文件总数和分类统计，且与本规格的 99 个文件基线一致，或解释差异来自新增/删除文件。
2. 完整清单证据：规格中的 `Full File Inventory` 覆盖所有目标 Markdown、JSON 和 shell 文件。
3. 术语证据：`Glossary` 覆盖 plugin、skill、command、agent、hook、MCP、LSP、marketplace、frontmatter、manifest、schema 等核心术语。
4. 风险规则证据：`Non-translatable Rules` 和 `High-risk Fields` 明确覆盖 frontmatter、代码块、JSON、shell、工具名和专有名词。
5. 范围证据：Phase 1 不修改 `plugins/plugin-dev` 内容，不新增工具，不改目录结构。
6. 自检证据：规格中没有空章节、未完成占位符、互相矛盾的规则或超过 Phase 1 的实现细节。

可接受的验证输出示例：

- 文件统计命令输出显示 Markdown、JSON、shell 数量。
- 对规格文档的占位符扫描结果。
- 对完整清单行数和目标文件数的比对结果。
- 人工抽查记录，说明 frontmatter、代码块、JSON 和 shell 的规则均已覆盖。

## Handoff to Planning

下一步应基于本规格创建 Phase 1 实现计划。计划只应执行盘点、文档化和路线图 artifact 回填，不应开始批量翻译 `plugins/plugin-dev` 内容。

建议下一条手动命令：

```text
/superpowers:roadmap-management write-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 1
```
