# MCP Server Discovery

Discover MCP servers for plugin integration using official documentation, Claude Code/web search tools, and optional directories such as PulseMCP.

## Discovery Method

Start with official and broadly available sources before optional directories.

### Step 1: Search official docs and the web

Use available Claude Code web search or fetch tools to search for `[service] MCP server`, `[service] Claude Code MCP`, and the service's official integration docs. Prefer official servers and documented Claude Code configuration examples when available.

**URL patterns:**

| Purpose        | URL                                                                    |
| -------------- | ---------------------------------------------------------------------- |
| Basic search   | `https://www.pulsemcp.com/servers?q=[keyword]`                         |
| By popularity  | `https://www.pulsemcp.com/servers?q=[keyword]&sort=popular-desc`       |
| Official only  | `https://www.pulsemcp.com/servers?q=[keyword]&classification=official` |
| Server details | `https://www.pulsemcp.com/servers/[slug]`                              |

**Search keywords:**

- Service names: `notion`, `github`, `slack`, `postgres`
- Categories: `database`, `api`, `file`, `memory`, `browser`
- Combined: `vector database`, `project management`

### Step 2: Parse Results

Extract from search results:

| Field              | Description        | Use For           |
| ------------------ | ------------------ | ----------------- |
| Server name        | Display name       | User presentation |
| Provider           | Company/author     | Trust signal      |
| Description        | Brief summary      | Feature matching  |
| Classification     | official/community | Quality signal    |
| Downloads/visitors | Weekly estimates   | Popularity signal |
| Slug               | URL segment        | Detail page fetch |

**Example parsed entry:**

```
Name: DBHub (Universal Database Gateway)
Provider: Bytebase
Description: Universal database gateway for PostgreSQL, MySQL, SQLite, DuckDB
Classification: official
Downloads: 6.7k/week
Slug: bytebase-dbhub
```

### Step 3: Evaluate and Recommend

Recommend servers based on:

1. **Relevance** - Description matches user's needs
2. **Classification** - Prefer `official` over `community`
3. **Popularity** - Higher downloads indicate stability
4. **Recency** - Recent releases suggest active maintenance

Present top 3-5 matches with key differentiators.

### Step 4: Fetch Details (Optional)

For servers the user wants to integrate, fetch the official docs, repository README, or optional directory detail page:

Extract from detail page:

- GitHub repository URL and stars
- Full description
- server.json availability (for standardized config)
- Related servers (alternatives)

## Quick Reference: Top MCP Servers

Curated recommendations for common use cases. Use live search for comprehensive results.

### Databases

| Server                | Provider | Type  | Best For                                                 |
| --------------------- | -------- | ----- | -------------------------------------------------------- |
| Toolbox for Databases | Google   | stdio | Multi-DB (PostgreSQL, MySQL, SQL Server, Neo4j, Spanner) |
| DBHub                 | Bytebase | stdio | Universal gateway (PostgreSQL, MySQL, SQLite, DuckDB)    |
| Context7              | Upstash  | stdio | Documentation/library lookup                             |

### Productivity

| Server | Provider | Type | Best For                |
| ------ | -------- | ---- | ----------------------- |
| Notion | Notion   | SSE  | Workspace integration   |
| Asana  | Asana    | SSE  | Task/project management |
| Slack  | Slack    | SSE  | Team communication      |
| Linear | Linear   | SSE  | Issue tracking          |

### Developer Tools

| Server     | Provider  | Type  | Best For                           |
| ---------- | --------- | ----- | ---------------------------------- |
| GitHub     | GitHub    | SSE   | Repository management, PRs, issues |
| GitLab     | GitLab    | SSE   | GitLab repositories and CI/CD      |
| Playwright | Microsoft | stdio | Browser automation, testing        |

### Cloud & Infrastructure

| Server     | Provider  | Type  | Best For               |
| ---------- | --------- | ----- | ---------------------- |
| AWS        | AWS       | stdio | AWS service management |
| Kubernetes | Community | stdio | K8s cluster operations |
| Docker     | Community | stdio | Container management   |

### AI & Search

| Server     | Provider   | Type  | Best For                  |
| ---------- | ---------- | ----- | ------------------------- |
| Tavily     | Tavily     | stdio | Web search and extraction |
| Perplexity | Perplexity | SSE   | AI-powered search         |
| Memory     | Various    | stdio | Conversation memory/RAG   |

### File & Storage

| Server       | Provider  | Type  | Best For          |
| ------------ | --------- | ----- | ----------------- |
| Filesystem   | Anthropic | stdio | Local file access |
| Google Drive | Google    | SSE   | Cloud storage     |
| S3           | AWS       | stdio | Object storage    |

## Integration Workflow

After discovering a server:

1. **Check server type** - stdio (local), SSE (hosted), or HTTP/streamable HTTP
2. **Get installation info** - Fetch detail page for GitHub README
3. **Determine auth method** - OAuth (SSE), tokens (HTTP), env vars (stdio)
4. **Generate configuration** - Create `.mcp.json` entry

**Example workflow:**

```
User: "I need an MCP server for Notion"

1. Search official Notion MCP documentation and optionally cross-check PulseMCP
2. Find: Notion (official SSE server)
3. Recommend: Official Notion MCP with OAuth
4. Configure using the current endpoint from Notion's docs (hosted MCP URLs change over time):
   {
     "notion": {
       "type": "sse",
       "url": "https://mcp.example.com/sse"
     }
   }
```

## Optional PulseMCP Discovery

PulseMCP can be useful for community discovery after checking official sources. Use WebSearch/WebFetch or any available browser/search tool:

```
Tool: WebFetch
URL: https://www.pulsemcp.com/servers?q=[keyword]
Prompt: List MCP servers matching "[keyword]" with name, description, classification, and slug
```

## PulseMCP MCP Server (Optional)

For plugins needing programmatic community server discovery, the PulseMCP MCP server may be useful:

```json
{
  "pulsemcp": {
    "command": "npx",
    "args": ["-y", "pulsemcp-server"]
  }
}
```

**Tools provided:**

- `list_servers` - Search/filter servers with pagination
- `list_integrations` - List all integration categories

Use only when building plugins that specifically help users discover and configure MCP servers; do not require it for ordinary MCP integration work.
