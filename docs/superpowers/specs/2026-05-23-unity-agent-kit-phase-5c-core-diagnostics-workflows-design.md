# Unity Agent Kit Phase 5C Core Diagnostics Workflows 设计

## 状态

- 状态：draft，等待书面规格审查。
- 日期：2026-05-23
- Roadmap：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- Phase：Phase 5 / Phase 5C subplan
- Plan Index：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 上游 Spec：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- Split Design：`docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-split-design.md`
- Phase 5B Spec：`docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5b-artifact-resource-timeout-completion-design.md`

## 背景

Phase 1-4 completed。Phase 5A Host Runtime foundation 和 Phase 5A post-completion hardening completed。Phase 5B Artifact / Resource / Timeout / Completion completed with evidence。Phase 5 remains incomplete because Phase 5C-5E and final daily loop E2E remain pending。

Phase 5C 是 Phase 5 的 Core Diagnostics Workflows technical contract。它把 Phase 5A host runtime 和 Phase 5B artifact/resource/timeout/completion 基础设施用于 editor / compile / console 三组核心诊断 workflow。Phase 5C 不注册 public MCP tools，不创建 MCP Resource handlers，不创建 `/unity` skill，也不实现 Phase 5D TestRunner / PlayMode / Screenshot workflows 或 Phase 5E final daily loop E2E。

## 目标

Phase 5C 设计并实现 editor / compile / console 的 internal TS workflows 与 Unity short operations：

1. Editor status/readiness：读取当前 Editor 状态，等待 ready，但不自动退出 PlayMode。
2. Compile diagnostics：读取 compile/update 状态，请求编译，等待 idle，并通过 bounded compile lifecycle + compiler message attribution 实现 `compile_and_check`。
3. No-new-compile path：代码没有变化、没有新 compile window 时，使用 valid recent complete compile report，而不是直接返回 `uncertain`。
4. Console diagnostics：真实读取 Unity Console，提供 count、bounded snapshot Resource、cursor、clear verification。
5. 复用 Phase 5B Resource/readback、timeout continuation 和 completion helper semantics。
6. 产出 Phase 5C execution index handoff，而不是直接 executable plan。

## 非目标

Phase 5C 不实现：

- public MCP tool registration。
- MCP Resource handlers。
- `/unity` actual skill。
- Phase 5D TestRunner workflows。
- Phase 5D PlayMode workflows。
- Phase 5D Screenshot workflows。
- final daily loop E2E。
- `unity://validation-reports/{reportId}`。
- generic persistent job store。
- full project-wide change tracking。
- Unity C# host workflow orchestration。
- legacy v2 public tool compatibility layer。

## 已确认决策

| 决策 | 结果 |
|---|---|
| Phase 5C scope floor | 覆盖完整 9 actions：editor 2、compile 4、console 3。 |
| Public MCP boundary | Phase 5C 交付 internal TS workflows + Unity short operations；Phase 5E 负责 public MCP tools、Resource handlers、`/unity` 和 E2E。 |
| Compile success semantics | `compile_and_check` 必须基于 current-cycle proof 或 valid recent complete compile report；idle / Console-clean 不证明 success。 |
| Recent compile report validity | 使用 session-local invalidation token；token proof 缺失返回 `uncertain`。 |
| Console cursor | 使用 Console buffer index + clear generation + host identity。 |
| Console snapshot Resource payload | 使用 bounded diagnostic payload。 |
| Timeout policy | 使用本 spec 的 9 action default timeout / poll table，全部落在 Phase 5B category policy 内。 |
| Planning artifact | Phase 5C 使用 technical contract + execution index + plan cards。 |
| Unity tests | 使用 deterministic seam + targeted real Unity smoke。 |
| v2 reference | 吸收正确底层机制，不继承 v2 public contract。 |

## 总体架构

```text
Phase 5A Host Runtime
  - loopback host
  - operation envelope
  - registry/probe/rebind
  - host-level timeout

Phase 5B Shared Infrastructure
  - Resource/readback contract
  - artifact metadata contract
  - timeout continuation
  - completion helpers

Phase 5C Core Diagnostics
  - TS internal workflows
  - Unity short operations
  - editor status/readiness
  - compile lifecycle/report/check
  - console cursor/snapshot/resource
```

