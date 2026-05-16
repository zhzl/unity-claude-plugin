---
name: plugin-structure
description: 当用户要求 "create a plugin"、"scaffold a plugin"、理解 plugin structure、组织插件组件、设置 plugin.json、使用 ${CLAUDE_PLUGIN_ROOT}、添加 commands/agents/skills/hooks、添加 lspServers、配置 auto-discovery、处理 headless mode、CI mode、plugin in CI、github actions、plugin caching、plugin CLI、install plugin、installation scope、auto-update、validate plugin、plugin validate、debug plugin、output styles、outputStyles、custom output format、response formatting、--verbose，或需要关于插件目录布局、manifest 配置、组件组织、文件命名约定或 Claude Code 插件架构最佳实践的指导时，应使用此技能。
---

# Claude Code 的插件结构

## 概览

Claude Code 插件遵循标准化的目录结构，并支持组件自动发现。掌握这套结构，才能创建组织良好、易于维护、并能与 Claude Code 无缝集成的插件。

**关键概念：**

- 用于自动发现的约定式目录布局
- 当需要元数据、自定义路径或配置时，可在 `.claude-plugin/plugin.json` 中使用可选的 manifest 驱动配置
- 基于组件的组织方式（commands、agents、skills、hooks）
- 使用 `${CLAUDE_PLUGIN_ROOT}` 的可移植路径引用
- 显式加载与自动发现加载的区别

## 目录结构

每个 Claude Code 插件都遵循这种组织模式：

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Optional: metadata/custom paths/config
├── commands/                 # Slash commands (.md files)
├── agents/                   # Subagent definitions (.md files)
├── skills/                   # Agent skills (subdirectories)
│   └── skill-name/
│       └── SKILL.md         # Required for each skill
├── hooks/
│   └── hooks.json           # Event handler configuration
├── .mcp.json                # MCP server definitions
└── scripts/                 # Helper scripts and utilities
```

**关键规则：**

1. **Manifest 位置**：如果存在，`plugin.json` manifest 必须位于 `.claude-plugin/` 中，并且必须包含 `name`
2. **组件位置**：所有组件目录（commands、agents、skills、hooks）都必须位于插件根目录层级，不能嵌套在 `.claude-plugin/` 内
3. **可选组件**：只为插件实际使用的组件创建目录
4. **命名约定**：所有目录名和文件名都使用 kebab-case

## 插件 Manifest（plugin.json）

可选的 manifest 用于定义插件元数据和配置。当你需要元数据、自定义组件路径或配置时，请使用 `.claude-plugin/plugin.json`；如果存在，它必须包含 `name`：

### 必填字段

```json
{
  "name": "plugin-name"
}
```

**名称要求：**

- 使用 kebab-case 格式（小写字母加连字符）
- 在已安装插件中必须唯一
- 不能包含空格或特殊字符
- 示例：`code-review-assistant`、`test-runner`、`api-docs`

### 推荐元数据

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Brief explanation of plugin purpose",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://docs.example.com",
  "repository": "https://github.com/user/plugin-name",
  "license": "MIT",
  "keywords": ["testing", "automation", "ci-cd"]
}
```

**版本格式**：遵循语义化版本（MAJOR.MINOR.PATCH）
**Keywords**：用于插件发现与分类

### 组件路径配置

为组件指定自定义路径：

