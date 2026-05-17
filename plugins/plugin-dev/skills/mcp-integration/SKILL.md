---
name: mcp-integration
description: 当用户要求 "add MCP server"、"integrate MCP"、"configure MCP in plugin"，明确提到 "use .mcp.json"、"set up Model Context Protocol"、"connect external service"、"${CLAUDE_PLUGIN_ROOT} with MCP"，或讨论 Model Context Protocol、`.mcp.json`、`${CLAUDE_PLUGIN_ROOT}`、stdio、SSE、HTTP、`MCP prompts`、`allowedMcpServers`、`deniedMcpServers`、`managed MCP`、`MCP prompts as commands`、`tool search`、`tool search threshold`、`claude mcp serve`，以及询问 "find MCP server"、"discover MCP servers"、"what MCP servers exist"、"recommend MCP server for [service]" 时使用。
---

# Claude Code 插件的 MCP 集成

## 概述

Model Context Protocol (MCP) 让 Claude Code 插件能通过结构化的 tool 访问方式集成外部服务和 API。通过 MCP 集成，可以把外部服务能力作为 Claude Code 内的 tools 暴露出来。

**关键能力：**

- 连接外部服务（数据库、API、文件系统）
- 从单个服务提供 10+ 个相关 tools
- 处理 OAuth 和复杂认证流程
- 将 MCP server 与插件一起打包，实现自动设置

## MCP Server 配置方式

插件可以通过两种方式打包 MCP server：

### 方式 1：专用 `.mcp.json`（推荐）

在插件根目录创建 `.mcp.json`：

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

**优点：**

- 职责分离更清晰
- 更易维护
- 更适合多个 server

### 方式 2：内联到 plugin.json

在 `plugin.json` 中添加 `mcpServers` 字段：

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

**优点：**

- 单一配置文件
- 适合简单的单 server 插件

### MCP Scope 体系

MCP server 配置遵循 scope 优先级：Local > Project > User。

| Scope   | 存储位置                        | 共享范围             | 最适合                           |
| ------- | ------------------------------ | -------------------- | -------------------------------- |
| Local   | `~/.claude.json`（project 路径） | 私有，仅当前项目     | 实验性配置、敏感 credentials     |
| Project | 项目根目录中的 `.mcp.json`      | 通过版本控制共享     | 团队共享、项目特定配置           |
| User    | `~/.claude.json`（全局）        | 所有项目             | 个人工具、跨项目复用             |

通过 `.mcp.json` 或 `plugin.json` 内联方式打包的 MCP server，会在插件启用时自动启动。它们会与 user/project 级 MCP 配置一起生效；如果用户已经配置了同名 server，则由 scope 优先级决定最终加载哪一个。

## 发现 MCP Server

可通过查看官方服务文档、Anthropic/Claude Code 的 MCP 指南，以及通用 web 搜索来寻找现成的 MCP server。若你想扩大社区发现范围，PulseMCP 可作为有用的可选目录。

**发现流程：**

1. 使用可用的 Claude Code web search/fetch 工具，在官方文档或 web 上搜索 "[service] MCP server"
2. 优先选择官方或维护良好的 server，而不是零散的社区项目
3. 可选地检查 PulseMCP，以获得更广泛的发现和替代方案
4. 根据 server 类型生成 `.mcp.json` 配置

**参见 `references/server-discovery.md`**，获取更详细的 发现指南，以及按类别整理的 server 推荐。

## MCP Server 类型

### stdio（本地进程）

以子进程方式执行本地 MCP server。最适合本地工具和自定义 server。

**配置：**

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

**适用场景：**

- 文件系统访问
- 本地数据库连接
- 自定义 MCP server
- 以 NPM 打包的 MCP server

**进程管理：**

- Claude Code 负责启动并管理进程
- 通过 stdin/stdout 通信
- Claude Code 退出时终止

### SSE（Server-Sent Events）

连接带有 OAuth 支持的托管 MCP server。最适合云服务。

**配置：**

