# Memory 与 Rules system（规则系统）的交互

Claude Code 拥有分层的 memory 与 rules system，插件会与其交互。理解这个 system 有助于插件开发者设计出与用户现有 configuration 互补、而非冲突的组件。

## CLAUDE.md Memory 文件

### 它们是什么

CLAUDE.md 文件提供持久化指令，Claude 会在每次会话开始时读取。它们包含项目上下文、编码标准和行为指导。

### 文件位置与优先级

Memory 文件按优先级顺序加载（最高优先）：

| 优先级     | 位置                                 | 作用域                        |
| ----------- | ------------------------------------ | ----------------------------- |
| 1（最高）   | 托管策略（managed policy，system paths） | 组织范围                   |
| 2           | `.claude/CLAUDE.md` 或 `./CLAUDE.md` | Project（通过 git 共享）      |
| 3           | `.claude/rules/*.md`                 | Project rules（模块化）       |
| 4           | `~/.claude/CLAUDE.md`                | User（个人，所有项目）        |
| 5（最低）   | `.claude/CLAUDE.local.md`            | Project local（gitignored）   |

发生冲突时，优先级更高的指令会覆盖更低者。

**为什么 local 的优先级最低：** 不同于很多 configuration system 里“.local”表示“覆盖”，Claude Code 的 `.local.md` 文件用于保存个人、项目级的笔记和偏好，不应覆盖团队标准。这个 hierarchy 保证组织策略（managed）> 团队标准（project）> 个人偏好（user/local）。

### Import 语法

CLAUDE.md 文件可以 import 其他文件：

```markdown
# Project Instructions

@docs/coding-standards.md
@docs/api-conventions.md
```

**规则：**

- 路径相对于发起 import 的文件
- 也支持绝对路径
- 最大递归深度：5 hops
- code block 或 inline code span 内不会解析 imports
- 会检测并处理循环 imports

### 创建 CLAUDE.md

`/init` 命令会通过分析代码库生成一个初始 CLAUDE.md。你也可以手动创建：

```markdown
# Project Name

## Code Style

- Use TypeScript strict mode
- Follow Prettier defaults

## Architecture

- Components in src/components/
- API routes in src/api/

## Testing

- Write tests for all new features
- Use Jest with React Testing Library
```

### Auto-Memory（MEMORY.md）

Claude Code 可以使用 memory 文件在会话之间自动持久化经验：

- **`MEMORY.md`**：Claude 用于保存跨会话经验的自动生成文件
- **Topic files**：Claude 可能会创建按主题拆分的 memory 文件（例如 `MEMORY-debugging.md`）来组织知识

**Plugin 交互：**

- 插件不应写入或修改用户的 auto-memory 文件
- 带有 `memory` frontmatter 的 plugin agents 使用独立的、agent 专属的 memory 目录（见 agent-development skill）
- 如果你的插件产生了值得长期保留的知识，应引导用户保存到 CLAUDE.md，而不是依赖 auto-memory

**Import 语法说明：** `@path` import 语法在所有 CLAUDE.md 文件中都可用（project、user、local），不只根文件支持。这让 modular configuration 成为可能：

```markdown
# My CLAUDE.md

@docs/coding-standards.md
@.claude/plugin-config.md
```

## Rules system（规则系统）

### Rules 是什么

Rules 是放在 `.claude/rules/` 中的模块化指令文件，也可以可选地面向特定文件模式。它们提供按上下文加载的聚焦指导。

### 文件结构

```
.claude/
└── rules/
    ├── testing.md          # Applies globally
    ├── api-patterns.md     # Applies globally
    └── typescript.md       # Path-specific (see below)
```

### Path-specific rules（路径专用 rules）

Rules 可以使用带 glob 模式的 YAML frontmatter 指定目标文件：

```markdown
---
paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"
---

Use strict TypeScript patterns:

- No `any` types
- Explicit return types on all public functions
- Use discriminated unions over type assertions
```

**Glob 支持：**

