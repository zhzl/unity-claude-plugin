# Unity Agent Kit Phase 5A Host Runtime Hardening 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在不重新打开 Phase 5A、不实现 Phase 5B 的前提下，补强 Host Runtime 的 envelope trust boundary、dispatch timeout ownership、`/operations` body bounds、completion docs 和 final evidence。

**架构：** TS host client 在 `http-client.ts` 中把 envelope shape validation 与 request/host trust validation 分离，并 opaque pass-through 既有 public-result optional fields。Unity C# host 在 main-thread dispatch 里引入 claimed ownership，`/operations` body read 增加 64 KiB limit 与 2 秒 absolute deadline。文档只记录 post-completion hardening evidence，保持 Phase 5A completed 与 Phase 5 partial / `continue-5b`。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Unity 2022.3.61f1 Editor C# EditMode tests、NUnit、UnityTest coroutine、HttpListener loopback、System.Threading.Timer。
**拆分检查：** 已检查；无需拆分。该规格包含 TS、Unity 和 docs 三个落点，但它们共同构成单一 Phase 5A post-completion hardening gate；拆成多个 plan 会让 hardening evidence 和 Phase 5B 前置状态分散。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5 / Phase 5A post-completion hardening before Phase 5B
**Spec:** `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5a-host-runtime-hardening-design.md`

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交修改文件。

## 文件结构

- 修改：`plugins/unity-agent-kit/src/host/http-client.ts` — 将 operation envelope mapping 改为带 `record` / `request` 上下文的 trust validation，并 opaque pass-through existing public-result optional fields。
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — 添加 TS envelope mismatch red tests 和 optional fields preservation tests。
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs` — 为 pending dispatch 增加 claimed ownership、deterministic test hook 和 timeout force helper，避免 timeout 后仍执行。
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` — 添加 `MaxOperationRequestBodyBytes`、`OperationRequestBodyDeadlineMs`、body read result classification 和 oversized/deadline handling。
- 修改：`unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs` — 添加 `http.request_body_too_large` structured operation envelope helper。
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs` — 添加 dispatch claim race 和 `/operations` body bound tests，复用现有 background HTTP / raw TCP helpers。
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` — 修正 5A-04 folded wording，并记录 hardening evidence。
- 修改：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` — 保持 5A-08 completed，增加 post-completion hardening evidence note。
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` — 当前状态、Phase 5 verification evidence 和 Change Log 增加 hardening entry；保持 Phase 5 partial / `continue-5b`。
- 修改：`docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md` — 顶部增加 executed/completed status note，并说明 checklist 是历史执行计划文本。
- 不创建：`plugins/unity-agent-kit/src/tools`、`plugins/unity-agent-kit/src/mcp`、`plugins/unity-agent-kit/src/actions`、`plugins/unity-agent-kit/skills/unity.md`。

## 上游约束摘要

- **Roadmap Shared Constraints:** TS 负责 registry/probe/invoke/rebind、lost/rebind 判断和 public result 收敛；Unity C# 只负责短主线程动作、DTO JSON、registry 写入和 loopback routing；不把 workflow 编排或长等待移入 Unity C# host。
- **Phase Scope:** Phase 5A Host Runtime foundation 已 completed；本计划只做 completed 后、Phase 5B 前的 hardening patch。
- **Phase Out-of-scope:** 不实现 Phase 5B-5E；不实现 public MCP tools；不创建 `/unity` skill；不实现 artifact/resource store、workflow timeout 或 final daily loop E2E。
- **Success Criteria:** TS non-live tests 覆盖 envelope trust boundary 和 optional fields preservation；Unity HostRuntimeTests 覆盖 dispatch claim race 与 body bounds；Unity vertical smoke 继续通过；docs/scope gates 证明 Phase 5A remains completed、Phase 5 remains incomplete / `continue-5b`。
- **用户确认事项:** 采用 post-completion hardening，不重新打开 Phase 5A；scope 采用方案 B；optional fields 只 opaque pass-through；body bounds 固定 64 KiB / 2 秒；测试可用 deterministic test-only synchronization，但不得降低 production bounds 或阻塞 Unity main thread / HTTP handler。
- **本计划不包含:** 不定义 resource/job schema；不创建 store/handler/workflow；不新增 public action business logic；不扩大 operation catalog；不提交 `.ai-debug/` 或 `unity/unity/` 生成物。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-22-unity-agent-kit-phase-5a-host-runtime-hardening-design.md` | 已批准 hardening scope、Phase 状态、optional fields opaque pass-through、body bounds、验证矩阵 | Phase 5B resource/job schema | 本 patch 不实现 Phase 5B | 任务 1-5 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 5A-RESULT、5A-MCP、5A-HTTP、5A-DISPATCH、5A-TIMEOUT、5A-REBIND、5A-EVIDENCE requirement IDs | Public action business logic | Phase 5A host runtime foundation only | 任务 1-5 |
| `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-07-ts-host-client-rebind.md` | `http-client.ts` / `rebind.ts` boundary：transport low-level，http-client maps envelope，rebind finalizes lifecycle | Live vertical smoke implementation | Already completed in 5A-08 | 任务 1 |
| `docs/superpowers/plans/2026-05-20-unity-agent-kit-phase-5a-06-main-thread-dispatch-timeout.md` | non-blocking pending dispatch hook、expired work not executing later、shutdown ownership boundary | Blocking main thread/HTTP handler to create timeout | Explicitly forbidden by project and spec | 任务 2-3 |
| `plugins/unity-agent-kit/tests/host-runtime.test.ts` | Existing sample host record, succeeded envelope, fake transport, TS host runtime test style | New public tool tests | Out of scope | 任务 1 |
| `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs` | Existing UnityTest coroutine style, background HTTP request helpers, raw partial operations post helper | Large test harness rewrite | Surgical hardening only | 任务 2-3 |
| `unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs` | Existing `ReadChunkWithTimeout`, accept reservation, complete-body ownership, JSON writer behavior | Configurable payload limit | YAGNI; constants fixed by spec | 任务 3 |

## 任务 1：TS envelope trust boundary + optional fields preservation

**文件：**
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 修改：`plugins/unity-agent-kit/src/host/http-client.ts`

- [x] **步骤 1：编写失败的 TS trust boundary tests**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 中，放在 `invokeOperationMapsSucceededEnvelopeToPublicResult` 后面：

```ts
test("invokeOperationRejectsMismatchedEnvelopeOperation", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ operation: "host.threadCheck" }) }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.hostId, "host-a");
  assert.equal(result.hostEpoch, 3);
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
  assert.deepEqual(result.diagnostics[0].details, {
    expectedOperation: "host.echo",
    actualOperation: "host.threadCheck",
  });
});

