#!/bin/bash
# Example hook that reads plugin settings from .claude/<plugin>.local.md
# Demonstrates the complete pattern for settings-driven hook behavior
# Requires jq for hook input parsing and JSON output generation

set -euo pipefail

# Define settings file path using environment variable with default
# This allows the plugin name to be configured externally if needed
PLUGIN_NAME="${PLUGIN_NAME:-my-plugin}"
SETTINGS_FILE=".claude/${PLUGIN_NAME}.local.md"

# Quick exit if settings file doesn't exist
if [[ ! -f "$SETTINGS_FILE" ]]; then
  # Plugin not configured - use defaults or skip
  exit 0
fi

# Parse YAML frontmatter from the first block only
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

# Extract configuration fields
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' | sed 's/^"\(.*\)"$/\1/' || true)
VALIDATION_MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_mode:' | sed 's/validation_mode: *//' | sed 's/^"\(.*\)"$/\1/' || true)
MAX_SIZE=$(printf '%s\n' "$FRONTMATTER" | grep '^max_file_size:' | sed 's/max_file_size: *//' || true)

# Quick exit if disabled
if [[ "$ENABLED" != "true" ]]; then
  exit 0
fi

# Read hook input
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Apply configured validation
if [[ "$VALIDATION_MODE" == "strict" ]]; then
  # Strict mode: apply all checks
  if [[ "$file_path" == *".."* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Path traversal blocked (strict mode)"}'
    exit 0
  fi

  if [[ "$file_path" == *".env"* ]] || [[ "$file_path" == *"secret"* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Sensitive file blocked (strict mode)"}'
    exit 0
  fi
else
  # Standard mode: basic checks only
  if [[ "$file_path" == "/etc/"* ]] || [[ "$file_path" == "/sys/"* ]]; then
    echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "System path blocked"}'
    exit 0
  fi
fi

# Check file size if configured
if [[ -n "$MAX_SIZE" ]] && [[ "$MAX_SIZE" =~ ^[0-9]+$ ]]; then
  content=$(echo "$input" | jq -r '.tool_input.content // empty')
  content_size=${#content}

  if [[ $content_size -gt $MAX_SIZE ]]; then
    jq -n --arg size "$MAX_SIZE" \
      '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "File exceeds configured max size: \($size) bytes"}'
    exit 0
  fi
fi

# All checks passed
exit 0
