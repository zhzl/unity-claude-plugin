#!/bin/bash
# Example PreToolUse hook for validating Bash commands
# This script demonstrates bash command validation patterns

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract command
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Validate command exists
if [ -z "$command" ]; then
  echo '{"continue": true}' # No command to validate
  exit 0
fi

# SECURITY: Check for shell control/injection patterns FIRST
# These checks must run before the "safe command" allowlist to prevent bypasses
# like: echo $(rm -rf /), ls; malicious, pwd && evil, whoami | exfil, echo ok > file
# Note: This is an example, not a full shell parser. Production hooks should
# consider a real parser or stricter allowlist for complex command policies.
# shellcheck disable=SC2016 # Single quotes intentional - matching literal $( and ` characters
if [[ "$command" == *$'\n'* ]] || [[ "$command" == *$'\r'* ]] ||
   [[ "$command" == *";"* ]] || [[ "$command" == *"|"* ]] ||
   [[ "$command" == *"&"* ]] || [[ "$command" == *">"* ]] ||
   [[ "$command" == *"<"* ]] || [[ "$command" == *'$('* ]] ||
   [[ "$command" == *'`'* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask"}, "systemMessage": "Shell control syntax detected - requires review"}'
  exit 0
fi

# Check for obviously safe commands (quick approval)
# IMPORTANT: This check is only safe because chaining patterns are caught above
if [[ "$command" =~ ^(ls|pwd|echo|date|whoami)(\s|$) ]]; then
  exit 0
fi

# Check for destructive operations
if [[ "$command" == *"rm -rf"* ]] || [[ "$command" == *"rm -fr"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Dangerous command detected: rm -rf"}'
  exit 0
fi

# Check for other dangerous commands
if [[ "$command" == *"dd if="* ]] || [[ "$command" == *"mkfs"* ]] || [[ "$command" == *"> /dev/"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny"}, "systemMessage": "Dangerous system operation detected"}'
  exit 0
fi

# Check for privilege escalation
if [[ "$command" == sudo* ]] || [[ "$command" == su* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask"}, "systemMessage": "Command requires elevated privileges"}'
  exit 0
fi

# Approve the operation
exit 0
