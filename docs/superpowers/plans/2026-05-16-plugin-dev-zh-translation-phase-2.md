# plugin-dev 中文化 Phase 2 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `plugins/plugin-dev` 的核心插件内容中文化，并在同范围内校验、矫正 commands/agents 的既有结构与说明问题。

**架构：** 按 manifest、commands、agents、docs 四组做外科手术式编辑，所有机器可读结构和 Markdown 代码块通过后置脚本与 `HEAD` 对比保护。commands/agents 在翻译后单独运行结构校验和人工语义校验，允许修复同文件内不改变功能边界的问题。

**技术栈：** Markdown、JSON、YAML frontmatter、Bash、Python 标准库、plugin-dev 自带 command/agent 校验脚本。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
**Phase:** Phase 2 — Core plugin content
**Spec:** `docs/superpowers/specs/2026-05-16-plugin-dev-zh-translation-phase-2-design.md`

---

## 共享约束

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- frontmatter 的 `description` 若会影响触发或发现，应保留关键英文触发词或采用中英混排以避免语义丢失。
- 每个阶段完成前必须提供具体验证证据，例如 diff 抽查、格式校验、脚本/manifest 校验或相关测试输出。
- 每个翻译阶段完成后，必须校验该阶段涉及的 command、skill、agent 的结构、触发描述、工具字段、示例指令和用户可读说明是否正确；若发现既有错误、不一致或会影响使用体验的问题，应在不改变插件功能边界的前提下一并矫正。涉及新增功能、行为变更、目录重构、新校验器或新自动化机制的修复，仍需另行确认或进入后续 scope。

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 创建

- 无新运行时代码文件。

### 修改

- `plugins/plugin-dev/.claude-plugin/plugin.json` — 只翻译插件 manifest 的 `description` 字符串值。
- `plugins/plugin-dev/commands/create-marketplace.md` — 翻译代码块外的市场（marketplace）创建工作流；校验 command frontmatter、工具字段、确认点和用户提示。
- `plugins/plugin-dev/commands/create-plugin.md` — 翻译代码块外的插件（plugin）创建工作流；校验 command frontmatter、工具字段、确认点和用户提示。
- `plugins/plugin-dev/commands/plugin-dev-guide.md` — 翻译代码块外的指南入口说明；校验命令路由和 `$ARGUMENTS` 使用说明。
- `plugins/plugin-dev/commands/start.md` — 翻译代码块外的入口命令说明；校验 `disable-model-invocation`、工具字段、路由逻辑和用户提示。
- `plugins/plugin-dev/agents/agent-creator.md` — 翻译 agent 创建器的职责、流程和输出要求；校验触发描述、工具字段、`skills` 列表和示例结构。
- `plugins/plugin-dev/agents/plugin-validator.md` — 翻译 plugin/marketplace 校验器的职责、流程和输出要求；校验触发描述、工具字段、`skills` 列表和示例结构。
- `plugins/plugin-dev/agents/skill-reviewer.md` — 翻译 skill 审查器的职责、流程和输出要求；校验触发描述、工具字段、`skills` 列表和示例结构。
- `plugins/plugin-dev/docs/ci-cd.md` — 翻译 CI/CD 文档的正文和表格解释性文字，保留 workflow、label 和模板文件名。
- `plugins/plugin-dev/docs/component-patterns.md` — 翻译组件模式文档，保留字段名和代码块。
- `plugins/plugin-dev/docs/release-procedure.md` — 翻译发布流程文档，保留命令、路径、PR/release 示例和链接目标。
- `plugins/plugin-dev/docs/troubleshooting.md` — 翻译排障文档，保留命令、路径和代码块。
- `plugins/plugin-dev/docs/workflow-security.md` — 翻译工作流安全文档，保留工具名、`allowed-tools` 和代码块。
- `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md` — 仅在计划保存后回填 Phase 2 plan artifact 和下一步手动交接。

### 禁止修改

- `plugins/plugin-dev/skills/` 下所有文件。
- shell 脚本、JSON 示例、目录结构、命令名、代理名、路径、工具名、模型名、API 名、schema 字段。
- 任意 Markdown 代码块内部内容，包括 `text` 代码块。

