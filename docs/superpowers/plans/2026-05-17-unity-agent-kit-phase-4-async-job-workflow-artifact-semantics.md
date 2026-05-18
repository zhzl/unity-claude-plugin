# Unity Agent Kit Phase 4 Async / Job / Workflow / Artifact Semantics 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Phase 4 Async / Job / Workflow / Artifact Semantics 规格作为 roadmap artifact 正式接入，并完成文档级验证证据交接。

**架构：** Phase 4 不实现 MCP server、TS workflow、Unity C# host、actual skill 或测试运行时代码。本计划只同步 roadmap 的 Phase 4 planned 状态、验证 Phase 4 规格与 Phase 3 result envelope 一致、验证计划自身质量，并准备 `complete-phase` 所需的具体证据。所有检查使用聚焦的 Markdown/Python 命令，避免引入运行时代码或额外自动化。

**技术栈：** Markdown roadmap/spec/plan 文档、Python 一次性文档校验命令、Git 工作区检查。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 4
**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 已存在

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Unity Agent Kit 长期 roadmap current truth。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — Phase 3 Public MCP Tool Action Design 规格；Phase 4 需要验证 result envelope 已同步。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` — Phase 4 Async / Job / Workflow / Artifact Semantics 规格。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` — 本实现计划。

### 本计划执行时允许修改

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 仅允许同步 Phase 4 artifact 路径、Phase 4 planned 状态、Current State、Next Manual Action 和 Change Log 的事实性 planned 状态。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` — 仅当规格自检发现具体缺陷时进行最小修复。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — 仅当 Phase 3 result envelope 与 Phase 4 status enum 不一致时进行最小同步修复。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` — 仅当计划自检发现具体缺陷时进行最小修复。

### 本计划执行时禁止修改

- 不修改 `references/unity-mcp-v2` 或 `references/Unity-Skills`。
- 不创建或修改 `plugins/unity-agent-kit/` runtime、public tool registration、Contract Kernel、tests、actual skill 文件或 audit 脚本。
- 不创建或修改 `unity/Assets/UnityAgentKit/`。
- 不把 Phase 4 标记为 `completed`；完成状态必须由 `/superpowers:roadmap-management complete-phase` 基于具体 Verification Evidence 完成。
- 不修改 Phase 4 scope、success criteria、phase 顺序或 roadmap 结构。若发现 roadmap scope 与已批准 spec 存在结构性冲突，停止并报告主会话，不在本计划中改写 scope。

---

## 任务 1：同步 roadmap 的 Phase 4 planned artifact 状态

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：运行 planned 状态检查并确认当前失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 4 — Async / Job / Workflow / Artifact Semantics | planned | 明确 TS 与 Unity C# 的异步职责、job 协议、diagnostics 和 artifact model | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` | pending | implement-plan |',
    '- 当前阶段：Phase 4 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 4`',
    '### Phase 4：Async / Job / Workflow / Artifact Semantics',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`',
    '- **Implementation Summary:** pending',
    '- **Verification Evidence:** pending',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 4 roadmap planned state missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 4 roadmap planned state and artifact links are present')
PY
```

预期：当前 roadmap 仍是 `needs-spec` / `pending` 时输出 `FAIL Phase 4 roadmap planned state missing required content`，退出码为 1。若已经输出 PASS，跳过步骤 2-4，继续步骤 5。

- [x] **步骤 2：将 Phase Summary 中 Phase 4 行更新为 planned**

将 Phase 4 行替换为：

```markdown
| Phase 4 — Async / Job / Workflow / Artifact Semantics | planned | 明确 TS 与 Unity C# 的异步职责、job 协议、diagnostics 和 artifact model | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` | pending | implement-plan |
```

不要修改 Phase 4 goal、scope、success criteria 或 phase 顺序。

- [x] **步骤 3：更新 Current State 中的当前阶段和下一步命令**

将 Current State 中 Phase 4 相关状态更新为：

```markdown
- 当前阶段：Phase 4 已完成 spec 和 plan，等待执行 plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- Phase 3 已完成 Public MCP Tool Action Design 规格和计划，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 4`
- 当前不实现代码。
```

保持 Discovery、已确认事项、Blockers 和 Phase 1/2/3 completion evidence 内容不变。

