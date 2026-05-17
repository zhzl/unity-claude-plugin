# Plugins 的 GitHub Actions 集成

这是 Anthropic 官方用于在 CI workflow 中运行 Claude Code 的 action。理解这种集成有助于 plugin 开发者确保 plugin 在自动化 pipeline 中顺畅工作。

## 概览

`claude-code-action@v1` 会在 GitHub Actions 内运行 Claude Code，从而支持：

- 对 PRs 进行自动化代码审查
- 通过 comments 处理 issues
- 由 @claude mentions 触发的自定义自动化
- 定期分析和报告

## 设置

### 快速设置

在 Claude Code 内运行：

```bash
/install-github-app
```

这会引导安装 Claude GitHub App 并配置 workflows。

### 手动设置

1. 安装 Claude GitHub App：`https://github.com/apps/claude`
2. 将 `ANTHROPIC_API_KEY` 添加到 repository secrets
3. 在 `.github/workflows/claude.yml` 创建 workflow file

### 基础 workflow

```yaml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  claude:
    runs-on: ubuntu-latest
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Actions 中的 Plugins 工作方式

### CLAUDE.md 集成

Plugins 与 CI 交互最直接的方式是通过 CLAUDE.md。项目级说明（`.claude/CLAUDE.md`）会在 CI 运行中自动加载，提供：

- 代码风格要求
- 审查标准
- 项目特定规则
- Plugin 引用

### CI 中的 Hooks

Plugin hooks 在 CI 环境中执行：

- **Command hooks：** 正常运行（确保 scripts 可执行且依赖可用）
- **Prompt hooks：** 按预期工作
- **SessionStart hooks：** 在每次 CI 运行开始时触发
- **Environment：** 会设置 `$CI=true`，可用于条件逻辑

**CI-aware hook 示例：**

```bash
#!/bin/bash
# Skip interactive checks in CI
if [ "$CI" = "true" ]; then
  echo '{"continue": true}'
  exit 0
fi
# Full validation in local development
# ...
```

### 通过 `prompt` parameter 使用 Skills

在 workflow 的 `prompt` parameter 中引用 plugin skills：

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Review this PR for security issues following our coding standards"
    claude_args: "--max-turns 15"
```

由于 slash commands 在 headless 模式中不可用，请改为描述任务。Claude 可以从已安装 skills 的描述中发现它们，并可能基于上下文调用匹配的 skill；但完整的 `SKILL.md` body 只有在 Claude 实际调用该 skill 时才会加载。

## 配置选项（configuration options）

### 关键 parameters

| Parameter | 用途 | 示例 |
| ------------------- | ----------------------- | -------------------------------------- |
| `prompt` | 给 Claude 的 instructions | `"Review this PR"` |
| `claude_args` | CLI 参数（CLI arguments） | `"--max-turns 10 --model haiku"` |
| `anthropic_api_key` | API key secret（API 密钥 secret） | `${{ secrets.ANTHROPIC_API_KEY }}` |
| `github_token` | GitHub API 访问权限（GitHub API access） | `${{ secrets.GITHUB_TOKEN }}` |
| `trigger_phrase` | 自定义触发器 | `"@review-bot"`（默认：`"@claude"`） |

### 用于控制 plugin 的 claude_args

通过 `claude_args` 传递 CLI flags：

```yaml
claude_args: >-
  --max-turns 20
  --model claude-sonnet-4-5-20250929
  --allowedTools "Read,Grep,Glob,Bash(npm *)"
```

### 自定义 trigger phrases

更改默认 `@claude` trigger：

```yaml
trigger_phrase: "@security-review"
```

随后用户在 PR comments 中提及 `@security-review` 即可触发 workflow。

## Provider 配置

### AWS Bedrock

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    use_bedrock: "true"
    claude_args: "--model us.anthropic.claude-sonnet-4-5-20250929-v1:0"
  env:
    AWS_ROLE_TO_ASSUME: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    AWS_REGION: us-east-1
```

需要带 Bedrock 权限的 AWS OIDC 配置。

### Google Vertex AI

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    use_vertex: "true"
    claude_args: "--model claude-sonnet-4@20250514"
  env:
    ANTHROPIC_VERTEX_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    CLOUD_ML_REGION: us-east5
```

需要 GCP Workload Identity Federation。

## 成本管理（cost management）

### 限制 turns

```yaml
claude_args: "--max-turns 10"
```

每个 tool call 都是一个 turn。先从较低值开始，再按需增加。

### 使用更低成本的 models

```yaml
claude_args: "--model haiku"
```

日常检查使用 Haiku，标准审查使用 Sonnet，复杂分析使用 Opus。

### 设置 workflow timeouts

```yaml
jobs:
  claude:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: anthropics/claude-code-action@v1
        # ...
```

### 限制 tool access

```yaml
claude_args: "--allowedTools 'Read,Grep,Glob'"
```

只读工具可防止昂贵的写入/执行循环。

## 面向 CI 的 Plugin 设计

### 记录 CI workflows

在你的 plugin README 中包含示例 workflow snippets：

```markdown
## GitHub Actions Usage

Add to `.github/workflows/claude.yml`:

\`\`\`yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Analyze code using [your-plugin] standards"
    claude_args: "--max-turns 15 --allowedTools 'Read,Grep,Glob'"
\`\`\`
```

### 确保 CI 兼容性

- 使用 `CI=true` 环境变量测试 hooks
- 确保 scripts 不需要交互式输入
- 优雅处理缺失依赖（并非所有 CI 镜像都有 `jq` 等）
- 所有路径都使用 `${CLAUDE_PLUGIN_ROOT}`（缓存目录在 CI 中不同）

### CI 中的 MCP servers

随 plugins 打包的 MCP servers 会在 CI 中启动，但：

- 基于 OAuth 的服务器不会有令牌（请改为配置环境变量）
- 本地 stdio 服务器需要其依赖已安装在 CI 镜像中
- 在 README 中记录必需的 CI 设置
