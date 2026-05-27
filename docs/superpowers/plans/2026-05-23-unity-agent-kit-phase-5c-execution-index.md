# Unity Agent Kit Phase 5C Execution Plan Set Index

> **用途：** This file is not an executable plan. It is the current-truth index for Phase 5C sibling execution plans. Only expanded strict `superpowers:writing-plans` execution plans may be passed to `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5C
**Contract:** `docs/superpowers/specs/2026-05-23-unity-agent-kit-phase-5c-core-diagnostics-workflows-design.md`
**Parent Plan Index:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`

---

## Rules

- Plan card rows are coverage and sequencing records, not executable implementation plans.
- Expanded plans must preserve strict `superpowers:writing-plans`: concrete failing tests, expected FAIL, minimal implementation, expected PASS, verification commands, and commit steps.
- Phase 5C stays a Phase 5 subplan. Do not promote it to a roadmap phase unless a plan card gains an independent roadmap goal, standalone blocker/current-state need, or cannot fit inside the plan-card set.
- `5C-03` cannot start until `5C-02` is completed because `compile_and_check` depends on compile state/request/wait-idle lifecycle primitives.
- `5C-04` may be expanded after 5A/5B without waiting for compile cards, but Phase 5C completion requires all active 5C cards to pass.
- Phase 5C must not create public MCP tool registration, MCP Resource handlers, `/unity` skill files, Phase 5D Test/PlayMode/Screenshot workflows, or Phase 5E final daily loop E2E.
- Every card must preserve the TS / Unity C# ownership boundary: TS owns workflow orchestration, polling, timeout, rebind classification, Resource URI assembly, and final status judgment; Unity C# owns short main-thread Unity API operations, state snapshots, records, and artifact payload/metadata writes.
- Unity C# must not block the Unity main thread with long `Thread.Sleep`, busy-wait inside HTTP handlers, call `Task.Wait` on the Unity main thread, or move complex workflow orchestration into the host.

## Review-carried constraints

Manual `reviewing-specs` found no must-fix issues. The following concerns are accepted as plan-card constraints:

| Constraint | Applies to | Requirement |
|---|---|---|
| Console severity counting must be bounded. | `5C-04` | `unity_console.count` must use a Unity Console count/severity API or a bounded strategy. If exact severity breakdown would require unbounded full-buffer scanning, return `totalCount` plus diagnostics/uncertain severity breakdown; never return fixed empty counts as a shortcut. |
| `compile_and_check` timeout is an upper default cap. | `5C-03` | `120s` is the Phase 5C upper default cap. Normal compile paths must choose a smaller budget from compile/update state when possible. Waiting beyond `120s` requires explicit long-wait intent. |

## Candidate Plan Cards

| Plan | Scope | Requirement IDs | Wave | Depends on | Expanded Plan | Status |
|---|---|---|---|---|---|---|
| 5C-01 | Editor status snapshot + `wait_ready` TS workflow | 5C-EDITOR-01, 5C-EDITOR-02, 5C-EDITOR-03, 5C-HOST-01, 5C-SCOPE-01 | 1 | Phase 5A, Phase 5B | `docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-01-editor-status-readiness.md` | completed |
| 5C-02 | Compile state/request/wait idle | 5C-COMPILE-STATE-01, 5C-COMPILE-REQUEST-01, 5C-COMPILE-IDLE-01, 5C-HOST-01, 5C-SCOPE-01 | 2 | Phase 5A, Phase 5B | `docs/superpowers/plans/2026-05-24-unity-agent-kit-phase-5c-02-compile-state-request-idle.md` | completed |
| 5C-03 | Compile report + `compile_and_check` attribution | 5C-COMPILE-REPORT-01, 5C-COMPILE-REPORT-02, 5C-COMPILE-CHECK-01, 5C-TIMEOUT-01, 5C-HOST-01 | 3 | 5C-02 | `docs/superpowers/plans/2026-05-25-unity-agent-kit-phase-5c-03-compile-report-compile-and-check.md` | completed |
| 5C-04 | Console count/snapshot/clear + cursor/resource | 5C-CONSOLE-COUNT-01, 5C-CONSOLE-SNAPSHOT-01, 5C-CONSOLE-CURSOR-01, 5C-CONSOLE-CLEAR-01, 5C-RESOURCE-01, 5C-HOST-01, 5C-SCOPE-01 | 2 | Phase 5A, Phase 5B | `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` | completed |

