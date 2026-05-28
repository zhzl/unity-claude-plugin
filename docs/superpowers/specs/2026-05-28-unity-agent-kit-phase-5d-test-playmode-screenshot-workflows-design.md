# Unity Agent Kit Phase 5D Test / PlayMode / Screenshot Workflows Design

## Metadata

- **Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- **Phase:** Phase 5 — 高频日常闭环基础设施
- **Subplan:** Phase 5D — Test / PlayMode / Screenshot Workflows
- **Spec Path:** `docs/superpowers/specs/2026-05-28-unity-agent-kit-phase-5d-test-playmode-screenshot-workflows-design.md`
- **Parent Phase 5 Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- **Status:** design-approved-for-written-review
- **Date:** 2026-05-28

## Goal

Phase 5D implements the internal workflow contract for Unity Agent Kit's heavier daily-loop workflows:

```text
Test Runner jobs
PlayMode transitions
Game View screenshot artifacts
```

Phase 5D builds on completed Phase 5A runtime, Phase 5B artifact/resource/timeout/completion rules, and Phase 5C editor/compile/console diagnostics. It does not repeat Phase 5C work and does not complete parent Phase 5.

## Confirmed Decisions

1. **Phase 5D structure**
   - Phase 5D follows the Phase 5C pattern: a technical contract/spec, an execution index, and expanded strict execution plan cards.
   - The design baseline uses four plan cards: Test, PlayMode, Screenshot, and combined evidence/scope sync.

2. **Test selector `mode: all`**
   - The selector schema keeps `mode: all` visible as a reserved value.
   - Phase 5D returns `status: rejected` for `mode: all`.
   - Unsupported selector mode is expressed as a diagnostic code/reason such as `unsupported_selector_mode`; no new public status is introduced.
   - Phase 5D stable support is limited to single-mode `editmode` and `playmode` test runs.
   - Phase 5D does not implement EditMode + PlayMode aggregation.

3. **PlayMode public surface**
   - Phase 5D stable public surface is limited to `unity_playmode.get_state`, `unity_playmode.enter_and_verify`, and `unity_playmode.exit_and_verify`.
   - `enter`, `exit`, and `wait_for_state` may exist only as internal operations or TS helpers.
   - Helper actions do not become Phase 5D stable public actions and must not enter Phase 5E `/unity` executable recipes.

4. **Screenshot validation authority**
   - Unity C# producer records screenshot metadata and basic validation evidence.
   - TS performs Resource readback and validates PNG signature/header and positive dimensions.
   - Final screenshot success is based on TS-side artifact verification after Resource readback.

## Scope

### Stable Phase 5D Actions

```text
unity_test.list
unity_test.start
unity_test.get_status
unity_test.get_result
unity_test.run_and_collect
unity_test.run_and_verify

unity_playmode.get_state
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify

unity_screenshot.capture_game_view
```

### Plan Card Baseline

| Plan card | Scope | Notes |
|---|---|---|
| `5D-01` | Test workflow operations / reports / Resource readback | May split into `5D-01a` / `5D-01b` during `writing-plans` if the card becomes too large. |
| `5D-02` | PlayMode enter / exit / verify workflows | Keeps helper actions internal only. |
| `5D-03` | Screenshot capture / artifact validation / Resource readback | Starts with capture-method feasibility check or adapter seam; requires TS PNG header/dimension validation. |
| `5D-04` | Combined scope guard / Phase 5D evidence sync | Syncs only Phase 5D evidence; parent Phase 5 remains incomplete. |

## Out of Scope

Phase 5D does not implement:

- Public MCP tool registration.
- MCP Resource handler wiring.
- Actual `/unity` skill files or recipe enablement.
- Final daily loop E2E.
- Parent Roadmap Phase 5 completion.
- Full Test Runner advanced parameter surface.
- `mode: all` test aggregation.
- Scene View or EditorWindow screenshot capture.
- Screenshot visual acceptance or gameplay correctness judgment.
- Full artifact retention or cleanup subsystem.
- Object/component/material creation flows.
- Project command registry enhancement.
- Phase 6, Phase 7, or Phase 8 domain work.

## Upstream Constraint Summary

Phase 5D must preserve the following roadmap constraints:

