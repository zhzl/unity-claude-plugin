# Unity Agent Kit Phase 5 Split Landing 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 落地 Phase 5 split design：废弃旧总 plan、创建 Phase 5 plan index、创建 Phase 5A Host Runtime implementation plan，并把 roadmap Phase 5 同步到可执行 5A 的 planned 状态。

**架构：** 本计划只修改文档 artifact，不实现 Unity Agent Kit 运行时代码。Roadmap Phase 5 保持单一 phase，`Plan` artifact 指向 plan index；plan index 再映射 5A-5E subplans，其中只有 5A plan 在本计划中创建。

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
- **Success Criteria:** Phase 5 拆分后，roadmap `Plan` artifact 指向 plan index；旧总 plan 明确 deprecated；5A-5E subplans 有明确 scope 和状态；5A implementation plan 具备 Host Runtime 最小 vertical smoke path、Phase 1-4 compliance matrix、v2 reference mapping、7 分 quality gate 和 completion evidence；5A plan 通过审查后才更新 plan index 和 roadmap planned 状态；roadmap Phase 5 进入 `planned` 且下一步指向执行 5A。
- **用户确认事项:** 先设计 subplans，再决定是否升级正式 roadmap phases；旧总 plan 标记 deprecated 并保留历史参考；第一个可执行 subplan 是 5A Host Runtime；reference mapping 按能力域 / 基础设施域；subplan 独立 evidence，Phase 5 最终统一完成；5A plan index 初始状态为 `pending`，5A plan 创建并通过审查后改为 `planned`。
- **本计划不包含:** 不实现 5A 运行时代码；不执行 5A plan；不创建 5B-5E plans；不修改通用 `roadmap-management` skill；不把 5A-5E 写入 roadmap Phase Summary 作为正式 phases。

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
- 创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` — 第一个可执行 subplan，规划 Host Runtime 基础设施。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — Phase 5 进入 `planned`，Plan artifact 指向 plan index，Next Manual Action 指向执行 5A。

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

After Phase 5A plan is created and this index is updated to mark Phase 5A as `planned`, execute:

```text
/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
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

## 任务 3：创建 Phase 5A Host Runtime implementation plan

**文件：**
- 创建：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- [x] **步骤 1：运行 5A plan 检查并确认失败**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
plan = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md')
index = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md')
required_plan = [
    '# Unity Agent Kit Phase 5A Host Runtime 实现计划',
    '**Subplan:** Phase 5A',
    '## Phase 1-4 Compliance Matrix',
    '## unity-mcp-v2 Reference Mapping',
    '## Quality Gate',
    '## MCP Tool Result Mapping Foundation',
    '## Subplan Completion Evidence',
    '## Roadmap Phase Upgrade Check',
    'Phase 5A 最小 vertical smoke path',
    'host-level safety timeout',
    'Unity host writes registry',
    'TS maps envelope to public-result foundation',
    '真实 `/probe` HTTP response',
    '真实 `/operations` HTTP request',
    'dispatch exception',
    'host.threadCheck',
    'captured Unity main thread',
    'DTO JSON round-trip',
    'Malformed JSON',
    'hostId / hostEpoch mismatch',
    'TS public result → MCP tool result payload',
    'node --experimental-strip-types --test tests/host-runtime.test.ts',
    'node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts',
    'HostRuntimeVerticalSmokeTests',
    'Unity test keeps the loopback host alive while Node probes and invokes it',
    'standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence',
    'regular TS evidence only covers non-live host runtime unit tests',
    '`status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`',
    'startedAt',
    'completedAt',
    'durationMs',
]
errors = []
if not plan.exists():
    errors.append('5A plan missing')
else:
    text = plan.read_text(encoding='utf-8')
    errors.extend(f'5A plan missing: {item}' for item in required_plan if item not in text)
if not index.exists():
    errors.append('plan index missing')
else:
    index_text = index.read_text(encoding='utf-8')
    expected = '| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | planned | pending | stays subplan |'
    if expected not in index_text:
        errors.append('plan index does not mark Phase 5A planned after 5A plan creation')
if errors:
    print('FAIL Phase 5A plan landing incomplete:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS Phase 5A plan exists and index marks it planned')
