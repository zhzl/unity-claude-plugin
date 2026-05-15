# Settings File Parsing Techniques

Complete guide to parsing `.claude/plugin-name.local.md` files in bash scripts.

## File Structure

Settings files use markdown with YAML frontmatter:

```markdown
---
field1: value1
field2: "value with spaces"
numeric_field: 42
boolean_field: true
list_field: ["item1", "item2", "item3"]
---

# Markdown Content

This body content can be extracted separately.
It's useful for prompts, documentation, or additional context.
```

## Parsing Frontmatter

### Extract Frontmatter Block

```bash
#!/bin/bash
FILE=".claude/my-plugin.local.md"

# Extract everything between --- markers (excluding the markers themselves)
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")
```

**How it works:**

- `NR == 1` - Require the opening `---` to be on line 1
- `next` - Skip the opening marker
- `/^---$/ { exit }` - Stop at the closing marker
- `{ print }` - Print only the frontmatter lines between the first two markers

### Extract Individual Fields

**String fields:**

```bash
# Simple value
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' || true)

# Quoted value (removes surrounding quotes)
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

**Boolean fields:**

```bash
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

# Use in condition
if [[ "$ENABLED" == "true" ]]; then
  # Enabled
fi
```

**Numeric fields:**

```bash
MAX=$(printf '%s\n' "$FRONTMATTER" | grep '^max_value:' | sed 's/max_value: *//' || true)

# Validate it's a number
if [[ "$MAX" =~ ^[0-9]+$ ]]; then
  # Use in numeric comparison
  if [[ $MAX -gt 100 ]]; then
    # Too large
  fi
fi
```

**List fields (simple):**

```bash
# YAML: list: ["item1", "item2", "item3"]
LIST=$(printf '%s\n' "$FRONTMATTER" | grep '^list:' | sed 's/list: *//' || true)
# Result: ["item1", "item2", "item3"]

# For simple checks:
if [[ "$LIST" == *"item1"* ]]; then
  # List contains item1
fi
```

**List fields (proper parsing with jq):**

```bash
# For proper list handling, use yq or convert to JSON
# This requires yq to be installed (brew install yq)

# Extract list as JSON array
LIST=$(echo "$FRONTMATTER" | yq -o json '.list' 2>/dev/null)

# Iterate over items
echo "$LIST" | jq -r '.[]' | while read -r item; do
  echo "Processing: $item"
done
```

## Parsing Markdown Body

### Extract Body Content

```bash
#!/bin/bash
FILE=".claude/my-plugin.local.md"

