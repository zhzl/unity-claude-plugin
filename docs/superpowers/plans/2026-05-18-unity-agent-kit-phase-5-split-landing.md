# Unity Agent Kit Phase 5 Split Landing 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 落地 Phase 5 split design：废弃旧总 plan、创建 Phase 5 plan index、创建 Phase 5A Host Runtime 初始文档；当前该文档已重新定位为 technical contract，执行入口迁移到 5A execution index，并把 roadmap Phase 5 同步到 technical contract + execution index 已就绪、下一步准备 5A strict execution plan 的 planned 状态。

**架构：** 本计划只修改文档 artifact，不实现 Unity Agent Kit 运行时代码。Roadmap Phase 5 保持单一 phase，`Plan` artifact 指向 plan index；plan index 再映射 5A-5E subplans，其中本计划只记录 5A technical contract 的创建历史与后续 execution-plan handoff。

**技术栈：** Markdown、Python inline 文本检查、git diff/check。
**拆分检查：** 已检查；无需拆分。本计划是 Phase 5 split design 的文档落地单元，四个 artifact 变更按顺序强依赖，不能独立交付为多个 implementation plans。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；public MCP tools 与 internal operations 分离；public 参数必须有界；TS 负责 workflow 编排、轮询、timeout、host rebind 和最终判定；Unity C# 负责短主线程动作、状态读取、job/report 记录；首版 Resources 只用于 artifacts/reports；写操作和 artifact action 不能无证据报成功。
- **Phase Scope:** Phase 5 覆盖 19 个 P0 daily loop actions、最小 actual `/unity` skill、TS/MCP layer、Unity C# host、artifact/report Resources 和最终 daily loop E2E。
- **Phase Out-of-scope:** 不实现 object/component/material 创作工具；不实现 Phase 6/7/8 domain recipes；不实现 Scene View 或 EditorWindow screenshot capture；不执行旧 3000+ 行总 plan；不正式拆 roadmap phases。
- **Success Criteria:** Phase 5 拆分后，roadmap `Plan` artifact 指向 plan index；旧总 plan 明确 deprecated；5A-5E subplans 有明确 scope 和状态；5A technical contract 具备 Host Runtime 最小 vertical smoke path、Phase 1-4 compliance matrix、v2 reference mapping、7 分 quality gate 和 completion evidence；5A execution index 已创建并指向 5A-01 strict execution plan 准备入口；roadmap Phase 5 保持 `planned`，下一步指向准备 5A strict execution plan。
- **用户确认事项:** 先设计 subplans，再决定是否升级正式 roadmap phases；旧总 plan 标记 deprecated 并保留历史参考；第一个执行准备单元围绕 5A Host Runtime technical contract 展开；reference mapping 按能力域 / 基础设施域；subplan 独立 evidence，Phase 5 最终统一完成；5A execution index 创建后，下一步是基于该 index 创建并审查 5A-01 strict execution plan。
- **本计划不包含:** 不实现 5A 运行时代码；不直接执行 5A technical contract；不创建 5B-5E plans；不修改通用 `roadmap-management` skill；不把 5A-5E 写入 roadmap Phase Summary 作为正式 phases。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md` | plan index 规则、旧 plan 废弃规则、5A-5E scope、5A plan 范围、roadmap planned 同步时机 | 不把“写 split design spec”作为本计划任务 | split design spec 已存在并完成审查修订，本计划只落地下游 artifacts | 任务 1-5 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md` | Phase 1-5 适用标准、已确认禁止项、v2 使用原则、5A-5E 建议拆分、7 分 quality gate | 不直接把 revision brief 当 implementation plan | revision brief 是修订输入，不是可执行计划 | 任务 2-3 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md` | 作为 deprecated historical reference 保留内容 | 不执行旧任务、不同步旧 planned 状态、不生成旧 completion evidence | 旧 plan 已确认存在 scope 过大、stub、弱测试和参考实现吸收不足问题 | 任务 1 |
| `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` | Phase 5 current truth、Shared Constraints、Phase Scope、Success Criteria、planned artifact 字段 | 不拆 roadmap phase 结构，不新增 5A-5E 正式 phases | split design 已确认先保持单一 Phase 5 | 任务 4 |
| `references/unity-mcp-v2` | 作为 5A plan 的 reference mapping 输入：loopback host、registry/probe、main-thread dispatch、operation envelope、active host validation | 不采用 v2 public tool compatibility layer | Phase 5 public contract 使用 Unity Agent Kit 新 action/resource/status 体系 | 任务 3 |

## 文件结构

- 移动/创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md` — 保存旧总 plan 并在文件头强标记 deprecated / 不得执行。
- 删除/移除：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md` — 原路径不再作为可执行 plan 存在。
- 创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — Phase 5 plan artifact 入口，索引 5A-5E subplans 和状态。
- 创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` — Phase 5A technical contract 历史路径，当前执行入口迁移到 5A execution index。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Phase 5 进入 `planned`，Plan artifact 指向 plan index，Next Manual Action 指向基于 5A execution index 准备/审查 5A-01 strict execution plan。

