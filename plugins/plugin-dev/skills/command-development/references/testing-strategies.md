# Command 测试策略

在部署和分发前测试 slash commands 的综合策略。

## 概述

测试 command 可确保它们行为正确、能处理边界情况，并提供良好的用户体验。系统化测试方法能尽早发现问题，并增强对 command 可靠性的信心。

## 测试层级

### Level 1：语法与结构 Validation

**测试内容：**

- YAML frontmatter 语法
- Markdown 格式
- 文件位置与命名

**测试方法：**

```bash
# Validate YAML frontmatter
head -n 20 .claude/commands/my-command.md | grep -A 10 "^---"

# Check for closing frontmatter marker
head -n 20 .claude/commands/my-command.md | grep -c "^---" # Should be 2

# Verify file has .md extension
ls .claude/commands/*.md

# Check file is in correct location
test -f .claude/commands/my-command.md && echo "Found" || echo "Missing"
```

**自动 validation 脚本：**

```bash
#!/bin/bash
# validate-command.sh

COMMAND_FILE="$1"

if [ ! -f "$COMMAND_FILE" ]; then
  echo "ERROR: File not found: $COMMAND_FILE"
  exit 1
fi

# Check .md extension
if [[ ! "$COMMAND_FILE" =~ \.md$ ]]; then
  echo "ERROR: File must have .md extension"
  exit 1
fi

# Validate YAML frontmatter if present
if head -n 1 "$COMMAND_FILE" | grep -q "^---$"; then
  CLOSING_LINE=$(awk 'NR > 1 && /^---$/ { print NR; exit }' "$COMMAND_FILE")
  if [ -z "$CLOSING_LINE" ]; then
    echo "ERROR: Invalid YAML frontmatter (missing closing '---' marker)"
    exit 1
  fi
  echo "✓ YAML frontmatter syntax valid"
fi

# Check for empty file
if [ ! -s "$COMMAND_FILE" ]; then
  echo "ERROR: File is empty"
  exit 1
fi

echo "✓ Command file structure valid"
```

### Level 2：Frontmatter 字段 Validation

**测试内容：**

- 字段类型正确
- 值在有效范围内
- 存在必需字段（如适用）

**Validation 脚本：**

```bash
#!/bin/bash
# validate-frontmatter.sh

COMMAND_FILE="$1"

# Extract YAML frontmatter
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$COMMAND_FILE" | sed '1d;$d')

if [ -z "$FRONTMATTER" ]; then
  echo "No frontmatter to validate"
  exit 0
fi

# Check 'model' field if present
if echo "$FRONTMATTER" | grep -q "^model:"; then
  MODEL=$(echo "$FRONTMATTER" | grep "^model:" | cut -d: -f2 | tr -d ' ')
  if ! echo "sonnet opus haiku" | grep -qw "$MODEL"; then
    echo "ERROR: Invalid model '$MODEL' (must be sonnet, opus, or haiku)"
    exit 1
  fi
  echo "✓ Model field valid: $MODEL"
fi

# Check 'allowed-tools' field format
if echo "$FRONTMATTER" | grep -q "^allowed-tools:"; then
  echo "✓ allowed-tools field present"
  # Could add more sophisticated validation here
fi

# Check 'description' length
if echo "$FRONTMATTER" | grep -q "^description:"; then
  DESC=$(echo "$FRONTMATTER" | grep "^description:" | cut -d: -f2-)
  LENGTH=${#DESC}
  if [ "$LENGTH" -gt 80 ]; then
    echo "WARNING: Description length $LENGTH (recommend < 60 chars)"
  else
    echo "✓ Description length acceptable: $LENGTH chars"
  fi
fi

echo "✓ Frontmatter fields valid"
```

### Level 3：手动调用 Command

**测试内容：**

- Command 出现在 `/help` 中
- Command 执行无错误
- 输出符合预期

**测试流程：**

```bash
# 1. Start Claude Code
claude --debug

# 2. Check command appears in help
> /help
# Look for your command in the list

# 3. Invoke command without arguments
> /my-command
# Check for reasonable error or behavior

# 4. Invoke with valid arguments
> /my-command arg1 arg2
# Verify expected behavior

# 5. Check debug logs
tail -f ~/.claude/debug-logs/latest
# Look for errors or warnings
```

