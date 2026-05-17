# 分发模式

用于托管、分发和管理 plugin marketplace 的策略。

## 托管选项

### GitHub 托管（推荐）

最简单的 distribution 方式，并自带版本控制：

```text
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── ... (optional local plugins)
└── README.md
```

**安装：**

```text
# Type in Claude Code
/plugin marketplace add owner/repo
```

**优点：**

- 为公共仓库提供免费托管
- 内置 issue 跟踪与协作
- 自动保留版本历史
- 通过 pull request 工作流添加 plugin
- 使用 GitHub Actions 做校验

### GitLab / 其他 Git 服务

任何 git 托管服务都可以使用：

```text
# Type in Claude Code
/plugin marketplace add https://gitlab.com/company/plugins.git
```

**适用场景：**

- 组织使用 GitLab、Bitbucket 或自托管 git
- 需要托管私有仓库
- 需要与现有 CI/CD 流水线集成

### 本地开发

在发布前于本地测试 marketplace：

```text
# Type in Claude Code: add local directory
/plugin marketplace add ./my-marketplace

# Add direct path to marketplace.json
/plugin marketplace add ./path/to/marketplace.json
```

## 团队分发模式

### 模式 1：共享仓库 settings

在 `.claude/settings.json` 中配置团队 marketplace（项目级或组织级）：

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    },
    "project-plugins": {
      "source": {
        "source": "url",
        "url": "https://git.company.com/project-plugins.git"
      }
    }
  }
}
```

当团队成员信任该仓库文件夹后，Claude Code 会自动安装这些 marketplaces。

### 模式 2：启用 plugins 列表

为项目预先配置必需 plugins：

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "company/plugins"
      }
    }
  },
  "enabledPlugins": {
    "security-scanner@team-tools": true,
    "code-formatter@team-tools": true
  }
}
```

### 模式 3：Monorepo Marketplace

适用于在单个仓库中维护大量 plugins 的组织：

```text
org-plugins/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    ├── security-scanner/
    ├── code-formatter/
    ├── test-runner/
    └── deployment-tools/
```

```json
{
  "name": "org-plugins",
  "owner": {
    "name": "Platform Team",
    "email": "platform@company.com"
  },
  "metadata": {
    "pluginRoot": "plugins"
  },
  "plugins": [
    { "name": "security-scanner", "source": "./security-scanner" },
    { "name": "code-formatter", "source": "./code-formatter" },
    { "name": "test-runner", "source": "./test-runner" },
    { "name": "deployment-tools", "source": "./deployment-tools" }
  ]
}
```

### 模式 4：精选外部 Plugins

用于汇集来自不同来源 plugins 的 marketplace：

```json
{
  "name": "curated-tools",
  "owner": {
    "name": "Marketplace Maintainers",
    "email": "plugins@example.com"
  },
  "plugins": [
    {
      "name": "plugin-a",
      "source": { "source": "github", "repo": "author1/plugin-a" }
    },
    {
      "name": "plugin-b",
      "source": { "source": "github", "repo": "author2/plugin-b" }
    },
    {
      "name": "internal-tool",
      "source": "./plugins/internal-tool"
    }
  ]
}
```

## 版本管理

### Marketplace 版本控制

使用语义化版本跟踪 marketplace 变更：

```json
{
  "metadata": {
    "version": "2.1.0"
  }
}
```

| 变更类型 | 版本提升 | 示例 |
| -------- | -------- | ---- |
| 破坏性变更 | 主版本（X.0.0） | 移除 plugins、重大结构调整 |
| 新功能 | 次版本（X.Y.0） | 新增 plugins、新增 categories |
| 修复 | 补丁版本（X.Y.Z） | 更新版本、修复 metadata |

### Plugin 版本跟踪

始终在 plugin 条目中包含 version：

```json
{
  "name": "my-plugin",
  "version": "1.2.3",
  "source": "./plugins/my-plugin"
}
```

### 更新工作流

```text
# Type in Claude Code: refresh marketplace metadata
/plugin marketplace update marketplace-name

# Check for plugin updates
/plugin marketplace list
```

## 多环境分发

### 开发环境 vs. 生产环境

为不同环境维护独立的 marketplace：

