# Unity Agent Kit Phase 5 Daily Loop Infrastructure Design

## Metadata

- **Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- **Phase:** Phase 5 — 高频日常闭环基础设施
- **Spec Path:** `docs/superpowers/specs/2026-05-18-unity-agent-kit-phase-5-daily-loop-infrastructure-design.md`
- **Status:** design-approved
- **Date:** 2026-05-18
- **E2E Unity Project Root:** `unity/`
- **Expected Unity Editor Version:** `2022.3.61f1`

## Goal

Phase 5 实现 Unity Agent Kit 的 P0 高频日常闭环，并首次创建最小 actual `/unity` skill。

Phase 5 聚焦让 Claude 可以通过稳定 public tools 完成：

```text
Editor readiness
→ compile and check
→ console snapshot
→ run tests and verify
→ enter/exit PlayMode
→ capture Game View screenshot artifact
```

Phase 5 不扩展创作工具、project command 生态或完整 Unity 操作域。

## Reference Inputs

- `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-2-skill-architecture-design.md`
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-3-public-tool-action-design.md`
- `docs/superpowers/specs/2026-05-17-unity-agent-kit-phase-4-async-job-workflow-artifact-semantics-design.md`
- `plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md`
- `plugins/plugin-dev/skills/skill-development/references/skill-creation-workflow.md`
- `plugins/plugin-dev/skills/skill-development/examples/minimal-skill.md`
- `plugins/plugin-dev/commands/create-plugin.md`
- `references/unity-mcp-v2`
- `unity/`

## Confirmed Decisions

1. **Stable public action scope**
   - Phase 5 stable target only includes the 19 roadmap-required P0 executable actions.
   - `unity_editor.get_current_host`, `unity_playmode.enter`, `unity_playmode.exit`, and `unity_playmode.wait_for_state` remain schema-ready backlog.

2. **Actual `/unity` creation order**
   - Create a minimal `/unity` skeleton early.
   - Enable executable recipe steps only after the 19 P0 actions are implemented and verified as stable.

3. **E2E project**
   - Use repository-local Unity project `unity/`.
   - Expected Unity version is `2022.3.61f1`.

4. **Test selector**
   - Minimum selector supports `mode: editmode | playmode | all`.
   - Optional precise filters: `assembly`, `className`, `methodName`.
   - `run_and_verify` passes when collected report has `failed == 0` and `errors == 0`.
   - `skipped` and `inconclusive` counts are reported but do not fail by default.

5. **Compile no-new-compile path**
   - Phase 5 does not implement full project-wide change tracking.
   - If no new compile window occurs and no bounded recent compile report validity proof exists, `compile_and_check` returns `status: uncertain`.
   - Editor idle and Console-clean state must not prove compile success.

6. **Unity C# host location**
   - TS MCP layer and Claude Code plugin assets live under `plugins/unity-agent-kit/`.
   - Unity C# host source of truth lives under `unity/Assets/UnityAgentKit/`.
   - Do not keep a second C# host source tree in the TS plugin directory.

7. **Plugin-dev structure**
   - Create actual skill according to plugin-dev conventions: `plugins/unity-agent-kit/skills/unity/SKILL.md`.
   - Treat the earlier single-file skill wording in the roadmap as a path placeholder corrected by this spec.

8. **Console snapshot payload**
   - `unity_console.snapshot` returns a short tool result plus Resource reference.
   - Full logs are read from `unity://console-snapshots/{artifactId}`.

9. **Console clear behavior**
   - `unity_console.clear` is implemented and verified, but only runs on explicit user request.
   - Daily health check default and full recipes do not call `clear`.

10. **Screenshot options**
    - `unity_screenshot.capture_game_view` captures only the current Game View.
    - It accepts a safe label / filename hint and writes only under the controlled artifact root.
    - It does not accept arbitrary absolute paths, Scene View capture, EditorWindow capture, or complex size control.

11. **Completion evidence**
    - Phase 5 cannot be marked completed unless TS/MCP tests and at least one Unity E2E run against `unity/` pass.
    - If Unity `2022.3.61f1` cannot be started, record a blocker or partial evidence, not completion.

12. **Safety metadata materialization**
    - Each of the 19 P0 stable actions must materialize and verify `sideEffectLevel`, `confirmationPolicy`, and `dryRunMode` from Phase 3.

