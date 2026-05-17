# Agent 触发示例：最佳实践

这是为 agent description 编写高质量 `<example>` 块的完整指南，以获得更可靠的 triggering 效果。

## 示例块格式

triggering 示例的标准格式如下（与官方 Claude Code 文档保持一致）：

```markdown
<example>
Context: [Describe the situation - what led to this interaction]
user: "[Exact user message or request]"
assistant: "[How Claude invokes the agent - 'I'll use the [agent-name] agent to [action]']"
<commentary>
[Explanation of why this agent should be triggered in this scenario]
</commentary>
</example>
```

## 好示例的结构

### 上下文（Context）

**目的：** 交代场景，也就是用户这条消息之前发生了什么。

**好的上下文：**

```
Context: User just implemented a new authentication feature
Context: User has created a PR and wants it reviewed
Context: User is debugging a test failure
Context: After writing several functions without documentation
```

**不好的上下文：**

```
Context: User needs help (too vague)
Context: Normal usage (not specific)
```

### 用户消息（User Message）

**目的：** 展示会触发 agent 的具体用户措辞。

**好的用户消息：**

```
user: "I've added the OAuth flow, can you check it?"
user: "Review PR #123"
user: "Why is this test failing?"
user: "Add docs for these functions"
```

**改变措辞写法：**
对同一种意图，给出多条不同说法的示例：

```
Example 1: user: "Review my code"
Example 2: user: "Can you check this implementation?"
Example 3: user: "Look over my changes"
```

### 助手响应（Assistant Response）

**目的：** 展示 Claude 如何调用 agent。

**好的响应：**

```
assistant: "I'll use the code-reviewer agent to analyze your OAuth implementation."
assistant: "I'll use the pr-analyzer agent to review that PR for you."
assistant: "I'll use the test-analyzer agent to investigate the test failure."
```

### 说明（Commentary）

**目的：** 解释触发理由，也就是为什么此时应该触发该 agent。

**好的说明：**

```
<commentary>
User explicitly requested code review, trigger the code-reviewer agent.
</commentary>

<commentary>
After code implementation, proactively use review agent to check quality.
</commentary>

<commentary>
PR analysis request matches pr-analyzer agent's expertise.
</commentary>
```

**加入决策逻辑：**

```
<commentary>
User wrote tests (Test tool used). The test-analyzer agent should check
test quality and coverage before continuing.
</commentary>
```

## 示例类型

### 类型 1：显式请求

用户直接要求 agent 所擅长的事情：

```markdown
<example>
Context: User explicitly requests security analysis
user: "Check my code for security vulnerabilities"
assistant: "I'll use the security-analyzer agent to perform a thorough security review."
<commentary>
Direct security analysis request triggers the security-analyzer agent.
</commentary>
</example>
```

### 类型 2：主动触发

即使用户没有明说，只要做完相关工作也应触发 agent：

```markdown
<example>
Context: User just implemented database queries
user: "I've added the user search functionality"
assistant: "I'll use the security-analyzer agent to review the database code for security issues."
<commentary>
Database code written. Proactively trigger security-analyzer to check
for SQL injection and other database security issues.
</commentary>
</example>
```

### 类型 3：隐式请求

用户没有直接说出口，但表达里已经暗示了需求：

```markdown
<example>
Context: User mentions code is hard to understand
user: "This code is confusing and hard to follow"
assistant: "I'll use the code-simplifier agent to refactor for better readability."
<commentary>
User indicates complexity issues. Trigger code-simplifier agent to improve clarity.
</commentary>
</example>
```

### 类型 4：工具使用模式（Tool Usage Pattern）

基于先前的 tool 使用模式来触发 agent：

```markdown
<example>
Context: User made multiple edits to test files
user: "I've updated all the tests"
assistant: "I'll use the test-quality-analyzer agent to verify the tests follow best practices."
<commentary>
Multiple Edit tools used on test files. Proactively trigger test-quality-analyzer
to ensure tests follow best practices.
</commentary>
</example>
```

## 多个示例的策略

### 覆盖不同措辞

```markdown
<example>
user: "Review my code"
[...]
</example>

<example>
user: "Can you check my implementation?"
[...]
</example>

<example>
user: "Look over these changes"
[...]
</example>
```

### 同时覆盖主动与被动触发

```markdown
<example>
Context: User explicitly requests review
user: "Review my code for issues"
assistant: "I'll use the code-reviewer agent to analyze the code."
<commentary>
Explicit review request triggers the agent.
</commentary>
</example>

<example>
Context: After user writes code
user: "I've implemented the feature"
assistant: "I'll use the code-reviewer agent to review the implementation."
<commentary>
Code written, proactively review for quality and issues.
</commentary>
</example>
```

### 覆盖边界场景

```markdown
<example>
Context: Typical usage
user: "Check my PR"
[...]
</example>

<example>
Context: Large PR that needs thorough analysis
user: "This is a big PR, can you do a deep review?"
[...]
<commentary>
Large PR mentioned, use thorough analysis mode.
</commentary>
</example>
```

## 常见错误

### ❌ 缺少上下文（Context）

```markdown
<example>
user: "Review my code"
assistant: "I'll use the code-reviewer agent."
</example>
```

**为什么不好：** 没有说明这次请求之前发生了什么。

### ✅ 带上上下文（Context）

