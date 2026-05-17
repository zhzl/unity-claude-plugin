#!/bin/bash
# Hook 测试辅助脚本
# 使用示例输入测试 hook 并展示输出

set -euo pipefail

# 用法
show_usage() {
  echo "Usage: $0 [options] <hook-script> <test-input.json>"
  echo ""
  echo "Options:"
  echo "  -h, --help      Show this help message"
  echo "  -v, --verbose   Show detailed execution information"
  echo "  -t, --timeout N Set timeout in seconds (default: 60)"
  echo ""
  echo "Examples:"
  echo "  $0 validate-bash.sh test-input.json"
  echo "  $0 -v -t 30 validate-write.sh write-input.json"
  echo ""
  echo "Creates sample test input with:"
  echo "  $0 --create-sample <event-type>"
}

# 创建示例输入
create_sample() {
  event_type="$1"

  case "$event_type" in
    PreToolUse)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/tmp/test.txt",
    "content": "Test content"
  }
}
EOF
      ;;
    PostToolUse)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "echo test" },
  "tool_result": "Command executed successfully"
}
EOF
      ;;
    PermissionRequest)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": { "command": "echo test" },
  "permission_suggestions": []
}
EOF
      ;;
    PostToolUseFailure)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "PostToolUseFailure",
  "tool_name": "Bash",
  "tool_input": { "command": "false" },
  "error": "Command failed",
  "is_interrupt": false
}
EOF
      ;;
    Stop|SubagentStop)
      cat <<EOF
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "$event_type",
  "stop_hook_active": false
}
EOF
      ;;
    UserPromptSubmit)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Test user prompt"
}
EOF
      ;;
    SessionStart)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
      ;;
    SessionEnd)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "SessionEnd",
  "source": "clear"
}
EOF
      ;;
    SubagentStart)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-123",
  "agent_type": "general-purpose"
}
EOF
      ;;
    PreCompact)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "PreCompact",
  "trigger": "manual",
  "custom_instructions": "Preserve key decisions"
}
EOF
      ;;
    Notification)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "Notification",
  "message": "Permission required",
  "notification_type": "permission_prompt"
}
EOF
      ;;
    TeammateIdle)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "TeammateIdle",
  "teammate_name": "researcher",
  "team_name": "test-team"
}
EOF
      ;;
    TaskCompleted)
      cat <<'EOF'
{
  "session_id": "test-session",
  "transcript_path": "/tmp/transcript.txt",
  "cwd": "/tmp/test-project",
  "permission_mode": "default",
  "hook_event_name": "TaskCompleted",
  "task_id": "123",
  "task_subject": "Implement feature",
  "task_description": "Test task",
  "teammate_name": "implementer",
  "team_name": "test-team"
}
EOF
      ;;
    *)
      echo "Unknown event type: $event_type"
      echo "Valid types: PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop, SubagentStart, SubagentStop, UserPromptSubmit, SessionStart, SessionEnd, PreCompact, Notification, TeammateIdle, TaskCompleted"
      exit 1
      ;;
  esac
}

# 解析参数
VERBOSE=false
TIMEOUT=60

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      show_usage
      exit 0
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -t|--timeout)
      if [ $# -lt 2 ]; then
        echo "Error: --timeout requires a numeric value" >&2
        show_usage
        exit 1
      fi
      if ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "Error: --timeout requires a numeric value" >&2
        exit 1
      fi
      TIMEOUT="$2"
      shift 2
      ;;
    --create-sample)
      if [ $# -lt 2 ]; then
        echo "Error: --create-sample requires an event type" >&2
        exit 1
      fi
      create_sample "$2"
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -ne 2 ]; then
  echo "Error: Missing required arguments" >&2
  echo "" >&2
  show_usage >&2
  exit 1
fi

HOOK_SCRIPT="$1"
TEST_INPUT="$2"

# 校验输入
if [ ! -f "$HOOK_SCRIPT" ]; then
  echo "❌ Error: Hook script not found: $HOOK_SCRIPT"
  exit 1
fi