13. **Timeout policy handoff**
    - The implementation plan must define a compact per-workflow timeout / polling policy table.
    - The spec does not lock concrete timeout values or add user-facing timeout configuration.

14. **Recent compile report proof boundary**
    - `compile_and_check` should prefer request / observe-current-cycle proof.
    - A recent compile report can be used only when it is tied to the active Unity project/session and a bounded complete compile lifecycle.
    - Phase 5 still does not implement full project-wide change tracking.

## Scope

### Required 19 P0 Actions

```text
unity_editor.get_status
unity_editor.wait_ready

unity_compile.get_state
unity_compile.request
unity_compile.wait_for_idle
unity_compile.compile_and_check

unity_console.snapshot
unity_console.count
unity_console.clear

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

### Capability Units

Phase 5 organizes the design into six internal capability units. These are not roadmap sub-phases.

1. `editor_readiness`
2. `compile_check`
3. `console_diagnostics`
4. `test_verify`
5. `playmode_verify`
6. `screenshot_artifact`

A seventh workstream creates and validates the actual `/unity` skill.

## Out of Scope

Phase 5 does not implement:

- `unity_scene`, `unity_object`, `unity_component`, or `unity_material` creation/editing flows.
- Phase 6 project command registry enhancement.
- Phase 7 creation vertical slice recipes.
- Phase 8 extension domain recipes.
- Full Test Runner parameter surface.
- Scene View or EditorWindow screenshot capture.
- Full artifact store, retention, or cleanup subsystem.
- Durable request queue.
- Legacy v2 public tool compatibility layer.
- Candidate action executable recipe steps.
- Large Unity operation manual inside `/unity`.

## Directory and Component Structure

### Claude Code Plugin and TS MCP Layer

```text
plugins/unity-agent-kit/
├─ .claude-plugin/
│  └─ plugin.json
├─ .mcp.json
├─ package.json
├─ src/
│  ├─ mcp/
│  ├─ schemas/
│  ├─ workflows/
│  ├─ resources/
│  ├─ host/
│  └─ diagnostics/
├─ tests/
└─ skills/
   └─ unity/
      ├─ SKILL.md
      └─ references/
         ├─ daily-loop-recipes.md
         ├─ troubleshooting.md
         └─ tool-action-reference.md
```

Plugin-dev constraints:

- `.claude-plugin/plugin.json` contains at least `name`, and should include version and description for validation/distribution readiness.
- Plugin name is kebab-case: `unity-agent-kit`.
- Component paths in plugin manifest use relative paths starting with `./`; no absolute paths, no `../`, no Windows backslashes.
- MCP server configuration uses `.mcp.json` or manifest `mcpServers` according to plugin-dev MCP integration conventions.
- If `.mcp.json` references local scripts, use `${CLAUDE_PLUGIN_ROOT}` for portability.
- Detailed package scripts and build output paths are implementation-plan responsibilities, not design-doc hardcoding.

### Unity C# Host Runtime

```text
unity/Assets/UnityAgentKit/
├─ Editor/
│  ├─ status
│  ├─ compile diagnostics collector
│  ├─ console cursor and snapshot services
│  ├─ test runner bridge
│  ├─ playmode state bridge
│  ├─ screenshot artifact producer
│  └─ host HTTP operation router
└─ Runtime/
   └─ shared runtime-facing types only if needed
```

`unity/Assets/UnityAgentKit/` is the only Phase 5 C# host source tree. The TS plugin may package installer or discovery logic later, but must not duplicate host source code.

## Public Result Contract

All P0 actions use the Phase 4 public status enum:

```text
succeeded | failed | uncertain | cancelled | timeout | lost | rejected
```

No separate `outcome` field is introduced.

Minimum public result envelope:

```text
status
tool
action
summary
diagnostics[]
evidence?
nextStep?
resource?
job?
```

Minimum diagnostic shape:

```text
source: compiler | console | workflow | host | artifact | job | validation
severity: info | warning | error
code?
message
details?
attribution: attributed | unattributed | uncertain
```

Result rules:

- `succeeded` requires complete success evidence for that action.
- `failed` requires clear failure evidence.
- `uncertain` is valid when evidence cannot prove success or failure.
- `timeout` does not prove the Unity operation failed.
- `lost` is used when host rebirth/rebind breaks continuity for a running job, cursor, or state proof.
- `rejected` is used for schema, safety, confirmation, or target ambiguity rejection before execution.

## Public Schema Contract

Public tools use typed discriminated unions. They must not expose a free-form primary interface such as:

```text
{ action: string, params: object }
```

Each P0 action must materialize the Phase 3 `inputSchemaRef` name, including zero-payload schemas.

Examples:

```text
unity_editor.GetStatusInput
unity_compile.CompileAndCheckInput
unity_test.RunAndVerifyInput
unity_screenshot.CaptureGameViewInput
```

Example shape for `unity_compile`:

```ts
type UnityCompileInput =
  | { action: "get_state" }
  | { action: "request"; request?: CompileRequestHint }
  | { action: "wait_for_idle"; timeoutMs?: number; pollIntervalMs?: number }
  | { action: "compile_and_check"; timeoutMs?: number; diagnostics?: CompileDiagnosticsHint };
