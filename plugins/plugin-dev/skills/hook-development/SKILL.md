---
name: hook-development
description: 当用户要求 "create a hook"、添加 PreToolUse/PostToolUse/Stop hook、验证工具使用、实现 prompt-based hooks、使用 ${CLAUDE_PLUGIN_ROOT}、设置事件驱动自动化、拦截危险命令、配置 scoped hooks、frontmatter hooks、在 skill/agent 中使用 hook、agent hook type、once handler、statusMessage、hook decision control、TeammateIdle hook、TaskCompleted hook，或提到 Claude Code hooks 事件（PreToolUse、PermissionRequest、PostToolUse、PostToolUseFailure、Stop、SubagentStop、SubagentStart、SessionStart、SessionEnd、UserPromptSubmit、PreCompact、Notification、TeammateIdle、TaskCompleted）时使用。提供创建和实现 Claude Code hooks 的完整指导，重点覆盖 advanced prompt-based hooks API、matcher 与 settings.json 配置。
---

# Claude Code Plugins 的 Hook 开发

## 概览

Hook 是事件驱动的自动化脚本，会在 Claude Code 事件发生时执行。可使用 hook 验证操作、强制执行策略、补充上下文，并将外部工具集成到工作流中。

**核心能力：**

- 在执行前验证工具调用（PreToolUse）
- 对工具结果作出响应（PostToolUse）
- 强制执行完成标准（Stop、SubagentStop）
- 加载项目上下文（SessionStart）
- 在整个开发生命周期中自动化工作流

## Hook 类型

### Prompt-Based Hooks（推荐）

使用 LLM 驱动的决策来进行具备上下文感知能力的验证：

```json
{
  "type": "prompt",
  "prompt": "Evaluate whether the current tool use is appropriate based on the PreToolUse event context. Return the documented event-specific JSON response.",
  "timeout": 30
}
```

**支持的事件：** Stop、SubagentStop、UserPromptSubmit、PreToolUse

**响应格式：**

Prompt hook 针对对应事件返回与 command hook 相同的 JSON 输出 schema。对于 Stop 一类可阻塞事件，使用：

```json
{ "decision": "block", "reason": "Explanation of decision" }
```

对于 PreToolUse 权限决策，使用 `hookSpecificOutput.permissionDecision`，其值为 `allow`、`deny`、`ask` 或 `defer`。

- 省略 `decision` 时，默认允许 Stop 一类事件继续
- 阻塞时必须提供 `reason`，该内容会反馈给 Claude
- 默认模型：Haiku

**优势：**

- 基于自然语言推理做出具备上下文感知的决策
- 无需 bash 脚本即可实现灵活的评估逻辑
- 更好地处理边界情况
- 更易维护和扩展

### Command Hooks

执行 bash 命令来完成确定性检查：

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "timeout": 60
}
```

**适用场景：**

- 快速、确定性的验证
- 文件系统操作
- 外部工具集成
- 对性能要求严格的检查

### Agent Hooks

使用 LLM agent 执行需要工具访问的复杂多步验证：

```json
{
  "type": "agent",
  "prompt": "Verify all generated code has tests and passes linting",
  "timeout": 120
}
```

**支持的事件：** Stop、SubagentStop

Agent hook 会启动一个可以使用工具（Read、Bash 等）的 subagent，以进行更彻底的验证；当 prompt-based hooks 缺少足够上下文或工具访问能力时，这种方式很有用。可参见 `references/advanced.md` 中的模式。

## Hook 配置格式

### Plugin hooks.json 格式

**对于** `hooks/hooks.json` **中的 plugin hooks**，使用包装格式：

```text
{
  "description": "Brief explanation of hooks (optional)",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**要点：**

- `description` 字段可选
- `hooks` 字段是必需的包装层，内部包含实际 hook 事件
- 这是**plugin 专用格式**

**示例：**

```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Settings 格式

**对于** `.claude/settings.json` **中的用户/项目 settings**，同样使用 `hooks` 包装层：

```text
{
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**要点：**

- `hooks` 字段是必需的包装层，内部包含实际 hook 事件
- settings 中不包含 plugin `description` 字段
- 这是**settings 格式**

**重要：** 下方示例展示的是完整的 settings 风格 hook 对象。plugin `hooks/hooks.json` 使用相同的 `hooks` 包装层，并且还可以包含 `description`。

## Hook 事件

### PreToolUse

在任意工具运行之前执行。可用于批准、拒绝或修改工具调用。

**settings 示例（prompt-based）：**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Validate file write safety. Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision set to allow, deny, ask, or defer."
          }
        ]
      }
    ]
  }
}
```

**PreToolUse 的输出：**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Explanation",
    "updatedInput": { "field": "modified_value" }
  },
  "systemMessage": "Explanation for Claude"
}
```