```json
{
  "name": "plugin-name",
  "commands": ["./commands", "./custom-commands"],
  "agents": ["./agents", "./specialized-agents"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

**重要**：路径行为因字段而异。自定义 `skills` 路径会补充默认的 `./skills` 目录。自定义 `commands`、`agents` 和 `outputStyles` 路径会替换默认值，除非像上例那样显式列出默认路径。Hooks、MCP 和 LSP 则各自有独立的文件/合并行为。

**路径规则：**

- 必须相对于插件根目录
- 必须以 `./` 开头
- 不能使用绝对路径
- 对于支持多个位置的字段，可使用数组

## 组件组织

### Commands

**位置**：`commands/` 目录
**格式**：带 YAML frontmatter 的 Markdown 文件
**自动发现**：`commands/` 中的所有 `.md` 文件都会自动加载

Commands 是简单、可由用户直接调用的提示，存放为单个 `.md` 文件。适用于不需要打包附属资源的场景。Commands 和 skills 都通过 Skill tool 调用——commands 本质上可以看作简单版 skills。

**示例结构：**

```
commands/
├── review.md        # /review command
├── test.md          # /test command
└── deploy.md        # /deploy command
```

**文件格式：**

```markdown
---
name: command-name
description: Command description
---

Command implementation instructions...
```

**用法**：Commands 会以原生 slash command 的形式集成到 Claude Code 中

### Agents

**位置**：`agents/` 目录
**格式**：带 YAML frontmatter 的 Markdown 文件
**自动发现**：`agents/` 中的所有 `.md` 文件都会自动加载

**示例结构：**

```
agents/
├── code-reviewer.md
├── test-generator.md
└── refactorer.md
```

**文件格式：**

```markdown
---
name: example-agent
description: |
  Use this agent when a task needs specialized analysis or a focused role with domain-specific instructions.
model: sonnet
color: blue
---

Detailed agent instructions and knowledge...
```

**用法**：用户可以手动调用 agents，Claude Code 也会根据任务上下文自动选择它们

### Skills

**位置**：`skills/` 目录，每个 skill 使用一个子目录
**格式**：每个 skill 位于自己的目录中，并包含 `SKILL.md` 文件
**自动发现**：skill 子目录中的所有 `SKILL.md` 文件都会自动加载

Skills 是带打包资源的复杂提示（scripts、references、examples）。适用于需要渐进式信息披露或辅助文件的场景。Skills 和 commands 都通过 Skill tool 调用。

**示例结构：**

```
skills/
├── api-testing/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── test-runner.py
│   └── references/
│       └── api-spec.md
└── database-migrations/
    ├── SKILL.md
    └── examples/
        └── migration-template.sql
```

**SKILL.md 格式：**

```markdown
---
name: Skill Name
description: When to use this skill
---

Skill instructions and guidance...
```

**工具限制**（可选）：Skills 可以在 frontmatter 中包含 `allowed-tools` 来限制工具访问：

```yaml
---
name: safe-reader
description: Read-only file access skill
allowed-tools: Read, Grep, Glob # Optional: restricts available tools
---
```

适用于只读工作流、安全敏感任务或范围受限的操作。

**Supporting files**：Skills 可以在子目录中包含 scripts、references、examples 或 assets

**用法**：Claude Code 会根据任务上下文与 description 的匹配情况，自主激活相应 skills

### Hooks

**位置**：`hooks/hooks.json`，或内联写在 `plugin.json` 中
**格式**：定义事件处理器的 JSON 配置
**注册方式**：插件启用时会自动注册 hooks

**示例结构：**

```
hooks/
├── hooks.json           # Hook configuration
└── scripts/
    ├── validate.sh      # Hook script
    └── check-style.sh   # Hook script
