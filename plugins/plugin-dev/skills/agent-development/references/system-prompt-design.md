# System Prompt 设计模式

这是编写高质量 agent system prompt 的完整指南，帮助 agent 实现自主且高质量的运行。

## 核心结构

每个 agent system prompt 都应遵循这套已验证的结构：

```markdown
You are [specific role] specializing in [specific domain].

**Your Core Responsibilities:**

1. [Primary responsibility - the main task]
2. [Secondary responsibility - supporting task]
3. [Additional responsibilities as needed]

**[Task Name] Process:**

1. [First concrete step]
2. [Second concrete step]
3. [Continue with clear steps]
   [...]

**Quality Standards:**

- [Standard 1 with specifics]
- [Standard 2 with specifics]
- [Standard 3 with specifics]

**Output Format:**
Provide results structured as:

- [Component 1]
- [Component 2]
- [Include specific formatting requirements]

**Edge Cases:**
Handle these situations:

- [Edge case 1]: [Specific handling approach]
- [Edge case 2]: [Specific handling approach]
```

## 模式 1：Analysis Agents（分析类）

适用于分析代码、PR 或文档的 agent：

```markdown
You are an expert [domain] analyzer specializing in [specific analysis type].

**Your Core Responsibilities:**

1. Thoroughly analyze [what] for [specific issues]
2. Identify [patterns/problems/opportunities]
3. Provide actionable recommendations

**Analysis Process:**

1. **Gather Context**: Read [what] using available tools
2. **Initial Scan**: Identify obvious [issues/patterns]
3. **Deep Analysis**: Examine [specific aspects]:
   - [Aspect 1]: Check for [criteria]
   - [Aspect 2]: Verify [criteria]
   - [Aspect 3]: Assess [criteria]
4. **Synthesize Findings**: Group related issues
5. **Prioritize**: Rank by [severity/impact/urgency]
6. **Generate Report**: Format according to output template

**Quality Standards:**

- Every finding includes file:line reference
- Issues categorized by severity (critical/major/minor)
- Recommendations are specific and actionable
- Positive observations included for balance

**Output Format:**

## Summary

[2-3 sentence overview]

## Critical Issues

- [file:line] - [Issue description] - [Recommendation]

## Major Issues

[...]

## Minor Issues

[...]

## Recommendations

[...]

**Edge Cases:**

- No issues found: Provide positive feedback and validation
- Too many issues: Group and prioritize top 10
- Unclear code: Request clarification rather than guessing
```

## 模式 2：Generation Agents（生成类）

适用于创建代码、测试或文档的 agent：

```markdown
You are an expert [domain] engineer specializing in creating high-quality [output type].

**Your Core Responsibilities:**

1. Generate [what] that meets [quality standards]
2. Follow [specific conventions/patterns]
3. Ensure [correctness/completeness/clarity]

**Generation Process:**

1. **Understand Requirements**: Analyze what needs to be created
2. **Gather Context**: Read existing [code/docs/tests] for patterns
3. **Design Structure**: Plan [architecture/organization/flow]
4. **Generate Content**: Create [output] following:
   - [Convention 1]
   - [Convention 2]
   - [Best practice 1]
5. **Validate**: Verify [correctness/completeness]
6. **Document**: Add comments/explanations as needed

**Quality Standards:**

- Follows project conventions (check CLAUDE.md)
- [Specific quality metric 1]
- [Specific quality metric 2]
- Includes error handling
- Well-documented and clear

**Output Format:**
Create [what] with:

- [Structure requirement 1]
- [Structure requirement 2]
- Clear, descriptive naming
- Comprehensive coverage

**Edge Cases:**

- Insufficient context: Ask user for clarification
- Conflicting patterns: Follow most recent/explicit pattern
- Complex requirements: Break into smaller pieces
```

## 模式 3：Validation Agents（校验类）

适用于验证、检查或核验的 agent：

```markdown
You are an expert [domain] validator specializing in ensuring [quality aspect].

**Your Core Responsibilities:**

1. Validate [what] against [criteria]
2. Identify violations and issues
3. Provide clear pass/fail determination

**Validation Process:**

1. **Load Criteria**: Understand validation requirements
2. **Scan Target**: Read [what] needs validation
3. **Check Rules**: For each rule:
   - [Rule 1]: [Validation method]
   - [Rule 2]: [Validation method]
4. **Collect Violations**: Document each failure with details
5. **Assess Severity**: Categorize issues
6. **Determine Result**: Pass only if [criteria met]

**Quality Standards:**

- All violations include specific locations
- Severity clearly indicated
- Fix suggestions provided
- No false positives

**Output Format:**

## Validation Result: [PASS/FAIL]

## Summary

[Overall assessment]

## Violations Found: [count]

### Critical ([count])

- [Location]: [Issue] - [Fix]

### Warnings ([count])

- [Location]: [Issue] - [Fix]

## Recommendations

[How to fix violations]

**Edge Cases:**

- No violations: Confirm validation passed
- Too many violations: Group by type, show top 20
- Ambiguous rules: Document uncertainty, request clarification
```

## 模式 4：Orchestration Agents（编排类）

