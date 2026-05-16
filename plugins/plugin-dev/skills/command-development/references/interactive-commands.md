# 交互式 Command 模式

本指南完整介绍如何创建通过 AskUserQuestion tool 收集用户反馈并作出决策的 commands。

## 概览

有些 commands 需要用户输入，而简单 arguments 不适合表达。例如：

- 在多个存在权衡的复杂选项之间选择
- 从列表中选择多个项目
- 作出需要解释的决策
- 以交互方式收集偏好或配置

对于这些情况，在 command 执行期间使用 **AskUserQuestion tool**，而不是依赖 command arguments。交互式 prompts 需要实时用户；在 headless 或 CI workflows 中，应改为提供 command arguments 或配置文件 fallback（回退方案）。

## 何时使用 AskUserQuestion

### 以下情况使用 AskUserQuestion

1. **多选一决策**，且需要解释
2. **复杂选项**，需要上下文才能选择
3. **多选场景**（选择多个项目）
4. 为配置进行**偏好收集**
5. 会根据答案调整的**交互式 workflows**

### 以下情况使用 Command Arguments

1. **简单值**（文件路径、数字、名称）
2. 用户已有的**已知输入**
3. 应可自动化的**可脚本化 workflows**
4. 提示会拖慢速度的**快速调用**

## AskUserQuestion 基础

### Tool 参数

```typescript
{
  questions: [
    {
      question: "Which authentication method should we use?",
      header: "Auth method", // Short label (max 12 chars)
      multiSelect: false, // true for multiple selection
      options: [
        {
          label: "OAuth 2.0",
          description: "Industry standard, supports multiple providers",
        },
        {
          label: "JWT",
          description: "Stateless, good for APIs",
        },
        {
          label: "Session",
          description: "Traditional, server-side state",
        },
      ],
    },
  ];
}
```

**要点：**

- 用户始终可以选择 “Other” 来提供自定义输入（自动提供）
- `multiSelect: true` 允许选择多个 options
- options 应为 2-4 个选择（不要更多）
- 每次 tool call 可询问 1-4 个 question

## 用户交互的 Command 模式

### 基础交互式 Command

```markdown
---
description: Interactive setup command
allowed-tools: AskUserQuestion, Write
---

# Interactive Plugin Setup

This command will guide you through configuring the plugin with a series of questions.

## Step 1: Gather Configuration

Use the AskUserQuestion tool to ask:

**Question 1 - Deployment target:**

- header: "Deploy to"
- question: "Which deployment platform will you use?"
- options:
  - AWS (Amazon Web Services with ECS/EKS)
  - GCP (Google Cloud with GKE)
  - Azure (Microsoft Azure with AKS)
  - Local (Docker on local machine)

**Question 2 - Environment strategy:**

- header: "Environments"
- question: "How many environments do you need?"
- options:
  - Single (Just production)
  - Standard (Dev, Staging, Production)
  - Complete (Dev, QA, Staging, Production)

**Question 3 - Features to enable:**

- header: "Features"
- question: "Which features do you want to enable?"
- multiSelect: true
- options:
  - Auto-scaling (Automatic resource scaling)
  - Monitoring (Health checks and metrics)
  - CI/CD (Automated deployment pipeline)
  - Backups (Automated database backups)

## Step 2: Process Answers

Based on the answers received from AskUserQuestion:

1. Parse the deployment target choice
2. Set up environment-specific configuration
3. Enable selected features
4. Generate configuration files

## Step 3: Generate Configuration

Create `.claude/plugin-name.local.md` with:

## \`\`\`yaml

deployment_target: [answer from Q1]
environments: [answer from Q2]
features:
auto_scaling: [true if selected in Q3]
monitoring: [true if selected in Q3]
ci_cd: [true if selected in Q3]
backups: [true if selected in Q3]

---

# Plugin Configuration

Generated: [timestamp]
Target: [deployment_target]
Environments: [environments]
\`\`\`

## Step 4: Confirm and Next Steps

Confirm configuration created and guide user on next steps.
```

### 多阶段交互式 Workflow

