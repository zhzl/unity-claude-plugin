# plugin-dev 中文化 Phase 4 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `plugins/plugin-dev` 的集成和工具类技能 Markdown 中文化，并在同范围内校验、矫正 skill 文档的既有结构与说明问题。

**架构：** 按 `agent-development`、`hook-development`、`mcp-integration`、`lsp-integration`、`plugin-settings`、`marketplace-structure` 六组做外科手术式编辑，所有机器可读 token、frontmatter protected fields、协议/schema 字段和 Markdown 代码块通过 `HEAD` 对比保护。每组翻译后运行局部代码块和 frontmatter 检查，最后运行全量范围、代码块、frontmatter、术语/token 和空白验证。

**技术栈：** Markdown、YAML frontmatter、Bash、Python 标准库、git diff、Claude Code skill 文档约定。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
**Phase:** Phase 4 — Integration and tooling skills
**Spec:** `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-4-design.md`

---

## 共享约束

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- `SKILL.md` frontmatter 的 `description` 中文化时必须保留关键英文触发词或采用中英混排。
- 每个阶段完成前必须提供具体验证证据，例如 diff 抽查、格式校验、脚本/manifest 校验或相关测试输出。
- 翻译完成后必须校验本阶段涉及的 skill 结构、触发描述、示例指令、资源索引和用户可读说明；发现既有错误、不一致或影响使用体验的问题时，只能在不改变插件功能边界的前提下，在 Phase 4 目标 Markdown 文件内矫正。
- 所有 Markdown 代码块逐字保护，即使代码块语言是 `text`、`markdown` 或未标注语言。

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 创建

- 无新运行时代码文件。

### 修改

- `plugins/plugin-dev/skills/agent-development/SKILL.md` — 翻译 agent 开发入口技能，保留 `description` 关键英文触发词。
- `plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md` — 翻译 agent 创建提示示例的代码块外说明。
- `plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md` — 翻译完整 agent 示例的代码块外说明。
- `plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md` — 翻译高级 agent 字段说明。
- `plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md` — 翻译 agent 创建系统提示说明。
- `plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md` — 翻译 permission mode 规则说明。
- `plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md` — 翻译 system prompt 设计说明。
- `plugins/plugin-dev/skills/agent-development/references/triggering-examples.md` — 翻译触发示例说明。
- `plugins/plugin-dev/skills/hook-development/SKILL.md` — 翻译 hook 开发入口技能，保留 hook event 关键英文触发词。
- `plugins/plugin-dev/skills/hook-development/references/advanced.md` — 翻译高级 hook 说明。
- `plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md` — 翻译 hook 输入 schema 说明。
- `plugins/plugin-dev/skills/hook-development/references/migration.md` — 翻译 hook 迁移说明。
- `plugins/plugin-dev/skills/hook-development/references/patterns.md` — 翻译 hook 模式说明。
- `plugins/plugin-dev/skills/hook-development/scripts/README.md` — 翻译脚本 README 的代码块外说明。
- `plugins/plugin-dev/skills/mcp-integration/SKILL.md` — 翻译 MCP 集成入口技能，保留 MCP server 关键英文触发词。
- `plugins/plugin-dev/skills/mcp-integration/references/authentication.md` — 翻译 MCP authentication 说明。
- `plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md` — 翻译 MCP server discovery 说明。
- `plugins/plugin-dev/skills/mcp-integration/references/server-types.md` — 翻译 MCP server type 说明。
- `plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md` — 翻译 MCP tool/resource/prompt 使用说明。
- `plugins/plugin-dev/skills/lsp-integration/SKILL.md` — 翻译 LSP 集成入口技能，保留 LSP server 关键英文触发词。
- `plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md` — 翻译 LSP JSON 配置示例的代码块外说明。
- `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md` — 翻译最小 LSP 插件示例说明。
- `plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md` — 翻译 LSP capabilities 说明。
- `plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md` — 翻译常见 LSP server 说明。
- `plugins/plugin-dev/skills/plugin-settings/SKILL.md` — 翻译 plugin settings 入口技能，保留 settings 关键英文触发词。
- `plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md` — 翻译设置命令示例说明，保护 command frontmatter。
- `plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md` — 翻译设置示例的代码块外说明。
- `plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md` — 翻译 memory rules system 说明。
- `plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md` — 翻译 parsing techniques 说明。
- `plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md` — 翻译真实设置示例说明。
- `plugins/plugin-dev/skills/marketplace-structure/SKILL.md` — 翻译 marketplace 结构入口技能，保留 marketplace/schema 关键英文触发词。
- `plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md` — 翻译社区 marketplace 示例说明。
- `plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md` — 翻译最小 marketplace 示例说明。
- `plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md` — 翻译团队 marketplace 示例说明。
- `plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md` — 翻译 distribution patterns 说明。
- `plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md` — 翻译 marketplace schema 参考说明。
- `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md` — 实现完成后只回填 Phase 4 implementation summary、verification evidence 和下一步手动交接。

### 禁止修改