test("invokeOperationRejectsMismatchedEnvelopeRequestId", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ requestId: "req-other" }) }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
  assert.deepEqual(result.diagnostics[0].details, {
    expectedRequestId: "req-echo",
    actualRequestId: "req-other",
  });
});

test("invokeOperationRejectsMismatchedEnvelopeHostId", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-other" }) }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "lost");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.hostId, "host-a");
  assert.equal(result.hostEpoch, 3);
  assert.equal(result.diagnostics[0].code, "host.identity_mismatch");
  assert.deepEqual(result.diagnostics[0].details, {
    expectedHostId: "host-a",
    actualHostId: "host-other",
  });
});

test("invokeOperationRejectsMismatchedEnvelopeHostEpoch", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ hostEpoch: 4 }) }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "lost");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.hostId, "host-a");
  assert.equal(result.hostEpoch, 3);
  assert.equal(result.diagnostics[0].code, "host.identity_mismatch");
  assert.deepEqual(result.diagnostics[0].details, {
    expectedHostEpoch: 3,
    actualHostEpoch: 4,
  });
});

test("invokeOperationPreservesPublicResultOptionalFields", async () => {
  const record = sampleHostRecord();
  const optionalFields = {
    evidence: { phase: "5A-hardening" },
    resource: { uri: "unity://opaque/resource" },
    resources: [{ uri: "unity://opaque/resource-1" }],
    metadata: { owner: "unity-host", timeoutLayer: "host" },
    job: { id: "opaque-job" },
    nextStep: { action: "opaque-next" },
    safeToRetry: false,
    mayStillBeRunning: true,
  };

  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope(optionalFields) }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "succeeded");
  assert.deepEqual(result.evidence, optionalFields.evidence);
  assert.deepEqual(result.resource, optionalFields.resource);
  assert.deepEqual(result.resources, optionalFields.resources);
  assert.deepEqual(result.metadata, optionalFields.metadata);
  assert.deepEqual(result.job, optionalFields.job);
  assert.deepEqual(result.nextStep, optionalFields.nextStep);
  assert.equal(result.safeToRetry, false);
  assert.equal(result.mayStillBeRunning, true);
});
```

- [x] **步骤 2：运行 TS tests 验证 red**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，至少 `invokeOperationRejectsMismatchedEnvelopeOperation`、`invokeOperationRejectsMismatchedEnvelopeRequestId`、`invokeOperationRejectsMismatchedEnvelopeHostId`、`invokeOperationRejectsMismatchedEnvelopeHostEpoch` 或 `invokeOperationPreservesPublicResultOptionalFields` 失败。

证明：该 red 证明当前 TS client 会信任 mismatch envelope 或丢失 optional fields。

- [x] **步骤 3：实现 envelope context validation 和 optional fields pass-through**

在 `plugins/unity-agent-kit/src/host/http-client.ts` 中替换 `mapEnvelopeToPublicResult`、`invokeOperationOnce` 和相关 helper。保留既有 `transport.ts` / `rebind.ts` 边界。

```ts
interface OperationEnvelopeContext {
  record: UnityAgentKitHostRecord;
  request: UnityAgentKitOperationRequest;
}

const optionalPublicResultFields = [
  "evidence",
  "resource",
  "resources",
  "metadata",
  "job",
  "nextStep",
  "safeToRetry",
  "mayStillBeRunning",
] as const;