- TS owns orchestration, polling, timeout, host rebind, diagnostics convergence, Resource URI assembly, Resource readback validation, and final success/failure judgment.
- Unity C# owns only short Unity API main-thread actions, state snapshots, job/report/artifact basics, and metadata/payload records.
- Public MCP tools and internal operations remain separated.
- Action completion semantics match the user-expected final result, not the lower-level Unity API return.
- Artifacts and reports use MCP Resources.
- Console diagnostics are supplemental for Test, PlayMode, and Screenshot workflows; they do not replace the primary success signal.
- Unity C# must not perform long waits, busy-poll inside HTTP handlers, block the Unity main thread with `Task.Wait`, or move complex workflow orchestration into the host.

Phase 5D consumes:

- Phase 5A host runtime, registry, operation envelope, dispatch, and rebind/lost semantics.
- Phase 5B artifact metadata, Resource readback, timeout, and completion helpers.
- Phase 5C editor status, compile diagnostics, console snapshot/count/clear, and console diagnostic cursor.

Phase 5D delivers to Phase 5E:

- Internal TS workflow functions and Unity operations for the ten stable Phase 5D actions.
- Stable action semantics and evidence suitable for public MCP registration.
- Test report and screenshot artifact Resource readback proof.
- Scope/evidence records proving Phase 5D is complete while parent Phase 5 remains incomplete.

## Architecture

Phase 5D continues the internal-first architecture used by Phase 5C.

```text
Claude / later MCP public tool
→ TS action schema and workflow facade
→ TS host binding / rebind-aware invocation
→ Unity C# short operation on main thread
→ Unity snapshot / job / artifact record
→ TS polling, timeout, Resource readback, diagnostics convergence
→ TS final public-result-shaped judgment
```

### TS Ownership

TS owns:

```text
schema and selector validation
workflow orchestration
polling and timeout
host rebind / lost / uncertain classification
Resource URI assembly
Resource readback validation
console cursor diagnostics convergence
final succeeded / failed / uncertain / timeout / lost / rejected judgment
```

### Unity C# Ownership

Unity C# owns:

```text
Unity TestRunner discovery / start / status / result short operations
PlayMode state snapshot and request-enter / request-exit short operations
Game View screenshot capture producer action
test report and screenshot artifact metadata / payload basics
Unity API access on the Unity main thread
```

### Forbidden Behavior

Phase 5D must not:

- Return a fixed pass test report.
- Use an in-memory fake test job as completion evidence.
- Use Console-clean state as test, PlayMode, or screenshot success proof.
- Treat request accepted as final workflow success.
- Trust screenshot output immediately after request without bounded completion and Resource readback.
- Add public MCP registration, MCP Resource handlers, `/unity`, or final daily loop E2E files.

## Host Rebind and Continuity

Host continuity is part of the success proof for Test, PlayMode, and Screenshot workflows.

Rules:

- Running test jobs cannot be assumed recoverable after host rebirth.
- A readable test report or screenshot artifact may be recovered only when metadata and Resource readback independently prove final evidence.
- PlayMode transitions return `lost` or `uncertain` if host continuity breaks and final target state cannot be re-established safely.
- Screenshot capture returns `uncertain` or `lost` if producer evidence and Resource proof cannot be tied to the requested operation.
- No workflow may report `succeeded` from stale host evidence.

## Test Workflow Contract

### Selector Model

Minimum selector:

```text
mode: editmode | playmode | all
assembly?
className?
methodName?
```

Phase 5D behavior:

- `editmode` and `playmode` are supported as single-mode runs.
- `all` is reserved but unsupported in Phase 5D and returns `status: rejected` with an unsupported-selector diagnostic code/reason such as `unsupported_selector_mode`.
- `unsupported` is not a public result status in Phase 5D.
- Arbitrary Test Runner flags, free-form parameters, and unbounded selector bags are not allowed.

### Action Semantics

| Action | Primary semantics | Success means | Success does not mean |
|---|---|---|---|
| `unity_test.list` | Read snapshot | Real TestRunner discovery returned a validated list/snapshot. | Tests are runnable or passing. |
| `unity_test.start` | Request accepted + job-backed | A real test job record exists and start was accepted or deterministically failed into a job result. | Tests completed or passed. |
| `unity_test.get_status` | Job status snapshot | Job lifecycle state was read and validated. | Report was collected or tests passed. |
| `unity_test.get_result` | Report readback | Terminal report metadata/payload exists, Resource readback works, and minimal summary parses. | Tests passed. |
| `unity_test.run_and_collect` | Job settled + report collected | Test job reached terminal state and readable/parseable `test_report` exists. | Tests passed. |
| `unity_test.run_and_verify` | Job settled + verified | Report was collected and `failed == 0` and `errors == 0`. | Skipped/inconclusive are absent unless explicitly required later. |

