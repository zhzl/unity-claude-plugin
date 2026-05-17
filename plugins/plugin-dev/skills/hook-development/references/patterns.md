# 常见 Hook 模式

本参考提供了实现 Claude Code hooks 的常见成熟模式。可将这些模式作为典型 hook 用例的起点。

下方 JSON 片段展示的是 `hooks` object 的内容。在 `.claude/settings.json` 或 plugin `hooks/hooks.json` 中，请将它们包装为 `{ "hooks": { ... } }`。

## 模式 1：安全校验

使用 prompt-based hooks 阻止危险的文件写入：

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Using the PreToolUse event context, verify the requested file path: 1) Not in /etc or system directories 2) Not .env or credentials 3) Path doesn't contain '..' traversal. Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision allow, deny, ask, or defer."
        }
      ]
    }
  ]
}
```

**适用于：** 防止写入敏感文件或系统目录。

## 模式 2：测试约束

确保停止前已运行测试：

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Review transcript. If code was modified (Write/Edit tools used), verify tests were executed. If no tests were run, block with reason 'Tests must be run after code changes'."
        }
      ]
    }
  ]
}
```

**适用于：** 强制执行质量标准，防止工作不完整就结束。

## 模式 3：上下文加载

在 session 开始时加载项目专属上下文：

```json
{
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
        }
      ]
    }
  ]
}
```

**示例脚本（load-context.sh）：**

```bash
#!/bin/bash
cd "$CLAUDE_PROJECT_DIR" || exit 1

# Detect project type
if [ -f "package.json" ]; then
  echo "📦 Node.js project detected"
  echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"
elif [ -f "Cargo.toml" ]; then
  echo "🦀 Rust project detected"
  echo "export PROJECT_TYPE=rust" >> "$CLAUDE_ENV_FILE"
fi
```

**适用于：** 自动检测并配置项目专属设置。

## 模式 4：通知日志

记录所有通知，用于审计或分析：

```json
{
  "Notification": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/log-notification.sh"
        }
      ]
    }
  ]
}
```

**适用于：** 跟踪用户通知，或与外部日志系统集成。

## 模式 5：MCP 工具监控

监控并验证 MCP 工具的使用：

```json
{
  "PreToolUse": [
    {
      "matcher": "mcp__.*__delete.*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Deletion operation detected. Verify: Is this deletion intentional? Can it be undone? Are there backups? Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision='deny' only when unsafe; otherwise use permissionDecision='allow'."
        }
      ]
    }
  ]
}
```

**适用于：** 防止破坏性的 MCP 操作。

## 模式 6：构建验证

确保代码变更后项目可以成功构建：

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Check if code was modified. If Write/Edit tools were used, verify the project was built (npm run build, cargo build, etc). If not built, block and request build."
        }
      ]
    }
  ]
}
```

**适用于：** 在提交或停止工作前捕捉构建错误。

## 模式 7：权限确认

在危险操作前询问用户：

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Using the PreToolUse event context, inspect the requested Bash command. If it contains 'rm', 'delete', 'drop', or other destructive operations, return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision='ask'. Otherwise use permissionDecision='allow'."
        }
      ]
    }
  ]
}
```

**适用于：** 对潜在破坏性命令进行用户确认。

## 模式 8：代码质量检查

在文件编辑后运行 linter 或 formatter：

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-quality.sh"
        }
      ]
    }
  ]
}
```

**示例脚本（check-quality.sh）：**

```bash
#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Run linter if applicable
if [[ "$file_path" == *.js ]] || [[ "$file_path" == *.ts ]]; then
  npx eslint "$file_path" 2>&1 || true
fi
```

**适用于：** 自动执行代码质量约束。

## 模式组合

组合多个模式，形成更全面的保护：

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate file write safety"
        }
      ]
    },
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate bash command safety"
        }
      ]
    }
  ],
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Verify tests run and build succeeded"
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
        }
      ]
    }
  ]
}
```

这能提供多层保护与自动化。

## 模式 9：临时启用的 Hooks

创建仅在通过 flag file 显式启用时才运行的 hook：

```bash
#!/bin/bash
# Hook only active when flag file exists
FLAG_FILE="$CLAUDE_PROJECT_DIR/.enable-security-scan"

if [ ! -f "$FLAG_FILE" ]; then
  # Quick exit when disabled
  exit 0
fi

# Flag present, run validation
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Run security scan
security-scanner "$file_path"
```

**启用方式：**

```bash
# Enable the hook
touch .enable-security-scan

# Disable the hook
rm .enable-security-scan
```

**适用于：**

- 临时调试 hooks
- 开发阶段的特性开关
- 按项目选择开启的验证
- 仅在必要时运行的高性能开销检查

**注意：** Flag file 会在 hook 运行时检查，因此创建或删除 flag 会影响下一次匹配到的 hook 调用。

## 模式 10：配置驱动的 Hooks

使用 JSON 配置控制 hook 行为：

```bash
#!/bin/bash
CONFIG_FILE="$CLAUDE_PROJECT_DIR/.claude/my-plugin.local.json"

# Read configuration
if [ -f "$CONFIG_FILE" ]; then
  validation_mode=$(jq -r '.validation_mode // "standard"' "$CONFIG_FILE")
  max_file_size=$(jq -r '.max_file_size // 1000000' "$CONFIG_FILE")
else
  # Defaults
  validation_mode=standard
  max_file_size=1000000
fi

# Skip if not in strict mode
if [ "$validation_mode" != "strict" ]; then
  exit 0
fi

# Apply configured limits
input=$(cat)
file_size=$(echo "$input" | jq -r '.tool_input.content | length')

if [ "$file_size" -gt "$max_file_size" ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "File exceeds configured size limit"}}'
  exit 0
fi
```

**配置文件（.claude/my-plugin.local.json）：**

```json
{
  "validation_mode": "strict",
  "max_file_size": 500000,
  "allowed_paths": ["/tmp", "/home/user/projects"]
}
```

此示例使用结构化的 PreToolUse 输出，因此 JSON 会写到 stdout，并以 exit 0 结束。

**适用于：**

- 用户可配置的 hook 行为
- 按项目定制的设置
- 团队专属规则
- 动态验证标准

## 模式 11：TeammateIdle 通知

当 agent team 的 teammate 进入空闲时发送通知：

```json
{
  "TeammateIdle": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/notify-idle.sh"
        }
      ]
    }
  ]
}
```

**示例脚本（notify-idle.sh）：**

```bash
#!/bin/bash
input=$(cat)
teammate=$(echo "$input" | jq -r '.teammate_name')
team=$(echo "$input" | jq -r '.team_name')

# Log or notify
echo "Teammate $teammate in team $team went idle" >> /tmp/team-log.txt

# Exit 0 to allow idle, exit 2 to keep teammate working
exit 0
```

**适用于：** 监控团队进度、记录 teammate 活动、强制执行工作标准。

## 模式 12：任务完成验证

在接受任务完成前验证质量：

```json
{
  "TaskCompleted": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/verify-task.sh"
        }
      ]
    }
  ]
}
```

**示例脚本（verify-task.sh）：**

```bash
#!/bin/bash
input=$(cat)
task_subject=$(echo "$input" | jq -r '.task_subject')

# Check if tests were mentioned in the task
if echo "$task_subject" | grep -qi "implement\|add\|create"; then
  # Verify tests exist for implementation tasks
  if [ ! -f "/tmp/tests-ran-$$" ]; then
    echo "Implementation task completed without running tests" >&2
    exit 2  # Block completion
  fi
fi

exit 0
```

**适用于：** 强制执行质量门禁，防止任务过早完成，规范团队工作流。
