# Unity Agent Kit Phase 5A Contract / Execution Plan Set 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 落地 Large Subplan Planning Protocol，并把 Phase 5A 从误导性的单份可执行 plan 改成 technical contract + execution plan set 入口。

**架构：** 新增本地 protocol 文档作为通用流程规则；保留 `phase-5a-host-runtime.md` 路径但将其改为 technical contract，并新增 Contract Requirement Index。Phase 5 plan index 和 roadmap 只指向 current-truth entry；5A execution index 管理 candidate plan cards、active plans、wave 和 depends_on，split landing 和 experience doc 只记录历史与指针。

**技术栈：** Markdown、Python inline 文本检查、git diff/check。
**拆分检查：** 已检查；无需拆分。本计划只做文档落地，不实现 Unity Agent Kit 运行时代码；各修改共同消除同一个错误执行入口，若拆成多个 implementation plans 会留下 plan index / roadmap 与 5A contract 不一致的窗口。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-19-large-subplan-planning-protocol-design.md`

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、轮询、timeout、host rebind 和最终判定；Unity C# 负责短主线程动作、状态读取、job/report 记录；写操作和 artifact action 不能无证据报成功。
- **Phase Scope:** Phase 5 覆盖高频日常闭环基础设施；当前落地只修复 Phase 5A 计划结构和执行入口，不实现 5A runtime code。
- **Phase Out-of-scope:** 不实现 Unity C# host、TS client、MCP public tools、`/unity` skill、artifact/resource store、5B-5E execution plans；不修改通用 superpowers skills。
- **Success Criteria:** Large Subplan Planning Protocol 独立成文；5A 文件明确为 technical contract；Phase 5 plan index 区分 Contract / Execution Index / Execution Status；5A execution index 列出最多 8 个 candidate plan cards；roadmap 和 Next Manual Action 不再把 `phase-5a-host-runtime.md` 当作 executable plan。
- **用户确认事项:** 采用本地 protocol，不直接改通用 skill；最大深度固定为 Roadmap Phase → Subplan Technical Contract → Execution Plan Set Index → Sibling Execution Plans → Tasks；strict writing-plans 不降级；Phase 5A 保持单一 formal subplan，但最多允许 8 个 active sibling execution plans；第 9 个 plan 或无法保持 strict writing-plans 时触发 formal subplan split review。
- **本计划不包含:** 不创建真正的 5A executable execution plan；不执行 5A 代码；不标记 Phase 5A completed；不把 candidate plan card 当作 executable plan。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-19-large-subplan-planning-protocol-design.md` | Protocol trigger、maximum depth、strict writing-plans preservation、escalation thresholds、plan-set review、5A application、current-truth hierarchy | 不把 design spec 当运行时入口 | design spec 是设计记录，运行时入口应在 protocol、plan index 和 execution index | 任务 1-6 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 保留为 5A technical contract，新增 requirement IDs，移除可执行 plan 误导 | 不直接执行当前任务列表，不把 checkbox steps 当 executable plan | 当前文件技术内容完整但不是 strict writing-plans executable plan | 任务 2 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | 作为 Phase 5 current-truth entry，新增 Contract / Execution Index / Execution Status | 不让 Plan 字段继续混用 contract 和 executable plan | 防止执行者从错误入口运行 technical contract | 任务 4 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md` | 保留为历史 landing plan，修正误导，指向 protocol / contract / execution index | 不继续内嵌完整 execution plan set | split landing 是一次性历史计划，不应承担运行时 current truth | 任务 5 |
| `docs/superpowers/phase-5-subplan-planning-workflow-experience.md` | 记录 large subplan protocol 经验和 5A structure review 结论 | 不作为执行入口或状态真相 | experience doc 只保存经验，不驱动执行 | 任务 5 |
| `references/get-shit-done/agents/gsd-planner.md`、`references/get-shit-done/get-shit-done/references/spidr-splitting.md` | sibling plan、wave、context budget、反无限拆分的启发 | 不采用 GSD-style 降低 plan 细节密度 | 本项目保留 strict superpowers writing-plans | 任务 1、6 |

## 文件结构

- 创建：`docs/superpowers/protocols/large-subplan-planning-protocol.md` — 本地 Large Subplan Planning Protocol，供 Phase 5A 和后续大 subplan 参考。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` — 改为 technical contract，新增 Contract Requirement Index，移除直接可执行 plan 语义。
- 创建：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` — Phase 5A execution plan set current-truth entry，记录 candidate plan cards、wave、depends_on、状态和 next action。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 改表结构，区分 contract / execution index / execution status，修正 Next Manual Action。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 修正 Current State 和 Next Manual Action，避免直接执行 technical contract。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md` — 降级为历史记录和指针，不再维护 5A execution plan set 模板。
- 修改：`docs/superpowers/phase-5-subplan-planning-workflow-experience.md` — 记录本次 large subplan protocol 经验、structure review 和硬停止线。

## 任务 1：创建 Large Subplan Planning Protocol 文档

**文件：**
- 创建：`docs/superpowers/protocols/large-subplan-planning-protocol.md`

- [x] **步骤 1：编写失败的 protocol 内容检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/protocols/large-subplan-planning-protocol.md')
required = [
    '# Large Subplan Planning Protocol',
    'Roadmap Phase\n→ Subplan Technical Contract\n→ Execution Plan Set Index\n→ Sibling Execution Plans\n→ Tasks',
    'Strict writing-plans preservation rule',
    'Plan card is not executable',
    'formal subplan split review',
    'Current-truth files',
]
if not path.exists():
    print('FAIL protocol document missing')
    raise SystemExit(1)
text = path.read_text(encoding='utf-8')
missing = [item for item in required if item not in text]
if missing:
    print('FAIL protocol document missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS large subplan protocol document is present')