```

Bounded hints such as timeout, polling interval, diagnostic collection, safe label, or test selector are allowed. Arbitrary compiler flags, arbitrary filesystem paths, and unbounded parameter bags are not allowed.

## Timeout Contract

Waiting workflows must use bounded timeout and polling policies. Timeout values are chosen by action type, project state, and user intent; they are not broad fixed defaults.

Timeout results must include:

```text
mayStillBeRunning: true | false | unknown
jobId?
nextStatusAction?
safeToRetry: true | false | unknown
diagnostics
nextStep
```

Rules:

- If a `jobId` exists, `nextStep` points to the relevant status/result action.
- For non-job workflows, `nextStep` points to the relevant state read or snapshot action.
- `safeToRetry` is not `true` unless duplicate side effects are ruled out.
- Claude must not blindly retry after timeout.

The implementation plan must define a compact timeout / polling policy table for the P0 workflows. The table should group lightweight reads, editor readiness, compile workflows, test workflows, PlayMode transitions, screenshot capture, Resource readback, and E2E validation. It should state when a longer wait requires explicit user intent or justification, without adding broad user-facing configuration.

## TS / Unity C# Ownership

### TS MCP Layer Owns

```text
public schema validation
tool/action dispatch
workflow orchestration
polling
timeout and cancellation
host binding and rebind handling
Resource URI assembly
diagnostics convergence
final status judgment
```

### Unity C# Host Owns

```text
Unity API main-thread execution
status snapshots
request accepted signals
compiler message collection
console cursor and snapshot records
test runner bridge records
playmode state snapshots
screenshot capture and basic file validation
artifact/report metadata records
```

### Forbidden Unity C# Host Behavior

```text
long Thread.Sleep on the Unity main thread
busy waits inside HTTP handlers
Task.Wait blocking the Unity main thread
background thread direct Unity API access
complex workflow orchestration
```

## Data Flow

```text
Claude
→ MCP public tool/action
→ TS schema validation
→ TS host binding / workflow
→ loopback HTTP request to Unity C# host
→ Unity main-thread short action / snapshot / record
→ TS polling / convergence / final judgment
→ result envelope + Resource reference
→ Claude reads Resource if full artifact/report is needed
```

## Host Rebind and Recovery

If Unity host rebirth/rebind occurs during a workflow:

- Artifact/report references with readable metadata can be recovered.
- Running job continuity is not assumed.
- Job-specific calls return `status: lost` when continuity cannot be proven.
- Aggregate workflows return `status: uncertain` when final state cannot be proven.
- Phase 5 does not introduce a durable request queue.

## Artifact and Resource Contract

Artifacts/reports are written under a controlled project-scoped artifact root. The concrete relative root is selected in the implementation plan, but it must satisfy:

- Plugin-controlled location.
- Path normalization and traversal protection.
- No confusion with Unity `Assets` source content.
- Readability by MCP Resource handlers.
- No dependency on a full retention or cleanup subsystem.

Initial Resource URI patterns used by Phase 5:

```text
unity://screenshots/{artifactId}
unity://test-reports/{reportId}
unity://console-snapshots/{artifactId}
```

Resource references returned by tools include:

```text
artifactId? | reportId?
uri
type
validationStatus
summary
```

Local absolute `path` is optional diagnostics only. Primary identity is `artifactId` / `reportId` plus `uri`.

## Capability Unit Semantics

### 1. Editor Readiness

Actions:

```text
unity_editor.get_status
unity_editor.wait_ready
```

Semantics:

- `get_status` is a read snapshot of active host, editor state, project identity, and busy signals.
- `get_status` does not mean the Editor is ready for writes.
- `wait_ready` waits for the active host for `unity/` to be reachable and for the Editor to leave blocking states such as compiling, updating, or PlayMode transition.
- `unity_editor.get_current_host` is not a Phase 5 stable public action.

Success evidence:

```text
projectRoot == unity/
host reachable
editor not compiling/updating/transitioning
```

### 2. Compile Check

Actions:

```text
unity_compile.get_state
unity_compile.request
unity_compile.wait_for_idle
unity_compile.compile_and_check
```

Semantics:

- `get_state` reads compile/update state and does not prove compile success.
- `request` means the compile request was accepted, not that compilation completed.
- `wait_for_idle` means Unity is no longer compiling/updating, not that compiler messages contain no errors.
- `compile_and_check` requests or observes a compile lifecycle and verifies success from compiler messages.

Compiler diagnostics rules:

- Primary source is `CompilationPipeline.assemblyCompilationFinished` `CompilerMessage[]`.
- `CompilerMessage.type == Error` fails compile verification.
- Warnings are returned but do not fail compilation.
- Console diagnostics are supplemental and cannot replace compiler messages.
- Console-clean and editor-idle states do not prove compile success.
- No-new-compile without bounded recent report validity proof returns `status: uncertain`.

Recent report proof boundary:

- Prefer request / observe-current-cycle proof for `compile_and_check`.
- Use a recent compile report only when it is tied to the active Unity project/session and comes from a bounded complete compile lifecycle.
- Do not implement full project-wide change tracking in Phase 5.
- If the report binding or lifecycle proof is incomplete, return `status: uncertain`.

Minimum result signals:

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

### 3. Console Diagnostics

Actions:

```text
unity_console.snapshot
unity_console.count
unity_console.clear
```

Semantics:

- `snapshot` returns severity counts, cursor, summary, diagnostics, and optional `console_snapshot` Resource reference.
- Full logs are read through `unity://console-snapshots/{artifactId}`.
- `count` returns counts and does not prove attribution.
- `clear` clears the diagnostic view and verifies readback counts.

