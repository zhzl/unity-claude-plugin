---
name: skill-development
description: 当用户要求 "create a skill"、"add a skill to plugin"、"write a new skill"、"improve skill description"、"SKILL.md format"、"skill frontmatter"、"skill triggers"、"progressive disclosure"、"Skill() syntax"、"SLASH_COMMAND_TOOL_CHAR_BUDGET"，或需要 Claude Code plugin 的 skill 结构、组织、触发条件、可见性预算与开发最佳实践指导时使用。
---

# Claude Code Plugins 的 Skill Development

本 skill 提供为 Claude Code plugins 创建有效 skills 的指导。

## 关于 Skills

Skills 是模块化、自包含的包，通过提供专门知识、workflows 和工具来扩展 Claude 的能力。可以把它们看作特定领域或任务的“入职指南”：它们把 Claude 从通用 agent 转换为具备流程知识的专业 agent，而这些流程知识不是任何模型都能完整掌握的。

### Skill 优先级

多个 skills 使用同名时，按以下优先级决定加载哪一个：

1. Enterprise（托管设置）— 最高优先级
2. Personal（`~/.claude/skills/`）
3. Project（`.claude/skills/`）
4. Plugin skills — 最低优先级

Plugin 开发者应使用有辨识度、最好带命名空间的名称（plugin 系统会自动命名为 `plugin-name:skill-name`），以避免与用户或项目 skills 冲突。

### Skills 与 Commands：统一机制

Skills 和 commands 共享同一底层机制（Skill tool）。选择哪一个取决于复杂度需求：

- **使用 commands**（`commands/foo.md`）：不带捆绑资源的简单 prompts
- **使用 skills**（`skills/foo/SKILL.md`）：需要 scripts、references 或 examples 的复杂 workflows

两者都支持 `$ARGUMENTS`、文档中用于 bash 执行的反引号前 `[BANG]` 占位符，以及 frontmatter 字段。实际 skill 和 command 文件使用字面量 `!`；本仓库文档中写 `[BANG]` 是为了避免 examples 中意外执行。Skills 额外提供捆绑资源和 progressive disclosure。

### Skills 提供什么

1. 专门 workflows - 面向特定领域的多步骤流程
2. 工具集成 - 使用特定文件格式或 API 的说明
3. 领域知识 - 公司专用知识、schemas、业务逻辑
4. 捆绑资源 - 面向复杂和重复任务的 scripts、references 与 assets
5. 视觉输出生成 - 生成 HTML/交互式可视化的 scripts

### Skill 剖析

每个 skill 都包含必需的 SKILL.md 文件和可选的捆绑资源：

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md（必需）

**Metadata 质量：** YAML frontmatter 中的 `name` 和 `description` 决定 Claude 何时使用该 skill。要具体说明 skill 做什么、何时使用。使用第三人称（例如 `This skill should be used when...`，而不是 `Use this skill when...`）。

#### 可选 Frontmatter 字段

##### allowed-tools

可选地限制 skill 激活时 Claude 能使用哪些工具：

```yaml
---
name: code-reviewer
description: Review code for best practices...
allowed-tools: Read, Grep, Glob
---
```

将 `allowed-tools` 用于：

- 不应修改文件的只读 skills
- 安全敏感 workflows
- 范围受限的 skills

指定后，Claude 只能无须额外许可地使用列出的工具。省略时，Claude 遵循标准权限模型。

##### context

控制 skill 的上下文如何加载：

```yaml
---
name: analysis-skill
description: Perform deep code analysis...
context: fork
---
```

**取值：**

- `fork` - 在 subagent 中运行 skill（独立上下文），保留 main agent 的上下文
- 未指定 - 在 main agent 的上下文中运行（默认）

将 `context: fork` 用于：

- 会加载大型 reference 文件的 skills
- 可能污染主上下文的 skills
- 希望隔离的高成本操作

##### agent

当设置 `context: fork` 时，指定由哪种 agent 类型处理该 skill：

```yaml
---
name: exploration-skill
description: Explore codebase patterns...
context: fork
agent: Explore
---
```

**取值：**

- `Explore` - 用于代码库探索的快速 agent
- `Plan` - 用于实现规划的架构 agent
- `general-purpose` - 通用 agent（`context: fork` 时的默认值）

要求已设置 `context: fork`。

##### skills

将其他 skills 加载到 forked agent 的上下文：

```yaml
---
name: comprehensive-review
description: Full code review with testing...
context: fork
agent: general-purpose
skills:
  - testing-patterns
  - security-audit
---
```

要求已设置 `context: fork`。只能加载同一 plugin 中的 skills。

##### user-invocable

控制该 skill 是否出现在 slash command 菜单中：