Phase 5C 采用能力切片 + shared diagnostics kernel：

```text
Shared internal contracts
├─ editor status snapshot contract
├─ compile report / lifecycle / invalidation token contract
├─ console cursor / snapshot payload contract
├─ Phase 5B timeout/completion/resource reuse contract
└─ action-specific public-result mapping rules

Execution index
├─ 5C-01 editor status/readiness
├─ 5C-02 compile state/request/wait idle
├─ 5C-03 compile report + compile_and_check attribution
└─ 5C-04 console count/snapshot/clear + cursor/resource
```

## TS / Unity C# ownership

### TS owns

```text
workflow orchestration
polling
workflow timeout
host binding and rebind handling
Resource URI assembly / readback use
diagnostics convergence
final public-result judgment
action-specific completion semantics
```

### Unity C# owns

```text
Unity API main-thread execution
short operations
editor state snapshots
compile state snapshots
compile request accepted signals
compiler message collection
compile report records
console cursor and snapshot records
console artifact payload + metadata write
```

### Forbidden Unity C# behavior

```text
long Thread.Sleep on the Unity main thread
busy waits inside HTTP handlers
Task.Wait blocking the Unity main thread
background thread direct Unity API access
complex workflow orchestration
```

## Action semantics

### Editor actions

| Action | Semantics | Success evidence | Failure / uncertain boundary |
|---|---|---|---|
| `unity_editor.get_status` | read snapshot | active host reachable；projectRoot matches `unity/`；返回 editor busy/playmode/compile/update 状态 | host lost / registry invalid → `lost` 或 `failed` |
| `unity_editor.wait_ready` | state settled | host reachable；Editor 不 compiling、不 updating、不处于 PlayMode transition | timeout → `timeout` + `nextStep: read_state`；不自动退出 PlayMode |

Rules:

- `wait_ready` 保持 read-only。
- `wait_ready` 不自动退出 PlayMode。
- 如果 PlayMode 状态阻塞 readiness，结果提示调用 `unity_playmode.exit_and_verify`；该 action 由 Phase 5D 实现。

### Compile actions

| Action | Semantics | Success evidence | Failure / uncertain boundary |
|---|---|---|---|
| `unity_compile.get_state` | read snapshot | 返回 compiling / updating / invalidationToken / recent report summary | host lost / invalid envelope |
| `unity_compile.request` | request accepted | busy guard 通过时调用 refresh + request script compilation；busy 时返回 no-op evidence | accepted 不代表 completed；timeout 默认 `safeToRetry: false`，除非 no-op proof |
| `unity_compile.wait_for_idle` | state settled | Unity compiling/updating false | 不证明 compile success；timeout 不证明 compile failed |
| `unity_compile.compile_and_check` | state settled + verified | current-cycle compiler messages complete and no errors；或 valid recent complete compile report no errors | compiler errors → `failed`；warnings → `succeeded` + diagnostics；proof incomplete → `uncertain` |

`compile_and_check` result data 最小字段：

```text
compileCycleId?
compilerMessagesAttributed: boolean
compilerErrorCount
compilerWarningCount
compilerMessagesSummary
usedRecentCompileReport: boolean
recentCompileReportId?
invalidationTokenAtCheck
invalidationTokenAtReport?
supplementalConsoleDiagnostics?
```

Rules:

- Console-clean 不证明 compile success。
- Editor idle 不证明 compile success。
- no-new-compile path 必须先检查 valid recent complete compile report。
- 没有 bounded validity proof 时返回 `uncertain`，并明确缺少哪项 proof。
- recent report proof 使用 session-local invalidation token。

### Console actions

| Action | Semantics | Success evidence | Failure / uncertain boundary |
|---|---|---|---|
| `unity_console.count` | read snapshot | 真实 `LogEntries.GetCount()` / severity count readback | reflection unavailable → `failed` 或 `uncertain` with diagnostics |
| `unity_console.snapshot` | read snapshot / artifact-backed | 真实 Console readback；short result + optional `console_snapshot` Resource；payload bounded and readable | artifact/readback failure 不能作为 success evidence |
| `unity_console.clear` | effect complete + verified | explicit request only；clear 后 count readback 符合 expected zero/current generation advanced | clear 后验证失败 → `failed`；timeout → `timeout` |

