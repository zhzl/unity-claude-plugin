# Unity Agent Kit Phase 5C Task 4 Console LogEntries Smoke Boundary Recovery 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 恢复 parent plan Task 4 的 Unity console diagnostics operations，实现 production contract，并把 real `LogEntries` smoke 收敛为已批准的环境能力探针。

**架构：** 保留 Task 4 Unity C# production 边界：DTO、Phase 5B console snapshot artifact wrapper、`UnityAgentKitConsoleDiagnostics` 短主线程 operation、router main-thread dispatch。只修改 Unity tests 中两个真实 `LogEntries` smoke 的验收语义：runner 有可见 Console buffer 时强断言，runner 暴露空 buffer 时记录 capability limitation，不在 production 加等待、轮询、retry 或 fake fallback。

**技术栈：** Unity 2022.3.61f1 Editor C#、NUnit EditMode tests、Unity `JsonUtility`、`UnityEditor.LogEntries` reflection、Phase 5B artifact metadata layout。
**拆分检查：** 已检查；无需拆分。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5C subplan / plan card 5C-04 task 4 recovery
**Spec:** `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-task-4-console-logentries-smoke-boundary-design.md`
**Parent Plan:** `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`

---

## 当前状态说明

本计划从一个有意保留的未提交 Task 4 草稿继续：

- 已存在未提交 production 草稿：
  - `unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
  - `unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
  - `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
  - `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta`
  - `unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 已存在未跟踪 Unity runner 产物：`unity/.ai-debug/`，不得 stage 或 commit。
- `CoreDiagnosticsTests` 当前仍包含 Task 3 smoke tests 的原强断言，需要按本计划改为 capability probe。

## 上游约束摘要

- **Roadmap Shared Constraints:** 保留 v2 operation envelope、Unity host runtime、registry/probe、host rebirth/rebind、稳定错误语义、TS + Unity 双侧测试策略；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、timeout、host rebind、Resource URI assembly/readback 和最终判定；Unity C# 负责 Unity API 主线程短动作、状态 snapshot、artifact/report 基础记录；禁止 Unity host 长时间等待、HTTP handler 忙等、`Task.Wait` 阻塞 Unity 主线程或后台线程直接调用 Unity API。
- **Phase Scope:** 5C-04 只交付 console count、bounded snapshot、explicit clear、cursor continuity proof 和 Phase 5B-compatible console snapshot Resource readback evidence；本 recovery 只恢复 Task 4 Unity C# operations 与 tests。
- **Phase Out-of-scope:** 不实现 public MCP tool registration、MCP Resource handlers、`/unity` skill、Phase 5D workflows、Phase 5E final daily loop E2E；不创建 shared host execution framework；不进入 parent plan Task 5。
- **Success Criteria:** `CoreDiagnosticsTests` 通过并覆盖 deterministic seam + real `LogEntries` capability probe；`HostRuntimeTests` regression 通过；`git -c core.autocrlf=false diff --check` 通过；审查确认 production 没有 waits/retries/polling/fake entries，测试没有弱化 deterministic seam。
- **用户确认事项:** 选择方案 B/范围 A：真实 `LogEntries` smoke 降级为环境能力探针；本 recovery 只修订 Unity 测试/验证边界，不改 TS、不扩大 production interface、不新增 public surface。
- **本计划不包含:** 不修改 TS console workflows/diagnostics；不提交 `unity/.ai-debug/`；不把 Task 5 scope guard/docs evidence sync 并入本计划；不改写 parent plan Task 5+ checkboxes。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-task-4-console-logentries-smoke-boundary-design.md` | production 边界、capability probe 语义、禁止 production waits/retries/fake entries、review rule | 进一步探索新 reader framework | 用户确认只修订 Unity 测试/验证边界 | 任务 1-2 |
| `docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` Task 4 | DTO、artifact wrapper、console diagnostics、router、Unity 验证命令、commit 文件清单 | 原 smoke 对 `Debug.Log` 后同步 `LogEntries.GetCount() > 0` 的硬性假设 | mini-design 已根据 runner 证据修订 smoke 边界 | 任务 1-3 |
| 当前未提交 Task 4 草稿 | 已实现的 DTO、wrapper、diagnostics、router 作为恢复输入 | `unity/.ai-debug/` runner 产物 | runner 产物不是源码，不得提交 | 任务 1 |
| `references/unity-mcp-v2/Assets/UnityMcpV2/Editor/Services/ConsoleService.cs` | 直接 `LogEntries.GetCount()` + `GetEntryInternal` reflection 路径、mode normalization | v2 empty fallback snapshot、unbounded full-buffer count、public v2 contract | 5C-04 必须 bounded 且不能 fake success | 任务 1 |
| `D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml` | 失败证据：NUnit output 有 unique `Debug.Log`，`LogEntries.GetCount()` 返回 0 | 把失败当作 production reflection unavailable | reflection 可调用但 runner buffer empty，是测试环境能力边界 | 任务 1-2 |

## 文件结构

- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs` — 保留/补齐 Task 4 console DTOs。
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs` — 保留/补齐 `WriteConsoleSnapshotArtifact` wrapper。
- 创建/修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs` — 保留/补齐 production console count/snapshot/clear 短 operation 和 deterministic test seams。
- 创建/修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta` — Unity 生成的 C# asset metadata；若存在则随新脚本提交。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 保留/补齐 console operation constants、main-thread dispatch classification 和 `RunOnMainThread` branches。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` — 仅把两个 real `LogEntries` smoke 改为 capability probe；deterministic seam tests 不弱化。
- 修改：`docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md` — 仅在 Task 4 全部通过后同步 Task 4 checkboxes。
- 不提交：`unity/.ai-debug/`。

