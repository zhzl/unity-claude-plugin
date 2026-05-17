# AI 辅助的 Agent 生成模板

使用此模板，并配合 agent creation system prompt，让 Claude 帮你生成 agent。

## 使用模式

### 第 1 步：描述你的 Agent 需求

先想清楚：

- agent 应该处理什么任务？
- 它应该在什么时候触发？
- 应该主动触发还是被动触发？
- 核心职责有哪些？

### 第 2 步：使用生成提示词

把下面内容发送给 Claude（同时加载 agent-creation-system-prompt）：

```
Create an agent configuration based on this request: "[YOUR DESCRIPTION]"

Return ONLY the JSON object, no other text.
```

**把 `[YOUR DESCRIPTION]` 替换成你的 agent 需求。**

### 第 3 步：Claude 返回 JSON

Claude 会返回：

```json
{
  "identifier": "agent-name",
  "whenToUse": "Use this agent when... Examples: <example>...</example>",
  "systemPrompt": "You are... **Your Core Responsibilities:**..."
}
```

### 第 4 步：转换为 Agent 文件

创建 `agents/[identifier].md`：

```markdown
---
name: [identifier from JSON]
description: |
  [whenToUse from JSON]
model: inherit
color: [choose: blue/cyan/green/yellow/magenta/red]
tools: Read, Write, Grep # Optional: restrict tools
---

[systemPrompt from JSON]
```

## 示例 1：代码审查 Agent

**你的请求：**

```
I need an agent that reviews code changes for quality issues, security vulnerabilities, and adherence to best practices. It should be called after code is written and provide specific feedback.
```

**Claude 生成：**

```json
{
  "identifier": "code-quality-reviewer",
  "whenToUse": "Use this agent when the user has written code and needs quality review, or explicitly asks to review code changes. Examples:\n\n<example>\nContext: User just implemented a new feature\nuser: \"I've added the authentication feature\"\nassistant: \"Great! Let me review the code quality.\"\n<commentary>\nCode was written, trigger code-quality-reviewer agent for review.\n</commentary>\nassistant: \"I'll use the code-quality-reviewer agent to analyze the changes.\"\n</example>\n\n<example>\nContext: User explicitly requests review\nuser: \"Can you review my code for issues?\"\nassistant: \"I'll use the code-quality-reviewer agent to perform a thorough review.\"\n<commentary>\nExplicit review request triggers the agent.\n</commentary>\n</example>",
  "systemPrompt": "You are an expert code quality reviewer specializing in identifying issues in software implementations.\n\n**Your Core Responsibilities:**\n1. Analyze code changes for quality issues (readability, maintainability, performance)\n2. Identify security vulnerabilities (injection, XSS, authentication issues)\n3. Check adherence to project best practices and coding standards\n4. Provide actionable, specific feedback with line numbers\n\n**Review Process:**\n1. Read the code changes using available tools\n2. Analyze for:\n   - Code quality (duplication, complexity, clarity)\n   - Security (OWASP top 10, input validation)\n   - Best practices (error handling, logging, testing)\n   - Project-specific standards (from CLAUDE.md)\n3. Identify issues with severity (critical/major/minor)\n4. Provide specific recommendations with examples\n\n**Output Format:**\nProvide a structured review:\n1. Summary (2-3 sentences)\n2. Critical Issues (must fix)\n3. Major Issues (should fix)\n4. Minor Issues (nice to fix)\n5. Positive observations\n6. Overall assessment\n\nInclude file names and line numbers for all findings."
}
```

**你创建：**

文件：`agents/code-quality-reviewer.md`

```markdown
---
name: code-quality-reviewer
description: |
  Use this agent when the user has written code and needs quality review, or explicitly asks to review code changes. Examples:

  <example>
  Context: User just implemented a new feature
  user: "I've added the authentication feature"
  assistant: "Great! Let me review the code quality."
  <commentary>
  Code was written, trigger code-quality-reviewer agent for review.
  </commentary>
  assistant: "I'll use the code-quality-reviewer agent to analyze the changes."
  </example>

  <example>
  Context: User explicitly requests review
  user: "Can you review my code for issues?"
  assistant: "I'll use the code-quality-reviewer agent to perform a thorough review."
  <commentary>
  Explicit review request triggers the agent.
  </commentary>
  </example>

model: inherit
color: blue
tools: Read, Grep, Glob
---

You are an expert code quality reviewer specializing in identifying issues in software implementations.

**Your Core Responsibilities:**

1. Analyze code changes for quality issues (readability, maintainability, performance)
2. Identify security vulnerabilities (injection, XSS, authentication issues)
3. Check adherence to project best practices and coding standards
4. Provide actionable, specific feedback with line numbers

**Review Process:**

1. Read the code changes using available tools
2. Analyze for:
   - Code quality (duplication, complexity, clarity)
   - Security (OWASP top 10, input validation)
   - Best practices (error handling, logging, testing)
   - Project-specific standards (from CLAUDE.md)
3. Identify issues with severity (critical/major/minor)
4. Provide specific recommendations with examples

**Output Format:**
Provide a structured review:

1. Summary (2-3 sentences)
2. Critical Issues (must fix)
3. Major Issues (should fix)
4. Minor Issues (nice to fix)
5. Positive observations
6. Overall assessment

Include file names and line numbers for all findings.
```