`skipped` and `inconclusive` are reported but do not fail Phase 5D `run_and_verify` by default.

### Test Report Requirements

Test report evidence includes:

```text
jobId?
reportId?
uri: unity://test-reports/{reportId}
mode
selector summary
total
passed
failed
errors
skipped
inconclusive
verifiedTestPass
terminal job state
Resource readback status
```

`get_result`, `run_and_collect`, and `run_and_verify` must require:

1. Terminal job/report availability.
2. Valid report metadata.
3. Non-empty report payload.
4. `unity://test-reports/{reportId}` Resource readback success.
5. Minimal report summary parse.

A failed test report can still make `run_and_collect` succeed as report collection, but the result must include `verifiedTestPass: false` and failure/error counts. The same report makes `run_and_verify` return `failed`.

### Test Diagnostics

Console cursor diagnostics are supplemental:

- New Console logs during a test run may be returned for explanation.
- Console-clean state does not prove tests passed.
- Console errors do not replace Test Runner report counts as the primary pass/fail signal.

## PlayMode Workflow Contract

### Public Surface

Stable Phase 5D PlayMode actions:

```text
unity_playmode.get_state
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify
```

Internal-only helpers may include request-enter, request-exit, and wait-for-target-state operations, but they do not become stable public actions.

### Stable State Definition

A target PlayMode state is stable when:

```text
isPlaying matches target
isPlayingOrWillChangePlaymode matches target
isPlayModeChanging == false
isCompiling == false
isUpdating == false
active project / host evidence is valid
```

The first execution plan may choose one validated final snapshot or consecutive matching snapshots as the concrete proof rule. If consecutive snapshots are used, timeout budgets must account for the extra polling without hiding flakiness.

### Action Semantics

| Action | Primary semantics | Success means | Success does not mean |
|---|---|---|---|
| `unity_playmode.get_state` | Read snapshot | Current EditMode / PlayMode / transition state was read and validated. | Enter or exit succeeded. |
| `unity_playmode.enter_and_verify` | State settled + verified | Stable PlayMode was observed, or no-op evidence proves it was already stable PlayMode. | Gameplay correctness or tests passed. |
| `unity_playmode.exit_and_verify` | State settled + verified | Stable EditMode was observed, or no-op evidence proves it was already stable EditMode. | Scene persistence or save state. |

### PlayMode Evidence

PlayMode workflow evidence includes:

```text
initial state snapshot
request accepted or no-op evidence
final state snapshot
transition completed
poll / timeout summary
host continuity signal
supplemental console diagnostics when available
```

Timeout behavior:

- `nextStep` points to `unity_playmode.get_state`.
- `safeToRetry` is `true` only when no-op proof or duplicate-side-effect exclusion exists.
- Timeout does not prove that Unity failed to transition.

## Screenshot Workflow Contract

### Public Action

```text
unity_screenshot.capture_game_view
```

The action captures only the current Game View. It returns a verified screenshot artifact. It does not prove visual acceptance, UI correctness, or gameplay correctness.

### Input Safety

Allowed input:

```text
safe label / filename hint
```

Forbidden input:

```text
absolute path
relative directory
path separator
extension override
custom output root
format
compression
width / height
camera target
Scene View
EditorWindow
```

Generated `artifactId` and controlled artifact root are authoritative. User-provided labels are hints only.

### Producer and Validation Requirements

`5D-03` must begin with a capture-method feasibility check or adapter seam. The check must identify an acceptable current Game View capture method for Unity 2022.3.61f1 without using the forbidden `InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes` path. If no acceptable method is available in the target environment, record blocker or partial evidence and keep the screenshot card incomplete unless the user explicitly accepts a narrower evidence boundary.

Unity C# producer:

- Runs on the Unity main thread.
- Uses current Game View only.
- May borrow v2-style Game View discovery, focus, repaint, and target-size mechanisms.
- Writes PNG payload and metadata under the controlled artifact root.
- Records producer evidence including `artifactId`, URI, safe relative path, `sizeBytes`, dimensions, `validationStatus`, host identity, and diagnostics.
- Does not use `InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes` as the screenshot strategy.

