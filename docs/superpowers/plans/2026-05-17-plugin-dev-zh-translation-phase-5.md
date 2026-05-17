# plugin-dev 中文化 Phase 5 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 `plugins/plugin-dev` Phase 5 的 JSON 示例、shell 脚本注释和最终自然语言一致性收尾，同时保持 JSON 结构、shell 输出和脚本行为不变。

**架构：** 先把 Phase 5 spec/plan artifact 同步到 roadmap，再按主范围 5 个 JSON 示例和 14 个 shell 脚本做外科手术式编辑。最后用 JSON 结构比对、shell diff 守卫、自然语言残留扫描和格式检查收集验收证据，并只在符合规格边界时修复主范围外漏网自然语言。

**技术栈：** JSON、Bash shell、Markdown、Python 标准库、git diff、Claude Code roadmap/spec/plan 文档约定。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
**Phase:** Phase 5 — Examples, scripts, and final consistency
**Spec:** `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md`

---

## 共享约束

- 保留 Markdown 结构、链接、代码块、frontmatter 结构和机器可读字段。
- 只翻译自然语言；代码块、shell 命令、JSON 键、路径、模型名和 API 名默认保持原文。
- Phase 5 的主编辑范围是 5 个 JSON 示例和 14 个 shell 脚本。
- JSON 中只允许翻译 `_comment` 和示例插件 manifest 的 `description` 字符串值。
- Shell 脚本中只允许翻译注释；`echo`、`printf`、usage、error、warning、success、failed、passed 和 heredoc 输出文本保持原文。
- 主范围外只允许修复最终一致性扫描发现的 code fence 外明显用户可读英文，并必须记录路径、原因和边界判断。
- 不新增测试框架、校验器、CLI 命令或自动同步机制。
- 不触碰当前工作区中与 `plugins/plugin-dev` 中文化无关的 Unity Agent Kit 变更。

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 已创建

- `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md` — Phase 5 规格。
- `docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md` — 本实现计划。

### 修改

- `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md` — 执行开始时回填 Phase 5 spec/plan artifact 并标记 planned；验收通过后回填 completion evidence。
- `plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json` — 翻译允许的示例 manifest `description`。
- `plugins/plugin-dev/skills/mcp-integration/examples/http-server.json` — 翻译允许的 `_comment`。
- `plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json` — 翻译允许的 `_comment`。
- `plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json` — 翻译允许的 `_comment`。
- `plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json` — 翻译允许的 `_comment`。
- `plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/command-development/scripts/validate-command.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/examples/load-context.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/examples/validate-write.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh` — 只翻译注释。
- `plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh` — 只翻译注释。

### 条件修改

- `plugins/plugin-dev/**/*.md` — 仅当最终自然语言扫描发现 code fence 外明显漏网用户可读英文时修改；每个文件必须在任务 5 和任务 6 的证据中记录路径、原因和边界判断。
- `plugins/plugin-dev/**/*.json` — 主范围外默认不修改；只有 JSON 允许翻译字段中的明显漏网自然语言可修改，且必须记录路径、字段和原因。
- `plugins/plugin-dev/**/*.sh` — 主范围外默认不修改；只有 shell 注释中的明显漏网自然语言可修改，且必须记录路径、行类型和原因。

### 禁止修改

- Shell 脚本的 shebang、命令、变量、函数名、参数、条件判断、管道、退出码、文件路径、正则表达式和 stdout/stderr 输出文本。
- JSON 键名、对象名、命令、URL、header 名、环境变量、schema 字段、示例服务名和包名。
- Markdown code fence 内的命令、配置、示例代码、路径或注释。
- `plugins/plugin-dev` 之外的文件，但 roadmap/spec/plan artifact 除外。
- 与 `plugins/plugin-dev` 中文化无关的 Unity Agent Kit roadmap/spec/plan 变更。

---

## 任务 1：同步 Phase 5 planning artifact 并建立执行基线

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`
- 读取：5 个 Phase 5 JSON 文件
- 读取：14 个 Phase 5 shell 文件

- [ ] **步骤 1：确认主范围文件存在且当前 `plugins/plugin-dev` 主范围未被预先修改**

运行：

```bash
python - <<'PY'
from pathlib import Path
import subprocess

