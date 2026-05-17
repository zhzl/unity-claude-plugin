---
name: marketplace-structure
description: 当用户要求 "create a marketplace"、"set up marketplace.json"、"organize multiple plugins"、"distribute plugins"、"host plugins"、了解 marketplace schema、plugin marketplace structure、multi-plugin organization、strictKnownMarketplaces、private marketplace、marketplace auth、"pin plugin version"、hostPattern，或需要关于 plugin marketplace 创建、marketplace.json 配置、plugin distribution 策略的指导时，应使用此技能。
---

# Marketplace 结构

plugin marketplace 是一个可用 plugins 的目录，可实现集中式发现、版本管理和 distribution。此技能涵盖如何创建与维护 marketplace，以支持团队或社区级的 plugin 分发。

## 概览

marketplace 提供：

- **集中式发现** - 在一个位置浏览来自多个来源的 plugins
- **版本管理** - 自动跟踪并更新 plugin versions
- **团队分发** - 在组织内共享必需 plugins
- **灵活来源** - 支持相对路径、GitHub repos 与 git URLs

### 何时创建 Marketplace，何时创建 Plugin

| 创建 Plugin | 创建 Marketplace |
| ----------- | ---------------- |
| 单一用途扩展 | 相关 plugins 的集合 |
| 由终端用户直接使用 | 用于分发多个 plugins |
| 由单个团队或个人维护 | 从多种来源中精选 plugins |
| 通过 `/plugin install` 安装 | 通过 `/plugin marketplace add` 添加 |

## 目录结构

将 `marketplace.json` 放在仓库根目录下的 `.claude-plugin/` 目录中：

```text
marketplace-repo/
├── .claude-plugin/
│   └── marketplace.json      # Required: Marketplace manifest
├── plugins/                  # Optional: Local plugin directories
│   ├── plugin-one/
│   │   └── .claude-plugin/
│   │       └── plugin.json
│   └── plugin-two/
│       └── .claude-plugin/
│           └── plugin.json
└── README.md                 # Recommended: Marketplace documentation
```

## Marketplace schema 说明

`marketplace.json` manifest 用于定义 marketplace 及其中可用的 plugins。

### 必需字段

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | marketplace 标识符（kebab-case，不含空格） |
| `owner` | object | marketplace 维护者信息 |
| `plugins` | array | 可用 plugin 条目列表 |

### 所有者对象（owner）

```json
{
  "owner": {
    "name": "Team Name",
    "email": "team@example.com",
    "url": "https://github.com/team"
  }
}
```

### 可选 Metadata

```json
{
  "metadata": {
    "description": "Brief marketplace description",
    "version": "1.0.0",
    "pluginRoot": "plugins"
  }
}
```

`pluginRoot` 字段用于设置相对 plugin source 的基准路径。若使用 `pluginRoot: "plugins"`，则可写 `./code-standards` 这类 source；若未设置 `pluginRoot`，则应写成 `./plugins/code-standards` 这类路径。

## Plugin 条目格式

`plugins` 数组中的每个 plugin 至少需要：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | plugin 标识符（kebab-case，且在 marketplace 内唯一） |
| `source` | string or object | 获取 plugin 的位置 |

### 可选 Plugin 字段

标准 metadata 字段：

- `description` - 简短的 plugin 描述
- `version` - plugin 版本（semver）
- `author` - 作者信息 object
- `homepage` - 文档 URL
- `repository` - 源码 URL
- `license` - SPDX license 标识符
- `keywords` - 用于发现的 tags
- `category` - plugin 分类
- `tags` - 额外的可搜索 tags

组件配置字段：

- `commands` - command 文件或目录的自定义路径
- `agents` - agent 文件的自定义路径
- `hooks` - hooks 配置或 hooks 文件路径
- `mcpServers` - MCP server 配置

完整字段参考见 `references/schema-reference.md`。

## Plugin 来源

### 相对路径

适用于位于同一仓库中的 plugins：

```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin"
}
```

### GitHub 仓库

```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo"
  }
}
```

### 带 Pinning 的 GitHub 仓库

为实现可复现构建，可 pin 到特定 ref 或 commit SHA：

```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo",
    "ref": "v1.2.0",
    "sha": "abc123def456..."
  }
}
```

- `ref` — branch、tag 或 commit reference（例如 `"v1.0"`、`"main"`）
- `sha` — 用于完整性校验的精确 commit SHA

### Git URL

适用于 GitLab、Bitbucket 或自托管 git：

```json
{
  "name": "git-plugin",
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git",
    "ref": "main"
  }
}
```

## Strict 与 Non-Strict 模式

`strict` 字段控制 plugin 是否必须拥有自己的 `plugin.json`：

