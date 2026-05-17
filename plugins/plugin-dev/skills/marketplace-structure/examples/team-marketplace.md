# 团队 marketplace 示例

带有团队 settings 集成的公司内部 marketplace。

## 使用场景

- 在工程团队内分发已批准的 plugins
- 为项目自动安装必需 plugins
- 混合使用内部 plugin 与精选的外部 plugins

## 目录结构

```text
company-plugins/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── code-standards/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/
│   │   └── hooks/
│   └── security-scanner/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── agents/
└── README.md
```

## marketplace.json

```json
{
  "name": "company-plugins",
  "owner": {
    "name": "Platform Team",
    "email": "platform@company.com",
    "url": "https://github.com/company"
  },
  "metadata": {
    "description": "Official plugins for Company engineering teams",
    "version": "2.0.0",
    "pluginRoot": "plugins"
  },
  "plugins": [
    {
      "name": "code-standards",
      "source": "./code-standards",
      "description": "Enforces company coding standards",
      "version": "1.5.0",
      "category": "quality"
    },
    {
      "name": "security-scanner",
      "source": "./security-scanner",
      "description": "Security vulnerability detection",
      "version": "2.1.0",
      "category": "security"
    },
    {
      "name": "approved-formatter",
      "source": {
        "source": "github",
        "repo": "company/code-formatter"
      },
      "description": "Company-approved code formatter",
      "version": "3.0.0"
    }
  ]
}
```

## 团队 settings 集成

添加到项目的 `.claude/settings.json`：

```json
{
  "extraKnownMarketplaces": {
    "company-plugins": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "code-standards@company-plugins": true,
    "security-scanner@company-plugins": true
  }
}
```

## 项目特定 settings

对于需要特定 plugins 的项目，提交 `.claude/settings.json`：

```json
{
  "extraKnownMarketplaces": {
    "company-plugins": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "code-standards@company-plugins": true
  }
}
```

当开发者信任该项目文件夹后，这些 plugins 会自动安装。

## 向 Marketplace 添加新 Plugins

1. 在 `plugins/` 目录中创建 plugin
2. 向 `marketplace.json` 添加条目
3. 提升 marketplace 的 `metadata.version`
4. 创建 PR 进行审查
5. 合并后，团队可运行 `/plugin marketplace update company-plugins`

## 新团队成员的安装方式

```text
# Type in Claude Code: one-time marketplace setup
/plugin marketplace add company/claude-plugins

# Install all required plugins
/plugin install code-standards@company-plugins
/plugin install security-scanner@company-plugins
```

或者通过信任项目文件夹，让项目 settings 自动安装。