Rules:

- `clear` is a write action, not destructive project mutation.
- `clear` is never hidden inside daily health check default or full recipes.
- `clear` runs only on explicit user request.
- New log attribution uses Console cursor, not default clearing.
- Cursor unreliability returns `uncertain` or explicit uncertain diagnostics.

### 4. Test Verify

Actions:

```text
unity_test.list
unity_test.start
unity_test.get_status
unity_test.get_result
unity_test.run_and_collect
unity_test.run_and_verify
```

Minimum selector:

```text
mode: editmode | playmode | all
assembly?
className?
methodName?
```

Semantics:

- `list` returns matching tests and does not prove tests are runnable or passing.
- `start` returns job accepted/running and does not prove completion or pass.
- `get_status` reads job lifecycle.
- `get_result` retrieves a report if available and does not prove pass.
- `run_and_collect` waits for completion and collects `test_report`, but does not prove pass.
- `run_and_verify` waits for completion, collects `test_report`, and verifies `failed == 0` and `errors == 0`.

Minimum result signals:

```text
jobId?
reportId?
uri?
total
passed
failed
errors
skipped
inconclusive
```

`skipped` and `inconclusive` counts are reported. They do not fail by default unless a later phase or explicit user requirement adds stricter pass criteria.

### 5. PlayMode Verify

Actions:

```text
unity_playmode.get_state
unity_playmode.enter_and_verify
unity_playmode.exit_and_verify
```

Semantics:

- `get_state` reads EditMode / PlayMode / transition state.
- `enter_and_verify` requests entry and waits for stable PlayMode.
- `exit_and_verify` requests exit and waits for stable EditMode.
- `enter_and_verify` does not prove gameplay correctness.
- `exit_and_verify` does not prove scene persistence.
- `unity_playmode.enter`, `unity_playmode.exit`, and `unity_playmode.wait_for_state` are helper backlog, not Phase 5 stable public actions.

Verification evidence:

```text
state readback confirms target state
transition completed
supplemental console cursor diagnostics captured when available
```

### 6. Screenshot Artifact

Action:

```text
unity_screenshot.capture_game_view
```

Semantics:

