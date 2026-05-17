# 从基础 Hooks 迁移到高级 Hooks

本指南说明如何从基础 command hooks 迁移到高级 prompt-based hooks，以获得更好的可维护性与灵活性。

下方 JSON 片段展示的是 `hooks` object 的内容。在 `.claude/settings.json` 或 plugin `hooks/hooks.json` 中，请将它们包装为 `{ "hooks": { ... } }`。

## 为什么要迁移？

Prompt-based hooks 有以下优势：

- **自然语言推理**：LLM 能理解上下文和意图
- **更好的边界情况处理**：能适应意料之外的场景
- **无需 bash 脚本**：更易编写和维护
- **更灵活的验证**：无需编码即可处理复杂逻辑

## 迁移示例：Bash 命令校验

### Before（基础 Command Hook）

**配置：**

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash validate-bash.sh"
        }
      ]
    }
  ]
}
```

**脚本（validate-bash.sh）：**

```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')

# Hard-coded validation logic
if [[ "$command" == *"rm -rf"* ]]; then
  echo "Dangerous command detected" >&2
  exit 2
fi
```

**问题：**

- 只能检查精确的 `rm -rf` 模式
- 无法捕捉 `rm -fr` 或 `rm -r -f` 之类变体
- 会漏掉其他危险命令（`dd`、`mkfs` 等）
- 缺少上下文感知能力
- 需要 bash 脚本知识

### After（高级 Prompt Hook）

**配置：**

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Using the PreToolUse event context, analyze the requested Bash command for: 1) Destructive operations (rm -rf, dd, mkfs, etc) 2) Privilege escalation (sudo) 3) Network operations without user consent. Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision allow, deny, ask, or defer.",
          "timeout": 15
        }
      ]
    }
  ]
}
```

**收益：**

- 能捕捉各种变体和模式
- 理解的是意图，而不只是字面字符串
- 不再需要脚本文件
- 易于按新标准扩展
- 决策具备上下文感知能力
- 拒绝时可自然语言说明原因

## 迁移示例：文件写入校验

### Before（基础 Command Hook）

**配置：**

```json
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "bash validate-write.sh"
        }
      ]
    }
  ]
}
```

**脚本（validate-write.sh）：**

```bash
#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Check for path traversal
# NOTE: This basic check catches literal ".." but has limitations:
# - Does not detect URL-encoded traversal (%2e%2e)
# - Cannot detect symlink-based traversal where resolved path escapes bounds
# - Shell expansion could bypass in some contexts
# For production hooks, consider using:
#   resolved=$(realpath -m "$file_path" 2>/dev/null || echo "$file_path")
# and comparing against an allowed directory prefix
if [[ "$file_path" == *".."* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Path traversal detected"}}'
  exit 0
fi

# Check for system paths
if [[ "$file_path" == "/etc/"* ]] || [[ "$file_path" == "/sys/"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "System file"}}'
  exit 0
fi
```

**问题：**

- 路径模式是硬编码的
- 无法理解 symlink
- 缺少边界情况处理（例如 `/etc` 与 `/etc/`）
- 不考虑文件内容

### After（高级 Prompt Hook）

**配置：**

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Using the PreToolUse event context, verify the requested file path and available content preview: 1) Not system directories (/etc, /sys, /usr) 2) Not credentials (.env, tokens, secrets) 3) No path traversal 4) Content doesn't expose secrets. Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision allow, deny, ask, or defer."
        }
      ]
    }
  ]
}
```

**收益：**

- 具备上下文感知能力（也会考虑内容）
- 能处理 symlink 和边界情况
- 能自然理解“system directories”
- 能检测内容中的 secrets
- 易于扩展校验标准

## 何时保留 Command Hooks

Command hooks 仍然有其适用位置：

### 1. 确定性的性能检查

```bash
#!/bin/bash
# Check file size quickly
file_path=$(echo "$input" | jq -r '.tool_input.file_path')
size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null)

if [ "$size" -gt 10000000 ]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "File too large"}}'
  exit 0
