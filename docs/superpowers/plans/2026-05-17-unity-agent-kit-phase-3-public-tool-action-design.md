# Unity Agent Kit Phase 3 Public MCP Tool Action Design 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Phase 3 Public MCP Tool Action Design 规格作为 roadmap artifact 正式接入，并完成文档级验证证据交接。

**架构：** Phase 3 不实现 MCP tools、Contract Kernel、Unity C# host、actual skill 或 audit 脚本。本计划只同步 roadmap 的 Phase 3 planned 状态、验证 Phase 3 规格与已批准边界一致、验证 plan 自身质量，并准备 `complete-phase` 所需的具体证据。所有检查使用聚焦的 Markdown/Python 命令，避免引入运行时代码或额外自动化。

**技术栈：** Markdown roadmap/spec/plan 文档、Python 一次性文档校验命令、Git 工作区检查。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 3
**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 已存在

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Unity Agent Kit 长期 roadmap current truth。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — Phase 3 Public MCP Tool Action Design 规格。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — 本实现计划。

### 本计划执行时允许修改

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 仅允许同步 Phase 3 artifact 路径、Phase 3 planned 状态、Current State、Next Manual Action 和 Change Log 的事实性 planned 状态。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — 仅当规格自检发现具体缺陷时进行最小修复。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` — 仅当计划自检发现具体缺陷时进行最小修复。

### 本计划执行时禁止修改

- 不修改 `references/unity-mcp-v2` 或 `references/Unity-Skills`。
- 不创建或修改 `plugins/unity-agent-kit/` runtime、public tool registration、Contract Kernel、tests、actual skill 文件或 audit 脚本。
- 不创建或修改 `unity/Assets/UnityAgentKit/`。
- 不把 Phase 3 标记为 `completed`；完成状态必须由 `/superpowers:roadmap-management complete-phase` 基于具体 Verification Evidence 完成。
- 不修改 Phase 3 scope、success criteria、phase 顺序或 roadmap 结构。若发现 roadmap scope 与已批准 spec 存在结构性冲突，停止并报告主会话，不在本计划中改写 scope。

---

## 任务 1：同步 roadmap 的 Phase 3 planned artifact 状态

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
    '| Phase 3 — Public MCP Tool Action Design | planned | 逐个设计 public tool、action、参数、异步语义、safety、验证路径和 action catalog | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | pending | implement-plan |',
    '- 当前阶段：Phase 3 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 3`',
    '### Phase 3：Public MCP Tool Action Design',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`',
    '- **Implementation Summary:** pending',
    '- **Verification Evidence:** pending',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 3 roadmap planned state missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 3 roadmap planned state and artifact links are present')
PY
```

预期：当前 roadmap 仍是 `needs-spec` / `pending` 时输出 `FAIL Phase 3 roadmap planned state missing required content`，退出码为 1。若已经输出 PASS，跳过步骤 2-4，继续步骤 5。

- [x] **步骤 2：将 Phase Summary 中 Phase 3 行更新为 planned**

将 Phase 3 行替换为：

```markdown
| Phase 3 — Public MCP Tool Action Design | planned | 逐个设计 public tool、action、参数、异步语义、safety、验证路径和 action catalog | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | pending | implement-plan |
```

不要修改 Phase 3 goal、scope、success criteria 或 phase 顺序。

- [x] **步骤 3：更新 Current State 中的当前阶段和下一步命令**

将 Current State 中 Phase 3 相关状态更新为：

```markdown
- 当前阶段：Phase 3 已完成 spec 和 plan，等待执行 plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 3`
- 当前不实现代码。
```

保持 Discovery、已确认事项、Blockers 和 Phase 1/2 completion evidence 内容不变。

- [x] **步骤 4：更新 Phase 3 detail 状态和 Artifacts**

在 `### Phase 3：Public MCP Tool Action Design` 下，将状态和 artifact 字段更新为：

```markdown
**Status:** `planned`
```

