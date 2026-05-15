#!/bin/bash
# Agent File Validator
# Validates agent markdown files for correct structure and content

set -euo pipefail

# Usage
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

# Check 1: File exists
if [ ! -f "$AGENT_FILE" ]; then
  echo "❌ File not found: $AGENT_FILE"
  exit 1
fi
echo "✅ File exists"

# Check 2: Starts with ---
FIRST_LINE=$(head -1 "$AGENT_FILE")
if [ "$FIRST_LINE" != "---" ]; then
  echo "❌ File must start with YAML frontmatter (---)"
  exit 1
fi
echo "✅ Starts with frontmatter"

# Check 3: Has closing ---
if ! tail -n +2 "$AGENT_FILE" | grep -q '^---$'; then
  echo "❌ Frontmatter not closed (missing second ---)"
  exit 1
fi
echo "✅ Frontmatter properly closed"

# Extract frontmatter and system prompt from the first YAML block only
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

# Check 4: Required fields
echo ""
echo "Checking required fields..."

error_count=0
warning_count=0

# Check name field
NAME=$(echo "$FRONTMATTER" | grep '^name:' | sed 's/name: *//' | sed 's/^"\(.*\)"$/\1/' || true)

if [ -z "$NAME" ]; then
  echo "❌ Missing required field: name"
  error_count=$((error_count + 1))
else
  echo "✅ name: $NAME"

  # Validate name format
  if ! [[ "$NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
    echo "❌ name must start/end with lowercase alphanumeric and contain only lowercase letters, numbers, hyphens"
    error_count=$((error_count + 1))
  fi

  # Validate name length
  name_length=${#NAME}
  if [ "$name_length" -lt 3 ]; then
    echo "❌ name too short (minimum 3 characters)"
    error_count=$((error_count + 1))
  elif [ "$name_length" -gt 50 ]; then
    echo "❌ name too long (maximum 50 characters)"
    error_count=$((error_count + 1))
  fi

  # Check for generic names
  if [[ "$NAME" =~ ^(helper|assistant|agent|tool)$ ]]; then
    echo "⚠️  name is too generic: $NAME"
    warning_count=$((warning_count + 1))
  fi
fi

# Check description field - handles multi-line YAML
# Description ends when we hit another top-level YAML field
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

  # Check for example blocks
  if ! echo "$DESCRIPTION" | grep -q '<example>'; then
    echo "⚠️  description should include <example> blocks for triggering"
    warning_count=$((warning_count + 1))
  fi

  # Check for "Use this agent when" pattern
  if ! echo "$DESCRIPTION" | grep -qi 'use this agent when'; then
    echo "⚠️  description should start with 'Use this agent when...'"
    warning_count=$((warning_count + 1))
  fi
fi

# Check model field (optional)
MODEL=$(echo "$FRONTMATTER" | grep '^model:' | sed 's/model: *//' || true)

if [ -n "$MODEL" ]; then
  echo "✅ model: $MODEL"

  case "$MODEL" in
    inherit|sonnet|opus|haiku)
      # Valid model
      ;;
    *)
      echo "⚠️  Unknown model: $MODEL (valid: inherit, sonnet, opus, haiku)"
      warning_count=$((warning_count + 1))
      ;;
  esac
else
  echo "💡 model: not specified (defaults to inherited model)"
fi

# Check color field (optional)
COLOR=$(echo "$FRONTMATTER" | grep '^color:' | sed 's/color: *//' || true)

if [ -n "$COLOR" ]; then
  echo "✅ color: $COLOR"

  case "$COLOR" in
    blue|cyan|green|yellow|magenta|red)
      # Valid color
      ;;
    *)
      echo "⚠️  Unknown color: $COLOR (valid: blue, cyan, green, yellow, magenta, red)"
      warning_count=$((warning_count + 1))
      ;;
  esac
else
  echo "💡 color: not specified"
fi

# Check tools field (optional)
TOOLS=$(echo "$FRONTMATTER" | grep '^tools:' | sed 's/tools: *//' || true)

if [ -n "$TOOLS" ]; then
  echo "✅ tools: $TOOLS"
else
  echo "💡 tools: not specified (no agent-specific allowlist)"
fi

# Check plugin-shipped unsupported fields
for unsupported_field in permissionMode mcpServers hooks; do
  if echo "$FRONTMATTER" | grep -q "^${unsupported_field}:"; then
    echo "❌ Unsupported plugin-shipped agent field: ${unsupported_field}"
    error_count=$((error_count + 1))
  fi
done

# Check skills field shape (optional)
SKILLS_LINE=$(echo "$FRONTMATTER" | grep '^skills:' || true)
if [ -n "$SKILLS_LINE" ]; then
  if ! echo "$SKILLS_LINE" | grep -Eq '^skills:[[:space:]]*$'; then
    echo "❌ skills must use a YAML list, not a single-line scalar"
    error_count=$((error_count + 1))
  else
    echo "✅ skills: YAML list"
  fi
fi

# Check 5: System prompt
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

  # Check for second person
  if ! echo "$SYSTEM_PROMPT" | grep -Eq "You are|You will|Your"; then
    echo "⚠️  System prompt should use second person (You are..., You will...)"
    warning_count=$((warning_count + 1))
  fi

  # Check for structure
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
