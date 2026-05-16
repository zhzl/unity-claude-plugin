# 简单 command 示例

常见用例的基础 slash command 模式。

**重要：** 下面所有示例都写成给 Claude 的执行指令（agent 消费），而不是给用户看的消息。Command 应告诉 Claude 做什么，而不是告诉用户将发生什么。

## 示例 1：代码审查 command

**文件：** `.claude/commands/review.md`

```markdown
---
description: Review code for quality and issues
allowed-tools: Read, Bash(git *)
---

Review the code in this repository for:

1. **Code Quality:**
   - Readability and maintainability
   - Consistent style and formatting
   - Appropriate abstraction levels

2. **Potential Issues:**
   - Logic errors or bugs
   - Edge cases not handled
   - Performance concerns

3. **Best Practices:**
   - Design patterns used correctly
   - Error handling present
   - Documentation adequate

Provide specific feedback with file and line references.
```

**用法：**

```
> /review
```

---

## 示例 2：安全审查 command

**文件：** `.claude/commands/security-review.md`

```markdown
---
description: Review code for security vulnerabilities
allowed-tools: Read, Grep
model: sonnet
---

Perform comprehensive security review checking for:

**Common Vulnerabilities:**

- SQL injection risks
- Cross-site scripting (XSS)
- Authentication/authorization issues
- Insecure data handling
- Hardcoded secrets or credentials

**Security Best Practices:**

- Input validation present
- Output encoding correct
- Secure defaults used
- Error messages safe
- Logging appropriate (no sensitive data)

For each issue found:

- File and line number
- Severity (Critical/High/Medium/Low)
- Description of vulnerability
- Recommended fix

Prioritize issues by severity.
```

**用法：**

```
> /security-review
```

---

## 示例 3：带文件参数的测试 command

**文件：** `.claude/commands/test-file.md`

```markdown
---
description: Run tests for specific file
argument-hint: "[test-file]"
allowed-tools: Bash(npm *), Bash(jest *)
---

Run tests for $1:

Run tests for $1 with the Bash tool.

Analyze results:

- Tests passed/failed
- Code coverage
- Performance issues
- Flaky tests

If failures found, suggest fixes based on error messages.
```

**用法：**

```
> /test-file src/utils/helpers.test.ts
```

---

## 示例 4：文档生成器

**文件：** `.claude/commands/document.md`

```markdown
---
description: Generate documentation for file
argument-hint: "[source-file]"
---

Generate comprehensive documentation for @$1

Include:

**Overview:**

- Purpose and responsibility
- Main functionality
- Dependencies

**API Documentation:**

- Function/method signatures
- Parameter descriptions with types
- Return values with types
- Exceptions/errors thrown

**Usage Examples:**

- Basic usage
- Common patterns
- Edge cases

**Implementation Notes:**

- Algorithm complexity
- Performance considerations
- Known limitations

Format as Markdown suitable for project documentation.
```

**用法：**

```
> /document src/api/users.ts
```

---

## 示例 5：Git 状态摘要

**文件：** `.claude/commands/git-status.md`

```markdown
---
description: Summarize Git repository status
allowed-tools: Bash(git *)
---

Repository Status Summary:

**Current Branch:** !`git branch --show-current`

**Status:** !`git status --short`

**Recent Commits:** !`git log --oneline -5`

**Remote Status:** !`git status -sb`

Provide:

- Summary of changes
- Suggested next actions
- Any warnings or issues
```

**用法：**

```
> /git-status
```

---

## 示例 6：部署 command

**文件：** `.claude/commands/deploy.md`

```markdown
---
description: Deploy to specified environment
argument-hint: "[environment] [version]"
allowed-tools: Bash(kubectl *), Read
---

Deploy to $1 environment using version $2

**Pre-deployment Checks:**

1. Verify $1 configuration exists
2. Check version $2 is valid
3. Verify cluster accessibility with the Bash tool.

**Deployment Steps:**

1. Update deployment manifest with version $2
2. Apply configuration to $1
3. Monitor rollout status
4. Verify pod health
5. Run smoke tests

**Rollback Plan:**
Document current version for rollback if issues occur.

Proceed with deployment? (yes/no)
```

**用法：**

```
> /deploy staging v1.2.3
```

---

## 示例 7：比较 command

**文件：** `.claude/commands/compare-files.md`