# Extract everything after the closing --- from the first frontmatter block
# Later body --- lines are preserved as body content
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
' "$FILE")
```

**How it works:**

- `NR == 1` - Require the file to start with `---`
- First `in_body == 0 && /^---$/` - Treat only the second marker as the body delimiter
- `in_body == 1 { print }` - Print everything after that, including later body `---` lines

**Handles edge case:** Later markdown separators are preserved because only the first two `---` markers are treated as delimiters.

### Use Body as Prompt

```bash
# Extract body
PROMPT=$(awk '
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
' "$RALPH_STATE_FILE")

# Feed back to Claude
echo '{"decision": "block", "reason": "'"$PROMPT"'"}' | jq .
```

**Important:** Use `jq -n --arg` for safer JSON construction with user content:

```bash
PROMPT=$(awk '
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
' "$FILE")

# Safe JSON construction
jq -n --arg prompt "$PROMPT" '{
  "decision": "block",
  "reason": $prompt
}'
```

## Common Parsing Patterns

### Pattern: Field with Default

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Use default if empty
if [[ -z "$VALUE" ]]; then
  VALUE="default_value"
fi
```

### Pattern: Optional Field

```bash
OPTIONAL=$(printf '%s\n' "$FRONTMATTER" | grep '^optional_field:' | sed 's/optional_field: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Only use if present
if [[ -n "$OPTIONAL" ]] && [[ "$OPTIONAL" != "null" ]]; then
  # Field is set, use it
  echo "Optional field: $OPTIONAL"
fi
```

### Pattern: Multiple Fields at Once

```bash
# Parse all fields in one pass
while IFS=': ' read -r key value; do
  # Remove quotes if present
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/')

  case "$key" in
    enabled)
      ENABLED="$value"
      ;;
    mode)
      MODE="$value"
      ;;
    max_size)
      MAX_SIZE="$value"
      ;;
  esac
done <<< "$FRONTMATTER"
```

## Updating Settings Files

### Atomic Updates

Always use temp file + atomic move to prevent corruption:

```bash
#!/bin/bash
FILE=".claude/my-plugin.local.md"
NEW_VALUE="updated_value"

# Create secure temp file (unpredictable name)
TEMP_FILE=$(mktemp) || { echo "Failed to create temp file" >&2; exit 1; }
trap 'rm -f "$TEMP_FILE"' EXIT

# Update field using sed
sed "s/^field_name: .*/field_name: $NEW_VALUE/" "$FILE" > "$TEMP_FILE"

# Atomic replace
mv "$TEMP_FILE" "$FILE"
```

### Update Single Field

```bash
# Increment iteration counter
CURRENT=$(printf '%s\n' "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//' || true)
NEXT=$((CURRENT + 1))

# Update file (secure temp file)
TEMP_FILE=$(mktemp) || exit 1
sed "s/^iteration: .*/iteration: $NEXT/" "$FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE"
```

### Update Multiple Fields

```bash
# Update several fields at once (secure temp file)
TEMP_FILE=$(mktemp) || exit 1

sed -e "s/^iteration: .*/iteration: $NEXT_ITERATION/" \
    -e "s/^pr_number: .*/pr_number: $PR_NUMBER/" \
    -e "s/^status: .*/status: $NEW_STATUS/" \
    "$FILE" > "$TEMP_FILE"

mv "$TEMP_FILE" "$FILE"
```

## Validation Techniques

### Validate File Exists and Is Readable

```bash
FILE=".claude/my-plugin.local.md"

if [[ ! -f "$FILE" ]]; then
  echo "Settings file not found" >&2
  exit 1
fi

if [[ ! -r "$FILE" ]]; then
  echo "Settings file not readable" >&2
  exit 1
fi
```

### Validate Frontmatter Structure

```bash
# Count --- markers (should be exactly 2 at start)
MARKER_COUNT=$(grep -c '^---$' "$FILE" 2>/dev/null || true)
MARKER_COUNT=${MARKER_COUNT:-0}

if [[ $MARKER_COUNT -lt 2 ]]; then
  echo "Invalid settings file: missing frontmatter markers" >&2
  exit 1
fi
```

### Validate Field Values

```bash
MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^mode:' | sed 's/mode: *//' || true)

case "$MODE" in
  strict|standard|lenient)
    # Valid mode
    ;;
  *)
    echo "Invalid mode: $MODE (must be strict, standard, or lenient)" >&2
    exit 1
    ;;
esac
```

### Validate Numeric Ranges

```bash
MAX_SIZE=$(printf '%s\n' "$FRONTMATTER" | grep '^max_size:' | sed 's/max_size: *//' || true)

if ! [[ "$MAX_SIZE" =~ ^[0-9]+$ ]]; then
  echo "max_size must be a number" >&2
  exit 1
fi

if [[ $MAX_SIZE -lt 1 ]] || [[ $MAX_SIZE -gt 10000000 ]]; then
  echo "max_size out of range (1-10000000)" >&2
  exit 1
fi
```

## Edge Cases and Gotchas

### Quotes in Values

YAML allows both quoted and unquoted strings:

```yaml
# These are equivalent:
field1: value
field2: "value"
field3: "value"
```

**Handle both:**

```bash
# Remove surrounding quotes if present
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\\(.*\\)'$/\\1/" || true)
```

### --- in Markdown Body

If the markdown body contains `---`, the parsing still works because we only match the first two:

```markdown
---
field: value
---

# Body

## Here's a separator:

More content after the separator.
```

The `awk '/^---$/{i++; next} i>=2'` pattern handles this correctly.

### Empty Values

Handle missing or empty fields:

```yaml
field1:
field2: ""
field3: null
```

**Parsing:**

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field1:' | sed 's/field1: *//' || true)
# VALUE will be empty string

# Check for empty/null
if [[ -z "$VALUE" ]] || [[ "$VALUE" == "null" ]]; then
  VALUE="default"
fi
```

### Special Characters

Values with special characters need careful handling:

```yaml
message: "Error: Something went wrong!"
path: "/path/with spaces/file.txt"
regex: "^[a-zA-Z0-9_]+$"
```

**Safe parsing:**

```bash
# Always quote variables when using
MESSAGE=$(printf '%s\n' "$FRONTMATTER" | grep '^message:' | sed 's/message: *//' | sed 's/^"\(.*\)"$/\1/' || true)

echo "Message: $MESSAGE"  # Quoted!
```

## Performance Optimization

### Cache Parsed Values

If reading settings multiple times:

```bash
# Parse once
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")

# Extract multiple fields from cached frontmatter
FIELD1=$(printf '%s\n' "$FRONTMATTER" | grep '^field1:' | sed 's/field1: *//' || true)
FIELD2=$(printf '%s\n' "$FRONTMATTER" | grep '^field2:' | sed 's/field2: *//' || true)
FIELD3=$(printf '%s\n' "$FRONTMATTER" | grep '^field3:' | sed 's/field3: *//' || true)
```

**Don't:** Re-parse file for each field.

### Lazy Loading

Only parse settings when needed:

```bash
#!/bin/bash
input=$(cat)

# Quick checks first (no file I/O)
tool_name=$(echo "$input" | jq -r '.tool_name')
if [[ "$tool_name" != "Write" ]]; then
  exit 0  # Not a write operation, skip
fi

# Only now check settings file
if [[ -f ".claude/my-plugin.local.md" ]]; then
  # Parse settings
  # ...
fi
```

## Debugging

### Print Parsed Values

```bash
#!/bin/bash
set -x  # Enable debug tracing

FILE=".claude/my-plugin.local.md"

if [[ -f "$FILE" ]]; then
  echo "Settings file found" >&2

  FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")
  echo "Frontmatter:" >&2
  echo "$FRONTMATTER" >&2

  ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)
  echo "Enabled: $ENABLED" >&2