## Requirement Coverage

| Requirement ID | Requirement | Covered by |
|---|---|---|
| 5C-EDITOR-01 | `unity_editor.get_status` reads real Editor state through active host identity and returns compile/update/playmode/project metadata. | 5C-01 |
| 5C-EDITOR-02 | `unity_editor.wait_ready` polls status until not compiling, not updating, and not in PlayMode transition; it must not exit PlayMode. | 5C-01 |
| 5C-EDITOR-03 | Editor timeouts include bounded `nextStep`, safe retry semantics, and do not prove Editor operation failure. | 5C-01 |
| 5C-COMPILE-STATE-01 | `unity_compile.get_state` returns compiling/updating/invalidation/recent-report summary. | 5C-02 |
| 5C-COMPILE-REQUEST-01 | `unity_compile.request` has busy guard and request/no-op evidence; it does not prove compilation success. | 5C-02 |
| 5C-COMPILE-IDLE-01 | `unity_compile.wait_for_idle` proves state settlement only; it does not prove compile success. | 5C-02 |
| 5C-COMPILE-REPORT-01 | Unity compiler collector records lifecycle, compiler messages, recent report, and session-local invalidation token. | 5C-03 |
| 5C-COMPILE-REPORT-02 | No-new-compile path uses a valid recent complete compile report when proof holds; missing proof returns `uncertain`. | 5C-03 |
| 5C-COMPILE-CHECK-01 | `compile_and_check` succeeds only from current-cycle compiler proof or valid recent complete report; idle and Console-clean are not success proof. | 5C-03 |
| 5C-TIMEOUT-01 | `compile_and_check` treats `120s` as upper default cap and requires explicit long-wait intent beyond that cap. | 5C-03 |
| 5C-CONSOLE-COUNT-01 | `unity_console.count` returns real total count and bounded severity breakdown without unbounded full-buffer scanning. | 5C-04 |
| 5C-CONSOLE-SNAPSHOT-01 | `unity_console.snapshot` reads real Console entries into a bounded diagnostic payload and short result. | 5C-04 |
| 5C-CONSOLE-CURSOR-01 | Console cursor uses hostId, hostEpoch, consoleGeneration, startIndex, and createdAt. | 5C-04 |
| 5C-CONSOLE-CLEAR-01 | `unity_console.clear` is explicit only and verifies clear generation/count evidence. | 5C-04 |
| 5C-RESOURCE-01 | Console snapshot success requires Phase 5B-compatible artifact metadata and Resource readback. | 5C-04 |
| 5C-HOST-01 | Host rebind/continuity rules invalidate in-flight proof unless the action can independently re-establish evidence. | 5C-01, 5C-02, 5C-03, 5C-04 |
| 5C-SCOPE-01 | Phase 5C creates internal workflows and Unity short operations only; public MCP tools, MCP Resource handlers, `/unity`, Phase 5D, and Phase 5E remain out of scope. | 5C-01, 5C-02, 5C-03, 5C-04 |

## Current Next Manual Action

Create and review the Phase 5D Test / PlayMode / Screenshot Workflows spec/plan entry according to the Phase 5 plan index. Do not mark Phase 5 completed from this index update, and do not execute this index or the Phase 5 technical contract.

## Completion Rule

Phase 5C completed only after:

1. Every active 5C expanded execution plan is completed with evidence.
2. TS editor/compile/console workflow tests pass.
3. Unity EditMode diagnostics tests pass.
4. Targeted real Unity smoke for compile callback subscription and Console `LogEntries` readback passes.
5. Console snapshot Resource readback evidence passes.
6. Scope boundary checks prove no public MCP tools, no MCP Resource handlers, no `/unity` skill, no Phase 5D workflows, and no final daily loop E2E were added by Phase 5C.
7. `git diff --check` passes.
8. Phase 5A remains completed.
9. Phase 5B remains completed.
10. Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E are not completed by Phase 5C.

## Phase 5C-01 Completion Evidence

