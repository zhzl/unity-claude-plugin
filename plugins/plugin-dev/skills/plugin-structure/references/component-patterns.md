# Component Organization Patterns

有效组织 plugin components 的高级 patterns。

## Component Lifecycle

### Discovery Phase

Claude Code 启动时：

1. **扫描 enabled plugins**：读取每个 plugin 的 `.claude-plugin/plugin.json`
2. **发现 components**：查找默认和自定义 paths
3. **解析 definitions**：读取 YAML frontmatter 和 configurations
4. **注册 components**：使其可供 Claude Code 使用
5. **初始化**：启动 MCP servers，注册 hooks

**Timing**：Component registration 发生在 Claude Code initialization 期间，而不是持续进行。

### Activation Phase

Components 被使用时：

**Commands**：用户输入 slash command → Claude Code 查找 → 执行
**Agents**：任务到达 → Claude Code 评估 capabilities → 选择 agent
**Skills**：任务 context 匹配 description → Claude Code 加载 skill
**Hooks**：Event 发生 → Claude Code 调用匹配的 hooks
**MCP Servers**：Tool call 匹配 server capability → 转发给 server

## Command Organization Patterns

### Flat Structure

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

### Categorized Structure

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

**Manifest configuration**：

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

### Hierarchical Structure

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

## Agent Organization Patterns

### Role-Based Organization

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

### Capability-Based Organization

按具体 capabilities 组织：

```
agents/
├── python-expert.md        # Python-specific
├── typescript-expert.md    # TypeScript-specific
├── api-specialist.md       # API design
└── database-specialist.md  # Database work
```

**适用场景**：

- Technology-specific agents
- 关注 domain expertise
- Automatic agent selection

### Workflow-Based Organization

按 workflow stage 组织：

```
agents/
├── planning-agent.md      # Planning phase
├── implementation-agent.md # Coding phase
├── testing-agent.md       # Testing phase
└── deployment-agent.md    # Deployment phase
```

**适用场景**：

- Sequential workflows
- Stage-specific expertise
- Pipeline automation

## Skill Organization Patterns

### Topic-Based Organization

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

- Knowledge-based skills
- Educational 或 reference content
- 广泛适用性

### Tool-Based Organization

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

- Tool-specific expertise
- 复杂 tool configurations
- Tool best practices

### Workflow-Based Organization

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

- Multi-step processes
- Company-specific workflows
- Process automation

### Skill with Rich Resources

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

**Resource usage**：

- **SKILL.md**：Overview，以及何时使用 resources
- **references/**：详细 guides（按需加载）
- **examples/**：可复制粘贴的 code samples
- **scripts/**：Executable test runners
- **assets/**：Templates 和 configurations

## Hook Organization Patterns

### Monolithic Configuration

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
- Centralized configuration

### Event-Based Organization

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

### Purpose-Based Organization

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
- Team specialization

## Script Organization Patterns

### Flat Scripts

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

### Categorized Scripts

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
- Reusable utilities

### Language-Based Organization

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

- Multi-language scripts
- 不同 runtime requirements
- Language-specific dependencies

## Cross-Component Patterns

### Shared Resources

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

**Usage in components**：

```bash
#!/bin/bash
source "${CLAUDE_PLUGIN_ROOT}/lib/test-utils.sh"
run_tests
```

**Benefits**：

- Code reuse
- Consistent behavior
- 更容易维护

### Layered Architecture

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

### Plugin Within Plugin

Nested plugin structure：

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

**Manifest**：

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

- Modular functionality
- Optional features
- Plugin families

## Best Practices

### Naming

1. **Consistent naming**：让 file names 与 component purpose 匹配
2. **Descriptive names**：说明 component 的作用
3. **Avoid abbreviations**：使用完整单词以保持清晰

### Organization

1. **Start simple**：使用 flat structure，必要时再重组
2. **Group related items**：将相关 components 放在一起
3. **Separate concerns**：不要混合无关 functionality

### Scalability

1. **Plan for growth**：选择可扩展的 structure
2. **Refactor early**：在变得痛苦之前重组
3. **Document structure**：在 README 中说明 organization

### Maintainability

1. **Consistent patterns**：在整体中使用相同 structure
2. **Minimize nesting**：保持 directory depth 可控
3. **Use conventions**：遵循 community standards

### Performance

1. **Avoid deep nesting**：会影响 discovery time
2. **Minimize custom paths**：尽可能使用 defaults
3. **Keep configurations small**：大型 configs 会拖慢 loading