---

## 任务 1：建立执行基线和保护检查

**文件：**
- 读取：`plugins/plugin-dev/.claude-plugin/plugin.json`
- 读取：`plugins/plugin-dev/commands/create-marketplace.md`
- 读取：`plugins/plugin-dev/commands/create-plugin.md`
- 读取：`plugins/plugin-dev/commands/plugin-dev-guide.md`
- 读取：`plugins/plugin-dev/commands/start.md`
- 读取：`plugins/plugin-dev/agents/agent-creator.md`
- 读取：`plugins/plugin-dev/agents/plugin-validator.md`
- 读取：`plugins/plugin-dev/agents/skill-reviewer.md`
- 读取：`plugins/plugin-dev/docs/ci-cd.md`
- 读取：`plugins/plugin-dev/docs/component-patterns.md`
- 读取：`plugins/plugin-dev/docs/release-procedure.md`
- 读取：`plugins/plugin-dev/docs/troubleshooting.md`
- 读取：`plugins/plugin-dev/docs/workflow-security.md`

- [ ] **步骤 1：确认目标文件存在、frontmatter 和代码块数量符合基线**

运行：

```bash
python - <<'PY'
from pathlib import Path

expected = {
    'plugins/plugin-dev/.claude-plugin/plugin.json': (False, 0),
    'plugins/plugin-dev/commands/create-marketplace.md': (True, 1),
    'plugins/plugin-dev/commands/create-plugin.md': (True, 1),
    'plugins/plugin-dev/commands/plugin-dev-guide.md': (True, 0),
    'plugins/plugin-dev/commands/start.md': (True, 4),
    'plugins/plugin-dev/agents/agent-creator.md': (True, 1),
    'plugins/plugin-dev/agents/plugin-validator.md': (True, 2),
    'plugins/plugin-dev/agents/skill-reviewer.md': (True, 1),
    'plugins/plugin-dev/docs/ci-cd.md': (False, 0),
    'plugins/plugin-dev/docs/component-patterns.md': (False, 4),
    'plugins/plugin-dev/docs/release-procedure.md': (False, 6),
    'plugins/plugin-dev/docs/troubleshooting.md': (False, 2),
    'plugins/plugin-dev/docs/workflow-security.md': (False, 1),
}

for path, (has_frontmatter, code_blocks) in expected.items():
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'missing target file: {path}')
    text = p.read_text(encoding='utf-8')
    actual_frontmatter = text.startswith('---\n')
    actual_blocks = sum(1 for line in text.splitlines() if line.startswith('```')) // 2
    if actual_frontmatter != has_frontmatter:
        raise SystemExit(f'frontmatter mismatch: {path}: expected {has_frontmatter}, got {actual_frontmatter}')
    if actual_blocks != code_blocks:
        raise SystemExit(f'code block count mismatch: {path}: expected {code_blocks}, got {actual_blocks}')

print('baseline ok: 13 target files, expected frontmatter flags, expected code block counts')
PY
```

预期：输出 `baseline ok: 13 target files, expected frontmatter flags, expected code block counts`。

- [ ] **步骤 2：确认执行开始前没有 plugin-dev 目标文件的既有修改**

运行：

```bash
python - <<'PY'
import subprocess