PY
```

预期：FAIL，输出：

```text
FAIL protocol document missing
```

证明：该检查证明本地 protocol 尚未落地，后续 5A execution index 没有可引用的流程规则。

- [x] **步骤 2：创建 protocol 目录和文档**

运行：

````bash
mkdir -p docs/superpowers/protocols && PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/protocols/large-subplan-planning-protocol.md')
path.write_text('''# Large Subplan Planning Protocol

**Purpose:** Define how this project handles a roadmap subplan whose technical contract must stay coherent while a single strict `superpowers:writing-plans` implementation plan would be too large.

## When to Use

Use this protocol when any of these signals appear:

1. A subplan shares one technical contract, but one strict execution plan would become too large.
2. A subplan involves multiple strongly-coupled domains that must share one contract.
3. A plan author starts omitting concrete tests, expected FAIL, minimal implementation, expected PASS, verification commands, or commit steps to keep a plan short.
4. A document passes technical consistency review but is not directly executable under strict `superpowers:writing-plans`.

## Maximum Structure Depth

Only this structure is allowed:

```text
Roadmap Phase
→ Subplan Technical Contract
→ Execution Plan Set Index
→ Sibling Execution Plans
→ Tasks
```

Do not create nested batch plans:

```text
Execution Plan
→ Batch Plan
→ Sub-batch Plan
```

If an execution plan is too large, split it into sibling execution plans. If sibling plans exceed the hard stop, run formal subplan split review instead of adding another layer.

## Strict writing-plans preservation rule

Large subplan handling may split plans, but must not weaken `superpowers:writing-plans` requirements.

Every executable execution plan must include:

- concrete failing tests;
- command and expected FAIL output;
- minimal implementation guidance;
- command and expected PASS output;
- semantic verification, not only file or symbol existence;
- commit steps.

If a sibling execution plan cannot include those within a reviewable scope, split it into smaller sibling execution plans. If that requires a ninth sibling plan, stop and run formal subplan split review.

## Execution Plan Set Rules

An execution plan set index records:

- candidate plan cards;
- active execution plans;
- requirement IDs;
- wave and depends_on;
- expanded plan path;
- execution status;
- current next action.

Plan card is not executable. It is a coverage and scheduling record. Only an expanded strict writing-plans execution plan can be passed to `subagent-driven-development` or `executing-plans`.

## Plan Card Expansion Rules

When expanding a plan card:

1. Do not add requirement coverage beyond the card.
2. Do not delete requirement coverage from the card unless the execution index is updated and plan-set review passes.
3. Do not change wave, depends_on, or requirement ownership without updating the execution index and rerunning plan-set review.
4. Do not create a ninth sibling execution plan. If the ninth plan is needed, run formal subplan split review.
5. Expanded plans may add tests, steps, files, and evidence details, but must not reinterpret the technical contract.

## Escalation Thresholds

Run formal subplan split review when any of these happen:

- the execution plan set needs a ninth sibling execution plan;
- any execution plan cannot stay within 2-3 strict writing-plans tasks;
- an execution plan cannot preserve concrete tests, FAIL/PASS expectations, minimal implementation guidance, verification commands, and commit steps;
- a requirement can only fit by weakening the technical contract or reducing verification strength;
- requirement ownership, wave, or depends_on must be repeatedly moved to make the plan set work;
- a nested batch/sub-batch structure appears.

File counts are sizing signals, not independent hard stops. If a task is expected to touch more than five files or an execution plan more than eight files, plan-set review must check whether strict writing-plans can still be preserved.

## Splitting Principle

Use interface-first foundation plus vertical runtime slices.

- A minimal shared interface, DTO, or contract foundation is allowed.
- Each following execution plan should prove an observable runtime behavior or contract truth.
- Do not split by pure technical layer when that produces plans that only create files.
- File existence, symbol existence, and test-name existence are not behavior evidence.

## Plan-set Review Gate

Before execution, review the execution index and current expanded execution plan for:

1. requirement IDs fully cover the technical contract;
2. each requirement maps to a plan, task, test, and evidence;
3. each executable plan has 2-3 tasks;
4. each task has concrete files, action, verify, done, tests, expected FAIL/PASS, and commit steps;
5. out-of-scope boundaries are preserved;
6. weak phrases are absent;
7. the structure stays within the maximum depth;
8. formal subplan split review is not required.

## Current-truth files

For a large subplan, runtime entry and status truth live only in:

1. the phase plan index;
2. the subplan execution index.

Historical landing plans and experience notes may point to those files, but they are not current execution entry points.
''', encoding='utf-8')
print(f'Wrote protocol document: {path}')
PY
````

预期输出：

```text
Wrote protocol document: docs/superpowers/protocols/large-subplan-planning-protocol.md
```

- [x] **步骤 3：运行 protocol 内容检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS large subplan protocol document is present
```

证明：该检查证明本地 protocol 已独立成文，并包含最大深度、strict writing-plans、plan card 非执行入口、formal split review 和 current-truth 规则。

- [x] **步骤 4：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add docs/superpowers/protocols/large-subplan-planning-protocol.md
git commit -m "$(cat <<'EOF'
docs: add large subplan planning protocol

Document the local large-subplan workflow so technical contracts can stay coherent while execution plans remain strict and bounded.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：把 Phase 5A 文件改为 Technical Contract

**文件：**
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`

- [x] **步骤 1：编写失败的 5A contract 角色检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md')
text = path.read_text(encoding='utf-8')
errors = []
required = [
    '# Unity Agent Kit Phase 5A Host Runtime Technical Contract',
    '本文件不是 executable implementation plan',
    '不得直接交给 `subagent-driven-development` 或 `executing-plans` 执行',
    '## Contract Requirement Index',
    '5A-RESULT-01',
    '5A-REBIND-03',
    '5A-EVIDENCE-04',
]
for item in required:
    if item not in text:
        errors.append(f'missing required contract marker: {item}')
for forbidden in [
    '# Unity Agent Kit Phase 5A Host Runtime 实现计划',
    '面向 AI 代理的工作者',
    '- [ ] **步骤',
    '/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md',
]:
    if forbidden in text:
        errors.append(f'forbidden executable-plan marker remains: {forbidden}')
if errors:
    print('FAIL Phase 5A file is still executable-plan shaped:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS Phase 5A file is technical-contract shaped')
PY
```

