---
name: command-development
description: 当用户请求 "create a slash command"、添加 command、编写自定义 command、定义 command 参数、使用 "command frontmatter"、组织 command、创建带文件引用的 command、"interactive command"、在 command 中使用 "AskUserQuestion"、"Skill tool"、程序化 command 调用、"disable-model-invocation"、阻止 Claude 运行 command、"debug command"、command debugging、troubleshoot command，或需要 Claude Code 中 slash command 结构、YAML frontmatter 字段、动态参数、command 内 bash 执行、用户交互模式、程序化调用控制、调试 command、command 开发最佳实践指导时使用。
---

# Claude Code Command 开发

## 概览

Slash command 是定义为 Markdown 文件的常用 prompt，Claude 会在交互式会话中执行它。掌握 command 结构、frontmatter 选项和动态功能，可以创建强大、可复用的 workflow。

**关键概念：**

- command 的 Markdown 文件格式
- 用于配置的 YAML frontmatter
- 动态参数和文件引用
- 用于上下文的 Bash 执行
- command 组织和命名空间

## Command 基础

### 什么是 Slash Command？

Slash command 是包含 prompt 的 Markdown 文件，被调用时由 Claude 执行。Command 提供：

- **可复用性**：定义一次，重复使用
- **一致性**：标准化常见 workflow
- **共享性**：跨团队或项目分发
- **效率**：快速访问复杂 prompt

### 关键规则：Commands are Instructions FOR Claude

**Command 是供 agent 消费的，不是写给人读的。**

当用户调用 `/command-name` 时，command 内容会成为 Claude 的指令。请把 command 写成给 Claude 的行动指令，说明要做什么；不要写成给用户看的说明消息。

**正确方式（给 Claude 的指令）：**

```markdown
Review this code for security vulnerabilities including:

- SQL injection
- XSS attacks
- Authentication issues

Provide specific line numbers and severity ratings.
```

**错误方式（给用户的消息）：**

```markdown
This command will review your code for security issues.
You'll receive a report with vulnerability details.
```

第一个示例告诉 Claude 要做什么。第二个示例告诉用户将发生什么，但没有指示 Claude。始终使用第一种方式。

### Commands 与 Skills：相同机制，不同复杂度

Command 和 skill 都通过同一个 **Skill tool** 调用。区别在于组织复杂度：

| 方面 | Commands | Skills |
| ---- | -------- | ------ |
| 位置 | `commands/` | `skills/name/` |
| 格式 | 单个 `.md` 文件 | `SKILL.md` + 可选资源 |
| 资源 | 无 | scripts/, references/, examples/ |
| 最适合 | 快速 prompt、简单 workflow | 复杂知识、打包资产 |

**调用控制**（两者都适用）：

- `disable-model-invocation: true` → 仅用户可调用（用于有副作用的操作：deploy、commit）
- 默认 → Claude 和用户都可调用

**何时将 command 升级为 skill**：如果需要脚本、参考文件或渐进式披露，请将 command 转换为 skill。指导见 `skill-development` skill。

### Command 位置

**项目 command**（与团队共享）：

- 位置：`.claude/commands/`
- 范围：仅在特定项目中可用
- 标签：在 `/help` 中显示为 “(project)”
- 用于：团队 workflow、项目特定任务

**个人 command**（到处可用）：

- 位置：`~/.claude/commands/`
- 范围：所有项目可用
- 标签：在 `/help` 中显示为 “(user)”
- 用于：个人 workflow、跨项目工具

**Plugin command**（随 plugin 打包）：

- 位置：`plugin-name/commands/`
- 范围：安装 plugin 后可用
- 标签：在 `/help` 中显示为 “(plugin-name)”
- 用于：plugin 特定功能

## 文件格式

### 基本结构

Command 是扩展名为 `.md` 的 Markdown 文件：

```
.claude/commands/
├── review.md           # /review command
├── test.md             # /test command
└── deploy.md           # /deploy command
```

**简单 command：**

```markdown
Review this code for security vulnerabilities including:

- SQL injection
- XSS attacks
- Authentication bypass
- Insecure data handling
```

基础 command 不需要 frontmatter。

### 使用 YAML frontmatter

使用 YAML frontmatter 添加配置：

```markdown
---
description: Review code for security issues
allowed-tools: Read, Grep, Bash(git *)
model: sonnet
---

Review this code for security vulnerabilities...
```

## YAML frontmatter 字段

### description

**用途：** 显示在 `/help` 中的简短描述

**类型：** 字符串

**默认：** command prompt 的第一行

```yaml
---
description: Review pull request for code quality
---
```

**最佳实践：** 清晰、可行动的描述（少于 60 个字符）

### allowed-tools

**用途：** 指定 command 可以使用哪些工具

**类型：** 逗号分隔的字符串

