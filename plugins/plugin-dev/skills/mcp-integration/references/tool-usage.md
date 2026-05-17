# 在 Commands 和 Agents 中使用 MCP Tools

在 Claude Code 插件 command 和 agent 中高效使用 MCP tools 的完整指南。

## 概述

一旦某个 MCP server 配置完成，它的 tools 就会以 `mcp__<server-name>__<tool-name>` 前缀对外可用。你可以像使用 Claude Code 内置工具一样，在 command 和 agent 中使用这些 tools。

## Tool 命名约定

### 格式

```
mcp__<server-name>__<tool-name>
```

### 示例

**Asana server：**

- `mcp__asana__asana_create_task`
- `mcp__asana__asana_search_tasks`
- `mcp__asana__asana_get_project`

**Database server：**

- `mcp__database__query`
- `mcp__database__execute`
- `mcp__database__list_tables`

### 发现 tool 名称

**使用 `/mcp` command：**

```bash
/mcp
```

这里会显示：

- 所有可用的 MCP server
- 每个 server 提供的 tools
- tool schema 和 description
- 可在配置中使用的完整 tool name

## 在 Commands 中使用 Tools

### 预先允许 Tools

在 command frontmatter 中指定 MCP tools：

```markdown
---
description: Create a new Asana task
allowed-tools: ["mcp__asana__asana_create_task"]
---

# Create Task Command

To create a task:

1. Gather task details from user
2. Use mcp__asana__asana_create_task with the details
3. Confirm creation to user
```

### 多个 Tools

```markdown
---
description: Manage Asana tasks and projects
allowed-tools:
  - mcp__asana__asana_create_task
  - mcp__asana__asana_search_tasks
  - mcp__asana__asana_get_project
---
```

### Wildcard（谨慎使用）

```markdown
---
description: Use Asana MCP tools for task management
allowed-tools:
  - mcp__asana__*
---
```

**注意：** 只有当 command 确实需要访问某个 server 的全部 tools 时，才使用 wildcard。

### Command 指令中的 Tool 用法

**示例 command：**

```markdown
---
description: Search and create Asana tasks
allowed-tools:
  - mcp__asana__asana_search_tasks
  - mcp__asana__asana_create_task
---

# Asana Task Management

## Searching Tasks

To search for tasks:

1. Use mcp__asana__asana_search_tasks
2. Provide search filters (assignee, project, etc.)
3. Display results to user

## Creating Tasks

To create a task:

1. Gather task details:
   - Title (required)
   - Description
   - Project
   - Assignee
   - Due date
2. Use mcp__asana__asana_create_task
3. Show confirmation with task link
```

## 在 Agents 中使用 Tools

### Agent 配置

agent 可以自主使用 MCP tools，而无需预先 allow：

```markdown
---
name: asana-status-updater
description: This agent should be used when the user asks to "update Asana status", "generate project report", or "sync Asana tasks"
model: inherit
color: blue
---

## Role

Autonomous agent for generating Asana project status reports.

## Process

1. **Query tasks**: Use mcp__asana__asana_search_tasks to get all tasks
2. **Analyze progress**: Calculate completion rates and identify blockers
3. **Generate report**: Create formatted status update
4. **Update Asana**: Use mcp__asana__asana_create_comment to post report

## Available Tools

The agent has access to all Asana MCP tools without pre-approval.
```

### Agent 的 Tool 访问权限

agent 的 tool 权限范围通常比 command 更宽：

- 可以使用 Claude 判定为必要的任意 tool
- 不需要预先 allow 的列表
- 但仍应记录它通常会使用哪些 tools

## Tool 调用模式

### 模式 1：简单 Tool 调用

带验证的单次 tool 调用：

```markdown
Steps:

1. Validate user provided required fields
2. Call mcp__api__create_item with validated data
3. Check for errors
4. Display confirmation
```

### 模式 2：顺序 Tools

串联多个 tool 调用：

```markdown
Steps:

1. Search for existing items: mcp__api__search
2. If not found, create new: mcp__api__create
3. Add metadata: mcp__api__update_metadata
4. Return final item ID
```

### 模式 3：批量操作

对同一个 tool 进行多次调用：

```markdown
Steps:

1. Get list of items to process
2. For each item:
   - Call mcp__api__update_item
   - Track success/failure
3. Report results summary
```