# 安全性：校验 hook 脚本路径不包含危险字符
# 这可防止通过恶意构造的路径触发潜在命令注入
if [[ "$HOOK_SCRIPT" =~ [\;\|\&\`\$\(\)\{\}\<\>] ]]; then
  echo "❌ Error: Hook script path contains invalid characters"
  echo "   Path must not contain: ; | & \` \$ ( ) { } < >"
  exit 1
fi

# 记录是否需要显式用 bash 调用
HOOK_IS_EXECUTABLE=true
if [ ! -x "$HOOK_SCRIPT" ]; then
  echo "⚠️  Warning: Hook script is not executable. Attempting to run with bash..."
  HOOK_IS_EXECUTABLE=false
fi

if [ ! -f "$TEST_INPUT" ]; then
  echo "❌ Error: Test input not found: $TEST_INPUT"
  exit 1
fi

# 安全性：校验测试输入路径不包含危险字符
# 这里复用了 HOOK_SCRIPT 的校验思路，以实现纵深防御
if [[ "$TEST_INPUT" =~ [\;\|\&\`\$\(\)\{\}\<\>] ]]; then
  echo "❌ Error: Test input path contains invalid characters"
  echo "   Path must not contain: ; | & \` \$ ( ) { } < >"
  exit 1
fi

# 校验测试输入 JSON（为保持防御一致性，带超时）
if ! timeout 5 jq empty "$TEST_INPUT" 2>/dev/null; then
  echo "❌ Error: Test input is not valid JSON"
  exit 1
fi

echo "🧪 Testing hook: $HOOK_SCRIPT"
echo "📥 Input: $TEST_INPUT"
echo ""

if [ "$VERBOSE" = true ]; then
  echo "Input JSON:"
  jq . "$TEST_INPUT"
  echo ""
fi

# 设置环境
export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/tmp/test-project}"
export CLAUDE_PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(pwd)}"
export CLAUDE_ENV_FILE="${CLAUDE_ENV_FILE:-/tmp/test-env-$$}"

if [ "$VERBOSE" = true ]; then
  echo "Environment:"
  echo "  CLAUDE_PROJECT_DIR=$CLAUDE_PROJECT_DIR"
  echo "  CLAUDE_PLUGIN_ROOT=$CLAUDE_PLUGIN_ROOT"
  echo "  CLAUDE_ENV_FILE=$CLAUDE_ENV_FILE"
  echo ""
fi

# 运行 hook
echo "▶️  Running hook (timeout: ${TIMEOUT}s)..."
echo ""

start_time=$(date +%s)

set +e
# 使用正确的参数传递方式以防止命令注入
# 参数会通过 bash -c 的位置参数安全传递
if [ "$HOOK_IS_EXECUTABLE" = true ]; then
  output=$(timeout "$TIMEOUT" bash -c 'cat "$1" | "$2"' -- "$TEST_INPUT" "$HOOK_SCRIPT" 2>&1)
else
  output=$(timeout "$TIMEOUT" bash -c 'cat "$1" | bash "$2"' -- "$TEST_INPUT" "$HOOK_SCRIPT" 2>&1)
fi
exit_code=$?
set -e

end_time=$(date +%s)
duration=$((end_time - start_time))

# 分析结果
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results:"
echo ""
echo "Exit Code: $exit_code"
echo "Duration: ${duration}s"
echo ""

case $exit_code in
  0)
    echo "✅ Hook approved/succeeded"
    ;;
  2)
    echo "🚫 Hook blocked/denied"
    ;;
  124)
    echo "⏱️  Hook timed out after ${TIMEOUT}s"
    ;;
  *)
    echo "⚠️  Hook returned unexpected exit code: $exit_code"
    ;;
esac

echo ""
echo "Output:"
if [ -n "$output" ]; then
  echo "$output"
  echo ""

  # 尝试按 JSON 解析
  if echo "$output" | jq empty 2>/dev/null; then
    echo "Parsed JSON output:"
    echo "$output" | jq .
  fi
else
  echo "(no output)"
fi

# 检查环境文件
if [ -f "$CLAUDE_ENV_FILE" ]; then
  echo ""
  echo "Environment file created:"
  cat "$CLAUDE_ENV_FILE"
  rm -f "$CLAUDE_ENV_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $exit_code -eq 0 ] || [ $exit_code -eq 2 ]; then
  echo "✅ Test completed successfully"
  exit 0
else
  echo "❌ Test failed"
  exit 1
fi