targets = {
    'plugins/plugin-dev/.claude-plugin/plugin.json',
    'plugins/plugin-dev/commands/create-marketplace.md',
    'plugins/plugin-dev/commands/create-plugin.md',
    'plugins/plugin-dev/commands/plugin-dev-guide.md',
    'plugins/plugin-dev/commands/start.md',
    'plugins/plugin-dev/agents/agent-creator.md',
    'plugins/plugin-dev/agents/plugin-validator.md',
    'plugins/plugin-dev/agents/skill-reviewer.md',
    'plugins/plugin-dev/docs/ci-cd.md',
    'plugins/plugin-dev/docs/component-patterns.md',
    'plugins/plugin-dev/docs/release-procedure.md',
    'plugins/plugin-dev/docs/troubleshooting.md',
    'plugins/plugin-dev/docs/workflow-security.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
changed_targets = [p for p in changed if p in targets]
if changed_targets:
    raise SystemExit('target files already modified before implementation: ' + ', '.join(changed_targets))
print('target worktree clean before Phase 2 implementation')
PY
```

预期：输出 `target worktree clean before Phase 2 implementation`。如果失败，停止并向用户确认是否覆盖或继续当前修改。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git status --short
```

预期：不执行 commit；此任务只建立基线。

---

## 任务 2：翻译 manifest description

**文件：**
- 修改：`plugins/plugin-dev/.claude-plugin/plugin.json`

- [ ] **步骤 1：只翻译 `description` 字符串值**

将 `plugins/plugin-dev/.claude-plugin/plugin.json` 中的 `description` 改为中文说明，同时保留关键英文检索词。建议译文：

```json
"description": "用于开发 Claude Code plugins 的 Comprehensive toolkit。包含围绕 hooks、MCP integration、LSP servers、commands、agents、marketplaces 和 best practices 的聚焦 skills，以及用于导航的 guide skill。支持 AI-assisted plugin creation and validation。"
```

不得修改 `name`、`version`、`author`、`homepage`、`repository`、`license`、`keywords`。

- [ ] **步骤 2：验证 JSON 可解析且除 `description` 外字段不变**

运行：

```bash
python - <<'PY'
import json
import subprocess
from pathlib import Path

path = 'plugins/plugin-dev/.claude-plugin/plugin.json'
base = json.loads(subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True))
cur = json.loads(Path(path).read_text(encoding='utf-8'))

if set(base) != set(cur):
    raise SystemExit(f'plugin.json keys changed: before={sorted(base)} after={sorted(cur)}')
for key in base:
    if key != 'description' and base[key] != cur[key]:
        raise SystemExit(f'plugin.json field changed unexpectedly: {key}')
if base['description'] == cur['description']:
    raise SystemExit('plugin.json description was not translated')

print('plugin.json ok: valid JSON, only description changed')
PY
```

预期：输出 `plugin.json ok: valid JSON, only description changed`。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/.claude-plugin/plugin.json
git commit -m "docs: translate plugin-dev manifest description"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：翻译并校验 command 文件

**文件：**
- 修改：`plugins/plugin-dev/commands/create-marketplace.md`
- 修改：`plugins/plugin-dev/commands/create-plugin.md`
- 修改：`plugins/plugin-dev/commands/plugin-dev-guide.md`
- 修改：`plugins/plugin-dev/commands/start.md`

- [ ] **步骤 1：翻译 `create-marketplace.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/commands/create-marketplace.md`：

- frontmatter 键名保持原文。
- `argument-hint`、`allowed-tools`、`model` 保持原文值。
- `description` 改为中文说明并保留 `marketplace`、`guided workflow`。
- 标题、段落、列表、阶段名称、目标、动作、输出说明翻译为中文。
- `$ARGUMENTS`、`Skill`、`TaskCreate`、`TaskUpdate`、`TaskList`、`plugin-validator`、`marketplace-structure`、slash command、路径、命令示例保持原文。
- 文件内 1 个代码块保持逐字原文。

- [ ] **步骤 2：翻译 `create-plugin.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/commands/create-plugin.md`：

- frontmatter 键名保持原文。
- `argument-hint`、`allowed-tools`、`model` 保持原文值。
- `description` 改为中文说明并保留 `plugin`、`guided 8-phase workflow`。
- 标题、段落、列表、阶段名称、目标、动作、输出说明翻译为中文。
- `$ARGUMENTS`、`Skill`、`Agent`、`TaskCreate`、`TaskUpdate`、`TaskList`、技能名、代理名、slash command、路径、命令示例保持原文。
- 文件内 1 个代码块保持逐字原文。

- [ ] **步骤 3：翻译 `plugin-dev-guide.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/commands/plugin-dev-guide.md`：

- frontmatter 键名保持原文。
- `argument-hint`、`allowed-tools`、`model` 保持原文值。
- `description` 改为中文说明并保留 `plugin development`。
- 正文两条指令翻译为中文，但保留 `plugin-dev:plugin-dev-guide`、`Skill`、`$ARGUMENTS`。

- [ ] **步骤 4：翻译 `start.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/commands/start.md`：

- frontmatter 键名保持原文。
- `argument-hint`、`allowed-tools`、`model`、`disable-model-invocation` 保持原文值。
- `description` 改为中文说明并保留 `plugin development`、`choose your path`。
- 代码块外标题、段落、列表、步骤说明翻译为中文。
- `$ARGUMENTS`、`AskUserQuestion`、slash command、路径和工具名保持原文。
- 文件内 4 个代码块保持逐字原文。

- [ ] **步骤 5：校验 command 结构和既有说明问题**

运行：

```bash
cd plugins/plugin-dev && ./skills/command-development/scripts/validate-command.sh commands/create-marketplace.md commands/create-plugin.md commands/plugin-dev-guide.md commands/start.md
```

预期：退出码 0；输出包含 `Total: 4 files validated` 和 `Errors: 0`。

人工校验并在同文件内修复以下问题：

- command frontmatter 中 `description`、`argument-hint`、`allowed-tools`、`model` 存在。
- `start.md` 仍保留 `disable-model-invocation: true`。
- `description` 保留关键英文触发词，不把 `plugin`、`marketplace`、`workflow`、`plugin development` 全部翻译掉。
- 工作流说明中的确认点没有丢失，例如“等待用户确认”“加载指定 skill”“使用 Task tools”。
- 没有新增、删除或重排阶段。

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/commands/create-marketplace.md plugins/plugin-dev/commands/create-plugin.md plugins/plugin-dev/commands/plugin-dev-guide.md plugins/plugin-dev/commands/start.md
git commit -m "docs: translate plugin-dev command workflows"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 4：翻译并校验 agent 文件

**文件：**
- 修改：`plugins/plugin-dev/agents/agent-creator.md`
- 修改：`plugins/plugin-dev/agents/plugin-validator.md`
- 修改：`plugins/plugin-dev/agents/skill-reviewer.md`

- [ ] **步骤 1：翻译 `agent-creator.md` 的自然语言**

编辑 `plugins/plugin-dev/agents/agent-creator.md`：

- frontmatter 键名保持原文。
- `name`、`model`、`color`、`tools`、`skills` 保持原文值。
- frontmatter `description` 翻译叙述性文字，但保留 `Use this agent when`、`create an agent`、`generate an agent`、`build a new agent`、`make me an agent that` 等关键英文触发短语。
- `<example>`、`<commentary>` 标签保持原文。
- 系统提示正文翻译为中文，保留工具名、字段名、路径、Markdown 输出模板和命令示例。
- 文件内 1 个代码块保持逐字原文。

- [ ] **步骤 2：翻译 `plugin-validator.md` 的自然语言**

编辑 `plugins/plugin-dev/agents/plugin-validator.md`：

- frontmatter 键名保持原文。
- `name`、`model`、`color`、`tools`、`skills` 保持原文值。
- frontmatter `description` 翻译叙述性文字，但保留 `Use this agent when`、`validate my plugin`、`check plugin structure`、`verify plugin is correct`、`validate plugin.json`、`validate marketplace`、`check marketplace.json` 等关键英文触发短语。
- `<example>`、`<commentary>` 标签保持原文。
- 系统提示正文翻译为中文，保留字段名、路径、工具名、schema 名、Markdown 输出模板和命令示例。
- 文件内 2 个代码块保持逐字原文。

- [ ] **步骤 3：翻译 `skill-reviewer.md` 的自然语言**

编辑 `plugins/plugin-dev/agents/skill-reviewer.md`：

- frontmatter 键名保持原文。
- `name`、`model`、`color`、`tools`、`skills` 保持原文值。
- frontmatter `description` 翻译叙述性文字，但保留 `Use this agent when`、`review my skill`、`check skill quality`、`improve skill description`、`skill follows best practices` 等关键英文触发短语。
- `<example>`、`<commentary>` 标签保持原文。
- 系统提示正文翻译为中文，保留字段名、路径、Markdown 输出模板和命令示例。
- 文件内 1 个代码块保持逐字原文。

- [ ] **步骤 4：运行 agent 结构校验脚本**

运行：

```bash
cd plugins/plugin-dev && for f in agents/agent-creator.md agents/plugin-validator.md agents/skill-reviewer.md; do ./skills/agent-development/scripts/validate-agent.sh "$f"; done
```

预期：循环整体退出码 0。若出现 warning，逐条判断：结构、必需字段、`skills` 列表、unsupported fields 相关 warning 必须修复；仅因中文系统提示没有英文 `You are` 短语导致的写作风格 warning 可以记录为可接受警告。

- [ ] **步骤 5：人工校验 agent 质量并矫正同文件内问题**

逐文件确认：

- `description` 仍包含 `Use this agent when` 和 2-4 个 `<example>` 块。
- `tools` 与 agent 职责一致，未扩大权限。
- `skills` 仍是 YAML list，不改为单行字符串。
- 输出格式模板未丢失章节和 fenced code block。
- 系统提示中的职责、流程、质量标准、边界情况互相一致。
- 发现拼写、过时措辞、职责描述矛盾或示例说明不清时，在同文件内修复；需要改其他文件或改变行为的问题记录到最终汇报。

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/agents/agent-creator.md plugins/plugin-dev/agents/plugin-validator.md plugins/plugin-dev/agents/skill-reviewer.md
git commit -m "docs: translate plugin-dev agents"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 5：翻译 docs 文件

**文件：**
- 修改：`plugins/plugin-dev/docs/ci-cd.md`
- 修改：`plugins/plugin-dev/docs/component-patterns.md`
- 修改：`plugins/plugin-dev/docs/release-procedure.md`
- 修改：`plugins/plugin-dev/docs/troubleshooting.md`
- 修改：`plugins/plugin-dev/docs/workflow-security.md`

- [ ] **步骤 1：翻译 `ci-cd.md` 的自然语言**

编辑 `plugins/plugin-dev/docs/ci-cd.md`：

- 标题、段落和表格解释性文字翻译为中文。
- workflow 文件名保持原文，例如 `markdownlint.yml`、`links.yml`、`claude-pr-review.yml`。
- label 格式和值保持原文，例如 `component:*`、`priority:critical`。
- `.github/labels.yml`、`.github/`、`CONTRIBUTING.md` 保持原文。

- [ ] **步骤 2：翻译 `component-patterns.md` 的自然语言**

编辑 `plugins/plugin-dev/docs/component-patterns.md`：

- 标题、段落和列表解释性文字翻译为中文。
- frontmatter 字段名、取值枚举、工具字段名、hook event 名称保持原文。
- 文件内 4 个代码块保持逐字原文。

- [ ] **步骤 3：翻译 `release-procedure.md` 的自然语言**

编辑 `plugins/plugin-dev/docs/release-procedure.md`：

- 标题、段落、列表和说明文字翻译为中文。
- 路径、命令、分支名示例、PR body 示例、GitHub release 示例和 URL 保持原文。
- 文件内 6 个代码块保持逐字原文。

- [ ] **步骤 4：翻译 `troubleshooting.md` 的自然语言**

编辑 `plugins/plugin-dev/docs/troubleshooting.md`：

- 标题、段落、表格的 Problem/Cause/Solution 解释性文字翻译为中文。
- 命令、路径、脚本名、`jq`、`shellcheck`、`[BANG]`、literal `!` 保持原文。
- 文件内 2 个代码块保持逐字原文。

- [ ] **步骤 5：翻译 `workflow-security.md` 的自然语言**

编辑 `plugins/plugin-dev/docs/workflow-security.md`：

- 标题、段落和列表说明翻译为中文。
- `/plugin-dev:create-plugin`、`/plugin-dev:create-marketplace`、`allowed-tools`、工具名、`${CLAUDE_PLUGIN_ROOT}`、路径和字段名保持原文。
- 文件内 1 个代码块保持逐字原文。

- [ ] **步骤 6：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/docs/ci-cd.md plugins/plugin-dev/docs/component-patterns.md plugins/plugin-dev/docs/release-procedure.md plugins/plugin-dev/docs/troubleshooting.md plugins/plugin-dev/docs/workflow-security.md
git commit -m "docs: translate plugin-dev reference docs"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 6：运行保护性结构验证

**文件：**
- 验证：`plugins/plugin-dev/.claude-plugin/plugin.json`
- 验证：`plugins/plugin-dev/commands/*.md`
- 验证：`plugins/plugin-dev/agents/*.md`
- 验证：`plugins/plugin-dev/docs/*.md`

- [ ] **步骤 1：验证所有 Markdown 代码块与 `HEAD` 完全一致**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

files = [
    'plugins/plugin-dev/commands/create-marketplace.md',
    'plugins/plugin-dev/commands/create-plugin.md',
    'plugins/plugin-dev/commands/plugin-dev-guide.md',
    'plugins/plugin-dev/commands/start.md',
    'plugins/plugin-dev/agents/agent-creator.md',
    'plugins/plugin-dev/agents/plugin-validator.md',
    'plugins/plugin-dev/agents/skill-reviewer.md',
    'plugins/plugin-dev/docs/ci-cd.md',
    'plugins/plugin-dev/docs/component-patterns.md',
    'plugins/plugin-dev/docs/release-procedure.md',
    'plugins/plugin-dev/docs/troubleshooting.md',
    'plugins/plugin-dev/docs/workflow-security.md',
]

def blocks(text):
    result = []
    current = None
    for line in text.splitlines(keepends=True):
        if line.startswith('```'):
            if current is None:
                current = [line]
            else:
                current.append(line)
                result.append(''.join(current))
                current = None
        elif current is not None:
            current.append(line)
    if current is not None:
        raise SystemExit('unclosed code block')
    return result

for path in files:
    before = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True)
    after = Path(path).read_text(encoding='utf-8')
    if blocks(before) != blocks(after):
        raise SystemExit(f'code block changed: {path}')