预期：FAIL，至少输出旧标题、worker block、checkbox steps 或 missing Contract Requirement Index。

证明：该检查证明当前 5A 文件仍会误导执行者把 technical contract 当作 executable plan。

- [x] **步骤 2：转换 5A 文件标题、执行警告、Requirement Index 和 checkbox 语义**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
import re
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md')
text = path.read_text(encoding='utf-8')
text = text.replace('# Unity Agent Kit Phase 5A Host Runtime 实现计划', '# Unity Agent Kit Phase 5A Host Runtime Technical Contract')
text = text.replace(
    '> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。',
    '> **执行边界：** 本文件不是 executable implementation plan，不得直接交给 `subagent-driven-development` 或 `executing-plans` 执行。执行入口是 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`。'
)
text = text.replace('**目标：** 实现 Unity Agent Kit 的 Host Runtime foundation：', '**目标：** 定义 Unity Agent Kit 的 Host Runtime foundation 技术合同：')
text = text.replace('**拆分检查：** 已检查；本计划保持 Phase 5A 单一 subplan，不拆 5A，不新增 5A1/5A2。5A 只覆盖 Host Runtime foundation，不实现 5B-5E。', '**拆分检查：** 已检查；本 technical contract 保持 Phase 5A 单一 formal subplan。实际执行由 execution plan set 管理，最多 8 个 active sibling execution plans；如果第 9 个 plan 或 strict writing-plans 无法保持，则触发 formal subplan split review。')
text = text.replace('**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`', '**Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`\n**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`')

requirement_index = '''## Contract Requirement Index

| ID | Requirement | Source section | Covered by execution plan | Evidence |
|---|---|---|---|---|
| 5A-RESULT-01 | Public result foundation defines `succeeded`, `failed`, `uncertain`, `cancelled`, `timeout`, `lost`, and `rejected` status semantics. | `Operation / Result / Envelope Contract` | 5A-01 candidate | TS unit evidence |
| 5A-RESULT-02 | Diagnostics preserve source, severity, code, message, details, attribution, and failure metadata. | `Operation / Result / Envelope Contract` | 5A-01 candidate | TS + Unity DTO evidence |
| 5A-MCP-01 | MCP tool result mapping keeps full public result in `structuredContent`, summary-only `content`, and `isError = status !== succeeded`. | `MCP Tool Result Mapping Foundation` | 5A-01 candidate | TS mapping evidence |
| 5A-DTO-01 | Unity DTOs define host record, probe response, operation request, operation response, diagnostics, and thread check result minimum fields. | `任务 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity DTO round-trip evidence |
| 5A-DTO-02 | `/operations` response is top-level `UnityAgentKitOperationResponse`; nested v2 data envelope compatibility is not adopted. | `Operation / Result / Envelope Contract` | 5A-05 candidate | Unity operation envelope evidence |
| 5A-REG-01 | `projectRoot` is derived from `Application.dataPath`, not `Environment.CurrentDirectory`. | `任务 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity registry evidence |
| 5A-REG-02 | Host continuity identity uses `hostId + hostEpoch`; restart/reload creates a new host identity and increments epoch. | `任务 2：创建 Unity DTOs 和 registry foundation` | 5A-02 candidate | Unity registry + restart evidence |
| 5A-REG-03 | TS registry reader performs strict validation and stable failure classification for missing, invalid JSON, invalid shape, invalid port, disappearance after seen, and unexpected fs errors. | `任务 5：实现 TS registry/probe/invoke/rebind client` | 5A-07 candidate | TS registry evidence |
| 5A-HTTP-01 | Canonical `GET /probe` uses `http://127.0.0.1:{port}/probe` and validates active host fields. | `任务 3：实现 loopback HTTP /probe、dynamic registry 和 host lifecycle` | 5A-04 candidate | Unity probe + TS probe evidence |
| 5A-HTTP-02 | Canonical `POST /operations` returns structured operation envelopes and structured 404/405/400 transport failures. | `任务 4：实现 main-thread dispatch、/operations 和 HTTP protocol contract` | 5A-05 candidate | Unity HTTP protocol evidence |
| 5A-HTTP-03 | HTTP responses set JSON content type, UTF-8 body/framing, and close readable response streams. | `任务 3` / `任务 4` HTTP protocol sections | 5A-04 and 5A-05 candidates | Unity HTTP evidence |
| 5A-LIFE-01 | Host does not start during compiling/updating and retries on update tick after those states end. | `任务 3：实现 loopback HTTP /probe、dynamic registry 和 host lifecycle` | 5A-03 candidate | Unity lifecycle evidence |
| 5A-LIFE-02 | Reload, quitting, and Stop clean up listener, record, update/drain callback, and pending work; old listener no longer responds. | `任务 3` lifecycle and `任务 4` dispatch cleanup sections | 5A-03 candidate | Unity cleanup evidence |
| 5A-OPS-01 | Operation normalization handles trim, missing/empty operation, unknown operation, malformed JSON, and stable status/code table. | `Operation / Result / Envelope Contract` | 5A-05 candidate | Unity router evidence |
| 5A-OPS-02 | Minimal operations include `host.echo` and `host.threadCheck`; no 5A public action business logic is implemented. | `任务 4：实现 main-thread dispatch、/operations 和 HTTP protocol contract` | 5A-05 and 5A-06 candidates | Unity operation evidence |
| 5A-DISPATCH-01 | `/operations` dispatches short work to the captured Unity main thread and proves `host.threadCheck` runs on that thread. | `任务 4` main-thread dispatch sections | 5A-06 candidate | Unity dispatch evidence |
| 5A-DISPATCH-02 | Dispatch exception and expired work produce structured diagnostics and expired queued work does not execute later. | `任务 4` exception and pending work sections | 5A-06 candidate | Unity dispatch failure evidence |
| 5A-TIMEOUT-01 | Host-level timeout uses a non-blocking pending dispatch hook and never blocks Unity main thread or HTTP handler. | `Timeout Contract 分层` | 5A-06 candidate | Unity timeout evidence |
| 5A-TIMEOUT-02 | Host-level timeout, transport/request timeout, and workflow timeout are separated; workflow timeout remains out of scope for 5A. | `Timeout Contract 分层` | 5A-06 and 5A-07 candidates | Unity + TS timeout evidence |
| 5A-REBIND-01 | TS active validation checks `hostId`, `hostEpoch`, `projectRoot`, `protocolVersion`, `port`, and `status` using registry plus probe. | `任务 5：实现 TS registry/probe/invoke/rebind client` | 5A-07 candidate | TS probe validation evidence |
| 5A-REBIND-02 | Pre-operation rebind is bounded and single-pass where allowed; infinite retry is forbidden. | `任务 5` rebind sections | 5A-07 candidate | TS rebind evidence |
| 5A-REBIND-03 | In-flight operations are not replayed to a new host, and post-response identity drift returns stale/lost instead of success. | `任务 5` rebind sections | 5A-07 candidate | TS stale/lost evidence |
| 5A-REBIND-04 | TS preserves the most specific diagnostic priority across not_ready, restarted, stale instance, registry disappearance, and transport failures. | `任务 5` diagnostic priority sections | 5A-07 candidate | TS diagnostic priority evidence |
| 5A-EVIDENCE-01 | Non-live TS evidence covers result mapping, registry validation, TS client simulations, timeout classification, and MCP payload preservation. | `Subplan Completion Evidence` | 5A-08 candidate | `node --experimental-strip-types --test tests/host-runtime.test.ts` |
| 5A-EVIDENCE-02 | Unity HostRuntimeTests cover DTO, registry, lifecycle, HTTP protocol, dispatch/timeout, and result envelope behavior. | `Subplan Completion Evidence` | 5A-08 candidate | Unity `HostRuntimeTests` command |
| 5A-EVIDENCE-03 | Live vertical smoke is driven by Unity `HostRuntimeVerticalSmokeTests`, which keeps the loopback host alive while Node probes and invokes it. | `Phase 5A 最小 vertical smoke path` | 5A-08 candidate | Unity vertical smoke command |
| 5A-EVIDENCE-04 | Phase 5A is completed only after all active sibling execution plans, final vertical smoke evidence, and plan index completion evidence pass. | `Subplan Completion Evidence` / `Roadmap Phase Upgrade Check` | 5A-08 candidate | Plan index completion evidence |

'''
if '## Contract Requirement Index' not in text:
    marker = '## 上游约束摘要\n'
    if marker not in text:
        raise SystemExit('missing upstream constraints marker for insertion')
    text = text.replace(marker, requirement_index + marker, 1)