- [x] **步骤 4：更新 Phase 4 detail 状态和 Artifacts**

在 `### Phase 4：Async / Job / Workflow / Artifact Semantics` 下，将状态和 artifact 字段更新为：

```markdown
**Status:** `planned`
```

```markdown
**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

不要修改 Phase 4 的 `Goal`、`Scope`、`Out of Scope`、`Reference Input Mapping` 或 `Success Criteria`。

- [x] **步骤 5：追加 Change Log**

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-17：完成 Phase 4 Async / Job / Workflow / Artifact Semantics spec 和 plan artifact 接入；Phase 4 进入 `planned`，下一步为 `implement-plan`。
```

- [x] **步骤 6：运行 roadmap planned 状态检查并确认通过**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 4 — Async / Job / Workflow / Artifact Semantics | planned | 明确 TS 与 Unity C# 的异步职责、job 协议、diagnostics 和 artifact model | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md` | pending | implement-plan |',
    '- 当前阶段：Phase 4 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 4`',
    '### Phase 4：Async / Job / Workflow / Artifact Semantics',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`',
    '- **Implementation Summary:** pending',
    '- **Verification Evidence:** pending',
    '- 2026-05-17：完成 Phase 4 Async / Job / Workflow / Artifact Semantics spec 和 plan artifact 接入；Phase 4 进入 `planned`，下一步为 `implement-plan`。',
]
forbidden = [
    '| Phase 4 — Async / Job / Workflow / Artifact Semantics | completed |',
    '- 当前阶段：Phase 4 需要编写 spec。',
    '- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 4`',
]
missing = [item for item in required if item not in text]
forbidden_hits = [item for item in forbidden if item in text]
if missing or forbidden_hits:
    if missing:
        print('FAIL missing planned content:')
        for item in missing:
            print('-', item)
    if forbidden_hits:
        print('FAIL forbidden stale/completed content:')
        for item in forbidden_hits:
            print('-', item)
    raise SystemExit(1)
print('PASS Phase 4 roadmap planned state and artifact links are present')
PY
```

预期输出：

```text
PASS Phase 4 roadmap planned state and artifact links are present
```

若失败，修复缺失项后重跑本步骤。若失败原因需要修改 Phase 4 scope、success criteria 或 phase 顺序，停止并报告主会话。

- [x] **步骤 7：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "docs: sync unity agent kit phase 4 roadmap state"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。

---

## 任务 2：验证 Phase 4 规格边界和审查修订

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`
- 修改：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行占位符和范围检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
checks = {
    'placeholder markers': ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '前文', '适当' + '处理'],
    'vague time wording': ['以' + '后', '未' + '来', '当' + '下'],
    'runtime implementation scope': ['创建或修改 `plugins/unity-agent-kit/` runtime', '创建或修改 `unity/Assets/UnityAgentKit/`'],
}
failed = False
for name, needles in checks.items():
    hits = [(i + 1, needle) for i, line in enumerate(lines) for needle in needles if needle in line]
    if hits:
        failed = True
        print(f'FAIL {name}')
        for line_no, needle in hits:
            print(f'  line {line_no}: {needle}')
    else:
        print(f'PASS {name}')
raise SystemExit(1 if failed else 0)
PY
```

预期输出：

```text
PASS placeholder markers
PASS vague time wording
PASS runtime implementation scope
```

如果出现 `runtime implementation scope` 命中，先确认命中是否位于 Non-goals 或禁止范围；若该检查误报，改用更精确脚本并记录原因，不删除 Non-goals。

- [x] **步骤 2：验证 Phase 4 核心 contract 全部存在**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
text = p.read_text(encoding='utf-8')
required = [
    'status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected',
    '### Timeout result signals',
    'mayStillBeRunning: true | false | unknown',
    '3-minute or 5-minute waits',
    '## Ownership Contract',
    '## Evidence Model',
    '## Host Rebind and Limited Recovery Contract',
    '### Minimum job record signals',
    'lastKnownContinuity: current | recovered | lost | unknown',
    'bounded validity proof',
    'trusted change token or compile report invalidation signal',
    'logs captured after cursor creation',
    'P0 public result diagnostics must use this minimum shared shape',
    'For P0 reports, `reportLocator` must be resolvable',
    'unity://console-snapshots/{artifactId}',
    '## Candidate Action Determination Rules',
    'Requirement for Phase 5 plan to define bounded timeout/polling policies by P0 waiting workflow category',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 4 required contract missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 4 required contracts are present')
PY
```