print('code blocks ok: all Markdown code blocks match HEAD')
PY
```

预期：输出 `code blocks ok: all Markdown code blocks match HEAD`。

- [ ] **步骤 2：验证 frontmatter 保护字段未被误改**

运行：

```bash
python - <<'PY'
import re
import subprocess
from pathlib import Path

protected = {
    'plugins/plugin-dev/commands/create-marketplace.md': {'argument-hint', 'allowed-tools', 'model'},
    'plugins/plugin-dev/commands/create-plugin.md': {'argument-hint', 'allowed-tools', 'model'},
    'plugins/plugin-dev/commands/plugin-dev-guide.md': {'argument-hint', 'allowed-tools', 'model'},
    'plugins/plugin-dev/commands/start.md': {'argument-hint', 'allowed-tools', 'model', 'disable-model-invocation'},
    'plugins/plugin-dev/agents/agent-creator.md': {'name', 'model', 'color', 'tools', 'skills'},
    'plugins/plugin-dev/agents/plugin-validator.md': {'name', 'model', 'color', 'tools', 'skills'},
    'plugins/plugin-dev/agents/skill-reviewer.md': {'name', 'model', 'color', 'tools', 'skills'},
}

def frontmatter(text, path):
    lines = text.splitlines()
    if not lines or lines[0] != '---':
        raise SystemExit(f'missing frontmatter opener: {path}')
    try:
        end = lines.index('---', 1)
    except ValueError as exc:
        raise SystemExit(f'missing frontmatter closer: {path}') from exc
    return lines[1:end]