```json
{
  "hosted-service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

托管 MCP URL 具有 provider 特异性，并且可能会随时间变化。除非 provider 当前文档给出了明确 endpoint，否则本技能中的示例 URL 都应视为占位符。

**适用场景：**

- 官方托管的 MCP server（Asana、GitHub 等）
- 带 MCP endpoint 的云服务
- 基于 OAuth 的认证
- 无需本地安装

**认证：**

- OAuth 流程 由 Claude Code 自动处理
- 首次使用时提示用户
- token 由 Claude Code 管理

### HTTP (MCP over HTTP)

通过 HTTP 连接 MCP server，并使用 token 认证。该 endpoint 必须实现 MCP over HTTP；任意 REST endpoint 都不是 MCP server。

**配置：**

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

**适用场景：**

- 托管的 MCP endpoint
- 基于 token 的认证
- 自定义 MCP backend
- 无状态交互

## 环境变量展开

所有 MCP 配置都支持环境变量替换：

**${CLAUDE_PLUGIN_ROOT}** - plugin 目录（为保证可移植性应始终使用）：

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server"
}
```

**用户环境变量** - 来自用户 shell：

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}",
    "DATABASE_URL": "${DB_URL}"
  }
}
```

环境变量支持 fallback 值：`${VAR:-default_value}`。如果 `VAR` 未设置，则使用 `default_value`。这适用于 `command`、`args`、`env`、`url` 和 `headers` 字段。

**最佳实践：** 在插件 README 中记录所有必需的环境变量。

## MCP Tool 命名

当 MCP server 提供 tools 时，Claude Code 会按 server 和 tool 自动命名：

**格式：** `mcp__<server-name>__<tool-name>`

**示例：**

- Server: `asana`
- Tool: `asana_create_task`
- **完整名称:** `mcp__asana__asana_create_task`

## MCP Resources

MCP server 也可以暴露 resource，Claude 可使用 `@` 语法访问：

### Resource 语法

```
@server-name:protocol://path
```

**示例：**

```
@filesystem:file:///Users/me/project/README.md
@database:postgres://localhost/mydb/users
@github:https://github.com/user/repo
```

### 在 Prompt 中使用 Resource

可直接在 prompt 中引用 resource：

```
Look at @filesystem:file:///path/to/config.json and suggest improvements
```

Claude 会抓取 resource 内容并将其纳入上下文。

### Resource 类型

- **file://** - 本地文件系统路径
- **https://** - HTTP resource
- **自定义协议** - server 特定协议（postgres://、s3:// 等）

## 将 MCP Prompts 作为 Commands

MCP server 可以暴露 **prompts**，它们会在 Claude Code 中显示为 slash commands：

**格式：** `/mcp__servername__promptname`

**示例：**

- server `github` 暴露 prompt `create-pr`
- 可用形式：`/mcp__github__create-pr`

MCP prompts 会与常规 command 一起出现在 `/` 菜单中。它们可以接收参数，并用 Claude 执行 server 侧的 prompt 模板。这使 MCP server 除了简单的 tool call 之外，还能提供引导式工作流。

**插件设计说明：** 如果你的 MCP server 暴露了 prompts，请在插件 README 中记录它们的名称和预期参数，方便用户发现。

**插件提供的 MCP prompts：** 如果你的插件打包了一个 MCP server，该 server 暴露的 prompts 会自动成为用户可用的 slash commands。这能提供超出简单 tool call 的引导式工作流，例如 `/mcp__myserver__setup-project` 这样的 prompt，用于引导用户完成项目配置。

## Tool Search

对于拥有大量 tools 的 MCP server，可使用 Tool Search 查找相关工具：

**适用场景：**

- server 提供 10+ 个 tools
- 你不知道确切的 tool name
- 正在探索 server 能力

**工作方式：**

1. Claude Code 会为 MCP tool name 和 description 建立索引
2. 可按自然语言或部分名称搜索
3. 返回过滤后的匹配 tool 列表

### 默认行为

MCP Tool Search 默认启用。Claude Code 可以按需搜索 MCP tool name 和 description，而不只依赖当前上下文中已加载的 tools。

**插件设计影响：**

- **多 tool server：** tools 可能不会立刻可见，因此要使用描述性强的 tool name 和 description
- **文档：** 如果 server 提供 20+ 个 tools，应在 README 中说明 tool search 行为
- **环境控制：** 使用 `ENABLE_TOOL_SEARCH=auto` 获得自动阈值行为，或使用 `ENABLE_TOOL_SEARCH=auto:N` 自定义阈值

这个特性是自动生效的——只需直接询问 Claude 可用 tools，或描述你想完成的事情即可。

### 在 Commands 中使用 MCP Tools

可在 command frontmatter 中预先 allow 特定 MCP tools：

```markdown
---
description: Create and search Asana tasks
allowed-tools:
  - mcp__asana__asana_create_task
  - mcp__asana__asana_search_tasks
