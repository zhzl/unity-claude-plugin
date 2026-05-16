# 故障排查

插件开发的扩展调试指南。

## 常见问题

| 问题 | 原因 | 解决方法 |
| ---- | ---- | -------- |
| 插件未加载 | 目录路径错误 | 使用 `plugins/plugin-dev`，不要使用仓库根目录 |
| 技能（Skill）未触发 | 触发短语不够明确 | 在 description 中添加具体的用户查询示例 |
| 钩子（Hook）未触发 | matcher 模式不正确 | 检查正则语法，并使用 `test-hook.sh` 测试 |
| 验证脚本失败 | 缺少依赖（`jq`） | 如果工作流使用这些工具，请安装 `jq` 和 shellcheck 等必需工具 |
| 技能中的 shell 执行 | 在实际 skill 或 command 文件中使用了 `[BANG]` | 在反引号前使用字面量 `!`（literal `!`）；`[BANG]` 仅是文档占位符 |

## 调试模式

运行 Claude Code 并启用调试输出：

```bash
claude --debug --plugin-dir plugins/plugin-dev
```

## 验证失败

如果组件验证失败：

1. **运行对应的校验器**，针对该组件类型执行
2. **检查 frontmatter（前置元数据）** - 确保所有必需字段都存在
3. **确认文件位置** - 组件必须位于正确的目录中
4. **检查命名** - 名称使用 kebab-case（例如 `my-agent`，而不是 `myAgent`）

## 实用脚本

相对于 `plugins/plugin-dev/` 的路径：

```bash
# Agent development
./skills/agent-development/scripts/validate-agent.sh agents/agent-name.md
./skills/agent-development/scripts/test-agent-trigger.sh agents/agent-name.md

# Command development
./skills/command-development/scripts/validate-command.sh commands/my-command.md
./skills/command-development/scripts/check-frontmatter.sh commands/my-command.md

# Hook development
./skills/hook-development/scripts/validate-hook-schema.sh hooks/hooks.json
./skills/hook-development/scripts/test-hook.sh hooks/my-hook.sh input.json

# Plugin settings
./skills/plugin-settings/scripts/validate-settings.sh .claude/my-plugin.local.md
```

## 获取更多帮助

- 查看仓库中存在的插件文档以及任何 README/FAQ 文件
- 查看仓库中存在的任何 CONTRIBUTING 指南以了解项目特定约定
- 如果卡住了，提交一个 [issue](https://github.com/sjnims/plugin-dev/issues)
