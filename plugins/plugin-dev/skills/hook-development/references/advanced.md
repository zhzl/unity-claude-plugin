# 高级 Hook 用例

本参考文档覆盖适用于复杂自动化工作流的高级 hook 模式与技巧。

除非某个片段明确展示完整文件，否则其中的 JSON hook 片段都表示 `hooks` object 的内容。在 `.claude/settings.json` 或 plugin `hooks/hooks.json` 中，应将它们包装为 `{ "hooks": { ... } }`。

## 多阶段验证

结合 command hook 和 prompt hook，实现分层验证：

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/quick-check.sh",
          "timeout": 5
        },
        {
          "type": "prompt",
          "prompt": "Using the PreToolUse event context, perform deep analysis of the requested Bash command.",
          "timeout": 15
        }
      ]
    }
  ]
}
```

**用例：** 先执行快速的确定性检查，再进行智能分析

**示例 quick-check.sh：**

```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')

# Immediate approval for safe commands
if [[ "$command" =~ ^(ls|pwd|echo|date|whoami)$ ]]; then
  exit 0
fi

# Let prompt hook handle complex cases
exit 0
```

Command hook 会快速批准显然安全的命令，而 prompt hook 负责分析其余情况。

## 条件式 Hook 执行

根据环境或上下文决定是否执行 hook：

```bash
#!/bin/bash
# Only run in CI environment
if [ -z "$CI" ]; then
  echo '{"continue": true}' # Skip in non-CI
  exit 0
fi

# Run validation logic in CI
input=$(cat)
# ... validation code ...
```

**用例：**

- CI 与本地开发使用不同逻辑
- 项目专用验证
- 用户专用规则

**示例：为受信任用户跳过部分检查：**

```bash
#!/bin/bash
# Skip detailed checks for admin users
if [ "$USER" = "admin" ]; then
  exit 0
fi

# Full validation for other users
input=$(cat)
# ... validation code ...
```

## 通过状态进行 Hook 串联

使用稳定的项目/session 状态路径，在不同 hook 之间共享状态：

```bash
# Hook 1: Analyze and save state
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
mkdir -p "$state_dir"

# Analyze command
risk_level=$(calculate_risk "$command")
echo "$risk_level" > "$state_dir/risk-level"

exit 0
```

```bash
# Hook 2: Use saved state
#!/bin/bash
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
risk_level=$(cat "$state_dir/risk-level" 2>/dev/null || echo "unknown")

if [ "$risk_level" = "high" ]; then
  echo "High risk operation detected" >&2
  exit 2
fi
```

**重要：** 这只适用于顺序型 hook 事件（例如 PreToolUse 之后接 PostToolUse），不适用于并行 hooks。

## 动态 Hook 配置

根据项目配置调整 hook 行为：

```bash
#!/bin/bash
cd "$CLAUDE_PROJECT_DIR" || exit 1

# Read project-specific config
if [ -f ".claude-hooks-config.json" ]; then
  validation_mode=$(jq -r '.validation_mode // "standard"' .claude-hooks-config.json)

  if [ "$validation_mode" = "strict" ]; then
    # Apply strict validation
    # ...
  else
    # Apply lenient validation
    # ...
  fi
fi
```

**示例 .claude-hooks-config.json：**

```json
{
  "validation_mode": "strict",
  "allowed_commands": ["ls", "pwd", "grep"],
  "forbidden_paths": ["/etc", "/sys"]
}
```

## 具备上下文感知能力的 Prompt Hooks

使用 transcript 和 session 上下文做出更智能的决策：

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Using the Stop event context and available transcript context, check: 1) Were tests run after code changes? 2) Did the build succeed? 3) Were all user questions answered? 4) Is there any unfinished work? Return {\"decision\": \"block\", \"reason\": \"...\"} only when work should continue; omit decision when complete."
        }
      ]
    }
  ]
}
```

LLM 可以使用 Claude Code 提供的 event context 来做出具备上下文感知能力的决策。

**响应格式：** Agent hook 与 prompt hook、command hook 使用相同的按事件区分的 JSON 输出 schema：

```json
{ "decision": "block", "reason": "Explanation of decision" }
```

省略 `decision` 时默认允许继续。Agent hook 还可借助工具访问执行多轮验证（最多 50 轮）。默认超时：60 秒。