export function mapEnvelopeToPublicResult(envelope: unknown, context: OperationEnvelopeContext): UnityAgentKitPublicResult {
  if (!isTrustedEnvelope(envelope)) {
    return invalidEnvelopeResult(context, "Host operation response has an invalid envelope.");
  }

  const operationMismatch = envelope.operation !== context.request.operation;
  if (operationMismatch) {
    return invalidEnvelopeResult(context, "Host operation response operation does not match the request.", {
      expectedOperation: context.request.operation,
      actualOperation: envelope.operation,
    });
  }

  const requestIdMismatch = envelope.requestId !== context.request.requestId;
  if (requestIdMismatch) {
    return invalidEnvelopeResult(context, "Host operation response requestId does not match the request.", {
      expectedRequestId: context.request.requestId,
      actualRequestId: envelope.requestId,
    });
  }

  if (envelope.hostId !== context.record.hostId) {
    return identityMismatchResult(context, "Host operation response hostId does not match the registry record.", {
      expectedHostId: context.record.hostId,
      actualHostId: envelope.hostId,
    });
  }

  if (envelope.hostEpoch !== context.record.hostEpoch) {
    return identityMismatchResult(context, "Host operation response hostEpoch does not match the registry record.", {
      expectedHostEpoch: context.record.hostEpoch,
      actualHostEpoch: envelope.hostEpoch,
    });
  }

  return definePublicResult({
    status: envelope.status,
    tool: "unity_editor",
    action: envelope.operation,
    operation: envelope.operation,
    requestId: envelope.requestId,
    hostId: envelope.hostId,
    hostEpoch: envelope.hostEpoch,
    summary: envelope.summary,
    data: envelope.data,
    diagnostics: envelope.diagnostics,
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    durationMs: envelope.durationMs,
    code: envelope.code,
    message: envelope.message,
    ...readOptionalPublicResultFields(envelope.raw),
  });
}

export async function invokeOperationOnce(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
  request: UnityAgentKitOperationRequest,
): Promise<UnityAgentKitPublicResult> {
  const response = await transport.invokeOperation(record.port, request);
  return response.ok
    ? mapEnvelopeToPublicResult(response.body, { record, request })
    : mapTransportFailureToPublicResult(response, request.operation, request.requestId);
}

function invalidEnvelopeResult(
  context: OperationEnvelopeContext,
  message: string,
  details?: Record<string, unknown>,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_editor",
    action: context.request.operation,
    operation: context.request.operation,
    requestId: context.request.requestId,
    hostId: context.record.hostId,
    hostEpoch: context.record.hostEpoch,
    summary: message,
    code: "host.invalid_envelope",
    message,
    diagnostics: [diagnostic("host.invalid_envelope", message, details)],
  });
}

function identityMismatchResult(
  context: OperationEnvelopeContext,
  message: string,
  details: Record<string, unknown>,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "lost",
    tool: "unity_editor",
    action: context.request.operation,
    operation: context.request.operation,
    requestId: context.request.requestId,
    hostId: context.record.hostId,
    hostEpoch: context.record.hostEpoch,
    summary: message,
    code: "host.identity_mismatch",
    message,
    diagnostics: [diagnostic("host.identity_mismatch", message, details)],
  });
}