### Level 4：参数测试

**测试内容：**

- 位置参数可用（$1、$2 等）
- $ARGUMENTS 捕获所有参数
- 缺失参数能优雅处理
- 无效参数能被检测

**测试矩阵：**

| 测试用例 | Command | 预期结果 |
| ------------- | ------------------------ | -------------------------------------------- |
| 无参数 | `/cmd` | 优雅处理或给出有用消息 |
| 一个参数 | `/cmd arg1` | $1 被正确替换 |
| 两个参数 | `/cmd arg1 arg2` | $1 和 $2 被替换 |
| 额外参数 | `/cmd a b c d` | 全部捕获或适当忽略额外参数 |
| 特殊字符 | `/cmd "arg with spaces"` | 正确处理引号 |
| 空参数 | `/cmd ""` | 处理空字符串 |

**测试脚本：**

```bash
#!/bin/bash
# test-command-arguments.sh

COMMAND="$1"

echo "Testing argument handling for /$COMMAND"
echo

echo "Test 1: No arguments"
echo "  Command: /$COMMAND"
echo "  Expected: [describe expected behavior]"
echo "  Manual test required"
echo

echo "Test 2: Single argument"
echo "  Command: /$COMMAND test-value"
echo "  Expected: 'test-value' appears in output"
echo "  Manual test required"
echo

echo "Test 3: Multiple arguments"
echo "  Command: /$COMMAND arg1 arg2 arg3"
echo "  Expected: All arguments used appropriately"
echo "  Manual test required"
echo

echo "Test 4: Special characters"
echo "  Command: /$COMMAND \"value with spaces\""
echo "  Expected: Entire phrase captured"
echo "  Manual test required"
```

### Level 5：文件引用测试

**测试内容：**

- @ 语法能加载文件内容
- 不存在的文件能被处理
- 大文件能被适当处理
- 多个文件引用可用

**测试流程：**

```bash
# Create isolated test files
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
printf '%s\n' "Test content" > "$tmpdir/test-file.txt"
printf '%s\n' "Second file" > "$tmpdir/test-file-2.txt"

# Test single file reference
> /my-command "$tmpdir/test-file.txt"
# Verify file content is read

# Test non-existent file
> /my-command "$tmpdir/nonexistent.txt"
# Verify graceful error handling

# Test multiple files
> /my-command "$tmpdir/test-file.txt" "$tmpdir/test-file-2.txt"
# Verify both files processed

# Test a larger file inside the isolated directory
python - "$tmpdir/large-file.bin" <<'PY'
from pathlib import Path
import sys
Path(sys.argv[1]).write_bytes(b"0" * 1024 * 1024)
PY
> /my-command "$tmpdir/large-file.bin"
# Verify reasonable behavior (may truncate or warn)
```

### Level 6：Bash 执行测试

**测试内容：**

- command 文件中的字面 `!` command 语法能正确执行
- command 输出被包含进 prompt
- command 失败能被处理
- 安全性：只运行允许的 command

**测试流程：**

```bash
# Create test command with bash execution
cat > .claude/commands/test-bash.md << 'EOF'
---
description: Test bash execution
allowed-tools: Bash(echo *), Bash(date *)
---

Current date: !`date`
Test output: !`echo "Hello from bash"`

Analysis of output above...
EOF

# Test in Claude Code
> /test-bash
# Verify:
# 1. Date appears correctly
# 2. Echo output appears
# 3. No errors in debug logs

# Test with disallowed command (should fail or be blocked)
cat > .claude/commands/test-forbidden.md << 'EOF'
---
description: Test forbidden command
allowed-tools: Bash(echo *)
---

Trying forbidden: !`ls -la /`
EOF

> /test-forbidden
# Verify: Permission denied or appropriate error
```

### Level 7：集成测试

**测试内容：**

- Command 能与其他 plugin 组件协同工作
- Command 之间交互正确
- 多次调用之间的 state management 可用
- Workflow command 按顺序执行

**测试场景：**

#### 场景 1：Command + Hook 集成