text = re.sub(r'^## 任务 (\d+)：', r'## Contract Area \1：', text, flags=re.MULTILINE)
text = re.sub(r'^- \[ \] \*\*步骤 (\d+)：', r'- **Contract detail \1：', text, flags=re.MULTILINE)
text = text.replace('本 subplan 执行时计划创建或修改以下文件；不得创建 5A 范围外文档或更新 split landing、experience doc、roadmap、plan index（除任务 6 指定的后续执行收尾说明外）：', '本 technical contract 覆盖以下未来实现文件。实际创建或修改这些文件必须通过 expanded strict execution plan 执行；不得直接按本文件执行：')
text = text.replace('完成 5A 执行时，必须附上以下命令和证据：', '完成 5A technical contract 对应的所有 active execution plans 时，必须附上以下命令和证据：')
path.write_text(text, encoding='utf-8')
print(f'Converted Phase 5A host runtime document to technical contract: {path}')
PY
````

预期输出：

```text
Converted Phase 5A host runtime document to technical contract: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
```

- [x] **步骤 3：运行 5A contract 角色检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5A file is technical-contract shaped
```

证明：该检查证明 5A 文件不再保留 executable plan 入口语义，并且具备 requirement ID traceability。

- [x] **步骤 4：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md
git commit -m "$(cat <<'EOF'
docs: convert phase 5a host runtime to technical contract

Make the Phase 5A host runtime document a contract source of truth instead of an executable plan, and add requirement IDs for execution-plan traceability.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：创建 Phase 5A execution index

**文件：**
- 创建：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`

- [x] **步骤 1：编写失败的 execution index 检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md')
required = [
    '# Unity Agent Kit Phase 5A Execution Plan Set Index',
    'This file is not an executable plan',
    '| 5A-01 | TS result + MCP mapping foundation |',
    '| 5A-08 | Vertical smoke + completion evidence |',
    'Plan card is not executable',
    'Current Next Manual Action',
    'formal subplan split review',
]
if not path.exists():
    print('FAIL Phase 5A execution index missing')
    raise SystemExit(1)
text = path.read_text(encoding='utf-8')
missing = [item for item in required if item not in text]
if missing:
    print('FAIL Phase 5A execution index missing required content:')
    for item in missing:
        print('-', item)
    raise SystemExit(1)
