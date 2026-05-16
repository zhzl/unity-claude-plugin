# 高级 Workflow 模式

复杂 workflow 的多步骤 command 序列与组合模式。

## 概述

高级 workflow 会组合多个 command、在多次调用之间协调状态，并创建更复杂的自动化序列。这些模式支持用简单的 command 构建块搭建复杂功能。

## 多步骤 Command 模式

### 顺序 Workflow Command

引导用户完成多步骤流程的 command：

```markdown
---
description: Complete PR review workflow
argument-hint: "[pr-number]"
allowed-tools: Bash(gh *), Read, Grep
---

# PR Review Workflow for #$1

## Step 1: Fetch PR Details

`gh pr view $1 --json title,body,author,files`

## Step 2: Review Files

Files changed: `gh pr diff $1 --name-only`

For each file:

- Check code quality
- Verify tests exist
- Review documentation

## Step 3: Run Checks

Test status: `gh pr checks $1`

Verify:

- All tests passing
- No merge conflicts
- CI/CD successful

## Step 4: Provide Feedback

Summarize:

- Issues found (critical/minor)
- Suggestions for improvement
- Approval recommendation

Would you like to:

1. Approve PR
2. Request changes
3. Leave comments only

Reply with your choice and I'll help complete the action.
```

**关键特性：**

- 用编号步骤提升清晰度
- 通过 Bash 执行获取上下文
- 为用户输入设置决策点
- 提供下一步操作建议

### 携带状态的 Workflow

在多次调用之间维护状态的 command：

```markdown
---
description: Initialize deployment workflow
allowed-tools: Write, Bash(git *)
---

# Initialize Deployment

Creating deployment tracking file...

Current branch: !`git branch --show-current`
Latest commit: !`git log -1 --format=%H`

Deployment state saved to `.claude/deployment-state.local.md`:

## \`\`\`markdown

initialized: true
branch: $(git branch --show-current)
commit: $(git log -1 --format=%H)
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
status: initialized

---

# Deployment Tracking

Branch: $(git branch --show-current)
Started: $(date)

Next steps:

1. Run tests: /deploy-test
2. Build: /deploy-build
3. Deploy: /deploy-execute
   \`\`\`

State saved. Run `/deploy-test` to continue.
```

**下一个 command**（`/deploy-test`）：

```markdown
---
description: Run deployment tests
allowed-tools: Read, Bash(npm *)
---

Reading deployment state from `.claude/deployment-state.local.md`...

Run tests with the Bash tool.

Updating state to 'tested'...

Tests complete. Run `/deploy-build` to continue.
```

**模式收益：**

- 在多个 command 之间持久化状态
- 清晰的 workflow 推进路径
- 安全检查点
- 可恢复能力

### 条件式 Workflow 分支

根据条件自适应的 command：

```markdown
---
description: Smart deployment workflow
argument-hint: "[environment]"
allowed-tools: Bash(git *), Bash(npm *), Read
---

# Deploy to $1

## Pre-flight Checks

Branch: !`git branch --show-current`
Status: !`git status --short`

**Checking conditions:**

1. Branch status:
   - If main/master: Require approval
   - If feature branch: Warning about target
   - If hotfix: Fast-track process

2. Tests:
   Run tests with the Bash tool.
   - If tests fail: STOP - fix tests first
   - If tests pass: Continue

3. Environment:
   - If $1 = 'production': Extra validation
   - If $1 = 'staging': Standard process
   - If $1 = 'dev': Minimal checks

**Workflow decision:**
Based on above, proceeding with: [determined workflow]

[Conditional steps based on environment and status]

Ready to deploy? (yes/no)
```

## Command 组合模式

### Command 链接

设计为协同工作的 command：

```markdown
---
description: Prepare for code review
---

# Prepare Code Review

Running preparation sequence:

1. Format code: /format-code
2. Run linter: /lint-code
3. Run tests: /test-all
4. Generate coverage: /coverage-report
5. Create review summary: /review-summary

This is a meta-command. After completing each step above,
I'll compile results and prepare comprehensive review materials.

Starting sequence...
```

**单个 command** 保持简单：

- `/format-code` - 只负责格式化
- `/lint-code` - 只负责 lint
- `/test-all` - 只负责测试

**组合 command** 负责编排。

### Pipeline（流水线）模式

处理前一个 command 输出的 command：

