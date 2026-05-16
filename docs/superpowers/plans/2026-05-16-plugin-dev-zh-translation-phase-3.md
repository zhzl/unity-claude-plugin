# plugin-dev 中文化 Phase 3 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `plugins/plugin-dev` 的核心开发类技能 Markdown 中文化，并在同范围内校验、矫正 skill 文档的既有结构与说明问题。

**架构：** 按 guide、plugin-structure、command-development、skill-development 四组做外科手术式编辑，所有机器可读 token、frontmatter protected fields 和 Markdown 代码块通过 `HEAD` 对比保护。每组翻译后运行局部结构检查，最后运行全量代码块、frontmatter、范围和术语验证。

**技术栈：** Markdown、YAML frontmatter、Bash、Python 标准库、git diff、Claude Code skill 文档约定。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
**Phase:** Phase 3 — Core development skills
**Spec:** `docs/superpowers/specs/2026-05-16-plugin-dev-zh-translation-phase-3-design.md`

---

## 共享约束

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- `SKILL.md` frontmatter 的 `description` 中文化时必须保留关键英文触发词或采用中英混排。
- 每个阶段完成前必须提供具体验证证据，例如 diff 抽查、格式校验、脚本/manifest 校验或相关测试输出。
- 翻译完成后必须校验本阶段涉及的 skill 结构、触发描述、示例指令和用户可读说明；发现既有错误、不一致或影响使用体验的问题时，只能在不改变插件功能边界的前提下，在 Phase 3 目标文件内矫正。

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 创建

- 无新运行时代码文件。

### 修改

- `plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md` — 翻译 plugin-dev 技能总览、路由表、工作流说明和用户请求处理说明。
- `plugins/plugin-dev/skills/plugin-structure/SKILL.md` — 翻译插件结构入口技能，保留 `description` 关键英文触发词。
- `plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md` — 翻译高级插件示例的代码块外说明。
- `plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md` — 翻译最小插件示例的代码块外说明。
- `plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md` — 翻译标准插件示例的代码块外说明。
- `plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md` — 翻译高级主题说明。
- `plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md` — 翻译组件模式说明。
- `plugins/plugin-dev/skills/plugin-structure/references/github-actions.md` — 翻译 GitHub Actions 集成说明。
- `plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md` — 翻译 headless/CI 模式说明。
- `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md` — 翻译 manifest 字段说明。
- `plugins/plugin-dev/skills/plugin-structure/references/output-styles.md` — 翻译 output styles 说明。
- `plugins/plugin-dev/skills/command-development/SKILL.md` — 翻译 command 开发入口技能，保留 `description` 关键英文触发词。
- `plugins/plugin-dev/skills/command-development/examples/plugin-commands.md` — 翻译插件命令示例的代码块外说明。
- `plugins/plugin-dev/skills/command-development/examples/simple-commands.md` — 翻译简单命令示例的代码块外说明。
- `plugins/plugin-dev/skills/command-development/references/advanced-workflows.md` — 翻译高级工作流说明。
- `plugins/plugin-dev/skills/command-development/references/documentation-patterns.md` — 翻译文档模式说明。
- `plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md` — 翻译 command frontmatter 字段参考说明。
- `plugins/plugin-dev/skills/command-development/references/interactive-commands.md` — 翻译交互式命令说明。
- `plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md` — 翻译 marketplace 发布说明。
- `plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md` — 翻译插件功能参考说明。
- `plugins/plugin-dev/skills/command-development/references/plugin-integration.md` — 翻译插件集成说明。
- `plugins/plugin-dev/skills/command-development/references/skill-tool.md` — 翻译 Skill tool 说明。
- `plugins/plugin-dev/skills/command-development/references/testing-strategies.md` — 翻译测试策略说明。
- `plugins/plugin-dev/skills/skill-development/SKILL.md` — 翻译 skill 开发入口技能，保留 `description` 关键英文触发词。
- `plugins/plugin-dev/skills/skill-development/examples/complete-skill.md` — 翻译完整技能示例的代码块外说明。
- `plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md` — 翻译 frontmatter 模板说明，保护 YAML 模板。
- `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md` — 翻译最小技能示例的代码块外说明。
- `plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md` — 翻译高级 frontmatter 说明。
- `plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md` — 翻译 commands 与 skills 对比说明。
- `plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md` — 翻译技能创建工作流说明。
- `plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md` — 翻译原始 skill-creator 方法说明，保留 `description` 关键英文触发词。
- `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md` — 实现完成后只回填 Phase 3 implementation summary、verification evidence 和下一步手动交接。

