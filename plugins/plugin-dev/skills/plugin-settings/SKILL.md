---
name: plugin-settings
description: This skill should be used when the user asks about "plugin settings", "store plugin configuration", "user-configurable plugin", ".local.md files", "plugin state files", "read YAML frontmatter", "per-project plugin settings", "CLAUDE.md imports", "rules system", "memory hierarchy", "memory priority", or wants to make plugin behavior configurable. Documents the .claude/plugin-name.local.md pattern for storing plugin-specific configuration with YAML frontmatter and markdown content.
---

# Plugin Settings Pattern for Claude Code Plugins

## Overview

Plugins can store user-configurable settings and state in `.claude/plugin-name.local.md` files within the project directory. This pattern uses YAML frontmatter for structured configuration and markdown content for prompts or additional context.

**Key characteristics:**

- File location: `.claude/plugin-name.local.md` in project root
- Structure: YAML frontmatter + markdown body
- Purpose: Per-project plugin configuration and state
- Usage: Read from hooks, commands, and agents
- Lifecycle: User-managed (not in git, should be in `.gitignore`)

## File Structure

### Basic Template

```markdown
---
enabled: true
setting1: value1
setting2: value2
numeric_setting: 42
list_setting: ["item1", "item2"]
---

# Additional Context

This markdown body can contain:

- Task descriptions
- Additional instructions
- Prompts to feed back to Claude
- Documentation or notes
```

### Example: Plugin State File

**.claude/my-plugin.local.md:**

```markdown
---
enabled: true
validation_mode: standard
max_retries: 3
notification_level: info
coordinator_session: team-leader
---

# Plugin Configuration

This plugin is configured for standard validation mode.
Contact @team-lead with questions.
```

## Reading Settings Files

### From Hooks (Bash Scripts)

#### Pattern: Check existence and parse frontmatter

```bash
#!/bin/bash
set -euo pipefail

# Define state file path
STATE_FILE=".claude/my-plugin.local.md"

# Quick exit if file doesn't exist
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0  # Plugin not configured, skip
fi

# Parse YAML frontmatter (between --- markers)
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$STATE_FILE")

# Extract individual fields. `grep` may return no matches, so keep `set -e` safe.
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' | sed 's/^"\(.*\)"$/\1/' || true)
VALIDATION_MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_mode:' | sed 's/validation_mode: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Check if enabled
if [[ "$ENABLED" != "true" ]]; then
  exit 0  # Disabled
fi

# Use configuration in hook logic
if [[ "$VALIDATION_MODE" == "strict" ]]; then
  # Apply strict validation
  # ...
fi
```

See `examples/read-settings-hook.sh` for complete working example. That example requires `jq` because it reads hook JSON input and emits JSON output.

### From Commands

Commands can read settings files to customize behavior:

```markdown
---
description: Process data with plugin
allowed-tools: Read, Bash
---

# Process Command

Steps:

1. Check if settings exist at `.claude/my-plugin.local.md`
2. Read configuration using Read tool
3. Parse YAML frontmatter to extract settings
4. Apply settings to processing logic
5. Execute with configured behavior
```

### From Agents

Agents can reference settings in their instructions:

```markdown
---
name: configured-agent
description: Agent that adapts to project settings
---

Check for plugin settings at `.claude/my-plugin.local.md`.
If present, parse YAML frontmatter and adapt behavior according to:

- enabled: Whether plugin is active
- mode: Processing mode (strict, standard, lenient)
- Additional configuration fields
```

## Parsing Techniques

### Extract Frontmatter

```bash
# Extract everything between --- markers
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")
```

### Read Individual Fields

**String fields:**

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

**Boolean fields:**

```bash
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)
# Compare: if [[ "$ENABLED" == "true" ]]; then
```

**Numeric fields:**

```bash
MAX=$(printf '%s\n' "$FRONTMATTER" | grep '^max_value:' | sed 's/max_value: *//' || true)
# Use: if [[ $MAX -gt 100 ]]; then
```

### Read Markdown Body

Extract content after second `---`:

```bash
# Get everything after the closing marker; later body --- lines are preserved
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

## Common Patterns

### Pattern 1: Temporarily Active Hooks

Use settings file to control hook activation:

```bash
#!/bin/bash
STATE_FILE=".claude/security-scan.local.md"

# Quick exit if not configured
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Read enabled flag
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$STATE_FILE")
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

if [[ "$ENABLED" != "true" ]]; then
  exit 0  # Disabled
fi