```markdown
**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

不要修改 Phase 3 的 `Goal`、`Scope`、`Out of Scope`、`Reference Input Mapping` 或 `Success Criteria`。

- [x] **步骤 5：追加 Change Log**

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-17：完成 Phase 3 Public MCP Tool Action Design spec 和 plan artifact 接入；Phase 3 进入 `planned`，下一步为 `implement-plan`。
```

- [x] **步骤 6：运行 roadmap planned 状态检查并确认通过**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 3 — Public MCP Tool Action Design | planned | 逐个设计 public tool、action、参数、异步语义、safety、验证路径和 action catalog | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md` | pending | implement-plan |',
    '- 当前阶段：Phase 3 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 3`',
    '### Phase 3：Public MCP Tool Action Design',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`',
    '- **Implementation Summary:** pending',
    '- **Verification Evidence:** pending',
    '- 2026-05-17：完成 Phase 3 Public MCP Tool Action Design spec 和 plan artifact 接入；Phase 3 进入 `planned`，下一步为 `implement-plan`。',
]
forbidden = [
    '| Phase 3 — Public MCP Tool Action Design | completed |',
    '- 当前阶段：Phase 3 需要编写 spec。',
    '- **Next Manual Action:** `/superpowers:roadmap-management write-spec docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 3`',
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
print('PASS Phase 3 roadmap planned state and artifact links are present')
PY
```

预期输出：

```text
PASS Phase 3 roadmap planned state and artifact links are present
```

若失败，修复缺失项后重跑本步骤。若失败原因需要修改 Phase 3 scope、success criteria 或 phase 顺序，停止并报告主会话。

- [x] **步骤 7：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "docs: sync unity agent kit phase 3 roadmap state"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。

---

## 任务 2：验证 Phase 3 规格边界和审查修订

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 修改：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行占位符和禁止表述检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
failed = False
checks = {
    'placeholder markers': ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '前文', '适当' + '处理'],
    'vague time wording': ['以' + '后', '未' + '来', '当' + '下'],
    'old result rule': ['写操作 success 必须表达 `changed=true`、`persisted=true`'],
    'unbounded params': ['params: object', 'arbitrary options bag as public schema'],
}
for name, needles in checks.items():
    hits = [(i + 1, n) for i, line in enumerate(lines) for n in needles if n in line]
    if hits:
        failed = True
        print(f'FAIL {name}: {hits}')
    else:
        print(f'PASS {name}')
forbidden = [
    'referenceStatus: stable\n',
    'unity_project_command.invoke` 作为标准 public tools 的替代入口',
    'Phase 3 实现 MCP',
]
for item in forbidden:
    if item in text:
        failed = True
        print(f'FAIL forbidden wording present: {item}')
    else:
        print(f'PASS forbidden absent: {item}')
raise SystemExit(1 if failed else 0)
PY
```

预期：全部输出 `PASS`，命令退出码为 0。

- [x] **步骤 2：运行已批准审查修订存在性检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required = [
    '写操作不能只返回 `ok=true`；必须能表达对应的 state/effect/artifact/report 信号、验证结果和失败/不确定原因。',
    '`persisted?` | 仅用于修改并保存 Unity project/editor persistence unit 的 effect actions；request、transient editor state、diagnostic view mutation 和 artifact/report-producing actions 可省略或返回 `false`。',
    '`request_accepted` action success 必须表达请求已接受的信号；不得伪装成最终 effect verified。',
    '产出 artifact 的 action 必须返回 artifact reference、`validationStatus` 和 artifact verification signals；`persisted` 可省略或为 `false`。',
    '### `inputSchemaRef` 命名规则',
    '<toolName>.<PascalCaseActionName>Input',
    '### P0 `inputSchemaRef` 清单',
    '#### Phase 5 required P0 executable subset',
    '#### Stable-ready helper actions',
    '#### Schema-ready backlog rule',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 3 approved review revisions missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 3 approved review revisions are present')
PY
```

预期输出：

```text
PASS Phase 3 approved review revisions are present
```