```bash
# Setup: Command that triggers a hook
# Test: Invoke command, verify hook executes

# Command: .claude/commands/risky-operation.md
# Hook: PreToolUse that validates the operation

> /risky-operation
# Verify: Hook executes and validates before command completes
```

#### 场景 2：Command 序列

```bash
# Setup: Multi-command workflow
> /workflow-init
# Verify: State file created

> /workflow-step2
# Verify: State file read, step 2 executes

> /workflow-complete
# Verify: State file cleaned up
```

#### 场景 3：Command + MCP 集成

```bash
# Setup: Command uses MCP tools
# Test: Verify MCP server accessible

> /mcp-command
# Verify:
# 1. MCP server starts (if stdio)
# 2. Tool calls succeed
# 3. Results included in output
```

## 自动化测试方法

### Command 测试套件

创建测试套件脚本：

```bash
#!/bin/bash
# test-commands.sh - Command test suite

TEST_DIR=".claude/commands"
FAILED_TESTS=0

echo "Command Test Suite"
echo "=================="
echo

for cmd_file in "$TEST_DIR"/*.md; do
  cmd_name=$(basename "$cmd_file" .md)
  echo "Testing: $cmd_name"

  # Validate structure
  if ./validate-command.sh "$cmd_file"; then
    echo "  ✓ Structure valid"
  else
    echo "  ✗ Structure invalid"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  # Validate frontmatter
  if ./validate-frontmatter.sh "$cmd_file"; then
    echo "  ✓ Frontmatter valid"
  else
    echo "  ✗ Frontmatter invalid"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi

  echo
done

echo "=================="
echo "Tests complete"
echo "Failed: $FAILED_TESTS"

exit $FAILED_TESTS
```

### Pre-Commit Hook（提交前检查）

提交前 validation command：

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Validating commands..."

COMMANDS_CHANGED=$(git diff --cached --name-only | grep "\.claude/commands/.*\.md")

if [ -z "$COMMANDS_CHANGED" ]; then
  echo "No commands changed"
  exit 0
fi

for cmd in $COMMANDS_CHANGED; do
  echo "Checking: $cmd"

  if ! ./scripts/validate-command.sh "$cmd"; then
    echo "ERROR: Command validation failed: $cmd"
    exit 1
  fi
done