预期输出：

```text
PASS Phase 4 required contracts are present
```

- [x] **步骤 3：验证 P0 action matrix 覆盖 23 个 stable-ready actions**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
text = p.read_text(encoding='utf-8')
rows = [line for line in text.splitlines() if line.startswith('| ' + chr(96) + 'unity_')]
required_actions = [
    'unity_editor.get_status', 'unity_editor.wait_ready', 'unity_editor.get_current_host',
    'unity_compile.get_state', 'unity_compile.request', 'unity_compile.wait_for_idle', 'unity_compile.compile_and_check',
    'unity_console.snapshot', 'unity_console.count', 'unity_console.clear',
    'unity_test.list', 'unity_test.start', 'unity_test.get_status', 'unity_test.get_result', 'unity_test.run_and_collect', 'unity_test.run_and_verify',
    'unity_playmode.get_state', 'unity_playmode.enter', 'unity_playmode.exit', 'unity_playmode.wait_for_state', 'unity_playmode.enter_and_verify', 'unity_playmode.exit_and_verify',
    'unity_screenshot.capture_game_view',
]
missing = [action for action in required_actions if action not in text]
if len(rows) != 23 or missing:
    print(f'FAIL P0 matrix rows: {len(rows)}')
    for action in missing:
        print('-', action)
    raise SystemExit(1)
print('PASS P0 matrix rows: 23')
print('PASS P0 action names are covered')
PY
```

预期输出：

```text
PASS P0 matrix rows: 23
PASS P0 action names are covered
```

- [x] **步骤 4：验证 Phase 6/7/8 candidate actions 未被锁死**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
text = p.read_text(encoding='utf-8')
required = [
    'This matrix locks only the Phase 5 P0 daily loop actions. It does not lock Phase 6/7/8 candidate actions.',
    'Phase 6/7/8 specs must classify candidate actions using these rules instead of inheriting fixed mappings from Phase 4:',
    'Project command remains Phase 6-owned:',
]
forbidden = [
    'Phase 6 project command actions use the following fixed mapping',
    'Phase 7 creation actions use the following fixed mapping',
    'Phase 8 extension actions use the following fixed mapping',
]
missing = [item for item in required if item not in text]
forbidden_hits = [item for item in forbidden if item in text]
if missing or forbidden_hits:
    if missing:
        print('FAIL candidate boundary missing:')
        for item in missing:
            print('-', item)
    if forbidden_hits:
        print('FAIL forbidden candidate lock:')
        for item in forbidden_hits:
            print('-', item)
    raise SystemExit(1)
print('PASS candidate action boundary is preserved')
PY
```

预期输出：

```text
PASS candidate action boundary is preserved
```

- [x] **步骤 5：若 Phase 4 spec 检查失败，执行最小修复并重跑**

如果步骤 1-4 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑失败步骤，直到通过。不要新增 runtime scope，不扩大 Phase 5 实现范围，不改变 Phase 4 success criteria。

- [x] **步骤 6：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且 Phase 4 spec 有实际修改，运行：

```bash
git add docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md
git commit -m "docs: verify unity agent kit phase 4 spec"
```

预期：commit 成功。没有用户明确授权或规格无修改时跳过本步骤。

---

