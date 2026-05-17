# Permission Modes 与 Rules 参考

本参考说明 Claude Code 针对 project/user subagent 的权限系统，包括当前的 permission mode，以及用于细粒度访问控制的 permission rule 语法。

插件随附 agent 不应在 frontmatter 中设置 `permissionMode`。Claude Code 会忽略插件 agent 上的该字段，因此应改用 `tools`/`disallowedTools`，并结合已文档化的 user/project permission rules。

## Permission Modes

project/user subagent 可以在 frontmatter 中指定 `permissionMode`，用于控制权限请求的处理方式。插件随附 agent 不能依赖该字段，因为 Claude Code 会忽略它：

```yaml
permissionMode: acceptEdits
```

### 所有 Permission Mode

| 模式 | 行为 | 适用场景 |
| ---- | ---- | -------- |
| `default` | 标准权限模型——每次操作前都提示用户 | 通用 agent、不受信任上下文 |
| `acceptEdits` | 自动接受文件编辑操作（Write、Edit、NotebookEdit） | 需要写文件的代码生成 agent |
| `auto` | 让 Claude 自行选择合适的权限策略 | 可信工作流中希望获得自适应行为 |
| `dontAsk` | 跳过全部权限对话框 | 可信自动化 agent、CI/CD agent |
| `bypassPermissions` | 完全绕过所有权限检查 | 仅适用于完全可信的 agent |
| `plan` | planning mode——只提方案，不执行变更 | 架构/设计 agent、审查 agent |

### 模式细节

#### default

标准的交互式权限模型。Claude 会在执行需要权限的操作前先询问用户。当未指定 `permissionMode` 时，这就是隐式默认模式。

**适用场景：** 通用 agent、涉及敏感操作的 agent、运行在不受信任环境中的 agent。

#### acceptEdits

自动接受文件写入操作（Write、Edit、NotebookEdit），无需提示。其他操作（如 Bash）仍然需要用户授权。

**适用场景：** 代码生成 agent、重构 agent、文档生成 agent。

#### dontAsk

跳过所有权限对话框。agent 在执行任何操作时都不再向用户确认。

**适用场景：** 可信自动化、后台 agent、没有用户在场的 CI/CD 流水线。

#### bypassPermissions

完全绕过权限检查且不受限制。它比 `dontAsk` 更宽松，因为连系统级限制也会一并跳过。

**适用场景：** 仅适用于受控环境中的完全可信 agent。绝不要用于分发给未知用户的插件。

#### plan

planning mode 会把 agent 限制为只读操作。agent 可以探索代码库、提出变更方案，但不能直接执行。任何修改都需要先得到用户批准。

**适用场景：** 架构规划、设计审查、影响分析 agent。

#### auto

让 Claude 根据当前工作流自行选择合适的权限策略，而不是一开始就固定到单一模式。

**适用场景：** 可信工作流中希望获得自适应行为，但仍想让 Claude Code 权限系统负责决策。

### Team Lead 指导

对于以协作为主的 team lead，不要依赖 `delegate` permission mode。应当：

- 通过工具限制，让 lead 不具备其不该直接使用的实现能力
- 在 system prompt 中明确说明：lead 负责拆解工作、分派任务、审查 teammate 输出，而不是亲自编码
- 当需要更严格地限制生成行为时，在 settings 中使用 permission rules，例如 `Agent(code-reviewer, test-runner)`

## Permission Specifier 语法

permission specifier 用于精确描述某条规则会匹配哪种 tool 调用。每类 tool 都有自己的模式语法。

### Bash 模式

| Pattern | 行为 | 匹配示例 | 不匹配示例 |
| ------- | ---- | -------- | ---------- |
| `Bash(npm test)` | 精确匹配 | `npm test` | `npm test --watch` |
| `Bash(npm *)` | 带词边界的前缀匹配 | `npm test`, `npm install` | `npmx build` |
| `Bash(git*)` | 不带词边界的前缀匹配 | `git`, `git push`, `gitk` | — |

`*` 前面有空格表示词边界：`Bash(ls *)` 会匹配 `ls -la`，但**不会**匹配 `lsof`。没有空格则表示子串前缀：`Bash(git*)` 会同时匹配 `git push` 和 `gitk`。

### Edit/Read/Write 的路径模式

路径 specifier 遵循 gitignore 规范：

| Pattern | 含义 | 示例 |
| ------- | ---- | ---- |
| `//path` | 相对于文件系统根目录的绝对路径 | `Edit(//etc/config)` |
| `~/path` | 相对于 home 目录 | `Read(~/Documents/**)` |
| `/path` | 相对于 settings 文件所在位置 | `Edit(/src/**)` |
| `./path` | 相对于当前目录 | `Write(./output/*)` |
| `path` | 相对于当前目录（等同于 `./`） | `Edit(src/**)` |
| `*` | 单层目录通配符 | `Read(src/*)` |
| `**` | 递归目录通配符 | `Edit(src/**)` |