```yaml
---
name: internal-review-standards
description: Apply internal code review standards...
user-invocable: false
---
```

**默认值：** `true`（skills 在 `/` 菜单中可见）

**重要：** 此字段只控制 slash 菜单可见性。它不会影响：

- **Skill tool 访问** - Claude 仍可通过程序方式调用该 skill
- **Auto-discovery** - Claude 仍会基于上下文发现并使用该 skill

对 Claude 应自动使用、但用户不应直接调用的 skills，使用 `user-invocable: false`。

##### disable-model-invocation

阻止 Claude 通过 Skill tool 以程序方式调用该 skill：

```yaml
---
name: dangerous-operation
description: Perform dangerous operation...
disable-model-invocation: true
---
```

**默认值：** `false`（允许程序化调用）

用于只应由用户手动调用的 skills，例如：

- 需要人工判断的破坏性操作
- 需要用户输入的交互式 workflows
- 审批流程

**可见性对比：**

| 设置 | Slash 菜单 | Skill Tool | Auto-Discovery |
| --- | --- | --- | --- |
| `user-invocable: true`（默认） | 可见 | 允许 | 是 |
| `user-invocable: false` | 隐藏 | 允许 | 是 |
| `disable-model-invocation: true` | 可见 | 阻止 | 是 |

##### model

覆盖处理该 skill 的模型：

```yaml
---
name: quick-lint
description: Fast code linting checks...
model: haiku
---
```

**取值：** `sonnet`、`opus`、`haiku` 或 `inherit`（默认）

对快速/低成本 skills 使用 `haiku`；对需要最高能力的复杂推理使用 `opus`。默认行为（`inherit`）使用对话当前模型。

关于模型选择的详细指导，参见 `references/advanced-frontmatter.md`。

##### hooks

定义仅在使用该 skill 时激活的 scoped hooks：

```yaml
---
name: secure-writer
description: Write files with validation...
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
---
```

Scoped hooks 遵循与 `hooks.json` 相同的 event/matcher/hook 结构，但生命周期绑定到该 skill。支持的 events：`PreToolUse`、`PostToolUse`、`Stop`。

完整语法以及与 `hooks.json` 的对比，参见 `references/advanced-frontmatter.md`。

##### argument-hint

提供在 `/` 菜单中显示的自动补全提示文本，用于说明该 skill 期望的参数：

```yaml
---
argument-hint: "<file-path> [--verbose]"
---
```

这只是展示用途，帮助用户理解该 skill 期望哪些参数。它不影响参数解析。

#### 捆绑资源（可选）

##### Scripts（`scripts/`）

用于需要确定性可靠性或会被反复重写的任务的可执行代码（Python/Bash 等）。

- **何时包含**：当同一段代码会被反复重写，或需要确定性可靠性时
- **示例**：用于 PDF 旋转任务的 `scripts/rotate_pdf.py`
- **收益**：Token 高效、确定性强，并且可以不加载到上下文就执行

##### References（`references/`）

文档和参考材料，按需加载到上下文中。

- **何时包含**：当 Claude 工作时应参考这些文档
- **示例**：数据库 schemas 的 `references/schema.md`，API 规范的 `references/api_docs.md`
- **最佳实践**：如果文件很大（>10k 词），在 SKILL.md 中包含 grep 搜索模式
- **避免重复**：信息应只存在于 SKILL.md 或 references 文件之一，不要两处都有

##### Assets（`assets/`）

不用于加载到上下文、而是在 Claude 产出的输出中使用的文件。

- **何时包含**：当 skill 需要最终输出会用到的文件时
- **示例**：品牌素材 `assets/logo.png`，模板 `assets/slides.pptx`

### Skills 中的动态内容

Skills 支持动态内容注入和变量替换，以提供上下文感知行为。

#### 字符串替换

在 skill 内容中使用运行时会被替换的变量：

```markdown
The session ID is: ${CLAUDE_SESSION_ID}
Arguments passed: $ARGUMENTS
```

**可用替换：**

- `$ARGUMENTS` - 调用 skill 时传入的参数（例如 `/skill-name arg1 arg2`）
- `$ARGUMENTS[0]`、`$ARGUMENTS[1]` 等 - 各个位置参数（从 0 开始）。`$ARGUMENTS[0]` 是 skill 名称后的第一个参数。
- `$1`、`$2`、`$3` 等 - 位置参数的 1 起始简写。`$1` 等价于 `$ARGUMENTS[0]`，`$2` 等价于 `$ARGUMENTS[1]`，依此类推。
- `${CLAUDE_SESSION_ID}` - 当前 session 标识符
- `${CLAUDE_PLUGIN_ROOT}` - Plugin 目录路径

#### 动态上下文注入

使用反引号语法执行命令，并将其输出注入 skill 上下文：

