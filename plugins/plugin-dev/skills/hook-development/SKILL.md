---
name: hook-development
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse/PostToolUse/Stop hook", "validate tool use", "implement prompt-based hooks", "use ${CLAUDE_PLUGIN_ROOT}", "set up event-driven automation", "block dangerous commands", "scoped hooks", "frontmatter hooks", "hook in skill", "hook in agent", "agent hook type", "once handler", "statusMessage", "hook decision control", "TeammateIdle hook", "TaskCompleted hook", or mentions hook events (PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop, SubagentStop, SubagentStart, SessionStart, SessionEnd, UserPromptSubmit, PreCompact, Notification, TeammateIdle, TaskCompleted). Provides comprehensive guidance for creating and implementing Claude Code plugin hooks with focus on advanced prompt-based hooks API.
---

# Hook Development for Claude Code Plugins

## Overview

Hooks are event-driven automation scripts that execute in response to Claude Code events. Use hooks to validate operations, enforce policies, add context, and integrate external tools into workflows.

**Key capabilities:**

- Validate tool calls before execution (PreToolUse)
- React to tool results (PostToolUse)
- Enforce completion standards (Stop, SubagentStop)
- Load project context (SessionStart)
- Automate workflows across the development lifecycle

## Hook Types

### Prompt-Based Hooks (Recommended)

Use LLM-driven decision making for context-aware validation:

```json
{
  "type": "prompt",
  "prompt": "Evaluate whether the current tool use is appropriate based on the PreToolUse event context. Return the documented event-specific JSON response.",
  "timeout": 30
}
```

**Supported events:** Stop, SubagentStop, UserPromptSubmit, PreToolUse

**Response format:**

Prompt hooks return the same JSON output schema as command hooks for the event. For Stop-like blocking events, use:

```json
{ "decision": "block", "reason": "Explanation of decision" }
```

For PreToolUse permission decisions, use `hookSpecificOutput.permissionDecision` with `allow`, `deny`, `ask`, or `defer`.

- Omit `decision` to allow Stop-like events by default
- `reason` is required when blocking and is fed back to Claude
- Default model: Haiku

**Benefits:**

- Context-aware decisions based on natural language reasoning
- Flexible evaluation logic without bash scripting
- Better edge case handling
- Easier to maintain and extend

### Command Hooks

Execute bash commands for deterministic checks:

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "timeout": 60
}
```

**Use for:**

- Fast deterministic validations
- File system operations
- External tool integrations
- Performance-critical checks

### Agent Hooks

Use an LLM agent for complex, multi-step verification that requires tool access:

```json
{
  "type": "agent",
  "prompt": "Verify all generated code has tests and passes linting",
  "timeout": 120
}
```

**Supported events:** Stop, SubagentStop

Agent hooks spawn a subagent that can use tools (Read, Bash, etc.) for thorough verification — useful when prompt hooks lack sufficient context or tool access. See `references/advanced.md` for patterns.

## Hook Configuration Formats

### Plugin hooks.json Format

**For plugin hooks** in `hooks/hooks.json`, use wrapper format:

```text
{
  "description": "Brief explanation of hooks (optional)",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**Key points:**

- `description` field is optional
- `hooks` field is required wrapper containing actual hook events
- This is the **plugin-specific format**

**Example:**

```json
{
  "description": "Validation hooks for code quality",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh"
          }
        ]
      }
    ]
  }
}
```

### Settings Format

**For user/project settings** in `.claude/settings.json`, use the same `hooks` wrapper:

```text
{
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**Key points:**

- `hooks` field is required wrapper containing actual hook events
- No plugin `description` field in settings
- This is the **settings format**

**Important:** The examples below show full settings-style hook objects. Plugin `hooks/hooks.json` uses the same `hooks` wrapper and may also include `description`.

## Hook Events

### PreToolUse

Execute before any tool runs. Use to approve, deny, or modify tool calls.

**Settings example (prompt-based):**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Validate file write safety. Return JSON with hookSpecificOutput.hookEventName='PreToolUse' and permissionDecision set to allow, deny, ask, or defer."
          }
        ]
      }
    ]
  }
}
```

**Output for PreToolUse:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Explanation",
    "updatedInput": { "field": "modified_value" }
  },
  "systemMessage": "Explanation for Claude"
}
```

### PermissionRequest

Execute when user is shown a permission dialog. Use to automatically allow or deny permissions.

**Settings example:**

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/check-permission.sh"
          }
        ]
      }
    ]
  }
}
```