### 任务 1：恢复 Task 4 Unity implementation 与 smoke capability probe

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 创建/修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
- 创建/修改：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta`
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`

- [ ] **步骤 1：确认当前 Task 4 草稿范围**

运行：

```bash
git status --short
```

预期：Task 4 草稿只涉及以下源码路径和 `unity/.ai-debug/` runner 产物：

```text
unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs
unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs
unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs
unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta
unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs
unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
unity/.ai-debug/
```

如果出现 TS、public MCP、skills、Task 5 docs 或其他无关文件，停止并报告；不要把无关文件纳入本任务。

- [ ] **步骤 2：确认 production 草稿没有禁止的等待/伪造路径**

检查 `unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs` 中不得出现以下 production 模式：

```text
Thread.Sleep
Task.Delay
StartGettingEntries
EndGettingEntries
retry
fake
fallback entry
Debug.Log
```

允许存在普通 `ConsoleReflectionUnavailableException` failure path；不允许 synthetic/fake console entries。

如果发现禁止模式，删除它并恢复到 v2-style reflection path：

```csharp
internal int GetCount()
{
    return (int)(getCountMethod.Invoke(null, null) ?? 0);
}

internal UnityAgentKitConsoleEntryRecord[] ReadEntries(int startIndex, int endIndexExclusive, bool includeStackTrace)
{
    var safeStartIndex = Math.Max(0, startIndex);
    var safeEndIndexExclusive = Math.Max(safeStartIndex, endIndexExclusive);
    var entries = new List<UnityAgentKitConsoleEntryRecord>(safeEndIndexExclusive - safeStartIndex);
    var entry = Activator.CreateInstance(logEntryType);
    var secondParameterIsByRef = getEntryMethod.GetParameters()[1].ParameterType.IsByRef;
    for (var index = safeStartIndex; index < safeEndIndexExclusive; index++)
    {
        var args = new[] { (object)index, entry };
        getEntryMethod.Invoke(null, args);
        if (secondParameterIsByRef && args[1] != null)
        {
            entry = args[1];
        }

        var message = (string)(messageField?.GetValue(entry) ?? conditionField?.GetValue(entry) ?? string.Empty);
        var rawMode = (int)(modeField?.GetValue(entry) ?? 0);
        var severity = NormalizeSeverity(rawMode, message);
        entries.Add(new UnityAgentKitConsoleEntryRecord
        {
            index = index,
            entryId = (int)(instanceIdField?.GetValue(entry) ?? index),
            severity = severity.ToLowerInvariant(),
            message = message,
            stackTrace = includeStackTrace ? (string)(stackTraceField?.GetValue(entry) ?? string.Empty) : string.Empty,
            mode = severity,
            attribution = "unattributed"
        });
    }

    return entries.ToArray();
}

internal void Clear()
{
    clearMethod.Invoke(null, null);
}
```

