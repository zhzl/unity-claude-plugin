#!/bin/bash
# Frontmatter 解析工具
# 从 .local.md 文件中提取 YAML frontmatter
#
# 注意：此脚本假设 settings 文件处于稳定状态（未被写入中）。
# settings 值会在 hook/command 执行时读取；仅在修改 hook 注册或 plugin 配置后
# 才需要重启 Claude Code。

set -euo pipefail

# 用法
show_usage() {
  echo "Usage: $0 <settings-file.md> [field-name]"
  echo ""
  echo "Examples:"
  echo "  # Show all frontmatter"
  echo "  $0 .claude/my-plugin.local.md"
  echo ""
  echo "  # Extract specific field"
  echo "  $0 .claude/my-plugin.local.md enabled"
  echo ""
  echo "  # Extract and use in script"
  echo "  ENABLED=\$($0 .claude/my-plugin.local.md enabled)"
  exit 0
}

if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  show_usage
fi

FILE="$1"
FIELD="${2:-}"

# 校验文件
if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE" >&2
  exit 1
fi

# 仅从首个 YAML 块中提取 frontmatter
if [ "$(head -n 1 "$FILE")" != "---" ]; then
  echo "Error: File must start with frontmatter marker ---" >&2
  exit 1
fi

if ! tail -n +2 "$FILE" | grep -q '^---$'; then
  echo "Error: Frontmatter not closed in $FILE" >&2
  exit 1
fi

FRONTMATTER=$(awk '
  NR == 1 { next }
  /^---$/ { exit }
  { print }
' "$FILE")

if [ -z "$FRONTMATTER" ]; then
  echo "Error: No frontmatter found in $FILE" >&2
  exit 1
fi

# 如果未指定字段，则输出全部 frontmatter
if [ -z "$FIELD" ]; then
  echo "$FRONTMATTER"
  exit 0
fi

# 提取指定字段
if [[ ! "$FIELD" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Error: Invalid field name '$FIELD'" >&2
  exit 1
fi

FIELD_LINE=$(printf '%s\n' "$FRONTMATTER" | grep -m 1 "^${FIELD}:" || true)

if [ -z "$FIELD_LINE" ]; then
  echo "Error: Field '$FIELD' not found in frontmatter" >&2
  exit 1
fi

VALUE=$(printf '%s\n' "$FIELD_LINE" | sed "s/${FIELD}: *//" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\\(.*\\)'$/\\1/")

echo "$VALUE"
exit 0
