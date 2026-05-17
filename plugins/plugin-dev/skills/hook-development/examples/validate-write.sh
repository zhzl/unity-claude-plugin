#!/bin/bash
# 用于校验 Write/Edit 操作的 PreToolUse hook 示例
# 此脚本演示文件写入校验模式

set -euo pipefail

# 从 stdin 读取输入
input=$(cat)

# 提取文件路径和内容
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# 校验路径是否存在
if [ -z "$file_path" ]; then
  echo '{"continue": true}' # No path to validate
  exit 0
fi

# 检查路径遍历
# 注意：这个基础检查能捕获字面量 ".."，但存在局限：
# - 无法检测 URL 编码的遍历（%2e%2e）
# - 无法检测基于符号链接、且解析后路径越界的遍历
# - 在某些上下文中，shell 展开可能绕过该检查
# 对于生产环境 hook，可考虑使用：
#   resolved=$(realpath -m "$file_path" 2>/dev/null || echo "$file_path")
# 并与允许的目录前缀进行比较
if [[ "$file_path" == *".."* ]]; then
  jq -n --arg path "$file_path" \
    '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Path traversal detected in: \($path)"}'
  exit 0
fi

# 检查系统目录
if [[ "$file_path" == /etc/* ]] || [[ "$file_path" == /sys/* ]] || [[ "$file_path" == /usr/* ]]; then
  jq -n --arg path "$file_path" \
    '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Cannot write to system directory: \($path)"}'
  exit 0
fi

# 检查敏感文件
if [[ "$file_path" == *.env ]] || [[ "$file_path" == *secret* ]] || [[ "$file_path" == *credentials* ]]; then
  jq -n --arg path "$file_path" \
    '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask"}, "systemMessage": "Writing to potentially sensitive file: \($path)"}'
  exit 0
fi

# 放行该操作
exit 0