```

**配置格式：**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**可用事件**：PreToolUse、PermissionRequest、PostToolUse、Stop、SubagentStop、SessionStart、SessionEnd、UserPromptSubmit、PreCompact、Notification

**用法**：Hooks 会响应 Claude Code 事件自动执行

### MCP Servers

**位置**：插件根目录下的 `.mcp.json`，或内联写在 `plugin.json` 中
**格式**：用于定义 MCP server 的 JSON 配置
**自动启动**：插件启用时，servers 会自动启动

**示例格式：**

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**用法**：MCP servers 会与 Claude Code 的工具系统无缝集成

### LSP Servers

**位置**：内联写在 `plugin.json` 的 `lspServers` 字段下
**格式**：用于定义 Language Server Protocol servers 的 JSON 配置
**自动启动**：当打开与扩展名匹配的文件时，servers 会启动

**示例格式：**

```json
{
  "lspServers": {
    "python": {
      "command": "pyright-langserver",
      "args": ["--stdio"],
      "extensionToLanguage": {
        ".py": "python",
        ".pyi": "python"
      }
    }
  }
}
```

**用法**：LSP servers 可以提供受支持的代码智能能力，例如 go-to-definition、references 和 hover

关于详细的 LSP 配置，请参见 `lsp-integration` skill。

### Output Styles

**位置**：在 `plugin.json` 的 `outputStyles` 字段中通过路径引用
**格式**：指向样式文件/目录的字符串路径或路径数组
**用途**：自定义 Claude 的响应格式

**示例格式：**

```json
{
  "outputStyles": "./styles/"
}
```

或使用多个路径：

```json
{
  "outputStyles": ["./styles/default.md", "./styles/compact.md"]
}
```

**用法**：插件可以为其领域定义一致的输出格式。引用路径中的样式文件会被加载，以自定义 Claude 的输出行为。

有关 output styles 的完整指南，包括 frontmatter schema、文件位置以及何时使用 styles 而不是其他组件，请参见 `references/output-styles.md`。

## 可移植路径引用

### ${CLAUDE_PLUGIN_ROOT}

对所有插件内部路径引用，都应使用 `${CLAUDE_PLUGIN_ROOT}` 环境变量：

```json
{
  "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/run.sh"
}
```

**为什么重要**：插件的安装位置会因以下因素而不同：

- 用户的安装方式（marketplace、local、npm）
- 操作系统约定
- 用户偏好

**适用位置**：

- Hook command 路径
- MCP server command 参数
- Script 执行引用
- 资源文件路径

**绝不要使用**：

- 硬编码绝对路径（`/Users/name/plugins/...`）
- 相对于工作目录的路径（例如 commands 中的 `./scripts/...`）
- Home 目录缩写（`~/plugins/...`）

### 路径解析规则

**在 manifest JSON 字段中**（hooks、MCP servers）：

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/tool.sh"
}
```

**在组件文件中**（commands、agents、skills）：

```markdown
Reference scripts at: ${CLAUDE_PLUGIN_ROOT}/scripts/helper.py
```

**在执行的脚本中**：

```bash
#!/bin/bash
# ${CLAUDE_PLUGIN_ROOT} available as environment variable
source "${CLAUDE_PLUGIN_ROOT}/lib/common.sh"
```

## 文件命名约定

### 组件文件

**Commands**：使用 kebab-case 的 `.md` 文件

- `code-review.md` → `/code-review`
- `run-tests.md` → `/run-tests`
- `api-docs.md` → `/api-docs`

**Agents**：使用描述角色的 kebab-case `.md` 文件

- `test-generator.md`
- `code-reviewer.md`
- `performance-analyzer.md`

**Skills**：使用 kebab-case 的目录名

- `api-testing/`
- `database-migrations/`
- `error-handling/`

### Supporting Files

**Scripts**：使用带合适扩展名、语义清晰的 kebab-case 名称

- `validate-input.sh`
- `generate-report.py`
- `process-data.js`

**Documentation**：使用 kebab-case 的 markdown 文件

- `api-reference.md`
- `migration-guide.md`
- `best-practices.md`

**Configuration**：使用标准命名

- `hooks.json`
- `.mcp.json`
- `plugin.json`

## 自动发现机制

Claude Code 会自动发现并加载组件：

1. **Plugin manifest**：存在时读取 `.claude-plugin/plugin.json`
2. **Commands**：扫描 `commands/` 目录中的 `.md` 文件
3. **Agents**：扫描 `agents/` 目录中的 `.md` 文件
4. **Skills**：扫描 `skills/` 中包含 `SKILL.md` 的子目录
5. **Hooks**：从 `hooks/hooks.json` 或 manifest 加载配置
6. **MCP servers**：从 `.mcp.json` 或 manifest 加载配置

