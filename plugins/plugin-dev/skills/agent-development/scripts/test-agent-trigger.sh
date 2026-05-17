#!/bin/bash
# Agent 触发测试辅助脚本
# 提取触发示例并校验 example block 格式

set -euo pipefail

# 用法
if [ $# -eq 0 ]; then
  echo "Usage: $0 <path/to/agent.md>"
  echo ""
  echo "This script helps test agent triggering by:"
  echo "  - Extracting <example> blocks from description"
  echo "  - Parsing user phrases that should trigger the agent"
  echo "  - Validating example block formatting"
  echo "  - Providing manual testing guidance"
  exit 1
fi

AGENT_FILE="$1"

echo "🔍 Analyzing agent triggers: $AGENT_FILE"
echo ""

# 检查文件是否存在
if [ ! -f "$AGENT_FILE" ]; then
  echo "❌ File not found: $AGENT_FILE"
  exit 1
fi

# 检查 frontmatter 是否存在
FIRST_LINE=$(head -1 "$AGENT_FILE")
if [ "$FIRST_LINE" != "---" ]; then
  echo "❌ File must start with YAML frontmatter (---)"
  exit 1
fi

# 提取 agent 名称
NAME=$(sed -n '/^---$/,/^---$/p' "$AGENT_FILE" | grep '^name:' | sed 's/name: *//' | sed 's/^"\(.*\)"$/\1/' | head -1)

if [ -z "$NAME" ]; then
  echo "❌ Could not extract agent name"
  exit 1
fi

echo "📋 Agent: $NAME"
echo ""

# 提取完整的 frontmatter 区段
FRONTMATTER=$(awk '
  /^---$/ { count++; next }
  count == 1 { print }
' "$AGENT_FILE")

# 提取 description - 处理多行 YAML
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
  echo "❌ Could not extract description"
  exit 1
fi

# 统计 example block 数量
EXAMPLE_COUNT=$(echo "$DESCRIPTION" | grep -c '<example>' 2>/dev/null || true)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 EXAMPLE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$EXAMPLE_COUNT" -eq 0 ]; then
  echo "⚠️  No <example> blocks found in description"
  echo ""
  echo "Agent descriptions should include 2-4 example blocks showing"
  echo "when the agent should be triggered."
  echo ""
  echo "Example format:"
  echo "  <example>"
  echo "  Context: [Scenario description]"
  echo '  user: "[User request]"'
  echo '  assistant: "[How Claude responds]"'
  echo "  <commentary>"
  echo "  [Why this triggers the agent]"
  echo "  </commentary>"
  echo "  </example>"
  exit 1
fi

echo "Found $EXAMPLE_COUNT example block(s)"
echo ""

# 提取并显示每个示例
# 使用 awk 提取 example block
echo "$DESCRIPTION" | awk '
  /<example>/ { in_example=1; example=""; next }
  /<\/example>/ {
    in_example=0
    example_num++
    print "───────────────────────────────────────"
    print "Example " example_num ":"
    print "───────────────────────────────────────"
    print example
    print ""
    next
  }
  in_example { example = example $0 "\n" }
' | while IFS= read -r line; do
  echo "$line"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 TRIGGER PHRASES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 提前初始化 warning 计数器（跨区段使用）
warning_count=0

# 从示例中提取用户短语
USER_PHRASES=$(echo "$DESCRIPTION" | grep -oE 'user: *"[^"]*"' | sed 's/user: *"//' | sed 's/"$//' || true)

if [ -z "$USER_PHRASES" ]; then
  echo "⚠️  Could not extract user phrases from examples"
  echo ""
  echo "Make sure examples include 'user: \"phrase\"' format"
  warning_count=$((warning_count + 1))
else
  echo "Use these phrases to test agent triggering:"
  echo ""
  echo "$USER_PHRASES" | while IFS= read -r phrase; do
    echo "  → $phrase"
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否包含 "Use this agent when" 模式
if ! echo "$DESCRIPTION" | grep -qi 'use this agent when'; then
  echo "⚠️  Description should start with 'Use this agent when...'"
  warning_count=$((warning_count + 1))
else
  echo "✅ Has 'Use this agent when' pattern"
fi

# 检查示例数量
if [ "$EXAMPLE_COUNT" -lt 2 ]; then
  echo "⚠️  Only $EXAMPLE_COUNT example(s) - recommend 2-4 examples"
  warning_count=$((warning_count + 1))
elif [ "$EXAMPLE_COUNT" -gt 4 ]; then
  echo "⚠️  $EXAMPLE_COUNT examples - consider trimming to 2-4"
  warning_count=$((warning_count + 1))
else
  echo "✅ Good number of examples ($EXAMPLE_COUNT)"
fi

# 检查示例中是否包含 commentary
COMMENTARY_COUNT=$(echo "$DESCRIPTION" | grep -c '<commentary>' 2>/dev/null || true)
COMMENTARY_COUNT=$(echo "$COMMENTARY_COUNT" | tr -d '[:space:]')
if [ "$COMMENTARY_COUNT" -lt "$EXAMPLE_COUNT" ]; then
  echo "⚠️  Some examples missing <commentary> blocks"
  warning_count=$((warning_count + 1))
else
  echo "✅ All examples have commentary"
fi

# 检查示例中是否包含 Context
CONTEXT_COUNT=$(echo "$DESCRIPTION" | grep -ci 'context:' 2>/dev/null || true)
CONTEXT_COUNT=$(echo "$CONTEXT_COUNT" | tr -d '[:space:]')
if [ "$CONTEXT_COUNT" -lt "$EXAMPLE_COUNT" ]; then
  echo "⚠️  Some examples missing Context: lines"
  warning_count=$((warning_count + 1))
else
  echo "✅ All examples have context"
fi

# 检查是否包含 assistant 响应
ASSISTANT_COUNT=$(echo "$DESCRIPTION" | grep -c 'assistant:' 2>/dev/null || true)
ASSISTANT_COUNT=$(echo "$ASSISTANT_COUNT" | tr -d '[:space:]')
if [ "$ASSISTANT_COUNT" -lt "$EXAMPLE_COUNT" ]; then
  echo "⚠️  Some examples missing assistant: responses"
  warning_count=$((warning_count + 1))
else
  echo "✅ All examples have assistant responses"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 MANUAL TESTING GUIDE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To test agent triggering:"
echo ""
echo "1. Load your plugin in Claude Code:"
echo "   claude --plugin-dir /path/to/plugin"
echo ""
echo "2. Try the trigger phrases listed above"
echo ""
echo "3. Verify Claude loads the agent (look for agent indicator)"
echo ""
echo "4. Test variations of the phrases to ensure robust triggering"
echo ""
echo "5. Test negative cases - phrases that should NOT trigger"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$warning_count" -eq 0 ]; then
  echo "✅ All validations passed!"
  exit 0
else
  echo "⚠️  Completed with $warning_count warning(s)"
  exit 0
fi
