# Unity Agent Kit Phase 4 — Async / Job / Workflow / Artifact Semantics Design

## Metadata

- **Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- **Phase:** Phase 4 — Async / Job / Workflow / Artifact Semantics
- **Status:** design
- **Created:** 2026-05-17
- **Inputs:**
  - `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
  - `references/unity-mcp-v2`
  - Unity `CompilationPipeline` / Editor main-thread constraints

## Goal

Define the contract for asynchronous actions, job-backed actions, TS-owned workflows, Unity C# host evidence recording, diagnostics attribution, artifact/report lifecycle, MCP Resource references, host rebind semantics, and final public result status.

This phase does not create new public tools. It refines the semantic gaps left by Phase 3 and gives Phase 5 a precise contract for the P0 daily loop actions.

## Non-goals

- Do not implement MCP server, TS workflow code, Unity C# host code, or actual skill files.
- Do not implement a durable request queue.
- Do not make every waiting action job-backed.
- Do not move long workflow orchestration into the Unity C# host.
- Do not implement full artifact retention or cleanup.
- Do not lock Phase 6/7/8 candidate action models before their corresponding phase specs.
- Do not use Console current error count as the primary compile success/failure signal.

## Phase 3 Result Envelope Refinement

Phase 3 defined a minimum public result envelope with a coarse `status`. Phase 4 refines that field into the single authoritative public result enum:

```text
status: succeeded | failed | uncertain | cancelled | timeout | lost | rejected
```

No separate `outcome` field is introduced.

Status meanings:

| Status | Meaning |
|---|---|
| `succeeded` | The action's success evidence is complete. |
| `failed` | The action has clear failure evidence, such as compiler errors, failed tests, or verification readback mismatch. |
| `uncertain` | Evidence is incomplete; success and failure cannot be proven. |
| `cancelled` | The caller or user explicitly cancelled the workflow. |
| `timeout` | The TS workflow wait exceeded its timeout; this does not prove the underlying Unity operation failed. |
| `lost` | Host rebirth/rebind broke continuity for a running job, cursor, or state proof. |
| `rejected` | Schema, safety, confirmation, or target ambiguity rejected the request before execution. |

Phase 3's result envelope text must be updated to use this enum so Phase 3 and Phase 4 do not diverge.

### Timeout result signals

`status: timeout` means the TS workflow wait expired. It does not prove the Unity operation failed, rolled back, or stopped.

P0 workflow timeout results must include these minimum signals:

```text
mayStillBeRunning: true | false | unknown
jobId?
nextStatusAction?
safeToRetry: true | false | unknown
diagnostics
nextStep
```

Rules:

- If a `jobId` exists, `nextStep` should point to the corresponding status/result read action.
- For non-job workflows, `nextStep` should point to a relevant state read such as compile state, PlayMode state, or console snapshot.
- `safeToRetry` must not be `true` unless duplicate side effects are ruled out.
- Claude must not blindly retry after timeout.

### Timeout duration policy

Timeouts are not fixed long waits by default. The AI/TS workflow must choose timeout values from action type, task complexity, current Unity state, and user intent.

Rules:

- Lightweight reads and short workflows should use short timeouts.
- Compile and test workflows can use longer timeouts when project scale, prior state, or user instruction justifies it.
- Long waits must be justified by the task; do not default to arbitrary 3-minute or 5-minute waits.
- If a workflow needs a clearly long wait, the timeout should be explicit in tool parameters, recipe guidance, or user confirmation rather than hidden as a broad default.

## Ownership Contract

TS MCP layer owns workflow orchestration:

- Waiting and polling.
- Timeout and cancellation.
- Host rebind handling.
- Diagnostics convergence.
- Resource reference assembly.
- Final `status` judgment.

Unity C# host owns short Unity-side actions and evidence recording:

- Unity API calls on the main thread.
- Status snapshots.
- Request accepted signals.
- Job/report/artifact metadata records.
- Compiler message collection.
- Console cursor / log sequence recording.
- Basic artifact validation.

Forbidden host behavior:

- Long `Thread.Sleep` on the Unity main thread.
- Busy waits inside HTTP handlers.
- `Task.Wait` blocking the Unity main thread.
- Direct Unity API access from background threads.
- Unity C# host owning complex workflow orchestration.

## Evidence Model

Phase 4 distinguishes evidence shapes instead of treating every asynchronous-looking action as a job.

| Evidence | Purpose | Examples |
|---|---|---|
| `status_snapshot` | Read current observable state. | `unity_editor.get_status`, `unity_compile.get_state`, `unity_playmode.get_state` |
| `request_receipt` | Prove a request was accepted, not completed. | `unity_compile.request`, `unity_playmode.enter`, `unity_test.start` |
| `state_settlement` | Prove a state converged, not business success. | `unity_compile.wait_for_idle`, `unity_playmode.wait_for_state` |
| `job_lifecycle` | Track a long-running task that can be queried later. | `unity_test.start`, job-type project command invoke |
| `operation_report` | Audit one completed operation. | `compile_and_check`, `console.clear`, PlayMode transition verification |
| `artifact_record` | Identify a repeatable file or report result. | Screenshot PNG, test report, console snapshot |
| `diagnostic_cursor` | Attribute logs created after a known point. | Console cursor for PlayMode/test/screenshot/project command workflows |
| `workflow_result` | Represent a TS-orchestrated final judgment. | `run_and_verify`, `enter_and_verify`, `compile_and_check` |

Selection rules:

1. Read current state -> `status_snapshot`.
2. Accept a request -> `request_receipt`.
3. Wait for state convergence -> `state_settlement`.
4. Start a later-queryable long task -> `job_lifecycle`.
5. Leave auditable evidence for one operation -> `operation_report`.
6. Produce repeatable file/report content -> `artifact_record`.
7. Attribute new logs -> `diagnostic_cursor`.
8. Combine multiple steps in TS -> `workflow_result`.

## Host Rebind and Limited Recovery Contract

Phase 4 uses limited recovery after host rebirth/rebind:

- Artifact/report records that are already written and have readable metadata can be recovered after rebind.
- Running jobs do not require strong recovery across host rebirth.
- If a running job's continuity cannot be proven after host rebirth/rebind, the public result must be `lost` or `uncertain`; it must not be `succeeded`.
- This phase does not require a durable request queue.

Recovery rules:

| Situation | Public result rule |
|---|---|
| Metadata and file/report are readable inside artifact root | Recover the artifact/report reference. |
| Metadata exists but file/report is missing | Resource read fails with a file/report missing diagnostic. |
| File exists but metadata is missing | Treat as orphaned evidence; do not promote it to verified artifact. |
| Running job continuity is broken by host rebirth | Return `lost` for job-specific calls or `uncertain` for aggregate workflows. |
| Cursor continuity is broken by host rebirth | Log attribution depending on that cursor becomes `uncertain`. |

## Job Lifecycle Contract

Job lifecycle is reserved for actions that intentionally create a later-queryable long task. It is not the default for every action that waits.

`job.state` is separate from public result `status`:

```text
accepted
running
completed
failed
cancelled
timeout
lost
unknown
```

### Minimum job record signals

Job records must expose enough identity and continuity signals for Phase 5 status/result actions without becoming a durable request queue.

Minimum record shape:

```text
jobId
tool
action
originatingRequestId?
hostId
hostEpoch?
createdAt
updatedAt
state
stateReason?
reportId?
artifactIds?
lastKnownContinuity: current | recovered | lost | unknown
diagnostics?
```

Rules:

- `requestId` does not replace `jobId`.
- `reportId` and `artifactId` identify job output evidence, not the job itself.
- A job record is not a durable queued command and does not imply replay or strong recovery.
- After host rebind, if continuity cannot be proven, `lastKnownContinuity` becomes `lost` or `unknown`.
- Public job-specific calls map broken continuity to `status: lost`; aggregate workflows may use `status: uncertain` when the final state cannot be proven.

Examples:

- `unity_test.start` can return `status: succeeded` with `job.state: accepted` or `running` because starting the job succeeded.
- `unity_test.get_status` returns `status: succeeded` when the job status was read successfully, even if the job state is `running` or `failed`.
- `unity_test.run_and_verify` returns final public `status` based on report collection and pass/fail verification.
- `unknown` is a job lifecycle state, not a public result status.

## Compile Diagnostics Contract

`unity_compile.compile_and_check` is a strict compile verification workflow.

### Primary source

- Primary diagnostics source: `CompilationPipeline.assemblyCompilationFinished` `CompilerMessage[]`.
- Each callback's messages are trusted for that assembly completion event.
- A compile verification needs all relevant assembly messages for the verified compile window, or a valid recent compile report.

### Success and failure

- Only `CompilerMessage.type == Error` makes compile verification `status: failed`.
- Warnings do not fail compilation, but they must be returned in diagnostics.
- Ordinary logs do not participate in compile success/failure.
- Console diagnostics are supplemental and cannot replace compiler messages.
- Console having no error does not prove compilation succeeded.

### Complete compile window

When a new compile occurs, `compile_and_check` must prove:

- Diagnostics collection began before the verified compile window.
- All relevant `assemblyCompilationFinished` messages for the window were collected.
- `compilationFinished` and editor idle indicate the lifecycle ended.
- Host rebirth/domain reload did not destroy the evidence needed to prove completeness.

If the window is incomplete, the result is `status: uncertain`.

### No-new-compile path

If no new compile window occurs, `compile_and_check` may use the most recent complete compile report only when bounded validity proof exists.

Minimum validity rules:

- The report came from a complete compiler messages window.
- A trusted change token or compile report invalidation signal proves no script, asmdef, package, or project setting change that can affect compilation happened after the report.
- Unity is currently idle.
- Host rebind did not break report metadata trust.

Phase 5 does not need to implement full project-wide change tracking for this path. If no bounded validity proof is available, the result is `status: uncertain`.

This path still must not use Console-clean, editor-idle, or weak file timestamp heuristics as standalone success proof.

### Minimum result signals

```text
compileCycleId?
compilerMessagesAttributed: true | false
compilerErrorCount
compilerWarningCount
compilerMessagesSummary
usedRecentCompileReport: true | false
supplementalConsoleDiagnostics?
status
diagnostics
nextStep?
```

## Console Cursor and Diagnostics Contract

Console diagnostic cursor is a strict attribution mechanism for logs created after a known point. It is not the primary source for compile success.

### Cursor identity

Preferred cursor shape:

```text
cursor:
  hostId
  logSequence
  createdAt