```markdown
---
description: Multi-stage interactive workflow
allowed-tools: AskUserQuestion, Read, Write, Bash
---

# Multi-Stage Deployment Setup

This command walks through deployment setup in stages, adapting based on your answers.

## Stage 1: Basic Configuration

Use AskUserQuestion to ask about deployment basics.

Based on answers, determine which additional questions to ask.

## Stage 2: Advanced Options (Conditional)

If user selected "Advanced" deployment in Stage 1:

Use AskUserQuestion to ask about:

- Load balancing strategy
- Caching configuration
- Security hardening options

If user selected "Simple" deployment:

- Skip advanced questions
- Use sensible defaults

## Stage 3: Confirmation

Show summary of all selections.

Use AskUserQuestion for final confirmation:

- header: "Confirm"
- question: "Does this configuration look correct?"
- options:
  - Yes (Proceed with setup)
  - No (Start over)
  - Modify (Let me adjust specific settings)

If "Modify", ask which specific setting to change.

## Stage 4: Execute Setup

Based on confirmed configuration, execute setup steps.
```

## 交互式 Question 设计

### Question 结构

**良好 questions：**

```markdown
Question: "Which database should we use for this project?"
Header: "Database"
Options:

- PostgreSQL (Relational, ACID compliant, best for complex queries)
- MongoDB (Document store, flexible schema, best for rapid iteration)
- Redis (In-memory, fast, best for caching and sessions)
```

**不佳 questions：**

```markdown
Question: "Database?" // Too vague
Header: "DB" // Unclear abbreviation
Options:

- Option 1 // Not descriptive
- Option 2
```

### Option 设计最佳实践

**清晰 labels：**

- 使用 1-5 个词
- 具体且有描述性
- 不使用缺少上下文的行话

**有帮助的 descriptions：**

- 解释该 option 的含义
- 提到关键收益或权衡
- 帮助用户作出有依据的决策
- 控制在 1-2 句内

**合适数量：**

- 每个 question 2-4 个 options
- 不要用过多选择让用户不知所措
- 将相关 options 分组
- 自动提供 “Other”

### Multi-Select Questions（多选问题）

**何时使用 multiSelect：**

```markdown
Use AskUserQuestion for enabling features:

Question: "Which features do you want to enable?"
Header: "Features"
multiSelect: true // Allow selecting multiple
Options:

- Logging (Detailed operation logs)
- Metrics (Performance monitoring)
- Alerts (Error notifications)
- Backups (Automatic backups)
```

用户可以选择任意组合：不选、选一部分或全选。

**何时不要使用 multiSelect：**

```markdown
Question: "Which authentication method?"
multiSelect: false // Only one auth method makes sense
```

互斥选择不应使用 multiSelect。

## 使用 AskUserQuestion 的 Command 模式

### 模式 1：简单 Yes/No 决策

```markdown
---
description: Command with confirmation
allowed-tools: AskUserQuestion, Bash
---

# Destructive Operation

This operation will delete all cached data.

Use AskUserQuestion to confirm:

Question: "This will delete all cached data. Are you sure?"
Header: "Confirm"
Options:

- Yes (Proceed with deletion)
- No (Cancel operation)

If user selects "Yes":
Execute deletion
Report completion

If user selects "No":
Cancel operation
Exit without changes
```

### 模式 2：多个配置 Questions

```markdown
---
description: Multi-question configuration
allowed-tools: AskUserQuestion, Write
---

# Project Configuration Setup

Gather configuration through multiple questions.

Use AskUserQuestion with multiple questions in one call:

**Question 1:**

- question: "Which programming language?"
- header: "Language"
- options: Python, TypeScript, Go, Rust

**Question 2:**

- question: "Which test framework?"
- header: "Testing"
- options: Jest, PyTest, Go Test, Cargo Test
  (Adapt based on language from Q1)

**Question 3:**

- question: "Which CI/CD platform?"
- header: "CI/CD"
- options: GitHub Actions, GitLab CI, CircleCI

**Question 4:**

- question: "Which features do you need?"
- header: "Features"
- multiSelect: true
- options: Linting, Type checking, Code coverage, Security scanning

Process all answers together to generate cohesive configuration.
```