| 模式 | 行为 |
| ---- | ---- |
| `strict: true` (default) | plugin 必须包含 `plugin.json`；marketplace 条目会对其进行补充 |
| `strict: false` | `plugin.json` 可选；marketplace 条目会作为完整 manifest |

以下场景适合使用 `strict: false`：

- 精选外部 plugins，但不修改其源码
- 在 marketplace 条目中直接提供全部 metadata
- plugin 目录仅包含 commands/agents/skills，而没有 manifest

```json
{
  "name": "external-plugin",
  "source": {
    "source": "github",
    "repo": "external/plugin"
  },
  "description": "Complete metadata here",
  "version": "2.0.0",
  "strict": false
}
```

## 企业特性

### 托管 Marketplace 限制

组织可通过托管 settings 限制用户可以从哪些 marketplace 安装：

```json
{
  "strictKnownMarketplaces": []
}
```

空数组表示进入 lockdown 模式，即没有额外批准的 marketplace 来源。若要允许特定 marketplace，请列出其 source objects：

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "company/claude-plugins" }
  ]
}
```

如果 `strictKnownMarketplaces` 未定义，Claude Code 会使用默认的 known marketplace 行为。若它被设置为数组，用户便只能从已批准的 marketplace sources 安装 plugins。host/path patterns 应配置在托管 marketplace 限制中，而不是 plugin `source` 条目中。

### 私有仓库认证

对于托管在私有仓库中的 marketplace，请设置相应环境变量：

- **GitHub**: `GITHUB_TOKEN`
- **GitLab**: `GITLAB_TOKEN`
- **Bitbucket**: `BITBUCKET_TOKEN`

配置细节见 `references/distribution-patterns.md`。

### 保留的 Marketplace 名称

某些 marketplace 名称由 Anthropic 保留作官方用途。自定义 marketplace 应选择有辨识度的名称，以避免冲突。

### 基于 URL 的 Marketplace 限制

通过 URL 添加的 marketplace（而非 git source）对 plugin source 中的相对路径支持有限。相对路径可能无法被正确解析，因此更推荐使用绝对 source 引用，或直接采用基于 git 的 marketplace。

## 最佳实践

### 组织方式

- **一个 marketplace 一个主题** - 将相关 plugins 分组（例如 "frontend-tools"、"security-plugins"）
- **清晰命名** - marketplace 与 plugins 都使用描述性 kebab-case 名称
- **所有条目都写 version** - 每个 plugin 条目都包含 `version`
- **为每个 plugin 写说明** - 提供 `description` 以提升可发现性

### 版本管理

- 对 marketplace `metadata.version` 使用语义化版本（X.Y.Z）
- 当新增、移除或更新 plugins 时同步更新 marketplace version
- 可考虑提供 CHANGELOG.md 来跟踪变更

### 分发

- **GitHub 托管** - 最简单的分发方式：`/plugin marketplace add owner/repo`
- **团队 settings** - 在 `.claude/settings.json` 中配置 `extraKnownMarketplaces`
- **本地测试** - 开发期间通过 `/plugin marketplace add ./path` 添加

更详细的 distribution 模式见 `references/distribution-patterns.md`。

### 校验

发布前请先校验 marketplace 结构：

```bash
# Check JSON syntax
jq . .claude-plugin/marketplace.json

# Verify required fields
jq 'has("name") and has("owner") and has("plugins")' .claude-plugin/marketplace.json
```

使用带 marketplace 支持的 `plugin-validator` agent 可以进行更全面的校验。

## 完整示例

```json
{
  "name": "team-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@company.com",
    "url": "https://github.com/company"
  },
  "metadata": {
    "description": "Internal development tools for the engineering team",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting on save",
      "version": "2.1.0"
    },
    {
      "name": "security-scanner",
      "source": {
        "source": "github",
        "repo": "company/security-plugin"
      },
      "description": "Security vulnerability detection",
      "version": "1.5.0",
      "category": "security"
    }
  ]
}
```

## 额外资源

- `references/schema-reference.md` - marketplace.json 的完整字段参考
- `references/distribution-patterns.md` - 托管与团队分发策略
- `examples/minimal-marketplace.md` - 单 plugin marketplace 模板
- `examples/team-marketplace.md` - 公司内部 marketplace 模板
- `examples/community-marketplace.md` - 公开多 plugin marketplace 模板

## 相关技能

- **plugin-structure** - 了解单个 plugin `plugin.json` 细节
- **plugin-validator** agent - 用于校验 marketplace 结构
- **`/plugin-dev:create-marketplace`** - 引导式 marketplace 创建工作流

## 可工作的示例

可将本技能中的示例直接作为 marketplace 模板使用。本仓库中的 `plugins/plugin-dev/.claude-plugin/plugin.json` 是 plugin manifest，不是根级 marketplace manifest.
