# Plugin Command 示例

面向 Claude Code plugin 设计的 command 实用示例，展示 plugin 特定模式与功能。

## 目录

1. [简单 Plugin Command](#1-简单-plugin-command)
2. [基于脚本的分析](#2-基于脚本的分析)
3. [基于模板的生成](#3-基于模板的生成)
4. [多脚本 Workflow](#4-多脚本-workflow)
5. [配置驱动的部署](#5-配置驱动的部署)
6. [Agent 集成](#6-agent-集成)
7. [Skill 集成](#7-skill-集成)
8. [多组件 Workflow](#8-多组件-workflow)
9. [带 Validation 的输入 Command](#9-带-validation-的输入-command)
10. [环境感知 Command](#10-环境感知-command)

---

## 1. 简单 Plugin Command

**使用场景：** 使用 plugin 脚本的基础 command

**文件：** `commands/analyze.md`

```markdown
---
description: Analyze code quality using plugin tools
argument-hint: "[file-path]"
allowed-tools: Bash(node *), Read
---

Analyze @$1 using plugin's quality checker:

Run `${CLAUDE_PLUGIN_ROOT}/scripts/quality-check.js @$1` with the Bash tool during the task.

Review the analysis output and provide:

1. Summary of findings
2. Priority issues to address
3. Suggested improvements
4. Code quality score interpretation
```

**关键特性：**

- 使用 `${CLAUDE_PLUGIN_ROOT}` 实现可移植路径
- 将文件引用与脚本执行结合
- 简单的单一用途 command

---

## 2. 基于脚本的分析

**使用场景：** 使用多个 plugin 脚本运行全面分析

**文件：** `commands/full-audit.md`

```markdown
---
description: Complete code audit using plugin suite
argument-hint: "[directory]"
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/security-scan *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/perf-analyze *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/best-practices *), Read
model: sonnet
---

Running complete audit on $1:

**Security scan:** Run the security-scan script with the Bash tool.

**Performance analysis:** Run the perf-analyze script with the Bash tool.

**Best practices check:** Run the best-practices script with the Bash tool.

Analyze all results and create comprehensive report including:

- Critical issues requiring immediate attention
- Performance optimization opportunities
- Security vulnerabilities and fixes
- Overall health score and recommendations
```

**关键特性：**

- 多次脚本执行
- 结构化输出章节
- 全面的 workflow
- 清晰的报告结构

---

## 3. 基于模板的生成

**使用场景：** 按 plugin 模板生成文档

**文件：** `commands/gen-api-docs.md`

```markdown
---
description: Generate API documentation from template
argument-hint: "[api-file]"
---

Template structure: @${CLAUDE_PLUGIN_ROOT}/templates/api-documentation.md

API implementation: @$1

Generate complete API documentation following the template format above.

Ensure documentation includes:

- Endpoint descriptions with HTTP methods
- Request/response schemas
- Authentication requirements
- Error codes and handling
- Usage examples with curl commands
- Rate limiting information

Format output as markdown suitable for README or docs site.
```

**关键特性：**

- 使用 plugin 模板
- 将模板与源文件结合
- 标准化输出格式
- 清晰的文档结构

---

## 4. 多脚本 Workflow

**使用场景：** 编排构建、测试和部署 workflow

**文件：** `commands/release.md`

```markdown
---
description: Execute complete release workflow
argument-hint: "[version]"
allowed-tools: Read, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pre-release-check *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/build-release *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/test *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/package *)
---

Executing release workflow for version $1:

**Step 1 - Pre-release validation:** Run the pre-release-check script with the Bash tool.

**Step 2 - Build artifacts:** Run the build-release script with the Bash tool.

**Step 3 - Run test suite:** Run the test suite script with the Bash tool.

**Step 4 - Package release:** Run the package script with the Bash tool.

Review all step outputs and report:

1. Any failures or warnings
2. Build artifacts location
3. Test results summary
4. Next steps for deployment
5. Rollback plan if needed
```

**关键特性：**

- 多步骤 workflow
- 顺序脚本执行
- 清晰的步骤编号
- 全面的报告

---

## 5. 配置驱动的部署

**使用场景：** 使用特定环境的 plugin 配置进行部署

**文件：** `commands/deploy.md`

```markdown
---
description: Deploy application to environment
argument-hint: "[environment]"
allowed-tools: Read, Bash(git *), Bash(node *), Bash(npm *)
---

Deployment configuration for $1: @${CLAUDE_PLUGIN_ROOT}/config/$1-deploy.json

Current git state: !`git rev-parse --short HEAD`

Build info: !`node -e "const p=require('./package.json'); console.log(p.name, p.version)"`

Execute deployment to $1 environment using configuration above.

Deployment checklist:

1. Validate configuration settings
2. Build application for $1
3. Run pre-deployment tests
4. Deploy to target environment
5. Run smoke tests
6. Verify deployment success
7. Update deployment log

Report deployment status and any issues encountered.
```

**关键特性：**

- 环境特定配置
- 动态加载配置文件
- 部署前 validation
- 结构化 checklist

---

## 6. Agent 集成

**使用场景：** 为复杂任务启动 plugin agent 的 command

**文件：** `commands/deep-review.md`

```markdown
---
description: Deep code review using plugin agent
argument-hint: "[file-or-directory]"
---

Initiate comprehensive code review of @$1 using the code-reviewer agent.

The agent will perform:

1. **Static analysis** - Check for code smells and anti-patterns
2. **Security audit** - Identify potential vulnerabilities
3. **Performance review** - Find optimization opportunities
4. **Best practices** - Ensure code follows standards
5. **Documentation check** - Verify adequate documentation

The agent has access to:

- Plugin's linting rules: ${CLAUDE_PLUGIN_ROOT}/config/lint-rules.json
- Security checklist: ${CLAUDE_PLUGIN_ROOT}/checklists/security.md
- Performance guidelines: ${CLAUDE_PLUGIN_ROOT}/docs/performance.md

Note: This uses the Agent tool to launch the plugin's code-reviewer agent for thorough analysis.
```

**关键特性：**

- 委派给 plugin agent
- 记录 agent 能力
- 引用 plugin 资源
- 明确范围定义

---

## 7. Skill 集成

**使用场景：** 利用 plugin skill 专业知识的 command

**文件：** `commands/document-api.md`

```markdown
---
description: Document API following plugin standards
argument-hint: "[api-file]"
---

API source code: @$1

Generate API documentation following the plugin's API documentation standards.

Use the api-documentation-standards skill to ensure:

- **OpenAPI compliance** - Follow OpenAPI 3.0 specification
- **Consistent formatting** - Use plugin's documentation style
- **Complete coverage** - Document all endpoints and schemas
- **Example quality** - Provide realistic usage examples
- **Error documentation** - Cover all error scenarios

The skill provides:

- Standard documentation templates
- API documentation best practices
- Common patterns for this codebase
- Quality validation criteria

Generate production-ready API documentation.
```

**关键特性：**

- 按名称调用 plugin skill
- 记录 skill 目的
- 明确预期
- 利用 skill 知识

---

## 8. 多组件 Workflow

**使用场景：** 使用 agent、skill 和脚本的复杂 workflow

**文件：** `commands/complete-review.md`

```markdown
---
description: Comprehensive review using all plugin components
argument-hint: "[file-path]"
allowed-tools: Bash(node *), Read
---

Target file: @$1

Execute comprehensive review workflow:

**Phase 1: Automated Analysis**
Run the plugin analyzer script with the Bash tool.

**Phase 2: Deep Review (Agent)**
Launch the code-quality-reviewer agent for detailed analysis.
Agent will examine:

- Code structure and organization
- Error handling patterns
- Testing coverage
- Documentation quality

**Phase 3: Standards Check (Skill)**
Use the coding-standards skill to validate:

- Naming conventions
- Code formatting
- Best practices adherence
- Framework-specific patterns

**Phase 4: Report Generation**
Template: @${CLAUDE_PLUGIN_ROOT}/templates/review-report.md

Compile all findings into comprehensive report following template.

**Phase 5: Recommendations**
Generate prioritized action items:

1. Critical issues (must fix)
2. Important improvements (should fix)
3. Nice-to-have enhancements (could fix)

Include specific file locations and suggested changes for each item.
```

**关键特性：**

- 多阶段 workflow
- 组合脚本、agent、skill
- 基于模板的报告
- 优先级化输出

---

## 9. 带 Validation 的输入 Command

**使用场景：** 带输入 validation 和错误处理的 command

**文件：** `commands/build-env.md`

```markdown
---
description: Build for specific environment with validation
argument-hint: "[environment]"
allowed-tools: Bash(grep *), Bash(test *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/build *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/validate-build *)
---

Validate environment argument: !`echo "$1" | grep -E "^(dev|staging|prod)$" && echo "VALID" || echo "INVALID"`

Check build script exists: !`test -x ${CLAUDE_PLUGIN_ROOT}/scripts/build.sh && echo "EXISTS" || echo "MISSING"`

Verify configuration available: !`test -f "${CLAUDE_PLUGIN_ROOT}/config/$1.json" && echo "FOUND" || echo "NOT_FOUND"`

If all validations pass:

**Configuration:** @${CLAUDE_PLUGIN_ROOT}/config/$1.json

**Execute build:** Run the build script with the Bash tool.

**Validation results:** Run the validate-build script with the Bash tool.

Report build status and any issues.

If validations fail:

- Explain which validation failed
- Provide expected values/locations
- Suggest corrective actions
- Document troubleshooting steps
```

**关键特性：**

- 输入 validation
- 资源存在性检查
- 错误处理
- 有帮助的错误消息
- 优雅失败处理

---

## 10. 环境感知 Command

**使用场景：** 根据环境调整行为的 command

**文件：** `commands/run-checks.md`

```markdown
---
description: Run environment-appropriate checks
argument-hint: "[environment]"
allowed-tools: Read, Bash(grep *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/test-full *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/security-scan *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/perf-check *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/compliance *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/test-basic *)
---

Environment: $1

Load environment configuration: @${CLAUDE_PLUGIN_ROOT}/config/$1-checks.json

Determine check level: !`echo "$1" | grep -E "^prod$" && echo "FULL" || echo "BASIC"`

**For production environment:**

- Full test suite: run the test-full script with the Bash tool
- Security scan: run the security-scan script with the Bash tool
- Performance audit: run the perf-check script with the Bash tool
- Compliance check: run the compliance script with the Bash tool

**For non-production environments:**

- Basic tests: run the test-basic script with the Bash tool
- Quick lint: run the lint script with the Bash tool

Analyze results based on environment requirements:

**Production:** All checks must pass with zero critical issues
**Staging:** No critical issues, warnings acceptable
**Development:** Focus on blocking issues only

Report status and recommend proceed/block decision.
```

**关键特性：**

- 环境感知逻辑
- 条件执行
- 不同 validation 级别
- 按环境给出合适报告

---

## 常见模式摘要

### 模式：Plugin 脚本执行

```markdown
Run the plugin script with the Bash tool during the task.
```

适用于：运行 plugin 提供的 Node.js 脚本

### 模式：Plugin 配置加载

```markdown
@${CLAUDE_PLUGIN_ROOT}/config/config-name.json
```

适用于：加载 plugin 配置文件

### 模式：Plugin 模板使用

```markdown
@${CLAUDE_PLUGIN_ROOT}/templates/template-name.md
```

适用于：使用 plugin 模板进行生成

### 模式：Agent 调用

```markdown
Launch the [agent-name] agent for [task description].
```

适用于：将复杂任务委派给 plugin agent

### 模式：Skill 引用

```markdown
Use the [skill-name] skill to ensure [requirements].
```

适用于：利用 plugin skill 的专业知识

### 模式：输入 Validation

```markdown
Validate input: !`echo "$1" | grep -E "^pattern$" && echo "OK" || echo "ERROR"`
```

适用于：验证 command 参数

### 模式：资源 Validation

```markdown
Check exists: !`test -f ${CLAUDE_PLUGIN_ROOT}/path/file && echo "YES" || echo "NO"`
```

适用于：验证所需 plugin 文件是否存在

---

## 开发提示

### 测试 Plugin Command

1. **在已安装 plugin 的情况下测试：**

   ```bash
   cd /path/to/plugin
   claude /command-name args
   ```

2. **验证 ${CLAUDE_PLUGIN_ROOT} 展开：**

   ```bash
   # Add debug output to command
   !`echo "Plugin root: ${CLAUDE_PLUGIN_ROOT}"`
   ```

3. **在不同工作目录中测试：**

   ```bash
   cd /tmp && claude /command-name
   cd /other/project && claude /command-name
   ```

4. **验证资源可用性：**
   ```bash
   # Check all plugin resources exist
   !`test -d ${CLAUDE_PLUGIN_ROOT}/scripts && echo "scripts ok" || echo "missing scripts"`
   !`test -d ${CLAUDE_PLUGIN_ROOT}/config && echo "config ok" || echo "missing config"`
   ```

### 要避免的常见错误

1. **使用相对路径而不是 ${CLAUDE_PLUGIN_ROOT}：**

   ```markdown
   # Wrong

   Run ./scripts/analyze.js

   # Correct

   Run ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js with the Bash tool.
   ```

2. **忘记允许所需工具：**

   ```markdown
   # Missing allowed-tools

   Run script.sh with the Bash tool # Will fail without Bash permission

   # Correct

   ---
   allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/script.sh *)
   ---

   Run ${CLAUDE_PLUGIN_ROOT}/scripts/script.sh with the Bash tool.
   ```

3. **未验证输入：**

   ```markdown
   # Risky - no validation

   Deploy to $1 environment

   # Better - with validation

   Validate: !`echo "$1" | grep -E "^(dev|staging|prod)$" || echo "INVALID"`
   Deploy to $1 environment (if valid)
   ```

4. **硬编码 plugin 路径：**

   ```markdown
   # Wrong - breaks on different installations

   @/home/user/.claude/plugins/my-plugin/config.json

   # Correct - works everywhere

   @${CLAUDE_PLUGIN_ROOT}/config.json
   ```

---

关于 plugin 特定功能的详细信息，见 `references/plugin-features-reference.md`。
关于通用 command 开发，见主 `SKILL.md`。