json_files = [
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/http-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json',
]
shell_files = [
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
]
all_targets = json_files + shell_files
missing = [p for p in all_targets if not Path(p).exists()]
if missing:
    raise SystemExit('missing Phase 5 target files: ' + ', '.join(missing))
changed = subprocess.check_output(['git', 'diff', '--name-only', '--', 'plugins/plugin-dev'], text=True).splitlines()
prechanged = [p for p in changed if p in all_targets]
if prechanged:
    raise SystemExit('Phase 5 target files already modified before implementation: ' + ', '.join(prechanged))
print('baseline ok: 5 JSON targets, 14 shell targets, no pre-existing Phase 5 target diffs')
PY
```

预期：输出 `baseline ok: 5 JSON targets, 14 shell targets, no pre-existing Phase 5 target diffs`。如果失败，停止并向用户确认是否基于现有修改继续。

- [ ] **步骤 2：更新 roadmap 的 Phase 5 spec/plan artifact 和 planned 状态**

编辑 `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`：

- `Current State` 保持 `Current Phase: Phase 5 — Examples, scripts, and final consistency`。
- `Current State` 的 `Next Manual Action` 改为 `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 5`。
- `Phase Summary` 中 Phase 5 行的 `Status` 改为 `planned`。
- `Phase Summary` 中 Phase 5 行的 `Artifacts` 改为 `Spec docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md; Plan docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md; Implementation Summary pending; Verification Evidence pending` 的当前表格格式。
- `Phase Details` 中 Phase 5 的 `Status` 改为 `planned`。
- `Phase Details` 中 Phase 5 的 `Spec` 改为 ``docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md``。
- `Phase Details` 中 Phase 5 的 `Plan` 改为 ``docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md``。
- `Change Log` 追加 `2026-05-17` 的 Phase 5 plan artifact 记录。

- [ ] **步骤 3：验证 roadmap planning artifact 同步成功**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md')
text = path.read_text(encoding='utf-8')
required = [
    '| Phase 5 — Examples, scripts, and final consistency | planned |',
    'Spec `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md`; Plan `docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md`; Implementation Summary pending; Verification Evidence pending',
    '- **Status:** planned',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md`',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md Phase 5`',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing roadmap token: {token}')
print('roadmap planning sync ok: Phase 5 spec and plan artifacts recorded')
PY
```

预期：输出 `roadmap planning sync ok: Phase 5 spec and plan artifacts recorded`。

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md \
  docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md \
  docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md
git commit -m "docs: plan plugin-dev translation phase 5"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 2：翻译并校验 5 个 JSON 示例

**文件：**
- 修改：`plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json`
- 修改：`plugins/plugin-dev/skills/mcp-integration/examples/http-server.json`
- 修改：`plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json`
- 修改：`plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json`
- 修改：`plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json`

- [ ] **步骤 1：翻译允许的 JSON 字符串值**

编辑以下字段，其他 JSON 内容保持不变：

```text
plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json
  description: "Go language server integration for Claude Code"
  改为: "Claude Code 的 Go language server 集成"

plugins/plugin-dev/skills/mcp-integration/examples/http-server.json
  _comment: "Example HTTP MCP server configuration for hosted MCP endpoints"
  改为: "托管 MCP endpoints 的 HTTP MCP server 配置示例"

plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json
  _comment: "Example SSE MCP server configuration for hosted cloud services. Hosted endpoints vary by provider; confirm current URLs and auth requirements in the provider's docs before using them."
  改为: "托管云服务的 SSE MCP server 配置示例。Hosted endpoints 因提供方而异；使用前请在提供方文档中确认当前 URL 和认证要求。"

plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json
  _comment: "Example stdio MCP server configuration for local file system access"
  改为: "本地文件系统访问的 stdio MCP server 配置示例"

plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json
  _comment: "WebSocket/ws is not a documented Claude Code MCP transport. Use stdio-server.json, sse-server.json, or http-server.json instead."
  改为: "WebSocket/ws 不是 Claude Code 文档化的 MCP transport。请改用 stdio-server.json、sse-server.json 或 http-server.json。"
```

- [ ] **步骤 2：验证 JSON 可解析且只改允许字段**

运行：

```bash
python - <<'PY'
from pathlib import Path
import json
import subprocess

paths = [
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/http-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json',
]