`console.snapshot` short result 最小字段：

```text
counts
cursor
range
truncated
resource?
diagnostics
```

Resource reference：

```text
type: "console_snapshot"
uri: unity://console-snapshots/{artifactId}
artifactId
validationStatus
summary
```

Rules:

- `console.clear` 是 write action，但不是 destructive project mutation。
- `console.clear` 不进入 daily health check default/full recipes。
- `console.clear` 只在 explicit user request 中运行。
- clear 成功后递增 `consoleGeneration`，使旧 cursor 失效。

## Compile lifecycle / recent report / invalidation token

### Unity C# compile records

Unity C# 侧提供短操作和记录器，不做 workflow 等待。

```text
CompileSessionState
  hostId
  hostEpoch
  projectRoot
  unityVersion
  invalidationToken
  activeCompileCycle?
  recentCompleteReport?
```

```text
CompileCycleRecord
  compileCycleId
  startedAt
  completedAt?
  state: collecting | completed | incomplete | invalidated
  hostId
  hostEpoch
  invalidationTokenAtStart
  invalidationTokenAtCompletion?
  assemblyReports[]
  lifecycleDiagnostics[]
```

```text
CompileReport
  reportId
  compileCycleId
  hostId
  hostEpoch
  projectRoot
  unityVersion
  completedAt
  invalidationTokenAtCompletion
  compilerErrorCount
  compilerWarningCount
  compilerMessagesSummary
  compilerMessages[]
  completeness:
    assemblyCompilationFinishedSeen
    compilationFinishedSeen
    editorIdleAfterCompilation
```

### Collector events

Unity C# collector subscribes to:

- `CompilationPipeline.assemblyCompilationFinished`：collects `CompilerMessage[]` per assembly。
- `CompilationPipeline.compilationFinished`：marks lifecycle completion candidate。
- Editor idle check via short snapshot operation：proves compiling/updating false after completion candidate。
- Host/domain lifecycle：host epoch change breaks report continuity for in-flight cycles。

### Invalidation token

Phase 5C uses session-local `compileInvalidationToken`.

Token increments on known compile-affecting or evidence-breaking events:

- new compile cycle starts;
- `CompilationPipeline.assemblyCompilationFinished` received outside active trusted cycle;
- `CompilationPipeline.compilationFinished` changes lifecycle state;
- Unity assembly reload / domain reload causes host epoch change;
- explicit compile request accepted;
- asset refresh / package refresh signal if available in Unity callbacks;
- collector reset / subscription loss.

Rules:

- Token is session-local, not durable across host rebirth.
- Token is not full project-wide change tracking.
- Missing invalidation proof returns `uncertain` rather than success.
- If a token increment reason is unavailable in Unity version / test seam, result diagnostics must say which proof is missing.

### `unity_compile.request`

Behavior:

- If compiling/updating：do not call refresh/request again; return no-op evidence:
  ```text
  requested: false
  noOpReason: already_compiling_or_updating
  ```
- If idle：
  - call `AssetDatabase.Refresh()`;
  - call `CompilationPipeline.RequestScriptCompilation()`;
  - increment invalidation token;
  - return request accepted evidence:
    ```text
    requested: true
    usedCompilationPipeline: true
    invalidationTokenAfterRequest
    ```
- Does not wait for completion.

### `unity_compile.wait_for_idle`

TS workflow polls `compile.get_state` until:

- `isCompiling == false`;
- `isUpdating == false`.

Success means state settled only:

```text
completion: state_settled
verifiedCompileSuccess: false
```

Timeout:

- `status: timeout`;
- `safeToRetry: true` only if read-only polling and no compile request occurred in this workflow;
- otherwise `safeToRetry: false`;
- `nextStep.kind = read_state` or `inspect_diagnostics`。

### `unity_compile.compile_and_check`

