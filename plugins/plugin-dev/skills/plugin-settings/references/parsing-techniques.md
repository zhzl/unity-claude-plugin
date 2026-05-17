# Settings 文件解析技术

这是在 bash 脚本中解析 `.claude/plugin-name.local.md` 文件的完整指南。

## 文件结构

Settings 文件使用带 YAML frontmatter 的 markdown：

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

## 解析 Frontmatter

### 提取 Frontmatter 区块

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

**工作原理：**

- `NR == 1` - 要求开头的 `---` 必须在第 1 行
- `next` - 跳过开头标记
- `/^---$/ { exit }` - 在结束标记处停止
- `{ print }` - 只输出前两个标记之间的 frontmatter 行

### 提取单个字段

**字符串字段：**

```bash
# Simple value
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' || true)

# Quoted value (removes surrounding quotes)
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

**布尔字段：**

```bash
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

# Use in condition
if [[ "$ENABLED" == "true" ]]; then
  # Enabled
fi
```

**数值字段：**

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

**列表字段（简单方式）：**

```bash
# YAML: list: ["item1", "item2", "item3"]
LIST=$(printf '%s\n' "$FRONTMATTER" | grep '^list:' | sed 's/list: *//' || true)
# Result: ["item1", "item2", "item3"]

# For simple checks:
if [[ "$LIST" == *"item1"* ]]; then
  # List contains item1
fi
```

**列表字段（使用 jq 正确解析）：**

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

## 解析 Markdown Body

### 提取 Body 内容

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

**工作原理：**

- `NR == 1` - 要求文件以 `---` 开头
- 第一个 `in_body == 0 && /^---$/` - 只把第二个标记视为 body 分隔符
- `in_body == 1 { print }` - 输出之后的所有内容，包括后续 body 中的 `---` 行

**处理的边界情况：** 后续 markdown 分隔线会被保留，因为只有前两个 `---` 标记被视为分隔符。

### 将 Body 作为 Prompt 使用

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

**重要：** 对含用户内容的 JSON，使用 `jq -n --arg` 更安全：

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

## 常见解析模式

### 模式：带默认值的字段

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Use default if empty
if [[ -z "$VALUE" ]]; then
  VALUE="default_value"
fi
```

### 模式：可选字段

```bash
OPTIONAL=$(printf '%s\n' "$FRONTMATTER" | grep '^optional_field:' | sed 's/optional_field: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Only use if present
if [[ -n "$OPTIONAL" ]] && [[ "$OPTIONAL" != "null" ]]; then
  # Field is set, use it
  echo "Optional field: $OPTIONAL"
fi
```

### 模式：一次解析多个字段

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

## 更新 Settings 文件

### 原子更新

始终使用临时文件 + 原子移动来避免损坏：

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

### 更新单个字段

```bash
# Increment iteration counter
CURRENT=$(printf '%s\n' "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//' || true)
NEXT=$((CURRENT + 1))

# Update file (secure temp file)
TEMP_FILE=$(mktemp) || exit 1
sed "s/^iteration: .*/iteration: $NEXT/" "$FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE"
```

### 更新多个字段

```bash
# Update several fields at once (secure temp file)
TEMP_FILE=$(mktemp) || exit 1

sed -e "s/^iteration: .*/iteration: $NEXT_ITERATION/" \
    -e "s/^pr_number: .*/pr_number: $PR_NUMBER/" \
    -e "s/^status: .*/status: $NEW_STATUS/" \
    "$FILE" > "$TEMP_FILE"

mv "$TEMP_FILE" "$FILE"
```

## 验证技术

### 验证文件存在且可读

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

### 验证 Frontmatter 结构

```bash
# Count --- markers (should be exactly 2 at start)
MARKER_COUNT=$(grep -c '^---$' "$FILE" 2>/dev/null || true)
MARKER_COUNT=${MARKER_COUNT:-0}

if [[ $MARKER_COUNT -lt 2 ]]; then
  echo "Invalid settings file: missing frontmatter markers" >&2
  exit 1
fi
```

### 验证字段值

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

### 验证数值范围

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

## 边界情况与注意点

### 值中的引号

YAML 允许带引号和不带引号的字符串：

```yaml
# These are equivalent:
field1: value
field2: "value"
field3: "value"
```

**同时兼容两种写法：**

```bash
# Remove surrounding quotes if present
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\\(.*\\)'$/\\1/" || true)
```

### Markdown Body 中的 ---

如果 markdown body 包含 `---`，解析仍然成立，因为我们只匹配前两个：

```markdown
---
field: value
---

# Body

## Here's a separator:

More content after the separator.
```

`awk '/^---$/{i++; next} i>=2'` 这个模式可以正确处理该情况。

### 空值

处理缺失或空字段：

```yaml
field1:
field2: ""
field3: null
```

**解析：**

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field1:' | sed 's/field1: *//' || true)
# VALUE will be empty string

# Check for empty/null
if [[ -z "$VALUE" ]] || [[ "$VALUE" == "null" ]]; then
  VALUE="default"
fi
```

### 特殊字符

包含特殊字符的值需要更谨慎地处理：

```yaml
message: "Error: Something went wrong!"
path: "/path/with spaces/file.txt"
regex: "^[a-zA-Z0-9_]+$"
```

**安全解析：**

```bash
# Always quote variables when using
MESSAGE=$(printf '%s\n' "$FRONTMATTER" | grep '^message:' | sed 's/message: *//' | sed 's/^"\(.*\)"$/\1/' || true)

echo "Message: $MESSAGE"  # Quoted!
```

## 性能优化

### 缓存已解析的值

如果需要多次读取 settings：

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

**不要：** 为每个字段都重新解析文件。

### 延迟加载（lazy loading）

只在需要时解析 settings：

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

## 调试

### 打印解析结果

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

### 验证解析结果

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

## 备选方案：使用 yq

对于复杂 YAML，可以考虑使用 `yq`：

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

**优点：**

- 真正的 YAML 解析
- 能处理复杂结构
- 对列表/对象支持更好

**缺点：**

- 需要安装 yq
- 额外依赖
- 不一定在所有系统上都可用

**建议：** 简单字段用 sed/grep，复杂结构用 yq。

## 完整示例

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

这个示例提供了较为稳健的 settings 处理方式，包含默认值、验证和错误恢复。