PY
```

预期：FAIL，输出 5A plan missing 或 index 未将 5A 标记为 planned。

证明：该检查证明第一个可执行 subplan 尚未创建，因此 roadmap 还不能安全指向执行 5A。

- [x] **步骤 2：创建 5A Host Runtime implementation plan**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
plan = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md')
content = '''# Unity Agent Kit Phase 5A Host Runtime 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Unity Agent Kit 的单一 Unity C# host runtime、loopback transport、registry/probe、main-thread dispatch、DTO/result envelope 和 active host lost/rebind 基础。

**架构：** Unity C# host 位于 `unity/Assets/UnityAgentKit/`，负责短主线程动作、registry 写入、loopback HTTP、operation routing 和 DTO envelope。TS host client 位于 `plugins/unity-agent-kit/src/host/`，负责读取 registry、probe active host、invoke `/operations`、识别 lost/rebind，并把 host envelope 映射到 public-result foundation。`plugins/unity-agent-kit/src/contracts/` 只定义最小 MCP tool result payload 映射基础，不注册 MCP tools 或绑定具体 public action schema。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C#、Unity EditMode tests、loopback HTTP、JSON DTO。
**拆分检查：** 已检查；Phase 5 按 plan index 拆分为 5A-5E，本计划只覆盖 Host Runtime 基础设施。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
**Subplan:** Phase 5A

---

## 上游约束摘要

- **Roadmap Shared Constraints:** 单一 Unity C# host runtime；基于 v2 演进但不做 legacy public tool compatibility；TS 负责 workflow 编排、host rebind 和最终判定；Unity C# 负责短主线程动作、状态读取和基础记录；禁止 Unity host 承担长阻塞 workflow。
- **Phase Scope:** Phase 5 的 P0 daily loop actions、最小 `/unity` skill、Unity host、TS/MCP layer、artifact/report Resources 和 E2E。Phase 5A 只交付 Host Runtime 基础设施。
- **Phase Out-of-scope:** Phase 5A 不实现 19 个 public action 业务逻辑、artifact store、MCP Resource handlers、TestRunner、CompileDiagnostics、Console readback、PlayMode transition、Screenshot capture、`/unity` skill、MCP public tool registration 或 final daily loop E2E。
- **Success Criteria:** 5A 通过最小 vertical smoke path 证明 registry、真实 `/probe` HTTP response、真实 `/operations` HTTP request、main-thread dispatch、DTO envelope 和 TS mapping 能形成真实闭环；host-level timeout failure 和 dispatch exception 有诊断结果；host restart / epoch 变化可检测；TS public result → MCP tool result payload 的最小映射规则可测试。
- **用户确认事项:** 5A 是第一个可执行 subplan；5A 只实现 host-level safety timeout，workflow-level timeout / polling 属于 5B；5A 必须从最小端到端 internal operation path 开始；最小 internal operation 不作为 Phase 5 stable public action；5A 不注册 MCP tools，但必须定义 host envelope → TS public result → MCP tool result payload 的最小映射基础。
- **本计划不包含:** 不创建 5B-5E plans；不同步 roadmap completed；不修改 roadmap phase 结构；不实现 daily loop action 行为。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本 subplan 如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚 | 只在 `unity/Assets/UnityAgentKit/` 创建单一 host；TS host client 只做 registry/probe/invoke/mapping | 任务 1-6 | Unity asmdef/path 检查；TS host client tests |
| Phase 2 | `/unity` skill 是薄路由，逻辑留在 MCP tools / Unity host | 5A 不创建 `/unity` skill，只交付 runtime foundation | 任务 6 | Out-of-scope 文本检查 |
| Phase 3 | Public action contract 稳定；schema 有界；禁止 free-form params | 5A 不注册 public actions；只定义 host DTO envelope、TS public-result foundation 和 MCP tool result payload 映射基础 | 任务 1、4、5 | DTO/envelope mapping tests；MCP payload mapping tests |
| Phase 4 | Async/job/workflow/artifact 语义可靠；不能无证据报成功 | 5A 只做 host-level safety timeout，不做 workflow-level polling；operation success 必须来自 DTO envelope | 任务 3-6 | timeout mapping tests；vertical smoke path |

## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
| loopback HTTP host | `references/unity-mcp-v2` host runtime / loopback server | 动态端口、loopback-only、probe 和 operations 分离 | v2 public tool surface | Phase 5 使用 Unity Agent Kit 新 public action/resource/status 体系 | 任务 3-4 |
| registry / probe | `references/unity-mcp-v2` registry / probe / host rebirth | registry 文件、host identity、epoch、active probe | 旧 public compatibility metadata | 5A 只需要 runtime activation evidence，不暴露 legacy tools | 任务 2、3、5 |
| main-thread dispatch | v2 Unity API 主线程调度机制 | 从 HTTP/background path 切回 Unity main thread，可等待、有返回值、异常传播 | 长 workflow 等待 | workflow-level waiting 属于 5B+ action workflows | 任务 4 |
| operation envelope | v2 operation envelope / result shape | requestId、operation、status、diagnostics、host identity、duration；host envelope → TS public result → MCP tool result payload 的字段保留规则 | string concat / string search 作为协议主体；MCP public tool registration | 不满足 schema/result semantics；5A 只定义映射基础，不暴露 MCP tools | 任务 1、4、5 |
| active host validation | v2 active instance checks | probe active host、detect lost、epoch mismatch | 自动恢复所有状态 | 5A 只保证 runtime active validation，不恢复 action/job state | 任务 5-6 |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| Loopback HTTP host | 动态端口 + `/probe` + `/operations` + registry 写入 | 8 | 修订到真实动态端口和 active probe 通过后才进入 evidence |
| Main-thread dispatch | 可等待、有返回值、异常传播、host-level safety timeout | 8 | 若无法证明异常和 timeout，排除 completion evidence 并修订 |
| DTO/result envelope | C# DTO JSON + TS public-result foundation mapping | 8 | 若出现 string concat / string search 主协议，修订后再验收 |
| Active host validation | Registry read + probe + hostId/epoch lost detection | 8 | 若只能读 registry 不能 probe active host，不能进入 evidence |
| MCP result mapping foundation | TS public result → MCP tool result payload，保留 status、diagnostics、evidence/resource reference 边界 | 8 | 若映射丢失 timeout/lost/uncertain 或 diagnostics，修订后再验收 |
| Vertical smoke path | registry → probe → operations → main thread → envelope → TS mapping | 9 | 若 smoke path 不闭环，5A 不可完成 |

## 文件结构

- 创建：`plugins/unity-agent-kit/package.json` — TS test script and module metadata for 5A host client tests.
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts` — public-result foundation and host envelope mapping target.
- 创建：`plugins/unity-agent-kit/src/contracts/mcp-result.ts` — TS public result → MCP tool result payload mapping foundation, without MCP tool registration.
- 创建：`plugins/unity-agent-kit/src/host/registry.ts` — read and validate `unity/Library/UnityAgentKit/host.json`.
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts` — probe and invoke loopback host operations.
- 创建：`plugins/unity-agent-kit/src/host/rebind.ts` — host lost / epoch mismatch helpers.
- 创建：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — TS registry/probe/invoke/rebind/envelope tests.
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef` — Unity editor assembly definition.
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs` — editor lifecycle bootstrap and registry writer.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs` — host registry record and path helpers.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — loopback HTTP server with `/probe` and `/operations`.
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — awaitable main-thread dispatch helper.
- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — internal operation router for probe/echo/status smoke operations.
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — request/response/envelope DTOs.
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef` — Unity EditMode test assembly.
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs` — Unity registry/router/dispatch DTO tests.

