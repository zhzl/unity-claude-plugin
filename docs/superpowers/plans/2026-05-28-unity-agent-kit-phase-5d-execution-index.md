# Unity Agent Kit Phase 5D Execution Plan Set Index

> **用途：** This file is not an executable plan. It is the current-truth index for Phase 5D sibling execution plans. Only expanded strict `superpowers:writing-plans` execution plans may be passed to `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5D
**Contract:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md`
**Parent Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

---

## Rules

- Plan card rows are coverage and sequencing records, not executable implementation plans.
- Expanded plans must preserve strict `superpowers:writing-plans`: concrete failing tests, expected FAIL, minimal implementation, expected PASS, verification commands, and commit steps.
- Phase 5D stays a Phase 5 subplan. Do not promote it to a roadmap phase unless a plan card gains an independent roadmap goal, standalone blocker/current-state need, or cannot fit inside the plan-card set.
- Phase 5D must not create public MCP tool registration, MCP Resource handlers, `/unity` skill files, Phase 5E final daily loop E2E, or Phase 6/7/8 domain workflows.
- Every card must preserve the TS / Unity C# ownership boundary: TS owns workflow orchestration, polling, timeout, rebind classification, Resource URI assembly/readback, and final status judgment; Unity C# owns short main-thread Unity API operations, state snapshots, job/report/artifact records, and metadata/payload writes.
- Unity C# must not block the Unity main thread with long `Thread.Sleep`, busy-wait inside HTTP handlers, call `Task.Wait` on the Unity main thread, or move complex workflow orchestration into the host.
- `mode: all` in `unity_test.*` returns `status: rejected` with an unsupported-selector diagnostic reason such as `unsupported_selector_mode`; `unsupported` is not a public result status.
- Screenshot work must start with a capture-method feasibility check or adapter seam before workflow/resource evidence is accepted.

## Split Check

The approved Phase 5D design baseline has four cards: Test, PlayMode, Screenshot, and combined evidence sync. During plan writing, `5D-01` was split into `5D-01a` and `5D-01b` because Test workflow implementation has two independently verifiable software units:

1. Test selector/job/report foundations and Resource-backed `get_result`.
2. Aggregate `run_and_collect` / `run_and_verify` workflow orchestration and live EditMode evidence.

This split stays within the approved Phase 5D scope and does not create a new roadmap phase or subplan.

## Candidate Plan Cards

| Plan | Scope | Requirement IDs | Wave | Depends on | Expanded Plan | Status |
|---|---|---|---|---|---|---|
| 5D-01a | Test selector, TestRunner bridge foundation, job/report readback, `list` / `start` / `get_status` / `get_result` internal workflows | 5D-TEST-SELECTOR-01, 5D-TEST-LIST-01, 5D-TEST-JOB-01, 5D-TEST-RESULT-01, 5D-RESOURCE-TEST-01, 5D-HOST-01, 5D-SCOPE-01 | 1 | Phase 5A, Phase 5B, Phase 5C | `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-01a-test-runner-foundation.md` | completed |
| 5D-01b | `run_and_collect` / `run_and_verify`, test workflow timeout/continuity, failed-report vs verified-pass split, live EditMode evidence | 5D-TEST-COLLECT-01, 5D-TEST-VERIFY-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | 5D-01a | `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-01b-test-aggregate-workflows.md` | completed |
| 5D-02 | PlayMode state snapshot, no-op evidence, enter/exit verify workflows, transition timeout/continuity | 5D-PLAYMODE-STATE-01, 5D-PLAYMODE-ENTER-01, 5D-PLAYMODE-EXIT-01, 5D-TIMEOUT-01, 5D-HOST-01, 5D-SCOPE-01 | 2 | Phase 5A, Phase 5B, Phase 5C | `docs/superpowers/plans/2026-05-29-unity-agent-kit-phase-5d-02-playmode-workflows.md` | completed |
| 5D-03 | Screenshot capture-method feasibility, Game View producer, screenshot artifact metadata, Resource readback, TS PNG header/dimension validation | 5D-SCREENSHOT-FEASIBILITY-01, 5D-SCREENSHOT-CAPTURE-01, 5D-SCREENSHOT-RESOURCE-01, 5D-SCREENSHOT-PNG-01, 5D-HOST-01, 5D-SCOPE-01 | 3 | Phase 5A, Phase 5B, Phase 5C | pending | pending |
| 5D-04 | Combined scope guard, Phase 5D evidence sync, parent Phase 5 plan index update | 5D-EVIDENCE-01, 5D-SCOPE-01, 5D-INDEX-SYNC-01 | 4 | 5D-01a, 5D-01b, 5D-02, 5D-03 | pending | pending |

