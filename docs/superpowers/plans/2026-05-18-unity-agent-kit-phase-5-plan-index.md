# Unity Agent Kit Phase 5 Plan Index

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
| Phase 5A | Host Runtime 基础设施 | `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | completed | completed | completed: 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03; post-completion Host Runtime hardening evidence recorded before Phase 5B | stays subplan |
| Phase 5B | Artifact / Resource / Timeout / Completion 基础设施 | `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion-design.md` | `docs/superpowers/plans/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion.md` | completed | completed | completed: TS artifact/resource contract tests, timeout/completion tests, existing host-runtime tests, Unity `HostRuntimeArtifactTests`, Unity `HostRuntimeTests`, scope boundary check, and `git diff --check` passed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending | stays subplan |
| Phase 5C | Core Diagnostics Workflows | `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md` | `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md` | contract-ready | plan-cards-pending | 5C-01 completed; 5C-02, 5C-03, and 5C-04 not completed; Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending | stays subplan |
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
- `plan-cards-pending`：execution index 已存在，expanded execution plans 尚未就绪。
- `plan-ready`：当前 expanded execution plan 已通过 review。
- `in-progress`：execution plans 正在执行。
- `completed`：所有 active sibling execution plans 已完成。

Technical contract is not executable. Do not pass `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` to `subagent-driven-development` or `executing-plans`.

## Subplan Planning Workflow

1. Technical contract 审查通过后，subplan status 可为 `contract-ready`。
2. 创建 execution index，记录 candidate plan cards、requirement IDs、wave、depends_on 和 current next action。
3. 当前 wave 的 plan card 展开为 strict `superpowers:writing-plans` execution plan。
4. Execution index 和当前 expanded execution plan 通过 plan-set review 后，subplan `Status` 更新为 `execution-planned`，`Execution Status` 更新为 `plan-ready`。
5. 只执行 expanded execution plan，不执行 technical contract 或 execution index。
6. 所有 active execution plans 和 subplan evidence 通过后，subplan status 才能为 `completed`。
7. Roadmap Phase 5 只有 5A-5E 全部 completed 且 final daily loop E2E 通过后才能 completed。

## Deprecated Plans

| Plan | Status | Replacement |
|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-deprecated.md` | deprecated | This plan index plus Phase 5A-5E contracts and execution indexes |

## Completion Rule

Phase 5 completed only after all subplans + final E2E evidence pass.

## Phase 5A Completion Evidence

Phase 5A completed after 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03; final evidence passed. Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending.

## Phase 5A Host Runtime Hardening Evidence

Phase 5A remains completed. Phase 5A Host Runtime hardening was applied after completion and before Phase 5B to close review-found runtime gaps without implementing Phase 5B. Evidence covers TS envelope trust boundary, Unity dispatch timeout claim race, `/operations` body read bounds, optional result field preservation, and documentation cleanup.

Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending.

Canonical handoff commands:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

Local Unity 2022.3.61f1 evidence used the same Unity commands without `-quit` because `-quit` exits before Test Runner in this environment.

Evidence summary:

- `HostRuntimeTests` passed and covers DTO, registry, lifecycle cleanup, HTTP protocol, main-thread dispatch, non-blocking pending dispatch hook, host-level timeout, stop/reload pending failure, and result envelope behavior.
- `HostRuntimeVerticalSmokeTests` passed and runs `phase5a-vertical-smoke.test.ts` against the live Unity host.
- `host.threadCheck` ran on the captured Unity main thread.
- TS mapped the Unity envelope to public result and MCP payload.
- TS evidence proves old hostId / hostEpoch continuity is invalidated and returns lost or rebind decision rather than trusting stale success.

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

5C-01 Editor status/readiness completed with evidence. Phase 5C remains incomplete because 5C-02, 5C-03, and 5C-04 are not completed. Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending.

Next action: create/review the 5C-02 expanded execution plan. Do not mark Roadmap Phase 5 completed from 5C-01 or Phase 5B evidence alone.
