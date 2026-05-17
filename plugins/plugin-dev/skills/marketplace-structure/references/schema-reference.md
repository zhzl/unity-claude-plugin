# Marketplace schema 参考说明

`marketplace.json` 与 plugin 条目的完整字段参考。

## Marketplace 根字段

### 必需字段

| 字段 | 类型 | 约束 | 说明 |
| ---- | ---- | ---- | ---- |
| `name` | string | kebab-case, 3-50 chars | 唯一的 marketplace 标识符 |
| `owner` | object | 参见所有者对象（owner） | marketplace 维护者信息 |
| `plugins` | array | 至少 1 个条目 | 可用 plugin 条目列表 |

### 可选 Metadata 对象

```json
{
  "metadata": {
    "description": "string",
    "version": "string",
    "pluginRoot": "string"
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `description` | string | 简短的 marketplace 描述（1-200 chars） |
| `version` | string | marketplace 版本（建议使用 semver X.Y.Z） |
| `pluginRoot` | string | 相对 plugin source 的基准路径 |

## 所有者对象（owner）

### 必需所有者字段

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | 维护者名称（个人或组织） |

### 可选所有者字段

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `email` | string | 联系邮箱地址 |
| `url` | string | 维护者主页或个人资料 URL |

### 示例

```json
{
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@company.com",
    "url": "https://github.com/company"
  }
}
```

## Plugin 条目字段

### 必需 Plugin 字段

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | plugin 标识符（kebab-case，且在 marketplace 内唯一） |
| `source` | string or object | 获取 plugin 的位置（参见 Source 类型） |

### 可选标准 Metadata

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `description` | string | 简短的 plugin 描述 |
| `version` | string | plugin 版本（semver X.Y.Z） |
| `author` | object | plugin 作者（与 owner 相同格式） |
| `homepage` | string | plugin 文档 URL |
| `repository` | string | 源码仓库 URL |
| `license` | string | SPDX license 标识符（MIT、Apache-2.0 等） |
| `keywords` | array | 用于发现的字符串 tags |
| `category` | string | plugin 分类（productivity、security 等） |
| `tags` | array | 额外的可搜索 tags |

### Marketplace 特有字段

| 字段 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| `strict` | boolean | `true` | 要求 plugin 文件夹内存在 `plugin.json` |

### 组件配置字段

这些字段会覆盖或补充 plugin 组件路径：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `commands` | string or array | command 文件或目录的自定义路径 |
| `agents` | string or array | agent 文件的自定义路径 |
| `hooks` | string or object | hooks 配置或 hooks 文件路径 |
| `mcpServers` | string or object | MCP server 配置或其路径 |

## Source 类型

### 相对路径（String）

适用于同一仓库中的 plugins：

```json
{
  "source": "./plugins/my-plugin"
}
```

路径相对于以下位置解析：

1. 若指定，则相对于 `metadata.pluginRoot`
2. 否则相对于仓库根目录

例如，当 `metadata.pluginRoot: "plugins"` 时，使用 `"source": "./my-plugin"`；未设置 `pluginRoot` 时，则使用 `"source": "./plugins/my-plugin"`。

当 schema 与仓库布局需要时，`../` 路径也是有效的，但应将其视为可移植性权衡。它比放在 `pluginRoot` 或其他仓库内基准路径下的路径更依赖 checkout 布局和调用方的工作假设，因此使用时最好明确记录这一前提。
### GitHub 仓库（Object）

```json
{
  "source": {
    "source": "github",
    "repo": "owner/repo-name",
    "ref": "v1.0",
    "sha": "abc123..."
  }
}
```

| 字段 | 类型 | 必需 | 说明 |
| ---- | ---- | ---- | ---- |
| `source` | string | Yes | 必须为 `"github"` |
| `repo` | string | Yes | `owner/repo` 格式的 GitHub 仓库 |
| `ref` | string | No | branch、tag 或 commit 引用 |
| `sha` | string | No | 用于完整性 pinning 的精确 commit SHA |

### Git URL（Object）

适用于 GitLab、Bitbucket 或自托管 git 仓库：

```json
{
  "source": {
    "source": "url",
    "url": "https://gitlab.com/team/plugin.git",
    "ref": "main"
  }
}
```

| 字段 | 类型 | 必需 | 说明 |
| ---- | ---- | ---- | ---- |
| `source` | string | Yes | 必须为 `"url"` |
| `url` | string | Yes | 完整 git clone URL |
| `ref` | string | No | branch 或 tag 引用 |
| `sha` | string | No | 用于完整性校验的精确 commit SHA |

## 完整 Plugin 条目示例

**注意：** 下方示例中的 `${CLAUDE_PLUGIN_ROOT}` 变量会解析为 plugin 的绝对安装路径。对 hooks 和 MCP server 配置中的可移植路径，请使用该变量，以确保无论 plugin 安装到哪里，路径都能正确工作。

包含所有可选字段的高级 plugin 条目：

```json
{
  "name": "enterprise-tools",
  "source": {
    "source": "github",
    "repo": "company/enterprise-plugin"
  },
  "description": "Enterprise workflow automation tools",
  "version": "2.1.0",
  "author": {
    "name": "Enterprise Team",
    "email": "enterprise@company.com"
  },
  "homepage": "https://docs.company.com/plugins/enterprise-tools",
  "repository": "https://github.com/company/enterprise-plugin",
  "license": "MIT",
  "keywords": ["enterprise", "workflow", "automation"],
  "category": "productivity",
  "tags": ["enterprise", "automation"],
  "commands": ["./commands/core/", "./commands/enterprise/"],
  "agents": ["./agents/security-reviewer.md", "./agents/compliance-checker.md"],
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
          }
        ]
      }
    ]
  },
  "mcpServers": {
    "enterprise-db": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  },
  "strict": false
}
```

## 严格模式（strict mode）细节

### strict: true（默认）

- plugin 目录必须包含 `.claude-plugin/plugin.json`
- marketplace 条目会补充 plugin manifest 中的值
- 若字段冲突，以 plugin manifest 为准

### strict: false

- plugin 目录中的 `plugin.json` 为可选
- 若不存在 `plugin.json`，marketplace 条目会作为完整 plugin manifest
- 适合精选外部 plugins，或仅包含轻量目录结构的 plugins

### 何时使用 strict: false

| 场景 | 原因 |
| ---- | ---- |
| 外部 plugins | 无法修改外部 source 来添加 plugin.json |
| 最小 plugins | plugin 仅包含 commands/agents，无需额外 manifest |
| 条目中提供完整 metadata | 所有 plugin 信息都在 marketplace 条目中提供 |
| 旧版 plugins | 较旧的 plugin 没有 manifest 文件 |

## 校验规则

### Marketplace 层级

- `name` 必须为 kebab-case（小写字母、数字、连字符）
- `name` 长度必须为 3-50 个字符
- `owner.name` 为必需字段
- `plugins` 数组至少要有一个条目
- `plugins` 数组中不能有重复的 plugin name

### Plugin 条目层级

- `name` 必须为 kebab-case
- `name` 在 marketplace 内必须唯一
- `source` 必须有效（字符串路径或可识别的 source object）
- 若提供 `version`，应遵循 semver
- 若提供 `license`，应为有效的 SPDX 标识符

### Source 校验

- 相对路径：必须以 `./` 或 `../` 开头
- GitHub source：`repo` 必须是 `owner/repo` 格式
- URL source：必须是有效的 git URL

## Schema 关系

plugin 条目构建在 plugin manifest schema 之上：

```text
plugin.json schema (all fields optional in marketplace entry)
    + marketplace-specific fields (source, strict, category, tags)
    = marketplace plugin entry
```

这意味着任何在 `plugin.json` 中有效的字段，也都可以用于 marketplace 条目。

## 企业级 settings

组织可以通过托管 settings 控制 marketplace 行为：

| 设置项 | 类型 | 说明 |
| ------ | ---- | ---- |
| `strictKnownMarketplaces` | array | 已批准 marketplace source 的托管 allowlist |
| `enabledPlugins` | object | 预配置启用 plugins 的布尔映射 |
| `extraKnownMarketplaces` | object | 内置 marketplace 之外的额外已批准 marketplaces |

### 托管 settings 示例

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "company/claude-plugins" }
  ],
  "enabledPlugins": {
    "security-scanner@company-tools": true
  },
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "company/claude-plugins"
      }
    }
  }
}
```

托管型 marketplace 限制也可以使用 host/path patterns，例如 `hostPattern`，以约束被批准的 marketplace 位置。这些 patterns 属于托管 settings，而不属于 marketplace plugin 的 `source` objects。

这些 settings 由管理员配置，个人用户无法覆盖。
