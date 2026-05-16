# Plugin 专属 Command 功能参考

本参考介绍 Claude Code plugins 中随附 commands 的专属功能和模式。

## 目录

- [Plugin Command 发现](#plugin-command-discovery)
- [CLAUDE_PLUGIN_ROOT 环境变量](#claude_plugin_root-environment-variable)
- [Plugin Command 模式](#plugin-command-patterns)
- [与 Plugin 组件集成](#integration-with-plugin-components)
- [Validation 模式](#validation-patterns)

## Plugin Command 发现

### 自动发现

Claude Code 会从以下位置自动发现 plugins 中的 commands：

```
plugin-name/
├── commands/              # Auto-discovered commands
│   ├── foo.md            # /foo (plugin:plugin-name)
│   └── bar.md            # /bar (plugin:plugin-name)
└── plugin.json           # Plugin manifest
```

**要点：**

- commands 在 plugin 加载时被发现
- 不需要手动注册
- commands 会在 `/help` 中以 “(plugin:plugin-name)” 标签显示
- 子目录会创建 namespaces

### 带 Namespace 的 Plugin Commands

将 commands 放入子目录，以便按逻辑分组：

```
plugin-name/
└── commands/
    ├── review/
    │   ├── security.md    # /security (plugin:plugin-name:review)
    │   └── style.md       # /style (plugin:plugin-name:review)
    └── deploy/
        ├── staging.md     # /staging (plugin:plugin-name:deploy)
        └── prod.md        # /prod (plugin:plugin-name:deploy)
```

**Namespace 行为：**

- 子目录名称会成为 namespace
- 在 `/help` 中显示为 “(plugin:plugin-name:namespace)”
- 帮助组织相关 commands
- 当 plugin 有 5 个以上 commands 时使用

### Command 命名约定

**Plugin command 名称应：**

1. 具有描述性，并以动作导向
2. 避免与常见 command 名称冲突
3. 多词名称使用连字符
4. 考虑加上 plugin 名称前缀以保证唯一性

**示例：**

```
Good:
- /mylyn-sync          (plugin-specific prefix)
- /analyze-performance (descriptive action)
- /docker-compose-up   (clear purpose)

Avoid:
- /test               (conflicts with common name)
- /run                (too generic)
- /do-stuff           (not descriptive)
```

## CLAUDE_PLUGIN_ROOT 环境变量

### 用途

`${CLAUDE_PLUGIN_ROOT}` 是 plugin commands 中可用的特殊环境变量，会解析为 plugin 目录的绝对路径。

**为什么重要：**

- 让 plugin 内路径可移植
- 允许引用 plugin 文件和 scripts
- 可在不同安装位置工作
- 对多文件 plugin 操作至关重要

### 基本用法

引用你的 plugin 内部文件：

```markdown
---
description: Analyze using plugin script
allowed-tools: Bash(node *), Read
---

Run `${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js` with the Bash tool during the task.

Read template: @${CLAUDE_PLUGIN_ROOT}/templates/report.md
```

**运行时：** Claude 使用 Bash tool 执行 script，并将文件引用解析到 plugin template 路径。

### 常见模式

#### 1. 执行 Plugin Scripts

```markdown
---
description: Run custom linter from plugin
allowed-tools: Bash(node *)
---

Run the plugin lint script with the Bash tool during the task.

Review the linting output and suggest fixes.
```

#### 2. 加载配置文件

```markdown
---
description: Deploy using plugin configuration
allowed-tools: Read, Bash(npm *), Bash(node *), Bash(kubectl *)
---

Configuration: @${CLAUDE_PLUGIN_ROOT}/config/deploy-config.json

Deploy application using the configuration above for $1 environment.
```

#### 3. 访问 Plugin 资源

```markdown
---
description: Generate report from template
---

Use this template: @${CLAUDE_PLUGIN_ROOT}/templates/api-report.md

Generate a report for @$1 following the template format.
```

#### 4. 多步骤 Plugin Workflows

```markdown
---
description: Complete plugin workflow
allowed-tools: Read, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/prepare *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/execute *)
---

Step 1 - Read config: @${CLAUDE_PLUGIN_ROOT}/config/$1.json
Step 2 - Run the prepare script with the Bash tool during the task.
Step 3 - Run the execute script with the Bash tool during the task.

Review results and report status.
```

### 最佳实践

1. **始终用于 plugin 内部路径：**

   ```markdown
   # Good

   @${CLAUDE_PLUGIN_ROOT}/templates/foo.md

   # Bad

   @./templates/foo.md # Relative to current directory, not plugin
   ```

2. **验证文件是否存在：**

   ```markdown
   ---
   description: Use plugin config if exists
   allowed-tools: Bash(test *), Read
   ---

   !`test -f ${CLAUDE_PLUGIN_ROOT}/config.json && echo "exists" || echo "missing"`

   If config exists, load it: @${CLAUDE_PLUGIN_ROOT}/config.json
   Otherwise, use defaults...
   ```

3. **文档化 plugin 文件结构：**

   ```markdown
   <!--
   Plugin structure:
   ${CLAUDE_PLUGIN_ROOT}/
   ├── scripts/analyze.js  (analysis script)
   ├── templates/          (report templates)
   └── config/             (configuration files)
   -->
   ```

4. **与 arguments 组合使用：**
   ```markdown
   Run: !`${CLAUDE_PLUGIN_ROOT}/bin/process.sh "$1" "$2"`
   ```

### 故障排查

**变量未展开：**

- 确保 command 从 plugin 加载
- 检查 bash 执行是否被允许
- 验证语法完全一致：`${CLAUDE_PLUGIN_ROOT}`

**文件未找到错误：**

- 验证文件存在于 plugin 目录中
- 检查相对于 plugin root 的文件路径是否正确
- 确保文件权限允许读取/执行

**包含空格的路径：**

- 对可能包含空格的 shell 变量和路径加引号
- 文件引用可处理路径中的空格
- 在 Bash 示例中优先使用 `"${CLAUDE_PLUGIN_ROOT}/path"` 和 `"$1"`

## Plugin Command 模式

### 模式 1：基于配置的 Commands

加载 plugin 专属配置的 commands：

```markdown
---
description: Deploy using plugin settings
allowed-tools: Read, Bash(git *), Bash(node *), Bash(npm *), Bash(kubectl *)
---

Load configuration: @${CLAUDE_PLUGIN_ROOT}/deploy-config.json

Deploy to $1 environment using:

1. Configuration settings above
2. Current git branch: !`git branch --show-current`
3. Application version: !`node -p "require('./package.json').version"`

Execute deployment and monitor progress.
```

**何时使用：** 需要在多次调用中保持一致设置的 commands

### 模式 2：基于 Template 的生成

使用 plugin templates 的 commands：

```markdown
---
description: Generate documentation from template
argument-hint: "[component-name]"
---

Template: @${CLAUDE_PLUGIN_ROOT}/templates/component-docs.md

Generate documentation for $1 component following the template structure.
Include:

- Component purpose and usage
- API reference
- Examples
- Testing guidelines
```

**何时使用：** 标准化输出生成

### 模式 3：多 Script Workflow

编排多个 plugin scripts 的 commands：

```markdown
---
description: Complete build and test workflow
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/build *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/validate *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/test *)
---

Run the build script, validation script, and test script with the Bash tool during the workflow.

Review all outputs and report:

1. Build status
2. Validation results
3. Test results
4. Recommended next steps
```

**何时使用：** 包含多个步骤的复杂 plugin workflows

### 模式 4：环境感知 Commands

根据环境调整行为的 commands：

```markdown
---
description: Deploy based on environment
argument-hint: "[dev|staging|prod]"
---

Environment config: @${CLAUDE_PLUGIN_ROOT}/config/$1.json

Environment check: !`echo "Deploying to: $1"`

Deploy application using $1 environment configuration.
Verify deployment and run smoke tests.
```

**何时使用：** 会按环境采取不同行为的 commands

### 模式 5：Plugin 数据管理

管理 plugin 专属数据的 commands：

```markdown
---
description: Save analysis results to plugin cache
allowed-tools: Bash(mkdir *), Read, Write
---

Cache directory: .claude/my-plugin/cache/

Analyze @$1 and save results to cache during the task. Create the cache directory and write metadata only after Claude has confirmed the operation is appropriate.

Store analysis for future reference and comparison.
```

**何时使用：** 需要持久化数据存储的 commands

## 与 Plugin 组件集成

### 调用 Plugin Agents

commands 可以使用 Agent tool 触发 plugin agents：

```markdown
---
description: Deep analysis using plugin agent
argument-hint: "[file-path]"
---

Initiate deep code analysis of @$1 using the code-analyzer agent.

The agent will:

1. Analyze code structure
2. Identify patterns
3. Suggest improvements
4. Generate detailed report

Note: This uses the Agent tool to launch the plugin's code-analyzer agent.
```

**要点：**

- Agent 必须定义在 plugin 的 `agents/` 目录中
- Claude 会自动使用 Agent tool 启动 agent
- Agent 可以访问相同的 plugin 资源

### 调用 Plugin Skills

commands 可以引用 plugin skills 来获得专门知识：

```markdown
---
description: API documentation with best practices
argument-hint: "[api-file]"
---

Document the API in @$1 following our API documentation standards.

Use the api-docs-standards skill to ensure documentation includes:

- Endpoint descriptions
- Parameter specifications
- Response formats
- Error codes
- Usage examples

Note: This leverages the plugin's api-docs-standards skill for consistency.
```

**要点：**

- Skill 必须定义在 plugin 的 `skills/` 目录中
- 通过名称提及 skill，以提示 Claude 应调用它
- skills 提供专门领域知识

### 与 Plugin Hooks 协调

commands 可以设计为与 plugin hooks 配合工作：

```markdown
---
description: Commit with pre-commit validation
allowed-tools: Bash(git *)
---

Stage the requested files and create a commit during the normal workflow after reviewing the changes with the user.

Note: This commit will trigger the plugin's pre-commit hook for validation.
Review hook output for any issues.
```

**要点：**

- Hooks 会在事件发生时自动执行
- commands 可以为 hooks 准备状态
- 在 command 中文档化 hook 交互

### 多组件 Plugin Commands

协调多个 plugin 组件的 commands：

```markdown
---
description: Comprehensive code review workflow
argument-hint: "[file-path]"
---

File to review: @$1

Execute comprehensive review:

1. **Static Analysis** (via plugin scripts)
   Run the plugin lint script with the Bash tool during the task.

2. **Deep Review** (via plugin agent)
   Launch the code-reviewer agent for detailed analysis.

3. **Best Practices** (via plugin skill)
   Use the code-standards skill to ensure compliance.

4. **Documentation** (via plugin template)
   Template: @${CLAUDE_PLUGIN_ROOT}/templates/review-report.md

Generate final report combining all outputs.
```

**何时使用：** 利用多种 plugin 能力的复杂 workflows

## Validation 模式

### 输入 Validation

commands 应在处理前验证输入：

```markdown
---
description: Deploy to environment with validation
argument-hint: "[environment]"
---

Validate environment: !`echo "$1" | grep -E "^(dev|staging|prod)$" || echo "INVALID"`

If $1 is one of dev, staging, or prod, deploy to $1 using validated configuration. Otherwise, explain that the environment is invalid and must be one of: dev, staging, prod.
```

**Validation 方法：**

1. 使用 grep/test 的 Bash validation
2. prompt 中的内联 validation
3. 基于 script 的 validation

### 文件存在性检查

验证所需文件存在：

```markdown
---
description: Process configuration file
argument-hint: "[config-file]"
---

Check file: !`test -f "$1" && echo "EXISTS" || echo "MISSING"`

Process configuration if file exists: @$1

If file doesn't exist, explain:

- Expected location
- Required format
- How to create it
```

### 必填 Arguments

验证已提供必填 arguments：

```markdown
---
description: Create deployment with version
argument-hint: "[environment] [version]"
---

Validate inputs: !`test -n "$1" -a -n "$2" && echo "OK" || echo "MISSING"`

If both $1 and $2 are provided, deploy version $2 to $1. Otherwise, explain that both environment and version are required and show: /deploy [env] [version].
```

### Plugin 资源 Validation

验证 plugin 资源可用：

```markdown
---
description: Run analysis with plugin tools
allowed-tools: Bash(test *)
---

Validate plugin setup:

- Config exists: !`test -f ${CLAUDE_PLUGIN_ROOT}/config.json && echo "✓" || echo "✗"`
- Scripts exist: !`test -d ${CLAUDE_PLUGIN_ROOT}/scripts && echo "✓" || echo "✗"`
- Tools available: !`test -x ${CLAUDE_PLUGIN_ROOT}/bin/analyze && echo "✓" || echo "✗"`

If all checks pass, proceed with analysis.
Otherwise, report missing components and installation steps.
```

### 输出 Validation

验证 command 执行结果：

```markdown
---
description: Build and validate output
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/build *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/validate-output *)
---

Run the build script with the Bash tool during the task.

Validate output:

- Review the build command exit code
- Output exists: !`test -d dist && echo "✓" || echo "✗"`
- File count: !`find dist -type f | wc -l`

Report build status and any validation failures.
```

### 优雅错误处理

用有帮助的消息优雅处理错误：

```markdown
---
description: Process file with error handling
argument-hint: "[file-path]"
---

Try processing with the Bash tool during the task and report any ERROR exit status.

If processing succeeded:

- Report results
- Suggest next steps

If processing failed:

- Explain likely causes
- Provide troubleshooting steps
- Suggest alternative approaches
```

## 最佳实践总结

### Plugin Commands 应该

1. **对所有 plugin 内部路径使用 ${CLAUDE_PLUGIN_ROOT}**
   - scripts、templates、configuration、resources

2. **尽早验证输入**
   - 检查必填 arguments
   - 验证文件存在
   - validation arguments 的格式

3. **文档化 plugin 结构**
   - 说明所需文件
   - 文档化 script 用途
   - 澄清依赖

4. **与 plugin 组件集成**
   - 对复杂任务引用 agents
   - 使用 skills 获取专门知识
   - 相关时与 hooks 协调

5. **提供有帮助的错误消息**
   - 说明出了什么问题
   - 建议如何修复
   - 提供替代方案

6. **处理边界情况**
   - 缺失文件
   - 无效 arguments
   - script 执行失败
   - 缺失依赖

7. **保持 commands 聚焦**
   - 每个 command 一个明确目的
   - 将复杂逻辑委托给 scripts
   - 对多步骤 workflows 使用 agents

8. **跨安装位置测试**
   - 验证路径在各处都可工作
   - 使用不同 arguments 测试
   - validation（验证）错误场景

---

一般 command development 请参见主 SKILL.md。
command 示例请参见 examples/ 目录。
