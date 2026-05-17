---
name: plugin-settings
description: 这个技能适用于用户询问 "plugin settings"、如何 "store plugin configuration"、如何构建 "user-configurable plugin"、如何使用 ".local.md files"、如何读取 "YAML frontmatter"、如何设计 "per-project plugin settings"、如何让设置与 "CLAUDE.md imports"、"rules system"、"memory hierarchy"、"memory priority" 协同工作，或希望让插件行为可配置、管理 "plugin state files" 的场景。文档说明使用 `.claude/plugin-name.local.md` 模式来保存插件专属 configuration 与状态。
---

# Claude Code 插件的 Plugin Settings 模式

## 概览

插件可以在项目目录中的 `.claude/plugin-name.local.md` 文件里保存用户可配置的 settings 和状态。这个模式使用 YAML frontmatter 保存结构化 configuration，使用 markdown 内容保存 prompt 或补充上下文。

**关键特征：**

- 文件位置：项目根目录下的 `.claude/plugin-name.local.md`
- 结构：YAML frontmatter + markdown body
- 目的：Per-project plugin configuration 和状态
- 用法：供 hooks、commands 和 agents 读取
- 生命周期：由用户管理（不进 git，应加入 `.gitignore`）

## 文件结构

### 基础模板

```markdown
---
enabled: true
setting1: value1
setting2: value2
numeric_setting: 42
list_setting: ["item1", "item2"]
---

# Additional Context

This markdown body can contain:

- Task descriptions
- Additional instructions
- Prompts to feed back to Claude
- Documentation or notes
```

### 示例：插件状态文件

**.claude/my-plugin.local.md：**

```markdown
---
enabled: true
validation_mode: standard
max_retries: 3
notification_level: info
coordinator_session: team-leader
---

# Plugin Configuration

This plugin is configured for standard validation mode.
Contact @team-lead with questions.
```

## 读取 Settings 文件

### 从 Hooks（Bash Scripts）读取

#### 模式：检查文件是否存在并解析 frontmatter

```bash
#!/bin/bash
set -euo pipefail

# Define state file path
STATE_FILE=".claude/my-plugin.local.md"

# Quick exit if file doesn't exist
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0  # Plugin not configured, skip
fi

# Parse YAML frontmatter (between --- markers)
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$STATE_FILE")

# Extract individual fields. `grep` may return no matches, so keep `set -e` safe.
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' | sed 's/^"\(.*\)"$/\1/' || true)
VALIDATION_MODE=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_mode:' | sed 's/validation_mode: *//' | sed 's/^"\(.*\)"$/\1/' || true)

# Check if enabled
if [[ "$ENABLED" != "true" ]]; then
  exit 0  # Disabled
fi

# Use configuration in hook logic
if [[ "$VALIDATION_MODE" == "strict" ]]; then
  # Apply strict validation
  # ...
fi
```

完整可运行示例见 `examples/read-settings-hook.sh`。该示例因为要读取 hook JSON 输入并输出 JSON，所以依赖 `jq`。

### 从 Commands 读取

Commands 可以读取 settings 文件来自定义行为：

```markdown
---
description: Process data with plugin
allowed-tools: Read, Bash
---

# Process Command

Steps:

1. Check if settings exist at `.claude/my-plugin.local.md`
2. Read configuration using Read tool
3. Parse YAML frontmatter to extract settings
4. Apply settings to processing logic
5. Execute with configured behavior
```

### 从 Agents 读取

Agents 可以在自己的指令中引用 settings：

```markdown
---
name: configured-agent
description: Agent that adapts to project settings
---

Check for plugin settings at `.claude/my-plugin.local.md`.
If present, parse YAML frontmatter and adapt behavior according to:

- enabled: Whether plugin is active
- mode: Processing mode (strict, standard, lenient)
- Additional configuration fields
```

## 解析技术

### 提取 Frontmatter

```bash
# Extract everything between --- markers
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")
```

### 读取单个字段