print('PASS Phase 5A execution index is present')
PY
```

预期：FAIL，输出：

```text
FAIL Phase 5A execution index missing
```

证明：该检查证明 5A 还没有 execution plan set current-truth 入口。

- [x] **步骤 2：写入 execution index**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md')
path.write_text('''# Unity Agent Kit Phase 5A Execution Plan Set Index

> **用途：** This file is not an executable plan. It is the current-truth index for Phase 5A sibling execution plans. Only expanded strict `superpowers:writing-plans` execution plans may be passed to `subagent-driven-development` or `executing-plans`.

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Protocol:** `docs/superpowers/protocols/large-subplan-planning-protocol.md`
**Design Spec:** `docs/superpowers/specs/2026-05-19-large-subplan-planning-protocol-design.md`

---

## Rules

- Plan card is not executable.
- Candidate cards are a coverage map; active execution plans must stay within the 8-plan hard limit.
- Expanded plans must preserve strict `superpowers:writing-plans`: concrete failing tests, expected FAIL, minimal implementation, expected PASS, verification commands, and commit steps.
- If a ninth sibling plan is needed, or any active plan cannot remain strict writing-plans, stop and run formal subplan split review.
- Phase 5A cannot be marked completed until all active execution plans and final vertical smoke evidence pass.

## Candidate Plan Cards

| Plan | Scope | Requirement IDs | Wave | Depends on | Expanded Plan | Status |
|---|---|---|---|---|---|---|
| 5A-01 | TS result + MCP mapping foundation | 5A-RESULT-01, 5A-RESULT-02, 5A-MCP-01 | 1 | none | pending | candidate |
| 5A-02 | Unity DTO + registry contract | 5A-DTO-01, 5A-REG-01, 5A-REG-02 | 1 | none | pending | candidate |
| 5A-03 | Host bootstrap + lifecycle cleanup | 5A-LIFE-01, 5A-LIFE-02, 5A-REG-02 | 2 | 5A-02 | pending | candidate |
| 5A-04 | GET /probe HTTP contract | 5A-HTTP-01, 5A-HTTP-03, 5A-REG-02 | 2 | 5A-02, 5A-03 | pending | candidate |
| 5A-05 | POST /operations envelope + router | 5A-DTO-02, 5A-HTTP-02, 5A-HTTP-03, 5A-OPS-01, 5A-OPS-02 | 3 | 5A-01, 5A-02, 5A-04 | pending | candidate |
| 5A-06 | Main-thread dispatch + host-level timeout | 5A-DISPATCH-01, 5A-DISPATCH-02, 5A-TIMEOUT-01, 5A-TIMEOUT-02 | 4 | 5A-05 | pending | candidate |
| 5A-07 | TS registry/probe/invoke/rebind classification | 5A-REG-03, 5A-REBIND-01, 5A-REBIND-02, 5A-REBIND-03, 5A-REBIND-04, 5A-TIMEOUT-02 | 5 | 5A-04, 5A-05, 5A-06 | pending | candidate |
| 5A-08 | Vertical smoke + completion evidence | 5A-EVIDENCE-01, 5A-EVIDENCE-02, 5A-EVIDENCE-03, 5A-EVIDENCE-04 | 6 | 5A-01, 5A-02, 5A-03, 5A-04, 5A-05, 5A-06, 5A-07 | pending | candidate |

## Current Next Manual Action

Write and review the first expanded strict execution plan before any Phase 5A code implementation:

```text
/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```

After the expanded plan passes review, execute that expanded plan, not this index and not the technical contract.

## Completion Rule

Phase 5A completed only after:

1. Every active sibling execution plan is completed with evidence.
2. `HostRuntimeTests` evidence is recorded.
3. `HostRuntimeVerticalSmokeTests` drives the live Node smoke test and passes.
4. Phase 5 plan index records completion evidence.
5. Roadmap Phase 5 remains incomplete until 5B-5E and final daily loop E2E also pass.
''', encoding='utf-8')
print(f'Wrote Phase 5A execution index: {path}')
PY
````

预期输出：

```text
Wrote Phase 5A execution index: docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```

- [x] **步骤 3：运行 execution index 检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS Phase 5A execution index is present
```

证明：该检查证明 5A 的 current execution entry 已创建，且 candidate cards 不能被误执行。

- [x] **步骤 4：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
git commit -m "$(cat <<'EOF'
docs: add phase 5a execution plan set index

Create the Phase 5A execution index so host runtime implementation starts from bounded sibling plans instead of the technical contract.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 4：修正 Phase 5 plan index 和 roadmap 执行入口

**文件：**
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`

- [x] **步骤 1：编写失败的 current-truth 入口检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
index = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md').read_text(encoding='utf-8')
roadmap = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md').read_text(encoding='utf-8')
errors = []
required_index = [
    '| Subplan | Scope | Contract | Execution Index | Status | Execution Status | Completion Evidence | Upgrade Check |',
    '`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`',
    '`contract-ready`',
    'Technical contract is not executable',
]
for item in required_index:
    if item not in index:
        errors.append(f'plan index missing: {item}')
required_roadmap = [
    'Phase 5A Host Runtime technical contract 已通过审查；下一步是创建和审查 Phase 5A execution plan set。',
    '/superpowers:writing-plans Create strict execution plan for Phase 5A-01',
]
for item in required_roadmap:
    if item not in roadmap:
        errors.append(f'roadmap missing: {item}')
for source_name, text in [('plan index', index), ('roadmap', roadmap)]:
    forbidden = '/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md'
    if forbidden in text:
        errors.append(f'{source_name} still directly executes Phase 5A technical contract')
if errors:
    print('FAIL current-truth execution entry is unsafe:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS current-truth execution entry is safe')
PY
```

预期：FAIL，输出 plan index 或 roadmap 仍直接执行 `phase-5a-host-runtime.md`。

证明：该检查证明当前运行时入口仍然会误导执行者跳过 execution index。

