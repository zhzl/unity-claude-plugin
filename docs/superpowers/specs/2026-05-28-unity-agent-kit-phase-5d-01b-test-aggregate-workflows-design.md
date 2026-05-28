# Unity Agent Kit Phase 5D-01b Test Aggregate Workflows Design

**Date:** 2026-05-28
**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5D-01b
**Parent Index:** `docs/superpowers/plans/2026-05-28-unity-agent-kit-phase-5d-execution-index.md`
**Baseline:** Phase 5D-01a Test Runner Foundation completed and committed as `aa22c37`.

## Goal

Phase 5D-01b adds internal TypeScript aggregate workflows for test execution:

- `runAndCollectTests(workflow, options)`
- `runAndVerifyTests(workflow, options)`

The workflows compose the existing Phase 5D-01a `list` / `start` / `get_status` / `get_result` foundation. They provide bounded polling, timeout continuation, host continuity checks, and a clear split between collected failed reports and verified passing tests.

## Scope

### In scope

- Add TypeScript aggregate workflow functions in `plugins/unity-agent-kit/src/workflows/test.ts`.
- Reuse existing Phase 5D-01a workflow functions:
  - `startTestRun`
  - `getTestStatus`
  - `getTestResult`
- Reuse existing Phase 5D-01a diagnostics and DTO parsing for selectors, job snapshots, report summaries, Resource-backed report readback, metadata checks, payload summary parsing, job identity, and host continuity.
- Use the existing test timeout policy and continuation result shape.
- Add focused TypeScript tests proving aggregate collect/verify semantics, timeout behavior, continuity rejection, and Resource evidence dependency.
- Update Phase 5D execution evidence only after implementation and verification complete.

### Out of scope

- No new Unity C# aggregate operation.
- No public MCP tool registration.
- No MCP Resource handlers.
- No `/unity` skill files.
- No PlayMode workflow work.
- No Screenshot workflow work.
- No Phase 5E daily-loop E2E.
- No Phase 6/7/8 domain workflows.
- No `mode: all` aggregation across EditMode and PlayMode.

If implementation reveals a bug in the 5D-01a Unity foundation, the fix must be minimal, focused, and covered by the smallest necessary regression test. It must not expand the Unity feature surface.

## Ownership Boundary

TypeScript owns aggregate orchestration:

- starting the job;
- polling status;
- bounding timeout;
- classifying timeout continuation;
- checking host/project continuity through existing workflow results;
- reading the final report through `getTestResult`;
- deciding whether the collected report is a verified pass.

Unity C# remains limited to the short main-thread TestRunner operations already introduced by 5D-01a. Phase 5D-01b must not move long polling, waiting, or aggregate judgment into Unity.

## Workflow Semantics

### `runAndCollectTests`

`runAndCollectTests` starts a test run, waits for terminal job evidence, then collects the validated report through `getTestResult`.

Flow:

1. Call `startTestRun(workflow, options)`.
2. If selector validation rejects the request, return that rejection unchanged.
3. If start does not produce a trusted `jobId`, return the corresponding failure or uncertain result.
4. Poll `getTestStatus(workflow, { jobId })` until terminal state or timeout.
5. On each poll, preserve the identity of the original job and require continuity evidence from existing 5D-01a workflow validation.
6. When the job reaches terminal state, call `getTestResult(workflow, { jobId })`.
7. Return success only when the Resource-backed report is readable and validated.

Success for `runAndCollectTests` means the workflow collected a validated report. It does not mean the tests passed.

Result expectations:

- Passed tests: `status: succeeded`, `verifiedTestPass: true`.
- Failed tests or errored tests: `status: succeeded`, `verifiedTestPass: false`.
- Skipped or inconclusive tests without failures/errors: `status: succeeded`, `verifiedTestPass: true`.
- Missing, unreadable, or mismatched report: `status: failed`.
- Unsupported selector such as `mode: all`: `status: rejected`.
- Timeout before terminal state: `status: timeout` with continuation details.
- Broken host/project/job continuity: does not return `succeeded`.

### `runAndVerifyTests`

`runAndVerifyTests` calls `runAndCollectTests` and applies the stricter test verdict rule.

Success requires:

- collect succeeded;
- a validated report summary exists;
- `failed === 0`;
- `errors === 0`;
- `verifiedTestPass === true`.

`verifiedTestPass` is true for a validated report when `failed === 0` and `errors === 0`. Skipped and inconclusive tests are reported but do not fail verification by default.

Result expectations:

- Collect failed, rejected, timed out, or uncertain: return the collect result unchanged.
- Collect succeeded and report has no failures/errors: return `status: succeeded`.
- Collect succeeded but report has failures/errors: return `status: failed` while preserving the validated report summary.