## Requirement Coverage

| Requirement ID | Requirement | Covered by |
|---|---|---|
| 5D-TEST-SELECTOR-01 | Test selector supports single-mode `editmode` / `playmode`; `mode: all` returns `status: rejected` with unsupported-selector diagnostics and is not silently treated as a partial run. | 5D-01a |
| 5D-TEST-LIST-01 | `unity_test.list` uses real TestRunner discovery snapshot and does not imply tests are runnable or passing. | 5D-01a |
| 5D-TEST-JOB-01 | `unity_test.start` starts a real TestRunner-backed job record and returns request/job evidence only; it does not imply completion or pass. | 5D-01a |
| 5D-TEST-RESULT-01 | `unity_test.get_status` and `unity_test.get_result` read job lifecycle/report evidence without treating report readback as verified pass. | 5D-01a |
| 5D-RESOURCE-TEST-01 | Test report success requires Phase 5B-compatible metadata, non-empty payload, `unity://test-reports/{reportId}` Resource readback, and minimal report summary parse. | 5D-01a |
| 5D-TEST-COLLECT-01 | `unity_test.run_and_collect` waits for terminal job state and readable report, but can succeed for failed tests with `verifiedTestPass: false`. | 5D-01b |
| 5D-TEST-VERIFY-01 | `unity_test.run_and_verify` succeeds only when report collection succeeds and `failed == 0` and `errors == 0`. | 5D-01b |
| 5D-PLAYMODE-STATE-01 | `unity_playmode.get_state` returns a real EditMode/PlayMode/transition snapshot without mutation. | 5D-02 |
| 5D-PLAYMODE-ENTER-01 | `unity_playmode.enter_and_verify` requests enter only when needed and succeeds only with stable PlayMode/no-op evidence. | 5D-02 |
| 5D-PLAYMODE-EXIT-01 | `unity_playmode.exit_and_verify` requests exit only when needed and succeeds only with stable EditMode/no-op evidence. | 5D-02 |
| 5D-SCREENSHOT-FEASIBILITY-01 | Screenshot card starts with an acceptable Game View capture-method feasibility check or adapter seam and rejects the forbidden ReadScreenPixel + EncodeToPNG + File.WriteAllBytes path. | 5D-03 |
| 5D-SCREENSHOT-CAPTURE-01 | `unity_screenshot.capture_game_view` captures only current Game View into controlled artifact root metadata/payload. | 5D-03 |
| 5D-SCREENSHOT-RESOURCE-01 | Screenshot success requires `unity://screenshots/{artifactId}` Resource readback. | 5D-03 |
| 5D-SCREENSHOT-PNG-01 | TS validates PNG signature/header and positive width/height after Resource readback. | 5D-03 |
| 5D-TIMEOUT-01 | Test, PlayMode, and Screenshot workflows use bounded timeout/polling with nextStep, may-still-be-running, and safe retry semantics. | 5D-01b, 5D-02, 5D-03 |
| 5D-HOST-01 | Host rebind/continuity rules invalidate in-flight proof unless final evidence can be independently re-established. | 5D-01a, 5D-01b, 5D-02, 5D-03 |
| 5D-SCOPE-01 | Phase 5D creates internal workflows and Unity short operations only; public MCP tools, MCP Resource handlers, `/unity`, Phase 5E E2E, and Phase 6/7/8 remain out of scope. | All 5D cards |
| 5D-EVIDENCE-01 | Combined evidence records TS tests, Unity tests, Resource readback, PlayMode/screenshot evidence, scope guard, HostRuntime regression, and `git diff --check`. | 5D-04 |
| 5D-INDEX-SYNC-01 | Parent Phase 5 plan index records Phase 5D completion only after all active 5D cards complete; Roadmap Phase 5 remains incomplete until Phase 5E and final daily loop E2E. | 5D-04 |

## Current Next Manual Action

Review the next pending Phase 5D card and prepare expanded plan work for `5D-03`. Do not execute this index or re-execute completed `5D-01a` / `5D-01b` / `5D-02`; proceed to the next pending card only after its expanded plan is ready and approved.

## Completion Rule

Phase 5D completes only after:

1. Every active 5D expanded execution plan is completed with evidence.
2. TS Test, PlayMode, and Screenshot workflow tests pass.
3. Unity tests for TestRunner, PlayMode, Screenshot, and HostRuntime regression pass where applicable.
4. Test report and screenshot Resource readback evidence passes.
5. Screenshot PNG header/dimension validation evidence passes.
6. Scope boundary checks prove no public MCP tools, no MCP Resource handlers, no `/unity` skill, no final daily loop E2E, and no Phase 6/7/8 domain files were added by Phase 5D.
7. `git -c core.autocrlf=false diff --check` passes.
8. Phase 5A remains completed.
9. Phase 5B remains completed.
10. Phase 5C remains completed.
11. Phase 5 remains incomplete because Phase 5E and final daily loop E2E are not completed by Phase 5D.