TS workflow:

- Uses bounded completion/readback.
- Requires Phase 5B-compatible artifact metadata.
- Requires `unity://screenshots/{artifactId}` Resource readback success.
- Validates PNG signature/header.
- Validates positive width and height from PNG structure.
- Treats metadata-only validity as insufficient for final success.

### Screenshot Evidence

Screenshot success evidence includes:

```text
artifactId
uri: unity://screenshots/{artifactId}
safe relativePath
sizeBytes > 0
metadata validationStatus
png header valid
width > 0
height > 0
Resource readback status
```

If Game View is unavailable in batchmode or headless execution, the workflow must return a diagnostic failure, blocker, or partial evidence. It must not report success.

## Phase 1-4 Compliance Matrix

| Upstream Phase | Applicable constraint | Phase 5D compliance | Verification |
|---|---|---|---|
| Phase 1 | Single Unity C# host runtime; clear TS / Unity C# boundary. | Reuses Phase 5A host; Unity C# only performs short operations and records. | Scope guard plus Unity operation tests. |
| Phase 2 | `/unity` is thin routing and recipe guidance; implementation stays in tools/host. | 5D does not create or enable `/unity`; it delivers stable action evidence for 5E. | Scope guard confirms no skill files. |
| Phase 3 | Public action contract stable; bounded schemas; safety metadata accurate; no free-form params. | 5D fixes ten stable action semantics and bounded selector/screenshot inputs. | TS schema/contract tests in expanded plans. |
| Phase 4 | Async/job/artifact semantics reliable; no success without evidence; Resources verified. | Test jobs, PlayMode transitions, and screenshots require TS-owned final proof and Resource readback where applicable. | TS workflow tests and Resource readback tests. |

## unity-mcp-v2 Reference Mapping

