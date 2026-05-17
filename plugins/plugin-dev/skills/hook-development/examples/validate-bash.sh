#!/bin/bash
# 用于校验 Bash 命令的 PreToolUse hook 示例
# 此脚本演示 Bash 命令校验模式

set -euo pipefail

# 从 stdin 读取输入
input=$(cat)

# 提取命令
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# 校验命令是否存在
if [ -z "$command" ]; then
  echo '{"continue": true}' # No command to validate
  exit 0
fi

# 安全性：优先检查 shell 控制/注入模式
# 这些检查必须先于“安全命令”允许名单执行，以防被绕过
# 例如：echo $(rm -rf /)、ls; malicious、pwd && evil、whoami | exfil、echo ok > file
# 注意：这只是示例，不是完整的 shell 解析器。生产环境 hook 应
# 考虑为复杂命令策略使用真正的解析器或更严格的允许名单。
# shellcheck disable=SC2016 # 有意使用单引号 - 匹配字面量 $( 和 ` 字符
if [[ "$command" == *$'\n'* ]] || [[ "$command" == *$'\r'* ]] ||
   [[ "$command" == *";"* ]] || [[ "$command" == *"|"* ]] ||
   [[ "$command" == *"&"* ]] || [[ "$command" == *">"* ]] ||
   [[ "$command" == *"<"* ]] || [[ "$command" == *'$('* ]] ||
   [[ "$command" == *'`'* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask"}, "systemMessage": "Shell control syntax detected - requires review"}'
  exit 0
fi

# 检查明显安全的命令（快速放行）
# 重要：这个检查之所以安全，仅因为上面已拦截链式模式
if [[ "$command" =~ ^(ls|pwd|echo|date|whoami)(\s|$) ]]; then
  exit 0
fi

# 检查破坏性操作
if [[ "$command" == *"rm -rf"* ]] || [[ "$command" == *"rm -fr"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Dangerous command detected: rm -rf"}'
  exit 0
fi

# 检查其他危险命令
if [[ "$command" == *"dd if="* ]] || [[ "$command" == *"mkfs"* ]] || [[ "$command" == *"> /dev/"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Dangerous system operation detected"}'
  exit 0
fi

# 检查权限提升
if [[ "$command" == sudo* ]] || [[ "$command" == su* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask"}, "systemMessage": "Command requires elevated privileges"}'
  exit 0
fi

# 放行该操作
exit 0