---

## 任务 1：废弃旧 Phase 5 总 plan

**文件：**
- 移动/创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md`
- 移除原路径：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md`

- [x] **步骤 1：运行旧 plan 废弃状态检查并确认失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
old = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md')
deprecated = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md')
errors = []
if old.exists():
    errors.append('old executable plan path still exists')
if not deprecated.exists():
    errors.append('deprecated plan path missing')
else:
    text = deprecated.read_text(encoding='utf-8')
    required = [
        'DEPRECATED / 不得执行 / 仅作历史参考',
        '后续不得按本文件执行任务、同步 roadmap planned 状态或生成 completion evidence',
        'docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md',
        'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md',
        'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md',
    ]
    missing = [item for item in required if item not in text]
    errors.extend(f'deprecated header missing: {item}' for item in missing)
if errors:
    print('FAIL old Phase 5 plan is not safely deprecated:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS old Phase 5 plan is safely deprecated')
PY
```

预期：FAIL，输出旧可执行 plan 路径仍存在或 deprecated path 缺失。

证明：该检查证明旧总 plan 还没有从可执行路径降级为历史参考，因为它检查原路径、deprecated 文件头和新 artifact 指向。

- [x] **步骤 2：移动旧 plan 并添加 deprecated 文件头**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
old = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md')
deprecated = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md')
if not old.exists() and not deprecated.exists():
    raise SystemExit('old Phase 5 plan path is missing; cannot preserve deprecated reference')
if deprecated.exists():
    body = deprecated.read_text(encoding='utf-8')
else:
    body = old.read_text(encoding='utf-8')
header = '''> **DEPRECATED / 不得执行 / 仅作历史参考**
>
> 本文件是旧 Phase 5 总 implementation plan。它已被 Phase 5 split design 和 plan index 取代。
> 后续不得按本文件执行任务、同步 roadmap planned 状态或生成 completion evidence。
> 请使用：
> - Split Design: `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
> - Plan Index: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
> - Revision Brief: `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-revision-brief.md`

---