- 标准模式：`*`、`?`、`**`
- Brace expansion：`src/**/*.{ts,tsx}`
- `paths` 数组中可放多个模式
- 模式针对项目根目录的相对路径匹配

### Rules 何时加载

Rules 会基于文件上下文自动加载：

- Global rules（没有 `paths` frontmatter）：始终加载
- Path-specific rules：当 Claude 访问匹配文件时加载
- 子目录中的 rules：可按主题组织，都会被自动发现

### User-level rules（用户级 rules）

`~/.claude/rules/` 中的个人 rules 会应用到所有项目，但优先级低于 project rules。

## Plugin 内容如何融入其中

### Plugin 内容的优先级语境

Plugin 内容的加载方式不同于 memory/rules hierarchy：

| 内容类型            | 加载方式                               | 优先级语境                          |
| ------------------- | -------------------------------------- | ----------------------------------- |
| Skill descriptions  | 作为 tool definitions（始终可用）      | 独立于 memory hierarchy             |
| Skill body (SKILL.md) | skill 触发时                         | 独立于 memory hierarchy             |
| Agent definitions   | 作为 subagent configs                  | 独立于 memory hierarchy             |
| Hook configurations | 与 user/project hooks 合并             | 与其他 hooks 并行执行               |
| MCP servers         | 作为 tool providers                    | 独立于 memory hierarchy             |

Plugin 内容不会直接与 CLAUDE.md 争夺优先级，它们通过不同机制生效（tool definitions、hooks、MCP tools）。

### 它们重叠的地方

以下情况可能产生冲突：

1. **CLAUDE.md 指令与 plugin skill guidance 矛盾** —— CLAUDE.md 因始终在上下文中而拥有隐式优先级
2. **Project rules 指定的模式与 plugin hooks 冲突** —— 两者都会生效；hooks 负责强制，rules 提供指导
3. **User settings 限制了插件所需工具** —— user settings 优先；插件应清楚记录要求

## 对插件开发者的设计启示

### 不要重复 CLAUDE.md 内容

如果项目的 CLAUDE.md 已经规定了编码标准，你的 plugin skills 不应重复说明，而应引用它们：

```markdown
Follow the project's coding standards (see CLAUDE.md) while applying
the additional [domain-specific] patterns below...
```

### 用 Rules 处理文件类型指导

如果你的插件需要针对特定文件类型的行为，请考虑它更适合作为：

- **rule**（`.claude/rules/`）：适用于某类文件、且应始终生效的指导
- **skill**：按需调用的知识
- **hook**：每次都必须执行的强制逻辑

### 理解 Override 行为

用户可以通过以下方式覆盖插件行为：

- CLAUDE.md 指令（更高优先级的上下文）
- 限制工具的 settings（`permissions.deny`）
- 通过 settings 禁用 plugin hooks

设计插件时，要保证在被 override 时依然能优雅退化，并文档化哪些 settings 会影响 plugin behavior。

### Plugin Settings（.local.md）与 Rules 的区别

Plugin settings（`.claude/plugin-name.local.md`）与 rules（`.claude/rules/`）服务于不同目的：

| 方面       | Plugin .local.md              | .claude/rules/                        |
| ---------- | ----------------------------- | ------------------------------------- |
| 用途       | Plugin 专属 configuration     | Project 级指导                        |
| 格式       | YAML frontmatter + markdown   | 可选 paths frontmatter + markdown     |
| 作用域     | 单个 plugin                   | 所有 Claude interactions              |
| 管理者     | 配置 plugin 的用户            | Project 维护者                        |
| 是否进 git | 否（gitignored）              | 是（与团队共享）                      |

### 用多种 configuration 进行测试

测试你的插件时，建议覆盖：

1. 空白 CLAUDE.md（无 project context）
2. 详细 CLAUDE.md（可能存在冲突）
3. Path-specific rules（确认 hooks 不冲突）
4. User-level rules（个人偏好）
5. Managed settings（企业限制）