fi
```

### Validate Parsing

```bash
# Show what was parsed
echo "Parsed values:" >&2
echo "  enabled: $ENABLED" >&2
echo "  mode: $MODE" >&2
echo "  max_size: $MAX_SIZE" >&2

# Verify expected values
if [[ "$ENABLED" != "true" ]] && [[ "$ENABLED" != "false" ]]; then
  echo "⚠️  Unexpected enabled value: $ENABLED" >&2
fi
```

## Alternative: Using yq

For complex YAML, consider using `yq`:

```bash
# Install: brew install yq

# Parse YAML properly
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")

# Extract fields with yq
ENABLED=$(echo "$FRONTMATTER" | yq '.enabled')
MODE=$(echo "$FRONTMATTER" | yq '.mode')
LIST=$(echo "$FRONTMATTER" | yq -o json '.list_field')

# Iterate list properly
echo "$LIST" | jq -r '.[]' | while read -r item; do
  echo "Item: $item"
done
```

**Pros:**

- Proper YAML parsing
- Handles complex structures
- Better list/object support

**Cons:**

- Requires yq installation
- Additional dependency
- May not be available on all systems

**Recommendation:** Use sed/grep for simple fields, yq for complex structures.

## Complete Example

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SETTINGS_FILE=".claude/my-plugin.local.md"

# Quick exit if not configured
if [[ ! -f "$SETTINGS_FILE" ]]; then
  # Use defaults
  ENABLED=true
  MODE=standard
  MAX_SIZE=1000000
else
  # Parse frontmatter
  FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$SETTINGS_FILE")

  # Extract fields with defaults
  ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)
  ENABLED=${ENABLED:-true}

  MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^mode:' | sed 's/mode: *//' | sed 's/^"\(.*\)"$/\1/' || true)
  MODE=${MODE:-standard}

  MAX_SIZE=$(printf '%s\n' "$FRONTMATTER" | grep '^max_size:' | sed 's/max_size: *//' || true)
  MAX_SIZE=${MAX_SIZE:-1000000}

  # Validate values
  if [[ "$ENABLED" != "true" ]] && [[ "$ENABLED" != "false" ]]; then
    echo "⚠️  Invalid enabled value, using default" >&2
    ENABLED=true
  fi

  if ! [[ "$MAX_SIZE" =~ ^[0-9]+$ ]]; then
    echo "⚠️  Invalid max_size, using default" >&2
    MAX_SIZE=1000000
  fi
fi

# Quick exit if disabled
if [[ "$ENABLED" != "true" ]]; then
  exit 0
fi

# Use configuration
echo "Configuration loaded: mode=$MODE, max_size=$MAX_SIZE" >&2

# Apply logic based on settings
case "$MODE" in
  strict)
    # Strict validation
    ;;
  standard)
    # Standard validation
    ;;
  lenient)
    # Lenient validation
    ;;
esac
```

This provides robust settings handling with defaults, validation, and error recovery.
