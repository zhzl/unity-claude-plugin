---
description: 开始 plugin development 流程并帮助用户 choose your path
argument-hint: "[description]"
allowed-tools: AskUserQuestion, TaskCreate, TaskGet, TaskUpdate, TaskList
model: sonnet
disable-model-invocation: true
---

# 插件开发（Plugin Development）入口命令

欢迎用户，并帮助他们为自己的 plugin 开发之旅选择合适的路径。

## 你的任务

为用户清晰呈现两条开发路径，说明各自适用场景，然后将其路由到正确的工作流。

## 第 1 步：处理参数

如果用户提供了参数（$ARGUMENTS 不为空）：

- 分析参数，判断用户意图是否已经足够清晰
- 如果参数明确指向 plugin（例如 "数据库迁移工具"），建议 plugin 路径
- 如果参数明确指向 marketplace（例如 "团队工具集合"、"分发我们的 plugins"），建议 marketplace 路径
- 即使如此，路由前仍要请求确认

**初始请求：** $ARGUMENTS

## 第 2 步：提供背景

在提出问题之前，先简要说明：

```text
Welcome to the Plugin Development Toolkit!

I'll help you get started. First, let me explain your options:

**Plugin** → A self-contained extension that adds functionality to Claude Code
- Contains skills (knowledge), commands (actions), agents (automation), hooks (events), or MCP servers (integrations)
- Example: "A plugin for managing database migrations"
- This is what most developers want to create

**Marketplace** → A collection that organizes and distributes multiple plugins
- Contains references to one or more plugins (local or remote)
- Example: "A marketplace for our team's internal tools"
- Choose this if you already have plugins to organize, or want to plan a collection upfront
```

## 第 3 步：向用户提问

使用 AskUserQuestion 工具，并传入以下参数：

- **header**: "创建"
- **question**: "你想创建什么？"
- **multiSelect**: false
- **options**: （定义如下）

**选项**：

选项 1：

- label: "一个 plugin（推荐）"
- description: "创建单个 plugin，其中可包含 skills、commands、agents、hooks 或 MCP 集成。最适合：构建新功能、为 Claude Code 增加能力，或学习 plugin 开发。"

选项 2：

- label: "一个 marketplace"
- description: "创建一个集合，用于组织和分发多个 plugins。最适合：团队共享内部工具、发布精选插件集合，或整理现有 plugins。"

## 第 4 步：根据选择进行路由

当用户选择某个选项后：

**如果他们选择了 "一个 plugin（推荐）"**：

- 确认他们的选择
- 告诉用户结合 $ARGUMENTS 中的上下文运行 `/plugin-dev:create-plugin`

**如果他们选择了 "一个 marketplace"**：

- 确认他们的选择
- 告诉用户结合 $ARGUMENTS 中的上下文运行 `/plugin-dev:create-marketplace`

---

## 示例交互

### 示例 1：未提供参数

```text
User: /plugin-dev:start

Claude: Welcome to the Plugin Development Toolkit!

I'll help you get started. First, let me explain your options:

**Plugin** → A self-contained extension that adds functionality to Claude Code
- Contains skills (knowledge), commands (actions), agents (automation), hooks (events), or MCP servers (integrations)
- Example: "A plugin for managing database migrations"
- This is what most developers want to create

**Marketplace** → A collection that organizes and distributes multiple plugins
- Contains references to one or more plugins (local or remote)
- Example: "A marketplace for our team's internal tools"
- Choose this if you already have plugins to organize, or want to plan a collection upfront

[Uses AskUserQuestion to present the choice]
```

### 示例 2：参数表明应创建插件（plugin）

```text
User: /plugin-dev:start a code review assistant

Claude: Welcome to the Plugin Development Toolkit!

Based on your description "a code review assistant", it sounds like you want to create a **plugin** - a self-contained extension that adds code review functionality to Claude Code.

[Uses AskUserQuestion to confirm: "Does creating a plugin sound right for your needs?"]

User: Yes

Claude: Great! Next, run `/plugin-dev:create-plugin a code review assistant` to start the plugin creation workflow.
```

### 示例 3：参数表明应创建插件市场（marketplace）

```text
User: /plugin-dev:start organize our team's internal tools

Claude: Welcome to the Plugin Development Toolkit!

Based on your description "organize our team's internal tools", it sounds like you want to create a **marketplace** - a collection to distribute plugins to your team.

[Uses AskUserQuestion to confirm: "Does creating a marketplace sound right for your needs?"]

User: Yes

Claude: Great! Next, run `/plugin-dev:create-marketplace organize our team's internal tools` to start the marketplace creation workflow.
```

---

## 重要说明

- 在提问前始终清楚展示两个选项
- 如果提供了参数，先分析，但在路由前仍然要确认
- 使用友好、欢迎式的语气——这是用户的第一次交互
- 目标是帮助用户快速进入正确的工作流，而不是拖慢他们
- 如果用户提出问题而不是直接选择，请简要回答并引导他们回到选择上

---

从展示欢迎消息开始，并使用 AskUserQuestion 帮助用户选择路径。
