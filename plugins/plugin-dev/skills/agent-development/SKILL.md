---
name: agent-development
description: 使用本技能，当用户要求 "create an agent"、"add an agent"、"write a subagent"、"agent frontmatter"、"when to use description"、"agent examples"、"agent tools"、"agent colors"、"autonomous agent"、"disallowedTools"、"block tools"、"agent denylist"、"maxTurns"、"agent memory"、"mcpServers in agent"、"agent hooks"、"background agent"、"resume agent"、"agent teams"、"permission rules"、"permission mode"、"agent team"、"team lead"、"teammate"、"multi-agent"，或需要 Claude Code 插件中的 subagent 结构、agent frontmatter、system prompt、triggering conditions、agent tools、agent hooks、permission mode 与 agent team 开发最佳实践指导时使用。
---

# Claude Code Plugins 的 Agent Development

## 概览

Agents 是自治的子进程，能够独立处理复杂的多步骤任务。掌握 agent 结构、触发条件和 system prompt 设计，才能构建强大的自治能力。

**关键概念：**

- Agents 用于自治工作，commands 用于用户主动发起的操作
- 文件格式是带 YAML frontmatter 的 Markdown
- 通过 description 字段和示例实现触发
- system prompt 决定 agent 行为
- 可选的 model 与 color 自定义

