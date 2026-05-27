# Unity Agent Kit Phase 5C Console TS Proof Boundaries 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 收敛 Phase 5C-04 任务 2 的 TS console diagnostics/workflows proof 边界，停止零散 patch，并让任务 2 通过一次规格审查和一次代码质量审查。

**架构：** 保持任务 2 的现有文件范围，不新增 host execution framework。`diagnostics/console.ts` 内集中 Resource-independent proof invariants；`workflows/console.ts` 内集中 snapshot Resource gate 和 clear effect-action continuity path；测试按 count/snapshot/clear proof 分组覆盖。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity Agent Kit host registry/probe/transport helpers、Phase 5B Resource readback helpers。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-04 task 2 recovery
**Spec:** `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-console-ts-proof-boundaries-design.md`
**Parent Plan:** `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`

---

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 v2 operation envelope、Unity host runtime、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；TS 负责 workflow 编排、timeout、host rebind 和最终判定；Unity C# 负责短主线程动作和 artifact/report 记录；写操作必须返回已验证最终效果，不能只表示命令已发送。
- **Phase Scope:** 5C-04 只交付 console count、bounded snapshot、explicit clear、cursor continuity proof 和 Phase 5B-compatible console snapshot Resource readback evidence。
- **Phase Out-of-scope:** 不实现 public MCP tool registration、MCP Resource handlers、`/unity` skill、Phase 5D workflows、Phase 5E final daily loop E2E；不改造 host/rebind framework 为通用 effect-action API。
- **Success Criteria:** TS console focused tests pass；existing TS editor/compile/host/runtime/Phase 5B regression tests pass；console code不声明 compile success；clear 不跨 host rebind 自动执行；snapshot success requires Resource readback。
- **用户确认事项:** 任务 2 超过 3 次修复仍未通过 review 后暂停；采用方案 A：局部收敛、不新增共享 framework、不新增文件、集中本文件 proof helpers；`ConsoleSnapshotSummary` 不新增顶层 `consoleGeneration`。
- **本计划不包含:** 不改 Unity C#；不修改 roadmap/parent plan completion evidence；不整理 git 历史；不把当前多次 fix commits squash/amend；不进入任务 3/4。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-console-ts-proof-boundaries-design.md` | proof helper 边界、snapshot Resource gate、clear local non-rebind path、测试分组 | 新增共享 effect-action framework | 用户确认 5C-04 只做局部收敛 | 任务 1-3 |
| `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` | 任务 2 原始 TS diagnostics/workflows contract、commands、scope boundary | 任务 3+ Unity work、docs evidence sync | 本计划只恢复任务 2 | 任务 1-4 |
| `plugins/unity-agent-kit/src/workflows/rebind.ts` / `src/host/rebind.ts` | count/snapshot 继续使用 rebind-aware read path；clear post-continuity check借鉴 finalizeOperationResult 语义 | 让 clear 继续使用 auto-rebind path | clear 是 effect action，不能跨 host rebind 自动执行 | 任务 2 |
| `plugins/unity-agent-kit/src/resources/readback.ts` | snapshot final success 必须通过 Phase 5B Resource metadata/payload readback | 直接读取 payload 或只保存 byteLength | 计划要求 Resource readback evidence 包含实际 bytes | 任务 2 |
| `plugins/unity-agent-kit/tests/console-workflows.test.ts` | 现有 fake registry/transport harness 与 console behavior tests | 继续追加无组织 patch tests | 需要按 proof group 收敛，降低 review 漏洞 | 任务 1-3 |

## 文件结构

- 修改：`plugins/unity-agent-kit/src/diagnostics/console.ts` — 集中 count/clear Resource-independent proof helpers 与 result mapping。
- 修改：`plugins/unity-agent-kit/src/workflows/console.ts` — 集中 snapshot summary proof、Resource readback final gate、clear local effect execution path。
- 修改：`plugins/unity-agent-kit/tests/console-workflows.test.ts` — 按 count/snapshot/clear proof 分组强化 tests。
- 不修改：`plugins/unity-agent-kit/src/host/rebind.ts`、`plugins/unity-agent-kit/src/workflows/rebind.ts` — 不在 5C-04 中新增共享 effect-action framework。
- 不创建：public MCP tools/server/resource handlers/skills/5D/5E 文件。

### 任务 1：Diagnostics proof helper 收敛

**文件：**
- 修改：`plugins/unity-agent-kit/src/diagnostics/console.ts`
- 测试：`plugins/unity-agent-kit/tests/console-workflows.test.ts`