- [x] **步骤 2：重写 Phase 5 plan index 为 contract / execution index 表结构**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md')
path.write_text('''# Unity Agent Kit Phase 5 Plan Index

> **用途：** 本文件不是 implementation plan。它是 Phase 5 的 subplan 索引和执行状态入口。执行时必须进入具体 execution index 或 expanded execution plan。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
**Split Design:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
**Large Subplan Protocol:** `docs/superpowers/protocols/large-subplan-planning-protocol.md`
**Deprecated Old Plan:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md`

---

## Scope

This index keeps Phase 5 as a single roadmap phase while splitting execution into 5A-5E subplans. It does not create formal roadmap phases and must not be executed as an implementation plan.

## Subplans

| Subplan | Scope | Contract | Execution Index | Status | Execution Status | Completion Evidence | Upgrade Check |
|---|---|---|---|---|---|---|---|
| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | contract-ready | plan-cards-pending | pending | stays subplan |
| Phase 5B | Artifact / Resource / Timeout / Completion 基础设施 | pending | pending | pending | pending | pending | stays subplan |
| Phase 5C | Core Diagnostics Workflows | pending | pending | pending | pending | pending | stays subplan |
| Phase 5D | Test / PlayMode / Screenshot Workflows | pending | pending | pending | pending | pending | stays subplan |
| Phase 5E | MCP / `/unity` Skill / E2E / Completion Evidence | pending | pending | pending | pending | pending | stays subplan |

## Status Rules

- `pending`：subplan contract 尚未编写。
- `contract-ready`：subplan technical contract 已创建并审查通过，但不是 executable plan。
- `execution-planned`：execution index 和当前 expanded execution plan 已通过 plan-set review，可执行。
- `in-progress`：execution plan set 正在执行。
- `completed`：subplan 已完成并有 evidence。
- `blocked`：subplan 有阻塞项。
- `deprecated`：旧计划或被替代计划。

Execution status values:

- `pending`：尚未创建 execution index。
- `plan-cards-pending`：execution index 已计划或待创建，expanded execution plans 尚未就绪。
- `plan-ready`：当前 expanded execution plan 已通过 review。
- `in-progress`：execution plans 正在执行。
- `completed`：所有 active sibling execution plans 已完成。

Technical contract is not executable. Do not pass `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` to `subagent-driven-development` or `executing-plans`.

## Subplan Planning Workflow

1. Technical contract 审查通过后，subplan status 可为 `contract-ready`。
2. 创建 execution index，记录 candidate plan cards、requirement IDs、wave、depends_on 和 current next action。
3. 当前 wave 的 plan card 展开为 strict `superpowers:writing-plans` execution plan。
4. Execution plan 通过 plan-set review 后，execution status 可为 `plan-ready`。
5. 只执行 expanded execution plan，不执行 technical contract 或 execution index。
6. 所有 active execution plans 和 subplan evidence 通过后，subplan status 才能为 `completed`。
7. Roadmap Phase 5 只有 5A-5E 全部 completed 且 final daily loop E2E 通过后才能 completed。

## Deprecated Plans

| Plan | Status | Replacement |
|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md` | deprecated | This plan index plus Phase 5A-5E contracts and execution indexes |

## Completion Rule

Phase 5 completed only after all subplans + final E2E evidence pass.

Roadmap Phase 5 must not be marked `completed` from this index alone. Completion requires:

1. Phase 5A Host Runtime completed with evidence from all active sibling execution plans.
2. Phase 5B Artifact / Resource / Timeout / Completion completed with evidence.
3. Phase 5C Core Diagnostics Workflows completed with evidence.
4. Phase 5D Test / PlayMode / Screenshot Workflows completed with evidence.
5. Phase 5E MCP / `/unity` Skill / E2E completed with final daily loop evidence.
6. Roadmap completion evidence covers the original Phase 5 success criteria.

## Roadmap Phase Upgrade Check

Current decision: 5A-5E remain Phase 5 subplans and are not formal roadmap phases.

If a subplan gains an independent roadmap goal, cross-phase dependency, standalone blocker/current-state needs, can independently unlock Phase 6/7/8, or exceeds the Large Subplan Protocol hard stop, stop and use roadmap structural change before continuing that subplan.

## Next Manual Action

Create and review the Phase 5A execution index and the first expanded strict execution plan. Start from:

```text
/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```
''', encoding='utf-8')
print(f'Updated Phase 5 plan index: {path}')
PY
````

预期输出：

```text
Updated Phase 5 plan index: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md
```

- [x] **步骤 3：修正 roadmap Current State 和 Next Manual Action**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md')
text = path.read_text(encoding='utf-8')
old_state = '- 当前阶段：Phase 5 split design、plan index 和 5A Host Runtime plan 已创建并审查通过，等待执行 5A plan。'
new_state = '- 当前阶段：Phase 5 split design、plan index 和 5A Host Runtime technical contract 已创建并审查通过；下一步是创建和审查 Phase 5A execution plan set。'
old_action = '- **Next Manual Action:** `/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`'
new_action = '- **Next Manual Action:** `/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`'
if old_state not in text:
    raise SystemExit('roadmap current state old string not found')
if old_action not in text:
    raise SystemExit('roadmap next manual action old string not found')
text = text.replace(old_state, new_state, 1)
text = text.replace(old_action, new_action, 1)
text = text.replace('| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | implement-plan |', '| Phase 5 — 高频日常闭环基础设施 | planned | 实现 editor/compile/console/test/playmode/screenshot 的核心闭环，并创建最小 actual `/unity` skill | `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md` | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` | pending | prepare-5a-execution-plan |', 1)
path.write_text(text, encoding='utf-8')
print(f'Updated roadmap Phase 5 execution entry: {path}')
PY
````

预期输出：

```text
Updated roadmap Phase 5 execution entry: docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
```

- [x] **步骤 4：运行 current-truth 入口检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS current-truth execution entry is safe
```

证明：该检查证明 plan index 和 roadmap 不再指向 technical contract 作为 executable plan。

- [x] **步骤 5：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: route phase 5a through execution index

Separate Phase 5A technical contract status from executable execution-plan status so implementation starts from reviewed sibling plans.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 5：更新 split landing 历史记录和 workflow experience

**文件：**
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md`
- 修改：`docs/superpowers/phase-5-subplan-planning-workflow-experience.md`

