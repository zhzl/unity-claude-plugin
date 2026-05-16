# Component 组织模式

有效组织 plugin components 的高级模式。

## Component 生命周期

### 发现阶段

Claude Code 启动时：

1. **扫描 enabled plugins**：读取每个 plugin 的 `.claude-plugin/plugin.json`
2. **发现 components**：查找默认和自定义 paths
3. **解析 definitions**：读取 YAML frontmatter 和 configurations
4. **注册 components**：使其可供 Claude Code 使用
5. **初始化**：启动 MCP servers，注册 hooks

**时机**：Component registration 发生在 Claude Code initialization 期间，而不是持续进行。

### 激活阶段

Components 被使用时：

- **Commands**：用户输入 slash command → Claude Code 查找 → 执行
- **Agents**：任务到达 → Claude Code 评估 capabilities → 选择 agent
- **Skills**：任务 context 匹配 description → Claude Code 加载 skill
- **Hooks**：Event 发生 → Claude Code 调用匹配的 hooks
- **MCP Servers**：Tool call 匹配 server capability → 转发给 server

## Command 组织模式

### 扁平结构

单个 directory 包含所有 commands：

```
commands/
├── build.md
├── test.md
├── deploy.md
├── review.md
└── docs.md
```

**适用场景**：

- 总共 5-15 个 commands
- 所有 commands 处于同一抽象层级
- 没有清晰分类

**优势**：

- 简单，易于导航
- 不需要 configuration
- Discovery 快

### 分类结构

用多个 directories 表示不同 command 类型：

```
commands/              # Core commands
├── build.md
└── test.md

admin-commands/        # Administrative
├── configure.md
└── manage.md

workflow-commands/     # Workflow automation
├── review.md
└── deploy.md
```

**Manifest 配置：**

```json
{
  "commands": ["./commands", "./admin-commands", "./workflow-commands"]
}
```

**适用场景**：

- 15+ 个 commands
- 清晰的功能分类
- 不同 permission levels

**优势**：

- 按用途组织
- 更容易维护
- 可以按 directory 限制 access

### 层级结构

为复杂 plugins 使用 nested organization：

```
commands/
├── ci/
│   ├── build.md
│   ├── test.md
│   └── lint.md
├── deployment/
│   ├── staging.md
│   └── production.md
└── management/
    ├── config.md
    └── status.md
```

**注意**：Claude Code 不会自动支持 nested command discovery。请使用 custom paths：

```json
{
  "commands": [
    "./commands/ci",
    "./commands/deployment",
    "./commands/management"
  ]
}
```

**适用场景**：

- 20+ 个 commands
- 多层级分类
- 复杂 workflows

**优势**：

- 最大化组织性
- 清晰 boundaries
- 可扩展结构

## Agent 组织模式

### 按 role 组织

按 agents 的主要 role 组织：

```
agents/
├── code-reviewer.md        # Reviews code
├── test-generator.md       # Generates tests
├── documentation-writer.md # Writes docs
└── refactorer.md          # Refactors code
```

**适用场景**：

- Agents 有清晰且不重叠的 roles
- 用户手动调用 agents
- Agent responsibilities 明确

### 按 capability 组织

按具体 capabilities 组织：

```
agents/
├── python-expert.md        # Python-specific
├── typescript-expert.md    # TypeScript-specific
├── api-specialist.md       # API design
└── database-specialist.md  # Database work
```

**适用场景**：

- 面向特定技术的 agents（Technology-specific agents）
- 关注 domain expertise
- 自动 agent 选择

### 按 workflow 组织

按 workflow stage 组织：

```
agents/
├── planning-agent.md      # Planning phase
├── implementation-agent.md # Coding phase
├── testing-agent.md       # Testing phase
└── deployment-agent.md    # Deployment phase
```

**适用场景**：

- 顺序 workflows
- 面向特定阶段的专长（Stage-specific expertise）
- 流水线自动化（Pipeline automation）

## Skill 组织模式

### 按 topic 组织

每个 skill 覆盖一个特定 topic：