> **重要 - 字段名差异：** Agents 使用 `tools` 来限制工具访问。Skills 则用 `allowed-tools` 实现同类能力。切换组件类型时不要混淆。
>
> **关于官方文档的说明：** 本技能记录的 `color` 字段已被 Claude Code 支持，并且内置 `/agents` 命令也会生成它，但它尚未出现在[官方 sub-agents 文档](https://code.claude.com/docs/en/sub-agents)中。跟踪见 [anthropics/claude-code#8501](https://github.com/anthropics/claude-code/issues/8501)。[plugins-reference.md](https://code.claude.com/docs/en/plugins-reference) 可能展示的是更旧的 agent 格式，使用 `capabilities` 字段；对于 Claude Code 插件，请优先采用本技能记录的结构，也就是使用 `tools` 进行工具限制。

## 快速开始

最小可用 agent（可直接复制粘贴）：

```markdown
---
name: my-reviewer
description: |
  Use this agent when the user asks to review code. Examples:

  <example>
  Context: User wrote new code
  user: "Review my changes"
  assistant: "I'll use the my-reviewer agent to analyze the code."
  <commentary>
  Code review request triggers the agent.
  </commentary>
  </example>

model: inherit
color: blue
---

You are a code reviewer. Analyze code for issues and provide feedback.

**Process:**

1. Read the code
2. Identify issues
3. Provide recommendations

**Output:** Summary with file:line references for each finding.
```

若需包含全部选项的完整格式，请见[Agent File Structure](#agent-file-structure)。

## 何时使用 Agents、Commands 与 Skills

| 组件 | 最适合的用途 | 触发方式 | 示例场景 |
| ---- | ------------ | -------- | -------- |
| **Agents** | 自治执行的多步骤任务 | 主动触发或由 description 匹配触发 | 实现完成后的代码审查 |
| **Commands** | 用户主动发起的操作 | 显式调用 `/command` | `/deploy production` |
| **Skills** | 知识与指导 | 模型基于上下文调用 | 处理 PDF 的领域专长指导 |

> **另见：** 如果要开发 command，请加载 `command-development` skill。要开发 skill，请加载 `skill-development` skill。

### 适合选择 Agents 的场景

- 任务需要自治执行，且包含多个步骤
- 希望在特定事件后主动触发
- 需要带有聚焦工具集的专用子进程
- 工作应在后台进行，或作为 subagent 运行

### 适合选择 Commands 的场景

- 需要由用户显式触发该动作
- 任务有清晰的起点/终点和特定输入
- 该动作不应自动发生
- 工作流要求每一步都由用户确认

### 适合选择 Skills 的场景

- 提供知识或流程指导
- 扩展 Claude 的领域专长
- 不需要自治执行
- 信息应在上下文中按需可用

## Agent 文件结构

### 完整格式

```markdown
---
name: agent-identifier
description: |
  Use this agent when [triggering conditions]. Examples:

  <example>
  Context: [Situation description]
  user: "[User request]"
  assistant: "[How assistant should respond and use this agent]"
  <commentary>
  [Why this agent should be triggered]
  </commentary>
  </example>

  <example>
  [Additional example...]
  </example>

model: inherit
color: blue
tools: Read, Write, Grep
---

You are [agent role description]...

**Your Core Responsibilities:**

1. [Responsibility 1]
2. [Responsibility 2]

**Analysis Process:**
[Step-by-step workflow]

**Output Format:**
[What to return]
```

## Frontmatter 字段

### name（必填）

agent 的标识符，用于命名空间和调用。

**格式：** 仅允许小写字母、数字、连字符
**长度：** 3-50 个字符
**模式：** 必须以字母或数字开头和结尾

**好的示例：**

- `code-reviewer`
- `test-generator`
- `api-docs-writer`
- `security-analyzer`

**不好的示例：**

- `helper`（过于泛化）
- `-agent-`（以连字符开头/结尾）
- `my_agent`（不允许下划线）
- `ag`（太短，少于 3 个字符）

### description（必填）

定义 Claude 何时应触发这个 agent。**这是最关键的字段。**

**必须包含：**

1. 触发条件（“Use this agent when...”）
2. 多个 `<example>` block 展示使用方式
3. 每个 example 都包含 context、user request 与 assistant response
4. 使用 `<commentary>` 解释 agent 为什么会触发

**格式：**

```
Use this agent when [conditions]. Examples:

<example>
Context: [Scenario description]
user: "[What user says]"
assistant: "[How Claude should respond]"
<commentary>
[Why this agent is appropriate]
</commentary>
</example>

[More examples...]
```

**最佳实践：**

- 包含 2-4 个具体示例
- 同时展示主动触发与被动触发
- 覆盖同一意图的不同说法
- 在 commentary 中解释推理
- 明确说明什么情况下**不应**使用该 agent

### model（可选）

指定 agent 应使用哪个 model。若省略，Claude Code 会继承父级 model。

**可选值：**

- `inherit` - 使用与父级相同的 model（推荐）
- `sonnet` - Claude Sonnet（均衡）
- `opus` - Claude Opus（能力最强，成本更高）
- `haiku` - Claude Haiku（更快、更便宜）

**何时选择：**

- `haiku` - 快速、简单任务；快速分析；成本敏感场景
- `sonnet` - 性能均衡；适合大多数场景（默认推荐）
- `opus` - 复杂推理；细致分析；需要最高能力时

**建议：** 默认使用 `inherit`，除非该 agent 明确需要：

- `haiku` 来执行更快、成本更敏感的操作
- `opus` 来处理需要最高能力的复杂推理

### color（可选）

UI 中的 agent 视觉标识。

> **说明：** 该字段已被 Claude Code 支持，但尚未进入官方文档。详见[概览说明](#概览)。

**可选值：** `blue`、`cyan`、`green`、`yellow`、`magenta`、`red`

**指导原则：**

- 同一插件中的不同 agents 选择彼此可区分的颜色
- 相似类型的 agents 尽量保持颜色一致
- Blue/cyan：分析、审查
- Green：偏成功导向的任务
- Yellow：谨慎、校验
- Red：关键、安全
- Magenta：创意、生成

### tools（可选）

把 agent 限制到特定 tools。

**格式：** 逗号分隔的 tool 名称

```yaml
tools: Read, Write, Grep, Bash
```

**默认行为：** 若省略，Claude Code 不会为该 agent 施加特定的 tool allowlist。

**最佳实践：** 指定完成任务所需的最小工具集（最小权限原则）。只有在明确需要宽泛工具访问时，才省略 `tools`。

**常见工具组合：**

- 只读分析：`Read, Grep, Glob`
- 代码生成：`Read, Write, Grep`
- 测试执行：`Read, Bash, Grep`

> **重要：** Agents 使用 `tools`，而 Skills 使用 `allowed-tools`。两类组件的字段名不同。若要看 skill 的工具限制，请参考 `skill-development` skill。

### disallowedTools（可选）

作为 `tools` 的 denylist 补充。允许所有其他工具，但阻止指定工具：

```yaml
disallowedTools: Bash, Write
```

**格式：** 逗号分隔的 tool 名称

**默认行为：** 不阻止任何工具

| 字段 | 方式 | 适用场景 |
| ---- | ---- | -------- |
| `tools` | Allowlist | 只需要少量工具，希望限制到最小集合 |
| `disallowedTools` | Denylist | 需要大多数工具，但要屏蔽特定风险工具 |

**最佳实践：** 出于更严格的安全考虑，优先使用 `tools`（allowlist）。当 agent 需要较宽泛的访问范围，但某些具体 tools 有风险时，再使用 `disallowedTools`。

> **说明：** 二者选其一即可。如果同时指定，行为未定义。

### skills（可选）

把特定 skills 加载进 agent 上下文：

```yaml
skills:
  - testing-patterns
  - security-audit
  - api-design
```

**使用场景：**

- 通过 skills 给 agent 注入领域专长
- 组合多个 skills 来覆盖更完整的工作流
- 在 agents 与 skills 之间共享知识

skills 必须来自同一个插件。对应 skill 的 `SKILL.md` 内容会被加载进 agent 上下文。

### 插件随附 agent 不支持的字段

插件随附 agent 不应使用以下 project/user subagent 字段：

- `permissionMode`
- `mcpServers`
- `hooks`

Claude Code 会忽略这些字段。插件 agent 的权限与自动化应放在受支持的位置，例如工具限制（`tools`/`disallowedTools`）以及插件 `hooks/hooks.json`。

### maxTurns（可选）

限制 agent 停止前允许的最大 agentic turn 数：

```yaml
maxTurns: 50
```

**使用场景：**

- 防止失控 agent 消耗过多资源
- 给任务复杂度设定合理上界
- 复杂多文件任务使用更高值（50-100）；聚焦检查使用更低值（10-20）

若省略，agent 会运行到完成或被用户中断。

### memory（可选）

启用跨会话持久 memory：

```yaml
memory: user
```

**作用域：** `user`（~/.claude/agent-memory/）、`project`（.claude/agent-memory/）、`local`（.claude/agent-memory-local/）

启用后，agent 的 `MEMORY.md` 前 200 行会自动注入 system prompt。agent 可以读写自己的 memory 目录，从而在跨会话中积累经验。更多细节见 `references/advanced-agent-fields.md`。

### Agents 不可用的字段

有些 frontmatter 字段只属于 skills，不适用于 agents：

| 仅供 Skill 使用的字段 | 用途 | 为什么不适用于 Agents |
| -------------------- | ---- | --------------------- |
| `context: fork` | 在独立 subagent 上下文中运行 skill | Agents 按设计本来就是独立子进程 |
| `agent` | 为 fork 出来的上下文指定 agent type | 只在设置了 `context: fork` 时适用 |
| `user-invocable` | 控制 slash 菜单可见性 | Agents 不是通过 slash commands 调用的 |
| `disable-model-invocation` | 阻止以编程方式使用 Skill tool | Agents 使用的是 Agent tool，而不是 Skill tool |
| `allowed-tools` | 限制工具访问（skill 语法） | Agents 使用的是 `tools` 字段，而不是这个字段 |

**关键区别：** Skills 提供的是会被加载进上下文的知识与指导。Agents 则是独立执行的自治子进程。这种架构差异决定了 context-forking 相关选项不适用于 agents——因为 agents 本来就是隔离进程。

## System Prompt 设计

Markdown 正文会成为 agent 的 system prompt。请使用第二人称，直接对 agent 说话。

**关键元素：**

- 角色定义（“You are [role] specializing in [domain]”）
- 核心职责（编号列表）
- 过程步骤（具体、可执行）
- 质量标准（可衡量）
- 输出格式（结构明确）
- 边界情况（如何处理异常）

**最佳实践：**

- 使用第二人称（“You are...”“You will...”）
- 具体，不要模糊
- 控制在 10,000 字符以内
- 写出具体步骤，而不是泛泛指令

若需更细的模板与模式（Analysis、Generation、Validation、Orchestration agents），请见 `references/system-prompt-design.md`。

## 创建 Agents

### 方法 1：AI 辅助生成

使用下面这套 prompt 模式（提取自 Claude Code）：

```
Create an agent configuration based on this request: "[YOUR DESCRIPTION]"

Requirements:
1. Extract core intent and responsibilities
2. Design expert persona for the domain
3. Create comprehensive system prompt with:
   - Clear behavioral boundaries
   - Specific methodologies
   - Edge case handling
   - Output format
4. Create identifier (lowercase, hyphens, 3-50 chars)
5. Write description with triggering conditions
6. Include 2-3 <example> blocks showing when to use

Return JSON with:
{
  "identifier": "agent-name",
  "whenToUse": "Use this agent when... Examples: <example>...</example>",
  "systemPrompt": "You are..."
}
```

然后把结果转换成 agent 文件格式并补上 frontmatter。

完整模板见 `examples/agent-creation-prompt.md`。

### 方法 2：手动创建

1. 选择 agent identifier（3-50 个字符，小写，连字符）
2. 编写带示例的 description
3. 如有需要，选择 model（省略则默认继承）
4. 如有需要，选择用于视觉区分的 color
5. 定义完成任务所需的最小 tools
6. 按上面的结构编写 system prompt
7. 保存为 `agents/agent-name.md`

## 验证规则

### Identifier 验证

```
✅ Valid: code-reviewer, test-gen, api-analyzer-v2
❌ Invalid: ag (too short), -start (starts with hyphen), my_agent (underscore)
```

**规则：**

- 3-50 个字符
- 仅允许小写字母、数字、连字符
- 必须以字母或数字开头和结尾
- 不允许下划线、空格或特殊字符

### Description 验证

**长度：** 10-5,000 个字符
**必须包含：** 触发条件与示例
**最佳范围：** 200-1,000 个字符，配合 2-4 个示例

### System Prompt 验证

**长度：** 20-10,000 个字符
**最佳范围：** 500-3,000 个字符
**结构：** 需要清晰的职责、过程与输出格式

## Agent 组织方式

### 插件 Agent 目录

```
plugin-name/
└── agents/
    ├── analyzer.md
    ├── reviewer.md
    └── generator.md
```

`agents/` 目录下的所有 `.md` 文件都会被自动发现。

**Agent 优先级：** `--agents` CLI flag > `.claude/agents/`（项目级）> `~/.claude/agents/`（个人级）> 插件 `agents/` 目录。同名时，高优先级 agent 会遮蔽低优先级版本。为了避免冲突，插件 agent 应使用具备命名空间特征、且足够独特的名字。

### 可移植路径

当你在 agent system prompt 中引用插件内文件（脚本、参考资料等）时，请使用 `${CLAUDE_PLUGIN_ROOT}` 来获得可移植路径：

```markdown
Run the validation script at `${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh`
```

该变量会在运行时解析为插件安装目录，从而保证无论插件安装在哪里，路径都能正确工作。

### Namespacing

agents 会自动带上命名空间：

- 单插件：`agent-name`
- 带子目录：`plugin:subdir:agent-name`

## 测试 Agents

### 测试 Triggering

创建测试场景，确认 agent 能按预期触发：

1. 编写带有明确示例的 agent
2. 在测试中使用与示例相近的措辞
3. 检查 Claude 是否加载该 agent
4. 验证 agent 是否提供了预期功能

### 在会话开始时加载 Agents

使用 `--agents` CLI flag 预加载指定 agents：

```bash
# Load single agent
claude --agents code-reviewer

# Load multiple agents
claude --agents "code-reviewer,test-generator"
```

**使用场景：**

- 不经过自动触发，直接测试 agent 行为
- 需要某些特定 agents 的工作流
- 调试 agent system prompt

### 测试 System Prompt

确保 system prompt 足够完整：

1. 给 agent 一个典型任务
2. 检查它是否遵循过程步骤
3. 验证 output format 是否正确
4. 测试 prompt 中提到的 edge cases
5. 确认质量标准是否达到

## 快速参考

### Frontmatter 字段汇总

| 字段 | 是否必填 | 格式 | 示例 |
| ---- | -------- | ---- | ---- |
| name | Yes | lowercase-hyphens | code-reviewer |
| description | Yes | 文本 + examples | Use when... <example>... |
| model | No | inherit/sonnet/opus/haiku | inherit |
| color | No | 颜色名称 | blue |
| tools | No | 逗号分隔的 tool 名称 | Read, Grep |
| disallowedTools | No | 逗号分隔的 tool 名称 | Bash, Write |
| skills | No | skill 名称数组 | [testing, security] |
| maxTurns | No | 数字 | 50 |
| memory | No | user/project/local | user |

> **说明：** Agents 使用 `tools` 限制工具访问。Skills 使用 `allowed-tools` 完成同样的事。两者字段名不同。

### 最佳实践

**DO：**

- ✅ 在 description 中加入 2-4 个具体示例
- ✅ 编写明确的触发条件
- ✅ 除非有明确需要，否则 model 使用 `inherit`
- ✅ 选择恰当的 tools（最小权限原则）
- ✅ 编写清晰、结构化的 system prompts
- ✅ 充分测试 agent 的触发效果

**DON'T：**

- ❌ 使用没有示例的泛化 description
- ❌ 省略触发条件
- ❌ 让所有 agents 都用同一个 color
- ❌ 授予不必要的工具访问权限
- ❌ 编写模糊的 system prompt
- ❌ 跳过测试

## 执行模式

agents 可以以前台（blocking）或后台（concurrent）模式运行：

- **Foreground**（默认）：阻塞主对话，直到 agent 完成
- **Background**：并发运行；由于无法向用户发起提示，权限必须在生成时预先批准

后台 agent 如果需要未批准的权限，就会失败。请据此规划工具限制。

**MCP 限制：** 后台 subagent 无法使用 MCP tools。如果你的 agent 依赖 MCP tools（来自插件的 `.mcp.json`），它就必须运行在前台模式。可能在后台运行的 agent 应只依赖内置 tools。

**恢复 agents：** 每次 Agent 调用都会创建一个新的 agent。若要带着完整历史上下文继续，请让 Claude “resume that agent”——它会恢复先前的 transcript。

**限制可生成的 agents：** 在 settings.json 的 allow rules 中使用 `Agent(agent_type1, agent_type2)` 语法，可控制允许生成哪些 agent type。若完全省略 `Agent`，则不允许生成 subagent。

**内置 agent types：** Explore（只读，Haiku）、Plan（只读调研）、general-purpose（全部工具）、Bash（终端命令）、statusline-setup（Haiku）、Claude Code Guide（Haiku）。

## Agent Teams（实验性）

Agent teams 支持 multi-agent 协作：team lead 会生成并管理多个独立的 Claude Code 会话作为 teammate。需要设置 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。

teams 提供共享任务列表、agent 间消息以及并行执行能力。对于偏协同的 team lead，请通过工具限制和明确的 prompt 指导，使 lead 专注于分派与审查。插件随附 agent 会忽略 `permissionMode`。

这是高级功能，更多细节请见[官方 agent teams 文档](https://code.claude.com/docs/en/agent-teams)。

## 更多资源

### 参考文件

如需更细的指导，请查阅：

- **`references/advanced-agent-fields.md`** - 详细说明受支持的插件 agent 字段，例如 maxTurns、memory，以及已清楚标注的 project/user subagent-only 字段
- **`references/permission-modes-rules.md`** - project/user subagent 的 permission mode 细节；这些模式对插件随附 agent 无效
- **`references/system-prompt-design.md`** - 四种 system prompt 模式（Analysis、Generation、Validation、Orchestration），包含完整模板与常见陷阱
- **`references/triggering-examples.md`** - example block 结构、四种 example 类型、模板库与调试指南
- **`references/agent-creation-system-prompt.md`** - Claude Code agent 生成功能使用的精确 prompt 及其用法模式

### 示例文件

`examples/` 中的可运行示例：

- **`agent-creation-prompt.md`** - AI 辅助的 agent 生成模板
- **`complete-agent-examples.md`** - 面向不同使用场景的完整 agent 示例

### 工具脚本

这些脚本假定你处在带有 `bash` 3.2+ 和标准 POSIX 用户态工具（`grep`、`sed`、`awk`、`cut`、`tr`、`head`、`tail`、`basename`、`mktemp`）的 shell 环境中。调试脚本失败时，请先检查可选工具是否存在。

`scripts/` 中的开发工具：

- **`create-agent-skeleton.sh`** - 从模板生成新的 agent 文件
- **`validate-agent.sh`** - 验证 agent 文件结构
- **`test-agent-trigger.sh`** - 测试 agent 是否会正确触发