Preferred path:

```text
read compile state
→ request compile if appropriate
→ observe active/new compile cycle
→ poll until lifecycle completion candidate
→ verify editor idle
→ read complete compile report
→ judge compiler messages
```

No-new-compile path:

```text
read compile state
→ no active/new compile window
→ read recentCompleteReport
→ validate report binding:
   hostId / hostEpoch / projectRoot / unityVersion match
   report is complete
   current invalidationToken == invalidationTokenAtCompletion
   Unity is idle
→ judge compiler messages
```

Judgment:

- compiler error count > 0 → `failed`。
- compiler error count == 0 and report valid → `succeeded`。
- warnings are diagnostics, not failure。
- no report / incomplete lifecycle / token mismatch / host mismatch / idle proof missing → `uncertain`。
- Console diagnostics are supplemental only。

## Console cursor / snapshot / Resource payload

### Unity C# Console service

Unity C# provides short operations / service methods:

```text
console.count
console.snapshot
console.clear
console.cursor.create
console.since_cursor
```

These are internal operations / service methods, not Phase 5E public tools.

### Console reader

Console readback references v2 `UnityEditor.LogEntries` reflection:

- resolve `UnityEditor.LogEntries,UnityEditor.dll`;
- resolve `UnityEditor.LogEntry,UnityEditor.dll`;
- use `GetCount`;
- use compatible `GetEntryInternal(int, LogEntry)` method shape;
- read fields:
  - `message` or `condition`;
  - `mode`;
  - `instanceID`;
  - `stackTrace` when explicitly requested.

Severity normalization:

- `Error`
- `Warning`
- `Log`

Reflection unavailable:

- `console.count` returns `failed` or `uncertain` with `console.reflection_unavailable`.
- `console.snapshot` cannot claim success.
- Diagnostics include missing type/method/field.

### Cursor shape

```text
ConsoleCursor
  hostId
  hostEpoch
  consoleGeneration
  startIndex
  createdAt
```

Rules:

- `startIndex = LogEntries.GetCount()` at cursor creation.
- `sinceCursor` reads `[startIndex, currentCount)`.
- `consoleGeneration` starts at 0 for host session.
- `unity_console.clear` verified success increments `consoleGeneration`.
- Cursor is valid only when:
  - `hostId` matches current host;
  - `hostEpoch` matches current host;
  - `consoleGeneration` matches current generation;
  - `currentCount >= startIndex`.

Invalid cursor:

- host mismatch → `uncertain` attribution。
- generation mismatch → `uncertain` attribution。
- `currentCount < startIndex` → `uncertain` attribution。
- malformed cursor → `rejected` for input boundary or `uncertain` for workflow use。

No old log attribution:

- logs before `startIndex` cannot be attributed to the current operation。
- boundary entries with uncertain order get `attribution: uncertain`。

### `unity_console.count`

Returns short snapshot:

```text
totalCount
counts:
  error
  warning
  log
cursor?
diagnostics
```

It reads real Console state and does not prove attribution.

### `unity_console.snapshot`

Default behavior:

- limit bounded, default 200 entries.
- stack trace excluded unless explicitly requested.
- returns short result:
  ```text
  counts
  cursor
  range
  truncated
  resource?
  diagnostics
  ```
- writes console snapshot artifact payload under `.ai-debug/unity-agent-kit/artifacts/console-snapshots/`.
- writes Phase 5B-compatible metadata under `.ai-debug/unity-agent-kit/artifacts/metadata/console-snapshots/{artifactId}.json`.
- TS verifies Resource readback before treating artifact as complete.

### Console snapshot payload schema

```json
{
  "schemaVersion": 1,
  "artifactId": "console-...",
  "createdAt": "...",
  "hostId": "...",
  "hostEpoch": 1,
  "projectRoot": "...",
  "unityVersion": "...",
  "cursor": {
    "hostId": "...",
    "hostEpoch": 1,
    "consoleGeneration": 0,
    "startIndex": 10,
    "createdAt": "..."
  },
  "range": {
    "startIndex": 0,
    "endIndexExclusive": 10,
    "totalCountAtCapture": 10,
    "truncated": false,
    "limit": 200
  },
  "counts": {
    "error": 0,
    "warning": 1,
    "log": 9
  },
  "entries": [
    {
      "index": 0,
      "entryId": 123,
      "severity": "warning",
      "message": "...",
      "stackTrace": "",
      "mode": "Warning",
      "attribution": "unattributed"
    }
  ],
  "diagnostics": []
}
```

