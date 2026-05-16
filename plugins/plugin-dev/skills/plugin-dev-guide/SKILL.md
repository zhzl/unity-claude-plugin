---
name: plugin-dev-guide
description: 当用户询问 "Claude Code plugins"、"plugin development"、"how to build a plugin"、"what plugin components exist"、"plugin architecture"、"extending Claude Code"，或需要了解 plugin-dev skills 与 plugin development 能力总览时使用。它作为 9 个专业 plugin-dev skills 的导览，说明何时应激活各个 skill。当用户刚接触 plugin development，或不确定自己需要哪个具体 skill 时，应先加载此 skill。
---

# plugin development 指南

这个 meta skill 提供 Claude Code plugin development 的总览，并根据当前任务将你路由到相应的专业 skill。

## plugin-dev skills 总览

plugin-dev 工具包提供 9 个用于构建 Claude Code plugins 的专业 skills，以及当前这个指南。每个 skill 都负责 plugin development 中的一个特定领域。

### Skills 快速参考

| Skill | 用途 |
| ---- | ---- |
| **plugin-structure**      | 目录布局、manifest 与组件组织        |
| **command-development**   | 简单 prompt（commands/ 中的单个 .md 文件） |
| **agent-development**     | 自主 subagents                         |
| **skill-development**     | 带打包资源的复杂 prompt（skills/）   |
| **hook-development**      | 事件驱动自动化                       |
| **mcp-integration**       | Model Context Protocol 服务器        |
| **lsp-integration**       | 用于代码智能的 Language Server Protocol |
| **plugin-settings**       | 通过 .local.md 进行用户配置          |
| **marketplace-structure** | plugin marketplace 创建              |

## 何时使用各个 skill

### 开始一个新 plugin

**Skill：`plugin-structure`**

当用户需要以下内容时使用：

- 从零创建一个新 plugin
- 了解 plugin 目录布局
- 配置 plugin.json manifest
- 学习组件自动发现机制
- 使用 ${CLAUDE_PLUGIN_ROOT} 实现可移植路径

### 添加面向用户的 command

**Skill：`command-development`**

当用户需要以下内容时使用：

- 创建 slash commands（/command-name）
- 配置 command frontmatter（description、allowed-tools、model）
- 使用动态参数（$ARGUMENTS、$1、$2）
- 使用 @ 语法引用文件
- 在反引号前使用字面量 `!` 内联执行 bash

### 创建自主 agent

**Skill：`agent-development`**

当用户需要以下内容时使用：

- 为复杂任务创建 subagents
- 编写 agent system prompts
- 配置 agent 触发方式（带示例的 description）
- 选择 agent 模型和颜色
- 限制 agent 可访问的工具

### 构建 skill

**Skill：`skill-development`**

当用户需要以下内容时使用：

- 创建扩展 Claude 能力的 skills
- 编写带正确 frontmatter 的 SKILL.md
- 使用渐进式披露组织 skill 内容
- 创建 references/、examples/、scripts/ 目录
- 编写有效的触发短语

### 实现事件 hooks

**Skill：`hook-development`**

当用户需要以下内容时使用：

- 响应 Claude Code 事件（PreToolUse、Stop、SessionStart 等）
- 创建基于 prompt 或基于 command 的 hooks
- 在执行前校验工具输入
- 强制执行完成标准
- 阻止危险操作

### 通过 MCP 集成外部服务

**Skill：`mcp-integration`**

当用户需要以下内容时使用：

- 向 plugin 添加 MCP servers
- 配置 stdio、SSE 或 HTTP MCP servers
- 设置认证（OAuth、tokens）
- 在 commands 和 agents 中使用 MCP tools
- 在 PulseMCP 上发现现有 MCP servers

### 通过 LSP 添加代码智能

**Skill：`lsp-integration`**

当用户需要以下内容时使用：

- 向 plugin 添加 Language Server Protocol servers
- 启用受支持的代码导航能力，例如 go-to-definition 和 find-references
- 配置语言特定服务器（pyright、gopls、rust-analyzer）
- 设置 extensionToLanguage 映射
- 增强 Claude 的代码理解能力

### 管理 plugin 配置

**Skill：`plugin-settings`**

当用户需要以下内容时使用：

- 存储用户可配置设置
- 使用 .claude/plugin-name.local.md 模式
- 在 hooks 中解析 YAML frontmatter
- 创建临时激活的 hooks
- 管理 agent 状态

### 创建 plugin marketplace

**Skill：`marketplace-structure`**

当用户需要以下内容时使用：

- 为多个 plugins 创建 marketplace
- 配置 marketplace.json
- 设置 plugin source（relative、GitHub、git URL）
- 向团队分发 plugins
- 组织 plugin 集合

## skill 选择决策树

```
User wants to...
├── Create/organize a plugin structure? → plugin-structure
├── Add a simple slash command (no bundled resources)? → command-development
├── Create an autonomous agent? → agent-development
├── Add a complex skill with scripts/references? → skill-development
├── React to Claude Code events? → hook-development
├── Integrate external service/API? → mcp-integration
├── Add code intelligence/LSP? → lsp-integration
├── Make plugin configurable? → plugin-settings
└── Distribute multiple plugins? → marketplace-structure
```

## 常见多 skill 工作流

### 构建完整 plugin

1. **开始**：加载 `plugin-structure` skill 以创建目录布局
2. **添加功能**：为面向用户的 command 加载 `command-development`
3. **自动化**：为事件驱动行为加载 `hook-development`
4. **配置**：如果需要用户配置，则加载 `plugin-settings`
5. **验证**：使用 plugin-validator agent 验证结构

### 创建由 MCP 驱动的 plugin

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **集成**：加载 `mcp-integration` 以配置 MCP servers
3. **Command**：加载 `command-development` 以创建使用 MCP tools 的 commands
4. **Agent**：加载 `agent-development` 以支持自主 MCP 工作流

### 构建代码智能 plugin

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **LSP**：加载 `lsp-integration` 以配置语言服务器
3. **Command**：加载 `command-development` 以创建使用 LSP 功能的 commands

### 构建 skill-focused plugin

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **Skill**：加载 `skill-development` 以创建专业 skills
3. **验证**：使用 skill-reviewer agent 验证 skill 质量

## 可用 agents

plugin-dev plugin 还提供 3 个 agents：

| Agent | 用途 |
| ---- | ---- |
| **plugin-validator** | 验证 plugin 结构和 manifests         |
| **skill-reviewer**   | 审查 skill 质量和触发方式           |
| **agent-creator**    | 根据描述生成新的 agent              |

在创建组件后应主动使用 agents 以确保质量。

## 可用 commands

| Command | 用途 |
| ---- | ---- |
| `/plugin-dev:plugin-dev-guide`   | 总览与 skill 路由                        |
| `/plugin-dev:start`              | 入口点 - 选择创建 plugin 或 marketplace   |
| `/plugin-dev:create-plugin`      | 8 阶段引导式 plugin 创建 workflow         |
| `/plugin-dev:create-marketplace` | 8 阶段引导式 marketplace 创建 workflow    |

---

## 用户请求

$ARGUMENTS

如果用户在上方提供了请求，请分析该请求并执行以下其一：

1. 如果请求明显对应单一领域，**路由到特定 skill**
2. 使用本指南中的总览信息**直接回答**
3. 如果请求有歧义，**请求澄清**

如果没有提供请求，则总结可用的 plugin development 能力，并询问用户想构建什么或想了解什么。