**字符串字段：**

```bash
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field_name:' | sed 's/field_name: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

**布尔字段：**

```bash
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)
# Compare: if [[ "$ENABLED" == "true" ]]; then
```

**数值字段：**

```bash
MAX=$(printf '%s\n' "$FRONTMATTER" | grep '^max_value:' | sed 's/max_value: *//' || true)
# Use: if [[ $MAX -gt 100 ]]; then
```

### 读取 Markdown Body

提取第二个 `---` 之后的内容：

```bash
# Get everything after the closing marker; later body --- lines are preserved
BODY=$(awk '
  NR == 1 {
    if ($0 == "---") {
      in_body = 0
      next
    }
    exit
  }
  in_body == 0 && /^---$/ {
    in_body = 1
    next
  }
  in_body == 1 { print }
' "$FILE")
```

## 常见模式

### 模式 1：临时激活的 Hooks

使用 settings 文件控制 hook 是否启用：

```bash
#!/bin/bash
STATE_FILE=".claude/security-scan.local.md"

# Quick exit if not configured
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Read enabled flag
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$STATE_FILE")
ENABLED=$(printf '%s\n' "$FRONTMATTER" | grep '^enabled:' | sed 's/enabled: *//' || true)

if [[ "$ENABLED" != "true" ]]; then
  exit 0  # Disabled
fi

# Run hook logic
# ...
```

**使用场景：** 无需修改 hook registration，就可以启用或禁用 hook 行为。

### 模式 2：Agent 状态管理

保存 agent 专属的状态与 configuration：

**.claude/multi-agent-swarm.local.md：**

```markdown
---
agent_name: auth-agent
task_number: 3.5
pr_number: 1234
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.4"]
---

# Task Assignment

Implement JWT authentication for the API.

**Success Criteria:**

- Authentication endpoints created
- Tests passing
- PR created and CI green
```

可以由 hooks 读取以协调 agents：

```bash
AGENT_NAME=$(printf '%s\n' "$FRONTMATTER" | grep '^agent_name:' | sed 's/agent_name: *//' || true)
COORDINATOR=$(printf '%s\n' "$FRONTMATTER" | grep '^coordinator_session:' | sed 's/coordinator_session: *//' || true)

# Send notification to coordinator
tmux send-keys -t "$COORDINATOR" "Agent $AGENT_NAME completed task" Enter
```

### 模式 3：Configuration-Driven Behavior

**.claude/my-plugin.local.md：**

```markdown
---
validation_level: strict
max_file_size: 1000000
allowed_extensions: [".js", ".ts", ".tsx"]
enable_logging: true
---

# Validation Configuration

Strict mode enabled for this project.
All writes validated against security policies.
```

在 hooks 或 commands 中使用：

```bash
LEVEL=$(printf '%s\n' "$FRONTMATTER" | grep '^validation_level:' | sed 's/validation_level: *//' || true)

case "$LEVEL" in
  strict)
    # Apply strict validation
    ;;
  standard)
    # Apply standard validation
    ;;
  lenient)
    # Apply lenient validation
    ;;
esac
```

## 创建 Settings 文件

### 从 Commands 创建

Commands 可以创建 settings 文件：

```markdown
# Setup Command

Steps:

1. Ask user for configuration preferences
2. Create `.claude/my-plugin.local.md` with YAML frontmatter
3. Set appropriate values based on user input
4. Inform user that settings are saved
5. Tell the user that settings are read on the next hook/command invocation; restart Claude Code only after changing hook registration or plugin configuration
```

### 生成模板

可以在插件 README 中提供模板：

```markdown
## Configuration

Create `.claude/my-plugin.local.md` in the project:

\`\`\`markdown
---
enabled: true
mode: standard
max_retries: 3
---

# Plugin Configuration

Settings are active.
\`\`\`

After creating or editing settings content, the next hook or command invocation can read the new values. Restart Claude Code only after changing hook registration or plugin configuration.
```

## 最佳实践