# Run hook logic
# ...
```

**Use case:** Enable/disable hook behavior without editing hook registration.

### Pattern 2: Agent State Management

Store agent-specific state and configuration:

**.claude/multi-agent-swarm.local.md:**

```markdown
---
agent_name: auth-agent
task_number: 3.5
pr_number: 1234
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.4"]
---

# Task Assignment

Implement JWT authentication for the API.

**Success Criteria:**

- Authentication endpoints created
- Tests passing
- PR created and CI green
```

Read from hooks to coordinate agents:

```bash
AGENT_NAME=$(printf '%s\n' "$FRONTMATTER" | grep '^agent_name:' | sed 's/agent_name: *//' || true)
COORDINATOR=$(printf '%s\n' "$FRONTMATTER" | grep '^coordinator_session:' | sed 's/coordinator_session: *//' || true)

# Send notification to coordinator
tmux send-keys -t "$COORDINATOR" "Agent $AGENT_NAME completed task" Enter
```

### Pattern 3: Configuration-Driven Behavior

**.claude/my-plugin.local.md:**

```markdown
---
validation_level: strict
max_file_size: 1000000
allowed_extensions: [".js", ".ts", ".tsx"]
enable_logging: true
---

# Validation Configuration

Strict mode enabled for this project.
All writes validated against security policies.
```

Use in hooks or commands:

```bash
LEVEL=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_level:' | sed 's/validation_level: *//' || true)

case "$LEVEL" in
  strict)
    # Apply strict validation
    ;;
  standard)
    # Apply standard validation
    ;;
  lenient)
    # Apply lenient validation
    ;;
esac
```

## Creating Settings Files

### From Commands

Commands can create settings files:

```markdown
# Setup Command

Steps:

1. Ask user for configuration preferences
2. Create `.claude/my-plugin.local.md` with YAML frontmatter
3. Set appropriate values based on user input
4. Inform user that settings are saved
5. Tell the user that settings are read on the next hook/command invocation; restart Claude Code only after changing hook registration or plugin configuration
```

### Template Generation

Provide template in plugin README:

```markdown
## Configuration

Create `.claude/my-plugin.local.md` in the project:

\`\`\`markdown
---
enabled: true
mode: standard
max_retries: 3
---

# Plugin Configuration

Settings are active.
\`\`\`

After creating or editing settings content, the next hook or command invocation can read the new values. Restart Claude Code only after changing hook registration or plugin configuration.
```

## Best Practices

### File Naming

✅ **DO:**

- Use `.claude/plugin-name.local.md` format
- Match plugin name exactly
- Use `.local.md` suffix for user-local files

❌ **DON'T:**

- Use different directory (not `.claude/`)
- Use inconsistent naming
- Use `.md` without `.local` (might be committed)

### Gitignore

Always add to `.gitignore`:

```gitignore
.claude/*.local.md
.claude/*.local.json
```

Document this in plugin README.

### Defaults

Provide sensible defaults when settings file doesn't exist:

```bash
if [[ ! -f "$STATE_FILE" ]]; then
  # Use defaults
  ENABLED=true
  MODE=standard
else
  # Read from file
  # ...
fi
```

### Validation

Validate settings values:

```bash
MAX=$(printf '%s\n' "$FRONTMATTER" | grep '^max_value:' | sed 's/max_value: *//' || true)

# Validate numeric range
if ! [[ "$MAX" =~ ^[0-9]+$ ]] || [[ $MAX -lt 1 ]] || [[ $MAX -gt 100 ]]; then
  echo "⚠️  Invalid max_value in settings (must be 1-100)" >&2
  MAX=10  # Use default
fi
```

### Restart Requirement

**Important:** Settings file content changes do not require a restart if your hook or command reads the file each time. Restart Claude Code only after changing hook registration or plugin configuration.

Document in the plugin README:

```markdown
## Changing Settings

After editing `.claude/my-plugin.local.md`:

1. Save the file
2. Run the command again or wait for the next hook invocation
3. Restart Claude Code only if you changed hook registration or plugin configuration
```

Hook definitions cannot be hot-swapped within a session, but hook scripts can read updated settings files on each invocation.

## Security Considerations

### Sanitize User Input

When writing settings files from user input:

```bash
# Prefer allowlisted values for YAML fields.
case "$USER_CHOICE" in
  strict|standard|lenient) MODE="$USER_CHOICE" ;;
  *) echo "Invalid mode" >&2; exit 2 ;;
esac

# For free text, avoid hand-escaping YAML. Put it in the markdown body,
# or use a YAML-aware writer such as yq/python instead of interpolating raw input.
```

### Validate File Paths

If settings contain file paths:

