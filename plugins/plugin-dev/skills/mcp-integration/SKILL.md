---
name: mcp-integration
description: This skill should be used when the user asks to "add MCP server", "integrate MCP", "configure MCP in plugin", "use .mcp.json", "set up Model Context Protocol", "connect external service", mentions "${CLAUDE_PLUGIN_ROOT} with MCP", discusses MCP server types (stdio, SSE, HTTP/streamable HTTP), or asks to "find MCP server", "discover MCP servers", "what MCP servers exist", "recommend MCP server for [service]", "MCP prompts", "MCP prompts as commands", "tool search", "tool search threshold", "claude mcp serve", "allowedMcpServers", "deniedMcpServers", "managed MCP". Provides comprehensive guidance for integrating Model Context Protocol servers into Claude Code plugins for external tool and service integration.
---

# MCP Integration for Claude Code Plugins

## Overview

Model Context Protocol (MCP) enables Claude Code plugins to integrate with external services and APIs by providing structured tool access. Use MCP integration to expose external service capabilities as tools within Claude Code.

**Key capabilities:**

- Connect to external services (databases, APIs, file systems)
- Provide 10+ related tools from a single service
- Handle OAuth and complex authentication flows
- Bundle MCP servers with plugins for automatic setup

## MCP Server Configuration Methods

Plugins can bundle MCP servers in two ways:

### Method 1: Dedicated .mcp.json (Recommended)

Create `.mcp.json` at plugin root:

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_URL": "${DB_URL}"
      }
    }
  }
}
```

**Benefits:**

- Clear separation of concerns
- Easier to maintain
- Better for multiple servers

### Method 2: Inline in plugin.json

Add `mcpServers` field to plugin.json:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

**Benefits:**

- Single configuration file
- Good for simple single-server plugins

### MCP Scope System

MCP server configurations follow scope precedence: Local > Project > User.

| Scope   | Storage                        | Sharing              | Best For                           |
| ------- | ------------------------------ | -------------------- | ---------------------------------- |
| Local   | `~/.claude.json` (project path) | Private, current project | Experimental, sensitive credentials |
| Project | `.mcp.json` in project root    | Via version control  | Team-shared, project-specific      |
| User    | `~/.claude.json` (global)      | All projects         | Personal utilities, cross-project  |

Plugin-bundled MCP servers (via `.mcp.json` or inline in `plugin.json`) auto-start when the plugin is enabled. They interact with user/project MCP configs — if a user has a server with the same name, scope precedence determines which loads.

## Discovering MCP Servers

Find existing MCP servers by checking official service documentation, Anthropic/Claude Code MCP guidance, and general web search. PulseMCP can be a useful optional directory when you want broader community discovery.

**Discovery workflow:**

1. Search official docs or the web for "[service] MCP server" using available Claude Code web search/fetch tools
2. Prefer official or well-maintained servers over community one-offs
3. Optionally check PulseMCP for broader discovery and alternatives
4. Generate `.mcp.json` configuration based on server type

**See `references/server-discovery.md`** for detailed discovery guidance and curated server recommendations by category.

## MCP Server Types

### stdio (Local Process)

Execute local MCP servers as child processes. Best for local tools and custom servers.

**Configuration:**

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
    "env": {
      "LOG_LEVEL": "debug"
    }
  }
}
```

**Use cases:**

- File system access
- Local database connections
- Custom MCP servers
- NPM-packaged MCP servers

**Process management:**

- Claude Code spawns and manages the process
- Communicates via stdin/stdout
- Terminates when Claude Code exits

### SSE (Server-Sent Events)

Connect to hosted MCP servers with OAuth support. Best for cloud services.

**Configuration:**

```json
{
  "hosted-service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

Hosted MCP URLs are provider-specific and can change over time. Treat example URLs in this skill as placeholders unless the provider's current docs give an exact endpoint to use.

**Use cases:**

- Official hosted MCP servers (Asana, GitHub, etc.)
- Cloud services with MCP endpoints
- OAuth-based authentication
- No local installation needed

**Authentication:**

- OAuth flows handled automatically
- User prompted on first use
- Tokens managed by Claude Code

### HTTP (MCP over HTTP)

Connect to MCP servers over HTTP with token authentication. The endpoint must implement MCP over HTTP; arbitrary REST endpoints are not MCP servers.

**Configuration:**

```json
{
  "api-service": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "X-Custom-Header": "value"
    }
  }
}
```

**Use cases:**

- Hosted MCP endpoints
- Token-based authentication
- Custom MCP backends
- Stateless interactions

## Environment Variable Expansion

All MCP configurations support environment variable substitution:

**${CLAUDE_PLUGIN_ROOT}** - Plugin directory (always use for portability):

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server"
}
```