**Output for PermissionRequest:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": { "command": "modified command" },
      "message": "Reason for denial",
      "interrupt": false
    }
  }
}
```

- `behavior`: "allow" to approve, "deny" to reject
- `updatedInput`: Optional modified tool parameters (only with "allow")
- `message`: Explanation shown to user (only with "deny")
- `interrupt`: If true with "deny", stops the current operation

**Use cases:**

- Auto-approve safe commands matching patterns
- Block dangerous operations with explanations
- Modify tool inputs before execution

### PostToolUse

Execute after tool completes. Use to react to results, provide feedback, or log.

**Settings example:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Analyze edit result for potential issues: syntax errors, security vulnerabilities, breaking changes. Provide feedback."
          }
        ]
      }
    ]
  }
}
```

**Output behavior:**

- Exit 0: stdout shown in transcript
- Exit 2: stderr fed back to Claude
- systemMessage included in context

### PostToolUseFailure

Execute when a tool fails after PostToolUse hooks have run. Use to handle errors or provide fallback actions.

**Settings example:**

```json
{
  "hooks": {
    "PostToolUseFailure": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Error occurred during edit. Provide fallback action or ask for user input."
          }
        ]
      }
    ]
  }
}
```

**Output behavior:**

- Exit 2: stderr fed back to Claude
- systemMessage included in context

### Stop

Execute when main agent considers stopping. Use to validate completeness.

**Settings example:**

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Verify task completion: tests run, build succeeded, questions answered. Return {\"decision\": \"block\", \"reason\": \"...\"} only when work should continue; omit decision to allow stopping."
          }
        ]
      }
    ]
  }
}
```

**Decision output:**

```json
{
  "decision": "block",
  "reason": "Explanation",
  "systemMessage": "Additional context"
}
```

Omit `decision` to allow stopping.

### SubagentStop

Execute when subagent considers stopping. Use to ensure subagent completed its task.

Similar to Stop hook, but for subagents.

### SubagentStart

Execute when a subagent is started. Use to initialize subagent state or perform setup. The matcher targets the agent type or a custom agent name.

**Settings example:**

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "general-purpose",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/subagent-init.sh"
          }
        ]
      }
    ]
  }
}
```

### UserPromptSubmit

Execute when user submits a prompt. Use to add context, validate, or block prompts.

**Settings example:**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if prompt requires security guidance. If discussing auth, permissions, or API security, return relevant warnings."
          }
        ]
      }
    ]
  }
}
```

### SessionStart

Execute when Claude Code session begins. Use to load context and set environment.

**Supported matchers:** `startup` (first launch), `resume` (resuming session), `clear` (after /clear), `compact` (after context compaction).

**Settings example:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh"
          }
        ]
      }
    ]
  }
}
```

**Special capability:** Persist environment variables using `$CLAUDE_ENV_FILE`:

```bash
echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"
```

See `examples/load-context.sh` for complete example.

### SessionEnd

Execute when session ends. Use for cleanup, logging, and state preservation.

### PreCompact

Execute before context compaction. Use to add critical information to preserve.

### Notification

Execute when Claude sends notifications. Use to react to user notifications.

## Hook Output Format

### Standard Output (All Hooks)

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "Message for Claude"
}
```

- `continue`: If false, halt processing (default true)
- `suppressOutput`: Hide output from transcript (default false)
- `systemMessage`: Message shown to Claude

### Exit Codes

- `0` - Success (stdout shown in transcript)
- `2` - Blocking error (stderr fed back to Claude)
- Other - Non-blocking error

## Hook Input Format

Command hooks receive JSON via stdin with common fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.txt",
  "cwd": "/current/working/dir",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

**Event-specific fields:**

- **PreToolUse/PermissionRequest/PostToolUse:** `tool_name`, `tool_input`, `tool_result`
- **UserPromptSubmit:** `prompt`
- **Stop/SubagentStop:** `stop_hook_active`

Prompt hooks receive the documented prompt/event context from Claude Code. Write prompts against that context generically (for example, "the current tool input" or "the submitted user prompt") instead of assuming shell-style variables such as `$TOOL_INPUT`, `$TOOL_RESULT`, or `$USER_PROMPT` exist.

For comprehensive per-tool and per-event input schemas for command hooks, see [Hook Input Schemas](references/hook-input-schemas.md).

## Environment Variables

Available in all command hooks:

- `$CLAUDE_PROJECT_DIR` - Project root path
- `$CLAUDE_PLUGIN_ROOT` - Plugin directory (use for portable paths)
- `$CLAUDE_ENV_FILE` - SessionStart only: persist env vars here
- `$CLAUDE_CODE_REMOTE` - Set if running in remote context

**Always use ${CLAUDE_PLUGIN_ROOT} in hook commands for portability:**

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
}
```

## Plugin Hook Configuration