5C-01 Editor status/readiness completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `tests 98`, `pass 98`, and `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-01-editor-status-readiness.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `passed="3"` and `failed="0"`.
3. Scope guard passed: no `plugins/unity-agent-kit/src/tools`, no `plugins/unity-agent-kit/src/mcp`, no `plugins/unity-agent-kit/skills/unity`, no `plugins/unity-agent-kit/skills/unity.md`, no compile diagnostics file, and no console diagnostics file were created by 5C-01.
4. `git -c core.autocrlf=false diff --check` passed with no output.

Phase 5C remains incomplete because 5C-03 and 5C-04 are not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.

## Phase 5C-02 Completion Evidence

5C-02 Compile state/request/wait idle completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `pass 113` and `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-02-compile-state-request-idle.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `total="11"`, `passed="11"`, and `failed="0"`.
3. Scope guard passed: no public MCP tools / registration / action-dispatch surface, MCP Resource handlers, `/unity` skill, console diagnostics/workflows, compile report / collector / `compile_and_check`, Phase 5D test/playmode/screenshot workflows, or Phase 5E final daily loop E2E files were created by 5C-02.
4. `git -c core.autocrlf=false diff --check` passed with no output.

Phase 5C remains incomplete because 5C-03 and 5C-04 are not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.

## Phase 5C-03 Completion Evidence

5C-03 Compile report + `compile_and_check` attribution completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `tests 129`, `pass 129`, and `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-compile-report-compile-and-check.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `total="27"`, `passed="27"`, and `failed="0"`.
3. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-03-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` passed with `total="82"`, `passed="82"`, and `failed="0"`.
4. Scope guard passed: no public MCP tools / registration / action-dispatch surface, MCP Resource handlers, `/unity` skill, console diagnostics/workflows, Phase 5D test/playmode/screenshot workflows, or Phase 5E final daily loop E2E files were created by 5C-03.
5. `git -c core.autocrlf=false diff --check` passed with no output.

5C-03 success evidence proves compile success only from current-cycle compiler report proof or valid recent complete compile report. Compile request accepted, idle settled, Console clean, and internal compile.report.get read success are not recorded as compile success proof. compile.report.get remains internal-only and is not an approved unity_compile public action.

Phase 5C remains incomplete because 5C-04 is not completed. Phase 5 remains incomplete because Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E are not completed.

## Phase 5C-04 Completion Evidence

5C-04 Console count/snapshot/clear + cursor/resource completed with evidence:

1. `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts` passed with `tests 147`, `pass 147`, and `fail 0`.
2. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests` passed with `failed="0"`; latest total/passed was `41/41`.
3. `"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests` passed with `failed="0"`; latest total/passed was `82/82`. Non-blocking flake concern: the first HostRuntime run failed on `HttpPendingDispatchOnReloadReturnsStoppedEnvelope` with a JSON parse error at `HostRuntimeDispatchTests.cs:972`, then the exact rerun passed without code changes.
4. Console snapshot Resource readback focused evidence passed: `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts --test-name-pattern "snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess"` reported `tests 18`, `pass 18`, and `fail 0`, proving Phase 5B metadata + payload readback is required for `unity_console.snapshot` success.
5. Scope guard passed: no public MCP tools / registration / action-dispatch surface, no MCP Resource handlers, no `/unity` skill, no Phase 5D test/playmode/screenshot workflows, and no Phase 5E final daily loop E2E files were created by 5C-04.
6. Compile-success boundary textual check passed: console code does not claim `verifiedCompileSuccess`, `compile_verified`, or compile success from clean/empty Console evidence.
7. `git -c core.autocrlf=false diff --check` passed with no output.

5C-04 success evidence proves real bounded Console count/snapshot/clear behavior, cursor continuity fields, explicit clear verification, and Phase 5B-compatible Resource readback. It does not prove compile success; Console diagnostics remain supplemental.

Phase 5C Core Diagnostics Workflows completed with evidence from 5C-01, 5C-02, 5C-03, and 5C-04. Combined evidence covers TS editor/compile/console workflow tests, Unity CoreDiagnosticsTests, Unity HostRuntimeTests regression for 5C-03 and 5C-04, targeted real Unity smoke for compile callback subscription and Console LogEntries readback, console snapshot Resource readback, scope boundary checks, and `git -c core.autocrlf=false diff --check`.

Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E are not completed.

## Phase 5 plan index sync rule

While this index has plan-card rows, the parent Phase 5 plan index may move Phase 5C to `completed` with `Execution Status` set to `completed` after this index records combined evidence from all active 5C cards. Phase 5 itself must remain incomplete because Phase 5D, Phase 5E, and final daily loop E2E are not completed.