### PermissionRequest

当向用户显示权限对话框时执行。可用于自动允许或拒绝权限。

**Settings 示例：**

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-permission.sh"
          }
        ]
      }
    ]
  }
}
```

**PermissionRequest 的输出：**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": { "command": "modified command" },
      "message": "Reason for denial",
      "interrupt": false
    }
  }
}
```

- `behavior`：`"allow"` 表示批准，`"deny"` 表示拒绝
- `updatedInput`：可选的已修改工具参数（仅在 `"allow"` 时有效）
- `message`：展示给用户的解释（仅在 `"deny"` 时有效）
- `interrupt`：若为 true 且搭配 `"deny"`，则中止当前操作

**用例：**

- 自动批准符合模式的安全命令
- 拒绝危险操作并给出解释
- 在执行前修改工具输入

### PostToolUse

在工具完成后执行。可用于对结果作出响应、提供反馈或记录日志。

**Settings 示例：**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Analyze edit result for potential issues: syntax errors, security vulnerabilities, breaking changes. Provide feedback."
          }
        ]
      }
    ]
  }
}
```

**输出行为：**

- Exit 0：stdout 显示在 transcript 中
- Exit 2：stderr 反馈给 Claude
- `systemMessage` 会被加入上下文

### PostToolUseFailure

在工具失败且 PostToolUse hook 已运行后执行。可用于处理错误或提供后备操作。

**Settings 示例：**

```json
{
  "hooks": {
    "PostToolUseFailure": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Error occurred during edit. Provide fallback action or ask for user input."
          }
        ]
      }
    ]
  }
}
```

**输出行为：**

- Exit 2：stderr 反馈给 Claude
- `systemMessage` 会被加入上下文

### Stop

在主 agent 准备停止时执行。可用于验证完成度。

**Settings 示例：**

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Verify task completion: tests run, build succeeded, questions answered. Return {\"decision\": \"block\", \"reason\": \"...\"} only when work should continue; omit decision to allow stopping."
          }
        ]
      }
    ]
  }
}
```

**决策输出：**

```json
{
  "decision": "block",
  "reason": "Explanation",
  "systemMessage": "Additional context"
}
```

省略 `decision` 即表示允许停止。

### SubagentStop

在 subagent 准备停止时执行。可用于确保 subagent 已完成任务。

与 Stop hook 类似，但面向 subagent。

### SubagentStart

在 subagent 启动时执行。可用于初始化 subagent 状态或执行准备工作。`matcher` 用于匹配 agent type 或自定义 agent 名称。

**Settings 示例：**

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "general-purpose",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/subagent-init.sh"
          }
        ]
      }
    ]
  }
}
```

### UserPromptSubmit

在用户提交 prompt 时执行。可用于添加上下文、校验或阻止 prompt。

**Settings 示例：**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if prompt requires security guidance. If discussing auth, permissions, or API security, return relevant warnings."
          }
        ]
      }
    ]
  }
}
```

### SessionStart

在 Claude Code session 开始时执行。可用于加载上下文并设置环境。

**支持的 matcher：** `startup`（首次启动）、`resume`（恢复 session）、`clear`（/clear 之后）、`compact`（上下文压缩之后）。

**Settings 示例：**

```json
{
  "hooks": {
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
}
```

**特殊能力：** 可通过 `$CLAUDE_ENV_FILE` 持久化环境变量：

```bash
echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"
```

完整示例见 `examples/load-context.sh`。