```markdown
---
description: Analyze test failures
---

# Analyze Test Failures

## Step 1: Get test results

(Run /test-all first if not done)

Reading test output...

## Step 2: Categorize failures

- Flaky tests (random failures)
- Consistent failures
- New failures vs existing

## Step 3: Prioritize

Rank by:

- Impact (critical path vs edge case)
- Frequency (always fails vs sometimes)
- Effort (quick fix vs major work)

## Step 4: Generate fix plan

For each failure:

- Root cause hypothesis
- Suggested fix approach
- Estimated effort

Would you like me to:

1. Fix highest priority failure
2. Generate detailed fix plans for all
3. Create GitHub issues for each
```

### 并行执行模式

协调多个并行操作的 command：

```markdown
---
description: Run comprehensive validation
allowed-tools: Read, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/lint *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/test *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/validate *)
---

# Comprehensive Validation

Running validations in parallel...

Starting:

- Code quality checks
- Security scanning
- Dependency audit
- Performance profiling

This will take 2-3 minutes. I'll monitor all processes
and report when complete.

[Poll each process and report progress]

All validations complete. Summary:

- Quality: PASS (0 issues)
- Security: WARN (2 minor issues)
- Dependencies: PASS
- Performance: PASS (baseline met)

Details:
[Collated results from all checks]
```

## Workflow 状态管理

### 使用 .local.md 文件

将 workflow 状态存储在 plugin 专用文件中：

```markdown
.claude/plugin-name-workflow.local.md:

---

workflow: deployment
stage: testing
started: 2025-01-15T10:30:00Z
environment: staging
branch: feature/new-api
commit: abc123def
tests_passed: false
build_complete: false

---

# Deployment Workflow State

Current stage: Testing
Started: 2025-01-15 10:30 UTC

Completed steps:

- ✅ Validation
- ✅ Branch check
- ⏳ Testing (in progress)

Pending steps:

- Build
- Deploy
- Smoke tests
```

**在 command 中读取状态：**

```markdown
---
description: Continue deployment workflow
allowed-tools: Read, Write
---

Reading workflow state from .claude/plugin-name-workflow.local.md...

Current stage: @.claude/plugin-name-workflow.local.md

[Parse YAML frontmatter to determine next step]

Next action based on state: [determined action]
```

### Workflow 恢复

处理中断的 workflow：

```markdown
---
description: Resume deployment workflow
allowed-tools: Read
---

# Resume Deployment

Checking for interrupted workflow...

State file: @.claude/plugin-name-workflow.local.md

**Workflow found:**

- Started: [timestamp]
- Environment: [env]
- Last completed: [step]

**Recovery options:**

1. Resume from last step
2. Restart from beginning
3. Abort and clean up

Which would you like? (1/2/3)
```

## Workflow 协调模式

### 跨 Command 通信

相互发出信号的 command：

```markdown
---
description: Mark feature complete
allowed-tools: Write
---

# Mark Feature Complete

Writing completion marker...

Creating: .claude/feature-complete.flag

This signals other commands that feature is ready for:

- Integration testing (/integration-test will auto-detect)
- Documentation generation (/docs-generate will include)
- Release notes (/release-notes will add)

Feature marked complete.
```

**其他 command 检查 flag：**

```markdown
---
description: Generate release notes
allowed-tools: Read, Bash(git *)
---

Use the Bash tool to check whether `.claude/feature-complete.flag` exists.

If the flag exists, include the completed feature in the release notes.

[Include in release notes]
```

### Workflow 锁定

防止并发执行 workflow：

```markdown
---
description: Start deployment
allowed-tools: Read, Write, Bash
---

# Start Deployment

Use the Bash tool to check whether `.claude/deployment.lock` exists.

If the lock exists, report the timestamp from the lock file and stop with:

ERROR: Deployment already in progress

Cannot start concurrent deployment.
Wait for completion or run /deployment-abort

If no lock exists, use the Write tool to create `.claude/deployment.lock`.

Deployment started. Lock created.
[Proceed with deployment]
```

**清理 lock：**

```markdown
---
description: Complete deployment
allowed-tools: Write, Bash
---

Deployment complete.

Removing deployment lock...
rm .claude/deployment.lock

Ready for next deployment.
```

## 高级参数处理

### 带默认值的可选参数

```markdown
---
description: Deploy with optional version
argument-hint: "[environment] [version]"
---

Environment: ${1:-staging}
Version: ${2:-latest}

Deploying ${2:-latest} to ${1:-staging}...

Note: Using defaults for missing arguments:

- Environment defaults to 'staging'
- Version defaults to 'latest'
```

### 参数 Validation