### 文件命名

✅ **建议：**

- 使用 `.claude/plugin-name.local.md` 格式
- 与插件名精确匹配
- 用户本地文件使用 `.local.md` 后缀

❌ **不要：**

- 使用其他目录（不是 `.claude/`）
- 命名不一致
- 使用不带 `.local` 的 `.md`（可能会被提交）

### Gitignore

始终添加到 `.gitignore`：

```gitignore
.claude/*.local.md
.claude/*.local.json
```

并在插件 README 中说明这一点。

### 默认值

当 settings 文件不存在时，提供合理默认值：

```bash
if [[ ! -f "$STATE_FILE" ]]; then
  # Use defaults
  ENABLED=true
  MODE=standard
else
  # Read from file
  # ...
fi
```

### 验证

对 settings 值进行验证：

```bash
MAX=$(printf '%s\n' "$FRONTMATTER" | grep '^max_value:' | sed 's/max_value: *//' || true)

# Validate numeric range
if ! [[ "$MAX" =~ ^[0-9]+$ ]] || [[ $MAX -lt 1 ]] || [[ $MAX -gt 100 ]]; then
  echo "⚠️  Invalid max_value in settings (must be 1-100)" >&2
  MAX=10  # Use default
fi
```

### 重启要求

**重要：** 如果你的 hook 或 command 每次都会读取 settings 文件，那么 settings 内容变更本身不需要重启。只有在修改 hook registration 或 plugin configuration 后，才需要重启 Claude Code。

建议在插件 README 中写明：

```markdown
## Changing Settings

After editing `.claude/my-plugin.local.md`:

1. Save the file
2. Run the command again or wait for the next hook invocation
3. Restart Claude Code only if you changed hook registration or plugin configuration
```

Hook definitions 不能在同一 session 内热更新，但 hook scripts 可以在每次调用时读取最新的 settings 文件。

## 安全注意事项

### 清理用户输入

当根据用户输入写入 settings 文件时：

```bash
# Prefer allowlisted values for YAML fields.
case "$USER_CHOICE" in
  strict|standard|lenient) MODE="$USER_CHOICE" ;;
  *) echo "Invalid mode" >&2; exit 2 ;;
esac

# For free text, avoid hand-escaping YAML. Put it in the markdown body,
# or use a YAML-aware writer such as yq/python instead of interpolating raw input.
```

### 验证文件路径

如果 settings 中包含文件路径：

```bash
FILE_PATH=$(printf '%s\n' "$FRONTMATTER" | grep '^data_file:' | sed 's/data_file: *//' || true)

# Check for path traversal
if [[ "$FILE_PATH" == *".."* ]]; then
  echo "⚠️  Invalid path in settings (path traversal)" >&2
  exit 2
fi
```

### 权限

Settings 文件应当：

- 仅用户可读（`chmod 600`）
- 不提交到 git
- 不在不同用户之间共享

## 真实世界示例

### multi-agent-swarm Plugin

**.claude/multi-agent-swarm.local.md：**

```markdown
---
agent_name: auth-implementation
task_number: 3.5
pr_number: 1234
coordinator_session: team-leader
enabled: true
dependencies: ["Task 3.4"]
additional_instructions: Use JWT tokens, not sessions
---

# Task: Implement Authentication

Build JWT-based authentication for the REST API.
Coordinate with auth-agent on shared types.
```

**Hook 用法（agent-stop-notification.sh）：**

- 检查文件是否存在（第 15-18 行：不存在则快速退出）
- 解析 frontmatter，读取 coordinator_session、agent_name、enabled
- 如果 enabled，则向 coordinator 发送通知
- 通过 `enabled: true/false` 实现快速启停

### ralph-wiggum Plugin

**.claude/ralph-loop.local.md：**

```markdown
---
iteration: 1
max_iterations: 10
completion_promise: "All tests passing and build successful"
---

Fix all the linting errors in the project.
Make sure tests pass after each fix.
```

