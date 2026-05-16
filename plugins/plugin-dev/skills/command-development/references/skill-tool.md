# Skill Tool 参考

Claude 如何在 conversations 中以编程方式调用 slash commands 和 skills。

## 概览

Skill tool 让 Claude 无需用户输入即可用编程方式执行 slash commands 和 Agent Skills。这使 Claude 能够在复杂 workflows 中自主调用这些能力、将它们串联起来，或响应用户请求使用它们。

> **关键洞察：** Commands 和 skills 使用同一机制。两者都通过 Skill tool 调用。Commands 较简单（单个 `.md` 文件）；skills 较复杂（包含捆绑资源的目录）。
>
> **注意：** 在 Claude Code 早期版本中，slash command 调用由单独的 `SlashCommand` tool 提供。现在它已合并到 `Skill` tool 中。

**关键概念：**

- Claude 可以通过 Skill tool 调用 commands 和 skills
- commands 需要 `description` frontmatter 才可见
- skills 可以通过 `user-invocable` 字段控制可见性
- permission rules 控制 Claude 可调用哪些 commands/skills
- character budget 限制 Claude “看到”的条目数量
- `disable-model-invocation` 会阻止两者被编程调用

## Skill Tool 可以调用什么

| 类型                  | 位置                                         | 要求                                           |
| --------------------- | -------------------------------------------- | ---------------------------------------------- |
| 自定义 slash commands | `.claude/commands/` 或 `~/.claude/commands/` | 必须有 `description` frontmatter               |
| Agent Skills          | `.claude/skills/` 或 `~/.claude/skills/`     | 不能有 `disable-model-invocation: true`        |
| Plugin commands       | `plugin-name/commands/`                      | 必须有 `description` frontmatter               |
| Plugin skills         | `plugin-name/skills/`                        | 不能有 `disable-model-invocation: true`        |

**注意：** `/compact` 和 `/init` 等内置 commands 不能通过此 tool 使用。

## Skill Tool 如何工作

### 它做什么

当 Claude 判断某个 skill 有助于完成任务时，会使用 Skill tool 加载该能力。该 tool 会：

1. 根据 permission rules 识别可用 skills
2. 为任务选择合适的 skill
3. 使用相应 arguments 加载 skill
4. 处理已加载的指导内容

### Claude 何时使用它

Claude 会在以下情况下使用 Skill tool：

- 某个 skill 直接对应用户请求
- 多个步骤需要加载专门指导
- 自动化 workflows 需要 skill 提供的上下文
- 用户按名称请求某个 plugin skill

**示例：** 如果用户说 “help me design a Claude Code command”，Claude 可能会使用 Skill tool 加载可用的 command-development skill。

## 可见性要求

### 需要 description 字段

commands **必须**有 `description` frontmatter 字段，才会对 Skill tool 可见。

**对 Skill tool 可见：**

```yaml
---
description: Review code for security issues
---
```

**对 Skill tool 不可见：**

```markdown
# No frontmatter - command only available via manual invocation

Review this code for security vulnerabilities...
```

**为什么有此要求：**

- Claude 使用 descriptions 理解 commands 的作用
- descriptions 帮助 Claude 选择正确 command
- 强制文档化 command 目的
- 防止未文档化 commands 被意外编程调用

### Description 最佳实践

编写能帮助 Claude 理解何时使用该 command 的 descriptions：

**良好 descriptions：**

```yaml
description: Review PR for code quality and security  # Clear purpose
description: Deploy application to staging environment  # Specific action
description: Run test suite and report failures  # Expected outcome
```

**不佳 descriptions：**

```yaml
description: Review  # Too vague - Claude can't determine when to use
description: Does stuff  # Unhelpful - doesn't describe purpose
description: A command  # Obvious - provides no information
```

## Character Budget（字符预算）

### 默认 Budget

Skill tool 有 character budget，用于限制 Claude 接收多少 command/skill descriptions。默认 budget 是 **15,000 characters**。