- Captures only the current Game View.
- Accepts only safe label / filename hints.
- Writes to the controlled artifact root.
- Does not accept arbitrary absolute paths.
- Does not support Scene View, EditorWindow, or complex size control.

Success evidence:

```text
artifactId
uri: unity://screenshots/{artifactId}
relativePath
sizeBytes > 0
width > 0
height > 0
validationStatus == valid
```

A structurally valid screenshot artifact does not prove visual acceptance or gameplay correctness.

## Actual `/unity` Skill Contract

### File Structure

```text
plugins/unity-agent-kit/skills/unity/
├─ SKILL.md
└─ references/
   ├─ daily-loop-recipes.md
   ├─ troubleshooting.md
   └─ tool-action-reference.md
```

### Frontmatter

`SKILL.md` uses plugin-dev style frontmatter:

```yaml
---
name: unity
description: This skill should be used when the user asks to "check Unity project health", "compile Unity scripts", "inspect Unity console", "run Unity tests", "enter PlayMode", "exit PlayMode", "capture a Unity screenshot", or "run daily Unity validation" using Unity Agent Kit. It covers Phase 5 editor readiness, compile, console, test, playmode, and screenshot workflows.
---
```

Chinese meaning for the description:

```text
当用户要求“检查 Unity 项目健康状态”、“编译 Unity 脚本”、“查看 Unity Console”、“运行 Unity 测试”、“进入 PlayMode”、“退出 PlayMode”、“捕获 Unity 截图”，或使用 Unity Agent Kit “运行日常 Unity 验证”时，应使用此 skill。它覆盖 Phase 5 的 Editor 就绪状态、编译、Console、测试、PlayMode 和截图工作流。
```

### Skill Writing Rules

- Use third-person description with concrete trigger phrases.
- Use imperative/infinitive body style.
- Keep `SKILL.md` short and route details to references.
- Avoid full public schemas, large JSON examples, long Unity tutorials, or large result examples in `SKILL.md`.
- Keep references files present and linked.
- Use `tool:` and `action:` machine-checkable references in recipe blocks.

### Two-Step Materialization

Step 1: skeleton content

- `/unity` purpose and scope.
- Thin routing.
- Safety / confirmation / dryRun / verification rules.
- Resource reading discipline.
- Phase 6/7/8 handoff category.
- Recipe contract section without candidate executable steps.

Step 2: stable recipes after verification

- Enable executable recipe steps only after corresponding P0 action implementation and verification.
- Executable steps only reference `referenceStatus: stable` actions.

### Recipes

Base recipes:

```text
editor_readiness
compile_check
console_diagnostics
test_verify
playmode_verify
screenshot_artifact
```

Default daily health check:

```text
editor_readiness
compile_check
console_diagnostics
```

Full daily health check:

```text
editor_readiness
compile_check
console_diagnostics
test_verify
playmode_verify
```

Screenshot is optional enhancement. Enable it only when the user asks for visual evidence, the task involves visual/UI/Game View validation, or acceptance evidence requires an artifact.

`unity_console.clear` is not part of default or full daily health check.

### Candidate Reference Boundary

Executable recipe steps cannot reference:

```text
helper backlog actions
candidate public tool/action
Phase 6 project command capabilities
Phase 7 creation capabilities
Phase 8 extension capabilities
```

These may appear only in handoff or `requiredCapabilities` sections when clearly marked non-executable.

## Verification Strategy

### 1. Static Verification

Required checks:

- 19 P0 actions have concrete schemas.
- Each schema aligns with Phase 3 `inputSchemaRef`.
- Each of the 19 P0 actions materializes and verifies `sideEffectLevel`, `confirmationPolicy`, and `dryRunMode`.
- Result envelope uses Phase 4 status enum.
- No free-form `{ action, params }` public interface.
- `/unity` executable recipe steps reference only stable P0 actions.
- Plugin manifest follows plugin-dev path and metadata rules.
- Skill structure uses `skills/unity/SKILL.md`.
- `SKILL.md` has third-person description and concrete trigger phrases.
- Referenced files under `skills/unity/references/` exist.

### 2. TS / MCP Tests

Required test categories:

- Schema parse and rejection tests.
- Public tool registration tests.
- Action dispatch tests.
- Timeout result shape tests.
- Safety metadata presence and consistency tests.
- Resource URI assembly tests.
- Compile no-new-compile `uncertain` tests.
- Test report collected vs verified pass tests.
- Console snapshot short result plus Resource reference tests.
- Screenshot path safety tests.
- Skill recipe reference audit tests.

