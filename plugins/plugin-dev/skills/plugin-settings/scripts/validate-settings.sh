#!/bin/bash
# Settings 文件校验器
# 校验 .claude/plugin-name.local.md 结构

set -euo pipefail

# 用法
if [ $# -eq 0 ]; then
  echo "Usage: $0 <path/to/settings.local.md>"
  echo ""
  echo "Validates plugin settings file for:"
  echo "  - File existence and readability"
  echo "  - YAML frontmatter structure"
  echo "  - Required --- markers"
  echo "  - Field format"
  echo ""
  echo "Example: $0 .claude/my-plugin.local.md"
  exit 1
fi

SETTINGS_FILE="$1"

echo "🔍 Validating settings file: $SETTINGS_FILE"
echo ""

# 检查 1：文件存在
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "❌ File not found: $SETTINGS_FILE"
  exit 1
fi
echo "✅ File exists"

# 检查 2：文件可读
if [ ! -r "$SETTINGS_FILE" ]; then
  echo "❌ File is not readable"
  exit 1
fi
echo "✅ File is readable"

# 检查 3：具有有效的 frontmatter 起始标记
FIRST_LINE=$(head -n 1 "$SETTINGS_FILE")
if [ "$FIRST_LINE" != "---" ]; then
  echo "❌ Invalid frontmatter: line 1 must be ---"
  echo "   Expected format:"
  echo "   ---"
  echo "   field: value"
  echo "   ---"
  echo "   Content..."
  exit 1
fi

if ! tail -n +2 "$SETTINGS_FILE" | grep -q '^---$'; then
  echo "❌ Invalid frontmatter: missing closing --- marker"
  exit 1
fi

echo "✅ Frontmatter markers present"

# 检查 4：提取并校验 frontmatter
FRONTMATTER=$(awk '
  NR == 1 { next }
  /^---$/ { exit }
  { print }
' "$SETTINGS_FILE")

if [ -z "$FRONTMATTER" ]; then
  echo "❌ Empty frontmatter (nothing between --- markers)"
  exit 1
fi
echo "✅ Frontmatter not empty"

# 检查 5：frontmatter 具有有效的类 YAML 结构
if ! printf '%s\n' "$FRONTMATTER" | grep -q ':'; then
  echo "⚠️  Warning: Frontmatter has no key:value pairs"
fi

# 检查 6：查找常见字段
echo ""
echo "Detected fields:"
while IFS=':' read -r key value; do
  echo "  - $key: ${value:0:50}"
done < <(printf '%s\n' "$FRONTMATTER" | grep '^[a-z_][a-z0-9_]*:' || true)

# 检查 7：校验常见字段
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)
if [ -n "$VALUE" ] && [ "$VALUE" != "true" ] && [ "$VALUE" != "false" ]; then
  echo "⚠️  Field 'enabled' should be boolean (true/false), got: $VALUE"
fi

VALIDATION_MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_mode:' | sed 's/validation_mode: *//' || true)
if [ -n "$VALIDATION_MODE" ] && [ "$VALIDATION_MODE" != "strict" ] && [ "$VALIDATION_MODE" != "standard" ] && [ "$VALIDATION_MODE" != "lenient" ]; then
  echo "⚠️  Field 'validation_mode' should be strict, standard, or lenient, got: $VALIDATION_MODE"
fi

# 检查 8：检查正文是否存在
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
' "$SETTINGS_FILE")

echo ""
if [ -n "$BODY" ]; then
  BODY_LINES=$(echo "$BODY" | wc -l | tr -d ' ')
  echo "✅ Markdown body present ($BODY_LINES lines)"
else
  echo "⚠️  No markdown body (frontmatter only)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Settings file structure is valid"
echo ""
echo "Reminder: Settings content is read on the next hook/command invocation; restart only after hook registration or plugin configuration changes"
exit 0
