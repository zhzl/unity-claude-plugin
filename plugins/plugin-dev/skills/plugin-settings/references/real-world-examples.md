# 真实世界的 Plugin Settings 示例

这里详细分析生产级插件如何使用 `.claude/plugin-name.local.md` 模式。

## multi-agent-swarm Plugin

### Settings 文件结构

**.claude/multi-agent-swarm.local.md：**

```markdown
---
agent_name: auth-implementation
task_number: 3.5
pr_number: 1234
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.4"]
additional_instructions: "Use JWT tokens, not sessions"
---

# Task: Implement Authentication

Build JWT-based authentication for the REST API.

## Requirements

- JWT token generation and validation
- Refresh token flow
- Secure password hashing

## Success Criteria

- Auth endpoints implemented
- Tests passing (100% coverage)
- PR created and CI green
- Documentation updated

## Coordination

Depends on Task 3.4 (user model).
Report status to 'team-leader' session.
```

### 使用方式

**文件：** `hooks/agent-stop-notification.sh`

**目的：** 当 agent 进入 idle 时向 coordinator 发送通知

**实现：**

```bash
#!/bin/bash
set -euo pipefail

SWARM_STATE_FILE=".claude/multi-agent-swarm.local.md"

# Quick exit if no swarm active
if [[ ! -f "$SWARM_STATE_FILE" ]]; then
  exit 0
fi

# Parse frontmatter
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$SWARM_STATE_FILE")

# Extract configuration
COORDINATOR_SESSION=$(printf '%s\n' "$FRONTMATTER" | grep '^coordinator_session:' | sed 's/coordinator_session: *//' | sed 's/^"\(.*\)"$/\1/' || true)
AGENT_NAME=$(printf '%s\n' "$FRONTMATTER" | grep '^agent_name:' | sed 's/agent_name: *//' | sed 's/^"\(.*\)"$/\1/' || true)
TASK_NUMBER=$(printf '%s\n' "$FRONTMATTER" | grep '^task_number:' | sed 's/task_number: *//' | sed 's/^"\(.*\)"$/\1/' || true)
PR_NUMBER=$(printf '%s\n' "$FRONTMATTER" | grep '^pr_number:' | sed 's/pr_number: *//' | sed 's/^"\(.*\)"$/\1/' || true)
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

# Check if enabled
if [[ "$ENABLED" != "true" ]]; then
  exit 0
fi

# Send notification to coordinator
NOTIFICATION="🤖 Agent ${AGENT_NAME} (Task ${TASK_NUMBER}, PR #${PR_NUMBER}) is idle."

if tmux has-session -t "$COORDINATOR_SESSION" 2>/dev/null; then
  tmux send-keys -t "$COORDINATOR_SESSION" "$NOTIFICATION" Enter
  sleep 0.5
  tmux send-keys -t "$COORDINATOR_SESSION" Enter
fi

exit 0
```

**关键模式：**

1. **Quick exit**（第 7-9 行）：如果文件不存在则立即返回
2. **字段提取**（第 11-17 行）：解析每个 frontmatter 字段
3. **Enabled 检查**（第 19-21 行）：遵循 enabled 开关
4. **基于 settings 执行动作**（第 23-29 行）：使用 coordinator_session 发送通知

### 创建

**文件：** `commands/launch-swarm.md`

在启动 swarm 时，settings 文件通过以下方式创建：

```bash
# Validate or escape variable values before writing YAML frontmatter.
# Use a YAML-aware writer for arbitrary text containing quotes or newlines.
cat > "$WORKTREE_PATH/.claude/multi-agent-swarm.local.md" <<EOF
---
agent_name: "$AGENT_NAME"
task_number: "$TASK_ID"
pr_number: TBD
coordinator_session: "$COORDINATOR_SESSION"
enabled: true
dependencies: [$DEPENDENCIES]
---

# Task: $TASK_DESCRIPTION

$TASK_DETAILS
EOF
```

### 更新

PR number 会在创建 PR 后更新：