```markdown
## Current Project Status

The git status is:
[BANG]`git status --short`

Recent commits:
[BANG]`git log --oneline -5`
```

**文档中的语法：** `` [BANG]`command` ``

编写实际 skill 或 command 文件时，将 `[BANG]` 替换为字面量 `!`。

**使用场景：**

- 加载当前项目状态（git status、package.json）
- 包含动态配置
- 获取环境特定信息

**安全说明：** 命令会在用户环境中执行。只使用可信命令。

### Progressive Disclosure 设计原则

Skills 使用三级加载系统来高效管理上下文：

1. **Metadata（name + description）** - 当 skill 位于共享可见性预算（约 100 词）内时，可用于发现
2. **SKILL.md 正文** - Claude 实际调用 skill 时加载（<5k 词）
3. **捆绑资源** - Skill 调用后由 Claude 按需加载（无限制\*）

\*无限制是因为 scripts 可以执行，而不必读入上下文窗口。

**可见性预算：** Claude Code 通过 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 为 skill descriptions 分配约 2% 的上下文窗口（或约 16KB fallback）。当所有已安装 skills 的 description 文本总量超过此预算时，某些 skills 可能会被排除在 auto-discovery 之外。保持 descriptions 简洁，并把细节移入 SKILL.md 正文和 references。优化指导参见 `references/advanced-frontmatter.md`。

### Plugins 的上下文管理

Skills 应设计为 auto-compaction 后可重新发现。当 Claude 的上下文接近限制时，较早的消息会自动压缩。压缩后：

- **Descriptions 保留**：Skill descriptions 仍可用（它们是工具定义，不是对话内容）
- **Skill 正文丢失**：先前调用中的完整 SKILL.md 内容可能被压缩掉
- **重新触发有效**：用户可以再次调用该 skill 以重新加载其内容

**`PreCompact` hook**：Plugins 可以使用 `PreCompact` hook 在压缩发生前保留关键信息。用它保存否则会丢失的状态。

**跨 plugin 预算**：所有已安装 plugins 的 skill descriptions 竞争同一个可见性预算。编写简洁、关键词丰富的 descriptions，以在不过度占用空间的情况下最大化可发现性。

## Skill 创建流程

创建 skill 时遵循这六个步骤。每个步骤的详细说明参见 `references/skill-creation-workflow.md`。

1. **理解 Skill**：通过用户问题和反馈收集该 skill 将如何使用的具体示例
2. **规划可复用内容**：分析示例，识别哪些 scripts、references 和 assets 会有帮助
3. **创建结构**：用 `mkdir -p skills/skill-name/{references,examples,scripts}` 建立 skill 目录
4. **编辑 Skill**：编写带正确 frontmatter 和祈使式正文的 SKILL.md；创建捆绑资源
5. **验证和测试**：检查结构、触发短语、写作风格和 progressive disclosure
6. **迭代**：基于真实使用和反馈改进

### 关键写作指南

- **Description**：使用第三人称（`This skill should be used when...`）并包含具体触发短语
- **正文**：使用祈使式/不定式（`To create X, do Y`），不要使用第二人称（`You should...`）
- **大小**：目标 1,500-2,000 词；将详细内容移到 references/

## Plugin 专用注意事项

### Plugin 中的 Skill 位置

Plugin skills 位于 plugin 的 `skills/` 目录：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
├── agents/
└── skills/
    └── my-skill/
        ├── SKILL.md
        ├── references/
        ├── examples/
        └── scripts/
```

### Auto-Discovery（自动发现）

Claude Code 会自动发现 skills：

- 扫描 `skills/` 目录
- 查找包含 `SKILL.md` 的子目录
- 当 skill 被纳入共享可见性预算时，加载 skill metadata（name + description）用于发现
- Claude 调用 skill 时加载 SKILL.md 正文
- 调用后在需要时加载 references/examples

### 无需打包

Plugin skills 随 plugin 一起分发，不是单独的 ZIP 文件。用户安装 plugin 时就会获得 skills。

### 在 Plugins 中测试

通过本地安装 plugin 来测试 skills：

```bash
# Test with --plugin-dir
claude --plugin-dir /path/to/plugin

