#!/bin/bash
# Agent 文件校验器
# 校验 agent Markdown 文件的结构和内容是否正确

set -euo pipefail

# 用法
if [ $# -eq 0 ]; then
  echo "Usage: $0 <path/to/agent.md>"
  echo ""
  echo "Validates agent file for:"
  echo "  - YAML frontmatter structure"
  echo "  - Required fields (name, description)"
  echo "  - Field formats and constraints"
  echo "  - System prompt presence and length"
  echo "  - Example blocks in description"
  exit 1
fi

AGENT_FILE="$1"

echo "🔍 Validating agent file: $AGENT_FILE"
echo ""

# 检查 1：文件是否存在
if [ ! -f "$AGENT_FILE" ]; then
  echo "❌ File not found: $AGENT_FILE"
  exit 1
fi
echo "✅ File exists"

# 检查 2：是否以 --- 开头
FIRST_LINE=$(head -1 "$AGENT_FILE")
if [ "$FIRST_LINE" != "---" ]; then
  echo "❌ File must start with YAML frontmatter (---)"
  exit 1
fi
echo "✅ Starts with frontmatter"

# 检查 3：是否包含结束 ---
if ! tail -n +2 "$AGENT_FILE" | grep -q '^---$'; then
  echo "❌ Frontmatter not closed (missing second ---)"
  exit 1
fi
echo "✅ Frontmatter properly closed"

# 仅从第一个 YAML block 中提取 frontmatter 和 system prompt
FRONTMATTER=$(awk '
  NR == 1 { next }
  /^---$/ { exit }
  { print }
' "$AGENT_FILE")
SYSTEM_PROMPT=$(awk '
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
' "$AGENT_FILE")

# 检查 4：必填字段
echo ""
echo "Checking required fields..."

error_count=0
warning_count=0

# 检查 name 字段
NAME=$(echo "$FRONTMATTER" | grep '^name:' | sed 's/name: *//' | sed 's/^"\(.*\)"$/\1/' || true)

if [ -z "$NAME" ]; then
  echo "❌ Missing required field: name"
  error_count=$((error_count + 1))
else
  echo "✅ name: $NAME"

  # 校验名称格式
  if ! [[ "$NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
    echo "❌ name must start/end with lowercase alphanumeric and contain only lowercase letters, numbers, hyphens"
    error_count=$((error_count + 1))
  fi

  # 校验名称长度
  name_length=${#NAME}
  if [ "$name_length" -lt 3 ]; then
    echo "❌ name too short (minimum 3 characters)"
    error_count=$((error_count + 1))
  elif [ "$name_length" -gt 50 ]; then
    echo "❌ name too long (maximum 50 characters)"
    error_count=$((error_count + 1))
  fi

  # 检查是否为泛化名称
  if [[ "$NAME" =~ ^(helper|assistant|agent|tool)$ ]]; then
    echo "⚠️  name is too generic: $NAME"
    warning_count=$((warning_count + 1))
  fi
fi

# 检查 description 字段 - 处理多行 YAML
# 当遇到另一个顶层 YAML 字段时，description 结束
DESCRIPTION=$(echo "$FRONTMATTER" | awk '
  /^description:/ {
    in_desc = 1
    sub(/^description: */, "")
    if ($0 != "") print
    next
  }
  in_desc && /^[A-Za-z][A-Za-z0-9_-]*:/ { exit }
  in_desc { print }
')

if [ -z "$DESCRIPTION" ]; then
  echo "❌ Missing required field: description"
  error_count=$((error_count + 1))
else
  desc_length=${#DESCRIPTION}
  echo "✅ description: ${desc_length} characters"

  if [ "$desc_length" -lt 10 ]; then
    echo "⚠️  description too short (minimum 10 characters recommended)"
    warning_count=$((warning_count + 1))
  elif [ "$desc_length" -gt 5000 ]; then
    echo "⚠️  description very long (over 5000 characters)"
    warning_count=$((warning_count + 1))
  fi

  # 检查是否包含 example block
  if ! echo "$DESCRIPTION" | grep -q '<example>'; then
    echo "⚠️  description should include <example> blocks for triggering"
    warning_count=$((warning_count + 1))
  fi

  # 检查是否包含 "Use this agent when" 模式
  if ! echo "$DESCRIPTION" | grep -qi 'use this agent when'; then
    echo "⚠️  description should start with 'Use this agent when...'"
    warning_count=$((warning_count + 1))
  fi
fi

# 检查 model 字段（可选）
MODEL=$(echo "$FRONTMATTER" | grep '^model:' | sed 's/model: *//' || true)

if [ -n "$MODEL" ]; then
  echo "✅ model: $MODEL"

  case "$MODEL" in
    inherit|sonnet|opus|haiku)
      # 有效 model
      ;;
    *)
      echo "⚠️  Unknown model: $MODEL (valid: inherit, sonnet, opus, haiku)"
      warning_count=$((warning_count + 1))
      ;;
  esac
else
  echo "💡 model: not specified (defaults to inherited model)"
fi

# 检查 color 字段（可选）
COLOR=$(echo "$FRONTMATTER" | grep '^color:' | sed 's/color: *//' || true)

if [ -n "$COLOR" ]; then
  echo "✅ color: $COLOR"

  case "$COLOR" in
    blue|cyan|green|yellow|magenta|red)
      # 有效 color
      ;;
    *)
      echo "⚠️  Unknown color: $COLOR (valid: blue, cyan, green, yellow, magenta, red)"
      warning_count=$((warning_count + 1))
      ;;
  esac
else
  echo "💡 color: not specified"
fi

# 检查 tools 字段（可选）
TOOLS=$(echo "$FRONTMATTER" | grep '^tools:' | sed 's/tools: *//' || true)

if [ -n "$TOOLS" ]; then
  echo "✅ tools: $TOOLS"
else
  echo "💡 tools: not specified (no agent-specific allowlist)"
fi

# 检查插件内置但不支持的字段
for unsupported_field in permissionMode mcpServers hooks; do
  if echo "$FRONTMATTER" | grep -q "^${unsupported_field}:"; then
    echo "❌ Unsupported plugin-shipped agent field: ${unsupported_field}"
    error_count=$((error_count + 1))
  fi
done

# 检查 skills 字段形态（可选）
SKILLS_LINE=$(echo "$FRONTMATTER" | grep '^skills:' || true)
if [ -n "$SKILLS_LINE" ]; then
  if ! echo "$SKILLS_LINE" | grep -Eq '^skills:[[:space:]]*$'; then
    echo "❌ skills must use a YAML list, not a single-line scalar"
    error_count=$((error_count + 1))
  else
    echo "✅ skills: YAML list"
  fi
fi

# 检查 5：system prompt
echo ""
echo "Checking system prompt..."

if [ -z "$SYSTEM_PROMPT" ]; then
  echo "❌ System prompt is empty"
  error_count=$((error_count + 1))
else
  prompt_length=${#SYSTEM_PROMPT}
  echo "✅ System prompt: $prompt_length characters"

  if [ "$prompt_length" -lt 20 ]; then
    echo "❌ System prompt too short (minimum 20 characters)"
    error_count=$((error_count + 1))
  elif [ "$prompt_length" -gt 10000 ]; then
    echo "⚠️  System prompt very long (over 10,000 characters)"
    warning_count=$((warning_count + 1))
  fi

  # 检查是否使用第二人称
  if ! echo "$SYSTEM_PROMPT" | grep -Eq "You are|You will|Your"; then
    echo "⚠️  System prompt should use second person (You are..., You will...)"
    warning_count=$((warning_count + 1))
  fi

  # 检查是否有结构
  if ! echo "$SYSTEM_PROMPT" | grep -Eqi "responsibilities|process|steps"; then
    echo "💡 Consider adding clear responsibilities or process steps"
  fi

  if ! echo "$SYSTEM_PROMPT" | grep -qi "output"; then
    echo "💡 Consider defining output format expectations"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $error_count -eq 0 ] && [ $warning_count -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
elif [ $error_count -eq 0 ]; then
  echo "⚠️  Validation passed with $warning_count warning(s)"
  exit 0
else
  echo "❌ Validation failed with $error_count error(s) and $warning_count warning(s)"
  exit 1
fi
