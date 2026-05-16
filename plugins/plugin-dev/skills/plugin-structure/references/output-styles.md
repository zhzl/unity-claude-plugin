# Output Styles 参考

Output styles 用于自定义 Claude 格式化和组织响应的方式。它们会直接修改 Claude 的 system prompt，提供贯穿整个对话的持久格式化指令。

## Output Styles 的工作方式

当某个 output style 处于 active 状态时，它的 markdown 内容会被注入 Claude 的 system prompt。这意味着 output styles：

- 在 active 期间应用于所有响应（不只针对特定 tool call）
- 可以覆盖默认格式化行为
- 由用户选择（不像 skills 那样自动触发）
- 可以与 CLAUDE.md 指令共存（style 在格式化方面优先）

## Frontmatter Schema

Output style 文件使用 YAML frontmatter：

```yaml
---
name: concise-reviewer
description: Terse code review output with minimal prose
keep-coding-instructions: true
---
```

| 字段 | 类型 | 必需 | 说明 |
| -------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name` | String | 是 | 在 style 选择中显示的名称 |
| `description` | String | 是 | 简要说明该 style 的作用 |
| `keep-coding-instructions` | Boolean | 否 | 当为 `true` 时，在 style 旁保留 Claude 的默认 coding instructions。当为 `false`（默认）时，style 会完全替换默认 coding instructions。 |

**`keep-coding-instructions` 使用建议：**

- 对于只修改输出格式的 styles，设为 `true`（例如“使用项目符号”“更简洁”）
- 对于会从根本上改变 Claude 角色的 styles，设为 `false`（或省略）（例如“扮演技术写作者”“只用代码回答”）

## 文件位置

Output styles 可以在多个层级定义：

| 层级 | 位置 | 作用域 |
| ------- | ---------------------------------------------- | -------------- |
| User | `~/.claude/output-styles/*.md` | 所有项目 |
| Project | `.claude/output-styles/*.md` | 单个项目 |
| Plugin | 通过 `plugin.json` 中的 `outputStyles` 引用 | Plugin 用户 |

### Plugin Bundling

Plugins 通过 `plugin.json` 中的 `outputStyles` 字段打包 output styles：

```json
{
  "outputStyles": "./styles/"
}
```

也可以使用显式路径：

```json
{
  "outputStyles": ["./styles/concise.md", "./styles/detailed.md"]
}
```

当 plugin 加载时，引用路径中的 style 文件会被发现并注册。随后用户可以从 output style 选择器中选择它们。

## Built-in Styles

Claude Code 包含用户可选择的 built-in output styles。Plugin 提供的 styles 会与 built-in styles 一起显示在 style 选择界面中。

## 何时使用 Output Styles 而不是其他组件

| 组件 | 最适合 | 持久性 |
| ----------------- | --------------------------------------- | ------------------------------ |
| **Output styles** | 响应格式、语气、结构 | Active 直到用户切换 |
| **Skills** | 领域知识、workflows、流程 | Skill invocation 期间 active |
| **Agents** | 自主多步骤任务 | Agent run 期间 active |
| **CLAUDE.md** | 项目上下文、coding standards | 始终加载 |

**适合使用 output styles 的情况：**

- 你想改变 Claude 格式化所有响应的方式（不只是在某个特定任务期间）
- 该格式化规则不依赖 Claude 正在执行什么任务
- 用户应该能够打开/关闭该行为

**不适合使用 output styles 的情况：**

- 行为只适用于特定操作期间（改用 skill）
- 你需要 tool restrictions 或 scoped hooks（使用 agent）
- 指令是项目特定标准（使用 CLAUDE.md）

## 示例：完整 Output Style

```markdown
---
name: concise-code-review
description: Minimal code review output focused on actionable findings
keep-coding-instructions: true
---

When reviewing code:

- List only actionable findings
- Use severity labels: [critical], [warning], [nit]
- No praise or filler text
- One line per finding with file:line reference
- Group by severity, highest first
```

## Plugin Developer Tips

- 让 styles 聚焦于单一格式化关注点
- 使用描述性名称，清楚说明该 style 的效果
- 除非你的 style 有意替换 coding 行为，否则设置 `keep-coding-instructions: true`
- 用不同任务类型测试 styles，确保它们不会干扰 tool use
- 在 plugin README 中记录可用 styles