## Phase 5A 最小 vertical smoke path

5A implementation must start from this path and expand around it:

```text
Unity host writes registry
→ TS reads registry
→ TS probes active host
→ TS invokes /operations
→ Unity dispatches to main thread
→ Unity returns DTO envelope
→ TS maps envelope to public-result foundation
```

## 任务 1：创建 TS package skeleton、result foundation 和 MCP payload mapping

**文件：**
- 创建：`plugins/unity-agent-kit/package.json`
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts`
- 创建：`plugins/unity-agent-kit/src/contracts/mcp-result.ts`
- 创建：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [ ] **步骤 1：编写失败的 TS foundation 测试**

创建 `plugins/unity-agent-kit/tests/host-runtime.test.ts`，测试 package script 和 result status foundation：

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";
import { publicStatusValues, type PublicResult } from "../src/contracts/result.ts";

const root = new URL("../", import.meta.url);

test("package test script uses Node strip-types", async () => {
  const raw = await readFile(new URL("package.json", root), "utf8");
  const pkg = JSON.parse(raw) as { type?: string; scripts?: Record<string, string> };
  assert.equal(pkg.type, "module");
  assert.equal(pkg.scripts?.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("public result status foundation covers host runtime statuses", () => {
  assert.deepEqual(publicStatusValues, ["succeeded", "failed", "uncertain", "timeout", "lost", "rejected"]);
});

test("MCP tool result payload preserves public result status diagnostics and evidence", () => {
  const result: PublicResult<{ requestId: string }> = {
    status: "timeout",
    tool: "unity.host",
    action: "host.echo",
    summary: "Host operation timed out",
    diagnostics: [
      {
        source: "host",
        severity: "error",
        message: "host-level safety timeout",
        attribution: "attributed",
      },
    ],
    evidence: { requestId: "req-timeout" },
  };

  assert.deepEqual(mapPublicResultToMcpToolResult(result), {
    isError: true,
    payload: result,
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 `package.json`、`src/contracts/result.ts` 或 `publicStatusValues` 缺失。

- [ ] **步骤 3：创建最小 TS package 和 result contract**

创建 `plugins/unity-agent-kit/package.json`：

```json
{
  "name": "unity-agent-kit",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --experimental-strip-types --test tests/host-runtime.test.ts"
  }
}
```

创建 `plugins/unity-agent-kit/src/contracts/result.ts`：

```ts
export const publicStatusValues = ["succeeded", "failed", "uncertain", "timeout", "lost", "rejected"] as const;
export type PublicStatus = (typeof publicStatusValues)[number];

export interface PublicDiagnostic {
  source: "host" | "workflow" | "validation";
  severity: "info" | "warning" | "error";
  message: string;
  attribution: "attributed" | "unattributed" | "uncertain";
}

export interface PublicResult<TEvidence = unknown> {
  status: PublicStatus;
  tool: string;
  action: string;
  summary: string;
  diagnostics: PublicDiagnostic[];
  evidence?: TEvidence;
  nextStep?: string;
}
```

创建 `plugins/unity-agent-kit/src/contracts/mcp-result.ts`：

```ts
import type { PublicResult } from "./result.ts";

export interface McpToolResultPayload<TEvidence = unknown> {
  isError: boolean;
  payload: PublicResult<TEvidence>;
}

