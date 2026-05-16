# Frontmatter 模板

可直接复制粘贴的 YAML frontmatter 模板，适用于常见 skill 模式。

## 基础 Skill

最小必需 frontmatter：

```yaml
---
name: skill-name
description: This skill should be used when the user asks to "do X", "perform Y", or needs guidance on Z.
---
```

**要求：**

- `name`：kebab-case，与目录名匹配
- `description`：第三人称，以 `This skill should be used when...` 开头

## 带强触发词的 Skill

使用多个具体触发短语以获得更好的激活效果：

```yaml
---
name: database-migrations
description: This skill should be used when the user asks to "create a migration", "run migrations", "rollback migration", "migration status", "schema changes", "alter table", "add column", "database versioning", or needs guidance on database migration patterns, schema evolution, or migration best practices.
---
```

**最佳实践：**

- 包含 5-10 个具体触发短语
- 使用用户实际会说的短语（加引号）
- 覆盖不同说法（`create a migration`、`write migration`、`new migration`）
- 包含相关概念（`schema changes`、`alter table`）

## 只读 Skill

限制为只读工具，便于安全探索：

```yaml
---
name: codebase-analyzer
description: This skill should be used when the user asks to "analyze codebase", "find patterns", "code quality report", "architecture overview", "dependency analysis", or needs guidance on understanding existing code structure.
allowed-tools: Read, Grep, Glob
---
```

**使用场景：**

- 代码分析和探索
- 文档生成
- 安全审计
- 依赖审查

## 多领域 Skill

覆盖相关子主题的 skill：

```yaml
---
name: aws-infrastructure
description: This skill should be used when the user asks to "deploy to AWS", "configure S3", "set up Lambda", "create EC2 instance", "configure IAM", "CloudFormation template", "AWS CDK", "Terraform for AWS", or needs guidance on AWS services, infrastructure as code, or cloud deployment patterns.
---
```

**组织建议：** 对子主题使用 references/ 子目录：

```text
references/
├── compute/
│   ├── ec2.md
│   └── lambda.md
├── storage/
│   └── s3.md
└── iam/
    └── policies.md
```

## 安全优先 Skill

为敏感操作限制工具：

```yaml
---
name: secrets-manager
description: This skill should be used when the user asks to "manage secrets", "rotate credentials", "environment variables", "secure configuration", "vault integration", or needs guidance on secrets management patterns.
allowed-tools: Read, Grep, AskUserQuestion
---
```

**安全注意事项：**

- 排除 Write、Edit、Bash，避免意外暴露
- 包含 AskUserQuestion，用于确认流程
- 在 SKILL.md 中说明为什么存在这些限制

## Plugin 专用 Skill

为特定 plugin 上下文设计的 skill：

```yaml
---
name: plugin-testing
description: This skill should be used when the user asks to "test plugin", "validate plugin", "plugin integration tests", "test commands", "test hooks", "test agents", or needs guidance on testing Claude Code plugin components.
---
```

**Plugin 上下文：**

- 使用 `${CLAUDE_PLUGIN_ROOT}` 引用 plugin 专用路径
- 假设 plugin 结构已经存在
- 交叉引用其他 plugin skills

## Frontmatter 字段参考

| 字段 | 必需 | 类型 | 描述 |
| --- | --- | --- | --- |
| `name` | 是 | string | Skill 标识符（kebab-case） |
| `description` | 是 | string | 何时使用（第三人称） |
| `allowed-tools` | 否 | string | 逗号分隔的工具名称 |

## 常见错误

### 错误：第二人称 description

```yaml
# DON'T
description: Use this skill when you want to create migrations.
```

### 正确：第三人称 description

```yaml
# DO
description: This skill should be used when the user asks to "create migrations"...
```

### 错误：模糊触发条件

```yaml
# DON'T
description: This skill should be used for database stuff.
```

### 正确：具体触发条件

```yaml
# DO
description: This skill should be used when the user asks to "create a migration", "run migrations", "rollback migration"...
```

### 错误：短语缺少引号

```yaml
# DON'T
description: This skill should be used when the user asks to create a migration...
```

### 正确：为触发短语加引号

```yaml
# DO
description: This skill should be used when the user asks to "create a migration"...
```