def compare(base, cur, path, key_path=()):
    if isinstance(base, dict) and isinstance(cur, dict):
        if set(base.keys()) != set(cur.keys()):
            raise SystemExit(f'JSON keys changed at {path}:{".".join(key_path) or "<root>"}')
        for key in base:
            compare(base[key], cur[key], path, key_path + (key,))
        return
    if isinstance(base, list) and isinstance(cur, list):
        if len(base) != len(cur):
            raise SystemExit(f'JSON list length changed at {path}:{".".join(key_path)}')
        for i, (left, right) in enumerate(zip(base, cur)):
            compare(left, right, path, key_path + (str(i),))
        return
    if base == cur:
        return
    if key_path and key_path[-1] == '_comment':
        return
    if path.endswith('minimal-lsp-plugin/.claude-plugin/plugin.json') and key_path == ('description',):
        return
    raise SystemExit(f'unexpected JSON value change at {path}:{".".join(key_path)}')

for path in paths:
    current = json.loads(Path(path).read_text(encoding='utf-8'))
    base_text = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8')
    base = json.loads(base_text)
    compare(base, current, path)
print('json ok: 5 files parse and only allowed _comment/description values changed')
PY
```

预期：输出 `json ok: 5 files parse and only allowed _comment/description values changed`。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json \
  plugins/plugin-dev/skills/mcp-integration/examples/http-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json
git commit -m "docs: translate plugin-dev phase 5 json examples"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 3：翻译并校验 agent/command shell 脚本注释

**文件：**
- 修改：`plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh`
- 修改：`plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh`
- 修改：`plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh`
- 修改：`plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh`
- 修改：`plugins/plugin-dev/skills/command-development/scripts/validate-command.sh`

- [ ] **步骤 1：列出本任务 shell 注释候选行**

运行：

```bash
python - <<'PY'
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
]
for path in paths:
    print(f'## {path}')
    for number, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        stripped = line.lstrip()
        if stripped.startswith('#') and not stripped.startswith('#!'):
            print(f'{number}: {line}')
PY
```

预期：输出 5 个文件中的注释候选行；只把这些候选行中的用户可读英文翻译为中文。

- [ ] **步骤 2：翻译注释并保留所有输出文本**

编辑本任务 5 个 shell 文件：

- shebang `#!/bin/bash` 保持原文。
- 只翻译以 `#` 开头且不是 shebang 的注释行。
- 不翻译 `echo`、`printf`、usage、error、warning、success、failed、passed 输出。
- 不翻译 heredoc 内容。
- 不修改命令、变量、函数名、参数、控制流、退出码、路径或正则表达式。
- 术语按 Phase 1 glossary 处理：`agent`、`command`、`frontmatter`、`YAML`、`Markdown`、`Claude Code`、`JSON` 等关键 token 保留英文。

- [ ] **步骤 3：验证本任务 shell 文件语法有效且只改注释**

运行：

```bash
python - <<'PY'
import subprocess

paths = [
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
]
for path in paths:
    subprocess.check_call(['bash', '-n', path])
    diff = subprocess.check_output(['git', 'diff', '--', path], text=True, encoding='utf-8')
    for line in diff.splitlines():
        if line.startswith(('+++', '---', '@@')):
            continue
        if line.startswith(('+', '-')):
            content = line[1:]
            stripped = content.lstrip()
            if not (stripped.startswith('#') and not stripped.startswith('#!')):
                raise SystemExit(f'non-comment shell change in {path}: {line}')
print('agent/command shell ok: syntax valid and only comments changed')
PY
```

预期：输出 `agent/command shell ok: syntax valid and only comments changed`。

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh \
  plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh \
  plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh \
  plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh \
  plugins/plugin-dev/skills/command-development/scripts/validate-command.sh
git commit -m "docs: translate plugin-dev agent and command script comments"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 4：翻译并校验 hook/plugin-settings shell 脚本注释

**文件：**
- 修改：`plugins/plugin-dev/skills/hook-development/examples/load-context.sh`
- 修改：`plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh`
- 修改：`plugins/plugin-dev/skills/hook-development/examples/validate-write.sh`
- 修改：`plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh`
- 修改：`plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh`
- 修改：`plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh`
- 修改：`plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh`
- 修改：`plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh`
- 修改：`plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh`

- [ ] **步骤 1：列出本任务 shell 注释候选行**