## 性能优化

### 缓存验证结果

```bash
#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path')
cache_key=$(echo -n "$file_path" | md5sum | cut -d' ' -f1)
cache_file="/tmp/hook-cache-$cache_key"

# Check cache
if [ -f "$cache_file" ]; then
  cache_age=$(($(date +%s) - $(stat -f%m "$cache_file" 2>/dev/null || stat -c%Y "$cache_file")))
  if [ "$cache_age" -lt 300 ]; then  # 5 minute cache
    cat "$cache_file"
    exit 0
  fi
fi

# Perform validation
result='{}'

# Cache result
echo "$result" > "$cache_file"
echo "$result"
```

### 并行执行优化

由于 hooks 会并行运行，设计时应保证它们彼此独立：

```jsonc
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "bash check-size.sh", // Independent
          "timeout": 2
        },
        {
          "type": "command",
          "command": "bash check-path.sh", // Independent
          "timeout": 2
        },
        {
          "type": "prompt",
          "prompt": "Check content safety", // Independent
          "timeout": 10
        }
      ]
    }
  ]
}
```

三个 hook 会同时运行，从而降低总延迟。

## 跨事件工作流

让不同事件之间的 hooks 彼此协作：

**SessionStart - 建立跟踪状态：**

```bash
#!/bin/bash
# Initialize session tracking
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
mkdir -p "$state_dir"
echo "0" > "$state_dir/test-count"
echo "0" > "$state_dir/build-count"
```

**PostToolUse - 跟踪事件：**

```bash
#!/bin/bash
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
mkdir -p "$state_dir"
tool_name=$(echo "$input" | jq -r '.tool_name')

if [ "$tool_name" = "Bash" ]; then
  command=$(echo "$input" | jq -r '.tool_result')
  if [[ "$command" == *"test"* ]]; then
    count=$(cat "$state_dir/test-count" 2>/dev/null || echo "0")
    echo $((count + 1)) > "$state_dir/test-count"
  fi
fi
```

**Stop - 基于跟踪结果验证：**

```bash
#!/bin/bash
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
test_count=$(cat "$state_dir/test-count" 2>/dev/null || echo "0")

if [ "$test_count" -eq 0 ]; then
  echo '{"decision": "block", "reason": "No tests were run"}'
  exit 0
fi
```

## 与外部系统集成

### Slack 通知

```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')
decision="blocked"

# Send notification to Slack
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"Hook ${decision} ${tool_name} operation\"}" \
  2>/dev/null

echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Operation blocked by hook"}}'
exit 0
```

### 数据库日志

```bash
#!/bin/bash
input=$(cat)

# Log to database using psql variables instead of interpolating raw JSON into SQL
psql "$DATABASE_URL" \
  -v event='PreToolUse' \
  -v data="$input" \
  -c "INSERT INTO hook_logs (event, data) VALUES (:'event', :'data'::jsonb)" \
  2>/dev/null

exit 0
```

### 指标采集

```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Send metrics to monitoring system
echo "hook.pretooluse.${tool_name}:1|c" | nc -u -w1 statsd.local 8125

exit 0
```

## 安全模式

### 限流

```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')

# Track command frequency
session_id=$(echo "$input" | jq -r '.session_id // "default"')
state_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hook-state/$session_id"
mkdir -p "$state_dir"
rate_file="$state_dir/rate"
current_minute=$(date +%Y%m%d%H%M)

if [ -f "$rate_file" ]; then
  last_minute=$(head -1 "$rate_file")
  count=$(tail -1 "$rate_file")

  if [ "$current_minute" = "$last_minute" ]; then
    if [ "$count" -gt 10 ]; then
      echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Rate limit exceeded"}}'
      exit 0
    fi
    count=$((count + 1))
  else
    count=1
  fi
else
  count=1
fi

echo "$current_minute" > "$rate_file"
echo "$count" >> "$rate_file"

exit 0
```

### 审计日志

```bash
#!/bin/bash
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')
timestamp=$(date -Iseconds)

# Append to audit log
echo "$timestamp | $USER | $tool_name | $input" >> ~/.claude/audit.log

exit 0
```

### Secret 检测

