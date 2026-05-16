# 高级 Skill Frontmatter 字段

本参考说明超出核心 `name` 和 `description` 要求的 frontmatter 字段。这些字段支持 model 选择、作用域 hooks，以及 context budget 优化。

## model

覆盖 skill 激活时使用的 model。

### 取值

| 取值          | 行为                                                  |
| ------------- | ----------------------------------------------------- |
| `inherit`     | 使用当前对话的 model（默认）                          |
| `sonnet`      | Claude Sonnet — 性能与成本均衡                        |
| `opus`        | Claude Opus — 能力最强，成本最高                      |
| `haiku`       | Claude Haiku — 速度最快，成本最低                     |
| Full model ID | 指定版本（例如 `claude-sonnet-4-5-20250929`）         |

### 何时使用各取值

- **`inherit`（默认）：** 适用于大多数 skills。让用户的 model 选择生效。
- **`haiku`：** 快速且成本敏感的操作 — linting、格式检查、简单查找。适合频繁运行的 skills。
- **`sonnet`：** 标准 workflow — code review、生成、分析。均衡的默认选择。
- **`opus`：** 复杂推理 — 架构决策、安全审计、需要最高能力的详细分析。
- **Full model ID：** 当 skill 行为依赖精确 model 能力时，固定到特定版本。

### 示例

```yaml
---
name: quick-lint
description: This skill should be used for fast code quality checks...
model: haiku
---
```

### 说明

- 简写名称（`sonnet`、`opus`、`haiku`）会解析为各 model family 的当前默认版本
- `model` 字段与 commands 共用（语法和行为相同）
- 设置 `context: fork` 时，该 model 会应用于 forked subagent

## hooks（Scoped Hooks）

定义仅在使用该 skill 时激活的 hooks，而不是对所有 tool calls 全局激活。

### 概念

不同于 `hooks.json`（plugin 激活时全局生效），frontmatter 中的 scoped hooks 与 skill 生命周期绑定。它们在 skill 加载时激活，并在 skill 完成时停用。这允许 skill-specific validation，而不会影响其他 workflows。

### 格式

`hooks` 字段使用与 `hooks.json` 相同的 event/matcher/hook 结构：

```yaml
---
name: validated-writer
description: Write files with safety validation...
hooks:
  PreToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/validate-write.sh"
          timeout: 10
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/post-write-check.sh"
---
```

### 支持的事件

Scoped hooks 支持 hook events 的子集：

| Event         | 用途                                           |
| ------------- | ---------------------------------------------- |
| `PreToolUse`  | 在执行前验证或阻止 tool calls                  |
| `PostToolUse` | 在 tool 成功执行后运行检查                     |
| `Stop`        | 在 skill 结束前验证完成条件                    |

其他事件（`SessionStart`、`UserPromptSubmit` 等）是 session-level，不适用于 skill 作用域。

### 与 hooks.json 的对比

| 方面     | `hooks.json`                               | Frontmatter `hooks`                           |
| -------- | ------------------------------------------ | --------------------------------------------- |
| 作用域   | 全局（plugin 启用时始终激活）              | Skill-specific（仅在使用 skill 时激活）       |
| 事件     | 全部 11+ hook events                       | PreToolUse, PostToolUse, Stop                 |
| 位置     | `hooks/hooks.json` 文件                    | SKILL.md 中的 YAML frontmatter                |
| 用例     | Plugin-wide validation、logging            | Skill-specific safety checks                  |

### 用例

- **Skill-specific validation：** “database writer” skill 在执行前验证 SQL
- **受限 workflows：** “deploy” skill 在允许 Bash commands 前检查 branch 和 test 状态
- **质量门禁：** “code generator” skill 在每次 Write operation 后运行 linting

### Frontmatter 中的 Hook 类型

`command` 和 `prompt` 两种 hook types 都可用于 frontmatter：

**Command hook**（执行脚本）：

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/check-safety.sh"
```

**Prompt hook**（LLM evaluation — 用于 Stop events）：

```yaml
hooks:
  Stop:
    - matcher: "*"
      hooks:
        - type: prompt
          prompt: 'Verify that all generated code has tests. Return {"decision": "block", "reason": "missing tests for..."} only when work should continue; omit decision when satisfied.'
```

## Skill Visibility Budget

Claude Code 会为 skill descriptions 分配字符预算，以高效管理 context window 使用量。

### 工作方式

1. 所有已安装 skills 的 `description` 文本都会计入共享预算
2. 默认预算：约为 context window 的 2%，或使用 ~16KB fallback（由 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 控制）
3. 当 descriptions 总量超过预算时，优先级较低的 skills 可能会从 auto-discovery 中排除
4. 被排除的 skills 仍可通过显式 `/skill-name` 调用 — 只是不会 auto-trigger

### 哪些内容计入预算

- `description` frontmatter 字段文本
- Skill name 和 metadata 开销
- 这会跨所有已安装 plugins 生效，不只限于当前 plugin

### 优化策略

1. **保持 descriptions 简洁：** `description` 字段目标为 100-300 个字符
2. **使用 trigger phrases，而不是解释：** “create a hook”、“add PreToolUse” 优于 “This skill provides comprehensive guidance for creating event-driven automation...”。
3. **将细节移到 SKILL.md 正文：** 正文只在 skill 触发时加载，不在 discovery 阶段加载
4. **Progressive disclosure：** Description（始终加载）→ SKILL.md body（触发时加载）→ references（按需加载）

### 检查预算使用量

- `/context` command 会显示 context 使用情况，包括超过预算时被排除的 skills
- Environment variable：`SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` 可增加预算
- 通过 `claude --debug` 监控 skill loading 细节

### 实际影响

对于拥有 5-15 个 skills 的大多数 plugins，默认预算足够。以下情况会让预算成为问题：

- 同时安装多个 plugins（每个都会添加 descriptions）
- 单个 skill descriptions 超过 500 个字符
- 一个 plugin 有 20+ 个 skills，且 descriptions 冗长

## Skill Permission Syntax

Skills 可以使用 `Skill()` 语法在 settings.json allow rules 中引用：

### 精确匹配

允许调用特定 skill：

```json
{
  "permissions": {
    "allow": ["Skill(my-skill-name)"]
  }
}
```

### 带参数的前缀匹配

允许带任意参数的 skill：

```json
{
  "permissions": {
    "allow": ["Skill(my-skill-name *)"]
  }
}
```

这支持精细控制哪些 skills 可由 Claude auto-invoked，哪些需要显式用户调用。与 `disable-model-invocation` frontmatter 结合使用可获得最大控制力。

## Visual Output Generators

Skills 可以打包生成视觉输出（HTML files、charts、interactive visualizations）的 scripts，为用户提供丰富体验。

### 模式

1. 在 skill 的 `scripts/` 目录中打包脚本（Python、Node.js 等）
2. 脚本生成 HTML file 或其他视觉输出
3. Claude 负责协调：读取数据、运行脚本、呈现结果

### 示例结构

```
visualization-skill/
├── SKILL.md
├── scripts/
│   └── generate-chart.py    # Produces HTML output
└── references/
    └── chart-options.md     # Configuration reference
```

### SKILL.md 用法

```markdown
To generate the visualization:

1. Gather the data from the user's project
2. Run the script: `python ${CLAUDE_PLUGIN_ROOT}/skills/visualization-skill/scripts/generate-chart.py`
3. The script outputs an HTML file — inform the user of its location
```

Visual output generators 将 deterministic scripts 的能力与 Claude 收集 context 和呈现结果的能力结合起来。脚本负责渲染，Claude 负责数据收集和用户交互。
