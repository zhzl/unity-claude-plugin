# Skill Creation Workflow

本参考为 Claude Code plugins 创建 skills 提供详细的分步说明。概览请参见主 SKILL.md。

## 步骤 1：通过具体示例理解 Skill

仅当 skill 的使用模式已经非常清楚时，才跳过此步骤。即使处理现有 skill，这一步仍然有价值。

要创建有效的 skill，需要清楚理解该 skill 将如何被使用的具体示例。这种理解可以来自用户直接提供的示例，也可以来自生成后经用户反馈验证的示例。

例如，构建 image-editor skill 时，相关问题包括：

- “image-editor skill 应该支持哪些功能？编辑、旋转，还有其他吗？”
- “能否给一些这个 skill 会如何使用的示例？”
- “我可以想象用户会提出 ‘Remove the red-eye from this image’ 或 ‘Rotate this image’ 之类的请求。你还设想过其他使用方式吗？”
- “用户说什么内容时应该触发这个 skill？”

为避免让用户负担过重，不要在一条消息中提太多问题。先从最重要的问题开始，并根据需要追问，以提升效果。

当已经清楚该 skill 应支持的功能范围时，结束此步骤。

## 步骤 2：规划可复用的 Skill 内容

要把具体示例转化为有效的 skill，逐个分析示例：

1. 考虑如果从零开始执行该示例，需要怎么做
2. 识别在重复执行这些 workflows 时，哪些 scripts、references 和 assets 会有帮助

### 示例

**pdf-editor skill**，用于 “Help me rotate this PDF” 这类查询：

1. 旋转 PDF 每次都需要重写相同代码
2. 将 `scripts/rotate_pdf.py` 脚本存入 skill 会有帮助

**frontend-webapp-builder skill**，用于 “Build me a todo app” 这类查询：

1. 编写 frontend webapp 每次都需要相同的 HTML/React boilerplate
2. 包含 HTML/React boilerplate 项目文件的 `assets/hello-world/` 模板会有帮助

**big-query skill**，用于 “How many users have logged in today?” 这类查询：

1. 查询 BigQuery 每次都需要重新发现 table schemas 和关系
2. 记录 table schemas 的 `references/schema.md` 文件会有帮助

**hooks skill**，用于 Claude Code plugins：

1. 开发者经常需要验证 hooks.json 并测试 hook scripts
2. `scripts/validate-hook-schema.sh` 和 `scripts/test-hook.sh` 工具会有帮助
3. 用 `references/patterns.md` 存放详细 hook patterns，避免让 SKILL.md 膨胀

要确定 skill 的内容，分析每个具体示例，列出应包含的可复用资源：scripts、references 和 assets。

## 步骤 3：创建 Skill 结构

对于 Claude Code plugins，创建 skill 目录结构：

```bash
mkdir -p plugin-name/skills/skill-name/{references,examples,scripts}
touch plugin-name/skills/skill-name/SKILL.md
```

**说明：** 不同于使用 `init_skill.py` 的通用 skill-creator，plugin skills 直接在 plugin 的 `skills/` 目录中创建，并使用更简单的手动结构。

## 步骤 4：编辑 Skill

编辑新建或现有 skill 时，记住该 skill 是给另一个 Claude 实例使用的。重点包含对 Claude 有益且非显而易见的信息。思考哪些 procedural knowledge、domain-specific details 或 reusable assets 能帮助另一个 Claude 实例更有效地执行这些任务。

### 从可复用 Skill 内容开始

开始实现时，先处理上面识别出的可复用资源：`scripts/`、`references/` 和 `assets/` 文件。注意，此步骤可能需要用户输入。例如，实现 `brand-guidelines` skill 时，用户可能需要提供 brand assets 或 templates 存入 `assets/`，或提供文档存入 `references/`。

同时，删除 skill 不需要的任何示例文件和目录。只创建实际需要的目录（references/、examples/、scripts/）。

### 更新 SKILL.md

**写作风格：** 整个 skill 使用 **imperative/infinitive form**（动词优先指令），不要使用第二人称。使用客观的说明性语言（例如 “To accomplish X, do Y”，而不是 “You should do X” 或 “If you need to do X”）。这能保持面向 AI 消费的一致性和清晰度。

**Description（Frontmatter）：** 使用第三人称格式，并包含具体 trigger phrases：

```yaml
---
name: Skill Name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", "specific phrase 3". Include exact phrases users would say that should trigger this skill. Be concrete and specific.
---
```

**好的 description 示例：**

```yaml
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", "implement prompt-based hooks", or mentions hook events (PreToolUse, PostToolUse, Stop).
```

**不好的 description 示例：**

```yaml
description: Use this skill when working with hooks.  # Wrong person, vague
description: Load when user needs hook help.  # Not third person
description: Provides hook guidance.  # No trigger phrases
```

要完成 SKILL.md 正文，回答以下问题：

1. 该 skill 的目的是什么？用几句话说明。
2. 何时应使用该 skill？（在 frontmatter description 中包含这一点，并使用具体 triggers）
3. 实际使用时，Claude 应如何使用该 skill？上面开发出的所有 reusable skill contents 都应被引用，以便 Claude 知道如何使用它们。

**保持 SKILL.md 精简：** 正文目标 1,500-2,000 词。将详细内容移到 references/：

- 详细 patterns → `references/patterns.md`
- 高级技巧 → `references/advanced.md`
- 迁移指南 → `references/migration.md`
- API references → `references/api-reference.md`