function readOptionalPublicResultFields(envelope: Record<string, unknown>): Partial<UnityAgentKitPublicResult> {
  const fields: Partial<UnityAgentKitPublicResult> = {};
  for (const field of optionalPublicResultFields) {
    if (field in envelope) {
      fields[field] = envelope[field] as never;
    }
  }
  return fields;
}
```

Update `isTrustedEnvelope` return type so it retains the raw object for optional pass-through:

```ts
function isTrustedEnvelope(value: unknown): value is {
  raw: Record<string, unknown>;
  status: ReturnType<typeof readStatus>;
  operation: string;
  requestId: string;
  hostId: string;
  hostEpoch: number;
  summary: string;
  data?: unknown;
  diagnostics: UnityAgentKitDiagnostic[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  code?: string;
  message?: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  const status = readStatus(envelope.status);

  if (!(
    status !== null &&
    typeof envelope.operation === "string" &&
    envelope.operation.length > 0 &&
    typeof envelope.requestId === "string" &&
    envelope.requestId.length > 0 &&
    typeof envelope.hostId === "string" &&
    envelope.hostId.length > 0 &&
    typeof envelope.hostEpoch === "number" &&
    Number.isInteger(envelope.hostEpoch) &&
    typeof envelope.summary === "string" &&
    envelope.summary.length > 0 &&
    Array.isArray(envelope.diagnostics) &&
    envelope.diagnostics.every(isDiagnostic) &&
    typeof envelope.startedAt === "string" &&
    envelope.startedAt.length > 0 &&
    typeof envelope.completedAt === "string" &&
    envelope.completedAt.length > 0 &&
    typeof envelope.durationMs === "number" &&
    Number.isFinite(envelope.durationMs) &&
    (envelope.code === undefined || typeof envelope.code === "string") &&
    (envelope.message === undefined || typeof envelope.message === "string")
  )) {
    return false;
  }

  envelope.raw = envelope;
  return true;
}
```

If TypeScript rejects mutating `envelope.raw`, instead introduce a local `OperationEnvelope` interface and cast the object once after validation:

```ts
const trusted = envelope as OperationEnvelope;
trusted.raw = envelope;
return true;
```

Do not add validation for `resource` / `job` / `nextStep` internals.

- [x] **步骤 4：运行 TS tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含 `fail 0`，总测试数大于 60。

证明：该检查证明 TS operation envelope 不再信任 request/host mismatch，且 existing public-result optional fields 不再被 host mapping 丢弃。

- [x] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/http-client.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
fix: harden phase 5a host envelope trust

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 2：Unity dispatch atomic claim

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`

- [x] **步骤 1：编写失败的 claimed dispatch timeout race test**

在 `unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs` 中，放在 `ExpiredDispatchWorkDoesNotExecuteLater` 后面：

```csharp
[Test]
public void ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution()
{
    UnityAgentKitMainThread.ResetForTests();
    UnityAgentKitMainThread.RegisterDrain();
    UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(1000);
    UnityAgentKitOperationResponse response = null;
    var timeoutAttempted = false;
    var record = TestHostRecord(49245);

    try
    {
        UnityAgentKitMainThread.BeforeRunClaimedDispatchForTests = requestId =>
        {
            timeoutAttempted = UnityAgentKitMainThread.ForceDispatchTimeoutForTests(requestId);
        };

        UnityAgentKitMainThread.Enqueue(new UnityAgentKitOperationRequest
        {
            operation = "host.threadCheck",
            requestId = "req-claimed-race"
        }, record, completed => response = completed);

        UnityAgentKitMainThread.DrainForTests();

        Assert.IsTrue(timeoutAttempted == false, "Claimed dispatch must not be completed by timeout.");
        AssertOperationEnvelopeMinimumFields(response, "succeeded", "host.threadCheck", "req-claimed-race", record);
        Assert.AreEqual(0, UnityAgentKitMainThread.ExpiredDispatchExecutionCountForTests);
        Assert.AreEqual(0, UnityAgentKitMainThread.PendingDispatchCountForTests);
    }
    finally
    {
        UnityAgentKitMainThread.BeforeRunClaimedDispatchForTests = null;
        UnityAgentKitMainThread.ConfigureDispatchTimeoutForTests(250);
        UnityAgentKitMainThread.ResetForTests();
    }
}
```

- [x] **步骤 2：运行 Unity targeted test 验证 red**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ADispatchClaimRedResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution
```

本机可用命令：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ADispatchClaimRedResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution
```

预期：FAIL，compiler errors mention missing `UnityAgentKitMainThread.BeforeRunClaimedDispatchForTests` or `UnityAgentKitMainThread.ForceDispatchTimeoutForTests`.

证明：该 red 固化 claimed dispatch ownership 缺口。

- [x] **步骤 3：实现 atomic claim 与 deterministic timeout helper**

在 `UnityAgentKitMainThread.cs` 的 `PendingDispatch` 中新增 `claimed`：

```csharp
internal bool claimed;
```

在 static fields/test properties 附近新增 hook：

```csharp
internal static Action<string> BeforeRunClaimedDispatchForTests;
```

在 `ResetForTests` 中清理 hook：

```csharp
BeforeRunClaimedDispatchForTests = null;
```

新增 deterministic timeout helper：

```csharp
internal static bool ForceDispatchTimeoutForTests(string requestId)
{
    PendingDispatch item = null;
    lock (PendingLock)
    {
        for (var i = 0; i < PendingDispatches.Count; i += 1)
        {
            var candidate = PendingDispatches[i];
            var candidateRequestId = candidate.request != null ? candidate.request.requestId ?? string.Empty : string.Empty;
            if (candidateRequestId == (requestId ?? string.Empty))
            {
                item = candidate;
                break;
            }
        }
    }

    return item != null && TryComplete(item, UnityAgentKitOperationRouter.DispatchTimeout(item.request, item.record));
}
```

Replace `Drain()` with claim/remove-under-lock behavior:

```csharp
private static void Drain()
{
    while (true)
    {
        var item = TryClaimNextDispatch();
        if (item == null)
        {
            return;
        }

        BeforeRunClaimedDispatchForTests?.Invoke(item.request != null ? item.request.requestId ?? string.Empty : string.Empty);

        try
        {
            var response = UnityAgentKitOperationRouter.RunOnMainThread(item.request, item.record, _capturedMainThreadId);
            TryComplete(item, response, ownsItem: true);
        }
        catch (Exception error)
        {
            TryComplete(item, UnityAgentKitOperationRouter.DispatchException(item.request, item.record, error), ownsItem: true);
        }
    }
}

private static PendingDispatch TryClaimNextDispatch()
{
    lock (PendingLock)
    {
        for (var i = 0; i < PendingDispatches.Count; i += 1)
        {
            var item = PendingDispatches[i];
            if (item.holdForTimeout)
            {
                continue;
            }

            PendingDispatches.RemoveAt(i);
            item.claimed = true;
            return item;
        }
    }

    return null;
}
```

Update `TryComplete` so non-owner timeout cannot complete claimed work:

```csharp
private static bool TryComplete(PendingDispatch item, UnityAgentKitOperationResponse response, bool ownsItem = false)
{
    lock (PendingLock)
    {
        if (item.completed)
        {
            return false;
        }

        if (!ownsItem)
        {
            if (item.claimed)
            {
                return false;
            }

            if (!PendingDispatches.Remove(item))
            {
                if (item.cancelled)
                {
                    return false;
                }

                item.completed = true;
                return false;
            }
        }

        item.completed = true;
    }

    item.timeoutTimer?.Dispose();

    try
    {
        item.complete?.Invoke(response);
    }
    catch (Exception)
    {
    }

    return true;
}
```

Keep `Stop` behavior with `ownsItem: true` for copied pending dispatches.

- [x] **步骤 4：运行 targeted Unity test 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ADispatchClaimResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution
```

本机可用命令：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ADispatchClaimResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.ClaimedDispatchCannotBeCompletedByTimeoutBeforeExecution
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 claimed dispatch 不会被 timeout callback 抢先完成，避免 timeout 后仍执行的 race。

- [x] **步骤 5：运行现有 dispatch timeout tests 验证回归**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ADispatchTimeoutRegressionResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：该检查证明 existing `PendingDispatchTimeoutReturnsHostTimeout`、`PendingDispatchTimeoutDoesNotBlockMainThreadOrHandler`、`ExpiredDispatchWorkDoesNotExecuteLater`、stop/reload/quitting pending behavior 未回归。

- [x] **步骤 6：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "$(cat <<'EOF'
fix: claim unity dispatch work before execution

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 3：`/operations` body deadline + size limit

**文件：**
- 修改：`unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs`
- 修改：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`

- [x] **步骤 1：编写失败的 body bound tests**

在 `HostRuntimeDispatchTests.cs` 中，放在 `IncompleteAcceptedOperationBodyDoesNotBlockFinalClose` 后面：

```csharp
[Test]
public void OperationsRejectsContentLengthOverBodyLimit()
{
    var registryPath = TemporaryRegistryPath("operations-content-length-too-large");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var body = "{\"operation\":\"host.echo\",\"requestId\":\"req-too-large\",\"inputJson\":\"" + new string('x', UnityAgentKitLoopbackHttpServer.MaxOperationRequestBodyBytes) + "\"}";
        var result = Post(UnityAgentKitLoopbackHttpServer.BuildOperationsUrl(record.port), body);
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(400, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.operation", string.Empty, record);
        Assert.AreEqual("http.request_body_too_large", response.code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void OperationsRejectsBodyThatExceedsLimitWhileReading()
{
    var registryPath = TemporaryRegistryPath("operations-stream-too-large");

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        var result = PostChunkedOperationsBody(
            record.port,
            new string('x', UnityAgentKitLoopbackHttpServer.MaxOperationRequestBodyBytes + 1));
        var response = JsonUtility.FromJson<UnityAgentKitOperationResponse>(result.body);

        Assert.AreEqual(400, result.statusCode);
        AssertOperationEnvelopeMinimumFields(response, "failed", "host.operation", string.Empty, record);
        Assert.AreEqual("http.request_body_too_large", response.code);
    }
    finally
    {
        UnityAgentKitHost.ResetForTests();
    }
}

[Test]
public void SlowOperationBodyDoesNotBlockListenerClosePastDeadline()
{
    var registryPath = TemporaryRegistryPath("operations-slow-body-deadline");
    TcpClient client = null;

    try
    {
        var record = UnityAgentKitHost.StartForTests(registryPath);
        client = StartPartialOperationsPost(record.port, "{\"operation\":\"host.threadCheck\"", UnityAgentKitLoopbackHttpServer.MaxOperationRequestBodyBytes);

        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForAcceptedContextForTests(1000), "Expected listener to accept slow request.");
        UnityAgentKitHost.StopForTests("host.stopped");
        Assert.IsTrue(UnityAgentKitLoopbackHttpServer.WaitForListenerClosedForTests(UnityAgentKitLoopbackHttpServer.OperationRequestBodyDeadlineMs + 1000), "Expected slow body deadline to release listener close.");
        Assert.AreEqual(0, UnityAgentKitLoopbackHttpServer.AcceptReservationCountForTests);
        AssertProbeUnavailable(UnityAgentKitLoopbackHttpServer.BuildProbeUrl(record.port));
    }
    finally
    {
        client?.Close();
        UnityAgentKitHost.ResetForTests();
    }
}
```

Add helper near existing `StartPartialOperationsPost`:

```csharp
private static HttpResult PostChunkedOperationsBody(int port, string body)
{
    using (var client = new TcpClient("127.0.0.1", port))
    using (var stream = client.GetStream())
    {
        var header = "POST /operations HTTP/1.1\r\n" +
            "Host: 127.0.0.1:" + port + "\r\n" +
            "Content-Type: application/json; charset=utf-8\r\n" +
            "Transfer-Encoding: chunked\r\n" +
            "Connection: close\r\n\r\n";
        var headerBytes = Encoding.ASCII.GetBytes(header);
        stream.Write(headerBytes, 0, headerBytes.Length);

        var bodyBytes = Encoding.UTF8.GetBytes(body);
        var chunkHeader = Encoding.ASCII.GetBytes(bodyBytes.Length.ToString("x") + "\r\n");
        stream.Write(chunkHeader, 0, chunkHeader.Length);
        stream.Write(bodyBytes, 0, bodyBytes.Length);
        var chunkEnd = Encoding.ASCII.GetBytes("\r\n0\r\n\r\n");
        stream.Write(chunkEnd, 0, chunkEnd.Length);
        stream.Flush();

        return ReadRawHttpResponse(stream);
    }
}

private static HttpResult ReadRawHttpResponse(NetworkStream stream)
{
    using (var reader = new StreamReader(stream, Encoding.UTF8, false, 1024, leaveOpen: true))
    {
        var statusLine = reader.ReadLine();
        Assert.IsNotNull(statusLine, "Expected HTTP status line.");
        var parts = statusLine.Split(' ');
        var statusCode = int.Parse(parts[1]);
        string line;
        while (!string.IsNullOrEmpty(line = reader.ReadLine()))
        {
        }

        var body = reader.ReadToEnd();
        return new HttpResult
        {
            statusCode = statusCode,
            contentType = "application/json",
            body = body,
        };
    }
}
```

This helper proves cumulative read enforcement because chunked requests have no `ContentLength64` pre-check.

- [x] **步骤 2：运行 body bound tests 验证 red**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ABodyBoundsRedResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests.OperationsRejectsContentLengthOverBodyLimit
```

预期：FAIL，compiler errors mention missing `UnityAgentKitLoopbackHttpServer.MaxOperationRequestBodyBytes` or behavior returns existing non-400 result.

证明：该 red 证明当前 `/operations` body 没有 Phase 5A hardening bounds。

- [x] **步骤 3：实现 body read constants、result classification 和 oversized envelope**

在 `UnityAgentKitLoopbackHttpServer.cs` class 内新增 constants：

```csharp
internal const int MaxOperationRequestBodyBytes = 64 * 1024;
internal const int OperationRequestBodyDeadlineMs = 2000;
private const int RequestBodyChunkTimeoutMs = 250;
```

Replace `TryReadCompleteBody` with a result-returning helper:

```csharp
private enum BodyReadFailure
{
    None,
    TooLarge,
    Incomplete
}

private static bool TryReadCompleteBody(HttpListenerRequest request, out string body, out BodyReadFailure failure)
{
    body = string.Empty;
    failure = BodyReadFailure.None;
    var stream = request.InputStream;

    try
    {
        if (request.ContentLength64 > MaxOperationRequestBodyBytes)
        {
            failure = BodyReadFailure.TooLarge;
            CloseRequestInputStream(stream);
            return false;
        }

        body = ReadRequestBody(request, stream);
        return true;
    }
    catch (RequestBodyTooLargeException)
    {
        failure = BodyReadFailure.TooLarge;
        CloseRequestInputStream(stream);
        return false;
    }
    catch (IOException)
    {
        failure = BodyReadFailure.Incomplete;
        CloseRequestInputStream(stream);
        return false;
    }
    catch (ObjectDisposedException)
    {
        failure = BodyReadFailure.Incomplete;
        CloseRequestInputStream(stream);
        return false;
    }
    catch (NotSupportedException)
    {
        failure = BodyReadFailure.Incomplete;
        CloseRequestInputStream(stream);
        return false;
    }
    catch (InvalidOperationException)
    {
        failure = BodyReadFailure.Incomplete;
        CloseRequestInputStream(stream);
        return false;
    }
}
```

Add private exception and update `ReadRequestBody`:

```csharp
private sealed class RequestBodyTooLargeException : Exception
{
}

private static string ReadRequestBody(HttpListenerRequest request, Stream stream)
{
    using (var buffer = new MemoryStream())
    {
        var chunk = new byte[1024];
        var deadline = DateTimeOffset.UtcNow.AddMilliseconds(OperationRequestBodyDeadlineMs);
        while (true)
        {
            var remainingMs = (int)Math.Ceiling((deadline - DateTimeOffset.UtcNow).TotalMilliseconds);
            if (remainingMs <= 0)
            {
                throw new IOException("Timed out while reading request body.");
            }

            var timeoutMs = Math.Min(RequestBodyChunkTimeoutMs, remainingMs);
            var bytesRead = ReadChunkWithTimeout(stream, chunk, timeoutMs);
            if (bytesRead <= 0)
            {
                break;
            }

            if (buffer.Length + bytesRead > MaxOperationRequestBodyBytes)
            {
                throw new RequestBodyTooLargeException();
            }

            buffer.Write(chunk, 0, bytesRead);
        }

        return (request.ContentEncoding ?? Encoding.UTF8).GetString(buffer.ToArray());
    }
}
```

Update `HandleAcceptedOperationContext` to write structured 400 only for `TooLarge`:

```csharp
private static void HandleAcceptedOperationContext(HttpListenerContext context, ListenerState state, ref bool reservationHeld)
{
    var record = state != null ? state.record : null;
    string body;
    BodyReadFailure bodyReadFailure;
    if (!TryReadCompleteBody(context.Request, out body, out bodyReadFailure))
    {
        state.LeaveAcceptReservation();
        reservationHeld = false;
        if (bodyReadFailure == BodyReadFailure.TooLarge)
        {
            WriteJson(context.Response, 400, JsonUtility.ToJson(UnityAgentKitOperationRouter.RequestBodyTooLarge(record)));
        }
        else
        {
            AbortResponse(context.Response);
        }
        return;
    }

    AfterCompleteOperationBodyReadHookForTests?.Invoke();
    state.AdmitAcceptedOperationContext();
    reservationHeld = false;
    try
    {
        HandleReadableAcceptedOperation(context, state, body, record);
    }
    finally
    {
        state.ReleaseGuaranteedHandler();
    }
}
```

In `UnityAgentKitOperationRouter.cs`, add helper near existing HTTP failure helpers:

```csharp
internal static UnityAgentKitOperationResponse RequestBodyTooLarge(UnityAgentKitHostRecord record)
{
    return Failed("host.operation", string.Empty, record, "http.request_body_too_large", "Operation request body is too large.");
}
```

If this helper file is touched, include it in the task commit and final summary.

- [x] **步骤 4：运行 body bound targeted tests 验证通过**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5ABodyBoundsResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`，新增三个 body bound tests 通过。

证明：该检查证明 oversized body 被 structured 400 拒绝，slow/incomplete body 不会拖住 listener close 超过 deadline。

- [x] **步骤 5：Commit**

```bash
git add unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs
git commit -m "$(cat <<'EOF'
fix: bound unity operations request bodies

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 4：Docs / evidence sync

**文件：**
- 修改：`docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`
- 修改：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
- 修改：`docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
- 修改：`docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md`

- [x] **步骤 1：编写 docs check 并验证 red**

运行：

```bash
node --input-type=module - <<'NODE'
import { readFileSync } from 'node:fs';

const foldedWording = '5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03';
const hardeningText = [
  'Phase 5A Host Runtime hardening',
  'TS envelope trust boundary',
  'dispatch timeout claim race',
  'body read bounds',
  'optional result field preservation',
  'Phase 5A remains completed',
  'Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending',
];
const checks = [
  {
    file: 'docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md',
    required: [foldedWording, ...hardeningText],
    forbidden: ['5A-01 through 5A-08 completed'],
  },
  {
    file: 'docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md',
    required: [foldedWording, ...hardeningText],
    forbidden: [],
  },
  {
    file: 'docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md',
    required: [foldedWording, ...hardeningText, 'continue-5b'],
    forbidden: ['5A-01 through 5A-08 completed', 'Phase 5 completed', '/unity skill completed', 'public MCP tools completed'],
  },
  {
    file: 'docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md',
    required: ['Status: executed / completed', 'checklist retained as historical execution plan text'],
    forbidden: [],
  },
];

for (const { file, required, forbidden } of checks) {
  const text = readFileSync(file, 'utf8');
  for (const needle of required) {
    if (!text.includes(needle)) throw new Error(`${file} missing ${needle}`);
  }
  for (const needle of forbidden) {
    if (text.includes(needle)) throw new Error(`${file} still contains ${needle}`);
  }
}
console.log('PASS Phase 5A hardening docs');
NODE
```

预期：FAIL，至少缺少 `Phase 5A Host Runtime hardening` 或 folded wording。

证明：该 red 证明 docs 尚未记录 hardening evidence，且仍可能存在 misleading folded wording。

- [x] **步骤 2：更新 Phase 5 plan index**

在 `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md` 中：

1. 将 Phase 5A row 的 completion wording 改为包含：

```markdown
completed: 5A-01, 5A-02, 5A-03, 5A-05, 5A-06, 5A-07, and 5A-08 completed; 5A-04 folded into 5A-03; post-completion Host Runtime hardening evidence recorded before Phase 5B
```

2. 在 `## Phase 5A Completion Evidence` 后追加：

```markdown
## Phase 5A Host Runtime Hardening Evidence

Phase 5A remains completed. Phase 5A Host Runtime hardening was applied after completion and before Phase 5B to close review-found runtime gaps without implementing Phase 5B. Evidence covers TS envelope trust boundary, Unity dispatch timeout claim race, `/operations` body read bounds, optional result field preservation, and documentation cleanup.

Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
```

- [x] **步骤 3：更新 Phase 5A execution index**

在 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` 中 `## Phase 5A Completion Evidence` 后追加：

```markdown
## Phase 5A Host Runtime Hardening Evidence

Phase 5A remains completed. Post-completion hardening before Phase 5B covers:

- TS envelope trust boundary: operation, requestId, hostId, and hostEpoch must match the request and active host record before a Unity operation envelope is trusted.
- dispatch timeout claim race: main-thread dispatch work is atomically claimed before execution so timeout cannot also complete it.
- body read bounds: `/operations` request bodies are bounded by 64 KiB and a 2 second production deadline.
- optional result field preservation: existing public-result optional fields are opaque pass-through only, with no Phase 5B resource/job schema.
- documentation cleanup: folded 5A-04 wording is explicit.

Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
```

- [x] **步骤 4：更新 roadmap**

在 `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md` 中：

1. Current State 的 Phase 5A 段落增加 hardening 句子：

```markdown
Phase 5A Host Runtime hardening 已在 Phase 5A completed 后、Phase 5B 前记录：TS envelope trust boundary、dispatch timeout claim race、body read bounds、optional result field preservation 和 docs cleanup 已补强；Phase 5A remains completed。Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
```

2. Phase 5 `Implementation Summary` 追加同样 hardening summary，保持 `partial`。
3. Phase 5 `Verification Evidence` 追加 hardening evidence 命令摘要。
4. `## Change Log` 顶部追加：

```markdown
- 2026-05-22：记录 Phase 5A Host Runtime hardening，作为 Phase 5A completed 后、Phase 5B 前的补丁 evidence；覆盖 TS envelope trust boundary、Unity dispatch timeout claim race、`/operations` body read bounds、optional result field preservation 和 docs cleanup。Phase 5A remains completed；Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending。
```

5. 确认 Phase Summary 中 Phase 5 row 仍为 `partial | continue-5b`。

- [x] **步骤 5：更新 5A-08 plan 顶部 status note**

在 `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md` 标题后加入：

```markdown
> **Status:** executed / completed. This checklist is retained as historical execution plan text; current truth lives in `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`, `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md`, and `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`.
```

不要把整份历史 checklist 改成新实现计划。

- [x] **步骤 6：运行 docs check 验证通过**

运行任务 4 步骤 1 的 Node docs check。

预期：PASS，输出 `PASS Phase 5A hardening docs`。

证明：该检查证明 docs 已记录 hardening evidence、folded wording 不再误导、Phase 5A remains completed、Phase 5 remains incomplete / `continue-5b`。

- [x] **步骤 7：Commit**

```bash
git add docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md
git commit -m "$(cat <<'EOF'
docs: record phase 5a host runtime hardening evidence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 任务 5：Final verification gate

**文件：**
- 验证：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeTests.cs`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs`
- 验证：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`
- 验证：docs / roadmap / scope boundary

- [ ] **步骤 1：运行 TS evidence**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出 `fail 0`，总测试数大于 60。

证明：覆盖 TS envelope trust boundary、registry validation、rebind classification、timeout classification、MCP payload preservation 和 optional fields pass-through。

- [ ] **步骤 2：运行 Unity HostRuntime hardening/full suite evidence**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeHardeningResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

本机可用命令：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AHostRuntimeHardeningResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeTests
```

预期：PASS，XML 中 `failed="0"`。

证明：覆盖 Unity DTO、registry、lifecycle cleanup、HTTP protocol、main-thread dispatch、dispatch claim race、host-level timeout、body read bounds、stop/reload pending failure 和 result envelope behavior。

- [ ] **步骤 3：运行 Unity vertical smoke regression**

运行：

```bash
"${UNITY_EDITOR}" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

本机可用命令：

```bash
"D:/Program Files/Unity 2022.3.61f1/Editor/Unity.exe" -batchmode -projectPath unity -runTests -testPlatform EditMode -testResults unity/Library/UnityAgentKit/Phase5AVerticalSmokeResults.xml -testFilter UnityAgentKit.Editor.Tests.HostRuntimeVerticalSmokeTests
```

预期：PASS，XML 中 `total="1"`、`passed="1"`、`failed="0"`，`.ai-debug/unity-agent-kit/phase5a-vertical-smoke/node.stdout.log` 包含 `tests 1`、`pass 1`、`fail 0`。

证明：hardening 未破坏 Unity writes registry → TS reads registry → probe `/probe` → invoke `/operations` → main-thread `host.threadCheck` → MCP payload mapping → cleanup 的 live path。

- [ ] **步骤 4：运行 scope boundary check**

运行：

```bash
node --input-type=module - <<'NODE'
import { existsSync } from 'node:fs';
const required = [
  'plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts',
  'unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs',
];
const forbidden = [
  'plugins/unity-agent-kit/skills/unity.md',
  'plugins/unity-agent-kit/src/tools',
  'plugins/unity-agent-kit/src/mcp',
  'plugins/unity-agent-kit/src/actions',
];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`missing required evidence file: ${path}`);
}
for (const path of forbidden) {
  if (existsSync(path)) throw new Error(`out-of-scope hardening file exists: ${path}`);
}
console.log('PASS Phase 5A hardening scope boundary');
NODE
```

预期：PASS，输出 `PASS Phase 5A hardening scope boundary`。

证明：hardening 未实现 public MCP tools、`/unity` skill、Phase 5B workflow/resource/artifact/final E2E。

- [ ] **步骤 5：运行 docs check**

运行任务 4 步骤 1 的 docs check。

预期：PASS，输出 `PASS Phase 5A hardening docs`。

证明：docs 记录 hardening evidence，同时 Phase 5A remains completed，Phase 5 remains incomplete / `continue-5b`。

- [ ] **步骤 6：运行 diff whitespace check**

运行：

```bash
git diff --check
```

预期：PASS，无 whitespace error。CRLF normalization warnings 不算失败，但最终汇报中要注明。

- [ ] **步骤 7：最终汇报边界**

最终汇报必须包含：

```text
Phase 5A remains completed after post-completion Host Runtime hardening.
Phase 5 remains incomplete because Phase 5B-5E and final daily loop E2E remain pending.
No Phase 5B-5E, MCP public tools, /unity skill, workflow timeout, artifact/resource store, or final daily loop E2E were implemented.
```

- [ ] **步骤 8：Commit**

如果任务 1-4 已分别 commit，则本步骤只在有最终验证文档或 follow-up 修改时执行。否则创建合并 commit：

```bash
git add plugins/unity-agent-kit/src/host/http-client.ts plugins/unity-agent-kit/tests/host-runtime.test.ts unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitMainThread.cs unity/Assets/UnityAgentKit/Editor/Transport/UnityAgentKitLoopbackHttpServer.cs unity/Assets/UnityAgentKit/Editor/Operations/UnityAgentKitOperationRouter.cs unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeDispatchTests.cs docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5-plan-index.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-08-vertical-smoke-completion-evidence.md
git commit -m "$(cat <<'EOF'
fix: harden phase 5a host runtime boundary

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 自检结果

- **规格覆盖度:** 设计 1 由任务 1 覆盖；设计 2 由任务 2 覆盖；设计 3 由任务 3 覆盖；设计 4 由任务 4 覆盖；验证矩阵由任务 5 覆盖。
- **占位符扫描:** 未发现禁止占位表达；所有步骤都包含具体文件、代码、命令和预期结果。
- **类型一致性:** TS 使用现有 `UnityAgentKitHostRecord`、`UnityAgentKitOperationRequest`、`UnityAgentKitPublicResult`、`UnityAgentKitDiagnostic`；Unity 使用现有 `UnityAgentKitOperationResponse`、`UnityAgentKitLoopbackHttpServer`、`UnityAgentKitMainThread`、`HostRuntimeTests` partial class。
- **拆分检查:** 已记录；该 hardening 是单一 Phase 5B 前置 gate，拆成多个 plan 会分散 evidence。
- **上游约束覆盖:** Phase 5A remains completed、Phase 5 partial / `continue-5b`、no public tools、no `/unity` skill、no workflow/resource/artifact/final E2E 已进入上游约束和验证 gate。
- **参考输入映射:** 已说明采用内容、不采用内容、不采用原因和落地任务。
- **验证强度:** 行为任务使用 TS behavioral tests、Unity EditMode behavioral tests、Unity vertical smoke regression、scope/docs gates；存在性检查只用于 scope boundary，不作为 runtime 行为验收。

## 执行交接

计划执行时必须从任务 1 开始。任务 1-3 的 runtime 修复必须 red → green；任务 4 docs sync 必须先 red docs check 再更新；任务 5 全部通过前不得称 hardening 完成。Phase 5A 保持 completed；Phase 5 保持 incomplete / `continue-5b`。
