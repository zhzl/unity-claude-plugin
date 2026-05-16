# 最小插件示例

一个只有单个 command 的最简插件。

## 目录结构

```
hello-world/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    └── hello.md
```

## 文件内容

### .claude-plugin/plugin.json

```json
{
  "name": "hello-world"
}
```

### commands/hello.md

```markdown
---
name: hello
description: Prints a friendly greeting message
---

# Hello Command

Print a friendly greeting to the user.

## Implementation

Output the following message to the user:

> Hello! This is a simple command from the hello-world plugin.
>
> Use this as a starting point for building more complex plugins.

Include the current timestamp in the greeting to show the command executed successfully.
```

## 用法

安装插件后：

```
$ claude
> /hello
Hello! This is a simple command from the hello-world plugin.

Use this as a starting point for building more complex plugins.

Executed at: 2025-01-15 14:30:22 UTC
```

## 关键点

1. **最小 manifest**：只有必需的 `name` 字段
2. **单个 command**：`commands/` 目录中的一个 markdown 文件
3. **自动发现**：Claude Code 会自动找到这个 command
4. **无依赖**：没有 scripts、hooks 或外部资源

## 何时使用这种模式

- 快速原型
- 单一用途的小工具
- 学习插件开发
- 只提供一个明确功能的内部团队工具

## 扩展这个插件

要添加更多功能：

1. **添加 commands**：在 `commands/` 中创建更多 `.md` 文件
2. **添加元数据**：在 `plugin.json` 中补充 version、description、author
3. **添加 agents**：创建 `agents/` 目录并加入 agent 定义
4. **添加 hooks**：创建 `hooks/hooks.json` 处理事件