export function mapPublicResultToMcpToolResult<TEvidence>(
  result: PublicResult<TEvidence>,
): McpToolResultPayload<TEvidence> {
  return {
    isError: result.status !== "succeeded",
    payload: result,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期输出包含：

```text
# fail 0
```

证明：该检查证明 TS package skeleton、public-result foundation 和 MCP tool result payload mapping 可被 Node test runner 加载，且 5A host runtime 状态枚举有明确 contract。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/package.json plugins/unity-agent-kit/src/contracts/result.ts plugins/unity-agent-kit/src/contracts/mcp-result.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: add unity agent kit host runtime ts foundation

Create the TypeScript package skeleton and public result foundation for Phase 5A host runtime work.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：创建 Unity host DTOs 和 registry foundation

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`
- 创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：编写失败的 Unity registry / DTO tests**

创建 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`，测试 registry path、project root 和 DTO 字段：

```csharp
using NUnit.Framework;

namespace UnityAgentKit.Editor.Tests
{
    public sealed class HostRuntimeTests
    {
        [Test]
        public void RegistryPathUsesUnityLibrary()
        {
            var path = UnityAgentKitHostRegistry.GetRegistryPath("/project").Replace('\\', '/');
            Assert.That(path, Does.EndWith("/project/Library/UnityAgentKit/host.json"));
        }

        [Test]
        public void HostRecordUsesPhase5ProtocolAndIdentity()
        {
            var record = UnityAgentKitHostRegistry.CreateRecord("/project", 17001, "host-1", 3, "ready");
            Assert.AreEqual("unity-agent-kit", record.hostName);
            Assert.AreEqual("2026-05-18.phase5", record.protocolVersion);
            Assert.AreEqual("/project", record.projectRoot);
            Assert.AreEqual("host-1", record.hostId);
            Assert.AreEqual(3, record.hostEpoch);
            Assert.AreEqual(17001, record.port);
        }

        [Test]
        public void OperationResponseEnvelopeCarriesHostIdentity()
        {
            var response = UnityAgentKitOperationResponse.Succeeded("host.echo", "req-1", "host-1", 3, "echo", "{}");
            Assert.AreEqual("succeeded", response.status);
            Assert.AreEqual("host.echo", response.operation);
            Assert.AreEqual("host-1", response.hostId);
            Assert.AreEqual(3, response.hostEpoch);
        }

        [Test]
        public void OperationRequestJsonDeserializesToDto()
        {
            var request = UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationRequest>(
                "{\"operation\":\"host.echo\",\"requestId\":\"req-json\",\"inputJson\":\"{}\"}");

            Assert.AreEqual("host.echo", request.operation);
            Assert.AreEqual("req-json", request.requestId);
            Assert.AreEqual("{}", request.inputJson);
        }

        [Test]
        public void OperationResponseDtoSerializesAndDeserializesRoundTrip()
        {
            var response = UnityAgentKitOperationResponse.Succeeded("host.echo", "req-roundtrip", "host-1", 3, "echo", "{}");
            var json = UnityEngine.JsonUtility.ToJson(response);
            var roundTrip = UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationResponse>(json);

            Assert.AreEqual("succeeded", roundTrip.status);
            Assert.AreEqual("host.echo", roundTrip.operation);
            Assert.AreEqual("req-roundtrip", roundTrip.requestId);
            Assert.AreEqual("host-1", roundTrip.hostId);
            Assert.AreEqual(3, roundTrip.hostEpoch);
        }
    }
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef`：

```json
{
  "name": "UnityAgentKit.Editor.Tests",
  "references": ["UnityAgentKit.Editor"],
  "includePlatforms": ["Editor"],
  "optionalUnityReferences": ["TestAssemblies"]
}
```

- [ ] **步骤 2：运行 Unity EditMode tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AResults.xml
```

预期：FAIL，编译错误包含 `UnityAgentKitHostRegistry` 或 `UnityAgentKitOperationResponse` 不存在。

- [ ] **步骤 3：创建 Unity editor assembly、DTOs 和 registry foundation**

创建 `unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef`：

```json
{
  "name": "UnityAgentKit.Editor",
  "references": [],
  "includePlatforms": ["Editor"]
}
```

创建 `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`，定义 registry/probe/operation envelope DTO fields，并用 `UnityEngine.JsonUtility` 做 request JSON → DTO 和 response DTO → JSON → DTO round-trip；不得用 string concat / string search 作为 C# host protocol 的主要 JSON 实现。

创建 `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs`，使用 `Application.dataPath` 推导 project root，写入 `Library/UnityAgentKit/host.json`，并提供 `CreateRecord` and `GetRegistryPath`.

- [ ] **步骤 4：运行 Unity EditMode tests 验证通过**

运行步骤 2 的 Unity 命令。

预期：Unity test results 中 `HostRuntimeTests` 的 registry 和 DTO tests 通过。

证明：该检查证明 Unity host 文件位于单一 `unity/Assets/UnityAgentKit/` runtime，下游 registry/probe 可以使用稳定 DTO，不依赖 `Environment.CurrentDirectory` 推导 project root，并且 operation request/response 使用 DTO JSON round-trip 而不是字符串拼接协议。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKit.Editor.asmdef unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitHostRegistry.cs unity/Assets/UnityAgentKit/Editor/Tests/UnityAgentKit.Editor.Tests.asmdef unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "$(cat <<'EOF'
feat: add unity agent kit host registry foundation

Create the Unity editor assembly, host registry contract, and operation envelope DTO foundation for Phase 5A.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：实现 loopback HTTP `/probe` 和 dynamic registry

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：扩展失败的 Unity loopback tests**

在 `HostRuntimeTests.cs` 中新增 tests：

```csharp
[Test]
public void LoopbackServerAllocatesDynamicPort()
{
    using var server = new UnityAgentKitLoopbackHttpServer("host-test", 1);
    server.Start();
    Assert.Greater(server.Port, 0);
}

[Test]
public void HostRecordDoesNotUseFakePortZero()
{
    var record = UnityAgentKitHostRegistry.CreateRecord("/project", 17001, "host-1", 3, "ready");
    Assert.Greater(record.port, 0);
}

[Test]
public async System.Threading.Tasks.Task ProbeEndpointReturnsHostIdentityOverHttp()
{
    using var server = new UnityAgentKitLoopbackHttpServer("host-test", 1);
    server.Start();

    using var client = new System.Net.Http.HttpClient();
    var json = await client.GetStringAsync($"http://127.0.0.1:{server.Port}/probe");
    var probe = UnityEngine.JsonUtility.FromJson<UnityAgentKitProbeResponse>(json);

    Assert.AreEqual("unity-agent-kit", probe.hostName);
    Assert.AreEqual("host-test", probe.hostId);
    Assert.AreEqual(1, probe.hostEpoch);
    Assert.AreEqual("ready", probe.status);
}
```

- [ ] **步骤 2：运行 Unity EditMode tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AResults.xml
```

预期：FAIL，报错包含 `UnityAgentKitLoopbackHttpServer` 不存在或 `Port` 仍为 0。

- [ ] **步骤 3：实现 host bootstrap 和 dynamic loopback server**

创建 `UnityAgentKitLoopbackHttpServer.cs`，使用 loopback-only listener、dynamic port、真实 `/probe` HTTP response、start/stop lifecycle。创建 `UnityAgentKitHost.cs`，在 editor load 中启动 server、生成 host id / epoch、写 registry。

实现必须满足：

```text
server.Port > 0
registry.port > 0
/probe returns hostName, protocolVersion, hostId, hostEpoch, status through a real HTTP request
```

- [ ] **步骤 4：运行 Unity EditMode tests 验证通过**

运行步骤 2 的 Unity 命令。

预期：loopback tests pass。

证明：该检查证明 5A runtime 不使用假 port `0` 报成功，并能通过真实 `/probe` HTTP response 为 TS active host validation 提供真实 loopback endpoint。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/UnityAgentKitHost.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "$(cat <<'EOF'
feat: add unity agent kit loopback probe host

Start a loopback-only Unity host with dynamic port allocation, probe response, and registry publication.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 4：实现 main-thread dispatch 和 `/operations` internal path

**文件：**
- 创建：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 创建：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`

- [ ] **步骤 1：扩展失败的 operation dispatch tests**

在 `HostRuntimeTests.cs` 中新增 tests：

```csharp
[Test]
public void OperationRouterEchoReturnsEnvelope()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "host.echo",
        requestId = "req-echo",
        inputJson = "{\"message\":\"hello\"}"
    }, "host-1", 7);

    Assert.AreEqual("succeeded", response.status);
    Assert.AreEqual("host.echo", response.operation);
    Assert.AreEqual("req-echo", response.requestId);
    Assert.AreEqual("host-1", response.hostId);
    Assert.AreEqual(7, response.hostEpoch);
}

