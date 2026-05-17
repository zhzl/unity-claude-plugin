#!/bin/bash
# 从 .claude/<plugin>.local.md 读取 plugin settings 的 hook 示例
# 演示由 settings 驱动 hook 行为的完整模式
# 需要 jq 来解析 hook 输入并生成 JSON 输出

set -euo pipefail

# 使用带默认值的环境变量定义 settings 文件路径
# 这样在需要时可从外部配置 plugin 名称
PLUGIN_NAME="${PLUGIN_NAME:-my-plugin}"
SETTINGS_FILE=".claude/${PLUGIN_NAME}.local.md"

# 如果 settings 文件不存在则快速退出
if [[ ! -f "$SETTINGS_FILE" ]]; then
  # plugin 尚未配置 - 使用默认值或跳过
  exit 0
fi

# 仅解析首个代码块中的 YAML frontmatter
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") {
      exit 1
    }
    next
  }
  /^---$/ { exit }
  { print }
' "$SETTINGS_FILE")

# 提取配置字段
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' | sed 's/^"\(.*\)"$/\1/' || true)
VALIDATION_MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_mode:' | sed 's/validation_mode: *//' | sed 's/^"\(.*\)"$/\1/' || true)
MAX_SIZE=$(printf '%s\n' "$FRONTMATTER" | grep '^max_file_size:' | sed 's/max_file_size: *//' || true)

# 如果已禁用则快速退出
if [[ "$ENABLED" != "true" ]]; then
  exit 0
fi

# 读取 hook 输入
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# 应用已配置的校验
if [[ "$VALIDATION_MODE" == "strict" ]]; then
  # 严格模式：应用所有检查
  if [[ "$file_path" == *".."* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Path traversal blocked (strict mode)"}'
    exit 0
  fi

  if [[ "$file_path" == *".env"* ]] || [[ "$file_path" == *"secret"* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Sensitive file blocked (strict mode)"}'
    exit 0
  fi
else
  # 标准模式：仅执行基础检查
  if [[ "$file_path" == "/etc/"* ]] || [[ "$file_path" == "/sys/"* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "System path blocked"}'
    exit 0
  fi
fi

# 如果已配置则检查文件大小
if [[ -n "$MAX_SIZE" ]] && [[ "$MAX_SIZE" =~ ^[0-9]+$ ]]; then
  content=$(echo "$input" | jq -r '.tool_input.content // empty')
  content_size=${#content}

  if [[ $content_size -gt $MAX_SIZE ]]; then
    jq -n --arg size "$MAX_SIZE" \
      '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "File exceeds configured max size: \($size) bytes"}'
    exit 0
  fi
fi

# 所有检查均通过
exit 0