**Hook 用法（stop-hook.sh）：**

- 检查文件是否存在（第 15-18 行：未激活则快速退出）
- 读取 iteration count 和 max_iterations
- 提取 completion_promise 用于循环终止
- 将 body 作为要回送的 prompt 读取出来
- 每轮循环更新 iteration count

## 快速参考

### 文件位置

```
project-root/
└── .claude/
    └── plugin-name.local.md
```

### Frontmatter 解析

```bash
# Extract frontmatter
FRONTMATTER=$(awk '
  NR == 1 {
    if ($0 != "---") exit 1
    next
  }
  /^---$/ { exit }
  { print }
' "$FILE")

# Read field. `grep` may return no matches, so keep `set -e` safe.
VALUE=$(printf '%s\n' "$FRONTMATTER" | grep '^field:' | sed 's/field: *//' | sed 's/^"\(.*\)"$/\1/' || true)
```

### Body 解析

```bash
# Extract body (after second ---)
BODY=$(awk '/^---$/{i++; next} i>=2' "$FILE")
```

### Quick Exit 模式

```bash
if [[ ! -f ".claude/my-plugin.local.md" ]]; then
  exit 0  # Not configured
fi
```

## Memory 与 Rules 语境

### Settings 作用域优先级

Settings 的优先级遵循：Managed > CLI flags > Local（`.claude/settings.local.json`）> Project（`.claude/settings.json`）> User（`~/.claude/settings.json`）。Plugin hooks 和 MCP servers 会跨作用域合并，而不是相互替换。plugin-settings 的 `.local.md` 文件不属于这套 system；它是插件直接读取的自定义 per-project state file。

Plugin settings 文件（`.local.md`）与 Claude Code 更广泛的 memory 和 rules system 并存。理解 CLAUDE.md imports、`.claude/rules/` 的 path-specific rules，以及 memory priority hierarchy 如何与插件内容交互，有助于设计出与用户 configuration 互补而非冲突的插件。

完整的优先级 hierarchy、import 语法和设计影响，请见 `references/memory-rules-system.md`。

---

## 额外资源

### 参考文件

如需更详细的实现模式，请参考：

- **`references/parsing-techniques.md`** - 解析 YAML frontmatter 与 markdown body 的完整指南
- **`references/real-world-examples.md`** - 深入分析 multi-agent-swarm 与 ralph-wiggum 的实现
- **`references/memory-rules-system.md`** - 说明插件内容如何与 CLAUDE.md、rules 和 memory hierarchy 交互

### 示例文件

`examples/` 中的可运行示例：

- **`read-settings-hook.sh`** - 读取并使用 settings 的 hook
- **`create-settings-command.md`** - 创建 settings 文件的 command
- **`example-settings.md`** - settings 模板文件

### 工具脚本

这些脚本假设 shell 环境中提供 `bash` 3.2+、`grep` 和 `sed`。`examples/read-settings-hook.sh` 示例还需要 `jq` 来解析 hook JSON 输入并生成 JSON 输出。排查脚本失败时，可通过 `bash --version`、`grep --version`、`sed --version` 和 `jq --version` 检查工具是否可用。

`scripts/` 中的开发工具：

- **`validate-settings.sh`** - 验证 settings 文件结构
- **`parse-frontmatter.sh`** - 提取 frontmatter 字段

## 实施工作流

为插件添加 settings 时：

1. 设计 settings schema（有哪些字段、类型、默认值）
2. 在插件文档中创建模板文件
3. 为 `.claude/*.local.md` 添加 gitignore 条目
4. 在 hooks/commands 中实现 settings 解析
5. 使用 quick-exit 模式（检查文件存在、检查 enabled 字段）
6. 在插件 README 中记录 settings 与模板
7. 说明：settings 内容会在下一次 hook/command 调用时读取，而 hook registration 或 plugin configuration 的变更需要重启 Claude Code

重点是让 settings 保持简单，并在 settings 文件不存在时提供良好的默认值。