## Phase 5D-01a Completion Evidence

5D-01a is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

- Focused TS verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `pass 177` and `fail 0`.
- Unity `TestWorkflowTests` passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-test-runner-foundation.xml` with `<test-run ... result="Passed" total="25" passed="25" failed="0" ...>`.
- Unity `HostRuntimeTests` passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-01a-host-runtime-regression.xml` with `<test-run ... result="Passed" total="82" passed="82" failed="0" ...>`.
- Scope guard passed: `PASS Phase 5D-01a scope guard`.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.
- TS coverage for 5D-01a includes test report Resource readback, payload summary parse/mismatch, metadata identity/job/size consistency, and host continuity/projectRoot mismatch guards.
- Unity `TestWorkflowTests` coverage for 5D-01a includes the real TestRunner adapter seam/foundation, requestId preservation, callback-driven job/report store behavior, artifact metadata/payload write, EditMode-only unsupported selector rejection, session-local discovery cache retry behavior, unknown assembly diagnostics, and exact class/method filtering.

## Phase 5D-01b Completion Evidence

5D-01b is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

- Focused TS verification already passed for the 5D-01b implementation via the coordinator-run suite with `tests 186`, `pass 186`, `fail 0`, `skipped 0`, and `todo 0`.
- Final self-check verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `tests 57`, `pass 57`, `fail 0`, `skipped 0`, and `todo 0`.
- Changed-file scope guard passed for the current 5D-01b implementation diff after constraining the check to the changed implementation/test files (`plugins/unity-agent-kit/src/workflows/test.ts`, `plugins/unity-agent-kit/tests/test-workflows.test.ts`) plus relevant untracked 5D-01b docs as documentation-only context.
- The original full-repo scope guard failure was caused by pre-existing screenshot markers in Unity artifact files outside the current 5D-01b diff, so those markers were not introduced by 5D-01b.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.

## Phase 5D-02 Completion Evidence

5D-02 is completed. This does not complete Phase 5D, and Phase 5 remains incomplete.

- Focused TS verification passed via `node --experimental-strip-types --test "plugins/unity-agent-kit/tests/editor-workflows.test.ts" "plugins/unity-agent-kit/tests/compile-workflows.test.ts" "plugins/unity-agent-kit/tests/console-workflows.test.ts" "plugins/unity-agent-kit/tests/test-workflows.test.ts" "plugins/unity-agent-kit/tests/playmode-workflows.test.ts" "plugins/unity-agent-kit/tests/host-runtime.test.ts" "plugins/unity-agent-kit/tests/artifact-resource-contract.test.ts" "plugins/unity-agent-kit/tests/timeout-completion-contract.test.ts"` with `tests 197`, `pass 197`, `fail 0`, `skipped 0`, and `todo 0`.
- Unity PlayMode focused verification passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-playmode-workflows.xml` with `result="Passed" total="6" passed="6" failed="0" inconclusive="0" skipped="0"`.
- Unity HostRuntime regression passed in `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5d-02-host-runtime-regression.xml` with `result="Passed" total="82" passed="82" failed="0" inconclusive="0" skipped="0"`.
- TS coverage for 5D-02 includes PlayMode state parser/mapping, `getPlayModeState`, `enterPlayModeAndVerify` no-op, `exitPlayModeAndVerify` no-op, request + poll to stable PlayMode, transition timeout continuation with `unity_playmode.get_state` nextStep, host continuity loss guard, and timeout boundary regressions for post-request, post-sleep, and no-op paths.
- Unity coverage for 5D-02 includes PlayMode DTO roundtrip, main-thread dispatch requirement, state read no-mutation adapter evidence, enter no-op, enter request, and exit request short-operation evidence.
- Corrected scope guard passed: `PASS Phase 5D-02 changed-file scope guard`; the guard scans 5D-02 implementation/test files and Unity `.meta` files while excluding Phase 5D planning docs that intentionally contain 5D-03 screenshot markers.
- Whitespace check passed: `git -c core.autocrlf=false diff --check` produced no output.

## Parent Plan Index Sync Rule

The parent Phase 5 plan index may link this contract and execution index while Phase 5D is in `execution-planned` / `plan-ready` state. It may move Phase 5D to `completed` only after this index records combined evidence from all active 5D cards. Parent Roadmap Phase 5 must remain incomplete because Phase 5E and final daily loop E2E are not completed by Phase 5D.
