# Plugin Settings 文件示例

## 模板：基础 Configuration

**.claude/my-plugin.local.md：**

```markdown
---
enabled: true
mode: standard
---

# My Plugin Configuration

Plugin is active in standard mode.
```

## 模板：高级 Configuration

**.claude/my-plugin.local.md：**

```markdown
---
enabled: true
validation_mode: standard
max_file_size: 1000000
allowed_extensions: [".js", ".ts", ".tsx"]
enable_logging: true
notification_level: info
retry_attempts: 3
timeout_seconds: 60
custom_path: "/path/to/data"
---

# My Plugin Advanced Configuration

This project uses custom plugin configuration with:

- Standard validation mode
- 1MB file size limit
- JavaScript/TypeScript files allowed
- Info-level logging
- 3 retry attempts

## Additional Notes

Contact @team-lead with questions about this configuration.
```

## 模板：Agent 状态文件

**.claude/multi-agent-swarm.local.md：**

```markdown
---
agent_name: database-implementation
task_number: 4.2
pr_number: 5678
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.5", "Task 4.1"]
additional_instructions: "Use PostgreSQL, not MySQL"
---

# Task Assignment: Database Schema Implementation

Implement the database schema for the new features module.

## Requirements

- Create migration files
- Add indexes for performance
- Write tests for constraints
- Document schema in README

## Success Criteria

- Migrations run successfully
- All tests pass
- PR created with CI green
- Schema documented

## Coordination

Depends on:

- Task 3.5: API endpoint definitions
- Task 4.1: Data model design

Report status to coordinator session 'team-leader'.
```

## 模板：Feature Flag 模式

**.claude/experimental-features.local.md：**

```markdown
---
enabled: true
features:
  - ai_suggestions
  - auto_formatting
  - advanced_refactoring
experimental_mode: false
---

# Experimental Features Configuration

Current enabled features:

- AI-powered code suggestions
- Automatic code formatting
- Advanced refactoring tools

Experimental mode is OFF (stable features only).
```

## 在 Hooks 中使用

这些模板可以被 hooks 读取：

```bash
# Check if plugin is configured
if [[ ! -f ".claude/my-plugin.local.md" ]]; then
  exit 0  # Not configured, skip hook
fi

# Read settings
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' ".claude/my-plugin.local.md")
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

# Apply settings
if [[ "$ENABLED" == "true" ]]; then
  # Hook is active
  # ...
fi
```

## Gitignore

始终向项目 `.gitignore` 添加：

```gitignore
# Plugin settings (user-local, not committed)
.claude/*.local.md
.claude/*.local.json
```

## 编辑 Settings

用户可以手动编辑 settings 文件：

```bash
# Edit settings
vim .claude/my-plugin.local.md

# Run the command again or wait for the next hook invocation.
# Restart Claude Code only after changing hook registration or plugin configuration.
```

settings 内容变更后，hooks/commands 会在下一次调用时读取。只有在修改 hook registration 或 plugin configuration 后才需要重启 Claude Code。