### SessionEnd

在 session 结束时执行。可用于清理、记录日志和保留状态。

### PreCompact

在上下文压缩前执行。可用于补充需要保留的关键信息。

### Notification

在 Claude 发送通知时执行。可用于对用户通知作出响应。

## Hook 输出格式

### 标准输出（所有 Hooks）

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude"
}
```

- `continue`：若为 false，停止处理（默认 true）
- `suppressOutput`：从 transcript 中隐藏输出（默认 false）
- `systemMessage`：显示给 Claude 的消息

### Exit Codes

- `0` - 成功（stdout 显示在 transcript 中）
- `2` - 阻塞性错误（stderr 反馈给 Claude）
- 其他 - 非阻塞错误

## Hook 输入格式

Command hook 通过 stdin 接收 JSON，包含通用字段：

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.txt",
  "cwd": "/current/working/dir",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

**事件专属字段：**

- **PreToolUse/PermissionRequest/PostToolUse:** `tool_name`、`tool_input`、`tool_result`
- **UserPromptSubmit:** `prompt`
- **Stop/SubagentStop:** `stop_hook_active`

Prompt hook 会从 Claude Code 接收文档定义的 prompt/event context。编写 prompt 时应以通用方式引用这些上下文（例如“当前工具输入”或“用户提交的 prompt”），而不是假设存在 `$TOOL_INPUT`、`$TOOL_RESULT`、`$USER_PROMPT` 之类 shell 风格变量。

关于 command hook 针对每个工具与事件的完整输入 schema，参见 [Hook Input Schemas](references/hook-input-schemas.md)。

## 环境变量

在所有 command hook 中可用：

- `$CLAUDE_PROJECT_DIR` - 项目根路径
- `$CLAUDE_PLUGIN_ROOT` - Plugin 目录（便于使用可移植路径）
- `$CLAUDE_ENV_FILE` - 仅 SessionStart：在此持久化 env 变量
- `$CLAUDE_CODE_REMOTE` - 若在远程上下文中运行则会设置

**始终在 hook command 中使用 ${CLAUDE_PLUGIN_ROOT} 以保证可移植性：**

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
}
```

## Plugin Hook 配置