### 模式 3：条件式 Question Flow

```markdown
---
description: Conditional interactive workflow
allowed-tools: AskUserQuestion, Read, Write
---

# Adaptive Configuration

## Question 1: Deployment Complexity

Use AskUserQuestion:

Question: "How complex is your deployment?"
Header: "Complexity"
Options:

- Simple (Single server, straightforward)
- Standard (Multiple servers, load balancing)
- Complex (Microservices, orchestration)

## Conditional Questions Based on Answer

If answer is "Simple":

- No additional questions
- Use minimal configuration

If answer is "Standard":

- Ask about load balancing strategy
- Ask about scaling policy

If answer is "Complex":

- Ask about orchestration platform (Kubernetes, Docker Swarm)
- Ask about service mesh (Istio, Linkerd, None)
- Ask about monitoring (Prometheus, Datadog, CloudWatch)
- Ask about logging aggregation

## Process Conditional Answers

Generate configuration appropriate for selected complexity level.
```

### 模式 4：迭代式收集

```markdown
---
description: Collect multiple items iteratively
allowed-tools: AskUserQuestion, Write
---

# Collect Team Members

We'll collect team member information for the project.

## Question: How many team members?

Use AskUserQuestion:

Question: "How many team members should we set up?"
Header: "Team size"
Options:

- 2 people
- 3 people
- 4 people
- 6 people

## Iterate Through Team Members

For each team member (1 to N based on answer):

Use AskUserQuestion for member details:

Question: "What role for team member [number]?"
Header: "Role"
Options:

- Frontend Developer
- Backend Developer
- DevOps Engineer
- QA Engineer
- Designer

Store each member's information.

## Generate Team Configuration

After collecting all N members, create team configuration file with all members and their roles.
```

### 模式 5：依赖选择

```markdown
---
description: Select dependencies with multi-select
allowed-tools: AskUserQuestion
---

# Configure Project Dependencies

## Question: Required Libraries

Use AskUserQuestion with multiSelect:

Question: "Which libraries does your project need?"
Header: "Dependencies"
multiSelect: true
Options:

- React (UI framework)
- Express (Web server)
- TypeORM (Database ORM)
- Jest (Testing framework)
- Axios (HTTP client)

User can select any combination.

## Process Selections

For each selected library:

- Add to package.json dependencies
- Generate sample configuration
- Create usage examples
- Update documentation
```

## 交互式 Commands 最佳实践

### Question 设计

1. **清晰具体**：Question 应没有歧义
2. **简洁 header**：最多 12 个字符，便于整洁显示
3. **有帮助的 options**：labels 清晰，descriptions 解释权衡
4. **数量合适**：每个 question 2-4 个 options，每次调用 1-4 个 questions
5. **顺序合乎逻辑**：questions 自然衔接

### 错误处理

```markdown
# Handle AskUserQuestion Responses

After calling AskUserQuestion, verify answers received:

If answers are empty or invalid:
Something went wrong gathering responses.

Please try again or provide configuration manually:
[Show alternative approach]

Exit.

If answers look correct:
Process as expected
```

### 渐进式披露

```markdown
# Start Simple, Get Detailed as Needed

## Question 1: Setup Type

Use AskUserQuestion:

Question: "How would you like to set up?"
Header: "Setup type"
Options:

- Quick (Use recommended defaults)
- Custom (Configure all options)
- Guided (Step-by-step with explanations)

If "Quick":
Apply defaults, minimal questions

If "Custom":
Ask all available configuration questions

If "Guided":
Ask questions with extra explanation
Provide recommendations along the way
```

### Multi-Select 指南

**良好的 multi-select 用法：**

```markdown
Question: "Which features do you want to enable?"
multiSelect: true
Options:

- Logging
- Metrics
- Alerts
- Backups

Reason: User might want any combination
```

**不佳的 multi-select 用法：**

```markdown
Question: "Which database engine?"
multiSelect: true // ❌ Should be single-select

Reason: Can only use one database engine
```

## 高级模式

### Validation 循环