```
skills/
├── api-design/
│   └── SKILL.md
├── error-handling/
│   └── SKILL.md
├── testing-strategies/
│   └── SKILL.md
└── performance-optimization/
    └── SKILL.md
```

**适用场景**：

- 知识型 skills（Knowledge-based skills）
- 教育型或 reference content
- 广泛适用性

### 按 tool 组织

面向特定 tools 或 technologies 的 skills：

```
skills/
├── docker/
│   ├── SKILL.md
│   └── references/
│       └── dockerfile-best-practices.md
├── kubernetes/
│   ├── SKILL.md
│   └── examples/
│       └── deployment.yaml
└── terraform/
    ├── SKILL.md
    └── scripts/
        └── validate-config.sh
```

**适用场景**：

- 面向特定 tool 的专长（Tool-specific expertise）
- 复杂 tool configurations
- Tool 最佳实践（Tool best practices）

### 按 workflow 组织

面向完整 workflows 的 skills：

```
skills/
├── code-review-workflow/
│   ├── SKILL.md
│   └── references/
│       ├── checklist.md
│       └── standards.md
├── deployment-workflow/
│   ├── SKILL.md
│   └── scripts/
│       ├── pre-deploy.sh
│       └── post-deploy.sh
└── testing-workflow/
    ├── SKILL.md
    └── examples/
        └── test-structure.md
```

**适用场景**：

- 多步骤流程（Multi-step processes）
- 公司特定 workflows（Company-specific workflows）
- 流程自动化（Process automation）

### 包含丰富 resources 的 skill

包含所有 resource types 的综合 skill：

```
skills/
└── api-testing/
    ├── SKILL.md              # Core skill (1500 words)
    ├── references/
    │   ├── rest-api-guide.md
    │   ├── graphql-guide.md
    │   └── authentication.md
    ├── examples/
    │   ├── basic-test.js
    │   ├── authenticated-test.js
    │   └── integration-test.js
    ├── scripts/
    │   ├── run-tests.sh
    │   └── generate-report.py
    └── assets/
        └── test-template.json
```

**Resource 用法：**