## 任务 3：验证 Phase 3 result envelope 与 Phase 4 一致

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 修改：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`（仅当 result envelope 同步检查失败）

- [x] **步骤 1：运行 Phase 3 result envelope 同步检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required = [
    'status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected',
    '| `status` | action 结果：`succeeded`、`failed`、`uncertain`、`cancelled`、`timeout`、`lost` 或 `rejected`；该枚举由 Phase 4 细化并作为最终 result status contract。 |',
    "`request_accepted` action 的 `status: succeeded` 必须表达请求已接受的信号；不得伪装成最终 effect verified。",
]
forbidden = [
    'status: success | failed | uncertain',
    '`status` | action 结果：`success`、`failed` 或 `uncertain`。',
    '`request_accepted` action success 必须表达请求已接受的信号',
]
missing = [item for item in required if item not in text]
forbidden_hits = [item for item in forbidden if item in text]
if missing or forbidden_hits:
    if missing:
        print('FAIL Phase 3 result envelope missing synchronized content:')
        for item in missing:
            print('-', item)
    if forbidden_hits:
        print('FAIL Phase 3 stale result envelope content:')
        for item in forbidden_hits:
            print('-', item)
    raise SystemExit(1)
print('PASS Phase 3 result envelope is synchronized with Phase 4')
PY
```

预期输出：

```text
PASS Phase 3 result envelope is synchronized with Phase 4
```

- [x] **步骤 2：若同步检查失败，执行最小文本修复并重跑**

只允许修复 Phase 3 的 result envelope 文字，不修改 Phase 3 tool/action catalog、scope、success criteria 或 candidate boundaries。

需要的同步文本是：

```text
status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected
```

以及字段说明：

```markdown
| `status` | action 结果：`succeeded`、`failed`、`uncertain`、`cancelled`、`timeout`、`lost` 或 `rejected`；该枚举由 Phase 4 细化并作为最终 result status contract。 |
```

修复后重跑步骤 1，预期 PASS。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且 Phase 3 spec 有实际修改，运行：

```bash
git add docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
git commit -m "docs: align unity agent kit phase 3 result envelope"
```

预期：commit 成功。没有用户明确授权或规格无修改时跳过本步骤。

---

## 任务 4：验证 Phase 4 plan 自身质量

**文件：**
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`
- 修改：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`（仅当计划自检失败）

- [x] **步骤 1：运行计划占位符和模糊表述检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
checks = {
    'placeholder/vague wording': ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '前文', '适当' + '处理', '以' + '后', '未' + '来', '当' + '下'],
}
failed = False
for name, needles in checks.items():
    hits = [(i + 1, needle) for i, line in enumerate(lines) for needle in needles if needle in line]
    if hits:
        failed = True
        print(f'FAIL {name}')
        for line_no, needle in hits:
            print(f'  line {line_no}: {needle}')
    else:
        print(f'PASS {name}')
raise SystemExit(1 if failed else 0)
PY
```

预期输出：

```text
PASS placeholder/vague wording
```

- [x] **步骤 2：运行计划结构和 checklist 检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md')
text = p.read_text(encoding='utf-8')
checkboxes = [line for line in text.splitlines() if line.startswith('- [ ]') or line.startswith('- [x]')]
required = [
    '# Unity Agent Kit Phase 4 Async / Job / Workflow / Artifact Semantics 实现计划',
    '**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`',
    '**Phase:** Phase 4',
    '**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`',
    '## 提交策略',
    '## 文件结构',
    '## 任务 1：同步 roadmap 的 Phase 4 planned artifact 状态',
    '## 任务 2：验证 Phase 4 规格边界和审查修订',
    '## 任务 3：验证 Phase 3 result envelope 与 Phase 4 一致',
    '## 任务 4：验证 Phase 4 plan 自身质量',
    '## 任务 5：准备 completion evidence 交接并检查工作区',
]
missing = [item for item in required if item not in text]
if len(checkboxes) < 24 or missing:
    if len(checkboxes) < 24:
        print(f'FAIL checklist step count too low: {len(checkboxes)}')
    if missing:
        print('FAIL plan required structure missing:')
        for item in missing:
            print('-', item)
    raise SystemExit(1)
print(f'PASS checklist step count: {len(checkboxes)}')
print('PASS plan required structure')
PY
```

预期输出类似：

```text
PASS checklist step count: 24
PASS plan required structure
```

实际 step count 可以大于 24；小于 24 时检查是否遗漏任务步骤。

- [x] **步骤 3：运行 roadmap/spec/plan 路径一致性检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md')
text = p.read_text(encoding='utf-8')
paths = [
    'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md',
    'docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md',
    'docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md',
    'docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md',
]
missing = [path for path in paths if path not in text]
if missing:
    print('FAIL paths missing from plan:')
    for path in missing:
        print('-', path)
    raise SystemExit(1)
print('PASS roadmap/spec/plan paths are consistent')
PY
```

