# Unity Agent Kit Phase 2 Skill 体系实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 Phase 2 Skill 体系设计规格作为 roadmap artifact 正式接入，并完成文档级验证证据交接。

**架构：** Phase 2 不实现实际 skill、MCP tools、Unity C# host 或 audit 脚本。本计划只做文档 artifact 同步、规格质量验证、roadmap planned 状态同步和 completion evidence 交接。所有验证使用聚焦的 Markdown/Python 检查命令。

**技术栈：** Markdown roadmap/spec/plan 文档、Python 一次性文档校验命令、Git 工作区检查。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 2
**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`

---

## 提交策略

本计划包含“提交检查点”步骤，但执行者只有在用户于执行阶段明确授权创建 commit 时才运行这些步骤。若没有授权，跳过所有 `git commit` 命令，并在最终汇报中说明“未提交”。

## 文件结构

### 已存在

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Unity Agent Kit 长期 roadmap current truth。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` — Phase 2 Skill 体系设计规格。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` — 本实现计划。

### 本计划执行时允许修改

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 仅允许同步 Phase 2 artifact 路径、Phase 2 状态、Current State、Next Manual Action 和 Change Log 的事实性 planned 状态。
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` — 仅当规格自检发现具体缺陷时进行最小修复。
- `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` — 仅当计划自检发现具体缺陷时进行最小修复。

### 本计划执行时禁止修改

- 不修改 `references/unity-mcp-v2` 或 `references/Unity-Skills`。
- 不创建或修改 `plugins/unity-agent-kit/skills/`。
- 不创建或修改 MCP tool、Unity C# host、Contract Kernel、tests 或 audit 脚本。
- 不把 Phase 2 标记为 `completed`；完成状态必须由 `/superpowers:roadmap-management complete-phase` 基于具体 Verification Evidence 完成。
- 不修改 Phase 2 scope、success criteria、phase 顺序或 roadmap 结构。若发现 roadmap scope 与已批准 spec 存在结构性冲突，停止并报告主会话，不在本计划中改写 scope。

---

## 任务 1：同步 roadmap 的 Phase 2 planned artifact 状态

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：将 Phase Summary 中 Phase 2 行更新为 planned**

将 Phase 2 行替换为：

```markdown
| Phase 2 — Unity Agent Skill 体系设计 | planned | 设计 skill 架构、/unity 路由、P0 daily loop recipe contract 和跨 phase handoff | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` | pending | implement-plan |
```

不要修改 Phase 2 的 goal、scope、success criteria 或 phase 顺序。

- [x] **步骤 2：更新 Current State 中的当前阶段和下一步命令**

将 Current State 中 Phase 2 相关状态更新为：

```markdown
- 当前阶段：Phase 2 已完成 spec 和 plan，等待执行 plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 2`
- 当前不实现代码。
```

保持 Discovery、已确认事项和 Blockers 内容不变。

- [x] **步骤 3：更新 Phase 2 detail 状态和 Artifacts**

在 `### Phase 2：Unity Agent Skill 体系设计` 下，将状态和 artifact 字段更新为：

```markdown
**Status:** `planned`
```

```markdown
**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

不要修改 Phase 2 的 `Goal`、`Scope`、`Out of Scope`、`Reference Input Mapping` 或 `Success Criteria`。

- [x] **步骤 4：追加 Change Log**

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-17：完成 Phase 2 Skill 体系设计 spec 和 plan artifact 接入；Phase 2 进入 `planned`，下一步为 `implement-plan`。
```

- [x] **步骤 5：运行 roadmap planned 状态检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 2 — Unity Agent Skill 体系设计 | planned | 设计 skill 架构、/unity 路由、P0 daily loop recipe contract 和跨 phase handoff | `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md` | `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md` | pending | implement-plan |',
    '- 当前阶段：Phase 2 已完成 spec 和 plan，等待执行 plan。',
    '- **Next Manual Action:** `/superpowers:roadmap-management implement-plan docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 2`',
    '### Phase 2：Unity Agent Skill 体系设计',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`',
    '- **Implementation Summary:** pending',
    '- **Verification Evidence:** pending',
    '- 2026-05-17：完成 Phase 2 Skill 体系设计 spec 和 plan artifact 接入；Phase 2 进入 `planned`，下一步为 `implement-plan`。',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 2 roadmap planned state missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 2 roadmap planned state and artifact links are present')
PY
```