def fields(lines):
    data = {}
    current = None
    for line in lines:
        match = re.match(r'^([A-Za-z][A-Za-z0-9_-]*):(.*)$', line)
        if match:
            current = match.group(1)
            data[current] = [match.group(2)]
        elif current is not None:
            data[current].append(line)
    return {key: '\n'.join(value).rstrip() for key, value in data.items()}

for path, keys in protected.items():
    before = fields(frontmatter(subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True), path))
    after = fields(frontmatter(Path(path).read_text(encoding='utf-8'), path))
    if set(before) != set(after):
        raise SystemExit(f'frontmatter key set changed: {path}: before={sorted(before)} after={sorted(after)}')
    for key in keys:
        if before[key] != after[key]:
            raise SystemExit(f'protected frontmatter field changed: {path}: {key}')
    if before['description'] == after['description']:
        raise SystemExit(f'description was not translated or adjusted: {path}')

print('frontmatter ok: protected fields unchanged and descriptions changed')
PY
```

预期：输出 `frontmatter ok: protected fields unchanged and descriptions changed`。

- [ ] **步骤 3：重复运行 command 和 agent 校验脚本并保存输出摘要**

运行：

```bash
cd plugins/plugin-dev && ./skills/command-development/scripts/validate-command.sh commands/create-marketplace.md commands/create-plugin.md commands/plugin-dev-guide.md commands/start.md && for f in agents/agent-creator.md agents/plugin-validator.md agents/skill-reviewer.md; do ./skills/agent-development/scripts/validate-agent.sh "$f"; done
```

预期：整体退出码 0。记录 command 校验 `Errors: 0`；记录 agent 校验的 warning 数量和是否可接受。

---

## 任务 7：执行范围、术语和行为不变验证

**文件：**
- 验证：所有 Phase 2 目标文件
- 验证：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

- [ ] **步骤 1：验证 plugin-dev 内容修改只涉及 13 个 Phase 2 目标文件**

运行：

```bash
python - <<'PY'
import subprocess