```markdown
---
description: Interactive with validation
allowed-tools: AskUserQuestion, Bash
---

# Setup with Validation

## Gather Configuration

Use AskUserQuestion to collect settings.

## Validate Configuration

Check if configuration is valid:

- Required dependencies available?
- Settings compatible with each other?
- No conflicts detected?

If validation fails:
Show validation errors

Use AskUserQuestion to ask:

Question: "Configuration has issues. What would you like to do?"
Header: "Next step"
Options: - Fix (Adjust settings to resolve issues) - Override (Proceed despite warnings) - Cancel (Abort setup)

Based on answer, retry or proceed or exit.
```

### 增量构建配置

```markdown
---
description: Incremental configuration builder
allowed-tools: AskUserQuestion, Write, Read
---

# Incremental Setup

## Phase 1: Core Settings

Use AskUserQuestion for core settings.

Save to `.claude/config-partial.yml`

## Phase 2: Review Core Settings

Show user the core settings:

Based on these core settings, you need to configure:

- [Setting A] (because you chose [X])
- [Setting B] (because you chose [Y])

Ready to continue?

## Phase 3: Detailed Settings

Use AskUserQuestion for settings based on Phase 1 answers.

Merge with core settings.

## Phase 4: Final Review

Present complete configuration.

Use AskUserQuestion for confirmation:

Question: "Is this configuration correct?"
Options:

- Yes (Save and apply)
- No (Start over)
- Modify (Edit specific settings)
```

### 基于上下文的动态 Options

```markdown
---
description: Context-aware questions
allowed-tools: AskUserQuestion, Bash, Read
---

# Context-Aware Setup

## Detect Current State

Check existing configuration:

- Current language: `detect-language.sh`
- Existing frameworks: `detect-frameworks.sh`
- Available tools: `check-tools.sh`

## Ask Context-Appropriate Questions

Based on detected language, ask relevant questions.

If language is TypeScript:

Use AskUserQuestion:

Question: "Which TypeScript features should we enable?"
Options: - Strict Mode (Maximum type safety) - Decorators (Experimental decorator support) - Path Mapping (Module path aliases)

If language is Python:

Use AskUserQuestion:

Question: "Which Python tools should we configure?"
Options: - Type Hints (mypy for type checking) - Black (Code formatting) - Pylint (Linting and style)

Questions adapt to project context.
```

## 真实示例：Multi-Agent Swarm 启动

**来自 multi-agent-swarm plugin：**

```markdown
---
description: Launch multi-agent swarm
allowed-tools: AskUserQuestion, Read, Write, Bash
---

# Launch Multi-Agent Swarm

## Interactive Mode (No Task List Provided)

If user didn't provide task list file, help create one interactively.

### Question 1: Agent Count

Use AskUserQuestion:

Question: "How many agents should we launch?"
Header: "Agent count"
Options:

- 2 agents (Best for simple projects)
- 3 agents (Good for medium projects)
- 4 agents (Standard team size)
- 6 agents (Large or complex projects)

### Question 2: Task Definition Approach

Use AskUserQuestion:

Question: "How would you like to define tasks?"
Header: "Task setup"
Options:

- File (I have a task list file ready)
- Guided (Help me create tasks interactively)
- Custom (Other approach)

If "File":
Ask for file path
Validate file exists and has correct format

If "Guided":
Enter iterative task creation mode (see below)

### Question 3: Coordination Mode

Use AskUserQuestion:

Question: "How should agents coordinate?"
Header: "Coordination"
Options:

- Team Leader (One agent coordinates others)
- Collaborative (Agents coordinate as peers)
- Autonomous (Independent work, minimal coordination)

### Iterative Task Creation (If "Guided" Selected)

For each agent (1 to N from Question 1):

**Question A: Agent Name**
Question: "What should we call agent [number]?"
Header: "Agent name"
Options:

- auth-agent
- api-agent
- ui-agent
- db-agent
  (Provide relevant suggestions based on common patterns)

**Question B: Task Type**
Question: "What task for [agent-name]?"
Header: "Task type"
Options:

- Authentication (User auth, JWT, OAuth)
- API Endpoints (REST/GraphQL APIs)
- UI Components (Frontend components)
- Database (Schema, migrations, queries)
- Testing (Test suites and coverage)
- Documentation (Docs, README, guides)

**Question C: Dependencies**
Question: "What does [agent-name] depend on?"
Header: "Dependencies"
multiSelect: true
Options:

- [List of previously defined agents]
- No dependencies

**Question D: Base Branch**
Question: "Which base branch for PR?"
Header: "PR base"
Options:

- main
- staging
- develop

Store all task information for each agent.

### Generate Task List File

After collecting all agent task details:

1. Ask for project name
2. Generate task list in proper format
3. Save to `.daisy/swarm/tasks.md`
4. Show user the file path
5. Proceed with launch using generated task list
```