- **SKILL.md**：Overview，以及何时使用 resources
- **references/**：详细 guides（按需加载）
- **examples/**：可复制粘贴的 code samples
- **scripts/**：可执行 test runners
- **assets/**：Templates 和 configurations

## Hook 组织模式

### 单体 configuration

单个 hooks.json 包含所有 hooks：

```
hooks/
├── hooks.json     # All hook definitions
└── scripts/
    ├── validate-write.sh
    ├── validate-bash.sh
    └── load-context.sh
```

**hooks.json**：

```text
{
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**适用场景**：

- 总共 5-10 个 hooks
- 简单 hook logic
- 集中式 configuration

### 按 event 组织

每种 event type 使用单独文件：

```
hooks/
├── hooks.json              # Combines all
├── pre-tool-use.json      # PreToolUse hooks
├── post-tool-use.json     # PostToolUse hooks
├── stop.json              # Stop hooks
└── scripts/
    ├── validate/
    │   ├── write.sh
    │   └── bash.sh
    └── context/
        └── load.sh
```

**hooks.json**（组合）：

```text
{
  "PreToolUse": ${file:./pre-tool-use.json},
  "PostToolUse": ${file:./post-tool-use.json},
  "Stop": ${file:./stop.json}
}
```

**注意**：使用 build script 组合文件；Claude Code 不支持 file references。

**适用场景**：

- 10+ 个 hooks
- 不同 teams 管理不同 events
- 复杂 hook configurations

### 按用途组织

按功能用途分组：

```
hooks/
├── hooks.json
└── scripts/
    ├── security/
    │   ├── validate-paths.sh
    │   ├── check-credentials.sh
    │   └── scan-malware.sh
    ├── quality/
    │   ├── lint-code.sh
    │   ├── check-tests.sh
    │   └── verify-docs.sh
    └── workflow/
        ├── notify-team.sh
        └── update-status.sh
```

**适用场景**：

- 许多 hook scripts
- 清晰 functional boundaries
- 团队专长分工（Team specialization）

## Script 组织模式

### 扁平 scripts

所有 scripts 放在单个 directory：

```
scripts/
├── build.sh
├── test.py
├── deploy.sh
├── validate.js
└── report.py
```

**适用场景**：

- 5-10 个 scripts
- 所有 scripts 相关
- 简单 plugin

### 分类 scripts

按用途分组：

```
scripts/
├── build/
│   ├── compile.sh
│   └── package.sh
├── test/
│   ├── run-unit.sh
│   └── run-integration.sh
├── deploy/
│   ├── staging.sh
│   └── production.sh
└── utils/
    ├── log.sh
    └── notify.sh
```

**适用场景**：

- 10+ 个 scripts
- 清晰 categories
- 可复用 utilities

### 按 language 组织

按 programming language 分组：

```
scripts/
├── bash/
│   ├── build.sh
│   └── deploy.sh
├── python/
│   ├── analyze.py
│   └── report.py
└── javascript/
    ├── bundle.js
    └── optimize.js
```

**适用场景**：

- 多语言 scripts（Multi-language scripts）
- 不同 runtime requirements
- 语言特定 dependencies（Language-specific dependencies）

## Cross-component 模式

### 共享 resources

Components 共享 common resources：

```
plugin/
├── commands/
│   ├── test.md        # Uses lib/test-utils.sh
│   └── deploy.md      # Uses lib/deploy-utils.sh
├── agents/
│   └── tester.md      # References lib/test-utils.sh
├── hooks/
│   └── scripts/
│       └── pre-test.sh # Sources lib/test-utils.sh
└── lib/
    ├── test-utils.sh
    └── deploy-utils.sh
```

**在 components 中的用法：**

```bash
#!/bin/bash
source "${CLAUDE_PLUGIN_ROOT}/lib/test-utils.sh"
run_tests
```

**优势：**

- 代码复用
- 一致 behavior
- 更容易维护

### 分层 architecture

将 concerns 分离到不同 layers：

```
plugin/
├── commands/          # User interface layer
├── agents/            # Orchestration layer
├── skills/            # Knowledge layer
└── lib/
    ├── core/         # Core business logic
    ├── integrations/ # External services
    └── utils/        # Helper functions
```

**适用场景**：

- 大型 plugins（100+ files）
- 多名 developers
- 清晰 separation of concerns

### Plugin 内嵌 plugin

Nested plugin 结构：

```
plugin/
├── .claude-plugin/
│   └── plugin.json
├── core/              # Core functionality
│   ├── commands/
│   └── agents/
└── extensions/        # Optional extensions
    ├── extension-a/
    │   ├── commands/
    │   └── agents/
    └── extension-b/
        ├── commands/
        └── agents/
```

**Manifest：**

```json
{
  "commands": [
    "./core/commands",
    "./extensions/extension-a/commands",
    "./extensions/extension-b/commands"
  ]
}
```

**适用场景**：

- 模块化 functionality
- 可选 features
- Plugin families（plugin 家族）

## 最佳实践

### 命名

1. **一致命名（Consistent naming）**：让 file names 与 component purpose 匹配
2. **描述性名称（Descriptive names）**：说明 component 的作用
3. **避免缩写（Avoid abbreviations）**：使用完整单词以保持清晰

### 组织

1. **从简单开始（Start simple）**：使用 flat structure，必要时再重组
2. **分组相关项（Group related items）**：将相关 components 放在一起
3. **分离关注点（Separate concerns）**：不要混合无关 functionality

### 可扩展性

1. **规划增长（Plan for growth）**：选择可扩展的 structure
2. **尽早重组（Refactor early）**：在变得痛苦之前重组
3. **记录结构（Document structure）**：在 README 中说明 organization

### 可维护性

1. **一致模式（Consistent patterns）**：在整体中使用相同 structure
2. **减少嵌套（Minimize nesting）**：保持 directory depth 可控
3. **使用约定（Use conventions）**：遵循 community standards

### 性能

1. **避免深层嵌套（Avoid deep nesting）**：会影响 discovery time
2. **减少自定义 paths（Minimize custom paths）**：尽可能使用 defaults
3. **保持 configurations 小（Keep configurations small）**：大型 configs 会拖慢 loading
