# Unity Agent Kit Phase 5 Plan Index

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