```markdown
---
description: Compare two files
argument-hint: "[file1] [file2]"
---

Compare @$1 with @$2

**Analysis:**

1. **Differences:**
   - Lines added
   - Lines removed
   - Lines modified

2. **Functional Changes:**
   - Breaking changes
   - New features
   - Bug fixes
   - Refactoring

3. **Impact:**
   - Affected components
   - Required updates elsewhere
   - Migration requirements

4. **Recommendations:**
   - Code review focus areas
   - Testing requirements
   - Documentation updates needed

Present as structured comparison report.
```

**用法：**

```
> /compare-files src/old-api.ts src/new-api.ts
```

---

## 示例 8：快速修复 command

**文件：** `.claude/commands/quick-fix.md`

```markdown
---
description: Quick fix for common issues
argument-hint: "[issue-description]"
model: haiku
---

Quickly fix: $ARGUMENTS

**Approach:**

1. Identify the issue
2. Find relevant code
3. Propose fix
4. Explain solution

Focus on:

- Simple, direct solution
- Minimal changes
- Following existing patterns
- No breaking changes

Provide code changes with file paths and line numbers.
```

**用法：**

```
> /quick-fix button not responding to clicks
> /quick-fix typo in error message
```

---

## 示例 9：调研 command

**文件：** `.claude/commands/research.md`

```markdown
---
description: Research best practices for topic
argument-hint: "[topic]"
model: sonnet
---

Research best practices for: $ARGUMENTS

**Coverage:**

1. **Current State:**
   - How we currently handle this
   - Existing implementations

2. **Industry Standards:**
   - Common patterns
   - Recommended approaches
   - Tools and libraries

3. **Comparison:**
   - Our approach vs standards
   - Gaps or improvements needed
   - Migration considerations

4. **Recommendations:**
   - Concrete action items
   - Priority and effort estimates
   - Resources for implementation

Provide actionable guidance based on research.
```

**用法：**

```
> /research error handling in async operations
> /research API authentication patterns
```

---

## 示例 10：代码解释 command

**文件：** `.claude/commands/explain.md`

```markdown
---
description: Explain how code works
argument-hint: "[file-or-function]"
---

Explain @$1 in detail

**Explanation Structure:**

1. **Overview:**
   - What it does
   - Why it exists
   - How it fits in system

2. **Step-by-Step:**
   - Line-by-line walkthrough
   - Key algorithms or logic
   - Important details

3. **Inputs and Outputs:**
   - Parameters and types
   - Return values
   - Side effects

4. **Edge Cases:**
   - Error handling
   - Special cases
   - Limitations

5. **Usage Examples:**
   - How to call it
   - Common patterns
   - Integration points

Explain at level appropriate for junior engineer.
```

**用法：**

```
> /explain src/utils/cache.ts
> /explain AuthService.login
```

---

## 关键模式

### 模式 1：只读分析

```markdown
---
allowed-tools: Read, Grep
---

Analyze but don't modify...
```

**适用于：** 代码审查、文档、分析

### 模式 2：Git 操作

```markdown
---
allowed-tools: Bash(git *)
---

Repository status: !`git status --short`
Analyze and suggest...
```

**适用于：** 仓库状态、commit 分析

### 模式 3：单个参数

```markdown
---
argument-hint: "[target]"
---

Process $1...
```

**适用于：** 文件操作、定向动作

### 模式 4：多个参数

```markdown
---
argument-hint: "[source] [target] [options]"
---

Process $1 to $2 with $3...
```

**适用于：** workflow、部署、比较

### 模式 5：快速执行

```markdown
---
model: haiku
---

Quick simple task...
```

**适用于：** 简单、重复性的 command

### 模式 6：文件比较

```markdown
Compare @$1 with @$2...
```

**适用于：** diff 分析、迁移规划

### 模式 7：上下文收集

```markdown
---
allowed-tools: Bash(git *), Read
---

Context: !`git status --short`
Files: @file1 @file2

Analyze...
```

**适用于：** 基于充分上下文的决策

## 编写简单 command 的提示

1. **从基础开始：** 单一职责，目的清晰
2. **逐步增加复杂度：** 先不使用 frontmatter
3. **增量测试：** 验证每个功能都能工作
4. **使用描述性名称：** command 名称应表明用途
5. **记录参数：** 始终使用 argument-hint
6. **提供示例：** 在注释中展示用法
7. **处理错误：** 考虑缺失参数或文件
