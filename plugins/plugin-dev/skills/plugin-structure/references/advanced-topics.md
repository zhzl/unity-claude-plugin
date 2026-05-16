# Plugin 高级主题

本参考涵盖 plugin 开发者在高级用例中可能遇到的主题。每个章节都是自包含的。

## 键位绑定的 plugin context

Claude Code 的 keybindings system（`~/.claude/keybindings.json`）包含一个用于 plugin management actions 的 `plugin:` context：

| 操作 | 说明 |
| ---------------- | ----------------------- |
| `plugin:toggle` | 启用/禁用一个 plugin |
| `plugin:install` | 安装一个 plugin |

**配置：**

```json
{
  "bindings": [
    {
      "context": "Plugin",
      "bindings": {
        "ctrl+p": "plugin:toggle"
      }
    }
  ]
}
```

**与 plugin 开发者的相关性：** 低。这是面向用户的 configuration。Plugins 不能定义自定义 keybindings。如果你的 plugin 有常用 commands，请记录用户可自行配置的 keyboard shortcuts。

## 状态栏（status line）集成

Plugins 可以提供 status line scripts，在 Claude Code footer 中显示上下文信息。

### 工作方式

用户在 `.claude/settings.json` 中配置 status line command：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

该 script 通过 stdin 接收包含 session context（model、cost、tokens、workspace info）的 JSON，并输出单行文本（支持 ANSI colors）。

### 可用数据

JSON input 包含：

- `model.display_name` — 当前 model 名称
- `cost.total_cost_usd` — Session 成本
- `cost.total_lines_added` / `total_lines_removed` — 代码变更
- `context_window.used_percentage` — Context 使用率
- `context_window.total_input_tokens` / `total_output_tokens` — Token 计数
- `workspace.current_dir` / `project_dir` — Directory 信息
- `version` — Claude Code 版本

### Plugin 用例

Plugin 可以打包一个显示 plugin-specific 信息的 status line script：

```bash
#!/bin/bash
input=$(cat)
model=$(echo "$input" | jq -r '.model.display_name')
cost=$(echo "$input" | jq -r '.cost.total_cost_usd')
echo "[$model] \$${cost}"
```

**注意：** 用户必须手动配置自己的 status line 来使用该 plugin 的 script。没有自动配置机制。

## Claude Code 作为 MCP server

Claude Code 本身可以作为 MCP server，向其他 MCP clients 暴露其能力：

```bash
claude mcp serve
```

**与 plugin 开发者的相关性：** 边缘场景。当构建需要一个 Claude Code instance 与另一个 instance 通信的 toolchain，或将 Claude Code 集成到更大的 MCP-based system 中时，这很有用。Plugin MCP servers 不受此功能影响。

## MCP `@` resource 引用语法

用户可以使用 `@` syntax inline 引用 MCP resources：

```
@server-name:protocol://resource/path
```

### 常见模式

| 语法 | 示例 |
| ------------- | ------------------------------------------- |
| 文件 resource | `@filesystem:file:///path/to/file.txt` |
| Database（数据库） | `@database:postgres://localhost/mydb/users` |
| GitHub | `@github:https://github.com/user/repo` |
| 自定义 | `@myserver:custom://resource/id` |

### 发现

在 Claude Code 中输入 `@` 可查看已连接 MCP servers 提供的可用 resources。

### Plugin 设计说明

如果你的 plugin 的 MCP server 暴露 resources，请在 README 中记录可用 resource URIs 和 protocols。用户随后可通过 `@plugin-server:protocol://path` 引用它们。

## Hook agent type 详情

`agent` hook type（在 hook-development SKILL.md 中简要介绍）会为复杂 verification workflows 生成一个完整 subagent。

如需包含 configuration、behavior、supported events、何时使用 agent hooks 以及详细示例的完整说明，请参阅 hook-development skill 的 `references/advanced.md` 文件。

**简要总结：** Agent hooks 会生成一个拥有完整 tool access（Read、Bash、Grep 等）的 subagent，用于 multi-step verification。它们明显更慢（30-120 秒），但比 command 或 prompt hooks 更强大。仅支持 `Stop` 和 `SubagentStop` events。

## Auto-update 行为

### 默认行为

- **官方 marketplaces：** 默认启用 auto-update
- **第三方/local marketplaces：** 默认禁用 auto-update

### 环境变量

| 变量 | 效果 |
| ------------------------------- | -------------------------------------- |
| `DISABLE_AUTOUPDATER=true` | 禁用所有 auto-updates |
| `FORCE_AUTOUPDATE_PLUGINS=true` | 强制所有 marketplaces auto-update |

### Plugin versioning 影响

- 使用 semantic versioning（`MAJOR.MINOR.PATCH`）
- Breaking changes 应提升 MAJOR version
- 启用 auto-update 的用户会自动接收 MINOR/PATCH changes
- 在 CHANGELOG 中记录 breaking changes
- 考虑使用 pre-release versions（`2.0.0-beta.1`）进行测试

