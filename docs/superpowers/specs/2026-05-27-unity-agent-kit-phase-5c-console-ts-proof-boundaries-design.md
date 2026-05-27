# Unity Agent Kit Phase 5C Console TS Proof Boundaries Mini-Design

## Context

Task 2 of `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` exceeded the project rule for repeated fix/review loops. The repeated findings were not isolated typos; they exposed unclear boundaries between parser shape validation, proof invariants, Resource readback, and effect-action host continuity.

This mini-design pauses ad hoc patching and defines the boundaries for completing Task 2.

## Decisions

1. Keep Task 2 scoped to the existing files:
   - `plugins/unity-agent-kit/src/diagnostics/console.ts`
   - `plugins/unity-agent-kit/src/workflows/console.ts`
   - `plugins/unity-agent-kit/tests/console-workflows.test.ts`
2. Do not add a shared host execution framework in Phase 5C-04.
3. Implement `clearConsole` non-rebind behavior locally in `workflows/console.ts`.
4. Concentrate proof invariants in small helpers inside the existing files.
5. Do not add a top-level `consoleGeneration` to `ConsoleSnapshotSummary`; the plan DTOs place generation in `cursor.consoleGeneration`.

## Diagnostics and Proof Invariants

`src/diagnostics/console.ts` owns host data parsing, result mapping, and Resource-independent proof invariants.

Parser functions validate shape only:
- required fields exist;
- field types are valid;
- resource URI shape is safe;
- diagnostics arrays are shaped correctly.

Semantic proof helpers handle trustworthy evidence:

- `validateCountTailCursorProof(snapshot)`
  - verifies cursor host/epoch/generation against the snapshot;
  - verifies cursor range is not beyond `totalCount`;
  - requires `cursor.startIndex === totalCount` for count tail proof;
  - maps invalid proof to non-succeeded proof-incomplete results.

- `validateClearPostStateCursorProof(snapshot)`
  - verifies cursor host/epoch against the clear snapshot;
  - requires `cursor.consoleGeneration === consoleGenerationAfterClear`;
  - requires `cursor.startIndex === countAfterClear`;
  - verified clear therefore requires cursor start index `0`.

- `validateConsoleBinding(snapshot, expectedProjectRoot, hostResult)`
  - maps project root mismatch to failed;
  - maps host identity mismatch to uncertain continuity loss;
  - does not own cursor-specific rules.

## Snapshot Workflow Proof and Resource Readback

`src/workflows/console.ts` owns snapshot workflow proof because it must decide whether Resource readback is allowed.

`ConsoleSnapshotSummary` remains the planned shape:
- `projectRoot`
- `unityVersion`
- `hostId`
- `hostEpoch`
- `artifactId`
- `uri`
- `counts`
- `cursor`
- `range`
- `entryCount`
- `includeStackTrace`
- optional thread ids
- `diagnostics`

`validateSnapshotSummaryProof(summary)` verifies only observable planned fields:
- `cursor.hostId === summary.hostId`;
- `cursor.hostEpoch === summary.hostEpoch`;
- `cursor.consoleGeneration` is a non-negative integer;
- `cursor.startIndex === range.endIndexExclusive`;
- `range.startIndex <= range.endIndexExclusive <= range.totalCountAtCapture`;
- `entryCount === range.endIndexExclusive - range.startIndex`.

If proof is invalid, `snapshotConsole` returns `uncertain` with `console.cursor_invalid`, does not read Resource content, and does not return a resource.

Snapshot success requires Phase 5B Resource readback:
- host `succeeded` means metadata was produced, not final workflow success;
- `readUnityResource(projectRoot, summary.uri)` must succeed before `snapshotConsole` returns `succeeded`;
- readback failure returns `failed` with `console.snapshot_resource_failed`;
- success metadata includes `resourceFilePath` and actual `resourceContentBytes` bytes.

No console snapshot result may state or imply compile success.

## Clear Effect Execution and Continuity

`clearConsole` is an effect action. It must not auto-recover across host rebind.

Execution sequence:

1. If `confirmClear !== true`, return `rejected` before registry, probe, or Unity transport.
2. Read registry once.
3. Probe the registered host once.
4. If probe fails because host continuity is unavailable, return non-succeeded and require rerun confirmation. Do not invoke `console.clear`.
5. If probe succeeds, invoke `console.clear` once on that same host.
6. If invoke times out, return timeout continuation with `safeToRetry: false` and next step read count.
7. For non-timeout results, read registry again with `seenRegistry: true`.
8. If post-registry continuity is missing or changed, return non-succeeded and require rerun confirmation.
9. Only after continuity remains stable, map the clear result through `consoleClearResultFromHostResult`.

Clear result mapping succeeds only when:
- `explicitClear === true`;
- `cleared === true`;
- `countAfterClear === 0`;
- `consoleGenerationAfterClear > consoleGenerationBeforeClear`;
- post-clear cursor proof matches the clear state.

Continuity loss uses `host.continuity_lost` and `nextStep.kind = "rerun_with_confirmation"`. Verification failure uses `console.clear_verification_failed` and `nextStep.kind = "inspect_diagnostics"`. No automatic retry is performed.

## Tests and Verification

Focused tests in `tests/console-workflows.test.ts` should cover these groups.

Count proof:
- valid count preserves total count, counts, severity scan, and partial diagnostics;
- invalid count cursor proof returns non-succeeded for host mismatch, generation mismatch, out-of-range start index, and stale tail proof.

Snapshot proof and readback:
- valid snapshot requires Phase 5B Resource readback before success;
- missing/invalid Resource readback returns `console.snapshot_resource_failed`;
- invalid summary proof returns uncertain without Resource success;
- metadata preserves actual `resourceContentBytes` bytes.

Clear effect:
- missing confirmation rejects before registry/probe/transport;
- verified clear requires stable continuity and valid post-clear cursor proof;
- failed clear verification returns failed;
- invalid clear cursor proof returns uncertain;
- pre-operation rebind/not-ready path does not invoke clear;
- post-operation registry change/missing rejects old-host evidence;
- timeout is `safeToRetry: false` and points to count/read-state.

Verification commands:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

```bash
git -c core.autocrlf=false diff --check
```

## Review Rule

After the structural cleanup, run one spec review and one code quality review. If either review finds another design-boundary issue, stop again and revise this mini-design or split Task 2. Do not continue ad hoc patching.
