# 组件模式

插件组件 frontmatter（前置元数据）与结构参考。

## 代理（Agents）

代理（Agents）需要包含以下内容的 YAML frontmatter（前置元数据）：

- `name`: kebab-case 标识符（3-50 个字符）（必需）
- `description`: 以 "Use this agent when..." 开头，包含 `<example>` 块（必需）
- `model`: inherit/sonnet/opus/haiku（可选；默认值为 inherit）
- `color`: blue/cyan/green/yellow/magenta/red（可选）
- `tools`: 允许工具的逗号分隔列表（可选，allowlist/允许列表）
- `disallowedTools`: 屏蔽工具的逗号分隔列表（可选，denylist/拒绝列表 —— 二选一使用）
- `skills`: 该 agent 可加载技能的 YAML 列表（可选）
- `maxTurns`: 限制 agentic turns（自主轮次）的数量（可选）
- `memory`: 持久化 memory（user/project/local）的配置（可选）

对于随插件分发的 agents，不支持 `permissionMode`、`mcpServers` 和 `hooks`，不应在 agent frontmatter 中使用。

`skills` 结构示例：

```yaml
skills:
  - skill-name
  - another-skill
```

## 技能（Skills）

技能（Skills）需要：

- 位于 `skills/skill-name/` 的目录
- 带 YAML frontmatter（`name`、`description`）的 `SKILL.md`
- `description` 中包含强触发短语
- 渐进式披露（详细内容放在 `references/` 中）

### 技能结构（Skill 目录布局）

每个 skill 都遵循渐进式披露：

- `SKILL.md` - 核心内容（1,000-2,200 词，保持精简）
- `references/` - 按需加载到上下文中的详细文档
- `examples/` - 可直接复制粘贴的完整可运行示例和模板
- `scripts/` - 工具脚本（无需加载到上下文即可执行）

## 命令（Commands）

命令（Commands）是带 frontmatter（前置元数据）的 markdown 文件：

- `description`: 简要说明（必需）
- `argument-hint`: 可选的参数占位提示文本
- `allowed-tools`: 允许工具的逗号分隔列表（限制工具访问）
- `model`: 用于命令执行的模型（inherit/sonnet/opus/haiku）
- `disable-model-invocation`: 设为 `true` 以防止在 subagents 中调用模型（用于委派给专门 agents 的工作流命令）

## 技能与代理的可选 frontmatter（前置元数据，Skills/Agents）

**技能（Skills）** 使用 `allowed-tools`：

```yaml
allowed-tools: Read, Grep, Glob # Read-only skill
```

**代理（Agents）** 使用 `tools`（allowlist/允许列表）或 `disallowedTools`（denylist/拒绝列表）：

```yaml
tools: Read, Grep, Glob # Allowlist
# OR
disallowedTools: Bash, Write # Denylist
```

> **说明：** 字段名不同——skills 使用 `allowed-tools`，agents 使用 `tools`/`disallowedTools`。

## 钩子（Hooks）

在 `hooks/hooks.json` 中定义的 Hooks（钩子）：

- 事件（Events）：PreToolUse、PermissionRequest、PostToolUse、PostToolUseFailure、Stop、SubagentStart、SubagentStop、SessionStart、SessionEnd、UserPromptSubmit、PreCompact、Notification、TeammateIdle、TaskCompleted
- 类型（Types）：`prompt`（LLM-driven）、`command`（bash scripts）或 `agent`（带工具的多步骤流程）
- 使用匹配器（matchers）进行工具过滤（例如 "Write|Edit"、"\*")

### Plugin hooks.json 格式

插件 hooks 使用带 `hooks` 字段的包装格式（wrapper format/包装格式）：

```json
{
  "hooks": {
    "PreToolUse": [],
    "Stop": []
  }
}
```