Rules:

- `entries.length <= limit`.
- `truncated == true` when total entries exceed limit.
- Stack traces default empty; only included on explicit input.
- Payload is a bounded diagnostic snapshot, not a durable log index.
- Artifact success requires Phase 5B readback success.

### `unity_console.clear`

Rules:

- explicit user request only.
- not used in daily health check default/full recipes.
- write action, not destructive project mutation.
- calls real Console clear reflection/API.
- verifies count after clear.
- increments `consoleGeneration` only after verified clear.
- old cursors with previous generation become invalid.

Result:

- verified zero/current expected count → `succeeded`.
- clear failed or count mismatch → `failed`.
- timeout → `timeout` with `safeToRetry: false`.
- if clear method unavailable → `failed` with diagnostics.

## Timeout / polling policy

| Action | Default timeout | Poll interval | Category |
|---|---:|---:|---|
| `unity_editor.get_status` | 3s | none | lightweight read |
| `unity_editor.wait_ready` | 30s | 500ms | readiness |
| `unity_compile.get_state` | 3s | none | lightweight read |
| `unity_compile.request` | 10s | none | compile request |
| `unity_compile.wait_for_idle` | 60s | 500ms | compile state settled |
| `unity_compile.compile_and_check` | 120s | 500ms | compile verified |
| `unity_console.count` | 3s | none | lightweight read |
| `unity_console.snapshot` | 10s | none | artifact-backed read |
| `unity_console.clear` | 10s | 250ms | effect complete + verified |

Rules:

- All values stay within Phase 5B category policy.
- `compile_and_check` beyond 120s requires explicit long wait intent.
- Read-only action timeout can use `safeToRetry: true`.
- `compile.request` timeout defaults `safeToRetry: false` unless no-op proof exists.
- `console.clear` timeout defaults `safeToRetry: false`.
- Timeout does not prove Unity operation failed.

## Phase 5B reuse

### Resource / artifact

`unity_console.snapshot`:

- Unity C# writes console snapshot payload and Phase 5B-compatible metadata.
- TS assembles `unity://console-snapshots/{artifactId}`.
- TS calls internal Resource readback.
- Artifact success requires:
  - metadata exists;
  - URI supported;
  - safe locator;
  - payload readable;
  - content non-empty;
  - `validationStatus == "valid"`;
  - Resource readback succeeds.

Editor status and compile state are not Resources.

### Completion helpers

Phase 5C can use existing helper semantics:

- `requestAcceptedResult` for `compile.request`.
- `stateSettledResult` for `wait_ready` / `wait_for_idle`.
- `artifactCompleteResult` for successful `console.snapshot` resource.
- `uncertainEvidenceResult` for incomplete compile/report/cursor proof.
- `timeoutContinuationResult` for workflow timeout.
- `resourceReadFailureResult` when console snapshot Resource readback fails.

Phase 5C must implement action-specific judgment:

- compile success/failure from compiler report.
- console clear success from verified count.
- editor readiness from state snapshot.

Phase 5B helper names are not mandatory API names; behavior is mandatory.

## Host rebind / continuity

General rule:

- Host rebind during running workflow invalidates in-flight proof unless the workflow can independently re-establish evidence.

Editor:

- `get_status` can rebind and read current status if active host validates.
- `wait_ready` can restart read-only polling within timeout after one successful rebind, but result diagnostics must record rebind. If continuity cannot be re-established within timeout, return `uncertain` or `timeout` according evidence stage.

Compile:

- Current compile cycle proof is invalid if hostId/hostEpoch changes.
- Recent compile report can only be reused when report binding matches current host/session and invalidation token proof holds.
- Running compile cycle continuity is not recovered across host rebind.
- Host rebind during `compile_and_check` returns `uncertain` with `host_continuity_lost`, unless a valid recent complete report for the rebound host/session exists.