### Budget 如何工作

1. 条目按优先级排序（project，然后 user，然后 plugin）
2. descriptions 会持续加入，直到 budget 用尽
3. 超出 budget 的条目对 Claude 不可见
4. descriptions 越简洁，可见条目越多

### 配置 Budget

设置 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 环境变量进行调整：

```bash
# Increase budget to show more commands/skills
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000

# Decrease budget for faster processing
export SLASH_COMMAND_TOOL_CHAR_BUDGET=8000
```

### Budget 优化

**保持 descriptions 简洁：**

```yaml
# Good - concise (35 chars)
description: Review PR for security issues

# Bad - verbose (89 chars)
description: This command reviews pull requests for potential security vulnerabilities and issues
```

**优先保障重要条目：**

- project 条目显示在 user 条目之前
- 将关键 commands/skills 保留在 project scope 中
- 将很少使用的条目移到 user scope

## Permission Rules（权限规则）

### 概览

Permission rules 控制 Claude 可通过 Skill tool 调用哪些 commands 和 skills。规则在 Claude Code settings 中配置。

### 规则模式

**精确匹配（无 arguments）：**

```
Skill(commit)      # Only commit with no arguments
Skill(deploy)      # Only deploy with no arguments
```

**带 arguments 匹配：**

```
Skill(review-pr *)                # review-pr with any arguments
Skill(plugin-name:git-status *)   # Plugin skill with any arguments
Skill(plugin-name:review-pr *)    # Plugin command/skill with any arguments
```

**全部拒绝：**

将 `Skill` 加入 deny rules，可阻止所有编程调用。

### 配置示例

**允许特定 commands：**

```json
{
  "allow": ["Skill(review *)", "Skill(test *)"]
}
```

**拒绝危险 commands：**

```json
{
  "deny": ["Skill(deploy-prod *)", "Skill(delete *)"]
}
```

**拒绝所有编程调用：**

```json
{
  "deny": ["Skill"]
}
```

### Permission 优先级

1. 显式 deny rules 优先
2. 显式 allow rules 覆盖默认值
3. 默认行为允许编程调用
4. frontmatter 中的 `disable-model-invocation` 始终阻止调用

## disable-model-invocation 字段

### 用途

`disable-model-invocation` frontmatter 字段会阻止 Claude 以编程方式调用 command 或 skill，不受 permission rules 影响。

```yaml
---
description: Approve production deployment
disable-model-invocation: true
---
```

### 何时使用

**仅手动 commands：**

```yaml
---
description: Approve production deployment
disable-model-invocation: true
---
# Production Deployment Approval

This deployment requires human judgment and sign-off.
Verify all checks have passed before approving.
```

**破坏性操作：**

```yaml
---
description: Delete all test data
disable-model-invocation: true
---

# Test Data Deletion

WARNING: This permanently deletes all test data.
This operation cannot be undone.
```

**交互式 workflows：**

```yaml
---
description: Setup wizard for new project
disable-model-invocation: true
---
# Project Setup Wizard

This wizard requires interactive user input at each step.
```

### 它与 Permission Rules 的区别

| 方面     | disable-model-invocation  | Permission Rules     |
| -------- | ------------------------- | -------------------- |
| 作用域   | 单个 command/skill        | 全局/基于模式        |
| 位置     | Frontmatter               | settings 文件        |
| 覆盖方式 | 不可覆盖                  | 可调整               |
| 使用场景 | 条目专属限制              | 策略执行             |

**以下情况使用 `disable-model-invocation`：**

- 条目绝不应被编程调用
- 限制是该条目目的的内在要求
- 由作者作出决定

**以下情况使用 permission rules：**

- 组织策略限制某些模式
- 用户想控制 Claude 的自主性
- 需要临时或可调整的限制

## user-invocable 字段（仅 Skills）

skills 还有一个额外的 `user-invocable` 字段，用于控制 slash menu 可见性：

