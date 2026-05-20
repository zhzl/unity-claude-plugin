# Unity Agent Kit Phase 5A Execution Plan Set Index

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
| 5A-01 | TS result + MCP mapping foundation | 5A-RESULT-01, 5A-RESULT-02, 5A-MCP-01 | 1 | none | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-01-ts-result-mcp-mapping.md` | completed |
| 5A-02 | Unity DTO + registry contract | 5A-DTO-01, 5A-REG-01, 5A-REG-02 | 1 | none | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-02-unity-dto-registry-contract.md` | completed |
| 5A-03 | Host bootstrap + lifecycle cleanup + GET /probe HTTP contract | 5A-LIFE-01, 5A-LIFE-02, 5A-REG-02, 5A-HTTP-01, 5A-HTTP-03 | 2 | 5A-02 | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-03-host-lifecycle-probe-contract.md` | completed |
| 5A-04 | Folded into 5A-03 | covered by 5A-03 | 2 | 5A-02 | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-03-host-lifecycle-probe-contract.md` | folded |
| 5A-05 | POST /operations envelope + router | 5A-DTO-02, 5A-HTTP-02, 5A-HTTP-03, 5A-OPS-01, 5A-OPS-02 | 3 | 5A-01, 5A-02, 5A-03 | pending | candidate |
| 5A-06 | Main-thread dispatch + host-level timeout | 5A-DISPATCH-01, 5A-DISPATCH-02, 5A-OPS-02, 5A-TIMEOUT-01, 5A-TIMEOUT-02 | 4 | 5A-05 | pending | candidate |
| 5A-07 | TS registry/probe/invoke/rebind classification | 5A-REG-03, 5A-REBIND-01, 5A-REBIND-02, 5A-REBIND-03, 5A-REBIND-04, 5A-TIMEOUT-02 | 5 | 5A-03, 5A-05, 5A-06 | pending | candidate |
| 5A-08 | Vertical smoke + completion evidence | 5A-EVIDENCE-01, 5A-EVIDENCE-02, 5A-EVIDENCE-03, 5A-EVIDENCE-04 | 6 | 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07 | pending | candidate |

## Current Next Manual Action

Phase 5A-03 Host bootstrap + lifecycle cleanup + GET /probe HTTP contract has completed implementation and final review. Evidence: `HostRuntimeTests` result XML `unity/Library/UnityAgentKit/Phase5A03HostLifecycleProbeResults.xml` shows `result="Passed"`, `total="33"`, `passed="33"`, `failed="0"`; final code review verdict was PASS; diff-scope guard found no newly introduced 5A-05+ forbidden symbols.

Next, create and review a strict expanded execution plan for 5A-05 POST `/operations` envelope + router, covering only `5A-DTO-02`, `5A-HTTP-02`, `5A-HTTP-03`, `5A-OPS-01`, and `5A-OPS-02`.

Do not execute this index or the technical contract.

## Completion Rule

Phase 5A completed only after:

1. Every active sibling execution plan is completed with evidence.
2. `HostRuntimeTests` evidence is recorded.
3. `HostRuntimeVerticalSmokeTests` drives the live Node smoke test and passes.
4. Phase 5 plan index records completion evidence.
5. Roadmap Phase 5 remains incomplete until 5B-5E and final daily loop E2E also pass.