### 禁止修改

- `plugins/plugin-dev/skills/agent-development/`
- `plugins/plugin-dev/skills/hook-development/`
- `plugins/plugin-dev/skills/mcp-integration/`
- `plugins/plugin-dev/skills/lsp-integration/`
- `plugins/plugin-dev/skills/plugin-settings/`
- `plugins/plugin-dev/skills/marketplace-structure/`
- `plugins/plugin-dev/skills/**/scripts/*`
- `plugins/plugin-dev/skills/**/*.json`
- Markdown 代码块内部内容，包括 `text`、`markdown` 和未标注语言的代码块。
- 技能名、命令名、路径、工具名、模型名、API 名、schema 字段、frontmatter 键名和机器可读字段值。

---

## 通用验证命令

后续任务中的局部验证使用同一模式：给定一组 `paths`，脚本会比较当前文件与 `HEAD` 中的 fenced code blocks，防止代码块内部被翻译或改写。

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    # 在具体任务中替换为该任务的目标文件列表。
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print(f'code blocks unchanged: {len(paths)} files')
PY
```

---

## 任务 1：建立执行基线和保护检查

**文件：**
- 读取：31 个 Phase 3 目标 Markdown 文件

- [x] **步骤 1：确认目标文件存在、frontmatter 和代码块数量符合基线**

运行：

```bash
python - <<'PY'
from pathlib import Path

