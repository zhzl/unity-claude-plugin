# Plugin Integration Patterns

Command 可以与其他 plugin 组件集成，形成强大的 workflow。

## Agent Integration

为复杂任务启动 plugin agent：

```markdown
---
description: Deep code review
argument-hint: "[file-path]"
---

Initiate comprehensive review of @$1 using the code-reviewer agent.

The agent will analyze:

- Code structure
- Security issues
- Performance
- Best practices

Agent uses plugin resources:

- ${CLAUDE_PLUGIN_ROOT}/config/rules.json
- ${CLAUDE_PLUGIN_ROOT}/checklists/review.md
```

**关键点：**

- Agent 必须存在于 `plugin/agents/` 目录
- Claude 使用 Agent tool 启动 agent
- 记录 agent 能力
- 引用 agent 使用的 plugin resources

## Skill Integration

利用 plugin skill 获取专门知识：

```markdown
---
description: Document API with standards
argument-hint: "[api-file]"
---

Document API in @$1 following plugin standards.

Use the api-docs-standards skill to ensure:

- Complete endpoint documentation
- Consistent formatting
- Example quality
- Error documentation

Generate production-ready API docs.
```

**关键点：**

- Skill 必须存在于 `plugin/skills/` 目录
- 提及 skill 名称以触发调用
- 记录 skill 用途
- 解释 skill 提供什么能力

## Hook Coordination

设计能与 plugin hooks 协同工作的 command：

- Command 可以为 hooks 准备待处理状态
- Hooks 会在 tool 事件上自动执行
- Command 应记录预期的 hook 行为
- 指导 Claude 如何解读 hook 输出

有关与 hooks 协调的 command 示例，请参阅 `plugin-features-reference.md`。

## Multi-Component Workflows

组合 agents、skills 和 scripts：

```markdown
---
description: Comprehensive review workflow
argument-hint: "[file]"
allowed-tools: Bash(node *), Read
---

Target: @$1

Phase 1 - Static Analysis:
Run the plugin lint script with the Bash tool.

Phase 2 - Deep Review:
Launch code-reviewer agent for detailed analysis.

Phase 3 - Standards Check:
Use coding-standards skill for validation.

Phase 4 - Report:
Template: @${CLAUDE_PLUGIN_ROOT}/templates/review.md

Compile findings into report following template.
```

**适用场景：**

- 复杂的多步骤 workflow
- 利用多个 plugin capabilities
- 需要专门分析
- 需要结构化输出

## Validation Patterns

Command 应在处理前 validation 输入和资源。

### Argument Validation

```markdown
---
description: Deploy with validation
argument-hint: "[environment]"
---

Validate environment: !`echo "$1" | grep -E "^(dev|staging|prod)$" || echo "INVALID"`

If $1 is valid environment:
Deploy to $1
Otherwise:
Explain valid environments: dev, staging, prod
Show usage: /deploy [environment]
```

### File Existence Checks

```markdown
---
description: Process configuration
argument-hint: "[config-file]"
---

Check file exists: !`test -f "$1" && echo "EXISTS" || echo "MISSING"`

If file exists:
Process configuration: @$1
Otherwise:
Explain where to place config file
Show expected format
Provide example configuration
```

### Plugin Resource Validation

```markdown
---
description: Run plugin analyzer
allowed-tools: Bash(test *)
---

Validate plugin setup:

- Script: !`test -x ${CLAUDE_PLUGIN_ROOT}/bin/analyze && echo "✓" || echo "✗"`
- Config: !`test -f ${CLAUDE_PLUGIN_ROOT}/config.json && echo "✓" || echo "✗"`

If all checks pass, run analysis.
Otherwise, report missing components.
```

### Error Handling

```markdown
---
description: Build with error handling
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/build *)
---

Run the build script with the Bash tool during the task and treat nonzero exit as BUILD_FAILED.

If build succeeded:
Report success and output location
If build failed:
Analyze error output
Suggest likely causes
Provide troubleshooting steps
```

**Best practices：**

- 在 command 早期进行 validation
- 提供有帮助的错误消息
- 建议纠正操作
- 优雅处理边界情况
