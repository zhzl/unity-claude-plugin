# Command Frontmatter 参考

slash command 中 YAML frontmatter 字段的完整参考。

## Frontmatter 概览

YAML frontmatter 是 command 文件开头的可选元数据：

```markdown
---
description: Brief description
allowed-tools: Read, Write
model: sonnet
argument-hint: "[arg1] [arg2]"
---

Command prompt content here...
```

所有字段都是可选的。没有任何 frontmatter 时，command 仍可工作。

## 字段规格

### description

**类型：** String
**必填：** 否
**默认值：** command prompt 的第一行
**最大长度：** 建议约 60 个字符，以便在 `/help` 中整洁显示

**用途：** 描述 command 的作用，并显示在 `/help` 输出中

**示例：**

```yaml
description: Review code for security issues
```

```yaml
description: Deploy to staging environment
```

```yaml
description: Generate API documentation
```

**最佳实践：**

- 控制在 60 个字符以内，便于整洁显示
- 以动词开头（如 Review、Deploy、Generate）
- 具体说明 command 做什么
- 避免冗余的 “command” 或 “slash command”

**良好示例：**

- ✅ “Review PR for code quality and security”（清晰说明审查范围）
- ✅ “Deploy application to specified environment”（动作和目标明确）
- ✅ “Generate comprehensive API documentation”（输出目标具体）

**不佳示例：**

- ❌ “This command reviews PRs”（“This command” 不必要）
- ❌ “Review”（过于模糊）
- ❌ “A command that reviews pull requests for code quality, security issues, and best practices”（过长）

### allowed-tools

**类型：** 逗号分隔的字符串
**必填：** 否
**默认值：** 继承 conversation permissions

**用途：** 限制或指定 command 可使用哪些 tools

**格式：**

**单个 tool：**

```yaml
allowed-tools: Read
```

**多个 tools（逗号分隔）：**

```yaml
allowed-tools: Read, Write, Edit
```

```yaml
allowed-tools: Read, Write, Bash(git *)
```

**Tool 模式：**

**指定 tools：**

```yaml
allowed-tools: Read, Grep, Edit
```

**带 command 过滤器的 Bash：**

```yaml
allowed-tools: Bash(git *)           # Only git commands
allowed-tools: Bash(npm *)           # Only npm commands
allowed-tools: Bash(docker *)        # Only docker commands
```

**所有 tools（不推荐）：**

```yaml
allowed-tools: "*"
```

**何时使用：**

1. **安全：** 将 command 限制为安全操作

   ```yaml
   allowed-tools: Read, Grep # Read-only command
   ```

2. **清晰度：** 文档化所需 tools

   ```yaml
   allowed-tools: Bash(git *), Read
   ```

3. **Bash 执行：** 启用 bash command 输出
   ```yaml
   allowed-tools: Bash(git status *), Bash(git diff *)
   ```

**最佳实践：**

- 尽可能严格限制
- 为 Bash 使用 command 过滤器（例如 `git *`，不要用 `*`）
- 仅在不同于 conversation permissions 时指定
- 文档化为什么需要特定 tools

### model

**类型：** String
**必填：** 否
**默认值：** 继承 conversation
**取值：** `sonnet`、`opus`、`haiku` 或 `inherit`

这些取值使用各 model family 当前的默认版本。`inherit` 使用 conversation 当前的 model。

**用途：** 指定执行该 command 的 Claude model

**示例：**

```yaml
model: haiku # Fast, efficient for simple tasks
```

```yaml
model: sonnet # Balanced performance (default)
```

```yaml
model: opus # Maximum capability for complex tasks
```

**何时使用：**

**适合使用 `haiku` 的场景：**

- 简单、程式化的 commands
- 需要快速执行
- 低复杂度任务
- 频繁调用

```yaml
---
description: Format code file
model: haiku
---
```

**适合使用 `sonnet` 的场景：**

- 标准 commands（默认）
- 速度与质量平衡
- 大多数常见用例

```yaml
---
description: Review code changes
model: sonnet
---
```

**适合使用 `opus` 的场景：**

- 复杂分析
- 架构决策
- 深入代码理解
- 关键任务

```yaml
---
description: Analyze system architecture
model: opus
---
```

**最佳实践：**

- 没有特定需要时省略
- 可行时使用 `haiku` 以提升速度
- 将 `opus` 留给真正复杂的任务
- 用不同 models 测试，找到合适平衡

### argument-hint

**类型：** String
**必填：** 否
**默认值：** 无

**用途：** 为用户和自动补全文档化预期 arguments

**格式：**

```yaml
argument-hint: "[arg1] [arg2] [optional-arg]"
```

**示例：**

**单个 argument：**

```yaml
argument-hint: "[pr-number]"
```

**多个必填 arguments：**

```yaml
argument-hint: "[environment] [version]"
```

**可选 arguments：**

```yaml
argument-hint: "[file-path] [options]"
```

**描述性名称：**

```yaml
argument-hint: "[source-branch] [target-branch] [commit-message]"
```