**默认：** 继承当前 conversation

```yaml
---
allowed-tools: Read, Write, Edit, Bash(git *)
---
```

**模式：**

- `Read, Write, Edit` - 指定工具
- `Bash(git *)` - 仅允许 Bash 运行 git command
- `*` - 所有工具（很少需要）

**使用时机：** command 需要特定工具访问权限

### model

**用途：** 指定 command 执行使用的 model

**类型：** 字符串

**取值：** `sonnet`、`opus`、`haiku` 或 `inherit`

**默认：** 继承当前 conversation

```yaml
---
model: haiku
---
```

**使用场景：**

- `haiku` - 快速、简单的 command
- `sonnet` - 标准 workflow
- `opus` - 复杂分析

短名称使用每个 model family 的当前默认版本。

### argument-hint

**用途：** 为自动补全记录预期参数

**类型：** 字符串

**默认：** 无

```yaml
---
argument-hint: "[pr-number] [priority] [assignee]"
---
```

**收益：**

- 帮助用户理解 command 参数
- 改善 command discovery
- 记录 command 接口

### disable-model-invocation

**用途：** 阻止 Skill tool 以程序方式调用 command

**类型：** 布尔值

**默认：** false

```yaml
---
disable-model-invocation: true
---
```

**使用时机：** command 应只能由用户手动调用

## 动态参数

### 使用 $ARGUMENTS

将所有参数捕获为单个字符串：

```markdown
---
description: Fix issue by number
argument-hint: "[issue-number]"
---

Fix issue #$ARGUMENTS following our coding standards and best practices.
```

**用法：**

```
> /fix-issue 123
> /fix-issue 456
```

**展开为：**

```
Fix issue #123 following our coding standards...
Fix issue #456 following our coding standards...
```

### 使用位置参数

使用 `$1`、`$2`、`$3` 等捕获单个参数：

```markdown
---
description: Review PR with priority and assignee
argument-hint: "[pr-number] [priority] [assignee]"
---

Review pull request #$1 with priority level $2.
After review, assign to $3 for follow-up.
```

**用法：**

```
> /review-pr 123 high alice
```

**展开为：**

```
Review pull request #123 with priority level high.
After review, assign to alice for follow-up.
```

### 组合参数

混合使用位置参数和剩余参数：

```markdown
Deploy $1 to $2 environment with options: $3
```

**用法：**

```
> /deploy api staging --force --skip-tests
```

**展开为：**

```
Deploy api to staging environment with options: --force --skip-tests
```

## 文件引用

### 使用 @ 语法

在 command 中包含文件内容：

```markdown
---
description: Review specific file
argument-hint: "[file-path]"
---

Review @$1 for:

- Code quality
- Best practices
- Potential bugs
```

**用法：**

```
> /review-file src/api/users.ts
```

**效果：** Claude 会在处理 command 前读取 `src/api/users.ts`

### 多个文件引用

引用多个文件：

```markdown
Compare @src/old-version.js with @src/new-version.js

Identify:

- Breaking changes
- New features
- Bug fixes
```

### 静态文件引用

引用没有参数的已知文件：

```markdown
Review @package.json and @tsconfig.json for consistency

Ensure:

- TypeScript version matches
- Dependencies are aligned
- Build configuration is correct
```

## Command 中的 Bash 执行

Command 可以内联执行 bash command，在 Claude 处理 command 前动态收集上下文。这适合包含仓库状态、环境信息或项目特定上下文。

### 语法：`!` 前缀

在实际 command 文件中，在反引号前使用字面量 `!` 进行预执行。在本 skill 文档中，`[BANG]` 用作该字面量 `!` 的占位符，避免示例在 skill 加载时执行：

```markdown
Current branch: [BANG]`git branch --show-current`
Files changed: [BANG]`git diff --name-only`
Environment: [BANG]`echo $NODE_ENV`
```

**工作方式：**

1. Claude 看到 command 前，Claude Code 会执行形如 ``!`command` `` 的预执行表达式
2. bash 输出会替换整个 ``!`command` `` 表达式
3. Claude 收到包含实际值的展开后 prompt

**展开示例：**

Command 文件包含：

```markdown
Review the [BANG]`git diff --name-only | wc -l | tr -d ' '` changed files on branch [BANG]`git branch --show-current`.
```

Claude 收到（预执行后）：

```markdown
Review the 3 changed files on branch feature/add-auth.
```

### 文档占位符约定

Skill 文档使用 `[BANG]` 作为 command 文件预执行前缀的占位符。示例应保持只读，并避免在 skill 文档中使用实际前缀，因为 skill 内容会加载到 Claude 上下文中。

**使用时机：**

- 包含动态上下文（git status、环境变量等）
- 收集项目/仓库状态
- 构建上下文感知的 workflow

