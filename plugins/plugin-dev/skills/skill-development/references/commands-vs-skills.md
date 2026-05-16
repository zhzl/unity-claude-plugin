# Commands vs Skills：何时使用哪一种

## 相同机制，不同复杂度

command 和 skill 都：

- 通过 Skill tool 调用
- 支持 $ARGUMENTS，以及在反引号前使用字面量 `!` 执行 bash
- 支持 frontmatter（description、allowed-tools、model）
- 可以控制可调用性（disable-model-invocation）

## 决策矩阵

| 需求                    | 使用    | 位置                   |
| ----------------------- | ------- | ---------------------- |
| 简单可复用 prompt       | Command | commands/foo.md        |
| 仅动态参数              | Command | commands/foo.md        |
| validation 脚本         | Skill   | skills/foo/            |
| 参考文档                | Skill   | skills/foo/references/ |
| 可运行示例              | Skill   | skills/foo/examples/   |
| Progressive disclosure  | Skill   | skills/foo/            |

## 调用控制

| 设置                                | 用户 (/) | Claude (Skill tool) |
| ----------------------------------- | -------- | ------------------- |
| 默认                                | 是       | 是                  |
| disable-model-invocation: true      | 是       | 否                  |
| user-invocable: false（仅 skills）  | 否       | 是                  |

## 迁移：Command 到 Skill

当 command 变得复杂时：

1. 创建 `skills/name/SKILL.md`
2. 将 command 内容移动到 SKILL.md 正文（`description`、`allowed-tools`、`model` 等 frontmatter 字段的行为完全相同）
3. 添加 `references/` 存放详细文档
4. 添加 `scripts/` 存放工具脚本
5. 删除原 command 文件