- `plugins/plugin-dev/skills/agent-development/scripts/*.sh`
- `plugins/plugin-dev/skills/hook-development/examples/*.sh`
- `plugins/plugin-dev/skills/hook-development/scripts/*.sh`
- `plugins/plugin-dev/skills/mcp-integration/examples/*.json`
- `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json`
- `plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh`
- `plugins/plugin-dev/skills/plugin-settings/scripts/*.sh`
- Phase 2/3 已处理的核心插件内容和核心开发技能目录。
- Markdown 代码块内部内容，包括 `text`、`markdown`、`json`、`yaml`、`bash` 和未标注语言的代码块。
- 技能名、命令名、路径、工具名、模型名、API 名、schema 字段、frontmatter 键名、协议字段、事件名和机器可读字段值。

---

## 通用验证说明

后续任务中的局部验证都使用 nested-fence-aware 代码块比对，防止代码块内部被翻译或改写；每个任务都提供可直接运行的完整命令和目标文件清单。

---

## 任务 1：建立执行基线和保护检查

**文件：**
- 读取：36 个 Phase 4 目标 Markdown 文件

- [x] **步骤 1：确认目标文件存在、frontmatter 和代码块数量符合基线**

运行：

```bash
python - <<'PY'
from pathlib import Path

expected = {
    'plugins/plugin-dev/skills/agent-development/SKILL.md': (True, 13),
    'plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md': (False, 15),
    'plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md': (False, 5),
    'plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md': (False, 6),
    'plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md': (False, 9),
    'plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md': (False, 6),
    'plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md': (False, 14),
    'plugins/plugin-dev/skills/agent-development/references/triggering-examples.md': (False, 25),
    'plugins/plugin-dev/skills/hook-development/SKILL.md': (True, 38),
    'plugins/plugin-dev/skills/hook-development/references/advanced.md': (False, 44),
    'plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md': (False, 1),
    'plugins/plugin-dev/skills/hook-development/references/migration.md': (False, 19),
    'plugins/plugin-dev/skills/hook-development/references/patterns.md': (False, 19),
    'plugins/plugin-dev/skills/hook-development/scripts/README.md': (False, 13),
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md': (True, 26),
    'plugins/plugin-dev/skills/mcp-integration/references/authentication.md': (False, 30),
    'plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md': (False, 4),
    'plugins/plugin-dev/skills/mcp-integration/references/server-types.md': (False, 18),
    'plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md': (False, 33),
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md': (True, 16),
    'plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md': (False, 11),
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md': (False, 3),
    'plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md': (False, 1),
    'plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md': (False, 7),
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md': (True, 29),
    'plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md': (True, 2),
    'plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md': (False, 7),
    'plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md': (False, 6),
    'plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md': (False, 33),
    'plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md': (False, 17),
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md': (True, 12),
    'plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md': (False, 7),
    'plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md': (False, 5),
    'plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md': (False, 5),
    'plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md': (False, 21),
    'plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md': (False, 8),
}

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path, (has_frontmatter, code_blocks_count) in expected.items():
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'missing target file: {path}')
    text = p.read_text(encoding='utf-8')
    actual_frontmatter = text.startswith('---\n')
    actual_blocks = len(code_blocks(text))
    if actual_frontmatter != has_frontmatter:
        raise SystemExit(f'frontmatter mismatch: {path}: expected {has_frontmatter}, got {actual_frontmatter}')
    if actual_blocks != code_blocks_count:
        raise SystemExit(f'code block count mismatch: {path}: expected {code_blocks_count}, got {actual_blocks}')

print('baseline ok: 36 target files, expected frontmatter flags, expected code block counts')
PY
```

预期：输出 `baseline ok: 36 target files, expected frontmatter flags, expected code block counts`。

- [x] **步骤 2：确认执行开始前没有 Phase 4 目标文件的既有修改**

运行：

```bash
python - <<'PY'
import subprocess

targets = {
    'plugins/plugin-dev/skills/agent-development/SKILL.md',
    'plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md',
    'plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md',
    'plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md',
    'plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md',
    'plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md',
    'plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md',
    'plugins/plugin-dev/skills/agent-development/references/triggering-examples.md',
    'plugins/plugin-dev/skills/hook-development/SKILL.md',
    'plugins/plugin-dev/skills/hook-development/references/advanced.md',
    'plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md',
    'plugins/plugin-dev/skills/hook-development/references/migration.md',
    'plugins/plugin-dev/skills/hook-development/references/patterns.md',
    'plugins/plugin-dev/skills/hook-development/scripts/README.md',
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md',
    'plugins/plugin-dev/skills/mcp-integration/references/authentication.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-types.md',
    'plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md',
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md',
    'plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md',
    'plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md',
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md',
    'plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md',
    'plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md',
    'plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md',
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
changed_targets = [p for p in changed if p in targets]
if changed_targets:
    raise SystemExit('target files already modified before implementation: ' + ', '.join(changed_targets))
print('target worktree clean before Phase 4 implementation')
PY
```