**在 SKILL.md 中引用资源：**

```markdown
## Additional Resources

### Reference Files

For detailed patterns and techniques, consult:

- **`references/patterns.md`** - Common patterns
- **`references/advanced.md`** - Advanced use cases

### Example Files

Working examples in `examples/`:

- **`example-script.sh`** - Working example
```

## 步骤 5：Validate and Test

**对于 plugin skills，validation 不同于通用 skills：**

1. **检查结构**：Skill 目录位于 `plugin-name/skills/skill-name/`
2. **验证 SKILL.md**：包含带 name 和 description 的 frontmatter
3. **检查 trigger phrases**：Description 包含具体用户查询
4. **验证写作风格**：正文使用 imperative/infinitive form，而不是第二人称
5. **测试 progressive disclosure**：SKILL.md 精简（约 1,500-2,000 词），详细内容放在 references/
6. **检查 references**：所有被引用文件都存在
7. **验证 examples**：Examples 完整且正确
8. **测试 scripts**：Scripts 可执行且工作正常

**使用 skill-reviewer agent：**

```
Ask: "Review my skill and check if it follows best practices"
```

skill-reviewer agent 会检查 description 质量、内容组织和 progressive disclosure。

## 步骤 6：迭代

测试 skill 后，用户可能会请求改进。这通常发生在刚使用 skill 之后，此时对 skill 表现有新鲜上下文。

**迭代 workflow：**

1. 在真实任务中使用 skill
2. 注意卡点或低效之处
3. 识别应如何更新 SKILL.md 或 bundled resources
4. 实施更改并再次测试

**常见改进：**

- 强化 description 中的 trigger phrases
- 将长章节从 SKILL.md 移到 references/
- 添加缺失的 examples 或 scripts
- 澄清含糊指令
- 添加 edge case 处理

## Progressive Disclosure 实践

### SKILL.md 中放什么

**包含（skill 触发时始终加载）：**

- 核心概念和概览
- 必要 procedures 和 workflows
- Quick reference tables
- 指向 references/examples/scripts 的指针
- 最常见用例

保持在 3,000 词以内，理想为 1,500-2,000 词。

### references/ 中放什么

**移到 references/（按需加载）：**

- 详细 patterns 和高级技巧
- Comprehensive API documentation
- Migration guides
- Edge cases 和 troubleshooting
- 大量 examples 和 walkthroughs

每个 reference file 可以较大（2,000-5,000+ 词）。

### examples/ 中放什么

**可运行代码示例：**

- 完整、可运行的 scripts
- Configuration files
- Template files
- Real-world usage examples

用户可以直接复制并改造这些内容。

### scripts/ 中放什么

**Utility scripts：**

- Validation tools
- Testing helpers
- Parsing utilities
- Automation scripts

应可执行并有文档说明。

## 写作风格指南

### Imperative/Infinitive Form

使用动词优先的指令，不使用第二人称：

**正确（imperative）：**

```
To create a hook, define the event type.
Configure the MCP server with authentication.
Validate settings before use.
```

**错误（second person）：**

```
You should create a hook by defining the event type.
You need to configure the MCP server.
You must validate settings before use.
```

### Description 中使用第三人称

Frontmatter description 必须使用第三人称：

**正确：**

```yaml
description: This skill should be used when the user asks to "create X", "configure Y"...
```

**错误：**

```yaml
description: Use this skill when you want to create X...
description: Load this skill when user asks...
```

### 客观的说明性语言

聚焦要做什么，而不是由谁做：

**正确：**

```
Parse the frontmatter using sed.
Extract fields with grep.
Validate values before use.
```

**错误：**

```
You can parse the frontmatter...
Claude should extract fields...
The user might validate values...
```

## 常见错误

### 错误 1：Trigger Description 太弱

**Bad：**

```yaml
description: Provides guidance for working with hooks.
```

为什么不好：模糊，没有具体 trigger phrases，不是第三人称

**Good：**

```yaml
description: This skill should be used when the user asks to "create a hook", "add a PreToolUse hook", "validate tool use", or mentions hook events. Provides comprehensive hooks API guidance.
```

为什么好：第三人称、具体 phrases、具体场景

### 错误 2：SKILL.md 内容过多

**Bad：**

```
skill-name/
└── SKILL.md  (8,000 words - everything in one file)
```

为什么不好：加载 skill 时会膨胀 context，详细内容总是被加载

**Good：**

```
skill-name/
├── SKILL.md  (1,800 words - core essentials)
└── references/
    ├── patterns.md (2,500 words)
    └── advanced.md (3,700 words)
```

为什么好：Progressive disclosure，详细内容仅在需要时加载

### 错误 3：第二人称写作

**Bad：**

```markdown
You should start by reading the configuration file.
You need to validate the input.
You can use the grep tool to search.
```

为什么不好：第二人称，不是 imperative form

**Good：**

```markdown
Start by reading the configuration file.
Validate the input before processing.
Use the grep tool to search for patterns.
```

为什么好：Imperative form，指令直接

### 错误 4：缺少资源引用

**Bad：**

```markdown
# SKILL.md

[Core content]

[No mention of references/ or examples/]
```

为什么不好：Claude 不知道 references 存在

**Good：**

```markdown
# SKILL.md

[Core content]

## Additional Resources

### Reference Files

- **`references/patterns.md`** - Detailed patterns
- **`references/advanced.md`** - Advanced techniques

### Examples

- **`examples/script.sh`** - Working example
```

为什么好：Claude 知道去哪里查找附加信息