预期输出：

```text
PASS Phase 2 roadmap planned state and artifact links are present
```

若失败，修复缺失项后重跑本步骤。若失败原因需要修改 Phase 2 scope、success criteria 或 phase 顺序，停止并报告主会话。

- [x] **步骤 6：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "docs: sync unity agent kit phase 2 roadmap state"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。

---

## 任务 2：验证 Phase 2 规格质量

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- 修改：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行 Phase 2 规格自检命令**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
failed = False
checks = {
    'placeholder markers': ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '前文', '适当' + '处理'],
    'bare deferral wording': ['后续' + '再说', '以后' + '再说', 'later ' + 'T' + 'BD'],
}
for name, needles in checks.items():
    hits = [(i + 1, n) for i, line in enumerate(lines) for n in needles if n in line]
    if hits:
        failed = True
        print(f'FAIL {name}: {hits}')
    else:
        print(f'PASS {name}')
forbidden = [
    '/unity-project-command',
    '/unity-prototype',
    '/unity-ui',
    'reserved handoff names',
    'recipe parameter explicitly enables screenshot',
    'step.confirmation',
    'step.dryRun',
    '- unity_object.create',
    '- unity_component.add',
    '- unity_material.create',
    '- unity_material.assign',
]
for item in forbidden:
    if item in text:
        failed = True
        print(f'FAIL forbidden wording present: {item}')
    else:
        print(f'PASS forbidden absent: {item}')
required = [
    '# Unity Agent Kit Phase 2 Skill 体系设计',
    'Evidence needs 不是所有任务的统一必填输入',
    '第 1 层：护栏筛查',
    '第 2 层：标准能力路由',
    '第 3 层：Project command fallback 路由',
    'Project command fallback 不能早于 standard capability routing 评估',
    'mode: default',
    'mode: full',
    '/unity routing determines screenshot evidence is required',
    'requiredCapabilities:',
    'tool: unity_object',
    'action: create',
    'handoff.requiredCapabilities 若存在，使用结构化 tool/action 引用格式',
    'Phase 2 不预留后续 slash command 名称，只定义 handoff category',
    'referenceStatus: candidate',
    'owningPhase: Phase 3',
    'verificationPath:',
    'onFailure:',
    'Project command fallback contract',
    'Phase 9 audit handoff',
]
for item in required:
    if item not in text:
        failed = True
        print(f'FAIL missing required content: {item}')
    else:
        print(f'PASS contains: {item}')
raise SystemExit(1 if failed else 0)
PY
```

预期：全部输出 `PASS`，命令退出码为 0。

- [x] **步骤 2：若规格自检失败，执行最小修复并重跑**

如果步骤 1 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑步骤 1，直到通过。不要扩大 Phase 2 范围，不创建 skill 文件，不实现 audit 脚本。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且规格文件有实际修改，运行：

```bash
git add docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md
git commit -m "docs: refine unity agent kit phase 2 skill spec"
```

预期：commit 成功。没有用户明确授权或规格无修改时跳过本步骤。

---

## 任务 3：验证 Phase 2 plan 自身质量

**文件：**
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`
- 修改：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`（仅当检查失败且修复范围明确）

- [x] **步骤 1：运行 Phase 2 成功标准覆盖检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md')
text = p.read_text(encoding='utf-8')
failed = False
required = [
    '/unity routing',
    'P0 daily loop recipe contract',
    'recipe block 可供 Phase 9 半自动审计',
    'verificationPath',
    'onFailure',
    'Project command fallback',
    'Phase 6/7/8 handoff category',
    '不创建或修改 `plugins/unity-agent-kit/skills/`',
    '不创建或修改 MCP tool、Unity C# host、Contract Kernel、tests 或 audit 脚本。',
]
for item in required:
    if item not in text:
        failed = True
        print(f'FAIL missing success-criteria coverage: {item}')
    else:
        print(f'PASS success-criteria coverage: {item}')
raise SystemExit(1 if failed else 0)
PY
```

