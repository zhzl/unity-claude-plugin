#!/bin/bash
# Frontmatter Parser Utility
# Extracts YAML frontmatter from .local.md files
#
# Note: This script assumes the settings file is stable (not being written to).
# Settings values are read at hook/command execution time; restart Claude Code only
# after changing hook registration or plugin configuration.

set -euo pipefail

# Usage
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

# Validate file
if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE" >&2
  exit 1
fi

# Extract frontmatter from the first YAML block only
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

# If no field specified, output all frontmatter
if [ -z "$FIELD" ]; then
  echo "$FRONTMATTER"
  exit 0
fi

# Extract specific field
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