```bash
#!/bin/bash
input=$(cat)
content=$(echo "$input" | jq -r '.tool_input.content')

# Check for common secret patterns
if echo "$content" | grep -qE "(api[_-]?key|password|secret|token).{0,20}['\"]?[A-Za-z0-9]{20,}"; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Potential secret detected in content"}}'
  exit 0
fi

exit 0
```

## 测试高级 Hooks

### Hook Script 单元测试

```bash
# test-hook.sh
#!/bin/bash

# Test 1: Approve safe command
result=$(echo '{"tool_input": {"command": "ls"}}' | bash validate-bash.sh)
if [ $? -eq 0 ]; then
  echo "✓ Test 1 passed"
else
  echo "✗ Test 1 failed"
fi

# Test 2: Block dangerous command
result=$(echo '{"tool_input": {"command": "rm -rf /"}}' | bash validate-bash.sh)
if [ $? -eq 2 ]; then
  echo "✓ Test 2 passed"
else
  echo "✗ Test 2 failed"
fi
```

### 集成测试

创建能覆盖完整 hook 工作流的测试场景：

```bash
# integration-test.sh
#!/bin/bash

# Set up test environment
export CLAUDE_PROJECT_DIR="/tmp/test-project"
export CLAUDE_PLUGIN_ROOT="$(pwd)"
mkdir -p "$CLAUDE_PROJECT_DIR"

# Test SessionStart hook
echo '{}' | bash hooks/session-start.sh
if [ -f "/tmp/session-initialized" ]; then
  echo "✓ SessionStart hook works"
else
  echo "✗ SessionStart hook failed"
fi

# Clean up
rm -rf "$CLAUDE_PROJECT_DIR"
```

## 高级 Hook 最佳实践

1. **保持 hook 独立**：不要依赖执行顺序
2. **使用超时**：为每种 hook 类型设置合适的限制
3. **优雅处理错误**：提供清晰的错误消息
4. **记录复杂性**：在 README 中说明高级模式
5. **充分测试**：覆盖边界情况与失败模式
6. **监控性能**：跟踪 hook 执行时间
7. **版本化配置**：对 hook 配置使用版本控制
8. **提供逃生口**：允许用户在需要时绕过 hook

## 常见陷阱

### ❌ 假设 Hook 顺序

```bash
# BAD: Assumes hooks run in specific order
# Hook 1 saves state, Hook 2 reads it
# This can fail because hooks run in parallel!
```

### ❌ 长时间运行的 Hooks

```bash
# BAD: Hook takes 2 minutes to run
sleep 120
# This will timeout and block the workflow
```

### ❌ 未捕获异常

```bash
# BAD: Script crashes on unexpected input
file_path=$(echo "$input" | jq -r '.tool_input.file_path')
cat "$file_path"  # Fails if file doesn't exist
```

### ✅ 正确的错误处理

```bash
# GOOD: Handles errors gracefully
file_path=$(echo "$input" | jq -r '.tool_input.file_path')
if [ ! -f "$file_path" ]; then
  echo '{"continue": true, "systemMessage": "File not found, skipping check"}' >&2
  exit 0
fi
```

## Skill Frontmatter 中的作用域 Hooks（scoped hooks）

在 Claude Code 支持时，可以直接在 skill YAML frontmatter 中定义 hook，使其只在该 skill 使用期间激活。plugin 自带 agent 的 frontmatter 不支持 `hooks`；plugin 范围的 hook 行为请使用 plugin `hooks/hooks.json`。

### 概念

与 `hooks.json`（全局，在 plugin 启用时始终激活）或 settings hooks（用户级）不同，scoped skill hooks 与特定 skill 的生命周期绑定。它们在 skill 加载时启用，在 skill 完成时停用。

### 格式

Skill frontmatter 中的 `hooks` 字段使用与 `hooks.json` 相同的 event/matcher/hook 结构：

```yaml
---
name: secure-writer
description: Write files with safety validation...
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
          timeout: 10
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/post-write-check.sh"
---
```

### 支持的事件

只有部分 hook 事件适用于 frontmatter 作用域：

| 事件          | 在 Frontmatter 中的用途                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `PreToolUse`  | 在 skill 执行期间验证或阻止工具调用                                                            |
| `PostToolUse` | 在 skill 使用期间于工具执行后运行检查                                                          |
| `Stop`        | 在 skill 结束前验证完成标准                                                                     |