**最佳实践：**

- 为每个 argument 使用方括号 `[]`
- 使用描述性名称（不要用 `arg1`、`arg2`）
- 在说明中标明可选与必填
- 顺序与 command 中的位置 arguments 保持一致
- 保持简洁且清晰

**按模式分类的示例：**

**简单 command：**

```yaml
---
description: Fix issue by number
argument-hint: "[issue-number]"
---
Fix issue #$1...
```

**多 argument：**

```yaml
---
description: Deploy to environment
argument-hint: "[app-name] [environment] [version]"
---

Deploy $1 to $2 using version $3...
```

**带 options：**

```yaml
---
description: Run tests with options
argument-hint: "[test-pattern] [options]"
---

Run tests matching $1 with options: $2
```

### disable-model-invocation

**类型：** Boolean
**必填：** 否
**默认值：** false

**用途：** 阻止 Skill tool 以编程方式调用 command

**示例：**

```yaml
disable-model-invocation: true
```

**何时使用：**

1. **仅手动 commands：** 需要用户判断的 commands

   ```yaml
   ---
   description: Approve deployment to production
   disable-model-invocation: true
   ---
   ```

2. **破坏性操作：** 具有不可逆影响的 commands

   ```yaml
   ---
   description: Delete all test data
   disable-model-invocation: true
   ---
   ```

3. **交互式 workflows：** 需要用户输入的 commands
   ```yaml
   ---
   description: Walk through setup wizard
   disable-model-invocation: true
   ---
   ```

**默认行为（false）：**

- command 可被 Skill tool 使用
- Claude 可以用编程方式调用
- 仍可手动调用

**为 true 时：**

- command 只能由用户输入 `/command` 调用
- 不对 Skill tool 可用
- 对敏感操作更安全

**最佳实践：**

- 谨慎使用（会限制 Claude 的自主性）
- 在 command 注释中说明原因
- 如果总是手动，考虑该 command 是否仍应存在

## 完整示例

### 最小 command

不需要 frontmatter：

```markdown
Review this code for common issues and suggest improvements.
```

### 简单 command

仅包含 description：

```markdown
---
description: Review code for issues
---

Review this code for common issues and suggest improvements.
```

### 标准 command

包含 description 和 tools：

```markdown
---
description: Review Git changes
allowed-tools: Bash(git *), Read
---

Current changes: !`git diff --name-only`

Review each changed file for:

- Code quality
- Potential bugs
- Best practices
```

### 复杂 command

包含所有常用字段：

```markdown
---
description: Deploy application to environment
argument-hint: "[app-name] [environment] [version]"
allowed-tools: Bash(kubectl *), Bash(helm *), Read
model: sonnet
---

Deploy $1 to $2 environment using version $3

Pre-deployment checks:

- Verify $2 configuration
- Check cluster status with the Bash tool
- Validate version $3 exists

Proceed with deployment following deployment runbook.
```

### 仅手动 command

受限调用：

```markdown
---
description: Approve production deployment
argument-hint: "[deployment-id]"
disable-model-invocation: true
allowed-tools: Bash(gh *)
---

<!--
MANUAL APPROVAL REQUIRED
This command requires human judgment and cannot be automated.
-->

Review deployment $1 for production approval:

Deployment details: `gh api /deployments/$1`

Verify:

- All tests passed
- Security scan clean
- Stakeholder approval
- Rollback plan ready

Type "APPROVED" to confirm deployment.
```

## Validation（验证）

### 常见错误

**无效 YAML 语法：**

```yaml
---
description: Missing quote
allowed-tools: Read, Write
model: sonnet
--- # ❌ Missing closing quote above
```

**修复：** 验证 YAML 语法

**过宽的 tool 规格：**

```yaml
allowed-tools: Bash # Valid, but broad
```

**更安全：** 当 command 只需要 git 访问时，使用更窄的模式，例如 `Bash(git *)`

**无效 model 名称：**

```yaml
model: gpt4 # ❌ Not a valid Claude model
```

**修复：** 使用 `sonnet`、`opus`、`haiku` 或 `inherit`

### Validation（验证） 检查清单

提交 command 前：

- [ ] YAML 语法有效（无错误）
- [ ] description 少于 60 个字符
- [ ] allowed-tools 使用正确格式
- [ ] 如指定 model，其取值有效
- [ ] argument-hint 匹配位置 arguments
- [ ] disable-model-invocation 使用恰当

## 最佳实践总结

1. **从最小配置开始：** 仅在需要时添加 frontmatter
2. **文档化 arguments：** 有 arguments 时始终使用 argument-hint
3. **限制 tools：** 使用能工作的最严格 allowed-tools
4. **选择合适 model：** 用 haiku 追求速度，用 opus 处理复杂性
5. **谨慎使用仅手动：** 仅在必要时使用 disable-model-invocation
6. **清晰 descriptions：** 让 commands 可在 `/help` 中被发现
7. **充分测试：** 验证 frontmatter 按预期工作
