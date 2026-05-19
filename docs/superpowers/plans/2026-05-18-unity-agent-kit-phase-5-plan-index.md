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

Review the Phase 5A execution index and create/review the first expanded strict execution plan. Start from:

```text
/superpowers:writing-plans Create strict execution plan for Phase 5A-01 TS result + MCP mapping foundation using docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md and docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
```