- [ ] **步骤 1：确认 count/clear proof tests 已覆盖失败场景**

检查 `plugins/unity-agent-kit/tests/console-workflows.test.ts` 中存在或补齐以下测试：

```ts
test("countConsoleMapsInconsistentCursorProofToUncertain", async () => {
  // scenarios must include:
  // - cursor hostId mismatch -> host.continuity_lost
  // - cursor consoleGeneration mismatch -> console.cursor_generation_mismatch
  // - cursor startIndex > totalCount -> console.cursor_invalid
  // - cursor startIndex < totalCount for count tail proof -> console.cursor_invalid
});

test("clearConsoleMapsInconsistentCursorProofToUncertain", async () => {
  // scenarios must include:
  // - cursor hostId mismatch -> console.cursor_invalid
  // - cursor hostEpoch mismatch -> console.cursor_invalid
  // - cursor consoleGeneration mismatch -> console.cursor_generation_mismatch
  // - cursor startIndex !== countAfterClear -> console.cursor_invalid
});
```

如果任一 scenario 缺失，先补测试。测试必须通过 public workflow (`countConsole` / `clearConsole`) 验证行为，不只调用 helper。

- [ ] **步骤 2：收敛 count tail proof helper**

在 `plugins/unity-agent-kit/src/diagnostics/console.ts` 中确保 `consoleCountResultFromHostResult()` 使用一个明确 helper，例如：

```ts
function validateCountTailCursorProof(snapshot: ConsoleCountSnapshot): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  const cursorValidation = validateConsoleCursor(snapshot.cursor, snapshot);
  if (!cursorValidation.ok) {
    return cursorValidation;
  }

  if (snapshot.cursor.startIndex !== snapshot.totalCount) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console count cursor must point at the current tail count.",
        details: {
          cursorStartIndex: snapshot.cursor.startIndex,
          totalCount: snapshot.totalCount,
        },
      },
    };
  }

  return { ok: true };
}
```

`consoleCountResultFromHostResult()` 成功返回前必须调用该 helper。失败时返回 `status: "uncertain"`，`evidence: { completion: "console_proof_incomplete" }`，`nextStep.kind: "inspect_diagnostics"`。

- [ ] **步骤 3：收敛 clear post-state cursor proof helper**

在 `plugins/unity-agent-kit/src/diagnostics/console.ts` 中确保 `consoleClearResultFromHostResult()` 成功返回前调用明确 helper，例如：

```ts
function validateClearPostStateCursorProof(snapshot: ConsoleClearSnapshot): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  if (snapshot.cursor.hostId !== snapshot.hostId || snapshot.cursor.hostEpoch !== snapshot.hostEpoch) {
    return clearCursorDiagnostic("console.cursor_invalid", "Console clear cursor host identity does not match the clear snapshot.", snapshot);
  }

  if (snapshot.cursor.consoleGeneration !== snapshot.consoleGenerationAfterClear) {
    return clearCursorDiagnostic("console.cursor_generation_mismatch", "Console clear cursor generation does not match the verified post-clear generation.", snapshot);
  }

  if (snapshot.cursor.startIndex !== snapshot.countAfterClear) {
    return clearCursorDiagnostic("console.cursor_invalid", "Console clear cursor startIndex does not match the post-clear count.", snapshot);
  }

  return { ok: true };
}
```

Verified clear 失败仍返回 `console.clear_verification_failed`；只有 verified clear evidence 已成立但 cursor proof 不可信时，返回 `uncertain` / proof incomplete。

- [ ] **步骤 4：运行 focused console tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 count/clear proof invariants 在 public workflow 层生效。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/diagnostics/console.ts plugins/unity-agent-kit/tests/console-workflows.test.ts
git commit -m "$(cat <<'EOF'
refactor: consolidate console proof invariants

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：Snapshot Resource gate 与 clear continuity path 收敛

**文件：**
- 修改：`plugins/unity-agent-kit/src/workflows/console.ts`
- 测试：`plugins/unity-agent-kit/tests/console-workflows.test.ts`

- [ ] **步骤 1：确认 snapshot proof/readback tests 覆盖 bytes 与 invalid proof**

检查或补齐 `tests/console-workflows.test.ts`：

```ts
test("snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess", async () => {
  const payload = JSON.stringify({ schemaVersion: 1, artifactId, entries: [{ index: 12, severity: "warning", message: "hello" }] });
  // assertion must prove actual bytes:
  assert.equal(Buffer.from(result.metadata?.["resourceContentBytes"] as Uint8Array).toString("utf8"), payload);
});

test("snapshotConsoleRejectsRangeAndEntryCountMismatchAsInvalidCursorProof", async () => {
  // host returns succeeded summary, Resource fixture may exist, final result must be uncertain/no resource.
});
```

