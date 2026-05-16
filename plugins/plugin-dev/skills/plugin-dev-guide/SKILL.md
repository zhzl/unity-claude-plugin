---
name: plugin-dev-guide
description: 当用户询问 "Claude Code plugins"、"plugin development"、"how to build a plugin"、"what plugin components exist"、"plugin architecture"、"extending Claude Code"，或需要了解 plugin-dev skills 与插件开发能力总览时使用。它作为 9 个专业 plugin-dev skills 的导览，说明何时应激活各个技能。当用户刚接触插件开发，或不确定自己需要哪个具体技能时，应先加载此技能。
---

# 插件开发指南

这个元技能提供 Claude Code 插件开发的总览，并根据当前任务将你路由到相应的专业技能。

## 插件开发技能总览

plugin-dev 工具包提供 9 个用于构建 Claude Code 插件的专业技能，以及当前这个指南。每个技能都负责插件开发中的一个特定领域。

### 技能快速参考

| Skill                     | Purpose                              |
| ------------------------- | ------------------------------------ |
| **plugin-structure**      | 目录布局、manifest 与组件组织        |
| **command-development**   | 简单 prompt（commands/ 中的单个 .md 文件） |
| **agent-development**     | 自主子 agent                         |
| **skill-development**     | 带打包资源的复杂 prompt（skills/）   |
| **hook-development**      | 事件驱动自动化                       |
| **mcp-integration**       | Model Context Protocol 服务器        |
| **lsp-integration**       | 用于代码智能的 Language Server Protocol |
| **plugin-settings**       | 通过 .local.md 进行用户配置          |
| **marketplace-structure** | 插件市场创建                         |

## 何时使用各个技能

### 开始一个新插件

**Skill: `plugin-structure`**

当用户需要以下内容时使用：

- 从零创建一个新插件
- 了解插件目录布局
- 配置 plugin.json manifest
- 学习组件自动发现机制
- 使用 ${CLAUDE_PLUGIN_ROOT} 实现可移植路径

### 添加面向用户的命令

**Skill: `command-development`**

当用户需要以下内容时使用：

- 创建 slash commands（/command-name）
- 配置命令 frontmatter（description、allowed-tools、model）
- 使用动态参数（$ARGUMENTS、$1、$2）
- 使用 @ 语法引用文件
- 在反引号前使用字面量 `!` 内联执行 bash

### 创建自主 Agents

**Skill: `agent-development`**

当用户需要以下内容时使用：

- 为复杂任务创建 subagents
- 编写 agent system prompts
- 配置 agent 触发方式（带示例的 description）
- 选择 agent 模型和颜色
- 限制 agent 可访问的工具

### 构建 Skills

**Skill: `skill-development`**

当用户需要以下内容时使用：

- 创建扩展 Claude 能力的 skills
- 编写带正确 frontmatter 的 SKILL.md
- 使用渐进式披露组织技能内容
- 创建 references/、examples/、scripts/ 目录
- 编写有效的触发短语

### 实现事件 Hooks

**Skill: `hook-development`**

当用户需要以下内容时使用：

- 响应 Claude Code 事件（PreToolUse、Stop、SessionStart 等）
- 创建基于 prompt 或基于命令的 hooks
- 在执行前校验工具输入
- 强制执行完成标准
- 阻止危险操作

### 通过 MCP 集成外部服务

**Skill: `mcp-integration`**

当用户需要以下内容时使用：

- 向插件添加 MCP servers
- 配置 stdio、SSE 或 HTTP MCP servers
- 设置认证（OAuth、tokens）
- 在 commands 和 agents 中使用 MCP tools
- 在 PulseMCP 上发现现有 MCP servers

### 通过 LSP 添加代码智能

**Skill: `lsp-integration`**

当用户需要以下内容时使用：

- 向插件添加 Language Server Protocol servers
- 启用受支持的代码导航能力，例如 go-to-definition 和 find-references
- 配置语言特定服务器（pyright、gopls、rust-analyzer）
- 设置 extensionToLanguage 映射
- 增强 Claude 的代码理解能力

### 管理插件配置

**Skill: `plugin-settings`**

当用户需要以下内容时使用：

- 存储用户可配置设置
- 使用 .claude/plugin-name.local.md 模式
- 在 hooks 中解析 YAML frontmatter
- 创建临时激活的 hooks
- 管理 agent 状态

### 创建插件市场

**Skill: `marketplace-structure`**

当用户需要以下内容时使用：

- 为多个插件创建 marketplace
- 配置 marketplace.json
- 设置插件来源（relative、GitHub、git URL）
- 向团队分发插件
- 组织插件集合

## 技能选择决策树

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

## 常见多技能工作流

### 构建完整插件

1. **开始**：加载 `plugin-structure` skill 以创建目录布局
2. **添加功能**：为面向用户的命令加载 `command-development`
3. **自动化**：为事件驱动行为加载 `hook-development`
4. **配置**：如果需要用户配置，则加载 `plugin-settings`
5. **验证**：使用 plugin-validator agent 验证结构

### 创建由 MCP 驱动的插件

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **集成**：加载 `mcp-integration` 以配置 MCP servers
3. **命令**：加载 `command-development` 以创建使用 MCP tools 的命令
4. **Agents**：加载 `agent-development` 以支持自主 MCP 工作流

### 构建代码智能插件

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **LSP**：加载 `lsp-integration` 以配置语言服务器
3. **命令**：加载 `command-development` 以创建使用 LSP 功能的命令

### 构建以 Skill 为核心的插件

1. **开始**：加载 `plugin-structure` 以建立基础结构
2. **Skills**：加载 `skill-development` 以创建专业技能
3. **验证**：使用 skill-reviewer agent 验证技能质量

## 可用 Agents

plugin-dev 插件还提供 3 个 agents：

| Agent                | Purpose                          |
| -------------------- | -------------------------------- |
| **plugin-validator** | 验证插件结构和 manifests         |
| **skill-reviewer**   | 审查技能质量和触发方式           |
| **agent-creator**    | 根据描述生成新的 agents          |

在创建组件后应主动使用 agents 以确保质量。

## 可用 Commands

| Command                          | Purpose                               |
| -------------------------------- | ------------------------------------- |
| `/plugin-dev:plugin-dev-guide`   | 总览与技能路由                        |
| `/plugin-dev:start`              | 入口点 - 选择创建插件或 marketplace   |
| `/plugin-dev:create-plugin`      | 8 阶段引导式插件创建工作流            |
| `/plugin-dev:create-marketplace` | 8 阶段引导式 marketplace 创建工作流   |

---

## 用户请求

$ARGUMENTS

如果用户在上方提供了请求，请分析该请求并执行以下其一：

1. 如果请求明显对应单一领域，**路由到特定技能**
2. 使用本指南中的总览信息**直接回答**
3. 如果请求有歧义，**请求澄清**

如果没有提供请求，则总结可用的插件开发能力，并询问用户想构建什么或想了解什么。
