# plugin-dev 中文化 Phase 5 规格：示例、脚本与最终一致性

## Context and Goal

本规格对应路线图：

`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

Phase 5 是 `plugins/plugin-dev` 中文化路线图的收尾阶段。目标是处理 JSON 示例和 shell 脚本中允许翻译的用户可读内容，并对整个 `plugins/plugin-dev` 做最终自然语言一致性验证，同时保持插件、技能、命令、代理、示例和脚本行为不变。

本阶段沿用 Phase 1 的术语表和保留规则：中文为主，关键英文技术词、路径、命令、字段、工具名、模型名、API 名和 schema 相关 token 保持原文。

## Scope

Phase 5 的主编辑范围是 Phase 1 清单中标记为 Phase 5 的 19 个文件。

### JSON 示例

- `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json`
- `plugins/plugin-dev/skills/mcp-integration/examples/http-server.json`
- `plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json`
- `plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json`
- `plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json`

### Shell 脚本

- `plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh`
- `plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh`
- `plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh`
- `plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh`
- `plugins/plugin-dev/skills/command-development/scripts/validate-command.sh`
- `plugins/plugin-dev/skills/hook-development/examples/load-context.sh`
- `plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh`
- `plugins/plugin-dev/skills/hook-development/examples/validate-write.sh`
- `plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh`
- `plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh`
- `plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh`
- `plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh`
- `plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh`
- `plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh`

### Final consistency scope

最终一致性验证覆盖整个 `plugins/plugin-dev` 的可翻译自然语言位置：

- Markdown code fence 外正文、表格和标题。
- JSON 中允许翻译的 `_comment` 和 `description` 字符串值。
- Shell 脚本注释。

如果最终一致性验证发现主范围外存在 code fence 外明显漏网的用户可读英文，可以在 Phase 5 修复。每个漏网修复必须在验收证据中单独记录路径、修复原因和边界判断。

## Out of Scope

Phase 5 不包含：

- 翻译 shell 脚本的 `echo`、`printf`、usage、error、success、warning 等输出文本。
- 翻译 JSON 键名、对象名、命令、URL、header 名、环境变量、schema 字段、工具名、模型名或 API 名。
- 翻译 Markdown code fence 内的命令、配置、示例代码、路径或注释。
- 修改 shell 脚本的 shebang、命令、变量、函数名、参数、条件判断、管道、退出码、文件路径或正则表达式。
- 新增测试框架、校验器、CLI 命令或自动同步机制。
- 重排目录结构或重新拆分前面阶段范围。
- 触碰当前工作区中与 `plugins/plugin-dev` 中文化无关的修改。

## Translation Rules

### JSON 示例规则

JSON 文件中可翻译内容仅限：

- `_comment` 字符串值。
- 示例插件 manifest 中面向用户的 `description` 字符串值。

翻译 `description` 时应保留关键英文技术词，例如 `Go`、`language server`、`Claude Code`、`LSP`。JSON 文件中的键名、结构、命令、URL、header、环境变量、包名和示例服务名保持不变。

### Shell 脚本规则

Shell 脚本中可翻译内容仅限注释中的用户可读英文。

即使输出文本是用户可读内容，也不在本阶段翻译以下内容：

- `echo` 输出。
- `printf` 输出。
- usage/help 输出。
- error、warning、success、failed、passed 等状态输出。
- heredoc 中作为脚本输出或示例输入的一部分。

本阶段对 shell 的“行为不变”要求包括：命令、变量、函数、参数、控制流、退出码、文件路径、正则表达式以及 stdout/stderr 输出文本均保持不变。

### 漏网修复规则

主范围外的漏网修复必须同时满足：

- 位于 `plugins/plugin-dev` 内。
- 位于 Markdown code fence 外、JSON 允许翻译字段，或 shell 注释中。
- 属于明显用户可读自然语言，而不是路径、命令、字段名、工具名、模型名、API 名、schema token 或英文技术术语。
- 修复不会改变前面阶段已保护的机器可读内容或示例代码。

不满足以上条件的发现应记录为合理保留英文或后续决策项，不在 Phase 5 中修改。

## Verification Evidence Requirements

Phase 5 完成时必须提供具体 `Verification Evidence`，不能只写 `done`、`tested` 或 `looks good`。

最低证据集如下。

### Scope evidence

记录实际修改文件列表，并说明：

- 主范围修改是否限于 19 个 Phase 5 文件。
- 是否存在主范围外漏网修复。
- 每个漏网修复的路径、原因和边界判断。
- 是否存在新增、删除、重命名或目录结构变化。

### JSON evidence

对 5 个 Phase 5 JSON 文件提供验证证据：

- JSON parse 全部通过。
- diff 抽查确认只修改 `_comment` 或允许翻译的 `description` 字符串值。
- JSON 键名、结构、命令、URL、header、环境变量和示例服务名保持不变。

### Shell evidence

对 14 个 shell 文件提供验证证据：

- shell 语法检查通过。
- diff 抽查确认只修改注释。
- `echo`、`printf`、usage、error、warning、success、failed、passed 等输出文本保持不变。
- 命令、变量、函数、参数、控制流、退出码、文件路径和正则表达式保持不变。
- 未修改的 shell 文件也应记录为已检查。

### Final consistency evidence

对整个 `plugins/plugin-dev` 的可翻译自然语言位置提供最终一致性证据：

- Markdown code fence 外自然语言残留英文扫描结论。
- JSON `_comment` 和允许翻译的 `description` 字段检查结论。
- Shell 注释检查结论。
- 合理保留英文的 allowlist 分类。
- 已修复漏网项或需后续决策项列表。

合理保留英文至少包括：`Claude Code`、`MCP`、`LSP`、`JSON`、`YAML`、`API`、`frontmatter`、`manifest`、`schema`、`plugin`、`skill`、`command`、`agent`、`hook`、`settings`、路径、命令、字段名、工具名、模型名、包名和示例服务名。

### Format evidence

提供格式验证证据：

- `git diff --check` 通过。
- 若仅出现 LF/CRLF 警告，应按前面阶段的证据风格说明没有 whitespace error。

## Success Criteria

Phase 5 完成后应满足：

- 5 个 Phase 5 JSON 示例仍为有效 JSON。
- 14 个 shell 脚本语法有效，且输出文本、控制流、退出码和核心行为未改变。
- JSON 示例中允许翻译的用户可读字符串已中文化。
- Shell 脚本注释中需要翻译的用户可读英文已中文化，输出文本保持原文。
- 全局自然语言一致性验证完成，明显漏网项已修复或记录为合理保留/后续决策项。
- 机器可读内容、路径、命令、schema 字段、工具名和技术 token 未被误译。

## Handoff to Planning

下一步应基于本规格创建 Phase 5 实现计划。计划应优先按以下顺序组织：

1. 确认 19 个主范围文件和当前工作区隔离边界。
2. 处理 5 个 JSON 示例中的允许翻译字符串。
3. 处理 14 个 shell 脚本注释，保持输出文本不变。
4. 执行全局自然语言一致性验证，并修复符合本规格的漏网项。
5. 收集 scope、JSON、shell、最终一致性和格式验证证据。
6. 回填 roadmap artifact 和 Phase 5 完成证据。

建议下一条手动命令：

```text
/superpowers:roadmap-management write-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 5
```