```text
plugins-repo/
├── .claude-plugin/
│   └── marketplace.json           # Stable plugins
├── staging/
│   └── .claude-plugin/
│       └── marketplace.json       # Pre-release testing
└── plugins/
```

### Feature Branches

对实验性 plugins 使用 git branches：

```text
# Type in Claude Code: add marketplace from specific branch
/plugin marketplace add owner/repo#feature-branch
```

## 私有仓库认证

对于托管在私有仓库中的 marketplaces 和 plugins，Claude Code 通过环境变量进行认证：

| 服务 | 环境变量 | 格式 |
| ---- | -------- | ---- |
| GitHub | `GITHUB_TOKEN` | 个人访问令牌（PAT） |
| GitLab | `GITLAB_TOKEN` | 个人或项目 token |
| Bitbucket | `BITBUCKET_TOKEN` | 应用密码或 token |

### 配置

在添加私有 marketplace 前，先设置对应 token：

```text
# In your shell, set the token first:
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
# Then type in Claude Code:
/plugin marketplace add company/private-plugins

# In your shell, set the token first:
export GITLAB_TOKEN="glpat-xxxxxxxxxxxx"
# Then type in Claude Code:
/plugin marketplace add https://gitlab.company.com/team/plugins.git
```

这些 tokens 会在 clone 和更新 marketplace 内容时使用。请确保 token 具有仓库读取权限。

### 使用私有仓库进行团队分发

对于团队场景，在项目 settings 中添加 marketplace，并记录所需环境变量：

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    }
  }
}
```

团队成员必须设置具备私有仓库访问权限的 `GITHUB_TOKEN`。

## 安全注意事项

### 访问控制

- **公开 marketplaces**：任何人都可以安装 plugins
- **私有仓库**：只有已授权用户可以访问（通过环境变量 token）
- **团队 settings**：控制哪些 marketplaces 会被自动安装

### Plugin 校验

在将外部 plugin 添加到你的 marketplace 前：

1. 审查源码中的安全问题
2. 检查是否存在硬编码凭据
3. 验证 hook 命令是否安全
4. 在隔离环境中测试

### 安全分发检查清单

- [ ] 所有 git URL 都使用 HTTPS
- [ ] 托管型 MCP servers 使用 HTTPS，而不是 HTTP
- [ ] marketplace.json 中不包含凭据
- [ ] 在精选外部 plugins 前先完成审查
- [ ] 敏感工具使用私有仓库

## Marketplace 管理命令

### 列出 Marketplaces

```text
/plugin marketplace list
```

### 更新 Marketplace

```text
/plugin marketplace update marketplace-name
```

### 移除 Marketplace

```text
/plugin marketplace remove marketplace-name
```

**注意：** 移除 marketplace 会同时卸载其中的所有 plugins。

### 安装 Plugins

```text
# Type in Claude Code: install from specific marketplace
/plugin install plugin-name@marketplace-name

# Browse available plugins
/plugin
```

## 故障排查

### Marketplace 未加载

1. 确认 URL/路径可访问
2. 检查正确路径下是否存在 `.claude-plugin/marketplace.json`
3. 校验 JSON 语法
4. 确认访问权限（针对私有仓库）

### Plugin 安装失败

1. 确认 plugin source URL 可访问
2. 检查 plugin 目录是否包含所需文件
3. 对于 GitHub source，确认仓库公开或当前具备访问权限
4. 通过手动 clone 测试 plugin source

### 校验命令

```bash
# Validate JSON syntax
jq . .claude-plugin/marketplace.json

# Check required fields
jq 'has("name") and has("owner") and has("plugins")' \
  .claude-plugin/marketplace.json

# Validate in Claude Code
claude plugin validate .
```

## 迁移模式

### 从单个 Plugin 迁移到 Marketplace

1. 创建 `.claude-plugin/marketplace.json`
2. 将 plugin 移动到 `plugins/` 子目录
3. 添加带相对 source 的 plugin 条目
4. 更新安装说明

### 合并多个 Plugins

1. 创建新的 marketplace 仓库
2. 将每个 plugin 添加为条目（相对 source 或外部 source）
3. 测试所有 plugins 的安装
4. 将用户迁移到基于 marketplace 的安装方式