```bash
# Update pr_number field atomically
tmp=$(mktemp)
sed "s/^pr_number: .*/pr_number: $PR_NUM/" \
  ".claude/multi-agent-swarm.local.md" > "$tmp"
mv "$tmp" ".claude/multi-agent-swarm.local.md"
```

## ralph-wiggum Plugin

### Settings 文件结构

**.claude/ralph-loop.local.md：**

```markdown
---
iteration: 1
max_iterations: 10
completion_promise: "All tests passing and build successful"
started_at: "2025-01-15T14:30:00Z"
---

Fix all the linting errors in the project.
Make sure tests pass after each fix.
Document any changes needed in CLAUDE.md.
```

### 使用方式

**文件：** `hooks/stop-hook.sh`

**目的：** 阻止 session 退出，并把 Claude 的输出回送为下一轮输入

**实现：**

```bash
#!/bin/bash
set -euo pipefail

RALPH_STATE_FILE=".claude/ralph-loop.local.md"

# Quick exit if no active loop
if [[ ! -f "$RALPH_STATE_FILE" ]]; then
  exit 0
fi

# Parse frontmatter
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$RALPH_STATE_FILE")

# Extract configuration
ITERATION=$(printf '%s\n' "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//' || true)
MAX_ITERATIONS=$(printf '%s\n' "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//' || true)
COMPLETION_PROMISE=$(printf '%s\n' "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Check max iterations
if [[ $MAX_ITERATIONS -gt 0 ]] && [[ $ITERATION -ge $MAX_ITERATIONS ]]; then
  echo "🛑 Ralph loop: Max iterations ($MAX_ITERATIONS) reached."
  rm "$RALPH_STATE_FILE"
  exit 0
fi

# Get transcript and check for completion promise
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')
LAST_OUTPUT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1 | jq -r '.message.content | map(select(.type == "text")) | map(.text) | join("\n")')

# Check for completion
if [[ "$COMPLETION_PROMISE" != "null" ]] && [[ -n "$COMPLETION_PROMISE" ]]; then
  PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g')

  if [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
    echo "✅ Ralph loop: Detected completion"
    rm "$RALPH_STATE_FILE"
    exit 0
  fi
fi

# Continue loop - increment iteration
NEXT_ITERATION=$((ITERATION + 1))

# Extract prompt from markdown body after the closing marker
PROMPT_TEXT=$(awk '
  NR == 1 {
    if ($0 == "---") {
      in_body = 0
      next
    }
    exit
  }
  in_body == 0 && /^---$/ {
    in_body = 1
    next
  }
  in_body == 1 { print }
' "$RALPH_STATE_FILE")

# Update iteration counter (secure temp file)
TEMP_FILE=$(mktemp) || exit 1
sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$RALPH_STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$RALPH_STATE_FILE"

# Block exit and feed prompt back
jq -n \
  --arg prompt "$PROMPT_TEXT" \
  --arg msg "🔄 Ralph iteration $NEXT_ITERATION" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'

exit 0
```

**关键模式：**

1. **Quick exit**（第 7-9 行）：未激活时直接跳过
2. **Iteration tracking**（第 11-20 行）：计数并强制执行最大迭代次数
3. **Promise detection**（第 25-33 行）：检查输出中是否出现完成信号
4. **Prompt extraction**（第 38 行）：把 markdown body 读取为下一轮 prompt
5. **State update**（第 40-43 行）：原子递增 iteration
6. **Loop continuation**（第 45-53 行）：阻止退出并回送 prompt

### 创建

**文件：** `scripts/setup-ralph-loop.sh`

```bash
#!/bin/bash
PROMPT="$1"
MAX_ITERATIONS="${2:-0}"
COMPLETION_PROMISE="${3:-}"

# Create state file
cat > ".claude/ralph-loop.local.md" <<EOF
---
iteration: 1
max_iterations: $MAX_ITERATIONS
completion_promise: "$COMPLETION_PROMISE"
started_at: "$(date -Iseconds)"
---

$PROMPT
EOF

echo "Ralph loop initialized: .claude/ralph-loop.local.md"
```