**User environment variables** - From user's shell:

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}",
    "DATABASE_URL": "${DB_URL}"
  }
}
```

Env vars support fallback values: `${VAR:-default_value}`. If `VAR` is unset, `default_value` is used. Supported in `command`, `args`, `env`, `url`, and `headers` fields.

**Best practice:** Document all required environment variables in plugin README.

## MCP Tool Naming

When MCP servers provide tools, they're automatically named by server and tool:

**Format:** `mcp__<server-name>__<tool-name>`

**Example:**

- Server: `asana`
- Tool: `asana_create_task`
- **Full name:** `mcp__asana__asana_create_task`

## MCP Resources

MCP servers can expose resources that Claude can access using the `@` syntax:

### Resource Syntax

```
@server-name:protocol://path
```

**Examples:**

```
@filesystem:file:///Users/me/project/README.md
@database:postgres://localhost/mydb/users
@github:https://github.com/user/repo
```

### Using Resources in Prompts

Reference resources directly in your prompts:

```
Look at @filesystem:file:///path/to/config.json and suggest improvements
```

Claude will fetch the resource content and include it in context.

### Resource Types

- **file://** - Local file system paths
- **https://** - HTTP resources
- **Custom protocols** - Server-specific (postgres://, s3://, etc.)

## MCP Prompts as Commands

MCP servers can expose **prompts** that appear as slash commands in Claude Code:

**Format:** `/mcp__servername__promptname`

**Example:**

- Server `github` exposes prompt `create-pr`
- Available as: `/mcp__github__create-pr`

MCP prompts appear alongside regular commands in the `/` menu. They accept arguments and execute the server's prompt template with Claude. This enables MCP servers to provide guided workflows beyond simple tool calls.

**Plugin design note:** If your MCP server exposes prompts, document their names and expected arguments in your plugin README so users can discover them.

**Plugin-provided MCP prompts:** If your plugin bundles an MCP server, that server can expose prompts that automatically become slash commands for users. This provides guided workflows beyond simple tool calls — for example, a `/mcp__myserver__setup-project` prompt that walks users through project configuration.

## Tool Search

For MCP servers with many tools, use Tool Search to find relevant tools:

**When to use:**

- Server provides 10+ tools
- You don't know exact tool names
- Exploring server capabilities

**How it works:**

1. Claude Code indexes MCP tool names and descriptions
2. Search by natural language or partial names
3. Get filtered list of matching tools

### Default Behavior

MCP Tool Search is enabled by default. Claude Code can search MCP tool names and descriptions on demand instead of relying only on tools loaded into the immediate context.

**Plugin design implications:**

- **Many-tool servers**: Tools may not be immediately visible; use descriptive tool names and descriptions
- **Documentation**: Note tool search behavior in README if your server provides 20+ tools
- **Environment control**: use `ENABLE_TOOL_SEARCH=auto` for automatic threshold behavior or `ENABLE_TOOL_SEARCH=auto:N` for a custom threshold

This feature is automatic - just ask Claude about available tools or describe what you want to do.

### Using MCP Tools in Commands

Pre-allow specific MCP tools in command frontmatter:

```markdown
---
description: Create and search Asana tasks
allowed-tools:
  - mcp__asana__asana_create_task
  - mcp__asana__asana_search_tasks
---
```

**Wildcard (use sparingly):**

```markdown
---
description: Use Asana MCP tools for task management
allowed-tools:
  - mcp__asana__*