Do not add a top-level `consoleGeneration` to `ConsoleSnapshotSummary`.

- [ ] **步骤 2：收敛 snapshot summary proof helper**

在 `plugins/unity-agent-kit/src/workflows/console.ts` 中保持 `validateSnapshotCursorProof` 或重命名为 `validateSnapshotSummaryProof`，并确保它只验证计划内字段：

```ts
function validateSnapshotSummaryProof(summary: ConsoleSnapshotSummary): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  if (summary.cursor.hostId !== summary.hostId) return invalidSnapshotCursorDiagnostic(...);
  if (summary.cursor.hostEpoch !== summary.hostEpoch) return invalidSnapshotCursorDiagnostic(...);
  if (!Number.isInteger(summary.cursor.consoleGeneration) || summary.cursor.consoleGeneration < 0) return invalidSnapshotCursorDiagnostic(...);
  if (summary.cursor.startIndex !== summary.range.endIndexExclusive) return invalidSnapshotCursorDiagnostic(...);
  if (summary.range.startIndex > summary.range.endIndexExclusive) return invalidSnapshotCursorDiagnostic(...);
  if (summary.range.endIndexExclusive > summary.range.totalCountAtCapture) return invalidSnapshotCursorDiagnostic(...);
  if (summary.entryCount !== summary.range.endIndexExclusive - summary.range.startIndex) return invalidSnapshotCursorDiagnostic(...);
  return { ok: true };
}
```

Invalid proof must return `uncertain` with code `console.cursor_invalid`, no `resource`, no `data` success.

- [ ] **步骤 3：收敛 snapshot Resource metadata bytes**

Ensure snapshot success returns actual bytes:

```ts
metadata: {
  resourceFilePath: readback.filePath,
  resourceContentBytes: readback.contentBytes,
},
```

Do not replace it with `readback.contentBytes.byteLength`.

- [ ] **步骤 4：确认 clear local execution path**

Ensure `clearConsole()` in `src/workflows/console.ts` follows this sequence:

```ts
if (options.confirmClear !== true) return rejectedBeforeRegistryProbeTransport;
const readRegistry = workflow.readRegistry ?? readHostRegistry;
const registryResult = await readRegistry(workflow.registryPath, { projectRoot: workflow.projectRoot });
if (!registryResult.ok) return clearConsoleResultFromRegistryFailure(...);
const probeResult = await probeActiveHost(registryResult.record, workflow.transport);
if (!probeResult.ok) return clearConsoleResultFromContinuityFailure(...);
const hostResult = await invokeOperationOnce(probeResult.record, workflow.transport, { operation: consoleClearOperation, requestId, inputJson: JSON.stringify({ confirmClear: true }) });
if (hostResult.status === "timeout") return timeoutContinuationResult(...safeToRetry false...);
const continuityResult = await verifyClearConsoleContinuity(...seenRegistry true...);
if (continuityResult !== null) return continuityResult;
return consoleClearResultFromHostResult(hostResult, workflow.projectRoot);
```

`clearConsole()` must not call `executeWithRebindAwareness`.

- [ ] **步骤 5：Confirm clear continuity tests**

Ensure these tests exist or add them:

```ts
test("clearConsoleDoesNotSucceedAcrossHostRebind", async () => {
  // first probe returns host.not_ready, invoke queue is empty, result is uncertain host.continuity_lost.
});

test("clearConsoleRejectsVerifiedClearWhenPostRegistryHostChanges", async () => {
  // invoke returns verified clear, post registry returns different host, result is non-succeeded host.continuity_lost.
});

test("clearConsoleRejectsVerifiedClearWhenPostRegistryMissingAfterSeen", async () => {
  // invoke returns verified clear, post registry missing_after_seen, result is non-succeeded host.continuity_lost.
});
```

The pre-rebind test must prove no invoke happened by using an empty invoke expectation queue.

- [ ] **步骤 6：Run focused tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 snapshot Resource gate 和 clear effect-action continuity path 符合 mini-design。

- [ ] **步骤 7：Commit**