## Plugin 缓存

### Caching 工作方式

安装 plugin 时，Claude Code 会将 plugin content 复制到 cache directory。Plugins 从 cache 运行，而不是从 source location 运行。

### 关键影响

1. **不能使用 `../` paths：** Plugins 不能通过 `../` 引用其目录外的文件，因为 cache copy 不包含 parent directories
2. **`${CLAUDE_PLUGIN_ROOT}` 解析到 cache：** 该变量指向 cached copy，而不是 source
3. **Symlinks 会被跟随：** Plugin directory 内的 symlinks 会在复制期间解析，因此 target content 会被包含

### 外部文件（external files）的替代方案

如果你的 plugin 需要其目录外的内容：

- **Symlinks：** 在 plugin directory 内创建指向 external files 的 symlinks（cache copy 期间会被跟随）
- **重组（restructure）：** 将 shared content 移入 plugin directory
- **Environment variables：** 通过 environment variables 引用 external paths，而不是 file paths
- **MCP servers：** 在 runtime 使用 MCP tools 访问 external resources

### Cache 管理

用户可以清理 plugin cache：

```bash
rm -rf ~/.claude/plugins/cache
```

这会强制下次 session start 时重新缓存。

## Plugin CLI 管理 commands

用户通过 CLI commands（或 `/plugin` interactive interface）管理 plugins：

### 安装

```bash
# Install from marketplace
claude plugin install plugin-name@marketplace-name

# Installation scopes
claude plugin install plugin-name@marketplace --scope user     # Personal (default)
claude plugin install plugin-name@marketplace --scope project  # Team (in .claude/settings.json)
claude plugin install plugin-name@marketplace --scope local    # Personal project (gitignored)
```

### 管理

```bash
# List installed plugins
claude plugin list

# Enable/disable without uninstalling
claude plugin enable plugin-name@marketplace
claude plugin disable plugin-name@marketplace

# Update to latest version
claude plugin update plugin-name@marketplace

# Remove completely
claude plugin uninstall plugin-name@marketplace
```

### Marketplace 管理

```bash
# Add a marketplace
claude plugin marketplace add owner/repo                    # GitHub
claude plugin marketplace add https://gitlab.com/org/repo.git  # Git URL
claude plugin marketplace add ./local-path                  # Local

# List/update/remove
claude plugin marketplace list
claude plugin marketplace update marketplace-name
claude plugin marketplace remove marketplace-name
```

### Plugin 开发者说明

在 README 中记录确切的 install command：

```markdown
## Installation

\`\`\`bash
claude plugin install my-plugin@my-marketplace
\`\`\`
```

## 安装 scope

Plugins 可以安装在不同 scopes，影响谁可以访问：

| Scope | 位置 | 是否共享 | 是否 gitignored | 用例 |
| --------- | ----------------------------- | --------- | ---------- | ------------------------ |
| `user` | `~/.claude/settings.json` | 否 | N/A | 个人 tools（默认） |
| `project` | `.claude/settings.json` | 是（git） | 否 | Team standards（团队标准） |
| `local` | `.claude/settings.local.json` | 否 | 是 | 个人 project tools |
| `managed` | System paths（系统路径） | 是（MDM） | N/A | Enterprise enforcement（企业强制） |

### Scope 优先级

当同一个 plugin 在多个 scopes 中配置时，local 覆盖 project，project 覆盖 user。

### Team plugin 分发

对于 team plugins，请以 `project` scope 安装，并提交 `.claude/settings.json`：

```json
{
  "enabledPlugins": {
    "my-plugin@my-marketplace": true
  }
}
```

Team members clone repo 后会获得该 plugin。

### Enterprise plugin 控制

Organizations 可以使用 managed settings 来：

- **允许列表（allowlist marketplaces）：** `strictKnownMarketplaces` 限制用户可添加哪些 marketplaces
- **强制 plugins：** 通过 managed settings 预配置必需 plugins
- **阻止 plugins：** 阻止安装特定 plugins

### Enterprise hook 与 permission 控制

Managed settings 也可以限制 hook 和 permission rule sources：

| Setting | 效果 |
| --------------------------------- | --------------------------------------------------------------- |
| `allowManagedPermissionRulesOnly` | 仅应用 managed permission rules；忽略 user/project rules |
| `allowManagedHooksOnly` | 仅执行 managed hooks；禁用 plugin/user hooks |

**Plugin 开发者影响：**

- 在启用这些 settings 的情况下测试 plugins，验证 graceful degradation
- 记录哪些 hooks 对 plugin functionality 至关重要
- 当 hooks 被 enterprise policy 禁用时，提供 fallback behavior

### Plugin 开发者影响

- 在 README 中记录推荐 scope
- 在 user 和 project scopes 下测试 plugin
- 对于 team plugins，提供 `.claude/settings.json` snippets
- 注意 managed settings 可能覆盖 plugin availability