[Test]
public void UnknownOperationIsRejected()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "missing.operation",
        requestId = "req-missing",
        inputJson = "{}"
    }, "host-1", 7);

    Assert.AreEqual("rejected", response.status);
    Assert.AreEqual("missing.operation", response.operation);
}

[Test]
public async System.Threading.Tasks.Task OperationsEndpointReturnsEnvelopeOverHttp()
{
    using var server = new UnityAgentKitLoopbackHttpServer("host-1", 7);
    server.Start();

    using var client = new System.Net.Http.HttpClient();
    var body = new System.Net.Http.StringContent(
        "{\"operation\":\"host.echo\",\"requestId\":\"req-http\",\"inputJson\":\"{}\"}",
        System.Text.Encoding.UTF8,
        "application/json");
    var response = await client.PostAsync($"http://127.0.0.1:{server.Port}/operations", body);
    var json = await response.Content.ReadAsStringAsync();
    var envelope = UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationResponse>(json);

    Assert.AreEqual("succeeded", envelope.status);
    Assert.AreEqual("req-http", envelope.requestId);
    Assert.AreEqual("host.echo", envelope.operation);
}

[Test]
public async System.Threading.Tasks.Task OperationsEndpointDispatchesToCapturedMainThread()
{
    using var server = new UnityAgentKitLoopbackHttpServer("host-1", 7);
    server.Start();

    using var client = new System.Net.Http.HttpClient();
    var body = new System.Net.Http.StringContent(
        "{\"operation\":\"host.threadCheck\",\"requestId\":\"req-thread\",\"inputJson\":\"{}\"}",
        System.Text.Encoding.UTF8,
        "application/json");
    var response = await client.PostAsync($"http://127.0.0.1:{server.Port}/operations", body);
    var json = await response.Content.ReadAsStringAsync();
    var envelope = UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationResponse>(json);
    var threadCheck = UnityEngine.JsonUtility.FromJson<UnityAgentKitThreadCheckResult>(envelope.outputJson);

    Assert.AreEqual("succeeded", envelope.status);
    Assert.IsTrue(threadCheck.ranOnMainThread);
    Assert.AreEqual(threadCheck.capturedMainThreadId, threadCheck.executionThreadId);
}

[Test]
public async System.Threading.Tasks.Task MalformedOperationsJsonReturnsStructuredEnvelope()
{
    using var server = new UnityAgentKitLoopbackHttpServer("host-1", 7);
    server.Start();

    using var client = new System.Net.Http.HttpClient();
    var body = new System.Net.Http.StringContent("{not-json", System.Text.Encoding.UTF8, "application/json");
    var response = await client.PostAsync($"http://127.0.0.1:{server.Port}/operations", body);
    var json = await response.Content.ReadAsStringAsync();
    var envelope = UnityEngine.JsonUtility.FromJson<UnityAgentKitOperationResponse>(json);

    Assert.AreEqual("failed", envelope.status);
    Assert.AreEqual("host.invalidRequest", envelope.operation);
}

