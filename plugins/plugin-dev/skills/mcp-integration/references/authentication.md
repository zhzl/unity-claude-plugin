# MCP 认证模式

Claude Code 插件 中 MCP server 认证方式的完整指南。

## 概述

MCP server 会根据 server 类型和服务要求支持多种 认证方法。请选择最符合你的 使用场景 和安全要求的方法。

## OAuth（自动）

### 工作方式

对于 SSE 和 HTTP server，Claude Code 会自动处理完整的 OAuth 2.0 流程（含 PKCE）：

1. 用户尝试使用 MCP tool
2. Claude Code 检测到需要认证
3. 发起带 PKCE（Proof Key for Code Exchange）的 OAuth 2.0 Authorization Code 流程
4. 打开浏览器进行 OAuth 授权确认
5. 用户在浏览器中授权
6. Claude Code 用 authorization code 换取 tokens
7. Claude Code 安全存储 tokens
8. 使用 refresh tokens 自动刷新 token

PKCE 能为 公共 client 提供额外安全性，防止 authorization code 被拦截。Claude Code 也支持 MCP server 提供的预配置 OAuth credentials。

### 配置

```json
{
  "service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse"
  }
}
```

不需要额外的 auth 配置。Claude Code 会处理全部流程。

### 支持的服务

**已知支持 OAuth 的 MCP server：**

- Asana: `https://mcp.asana.com/sse`
- GitHub（如果可用）
- Google services（如果可用）
- 自定义 OAuth server

### OAuth scopes

OAuth scopes 由 MCP server 决定。用户会在授权确认流程中看到所需 scopes。

**请在 README 中记录所需 scopes：**

```markdown
## Authentication

This plugin requires the following Asana permissions:

- Read tasks and projects
- Create and update tasks
- Access workspace data
```

### Token 存储

Tokens 由 Claude Code 安全存储：

- 插件无法访问
- 静态加密存储
- 自动刷新
- 退出登录后清除

### OAuth 故障排查

**认证循环：**

- 清除缓存的 tokens（退出登录后重新登录）
- 检查 OAuth redirect URL
- 验证 server 的 OAuth 配置

**scope 问题：**

- 用户可能需要为新的 scopes 重新授权
- 检查 server 文档确认所需 scopes

**token 过期：**

- Claude Code 会自动刷新
- 若刷新失败，会提示重新认证

## CLI OAuth 设置

对于需要 OAuth 2.0 的 MCP server，可使用 CLI 标志预配置 credentials：

```bash
claude mcp add --transport http my-service https://api.example.com/mcp \
  --client-id "your-client-id" \
  --client-secret \
  --callback-port 8080
```

- `--client-id` — OAuth client ID
- `--client-secret` — 提示输入 secret（隐藏输入）；或设置 `MCP_CLIENT_SECRET` 环境变量
- `--callback-port` — 用于 OAuth callback 的本地端口（默认值因 server 而异）

如果需要交互式 OAuth 设置，请在 Claude Code 中使用 `/mcp` command 通过浏览器完成认证。

## 基于 token 的认证

### Bearer token

这是 HTTP MCP server 最常见的方式。

**配置：**

```json
{
  "api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}"
    }
  }
}
```

**环境变量：**

```bash
export API_TOKEN="your-secret-token-here"
```

### API key

这是 Bearer token 的替代方案，通常放在自定义 header 中。

**配置：**

```json
{
  "api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "X-API-Key": "${API_KEY}",
      "X-API-Secret": "${API_SECRET}"
    }
  }
}
```

### 自定义 headers

某些服务会使用自定义 认证 headers。

**配置：**

```json
{
  "service": {
    "type": "sse",
    "url": "https://mcp.example.com/sse",
    "headers": {
      "X-Auth-Token": "${AUTH_TOKEN}",
      "X-User-ID": "${USER_ID}",
      "X-Tenant-ID": "${TENANT_ID}"
    }
  }
}
```

### 记录 token 要求

请始终在 README 中记录：