```bash
git add plugins/unity-agent-kit/src/workflows/console.ts plugins/unity-agent-kit/tests/console-workflows.test.ts
git commit -m "$(cat <<'EOF'
refactor: align console workflow proof boundaries

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：Task 2 verification and review gate

**文件：**
- 检查：`plugins/unity-agent-kit/src/diagnostics/console.ts`
- 检查：`plugins/unity-agent-kit/src/workflows/console.ts`
- 检查：`plugins/unity-agent-kit/tests/console-workflows.test.ts`

- [ ] **步骤 1：Run focused TS console tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/console-workflows.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 Task 2 console workflows 的 count/snapshot/clear proof boundaries 同时成立。

- [ ] **步骤 2：Run TS regression tests**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/editor-workflows.test.ts tests/compile-workflows.test.ts tests/console-workflows.test.ts tests/host-runtime.test.ts tests/artifact-resource-contract.test.ts tests/timeout-completion-contract.test.ts
```

预期：PASS，输出包含 `# fail 0`。

证明：该检查证明 Task 2 收敛没有破坏 5C-01 editor workflows、5C-02/03 compile workflows、Phase 5A host runtime 或 Phase 5B artifact/resource/timeout/completion contracts。

- [ ] **步骤 3：Run formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：该检查证明当前 diff 没有 trailing whitespace 或 patch formatting 问题。

- [ ] **步骤 4：Run single spec review**

使用 subagent-driven-development 的规格审查模板，对 Task 2 收敛后的 diff 做一次规格审查。审查要求必须引用本计划和 mini-design：

- `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-console-ts-proof-boundaries-design.md`
- 本计划 Task 1-3

预期：✅ 符合规格。

如果发现新的 design-boundary issue，停止，不继续 patch；返回 mini-design 修订或拆分 Task 2。

- [ ] **步骤 5：Run single code quality review**

使用 subagent-driven-development 的代码质量审查模板，对 Task 2 收敛后的 diff 做一次代码质量审查。

预期：评估结论 pass。

如果发现新的 design-boundary issue，停止，不继续 patch；返回 mini-design 修订或拆分 Task 2。

- [ ] **步骤 6：Commit verification marker if files changed**

如果任务 3 仅运行命令且没有文件变化，不创建 commit。如果任务 3 因审查要求做了允许范围内的文字/test cleanup，并且 review pass，再提交：

```bash
git add plugins/unity-agent-kit/src/diagnostics/console.ts plugins/unity-agent-kit/src/workflows/console.ts plugins/unity-agent-kit/tests/console-workflows.test.ts
git commit -m "$(cat <<'EOF'
test: verify console ts proof boundaries

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：同步 parent plan task 2 checkboxes

**文件：**
- 修改：`docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`

- [ ] **步骤 1：只勾选任务 2 已完成步骤**

在 parent plan 的 `### 任务 2：TS console diagnostics and workflows` 下，只把以下步骤改为 `[x]`：

```markdown
- [x] **步骤 1：实现 console diagnostics contract**
- [x] **步骤 2：实现 console workflows**
- [x] **步骤 3：运行 TS console tests 验证通过**
- [x] **步骤 4：运行 existing TS regression tests**
- [x] **步骤 5：Commit**
```

不要勾选任务 3 或后续任务。不要改写任务正文、代码块、命令、预期输出或验收标准。

- [ ] **步骤 2：检查 plan diff**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md
```

预期：diff 只包含任务 2 的五个 checkbox 从 `[ ]` 到 `[x]`。

- [ ] **步骤 3：Commit plan checkbox sync**

```bash
git add docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md
git commit -m "$(cat <<'EOF'
docs: mark console ts workflow task complete

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：mini-design 的 diagnostics proof、snapshot Resource gate、clear effect continuity、tests/review gate 均映射到任务 1-3；parent plan checkbox sync 映射到任务 4。
- 占位符扫描：未使用未完成标记或泛化执行语；代码步骤包含具体 helper 名称、关键逻辑和命令。
- 类型一致性：`ConsoleSnapshotSummary` 不包含顶层 `consoleGeneration`；`resourceContentBytes` 表示 actual bytes；clear continuity helper 命名与现有 `console.ts` 语义一致。
- 拆分检查：本计划只收敛 Task 2，文件范围小且独立验证，无需拆分；若 review 再发现 design-boundary issue，按本计划停止并回到 mini-design。
- 上游约束覆盖：Roadmap 写操作最终效果、TS workflow 编排、host rebind、public/internal 分离、Resource readback 约束进入摘要并落地到任务 1-3。
- 参考输入映射：mini-design、parent plan、rebind helpers、Resource readback、console tests 均已说明采用/不采用内容。
- 验证强度：行为验收均通过 public workflow tests 和 TS regression；scope 不靠符号存在判定。
