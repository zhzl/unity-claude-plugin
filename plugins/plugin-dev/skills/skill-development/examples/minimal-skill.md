# Minimal Skill 示例

只有一个 SKILL.md 文件的极简 skill。

## 目录结构

```text
git-conventions/
└── SKILL.md
```

## 文件内容

### SKILL.md

````markdown
---
name: git-conventions
description: This skill should be used when the user asks about "git commit message format", "conventional commits", "commit conventions", "branch naming", or needs guidance on git workflow standards.
---

# Git Conventions

This skill provides guidance on git commit messages and branch naming conventions.

## Commit Message Format

Follow the Conventional Commits specification:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```
````

### 类型

- **feat**：新功能
- **fix**：Bug 修复
- **docs**：文档变更
- **style**：代码风格变更（格式、分号）
- **refactor**：不改变行为的代码重构
- **test**：添加或更新测试
- **chore**：维护任务

### 示例

```text
feat(auth): add OAuth2 login support

fix(api): handle null response from external service

docs(readme): update installation instructions
```

## 分支命名

使用描述性前缀：

- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `chore/` - 维护任务

### 示例

```text
feature/user-authentication
fix/null-pointer-exception
docs/api-reference
```


````

## Usage

After installing the plugin containing this skill:

```text
$ claude
> What format should I use for commit messages?

[Skill loads and provides Conventional Commits guidance]
````

## 要点

1. **单文件**：只需要 SKILL.md
2. **强触发词**：Description 包含用户会说的具体短语
3. **第三人称 description**：`This skill should be used when...`
4. **祈使式正文**：指令使用 `Follow...`、`Use...`，而不是 `You should...`
5. **内容聚焦**：约 300 词，不需要外部资源

## 何时使用此模式

- 简单领域知识
- 快速参考指南
- 团队约定和标准
- 单主题工具
- 学习 skill development

## 扩展此 Skill

添加更多功能时：

1. **添加 references**：创建 `references/` 保存详细文档
2. **添加 examples**：创建 `examples/` 保存可运行代码示例
3. **添加 scripts**：创建 `scripts/` 保存自动化工具