Console:

- Cursor validity requires hostId/hostEpoch match.
- Host rebind invalidates cursor attribution.
- Existing file-backed console snapshot Resource can still be read if metadata + payload are readable, but it cannot prove new logs after old cursor.
- `console.clear` continuity is not recovered across host rebind; result must be `uncertain` or `failed` depending evidence.

## Result status boundaries

- `succeeded`: only when action-specific evidence is complete.
- `failed`: clear compiler errors, clear Console clear failure, reflection failure where action cannot proceed, Resource readback failure for artifact success path.
- `uncertain`: proof missing, host continuity broken, cursor invalid, compile lifecycle incomplete.
- `timeout`: bounded wait expired; includes nextStep.
- `lost`: active host unavailable / continuity lost before meaningful evidence exists.
- `rejected`: invalid input/cursor/options before execution.

## Diagnostics

All diagnostics use Phase 4 shape:

```text
source
severity
code?
message
details?
attribution
```

Phase 5C diagnostic sources:

- `compiler`
- `console`
- `workflow`
- `host`
- `artifact`
- `validation`

Example codes:

- `compile.report_missing`
- `compile.lifecycle_incomplete`
- `compile.recent_report_invalidated`
- `compile.compiler_error`
- `console.cursor_invalid`
- `console.reflection_unavailable`
- `console.snapshot_resource_failed`
- `workflow.timeout`
- `host.continuity_lost`

## Expected file ownership

Default TS targets under `plugins/unity-agent-kit/src/`:

```text
diagnostics/editor.ts
diagnostics/compile.ts
diagnostics/console.ts
workflows/editor.ts
workflows/compile.ts
workflows/console.ts
```

Default Unity targets under `unity/Assets/UnityAgentKit/Editor/`:

```text
Diagnostics/UnityAgentKitEditorDiagnostics.cs
Diagnostics/UnityAgentKitCompileDiagnostics.cs
Diagnostics/UnityAgentKitConsoleDiagnostics.cs
```

Default test targets:

```text
plugins/unity-agent-kit/tests/editor-workflows.test.ts
plugins/unity-agent-kit/tests/compile-workflows.test.ts
plugins/unity-agent-kit/tests/console-workflows.test.ts
unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
```

`writing-plans` may rename or split these files only when the execution plan records the reason and preserves the TS / Unity ownership boundaries above.

## Implementation artifacts handoff

Phase 5C spec is a technical contract and must not be executed directly. After this spec is reviewed and approved, call `superpowers:writing-plans` to create:

```text
docs/superpowers/plans/2026-05-23-unity-agent-kit-phase-5c-execution-index.md
```

Initial plan cards:

| Plan card | Scope | Depends on | Evidence |
|---|---|---|---|
| `5C-01 editor status/readiness` | editor state snapshot + `wait_ready` TS workflow | 5A/5B | TS workflow tests + Unity editor state smoke |
| `5C-02 compile state/request/wait idle` | compile state snapshot、busy guard、refresh/request、idle polling | 5A/5B | TS tests + Unity compile state/request seam/smoke |
| `5C-03 compile report + compile_and_check attribution` | compiler collector、recent report、invalidation token、verified compile judgment | 5C-02 | TS tests + Unity collector seam + callback smoke |
| `5C-04 console count/snapshot/clear + cursor/resource` | LogEntries readback、cursor、bounded payload、Resource readback、clear verification | 5A/5B | TS resource tests + Unity console seam + real LogEntries smoke |

Rules:

- 5C-03 cannot complete before 5C-02.
- 5C-04 may run independently after 5A/5B, but final Phase 5C evidence must include combined TS + Unity + docs checks.
- Phase 5C completed only when all active plan cards completed with evidence.
- If a plan card grows beyond strict plan size, split within execution index, not by changing roadmap phase.

## Verification matrix

### TS tests

Minimum behavior tests:

- `wait_for_idle` is not compile success.
- `compile.request` returns request accepted / no-op evidence.
- `compile_and_check` succeeds from valid current-cycle report.
- `compile_and_check` succeeds/fails from valid recent report on no-new-compile path.
- invalidation token mismatch returns `uncertain`.
- host mismatch returns `uncertain` / `lost` according evidence stage.
- console snapshot Resource readback required for artifact success.
- console cursor invalidation returns `uncertain`.
- timeouts include `nextStep`, `safeToRetry`, `mayStillBeRunning`.

### Unity EditMode tests

Use deterministic seam + targeted smoke:

- editor state snapshot uses real Unity state APIs.
- compile collector seam covers lifecycle complete/incomplete, error/warning messages, invalidation token.
- callback subscription smoke covers `CompilationPipeline` attach/detach.
- console seam covers count/snapshot/cursor/clear generation.
- real `LogEntries` reflection smoke covers count/entry shape.
- clear verification smoke in controlled test.

### Docs / state checks

Must prove:

- Phase 5A remains completed.
- Phase 5B remains completed.
- Phase 5C contract/execution status updated correctly.
- Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E remain pending.
- No public MCP tool registration.
- No MCP Resource handlers.
- No `/unity` skill.
- No Phase 5D workflows.
- No final daily loop E2E.

### Path checks

Unity Test Runner XML and generated evidence must use:

```text
.ai-debug/unity-agent-kit/test-results/
```

or feature-specific:

```text
.ai-debug/unity-agent-kit/<feature>/
```

Forbidden:

```text
-projectPath unity -testResults unity/Library/...
```

because it can create `unity/unity/...`.

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本 subplan 如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚。 | C# diagnostics 放在 `unity/Assets/UnityAgentKit/`；TS workflows 放在 plugin src；不复制 C# host。 | 5C-01 到 5C-04 | Scope/docs checks；Unity/TS tests |
| Phase 2 | `/unity` skill 是薄路由和 recipe 指导层。 | Phase 5C 不创建 `/unity` skill；仅提供 Phase 5E 可引用的 stable internal workflows。 | final 5C docs check | Scope guard |
| Phase 3 | Public action contract 稳定；schema 有界；safety metadata 准确；禁止 free-form params。 | 5C 定义 action-specific result/data contract；public registration/safety materialization 由 Phase 5E 接入时验证。 | execution index + Phase 5E handoff | Static docs/state check |
| Phase 4 | async/job/workflow/artifact 语义可靠；不能无证据报成功；Resource 可验证。 | request accepted、state settled、verified success、artifact complete、timeout、uncertain 分开；console snapshot 依赖 Phase 5B readback。 | 5C-02 到 5C-04 | TS behavior tests + Unity EditMode tests |

## unity-mcp-v2 Reference Mapping

| 能力域 | 参考输入 | 采用机制 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|---|
| Editor state | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/State/EditorStateProvider.cs` | 使用 Unity state APIs 读取 ready/busy/playmode/compile/update/project/unity version | v2 public operation/status shape | Unity Agent Kit 使用 Phase 4 result enum 和新 action contract | 5C-01 |
| Compile request/state | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/CompileService.cs`、`State/CompileStateProvider.cs` | busy guard、`AssetDatabase.Refresh()`、`CompilationPipeline.RequestScriptCompilation()`、`EditorApplication.isCompiling/isUpdating` | v2 request completed semantics | `compile.request` 只证明 request accepted / no-op，不证明 success | 5C-02 |
| Compile verification | Phase 4/5 specs；v2 compile implementation as negative boundary | 使用 `CompilationPipeline.assemblyCompilationFinished` compiler messages 和 complete lifecycle proof | v2 compile request/status 作为 success proof | v2 不提供 compiler message attribution，不能满足 `compile_and_check` | 5C-03 |
| Console readback | `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ConsoleService.cs` | `UnityEditor.LogEntries` / `LogEntry` reflection、`GetCount`、`GetEntryInternal`、mode normalization | 固定空 Console / weak stub | 会漏报真实错误，不能支撑 daily loop diagnostics | 5C-04 |
| Operation routing | v2 operation router experience | Internal service organization only | v2 public operation names/schema/status | 新插件不做 v2 public compatibility layer | 5C-01 到 5C-04 |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| Editor status/readiness | Unity state snapshot + TS polling workflow | 8 | 缩小 result fields 或补 Unity smoke |
| Compile request/state/wait idle | v2-style busy guard + refresh/request + state polling | 8 | 增加 seam tests 或拆 plan card |
| Compile report/recent proof/compile_and_check | compiler lifecycle collector + invalidation token + recent report proof | 7 | 修订 collector/report proof；不得用 idle/Console-clean 替代 |
| Console cursor/snapshot/resource | LogEntries reflection + buffer index cursor + bounded payload + Phase 5B readback | 7 | 修订 cursor proof 或降低 attribution claims；不得固定空结果 |
| Timeout/completion reuse | Phase 5B policy + action-specific judgment | 8 | 补 TS behavior tests |
| v2 reference mapping | 吸收底层机制，不继承 public contract | 8 | 补采用/不采用证据 |