运行：

```bash
python - <<'PY'
from pathlib import Path

paths = [
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
]
for path in paths:
    print(f'## {path}')
    for number, line in enumerate(Path(path).read_text(encoding='utf-8').splitlines(), 1):
        stripped = line.lstrip()
        if stripped.startswith('#') and not stripped.startswith('#!'):
            print(f'{number}: {line}')
PY
```

预期：输出 9 个文件中的注释候选行；只把这些候选行中的用户可读英文翻译为中文。

- [ ] **步骤 2：翻译注释并保留所有输出文本**

编辑本任务 9 个 shell 文件：

- shebang `#!/bin/bash` 保持原文。
- 只翻译以 `#` 开头且不是 shebang 的注释行。
- 不翻译 `echo`、`printf`、usage、error、warning、success、failed、passed 输出。
- 不翻译 heredoc 内容。
- 不修改命令、变量、函数名、参数、控制流、退出码、路径或正则表达式。
- 术语按 Phase 1 glossary 处理：`hook`、`matcher`、`PreToolUse`、`PostToolUse`、`UserPromptSubmit`、`settings`、`frontmatter`、`YAML`、`JSON` 等关键 token 保留英文。

- [ ] **步骤 3：验证本任务 shell 文件语法有效且只改注释**

运行：

```bash
python - <<'PY'
import subprocess

paths = [
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
]
for path in paths:
    subprocess.check_call(['bash', '-n', path])
    diff = subprocess.check_output(['git', 'diff', '--', path], text=True, encoding='utf-8')
    for line in diff.splitlines():
        if line.startswith(('+++', '---', '@@')):
            continue
        if line.startswith(('+', '-')):
            content = line[1:]
            stripped = content.lstrip()
            if not (stripped.startswith('#') and not stripped.startswith('#!')):
                raise SystemExit(f'non-comment shell change in {path}: {line}')
print('hook/plugin-settings shell ok: syntax valid and only comments changed')
PY
```

预期：输出 `hook/plugin-settings shell ok: syntax valid and only comments changed`。

- [ ] **步骤 4：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  plugins/plugin-dev/skills/hook-development/examples/load-context.sh \
  plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh \
  plugins/plugin-dev/skills/hook-development/examples/validate-write.sh \
  plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh \
  plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh \
  plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh \
  plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh \
  plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh \
  plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh
git commit -m "docs: translate plugin-dev hook and settings script comments"
```

预期：只有用户明确授权提交时才执行；否则跳过。

---

## 任务 5：执行最终自然语言一致性扫描并处理漏网项

**文件：**
- 读取：`plugins/plugin-dev/**/*.md`
- 读取：`plugins/plugin-dev/**/*.json`
- 读取：`plugins/plugin-dev/**/*.sh`
- 条件修改：符合 Phase 5 规格的主范围外漏网文件

- [ ] **步骤 1：运行 code fence 外自然语言扫描**

运行：

```bash
python - <<'PY'
from pathlib import Path
import json
import re

root = Path('plugins/plugin-dev')
allow_words = {
    'Claude', 'Code', 'MCP', 'LSP', 'JSON', 'YAML', 'API', 'HTTP', 'SSE', 'stdio', 'WebSocket', 'OAuth',
    'frontmatter', 'manifest', 'schema', 'plugin', 'plugins', 'skill', 'skills', 'command', 'commands',
    'agent', 'agents', 'hook', 'hooks', 'settings', 'tool', 'tools', 'resource', 'resources', 'prompt', 'prompts',
    'server', 'servers', 'client', 'clients', 'model', 'models', 'workflow', 'workflows', 'validation',
    'README', 'SKILL', 'CLAUDE', 'Claude', 'Code', 'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop',
    'SubagentStop', 'SessionStart', 'SessionEnd', 'PermissionRequest', 'Notification', 'TaskCompleted',
    'Language', 'Server', 'Protocol', 'Go', 'gopls', 'pyright', 'typescript', 'rust', 'matcher', 'hostPattern',
    'strictKnownMarketplaces', 'mcpServers', 'lspServers', 'extensionToLanguage', 'initializationOptions',
}
word_re = re.compile(r'[A-Za-z][A-Za-z0-9_-]*')