## Timeout and Continuation

Aggregate polling uses the existing Phase 5C timeout policy for tests. Timeout is not a test failure and must not be reported as a verified failed report.

A timeout result must include:

- `status: timeout`;
- `mayStillBeRunning: true`;
- `safeToRetry: false`;
- the started `jobId` when available;
- a `nextStep` that points to a safe manual continuation path such as checking job status or retrieving job result.

Unity C# must not sleep, busy-wait, block on `Task.Wait`, or hold an HTTP handler open while waiting for a test run to complete.

## Host Continuity

A 5D-01b aggregate result may only succeed if final evidence can be tied to the started job and the same project context.

The aggregate flow must not accept success when any of these checks fail:

- returned `jobId` does not match the started `jobId`;
- `projectRoot` differs from the workflow's expected project root;
- host identity or epoch changes in a way that invalidates in-flight proof;
- report metadata identifies a different producer job;
- report Resource readback does not match the returned report summary.

5D-01b should reuse 5D-01a `getTestStatus` and `getTestResult` validation rather than duplicating low-level metadata and payload checks.

## Diagnostics

Diagnostics should identify the layer that failed:

- selector layer: unsupported selector mode such as `unsupported_selector_mode`;
- lifecycle layer: terminal state not reached, timeout, job identity mismatch;
- continuity layer: host id, host epoch, or project root mismatch;
- report layer: report missing, Resource readback failure, payload mismatch, metadata mismatch;
- verdict layer: validated report collected, but tests failed or errored.

`run_and_collect` must not classify failed test counts as an orchestration/report failure. `run_and_verify` must classify failed test counts as a verification failure while preserving the report evidence.

## Evidence Shape

Aggregate results should retain enough evidence for later Phase 5D-04 evidence sync:

- original selector;
- started job id;
- latest terminal job snapshot when available;
- validated report summary when available;
- `verifiedTestPass`;
- report Resource URI;
- timeout continuation details when applicable;
- diagnostics showing whether failure belongs to orchestration, report validation, continuity, or test verdict.

## Tests

Add focused TypeScript coverage for the aggregate workflows. Existing 5D-01a Unity tests remain the foundation for host-side TestRunner behavior.

### `runAndCollectTests`

Required cases:

- start -> poll running -> poll terminal -> get result -> succeeded;
- terminal report with failed/errors still returns `succeeded` and `verifiedTestPass: false`;
- selector `mode: all` returns rejected and does not invoke Unity transport;
- timeout before terminal returns continuation with `jobId`, `mayStillBeRunning`, `safeToRetry: false`, and `nextStep`;
- status job id mismatch does not succeed;
- project root mismatch does not succeed;
- host continuity mismatch does not succeed;
- terminal state with invalid or unreadable report returns failed.

### `runAndVerifyTests`

Required cases:

- collected report with zero failures/errors returns succeeded;
- collected report with failures/errors returns failed;
- skipped/inconclusive only returns succeeded by default;
- collect timeout propagates timeout;
- collect rejected propagates rejected;
- collect report failure propagates failed.

### Resource evidence regression

Aggregate success must go through `getTestResult`. Tests must fail if aggregate success can be produced without validated Resource readback evidence.

## Verification

The expanded implementation plan must require focused verification commands that cover:

- test workflow aggregate tests;
- existing editor/compile/console workflow regressions if affected;
- host runtime regression if host continuity helpers are touched;
- artifact Resource contract regression because aggregate collect depends on report Resource readback;
- timeout completion contract regression because aggregate polling uses continuation semantics;
- `git -c core.autocrlf=false diff --check`.

Unity EditMode tests are not required for 5D-01b unless a Unity 5D-01a bug is fixed as part of the implementation.

## Expanded Plan Shape

The implementation plan should split work into small verifiable tasks:

1. Add failing TypeScript aggregate tests for collect and verify semantics.
2. Implement thin aggregate workflows in `plugins/unity-agent-kit/src/workflows/test.ts`.
3. Add timeout, continuity, and Resource evidence regressions.
4. Run focused verification and record 5D-01b evidence in the Phase 5D execution index.
5. Check scope guard evidence: no public MCP tools, no MCP Resource handlers, no `/unity`, no PlayMode/Screenshot workflows, and no Phase 6/7/8 domain workflows.

## Completion Boundaries

Completing 5D-01b does not complete Phase 5D. Phase 5D remains incomplete until 5D-02, 5D-03, and 5D-04 complete. Phase 5 remains incomplete because Phase 5E and final daily-loop E2E remain out of scope.