allowed_plugin_files = {
    'plugins/plugin-dev/.claude-plugin/plugin.json',
    'plugins/plugin-dev/commands/create-marketplace.md',
    'plugins/plugin-dev/commands/create-plugin.md',
    'plugins/plugin-dev/commands/plugin-dev-guide.md',
    'plugins/plugin-dev/commands/start.md',
    'plugins/plugin-dev/agents/agent-creator.md',
    'plugins/plugin-dev/agents/plugin-validator.md',
    'plugins/plugin-dev/agents/skill-reviewer.md',
    'plugins/plugin-dev/docs/ci-cd.md',
    'plugins/plugin-dev/docs/component-patterns.md',
    'plugins/plugin-dev/docs/release-procedure.md',
    'plugins/plugin-dev/docs/troubleshooting.md',
    'plugins/plugin-dev/docs/workflow-security.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
plugin_changed = [p for p in changed if p.startswith('plugins/plugin-dev/')]
unexpected = [p for p in plugin_changed if p not in allowed_plugin_files]
if unexpected:
    raise SystemExit('unexpected plugin-dev files changed: ' + ', '.join(unexpected))
print('scope ok: plugin-dev changes are limited to Phase 2 target files')
print('changed plugin-dev files:')
for path in plugin_changed:
    print(f'- {path}')
PY
```

预期：输出 `scope ok: plugin-dev changes are limited to Phase 2 target files`，并列出已修改的 Phase 2 目标文件。

- [ ] **步骤 2：验证未改命令名、代理名、路径或目录结构**

运行：

```bash
git diff --name-status -- plugins/plugin-dev
```

预期：所有行的状态为 `M`，路径均属于 13 个 Phase 2 目标文件；没有 `A`、`D`、`R`。

- [ ] **步骤 3：执行术语抽查**

运行：

```bash
git diff -- plugins/plugin-dev/.claude-plugin/plugin.json plugins/plugin-dev/commands plugins/plugin-dev/agents plugins/plugin-dev/docs
```

人工从 diff 中记录至少 5 个术语处理证据：

- 插件（plugin）
- 技能（skill）
- 命令（command）
- 代理（agent）
- hook
- 市场（marketplace）
- frontmatter
- 清单（manifest）

预期：核心术语在关键位置使用中文说明并保留英文关键词；机器可读 token 未被翻译。

- [ ] **步骤 4：收集最终验证证据文本**

在最终汇报中包含以下证据项：

```text
Verification Evidence:
- Scope: [粘贴 scope ok 输出和 changed plugin-dev files 列表]
- JSON: plugin.json ok: valid JSON, only description changed
- Frontmatter: frontmatter ok: protected fields unchanged and descriptions changed
- Command validation: validate-command.sh completed with Errors: 0
- Agent validation: validate-agent.sh exited 0 for agent-creator, plugin-validator, skill-reviewer; warnings: [记录具体 warning 或 none]
- Code blocks: code blocks ok: all Markdown code blocks match HEAD
- Terminology: [列出至少 5 个术语抽查结果]
- Behavior unchanged: no skills/, shell scripts, command names, agent names, paths, or directory structure changed
- Quality corrections: [列出修复的 command/agent 既有问题；若没有，写明未发现需修复的同范围问题]
- Out-of-scope findings: [列出需另行确认的问题；若没有，写明无]
```

预期：证据具体，不能只写 `done`、`tested` 或 `looks good`。

- [ ] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git status --short
git add plugins/plugin-dev/.claude-plugin/plugin.json plugins/plugin-dev/commands/create-marketplace.md plugins/plugin-dev/commands/create-plugin.md plugins/plugin-dev/commands/plugin-dev-guide.md plugins/plugin-dev/commands/start.md plugins/plugin-dev/agents/agent-creator.md plugins/plugin-dev/agents/plugin-validator.md plugins/plugin-dev/agents/skill-reviewer.md plugins/plugin-dev/docs/ci-cd.md plugins/plugin-dev/docs/component-patterns.md plugins/plugin-dev/docs/release-procedure.md plugins/plugin-dev/docs/troubleshooting.md plugins/plugin-dev/docs/workflow-security.md
git commit -m "docs: translate plugin-dev core content"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 8：回填 roadmap plan artifact 并准备执行交接

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 创建：`docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md`

- [ ] **步骤 1：在 roadmap 中回填 Phase 2 plan artifact**

更新 `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`：

- 将 Phase Summary 中 Phase 2 的状态从 `designed` 改为 `planned`。
- 将 Phase 2 artifacts 中的 `Plan pending` 改为 `Plan docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md`。
- 将 Phase Details 中 Phase 2 的 `Status` 改为 `planned`。
- 将 Phase Details 中 Phase 2 的 `Plan` 改为 ``docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md``。
- 将 Current State 的 `Next Manual Action` 改为建议运行 `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2`。
- 在 Change Log 顶部追加一条：`2026-05-16: Added Phase 2 implementation plan artifact and marked Phase 2 as planned.`

- [ ] **步骤 2：验证 roadmap 不含详细实现步骤**

运行：

```bash
python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md')
text = path.read_text(encoding='utf-8')
required = 'docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md'
if required not in text:
    raise SystemExit('plan artifact path missing from roadmap')
if 'git add plugins/plugin-dev/.claude-plugin/plugin.json' in text:
    raise SystemExit('roadmap contains implementation command details')
print('roadmap ok: plan artifact linked without detailed implementation steps')
PY
```

预期：输出 `roadmap ok: plan artifact linked without detailed implementation steps`。

- [ ] **步骤 3：自检计划文档没有占位符和空白错误**

运行：

```bash
python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md')
text = path.read_text(encoding='utf-8')
markers = ['TO' + 'DO', 'TB' + 'D', 'FIX' + 'ME', 'PLACE' + 'HOLDER', '待' + '定', '待' + '补']
for marker in markers:
    if marker in text:
        raise SystemExit(f'plan contains forbidden marker: {marker}')
print('plan placeholder scan ok')
PY
git diff --check -- docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md
```

预期：输出 `plan placeholder scan ok`；`git diff --check` 无错误输出。

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add docs/superpowers/plans/2026-05-16-plugin-dev-zh-translation-phase-2.md docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md
git commit -m "docs: add plugin-dev translation phase 2 plan"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 执行完成后的手动交接

计划执行完成后，使用 roadmap-management 记录完成证据：

```text
/superpowers:roadmap-management complete-phase docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 2
```

在运行 complete-phase 前，准备好任务 7 的 `Verification Evidence` 文本。