def suspicious_words(text):
    words = [w for w in word_re.findall(text) if w not in allow_words]
    words = [w for w in words if not re.search(r'[_/.$:{}`<>@-]', w)]
    return words

def markdown_outside_fences(path):
    in_fence = False
    fence = None
    for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        stripped = line.lstrip()
        if not in_fence and (stripped.startswith('```') or stripped.startswith('~~~')):
            in_fence = True
            fence = stripped[:3]
            continue
        if in_fence:
            if stripped.startswith(fence):
                in_fence = False
                fence = None
            continue
        yield number, line

records = []
for path in sorted(root.rglob('*.md')):
    for number, line in markdown_outside_fences(path):
        words = suspicious_words(line)
        if len(words) >= 3:
            records.append((str(path), number, ','.join(words[:8]), line.strip()))
for path in sorted(root.rglob('*.json')):
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        records.append((str(path), exc.lineno, 'JSON_PARSE_ERROR', str(exc)))
        continue
    def walk(value, key_path=()):
        if isinstance(value, dict):
            for key, child in value.items():
                walk(child, key_path + (key,))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                walk(child, key_path + (str(index),))
        elif isinstance(value, str) and key_path and key_path[-1] in {'_comment', 'description'}:
            words = suspicious_words(value)
            if len(words) >= 3:
                records.append((str(path), '.'.join(key_path), ','.join(words[:8]), value))
    walk(data)
for path in sorted(root.rglob('*.sh')):
    for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        stripped = line.lstrip()
        if stripped.startswith('#') and not stripped.startswith('#!'):
            words = suspicious_words(stripped)
            if len(words) >= 3:
                records.append((str(path), number, ','.join(words[:8]), stripped))

if records:
    print('residual natural-language review candidates:')
    for path, loc, words, text in records[:250]:
        print(f'{path}:{loc}: [{words}] {text}')
    if len(records) > 250:
        print(f'... truncated {len(records) - 250} additional candidates')
else:
    print('residual natural-language scan ok: no review candidates')
PY
```

预期：输出 `residual natural-language scan ok: no review candidates` 或 `residual natural-language review candidates:`。若出现候选行，逐条分类为“合理保留英文”“符合 Phase 5 漏网修复边界”“需另行决策”。

- [ ] **步骤 2：修复符合规格边界的漏网自然语言**

仅当步骤 1 发现符合 Phase 5 规格的漏网项时编辑对应文件。每个修改必须满足：

- 位于 `plugins/plugin-dev` 内。
- 位于 Markdown code fence 外、JSON `_comment`/允许翻译的 `description`，或 shell 注释中。
- 属于明显用户可读自然语言。
- 不改变代码块、JSON 键名、shell 输出文本、路径、命令、字段名、工具名、模型名、API 名或 schema token。

记录格式：

```text
Leak repair record:
- path: <exact file path>
  reason: code fence 外 / JSON 允许字段 / shell 注释中的明显用户可读英文
  boundary: 未修改机器可读字段、代码块或 shell 输出文本
```

如果没有符合边界的漏网项，记录 `leak repair: none`。

- [ ] **步骤 3：重新运行扫描并记录最终分类摘要**

再次运行步骤 1 的 Python 扫描命令。

预期：没有未分类的明显用户可读英文；剩余候选行全部属于 allowlist 技术 token、路径、命令、字段名、工具名、模型名、API 名、schema token、示例服务名或需另行决策项。

---

## 任务 6：执行最终验证并收集验收证据

**文件：**
- 读取：所有 Phase 5 主范围文件
- 读取：所有本阶段修改过的 `plugins/plugin-dev` 文件

- [ ] **步骤 1：验证 `plugins/plugin-dev` 修改范围**

运行：

```bash
python - <<'PY'
import subprocess

main_scope = {
    'plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/http-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json',
    'plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json',
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
}
changed = subprocess.check_output(['git', 'diff', '--name-status', '--', 'plugins/plugin-dev'], text=True).splitlines()
plugin_paths = []
non_modify_statuses = []
for row in changed:
    parts = row.split('\t')
    status = parts[0]
    path = parts[-1]
    plugin_paths.append(path)
    if status != 'M':
        non_modify_statuses.append(row)
outside_main = [p for p in plugin_paths if p not in main_scope]
if non_modify_statuses:
    raise SystemExit('unexpected add/delete/rename in plugins/plugin-dev: ' + '; '.join(non_modify_statuses))