- [x] **步骤 1：编写失败的历史/经验同步检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
landing = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md').read_text(encoding='utf-8')
experience = Path('docs/superpowers/phase-5-subplan-planning-workflow-experience.md').read_text(encoding='utf-8')
errors = []
required_landing = [
    'Phase 5A technical contract 与 execution plan set 指针',
    'Split landing 不再维护完整 Phase 5A execution plan set 模板',
    'docs/superpowers/protocols/large-subplan-planning-protocol.md',
    'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
]
for item in required_landing:
    if item not in landing:
        errors.append(f'split landing missing: {item}')
for forbidden in [
    "content = '''# Unity Agent Kit Phase 5A Host Runtime",
    'Wrote Phase 5A plan:',
]:
    if forbidden in landing:
        errors.append(f'split landing still embeds Phase 5A template marker: {forbidden}')
required_experience = [
    '## Large Subplan Planning Protocol 新增经验',
    '不再使用 subplan -> batchplan -> sub-batchplan 嵌套',
    'strict writing-plans 不降级',
    '最多 8 个 active sibling execution plans',
]
for item in required_experience:
    if item not in experience:
        errors.append(f'experience missing: {item}')
if errors:
    print('FAIL historical docs do not reflect large subplan protocol:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS historical docs reflect large subplan protocol')
PY
```

预期：FAIL，输出 split landing 仍内嵌 5A template 或 experience doc 缺少新经验。

证明：该检查证明历史文档仍可能误导执行者，以为 split landing 继续维护完整模板或旧入口。

- [x] **步骤 2：替换 split landing 的 5A 内嵌模板任务为历史指针**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md')
text = path.read_text(encoding='utf-8')
start = '## 任务 3：创建 Phase 5A Host Runtime implementation plan\n'
end = '## 任务 4：同步 roadmap Phase 5 planned 状态\n'
if start not in text:
    raise SystemExit('split landing task 3 start marker not found')
if end not in text:
    raise SystemExit('split landing task 4 marker not found')
replacement = '''## 任务 3：记录 Phase 5A technical contract 与 execution plan set 指针

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

'''
head, rest = text.split(start, 1)
_, tail = rest.split(end, 1)
text = head + replacement + end + tail
text = text.replace('创建 Phase 5A Host Runtime implementation plan，并把 roadmap Phase 5 同步到可执行 5A 的 planned 状态', '创建 Phase 5A Host Runtime 初始文档；当前该文档已重新定位为 technical contract，执行入口迁移到 5A execution index')
text = text.replace('5A implementation plan 具备 Host Runtime 最小 vertical smoke path', '5A technical contract 具备 Host Runtime 最小 vertical smoke path')
text = text.replace('roadmap Phase 5 进入 `planned` 且下一步指向执行 5A', 'roadmap Phase 5 保持 `planned`，下一步指向准备 5A strict execution plan')
path.write_text(text, encoding='utf-8')
print(f'Updated split landing historical pointers: {path}')
PY
````

预期输出：

```text
Updated split landing historical pointers: docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md
```

- [x] **步骤 3：追加 workflow experience 新经验**

运行：

````bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
path = Path('docs/superpowers/phase-5-subplan-planning-workflow-experience.md')
text = path.read_text(encoding='utf-8')
section = '''
## Large Subplan Planning Protocol 新增经验

Phase 5A 暴露出第二类 subplan 体验问题：技术合同可以通过 `reviewing-specs`，但仍不等于 strict `superpowers:writing-plans` executable plan。

本次确认的本地规则：

1. 大 subplan 不再使用 `subplan -> batchplan -> sub-batchplan` 嵌套。
2. 最大结构固定为 `Roadmap Phase -> Subplan Technical Contract -> Execution Plan Set Index -> Sibling Execution Plans -> Tasks`。
3. `strict writing-plans 不降级`：不能为了缩短计划省略具体失败测试、预期 FAIL、最小实现、预期 PASS、验证命令或 commit。
4. Phase 5A 暂保持单一 formal subplan，因为 Host Runtime identity、DTO、envelope、timeout 和 rebind 共享同一 technical contract。
5. Phase 5A execution plan set 最多 8 个 active sibling execution plans；如果需要第 9 个，或任一 active plan 无法保持 strict writing-plans，则触发 formal subplan split review。
6. Phase 5 plan index 与 5A execution index 是 current-truth；split landing 和 experience doc 只记录历史和经验。
7. 参考 `get-shit-done` 的 sibling plan、wave、context budget 和 plan checker 思路，但不采用 GSD-style 降低 plan 细节密度。

本规则先作为项目本地 protocol 落地。只有等 5A 至少跑通 technical contract -> execution index -> expanded execution plan -> evidence 的真实接力后，才考虑迁移到通用 superpowers skill。
'''
if '## Large Subplan Planning Protocol 新增经验' not in text:
    text = text.rstrip() + '\n' + section + '\n'
path.write_text(text, encoding='utf-8')
print(f'Updated workflow experience: {path}')
PY
````

预期输出：

```text
Updated workflow experience: docs/superpowers/phase-5-subplan-planning-workflow-experience.md
```

- [x] **步骤 4：运行历史/经验同步检查并确认通过**

运行步骤 1 的 Python 命令。

预期输出：

```text
PASS historical docs reflect large subplan protocol
```

证明：该检查证明 split landing 不再携带完整 5A execution 模板，experience doc 记录了反无限拆分和 strict writing-plans 不降级规则。

- [x] **步骤 5：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md docs/superpowers/phase-5-subplan-planning-workflow-experience.md
git commit -m "$(cat <<'EOF'
docs: record large subplan planning handoff

Update historical Phase 5 split notes so they point at the protocol and execution index instead of preserving a stale executable 5A template.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 6：最终验证 Large Subplan Protocol 落地状态

**文件：**
- 验证：`docs/superpowers/protocols/large-subplan-planning-protocol.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
- 验证：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 验证：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 验证：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md`
- 验证：`docs/superpowers/phase-5-subplan-planning-workflow-experience.md`

- [ ] **步骤 1：运行最终集成检查**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
files = {
    'protocol': Path('docs/superpowers/protocols/large-subplan-planning-protocol.md'),
    'contract': Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md'),
    'execution_index': Path('docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md'),
    'phase_index': Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md'),
    'roadmap': Path('docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md'),
    'split_landing': Path('docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md'),
    'experience': Path('docs/superpowers/phase-5-subplan-planning-workflow-experience.md'),
}
texts = {}
errors = []
for name, path in files.items():
    if not path.exists():
        errors.append(f'{name} missing: {path}')
    else:
        texts[name] = path.read_text(encoding='utf-8')
checks = {
    'protocol': [
        'Strict writing-plans preservation rule',
        'Plan card is not executable',
        'formal subplan split review',
    ],
    'contract': [
        '# Unity Agent Kit Phase 5A Host Runtime Technical Contract',
        '## Contract Requirement Index',
        '5A-TIMEOUT-01',
        '5A-REBIND-03',
        '本文件不是 executable implementation plan',
    ],
    'execution_index': [
        '# Unity Agent Kit Phase 5A Execution Plan Set Index',
        '| 5A-01 | TS result + MCP mapping foundation |',
        '| 5A-08 | Vertical smoke + completion evidence |',
        'Plan card is not executable',
    ],
    'phase_index': [
        '| Subplan | Scope | Contract | Execution Index | Status | Execution Status | Completion Evidence | Upgrade Check |',
        'contract-ready',
        'Technical contract is not executable',
        'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
    ],
    'roadmap': [
        'Phase 5A Host Runtime technical contract 已通过审查；下一步是创建和审查 Phase 5A execution plan set。',
        'prepare-5a-execution-plan',
    ],
    'split_landing': [
        'Phase 5A technical contract 与 execution plan set 指针',
        'Split landing 不再维护完整 Phase 5A execution plan set 模板',
    ],
    'experience': [
        '## Large Subplan Planning Protocol 新增经验',
        'strict writing-plans 不降级',
        '最多 8 个 active sibling execution plans',
    ],
}
for name, required in checks.items():
    text = texts.get(name, '')
    for item in required:
        if item not in text:
            errors.append(f'{name} missing required content: {item}')
for name in ['phase_index', 'roadmap']:
    text = texts.get(name, '')
    forbidden = '/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md'
    if forbidden in text:
        errors.append(f'{name} still directly executes technical contract')
if 'content = \'\'\'# Unity Agent Kit Phase 5A Host Runtime' in texts.get('split_landing', ''):
    errors.append('split_landing still embeds old Phase 5A template content marker')
if '- [ ] **步骤' in texts.get('contract', ''):
    errors.append('contract still has unchecked executable plan steps')
if errors:
    print('FAIL large subplan protocol landing incomplete:')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASS large subplan protocol landing complete')
PY
```