```markdown
## Setup

### Required Environment Variables

Set these environment variables before using the plugin:

\`\`\`bash
export API_TOKEN="your-token-here"
export API_SECRET="your-secret-here"
\`\`\`

### Obtaining Tokens

1. Visit https://api.example.com/tokens
2. Create a new API token
3. Copy the token and secret
4. Set environment variables as shown above

### Token Permissions

The API token needs the following permissions:

- Read access to resources
- Write access for creating items
- Delete access (optional, for cleanup operations)
  \`\`\`
```

## 环境变量认证（stdio）

### 向 Server 传递 Credentials

对于 stdio server，可通过环境变量向 server 传递 credentials：

```json
{
  "database": {
    "command": "python",
    "args": ["-m", "mcp_server_db"],
    "env": {
      "DATABASE_URL": "${DATABASE_URL}",
      "DB_USER": "${DB_USER}",
      "DB_PASSWORD": "${DB_PASSWORD}"
    }
  }
}
```

### 用户环境变量

```bash
# User sets these in their shell
export DATABASE_URL="postgresql://localhost/mydb"
export DB_USER="myuser"
export DB_PASSWORD="mypassword"
```

### 文档模板

```markdown
## Database Configuration

Set these environment variables:

\`\`\`bash
export DATABASE_URL="postgresql://host:port/database"
export DB_USER="username"
export DB_PASSWORD="password"
\`\`\`

Or create a `.env` file (add to `.gitignore`):

\`\`\`
DATABASE_URL=postgresql://localhost:5432/mydb
DB_USER=myuser
DB_PASSWORD=mypassword
\`\`\`

Load with your shell's dotenv support or a parser that handles quoting safely. Avoid \`export $(cat .env | xargs)\` because it breaks on spaces and can execute unintended shell syntax.
\`\`\`
```

## 动态 Headers

### Headers 辅助脚本

对于会变化或过期的 token，可使用 辅助脚本：

```json
{
  "api": {
    "type": "sse",
    "url": "https://api.example.com",
    "headersHelper": "${CLAUDE_PLUGIN_ROOT}/scripts/get-headers.sh"
  }
}
```

**脚本（get-headers.sh）：**

```bash
#!/bin/bash
# Generate dynamic authentication headers

# Fetch fresh token
TOKEN=$(get-fresh-token-from-somewhere)

# Output JSON headers
cat <<EOF
{
  "Authorization": "Bearer $TOKEN",
  "X-Timestamp": "$(date -Iseconds)"
}
EOF
```

### 动态 Headers 的适用场景

- 需要刷新的短期 token
- 带 HMAC signatures 的 token
- 基于时间的 认证
- 动态 tenant/workspace 选择

## 安全最佳实践

### 应该做

✅ **使用环境变量：**

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

✅ **在 README 中记录必需变量**

✅ **对托管的 MCP endpoint 使用 HTTPS**

✅ **实现 token 轮换**

✅ **安全存储 token（用 环境变量，不要写入文件）**

✅ **可用时优先让 OAuth 处理 认证**

### 不该做

❌ **硬编码 token：**

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

绝不要把 `${API_TOKEN}` 替换成字面 secret，例如 `Bearer sk-abc123...`。

❌ **把 token 提交到 git**

❌ **在文档中共享 token**

❌ **使用 HTTP 而不是 HTTPS**

❌ **将 token 存储在插件文件中**

❌ **记录 token 或敏感 header**

## 多租户模式

### Workspace/Tenant 选择

**通过环境变量：**

```json
{
  "api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_TOKEN}",
      "X-Workspace-ID": "${WORKSPACE_ID}"
    }
  }
}
```

**通过 URL:**

```json
{
  "api": {
    "type": "http",
    "url": "https://${TENANT_ID}.api.example.com/mcp"
  }
}
```

### 按用户配置

用户设置自己的 workspace：

```bash
export WORKSPACE_ID="my-workspace-123"
export TENANT_ID="my-company"
```

## 认证故障排查

### 常见问题

**401 Unauthorized：**

- 检查 token 是否正确设置
- 验证 token 是否已过期
- 检查 token 是否具备所需权限
- 确保 header 格式正确

**403 Forbidden：**

