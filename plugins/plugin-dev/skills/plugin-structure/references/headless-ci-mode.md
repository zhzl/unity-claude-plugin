# Headless Mode 与 CI Mode 的 Plugin 兼容性

Plugins 在 headless mode（`claude -p`）与 interactive sessions 中的行为不同。理解这些差异，对构建能在所有 runtime contexts 中可靠工作的 plugins 至关重要。

## Headless Mode 基础

Headless mode 会将 Claude Code 作为 single-shot command-line tool 执行：

```bash
claude -p "Analyze this codebase for security issues" --allowedTools "Read,Grep,Glob"
```

### Headless Mode 中可用的能力

- **Hooks：** Command hooks 正常执行。Prompt hooks 对受支持的 events 正常工作。
- **MCP servers：** 像平常一样启动并连接。Tools 可用。
- **CLAUDE.md：** Project 和 user memory files 正常加载。
- **Agents：** 执行期间可以通过 Agent tool 生成。
- **Skills（用于 discovery）：** Skill descriptions 仍可用于 auto-discovery，Claude 可在合适时按程序调用匹配的 skills。

### Headless Mode 中不可用的能力

- **Slash commands：** `/skill-name` invocation 需要 interactive session。Skills 无法在 `-p` mode 中通过 slash commands 调用。
- **Interactive prompts：** `AskUserQuestion` tool 不可用，因为没有用户可回答。
- **Skill tool（手动）：** 用户不能输入 `/` 来调用 skills。应描述任务，让 Claude 判断是否调用匹配的 skill。

### Skills 的替代做法

在 headless mode 中，不要调用 `/review`，而是描述任务：

```bash
# Won't work:
claude -p "/review"

# Works — describe what you want:
claude -p "Review the codebase for code quality issues"
```

如果安装了匹配的 skill，Claude 仍可从 skill description 中发现它，并在合适时自动调用。`user-invocable: false` 只会隐藏 interactive slash invocation；它不会在 headless mode 中预加载完整的 SKILL.md body。

## Permission control（permission 控制）

### --allowedTools

自动批准特定 tools，避免 interactive prompts：

```bash
claude -p "Fix the bug" --allowedTools "Read,Write,Edit,Bash(git *)"
```

**Permission rule 语法：**

| Pattern | 匹配内容 |
| ---------------------- | ------------------------------------------------------------ |
| `Read` | 所有 Read tool calls |
| `Bash(git *)` | 以 "git " 开头的 Bash commands（带空格的前缀匹配） |
| `mcp__*` | 所有 MCP tool calls |
| `mcp__myserver__*` | 来自特定 MCP server 的 tools |
| `Write,Edit` | 多个 tools（逗号分隔） |

**Plugin 设计提示：** 在 plugin README 中记录 CI usage 推荐的 `--allowedTools` 值。

### --max-turns

限制自主 tool-use 迭代次数，以控制成本和 runtime：

```bash
claude -p "Run tests and fix failures" --allowedTools "Read,Edit,Bash" --max-turns 10
```

每次 tool call 计为一个 turn。没有此限制时，Claude 可能会在复杂任务上无限迭代。

## 结构化输出（structured output）

### JSON output

获取机器可读响应：

```bash
claude -p "List all TODO comments" --output-format json
```

返回：

```json
{
  "result": "Found 5 TODO comments...",
  "session_id": "abc123",
  "metadata": {}
}
```

### JSON schema validation

强制使用特定输出结构：

```bash
claude -p "Extract function signatures from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
```

**Plugin 设计提示：** 如果你的 plugin 提供 analysis workflows，请记录用户可用于 structured CI output 的示例 JSON schemas。

## System prompt 交互

### --append-system-prompt

在默认 system prompt（以及已加载的 plugin content）旁追加指令：

```bash
claude -p "Review code" --append-system-prompt "Focus on security vulnerabilities only"
```

Plugin skill content 会在 system prompt overrides 之前加载。Append 会添加到现有上下文中，而不是替换它。

### --system-prompt

完全替换默认 system prompt：

```bash
claude -p "Analyze" --system-prompt "You are a security auditor..."
```

**注意：** 这会替换默认 prompt，但 plugin content 仍会加载。`--system-prompt` 与 plugin skills 之间的交互可能产生意外行为。

## Session management（session 管理）

### 继续上一个 session

```bash
claude -p "What was the last change you made?" --continue
```

### 恢复指定 session

```bash
claude -p "Continue fixing the auth bug" --resume "$SESSION_ID"
```

恢复 session 时，plugin state（hooks、MCP servers、skill context）会重新加载。

## CI 兼容性的 Plugin Design Guidelines

### 1. 在 Headless Mode 中测试

```bash
# Test your plugin works in non-interactive mode
claude -p "Run the plugin's primary workflow" \
  --plugin-dir /path/to/plugin \
  --allowedTools "Read,Write,Edit,Bash"
```

### 2. 避免 interactive-only patterns

- 不要在 critical workflows 中依赖 `AskUserQuestion`
- 当用户输入不可用时，提供合理默认值
- 设计无需用户确认也能工作的 hooks

### 3. 记录 CI usage

在 plugin README 中包含 CI section：

```markdown
## CI/Headless Usage

This plugin works in headless mode. Example:

\`\`\`bash
claude -p "Run security audit" \
 --allowedTools "Read,Grep,Glob,Bash(npm \*)" \
 --max-turns 20 \
 --output-format json
\`\`\`
```

### 4. 优雅处理缺失环境

在 CI environments 中，某些 tools 或上下文可能不可用：

- MCP servers 可能没有 authentication tokens
- Git history 可能是 shallow clones
- Environment variables 可能不同于本地 dev

设计 hooks 和 skills 时，应能处理这些情况而不是硬失败。

### 5. 成本感知设计

CI runs 可能累积显著 API costs。帮助用户控制支出：

- 为常见 workflows 推荐 `--max-turns` 值
- 对简单 analysis skills 使用 `haiku` model
- 记录关键 workflows 的预期 token usage