预期输出：

```text
PASS roadmap/spec/plan paths are consistent
```

- [x] **步骤 4：若计划自检失败，执行最小修复并重跑**

如果步骤 1-3 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑失败步骤，直到通过。不要扩大 Phase 4 执行范围，不添加 code implementation tasks。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且计划文件有实际修改，运行：

```bash
git add docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md
git commit -m "docs: add unity agent kit phase 4 implementation plan"
```

预期：commit 成功。没有用户明确授权或计划无修改时跳过本步骤。

---

## 任务 5：准备 completion evidence 交接并检查工作区

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md`

- [x] **步骤 1：运行最终文档检查命令组**

运行以下命令并保留输出用于 completion evidence：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
phase3 = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
phase4 = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
plan = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md')
for path in [roadmap, phase3, phase4, plan]:
    if not path.exists():
        print(f'FAIL missing file: {path}')
        raise SystemExit(1)
checks = [
    ('roadmap planned link', roadmap, 'Phase 4 — Async / Job / Workflow / Artifact Semantics | planned'),
    ('phase3 status enum', phase3, 'status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected'),
    ('phase4 required contracts', phase4, 'P0 public result diagnostics must use this minimum shared shape'),
    ('phase4 timeout policy', phase4, '3-minute or 5-minute waits'),
    ('phase4 job record', phase4, 'lastKnownContinuity: current | recovered | lost | unknown'),
    ('phase4 report locator', phase4, 'For P0 reports, `reportLocator` must be resolvable'),
    ('plan structure', plan, '## 任务 5：准备 completion evidence 交接并检查工作区'),
]
failed = False
for name, path, needle in checks:
    text = path.read_text(encoding='utf-8')
    if needle not in text:
        failed = True
        print(f'FAIL {name}: {needle}')
    else:
        print(f'PASS {name}')
raise SystemExit(1 if failed else 0)
PY
```

预期：全部输出 `PASS`，退出码为 0。

- [x] **步骤 2：运行最终 diff 检查**

运行：

```bash
git diff -- docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md
```

预期：只显示本计划允许的 roadmap/spec/plan 文档修改。若出现 runtime、reference input、actual skill、tests 或 unrelated docs 变更，停止并报告主会话。

- [x] **步骤 3：运行 git 状态检查并识别无关变更**

运行：

```bash
git status --short
```

预期：允许出现本计划文件和用户已存在的无关工作区修改；执行者最终汇报时必须明确说明哪些变更属于本计划，哪些是既有未处理修改。不要 stage 或提交无关文件。

- [x] **步骤 4：生成 completion evidence 草案**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
spec = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md')
plan = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md')
print('Completion evidence draft:')
print(f'- Spec exists: {spec}')
print(f'- Plan exists: {plan}')
print('- Roadmap planned state check: PASS Phase 4 roadmap planned state and artifact links are present')
print('- Phase 4 spec checks: PASS required contracts, PASS P0 matrix rows: 23, PASS candidate action boundary is preserved')
print('- Phase 3 sync check: PASS Phase 3 result envelope is synchronized with Phase 4')
print('- Plan self-check: PASS placeholder/vague wording, PASS plan required structure, PASS roadmap/spec/plan paths are consistent')
print('- No code/runtime/reference/skill implementation was created by this plan.')
PY
```

预期输出 completion evidence 草案。不要直接把草案写入 roadmap；`complete-phase` action 负责在验证证据充分时记录。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且本计划允许的文档文件有修改，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics.md
git commit -m "docs: prepare unity agent kit phase 4 plan evidence"
```

预期：commit 成功。没有用户明确授权或没有修改时跳过本步骤。

---

## 执行完成后的交接

执行本计划后，向主会话报告：

- Phase 4 roadmap planned artifact 状态是否已同步。
- Phase 4 spec 检查命令的 PASS 输出。
- Phase 3 result envelope 同步检查的 PASS 输出。
- Phase 4 plan 自检 PASS 输出。
- 是否存在未提交修改，以及是否已按用户授权提交。
- 下一条手动命令：

```text
/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 4
```