在 plugin 中，使用 [Hook Configuration Formats](#hook-configuration-formats) 中描述的 **plugin wrapper format**，在 `hooks/hooks.json` 中定义 hook：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "prompt", "prompt": "Validate file write safety" }]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [{ "type": "prompt", "prompt": "Verify task completion" }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**说明：** Plugin hook 与 settings 一样使用 `{"hooks": {...}}` 包装层，并且可以额外包含可选的 `description`。Plugin hook 会与用户 hook 合并并并行执行。

## Skill Frontmatter 中的 Scoped Hooks

除了 `hooks.json`（全局）和 settings（用户级）之外，在 Claude Code 支持时，也可以直接在 skill YAML frontmatter 中定义 hook。此类 scoped hooks 仅在该 skill 使用期间激活。plugin 自带 agent 的 frontmatter 不支持 `hooks`；与 plugin agent 相关的 hook 应改放在 `hooks/hooks.json` 中：

```yaml
---
name: validated-writer
description: Write files with safety checks...
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
---
```

**frontmatter 中支持的事件：** `PreToolUse`、`PostToolUse`、`Stop`

Scoped skill hooks 使用与全局相同的 event/matcher/hook 结构，但它们与生命周期绑定：skill 加载时启用，skill 完成时停用。这非常适合只在特定 skill 中生效、而不影响其他工作流的验证逻辑。

更详细的语法以及与 `hooks.json` 的对比，见 `references/advanced.md`。

## Matchers

### 工具名匹配

**精确匹配：**

```text
"matcher": "Write"
```

**多个工具：**

```text
"matcher": "Read|Write|Edit"
```

**通配符（所有工具）：**

```text
"matcher": "*"
```

**正则模式：**

```jsonc
"matcher": "mcp__.*__delete.*"  // All MCP delete tools
```

**说明：** Matchers 区分大小写。

### 常见模式

```jsonc
// All MCP tools
"matcher": "mcp__.*"

// Specific MCP server tools
"matcher": "mcp__asana__.*"

// All file operations
"matcher": "Read|Write|Edit"

// Bash commands only
"matcher": "Bash"
```

## 安全最佳实践

### 输入校验

始终在 command hook 中校验输入：

```bash
#!/bin/bash
set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Validate tool name format
if [[ ! "$tool_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Invalid tool name"}}'
  exit 0
fi
```

### 路径安全

检查路径穿越和敏感文件：

```bash
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Deny path traversal
if [[ "$file_path" == *".."* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Path traversal detected"}}'
  exit 0
fi

# Deny sensitive files
if [[ "$file_path" == *".env"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Sensitive file"}}'
  exit 0
fi
```

完整示例见 `examples/validate-write.sh` 和 `examples/validate-bash.sh`。

### 为所有变量加引号

```bash
# GOOD: Quoted
echo "$file_path"
cd "$CLAUDE_PROJECT_DIR"

# BAD: Unquoted (injection risk)
echo $file_path
cd $CLAUDE_PROJECT_DIR
```

### 设置合适的超时时间

```json
{
  "type": "command",
  "command": "bash script.sh",
  "timeout": 10
}
```

**默认值：** Command hooks（60s），Prompt hooks（30s）

## 性能注意事项

### 并行执行

所有匹配到的 hook 都会**并行**运行：

```jsonc
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        { "type": "command", "command": "check1.sh" }, // Parallel
        { "type": "command", "command": "check2.sh" }, // Parallel
        { "type": "prompt", "prompt": "Validate..." } // Parallel
      ]
    }
  ]
}
```

**设计含义：**

- Hook 看不到彼此的输出
- 执行顺序不确定
- 设计时应保证彼此独立

### 优化

1. 用 command hooks 做快速确定性检查
2. 用 prompt-based hooks 处理复杂推理
3. 用临时文件缓存验证结果
4. 在热点路径中尽量减少 I/O

## Hook 生命周期与限制

### Hooks 在 SessionStart 时加载

**重要：** Hook 会在 Claude Code session 启动时加载。修改 hook 配置后，必须重启 Claude Code 才会生效。

**不能热替换 hooks：**

- 编辑 `hooks/hooks.json` 不会影响当前 session
- 新增 hook 脚本不会被识别
- 修改 hook command/prompt 不会实时更新
- 必须重启 Claude Code：退出后再次运行 `claude`

**测试 hook 变更的方法：**

1. 编辑 hook 配置或脚本
2. 退出 Claude Code session
3. 重启：`claude`
4. 加载新的 hook 配置
5. 使用 `claude --debug` 测试 hook

### 启动时的 Hook 校验

Claude Code 启动时会校验 hook：

- hooks.json 中的无效 JSON 会导致加载失败
- 缺失脚本会产生警告
- 语法错误会在 debug 模式中报告

可使用 `/hooks` 命令查看当前 session 已加载的 hook。

## 调试 Hooks

### 启用 Debug Mode

```bash
claude --debug
```

关注 hook 注册、执行日志、输入/输出 JSON 与耗时信息。

若需要额外的 hook 调试输出，可使用 `--verbose`：

```bash
claude --verbose
```

它会显示 hook 注册、事件匹配与执行耗时，而不输出完整 debug 细节。若需最详细信息，可与 `--debug` 组合使用。

### 测试 Hook Scripts

直接测试 command hooks：

```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/test"}}' | \
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh

echo "Exit code: $?"
```

### 校验 JSON 输出

确保 hook 输出有效 JSON：

```bash
output=$(./your-hook.sh < test-input.json)
echo "$output" | jq .
```

## 快速参考

### Hook 事件摘要

| Event              | 触发时机           | 用途                     |
| ------------------ | ------------------ | ------------------------ |
| PreToolUse         | 工具前             | 验证、修改               |
| PermissionRequest  | 权限对话框         | 自动允许/拒绝            |
| PostToolUse        | 工具成功后         | 反馈、日志               |
| PostToolUseFailure | 工具失败后         | 错误处理                 |
| UserPromptSubmit   | 用户输入           | 上下文、校验             |
| Stop               | Agent 停止前       | 完整性检查               |
| SubagentStart      | Subagent 启动时    | Subagent 初始化          |
| SubagentStop       | Subagent 完成时    | 任务校验                 |
| SessionStart       | Session 开始时     | 加载上下文               |
| SessionEnd         | Session 结束时     | 清理、日志               |
| PreCompact         | Compact 前         | 保留上下文               |
| Notification       | 用户收到通知时     | 日志、响应               |
| TeammateIdle       | 队友进入空闲时     | 团队质量门禁             |
| TaskCompleted      | 任务标记完成时     | 完成验证                 |

### Handler 配置字段

除了 `type`、`timeout` 和 `matcher` 之外，hook handler 还支持：

- **`once`**（boolean）：每个 session 仅运行一次，然后自动移除。适合 scoped hook 中的一次性初始化。
- **`statusMessage`**（string）：hook 运行期间在 UI 中显示的文本。

更详细的 decision control 输出 schema 与按事件区分的 matcher，见 `references/advanced.md`。

### 最佳实践

**DO：**

- ✅ 对复杂逻辑使用 prompt-based hooks
- ✅ 使用 ${CLAUDE_PLUGIN_ROOT} 保证可移植性
- ✅ 在 command hook 中校验所有输入
- ✅ 为所有 bash 变量加引号
- ✅ 设置合适的超时时间
- ✅ 返回结构化 JSON 输出
- ✅ 充分测试 hooks

**DON'T：**

- ❌ 使用硬编码路径
- ❌ 未校验即信任用户输入
- ❌ 创建长时间运行的 hooks
- ❌ 依赖 hook 执行顺序
- ❌ 不可预测地修改全局状态
- ❌ 记录敏感信息

## 其他资源

### 参考文件

若需详细模式与高级技巧，可查阅：

- **`references/patterns.md`** - 10 个成熟模式，包括临时启用和配置驱动的 hooks
- **`references/migration.md`** - 从基础 hooks 迁移到高级 hooks
- **`references/advanced.md`** - 高级用例与技巧

### 示例 Hook Scripts

`examples/` 中的可运行示例：

> **注意：** 复制示例脚本后，记得赋予可执行权限：`chmod +x script.sh`

- **`validate-write.sh`** - 文件写入验证示例
- **`validate-bash.sh`** - Bash 命令验证示例
- **`load-context.sh`** - SessionStart 上下文加载示例

### 实用脚本

> **前提条件**：这些脚本假定环境提供 `bash` 3.2+、`grep` 和 `sed`。JSON 校验脚本还需要 `jq` 1.6+；可用 `jq --version` 检查，如缺失请通过系统包管理器安装。

`scripts/` 中的开发工具：

- **`validate-hook-schema.sh`** - 校验 hooks.json 结构与语法
- **`test-hook.sh`** - 在部署前用示例输入测试 hooks
- **`hook-linter.sh`** - 检查 hook 脚本中的常见问题与最佳实践违规

### 外部资源

- **官方文档**：<https://code.claude.com/docs/en/hooks>
- **示例**：参考 marketplace 中的 security-guidance plugin
- **测试**：使用 `claude --debug` 查看详细日志
- **校验**：使用 `jq` 校验 hook JSON 输出

## 实现工作流

在 plugin 中实现 hooks 时：

1. 确定要接入的事件（PreToolUse、Stop、SessionStart 等）
2. 在 prompt-based（灵活）与 command（确定性）hooks 之间做选择
3. 在 `hooks/hooks.json` 中编写 hook 配置
4. 若使用 command hooks，则创建 hook 脚本
5. 所有文件引用都使用 ${CLAUDE_PLUGIN_ROOT}
6. 用 `scripts/validate-hook-schema.sh hooks/hooks.json` 校验配置
7. 部署前使用 `scripts/test-hook.sh` 测试 hooks
8. 用 `claude --debug` 在 Claude Code 中测试
9. 在 plugin README 中记录 hooks

大多数场景优先使用 prompt-based hooks。仅在对性能要求严格或需要确定性检查时保留 command hooks。
