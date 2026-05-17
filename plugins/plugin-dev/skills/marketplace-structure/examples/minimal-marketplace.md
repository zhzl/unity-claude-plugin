# 最小 marketplace 示例

仅包含必需字段的单 plugin marketplace。

## 使用场景

- 快速搭建用于分发单个 plugin 的 marketplace
- 尽量减少配置负担
- 用于本地开发与测试

## 目录结构

```text
my-marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    └── my-plugin/
        └── .claude-plugin/
            └── plugin.json
```

## marketplace.json

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin"
    }
  ]
}
```

## Plugin 的 plugin.json

由于默认 `strict: true`，该 plugin 必须拥有自己的 manifest：

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A simple plugin"
}
```

## 安装

```text
# Type in Claude Code
/plugin marketplace add ./my-marketplace

# After publishing to GitHub
/plugin marketplace add your-username/my-marketplace
```

## 扩展为多个 Plugins

向数组中添加更多 plugin：

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "plugin-one",
      "source": "./plugins/plugin-one"
    },
    {
      "name": "plugin-two",
      "source": "./plugins/plugin-two"
    }
  ]
}
```