Session 级事件（`SessionStart`、`UserPromptSubmit`、`Notification` 等）不适用，因为它们属于不同的生命周期范围。

### 与 hooks.json 的对比

| 方面           | `hooks.json`                               | Frontmatter `hooks`                                 |
| -------------- | ------------------------------------------ | --------------------------------------------------- |
| 作用域         | 全局（plugin 启用时始终激活）              | 组件专用（仅使用期间激活）                          |
| 事件           | 全部 11+ 个 hook 事件                      | PreToolUse, PostToolUse, Stop                       |
| 位置           | `hooks/hooks.json` 文件                    | SKILL.md 中的 YAML frontmatter                      |
| 合并行为       | 与 user/project hooks 合并                 | 在组件生命周期内与 global hooks 合并                |

### 用例

- **Skill 专用验证：** 例如“database writer” skill，在执行前校验 SQL
- **受限工作流：** 例如“deploy” skill，在允许 Bash 命令前检查分支与测试状态
- **质量门禁：** 例如“code generator” skill，在每次 Write 操作后运行 lint

### 两种 Hook 类型都可用

**Command hook**（确定性脚本执行）：

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/check-safety.sh"
```

**Prompt hook**（LLM 评估）：

```yaml
hooks:
  Stop:
    - matcher: "*"
      hooks:
        - type: prompt
          prompt: 'Verify all generated code has tests. Return {"decision": "block", "reason": "missing tests"} only when work should continue; omit decision when satisfied.'
```

## Agent hook 类型

`agent` hook type 会启动一个 subagent，用于执行需要工具访问的复杂多步验证工作流。

### 概念

`command` hook 执行 bash 脚本，`prompt` hook 评估单次 LLM prompt，而 `agent` hook 会创建一个完整的 subagent，可使用工具（Read、Bash、Grep 等）来执行彻底验证。这是能力最强、但成本也最高的 hook 类型。

### 配置

```json
{
  "type": "agent",
  "prompt": "Verify that all generated code has tests and passes linting. Check each modified file.",
  "timeout": 120
}
```

### 支持的事件

Agent hook 仅支持 **Stop** 和 **SubagentStop** 事件。不适合用于 PreToolUse（太慢）或 session 级事件。

### 何时使用 Agent Hooks

| Hook 类型 | 速度            | 能力                  | 最适合                                      |
| --------- | --------------- | --------------------- | ------------------------------------------- |
| `command` | 快（约 1-5s）   | 仅 Bash scripts       | 确定性检查、文件验证                        |
| `prompt`  | 中等（约 5-15s）| 单次 LLM 评估         | 上下文感知决策、灵活逻辑                    |
| `agent`   | 慢（约 30-120s）| 借助工具的多步流程    | 全面验证、多文件检查                        |

在以下情况使用 agent hooks：

- 验证需要读取多个文件
- 需要运行命令并分析其输出
- 单个 prompt 无法完成评估
- 完成标准复杂且包含多个维度

### 示例：全面的完成检查

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "agent",
          "prompt": "Before allowing task completion, verify: 1) All modified files have corresponding tests, 2) Tests pass (run them), 3) No linting errors exist. Return {\"decision\": \"block\", \"reason\": \"...\"} only when work should continue; omit decision when complete.",
          "timeout": 120
        }
      ]
    }
  ]
}
```

该 agent 会自主读取文件、运行测试、检查 lint，并综合判断是否允许主 agent 停止。

## Handler 配置字段

除了 `type`、`command`/`prompt` 和 `timeout` 外，hook handler 还支持额外字段：

### once

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/init.sh",
  "once": true
}
```

当 `true` 时，该 hook 每个 session 只运行一次，随后会自动移除。适合 scoped skill 场景中的一次性初始化 hook。

### statusMessage

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "statusMessage": "Validating file write..."
}
```

Hook 执行期间会在 UI 中显示该文本，帮助用户理解较长操作正在做什么。

## 事件专用 Matchers

某些 hook 事件支持超出工具名之外的 matcher 值：

| 事件          | Matcher 值                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| SessionStart  | `startup`, `resume`, `clear`, `compact`                                        |
| SessionEnd    | `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |
| Notification  | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`       |
| PreCompact    | `manual`, `auto`                                                               |
| SubagentStart | Agent type 名称（例如 `Bash`、`Explore`、`Plan` 或自定义 agent 名称）          |
| SubagentStop  | Agent type 名称（同 SubagentStart）                                            |
| PreToolUse    | Tool 名称（精确匹配、regex 或 `*` wildcard）                                   |