### 3. Unity E2E Verification

E2E environment:

```text
Unity project root: unity/
Unity Editor version: 2022.3.61f1
```

Minimum E2E sequence:

```text
unity_editor.wait_ready
→ unity_compile.compile_and_check
→ unity_console.snapshot
→ unity_test.run_and_verify
→ unity_playmode.enter_and_verify
→ unity_playmode.exit_and_verify
→ unity_screenshot.capture_game_view
→ Resource readback for screenshot/test report/console snapshot as applicable
```

If Unity `2022.3.61f1` cannot be launched or the `unity/` project cannot load, Phase 5 records an E2E blocker and cannot be marked completed.

## Completion Evidence Requirements

Phase 5 completion evidence must include:

```text
TS/MCP test command and output summary
Unity E2E command or MCP call sequence and output summary
Unity project root: unity/
Unity Editor version: 2022.3.61f1
19 P0 actions stable verification summary
/unity skill audit summary
artifact/resource readback evidence
```

Completion evidence must not use vague text such as `done`, `tested`, or `looks good` without concrete commands and outputs.

## Review and Audit Risks

Before marking Phase 5 complete, review these risks explicitly:

- No duplicate C# host source tree outside `unity/Assets/UnityAgentKit/`.
- No candidate/helper action inside `/unity` executable recipe steps.
- `unity_console.clear` is not hidden inside daily health check.
- `compile_and_check` does not use idle + Console-clean as success proof.
- `capture_game_view` does not accept arbitrary output paths.
- Each stable P0 action exposes the required safety metadata.
- Resource identity uses generated IDs and URIs, not user-provided local paths.
- E2E evidence covers the Phase 5 success criteria.

## Success Criteria Coverage

| Roadmap Phase 5 success criteria | Spec coverage |
|---|---|
| 高频日常闭环可通过 public tools 完成。 | Defines the six P0 capability units and required 19 actions. |
| 编译能区分 idle 与 checked success。 | Separates `wait_for_idle` from `compile_and_check`. |
| 编译成功/失败基于 compiler messages。 | Uses `CompilationPipeline.assemblyCompilationFinished` messages as primary evidence. |
| 截图返回真实有效 artifact。 | Requires screenshot artifact ID, URI, safe path, non-empty file, valid dimensions, and `validationStatus == valid`. |
| 测试能区分 report collected 与 verified pass。 | Separates `run_and_collect` from `run_and_verify`. |
| Console snapshot 可作为 artifact/resource 读取。 | Defines short snapshot result plus `unity://console-snapshots/{artifactId}` Resource. |
| 最小 actual `/unity` skill 已创建，并能通过 P0 stable recipes 指导 daily loop。 | Defines `skills/unity/SKILL.md`, two-step materialization, base recipes, and daily health check variants. |
| `/unity` executable recipe steps 只引用 stable P0 public tool/action。 | Candidate/stable boundary requires executable steps to reference only verified stable actions. |
| `/unity` 符合 context budget。 | Requires progressive disclosure and references files for detailed recipes/troubleshooting/action tables. |
| TS/MCP tests 与至少一轮 E2E 验证通过。 | Defines static, TS/MCP, and Unity E2E verification layers with completion evidence requirements. |

## Implementation Plan Handoff

The Phase 5 implementation plan should decompose work by capability unit and verification layer:

1. Create plugin manifest, TS package skeleton, `.mcp.json`, and skill skeleton using plugin-dev conventions.
2. Create Unity C# host under `unity/Assets/UnityAgentKit/` only.
3. Implement schemas and public tool registration for the 19 P0 actions.
4. Implement Unity host services for status, compile diagnostics, console cursor/snapshot, tests, PlayMode, and screenshot artifact.
5. Implement TS workflows for readiness, compile check, test verify, PlayMode verify, screenshot artifact, Resource readback, timeout, and host rebind semantics.
6. Define the compact per-workflow timeout / polling policy table required by this spec.
7. Prefer request / observe-current-cycle compile proof and bound any recent report reuse to active project/session and complete lifecycle evidence.
8. Enable `/unity` executable recipes only after stable action verification.
9. Run static checks, TS/MCP tests, and Unity E2E against `unity/` on Unity `2022.3.61f1`.
10. Produce completion evidence suitable for roadmap sync.
