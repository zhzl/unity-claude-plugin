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
| 5A-05 | POST /operations envelope + router | 5A-DTO-02, 5A-HTTP-02, 5A-HTTP-03, 5A-OPS-01, 5A-OPS-02 | 3 | 5A-01, 5A-02, 5A-03 | `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-05-operations-envelope-router.md` | completed |
| 5A-06 | Main-thread dispatch + host-level timeout | 5A-DISPATCH-01, 5A-DISPATCH-02, 5A-OPS-02, 5A-TIMEOUT-01, 5A-TIMEOUT-02 | 4 | 5A-05 | `docs/superpowers/plans/2026-05-20-unity-agent-kit-phase-5a-06-main-thread-dispatch-timeout.md` | completed |
| 5A-07 | TS registry/probe/invoke/rebind classification | 5A-REG-03, 5A-REBIND-01, 5A-REBIND-02, 5A-REBIND-03, 5A-REBIND-04, 5A-TIMEOUT-02 | 5 | 5A-03, 5A-05, 5A-06 | `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-07-ts-host-client-rebind.md` | completed |
| 5A-08 | Vertical smoke + completion evidence | 5A-EVIDENCE-01, 5A-EVIDENCE-02, 5A-EVIDENCE-03, 5A-EVIDENCE-04 | 6 | 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07 | `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md` | completed |

## Current Next Manual Action

Phase 5A-08 Vertical smoke + completion evidence 已完成。Evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` passed with `tests 60`, `pass 60`, `fail 0`; covers result mapping, registry validation, TS client simulations, timeout classification, MCP payload preservation, and 5A-08 scope guard.
2. Canonical handoff command string: `"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests`; local Unity 2022.3.61f1 evidence used the same command without `-quit` because `-quit` exits before Test Runner in this environment, and passed with `total="78"`, `passed="78"`, `failed="0"`; covers DTO, registry, lifecycle cleanup, HTTP protocol, main-thread dispatch, non-blocking pending dispatch hook, host-level timeout, stop/reload pending failure, and result envelope behavior.
3. Canonical handoff command string: `"${UNITY_EDITOR}" -batchmode -quit -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests`; local Unity 2022.3.61f1 evidence used the same command without `-quit` because `-quit` exits before Test Runner in this environment, and passed with `total="1"`, `passed="1"`, `failed="0"`; `HostRuntimeVerticalSmokeTests` starts the live Unity host, runs `phase5a-vertical-smoke.test.ts`, proves `host.threadCheck` runs on the captured Unity main thread, maps the envelope to public result and MCP payload, then stops the host and verifies cleanup.

Phase 5A completed because 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03; all active sibling execution plans and final vertical smoke evidence passed. Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.

Next action: create/review the Phase 5B Artifact / Resource / Timeout / Completion subplan artifacts before implementing Phase 5B.

Do not execute this index or the technical contract.

## Completion Rule

Phase 5A completed only after:

1. Every active sibling execution plan is completed with evidence.
2. `HostRuntimeTests` evidence is recorded.
3. `HostRuntimeVerticalSmokeTests` drives the live Node smoke test and passes.
4. Phase 5 plan index records completion evidence.
5. Roadmap Phase 5 remains incomplete until 5B-5E and final daily loop E2E also pass.

## Phase 5A Completion Evidence

## Phase 5A Host Runtime Hardening Evidence

Phase 5A remains completed. Phase 5A Host Runtime hardening after completion and before Phase 5B covers:

- TS envelope trust boundary: operation, requestId, hostId, and hostEpoch must match the request and active host record before a Unity operation envelope is trusted.
- dispatch timeout claim race: main-thread dispatch work is atomically claimed before execution so timeout cannot also complete it.
- body read bounds: `/operations` request bodies are bounded by 64 KiB and a 2 second production deadline.
- optional result field preservation: existing public-result optional fields are opaque pass-through only, with no Phase 5B resource/job schema.
- documentation cleanup: folded 5A-04 wording is explicit.

Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.

Phase 5A-08 Vertical smoke + completion evidence 已完成 and closes the Phase 5A Host Runtime foundation. Evidence groups covered:

- registry: minimum `UnityAgentKitHostRecord`, project root from `Application.dataPath`, existing epoch increment, new hostId on restart/reload, strict TS registry validation, and registry failure classification.
- lifecycle: compiling/updating skip start, update tick retry, beforeAssemblyReload stop, Editor quitting stop, Start stops old listener, Stop closes listener, deterministic wake, listener-loop-exited signal, cleanup of pending work, old listener no longer responds.
- HTTP protocol: canonical `GET /probe`, canonical `POST /operations`, structured 404/405/400 envelopes, JSON content type/framing, 127.0.0.1 URL helpers, request context preservation.
- dispatch/timeout: `host.threadCheck`, captured Unity main thread, dispatch exception diagnostics, non-blocking pending dispatch hook, host-level timeout with may-still-be-running, stop/reload pending failure not timeout.
- TS client: ready/not_ready, invalid registry/probe shapes, stable diagnostic codes, bounded pre-operation rebind, in-flight no replay, post-response stale/lost, old hostId / hostEpoch continuity is invalidated, lost or rebind decision.
- result/envelope: DTO JSON round-trip, operation normalization, status/code table, failure metadata preservation, invalid envelope mapping, unknown status fail-closed.
- vertical smoke: Unity writes registry → TS reads registry → TS probes `/probe` → TS invokes real `/operations` → Unity dispatches to captured Unity main thread via `host.threadCheck` → TS maps envelope/public result and MCP payload.
- MCP payload mapping foundation: `structuredContent` preserves full public result; `content` is summary only; `isError` follows `status !== "succeeded"`.