```bash
FILE_PATH=$(printf '%s\n' "$FRONTMATTER" | grep '^data_file:' | sed 's/data_file: *//' || true)

# Check for path traversal
if [[ "$FILE_PATH" == *".."* ]]; then
  echo "⚠️  Invalid path in settings (path traversal)" >&2
  exit 2
fi
```

### Permissions

Settings files should be:

- Readable by user only (`chmod 600`)
- Not committed to git
- Not shared between users

## Real-World Examples

### multi-agent-swarm Plugin

**.claude/multi-agent-swarm.local.md:**

```markdown
---
agent_name: auth-implementation
task_number: 3.5
pr_number: 1234
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.4"]
additional_instructions: Use JWT tokens, not sessions
---

# Task: Implement Authentication

Build JWT-based authentication for the REST API.
Coordinate with auth-agent on shared types.
```

**Hook usage (agent-stop-notification.sh):**

- Checks if file exists (line 15-18: quick exit if not)
- Parses frontmatter to get coordinator_session, agent_name, enabled
- Sends notifications to coordinator if enabled
- Allows quick activation/deactivation via `enabled: true/false`

### ralph-wiggum Plugin

**.claude/ralph-loop.local.md:**

```markdown
---
iteration: 1
max_iterations: 10
completion_promise: "All tests passing and build successful"
---

Fix all the linting errors in the project.
Make sure tests pass after each fix.
```

**Hook usage (stop-hook.sh):**

- Checks if file exists (line 15-18: quick exit if not active)
- Reads iteration count and max_iterations
- Extracts completion_promise for loop termination
- Reads body as the prompt to feed back
- Updates iteration count on each loop

## Quick Reference

### File Location

```
project-root/
└── .claude/
    └── plugin-name.local.md
```

### Frontmatter Parsing

```bash
# Extract frontmatter
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")

# Read field. `grep` may return no matches, so keep `set -e` safe.
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

### Body Parsing

```bash
# Extract body (after second ---)
BODY=$(awk '/^---$/{i++; next} i>=2' "$FILE")
```

### Quick Exit Pattern

```bash
if [[ ! -f ".claude/my-plugin.local.md" ]]; then
  exit 0  # Not configured
fi
```

## Memory & Rules Context

### Settings Scope Precedence

Settings follow precedence: Managed > CLI flags > Local (`.claude/settings.local.json`) > Project (`.claude/settings.json`) > User (`~/.claude/settings.json`). Plugin hooks and MCP servers are merged across scopes, not replaced. A plugin-settings `.local.md` file is separate from this system — it's a custom per-project state file your plugin reads directly.

Plugin settings files (`.local.md`) exist alongside Claude Code's broader memory and rules system. Understanding how CLAUDE.md imports, `.claude/rules/` path-specific rules, and the memory priority hierarchy interact with plugin content helps design plugins that complement rather than conflict with user configurations.

See `references/memory-rules-system.md` for the full priority hierarchy, import syntax, and design implications.

---

## Additional Resources

### Reference Files

For detailed implementation patterns:

- **`references/parsing-techniques.md`** - Complete guide to parsing YAML frontmatter and markdown bodies
- **`references/real-world-examples.md`** - Deep dive into multi-agent-swarm and ralph-wiggum implementations
- **`references/memory-rules-system.md`** - How plugin content interacts with CLAUDE.md, rules, and the memory hierarchy

### Example Files

Working examples in `examples/`:

- **`read-settings-hook.sh`** - Hook that reads and uses settings
- **`create-settings-command.md`** - Command that creates settings file
- **`example-settings.md`** - Template settings file

### Utility Scripts

These scripts assume a shell environment with `bash` 3.2+, `grep`, and `sed`. The `examples/read-settings-hook.sh` example also requires `jq` for parsing hook JSON input and generating JSON output. Check tool availability with `bash --version`, `grep --version`, `sed --version`, and `jq --version` when debugging script failures.

Development tools in `scripts/`:

- **`validate-settings.sh`** - Validate settings file structure
- **`parse-frontmatter.sh`** - Extract frontmatter fields

## Implementation Workflow

To add settings to a plugin:

1. Design settings schema (which fields, types, defaults)
2. Create template file in plugin documentation
3. Add gitignore entry for `.claude/*.local.md`
4. Implement settings parsing in hooks/commands
5. Use quick-exit pattern (check file exists, check enabled field)
6. Document settings in plugin README with template
7. Explain that settings content is read on the next hook/command invocation, while hook registration or plugin configuration changes require a Claude Code restart

Focus on keeping settings simple and providing good defaults when settings file doesn't exist.
