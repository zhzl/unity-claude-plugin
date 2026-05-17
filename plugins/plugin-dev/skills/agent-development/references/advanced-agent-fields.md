# Agent 高级字段

本参考说明核心 plugin-agent 字段（name、description、model、color、tools、disallowedTools、skills、maxTurns、memory）之外的高级 agent 配置。下文部分章节也会为完整性说明 project/user subagent 特性。若章节标注为 project/user subagent-only，则不适用于插件随附的 agent。

## maxTurns

限制 agent 停止前允许的最大 agentic turn 数（API 往返次数）。

```yaml
maxTurns: 50
```

### 如何选择数值

| 任务类型 | 建议范围 | 原因 |
| -------- | -------- | ---- |
| 快速检查、linting | 5-15 | 任务聚焦，通常能较快完成 |
| 代码审查、分析 | 20-40 | 需要读取多个文件 |
| 复杂重构、创建工作 | 50-100 | 涉及多文件修改与测试 |

如果省略，agent 会一直运行到完成或被中断。设置 `maxTurns` 可防止失控 agent 消耗过多资源，尤其适合后台 agent，因为那种情况下没有用户能中途打断。

## memory

启用可跨会话保留的持久 memory。

```yaml
memory: user
```

### 作用域

| 作用域 | 目录 | 适用场景 |
| ------ | ---- | -------- |
| `user` | `~/.claude/agent-memory/<agent-name>/` | 个人偏好、默认设置 |
| `project` | `.claude/agent-memory/<agent-name>/` | 代码库特定知识 |
| `local` | `.claude/agent-memory-local/<agent-name>/` | 被 Git 忽略的项目本地数据 |

### 工作方式

当设置了 `memory` 时：

1. system prompt 会包含读取/写入 memory 目录的说明
2. `MEMORY.md` 的前 200 行会自动注入 agent 的 system prompt
3. Read、Write 和 Edit 工具会自动启用（即使不在 `tools` 列表中）
4. 如果 `MEMORY.md` 超过 200 行，agent 应主动整理它

### 最佳实践

- 大多数 agent 默认优先使用 `user` 作用域
- 面向代码库的学习内容使用 `project` 或 `local`
- 在 agent 的 system prompt 中加入 memory 管理说明（例如 “After completing a task, update your MEMORY.md with key learnings”）

## mcpServers

这是 project/user subagent-only 字段。Claude Code 会忽略插件随附 agent frontmatter 中的 `mcpServers`，因此插件 agent 应改为依赖插件级 MCP 配置。

将 MCP server 限定到某个 agent，以控制它可访问哪些外部服务。

### 按名称引用

引用已经配置好的 MCP server：

```yaml
mcpServers:
  slack:
```

agent 会从 project/user MCP 设置中继承该具名 server 的完整配置。

### 内联配置

提供限定到该 agent 的完整 server 配置：

```yaml
mcpServers:
  custom-api:
    command: "${CLAUDE_PLUGIN_ROOT}/servers/api-server"
    args: ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    env:
      API_KEY: "${API_KEY}"
```

### 使用场景

- 将 code review agent 限制为只能使用只读 MCP tools
- 让 deployment agent 可访问 CI/CD servers，但不能访问 database servers
- 提供 agent 专属的 server 配置

## hooks

这是 project/user subagent-only 字段。Claude Code 会忽略插件随附 agent frontmatter 中的 `hooks`，因此插件 agent 应把生命周期自动化保留在插件 `hooks/hooks.json` 中。

定义限定到 agent 的生命周期 hooks。这些 hooks 会在 agent 启动时激活，在结束时停用。

### 格式

```yaml
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
          timeout: 10
  Stop:
    - hooks:
        - type: prompt
          prompt: "Verify all tasks are complete before stopping."
```

### 支持的事件

agent frontmatter 支持所有 hook 事件。关键行为差异是：

- **`Stop`** hooks 会在运行时自动转换为 **`SubagentStop`**，因为 agent 本质上是子进程
- hooks 仅在 agent 活跃期间运行，并会在 agent 结束时清理

### 与 hooks.json 的对比

| 维度 | `hooks.json` | Agent frontmatter `hooks` |
| ---- | ------------ | ------------------------- |
| Scope | 全局生效（插件启用时始终激活） | Agent 专属（仅在 agent 运行期间激活） |
| Events | 所有 hook 事件 | 所有事件（`Stop` 会自动转成 `SubagentStop`） |
| Location | `hooks/hooks.json` 文件 | agent `.md` 文件中的 YAML frontmatter |
| Use case | 插件级校验 | agent 专属安全检查 |

## 执行模式

### Background 与 Foreground

- **Foreground**（默认）：阻塞主会话，直到 agent 完成。如果 agent 请求权限，用户仍可交互。
- **Background**：与主会话并发运行。由于无法向用户弹出权限请求，所有权限都必须在启动时预先批准。

后台 agent 如果遇到未批准的权限请求会直接失败。当 agent 可能在后台运行时，插件随附 agent 应围绕显式工具限制（`tools`、`disallowedTools`）以及用户已配置的 permission rules 来设计。

### 恢复 agent

每次 Agent tool 调用都会创建一个带有全新上下文的新 agent 实例。若要在保留完整历史上下文的前提下继续，请让 Claude “resume that agent” 或 “continue that subagent”——它会恢复先前的 transcript。

agent transcript 存储在 `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`。

### 限制可生成的 agent 类型