## 模式对比

| Feature         | multi-agent-swarm                    | ralph-wiggum                  |
| --------------- | ------------------------------------ | ----------------------------- |
| **File**        | `.claude/multi-agent-swarm.local.md` | `.claude/ralph-loop.local.md` |
| **Purpose**     | Agent coordination state             | Loop iteration state          |
| **Frontmatter** | Agent metadata                       | Loop configuration            |
| **Body**        | Task assignment                      | Prompt to loop                |
| **Updates**     | PR number, status                    | Iteration counter             |
| **Deletion**    | Manual or on completion              | On loop exit                  |
| **Hook**        | Stop (notifications)                 | Stop (loop control)           |

## 从真实插件总结出的最佳实践

### 1. Quick Exit 模式

两个插件都会先检查文件是否存在：

```bash
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0  # Not active
fi
```

**原因：** 当插件未配置时可以避免报错，并保持快速执行。

### 2. Enabled Flag

两者都使用 `enabled` 字段做显式控制：

```yaml
enabled: true
```

**原因：** 可以临时停用，而不必删除文件。

### 3. 原子更新

两者都使用 temp file + atomic move：

```bash
TEMP_FILE=$(mktemp) || exit 1
sed "s/^field: .*/field: $NEW_VALUE/" "$FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE"
```

**原因：** 如果进程中断，可避免文件损坏。使用 `mktemp` 还能创建安全、不可预测的文件名。

### 4. 引号处理

两者都会去掉 YAML 值外围的引号：

```bash
sed 's/^"\(.*\)"$/\1/'
```

**原因：** YAML 同时允许 `field: value` 和 `field: "value"`。

### 5. 错误处理

两者都能优雅处理缺失或损坏的文件：

```bash
if [[ ! -f "$FILE" ]]; then
  exit 0  # No error, just not configured
fi

if [[ -z "$CRITICAL_FIELD" ]]; then
  echo "Settings file corrupt" >&2
  rm "$FILE"  # Clean up
  exit 0
fi
```

**原因：** 以优雅失败替代直接崩溃。

## 要避免的反模式

### ❌ 硬编码路径

```bash
# BAD
FILE="/Users/alice/.claude/my-plugin.local.md"

# GOOD
FILE=".claude/my-plugin.local.md"
```

### ❌ 未加引号的变量

```bash
# BAD
echo $VALUE

# GOOD
echo "$VALUE"
```

### ❌ 非原子更新

```bash
# BAD: Can corrupt file if interrupted
sed -i "s/field: .*/field: $VALUE/" "$FILE"

# GOOD: Atomic with secure temp file
TEMP_FILE=$(mktemp) || exit 1
sed "s/field: .*/field: $VALUE/" "$FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE"
```

### ❌ 没有默认值

```bash
# BAD: Fails if field missing
if [[ $MAX -gt 100 ]]; then
  # MAX might be empty!
fi

# GOOD: Provide default
MAX=${MAX:-10}
```

### ❌ 忽略边界情况

```bash
# BAD: Range can reopen and pull body --- sections into "frontmatter"
sed -n '/^---$/,/^---$/{ /^---$/d; p; }'

# GOOD: Require --- on line 1, stop frontmatter at the second marker,
# and preserve later body --- lines as body content
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")

BODY=$(awk '
  NR == 1 {
    if ($0 == "---") {
      in_body = 0
      next
    }
    exit
  }
  in_body == 0 && /^---$/ {
    in_body = 1
    next
  }
  in_body == 1 { print }
' "$FILE")
```

## 结论

`.claude/plugin-name.local.md` 模式提供了：

- 简单、易读的 configuration
- 对版本控制友好（通过 gitignore 排除）
- Per-project settings
- 使用标准 bash 工具即可轻松解析
- 同时支持结构化 config（YAML）和自由内容（markdown）

对于任何需要 user-configurable behavior 或 state persistence 的插件，都可以使用这个模式。