---
```

**Wildcard（谨慎使用）：**

```markdown
---
description: Use Asana MCP tools for task management
allowed-tools:
  - mcp__asana__*
---
```

**最佳实践：** 为了安全性，优先预先 allow 特定 tools，而不是 wildcard。

## 生命周期管理

**自动启动：**

- 插件启用时启动 MCP server
- 首次 tool 使用前建立连接
- 配置变更后需要重启

**生命周期：**

1. 插件加载
2. 解析 MCP 配置
3. 启动 server 进程（stdio）或建立连接（SSE/HTTP/WS）
4. 发现并注册 tools
5. tools 以 `mcp__<server-name>__<tool-name>` 形式可用

**查看 servers：**
使用 `/mcp` command 查看所有 server，包括 插件提供的 server。

## 认证模式

### OAuth（SSE/HTTP）

OAuth 由 Claude Code 自动处理：

```json
{
  "type": "sse",
  "url": "https://mcp.example.com/sse"
}
```

用户首次使用时会在浏览器中认证。无需额外配置。

### 基于 Token 的方式（Headers）

静态 token 或环境变量 token：

```json
{
  "type": "http",
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

请在 README 中记录所需环境变量。

### 环境变量（stdio）

向 MCP server 传递配置：

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

## 集成模式

### 模式 1：简单 Tool 包装器

command 通过用户交互来使用 MCP tools：

```markdown
# Command: create-item.md

---

allowed-tools: `mcp__inventory__create_item`

Steps:

1. Gather item details from user
2. Use `mcp__inventory__create_item`
3. Confirm creation
```

**适用于:** 在 MCP call 前增加验证或预处理。

### 模式 2：自主 Agent

agent 自主使用 MCP tools：

```markdown
# Agent: data-analyzer.md

Analysis Process:

1. Query data via `mcp__database__query`
2. Process and analyze results
3. Generate insights report
```

**适用于:** 无需用户交互的多步 MCP 工作流。

### 模式 3：多 Server 插件

集成多个 MCP server：

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

应使用 provider 文档把这些占位符替换为当前托管 endpoint。

**适用于:** 跨多个服务的 工作流。

## 安全最佳实践

### 使用 HTTPS

对于托管的 MCP endpoint，始终使用安全连接：

```text
✅ "url": "https://mcp.example.com/sse"
❌ "url": "http://mcp.example.com/sse"
```

### Token 管理

**应该做：**

- ✅ 对 token 使用环境变量
- ✅ 在 README 中记录必需 环境变量
- ✅ 让 OAuth 流程处理认证

**不应该做：**

- ❌ 在配置中硬编码 token
- ❌ 将 token 提交到 git
- ❌ 在文档中共享 token

### 权限范围控制

只预先 allow 必要的 MCP tools：

```markdown
✅ allowed-tools: `mcp__api__read_data`, `mcp__api__create_item`

❌ allowed-tools: mcp__api__*
```

### 托管 MCP 控制（Enterprise）

组织可通过 managed settings 控制 MCP server 访问。

将 `managed-mcp.json` 放在系统级 managed settings 路径下，可对 MCP server 配置实施独占控制。或者，也可以在 managed settings 中使用 allow/deny list：

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

**匹配器类型:**

- `serverName` — 按已配置的 server name 匹配
- `serverCommand` — 按精确 command 数组匹配
- `serverUrl` — 按 URL 模式匹配（支持 `*` 通配符）

这些设置由管理员配置，用户和 plugin 都无法覆盖。

## 将 Claude Code 作为 MCP Server

Claude Code 本身也可以作为一个 MCP server，对外暴露自己的能力：

```bash
claude mcp serve
```

这样其他兼容 MCP 的 client 就能使用 Claude Code 的 tools。它适合构建以 Claude Code 为其中一个组成部分的工具链。

### 从 Claude Desktop 导入

已经在 Claude Desktop 中配置过 MCP server 的用户，可以直接导入：

```bash
claude mcp add-from-claude-desktop
```

该命令会把 Claude Desktop 中的 MCP server 配置复制到 Claude Code。plugin 开发者需要注意，用户可能已经以这种方式配置过 server，因此应避免与常见 server name 冲突。

## 动态 Tool 更新

MCP server 可以在运行时通过 `list_changed` notification 通知 Claude Code 它的可用 tools 发生了变化。这使 server 能根据上下文动态增加或移除 tools（例如初始化后加载项目特定 tools）。当 `list_changed` 触发时，Claude Code 会自动重新发现 tools，无需重启。

**插件设计说明:** 如果你的 MCP server 可用 tools 依赖运行时状态，请实现 `list_changed`，以确保 Claude Code 始终持有最新的 tool 列表。

## MCP 输出限制

MCP tool 响应受大小限制：

- **警告阈值**: 10,000 tokens
- **默认最大值**: 25,000 tokens（超过该值的响应会被截断）
- **配置**: 设置 `MAX_MCP_OUTPUT_TOKENS` 环境变量可调整最大值

设计 MCP tools 时，应返回简洁且相关的数据。对于大型数据集，请使用分页或过滤。

## 错误处理

### 连接失败

处理 MCP server 不可用的情况：

- 在 command 中提供 fallback 行为
- 向用户说明连接问题
- 检查 server URL 和配置

### Tool 调用错误

处理失败的 MCP 操作：

- 调用 MCP tools 前先验证输入
- 提供清晰错误信息
- 检查 rate limiting 和配额

### 配置错误

验证 MCP 配置：

- 在开发期间测试 server 连通性
- 验证 JSON 语法
- 检查必需环境变量

## 性能注意事项

### 延迟加载

MCP server 按需连接：

- 不是所有 server 都会在启动时连接
- 首次 tool 使用会触发连接
- 连接池由 Claude Code 自动管理

### 批处理

可行时对相似请求进行批处理：

```
# Good: Single query with filters
tasks = search_tasks(project="X", assignee="me", limit=50)

# Avoid: Many individual queries
for id in task_ids:
    task = get_task(id)
```

## 测试 MCP 集成

### 本地测试

1. 在 `.mcp.json` 中配置 MCP server
2. 在本地安装 plugin（`.claude-plugin/`）
3. 运行 `/mcp` 验证 server 是否出现
4. 测试 command 中的 tool calls
5. 检查 `claude --debug` 日志中的连接问题

### 验证清单

- [ ] MCP 配置是有效 JSON
- [ ] Server URL 正确且可访问
- [ ] 必需环境变量已记录
- [ ] tools 出现在 `/mcp` 输出中
- [ ] 认证正常（OAuth 或 tokens）
- [ ] tool calls 可从 commands 成功执行
- [ ] 已优雅处理错误场景

## MCP CLI 命令

用于开发期间测试和管理 MCP server：

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

关键 flags：`--scope`（local/project/user）、`--env KEY=value`、`--callback-port`（用于 OAuth）。

## 调试

### 启用 Debug 日志

```bash
claude --debug
```

关注以下内容：

- MCP server 连接尝试
- tool 发现日志
- 认证流程
- tool 调用错误

### 常见问题

**Server 无法连接:**

- 检查 URL 是否正确
- 验证 server 是否正在运行（stdio）
- 检查网络连通性
- 查看认证配置

**Tools 不可用:**

- 验证 server 已成功连接
- 检查 tool name 是否完全匹配
- 运行 `/mcp` 查看可用 tools
- 配置修改后重启 Claude Code

**认证失败:**

- 清除缓存的 auth tokens
- 重新认证
- 检查 token scopes 和权限
- 验证环境变量已设置

## 快速参考

### MCP Server 类型

| 类型 | Transport | 更适合 | 认证 |
| ----- | --------- | --------------------------- | -------- |
| stdio | 进程 | 本地 tools、自定义 servers | 环境变量 |
| SSE | HTTP | 托管服务、云 API | OAuth |
| HTTP | MCP over HTTP | 托管 MCP endpoints、token auth | Tokens |

### 配置清单

- [ ] 已指定 server 类型（stdio/SSE/HTTP 或 streamable-http）
- [ ] 类型特定字段已补全（command 或 url）
- [ ] 认证已配置
- [ ] 环境变量已记录
- [ ] 托管 MCP endpoint 使用 HTTPS
- [ ] 路径使用 ${CLAUDE_PLUGIN_ROOT}

### 最佳实践

**应该做：**

- ✅ 使用 ${CLAUDE_PLUGIN_ROOT} 以获得可移植路径
- ✅ 记录所需环境变量
- ✅ 使用安全连接（HTTP/SSE 使用 HTTPS）
- ✅ 在 command 中预先 allow 特定 MCP tools
- ✅ 发布前测试 MCP 集成
- ✅ 优雅处理连接和 tool 错误

**不应该做：**

- ❌ 硬编码绝对路径
- ❌ 将 credentials 提交到 git
- ❌ 用 HTTP 代替 HTTPS
- ❌ 用 wildcard 预先 allow 所有 tools
- ❌ 跳过错误处理
- ❌ 忘记记录设置

## 其他资源

### 参考文件

如需详细信息，请参考：

- **`references/server-discovery.md`** - 使用官方文档、web search 和可选目录发现 MCP server
- **`references/server-types.md`** - 各类 server 的深入说明
- **`references/authentication.md`** - 认证模式与 OAuth
- **`references/tool-usage.md`** - 在 commands 和 agents 中使用 MCP tools

### 示例配置

`examples/` 中提供可工作的示例：

- **`stdio-server.json`** - 本地 stdio MCP server
- **`sse-server.json`** - 带 OAuth 的托管 SSE server
- **`http-server.json`** - 带 token auth 的 HTTP MCP endpoint

`ws-server.json` 仅保留为 不支持的 transport 说明，因为 WebSocket 不是 Claude Code 已文档化支持的 MCP transport。

### 外部资源

- **官方 MCP 文档**: <https://modelcontextprotocol.io/>
- **Claude Code MCP 文档**: <https://code.claude.com/docs/en/mcp>
- **MCP SDK**: @modelcontextprotocol/sdk
- **测试**: 使用 `claude --debug` 和 `/mcp` command

## 实现工作流

向插件添加 MCP 集成 时：

1. 选择 MCP server 类型（stdio、SSE、HTTP/streamable HTTP）
2. 在插件根目录创建 `.mcp.json` 并写入配置
3. 所有文件引用都使用 ${CLAUDE_PLUGIN_ROOT}
4. 在 README 中记录必需环境变量
5. 使用 `/mcp` command 本地测试
6. 在相关 command 中预先 allow MCP tools
7. 处理认证（OAuth 或 tokens）
8. 测试错误场景（连接失败、auth 错误）
9. 在插件 README 中记录 MCP 集成

对于自定义/本地 server，重点考虑 stdio；对于带 OAuth 的托管服务，重点考虑 SSE。