In plugins, define hooks in `hooks/hooks.json` using the **plugin wrapper format** described in [Hook Configuration Formats](#hook-configuration-formats):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "prompt", "prompt": "Validate file write safety" }]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [{ "type": "prompt", "prompt": "Verify task completion" }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/load-context.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Note:** Plugin hooks use the same `{"hooks": {...}}` wrapper as settings and may include an optional `description`. Plugin hooks merge with user's hooks and run in parallel.

## Scoped Hooks in Skill Frontmatter

Beyond `hooks.json` (global) and settings (user-level), hooks can be defined directly in skill YAML frontmatter when supported by Claude Code. Scoped hooks activate only when that skill is in use. Plugin-shipped agent frontmatter does not support `hooks`; put plugin agent-related hooks in `hooks/hooks.json` instead:

```yaml
---
name: validated-writer
description: Write files with safety checks...
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
---
```

**Supported events in frontmatter:** `PreToolUse`, `PostToolUse`, `Stop`

Scoped skill hooks use the same event/matcher/hook structure but are lifecycle-bound — they activate when the skill loads and deactivate when it completes. This is ideal for skill-specific validation without affecting other workflows.

See `references/advanced.md` for detailed syntax and comparison with `hooks.json`.

## Matchers

### Tool Name Matching

**Exact match:**

```text
"matcher": "Write"
```

**Multiple tools:**

```text
"matcher": "Read|Write|Edit"
```

**Wildcard (all tools):**

```text
"matcher": "*"
```

**Regex patterns:**

```jsonc
"matcher": "mcp__.*__delete.*"  // All MCP delete tools
```

**Note:** Matchers are case-sensitive.

### Common Patterns

```jsonc
// All MCP tools
"matcher": "mcp__.*"

// Specific MCP server tools
"matcher": "mcp__asana__.*"

// All file operations
"matcher": "Read|Write|Edit"

// Bash commands only
"matcher": "Bash"
```

## Security Best Practices

### Input Validation

Always validate inputs in command hooks:

```bash
#!/bin/bash
set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

# Validate tool name format
if [[ ! "$tool_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Invalid tool name"}}'
  exit 0
fi
```

### Path Safety

Check for path traversal and sensitive files:

```bash
file_path=$(echo "$input" | jq -r '.tool_input.file_path')

# Deny path traversal
if [[ "$file_path" == *".."* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Path traversal detected"}}'
  exit 0
fi

# Deny sensitive files
if [[ "$file_path" == *".env"* ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Sensitive file"}}'
  exit 0
fi
```

See `examples/validate-write.sh` and `examples/validate-bash.sh` for complete examples.

### Quote All Variables

```bash
# GOOD: Quoted
echo "$file_path"
cd "$CLAUDE_PROJECT_DIR"

# BAD: Unquoted (injection risk)
echo $file_path
cd $CLAUDE_PROJECT_DIR
```

### Set Appropriate Timeouts

```json
{
  "type": "command",
  "command": "bash script.sh",
  "timeout": 10
}
```

**Defaults:** Command hooks (60s), Prompt hooks (30s)

## Performance Considerations

### Parallel Execution

All matching hooks run **in parallel**:

```jsonc
{
  "PreToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        { "type": "command", "command": "check1.sh" }, // Parallel
        { "type": "command", "command": "check2.sh" }, // Parallel
        { "type": "prompt", "prompt": "Validate..." } // Parallel
      ]
    }
  ]
}
```

**Design implications:**

- Hooks don't see each other's output
- Non-deterministic ordering
- Design for independence

### Optimization

1. Use command hooks for quick deterministic checks
2. Use prompt hooks for complex reasoning
3. Cache validation results in temp files
4. Minimize I/O in hot paths

## Hook Lifecycle and Limitations

### Hooks Load at Session Start

**Important:** Hooks are loaded when Claude Code session starts. Changes to hook configuration require restarting Claude Code.

**Cannot hot-swap hooks:**

- Editing `hooks/hooks.json` won't affect current session
- Adding new hook scripts won't be recognized
- Changing hook commands/prompts won't update
- Must restart Claude Code: exit and run `claude` again

**To test hook changes:**

1. Edit hook configuration or scripts
2. Exit Claude Code session
3. Restart: `claude`
4. New hook configuration loads
5. Test hooks with `claude --debug`

### Hook Validation at Startup

Hooks are validated when Claude Code starts:

- Invalid JSON in hooks.json causes loading failure
- Missing scripts cause warnings
- Syntax errors reported in debug mode

Use `/hooks` command to review loaded hooks in current session.

## Debugging Hooks

### Enable Debug Mode

```bash
claude --debug
```

Look for hook registration, execution logs, input/output JSON, and timing information.

For additional hook debugging output, use `--verbose`:

```bash
claude --verbose
```

This shows hook registration, event matching, and execution timing without the full debug output. Combine with `--debug` for maximum detail.

### Test Hook Scripts

Test command hooks directly:

```bash
echo '{"tool_name": "Write", "tool_input": {"file_path": "/test"}}' | \
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh

echo "Exit code: $?"
```

### Validate JSON Output

Ensure hooks output valid JSON:

```bash
output=$(./your-hook.sh < test-input.json)
echo "$output" | jq .
```

## Quick Reference

### Hook Events Summary

| Event              | When               | Use For                  |
| ------------------ | ------------------ | ------------------------ |
| PreToolUse         | Before tool        | Validation, modification |
| PermissionRequest  | Permission dialog  | Auto-allow/deny          |
| PostToolUse        | After tool success | Feedback, logging        |
| PostToolUseFailure | After tool fails   | Error handling           |
| UserPromptSubmit   | User input         | Context, validation      |
| Stop               | Agent stopping     | Completeness check       |
| SubagentStart      | Subagent begins    | Subagent setup           |
| SubagentStop       | Subagent done      | Task validation          |
| SessionStart       | Session begins     | Context loading          |
| SessionEnd         | Session ends       | Cleanup, logging         |
| PreCompact         | Before compact     | Preserve context         |
| Notification       | User notified      | Logging, reactions       |
| TeammateIdle       | Teammate goes idle | Quality gates in teams   |
| TaskCompleted      | Task marked done   | Completion verification  |

### Handler Configuration Fields

Beyond `type`, `timeout`, and `matcher`, hook handlers support:

- **`once`** (boolean): Run only once per session, then auto-removed. Useful for one-time initialization in scoped hooks.
- **`statusMessage`** (string): Display text shown in the UI while the hook runs.

See `references/advanced.md` for detailed decision control output schemas and event-specific matchers.

### Best Practices

**DO:**

- ✅ Use prompt-based hooks for complex logic
- ✅ Use ${CLAUDE_PLUGIN_ROOT} for portability
- ✅ Validate all inputs in command hooks
- ✅ Quote all bash variables
- ✅ Set appropriate timeouts
- ✅ Return structured JSON output
- ✅ Test hooks thoroughly

**DON'T:**

- ❌ Use hardcoded paths
- ❌ Trust user input without validation
- ❌ Create long-running hooks
- ❌ Rely on hook execution order
- ❌ Modify global state unpredictably
- ❌ Log sensitive information

## Additional Resources

### Reference Files

For detailed patterns and advanced techniques, consult:

- **`references/patterns.md`** - 10 proven patterns including temporarily active and configuration-driven hooks
- **`references/migration.md`** - Migrating from basic to advanced hooks
- **`references/advanced.md`** - Advanced use cases and techniques

### Example Hook Scripts

Working examples in `examples/`:

> **Note:** After copying example scripts, make them executable: `chmod +x script.sh`

- **`validate-write.sh`** - File write validation example
- **`validate-bash.sh`** - Bash command validation example
- **`load-context.sh`** - SessionStart context loading example

### Utility Scripts

> **Prerequisites**: These scripts assume `bash` 3.2+, `grep`, and `sed`. JSON validation scripts also require `jq` 1.6+; check with `jq --version` and install it with your system package manager if missing.

Development tools in `scripts/`:

- **`validate-hook-schema.sh`** - Validate hooks.json structure and syntax
- **`test-hook.sh`** - Test hooks with sample input before deployment
- **`hook-linter.sh`** - Check hook scripts for common issues and best practices

### External Resources

- **Official Docs**: <https://code.claude.com/docs/en/hooks>
- **Examples**: See security-guidance plugin in marketplace
- **Testing**: Use `claude --debug` for detailed logs
- **Validation**: Use `jq` to validate hook JSON output

## Implementation Workflow

To implement hooks in a plugin:

1. Identify events to hook into (PreToolUse, Stop, SessionStart, etc.)
2. Decide between prompt-based (flexible) or command (deterministic) hooks
3. Write hook configuration in `hooks/hooks.json`
4. For command hooks, create hook scripts
5. Use ${CLAUDE_PLUGIN_ROOT} for all file references
6. Validate configuration with `scripts/validate-hook-schema.sh hooks/hooks.json`
7. Test hooks with `scripts/test-hook.sh` before deployment
8. Test in Claude Code with `claude --debug`
9. Document hooks in plugin README

Focus on prompt-based hooks for most use cases. Reserve command hooks for performance-critical or deterministic checks.
