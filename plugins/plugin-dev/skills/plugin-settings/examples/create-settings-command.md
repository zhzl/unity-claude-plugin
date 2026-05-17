---
description: "创建包含用户偏好的 plugin settings 文件"
allowed-tools: Write, AskUserQuestion
---

# 创建 Plugin Settings

这个命令用于帮助用户创建 `.claude/my-plugin.local.md` settings 文件。

## 步骤

### 第 1 步：询问用户偏好

使用 AskUserQuestion 收集 configuration：

```json
{
  "questions": [
    {
      "question": "Enable plugin for this project?",
      "header": "Enable Plugin",
      "multiSelect": false,
      "options": [
        {
          "label": "Yes",
          "description": "Plugin will be active"
        },
        {
          "label": "No",
          "description": "Plugin will be disabled"
        }
      ]
    },
    {
      "question": "Validation mode?",
      "header": "Mode",
      "multiSelect": false,
      "options": [
        {
          "label": "Strict",
          "description": "Maximum validation and security checks"
        },
        {
          "label": "Standard",
          "description": "Balanced validation (recommended)"
        },
        {
          "label": "Lenient",
          "description": "Minimal validation only"
        }
      ]
    }
  ]
}
```

### 第 2 步：解析答案

从 AskUserQuestion 的结果中提取答案：

- answers["0"]：enabled（Yes/No）
- answers["1"]：mode（Strict/Standard/Lenient）

### 第 3 步：创建 Settings 文件

使用 Write 工具创建 `.claude/my-plugin.local.md`：

```markdown
---
enabled: <true if Yes, false if No>
validation_mode: <strict, standard, or lenient>
max_file_size: 1000000
notify_on_errors: true
---

# Plugin Configuration

Your plugin is configured with <mode> validation mode.

To modify settings, edit this file. The next hook or command invocation can read the new values; restart Claude Code only after changing hook registration or plugin configuration.
```

### 第 4 步：告知用户

告诉用户：

- Settings 文件已创建在 `.claude/my-plugin.local.md`
- 当前 configuration 摘要
- 如有需要，如何手动编辑
- 提醒：settings 内容会在下一次 hook/command 调用时读取；只有在 hook registration 或 plugin configuration 变更后才需要重启 Claude Code
- Settings 文件已被 gitignore（不会提交）

## 实现说明

写入前始终验证用户输入：

- 检查 mode 是否有效
- 验证数值字段确实是数字
- 确保路径不存在 traversal 尝试
- 清理任何 free-text 字段