预期：输出 `target worktree clean before Phase 4 implementation`。如果失败，停止并向用户确认是否基于现有修改继续。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git status --short
```

预期：不执行 commit；此任务只建立基线。

---

## 任务 2：翻译并校验 agent-development

**文件：**
- 修改：`plugins/plugin-dev/skills/agent-development/SKILL.md`
- 修改：`plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md`
- 修改：`plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md`
- 修改：`plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md`
- 修改：`plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md`
- 修改：`plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md`
- 修改：`plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md`
- 修改：`plugins/plugin-dev/skills/agent-development/references/triggering-examples.md`

- [x] **步骤 1：翻译 `agent-development/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/agent-development/SKILL.md`：

- `name: agent-development` 保持原文。
- `description` 改为中文说明，但保留 `create an agent`、`add an agent`、`subagent`、`agent frontmatter`、`agent tools`、`agent hooks`、`permission mode`、`agent team`、`multi-agent` 等关键英文触发词。
- 正文中的 overview、key concepts、field name difference、frontmatter fields、triggering、system prompt、tools、permission rules、memory、MCP servers、hooks、background/resume、agent teams、best practices 和 resources 等解释性文字中文化。
- `tools`、`model`、`color`、`skills`、`disallowedTools`、`maxTurns`、`mcpServers`、permission mode 名称、路径、agent 名称、工具名和代码块保持原文。

- [x] **步骤 2：翻译 agent examples 和 references 的代码块外自然语言**

编辑本任务列出的 7 个 examples/references 文件：

- 标题、段落、列表、表格解释性文字中文化。
- Agent frontmatter 模板、system prompt 示例、用户触发短语示例、字段名、路径、工具名、模型名、permission mode 名称和代码块保持原文。
- `agent`、`subagent`、`frontmatter`、`system prompt`、`permission mode`、`tool` 等术语保留英文关键词。
- 若发现同文件内资源索引、链接文字或说明与当前 agent 文件职责不一致，可修正解释文字；不得修改代码块或引入新 agent 功能。

- [x] **步骤 3：验证 agent-development 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/agent-development/SKILL.md',
    'plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md',
    'plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md',
    'plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md',
    'plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md',
    'plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md',
    'plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md',
    'plugins/plugin-dev/skills/agent-development/references/triggering-examples.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 8 files')
PY
```

预期：输出 `code blocks unchanged: 8 files`。

- [x] **步骤 4：验证 `agent-development/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/agent-development/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: agent-development' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create an agent', 'add an agent', 'subagent', 'agent frontmatter', 'agent tools', 'agent hooks', 'permission mode', 'multi-agent']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('agent-development frontmatter ok')
PY
```

预期：输出 `agent-development frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/agent-development/SKILL.md \
  plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md \
  plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md \
  plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md \
  plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md \
  plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md \
  plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md \
  plugins/plugin-dev/skills/agent-development/references/triggering-examples.md
git commit -m "docs: translate agent development skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：翻译并校验 hook-development

**文件：**
- 修改：`plugins/plugin-dev/skills/hook-development/SKILL.md`
- 修改：`plugins/plugin-dev/skills/hook-development/references/advanced.md`
- 修改：`plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md`
- 修改：`plugins/plugin-dev/skills/hook-development/references/migration.md`
- 修改：`plugins/plugin-dev/skills/hook-development/references/patterns.md`
- 修改：`plugins/plugin-dev/skills/hook-development/scripts/README.md`

- [x] **步骤 1：翻译 `hook-development/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/hook-development/SKILL.md`：

- `name: hook-development` 保持原文。
- `description` 改为中文说明，但保留 `create a hook`、`PreToolUse`、`PostToolUse`、`Stop`、`UserPromptSubmit`、`Claude Code hooks`、`${CLAUDE_PLUGIN_ROOT}`、`matcher`、`settings.json`、`prompt-based hooks` 等关键英文触发词。
- 正文中的 overview、hook types、configuration、prompt-based hooks API、decision control、plugin hooks、skill/agent hooks、testing 和 resources 等解释性文字中文化。
- Hook 事件名、`matcher`、`statusMessage`、`decision`、JSON 字段、shell 命令、脚本名、路径、工具名和代码块保持原文。

- [x] **步骤 2：翻译 hook references 和 scripts README 的代码块外自然语言**

编辑本任务列出的 5 个 reference/README 文件：

- 标题、段落、列表、表格解释性文字中文化。
- `PreToolUse`、`PermissionRequest`、`PostToolUse`、`PostToolUseFailure`、`Stop`、`SubagentStop`、`SubagentStart`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`PreCompact`、`Notification`、`TeammateIdle`、`TaskCompleted`、`matcher`、schema 字段、shell 命令、脚本名、路径和代码块保持原文。
- `hook`、`matcher`、`schema`、`settings.json`、`prompt-based hook` 等术语保留英文关键词。
- 只允许修正同文件内说明、资源索引或链接文字不一致；不得修改 shell 脚本文件。

- [x] **步骤 3：验证 hook-development 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/hook-development/SKILL.md',
    'plugins/plugin-dev/skills/hook-development/references/advanced.md',
    'plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md',
    'plugins/plugin-dev/skills/hook-development/references/migration.md',
    'plugins/plugin-dev/skills/hook-development/references/patterns.md',
    'plugins/plugin-dev/skills/hook-development/scripts/README.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 6 files')
PY
```

