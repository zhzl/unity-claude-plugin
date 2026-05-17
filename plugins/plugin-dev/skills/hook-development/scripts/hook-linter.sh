#!/bin/bash
# Hook 脚本检查器
# 检查 hook 脚本中的常见问题和最佳实践

set -euo pipefail

# 用法
if [ $# -eq 0 ]; then
  echo "Usage: $0 <hook-script.sh> [hook-script2.sh ...]"
  echo ""
  echo "Checks hook scripts for:"
  echo "  - Shebang presence"
  echo "  - set -euo pipefail usage"
  echo "  - Input reading from stdin"
  echo "  - Proper error handling"
  echo "  - Variable quoting"
  echo "  - Exit code usage"
  echo "  - Hardcoded paths"
  echo "  - Timeout considerations"
  exit 1
fi

check_script() {
  local script="$1"
  local warnings=0
  local errors=0

  echo "🔍 Linting: $script"
  echo ""

  if [ ! -f "$script" ]; then
    echo "❌ Error: File not found"
    return 1
  fi

  # 检查 1：可执行权限
  if [ ! -x "$script" ]; then
    echo "⚠️  Not executable (chmod +x $script)"
    warnings=$((warnings + 1))
  fi

  # 检查 2：Shebang
  first_line=$(head -1 "$script")
  if [[ ! "$first_line" =~ ^#!/ ]]; then
    echo "❌ Missing shebang (#!/bin/bash)"
    errors=$((errors + 1))
  fi

  # 检查 3：set -euo pipefail
  if ! grep -q "set -euo pipefail" "$script"; then
    echo "⚠️  Missing 'set -euo pipefail' (recommended for safety)"
    warnings=$((warnings + 1))
  fi

  # 检查 4：从 stdin 读取
  if ! grep -Eq "cat|read" "$script"; then
    echo "⚠️  Doesn't appear to read input from stdin"
    warnings=$((warnings + 1))
  fi

  # 检查 5：使用 jq 解析 JSON
  if grep -Eq "tool_input|tool_name" "$script" && ! grep -q "jq" "$script"; then
    echo "⚠️  Parses hook input but doesn't use jq"
    warnings=$((warnings + 1))
  fi

  # 检查 6：未加引号的变量
  if grep -E '\$[A-Za-z_][A-Za-z0-9_]*[^"]' "$script" | grep -v '#' | grep -q .; then
    echo "⚠️  Potentially unquoted variables detected (heuristic; review manually)"
    echo "   Some shell patterns intentionally leave variables unquoted, but confirm each case is safe"
    echo "   Prefer double quotes when possible: \"\$variable\" instead of \$variable"
    warnings=$((warnings + 1))
  fi

  # 检查 7：硬编码路径
  if grep -E '^[^#]*/home/|^[^#]*/usr/|^[^#]*/opt/' "$script" | grep -q .; then
    echo "⚠️  Hardcoded absolute paths detected"
    echo "   Use \$CLAUDE_PROJECT_DIR or \$CLAUDE_PLUGIN_ROOT"
    warnings=$((warnings + 1))
  fi

  # 检查 8：使用 CLAUDE_PLUGIN_ROOT
  if ! grep -Eq "CLAUDE_PLUGIN_ROOT|CLAUDE_PROJECT_DIR" "$script"; then
    echo "💡 Tip: Use \$CLAUDE_PLUGIN_ROOT for plugin-relative paths"
  fi

  # 检查 9：退出码
  if ! grep -Eq "exit 0|exit 2" "$script"; then
    echo "⚠️  No explicit exit codes (should exit 0 or 2)"
    warnings=$((warnings + 1))
  fi

  # 检查 10：decision hook 的 JSON 输出
  if grep -Eq "PreToolUse|Stop" "$script"; then
    if ! grep -Eq "permissionDecision|decision" "$script"; then
      echo "💡 Tip: PreToolUse/Stop hooks should output decision JSON"
    fi
  fi

  # 检查 11：长时间运行的命令
  if grep -E 'sleep [0-9]{3,}|while true' "$script" | grep -v '#' | grep -q .; then
    echo "⚠️  Potentially long-running code detected"
    echo "   Hooks should complete quickly (< 60s)"
    warnings=$((warnings + 1))
  fi

  # 检查 12：将错误消息写入 stderr
  if grep -Eq 'echo.*".*error|Error|denied|Denied' "$script"; then
    if ! grep -q '>&2' "$script"; then
      echo "⚠️  Error messages should be written to stderr (>&2)"
      warnings=$((warnings + 1))
    fi
  fi

  # 检查 13：输入校验
  if ! grep -Eq "if.*empty|if.*null|if.*-z" "$script"; then
    echo "💡 Tip: Consider validating input fields aren't empty"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo "✅ No issues found"
    return 0
  elif [ $errors -eq 0 ]; then
    echo "⚠️  Found $warnings warning(s)"
    return 0
  else
    echo "❌ Found $errors error(s) and $warnings warning(s)"
    return 1
  fi
}

echo "🔎 Hook Script Linter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

total_errors=0

for script in "$@"; do
  if ! check_script "$script"; then
    total_errors=$((total_errors + 1))
  fi
  echo ""
done

if [ $total_errors -eq 0 ]; then
  echo "✅ All scripts passed linting"
  exit 0
else
  echo "❌ $total_errors script(s) had errors"
  exit 1
fi
