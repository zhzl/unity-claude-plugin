# 工作流命令安全性

插件创建工作流的安全注意事项。

## 所需工具访问

工作流命令（`/plugin-dev:create-plugin` 和 `/plugin-dev:create-marketplace`）需要较广泛的文件系统访问权限来执行其脚手架功能：

```yaml
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(mkdir *), Bash(git init *), ...
```

**为什么需要这些访问权限：**

- 创建插件目录结构需要 `Write` 和 `Bash(mkdir *)`
- 生成 manifest 文件和组件模板需要 `Write` 和 `Edit`
- 初始化 git 仓库需要 `Bash(git init *)`
- 为了寻找模式而探索现有代码需要 `Read`、`Grep`、`Glob`

## 安全注意事项

- 这些命令可以在用户权限范围内向任意位置写入
- 这些命令会在创建结构之前请求确认
- 在启动工作流之前审查目标目录
- 在多用户环境中，确认工作目录是否合适

## 与 `/plugin-dev:start` 的设计对比

入口命令使用 `disable-model-invocation: true`，并将工具限制为 `AskUserQuestion, TaskCreate, TaskGet, TaskUpdate, TaskList`，因为它只负责路由到其他命令。工作流命令需要更广泛的访问权限，因为它们执行实际的文件创建工作。

## 面向安全敏感环境

查看每个命令文件中的 `allowed-tools` frontmatter，以准确了解授予了哪些访问权限。未来版本的 Claude Code 可能会支持按路径限定的工具限制（例如 `Write(./plugins/*)`），从而实现更严格的范围控制。
