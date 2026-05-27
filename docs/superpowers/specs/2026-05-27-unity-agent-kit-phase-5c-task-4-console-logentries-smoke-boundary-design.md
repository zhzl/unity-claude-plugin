# Unity Agent Kit Phase 5C Task 4 Console LogEntries Smoke Boundary Mini-Design

## Context

Parent plan Task 4 in `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` implements Unity C# console diagnostics operations for `console.count`, `console.snapshot`, and `console.clear`.

Task 4 implementation reached the project stop rule: repeated fix attempts still failed the same real Unity reflection smoke boundary. The deterministic seam tests passed, but the two real `LogEntries` smoke tests failed in Unity 2022.3.61f1 batchmode EditMode:

- `ConsoleLogEntriesReflectionSmokeReadsControlledLogEntry`
- `ConsoleClearReflectionSmokeClearsControlledLogAndIncrementsGeneration`

Evidence from `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml` showed that NUnit captured the unique `Debug.Log` messages in test output while `UnityEditor.LogEntries.GetCount()` still returned `0` during the same test operation. A one-frame `UnityTest` yield and reverting the reader to the v2-style direct `GetCount` / `GetEntryInternal` reflection path did not make those logs visible to `LogEntries` in this runner.

This mini-design revises the Task 4 verification boundary without expanding production scope.

## Decisions

1. Keep the Task 4 production contract unchanged.
2. Keep `UnityAgentKitConsoleDiagnostics` as the local Unity console operation implementation unit.
3. Do not add production waits, retries, polling, fake fallback entries, or workflow logic.
4. Do not modify TypeScript workflow/diagnostics code for this recovery.
5. Treat real `LogEntries` smoke as an environment capability probe in batchmode EditMode.
6. Keep deterministic seam tests as mandatory behavior acceptance.
7. Do not commit `unity/.ai-debug/` test runner artifacts.

## Production Boundaries

`UnityAgentKitConsoleDiagnostics` remains responsible only for short Unity main-thread operations:

- `Count`
  - parses `maxSeverityScan`;
  - resolves `UnityEditor.LogEntries` / `UnityEditor.LogEntry` reflection;
  - reads `GetCount()`;
  - scans only a bounded tail window;
  - returns `console.severity_breakdown_partial` when the severity breakdown is partial;
  - returns a cursor with `hostId`, `hostEpoch`, `consoleGeneration`, and `startIndex = totalCount`.

- `Snapshot`
  - parses `limit`, `includeStackTrace`, and optional cursor;
  - verifies cursor host, epoch, generation, and start index against the current count;
  - reads a bounded range;
  - writes a Phase 5B-layout console snapshot artifact through `WriteConsoleSnapshotArtifact`;
  - returns `unity://console-snapshots/{artifactId}` plus range, cursor, count, and diagnostic evidence.

- `Clear`
  - requires `confirmClear: true`;
  - reads count before clear;
  - invokes reflected `LogEntries.Clear()`;
  - reads count after clear;
  - increments `consoleGeneration` only when `countAfterClear == 0`;
  - returns before/after count, before/after generation, and post-clear cursor evidence.

Reflection unavailable must map through controlled `console.reflection_unavailable` failure paths. Production code must not synthesize entries or claim snapshot/clear success from test-only data.

`UnityAgentKitOperationRouter` continues to require main-thread dispatch for `console.count`, `console.snapshot`, and `console.clear`. Direct `Route` must keep returning `host.dispatch_required`; `RunOnMainThread` maps short-operation results to operation envelopes.

## Test and Verification Boundaries

Task 4 tests are split into mandatory behavior acceptance and environment capability probing.

### Mandatory behavior acceptance

The following deterministic tests must pass and must not be weakened:

- DTO JSON roundtrips for cursor, count, snapshot, and clear results;
- console operations require main-thread dispatch;
- bounded count seam verifies total count, tail scan, and partial diagnostic;
- bounded snapshot seam writes payload and Phase 5B metadata;
- invalid snapshot cursor returns uncertain `console.cursor_invalid`;
- clear requires explicit confirmation;
- verified clear increments generation;
- failed clear verification does not increment generation.

Failure in these tests means Task 4 is not complete.

### Real `LogEntries` smoke as capability probe

The two real reflection smoke tests still call the production `console.snapshot` and `console.clear` paths. They no longer assume that `Debug.Log` in Unity 2022.3.61f1 batchmode EditMode must be synchronously visible through `UnityEditor.LogEntries`.

Expected probe behavior:

- If the runner exposes a visible `LogEntries` buffer:
  - snapshot smoke must prove the bounded payload contains the unique controlled message;
  - clear smoke must prove `countBeforeClear >= 1`, `countAfterClear == 0`, and generation increment.
- If `LogEntries.GetCount() == 0` while NUnit output records the unique message:
  - the test records the runner capability limitation and does not fail;
  - production code must not add waits, retries, polling, or fake entries to force success;
  - deterministic seam tests remain the mandatory proof of bounded snapshot and clear semantics.

This probe verifies that the production reflection path is callable and behaves honestly in the current runner: it must read real buffer evidence when available and must not fabricate success evidence when the runner exposes an empty buffer.

## Recovery Execution

1. Treat the current uncommitted Task 4 implementation as a draft input, not a completed change.
2. Remove any temporary debug or experiment residue before committing.
3. Apply only the minimal test-boundary change needed for the two real smoke probes.
4. Do not modify TS files, public MCP tool registration, MCP Resource handlers, skills, or Phase 5D/5E surfaces.
5. Do not stage `unity/.ai-debug/`.

Verification commands remain:

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

```bash
git -c core.autocrlf=false diff --check
```

Expected result: `CoreDiagnosticsTests` and `HostRuntimeTests` pass with `failed="0"`; diff check passes.

## Review Rule

After recovery implementation, run one specification review against this mini-design and parent plan Task 4, then one code quality review. If either review finds another design-boundary issue, stop again and revise the mini-design or split Task 4. Do not continue ad hoc patching.

## Out of Scope

- Public MCP tool registration.
- MCP Resource handler implementation.
- `/unity` skill behavior.
- Phase 5D test/playmode/screenshot workflows.
- Phase 5E final daily loop E2E.
- Shared host execution framework.
- Production waits, retries, polling, or fake console entries.