```markdown
---
description: Deploy to validated environment
argument-hint: "[environment]"
---

Environment: $1

Validating environment...

valid_envs="dev staging production"
if ! echo "$valid_envs" | grep -w "$1" > /dev/null; then
ERROR: Invalid environment '$1'
Valid options: dev, staging, production
Exit.
fi

Environment validated. Proceeding...
```

### 参数转换

```markdown
---
description: Deploy with shorthand
argument-hint: "[env-shorthand]"
---

Input: $1

Expanding shorthand:

- d/dev → development
- s/stg → staging
- p/prod → production

case "$1" in
d|dev) ENV="development";;
s|stg) ENV="staging";;
p|prod) ENV="production";;
\*) ENV="$1";;
esac

Deploying to: $ENV
```

## Workflow 中的错误处理

### 优雅失败

```markdown
---
description: Resilient deployment workflow
---

# Deployment Workflow

Running steps with error handling...

## Step 1: Tests

Run tests with the Bash tool.

If tests fail:
ERROR: Tests failed

Options:

1. Fix tests and retry
2. Skip tests (NOT recommended)
3. Abort deployment

What would you like to do?

[Wait for user input before continuing]

## Step 2: Build

[Continue only if Step 1 succeeded]
```

### 失败时 Rollback

```markdown
---
description: Deployment with rollback
---

# Deploy with Rollback

Saving current state for rollback...
Previous version: !`./current-version.sh`

Deploy the new version with the Bash tool.

If deployment fails:
DEPLOYMENT FAILED

Initiate rollback with the Bash tool.

Report rollback status and check logs for failure details.

Deployment complete.
```

### Checkpoint 恢复

```markdown
---
description: Workflow with checkpoints
---

# Multi-Stage Deployment

## Checkpoint 1: Validation

Run validation with the Bash tool, then record checkpoint:validation.

## Checkpoint 2: Build

Run build with the Bash tool, then record checkpoint:build.

## Checkpoint 3: Deploy

Run deployment with the Bash tool, then record checkpoint:deploy.

If any step fails, resume with:
/deployment-resume [last-successful-checkpoint]
```

## 最佳实践

### Workflow 设计

1. **清晰推进**：给步骤编号，显示当前位置
2. **显式状态**：不要依赖隐式状态
3. **用户控制**：提供决策点
4. **错误恢复**：优雅处理失败
5. **进度提示**：显示已完成与待处理事项

### Command 组合

1. **单一职责**：每个 command 把一件事做好
2. **可组合设计**：command 易于协同工作
3. **标准接口**：保持一致的输入/输出格式
4. **松耦合**：command 不依赖彼此的内部实现

### 状态管理

1. **持久化状态**：使用 .local.md 文件
2. **原子更新**：以原子方式写入完整状态文件
3. **状态 validation**：检查状态文件格式与完整性
4. **清理**：移除过期状态文件
5. **文档化**：记录状态文件格式

### 错误处理

1. **快速失败**：尽早检测错误
2. **清晰消息**：解释哪里出了问题
3. **恢复选项**：提供明确的下一步
4. **状态保留**：保留状态以便恢复
5. **Rollback 能力**：支持撤销变更

## 示例：完整 Deployment Workflow

### 初始化 Command

```markdown
---
description: Initialize deployment
argument-hint: "[environment]"
allowed-tools: Write, Bash(git *)
---

# Initialize Deployment to $1

Creating workflow state...

## \`\`\`yaml

workflow: deployment
environment: $1
branch: !`git branch --show-current`
commit: !`git rev-parse HEAD`
stage: initialized
timestamp: !`date -u +%Y-%m-%dT%H:%M:%SZ`

---

\`\`\`

Written to .claude/deployment-state.local.md

Next: Run /deployment-validate
```

### Validation 验证 Command

```markdown
---
description: Validate deployment
allowed-tools: Read, Bash
---

Reading state: @.claude/deployment-state.local.md

Running validation...

- Branch check: PASS
- Tests: PASS
- Build: PASS

Updating state to 'validated'...

Next: Run /deployment-execute
```

### 执行 Command

```markdown
---
description: Execute deployment
allowed-tools: Read, Bash, Write
---

Reading state: @.claude/deployment-state.local.md

Executing deployment to [environment]...

`deploy.sh [environment]`

Deployment complete.
Updating state to 'completed'...

Cleanup: /deployment-cleanup
```

### 清理 Command

```markdown
---
description: Clean up deployment
allowed-tools: Bash
---

Removing deployment state...
rm .claude/deployment-state.local.md

Deployment workflow complete.
```

这个完整 workflow 展示了如何在多个 command 之间进行状态管理、顺序执行、错误处理，以及清晰的职责分离。