### 加载时注入 vs 运行时执行

字面量 `!` 预执行会执行**加载时上下文注入**：command 加载时执行命令，其输出成为 Claude 收到的 prompt 中的静态文本。这不同于 Claude 在运行时选择通过 Bash tool 执行命令。预执行应用于收集上下文（git status、环境变量、配置文件），让 Claude 获得起始状态；不要把它用于 Claude 应在任务期间执行的动作。

**实现细节：** 高级模式、环境特定配置和 plugin 集成见 `references/plugin-features-reference.md`

## Command 组织

### 扁平结构

适合小型 command 集的简单组织方式：

```
.claude/commands/
├── build.md
├── test.md
├── deploy.md
├── review.md
└── docs.md
```

**使用时机：** 5-15 个 command，且没有明确分类

### 命名空间结构

将 command 组织到子目录中：

```
.claude/commands/
├── ci/
│   ├── build.md        # /build (project:ci)
│   ├── test.md         # /test (project:ci)
│   └── lint.md         # /lint (project:ci)
├── git/
│   ├── commit.md       # /commit (project:git)
│   └── pr.md           # /pr (project:git)
└── docs/
    ├── generate.md     # /generate (project:docs)
    └── publish.md      # /publish (project:docs)
```

**收益：**

- 按类别进行逻辑分组
- 命名空间显示在 `/help` 中
- 更容易找到相关 command

**使用时机：** 15 个以上 command，且分类清晰

## 最佳实践

### Command 设计

1. **单一职责：** 一个 command，一个任务
2. **清晰描述：** 在 `/help` 中能自解释
3. **显式依赖：** 需要时使用 `allowed-tools`
4. **记录参数：** 始终提供 `argument-hint`
5. **一致命名：** 使用动词-名词模式（review-pr、fix-issue）

### 参数处理

1. **验证参数：** 在 prompt 中检查必需参数
2. **提供默认值：** 参数缺失时建议默认值
3. **记录格式：** 说明预期参数格式
4. **处理边界情况：** 考虑缺失或无效参数

```markdown
---
argument-hint: "[pr-number]"
---

If $1 is provided, review PR #$1. Otherwise, ask the user to provide a PR number and show: /review-pr [number]
```

### 文件引用

1. **显式路径：** 使用清晰的文件路径
2. **检查存在性：** 优雅处理缺失文件
3. **相对路径：** 使用项目相对路径
4. **Glob 支持：** 对模式匹配考虑使用 Glob tool

### Bash Command

1. **限制范围：** 使用 `Bash(git *)`，不要用 `Bash(*)`
2. **安全命令：** 避免破坏性操作
3. **处理错误：** 考虑 command 失败
4. **保持快速：** 长时间运行的 command 会拖慢调用

### 文档

1. **添加注释：** 解释复杂逻辑
2. **提供示例：** 在注释中展示用法
3. **列出要求：** 记录依赖项
4. **版本化 command：** 说明破坏性变更

## 常见模式

### 审查模式

```markdown
---
description: Review code changes
allowed-tools: Read, Bash(git *)
---

Files changed: [BANG]`git diff --name-only`

Review each file for code quality, bugs, test coverage, documentation needs.
```

### 测试模式

```markdown
---
description: Run tests for specific file
argument-hint: "[test-file]"
allowed-tools: Bash(npm *)
---

Run tests for $1 with the Bash tool.
Analyze results and suggest fixes for failures.
```

### Workflow 模式

```markdown
---
description: Complete PR workflow
argument-hint: "[pr-number]"
allowed-tools: Bash(gh *), Read
---

PR #$1 Workflow:

1. Fetch PR details with the Bash tool.
2. Review changes
3. Run checks
4. Approve or request changes
```

## 故障排查

**Command 未出现：**

- 检查文件是否在正确目录
- 验证是否存在 `.md` 扩展名
- 确保 Markdown 格式有效
- 重启 Claude Code

**参数不工作：**

- 验证 `$1`、`$2` 语法正确
- 检查 `argument-hint` 是否匹配用法
- 确保没有多余空格

**Bash 执行失败：**

- 检查 `allowed-tools` 是否包含 Bash
- 验证反引号中的 command 语法
- 先在终端中测试 command
- 检查所需权限

**文件引用不工作：**

- 验证 `@` 语法正确
- 检查文件路径有效
- 确保允许 Read tool
- 使用绝对路径或项目相对路径

## Plugin 特定功能

### CLAUDE_PLUGIN_ROOT 变量

Plugin command 可以访问 `${CLAUDE_PLUGIN_ROOT}`，这是一个解析为 plugin 绝对路径的环境变量。

**用途：**

- 可移植地引用 plugin 文件
- 执行 plugin 脚本
- 加载 plugin 配置
- 访问 plugin 模板

