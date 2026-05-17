# MCP Server 发现

通过官方文档、Claude Code/web 搜索工具，以及 PulseMCP 等可选目录，为插件集成发现 MCP server。

## 发现方法

优先从官方和广泛可获取的来源开始，再考虑可选目录。

### 第 1 步：搜索官方文档和 web

使用可用的 Claude Code web search 或 fetch 工具，搜索 `[service] MCP server`、`[service] Claude Code MCP` 以及该服务的官方集成文档。若有可用选项，优先选择官方 server 和已有文档说明的 Claude Code 配置示例。

**URL 模式：**

| 用途        | URL                                                                    |
| ----------- | ---------------------------------------------------------------------- |
| 基础搜索    | `https://www.pulsemcp.com/servers?q=[keyword]`                         |
| 按热度排序  | `https://www.pulsemcp.com/servers?q=[keyword]&sort=popular-desc`       |
| 仅官方      | `https://www.pulsemcp.com/servers?q=[keyword]&classification=official` |
| server 详情 | `https://www.pulsemcp.com/servers/[slug]`                              |

**搜索关键词：**

- 服务名称：`notion`、`github`、`slack`、`postgres`
- 类别：`database`、`api`、`file`、`memory`、`browser`
- 组合关键词：`vector database`、`project management`

### 第 2 步：解析结果

从搜索结果中提取：

| 字段名 | 说明 | 用途 |
| --- | --- | --- |
| Server 名称 | 展示名称 | 用户呈现 |
| Provider | 公司/作者 | 可信度信号 |
| Description | 简要摘要 | 功能匹配 |
| Classification | official/community | 质量信号 |
| Downloads/visitors | 每周估算 | 热度信号 |
| Slug | URL 片段 | 抓取详情页 |

**解析示例：**

```
Name: DBHub (Universal Database Gateway)
Provider: Bytebase
Description: Universal database gateway for PostgreSQL, MySQL, SQLite, DuckDB
Classification: official
Downloads: 6.7k/week
Slug: bytebase-dbhub
```

### 第 3 步：评估并推荐

基于以下因素推荐 server：

1. **相关性** - 描述与用户需求匹配
2. **分类** - 优先 `official` 而不是 `community`
3. **热度** - 更高的下载量通常意味着更稳定
4. **近期活跃度** - 最近有发布通常意味着仍在积极维护

给出 3-5 个最佳匹配，并说明关键差异点。

### 第 4 步：抓取详情（可选）

对于用户想集成的 server，抓取官方文档、仓库 README，或可选目录中的详情页：

从详情页提取：

- GitHub repository URL 和 stars
- 完整描述
- `server.json` 是否可用（用于标准化配置）
- 相关 server（替代方案）

## 快速参考：热门 MCP Servers

这是针对常见用例整理的推荐列表。若需要更完整结果，请使用实时搜索。

### 数据库

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| Toolbox for Databases | Google | stdio | 多数据库场景（PostgreSQL、MySQL、SQL Server、Neo4j、Spanner） |
| DBHub | Bytebase | stdio | 通用网关（PostgreSQL、MySQL、SQLite、DuckDB） |
| Context7 | Upstash | stdio | 文档/库查询 |

### 生产力工具

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| Notion | Notion | SSE | Workspace 集成 |
| Asana | Asana | SSE | 任务/项目管理 |
| Slack | Slack | SSE | 团队沟通 |
| Linear | Linear | SSE | 问题跟踪 |

### 开发工具

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| GitHub | GitHub | SSE | 仓库管理、PR、issues |
| GitLab | GitLab | SSE | GitLab 仓库与 CI/CD |
| Playwright | Microsoft | stdio | 浏览器自动化、测试 |

### 云与基础设施

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| AWS | AWS | stdio | AWS 服务管理 |
| Kubernetes | Community | stdio | K8s 集群操作 |
| Docker | Community | stdio | 容器管理 |

### AI 与搜索

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| Tavily | Tavily | stdio | Web 搜索与内容提取 |
| Perplexity | Perplexity | SSE | AI 驱动搜索 |
| Memory | Various | stdio | 对话记忆/RAG |

### 文件与存储

| Server | Provider | 类型 | 更适合 |
| --- | --- | --- | --- |
| Filesystem | Anthropic | stdio | 本地文件访问 |
| Google Drive | Google | SSE | 云存储 |
| S3 | AWS | stdio | 对象存储 |

## 集成流程

发现某个 server 之后：

1. **检查 server 类型** - stdio（本地）、SSE（托管）或 HTTP/streamable HTTP
2. **获取安装信息** - 抓取详情页或 GitHub README
3. **确定认证方式** - OAuth（SSE）、tokens（HTTP）、环境变量（stdio）
4. **生成配置** - 创建 `.mcp.json` 条目

**示例流程：**

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

## 可选的 PulseMCP 发现

在检查过官方来源之后，PulseMCP 可作为发现社区 server 的有用补充。可使用 WebSearch/WebFetch 或任何可用的 浏览器/搜索工具：

```
Tool: WebFetch
URL: https://www.pulsemcp.com/servers?q=[keyword]
Prompt: List MCP servers matching "[keyword]" with name, description, classification, and slug
```

## PulseMCP MCP Server（可选）

对于需要以编程方式发现社区 server 的插件，PulseMCP MCP server 可能会有帮助：

```json
{
  "pulsemcp": {
    "command": "npx",
    "args": ["-y", "pulsemcp-server"]
  }
}
```

**提供的 tools：**

- `list_servers` - 支持分页的 server 搜索/过滤
- `list_integrations` - 列出所有 集成类别

只有当你在构建专门帮助用户发现和配置 MCP server 的插件时才使用它；普通的 MCP 集成工作不应依赖它。