echo "✓ All commands valid"
```

### 持续测试

在 CI/CD 中测试 command：

```yaml
# .github/workflows/test-commands.yml
name: Test Commands

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Validate command structure
        run: |
          for cmd in .claude/commands/*.md; do
            echo "Testing: $cmd"
            ./scripts/validate-command.sh "$cmd"
          done

      - name: Validate frontmatter
        run: |
          for cmd in .claude/commands/*.md; do
            ./scripts/validate-frontmatter.sh "$cmd"
          done

      - name: Check for TODOs
        run: |
          if grep -r "TODO" .claude/commands/; then
            echo "ERROR: TODOs found in commands"
            exit 1
          fi
```

## 边界情况测试

### 测试边界情况

**空参数：**

```bash
> /cmd ""
> /cmd '' ''
```

**特殊字符：**

```bash
> /cmd "arg with spaces"
> /cmd arg-with-dashes
> /cmd arg_with_underscores
> /cmd arg/with/slashes
> /cmd 'arg with "quotes"'
```

**长参数：**

```bash
> /cmd $(python -c "print('a' * 10000)")
```

**不常见文件路径：**

```bash
> /cmd ./file
> /cmd ../file
> /cmd ~/file
> /cmd "/path with spaces/file"
```

**Bash command 边界情况：**

```markdown
# Commands that might fail

`exit 1`
`false`
`command-that-does-not-exist`

# Commands with special output

`echo ""`
`cat /dev/null`
`yes | head -n 1000000`
```

## 性能测试

### 响应时间测试

```bash
#!/bin/bash
# test-command-performance.sh

COMMAND="$1"

echo "Testing performance of /$COMMAND"
echo

for i in {1..5}; do
  echo "Run $i:"
  START=$(date +%s%N)

  # Invoke command (manual step - record time)
  echo "  Invoke: /$COMMAND"
  echo "  Start time: $START"
  echo "  (Record end time manually)"
  echo
done

echo "Analyze results:"
echo "  - Average response time"
echo "  - Variance"
echo "  - Acceptable threshold: < 3 seconds for fast commands"
```

### 资源使用测试

```bash
# Monitor Claude Code during command execution
# In terminal 1:
claude --debug

# In terminal 2:
watch -n 1 'ps aux | grep claude'

# Execute command and observe:
# - Memory usage
# - CPU usage
# - Process count
```

## 用户体验测试

### 可用性 Checklist

- [ ] Command 名称直观
- [ ] `/help` 中的 description 清晰
- [ ] 参数文档完善
- [ ] 错误消息有帮助
- [ ] 输出格式易读
- [ ] 长时间运行的 command 显示进度
- [ ] 结果可执行
- [ ] 边界情况有良好 UX

### 用户验收测试

招募测试者：

```markdown
# Testing Guide for Beta Testers

## Command: /my-new-command

### Test Scenarios

1. **Basic usage:**
   - Run: `/my-new-command`
   - Expected: [describe]
   - Rate clarity: 1-5

2. **With arguments:**
   - Run: `/my-new-command arg1 arg2`
   - Expected: [describe]
   - Rate usefulness: 1-5

3. **Error case:**
   - Run: `/my-new-command invalid-input`
   - Expected: Helpful error message
   - Rate error message: 1-5

### Feedback Questions

1. Was the command easy to understand?
2. Did the output meet your expectations?
3. What would you change?
4. Would you use this command regularly?
```

## 测试 Checklist

发布 command 前：

### 结构

- [ ] 文件位于正确位置
- [ ] .md 扩展名正确
- [ ] YAML frontmatter 有效（如存在）
- [ ] Markdown 语法正确

### 功能

- [ ] Command 出现在 `/help` 中
- [ ] Description 清晰
- [ ] Command 执行无错误
- [ ] 参数按预期工作
- [ ] 文件引用可用
- [ ] Bash 执行可用（如使用）

### 边界情况

- [ ] 缺失参数得到处理
- [ ] 无效参数被检测
- [ ] 不存在的文件得到处理
- [ ] 特殊字符可用
- [ ] 长输入得到处理

### 集成

- [ ] 可与其他 command 协同工作
- [ ] 可与 hooks 协同工作（如适用）
- [ ] 可与 MCP 协同工作（如适用）
- [ ] State management 可用

### 质量

- [ ] 性能可接受
- [ ] 无安全问题
- [ ] 错误消息有帮助
- [ ] 输出格式良好
- [ ] 文档完整

### 分发

- [ ] 已由他人测试
- [ ] 已纳入反馈
- [ ] README 已更新
- [ ] 已提供示例

## 调试失败测试

### 常见问题与解决方案

#### 问题：Command 未出现在 /help 中

```bash
# Check file location
ls -la .claude/commands/my-command.md

# Check permissions
chmod 644 .claude/commands/my-command.md

# Check syntax
head -n 20 .claude/commands/my-command.md

# Restart Claude Code
claude --debug
```

#### 问题：参数未替换

```bash
# Verify syntax
grep '\$1' .claude/commands/my-command.md
grep '\$ARGUMENTS' .claude/commands/my-command.md

# Test with simple command first
echo "Test: \$1 and \$2" > .claude/commands/test-args.md
```

#### 问题：Bash command 未执行

```bash
# Check allowed-tools
grep "allowed-tools" .claude/commands/my-command.md

# Verify command has bash execution syntax (! followed by backtick)
# Note: Command files use actual ! syntax, not [BANG] placeholder
grep -E '!\x60' .claude/commands/my-command.md

# Test command manually
date
echo "test"
```

#### 问题：文件引用不可用

```bash
# Check @ syntax
grep '@' .claude/commands/my-command.md

# Verify file exists
ls -la /path/to/referenced/file

# Check permissions
chmod 644 /path/to/referenced/file
```

## 最佳实践

1. **尽早测试，经常测试**：开发过程中持续 validation
2. **自动化 validation**：使用脚本进行可重复检查
3. **测试边界情况**：不要只测试成功路径（happy path）
4. **获取反馈**：广泛发布前让他人测试
5. **记录测试**：保留测试场景用于回归测试
6. **生产中监控**：发布后关注问题
7. **迭代**：根据真实使用数据改进
