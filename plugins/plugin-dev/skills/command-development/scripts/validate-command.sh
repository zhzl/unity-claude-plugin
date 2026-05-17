#!/bin/bash
# Command 文件校验器
# 校验 command 文件结构和语法

set -euo pipefail

# 用法
if [ $# -eq 0 ]; then
  echo "Usage: $0 <path/to/command.md> [command2.md ...]"
  echo ""
  echo "Validates command file for:"
  echo "  - File exists with .md extension"
  echo "  - YAML frontmatter syntax (if present)"
  echo "  - Non-empty content"
  echo "  - Correct location (warning only)"
  echo ""
  echo "Examples:"
  echo "  $0 .claude/commands/review.md"
  echo "  $0 commands/*.md"
  exit 1
fi

total_errors=0
total_warnings=0

validate_command() {
  local COMMAND_FILE="$1"
  local error_count=0
  local warning_count=0

  echo "🔍 Validating command: $COMMAND_FILE"
  echo ""

  # 检查 1：文件是否存在
  if [ ! -f "$COMMAND_FILE" ]; then
    echo "❌ Error: File not found: $COMMAND_FILE"
    return 1
  fi
  echo "✅ File exists"

  # 检查 2：.md 扩展名
  if [[ ! "$COMMAND_FILE" =~ \.md$ ]]; then
    echo "❌ Error: File must have .md extension"
    error_count=$((error_count + 1))
  else
    echo "✅ Has .md extension"
  fi

  # 检查 3：文件非空
  if [ ! -s "$COMMAND_FILE" ]; then
    echo "❌ Error: File is empty"
    error_count=$((error_count + 1))
  else
    echo "✅ File is not empty"
  fi

  # 检查 4：YAML frontmatter 语法（如果存在）
  if head -n 1 "$COMMAND_FILE" | grep -q "^---"; then
    echo ""
    echo "Checking YAML frontmatter..."

    # 只校验开头的 frontmatter 区块；正文中的水平分隔线是允许的
    CLOSING_LINE=$(awk 'NR > 1 && /^---$/ { print NR; exit }' "$COMMAND_FILE")
    if [ -z "$CLOSING_LINE" ]; then
      echo "❌ Error: Invalid YAML frontmatter (missing closing '---' marker)"
      error_count=$((error_count + 1))
    else
      echo "✅ YAML frontmatter delimiters valid"
    fi

    # 检查 YAML 是否格式错误（基础检查）
    # 提取 frontmatter - 仅限第一个和第二个 --- 标记之间
    local frontmatter
    frontmatter=$(awk '
      /^---$/ { count++; if (count == 2) exit; next }
      count == 1 { print }
    ' "$COMMAND_FILE")

    if [ -n "$frontmatter" ]; then
      # 检查是否包含制表符（YAML 更推荐空格）
      if echo "$frontmatter" | grep -q $'\t'; then
        echo "⚠️  Warning: Frontmatter contains tabs (YAML prefers spaces)"
        warning_count=$((warning_count + 1))
      fi

      # 检查常见 YAML 错误 - 只有键没有值
      if echo "$frontmatter" | grep -qE "^[a-z-]+:$"; then
        echo "⚠️  Warning: Frontmatter has keys without values"
        warning_count=$((warning_count + 1))
      fi
    fi
  else
    echo ""
    echo "ℹ️  No YAML frontmatter (optional)"
  fi

  # 检查 5：位置警告
  echo ""
  echo "Checking location..."
  if [[ "$COMMAND_FILE" == *".claude/commands/"* ]] || [[ "$COMMAND_FILE" == *"/commands/"* ]]; then
    echo "✅ File in expected commands directory"
  else
    echo "⚠️  Warning: File not in .claude/commands/ or plugin commands/ directory"
    warning_count=$((warning_count + 1))
  fi

  # 检查 6：文件名约定
  echo ""
  echo "Checking filename..."
  local filename
  filename=$(basename "$COMMAND_FILE" .md)

  if [[ "$filename" =~ [A-Z] ]]; then
    echo "⚠️  Warning: Filename contains uppercase letters (recommend lowercase)"
    warning_count=$((warning_count + 1))
  elif [[ "$filename" =~ [[:space:]] ]]; then
    echo "⚠️  Warning: Filename contains spaces (use hyphens instead)"
    warning_count=$((warning_count + 1))
  else
    echo "✅ Filename follows conventions"
  fi

  # 汇总
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ $error_count -eq 0 ] && [ $warning_count -eq 0 ]; then
    echo "✅ $COMMAND_FILE: All checks passed!"
  elif [ $error_count -eq 0 ]; then
    echo "⚠️  $COMMAND_FILE: Passed with $warning_count warning(s)"
  else
    echo "❌ $COMMAND_FILE: Failed with $error_count error(s) and $warning_count warning(s)"
  fi
  echo ""

  total_errors=$((total_errors + error_count))
  total_warnings=$((total_warnings + warning_count))

  return $error_count
}

# 处理所有传入文件
for file in "$@"; do
  validate_command "$file" || true
done

# 多文件的最终汇总
if [ $# -gt 1 ]; then
  echo "═══════════════════════════════════════"
  echo "Total: $# files validated"
  echo "Errors: $total_errors"
  echo "Warnings: $total_warnings"
fi

if [ $total_errors -gt 0 ]; then
  exit 1
fi
exit 0
