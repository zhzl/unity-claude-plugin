---
name: skill-creator
description: 创建有效 skills 的指南；当用户想要 create a new skill、update an existing skill，或通过 specialized knowledge、workflows、tool integrations 扩展 Claude capabilities 时使用。
archival: true
---

# Skill Creator（归档参考）

此文件保留为原始通用 skill creator 的归档参考材料。除非你的 checkout 中存在所引用 scripts，否则不要在此 plugin 中遵循其可执行指导；`skill-creation-workflow.md` 中的 plugin-specific workflow 才是当前可信来源。

此 skill 提供创建有效 skills 的指导。

## 关于 Skills

Skills 是模块化、自包含的包，通过提供 specialized knowledge、workflows 和 tools 来扩展 Claude 的能力。可以把它们看作特定领域或任务的 “onboarding guides”：它们将 Claude 从通用 agent 转化为配备 procedural knowledge 的 specialized agent，而这些知识是任何 model 都无法完全内化的。

### Skills 提供什么

1. Specialized workflows - 面向特定领域的多步骤 procedures
2. Tool integrations - 使用特定 file formats 或 APIs 的说明
3. Domain expertise - 公司特定知识、schemas、业务逻辑
4. Bundled resources - 面向复杂和重复任务的 scripts、references 和 assets

### Skill 的组成

每个 skill 都包含必需的 SKILL.md 文件和可选的 bundled resources：

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

**Metadata Quality：** YAML frontmatter 中的 `name` 和 `description` 决定 Claude 何时使用该 skill。应具体说明该 skill 做什么以及何时使用。使用第三人称（例如 “This skill should be used when...”，而不是 “Use this skill when...”）。

#### Bundled Resources（可选）

##### Scripts（`scripts/`）

用于需要 deterministic reliability 或会被反复重写任务的可执行代码（Python/Bash 等）。

- **何时包含**：当相同代码被反复重写，或需要 deterministic reliability 时
- **示例**：用于 PDF 旋转任务的 `scripts/rotate_pdf.py`
- **收益**：Token 高效、确定性强，可在不加载到 context 的情况下执行
- **说明**：Claude 可能仍需读取 scripts，以便进行 patching 或 environment-specific 调整

##### References（`references/`）

按需加载到 context 的文档和参考材料，用于指导 Claude 的流程和思考。

- **何时包含**：当 Claude 工作时应参考某些文档
- **示例**：财务 schemas 的 `references/finance.md`、公司 NDA template 的 `references/mnda.md`、公司 policies 的 `references/policies.md`、API specifications 的 `references/api_docs.md`
- **用例**：Database schemas、API documentation、domain knowledge、company policies、detailed workflow guides
- **收益**：保持 SKILL.md 精简，仅在 Claude 判断需要时加载
- **最佳实践**：如果文件较大（>10k words），在 SKILL.md 中包含 grep search patterns
- **避免重复**：信息应只存在于 SKILL.md 或 references files 之一，不要两边重复。除非内容确实是 skill 的核心，否则优先放入 references files；这样能保持 SKILL.md 精简，同时让信息可发现，避免占用 context window。SKILL.md 只保留必要 procedural instructions 和 workflow guidance；将详细 reference material、schemas 和 examples 移到 references files。

##### Assets（`assets/`）

不用于加载进 context，而是供 Claude 生成输出时使用的文件。

- **何时包含**：当 skill 需要最终输出会使用的文件时
- **示例**：brand assets 的 `assets/logo.png`、PowerPoint templates 的 `assets/slides.pptx`、HTML/React boilerplate 的 `assets/frontend-template/`、typography 的 `assets/font.ttf`
- **用例**：Templates、images、icons、boilerplate code、fonts、会被复制或修改的 sample documents
- **收益**：将输出资源与文档分离，使 Claude 无需将文件加载到 context 即可使用它们

### Progressive Disclosure 设计原则

Skills 使用三级加载系统来高效管理 context：

1. **Metadata（name + description）** - 始终在 context 中（约 100 词）
2. **SKILL.md body** - skill 触发时加载（<5k words）
3. **Bundled resources** - Claude 按需加载（Unlimited\*）

\*Unlimited 是因为 scripts 可以在不读入 context window 的情况下执行。

## Skill 创建流程

要创建 skill，请按顺序遵循 “Skill Creation Process”，只有在有明确理由说明步骤不适用时才跳过。

### 步骤 1：通过具体示例理解 Skill

仅当 skill 的使用模式已经非常清楚时，才跳过此步骤。即使处理现有 skill，这一步仍然有价值。

要创建有效的 skill，需要清楚理解该 skill 将如何被使用的具体示例。这种理解可以来自用户直接提供的示例，也可以来自生成后经用户反馈验证的示例。

例如，构建 image-editor skill 时，相关问题包括：

- “image-editor skill 应该支持哪些功能？编辑、旋转，还有其他吗？”
- “能否给一些这个 skill 会如何使用的示例？”
- “我可以想象用户会提出 ‘Remove the red-eye from this image’ 或 ‘Rotate this image’ 之类的请求。你还设想过其他使用方式吗？”
- “用户说什么内容时应该触发这个 skill？”