低于 7/10 的对象不得进入 Phase 5C completion evidence。处理方式只能是修订方案、排除出 completion evidence，或由用户逐条明确接受风险。不得用 stub、固定结果、弱测试或只检查符号存在作为通过理由。

## Roadmap Phase Upgrade Check

当前保持为 Phase 5 subplan；不升级为正式 roadmap phase。

理由：Phase 5C 是 Phase 5 内部 core diagnostics workflow slice，依赖 Phase 5A/5B，输出供 Phase 5D/5E 使用，不具备独立 roadmap goal，不独立解锁 Phase 6/7/8。

如果 implementation planning 发现 Phase 5C 获得独立 roadmap goal、独立跨 phase blocker、需要独立 blocker/current-state，或 execution index 无法覆盖多个 cohesive plan cards，停止并进入 roadmap structural change 或 subplan split review。

## Subplan Completion Evidence

Phase 5C completed 必须同时满足：

- all active 5C plan cards completed with evidence。
- TS editor/compile/console workflow tests pass。
- Unity EditMode diagnostics tests pass。
- targeted real Unity smoke for compile callback subscription and Console LogEntries readback pass。
- console snapshot Resource readback evidence pass。
- docs/state check pass。
- scope boundary check pass。
- `git diff --check` pass。
- Phase 5A remains completed。
- Phase 5B remains completed。
- Phase 5 remains incomplete because Phase 5D, Phase 5E, and final daily loop E2E remain pending。
- no public MCP tools、no MCP Resource handlers、no `/unity` skill、no Phase 5D workflows、no final daily loop E2E。

## Plan index handoff

After this written spec is reviewed and approved, update the Phase 5 plan index Phase 5C row from `pending` to `contract-ready`, pointing Contract to this spec. Execution Index remains pending until `superpowers:writing-plans` creates the Phase 5C execution index.

Do not mark Phase 5 completed from Phase 5C contract approval. Phase 5 completion requires Phase 5C, Phase 5D, Phase 5E, and final daily loop E2E evidence.

## 自检结果

- 范围聚焦 Phase 5C editor / compile / console core diagnostics workflows，没有进入 Phase 5D / 5E。
- 已明确 Phase 5C 不注册 public MCP tools、不创建 `/unity` skill、不创建 Resource handlers。
- 已明确 no-new-compile path 必须使用 valid recent complete compile report 和 session-local invalidation token proof。
- 已明确 Console cursor 使用 buffer index + clear generation + host identity；不使用 loose timestamp 作为主机制。
- 已明确 Console snapshot Resource payload 是 bounded diagnostic payload，不是长期日志系统。
- 已明确 TS owns workflow orchestration / timeout / final judgment，Unity C# owns short operations / snapshots / records。
- 已明确 Phase 5B Resource/readback、timeout/completion helper semantics 的复用边界。
- 已明确 execution index + plan cards，而不是 direct executable plan。
- 已明确 Unity tests 使用 deterministic seam + targeted real Unity smoke。
- 已记录 v2 reference mapping 和不采用 v2 public contract的原因。
- 已记录 Quality Gate、Roadmap Phase Upgrade Check、Subplan Completion Evidence 和 plan index handoff。