### WebFetch 模式

按域名限制：

```
WebFetch(domain:example.com)
```

### MCP Tool 模式

| Pattern | 匹配内容 |
| ------- | -------- |
| `mcp__server` | 该 server 的全部 tools |
| `mcp__server__*` | 该 server 的全部 tools |
| `mcp__server__tool` | 该 server 下的特定 tool |

### Agent 模式

| Pattern | 匹配内容 |
| ------- | -------- |
| `Agent(agent-name)` | 仅匹配指定名称的 agent type |
| `Agent(name1, name2)` | 仅匹配列出的 agent types |
| `Agent` | 全部 subagent types |
| _(omit entirely)_ | 不允许生成任何 subagent |

### Skill 模式

| Pattern | 匹配内容 |
| ------- | -------- |
| `Skill(name)` | 精确匹配 skill 名称 |
| `Skill(name *)` | 带参数的前缀匹配 |

### 求值顺序

规则按严格顺序求值——在每一层级中都是第一个匹配生效：

1. 先检查 **Deny** 规则
2. 再检查 **Ask** 规则
3. 最后检查 **Allow** 规则

### 默认权限层级

tools 默认分为三个权限层级：

| 层级 | Tools | 行为 |
| ---- | ----- | ---- |
| Read-only | Read, Glob, Grep | 无需批准 |
| Bash commands | Bash | 每个目录/命令首次使用时需手动批准 |
| File modification | Write, Edit, NotebookEdit | 每个会话需要批准 |

## Permission Rules

permission rules 提供针对特定 tool 访问的细粒度控制。它们配置在 settings 文件中（而不是 agent frontmatter），并根据优先级生效。

### Rule 语法

在 `settings.json` 的 `permissions` 下定义规则：

```json
{
  "permissions": {
    "allow": ["Read", "Bash(npm test)", "Edit(src/**)"],
    "deny": ["Bash(rm *)", "Bash(git push --force*)"]
  }
}
```

### Tool Specifier

| Pattern | 匹配内容 | 示例 |
| ------- | -------- | ---- |
| `ToolName` | 该 tool 的任意使用 | `Read` — 所有文件读取 |
| `ToolName(argument)` | 带特定参数的 tool 调用 | `Bash(npm test)` — 仅该命令 |
| `ToolName(pattern*)` | 带通配参数的 tool 调用 | `Bash(npm *)` — 任意 npm 命令 |
| `Edit(path)` | 带 gitignore 风格路径的 Edit | `Edit(src/**)` — 编辑 `src/` 下内容 |
| `Write(path)` | 带 gitignore 风格路径的 Write | `Write(tests/**)` — 写入 `tests/` 下内容 |

### MCP Tool 模式

```json
{
  "permissions": {
    "allow": ["mcp__servername__toolname", "mcp__servername__*"]
  }
}
```

- `mcp__server__tool` — 特定 MCP tool
- `mcp__server__*` — 某个 server 下的全部 tools
- `mcp__*` — 全部 MCP tools（谨慎使用）

### Agent 模式

控制允许生成哪些 agent type：

```json
{
  "permissions": {
    "allow": ["Agent(code-reviewer, test-runner)"]
  }
}
```

- `Agent(type1, type2)` — 仅允许列出的 agent type
- `Agent` — 允许任意 subagent
- 省略 `Agent` — 不允许生成 subagent

### Rule 优先级

当多条规则同时匹配时：

1. **deny** 规则始终优先于 **allow** 规则
2. 更具体的规则优先于更宽泛的规则
3. 显式规则优先于 `permissionMode` 设置

### 面向插件开发者的指导

**文档化所需权限：** 如果插件的 agent 需要特定工具访问，请在 README 中写明最小必需权限：

```markdown
## Required Permissions

This plugin's agents need:

- `Edit(src/**)` — to modify source files
- `Bash(npm test)` — to run tests
- `mcp__myserver__*` — for MCP tool access
```

**配置 agent 权限：** 对于插件随附 agent，不要把 `permissionMode` 放进 agent frontmatter。Claude Code 会忽略它。应改为通过 `tools`/`disallowedTools` 约束插件 agent，并说明用户/项目侧必须配置的 permission rules。

**最小权限原则：** 只申请 agent 实际需要的权限。对于 project/user subagent，当只需要文件写入时，优先使用 `acceptEdits` 这类较窄的模式，而不是 `dontAsk` 这类更宽泛的模式。