```yaml
---
name: internal-review-standards
description: Apply internal code review standards
user-invocable: false
---
```

**重要区别：**

| 设置                             | Slash Menu | Skill Tool | Auto-Discovery |
| -------------------------------- | ---------- | ---------- | -------------- |
| `user-invocable: true`（默认）   | 可见       | 允许       | 是             |
| `user-invocable: false`          | 隐藏       | 允许       | 是             |
| `disable-model-invocation: true` | 可见       | 阻止       | 是             |

`user-invocable` 字段只控制用户是否能在 `/` menu 中看到该 skill。它**不会**阻止 Claude 通过 Skill tool 或 auto-discovery 使用该 skill。

## 集成模式

### 面向编程使用设计的 Commands

有些 commands 适合由 Claude 调用：

```yaml
---
description: Get current git status summary
allowed-tools: Bash(git *)
---

# Git Status

Branch: !`git branch --show-current`
Status: !`git status --short`
Recent: !`git log -3 --oneline`
```

这个 command：

- 有清晰、具体的 description
- 为 Claude 生成有用输出
- 不包含破坏性操作
- 执行快速

### 仅手动使用的 Commands

有些 commands 应保持手动使用：

```yaml
---
description: Force push to protected branch (DANGEROUS)
disable-model-invocation: true
allowed-tools: Bash(git *)
---
# Force Push

WARNING: This will overwrite remote history.

Are you absolutely sure? Type the branch name to confirm: $1
```

这个 command：

- 使用 `disable-model-invocation: true`
- description 中有清晰警告
- 需要显式确认
- 文档化危险级别

### Workflow Commands（工作流 Commands）

串联其他 commands 的 commands 应考虑可见性：

```yaml
---
description: Complete release workflow
---

# Release Workflow

Execute the following steps:
1. Run tests via /test
2. Update version via /version-bump $1
3. Create changelog via /changelog
4. Tag release via /tag-release $1

Verify each step before proceeding.
```

如果子 commands 设置了 `disable-model-invocation: true`，该 workflow command 在这些步骤中将需要用户交互。

## 故障排查

### Command/Skill 对 Claude 不可用

**检查 description 字段：**

```yaml
---
description: Must have description # Required for visibility
---
```

**检查 character budget：**

- 条目过多可能超过 budget
- 缩短 descriptions 或提高 budget
- 检查设置 `SLASH_COMMAND_TOOL_CHAR_BUDGET=100000` 后条目是否出现

**检查 permission rules：**

- 验证没有 deny rules 匹配该条目
- 检查 allow rules 是否过于严格

### Claude 不会调用 Command/Skill

**检查 disable-model-invocation：**

```yaml
disable-model-invocation: true # Blocks programmatic invocation
```

**检查 permission rules：**

- 查找匹配该条目的 deny patterns
- 验证 Skill 不在全局 deny list 中

### 可见条目过多

**降低 character budget：**

```bash
export SLASH_COMMAND_TOOL_CHAR_BUDGET=8000
```

**缩短 descriptions：**

- 控制在 60 个字符以内
- 删除冗余词语
- 聚焦关键目的

**使用 disable-model-invocation：**

- 添加到不应自动调用的条目
- 只保留必要条目可见

## 最佳实践

### 面向作者

1. **始终包含 description** - 可见性所必需
2. **保持 descriptions 简洁** - 遵守 character budget
3. **审慎使用 `disable-model-invocation`** - 仅在真正需要时使用
4. **文档化危险操作** - 在 description 中说明风险
5. **兼顾两种用法设计** - 条目应同时支持手动和编程使用

### 面向用户/组织

1. **设置合适 permission rules** - 平衡自主性与安全性
2. **调整 character budget** - 根据条目数量决定
3. **审查 descriptions** - 确保 Claude 能理解
4. **测试编程调用** - 验证条目按预期工作
5. **监控使用情况** - 跟踪 Claude 调用了哪些条目