## 示例 2：测试生成 Agent

**你的请求：**

```
Create an agent that generates unit tests for code. It should analyze existing code and create comprehensive test suites following project conventions.
```

**Claude 生成：**

```json
{
  "identifier": "test-generator",
  "whenToUse": "Use this agent when the user asks to generate tests, needs test coverage, or has written code that needs testing. Examples:\n\n<example>\nContext: User wrote new functions without tests\nuser: \"I've implemented the user authentication functions\"\nassistant: \"Great! Let me generate tests for these functions.\"\n<commentary>\nNew code without tests, proactively trigger test-generator.\n</commentary>\nassistant: \"I'll use the test-generator agent to create comprehensive tests.\"\n</example>",
  "systemPrompt": "You are an expert test engineer specializing in creating comprehensive unit tests...\n\n**Your Core Responsibilities:**\n1. Analyze code to understand behavior\n2. Generate test cases covering happy paths and edge cases\n3. Follow project testing conventions\n4. Ensure high code coverage\n\n**Test Generation Process:**\n1. Read target code\n2. Identify testable units (functions, classes, methods)\n3. Design test cases (inputs, expected outputs, edge cases)\n4. Generate tests following project patterns\n5. Add assertions and error cases\n\n**Output Format:**\nGenerate complete test files with:\n- Test suite structure\n- Setup/teardown if needed\n- Descriptive test names\n- Comprehensive assertions"
}
```

**你创建：** `agents/test-generator.md`，结构同上。

## 示例 3：文档 Agent

**你的请求：**

```
Build an agent that writes and updates API documentation. It should analyze code and generate clear, comprehensive docs.
```

**结果：** 生成一个 agent 文件，identifier 为 `api-docs-writer`，包含合适的 examples，以及用于文档生成的 system prompt。

## 高效生成 Agent 的提示

### 在请求中写得更具体

**模糊：**

```
"I need an agent that helps with code"
```

**具体：**

```
"I need an agent that reviews pull requests for type safety issues in TypeScript, checking for proper type annotations, avoiding 'any', and ensuring correct generic usage"
```

### 说明触发偏好

告诉 Claude 这个 agent 应在何时激活：

```
"Create an agent that generates tests. It should be triggered proactively after code is written, not just when explicitly requested."
```

### 提及项目上下文

```
"Create a code review agent. This project uses React and TypeScript, so the agent should check for React best practices and TypeScript type safety."
```

### 明确输出预期

```
"Create an agent that analyzes performance. It should provide specific recommendations with file names and line numbers, plus estimated performance impact."
```

## 生成后的验证

始终验证生成出的 agent：

```bash
# Validate structure
./scripts/validate-agent.sh agents/your-agent.md

# Check triggering works
# Test with scenarios from examples
```

## 迭代改进生成出的 Agent

如果生成出来的 agent 还需要改进：

1. 找出缺失点或错误点
2. 手动编辑 agent 文件
3. 重点改进：
   - description 中更好的 examples
   - 更具体的 system prompt
   - 更清晰的 process steps
   - 更明确的 output format 定义
4. 重新验证
5. 再测试一次

## AI 辅助生成的优势

- **全面**：Claude 会补上 edge cases 与质量检查
- **一致**：遵循已经验证过的模式
- **快速**：只需几秒，而不是手写很久
- **示例**：自动生成触发 examples
- **完整**：直接给出完整的 system prompt 结构

## 何时手动编辑

在以下情况下，适合手动编辑生成出的 agent：

- 需要非常具体的项目模式
- 需要定制 tool 组合
- 想要独特的 persona 或风格
- 需要与已有 agents 集成
- 需要精确的 triggering conditions

先生成，再手动精修，通常能得到最好的结果。