预期输出：

```text
PASS large subplan protocol landing complete
```

证明：该检查证明 protocol、technical contract、execution index、phase index、roadmap、split landing 和 experience doc 的 current-truth 入口一致，不再把 technical contract 当 executable plan。

- [ ] **步骤 2：运行 markdown diff 检查**

运行：

```bash
git diff --check -- \
  docs/superpowers/protocols/large-subplan-planning-protocol.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md \
  docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md \
  docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md \
  docs/superpowers/phase-5-subplan-planning-workflow-experience.md
```

预期：命令 exit 0，无 whitespace error 输出。

证明：该检查证明文档 diff 没有尾随空格或冲突标记等基础格式问题。

- [ ] **步骤 3：运行计划自检脚本**

运行：

```bash
PYTHONIOENCODING=utf-8 python - <<'PY'
from pathlib import Path
plan = Path('docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-contract-execution-plan-set.md')
text = plan.read_text(encoding='utf-8')
required = [
    '## 上游约束摘要',
    '## 参考输入映射',
    '## 文件结构',
    '任务 1：创建 Large Subplan Planning Protocol 文档',
    '任务 2：把 Phase 5A 文件改为 Technical Contract',
    '任务 3：创建 Phase 5A execution index',
    '任务 4：修正 Phase 5 plan index 和 roadmap 执行入口',
    '任务 5：更新 split landing 历史记录和 workflow experience',
    '任务 6：最终验证 Large Subplan Protocol 落地状态',
    'PASS large subplan protocol landing complete',
]
missing = [item for item in required if item not in text]
forbidden = ['TO' + 'DO', '待' + '定', '补充' + '细节', '适当' + '处理', '类似' + '任务', '为上述代码' + '编写测试']
violations = [item for item in forbidden if item in text]
if missing or violations:
    if missing:
        print('FAIL plan missing required content:')
        for item in missing:
            print('-', item)
    if violations:
        print('FAIL plan contains forbidden red-flag text:')
        for item in violations:
            print('-', item)
    raise SystemExit(1)
print('PASS implementation plan self-check')
PY
```

预期输出：

```text
PASS implementation plan self-check
```

证明：该检查证明本 implementation plan 包含必需章节、六个落地任务和最终验证，不含已知占位表达。

- [ ] **步骤 4：Commit**

仅在用户明确授权 commit 时运行：

```bash
git add \
  docs/superpowers/protocols/large-subplan-planning-protocol.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md \
  docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md \
  docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md \
  docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-split-landing.md \
  docs/superpowers/phase-5-subplan-planning-workflow-experience.md \
  docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-contract-execution-plan-set.md
git commit -m "$(cat <<'EOF'
docs: add phase 5a contract execution planning flow

Route Phase 5A through a technical contract and bounded execution plan set so strict writing plans stay executable without splitting the formal subplan prematurely.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```
