# Hook 输入 Schemas

这是所有 hook 输入 schema 的完整参考。每个 hook 都会通过 stdin 接收 JSON，其中包含通用字段以及事件专属字段。

## 通用字段（所有 Hooks）

每个 hook 都会接收以下字段：

| 字段              | 类型   | 说明                      |
| ----------------- | ------ | ------------------------- |
| `session_id`      | string | 唯一的 session 标识符     |
| `transcript_path` | string | 对话 JSON 的路径          |
| `cwd`             | string | 当前工作目录              |
| `permission_mode` | string | 当前权限模式              |
| `hook_event_name` | string | 触发该 hook 的事件        |

## 事件专属输入字段

### PreToolUse / PostToolUse / PostToolUseFailure / PermissionRequest

| 字段                     | 类型    | 事件               | 说明                                 |
| ------------------------ | ------- | ------------------ | ------------------------------------ |
| `tool_name`              | string  | 全部四个事件       | 工具名称                             |
| `tool_input`             | object  | 全部四个事件       | 传给工具的参数（见 tool schemas）    |
| `tool_result`            | string  | PostToolUse        | 工具执行结果                         |
| `tool_use_id`            | string  | PostToolUse        | 唯一的工具调用标识符                 |
| `error`                  | string  | PostToolUseFailure | 失败工具返回的错误消息               |
| `is_interrupt`           | boolean | PostToolUseFailure | 失败是否由用户中断导致               |
| `permission_suggestions` | array   | PermissionRequest  | 建议的权限决策列表                   |

### UserPromptSubmit

| 字段     | 类型   | 说明                   |
| -------- | ------ | ---------------------- |
| `prompt` | string | 用户提交的 prompt 文本 |

### Stop / SubagentStop

| 字段                    | 类型    | 事件         | 说明                                     |
| ----------------------- | ------- | ------------ | ---------------------------------------- |
| `stop_hook_active`      | boolean | 两个事件     | hook 是否已处于继续执行状态（循环保护）  |
| `agent_id`              | string  | SubagentStop | 唯一的 subagent 标识符                   |
| `agent_type`            | string  | SubagentStop | Agent 名称                              |
| `agent_transcript_path` | string  | SubagentStop | subagent transcript 的路径              |

### SubagentStart

| 字段         | 类型   | 说明            |
| ------------ | ------ | ---------------------- |
| `agent_id`   | string | 唯一的 subagent 标识符 |
| `agent_type` | string | Agent 名称             |

### SessionStart

| 字段         | 类型   | 说明                                      |
| ------------ | ------ | ------------------------------------------------ |
| `source`     | string | Matcher: `startup`, `resume`, `clear`, `compact` |
| `model`      | string | 模型标识符                                       |
| `agent_type` | string | 若作为 agent 运行则提供（可选）                  |

### SessionEnd

| 字段     | 类型   | 说明                                                                            |
| -------- | ------ | -------------------------------------------------------------------------------------- |
| `source` | string | 取值：`clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` |

### PreCompact

| 字段                  | 类型   | 说明                               |
| --------------------- | ------ | ----------------------------------------- |
| `trigger`             | string | `manual` 或 `auto`                        |
| `custom_instructions` | string | 用户指令（manual）或空字符串（auto）      |

### Notification

| 字段                | 类型   | 说明                                                                 |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| `message`           | string | 通知文本                                                                    |
| `title`             | string | 通知标题（可选）                                                            |
| `notification_type` | string | `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` |

### TeammateIdle

| 字段            | 类型   | 说明 |
| --------------- | ------ | ----------- |
| `teammate_name` | string | 队友名称    |
| `team_name`     | string | 团队名称    |

### TaskCompleted

| 字段               | 类型   | 说明            |
| ------------------ | ------ | ---------------------- |
| `task_id`          | string | 任务标识符             |
| `task_subject`     | string | 任务标题行             |
| `task_description` | string | 任务描述（可选）       |
| `teammate_name`    | string | 队友名称（可选）       |
| `team_name`        | string | 团队名称（可选）       |

## Tool 输入 Schemas（用于 PreToolUse/PostToolUse）

`tool_input` object 会因工具而异。常见 tool schemas 如下：

| 工具         | `tool_input` 字段                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bash         | `command` (string), `description` (string, optional), `timeout` (number, optional), `run_in_background` (boolean, optional)                                           |
| Write        | `file_path` (string), `content` (string)                                                                                                                              |
| Edit         | `file_path` (string), `old_string` (string), `new_string` (string), `replace_all` (boolean, optional)                                                                 |
| Read         | `file_path` (string), `offset` (number, optional), `limit` (number, optional)                                                                                         |
| Glob         | `pattern` (string), `path` (string, optional)                                                                                                                         |
| Grep         | `pattern` (string), `path` (string, optional), `glob` (string, optional), `output_mode` (string, optional), `-i` (boolean, optional), `multiline` (boolean, optional) |
| WebFetch     | `url` (string), `prompt` (string)                                                                                                                                     |
| WebSearch    | `query` (string), `allowed_domains` (array, optional), `blocked_domains` (array, optional)                                                                            |
| Task         | `prompt` (string), `description` (string), `subagent_type` (string), `model` (string, optional)                                                                       |
| Skill        | `skill` (string), `args` (string, optional)                                                                                                                           |
| NotebookEdit | `notebook_path` (string), `new_source` (string), `cell_type` (string, optional), `edit_mode` (string, optional)                                                       |

## 实际示例

在 bash hook 脚本中使用 `jq` 提取字段：

```bash
#!/bin/bash
set -euo pipefail

# Read full input from stdin
input=$(cat)

# Extract common fields
session_id=$(echo "$input" | jq -r '.session_id')
hook_event=$(echo "$input" | jq -r '.hook_event_name')

# Extract tool-specific fields (PreToolUse/PostToolUse)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Example: block writes to sensitive paths
if [[ "$tool_name" == "Write" && "$file_path" == *".env"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Cannot write to .env files"}}'
  exit 0
fi

# Allow by default
exit 0
```

对于结构化的 PreToolUse 决策，应将 JSON 输出到 stdout，并以 exit 0 结束。stderr 加 exit 2 应保留给未使用 `hookSpecificOutput.permissionDecision` 的纯阻塞反馈。