预期：输出 `code blocks unchanged: 6 files`。

- [x] **步骤 4：验证 `hook-development/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/hook-development/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: hook-development' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create a hook', 'PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit', 'Claude Code hooks', '${CLAUDE_PLUGIN_ROOT}', 'matcher', 'settings.json']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('hook-development frontmatter ok')
PY
```

预期：输出 `hook-development frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/hook-development/SKILL.md \
  plugins/plugin-dev/skills/hook-development/references/advanced.md \
  plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md \
  plugins/plugin-dev/skills/hook-development/references/migration.md \
  plugins/plugin-dev/skills/hook-development/references/patterns.md \
  plugins/plugin-dev/skills/hook-development/scripts/README.md
git commit -m "docs: translate hook development skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 4：翻译并校验 mcp-integration

**文件：**
- 修改：`plugins/plugin-dev/skills/mcp-integration/SKILL.md`
- 修改：`plugins/plugin-dev/skills/mcp-integration/references/authentication.md`
- 修改：`plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md`
- 修改：`plugins/plugin-dev/skills/mcp-integration/references/server-types.md`
- 修改：`plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md`

- [x] **步骤 1：翻译 `mcp-integration/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/mcp-integration/SKILL.md`：

- `name: mcp-integration` 保持原文。
- `description` 改为中文说明，但保留 `add MCP server`、`integrate MCP`、`Model Context Protocol`、`.mcp.json`、`${CLAUDE_PLUGIN_ROOT}`、`stdio`、`SSE`、`HTTP/streamable HTTP`、`MCP prompts`、`allowedMcpServers`、`managed MCP` 等关键英文触发词。
- 正文中的 overview、configuration methods、server types、authentication、discovery、tool usage、prompts/resources 和 best practices 等解释性文字中文化。
- `mcpServers`、`stdio`、`SSE`、`HTTP`、`WebSocket`、`tool`、`resource`、`prompt`、header 名称、token 示例、JSON 字段、路径、命令和代码块保持原文。

- [x] **步骤 2：翻译 MCP references 的代码块外自然语言**

编辑本任务列出的 4 个 reference 文件：

- 标题、段落、列表、表格解释性文字中文化。
- 认证字段、server 类型、transport 名称、MCP tool/resource/prompt 字段、JSON 字段、命令、路径、URL 示例和代码块保持原文。
- `MCP`、`Model Context Protocol`、`server`、`tool`、`resource`、`prompt`、`transport`、`OAuth` 等术语保留英文关键词。
- 不修改 `plugins/plugin-dev/skills/mcp-integration/examples/*.json`。

- [x] **步骤 3：验证 mcp-integration 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md',
    'plugins/plugin-dev/skills/mcp-integration/references/authentication.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-types.md',
    'plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 5 files')
PY
```

预期：输出 `code blocks unchanged: 5 files`。

- [x] **步骤 4：验证 `mcp-integration/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/mcp-integration/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: mcp-integration' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['add MCP server', 'integrate MCP', 'Model Context Protocol', '.mcp.json', '${CLAUDE_PLUGIN_ROOT}', 'stdio', 'SSE', 'HTTP', 'MCP prompts', 'allowedMcpServers']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('mcp-integration frontmatter ok')
PY
```

预期：输出 `mcp-integration frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/mcp-integration/SKILL.md \
  plugins/plugin-dev/skills/mcp-integration/references/authentication.md \
  plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md \
  plugins/plugin-dev/skills/mcp-integration/references/server-types.md \
  plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md
git commit -m "docs: translate mcp integration skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 5：翻译并校验 lsp-integration

**文件：**
- 修改：`plugins/plugin-dev/skills/lsp-integration/SKILL.md`
- 修改：`plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md`
- 修改：`plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md`
- 修改：`plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md`
- 修改：`plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md`

- [x] **步骤 1：翻译 `lsp-integration/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/lsp-integration/SKILL.md`：

- `name: lsp-integration` 保持原文。
- `description` 改为中文说明，但保留 `add LSP server`、`configure language server`、`Language Server Protocol`、`pyright-lsp`、`typescript-lsp`、`rust-lsp`、`socket transport`、`initializationOptions`、`extensionToLanguage` 等关键英文触发词。
- 正文中的 overview、configuration、capabilities、server examples、transport、initialization options 和 best practices 等解释性文字中文化。
- `lspServers`、capability 名称、server 名称、语言 ID、安装命令、manifest 字段、路径、JSON 字段和代码块保持原文。

- [x] **步骤 2：翻译 LSP examples 和 references 的代码块外自然语言**

编辑本任务列出的 4 个 examples/references 文件：

- 标题、段落、列表、表格解释性文字中文化。
- JSON 配置示例、language server 名称、capability 名称、方法名、语言 ID、安装命令、路径和代码块保持原文。
- `LSP`、`Language Server Protocol`、`language server`、`capability`、`initializationOptions`、`extensionToLanguage` 等术语保留英文关键词。
- 不修改 `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json`。

- [x] **步骤 3：验证 lsp-integration 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md',
    'plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md',
    'plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 5 files')
PY
```

预期：输出 `code blocks unchanged: 5 files`。

- [x] **步骤 4：验证 `lsp-integration/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/lsp-integration/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: lsp-integration' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['add LSP server', 'configure language server', 'Language Server Protocol', 'pyright-lsp', 'typescript-lsp', 'rust-lsp', 'socket transport', 'initializationOptions', 'extensionToLanguage']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('lsp-integration frontmatter ok')
PY
```

预期：输出 `lsp-integration frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/lsp-integration/SKILL.md \
  plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md \
  plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md \
  plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md \
  plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md
git commit -m "docs: translate lsp integration skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 6：翻译并校验 plugin-settings

**文件：**
- 修改：`plugins/plugin-dev/skills/plugin-settings/SKILL.md`
- 修改：`plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md`
- 修改：`plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md`
- 修改：`plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md`
- 修改：`plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md`
- 修改：`plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md`

- [x] **步骤 1：翻译 `plugin-settings/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/plugin-settings/SKILL.md`：

- `name: plugin-settings` 保持原文。
- `description` 改为中文说明，但保留 `plugin settings`、`store plugin configuration`、`user-configurable plugin`、`.local.md files`、`YAML frontmatter`、`per-project plugin settings`、`CLAUDE.md imports`、`rules system`、`memory hierarchy` 等关键英文触发词。
- 正文中的 overview、file structure、settings patterns、reading settings from hooks/commands/agents、parsing、memory rules 和 best practices 等解释性文字中文化。
- `settings.json`、`settings.local.json`、`.claude/plugin-name.local.md`、frontmatter 字段、`$ARGUMENTS`、工具名、路径、配置字段和代码块保持原文。

- [x] **步骤 2：翻译 plugin settings examples 和 references 的代码块外自然语言**

编辑本任务列出的 5 个 examples/references 文件：

- 标题、段落、列表、表格解释性文字中文化。
- `create-settings-command.md` 的 frontmatter 键名保持原文；`allowed-tools: Write, AskUserQuestion` 保持原文。
- YAML/JSON 配置示例、frontmatter 字段、parser 示例、memory rule 字段、命令、路径和代码块保持原文。
- `settings`、`frontmatter`、`YAML`、`memory rules`、`configuration` 等术语保留英文关键词。
- 不修改 `plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh` 或 `plugins/plugin-dev/skills/plugin-settings/scripts/*.sh`。

- [x] **步骤 3：验证 plugin-settings 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md',
    'plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md',
    'plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md',
    'plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 6 files')
PY
```

预期：输出 `code blocks unchanged: 6 files`。

- [x] **步骤 4：验证 plugin-settings frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

skill = Path('plugins/plugin-dev/skills/plugin-settings/SKILL.md').read_text(encoding='utf-8')
if not skill.startswith('---\n'):
    raise SystemExit('missing skill frontmatter fence')
skill_frontmatter = skill.split('---\n', 2)[1]
if 'name: plugin-settings' not in skill_frontmatter:
    raise SystemExit('skill name field changed')
for token in ['plugin settings', 'store plugin configuration', 'user-configurable plugin', '.local.md files', 'YAML frontmatter', 'per-project plugin settings', 'CLAUDE.md imports', 'memory hierarchy']:
    if token not in skill_frontmatter:
        raise SystemExit(f'missing skill trigger token: {token}')

command_path = Path('plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md')
command = command_path.read_text(encoding='utf-8')
if not command.startswith('---\n'):
    raise SystemExit('missing command frontmatter fence')
command_frontmatter = command.split('---\n', 2)[1]
for token in ['description:', 'allowed-tools: Write, AskUserQuestion']:
    if token not in command_frontmatter:
        raise SystemExit(f'missing command frontmatter token: {token}')
print('plugin-settings frontmatter ok')
PY
```

预期：输出 `plugin-settings frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/plugin-settings/SKILL.md \
  plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md \
  plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md \
  plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md \
  plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md \
  plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md
git commit -m "docs: translate plugin settings skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 7：翻译并校验 marketplace-structure

**文件：**
- 修改：`plugins/plugin-dev/skills/marketplace-structure/SKILL.md`
- 修改：`plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md`
- 修改：`plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md`
- 修改：`plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md`
- 修改：`plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md`
- 修改：`plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md`

- [x] **步骤 1：翻译 `marketplace-structure/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/marketplace-structure/SKILL.md`：

- `name: marketplace-structure` 保持原文。
- `description` 改为中文说明，但保留 `create a marketplace`、`marketplace.json`、`organize multiple plugins`、`distribute plugins`、`marketplace schema`、`plugin marketplace structure`、`strictKnownMarketplaces`、`private marketplace`、`pin plugin version`、`hostPattern` 等关键英文触发词。
- 正文中的 overview、marketplace vs plugin、schema、distribution、auth、version pinning 和 resources 等解释性文字中文化。
- `marketplace.json`、schema 字段、manifest 字段、索引字段、URL、路径、命令、权限字段和代码块保持原文。

- [x] **步骤 2：翻译 marketplace examples 和 references 的代码块外自然语言**

编辑本任务列出的 5 个 examples/references 文件：

- 标题、段落、列表、表格解释性文字中文化。
- marketplace 文件结构、schema 字段、manifest 字段、索引字段、URL、权限字段、命令、路径和代码块保持原文。
- `marketplace`、`schema`、`manifest`、`distribution`、`plugin` 等术语保留英文关键词。
- 若发现示例说明与 schema 参考不一致，可修正解释文字；不得改变 schema 示例代码块。

- [x] **步骤 3：验证 marketplace-structure 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 6 files')
PY
```

预期：输出 `code blocks unchanged: 6 files`。

- [x] **步骤 4：验证 `marketplace-structure/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/marketplace-structure/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: marketplace-structure' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create a marketplace', 'marketplace.json', 'organize multiple plugins', 'distribute plugins', 'marketplace schema', 'plugin marketplace structure', 'strictKnownMarketplaces', 'private marketplace', 'pin plugin version', 'hostPattern']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('marketplace-structure frontmatter ok')
PY
```

预期：输出 `marketplace-structure frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/marketplace-structure/SKILL.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md \
  plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md
git commit -m "docs: translate marketplace structure skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 8：执行全量质量校验和范围验证

**文件：**
- 读取：36 个 Phase 4 目标 Markdown 文件

- [x] **步骤 1：验证只有 Phase 4 目标文件和允许的 roadmap/plan artifact 发生相关修改**

运行：

```bash
python - <<'PY'
import subprocess

allowed = {
    'docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md',
    'docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-4.md',
    'plugins/plugin-dev/skills/agent-development/SKILL.md',
    'plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md',
    'plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md',
    'plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md',
    'plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md',
    'plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md',
    'plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md',
    'plugins/plugin-dev/skills/agent-development/references/triggering-examples.md',
    'plugins/plugin-dev/skills/hook-development/SKILL.md',
    'plugins/plugin-dev/skills/hook-development/references/advanced.md',
    'plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md',
    'plugins/plugin-dev/skills/hook-development/references/migration.md',
    'plugins/plugin-dev/skills/hook-development/references/patterns.md',
    'plugins/plugin-dev/skills/hook-development/scripts/README.md',
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md',
    'plugins/plugin-dev/skills/mcp-integration/references/authentication.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-types.md',
    'plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md',
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md',
    'plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md',
    'plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md',
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md',
    'plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md',
    'plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md',
    'plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md',
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
out_of_scope = [p for p in changed if p.startswith('plugins/plugin-dev/') and p not in allowed]
if out_of_scope:
    raise SystemExit('out-of-scope plugin files modified: ' + ', '.join(out_of_scope))
phase4 = [p for p in changed if p.startswith('plugins/plugin-dev/skills/')]
print(f'scope ok: {len(phase4)} Phase 4 plugin files modified')
PY
```

预期：输出 `scope ok: 36 Phase 4 plugin files modified`，或输出的数量与明确未改文件数量相符并在最终证据中解释。

- [x] **步骤 2：全量验证 Markdown 代码块与 `HEAD` 一致**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/agent-development/SKILL.md',
    'plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md',
    'plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md',
    'plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md',
    'plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md',
    'plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md',
    'plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md',
    'plugins/plugin-dev/skills/agent-development/references/triggering-examples.md',
    'plugins/plugin-dev/skills/hook-development/SKILL.md',
    'plugins/plugin-dev/skills/hook-development/references/advanced.md',
    'plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md',
    'plugins/plugin-dev/skills/hook-development/references/migration.md',
    'plugins/plugin-dev/skills/hook-development/references/patterns.md',
    'plugins/plugin-dev/skills/hook-development/scripts/README.md',
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md',
    'plugins/plugin-dev/skills/mcp-integration/references/authentication.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md',
    'plugins/plugin-dev/skills/mcp-integration/references/server-types.md',
    'plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md',
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md',
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md',
    'plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md',
    'plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md',
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md',
    'plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md',
    'plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md',
    'plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md',
    'plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md',
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md',
    'plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    fence = None
    current = []
    for line in lines:
        stripped = line.lstrip()
        if fence is None:
            if stripped.startswith('```') or stripped.startswith('~~~'):
                fence = stripped[:3]
                current = [line]
        else:
            current.append(line)
            if stripped.startswith(fence):
                blocks.append(''.join(current))
                current = []
                fence = None
    if fence is not None:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('all Phase 4 Markdown code blocks match HEAD with nested-fence-aware parser')
PY
```

预期：输出 `all Phase 4 Markdown code blocks match HEAD with nested-fence-aware parser`。

- [x] **步骤 3：全量验证 7 个 frontmatter 文件的 protected fields 和关键触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

expected = {
    'plugins/plugin-dev/skills/agent-development/SKILL.md': ('agent-development', ['create an agent', 'add an agent', 'subagent', 'agent frontmatter', 'agent tools', 'agent hooks', 'permission mode', 'multi-agent']),
    'plugins/plugin-dev/skills/hook-development/SKILL.md': ('hook-development', ['create a hook', 'PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit', 'Claude Code hooks', '${CLAUDE_PLUGIN_ROOT}', 'matcher', 'settings.json']),
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md': ('mcp-integration', ['add MCP server', 'integrate MCP', 'Model Context Protocol', '.mcp.json', '${CLAUDE_PLUGIN_ROOT}', 'stdio', 'SSE', 'HTTP', 'MCP prompts', 'allowedMcpServers']),
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md': ('lsp-integration', ['add LSP server', 'configure language server', 'Language Server Protocol', 'pyright-lsp', 'typescript-lsp', 'rust-lsp', 'socket transport', 'initializationOptions', 'extensionToLanguage']),
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md': ('plugin-settings', ['plugin settings', 'store plugin configuration', 'user-configurable plugin', '.local.md files', 'YAML frontmatter', 'per-project plugin settings', 'CLAUDE.md imports', 'memory hierarchy']),
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md': ('marketplace-structure', ['create a marketplace', 'marketplace.json', 'organize multiple plugins', 'distribute plugins', 'marketplace schema', 'plugin marketplace structure', 'strictKnownMarketplaces', 'private marketplace', 'pin plugin version', 'hostPattern']),
}

for path, (name, tokens) in expected.items():
    text = Path(path).read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        raise SystemExit(f'missing frontmatter: {path}')
    frontmatter = text.split('---\n', 2)[1]
    if f'name: {name}' not in frontmatter:
        raise SystemExit(f'name changed: {path}')
    for token in tokens:
        if token not in frontmatter:
            raise SystemExit(f'missing frontmatter token in {path}: {token}')

command_path = Path('plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md')
command = command_path.read_text(encoding='utf-8')
if not command.startswith('---\n'):
    raise SystemExit('missing command frontmatter')
command_frontmatter = command.split('---\n', 2)[1]
for token in ['description:', 'allowed-tools: Write, AskUserQuestion']:
    if token not in command_frontmatter:
        raise SystemExit(f'missing command frontmatter token: {token}')
print('frontmatter ok: protected names, command fields, and trigger tokens present')
PY
```

预期：输出 `frontmatter ok: protected names, command fields, and trigger tokens present`。

- [x] **步骤 4：抽查术语、协议字段和机器可读 token**

运行：

```bash
python - <<'PY'
from pathlib import Path

checks = {
    'plugins/plugin-dev/skills/agent-development/SKILL.md': ['agent', 'subagent', 'frontmatter', 'tools', 'permission mode', 'mcpServers'],
    'plugins/plugin-dev/skills/hook-development/SKILL.md': ['hook', 'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'matcher', 'settings.json'],
    'plugins/plugin-dev/skills/mcp-integration/SKILL.md': ['MCP', 'Model Context Protocol', 'mcpServers', 'stdio', 'SSE', 'HTTP', 'tool', 'resource', 'prompt'],
    'plugins/plugin-dev/skills/lsp-integration/SKILL.md': ['LSP', 'Language Server Protocol', 'lspServers', 'initializationOptions', 'extensionToLanguage'],
    'plugins/plugin-dev/skills/plugin-settings/SKILL.md': ['settings', 'frontmatter', 'YAML', '.claude/plugin-name.local.md', 'memory hierarchy'],
    'plugins/plugin-dev/skills/marketplace-structure/SKILL.md': ['marketplace', 'marketplace.json', 'schema', 'strictKnownMarketplaces', 'hostPattern'],
}
for path, tokens in checks.items():
    text = Path(path).read_text(encoding='utf-8')
    for token in tokens:
        if token not in text:
            raise SystemExit(f'missing token in {path}: {token}')
print('terminology/token spot check ok: MCP, LSP, hook, settings, marketplace, schema, tool, resource, prompt, frontmatter, manifest, capability, matcher preserved')
PY
```

预期：输出 `terminology/token spot check ok: MCP, LSP, hook, settings, marketplace, schema, tool, resource, prompt, frontmatter, manifest, capability, matcher preserved`。

- [x] **步骤 5：检查 Markdown diff 没有空白错误**

运行：

```bash
git diff --check
```

预期：无 whitespace error；如果只有 CRLF/LF 提示且退出码为 0，在最终证据中说明。

- [x] **步骤 6：人工 review 质量矫正记录**

阅读：

```bash
git diff -- plugins/plugin-dev/skills/agent-development plugins/plugin-dev/skills/hook-development plugins/plugin-dev/skills/mcp-integration plugins/plugin-dev/skills/lsp-integration plugins/plugin-dev/skills/plugin-settings plugins/plugin-dev/skills/marketplace-structure
```

记录以下证据：

- 哪些文件仅做翻译。
- 哪些文件做了同范围质量小修，问题类型是错字、过时说明、触发描述不清、术语不一致、资源索引不一致或用户可读说明不准确。
- 是否发现需要另行确认的问题；若有，只记录文件、问题和原因，不修改范围外文件。

---

## 任务 9：更新 roadmap Phase 4 状态和证据

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

- [x] **步骤 1：只在任务 8 验证通过后更新 Phase 4 completion 状态**

编辑 `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`，按当前新版表格格式更新：

- `Current State`：将 `Current Phase` 推进到 `Phase 5 — Examples, scripts, and final consistency`。
- `Current State`：将 `Next Manual Action` 设置为 `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 5`。
- `Phase Summary` 表格：将 Phase 4 行状态更新为 `completed`，Artifacts 改为 `Spec ...; Plan ...; Implementation Summary recorded; Verification Evidence recorded`。
- `Phase Details` 的 Phase 4：将 `Status` 更新为 `completed`。
- `Phase Details` 的 Phase 4：填写 `Implementation Summary`，只写主要变更摘要、commit/PR 引用或执行摘要，不写详细步骤。
- `Phase Details` 的 Phase 4：填写 `Verification Evidence`，包含任务 8 的范围证据、frontmatter 证据、代码块证据、术语/token 证据、质量矫正证据和行为不变证据。
- `Change Log`：追加 `2026-05-17` 的 Phase 4 完成记录。

如果任一验证未通过，不更新为 `completed`；保留当前状态并记录实际缺口或 blocker。

- [x] **步骤 2：验证 roadmap 使用当前表格格式并指向 Phase 5 下一步**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md')
text = path.read_text(encoding='utf-8')
required = [
    '| Phase | Status | Scope | Artifacts |',
    '| Phase 4 — Integration and tooling skills | completed |',
    'Spec `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-4-design.md`; Plan `docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-4.md`; Implementation Summary recorded; Verification Evidence recorded',
    '- **Current Phase:** Phase 5 — Examples, scripts, and final consistency',
    '- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 5`',
    '- **Status:** completed',
    '- **Implementation Summary:**',
    '- **Verification Evidence:**',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing roadmap token: {token}')
print('roadmap sync ok: Phase 4 completed and Phase 5 write-spec handoff recorded')
PY
```

预期：输出 `roadmap sync ok: Phase 4 completed and Phase 5 write-spec handoff recorded`。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md \
  plugins/plugin-dev/skills/agent-development/SKILL.md \
  plugins/plugin-dev/skills/agent-development/examples/agent-creation-prompt.md \
  plugins/plugin-dev/skills/agent-development/examples/complete-agent-examples.md \
  plugins/plugin-dev/skills/agent-development/references/advanced-agent-fields.md \
  plugins/plugin-dev/skills/agent-development/references/agent-creation-system-prompt.md \
  plugins/plugin-dev/skills/agent-development/references/permission-modes-rules.md \
  plugins/plugin-dev/skills/agent-development/references/system-prompt-design.md \
  plugins/plugin-dev/skills/agent-development/references/triggering-examples.md \
  plugins/plugin-dev/skills/hook-development/SKILL.md \
  plugins/plugin-dev/skills/hook-development/references/advanced.md \
  plugins/plugin-dev/skills/hook-development/references/hook-input-schemas.md \
  plugins/plugin-dev/skills/hook-development/references/migration.md \
  plugins/plugin-dev/skills/hook-development/references/patterns.md \
  plugins/plugin-dev/skills/hook-development/scripts/README.md \
  plugins/plugin-dev/skills/mcp-integration/SKILL.md \
  plugins/plugin-dev/skills/mcp-integration/references/authentication.md \
  plugins/plugin-dev/skills/mcp-integration/references/server-discovery.md \
  plugins/plugin-dev/skills/mcp-integration/references/server-types.md \
  plugins/plugin-dev/skills/mcp-integration/references/tool-usage.md \
  plugins/plugin-dev/skills/lsp-integration/SKILL.md \
  plugins/plugin-dev/skills/lsp-integration/examples/lsp-json-configs.md \
  plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/README.md \
  plugins/plugin-dev/skills/lsp-integration/references/lsp-capabilities.md \
  plugins/plugin-dev/skills/lsp-integration/references/popular-lsp-servers.md \
  plugins/plugin-dev/skills/plugin-settings/SKILL.md \
  plugins/plugin-dev/skills/plugin-settings/examples/create-settings-command.md \
  plugins/plugin-dev/skills/plugin-settings/examples/example-settings.md \
  plugins/plugin-dev/skills/plugin-settings/references/memory-rules-system.md \
  plugins/plugin-dev/skills/plugin-settings/references/parsing-techniques.md \
  plugins/plugin-dev/skills/plugin-settings/references/real-world-examples.md \
  plugins/plugin-dev/skills/marketplace-structure/SKILL.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/community-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/minimal-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/examples/team-marketplace.md \
  plugins/plugin-dev/skills/marketplace-structure/references/distribution-patterns.md \
  plugins/plugin-dev/skills/marketplace-structure/references/schema-reference.md
git commit -m "docs: complete plugin-dev translation phase 4"
```

预期：只有用户明确授权提交时才执行；否则跳过。