- [ ] **步骤 3：确认 optional cursor 的 JsonUtility 默认对象处理**

`UnityAgentKitConsoleDiagnostics.Snapshot(...)` 和 `SnapshotForTests(...)` 必须用 `NormalizeCursor(input.cursor)`，避免 `JsonUtility` 把未提供 cursor 的 JSON 解析成全零默认 object 后误判 invalid cursor。

确保存在以下 helper：

```csharp
private static UnityAgentKitConsoleCursor NormalizeCursor(UnityAgentKitConsoleCursor cursor)
{
    if (cursor == null)
    {
        return null;
    }

    return string.IsNullOrEmpty(cursor.hostId) &&
        cursor.hostEpoch == 0 &&
        cursor.consoleGeneration == 0 &&
        cursor.startIndex == 0 &&
        string.IsNullOrEmpty(cursor.createdAt)
        ? null
        : cursor;
}
```

并确保两个 caller 使用模式如下：

```csharp
var cursor = NormalizeCursor(input.cursor);
var requestedStartIndex = cursor != null ? cursor.startIndex : 0;
if (cursor != null && !CursorMatches(record, cursor, totalCount))
{
    throw new ConsoleCursorInvalidException();
}
```

- [ ] **步骤 4：把 snapshot smoke 改为 capability probe**

在 `unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs` 中，将 `ConsoleLogEntriesReflectionSmokeReadsControlledLogEntry` 替换为：

```csharp
        [Test]
        public void ConsoleLogEntriesReflectionSmokeReadsControlledLogEntry()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var uniqueMessage = "UnityAgentKit console reflection smoke " + System.Guid.NewGuid().ToString("N");
            Debug.Log(uniqueMessage);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.snapshot",
                requestId = "req-console-snapshot-smoke",
                inputJson = "{\"limit\":50,\"includeStackTrace\":false}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.snapshot", "req-console-snapshot-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleSnapshotResult>(response.data);
            var payloadPath = System.IO.Path.Combine(UnityAgentKitArtifactContracts.GetArtifactRoot(), "console-snapshots", data.artifactId + ".json");
            var payloadText = System.IO.File.ReadAllText(payloadPath);

            Assert.LessOrEqual(data.entryCount, 50);
            if (data.range.totalCountAtCapture == 0)
            {
                TestContext.WriteLine("LogEntries buffer was empty after Debug.Log in this Unity batchmode runner: " + uniqueMessage);
                Assert.AreEqual(0, data.entryCount);
                Assert.IsFalse(payloadText.Contains(uniqueMessage));
                return;
            }

            Assert.GreaterOrEqual(data.range.totalCountAtCapture, 1);
            Assert.IsTrue(payloadText.Contains(uniqueMessage));
        }
```

证明点：当 runner 暴露非空 `LogEntries` buffer 时仍强制验证 unique message；当 runner 暴露空 buffer 时记录 capability limitation 且验证 payload 没有伪造 message。

- [ ] **步骤 5：把 clear smoke 改为 capability probe**

在同一文件中，将 `ConsoleClearReflectionSmokeClearsControlledLogAndIncrementsGeneration` 替换为：