### 模式 4：错误处理

优雅处理错误：

```markdown
Steps:

1. Try to call mcp__api__get_data
2. If error (rate limit, network, etc.):
   - Wait and retry (max 3 attempts)
   - If still failing, inform user
   - Suggest checking configuration
3. On success, process data
```

## Tool 参数

### 理解 Tool Schema

每个 MCP tool 都有一个 schema 来定义其参数。可通过 `/mcp` 查看。

**示例 schema:**

```json
{
  "name": "asana_create_task",
  "description": "Create a new Asana task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Task title"
      },
      "notes": {
        "type": "string",
        "description": "Task description"
      },
      "workspace": {
        "type": "string",
        "description": "Workspace GID"
      }
    },
    "required": ["name", "workspace"]
  }
}
```

### 带参数调用 Tools

Claude 会根据 schema 自动组织 tool 调用：

```typescript
// Claude generates this internally
{
  toolName: "mcp__asana__asana_create_task",
  input: {
    name: "Review PR #123",
    notes: "Code review for new feature",
    workspace: "12345",
    assignee: "67890",
    due_on: "2026-05-15"
  }
}
```

### 参数验证

**在 commands 中，调用前先验证：**

```markdown
Steps:

1. Check required parameters:
   - Title is not empty
   - Workspace ID is provided
   - Due date is valid format (YYYY-MM-DD)
2. If validation fails, ask user to provide missing data
3. If validation passes, call MCP tool
4. Handle tool errors gracefully
```

## 响应处理

### 成功响应

```markdown
Steps:

1. Call MCP tool
2. On success:
   - Extract relevant data from response
   - Format for user display
   - Provide confirmation message
   - Include relevant links or IDs
```

### 错误响应

```markdown
Steps:

1. Call MCP tool
2. On error:
   - Check error type (auth, rate limit, validation, etc.)
   - Provide helpful error message
   - Suggest remediation steps
   - Don't expose internal error details to user
```

### 部分成功

```markdown
Steps:

1. Batch operation with multiple MCP calls
2. Track successes and failures separately
3. Report summary:
   - "Successfully processed 8 of 10 items"
   - "Failed items: [item1, item2] due to [reason]"
   - Suggest retry or manual intervention
```

## 性能优化

### 批量请求

#### 推荐：带过滤条件的单次查询

```markdown
Steps:

1. Call mcp__api__search with filters:
   - project_id: "123"
   - status: "active"
   - limit: 100
2. Process all results
```

#### 避免：大量单独查询

```markdown
Steps:

1. For each item ID:
   - Call mcp__api__get_item
   - Process item
```

### 缓存结果

```markdown
Steps:

1. Call expensive MCP operation: mcp__api__analyze
2. Store results in variable for reuse
3. Use cached results for subsequent operations
4. Only re-fetch if data changes
```

### 并行 Tool 调用

当 tools 彼此没有依赖时，可并行调用：

```markdown
Steps:

1. Make parallel calls (Claude handles this automatically):
   - mcp__api__get_project
   - mcp__api__get_users
   - mcp__api__get_tags
2. Wait for all to complete
3. Combine results
```

## 集成最佳实践

### 用户体验

**提供反馈:**

```markdown
Steps:

1. Inform user: "Searching Asana tasks..."
2. Call mcp__asana__asana_search_tasks
3. Show progress: "Found 15 tasks, analyzing..."
4. Present results
```

**处理长时间操作:**

```markdown
Steps:

1. Warn user: "This may take a minute..."
2. Break into smaller steps with updates
3. Show incremental progress
4. Final summary when complete
```

### 错误信息

**好的错误信息:**

```
❌ "Could not create task. Please check:
   1. You're logged into Asana
   2. You have access to workspace 'Engineering'
   3. The project 'Q1 Goals' exists"
```

**不好的错误信息:**

```
❌ "Error: MCP tool returned 403"
```

### 文档

**在 command 中记录 MCP tool 用法：**

```markdown
## MCP Tools Used

This command uses the following Asana MCP tools:

- **asana_search_tasks**: Search for tasks matching criteria
- **asana_create_task**: Create new task with details
- **asana_update_task**: Update existing task properties

Ensure authentication to Asana before running this command.
```

## 测试 Tool 用法

### 本地测试