[Test]
public void DispatchExceptionReturnsFailedEnvelope()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "host.throw",
        requestId = "req-throw",
        inputJson = "{}"
    }, "host-1", 7);

    var diagnostics = UnityEngine.JsonUtility.FromJson<UnityAgentKitDiagnostics>(response.diagnosticsJson);

    Assert.AreEqual("failed", response.status);
    Assert.AreEqual("dispatch exception", diagnostics.items[0].message);
}

[Test]
public void DispatchTimeoutReturnsTimeoutEnvelope()
{
    var response = UnityAgentKitOperationRouter.Route(new UnityAgentKitOperationRequest
    {
        operation = "host.timeout",
        requestId = "req-timeout",
        inputJson = "{}"
    }, "host-1", 7, hostTimeoutMs: 1);

    var diagnostics = UnityEngine.JsonUtility.FromJson<UnityAgentKitDiagnostics>(response.diagnosticsJson);

    Assert.AreEqual("timeout", response.status);
    Assert.AreEqual("host-level safety timeout", diagnostics.items[0].message);
}
```

- [ ] **步骤 2：运行 Unity EditMode tests 验证失败**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AResults.xml
```

预期：FAIL，报错包含 `UnityAgentKitOperationRouter` 或 `host.echo` branch 缺失。

- [ ] **步骤 3：实现 main-thread dispatch 和 operation router**

创建 `UnityAgentKitMainThread.cs`，捕获 Unity main thread id，支持单次 host-level safety timeout、返回值、异常传播，并把 dispatch exception 映射为带 diagnostics DTO JSON 的 `failed` envelope。创建 `UnityAgentKitOperationRouter.cs`，实现 `host.echo`、`host.status`、`host.threadCheck`、`host.throw` 和 `host.timeout` internal smoke operations，未知 operation 返回 `rejected` envelope。

更新 `UnityAgentKitLoopbackHttpServer.cs`，让真实 `/operations` HTTP request 通过 DTO JSON deserialization 得到 request，经 main-thread dispatch 调用 router，并用 DTO JSON serialization 返回 envelope。Malformed JSON 必须返回结构化 `failed` envelope，不能通过 string concat / string search 作为主协议实现。

- [ ] **步骤 4：运行 Unity EditMode tests 验证通过**

运行步骤 2 的 Unity 命令。

预期：operation dispatch tests pass。

证明：该检查证明 `/operations` 不是 fire-and-forget；真实 `/operations` HTTP request 经过 main-thread dispatch，返回可反序列化 DTO envelope，能用 `host.threadCheck` 证明执行发生在 captured Unity main thread，并能区分 succeeded / rejected / failed / timeout。

- [ ] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs
git commit -m "$(cat <<'EOF'
feat: add unity agent kit operation dispatch path

Route loopback operations through main-thread dispatch and return structured host envelopes for internal smoke operations.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 5：实现 TS registry/probe/invoke/rebind client

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/registry.ts`
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts`
- 创建：`plugins/unity-agent-kit/src/host/rebind.ts`
- 修改：`plugins/unity-agent-kit/src/contracts/result.ts`
- 修改：`plugins/unity-agent-kit/src/contracts/mcp-result.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [ ] **步骤 1：扩展失败的 TS host client tests**

在 `host-runtime.test.ts` 中追加 registry/probe/invoke/lost tests. Tests 必须覆盖：

```text
readHostRegistry rejects wrong protocol
probeHost rejects mismatched hostId / hostEpoch after host restart
invokeHostOperation maps timeout to status "timeout"
mapHostEnvelope preserves `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`
mapPublicResultToMcpToolResult preserves those envelope metadata fields via payload together with status, diagnostics, evidence and resource references
```

- [ ] **步骤 2：运行 TS tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 missing `src/host/registry.ts`、`src/host/http-client.ts` 或 `src/host/rebind.ts`。

- [ ] **步骤 3：实现 TS host client modules**

创建 `registry.ts` 读取 `Library/UnityAgentKit/host.json` 并校验 hostName、protocolVersion、projectRoot、port、hostId、hostEpoch。

创建 `http-client.ts`，实现：

```text
probeHost(record, timeoutMs)
invokeHostOperation({ projectRoot, operation, input, timeoutMs })
mapHostEnvelope(envelope)
```

创建 `rebind.ts`，实现 hostId / hostEpoch mismatch detection and `lost` result helper，覆盖 host restart / domain reload 后 hostId / hostEpoch mismatch 可检测。

更新 `mcp-result.ts`，确保 TS public result → MCP tool result payload 原样保留 status、diagnostics、evidence 和 resource reference 字段，不在 5A 绑定具体 public action schema。

- [ ] **步骤 4：运行 TS tests 验证通过**

运行步骤 2 的 TS 命令。

预期输出包含：

```text
# fail 0
```

证明：该检查证明 TS 侧不会把 registry 存在误当成 host 可用，能通过 probe/invoke 验证 active host，并能把 host-level timeout/lost 映射为可诊断 public-result foundation 和 MCP tool result payload。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/registry.ts plugins/unity-agent-kit/src/host/http-client.ts plugins/unity-agent-kit/src/host/rebind.ts plugins/unity-agent-kit/src/contracts/result.ts plugins/unity-agent-kit/src/contracts/mcp-result.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: add unity agent kit ts host client

Read, probe, invoke, and validate the active Unity host with timeout and lost-result mapping.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 6：验证 Phase 5A vertical smoke path 和 completion evidence

**文件：**
- 验证：`plugins/unity-agent-kit/src/host/registry.ts`
- 验证：`plugins/unity-agent-kit/src/host/http-client.ts`
- 验证：`unity/Assets/UnityAgentKit/Editor`
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

- [ ] **步骤 1：运行 Phase 5A plan 内容检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
plan = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md').read_text(encoding='utf-8')
required = [
    'Phase 5A 最小 vertical smoke path',
    'Unity host writes registry',
    'TS maps envelope to public-result foundation',
    'host-level safety timeout',
    '## Phase 1-4 Compliance Matrix',
    '## unity-mcp-v2 Reference Mapping',
    '## Quality Gate',
    '## MCP Tool Result Mapping Foundation',
    '## Subplan Completion Evidence',
    '## Roadmap Phase Upgrade Check',
    '真实 `/probe` HTTP response',
    '真实 `/operations` HTTP request',
    'dispatch exception',
    'host.threadCheck',
    'captured Unity main thread',
    'DTO JSON round-trip',
    'Malformed JSON',
    'hostId / hostEpoch mismatch',
    'TS public result → MCP tool result payload',
    'node --experimental-strip-types --test tests/host-runtime.test.ts',
    'node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts',
    'HostRuntimeVerticalSmokeTests',
    'Unity test keeps the loopback host alive while Node probes and invokes it',
    'standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence',
    'regular TS evidence only covers non-live host runtime unit tests',
    '`status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`',
    'startedAt',
    'completedAt',
    'durationMs',
]
missing = [item for item in required if item not in plan]
if missing:
    print('FAIL Phase 5A plan required structure missing:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 5A plan required structure')
PY
```