## 最佳实践

### Question 编写

1. **具体**：“Which database?”，不要写 “Choose option?”
2. **解释权衡**：在 option descriptions 中描述优缺点
3. **提供上下文**：question 文本应能独立理解
4. **引导决策**：帮助用户作出有依据的选择
5. **保持简洁**：header 最多 12 字符，descriptions 1-2 句

### Option 设计

1. **有意义的 labels**：具体、清晰的名称
2. **信息充分的 descriptions**：解释每个 option 的作用
3. **展示权衡**：帮助用户理解影响
4. **细节一致**：所有 options 都获得同等解释
5. **2-4 个 options**：不太少，也不太多

### Flow 设计

1. **逻辑顺序**：questions 自然衔接
2. **基于前文**：后续 questions 使用之前的 answers
3. **减少 questions**：只询问必要内容
4. **关联分组**：将相关 questions 放在一起
5. **显示进度**：指出当前处于 flow 的哪个位置

### 用户体验

1. **设定预期**：告诉用户接下来会发生什么
2. **解释原因**：帮助用户理解目的
3. **提供默认值**：建议推荐 options
4. **允许退出**：让用户可以取消或重新开始
5. **确认操作**：执行前进行总结

## 常见模式

### 模式：Feature Selection

```markdown
Use AskUserQuestion:

Question: "Which features do you need?"
Header: "Features"
multiSelect: true
Options:

- Authentication
- Authorization
- Rate Limiting
- Caching
```

### 模式：Environment Configuration

```markdown
Use AskUserQuestion:

Question: "Which environment is this?"
Header: "Environment"
Options:

- Development (Local development)
- Staging (Pre-production testing)
- Production (Live environment)
```

### 模式：Priority Selection

```markdown
Use AskUserQuestion:

Question: "What's the priority for this task?"
Header: "Priority"
Options:

- Critical (Must be done immediately)
- High (Important, do soon)
- Medium (Standard priority)
- Low (Nice to have)
```

### 模式：Scope Selection

```markdown
Use AskUserQuestion:

Question: "What scope should we analyze?"
Header: "Scope"
Options:

- Current file (Just this file)
- Current directory (All files in directory)
- Entire project (Full codebase scan)
```

## 组合使用 Arguments 和 Questions

### 合理同时使用两者

**Arguments 用于已知值：**

```markdown
---
argument-hint: "[project-name]"
allowed-tools: AskUserQuestion, Write
---

Setup for project: $1

Now gather additional configuration...

Use AskUserQuestion for options that require explanation.
```

**Questions 用于复杂选择：**

```markdown
Project name from argument: $1

Now use AskUserQuestion to choose:

- Architecture pattern
- Technology stack
- Deployment strategy

These require explanation, so questions work better than arguments.
```

## 故障排查

**Questions 未出现：**

- 验证 allowed-tools 中包含 AskUserQuestion
- 检查 question 格式正确
- 确保 options 数组包含 2-4 项

**用户无法选择：**

- 检查 option labels 是否清晰
- 验证 descriptions 是否有帮助
- 考虑 options 是否过多
- 确保 multiSelect 设置正确

**Flow 让人困惑：**

- 减少 questions 数量
- 将相关 questions 分组
- 在阶段之间添加解释
- 展示 workflow 进度

借助 AskUserQuestion，commands 可以成为交互式向导，引导用户完成复杂决策，同时为简单直接的输入保留简单 arguments 带来的清晰度。