在 settings.json 允许规则中使用 `Agent(agent_type1, agent_type2)` 语法，可控制允许生成哪些 agent 类型：

```json
{
  "permissions": {
    "allow": ["Agent(code-reviewer, test-runner)"]
  }
}
```

- `Agent(type1, type2)` — 只允许生成这些 agent type
- `Agent`（无括号）— 允许任意 subagent
- 完全省略 `Agent` — 禁止生成任何 subagent

## 内置 Agent 类型

Claude Code 内置了多种 agent type，可在 skills 的 `agent` 字段中引用，或作为 `Agent()` 限制的目标：

| Agent Type | Model | Tools | 用途 |
| ---------- | ----- | ----- | ---- |
| `Explore` | Haiku | Read-only | 快速探索/搜索代码库 |
| `Plan` | Inherit | Read-only | 规划阶段的代码库调研 |
| `general-purpose` | Inherit | All | 复杂多步骤任务 |
| `Bash` | Inherit | Bash | 在隔离环境中执行终端命令 |
| `statusline-setup` | Haiku | Read/Edit | 状态栏配置 |
| `Claude Code Guide` | Haiku | Read-only | 文档与功能问答 |

## Agent Teams（实验性）

Agent teams 支持 multi-agent 协作：一个 team lead 可以生成并管理多个彼此独立的 Claude Code 会话作为 teammate。该特性仍属实验性质，需要设置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。

### 关键概念

- **Team lead**：创建团队、生成 teammate 并协调工作的主会话
- **Teammates**：拥有各自上下文窗口的独立 Claude Code 实例
- **Shared task list**：供 teammate 认领和完成的协同任务列表
- **Messaging**：团队成员之间的定向消息与广播

### 设计 Team Lead Agent

team lead 负责跨多个 teammate 协调工作。设计时需重点考虑：

- **通过 tools 和 prompt 约束，而不是依赖 `delegate` permission mode**。使用 `tools`/`disallowedTools` 限制实现类工具，并明确指示 lead 分解工作、分派任务、审阅结果，而不是亲自编码。
- **System prompt 重点**：任务拆解、工作分配、进度跟踪、质量审查
- **Tools**：team lead 会自动获得 `TeamCreate`、`TaskCreate`、`TaskUpdate`、`TaskList`、`SendMessage` 和 `Task`（用于生成 teammate）
- **插件说明**：插件随附 agent 会忽略 `permissionMode`，因此仅做协同的行为必须通过工具限制和 prompt 引导来实现

### 权限继承

teammate 会继承 team lead 的权限设置。如果 lead 使用 `--dangerously-skip-permissions` 运行，所有 teammate 也会继承该设置。规划 permission mode 时要注意：宽松的 lead 会带来宽松的 teammate。

### 上下文隔离

teammate 会从项目中加载 CLAUDE.md、MCP servers 和 skills，但**不会**继承 lead 的对话历史。每个 teammate 都以全新的上下文窗口启动，由生成时的 prompt 提供初始任务背景。

### Token 成本

每个 teammate 都是独立的 Claude Code 会话，拥有自己的上下文窗口。token 成本会随团队规模线性增长。对于真正可并行的工作，这个成本通常值得；但对于顺序执行即可完成的任务，不应为此生成 teammate。

### 设计 Teammate Agent

teammate 由 team lead 生成，并独立完成分配给它们的任务：

- **Self-contained context**：每个 teammate 都有自己的上下文窗口，不要假设存在共享状态
- **Task-focused prompts**：system prompt 应聚焦于特定类型的工作（例如 “you are a test writer”）
- **Tool restrictions**：使用 `tools` 按角色限制每个 teammate 可执行的操作
- **Plan mode for review**：对于需要先提方案再由 lead 审批的 teammate，可使用 `permissionMode: plan`

### 显示模式

`teammateMode` 设置控制 agent teams 在终端中的显示方式：

| 模式 | 行为 |
| ---- | ---- |
| `in-process` | 所有 teammate 都显示在主终端中；可用 Shift+Up/Down 切换 |
| `tmux` | 分割窗格，每个 teammate 占用自己的 pane |
| `auto` | 如果运行在 tmux 中则分割窗格，否则使用 in-process（默认） |

### Team Hooks

可使用 hook 事件在团队工作流中强制执行质量标准：

| 事件 | 触发时机 | 用途 |
| ---- | -------- | ---- |
| `TeammateIdle` | 某个 teammate 完成自己的一个 turn 时 | 触发代码审查、对变更运行测试 |
| `TaskCompleted` | 某个任务被标记完成时 | 校验交付物、更新文档 |
| `SubagentStart` | 某个 teammate 启动时 | 记录团队活动、强制命名规范 |
| `SubagentStop` | 某个 teammate 结束时 | 清理资源、收集指标 |

### Plan 审批模式

可以把 teammate 配置为在真正实现前必须先获得 team lead 对 plan 的批准：

1. teammate 使用 `permissionMode: plan`
2. teammate 探索代码库并创建 plan
3. teammate 调用 `ExitPlanMode`，把 plan 发送给 team lead
4. team lead 通过带有 `plan_approval_response` 的 `SendMessage` 审核并批准/拒绝
5. 获批后，teammate 退出 plan mode 并继续实现

这种模式适合 lead 希望先审查方案、再允许执行的复杂任务。

完整文档见[官方 agent teams 指南](https://code.claude.com/docs/en/agent-teams)。