## Decision 控制输出 Schemas

不同 hook 事件支持不同的输出格式，用于控制 Claude 的行为。

### PreToolUse Decision 控制

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Explanation",
    "updatedInput": { "field": "modified_value" },
    "additionalContext": "Extra context for Claude"
  }
}
```

- `permissionDecision`：`allow`（继续）、`deny`（阻止）、`ask`（询问用户）、`defer`（回退到普通权限流程）
- `updatedInput`：可选，在执行前修改工具参数
- `additionalContext`：注入 Claude 的上下文

### PermissionRequest Decision 控制

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": {},
      "updatedPermissions": {},
      "message": "Reason for denial",
      "interrupt": false
    }
  }
}
```

- `behavior`：`allow` 或 `deny`
- `updatedInput`：修改后的工具参数（仅在 `allow` 时有效）
- `updatedPermissions`：权限变更（仅在 `allow` 时有效）
- `message`：展示给用户（仅在 `deny` 时有效）
- `interrupt`：若为 true 且搭配 `deny`，则停止当前操作

### PostToolUse / Stop / UserPromptSubmit Decision 控制

这些事件共享更简单的顶层 schema，但行为会因事件而异：

```json
{
  "decision": "block",
  "reason": "Explanation of why the action is blocked"
}
```

- `decision`：在支持阻塞的事件中设为 `"block"`。Stop/SubagentStop 可让 Claude 继续工作，UserPromptSubmit 可阻止 prompt 处理。PostToolUse 发生在工具动作已经执行之后，因此不能阻止该动作；应将其用于反馈、上下文补充或 MCP 输出替换。
- `reason`：阻塞时必填；会反馈给 Claude 或展示给用户

PostToolUse 还额外支持一个用于替换 MCP 工具输出的字段：

```json
{
  "updatedMCPToolOutput": "Replacement output for MCP tool response"
}
```

这样 hook 就能在 Claude 处理前替换其看到的 MCP 工具响应。该能力仅适用于 PostToolUse 事件中的 MCP 工具。

### PostToolUseFailure Decision 控制

PostToolUseFailure 支持提供额外上下文，以帮助 Claude 处理失败：

```json
{
  "additionalContext": "Extra context to help Claude handle the failure"
}
```

### TeammateIdle 与 TaskCompleted

这些事件仅使用 **exit codes** 进行决策控制（不使用 JSON 输出）：

- Exit code `0`：允许（队友进入空闲 / 任务标记完成）
- Exit code `2`：阻止，stderr 会作为反馈提供给 teammate/model

### 通用输出字段（所有 Hooks）

这些字段可以出现在任意 hook 的 JSON 输出中：

```json
{
  "continue": true,
  "stopReason": "Critical error, halting all processing",
  "suppressOutput": false,
  "systemMessage": "Warning message for the user"
}
```

- `continue`：若为 `false`，停止所有处理（默认：`true`）
- `stopReason`：当 `continue` 为 `false` 时显示的消息
- `suppressOutput`：隐藏 hook 输出，不写入 transcript（默认：`false`）
- `systemMessage`：展示给用户的警告/信息

## TeammateIdle 与 TaskCompleted 事件

这些事件可在 agent team 工作流中作为质量门禁。

### TeammateIdle

当 teammate 即将进入空闲（停止处理）时触发。可用于让 teammate 继续工作，或校验其输出。

**输入 schema：**

```json
{
  "session_id": "...",
  "teammate_name": "researcher",
  "team_name": "my-project"
}
```

**示例 hook：**

```json
{
  "TeammateIdle": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-teammate.sh"
        }
      ]
    }
  ]
}
```

### TaskCompleted

当任务被标记为完成时触发。可用于在接受完成前验证任务质量。

**输入 schema：**

```json
{
  "session_id": "...",
  "task_id": "123",
  "task_subject": "Implement feature X",
  "task_description": "...",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**示例 hook：**

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

## 结论

高级 hook 模式能在保持可靠性与性能的同时，实现更复杂的自动化。当基础 hook 已不足以满足需求时可使用这些技术，但始终应优先追求简单性与可维护性。