| Capability domain | v2 reference input | Adopted mechanisms | Not adopted | Reason | Phase 5D landing |
|---|---|---|---|---|---|
| Test Runner | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/TestService.cs` | TestRunner discovery/start callbacks, deterministic selector resolution ideas, report collection patterns. | v2 public contract and any fixed/fake job semantics. | Unity Agent Kit has new public schema, Resource model, and result semantics. | `5D-01` Test workflow card. |
| PlayMode | v2 PlayMode transition/status mechanisms | Transition status, no-op evidence, state readback patterns. | Public helper actions `enter`, `exit`, `wait_for_state` as stable actions. | Phase 5 stable public scope exposes only verified actions. | `5D-02` PlayMode card. |
| Screenshot | v2 Game View discovery/focus/repaint/target-size mechanisms | Game View-oriented capture setup and producer-side practical Unity Editor handling. | `InternalEditorUtility.ReadScreenPixel + Texture2D.EncodeToPNG + File.WriteAllBytes`; v2 public output path contract. | Forbidden by revision brief and incompatible with Phase 5 artifact/resource semantics. | `5D-03` Screenshot card. |
| Artifact/resource | Phase 5B contracts plus v2 artifact lessons | Controlled roots, metadata, report/artifact readback discipline. | Full artifact store, retention, cleanup. | Out of scope for Phase 5D and Phase 5 first version. | `5D-01`, `5D-03`, `5D-04`. |

## Quality Gate

| Object | Approach summary | Confidence / 10 | Below 7 handling |
|---|---|---:|---|
| Test workflow contract | Real TestRunner API, single-mode selector support, report Resource proof, collect-vs-verify split. | 8 | If TestRunner API behavior diverges, split `5D-01` into adapter and TS orchestration cards before evidence. |
| PlayMode workflow contract | State snapshot plus request/no-op and TS polling to stable target state. | 8 | If transition smoke is flaky, narrow completion to deterministic operations plus explicit blocker for live smoke; do not mark card completed without accepted evidence. |
| Screenshot workflow contract | Game View producer plus Resource readback and TS PNG header/dimension validation. | 7 | If Game View capture is unavailable in batchmode/headless, record blocker/partial evidence and keep screenshot card incomplete. |
| Scope boundary | Internal-first, no MCP registration, no `/unity`, no final E2E. | 9 | Scope guard must fail the card if forbidden files/surfaces appear. |

## Acceptance Criteria

Phase 5D is complete only when all active plan cards have evidence and the combined evidence proves:

1. Test workflows use real Unity Test Runner API.
2. `run_and_collect` and `run_and_verify` have distinct semantics.
3. `mode: all` returns `status: rejected` with an unsupported-selector diagnostic reason and is not silently treated as a partial run.
4. PlayMode workflows use state snapshot and transition proof as the primary success criterion.
5. Console diagnostics remain supplemental for Test, PlayMode, and Screenshot workflows.
6. Screenshot returns a real PNG artifact with Resource readback and TS PNG header/dimension validation.
7. Timeout results include next steps, may-still-be-running semantics, and safe retry classification.
8. Host rebind/lost/uncertain semantics prevent stale in-flight evidence from becoming success.
9. Unity C# host remains limited to short main-thread operations and basic records.
10. Scope guard confirms Phase 5D did not add public MCP registration, MCP Resource handlers, `/unity`, Phase 5E final daily loop E2E, or Phase 6/7/8 domain work.
11. Parent Phase 5 plan index records Phase 5D evidence only after all 5D cards complete.
12. Roadmap Phase 5 remains incomplete until Phase 5E and final daily loop E2E complete.

## Verification Strategy

### TS Tests

Required TS coverage:

- Test selector validation and `mode: all` `status: rejected` plus unsupported-selector diagnostic reason.
- Test job status/result mapping.
- `run_and_collect` succeeds for readable failed reports while setting `verifiedTestPass: false`.
- `run_and_verify` fails for failed/errors counts.
- Test report Resource readback required before report collection success.
- PlayMode no-op success evidence.
- PlayMode transition timeout and `nextStep` behavior.
- PlayMode host rebind/lost or uncertain classification.
- Screenshot safe label validation.
- Screenshot Resource readback required before success.
- Screenshot invalid PNG, zero-byte file, invalid dimensions, unsafe path, and timeout failures.
- Scope guard for public MCP registration, MCP Resource handlers, `/unity`, Phase 5E E2E, and Phase 6/7/8 files.

### Unity Tests

Required Unity coverage:

- TestRunner adapter discovery and selector resolution.
- Test job lifecycle records and terminal report metadata.
- PlayMode state snapshot DTOs and request-enter/request-exit operations.
- Screenshot capture-method feasibility check or adapter seam.
- Screenshot producer seams for safe labels, controlled paths, metadata, validation failure, and Game View availability diagnostics.
- HostRuntime regression where appropriate.

### Live/Smoke Evidence

Phase 5D should include the smallest practical real Unity evidence:

- A safe real EditMode test run through the Test workflow.
- A PlayMode transition smoke if the environment supports it.
- A Game View screenshot smoke if the environment exposes Game View.

If Unity or Game View availability prevents a smoke from running, the affected card records a blocker or partial evidence and remains incomplete unless the user explicitly accepts the narrower evidence boundary.

## Subplan Completion Evidence

The Phase 5D execution index must record:

```text
TS test command and pass/fail summary
Unity test command and XML result summary
Test report Resource readback evidence
Screenshot Resource readback and PNG validation evidence
PlayMode transition/no-op evidence
Scope guard output
HostRuntime regression evidence where applicable
git diff --check output
Parent Phase 5 plan index sync evidence
```

Completion wording must state that Phase 5 remains incomplete because Phase 5E and final daily loop E2E remain pending.

## Roadmap Phase Upgrade Check

Phase 5D remains a Phase 5 subplan.

It does not require promotion to a formal roadmap phase because:

- It does not change the roadmap goal.
- It does not introduce a standalone roadmap deliverable outside Phase 5 daily-loop infrastructure.
- It does not independently unlock Phase 6, Phase 7, or Phase 8.
- It fits within the existing Phase 5A-5E split and can be represented by an execution index plus plan cards.

If any Phase 5D plan card grows into a standalone roadmap objective, stop and use roadmap structural change before continuing.

## Execution Plan Handoff

After this spec is reviewed, call `superpowers:writing-plans` to create the Phase 5D execution index and the first expanded strict execution plan.

The execution index should start from the four-card baseline:

```text
5D-01 Test workflow operations / reports / Resource readback
5D-02 PlayMode enter / exit / verify workflows
5D-03 Screenshot capture-method feasibility / artifact validation / Resource readback
5D-04 Combined scope guard / Phase 5D evidence sync
```

The first expanded plan should normally be `5D-01`, unless review identifies a prerequisite contract-only card. If `5D-01` is too large during plan writing, split it into smaller sibling cards before execution.
