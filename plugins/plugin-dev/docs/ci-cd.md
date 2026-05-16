# CI/CD 工作流

当仓库中存在这些仓库文件时，本文档说明 GitHub Actions 工作流、标签（labels）和模板。

## PR 工作流

| 工作流（Workflow）         | 触发条件                       | 用途                       |
| -------------------------- | ------------------------------ | -------------------------- |
| `markdownlint.yml`         | `**.md` 变更                   | 检查 Markdown 文件         |
| `links.yml`                | `**.md` 变更                   | 检查失效链接               |
| `component-validation.yml` | 插件组件变更                   | 验证插件组件               |
| `version-check.yml`        | 版本文件变更                   | 确保版本一致性             |
| `validate-workflows.yml`   | `.github/workflows/**` 变更    | 检查 GitHub Actions 工作流 |
| `yaml-lint.yml`            | `.github/workflows/**` 变更    | 检查 YAML 文件             |
| `claude-pr-review.yml`     | 所有非草稿 PR                  | AI 驱动的代码审查          |

## 其他工作流

- `claude.yml` - 主 Claude Code 工作流
- `stale.yml` - 管理过期 issue/PR（周一/周三/周五）
- `semantic-labeler.yml` - 自动为 issue/PR 添加标签
- `ci-failure-analysis.yml` - 分析 CI 失败
- `sync-labels.yml` - 同步仓库标签
- `greet.yml` - 欢迎新贡献者

## 标签（Labels）

当存在时，Issue 和 PR 可以使用在 `.github/labels.yml` 中定义的结构化标签系统：

| 类别 | 格式         | 示例                                                                                          |
| ---- | ------------ | --------------------------------------------------------------------------------------------- |
| 组件 | `component:*` | `component:skill`, `component:agent`, `component:hook`, `component:command`, `component:docs` |
| 优先级 | `priority:*`  | `priority:critical`, `priority:high`, `priority:medium`, `priority:low`                       |
| 状态 | `status:*`    | `status:blocked`, `status:in-progress`, `status:needs-review`                                 |
| 工作量 | `effort:*`    | `effort:small` (<1h), `effort:medium` (1-4h), `effort:large` (>4h)                            |

`semantic-labeler.yml` 工作流会根据变更的文件路径自动为 PR 添加标签。

## Issue 与 PR 模板

仓库可以在 `.github/` 中包含模板：

**Issue 模板**（4 种类型）：

- `bug_report.yml` - 包含复现步骤的 bug 报告
- `feature_request.yml` - 包含 use case 的功能请求
- `documentation.yml` - 文档改进
- `question.yml` - 问题与讨论

**拉取请求模板（Pull Request 模板）**：带有验证要求的按组件划分检查清单。如果存在 `CONTRIBUTING.md` 文件，请使用它作为 PR 指南。
