# Permission Modes & Rules Reference

This reference covers the Claude Code permission system for project/user subagents, including current permission modes and the permission rule syntax for fine-grained access control.

Plugin-shipped agents should not set `permissionMode` in frontmatter. Claude Code ignores that field for plugin agents, so use `tools`/`disallowedTools` plus documented user/project permission rules instead.

## Permission Modes

Project/user subagents can specify a `permissionMode` in frontmatter to control how permission requests are handled. Plugin-shipped agents cannot rely on this field because Claude Code ignores it for plugin agents:

```yaml
permissionMode: acceptEdits
```

### All Permission Modes

| Mode                | Behavior                                                     | Use Case                                        |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `default`           | Standard permission model — prompts user for each action     | General-purpose agents, untrusted contexts      |
| `acceptEdits`       | Auto-accept file edit operations (Write, Edit, NotebookEdit) | Code generation agents that need to write files |
| `auto`              | Lets Claude choose an appropriate permission strategy        | Trusted workflows where adaptive behavior helps |
| `dontAsk`           | Skip all permission dialogs                                  | Trusted automation agents, CI/CD agents         |
| `bypassPermissions` | Full bypass of all permission checks                         | Fully trusted agents only                       |
| `plan`              | Planning mode — propose changes without executing            | Architecture/design agents, review agents       |

### Mode Details

#### default

The standard interactive permission model. Claude asks the user before performing actions that require permission. This is the implicit mode when `permissionMode` is not specified.

**When to use:** General-purpose agents, agents handling sensitive operations, agents in untrusted contexts.

#### acceptEdits

Auto-accepts file writing operations (Write, Edit, NotebookEdit) without prompting. Other operations (Bash, etc.) still require user permission.

**When to use:** Code generation agents, refactoring agents, documentation generators.

#### dontAsk

Skips all permission dialogs. The agent proceeds without user confirmation for any action.

**When to use:** Trusted automation, background agents, CI/CD pipelines where no user is present.

#### bypassPermissions

Full permission bypass with no restrictions. More permissive than `dontAsk` as it bypasses even system-level restrictions.

**When to use:** Only for fully trusted agents in controlled environments. Never for plugins distributed to unknown users.

#### plan

Planning mode restricts the agent to read-only operations. The agent can explore the codebase and propose changes but cannot execute them. Requires user approval before any modifications.

**When to use:** Architecture planning, design review, impact analysis agents.

#### auto

Lets Claude choose an appropriate permission strategy for the workflow instead of pinning a single fixed mode up front.

**When to use:** Trusted workflows where adaptive behavior is useful, but you still want Claude Code's permission system to choose the right level.

### Team Lead Guidance

For coordination-focused team leads, do not rely on a `delegate` permission mode. Instead:

- Restrict tools so the lead lacks implementation capabilities it should not use
- State clearly in the system prompt that the lead decomposes work, assigns tasks, and reviews teammate output rather than coding directly
- Use permission rules in settings when you need tighter spawn restrictions, such as `Agent(code-reviewer, test-runner)`

## Permission Specifier Syntax

Permission specifiers define exactly which tool invocations a rule matches. Each tool type has its own pattern syntax.

### Bash Patterns

| Pattern          | Behavior                     | Example Match             | Non-Match          |
| ---------------- | ---------------------------- | ------------------------- | ------------------ |
| `Bash(npm test)` | Exact match                  | `npm test`                | `npm test --watch` |
| `Bash(npm *)`    | Prefix with word boundary    | `npm test`, `npm install` | `npmx build`       |
| `Bash(git*)`     | Prefix without word boundary | `git`, `git push`, `gitk` | —                  |

Space before `*` means word boundary: `Bash(ls *)` matches `ls -la` but NOT `lsof`. No space means substring: `Bash(git*)` matches both `git push` and `gitk`.

### Path Patterns for Edit/Read/Write

Path specifiers follow the gitignore specification:

| Pattern  | Meaning                                      | Example                |
| -------- | -------------------------------------------- | ---------------------- |
| `//path` | Absolute from filesystem root                | `Edit(//etc/config)`   |
| `~/path` | Relative to home directory                   | `Read(~/Documents/**)` |
| `/path`  | Relative to settings file location           | `Edit(/src/**)`        |
| `./path` | Relative to current directory                | `Write(./output/*)`    |
| `path`   | Relative to current directory (same as `./`) | `Edit(src/**)`         |
| `*`      | Single directory level wildcard              | `Read(src/*)`          |
| `**`     | Recursive directory wildcard                 | `Edit(src/**)`         |