- [x] **步骤 3：运行 Phase 3 目标和非目标边界检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required = [
    '定义 public MCP tool/action 的 shared parameter model、shared target model、result 最低共同语义、safety metadata、completion semantics、Resource 引用边界和 catalog contract。',
    '将 P0 daily loop tools/actions 设计到 `specStatus: stable_ready`，为 Phase 5 实现计划提供输入。',
    '将 Phase 7 简单创作 vertical slice 相关 tools/actions 设计为较详细 `candidate`，为 Phase 7 规格提供输入。',
    '将 Phase 8 extension pool 相关 tools/actions 保持为 taxonomy + safety notes，不提前锁死完整 schema。',
    '不实现任何 tool/action。',
    '不创建 actual `/unity` skill 文件。',
    '不定义完整 diagnostics schema、job result schema、artifact lifecycle、console cursor 或 compiler diagnostics attribution；这些属于 Phase 4。',
    '不定义完整 Project Editor Command Registry metadata、invoke 流程或 recipe landing strategy；这些属于 Phase 6。',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 3 goal/non-goal boundaries missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 3 goal and non-goal boundaries are present')
PY
```

预期输出：

```text
PASS Phase 3 goal and non-goal boundaries are present
```

- [x] **步骤 4：若规格检查失败，执行最小修复并重跑**

如果步骤 1-3 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑失败步骤，直到通过。不要实现 code、不要创建 schemas、不要修改 Phase 3 scope 或 Phase 4/5/6/7/8 的职责边界。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且规格文件有实际修改，运行：

```bash
git add docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
git commit -m "docs: refine unity agent kit phase 3 public tool spec"
```

预期：commit 成功。没有用户明确授权或规格无修改时跳过本步骤。

---

## 任务 3：验证 Phase 3 catalog、P0 handoff 和 success criteria 覆盖

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 修改：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行 P0 action 与 `inputSchemaRef` 覆盖检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required_pairs = [
    ('unity_editor', 'get_status', 'unity_editor.GetStatusInput'),
    ('unity_editor', 'wait_ready', 'unity_editor.WaitReadyInput'),
    ('unity_editor', 'get_current_host', 'unity_editor.GetCurrentHostInput'),
    ('unity_compile', 'get_state', 'unity_compile.GetStateInput'),
    ('unity_compile', 'request', 'unity_compile.RequestInput'),
    ('unity_compile', 'wait_for_idle', 'unity_compile.WaitForIdleInput'),
    ('unity_compile', 'compile_and_check', 'unity_compile.CompileAndCheckInput'),
    ('unity_console', 'snapshot', 'unity_console.SnapshotInput'),
    ('unity_console', 'count', 'unity_console.CountInput'),
    ('unity_console', 'clear', 'unity_console.ClearInput'),
    ('unity_test', 'list', 'unity_test.ListInput'),
    ('unity_test', 'start', 'unity_test.StartInput'),
    ('unity_test', 'get_status', 'unity_test.GetStatusInput'),
    ('unity_test', 'get_result', 'unity_test.GetResultInput'),
    ('unity_test', 'run_and_collect', 'unity_test.RunAndCollectInput'),
    ('unity_test', 'run_and_verify', 'unity_test.RunAndVerifyInput'),
    ('unity_playmode', 'get_state', 'unity_playmode.GetStateInput'),
    ('unity_playmode', 'enter', 'unity_playmode.EnterInput'),
    ('unity_playmode', 'exit', 'unity_playmode.ExitInput'),
    ('unity_playmode', 'wait_for_state', 'unity_playmode.WaitForStateInput'),
    ('unity_playmode', 'enter_and_verify', 'unity_playmode.EnterAndVerifyInput'),
    ('unity_playmode', 'exit_and_verify', 'unity_playmode.ExitAndVerifyInput'),
    ('unity_screenshot', 'capture_game_view', 'unity_screenshot.CaptureGameViewInput'),
]
missing = []
for tool, action, ref in required_pairs:
    row = f'| `{tool}` | `{action}` | `{ref}` |'
    if row not in text:
        missing.append(row)
if missing:
    print('FAIL P0 inputSchemaRef rows missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print(f'PASS P0 inputSchemaRef coverage: {len(required_pairs)} rows')
PY
```

预期输出：

```text
PASS P0 inputSchemaRef coverage: 23 rows
```

- [x] **步骤 2：运行 Phase 5 handoff split 检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required_subset = [
    'unity_editor.get_status',
    'unity_editor.wait_ready',
    'unity_compile.get_state',
    'unity_compile.request',
    'unity_compile.wait_for_idle',
    'unity_compile.compile_and_check',
    'unity_console.snapshot',
    'unity_console.count',
    'unity_console.clear',
    'unity_test.list',
    'unity_test.start',
    'unity_test.get_status',
    'unity_test.get_result',
    'unity_test.run_and_collect',
    'unity_test.run_and_verify',
    'unity_playmode.get_state',
    'unity_playmode.enter_and_verify',
    'unity_playmode.exit_and_verify',
    'unity_screenshot.capture_game_view',
]
helper_subset = [
    'unity_editor.get_current_host',
    'unity_playmode.enter',
    'unity_playmode.exit',
    'unity_playmode.wait_for_state',
]
required_markers = [
    '#### Phase 5 required P0 executable subset',
    '#### Stable-ready helper actions',
    '#### Schema-ready backlog rule',
    'P0 `stable_ready` catalog 是 schema-ready / design-ready surface。',
]
missing = [item for item in required_markers + required_subset + helper_subset if item not in text]
if missing:
    print('FAIL Phase 5 handoff split missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print(f'PASS Phase 5 handoff split: {len(required_subset)} required actions, {len(helper_subset)} helper actions')
PY
```

预期输出：

```text
PASS Phase 5 handoff split: 19 required actions, 4 helper actions
```

- [x] **步骤 3：运行 success criteria 覆盖检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
required = [
    '| 高频 tools 的 action 语义清晰。 |',
    '| 截图、编译、测试、PlayMode 异步/验证语义不再模糊。 |',
    '| 每个 public action 有 safety metadata。 |',
    '| 每个写 action 有验证路径。 |',
    '| Public schema 与 internal schema 的边界明确。 |',
    '| Resources 首版范围与 artifact model 对齐。 |',
    '| Public tool/action catalog 可供 actual skill 和 Phase 9 audit 判断 stable/candidate 引用。 |',
    '| Action metadata 可供 skill/schema consistency audit 使用。 |',
    'unity_compile.wait_for_idle != compile success',
    'unity_test.run_and_collect != tests passed',
    'unity_screenshot.capture_game_view != visual acceptance',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 3 success criteria coverage missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 3 success criteria coverage is present')
PY
```

预期输出：

```text
PASS Phase 3 success criteria coverage is present
```

- [x] **步骤 4：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且规格文件有实际修改，运行：

```bash
git add docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
git commit -m "docs: verify unity agent kit phase 3 catalog coverage"
```

预期：commit 成功。没有用户明确授权或规格无修改时跳过本步骤。

---

## 任务 4：验证 Phase 3 plan 自身质量

**文件：**
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 修改：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行计划占位符和模糊表述检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
failed = False
needles = ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '前文', '适当' + '处理', '以' + '后', '未' + '来', '当' + '下']
hits = [(i + 1, n) for i, line in enumerate(lines) for n in needles if n in line]
if hits:
    failed = True
    print('FAIL plan placeholder/vague wording:', hits)
else:
    print('PASS plan placeholder/vague wording')
required = [
    '> **面向 AI 代理的工作者：**',
    '**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`',
    '**Phase:** Phase 3',
    '**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`',
    '## 提交策略',
    '## 文件结构',
    '## 任务 1：同步 roadmap 的 Phase 3 planned artifact 状态',
    '## 任务 2：验证 Phase 3 规格边界和审查修订',
    '## 任务 3：验证 Phase 3 catalog、P0 handoff 和 success criteria 覆盖',
    '## 任务 4：验证 Phase 3 plan 自身质量',
    '## 任务 5：准备 completion evidence 交接并检查工作区',
]
missing = [item for item in required if item not in text]
if missing:
    failed = True
    print('FAIL plan required structure missing:')
    for item in missing:
        print('-', item)
else:
    print('PASS plan required structure')
raise SystemExit(1 if failed else 0)
PY
```

预期：全部输出 `PASS`，命令退出码为 0。

- [x] **步骤 2：运行计划 checklist 和命令结构检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = p.read_text(encoding='utf-8')
checkboxes = [line for line in text.splitlines() if line.startswith('- [ ]') or line.startswith('- [x]')]
required_commands = [
    'PYTHONIOENCODING=utf-8 python - <<\'PY\'',
    'git diff -- docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md',
    'git status --short',
]
missing = [cmd for cmd in required_commands if cmd not in text]
if len(checkboxes) < 25:
    print(f'FAIL checklist step count too low: {len(checkboxes)}')
    raise SystemExit(1)
if missing:
    print('FAIL required commands missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print(f'PASS checklist step count: {len(checkboxes)}')
print('PASS required command snippets present')
PY
```

预期输出类似：

```text
PASS checklist step count: 25
PASS required command snippets present
```

实际 step count 可以大于 25；小于 25 时必须检查是否遗漏任务步骤。

- [x] **步骤 3：运行 roadmap/spec/plan 文件路径一致性检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
plan = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
text = plan.read_text(encoding='utf-8')
paths = [
    'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md',
    'docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md',
    'docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md',
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

如果步骤 1-3 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑失败步骤，直到通过。不要扩大 Phase 3 执行范围，不添加 code implementation tasks。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且计划文件有实际修改，运行：

```bash
git add docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
git commit -m "docs: add unity agent kit phase 3 implementation plan"
```

预期：commit 成功。没有用户明确授权或计划无修改时跳过本步骤。

---

## 任务 5：准备 completion evidence 交接并检查工作区

**文件：**
- 读取：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`

- [x] **步骤 1：运行最终三文件 diff 检查**

运行：

```bash
git diff -- docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
```

预期：只显示本计划允许的 roadmap/spec/plan 文档修改。若出现 runtime、reference input、actual skill、tests 或 unrelated docs 变更，停止并报告主会话。

- [x] **步骤 2：运行 git 状态检查并识别无关变更**

运行：

```bash
git status --short
```

预期：允许出现本计划文件和用户已存在的无关工作区修改；执行者最终汇报时必须明确说明哪些变更属于本计划，哪些是既有未处理修改。不要 stage 或提交无关文件。

- [x] **步骤 3：生成 completion evidence 草案**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
spec = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
plan = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md')
for path in [roadmap, spec, plan]:
    if not path.exists():
        print(f'FAIL missing file: {path}')
        raise SystemExit(1)
text = spec.read_text(encoding='utf-8')
required = [
    'PASS Phase 3 approved review revisions are present',
    'PASS P0 inputSchemaRef coverage: 23 rows',
    'PASS Phase 5 handoff split: 19 required actions, 4 helper actions',
    'PASS Phase 3 success criteria coverage is present',
]
print('Completion Evidence Draft:')
print('- Phase 3 spec path:', spec.as_posix())
print('- Phase 3 plan path:', plan.as_posix())
print('- Required verification commands from this plan must have passed:')
for item in required:
    print('  -', item)
print('- No code/runtime/reference/skill implementation was created by this plan.')
PY
```

预期输出包含：

```text
Completion Evidence Draft:
- Phase 3 spec path: docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
- Phase 3 plan path: docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
```

- [x] **步骤 4：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且 roadmap/spec/plan 有本计划范围内修改，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md
git commit -m "docs: prepare unity agent kit phase 3 verification"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。

- [x] **步骤 5：报告下一条手动命令**

最终汇报中给出下一条命令：

```text
/superpowers:roadmap-management complete-phase docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 3
```

同时附上任务 1-5 中通过的具体验证输出，供 `complete-phase` 记录 Verification Evidence。不要在本计划中直接把 Phase 3 标记为 `completed`。