# Ask questions that should trigger the skill
# Verify skill loads correctly
```

## Plugin-Dev 示例

学习此 plugin 中的 skills，作为最佳实践示例：

**hook-development skill：**

- 出色的触发短语：`create a hook`、`add a PreToolUse hook` 等
- 精简的 SKILL.md，详细内容移到 references/
- 3 个 references/ 文件提供详细内容
- 3 个 examples/ 展示可运行 hooks
- 3 个 scripts/ 工具

**agent-development skill：**

- 强触发词：`create an agent`、`agent frontmatter` 等
- 聚焦的 SKILL.md，并用 references 承载更深细节
- References 包含来自 Claude Code 的 AI generation prompt
- 完整 agent examples

**plugin-settings skill：**

- 具体触发词：`plugin settings`、`.local.md files`、`YAML frontmatter`
- References 展示真实实现（multi-agent-swarm、ralph-wiggum）
- 可运行 parsing scripts

每个示例都展示了 progressive disclosure 和强触发能力。

## Validation 检查清单

完成 skill 前：

**结构：**

- [ ] SKILL.md 文件存在且包含有效 YAML frontmatter
- [ ] Frontmatter 包含 `name` 和 `description` 字段
- [ ] Name 只使用小写字母、数字和连字符（最多 64 个字符）
- [ ] Description 少于 1024 个字符
- [ ] （可选）如果限制工具访问，包含 `allowed-tools` 字段
- [ ] （可选）如果在 subagent 中运行，包含 `context: fork`
- [ ] （可选）如果指定 agent 类型，包含 `agent` 字段（要求 `context: fork`）
- [ ] （可选）如果加载其他 skills，包含 `skills` 数组（要求 `context: fork`）
- [ ] （可选）如果从 slash 菜单隐藏，包含 `user-invocable` 字段
- [ ] （可选）如果阻止程序化使用，包含 `disable-model-invocation` 字段
- [ ] （可选）如果覆盖模型，包含 `model` 字段（`sonnet`/`opus`/`haiku`/`inherit`）
- [ ] （可选）如果使用 scoped hooks，包含 `hooks` 字段（格式与 `hooks.json` 相同）
- [ ] （可选）如果需要自动补全提示，包含 `argument-hint` 字段
- [ ] Markdown 正文存在且内容充实
- [ ] 引用的文件确实存在

**Description 质量：**

- [ ] 使用第三人称（`This skill should be used when...`）
- [ ] 包含用户会说的具体触发短语
- [ ] 列出具体场景（`create X`、`configure Y`）

**内容质量：**

- [ ] SKILL.md 正文使用祈使式/不定式
- [ ] 正文聚焦且精简（理想 1,500-2,000 词，最多 <3k）
- [ ] 详细内容移到 references/
- [ ] Examples 完整且可运行

**测试：**

- [ ] Skill 会在预期用户查询下触发
- [ ] 内容对目标任务有帮助
- [ ] 文件之间没有重复信息

## 快速参考

### 最小 Skill

```
skill-name/
└── SKILL.md
```

适合：简单知识，不需要复杂资源

### Standard Skill（推荐）

```
skill-name/
├── SKILL.md
├── references/
│   └── detailed-guide.md
└── examples/
    └── working-example.sh
```

适合：大多数包含详细文档的 plugin skills

### 完整 Skill

```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   └── advanced.md
├── examples/
│   ├── example1.sh
│   └── example2.json
└── scripts/
    └── validate.sh
```

适合：包含 validation 工具的复杂领域

## 最佳实践总结

**应做：**

- 在 description 中使用第三人称（`This skill should be used when...`）
- 包含具体触发短语（`create X`、`configure Y`）
- 保持 SKILL.md 精简（1,500-2,000 词）
- 使用 progressive disclosure（将细节移到 references/）
- 使用祈使式/不定式写作
- 清楚引用支持文件
- 提供可运行 examples
- 为常见操作创建 utility scripts

**不要做：**

- 使用第二人称（`You should...`）
- 使用模糊触发条件
- 把所有内容都放进 SKILL.md（没有 references/ 且 >3,000 词）
- 留下未引用资源
- 包含损坏或不完整 examples

## 其他资源

### 示例 Skills

`examples/` 中提供可直接复制粘贴的 skill 模板：

- **`examples/minimal-skill.md`** - 只有 SKILL.md 的极简 skill（git conventions 示例）
- **`examples/complete-skill.md`** - 包含 references/、examples/ 和 scripts/ 的完整 skill（API testing 示例）
- **`examples/frontmatter-templates.md`** - 常见使用场景的 frontmatter 模式快速参考

### Reference 文件

如需详细指导，查阅：

- **`references/skill-creation-workflow.md`** - Plugin 专用 skill 创建 workflow（推荐用于 plugin skills）
- **`references/skill-creator-original.md`** - 原始通用 skill-creator 方法论（包含独立 skills 的 init/packaging scripts）

### 学习这些 Skills

Plugin-dev 的 skills 展示了最佳实践：

- `../hook-development/` - Progressive disclosure、工具
- `../agent-development/` - AI-assisted creation、references
- `../mcp-integration/` - 完整 references
- `../plugin-settings/` - 真实 examples
- `../command-development/` - 清晰关键概念
- `../plugin-structure/` - 良好组织