1. **在 `.mcp.json` 中配置 MCP server**
2. **在 `.claude-plugin/` 中本地安装 plugin**
3. **用 `/mcp` 验证 tools 可见**
4. **测试使用这些 tools 的 command**
5. **检查 debug 输出**：`claude --debug`

### 测试场景

**测试成功调用:**

```markdown
Steps:

1. Create test data in external service
2. Run command that queries this data
3. Verify correct results returned
```

**测试错误场景:**

```markdown
Steps:

1. Test with missing authentication
2. Test with invalid parameters
3. Test with non-existent resources
4. Verify graceful error handling
```

**测试边界场景:**

```markdown
Steps:

1. Test with empty results
2. Test with maximum results
3. Test with special characters
4. Test with concurrent access
```

## 常见模式

### 模式：CRUD 操作

```markdown
---
allowed-tools:
  [
    "mcp__api__create_item",
    "mcp__api__read_item",
    "mcp__api__update_item",
    "mcp__api__delete_item",
  ]
---

# Item Management

## Create

Use create_item with required fields...

## Read

Use read_item with item ID...

## Update

Use update_item with item ID and changes...

## Delete

Use delete_item with item ID (ask for confirmation first)...
```

### 模式：搜索并处理

```markdown
Steps:

1. **Search**: mcp__api__search with filters
2. **Filter**: Apply additional local filtering if needed
3. **Transform**: Process each result
4. **Present**: Format and display to user
```

### 模式：多步骤工作流

```markdown
Steps:

1. **Setup**: Gather all required information
2. **Validate**: Check data completeness
3. **Execute**: Chain of MCP tool calls:
   - Create parent resource
   - Create child resources
   - Link resources together
   - Add metadata
4. **Verify**: Confirm all steps succeeded
5. **Report**: Provide summary to user
```

## 故障排查

### Tools 不可用

**检查:**

- MCP server 配置正确
- server 已连接（检查 `/mcp`）
- tool name 完全匹配（区分大小写）
- 配置变更后重启 Claude Code

### Tool 调用失败

**检查:**

- 认证有效
- 参数符合 tool schema
- 必需参数已提供
- 检查 `claude --debug` 日志

### 性能问题

**检查:**

- 批量查询，而不是逐条单独调用
- 在合适时缓存结果
- 不进行不必要的 tool 调用
- 能并行时并行调用

## 结论

有效的 MCP tool 用法 需要：

1. 通过 `/mcp` **理解 tool schema**
2. 在 commands 中适当 **预先 allow tools**
3. **优雅处理错误**
4. 通过批量与缓存 **优化性能**
5. 通过反馈与清晰报错 **提供良好 UX**
6. 部署前 **充分测试**

遵循这些模式，可以在你的 插件 command 和 agent 中实现稳健的 MCP tool 集成。

## 将 MCP Prompts 作为 Commands

除了 tools 和 resources 之外，MCP server 还可以暴露 **prompts** —— 它们会在 Claude Code 中显示为 slash commands 的预定义指令模板。

### Prompts 的工作方式

当某个 MCP server 通过 MCP protocol 声明 prompts 时，Claude Code 会自动把它们注册为 slash commands：

- **格式：** `/mcp__servername__promptname`
- **发现方式：** prompts 会和普通 commands 一起出现在 `/` 自动补全菜单中
- **参数：** prompts 可以接收由 server 的 prompt schema 定义的参数

### 与 Plugin Commands 的集成

如果你的 插件打包了一个会暴露 prompts 的 MCP server，那么当插件安装后，这些 prompts 也会一并可用。这为引导式工作流 提供了另一种机制：

```markdown
# Example: Plugin README documenting MCP prompts

## Available MCP Prompts

After installing this plugin, the following MCP prompts are available:

- `/mcp__myserver__create-report` - Generate a structured report
- `/mcp__myserver__analyze-data` - Run data analysis with guided inputs
```

### 何时使用 MCP Prompts 与 Plugin Commands

| 方式 | 更适合 |
| --- | --- |
| MCP prompts | 由 server 定义的 工作流、来自外部服务的动态模板 |
| Plugin commands | 静态 工作流、plugin 特定逻辑、复杂 prompt 组合 |

**提示：** 当工作流逻辑 位于 server 端，并且可能独立于插件变化时，MCP prompts 很理想。若你希望完全控制 prompt 内容，则插件 commands 更合适。
