# MCP Server 类型：深入解析

Claude Code 插件 支持的所有 MCP server 类型的完整参考。

## stdio（标准输入/输出）

### 概述

以子进程方式执行本地 MCP server，并通过 stdin/stdout 通信。最适合本地工具、自定义 server 和 NPM 包。

### 配置

**基础：**

```json
{
  "my-server": {
    "command": "npx",
    "args": ["-y", "my-mcp-server"]
  }
}
```

**带环境变量：**

```json
{
  "my-server": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/custom-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "API_KEY": "${MY_API_KEY}",
      "LOG_LEVEL": "debug",
      "DATABASE_URL": "${DB_URL}"
    }
  }
}
```

### 进程生命周期

1. **启动**：Claude Code 使用 `command` 和 `args` 启动进程
2. **通信**：通过 stdin/stdout 传递 JSON-RPC 消息
3. **生命周期**：进程在整个 Claude Code session 期间持续运行
4. **关闭**：Claude Code 退出时终止该进程

### 适用场景

**NPM 包：**

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
  }
}
```

**自定义脚本：**

```json
{
  "custom": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server.js",
    "args": ["--verbose"]
  }
}
```

**Python servers：**

```json
{
  "python-server": {
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "env": {
      "PYTHONUNBUFFERED": "1"
    }
  }
}
```

### 最佳实践

1. **使用绝对路径或 ${CLAUDE_PLUGIN_ROOT}**
2. **为 Python server 设置 PYTHONUNBUFFERED**
3. **通过 args 或 env 传递配置，而不是 stdin**
4. **优雅处理 server 崩溃**
5. **记录到 stderr，而不是 stdout（stdout 用于 MCP protocol）**

### 故障排查

**Server 无法启动：**

- 检查 command 是否存在且可执行
- 确认文件路径正确
- 检查权限
- 查看 `claude --debug` 日志

**通信失败：**

- 确保 server 正确使用 stdin/stdout
- 检查是否存在多余的 print/console.log 语句
- 验证 JSON-RPC 格式

## SSE（Server-Sent Events）

### 概述

通过 HTTP 连接托管的 MCP server，并使用 server-sent events 进行流式传输。最适合 云服务和 OAuth 认证。

### 配置

**基础：**

```json
{
  "hosted-service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

**带 headers：**

```json
{
  "service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse",
    "headers": {
      "X-API-Version": "v1",
      "X-Client-ID": "${CLIENT_ID}"
    }
  }
}
```

### 连接生命周期

1. **初始化**：与 URL 建立 HTTP 连接
2. **握手**：执行 MCP protocol 协商
3. **流式传输**：server 通过 SSE 发送事件
4. **请求**：client 通过 HTTP POST 发送 tool calls
5. **重连**：断开后自动重连

### 认证

**OAuth（自动）：**

```json
{
  "asana": {
    "type": "sse",
    "url": "https://mcp.asana.com/sse"
  }
}
```

Claude Code 会处理 OAuth 流程：

1. 首次使用时提示用户进行认证
2. 打开浏览器执行 OAuth 流程
3. 安全存储 tokens
4. 自动刷新 token

**自定义 headers：**

```json
{
  "service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

### 适用场景

**官方服务：**

- Asana：请在 Asana 文档中确认当前托管的 MCP endpoint
- GitHub：请在 GitHub 文档中确认当前托管的 MCP endpoint
- 其他托管型 MCP server

托管 MCP URL 可能会随时间变化，因此发布插件配置前，应将各 provider 的 endpoint 仅视为示例，并在 provider 文档中核实准确的 URL 和 认证流程。

**自定义托管 server：**
部署你自己的 MCP server，并通过 HTTPS + SSE 暴露出来。

### 最佳实践

1. **始终使用 HTTPS，不要使用 HTTP**
2. **在可用时优先让 OAuth 处理认证**
3. **使用环境变量保存 token**
4. **优雅处理连接失败**
5. **记录所需的 OAuth scopes**

### 故障排查

**连接被拒绝:**

- 检查 URL 是否正确且可访问
- 验证 HTTPS 证书有效
- 检查网络连通性
- 查看防火墙设置

**OAuth 失败:**

- 清除缓存的 tokens
- 检查 OAuth scopes
- 验证 redirect URL
- 重新认证

## HTTP (MCP over HTTP)

### 概述

通过 HTTP 连接 MCP server。最适合带有 基于 token 的认证 且交互无状态的托管 MCP endpoint。该 endpoint 必须实现 MCP over HTTP；任意 REST endpoint 都不是 MCP server。

### 配置

**基础：**

```json
{
  "api": {
    "type": "http",
    "url": "https://api.example.com/mcp"
  }
}
```

**带认证：**

```json
{
  "api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "Content-Type": "application/json",
      "X-API-Version": "2024-01-01"
    }
  }
}
```

### 请求/响应流程

1. **Tool 发现**：client 通过 MCP endpoint 发现 tools
2. **Tool 调用**：client 通过 HTTP 发送 MCP tool calls
3. **响应**：server 返回 MCP responses 或 errors
4. **无状态**：除非 server 文档说明 session 行为，否则每个请求彼此独立

### 认证

**基于 Token:**

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

**API Key:**

```json
{
  "headers": {
    "X-API-Key": "${API_KEY}"
  }
}
```

**自定义认证:**

```json
{
  "headers": {
    "X-Auth-Token": "${AUTH_TOKEN}",
    "X-User-ID": "${USER_ID}"
  }
}
```

### 适用场景

- 托管的 MCP endpoint
- 内部 MCP 服务
- 基于 token 认证的 MCP backend
- 无服务器 MCP 实现

### 最佳实践

1. **所有连接都使用 HTTPS**
2. **将 token 存储在环境变量中**
3. **为瞬时故障实现重试逻辑**
4. **处理 rate limiting**
5. **设置合适的 timeout**

### 故障排查

**HTTP 错误:**

- 401: 检查 认证 headers
- 403: 验证权限
- 429: 处理 rate limiting
- 500: 检查 server 日志

**超时问题:**

- 如有需要，增加 timeout
- 检查 server 性能
- 优化 tool 实现

## 对比矩阵

| 特性 | stdio | SSE | HTTP |
| --- | --- | --- | --- |
| **Transport** | 进程 | HTTP/SSE | MCP over HTTP |
| **方向** | 双向 | Server→Client | 请求/响应 |
| **状态** | 有状态 | 有状态 | 无状态 |
| **认证** | Env vars | OAuth/Headers | Headers |
| **适用场景** | 本地 tools | 云服务 | 托管 MCP APIs |
| **延迟** | 最低 | 中等 | 中等 |
| **配置复杂度** | 简单 | 中等 | 简单 |
| **重连** | 进程重启 | 自动 | N/A |

## 如何选择合适类型

**在以下情况使用 stdio：**

- 运行本地工具或自定义 server
- 需要最低延迟
- 处理文件系统或本地数据库
- 随插件一起分发 server

**在以下情况使用 SSE：**

- 连接托管服务
- 需要 OAuth 认证
- 使用官方 MCP server（Asana、GitHub）
- 希望自动重连

**在以下情况使用 HTTP：**

- 通过 HTTP 连接托管的 MCP endpoint
- 需要无状态交互
- 使用基于 token 的 auth
- 交互模式是简单的 请求/响应

## 不同类型之间的迁移

### 从 stdio 迁移到 SSE

**变更前（stdio）：**

```json
{
  "local-server": {
    "command": "node",
    "args": ["server.js"]
  }
}
```

**变更后（SSE - 部署 server）：**

```json
{
  "hosted-server": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

## 高级配置

### 多个 Server

组合不同类型：

```json
{
  "local-db": {
    "command": "npx",
    "args": ["-y", "mcp-server-sqlite", "./data.db"]
  },
  "cloud-api": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  },
  "internal-service": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

### 条件化配置

使用环境变量切换 server：

```json
{
  "api": {
    "type": "http",
    "url": "${API_URL}",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

为 dev/prod 设置不同值：

- Dev: `API_URL=http://localhost:8080/mcp`
- Prod: `API_URL=https://api.production.com/mcp`

## 安全注意事项

### Stdio 安全性

- 验证 command 路径
- 不执行用户提供的 command
- 限制环境变量访问
- 限制文件系统访问

### 网络安全

- 对托管的 MCP endpoint 始终使用 HTTPS
- 验证 SSL 证书
- 不要跳过证书校验
- 使用安全的 token 存储

### Token 管理

- 绝不硬编码 token
- 使用环境变量
- 定期轮换 token
- 实现 token refresh
- 记录所需 scopes

## 结论

根据你的使用场景 选择 MCP server 类型：

- **stdio** 适用于本地、自定义或以 NPM 打包的 server
- **SSE** 适用于带 OAuth 的托管服务
- **HTTP** 适用于带 token auth 的托管 MCP endpoint

请充分测试，并优雅处理错误，以实现稳健的 MCP 集成。