```

`logSequence` is a Unity C# host-maintained monotonic sequence for logs captured after cursor creation. Phase 5 does not need to rebuild a total order for existing Console history or maintain a long-term log index. If a sequence cannot be implemented for new logs, an alternative cursor such as `timestamp + counter + hostId` must prove ordering. A loose timestamp window is not precise attribution.

### `sinceCursor`

- `sinceCursor` returns only logs after the cursor.
- Missing cursor, broken host continuity, or unreliable log ordering makes attribution `uncertain`.
- Old logs must not be attributed to the current operation.
- Boundary logs that cannot be attributed must be marked as uncertain diagnostics.

### Diagnostics shape

P0 public result diagnostics must use this minimum shared shape:

```text
source: compiler | console | workflow | host | artifact | job | validation
severity: info | warning | error
code?
message
details?
attribution: attributed | unattributed | uncertain
```

`details` may carry action-specific extensions. P0 actions must not replace this minimum shape with unrelated diagnostics structures.

Usage boundaries:

- `compile_and_check`: Console diagnostics are supplemental non-compiler diagnostics.
- PlayMode/test/project command/screenshot/UI workflows: cursor can identify new non-compiler errors during the operation.
- If cursor attribution is unreliable, workflows that depend on it must return `uncertain` or include explicit uncertain diagnostics.

## Artifact / Report / Resource Contract

### Storage boundary

All tool-generated artifacts and reports are written under a controlled project-scoped artifact root.

Phase 4 constraints for the root:

- It is controlled by the plugin, not arbitrary user input.
- It is path-normalized and protected from traversal.
- It does not confuse generated artifacts with Unity `Assets` source content.
- It is readable by the MCP Resource layer.
- It does not require a full retention or cleanup subsystem in Phase 5.

Local absolute `path` is optional diagnostics, not primary identity. `relativePath` is preferred when a path is returned.

### Resource references

Tool results return resource references for repeatable artifacts/reports:

```text
artifactId? | reportId?
uri
type
validationStatus
summary
```

Identity rules:

- `artifactId` and `reportId` are generated by the plugin.
- IDs do not come from user-provided paths and are not local file paths.
- Resource URIs are derived from IDs.
- Metadata is the trusted binding between an ID and the actual file or report locator.
- Console snapshot uses `artifactId`; any earlier `{snapshotId}` wording should converge to `artifactId` for this resource type.

Minimum metadata fields:

```text
id
type
uri
relativePath? / reportLocator
createdAt
validationStatus
hostId?
producerTool
producerAction
producerJobId?
diagnostics?
```

For P0 reports, `reportLocator` must be resolvable by the Resource layer within the artifact root or a controlled report store. It must not be a user-provided arbitrary absolute path.

Initial resource URI patterns:

```text
unity://screenshots/{artifactId}
unity://test-reports/{reportId}
unity://console-snapshots/{artifactId}
unity://validation-reports/{reportId}
```

### Artifact model

```text
artifactId
type
uri
path?
relativePath?
createdAt
sizeBytes?
validationStatus
diagnostics
metadata
```

`validationStatus` values:

```text
valid
invalid
uncertain
```

File artifacts emphasize file existence, size, format, path safety, and basic validation. Report artifacts emphasize readable structure and Resource readability. `artifactId` and `reportId` can share a reference shape while preserving their semantic names.

### Resource read failures

Resource read failures must be classified explicitly:

- `metadata_missing`
- `file_missing`
- `path_outside_artifact_root`
- `validation_failed`
- `unsupported_type`
- `host_unavailable`
- `artifact_lost`

A failed Resource read cannot be used as successful evidence for an action.

## P0 Daily Loop Action Semantics Matrix

This matrix locks only the Phase 5 P0 daily loop actions. It does not lock Phase 6/7/8 candidate actions.

Semantic tags:

```text
R  read snapshot
C  command/request accepted
S  state settled
E  effect complete
A  artifact/report complete
V  verified
J  job-backed
D  destructive
```

| Tool.Action | Semantic tags | Owner | Evidence / result model | Confidence |
|---|---|---|---|---|
| `unity_editor.get_status` | `R` | TS read + host probe | `status_snapshot` | High |
| `unity_editor.wait_ready` | `S` | TS workflow | `workflow_result` + repeated `status_snapshot` | High |
| `unity_editor.get_current_host` | `R` | TS read | host `status_snapshot` | High |
| `unity_compile.get_state` | `R` | TS read | compile `status_snapshot` | High |
| `unity_compile.request` | `C` | TS command + C# short action | `request_receipt` | High |
| `unity_compile.wait_for_idle` | `S` | TS workflow | `state_settlement`; not compile success | High |
| `unity_compile.compile_and_check` | `S + V` | TS workflow + C# compiler collector | `workflow_result` + `operation_report`; compiler messages primary; valid recent compile report allowed when no new compile occurs | High |
| `unity_console.snapshot` | `R (+ A when Resource requested/needed)` | TS read + C# snapshot/cursor record | Console snapshot tool result + cursor; optional `console_snapshot` Resource | High |
| `unity_console.count` | `R` | TS read | count `status_snapshot` | High |
| `unity_console.clear` | `E + V` | TS command + C# clear/readback | `operation_report`; count/readback required; new cursor baseline optional | High |
| `unity_test.list` | `R` | TS read + C# test discovery | test discovery `status_snapshot` | High |
| `unity_test.start` | `C + J` | TS command + C# test runner start | `request_receipt` + `job_lifecycle` | High |
| `unity_test.get_status` | `R + J` | TS read | `job_lifecycle` read | High |
| `unity_test.get_result` | `R + A` | TS read | Test report Resource if available; input may resolve by `jobId` or `reportId` | High |
| `unity_test.run_and_collect` | `S + J + A` | TS workflow | `workflow_result` + `job_lifecycle` + test report Resource; not pass | High |
| `unity_test.run_and_verify` | `S + J + V + A` | TS workflow | `workflow_result` + test report Resource + pass/fail verification | High |
| `unity_playmode.get_state` | `R` | TS read | PlayMode `status_snapshot` | High |
| `unity_playmode.enter` | `C` | TS command + C# short action | `request_receipt`; not stable PlayMode | High |
| `unity_playmode.exit` | `C` | TS command + C# short action | `request_receipt`; not stable EditMode | High |
| `unity_playmode.wait_for_state` | `S` | TS workflow | `state_settlement`; target stable state | High |
| `unity_playmode.enter_and_verify` | `S + V` | TS workflow | `workflow_result` + transition `operation_report` + console cursor diagnostics | High |
| `unity_playmode.exit_and_verify` | `S + V` | TS workflow | `workflow_result` + transition `operation_report` + console cursor diagnostics | High |
| `unity_screenshot.capture_game_view` | `A + V` | TS workflow + C# capture/artifact validation | Screenshot `artifact_record` + validation; optional operation report | High |

Matrix rules:

- `R` does not mean the user goal succeeded.
- `C` means only request acceptance.
- `S` means state convergence, not business success.
- `V` requires explicit verification evidence.
- `A` requires a Resource reference when a repeatable artifact/report is produced.
- `J` requires job identity and lifecycle state.
- Phase 5 P0 actions do not include `D`.

## Candidate Action Determination Rules

Phase 6/7/8 specs must classify candidate actions using these rules instead of inheriting fixed mappings from Phase 4:

1. Current state read -> `R` + `status_snapshot`.
2. Request accepted -> `C` + `request_receipt`.
3. State convergence wait -> `S` + `state_settlement`.
4. Write plus readback verification -> `E + V` + `operation_report`.
5. Repeatable file/report output -> `A` + `artifact_record` / Resource.
6. Later-queryable long task -> `J` + `job_lifecycle`.
7. Destructive-like action -> `D` + confirmation or dryRun + strict target.
8. TS composition -> `workflow_result`, not Unity C# long blocking.
9. New log attribution -> strict `diagnostic_cursor`.
10. Evidence cannot prove success or failure -> `status: uncertain`.
11. Host rebind breaks running continuity -> `status: lost`.
12. Safety/schema/target ambiguity rejects execution -> `status: rejected`.

Project command remains Phase 6-owned: `unity_project_command.invoke` chooses immediate/report/job behavior from complete command metadata, safety metadata, input schema, `executionKind`, and `verificationHint`.

## Phase 5 Handoff

Phase 5 receives these stable inputs:

- Unified public result `status` enum.
- P0 daily loop action semantics matrix.
- TS / Unity C# ownership boundary.
- Job lifecycle state and minimum job record contract.
- Compile diagnostics contract, including bounded recent compile report validity proof.
- Strict Console cursor contract for new-log attribution.
- Artifact/report root, ID metadata binding, Resource URI, `validationStatus`, and Resource read failure rules.
- Shared diagnostics minimum shape.
- Timeout result signals and timeout duration policy.
- Requirement for Phase 5 plan to define bounded timeout/polling policies by P0 waiting workflow category, including lightweight reads, compile/test workflows, and PlayMode transitions.
- Limited host rebind recovery contract.
- Requirement to keep Phase 3 result envelope text synchronized with Phase 4.

Phase 5 must not mark P0 public actions as `referenceStatus: stable` until implementation and verification evidence prove these semantics.

## Verification Checklist for This Spec

- `wait_for_idle` is not compile success.
- Console current error count is not the primary compile success/failure basis.
- Waiting actions are not all job-backed.
- Unity C# host does not own long workflows.
- Local file path is not artifact primary identity.
- Phase 6/7/8 candidate models are not locked by Phase 4.
- `status` enum is synchronized with Phase 3 result envelope text.
- P0 matrix covers 23 stable-ready actions from Phase 3.
- `compile_and_check` handles no-new-compile through bounded recent compile report validity proof, not Console/editor-idle fallback.
- Job-backed actions have a minimum job record identity contract.
- Artifact/report IDs are plugin-generated identities bound to metadata, not paths.
- Timeout results include continuation/retry guidance and do not use arbitrary long default waits.
- Phase 5 plan must define bounded timeout/polling policy categories for P0 waiting workflows and include checks for timeout result signals.
- `unity_console.snapshot`, `unity_console.clear`, and `unity_test.get_result` use the user-confirmed mappings.

## Success Criteria Coverage

- Every P0 asynchronous public action has a clear owner.
- Request acceptance is separated from state settlement, verification, and artifact/report production.
- Host rebirth after running work has explicit `lost` / `uncertain` semantics.
- Unity C# host does not carry long blocking workflow orchestration.
- Compile diagnostics and Console diagnostics have separate responsibilities.
- Artifact model and Resource references are aligned.