```csharp
        [Test]
        public void ConsoleClearReflectionSmokeClearsControlledLogAndIncrementsGeneration()
        {
            UnityAgentKitConsoleDiagnostics.ResetForTests();
            var record = TestHostRecord();
            var uniqueMessage = "UnityAgentKit console clear smoke " + System.Guid.NewGuid().ToString("N");
            Debug.Log(uniqueMessage);

            var response = UnityAgentKitOperationRouter.RunOnMainThread(new UnityAgentKitOperationRequest
            {
                operation = "console.clear",
                requestId = "req-console-clear-smoke",
                inputJson = "{\"confirmClear\":true}"
            }, record, System.Threading.Thread.CurrentThread.ManagedThreadId);

            AssertOperationEnvelopeMinimumFields(response, "succeeded", "console.clear", "req-console-clear-smoke", record);
            var data = JsonUtility.FromJson<UnityAgentKitConsoleClearResult>(response.data);
            Assert.IsTrue(data.explicitClear);
            Assert.IsTrue(data.cleared);
            Assert.AreEqual(0, data.countAfterClear);
            Assert.Greater(data.consoleGenerationAfterClear, data.consoleGenerationBeforeClear);
            Assert.AreEqual(data.consoleGenerationAfterClear, data.cursor.consoleGeneration);
            if (data.countBeforeClear == 0)
            {
                TestContext.WriteLine("LogEntries buffer was empty after Debug.Log in this Unity batchmode runner: " + uniqueMessage);
                return;
            }

            Assert.GreaterOrEqual(data.countBeforeClear, 1);
        }
```

证明点：empty-buffer branch 不再要求 `countBeforeClear >= 1`，但仍要求 real clear operation 返回 explicit/cleared/countAfterClear/generation/cursor proof；non-empty branch 继续强断言 pre-clear count evidence。

- [ ] **步骤 6：运行 Unity CoreDiagnostics tests 验证通过**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 Unity C# DTO、router、deterministic seams、artifact metadata、clear generation 和 real `LogEntries` capability probe 在 Unity EditMode runner 中同时成立。

- [ ] **步骤 7：运行 HostRuntime dispatch regression tests**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明新增 console operations 没有破坏 `/operations` envelope、main-thread dispatch、host timeout、stop/reload behavior。

- [ ] **步骤 8：运行 diff formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：该检查证明当前 diff 没有 trailing whitespace 或 patch formatting 问题。

- [ ] **步骤 9：Commit Task 4 recovery implementation**

先确认 `git status --short` 中 `unity/.ai-debug/` 未 staged。然后运行：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
feat: add phase 5c console diagnostics operations

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

预期：commit succeeds；`unity/.ai-debug/` 仍未提交。

### 任务 2：Task 4 recovery verification and review gate

**文件：**
- 检查：`unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs`
- 检查：`unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs`
- 检查：`unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs`
- 检查：`unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs`
- 检查：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs`

- [ ] **步骤 1：重新运行 Unity CoreDiagnostics tests**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-console-count-snapshot-clear.xml" -testFilter UnityAgentKit.Editor.Tests.CoreDiagnosticsTests
```

预期：PASS，XML 中 `failed="0"`。

证明：review gate 前重新证明 Task 4 Unity behavior 与 capability probe 成立。

- [ ] **步骤 2：重新运行 HostRuntime regression tests**

运行：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath "D:/ai/unity-claude-plugin/unity" -runTests -testPlatform EditMode -testResults "D:/ai/unity-claude-plugin/.ai-debug/unity-agent-kit/test-results/phase5c-04-host-runtime-regression.xml" -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：review gate 前重新证明 host runtime regression 未破坏。

- [ ] **步骤 3：运行 diff formatting check**

运行：

```bash
git -c core.autocrlf=false diff --check
```

预期：PASS，命令无输出。

证明：当前工作区没有 whitespace/formatting patch 问题。

- [ ] **步骤 4：运行单次规格审查**

使用 subagent-driven-development 的规格审查模板，对 Task 4 recovery commit 做一次规格审查。审查必须引用：

- `docs/superpowers/specs/2026-05-27-unity-agent-kit-phase-5c-task-4-console-logentries-smoke-boundary-design.md`
- parent plan Task 4：`docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`

审查重点：

- production contract unchanged；
- no production waits/retries/polling/fake entries；
- deterministic seam tests are not weakened；
- real smoke is capability probe only；
- no TS/public MCP/resource/skill/Task 5 scope leak；
- `unity/.ai-debug/` not committed。