**发现时机：**

- 插件安装时：组件向 Claude Code 注册
- 插件启用时：组件可供使用
- 无需重启：更改会在下一次 Claude Code 会话生效

**覆盖行为**：自定义 `skills` 路径会补充默认目录；自定义 `commands`、`agents` 和 `outputStyles` 路径会替换默认值，除非显式列出默认路径。

## 最佳实践

### 组织方式

1. **逻辑分组**：将相关组件组织在一起
   - 将测试相关的 commands、agents 和 skills 放在一起
   - 在 `scripts/` 中按用途创建子目录

2. **最小化 manifest**：保持 `plugin.json` 精简
   - 仅在必要时指定自定义路径
   - 标准布局优先依赖自动发现
   - 仅在简单场景下使用内联配置

3. **文档**：包含 README 文件
   - 插件根目录：整体用途和用法
   - 组件目录：具体指导
   - Script 目录：用法与要求

### 命名

1. **一致性**：跨组件使用一致的命名
   - 如果 command 叫 `test-runner`，相关 agent 可命名为 `test-runner-agent`
   - Skill 目录名应与其用途匹配

2. **清晰性**：使用能体现用途的描述性名称
   - 好：`api-integration-testing/`、`code-quality-checker.md`
   - 避免：`utils/`、`misc.md`、`temp.sh`

3. **长度**：在简洁与清晰之间取得平衡
   - Commands：2-3 个词（`review-pr`、`run-ci`）
   - Agents：清楚描述角色（`code-reviewer`、`test-generator`）
   - Skills：聚焦主题（`error-handling`、`api-design`）

### 可移植性

1. **始终使用 ${CLAUDE_PLUGIN_ROOT}**：绝不要硬编码路径
2. **在多系统上测试**：验证 macOS、Linux、Windows
3. **记录依赖**：列出所需工具和版本
4. **避免系统特定特性**：使用可移植的 bash/Python 写法

### 维护

1. **一致地管理版本**：发布时更新 plugin.json 中的版本
2. **平滑弃用**：移除前清楚标记旧组件
3. **记录 breaking changes**：说明会影响现有用户的变更
4. **充分测试**：变更后验证所有组件都能正常工作

## 常见模式

### Minimal Plugin

只有一个 command、没有依赖：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json    # Just name field
└── commands/
    └── hello.md       # Single command
```

### Full-Featured Plugin

包含所有组件类型的完整插件：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/          # User-facing commands
├── agents/            # Specialized subagents
├── skills/            # Auto-activating skills
├── hooks/             # Event handlers
│   ├── hooks.json
│   └── scripts/
├── .mcp.json          # External integrations
└── scripts/           # Shared utilities
```

### Skill-Focused Plugin

只提供 skills 的插件：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

## 插件缓存

Claude Code 会缓存插件内容以提升性能。理解缓存行为有助于开发和调试。

### 会被缓存的内容

- Plugin manifest（plugin.json）
- 组件文件（commands、agents、skills）
- 配置文件（hooks.json、.mcp.json）

### 缓存失效

在以下情况下，缓存内容会刷新：

- Claude Code 会话重启
- 插件被重新安装或更新
- 用户运行 `/plugins refresh`（如果可用）

### 为什么外部路径会失败

**重要：** 插件目录之外的路径可能无法可靠工作，原因包括：

1. **安全边界** - 插件被限制在其目录范围内
2. **缓存** - 外部路径的变更不会被监控
3. **可移植性** - 外部路径在不同机器上会失效

**始终使用：**

- `${CLAUDE_PLUGIN_ROOT}` 表示插件内部路径
- 打包资源，而不是外部文件引用
- 环境变量表示用户特定路径

### 开发工作流

开发期间，可通过以下方式重新加载插件：

1. 退出 Claude Code
2. 修改插件文件
3. 重启 Claude Code