**基础用法：**

```markdown
---
description: Analyze using plugin script
allowed-tools: Bash(node *)
---

Run the plugin analysis script with the Bash tool.

Review results and report findings.
```

**常见模式：**

```markdown
# Execute plugin script during the task with the Bash tool

Run ${CLAUDE_PLUGIN_ROOT}/scripts/script.sh when needed.

# Load plugin configuration

@${CLAUDE_PLUGIN_ROOT}/config/settings.json

# Use plugin template

@${CLAUDE_PLUGIN_ROOT}/templates/report.md

# Access plugin resources

@${CLAUDE_PLUGIN_ROOT}/docs/reference.md
```

**为什么使用它：**

- 适用于所有安装位置
- 可在系统之间移植
- 不需要硬编码路径
- 对多文件 plugin 必不可少

### Plugin Command 组织

Plugin command 会从 `commands/` 目录自动发现：

```
plugin-name/
├── commands/
│   ├── foo.md              # /foo (plugin:plugin-name)
│   ├── bar.md              # /bar (plugin:plugin-name)
│   └── utils/
│       └── helper.md       # /helper (plugin:plugin-name:utils)
└── plugin.json
```

**命名空间收益：**

- 逻辑分组 command
- 显示在 `/help` 输出中
- 避免名称冲突
- 组织相关 command

**命名约定：**

- 使用描述性动作名称
- 避免通用名称（test、run）
- 考虑 plugin 特定前缀
- 多词名称使用连字符

### Plugin Command 模式

**基于配置的模式：**

```markdown
---
description: Deploy using plugin configuration
argument-hint: "[environment]"
allowed-tools: Read, Bash(git *), Bash(npm *), Bash(node *)
---

Load configuration: @${CLAUDE_PLUGIN_ROOT}/config/$1-deploy.json

Deploy to $1 using configuration settings.
Monitor deployment and report status.
```

**基于模板的模式：**

```markdown
---
description: Generate docs from template
argument-hint: "[component]"
---

Template: @${CLAUDE_PLUGIN_ROOT}/templates/docs.md

Generate documentation for $1 following template structure.
```

**多脚本模式：**

```markdown
---
description: Complete build workflow
allowed-tools: Bash(npm *), Bash(node *)
---

Run the build, test, and package scripts with the Bash tool during the workflow.

Review outputs and report workflow status.
```

**详细模式见 `references/plugin-features-reference.md`。**

## 与 Plugin 组件集成

Command 可与其他 plugin 组件集成，形成强大的 workflow：

- **Agents**：为复杂任务启动 plugin agent（agent 必须存在于 `plugin/agents/`）
- **Skills**：利用 plugin skill 的专业知识（提及 skill 名称以触发）
- **Hooks**：与在 tool 事件上执行的 hook 协调
- **Multi-component**：在分阶段 workflow 中组合 agent、skill 和脚本

**详细模式和示例见 `references/plugin-integration.md`。**

## Validation 模式

Command 应在处理前验证输入和资源：

- **参数 validation**：检查必需参数是否匹配预期值
- **文件存在性**：处理前验证文件存在
- **Plugin 资源**：验证脚本和配置存在
- **错误处理**：捕获失败并提供有帮助的消息

**最佳实践：** 尽早 validation，提供有帮助的错误，并建议修正方式。

**Validation 示例见 `references/plugin-integration.md`。**

---

## 其他资源

详细 frontmatter 字段规范见 `references/frontmatter-reference.md`。
Skill tool、程序化调用和权限配置见 `references/skill-tool.md`。
Plugin 特定功能和模式见 `references/plugin-features-reference.md`。
Plugin 集成和 validation 模式见 `references/plugin-integration.md`。
使用 AskUserQuestion 的交互式用户输入模式见 `references/interactive-commands.md`。
多步骤 command 序列和状态管理见 `references/advanced-workflows.md`。
自文档化 command 模式和维护文档见 `references/documentation-patterns.md`。
从语法 validation 到用户验收的测试方法见 `references/testing-strategies.md`。
分发指南和质量标准见 `references/marketplace-considerations.md`。
Command 模式示例见 `examples/` 目录。

## Validation 脚本

用于 validation command 的实用脚本（执行时不加载到上下文）。它们假设 shell 环境包含 `bash` 3.2+ 和标准 POSIX userland 工具（`grep`、`sed`、`awk`、`cut`、`tr`、`head`、`tail`、`basename`、`mktemp`）：

```bash
# Validate command file structure
./scripts/validate-command.sh .claude/commands/my-command.md

# Validate YAML frontmatter fields
./scripts/check-frontmatter.sh .claude/commands/my-command.md

# Validate multiple files
./scripts/validate-command.sh commands/*.md
./scripts/check-frontmatter.sh commands/*.md
```