expected = {
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md': (True, 1),
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md': (True, 25),
    'plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md': (False, 7),
    'plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md': (False, 4),
    'plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md': (False, 12),
    'plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md': (False, 11),
    'plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md': (False, 25),
    'plugins/plugin-dev/skills/plugin-structure/references/github-actions.md': (False, 13),
    'plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md': (False, 13),
    'plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md': (False, 25),
    'plugins/plugin-dev/skills/plugin-structure/references/output-styles.md': (False, 4),
    'plugins/plugin-dev/skills/command-development/SKILL.md': (True, 39),
    'plugins/plugin-dev/skills/command-development/examples/plugin-commands.md': (False, 17),
    'plugins/plugin-dev/skills/command-development/examples/simple-commands.md': (False, 27),
    'plugins/plugin-dev/skills/command-development/references/advanced-workflows.md': (False, 24),
    'plugins/plugin-dev/skills/command-development/references/documentation-patterns.md': (False, 13),
    'plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md': (False, 33),
    'plugins/plugin-dev/skills/command-development/references/interactive-commands.md': (False, 26),
    'plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md': (False, 29),
    'plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md': (False, 23),
    'plugins/plugin-dev/skills/command-development/references/plugin-integration.md': (False, 7),
    'plugins/plugin-dev/skills/command-development/references/skill-tool.md': (False, 22),
    'plugins/plugin-dev/skills/command-development/references/testing-strategies.md': (False, 25),
    'plugins/plugin-dev/skills/skill-development/SKILL.md': (True, 17),
    'plugins/plugin-dev/skills/skill-development/examples/complete-skill.md': (False, 22),
    'plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md': (False, 13),
    'plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md': (False, 6),
    'plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md': (False, 8),
    'plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md': (False, 0),
    'plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md': (False, 20),
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md': (True, 4),
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

print('baseline ok: 31 target files, expected frontmatter flags, expected code block counts')
PY
```

预期：输出 `baseline ok: 31 target files, expected frontmatter flags, expected code block counts`。

- [x] **步骤 2：确认执行开始前没有 Phase 3 目标文件的既有修改**

运行：

```bash
python - <<'PY'
import subprocess

targets = {
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md',
    'plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md',
    'plugins/plugin-dev/skills/plugin-structure/references/github-actions.md',
    'plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md',
    'plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md',
    'plugins/plugin-dev/skills/plugin-structure/references/output-styles.md',
    'plugins/plugin-dev/skills/command-development/SKILL.md',
    'plugins/plugin-dev/skills/command-development/examples/plugin-commands.md',
    'plugins/plugin-dev/skills/command-development/examples/simple-commands.md',
    'plugins/plugin-dev/skills/command-development/references/advanced-workflows.md',
    'plugins/plugin-dev/skills/command-development/references/documentation-patterns.md',
    'plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md',
    'plugins/plugin-dev/skills/command-development/references/interactive-commands.md',
    'plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-integration.md',
    'plugins/plugin-dev/skills/command-development/references/skill-tool.md',
    'plugins/plugin-dev/skills/command-development/references/testing-strategies.md',
    'plugins/plugin-dev/skills/skill-development/SKILL.md',
    'plugins/plugin-dev/skills/skill-development/examples/complete-skill.md',
    'plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md',
    'plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md',
    'plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md',
    'plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
changed_targets = [p for p in changed if p in targets]
if changed_targets:
    raise SystemExit('target files already modified before implementation: ' + ', '.join(changed_targets))
print('target worktree clean before Phase 3 implementation')
PY
```

预期：输出 `target worktree clean before Phase 3 implementation`。如果失败，停止并向用户确认是否基于现有修改继续。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git status --short
```

预期：不执行 commit；此任务只建立基线。

---

## 任务 2：翻译并校验 guide 入口技能

**文件：**
- 修改：`plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md`

- [x] **步骤 1：翻译 `plugin-dev-guide/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md`：

- frontmatter 键名保持原文。
- `name: plugin-dev-guide` 保持原文。
- `description` 改为中文说明，但保留 `Claude Code plugins`、`plugin development`、`plugin architecture`、`extending Claude Code`、`plugin-dev skills` 等关键英文触发词。
- 标题、段落、表格说明、技能用途说明、工作流说明和用户请求处理说明翻译为中文。
- 9 个技能名、3 个 agent 名、4 个 slash command 名、`$ARGUMENTS` 保持原文。
- 决策树代码块保持逐字原文。

- [x] **步骤 2：验证 guide 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = ['plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md']

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 1 files')
PY
```

预期：输出 `code blocks unchanged: 1 files`。

- [x] **步骤 3：验证 guide frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name: plugin-dev-guide' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['Claude Code plugins', 'plugin development', 'plugin architecture', 'extending Claude Code']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('guide frontmatter ok: protected name and trigger tokens present')
PY
```

预期：输出 `guide frontmatter ok: protected name and trigger tokens present`。

- [x] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md
git commit -m "docs: translate plugin-dev guide skill"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：翻译并校验 plugin-structure 入口和示例

**文件：**
- 修改：`plugins/plugin-dev/skills/plugin-structure/SKILL.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md`

- [x] **步骤 1：翻译 `plugin-structure/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/plugin-structure/SKILL.md`：

- `name: plugin-structure` 保持原文。
- `description` 改为中文说明，但保留 `create a plugin`、`plugin structure`、`plugin.json`、`headless mode`、`CI mode`、`github actions`、`output styles`、`${CLAUDE_PLUGIN_ROOT}` 等关键英文触发词。
- 正文中的目录结构、manifest、组件说明、portable path、auto-discovery、best practices、troubleshooting、additional resources 等解释性文字中文化。
- 所有代码块、JSON 字段名、路径、命令、组件目录名和 `Claude Code` 保持原文。

- [x] **步骤 2：翻译 `plugin-structure/examples/*.md` 的代码块外自然语言**

编辑以下文件：

- `plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md`
- `plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md`
- `plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md`

处理规则：

- 标题、段落、列表、表格解释性文字中文化。
- 示例文件树、manifest 字段、命令、路径、组件名和代码块保持原文。
- 若表格中同一行同时包含字段名和解释，字段名保持原文，解释中文化。

- [x] **步骤 3：验证 plugin-structure 入口和示例代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 4 files')
PY
```

预期：输出 `code blocks unchanged: 4 files`。

- [x] **步骤 4：验证 `plugin-structure/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/plugin-structure/SKILL.md')
text = path.read_text(encoding='utf-8')
frontmatter = text.split('---\n', 2)[1]
if 'name: plugin-structure' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create a plugin', 'plugin structure', 'plugin.json', 'headless mode', 'CI mode', 'github actions', 'output styles']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('plugin-structure frontmatter ok')
PY
```

预期：输出 `plugin-structure frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/plugin-structure/SKILL.md \
  plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md \
  plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md \
  plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md
git commit -m "docs: translate plugin structure skill examples"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 4：翻译并校验 plugin-structure 参考文档

**文件：**
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/github-actions.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md`
- 修改：`plugins/plugin-dev/skills/plugin-structure/references/output-styles.md`

- [x] **步骤 1：翻译 6 个 reference 文件的代码块外自然语言**

编辑本任务列出的 6 个 reference 文件：

- 标题、段落、列表、表格解释性文字中文化。
- `plugin.json`、`commands`、`agents`、`skills`、`hooks`、`mcpServers`、`lspServers`、`outputStyles`、`${CLAUDE_PLUGIN_ROOT}`、CLI flag、GitHub Actions 名称、workflow 文件名、路径和代码块保持原文。
- `manifest`、`frontmatter`、`workflow`、`validation` 等术语按 Phase 1 术语表处理中英关键词。
- 若发现同文件内链接文字或资源索引与现有文件职责不一致，可修正文案；不得改链接目标到范围外文件。

- [x] **步骤 2：验证 plugin-structure reference 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md',
    'plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md',
    'plugins/plugin-dev/skills/plugin-structure/references/github-actions.md',
    'plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md',
    'plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md',
    'plugins/plugin-dev/skills/plugin-structure/references/output-styles.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
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

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/skills/plugin-structure/references/*.md
git commit -m "docs: translate plugin structure references"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 5：翻译并校验 command-development 入口和示例

**文件：**
- 修改：`plugins/plugin-dev/skills/command-development/SKILL.md`
- 修改：`plugins/plugin-dev/skills/command-development/examples/plugin-commands.md`
- 修改：`plugins/plugin-dev/skills/command-development/examples/simple-commands.md`

- [x] **步骤 1：翻译 `command-development/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/command-development/SKILL.md`：

- `name: command-development` 保持原文。
- `description` 改为中文说明，但保留 `create a slash command`、`command frontmatter`、`interactive command`、`AskUserQuestion`、`Skill tool`、`debug command`、`disable-model-invocation` 等关键英文触发词。
- 正文中的 overview、command basics、frontmatter fields、dynamic arguments、file references、bash execution、best practices、troubleshooting 和 plugin-specific features 等解释性文字中文化。
- “Commands are Instructions FOR Claude” 的规则翻译后必须仍表达为强约束：命令内容是给 Claude 的执行指令，不是给用户的说明。
- `[BANG]`、`$ARGUMENTS`、`$1`、`$2`、`@file`、`${CLAUDE_PLUGIN_ROOT}`、`AskUserQuestion`、`Skill`、工具名、frontmatter 字段名、路径、slash command 和代码块保持原文。

- [x] **步骤 2：翻译 command examples 的代码块外自然语言**

编辑：

- `plugins/plugin-dev/skills/command-development/examples/plugin-commands.md`
- `plugins/plugin-dev/skills/command-development/examples/simple-commands.md`

处理规则：

- 示例标题、解释、使用场景、优缺点和提示文字中文化。
- 命令文件示例、frontmatter 示例、bash 示例、路径、argument token 和代码块保持原文。
- 如果示例说明中出现 `command`、`skill`、`workflow`、`frontmatter`，按 Phase 1 术语规则保留英文关键词。

- [x] **步骤 3：验证 command-development 入口和示例代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/command-development/SKILL.md',
    'plugins/plugin-dev/skills/command-development/examples/plugin-commands.md',
    'plugins/plugin-dev/skills/command-development/examples/simple-commands.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 3 files')
PY
```

预期：输出 `code blocks unchanged: 3 files`。

- [x] **步骤 4：验证 `command-development/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/command-development/SKILL.md')
text = path.read_text(encoding='utf-8')
frontmatter = text.split('---\n', 2)[1]
if 'name: command-development' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create a slash command', 'command frontmatter', 'interactive command', 'AskUserQuestion', 'Skill tool', 'debug command', 'disable-model-invocation']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('command-development frontmatter ok')
PY
```

预期：输出 `command-development frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/command-development/SKILL.md \
  plugins/plugin-dev/skills/command-development/examples/plugin-commands.md \
  plugins/plugin-dev/skills/command-development/examples/simple-commands.md
git commit -m "docs: translate command development skill examples"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 6：翻译并校验 command-development frontmatter、交互和 Skill tool 参考

**文件：**
- 修改：`plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/interactive-commands.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/skill-tool.md`

- [x] **步骤 1：翻译 4 个 reference 文件的代码块外自然语言**

编辑本任务列出的 4 个 reference 文件：

- 标题、段落、列表、表格解释性文字中文化。
- `description`、`allowed-tools`、`argument-hint`、`disable-model-invocation`、`model`、`AskUserQuestion`、`Skill`、`Skill()`、`${CLAUDE_PLUGIN_ROOT}`、`[BANG]`、`$ARGUMENTS`、路径和代码块保持原文。
- 工具名和字段名不翻译；字段用途和注意事项中文化。
- 若发现同文件内示例解释和字段说明不一致，可修正解释文字；不得改 YAML/JSON/Markdown 示例代码块。

- [x] **步骤 2：验证本组 reference 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md',
    'plugins/plugin-dev/skills/command-development/references/interactive-commands.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md',
    'plugins/plugin-dev/skills/command-development/references/skill-tool.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 4 files')
PY
```

预期：输出 `code blocks unchanged: 4 files`。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md \
  plugins/plugin-dev/skills/command-development/references/interactive-commands.md \
  plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md \
  plugins/plugin-dev/skills/command-development/references/skill-tool.md
git commit -m "docs: translate command development core references"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 7：翻译并校验 command-development 工作流、集成、测试和发布参考

**文件：**
- 修改：`plugins/plugin-dev/skills/command-development/references/advanced-workflows.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/documentation-patterns.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/plugin-integration.md`
- 修改：`plugins/plugin-dev/skills/command-development/references/testing-strategies.md`

- [x] **步骤 1：翻译 5 个 reference 文件的代码块外自然语言**

编辑本任务列出的 5 个 reference 文件：

- 标题、段落、列表、表格解释性文字中文化。
- 工作流状态名、命令名、路径、frontmatter 字段名、工具名、marketplace 字段、test command 示例和代码块保持原文。
- `workflow`、`marketplace`、`validation`、`plugin`、`command` 等术语按 Phase 1 术语表处理中英关键词。
- 同文件内若有明显过时或矛盾的说明，可修正解释文字；不得新增命令能力或变更示例行为。

- [x] **步骤 2：验证本组 reference 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/command-development/references/advanced-workflows.md',
    'plugins/plugin-dev/skills/command-development/references/documentation-patterns.md',
    'plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-integration.md',
    'plugins/plugin-dev/skills/command-development/references/testing-strategies.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
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

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/command-development/references/advanced-workflows.md \
  plugins/plugin-dev/skills/command-development/references/documentation-patterns.md \
  plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md \
  plugins/plugin-dev/skills/command-development/references/plugin-integration.md \
  plugins/plugin-dev/skills/command-development/references/testing-strategies.md
git commit -m "docs: translate command development workflow references"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 8：翻译并校验 skill-development 入口和示例

**文件：**
- 修改：`plugins/plugin-dev/skills/skill-development/SKILL.md`
- 修改：`plugins/plugin-dev/skills/skill-development/examples/complete-skill.md`
- 修改：`plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md`
- 修改：`plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md`

- [x] **步骤 1：翻译 `skill-development/SKILL.md` 的代码块外自然语言**

编辑 `plugins/plugin-dev/skills/skill-development/SKILL.md`：

- `name: skill-development` 保持原文。
- `description` 改为中文说明，但保留 `create a skill`、`SKILL.md format`、`skill frontmatter`、`skill triggers`、`progressive disclosure`、`Skill() syntax`、`SLASH_COMMAND_TOOL_CHAR_BUDGET` 等关键英文触发词。
- 正文中的 about skills、frontmatter fields、bundled resources、dynamic content、progressive disclosure、creation process、validation checklist、best practices、resources 等解释性文字中文化。
- `SKILL.md`、`references/`、`examples/`、`scripts/`、frontmatter 字段名、`Skill()` 语法、环境变量、路径和代码块保持原文。

- [x] **步骤 2：翻译 skill examples 的代码块外自然语言**

编辑：

- `plugins/plugin-dev/skills/skill-development/examples/complete-skill.md`
- `plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md`
- `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md`

处理规则：

- 示例说明、使用场景、清单文字和解释性表格中文化。
- YAML frontmatter 模板、目录树、脚本示例、路径、字段名和代码块保持原文。
- `progressive disclosure`、`frontmatter`、`skill`、`command`、`validation` 等术语保留英文关键词。

- [x] **步骤 3：验证 skill-development 入口和示例代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/skill-development/SKILL.md',
    'plugins/plugin-dev/skills/skill-development/examples/complete-skill.md',
    'plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md',
    'plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 4 files')
PY
```

预期：输出 `code blocks unchanged: 4 files`。

- [x] **步骤 4：验证 `skill-development/SKILL.md` frontmatter protected fields 和触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/skill-development/SKILL.md')
text = path.read_text(encoding='utf-8')
frontmatter = text.split('---\n', 2)[1]
if 'name: skill-development' not in frontmatter:
    raise SystemExit('name field changed')
for token in ['create a skill', 'SKILL.md format', 'skill frontmatter', 'skill triggers', 'progressive disclosure', 'Skill() syntax', 'SLASH_COMMAND_TOOL_CHAR_BUDGET']:
    if token not in frontmatter:
        raise SystemExit(f'missing trigger token: {token}')
print('skill-development frontmatter ok')
PY
```

预期：输出 `skill-development frontmatter ok`。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/skill-development/SKILL.md \
  plugins/plugin-dev/skills/skill-development/examples/complete-skill.md \
  plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md \
  plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md
git commit -m "docs: translate skill development examples"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 9：翻译并校验 skill-development 参考文档

**文件：**
- 修改：`plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md`
- 修改：`plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md`
- 修改：`plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md`
- 修改：`plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md`

- [ ] **步骤 1：翻译 4 个 reference 文件的代码块外自然语言**

编辑本任务列出的 4 个 reference 文件：

- 标题、段落、列表、表格解释性文字中文化。
- `SKILL.md`、frontmatter 字段名、`commands/`、`skills/`、`references/`、`examples/`、`scripts/`、`Skill()`、模型名、路径和代码块保持原文。
- `skill-creator-original.md` 的 frontmatter `description` 中文化时保留原有关键英文触发词。
- `commands-vs-skills.md` 无代码块，仍需保护路径、命令名和技术 token。
- 若发现同文件内原始说明和当前 plugin-dev 语境不一致，可修正解释文字；不得引入 standalone packaging 或脚本行为变更。

- [ ] **步骤 2：验证 skill-development reference 代码块未改变**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md',
    'plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('code blocks unchanged: 4 files')
PY
```

预期：输出 `code blocks unchanged: 4 files`。

- [ ] **步骤 3：验证 `skill-creator-original.md` frontmatter protected fields**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md')
text = path.read_text(encoding='utf-8')
if not text.startswith('---\n'):
    raise SystemExit('missing frontmatter fence')
frontmatter = text.split('---\n', 2)[1]
if 'name:' not in frontmatter:
    raise SystemExit('missing name field')
if 'description:' not in frontmatter:
    raise SystemExit('missing description field')
print('skill-creator-original frontmatter ok')
PY
```

预期：输出 `skill-creator-original frontmatter ok`。

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add plugins/plugin-dev/skills/skill-development/references/*.md
git commit -m "docs: translate skill development references"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 10：执行全量验证、记录证据并更新 roadmap

**文件：**
- 读取：31 个 Phase 3 目标 Markdown 文件
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

- [ ] **步骤 1：验证只有 Phase 3 目标文件和 roadmap 发生相关修改**

运行：

```bash
python - <<'PY'
import subprocess

allowed = {
    'docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md',
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md',
    'plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md',
    'plugins/plugin-dev/skills/plugin-structure/references/github-actions.md',
    'plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md',
    'plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md',
    'plugins/plugin-dev/skills/plugin-structure/references/output-styles.md',
    'plugins/plugin-dev/skills/command-development/SKILL.md',
    'plugins/plugin-dev/skills/command-development/examples/plugin-commands.md',
    'plugins/plugin-dev/skills/command-development/examples/simple-commands.md',
    'plugins/plugin-dev/skills/command-development/references/advanced-workflows.md',
    'plugins/plugin-dev/skills/command-development/references/documentation-patterns.md',
    'plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md',
    'plugins/plugin-dev/skills/command-development/references/interactive-commands.md',
    'plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-integration.md',
    'plugins/plugin-dev/skills/command-development/references/skill-tool.md',
    'plugins/plugin-dev/skills/command-development/references/testing-strategies.md',
    'plugins/plugin-dev/skills/skill-development/SKILL.md',
    'plugins/plugin-dev/skills/skill-development/examples/complete-skill.md',
    'plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md',
    'plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md',
    'plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md',
    'plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md',
}
changed = subprocess.check_output(['git', 'diff', '--name-only'], text=True).splitlines()
out_of_scope = [p for p in changed if p not in allowed]
if out_of_scope:
    raise SystemExit('out-of-scope modified files: ' + ', '.join(out_of_scope))
phase3 = [p for p in changed if p.startswith('plugins/plugin-dev/skills/')]
print(f'scope ok: {len(phase3)} Phase 3 plugin files modified')
PY
```

预期：输出 `scope ok: 31 Phase 3 plugin files modified`，或输出的数量与明确未改文件数量相符并在最终证据中解释。

- [ ] **步骤 2：全量验证 Markdown 代码块与 `HEAD` 一致**

运行：

```bash
python - <<'PY'
import subprocess
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md',
    'plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md',
    'plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md',
    'plugins/plugin-dev/skills/plugin-structure/references/github-actions.md',
    'plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md',
    'plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md',
    'plugins/plugin-dev/skills/plugin-structure/references/output-styles.md',
    'plugins/plugin-dev/skills/command-development/SKILL.md',
    'plugins/plugin-dev/skills/command-development/examples/plugin-commands.md',
    'plugins/plugin-dev/skills/command-development/examples/simple-commands.md',
    'plugins/plugin-dev/skills/command-development/references/advanced-workflows.md',
    'plugins/plugin-dev/skills/command-development/references/documentation-patterns.md',
    'plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md',
    'plugins/plugin-dev/skills/command-development/references/interactive-commands.md',
    'plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md',
    'plugins/plugin-dev/skills/command-development/references/plugin-integration.md',
    'plugins/plugin-dev/skills/command-development/references/skill-tool.md',
    'plugins/plugin-dev/skills/command-development/references/testing-strategies.md',
    'plugins/plugin-dev/skills/skill-development/SKILL.md',
    'plugins/plugin-dev/skills/skill-development/examples/complete-skill.md',
    'plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md',
    'plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md',
    'plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md',
    'plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md',
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md',
]

def code_blocks(text):
    blocks = []
    lines = text.splitlines(keepends=True)
    in_block = False
    current = []
    for line in lines:
        if line.startswith('```'):
            if in_block:
                current.append(line)
                blocks.append(''.join(current))
                current = []
                in_block = False
            else:
                current = [line]
                in_block = True
        elif in_block:
            current.append(line)
    if in_block:
        raise SystemExit('unclosed code block')
    return blocks

for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    cur = Path(path).read_text(encoding='utf-8')
    if code_blocks(base) != code_blocks(cur):
        raise SystemExit(f'code block changed: {path}')
print('all Phase 3 Markdown code blocks match HEAD')
PY
```

预期：输出 `all Phase 3 Markdown code blocks match HEAD`。

- [ ] **步骤 3：全量验证 5 个 frontmatter 文件的 protected fields 和关键触发词**

运行：

```bash
python - <<'PY'
from pathlib import Path

expected = {
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md': ('plugin-dev-guide', ['Claude Code plugins', 'plugin development', 'plugin architecture', 'extending Claude Code']),
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md': ('plugin-structure', ['create a plugin', 'plugin structure', 'plugin.json', 'headless mode', 'CI mode', 'github actions', 'output styles']),
    'plugins/plugin-dev/skills/command-development/SKILL.md': ('command-development', ['create a slash command', 'command frontmatter', 'interactive command', 'AskUserQuestion', 'Skill tool', 'debug command']),
    'plugins/plugin-dev/skills/skill-development/SKILL.md': ('skill-development', ['create a skill', 'SKILL.md format', 'skill frontmatter', 'skill triggers', 'progressive disclosure', 'Skill() syntax']),
    'plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md': (None, ['description:']),
}

for path, (name, tokens) in expected.items():
    text = Path(path).read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        raise SystemExit(f'missing frontmatter: {path}')
    frontmatter = text.split('---\n', 2)[1]
    if name and f'name: {name}' not in frontmatter:
        raise SystemExit(f'name changed: {path}')
    for token in tokens:
        if token not in frontmatter:
            raise SystemExit(f'missing frontmatter token in {path}: {token}')
print('frontmatter ok: protected names and trigger tokens present')
PY
```

预期：输出 `frontmatter ok: protected names and trigger tokens present`。

- [ ] **步骤 4：抽查术语和机器可读 token**

运行：

```bash
python - <<'PY'
from pathlib import Path

checks = {
    'plugins/plugin-dev/skills/plugin-structure/SKILL.md': ['plugin', 'manifest', 'frontmatter', '${CLAUDE_PLUGIN_ROOT}'],
    'plugins/plugin-dev/skills/command-development/SKILL.md': ['command', 'frontmatter', '$ARGUMENTS', '[BANG]', 'Skill tool'],
    'plugins/plugin-dev/skills/skill-development/SKILL.md': ['skill', 'progressive disclosure', 'SLASH_COMMAND_TOOL_CHAR_BUDGET', 'SKILL.md'],
    'plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md': ['plugin-dev', 'agent-development', 'mcp-integration', '/plugin-dev:start'],
}
for path, tokens in checks.items():
    text = Path(path).read_text(encoding='utf-8')
    for token in tokens:
        if token not in text:
            raise SystemExit(f'missing token in {path}: {token}')
print('terminology/token spot check ok: plugin, skill, command, frontmatter, manifest, workflow, validation-related tokens preserved')
PY
```

预期：输出 `terminology/token spot check ok: plugin, skill, command, frontmatter, manifest, workflow, validation-related tokens preserved`。

- [ ] **步骤 5：检查 Markdown diff 没有空白错误**

运行：

```bash
git diff --check
```

预期：无 whitespace error；如果只有 CRLF/LF 提示且退出码为 0，在最终证据中说明。

- [ ] **步骤 6：人工 review 质量矫正记录**

阅读 `git diff -- plugins/plugin-dev/skills/plugin-dev-guide plugins/plugin-dev/skills/plugin-structure plugins/plugin-dev/skills/command-development plugins/plugin-dev/skills/skill-development`，记录以下证据：

- 哪些文件仅做翻译。
- 哪些文件做了同范围质量小修，问题类型是错字、过时说明、触发描述不清、术语不一致、资源索引不一致或用户可读说明不准确。
- 是否发现需要另行确认的问题；若有，只记录文件、问题和原因，不修改范围外文件。

- [ ] **步骤 7：更新 roadmap Phase 3 状态和证据**

编辑 `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`：

- 将 Phase 3 summary 状态从 `planned` 或 `in-progress` 更新为 `completed`，仅在本任务前 6 步验证通过且 Phase 3 success criteria 满足时执行。
- 填写 Phase 3 `Implementation Summary`，只写主要变更摘要、commit 引用或执行摘要，不写详细步骤。
- 填写 Phase 3 `Verification Evidence`，包含范围证据、frontmatter 证据、代码块证据、术语证据、质量矫正证据和行为不变证据。
- 将 Current State 推进到 Phase 4，并将 Next Manual Action 设置为 `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 4`。
- 在 Change Log 追加 Phase 3 完成记录。

如果任一验证未通过，不更新为 `completed`；保留为 `in-progress` 并记录 blocker 或实际缺口。

- [ ] **步骤 8：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md \
  plugins/plugin-dev/skills/plugin-dev-guide/SKILL.md \
  plugins/plugin-dev/skills/plugin-structure/SKILL.md \
  plugins/plugin-dev/skills/plugin-structure/examples/advanced-plugin.md \
  plugins/plugin-dev/skills/plugin-structure/examples/minimal-plugin.md \
  plugins/plugin-dev/skills/plugin-structure/examples/standard-plugin.md \
  plugins/plugin-dev/skills/plugin-structure/references/advanced-topics.md \
  plugins/plugin-dev/skills/plugin-structure/references/component-patterns.md \
  plugins/plugin-dev/skills/plugin-structure/references/github-actions.md \
  plugins/plugin-dev/skills/plugin-structure/references/headless-ci-mode.md \
  plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md \
  plugins/plugin-dev/skills/plugin-structure/references/output-styles.md \
  plugins/plugin-dev/skills/command-development/SKILL.md \
  plugins/plugin-dev/skills/command-development/examples/plugin-commands.md \
  plugins/plugin-dev/skills/command-development/examples/simple-commands.md \
  plugins/plugin-dev/skills/command-development/references/advanced-workflows.md \
  plugins/plugin-dev/skills/command-development/references/documentation-patterns.md \
  plugins/plugin-dev/skills/command-development/references/frontmatter-reference.md \
  plugins/plugin-dev/skills/command-development/references/interactive-commands.md \
  plugins/plugin-dev/skills/command-development/references/marketplace-considerations.md \
  plugins/plugin-dev/skills/command-development/references/plugin-features-reference.md \
  plugins/plugin-dev/skills/command-development/references/plugin-integration.md \
  plugins/plugin-dev/skills/command-development/references/skill-tool.md \
  plugins/plugin-dev/skills/command-development/references/testing-strategies.md \
  plugins/plugin-dev/skills/skill-development/SKILL.md \
  plugins/plugin-dev/skills/skill-development/examples/complete-skill.md \
  plugins/plugin-dev/skills/skill-development/examples/frontmatter-templates.md \
  plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md \
  plugins/plugin-dev/skills/skill-development/references/advanced-frontmatter.md \
  plugins/plugin-dev/skills/skill-development/references/commands-vs-skills.md \
  plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md \
  plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md
git commit -m "docs: complete plugin-dev translation phase 3"
```

预期：只有用户明确授权提交时才执行；否则跳过。