预期：PASS。

如果发现新的 design-boundary issue，停止，不继续 patch；返回 mini-design 修订或拆分 Task 4。

- [ ] **步骤 5：运行单次代码质量审查**

使用 subagent-driven-development 的代码质量审查模板，对 Task 4 recovery commit 做一次代码质量审查。

审查重点：

- C# code remains simple and local；
- reflection reader is bounded and does not hide errors；
- capability probe tests are readable and not brittle；
- artifact metadata wrapper reuses Phase 5B layout；
- router mapping is consistent with existing operation envelope style。

预期：PASS。

如果发现新的 design-boundary issue，停止，不继续 patch；返回 mini-design 修订或拆分 Task 4。

- [ ] **步骤 6：Commit review cleanup only if files changed**

如果任务 2 仅运行命令和审查且没有文件变化，不创建 commit。如果审查要求做了允许范围内的小 cleanup，并且两项 review pass，再提交：

```bash
git add unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs unity/Assets/UnityAgentKit/Editor/Diagnostics/UnityAgentKitConsoleDiagnostics.cs.meta unity/Assets/UnityAgentKit/Editor/Artifacts/UnityAgentKitArtifactContracts.cs unity/Assets/UnityAgentKit/Editor/Models/UnityAgentKitModels.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/CoreDiagnosticsTests.cs
git commit -m "$(cat <<'EOF'
test: verify unity console diagnostics recovery

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：同步 parent plan Task 4 checkboxes

**文件：**
- 修改：`docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md`

- [ ] **步骤 1：只勾选 parent plan Task 4 已完成步骤**

在 parent plan 的 `### 任务 4：Unity console diagnostics operations` 下，只把以下步骤改为 `[x]`：

```markdown
- [x] **步骤 1：添加 Unity console DTOs**
- [x] **步骤 2：增加 console snapshot artifact writer wrapper**
- [x] **步骤 3：实现 Unity console diagnostics short operations**
- [x] **步骤 4：Route console operations through main-thread dispatch**
- [x] **步骤 5：运行 Unity CoreDiagnostics tests 验证通过**
- [x] **步骤 6：运行 HostRuntime dispatch regression tests**
- [x] **步骤 7：Commit**
```

不要勾选 Task 5 或后续任务。不要改写任务正文、代码块、命令、预期输出或验收标准。

- [ ] **步骤 2：检查 plan diff**

运行：

```bash
git diff -- docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md
```

预期：diff 只包含 Task 4 的七个 checkbox 从 `[ ]` 到 `[x]`。

- [ ] **步骤 3：Commit plan checkbox sync**

```bash
git add docs/superpowers/plans/2026-05-27-unity-agent-kit-phase-5c-04-console-count-snapshot-clear-cursor-resource.md
git commit -m "$(cat <<'EOF'
docs: mark unity console diagnostics operations complete

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- 规格覆盖度：mini-design 的 production boundary、capability probe、recovery execution、verification commands、review rule 和 out-of-scope 均映射到任务 1-3。
- 占位符扫描：未使用未完成标记、泛化执行语或未定义类型；代码步骤包含具体 replacement snippets。
- 类型一致性：`UnityAgentKitConsoleSnapshotResult`、`UnityAgentKitConsoleClearResult`、`UnityAgentKitConsoleDiagnostics`、`UnityAgentKitOperationRouter` 名称与 parent plan 和当前测试一致。
- 拆分检查：本计划只恢复 Task 4；Task 5 integrated verification 和 docs evidence sync 不纳入本计划。
- 上游约束覆盖：Roadmap/parent plan 的 Unity C# 短操作、public/internal 分离、无长等待、Resource artifact layout、scope boundary 均进入上游约束并映射到任务。
- 参考输入映射：mini-design、parent plan、当前草稿、v2 reference、失败 XML 均说明采用/不采用内容和落地任务。
- 验证强度：deterministic seam 仍是强制行为验收；real `LogEntries` smoke 的 empty-buffer branch 明确证明 runner limitation 且不允许 production fake success。