预期输出：

```text
PASS success-criteria coverage: /unity routing
PASS success-criteria coverage: P0 daily loop recipe contract
PASS success-criteria coverage: recipe block 可供 Phase 9 半自动审计
PASS success-criteria coverage: verificationPath
PASS success-criteria coverage: onFailure
PASS success-criteria coverage: Project command fallback
PASS success-criteria coverage: Phase 6/7/8 handoff category
PASS success-criteria coverage: 不创建或修改 `plugins/unity-agent-kit/skills/`
PASS success-criteria coverage: 不创建或修改 MCP tool、Unity C# host、Contract Kernel、tests 或 audit 脚本。
```

- [x] **步骤 2：运行 checklist 结构检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
import re
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md')
text = p.read_text(encoding='utf-8')
steps = re.findall(r'^- \[[ x]\] \*\*步骤 ', text, flags=re.MULTILINE)
failed = False
if len(steps) < 21:
    failed = True
    print(f'FAIL expected at least 21 executable checklist steps, found {len(steps)}')
else:
    print(f'PASS checklist step count: {len(steps)}')
if '## 任务 1：同步 roadmap 的 Phase 2 planned artifact 状态' in text and '## 任务 2：验证 Phase 2 规格质量' in text:
    print('PASS task 1 and task 2 sections present for completed-step allowance check')
else:
    failed = True
    print('FAIL task 1/task 2 section missing for completed-step allowance check')
if '- [ ] **步骤 1：整理 Implementation Summary**' in text and '- [ ] **步骤 1：查看工作区状态**' in text:
    print('PASS task 4 and task 5 retain unchecked future steps')
else:
    failed = True
    print('FAIL task 4/task 5 future-step unchecked guard missing')
raise SystemExit(1 if failed else 0)
PY
```

预期输出：

```text
PASS checklist step count: 21
PASS task 1 and task 2 sections present for completed-step allowance check
PASS task 4 and task 5 retain unchecked future steps
```

- [x] **步骤 3：运行计划自检命令**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
import re
p = Path('docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md')
text = p.read_text(encoding='utf-8')
failed = False
required = [
    '# Unity Agent Kit Phase 2 Skill 体系实现计划',
    '> **面向 AI 代理的工作者：** 必需子技能',
    '**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`',
    '**Phase:** Phase 2',
    '**Spec:** `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`',
    '## 任务 1：同步 roadmap 的 Phase 2 planned artifact 状态',
    '## 任务 2：验证 Phase 2 规格质量',
    '## 任务 3：验证 Phase 2 plan 自身质量',
    '## 任务 4：准备 Phase 2 completion evidence 交接',
    '## 任务 5：最终检查工作区状态',
    '不创建或修改 `plugins/unity-agent-kit/skills/`',
    '不把 Phase 2 标记为 `completed`',
]
for item in required:
    if item not in text:
        failed = True
        print(f'FAIL missing required plan content: {item}')
    else:
        print(f'PASS contains: {item}')
forbidden = ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', '待' + '定', '暂未' + '明确', '补充' + '细节', '类似' + '任务', '适当' + '处理', '后续' + '实现']
for item in forbidden:
    if item in text:
        failed = True
        print(f'FAIL forbidden placeholder present: {item}')
    else:
        print(f'PASS placeholder absent: {item}')
checkbox_count = len(re.findall(r'^- \[[ x]\] \*\*步骤 ', text, flags=re.MULTILINE))
if checkbox_count < 21:
    failed = True
    print(f'FAIL expected at least 21 executable checklist steps, found {checkbox_count}')
else:
    print(f'PASS checklist step count: {checkbox_count}')