print(f'scope check: {len([p for p in plugin_paths if p in main_scope])} main Phase 5 files modified')
print(f'leak repair files outside main scope: {len(outside_main)}')
for path in outside_main:
    print(f'leak repair candidate: {path}')
PY
```

预期：输出主范围修改数量和主范围外漏网修复数量；若出现主范围外路径，必须与任务 5 的 `Leak repair record` 一一对应。

- [ ] **步骤 2：验证 5 个 JSON 文件 parse 和结构保护**

运行任务 2 步骤 2 的 JSON 验证命令。

预期：输出 `json ok: 5 files parse and only allowed _comment/description values changed`。

- [ ] **步骤 3：验证 14 个 shell 文件语法有效且只改注释**

运行：

```bash
python - <<'PY'
import subprocess

paths = [
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
]
modified = []
checked_clean = []
for path in paths:
    subprocess.check_call(['bash', '-n', path])
    diff = subprocess.check_output(['git', 'diff', '--', path], text=True, encoding='utf-8')
    if diff.strip():
        modified.append(path)
    else:
        checked_clean.append(path)
    for line in diff.splitlines():
        if line.startswith(('+++', '---', '@@')):
            continue
        if line.startswith(('+', '-')):
            content = line[1:]
            stripped = content.lstrip()
            if not (stripped.startswith('#') and not stripped.startswith('#!')):
                raise SystemExit(f'non-comment shell change in {path}: {line}')
print(f'shell ok: 14 files syntax valid; {len(modified)} modified comment-only; {len(checked_clean)} checked unchanged')
PY
```

预期：输出 `shell ok: 14 files syntax valid; ... modified comment-only; ... checked unchanged`。

- [ ] **步骤 4：验证 shell 输出文本保持原文**

运行：

```bash
python - <<'PY'
from pathlib import Path
import subprocess

paths = [
    'plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh',
    'plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh',
    'plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh',
    'plugins/plugin-dev/skills/command-development/scripts/validate-command.sh',
    'plugins/plugin-dev/skills/hook-development/examples/load-context.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh',
    'plugins/plugin-dev/skills/hook-development/examples/validate-write.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh',
    'plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh',
    'plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh',
    'plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh',
]
keywords = ('echo', 'printf', 'Usage', 'usage', 'Error', 'ERROR', 'Warning', 'WARNING', 'Success', 'Failed', 'failed', 'passed', 'cat <<')
for path in paths:
    base = subprocess.check_output(['git', 'show', f'HEAD:{path}'], text=True, encoding='utf-8').splitlines()
    cur = Path(path).read_text(encoding='utf-8').splitlines()
    base_outputs = [line for line in base if any(k in line for k in keywords)]
    cur_outputs = [line for line in cur if any(k in line for k in keywords)]
    if base_outputs != cur_outputs:
        raise SystemExit(f'shell output-like lines changed: {path}')
print('shell output text ok: echo/printf/usage/error/status-like lines match HEAD')
PY
```

预期：输出 `shell output text ok: echo/printf/usage/error/status-like lines match HEAD`。

- [ ] **步骤 5：验证格式没有 whitespace error**

运行：

```bash
git diff --check
```

预期：无 whitespace error；如果只有 LF/CRLF 提示且退出码为 0，在最终证据中说明。

- [ ] **步骤 6：整理验收证据摘要**

记录以下证据文本，供任务 7 写入 roadmap：

```text
Phase 5 evidence draft:
- Scope: <任务 6 步骤 1 输出摘要；主范围修改数量；漏网修复数量和路径>
- JSON: json ok: 5 files parse and only allowed _comment/description values changed
- Shell syntax/comment guard: shell ok: 14 files syntax valid; <N> modified comment-only; <M> checked unchanged
- Shell output guard: shell output text ok: echo/printf/usage/error/status-like lines match HEAD
- Final natural-language scan: <任务 5 最终扫描结论；合理保留英文分类；已修复漏网项或需另行决策项>
- Format: git diff --check passed; <如有 LF/CRLF 警告则说明无 whitespace error>
```

---

## 任务 7：更新 roadmap Phase 5 完成状态和证据

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`

- [ ] **步骤 1：只在任务 6 全部验证通过后更新 Phase 5 completion 状态**

编辑 `docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md`，按当前新版表格格式更新：