---
```

**Best practice:** Pre-allow specific tools, not wildcards, for security.

## Lifecycle Management

**Automatic startup:**

- MCP servers start when plugin enables
- Connection established before first tool use
- Restart required for configuration changes

**Lifecycle:**

1. Plugin loads
2. MCP configuration parsed
3. Server process started (stdio) or connection established (SSE/HTTP/WS)
4. Tools discovered and registered
5. Tools available as `mcp__<server-name>__<tool-name>`

**Viewing servers:**
Use `/mcp` command to see all servers including plugin-provided ones.

## Authentication Patterns

### OAuth (SSE/HTTP)

OAuth handled automatically by Claude Code:

```json
{
  "type": "sse",
  "url": "https://mcp.example.com/sse"
}
```

User authenticates in browser on first use. No additional configuration needed.

### Token-Based (Headers)

Static or environment variable tokens:

```json
{
  "type": "http",
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

Document required environment variables in README.

### Environment Variables (stdio)

Pass configuration to MCP server:

```json
{
  "command": "python",
  "args": ["-m", "my_mcp_server"],
  "env": {
    "DATABASE_URL": "${DB_URL}",
    "API_KEY": "${API_KEY}",
    "LOG_LEVEL": "info"
  }
}
```

## Integration Patterns

### Pattern 1: Simple Tool Wrapper

Commands use MCP tools with user interaction:

```markdown
# Command: create-item.md

---

allowed-tools: `mcp__inventory__create_item`

Steps:

1. Gather item details from user
2. Use `mcp__inventory__create_item`
3. Confirm creation
```

**Use for:** Adding validation or preprocessing before MCP calls.

### Pattern 2: Autonomous Agent

Agents use MCP tools autonomously:

```markdown
# Agent: data-analyzer.md

Analysis Process:

1. Query data via `mcp__database__query`
2. Process and analyze results
3. Generate insights report
```

**Use for:** Multi-step MCP workflows without user interaction.

### Pattern 3: Multi-Server Plugin

Integrate multiple MCP servers:

```json
{
  "source-control": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  },
  "issue-tracker": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

Use provider docs to replace these placeholders with current hosted endpoints.

**Use for:** Workflows spanning multiple services.

## Security Best Practices

### Use HTTPS

Always use secure connections for hosted MCP endpoints:

```text
✅ "url": "https://mcp.example.com/sse"
❌ "url": "http://mcp.example.com/sse"
```

### Token Management

**DO:**

- ✅ Use environment variables for tokens
- ✅ Document required env vars in README
- ✅ Let OAuth flow handle authentication

**DON'T:**

- ❌ Hardcode tokens in configuration
- ❌ Commit tokens to git
- ❌ Share tokens in documentation

### Permission Scoping

Pre-allow only necessary MCP tools:

```markdown
✅ allowed-tools: `mcp__api__read_data`, `mcp__api__create_item`

❌ allowed-tools: mcp__api__*
```

### Managed MCP Controls (Enterprise)

Organizations can control MCP server access through managed settings.

Place `managed-mcp.json` at the system-wide managed settings path for exclusive control over MCP server configuration. Alternatively, use allow/deny lists in managed settings:

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "@company/mcp-server"] },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "untrusted-server" }
  ]
}
```

**Matcher types:**

- `serverName` — Match by configured server name
- `serverCommand` — Match by exact command array
- `serverUrl` — Match by URL pattern (supports `*` wildcards)

These settings are configured by administrators and cannot be overridden by users or plugins.

## Claude Code as MCP Server

Claude Code can itself act as an MCP server, exposing its capabilities to other tools:

```bash
claude mcp serve
```

This enables other MCP-compatible clients to use Claude Code's tools. Useful for building tool chains where Claude Code is one component.

### Importing from Claude Desktop

Users who already have MCP servers configured in Claude Desktop can import them:

```bash
claude mcp add-from-claude-desktop
```

This copies MCP server configurations from Claude Desktop into Claude Code. Plugin developers should note that users may already have servers configured this way — avoid name conflicts with commonly used server names.

## Dynamic Tool Updates

MCP servers can notify Claude Code when their available tools change at runtime using the `list_changed` notification. This enables servers that dynamically add or remove tools based on context (e.g., loading project-specific tools after initialization). Claude Code automatically re-discovers tools when `list_changed` fires, without requiring a restart.

**Plugin design note:** If your MCP server's available tools depend on runtime state, implement `list_changed` to ensure Claude Code always has an up-to-date tool list.

## MCP Output Limits

MCP tool responses are subject to size limits:

- **Warning threshold**: 10,000 tokens
- **Default maximum**: 25,000 tokens (responses exceeding this are truncated)
- **Configuration**: Set `MAX_MCP_OUTPUT_TOKENS` environment variable to adjust the maximum

Design MCP tools to return concise, relevant data. Use pagination or filtering for large datasets.

## Error Handling

### Connection Failures

Handle MCP server unavailability:

- Provide fallback behavior in commands
- Inform user of connection issues
- Check server URL and configuration

### Tool Call Errors

Handle failed MCP operations:

- Validate inputs before calling MCP tools
- Provide clear error messages
- Check rate limiting and quotas

### Configuration Errors

Validate MCP configuration:

- Test server connectivity during development
- Validate JSON syntax
- Check required environment variables

## Performance Considerations

### Lazy Loading

MCP servers connect on-demand:

- Not all servers connect at startup
- First tool use triggers connection
- Connection pooling managed automatically

### Batching

Batch similar requests when possible:

```
# Good: Single query with filters
tasks = search_tasks(project="X", assignee="me", limit=50)

# Avoid: Many individual queries
for id in task_ids:
    task = get_task(id)
```

## Testing MCP Integration

### Local Testing

1. Configure MCP server in `.mcp.json`
2. Install plugin locally (`.claude-plugin/`)
3. Run `/mcp` to verify server appears
4. Test tool calls in commands
5. Check `claude --debug` logs for connection issues

### Validation Checklist

- [ ] MCP configuration is valid JSON
- [ ] Server URL is correct and accessible
- [ ] Required environment variables documented
- [ ] Tools appear in `/mcp` output
- [ ] Authentication works (OAuth or tokens)
- [ ] Tool calls succeed from commands
- [ ] Error cases handled gracefully

## MCP CLI Commands

For testing and managing MCP servers during development:

```bash
# Add servers
claude mcp add --transport stdio <name> -- <command> [args...]
claude mcp add --transport http <name> <url>
claude mcp add --transport http <name> <url> --header "Authorization: Bearer token"

# Manage servers
claude mcp list                    # List configured servers
claude mcp get <name>              # Show server details
claude mcp remove <name>           # Remove a server

# Advanced
claude mcp add-json <name> '<json>'           # Add from JSON config
claude mcp add-from-claude-desktop             # Import from Claude Desktop
claude mcp reset-project-choices               # Reset project MCP approval choices
```

Key flags: `--scope` (local/project/user), `--env KEY=value`, `--callback-port` (for OAuth).

## Debugging

### Enable Debug Logging

```bash
claude --debug
```

Look for:

- MCP server connection attempts
- Tool discovery logs
- Authentication flows
- Tool call errors

### Common Issues

**Server not connecting:**

- Check URL is correct
- Verify server is running (stdio)
- Check network connectivity
- Review authentication configuration

**Tools not available:**

- Verify server connected successfully
- Check tool names match exactly
- Run `/mcp` to see available tools
- Restart Claude Code after config changes

**Authentication failing:**

- Clear cached auth tokens
- Re-authenticate
- Check token scopes and permissions
- Verify environment variables set

## Quick Reference

### MCP Server Types

| Type  | Transport | Best For                    | Auth     |
| ----- | --------- | --------------------------- | -------- |
| stdio | Process   | Local tools, custom servers | Env vars |
| SSE   | HTTP      | Hosted services, cloud APIs | OAuth    |
| HTTP  | MCP over HTTP | Hosted MCP endpoints, token auth | Tokens   |

### Configuration Checklist

- [ ] Server type specified (stdio/SSE/HTTP or streamable-http)
- [ ] Type-specific fields complete (command or url)
- [ ] Authentication configured
- [ ] Environment variables documented
- [ ] HTTPS used for hosted MCP endpoints
- [ ] ${CLAUDE_PLUGIN_ROOT} used for paths

### Best Practices

**DO:**

- ✅ Use ${CLAUDE_PLUGIN_ROOT} for portable paths
- ✅ Document required environment variables
- ✅ Use secure connections (HTTPS for HTTP/SSE)
- ✅ Pre-allow specific MCP tools in commands
- ✅ Test MCP integration before publishing
- ✅ Handle connection and tool errors gracefully

**DON'T:**

- ❌ Hardcode absolute paths
- ❌ Commit credentials to git
- ❌ Use HTTP instead of HTTPS
- ❌ Pre-allow all tools with wildcards
- ❌ Skip error handling
- ❌ Forget to document setup

## Additional Resources

### Reference Files

For detailed information, consult:

- **`references/server-discovery.md`** - Find MCP servers using official docs, web search, and optional directories
- **`references/server-types.md`** - Deep dive on each server type
- **`references/authentication.md`** - Authentication patterns and OAuth
- **`references/tool-usage.md`** - Using MCP tools in commands and agents

### Example Configurations

Working examples in `examples/`:

- **`stdio-server.json`** - Local stdio MCP server
- **`sse-server.json`** - Hosted SSE server with OAuth
- **`http-server.json`** - HTTP MCP endpoint with token auth

`ws-server.json` is retained only as an unsupported-transport note because WebSocket is not a documented Claude Code MCP transport.

### External Resources

- **Official MCP Docs**: <https://modelcontextprotocol.io/>
- **Claude Code MCP Docs**: <https://code.claude.com/docs/en/mcp>
- **MCP SDK**: @modelcontextprotocol/sdk
- **Testing**: Use `claude --debug` and `/mcp` command

## Implementation Workflow

To add MCP integration to a plugin:

1. Choose MCP server type (stdio, SSE, HTTP/streamable HTTP)
2. Create `.mcp.json` at plugin root with configuration
3. Use ${CLAUDE_PLUGIN_ROOT} for all file references
4. Document required environment variables in README
5. Test locally with `/mcp` command
6. Pre-allow MCP tools in relevant commands
7. Handle authentication (OAuth or tokens)
8. Test error cases (connection failures, auth errors)
9. Document MCP integration in plugin README

Focus on stdio for custom/local servers, SSE for hosted services with OAuth.