- token 有效，但权限不足
- 检查 scope/permissions
- 验证 workspace/tenant ID
- 可能需要管理员批准

**未找到 token：**

```bash
# Check environment variable is set
echo $API_TOKEN

# If empty, set it
export API_TOKEN="your-token"
```

**Token 格式错误：**

```text
Correct: Authorization: Bearer ${API_TOKEN}
Wrong:   Authorization: ${API_TOKEN}
```

### 调试认证

**启用 debug 模式：**

```bash
claude --debug
```

检查以下内容：

- 认证 header 值（已脱敏）
- OAuth 流程 进度
- token refresh 尝试
- 认证错误

**单独测试 认证：**

```bash
# Test HTTP endpoint
curl -H "Authorization: Bearer $API_TOKEN" \
     https://api.example.com/mcp/health

# Should return 200 OK
```

## 迁移模式

### 从硬编码迁移到环境变量

**变更前：**

```json
{
  "headers": {
    "Authorization": "Bearer sk-hardcoded-token"
  }
}
```

**变更后：**

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}"
  }
}
```

**迁移步骤：**

1. 在插件 README 中加入环境变量说明
2. 更新配置，改为使用 `${VAR}`
3. 在变量已设置的情况下进行测试
4. 删除硬编码值
5. 提交变更

### 从 Basic Auth 迁移到 OAuth

**变更前：**

```json
{
  "headers": {
    "Authorization": "Basic ${BASE64_CREDENTIALS}"
  }
}
```

**变更后：**

```json
{
  "type": "sse",
  "url": "https://mcp.example.com/sse"
}
```

**收益：**

- 更好的安全性
- 无需管理 credentials
- 自动刷新 token
- 具备 scopes 权限控制

## 高级认证

### 双向 TLS（mTLS）

某些 企业服务 需要 client certificates。

**MCP 配置中不直接支持。**

**替代方案：** 用 stdio server 包一层来处理 mTLS：

```json
{
  "secure-api": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/mtls-wrapper",
    "args": ["--cert", "${CLIENT_CERT}", "--key", "${CLIENT_KEY}"],
    "env": {
      "API_URL": "https://secure.example.com"
    }
  }
}
```

### JWT token

使用 headers 辅助脚本 动态生成 JWT token：

```bash
#!/bin/bash
# generate-jwt.sh

# Generate JWT (using library or API call)
JWT=$(generate-jwt-token)

echo "{\"Authorization\": \"Bearer $JWT\"}"
```

```json
{
  "headersHelper": "${CLAUDE_PLUGIN_ROOT}/scripts/generate-jwt.sh"
}
```

### HMAC 签名

对于需要 request signing 的 API：

```bash
#!/bin/bash
# generate-hmac.sh

TIMESTAMP=$(date -Iseconds)
SIGNATURE=$(echo -n "$TIMESTAMP" | openssl dgst -sha256 -hmac "$SECRET_KEY" | cut -d' ' -f2)

cat <<EOF
{
  "X-Timestamp": "$TIMESTAMP",
  "X-Signature": "$SIGNATURE",
  "X-API-Key": "$API_KEY"
}
EOF
```

## 最佳实践摘要

### 面向 Plugin 开发者

1. **优先使用 OAuth**，前提是服务支持
2. **对 token 使用环境变量**
3. **在 README 中记录所有必需变量**
4. **提供带示例的 设置说明**
5. **绝不提交 credentials**
6. **对托管的 MCP endpoint 使用 HTTPS**
7. **充分测试 认证**

### 面向 Plugin 用户

1. **使用插件前先设置环境变量**
2. **妥善保管 token，保持私密**
3. **定期轮换 token**
4. **为 dev/prod 使用不同 token**
5. **不要把 .env 文件提交到 git**
6. **授权前检查 OAuth scopes**

## 结论

请选择与你的 MCP server 要求相匹配的 认证方法：

- **OAuth** 适用于云服务（对用户最简单）
- **Bearer tokens** 适用于 API 服务
- **环境变量** 适用于 stdio server
- **动态 headers** 适用于复杂 认证流程

始终优先考虑安全性，并为用户提供清晰的 设置文档。