- `Metadata` 的 `Last Sync` 保持或更新为 `2026-05-17`。
- `Current State` 中 `Roadmap Status` 改为 `completed`。
- `Current State` 中 `Current Phase` 改为 `None — all phases completed`。
- `Current State` 中 `Next Manual Action` 改为 `Review final diff and decide whether to commit or open PR`。
- `Phase Summary` 中 Phase 5 行状态改为 `completed`。
- `Phase Summary` 中 Phase 5 行 artifacts 改为 `Spec ...; Plan ...; Implementation Summary recorded; Verification Evidence recorded`。
- `Phase Details` 中 Phase 5 的 `Status` 改为 `completed`。
- `Phase Details` 中 Phase 5 的 `Implementation Summary` 写一段简短执行摘要，只记录主要变更和是否存在漏网修复。
- `Phase Details` 中 Phase 5 的 `Verification Evidence` 写入任务 6 步骤 6 的证据摘要。
- `Change Log` 追加 `2026-05-17` 的 Phase 5 完成记录。

如果任一验证未通过，不更新为 `completed`；保留当前状态并记录实际缺口或 blocker。

- [ ] **步骤 2：验证 roadmap completion 同步成功**

运行：

```bash
python - <<'PY'
from pathlib import Path

path = Path('docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md')
text = path.read_text(encoding='utf-8')
required = [
    '- **Roadmap Status:** completed',
    '- **Current Phase:** None — all phases completed',
    '- **Next Manual Action:** Review final diff and decide whether to commit or open PR',
    '| Phase 5 — Examples, scripts, and final consistency | completed |',
    'Spec `docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md`; Plan `docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md`; Implementation Summary recorded; Verification Evidence recorded',
    '### Phase 5 — Examples, scripts, and final consistency',
    '- **Status:** completed',
    '- **Implementation Summary:**',
    '- **Verification Evidence:**',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing roadmap completion token: {token}')
print('roadmap completion sync ok: Phase 5 completed and roadmap marked completed')
PY
```

预期：输出 `roadmap completion sync ok: Phase 5 completed and roadmap marked completed`。

- [ ] **步骤 3：提交检查点（仅用户明确授权时执行）**

运行：

```bash
git add \
  docs/superpowers/roadmaps/2026-05-15-plugin-dev-zh-translation/ROADMAP.md \
  docs/superpowers/specs/2026-05-17-plugin-dev-zh-translation-phase-5-design.md \
  docs/superpowers/plans/2026-05-17-plugin-dev-zh-translation-phase-5.md \
  plugins/plugin-dev/skills/lsp-integration/examples/minimal-lsp-plugin/.claude-plugin/plugin.json \
  plugins/plugin-dev/skills/mcp-integration/examples/http-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/sse-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/stdio-server.json \
  plugins/plugin-dev/skills/mcp-integration/examples/ws-server.json \
  plugins/plugin-dev/skills/agent-development/scripts/create-agent-skeleton.sh \
  plugins/plugin-dev/skills/agent-development/scripts/test-agent-trigger.sh \
  plugins/plugin-dev/skills/agent-development/scripts/validate-agent.sh \
  plugins/plugin-dev/skills/command-development/scripts/check-frontmatter.sh \
  plugins/plugin-dev/skills/command-development/scripts/validate-command.sh \
  plugins/plugin-dev/skills/hook-development/examples/load-context.sh \
  plugins/plugin-dev/skills/hook-development/examples/validate-bash.sh \
  plugins/plugin-dev/skills/hook-development/examples/validate-write.sh \
  plugins/plugin-dev/skills/hook-development/scripts/hook-linter.sh \
  plugins/plugin-dev/skills/hook-development/scripts/test-hook.sh \
  plugins/plugin-dev/skills/hook-development/scripts/validate-hook-schema.sh \
  plugins/plugin-dev/skills/plugin-settings/examples/read-settings-hook.sh \
  plugins/plugin-dev/skills/plugin-settings/scripts/parse-frontmatter.sh \
  plugins/plugin-dev/skills/plugin-settings/scripts/validate-settings.sh
git commit -m "docs: complete plugin-dev translation phase 5"
```

预期：只有用户明确授权提交时才执行；否则跳过。若任务 5 修改了主范围外漏网文件，提交前把那些精确路径也加入 `git add`。