fi
```

**在以下情况使用 command hooks：** 验证逻辑纯粹是数学或确定性的。若返回结构化的 PreToolUse 权限决策，应将 JSON 打印到 stdout，并以 exit 0 结束。

### 2. 外部工具集成

```bash
#!/bin/bash
# Run security scanner
file_path=$(echo "$input" | jq -r '.tool_input.file_path')
scan_result=$(security-scanner "$file_path")

if [ "$?" -ne 0 ]; then
  echo "Security scan failed: $scan_result" >&2
  exit 2
fi
```

**在以下情况使用 command hooks：** 需要接入会返回是/否结果的外部工具。

### 3. 极快检查 (< 50ms)

```bash
#!/bin/bash
# Quick regex check
command=$(echo "$input" | jq -r '.tool_input.command')

if [[ "$command" =~ ^(ls|pwd|echo)$ ]]; then
  exit 0  # Safe commands
fi
```

**在以下情况使用 command hooks：** 性能至关重要且逻辑简单。

## 混合方案

将两者结合，进行多阶段验证：

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

其中 command hook 负责快速确定性检查，而 prompt hook 负责复杂推理。

## 迁移检查清单

迁移 hooks 时：

- [ ] 找出 command hook 中的验证逻辑
- [ ] 将硬编码模式改写为自然语言标准
- [ ] 用旧 hook 漏掉的边界情况做测试
- [ ] 验证 LLM 能正确理解意图
- [ ] 设置合适的 timeout（prompt hooks 通常为 15-30s）
- [ ] 在 README 中记录新的 hook
- [ ] 移除或归档旧脚本文件

## 迁移提示

1. **一次先迁移一个 hook**：不要一次性全部迁移
2. **充分测试**：确认 prompt hook 能捕捉到 command hook 原本能捕捉的问题
3. **寻找改进点**：把迁移当成增强验证的机会
4. **保留脚本作参考**：归档旧脚本，以便需要时参考原逻辑
5. **记录原因**：在 README 中说明 prompt hook 为什么更好

## 完整迁移示例

### 原始 Plugin 结构

```
my-plugin/
├── .claude-plugin/plugin.json
├── hooks/hooks.json
└── scripts/
    ├── validate-bash.sh
    ├── validate-write.sh
    └── check-tests.sh
```

### 迁移后

```
my-plugin/
├── .claude-plugin/plugin.json
├── hooks/hooks.json      # Now uses prompt hooks
└── scripts/              # Archive or delete
    └── archive/
        ├── validate-bash.sh
        ├── validate-write.sh
        └── check-tests.sh
```

### 更新后的 hooks.json

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate bash command safety: destructive ops, privilege escalation, network access"
        }
      ]
    },
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Validate file write safety: system paths, credentials, path traversal, content secrets"
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
          "prompt": "Verify tests were run if code was modified"
        }
      ]
    }
  ]
}
```

**结果：** 更简单、更易维护、功能更强。

## 常见迁移模式

### 模式：字符串包含 → 自然语言

**Before：**

```bash
if [[ "$command" == *"sudo"* ]]; then
  echo "Privilege escalation" >&2
  exit 2
fi
```

**After：**

```
"Check for privilege escalation (sudo, su, etc)"
```

### 模式：正则 → 意图

**Before：**

```bash
if [[ "$file" =~ \.(env|secret|key|token)$ ]]; then
  echo "Credential file" >&2
  exit 2
fi
```

**After：**

```
"Verify not writing to credential files (.env, secrets, keys, tokens)"
```

### 模式：多个条件 → 条件列表

**Before：**

```bash
if [ condition1 ] || [ condition2 ] || [ condition3 ]; then
  echo "Invalid" >&2
  exit 2
fi
```

**After：**

```
"Check: 1) condition1 2) condition2 3) condition3. Deny if any fail."
```

## 结论

迁移到 prompt-based hooks 能让 plugin 更易维护、更灵活、也更强大。将 command hooks 保留给确定性检查和外部工具集成即可。