```markdown
<example>
Context: User just finished implementing authentication
user: "Review my code"
assistant: "I'll use the code-reviewer agent to analyze the auth implementation for security and best practices."
<commentary>
Auth code written. Review for security and best practices.
</commentary>
</example>
```

### ❌ 没有说明（Commentary）

```markdown
<example>
Context: User requests review
user: "Check my changes"
assistant: "I'll use the reviewer agent."
</example>
```

**为什么不好：** 没解释为什么这里应该触发 agent。

### ✅ 带说明（Commentary）

```markdown
<example>
Context: User requests review after making changes
user: "Check my changes"
assistant: "I'll use the code-reviewer agent to analyze the modifications."
<commentary>
Code review request triggers agent to check quality, security, and adherence to standards.
</commentary>
</example>
```

### ❌ agent 直接回答任务

```markdown
<example>
user: "Review my code"
assistant: "I found the following issues: [lists issues]"
</example>
```

**为什么不好：** 这展示的是 agent 输出，而不是 triggering。

### ✅ 正确展示 triggering

```markdown
<example>
user: "Review my code"
assistant: "I'll use the code-reviewer agent to perform the review."
<commentary>
Review request triggers the agent.
</commentary>
</example>
```

## 需要多少个示例？

### 最少：2 个示例

至少覆盖：

1. 显式请求
2. 一个变体，或一个主动触发场景

### 推荐：3-4 个示例

建议覆盖：

1. 显式请求（直接发问）
2. 隐式请求（用户暗示需要）
3. 主动触发（完成相关工作后）
4. 边界场景或特定场景

### 最多：6 个示例

超过 6 个会让 description 过长。聚焦最重要的场景即可。

## 模板库

### 代码复审 Agent

```markdown
<example>
Context: User just implemented a new feature
user: "I've added the user registration feature"
assistant: "I'll use the code-reviewer agent to analyze the implementation."
<commentary>
Code written, proactively trigger code-reviewer agent.
</commentary>
</example>

<example>
Context: User explicitly requests review
user: "Can you review my changes for issues?"
assistant: "I'll use the code-reviewer agent to perform a thorough review."
<commentary>
Explicit review request triggers the agent.
</commentary>
</example>
```

### 测试生成 Agent

```markdown
<example>
Context: User implemented functions without tests
user: "I've added the data processing functions"
assistant: "I'll use the test-generator agent to create comprehensive tests."
<commentary>
New code without tests, proactively trigger test-generator agent.
</commentary>
</example>

<example>
Context: User explicitly asks for tests
user: "Generate tests for my code"
assistant: "I'll use the test-generator agent to create a complete test suite."
<commentary>
Direct test generation request triggers the agent.
</commentary>
</example>
```

### 文档 Agent

```markdown
<example>
Context: User added new API endpoints
user: "I've implemented the REST API endpoints"
assistant: "I'll use the api-docs-writer agent to create comprehensive documentation."
<commentary>
New API code, proactively generate documentation.
</commentary>
</example>

<example>
Context: User requests documentation
user: "Write docs for this API"
assistant: "I'll use the api-docs-writer agent to generate clear documentation."
<commentary>
Documentation request triggers the agent.
</commentary>
</example>
```

### 校验 Agent

```markdown
<example>
Context: User ready to commit changes
user: "I'm ready to commit this code"
assistant: "I'll use the code-validator agent to check for issues before committing."
<commentary>
Before commit, proactively validate with validation-agent.
</commentary>
</example>

<example>
Context: User asks for validation
user: "Validate my implementation"
assistant: "I'll use the code-validator agent to verify correctness."
<commentary>
Explicit validation request triggers the agent.
</commentary>
</example>
```

## 调试 triggering 问题

### agent 没有触发

**检查：**

1. 示例（examples）是否包含用户消息中的相关关键词
2. 上下文（context）是否匹配真实使用场景
3. 说明（commentary）是否清楚解释 triggering 逻辑
4. assistant 是否在示例中展示了 Agent tool 的使用

**修复：**
补充更多覆盖不同措辞的示例。

### agent 触发过于频繁

**检查：**

1. 示例（examples）是否过宽、过泛
2. triggering conditions 是否与其他 agents 重叠
3. 说明（commentary）是否没有区分何时**不应**使用

**修复：**
把示例写得更具体，并补上反例。

### agent 在错误场景触发

**检查：**

1. 示例（examples）是否没有匹配真实的预期用法
2. 说明（commentary）是否暗示了不恰当的触发方式

**修复：**
修改 examples，只展示正确的 triggering 场景。

## 最佳实践总结

✅ **推荐：**

- 包含 2-4 个具体、明确的示例（examples）
- 同时展示显式触发与主动触发
- 为每个示例（example）提供清晰上下文（context）
- 在说明（commentary）中解释推理
- 变化 user message 的措辞
- 展示 Claude 使用 Agent tool

❌ **避免：**

- 使用泛化、模糊的示例（examples）
- 省略上下文（context）或说明（commentary）
- 只展示一种 triggering 方式
- 跳过 agent invocation 这一步
- 让示例（examples）彼此过于相似
- 忘记解释为什么 agent 会触发

## 结论

写得好的 examples 对稳定 triggering 至关重要。值得投入时间，去编写多样、具体且能清晰说明“何时触发、为什么触发”的 examples。