为避免让用户负担过重，不要在一条消息中提太多问题。先从最重要的问题开始，并根据需要追问，以提升效果。

当已经清楚该 skill 应支持的功能范围时，结束此步骤。

### 步骤 2：规划可复用的 Skill 内容

要把具体示例转化为有效的 skill，逐个分析示例：

1. 考虑如果从零开始执行该示例，需要怎么做
2. 识别在重复执行这些 workflows 时，哪些 scripts、references 和 assets 会有帮助

示例：构建 `pdf-editor` skill 来处理 “Help me rotate this PDF” 这类查询时，分析显示：

1. 旋转 PDF 每次都需要重写相同代码
2. 将 `scripts/rotate_pdf.py` 脚本存入 skill 会有帮助

示例：设计 `frontend-webapp-builder` skill 来处理 “Build me a todo app” 或 “Build me a dashboard to track my steps” 这类查询时，分析显示：

1. 编写 frontend webapp 每次都需要相同的 HTML/React boilerplate
2. 包含 HTML/React boilerplate 项目文件的 `assets/hello-world/` 模板会有帮助

示例：构建 `big-query` skill 来处理 “How many users have logged in today?” 这类查询时，分析显示：

1. 查询 BigQuery 每次都需要重新发现 table schemas 和关系
2. 记录 table schemas 的 `references/schema.md` 文件会有帮助

要确定 skill 的内容，分析每个具体示例，列出应包含的可复用资源：scripts、references 和 assets。

### 步骤 3：初始化 Skill

此时可以实际创建 skill。

仅当正在开发的 skill 已经存在，并且需要 iteration 或 packaging 时，才跳过此步骤。在这种情况下，继续下一步。

在原始通用 workflow 中，`init_skill.py` 会生成模板 skill 目录。对于此 plugin，不要假设该脚本存在；请按 `skill-creation-workflow.md` 中的说明直接创建 plugin skills。

用法：

```text
# Archival example only; use skill-creation-workflow.md for current plugin skills.
scripts/init_skill.py <skill-name> --path <output-directory>
```

该脚本会：

- 在指定 path 创建 skill 目录
- 生成带有正确 frontmatter 和 TODO placeholders 的 SKILL.md template
- 创建示例资源目录：`scripts/`、`references/` 和 `assets/`
- 在每个目录中添加可自定义或删除的示例文件

初始化后，按需自定义或移除生成的 SKILL.md 和示例文件。

### 步骤 4：编辑 Skill

编辑新生成或现有 skill 时，记住该 skill 是给另一个 Claude 实例使用的。重点包含对 Claude 有益且非显而易见的信息。思考哪些 procedural knowledge、domain-specific details 或 reusable assets 能帮助另一个 Claude 实例更有效地执行这些任务。

#### 从可复用 Skill 内容开始

开始实现时，先处理上面识别出的可复用资源：`scripts/`、`references/` 和 `assets/` 文件。注意，此步骤可能需要用户输入。例如，实现 `brand-guidelines` skill 时，用户可能需要提供 brand assets 或 templates 存入 `assets/`，或提供文档存入 `references/`。

同时，删除 skill 不需要的任何示例文件和目录。初始化脚本会在 `scripts/`、`references/` 和 `assets/` 中创建示例文件来展示结构，但大多数 skills 不会全部需要。

#### 更新 SKILL.md

**写作风格：** 整个 skill 使用 **imperative/infinitive form**（动词优先指令），不要使用第二人称。使用客观的说明性语言（例如 “To accomplish X, do Y”，而不是 “You should do X” 或 “If you need to do X”）。这能保持面向 AI 消费的一致性和清晰度。

要完成 SKILL.md，回答以下问题：

1. 该 skill 的目的是什么？用几句话说明。
2. 何时应使用该 skill？
3. 实际使用时，Claude 应如何使用该 skill？上面开发出的所有 reusable skill contents 都应被引用，以便 Claude 知道如何使用它们。

### 步骤 5：打包 Skill

当 skill 准备好后，应将其打包成可分发的 zip file 并分享给用户。Packaging 过程会先自动 validation 该 skill，确保其满足所有要求：

```text
# Archival example only; script may not exist in this plugin.
scripts/package_skill.py <path/to/skill-folder>
```

可选输出目录指定：

```text
# Archival example only; script may not exist in this plugin.
scripts/package_skill.py <path/to/skill-folder> ./dist
```

Packaging script 会：

1. **Validate** skill，自动检查：
   - YAML frontmatter 格式和必需字段
   - Skill naming conventions 和目录结构
   - Description 完整性和质量
   - 文件组织和资源引用

2. **Package** skill（如果 validation 通过），创建以 skill 命名的 zip file（例如 `my-skill.zip`），其中包含所有文件并保持适合分发的正确目录结构。

如果 validation 失败，脚本会报告错误并退出，不会创建 package。修复所有 validation errors 后再次运行 packaging command。

### 步骤 6：迭代

测试 skill 后，用户可能会请求改进。这通常发生在刚使用 skill 之后，此时对 skill 表现有新鲜上下文。

**迭代 workflow：**

1. 在真实任务中使用 skill
2. 注意卡点或低效之处
3. 识别应如何更新 SKILL.md 或 bundled resources
4. 实施更改并再次测试