### WebFetch Patterns

Restrict by domain:

```
WebFetch(domain:example.com)
```

### MCP Tool Patterns

| Pattern             | Matches                   |
| ------------------- | ------------------------- |
| `mcp__server`       | All tools from server     |
| `mcp__server__*`    | All tools from server     |
| `mcp__server__tool` | Specific tool from server |

### Agent Patterns

| Pattern               | Matches                      |
| --------------------- | ---------------------------- |
| `Agent(agent-name)`   | Only the named agent type    |
| `Agent(name1, name2)` | Only listed agent types      |
| `Agent`               | All subagent types           |
| _(omit entirely)_     | No subagent spawning allowed |

### Skill Patterns

| Pattern         | Matches                     |
| --------------- | --------------------------- |
| `Skill(name)`   | Exact skill name match      |
| `Skill(name *)` | Prefix match with arguments |

### Evaluation Order

Rules are evaluated in a strict order — first match wins within each tier:

1. **Deny** rules checked first
2. **Ask** rules checked second
3. **Allow** rules checked last

### Default Permission Tiers

Tools fall into three default permission tiers:

| Tier              | Tools                     | Behavior                                           |
| ----------------- | ------------------------- | -------------------------------------------------- |
| Read-only         | Read, Glob, Grep          | No approval needed                                 |
| Bash commands     | Bash                      | Manual approval on first use per directory/command |
| File modification | Write, Edit, NotebookEdit | Approval required per session                      |

## Permission Rules

Permission rules provide fine-grained control over specific tool access. They are configured in settings files (not agent frontmatter) and apply based on precedence.

### Rule Syntax

Rules are specified in `settings.json` under `permissions`:

```json
{
  "permissions": {
    "allow": ["Read", "Bash(npm test)", "Edit(src/**)"],
    "deny": ["Bash(rm *)", "Bash(git push --force*)"]
  }
}
```

### Tool Specifiers

| Pattern              | Matches                         | Example                              |
| -------------------- | ------------------------------- | ------------------------------------ |
| `ToolName`           | Any use of that tool            | `Read` — all file reads              |
| `ToolName(argument)` | Tool with specific argument     | `Bash(npm test)` — only this command |
| `ToolName(pattern*)` | Tool with wildcard argument     | `Bash(npm *)` — any npm command      |
| `Edit(path)`         | Edit with gitignore-style path  | `Edit(src/**)` — edits in src/       |
| `Write(path)`        | Write with gitignore-style path | `Write(tests/**)` — writes in tests/ |

### MCP Tool Patterns

```json
{
  "permissions": {
    "allow": ["mcp__servername__toolname", "mcp__servername__*"]
  }
}
```

- `mcp__server__tool` — specific MCP tool
- `mcp__server__*` — all tools from a server
- `mcp__*` — all MCP tools (use sparingly)

### Agent Patterns

Control which agent types can be spawned:

```json
{
  "permissions": {
    "allow": ["Agent(code-reviewer, test-runner)"]
  }
}
```

- `Agent(type1, type2)` — only listed agent types
- `Agent` — allow any subagent
- Omitting `Agent` — no subagent spawning

### Rule Precedence

When multiple rules match:

1. **deny** rules always take precedence over **allow** rules
2. More specific rules take precedence over general ones
3. Explicit rules override `permissionMode` settings

### Plugin Developer Guidance

**Document required permissions:** If your plugin's agents need specific tool access, document the minimum required permissions in your README:

```markdown
## Required Permissions

This plugin's agents need:

- `Edit(src/**)` — to modify source files
- `Bash(npm test)` — to run tests
- `mcp__myserver__*` — for MCP tool access
```

**Configure agent permissions:** For plugin-shipped agents, do not put `permissionMode` in agent frontmatter. Claude Code ignores it there. Instead, constrain plugin agents with `tools`/`disallowedTools` and document any user/project permission rules that must be configured.

**Principle of least privilege:** Request only the permissions your agent actually needs. For project/user subagents, prefer narrower modes such as `acceptEdits` over broader modes like `dontAsk` when only file writes are needed.