'''
if 'DEPRECATED / 不得执行 / 仅作历史参考' not in body:
    body = header + body
else:
    marker = '---\n\n'
    if marker in body:
        body = header + body.split(marker, 1)[1]
    else:
        body = header + body

deprecated.write_text(body, encoding='utf-8')
if old.exists():
    old.unlink()
print(f'Wrote deprecated old plan: {deprecated}')
PY
```

预期输出包含：

```text
Wrote deprecated old plan: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md
```

- [x] **步骤 3：运行旧 plan 废弃状态检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS old Phase 5 plan is safely deprecated
```

证明：该检查证明旧总 plan 已保留为 deprecated historical reference，且原可执行路径不再存在。

- [x] **步骤 4：Commit**

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md
git rm --ignore-unmatch docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md
git commit -m "$(cat <<'EOF'
docs: deprecate unity agent kit phase 5 monolithic plan

Preserve the old Phase 5 plan as a non-executable reference so new split plans become the only valid execution path.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：创建 Phase 5 plan index

**文件：**
- 创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- [x] **步骤 1：运行 plan index 检查并确认失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md')
required = [
    '本文件不是 implementation plan',
    'docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md',
    'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md',
    '| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | pending | pending | stays subplan |',
    '| Phase 5E | MCP / `/unity` Skill / E2E / Completion Evidence | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5e-mcp-skill-e2e.md` | pending | pending | stays subplan |',
    'Phase 5A 在本 index 创建时初始为 `pending`',
    'Phase 5 completed only after all subplans + final E2E evidence pass',
]
if not path.exists():
    print('FAIL Phase 5 plan index missing')
    raise SystemExit(1)
text = path.read_text(encoding='utf-8')
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 5 plan index missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 5 plan index is present')
PY
```

预期：FAIL，输出 `Phase 5 plan index missing`。

证明：该检查证明 Phase 5 还没有 plan artifact 入口，roadmap 不能安全指向 subplans。

- [x] **步骤 2：创建 plan index 文件**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md')
content = '''# Unity Agent Kit Phase 5 Plan Index

> **用途：** 本文件不是 implementation plan。它是 Phase 5 的 subplan 索引和执行状态入口。执行时必须进入具体 subplan。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Split Design:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
**Deprecated Old Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md`

---

## Scope

This index keeps Phase 5 as a single roadmap phase while splitting execution into 5A-5E subplans. It does not create formal roadmap phases and must not be executed as an implementation plan.

## Subplans

| Subplan | Scope | Plan | Status | Completion Evidence | Upgrade Check |
|---|---|---|---|---|---|
| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | pending | pending | stays subplan |
| Phase 5B | Artifact / Resource / Timeout / Completion 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5b-artifact-resource-timeout.md` | pending | pending | stays subplan |
| Phase 5C | Core Diagnostics Workflows | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5c-core-diagnostics-workflows.md` | pending | pending | stays subplan |
| Phase 5D | Test / PlayMode / Screenshot Workflows | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows.md` | pending | pending | stays subplan |
| Phase 5E | MCP / `/unity` Skill / E2E / Completion Evidence | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5e-mcp-skill-e2e.md` | pending | pending | stays subplan |

## Status Rules

- `pending`：subplan 尚未编写。
- `planned`：subplan plan 已创建、审查通过、可执行。
- `in-progress`：subplan 正在执行。
- `completed`：subplan 已完成并有 evidence。
- `blocked`：subplan 有阻塞项。
- `deprecated`：旧计划或被替代计划。

Phase 5A 在本 index 创建时初始为 `pending`。只有 Phase 5A implementation plan 已创建并通过审查后，才能更新为 `planned`。

## Deprecated Plans

| Plan | Status | Replacement |
|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md` | deprecated | This plan index plus Phase 5A-5E subplans |

## Completion Rule

Phase 5 completed only after all subplans + final E2E evidence pass.

Roadmap Phase 5 must not be marked `completed` from this index alone. Completion requires:

1. Phase 5A Host Runtime completed with evidence.
2. Phase 5B Artifact / Resource / Timeout / Completion completed with evidence.
3. Phase 5C Core Diagnostics Workflows completed with evidence.
4. Phase 5D Test / PlayMode / Screenshot Workflows completed with evidence.
5. Phase 5E MCP / `/unity` Skill / E2E completed with final daily loop evidence.
6. Roadmap completion evidence covers the original Phase 5 success criteria.

## Roadmap Phase Upgrade Check

Current decision: 5A-5E remain Phase 5 subplans and are not formal roadmap phases.

If a subplan gains an independent roadmap goal, cross-phase dependency, standalone blocker/current-state needs, or can independently unlock Phase 6/7/8, stop and use roadmap structural change before continuing that subplan.

## Next Manual Action

After the Phase 5A technical contract and execution index are in place, create and review the first strict execution plan card:

```text
/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```
'''
path.write_text(content, encoding='utf-8')
print(f'Wrote Phase 5 plan index: {path}')
PY
````

预期输出包含：

```text
Wrote Phase 5 plan index: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
```

- [x] **步骤 3：运行 plan index 检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5 plan index is present
```

证明：该检查证明 Phase 5 具有可被 roadmap `Plan` artifact 指向的 plan index，并且 5A 初始状态没有被误标为可执行。

- [x] **步骤 4：Commit**

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
git commit -m "$(cat <<'EOF'
docs: add unity agent kit phase 5 plan index

Create the Phase 5 subplan index that maps the split design to 5A-5E execution plans.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：记录 Phase 5A technical contract 与 execution plan set 指针

**文件：**
- 历史记录：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- 当前执行入口：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 本地协议：`docs/superpowers/protocols/large-subplan-planning-protocol.md`

> Split landing 不再维护完整 Phase 5A execution plan set 模板。本任务保留为历史记录，说明最初 landing 创建了 5A Host Runtime 文档；当前权威入口已迁移到 Phase 5 plan index 和 Phase 5A execution index。

- [x] **步骤 1：确认 5A technical contract 路径**

```text
docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

该文件现在是 technical contract，不是 executable implementation plan。

- [x] **步骤 2：确认 5A execution index 路径**

```text
docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```

该文件记录 candidate plan cards、wave、depends_on、status 和 current next action。

- [x] **步骤 3：确认本地 Large Subplan Planning Protocol 路径**

```text
docs/superpowers/protocols/large-subplan-planning-protocol.md
```

后续 Phase 5A execution plans 必须遵守该 protocol 和 strict `superpowers:writing-plans`。

## 任务 4：同步 roadmap Phase 5 planned 状态

**文件：**
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：运行 roadmap planned 状态检查并确认失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = roadmap.read_text(encoding='utf-8')
required = [
    '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | prepare-5a-execution-plan |',
    '- 当前阶段：Phase 5A technical contract 已通过审查，Phase 5A execution index 已创建；下一步是基于该 index 创建并审查 Phase 5A-01 strict execution plan。',
    '- **Next Manual Action:** `/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`',
    '### Phase 5：高频日常闭环基础设施',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`',
    'Phase 5A execution index 已创建，当前动作是基于该 index 创建并审查 5A-01 strict execution plan。',
    '完成 Phase 5 split design、5A technical contract 审查和 execution index 建立；下一步是准备 5A strict execution plan，不再直接执行 technical contract。',
]
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 5 roadmap planned split state missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 5 roadmap planned split state is present')
PY
```

预期：FAIL，输出 Phase 5 roadmap planned split state missing。

证明：该检查证明 roadmap 还没有把 Phase 5 的 plan artifact 指向 plan index，也没有把下一步切换到 5A execution index 驱动的 strict execution plan 准备入口。

- [x] **步骤 2：更新 Phase Summary 中 Phase 5 行**

将 Phase 5 行替换为：

```markdown
| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | prepare-5a-execution-plan |
```

- [x] **步骤 3：更新 Current State**

将 Current State 中 Phase 5 相关行更新为：

```markdown
- 当前阶段：Phase 5A technical contract 已通过审查，Phase 5A execution index 已创建；下一步是基于该 index 创建并审查 Phase 5A-01 strict execution plan。
- Phase 5A execution index 已创建，当前动作是基于该 index 创建并审查 5A-01 strict execution plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- Phase 3 已完成 Public MCP Tool Action Design 规格和计划，并记录 completion evidence。
- Phase 4 已完成 Async / Job / Workflow / Artifact Semantics 规格验证和计划执行，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 当前不实现 Phase 6/7/8 能力域。
```

- [x] **步骤 4：更新 Phase 5 detail artifact 字段**

在 `### Phase 5：高频日常闭环基础设施` 下设置：

```markdown
**Status:** `planned`
```

```markdown
**Artifacts:**
- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- **Implementation Summary:** pending
- **Verification Evidence:** pending
```

- [x] **步骤 5：追加 Change Log**

在 `## Change Log` 顶部追加：

```markdown
- 2026-05-18：完成 Phase 5 split design、5A technical contract 审查和 execution index 建立；Phase 5 进入 split-plan `planned` 状态，下一步是准备 5A strict execution plan，不再直接执行 technical contract。
```

- [x] **步骤 6：运行 roadmap planned 状态检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5 roadmap planned split state is present
```

证明：该检查证明 roadmap current truth 已指向 plan index，且下一步是准备 5A strict execution plan，不再把 technical contract 当作直接执行入口。

- [x] **步骤 7：Commit**

```bash
git add docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: mark unity agent kit phase 5 split planned

Point Phase 5 at the plan index and make Host Runtime 5A the next executable split-plan step.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 5：最终验证 split landing

**文件：**
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- 验证：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：运行综合落地检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
checks = {
    'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md': [
        'DEPRECATED / 不得执行 / 仅作历史参考',
        '后续不得按本文件执行任务、同步 roadmap planned 状态或生成 completion evidence',
    ],
    'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md': [
        '本文件不是 implementation plan',
        'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
        'Phase 5 completed only after all subplans + final E2E evidence pass',
    ],
    'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md': [
        '**Subplan:** Phase 5A',
        '## Phase 1-4 Compliance Matrix',
        '## unity-mcp-v2 Reference Mapping',
        '## Quality Gate',
        '## MCP Tool Result Mapping Foundation',
        'Phase 5A 最小 vertical smoke path',
        'host-level safety timeout',
        '真实 `/probe` HTTP response',
        '真实 `/operations` HTTP request',
        'dispatch exception',
        'hostId / hostEpoch mismatch',
        'TS public result → MCP tool result payload',
    ],
    'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md': [
        '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | prepare-5a-execution-plan |',
        '/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
        '下一步是准备 5A strict execution plan，不再直接执行 technical contract',
    ],
}
errors = []
old_path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure.md')
if old_path.exists():
    errors.append(f'old executable plan path still exists: {old_path}')
for path, needles in checks.items():
    file_path = Path(path)
    if not file_path.exists():
        errors.append(f'missing file: {path}')
        continue
    text = file_path.read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text:
            errors.append(f'{path}: missing {needle}')
if errors:
    print('FAIL Phase 5 split landing incomplete:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS Phase 5 split landing complete')
PY
```

预期输出：

```text
PASS Phase 5 split landing complete
```

证明：该检查证明 split design 已落地为 deprecated old plan、plan index、5A technical contract 与 execution index 指针，且下一步是准备 5A strict execution plan，不再直接执行 technical contract。

- [x] **步骤 2：运行占位符检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
files = [
    Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md'),
    Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md'),
]
forbidden_parts = [
    ('TO', 'DO'),
    ('TB', 'D'),
    ('待', '定'),
    ('补充', '细节'),
    ('类似', '前文'),
    ('添加', '适当的错误处理'),
    ('为上述代码', '编写测试'),
]
violations = []
for path in files:
    text = path.read_text(encoding='utf-8')
    for left, right in forbidden_parts:
        word = left + right
        if word in text:
            violations.append(f'{path}: {word}')
if violations:
    print('FAIL placeholder markers found:')
    for item in violations:
        print('-', item)
    raise SystemExit(1)
print('PASS no placeholder markers in new split plans')
PY
```

预期输出：

```text
PASS no placeholder markers in new split plans
```

证明：该检查证明新 plan index 和 5A technical contract 不含禁止占位符，后续执行者不会遇到空泛指令。

- [x] **步骤 3：运行 markdown whitespace 检查**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 0。

证明：该检查证明本计划落地的 Markdown 修改没有 trailing whitespace 或 diff whitespace 错误。

- [x] **步骤 4：检查工作区范围**

运行：

```bash
git status --short
```

预期：无未提交的目标文件修改；如果仍有未跟踪文件，只能是执行者明确决定不提交的非目标文件。

证明：该检查证明 split landing 已按任务提交，且没有意外修改 Phase 5 以外的 roadmap 或实现代码。