raise SystemExit(1 if failed else 0)
PY
```

预期：全部输出 `PASS`，命令退出码为 0。

- [x] **步骤 4：若计划自检失败，执行最小修复并重跑**

如果步骤 3 输出任何 `FAIL`，只修复失败输出对应的具体问题。修复后重跑步骤 3，直到通过。

- [x] **步骤 5：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且计划文件有实际修改，运行：

```bash
git add docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md
git commit -m "docs: add unity agent kit phase 2 skill plan"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。

---

## 任务 4：准备 Phase 2 completion evidence 交接

**文件：**
- 读取：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- 读取：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`
- 读取：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：整理 Implementation Summary**

向主会话报告以下 Implementation Summary 文本，不直接写入 roadmap completed 字段：

```markdown
Phase 2 完成 Unity Agent Skill 体系设计规格和计划，明确 `/unity` 单入口路由、P0 daily loop recipe contract、机器可检查 recipe block、轻量结构化 `verificationPath`、每步必填 `onFailure`、skill safety 与 public handler safety gate 分工、project command explicit / strict fallback，以及 Phase 6/7/8 handoff category 边界。
```

- [x] **步骤 2：整理 Verification Evidence**

向主会话报告以下 Verification Evidence 文本，并填入任务 1、任务 2、任务 3 的实际命令输出摘要：

```markdown
- 规格文件：`docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- 计划文件：`docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md`
- Roadmap artifact 同步验证：任务 1 的 roadmap planned 状态检查通过，确认 Phase 2 Spec/Plan artifact 已链接，Next Manual Action 指向 `implement-plan`。
- 规格自检：任务 2 的 Phase 2 规格自检通过，覆盖占位符、裸延后表述、禁止预留后续 slash command 名称、handoff category、candidate tool/action、`verificationPath`、`onFailure`、`daily_health_check` default/full mode 和 Phase 9 audit handoff。
- 计划自检：任务 3 的计划自检通过，确认计划头部、roadmap/spec 路径、任务结构、禁止范围和 checklist 步骤完整。
- Success criteria 覆盖证据：规格明确 `/unity` routing；P0 daily loop 覆盖 6 个基础 recipe 和 `daily_health_check` default/full mode；recipe block 可供 Phase 9 半自动审计；skill safety 与 public tool handler safety gate 分工明确；project command fallback 不是万能后门；Phase 6/7/8 handoff category 明确；未定义实际 skill 文件、MCP tools、Unity C# host 或 audit 脚本。
```

- [x] **步骤 3：生成下一条手动命令建议**

向主会话报告：

```text
/superpowers:roadmap-management complete-phase docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md Phase 2
```

并说明需要把步骤 1 和步骤 2 的具体 evidence 交给 `complete-phase`。

- [x] **步骤 4：确认不直接完成 phase**

确认本计划执行阶段不直接把 Phase 2 标记为 `completed`。Phase completion 必须由 `roadmap-management complete-phase` 基于具体 Verification Evidence 完成。

---

## 任务 5：最终检查工作区状态

**文件：**
- 读取：Git 工作区状态

- [x] **步骤 1：查看工作区状态**

运行：

```bash
git status --short
```

预期：能看到 Phase 2 spec、Phase 2 plan 和 roadmap 相关变更。若出现无关文件变更，不删除、不覆盖，向主会话报告。

- [x] **步骤 2：查看相关 diff 摘要**

运行：

```bash
git diff -- docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md
```

预期：diff 只包含 Phase 2 spec、Phase 2 plan 和 roadmap Phase 2 artifact/status 同步相关变化。

- [x] **步骤 3：提交检查点（仅用户明确授权时执行）**

如果用户明确授权提交，并且任务 1-4 已通过，运行：

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md docs/superpowers/plans/2026-05-17-unity-agent-kit-phase-2-skill-architecture.md
git commit -m "docs: add unity agent kit phase 2 skill architecture"
```

预期：commit 成功。没有用户明确授权时跳过本步骤。