预期输出：

```text
PASS Phase 5A plan required structure
```

证明：该检查证明 5A plan 包含 split design 要求的上游约束、reference mapping、quality gate、completion evidence、最小 vertical smoke path、真实 Host Runtime 验证和 MCP payload mapping foundation。

- [ ] **步骤 2：运行 TS tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期输出包含：

```text
# fail 0
```

证明：该检查证明 TS host client 的 registry/probe/invoke/rebind/envelope mapping 行为可执行，而不是仅检查文件存在。

- [ ] **步骤 3：运行 Unity EditMode tests**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AResults.xml
```

预期：Unity test results 中 `HostRuntimeTests` 通过。

证明：该检查证明 Unity C# host runtime 的 registry、dynamic port、operation envelope 和 main-thread dispatch foundation 可由 Unity test runner 验证。

- [ ] **步骤 4：更新 plan index 中 Phase 5A evidence**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中将 Phase 5A row 更新为 `completed`，并把 Completion Evidence 写为：

```markdown
TS host runtime tests pass; Unity EditMode `HostRuntimeTests` pass; vertical smoke path verifies registry → probe → operations → main-thread dispatch → DTO envelope → TS mapping.
```

- [ ] **步骤 5：Commit**

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
git commit -m "$(cat <<'EOF'
docs: record unity agent kit phase 5a evidence

Update the Phase 5 plan index with Host Runtime completion evidence after the vertical smoke path passes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## MCP Tool Result Mapping Foundation

5A does not register MCP tools and does not bind stable public action schemas. It only defines the minimum TS public result → MCP tool result payload mapping needed by later 5E registration:

- `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs` are preserved via payload alongside exact status values, including `timeout`, `lost`, `uncertain`, `failed` and `rejected`.
- diagnostics are preserved without flattening severity, source, attribution or message.
- evidence and resource reference fields remain inside the payload for later 5B/5E resource handling.
- `isError` is derived from `status !== "succeeded"` and does not rewrite the underlying public result.

## Subplan Completion Evidence

Phase 5A is complete only when these commands have observable passing output:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AResults.xml
```

Evidence must show:

- Unity host writes registry under `unity/Library/UnityAgentKit/host.json`.
- TS reads registry and probes active host before invoking operations.
- Unity tests verify DTO JSON round-trip for operation request and response envelope.
- Unity tests verify 真实 `/probe` HTTP response with host identity and epoch by deserializing JSON into DTOs.
- Unity tests verify 真实 `/operations` HTTP request dispatches to captured Unity main thread through `host.threadCheck` and returns DTO envelope carrying `status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`.
- Malformed JSON returns a structured diagnostic `failed` envelope.
- dispatch exception returns a diagnostic `failed` envelope.
- host-level safety timeout returns a diagnostic `timeout` envelope.
- TS maps envelope to public-result foundation.
- hostId / hostEpoch mismatch after host restart or domain reload returns diagnostic `lost` results.
- TS public result → MCP tool result payload preserves status, diagnostics and evidence/resource reference boundaries.

## Roadmap Phase Upgrade Check

当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。

Reason:

- 5A 是 Phase 5 内部 Host Runtime 基础设施切片。
- 5A 完成后不能单独满足 Phase 5 daily loop success criteria。
- 5A 完成后不直接解锁 Phase 6/7/8。
- 5A evidence 应写入 plan index，不应单独修改 roadmap phase 结构。
'''
plan.write_text(content, encoding='utf-8')
print(f'Wrote Phase 5A plan: {plan}')
PY
````

预期输出包含：

```text
Wrote Phase 5A plan: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

- [x] **步骤 3：执行 5A plan 审查 gate**

运行：

```text
/superpowers:reviewing-specs docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

预期：审查输出 `No blocking consistency issues found.`，或仅包含不阻塞执行的 minor improvements。

如果审查输出 blocking consistency issues，停止本计划，先修订 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` 并重新审查；不得进入步骤 4。

证明：该 gate 证明 Phase 5A plan 已创建并通过审查，满足“通过审查后才能标记为 planned”的状态门禁。

该 gate 修订必须同步 embedded 5A template 与本任务的 required content checks：常规 TS 命令改为 `node --experimental-strip-types --test tests/host-runtime.test.ts`，`node --experimental-strip-types --test tests/phase5a-vertical-smoke.test.ts` 只作为 `HostRuntimeVerticalSmokeTests` 内部启动的 live-host probe 命令；standalone `phase5a-vertical-smoke.test.ts` pass/skip 不可作为 completion evidence；regular TS evidence only covers non-live host runtime unit tests。完整 operation envelope fields 也必须在模板与检查中同时保留：`status`, `operation`, `requestId`, `hostId`, `hostEpoch`, `summary`, `data`, `diagnostics`, `startedAt`, `completedAt`, `durationMs`。

- [x] **步骤 4：更新 plan index，把 Phase 5A 标记为 planned**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
index = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md')
text = index.read_text(encoding='utf-8')
old = '| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | pending | pending | stays subplan |'
new = '| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | planned | pending | stays subplan |'
if old not in text and new not in text:
    raise SystemExit('Phase 5A row missing from plan index')
if old in text:
    text = text.replace(old, new)
index.write_text(text, encoding='utf-8')
print('Updated Phase 5A status to planned in plan index')
PY
```

预期输出：

```text
Updated Phase 5A status to planned in plan index
```

- [x] **步骤 5：运行 5A plan 检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5A plan exists and index marks it planned
```

证明：该检查证明 5A implementation plan 已创建，审查 gate 已通过，且 plan index 的 `planned` 状态现在与状态规则一致。

- [x] **步骤 6：Commit**

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
git commit -m "$(cat <<'EOF'
docs: add unity agent kit phase 5a host runtime plan

Create the first Phase 5 subplan for Host Runtime infrastructure and mark it planned in the Phase 5 index.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

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
    '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | implement-plan |',
    '- 当前阶段：Phase 5 split design、plan index 和 5A Host Runtime plan 已创建并审查通过，等待执行 5A plan。',
    '- **Next Manual Action:** `/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`',
    '### Phase 5：高频日常闭环基础设施',
    '**Status:** `planned`',
    '- **Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`',
    '- **Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`',
    '完成 Phase 5 split design、plan index 和已审查的 5A Host Runtime plan；Phase 5 进入 split-plan `planned` 状态，下一步执行 5A plan。',
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

证明：该检查证明 roadmap 还没有把 Phase 5 的 plan artifact 指向 plan index，也没有把下一步指向 5A 执行。

- [x] **步骤 2：更新 Phase Summary 中 Phase 5 行**

将 Phase 5 行替换为：

```markdown
| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | implement-plan |
```

- [x] **步骤 3：更新 Current State**

将 Current State 中 Phase 5 相关行更新为：

```markdown
- 当前阶段：Phase 5 split design、plan index 和 5A Host Runtime plan 已创建并审查通过，等待执行 5A plan。
- Phase 1 已完成架构与边界蓝图规格验证，并记录 completion evidence。
- Phase 2 已完成 Unity Agent Skill 体系设计规格和计划，并记录 completion evidence。
- Phase 3 已完成 Public MCP Tool Action Design 规格和计划，并记录 completion evidence。
- Phase 4 已完成 Async / Job / Workflow / Artifact Semantics 规格验证和计划执行，并记录 completion evidence。
- **Next Manual Action:** `/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
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
- 2026-05-18：完成 Phase 5 split design、plan index 和已审查的 5A Host Runtime plan；Phase 5 进入 split-plan `planned` 状态，下一步执行 5A plan。
```

- [x] **步骤 6：运行 roadmap planned 状态检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5 roadmap planned split state is present
```

证明：该检查证明 roadmap current truth 已指向 plan index，且下一步是执行 5A plan，不再指向旧总 plan。

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

- [ ] **步骤 1：运行综合落地检查**

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
        '| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | planned | pending | stays subplan |',
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
        '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | implement-plan |',
        '/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md',
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

证明：该检查证明 split design 已落地为 deprecated old plan、plan index、5A plan 和 roadmap planned state，旧总 plan 不再是可执行入口。

- [ ] **步骤 2：运行占位符检查**

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

证明：该检查证明新 plan index 和 5A plan 不含禁止占位符，后续执行者不会遇到空泛指令。

- [ ] **步骤 3：运行 markdown whitespace 检查**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 0。

证明：该检查证明本计划落地的 Markdown 修改没有 trailing whitespace 或 diff whitespace 错误。

- [ ] **步骤 4：检查工作区范围**

运行：

```bash
git status --short
```

预期：无未提交的目标文件修改；如果仍有未跟踪文件，只能是执行者明确决定不提交的非目标文件。

证明：该检查证明 split landing 已按任务提交，且没有意外修改 Phase 5 以外的 roadmap 或实现代码。