或者使用 `--plugin-dir` 在不安装的情况下进行测试：

```bash
claude --plugin-dir /path/to/plugin
```

## 运行时上下文

插件会根据运行时上下文表现出不同的行为。交互式会话支持 slash commands 和用户提示；headless mode（`claude -p`）以及 GitHub Actions 则属于非交互环境，某些特性不可用。

- **Headless/CI mode:** 参见 `references/headless-ci-mode.md`，了解如何设计能在 `claude -p` 和 CI 流水线中工作的插件
- **GitHub Actions:** 参见 `references/github-actions.md`，了解如何将插件集成到 `claude-code-action@v1`
- **Advanced topics:** 参见 `references/advanced-topics.md`，了解缓存行为、installation scopes、CLI 管理、keybindings、status line 和 auto-update 行为

## 插件校验

Claude Code 提供了内建的校验工具：

- **`claude plugin validate`**（CLI）/ **`/plugin validate`**（TUI）：校验插件与 marketplace 结构，检查 JSON 语法、必填字段、组件发现和路径解析
- **`claude --debug`**：显示详细的插件加载日志，包括发现了哪些组件、注册错误以及 hook 执行细节
- **`claude --verbose`**：在插件加载期间使用 `--verbose` 获取额外调试输出，包括 hook 注册和 MCP server 连接
- **`/plugins`**：查看已安装插件、其状态以及 Errors 标签中的任何错误

在开发过程中尽早并频繁使用这些校验工具。

### 附加 Source 类型

当 marketplace schema 支持时，Marketplace 条目可以指向基于 package 的插件 source。对于 npm packages，应将 npm package 信息放在 marketplace 插件的 `source` 对象中，而不是在插件本身中记录直接的包管理器安装方式。

在 marketplace 条目配置完成后，可使用 `claude plugin install <plugin-name>@<marketplace-name>` 进行 marketplace 安装。

## 故障排查

**组件未加载**：

- 确认文件位于正确目录且扩展名正确
- 检查 YAML frontmatter 语法（commands、agents、skills）
- 确保 skill 使用的是 `SKILL.md`（而不是 `README.md` 或其他名称）
- 确认插件已在 Claude Code 设置中启用

**路径解析错误**：

- 将所有硬编码路径替换为 `${CLAUDE_PLUGIN_ROOT}`
- 确认 manifest 中的路径是相对路径并以 `./` 开头
- 检查被引用的文件是否存在于指定路径
- 在 hook scripts 中使用 `echo $CLAUDE_PLUGIN_ROOT` 进行测试

**自动发现未生效**：

- 确认目录位于插件根目录（而不是 `.claude-plugin/` 内）
- 检查文件命名是否遵循约定（kebab-case、正确扩展名）
- 确认 manifest 中的自定义路径正确
- 重启 Claude Code 以重新加载插件配置

**插件之间发生冲突**：

- 使用唯一且具描述性的组件名称
- 如有需要，为 commands 加上插件名称命名空间
- 在插件 README 中记录潜在冲突
- 对相关功能考虑使用 command 前缀

---

## 附加资源

### Reference Files

- **`references/component-patterns.md`** - 每种组件类型的详细模式
- **`references/manifest-reference.md`** - 完整的 plugin.json 字段参考
- **`references/headless-ci-mode.md`** - Headless 和 CI mode 下的插件兼容性
- **`references/github-actions.md`** - 插件的 GitHub Actions 集成
- **`references/advanced-topics.md`** - 缓存、installation scopes、CLI commands 等更多主题
- **`references/output-styles.md`** - Output style frontmatter schema、文件位置和使用指导

### Example Files

`examples/` 中的可工作示例：

- **`minimal-plugin.md`** - 单 command 插件结构
- **`standard-plugin.md`** - 包含多个组件的典型插件
- **`advanced-plugin.md`** - 包含全部组件类型的全功能插件