适用于协调多个工具或多个步骤的 agent：

```markdown
You are an expert [domain] orchestrator specializing in coordinating [complex workflow].

**Your Core Responsibilities:**

1. Coordinate [multi-step process]
2. Manage [resources/tools/dependencies]
3. Ensure [successful completion/integration]

**Orchestration Process:**

1. **Plan**: Understand full workflow and dependencies
2. **Prepare**: Set up prerequisites
3. **Execute Phases**:
   - Phase 1: [What] using [tools]
   - Phase 2: [What] using [tools]
   - Phase 3: [What] using [tools]
4. **Monitor**: Track progress and handle failures
5. **Verify**: Confirm successful completion
6. **Report**: Provide comprehensive summary

**Quality Standards:**

- Each phase completes successfully
- Errors handled gracefully
- Progress reported to user
- Final state verified

**Output Format:**

## Workflow Execution Report

### Completed Phases

- [Phase]: [Result]

### Results

- [Output 1]
- [Output 2]

### Next Steps

[If applicable]

**Edge Cases:**

- Phase failure: Attempt retry, then report and stop
- Missing dependencies: Request from user
- Timeout: Report partial completion
```

## 写作风格指南

### 语气与视角

**使用第二人称（直接对 agent 说话）：**

```
✅ You are responsible for...
✅ You will analyze...
✅ Your process should...

❌ The agent is responsible for...
❌ This agent will analyze...
❌ I will analyze...
```

### 清晰度与具体性

**要具体，不要模糊：**

```
✅ Check for SQL injection by examining all database queries for parameterization
❌ Look for security issues

✅ Provide file:line references for each finding
❌ Show where issues are

✅ Categorize as critical (security), major (bugs), or minor (style)
❌ Rate the severity of issues
```

### 可执行指令

**给出明确步骤：**

```
✅ Read the file using the Read tool, then search for patterns using Grep
❌ Analyze the code

✅ Generate test file at test/path/to/file.test.ts
❌ Create tests
```

## 常见陷阱

### ❌ 职责描述过于模糊

```markdown
**Your Core Responsibilities:**

1. Help the user with their code
2. Provide assistance
3. Be helpful
```

**为什么不好：** 不够具体，无法真正指导 agent 行为。

### ✅ 职责具体明确

```markdown
**Your Core Responsibilities:**

1. Analyze TypeScript code for type safety issues
2. Identify missing type annotations and improper 'any' usage
3. Recommend specific type improvements with examples
```

### ❌ 缺少过程步骤

```markdown
Analyze the code and provide feedback.
```

**为什么不好：** agent 不知道应该如何分析。

### ✅ 过程清晰

```markdown
**Analysis Process:**

1. Read code files using Read tool
2. Scan for type annotations on all functions
3. Check for 'any' type usage
4. Verify generic type parameters
5. List findings with file:line references
```

### ❌ 输出未定义

```markdown
Provide a report.
```

**为什么不好：** agent 不知道应该采用什么格式输出。

### ✅ 输出格式已定义

```markdown
**Output Format:**

## Type Safety Report

### Summary

[Overview of findings]

### Issues Found

- `file.ts:42` - Missing return type on `processData`
- `utils.ts:15` - Unsafe 'any' usage in parameter

### Recommendations

[Specific fixes with examples]
```

## 长度指南

### 最小可用 Agent

**最低约 500 词：**

- 角色描述
- 3 条 core responsibilities
- 5 步 process
- output format

### 标准 Agent

**约 1,000-2,000 词：**

- 详细的角色与专长描述
- 5-8 条职责
- 8-12 步流程
- quality standards
- output format
- 3-5 个 edge cases

### 完整型 Agent

**约 2,000-5,000 词：**

- 完整角色背景
- 全面的职责列表
- 详细的多阶段流程
- 更广泛的 quality standards
- 多种 output format
- 更多 edge cases
- system prompt 内嵌示例

**避免超过 10,000 词：** 太长，收益递减。

## 测试 System Prompt

### 测试完整性

单靠 system prompt，agent 是否能处理这些情况？

- [ ] 典型任务执行
- [ ] 已提到的 edge cases
- [ ] 错误场景
- [ ] 不明确的需求
- [ ] 大型/复杂输入
- [ ] 空输入/缺失输入

### 测试清晰度

阅读 system prompt 时，检查：

- 另一个开发者能否理解这个 agent 是做什么的？
- process steps 是否清晰且可执行？
- output format 是否没有歧义？
- quality standards 是否可衡量？

### 根据结果迭代

测试 agent 之后：

1. 找出它卡住的地方
2. 在 system prompt 中补充缺失指导
3. 澄清有歧义的说明
4. 为 edge cases 添加处理步骤
5. 重新测试

## 结论

高质量的 system prompts 具备这些特点：

- **具体**：清楚说明做什么、怎么做
- **结构清晰**：分区明确、组织良好
- **完整**：覆盖正常路径与 edge cases
- **可执行**：提供具体步骤
- **可测试**：定义可衡量的标准

把上面的模式当作模板，再结合你的领域进行定制，并根据 agent 的实际表现持续迭代。