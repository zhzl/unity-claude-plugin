# Unity Agent Kit Phase 5A-01 TS Result + MCP Mapping Foundation 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建 Unity Agent Kit Phase 5A-01 的 TS package skeleton、public result foundation 和 MCP tool result mapping foundation。

**架构：** 在 `plugins/unity-agent-kit/` 创建最小 ESM TypeScript package，使用 Node built-in test runner 和 `--experimental-strip-types` 运行 TS 单测。`src/contracts/result.ts` 定义 Phase 5A public result status、diagnostic、evidence/resource/future workflow field preservation contract；`src/contracts/mcp-result.ts` 只把 public result 映射为 MCP tool result payload foundation，不注册 MCP tools，也不实现 host networking。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Node `assert/strict`、MCP tool result payload shape foundation。
**拆分检查：** 已检查；无需拆分。本计划只展开 execution index 中的 5A-01 plan card，覆盖 `5A-RESULT-01`、`5A-RESULT-02`、`5A-MCP-01`，不触碰 registry/probe/rebind/Unity host。计划包含 3 个 strict writing-plans 任务，未超过 Large Subplan Planning Protocol 的 sibling execution plan 范围。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Subplan:** Phase 5A
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-01 — TS result + MCP mapping foundation

---

## 提交策略

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 上游约束摘要

- **Roadmap Shared Constraints:** Unity Agent Kit 基于 `unity-mcp-v2` 演进；public MCP tools 与 internal operations 分离；TS 负责 workflow 编排、轮询、timeout、host rebind 和最终判定；Unity C# 负责短主线程动作、状态读取、job/report 记录；写操作不能无证据报成功；Unity C# host 不承担长阻塞 workflow。
- **Phase Scope:** Phase 5 覆盖高频日常闭环基础设施；Phase 5A 只建立 Host Runtime foundation。5A-01 只覆盖 TS result foundation 和 MCP payload mapping foundation。
- **Phase Out-of-scope:** 5A-01 不实现 Unity C# host、registry reader、loopback HTTP client、probe、`/operations` invocation、rebind、workflow timeout/polling、artifact/resource store、MCP public tool registration、`/unity` skill 或 5B-5E 能力。
- **Success Criteria:** `plugins/unity-agent-kit/package.json` 使用固定 TS test script；public result foundation 定义 `succeeded`、`failed`、`uncertain`、`cancelled`、`timeout`、`lost`、`rejected` 语义；diagnostics 保留 `source`、`severity`、`code`、`message`、`details`、`attribution`；MCP mapping 在 `structuredContent` 保留完整 public result，`content` 只输出 summary text，`isError = status !== "succeeded"`。
- **用户确认事项:** 新插件不做 v2 旧 public tools 兼容层；v2 正确实现应映射进 plan，不用弱 stub 代替；禁止把 workflow timeout 移入 Unity host；5A technical contract 不可直接执行，必须执行 expanded strict execution plan。
- **本计划不包含:** 不更新 Phase 5A completion evidence；不把 Phase 5A 或 Phase 5 标记 completed；不修改 Unity `Assets`；不把 v2 `accepted | completed | failed` 三态照搬为新 public result status；不采用 v2 `wrapContent(JSON.stringify(result))` 作为 MCP mapping。

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` | 采用 `5A-RESULT-01`、`5A-RESULT-02`、`5A-MCP-01` 的 status、diagnostic、MCP payload preservation contract；采用固定 test script `node --experimental-strip-types --test tests/host-runtime.test.ts` | 不执行 contract 中 5A-02 到 5A-08 的 Unity DTO、registry、HTTP、dispatch、rebind、vertical smoke 内容 | 5A-01 plan card 只覆盖 TS result + MCP mapping foundation | 任务 1-3 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 采用 5A-01 scope、requirement IDs、wave 1、无 depends_on | 不更改 5A-02 到 5A-08 的 wave 或 ownership | execution index 是 current-truth coverage map，5A-01 不重分配其他 requirement IDs | 任务 1-3 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/kernel/envelope.ts` | 采用 envelope 明确保留 `operation`、`requestId`、`summary`、`data`、`diagnostics` 的思路 | 不采用 `accepted | completed | failed` 作为新 public status enum | Phase 4/5 已批准新 public result enum：`succeeded | failed | uncertain | cancelled | timeout | lost | rejected` | 任务 1-2 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/mcp/action-tools.ts` | 采用 invalid envelope fail-closed、failure code 进入 diagnostics、测试覆盖 nested/result preservation 的思路 | 不采用 one-operation-one-tool handler 生成，不采用 nested v2 data envelope compatibility | 新插件 public MCP tools 与 internal operations 分离；5A-01 只定义 mapping foundation | 任务 2-3 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/mcp/server.ts` | 采用 MCP handler 返回 structured object 的边界意识 | 不采用 `wrapContent()` 只把完整 result JSON stringify 到 text content | 5A-MCP-01 要求 full public result 放在 `structuredContent`，`content` 只放 summary text，`isError` 由 status 推导 | 任务 3 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/client/http-client.ts` 与 `src/kernel/errors.ts` | 采用 `HOST_NOT_READY`、`HOST_RESTARTED`、`STALE_INSTANCE`、`TRANSPORT_UNAVAILABLE`、`REQUEST_TIMED_OUT` 等稳定错误分类作为 diagnostic code 命名参考 | 不实现 HTTP probe/invoke、pre-operation rebind、in-flight no replay 或 post-response stale instance 检查 | 这些属于 5A-07；5A-01 只保证 result payload 能保留这类 diagnostics | 任务 2-3 |

## 文件结构

- 创建：`plugins/unity-agent-kit/package.json` — 最小 TS package，固定 `test` 脚本为 `node --experimental-strip-types --test tests/host-runtime.test.ts`。
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts` — Phase 5A public result status semantics、diagnostic/resource/evidence/future workflow field foundation，以及 runtime guard。
- 创建：`plugins/unity-agent-kit/src/contracts/mcp-result.ts` — `mapPublicResultToMcpToolResult` foundation，输出 `structuredContent`、summary-only text `content` 和 `isError`。
- 创建：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — 非 live-host TS 单测，覆盖 package script、status semantics、diagnostic preservation、resource/evidence/future field preservation 和 MCP mapping。

## Plan Card Coverage

| Requirement ID | 覆盖任务 | 行为证据 |
|---|---|---|
| `5A-RESULT-01` | 任务 1、任务 2 | `publicResultFoundationDefinesPhase5AStatusSemantics` 证明 7 个 status 和 `isError` 语义；`definePublicResult` runtime guard 拒绝未知 status。 |
| `5A-RESULT-02` | 任务 2、任务 3 | `mapPublicResultPreservesDiagnosticsCodeAndAttribution` 和 `mapPublicResultPreservesFailureMetadata` 证明 diagnostics、code、message、details、attribution、host/request metadata 不被丢失。 |
| `5A-MCP-01` | 任务 3 | `mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence`、`mapPublicResultToMcpToolResultPreservesEnvelopeMetadata`、`mapPublicResultToMcpToolResultPreservesResourceReferences`、`nonSucceededStatusesMapToMcpErrors` 证明 structuredContent/full payload、envelope metadata preservation、summary-only content 和 `isError` rule。 |

## 任务 1：创建 TS package skeleton 和 status semantics foundation

**文件：**
- 创建：`plugins/unity-agent-kit/package.json`
- 创建：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 创建：`plugins/unity-agent-kit/src/contracts/result.ts`

- [x] **步骤 1：编写失败的 package script 与 status semantics 测试**

运行：

```bash
mkdir -p plugins/unity-agent-kit/tests plugins/unity-agent-kit/src/contracts && cat > plugins/unity-agent-kit/package.json <<'JSON'
{
  "name": "unity-agent-kit",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --experimental-strip-types --test tests/host-runtime.test.ts"
  }
}
JSON
cat > plugins/unity-agent-kit/tests/host-runtime.test.ts <<'TS'
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  publicResultStatuses,
  publicResultStatusSemantics,
  publicResultStatusToIsError,
} from "../src/contracts/result.ts";

test("packageJsonUsesStripTypesNodeTestScript", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("publicResultFoundationDefinesPhase5AStatusSemantics", () => {
  assert.deepEqual(publicResultStatuses, [
    "succeeded",
    "failed",
    "uncertain",
    "cancelled",
    "timeout",
    "lost",
    "rejected",
  ]);

  assert.equal(publicResultStatusToIsError("succeeded"), false);
  for (const status of ["failed", "uncertain", "cancelled", "timeout", "lost", "rejected"] as const) {
    assert.equal(publicResultStatusToIsError(status), true);
  }

  assert.match(publicResultStatusSemantics.succeeded.description, /complete success evidence/i);
  assert.match(publicResultStatusSemantics.timeout.description, /does not prove/i);
  assert.match(publicResultStatusSemantics.lost.description, /continuity/i);
  assert.match(publicResultStatusSemantics.rejected.description, /before execution/i);
});
TS
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，输出包含：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
src/contracts/result.ts
```

证明：该失败证明测试已经加载真实 TS module path，且 result foundation 尚未实现。

- [x] **步骤 3：编写最少 status semantics 实现**

创建 `plugins/unity-agent-kit/src/contracts/result.ts`：

```ts
export const publicResultStatuses = [
  "succeeded",
  "failed",
  "uncertain",
  "cancelled",
  "timeout",
  "lost",
  "rejected",
] as const;

export type PublicResultStatus = (typeof publicResultStatuses)[number];

export interface PublicResultStatusSemantic {
  isError: boolean;
  description: string;
}

export const publicResultStatusSemantics = {
  succeeded: {
    isError: false,
    description: "Operation has complete success evidence for the requested action.",
  },
  failed: {
    isError: true,
    description: "Operation has clear failure evidence.",
  },
  uncertain: {
    isError: true,
    description: "Available evidence cannot prove success or failure.",
  },
  cancelled: {
    isError: true,
    description: "Operation was cancelled before producing a successful result.",
  },
  timeout: {
    isError: true,
    description: "Timeout does not prove the Unity operation failed.",
  },
  lost: {
    isError: true,
    description: "Host continuity was lost before the result could be trusted.",
  },
  rejected: {
    isError: true,
    description: "Request was rejected before execution.",
  },
} as const satisfies Record<PublicResultStatus, PublicResultStatusSemantic>;

export function publicResultStatusToIsError(status: PublicResultStatus): boolean {
  return publicResultStatusSemantics[status].isError;
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含：

```text
# pass 2
# fail 0
```

证明：该检查证明 package script 固定为 5A technical contract 要求的 TS test command，并证明 5A public result foundation 的 7 个 status 及 `isError` 语义已落地。

- [x] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/package.json plugins/unity-agent-kit/tests/host-runtime.test.ts plugins/unity-agent-kit/src/contracts/result.ts
git commit -m "feat: add Unity Agent Kit result status foundation"
```

## 任务 2：补齐 public result diagnostics、metadata 和 future field preservation

**文件：**
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 修改：`plugins/unity-agent-kit/src/contracts/result.ts`

- [x] **步骤 1：编写失败的 public result preservation 测试**

将 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 替换为：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  definePublicResult,
  publicResultStatuses,
  publicResultStatusSemantics,
  publicResultStatusToIsError,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";

test("packageJsonUsesStripTypesNodeTestScript", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("publicResultFoundationDefinesPhase5AStatusSemantics", () => {
  assert.deepEqual(publicResultStatuses, [
    "succeeded",
    "failed",
    "uncertain",
    "cancelled",
    "timeout",
    "lost",
    "rejected",
  ]);

  assert.equal(publicResultStatusToIsError("succeeded"), false);
  for (const status of ["failed", "uncertain", "cancelled", "timeout", "lost", "rejected"] as const) {
    assert.equal(publicResultStatusToIsError(status), true);
  }

  assert.match(publicResultStatusSemantics.succeeded.description, /complete success evidence/i);
  assert.match(publicResultStatusSemantics.timeout.description, /does not prove/i);
  assert.match(publicResultStatusSemantics.lost.description, /continuity/i);
  assert.match(publicResultStatusSemantics.rejected.description, /before execution/i);
});

test("mapPublicResultPreservesDiagnosticsCodeAndAttribution", () => {
  const diagnostic = {
    source: "unity-host",
    severity: "error" as const,
    code: "host.dispatch_timeout",
    message: "Main-thread dispatch deadline expired.",
    details: { mayStillBeRunning: true, deadlineMs: 250 },
    attribution: { operation: "host.pendingDispatchTimeout", requestId: "req-timeout" },
  };

  const result = definePublicResult({
    status: "timeout",
    tool: "unity_editor",
    action: "wait_ready",
    summary: "Host-level dispatch timed out.",
    diagnostics: [diagnostic],
  });

  assert.deepEqual(result.diagnostics, [diagnostic]);
});

test("mapPublicResultPreservesFailureMetadata", () => {
  const result = definePublicResult({
    status: "lost",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: "compile.request",
    requestId: "req-compile-1",
    hostId: "host-before",
    hostEpoch: 7,
    summary: "Host restarted before the response could be trusted.",
    code: "host.stale_instance",
    message: "Host restarted before the response could be trusted.",
    data: { compilerMessagesSeen: false },
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Registry identity changed after response.",
        details: { previousHostId: "host-before", nextHostId: "host-after" },
        attribution: { operation: "compile.request", requestId: "req-compile-1" },
      },
    ],
    startedAt: "2026-05-19T10:00:00.000Z",
    completedAt: "2026-05-19T10:00:01.000Z",
    durationMs: 1000,
    metadata: { continuity: "old hostId / hostEpoch continuity is invalidated" },
  });

  assert.equal(result.operation, "compile.request");
  assert.equal(result.requestId, "req-compile-1");
  assert.equal(result.hostId, "host-before");
  assert.equal(result.hostEpoch, 7);
  assert.equal(result.code, "host.stale_instance");
  assert.equal(result.message, "Host restarted before the response could be trusted.");
  assert.deepEqual(result.data, { compilerMessagesSeen: false });
  assert.deepEqual(result.metadata, { continuity: "old hostId / hostEpoch continuity is invalidated" });
  assert.equal(result.durationMs, 1000);
});

test("definePublicResultRejectsUnknownStatus", () => {
  assert.throws(
    () =>
      definePublicResult({
        status: "completed",
        tool: "unity_compile",
        action: "request",
        summary: "v2 status should not pass as a public result status.",
        diagnostics: [],
      } as unknown as UnityAgentKitPublicResult),
    /Unknown public result status: completed/,
  );
});
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，输出包含：

```text
SyntaxError: The requested module '../src/contracts/result.ts' does not provide an export named 'definePublicResult'
```

证明：该失败证明新测试要求 runtime result guard 和 full public result shape，而任务 1 的 status-only implementation 尚未满足。

- [x] **步骤 3：编写 public result foundation 最少实现**

将 `plugins/unity-agent-kit/src/contracts/result.ts` 替换为：

```ts
export const publicResultStatuses = [
  "succeeded",
  "failed",
  "uncertain",
  "cancelled",
  "timeout",
  "lost",
  "rejected",
] as const;

export type PublicResultStatus = (typeof publicResultStatuses)[number];

export interface PublicResultStatusSemantic {
  isError: boolean;
  description: string;
}

export const publicResultStatusSemantics = {
  succeeded: {
    isError: false,
    description: "Operation has complete success evidence for the requested action.",
  },
  failed: {
    isError: true,
    description: "Operation has clear failure evidence.",
  },
  uncertain: {
    isError: true,
    description: "Available evidence cannot prove success or failure.",
  },
  cancelled: {
    isError: true,
    description: "Operation was cancelled before producing a successful result.",
  },
  timeout: {
    isError: true,
    description: "Timeout does not prove the Unity operation failed.",
  },
  lost: {
    isError: true,
    description: "Host continuity was lost before the result could be trusted.",
  },
  rejected: {
    isError: true,
    description: "Request was rejected before execution.",
  },
} as const satisfies Record<PublicResultStatus, PublicResultStatusSemantic>;

export type UnityAgentKitDiagnosticSeverity = "info" | "warning" | "error";

export interface UnityAgentKitDiagnostic {
  source: string;
  severity: UnityAgentKitDiagnosticSeverity;
  code?: string;
  message: string;
  details?: unknown;
  attribution?: unknown;
}

export interface UnityAgentKitResourceReference {
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UnityAgentKitJobReference {
  jobId: string;
  status?: string;
}

export interface UnityAgentKitNextStep {
  tool: string;
  action: string;
  reason: string;
}

export interface UnityAgentKitPublicResult {
  status: PublicResultStatus;
  tool: string;
  action: string;
  summary: string;
  code?: string;
  message?: string;
  operation?: string;
  requestId?: string;
  hostId?: string;
  hostEpoch?: number;
  data?: unknown;
  diagnostics: UnityAgentKitDiagnostic[];
  evidence?: unknown;
  resource?: UnityAgentKitResourceReference;
  resources?: UnityAgentKitResourceReference[];
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  job?: UnityAgentKitJobReference;
  nextStep?: UnityAgentKitNextStep;
  safeToRetry?: boolean;
  mayStillBeRunning?: boolean;
}

export function isPublicResultStatus(value: unknown): value is PublicResultStatus {
  return typeof value === "string" && (publicResultStatuses as readonly string[]).includes(value);
}

export function publicResultStatusToIsError(status: PublicResultStatus): boolean {
  return publicResultStatusSemantics[status].isError;
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const diagnostic = value as Partial<UnityAgentKitDiagnostic>;
  return (
    typeof diagnostic.source === "string" &&
    diagnostic.source.length > 0 &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    typeof diagnostic.message === "string" &&
    diagnostic.message.length > 0 &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string")
  );
}

export function definePublicResult(result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  if (!isPublicResultStatus(result.status)) {
    throw new Error(`Unknown public result status: ${String(result.status)}`);
  }
  if (!Array.isArray(result.diagnostics) || !result.diagnostics.every(isDiagnostic)) {
    throw new Error("Public result diagnostics must use the UnityAgentKitDiagnostic shape.");
  }
  return result;
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含：

```text
# pass 5
# fail 0
```

证明：该检查证明 public result foundation 不接受 v2 `completed` 作为新 public status，并且 diagnostics、failure metadata、host identity、timing、data、metadata 字段会被完整保留。

- [x] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/tests/host-runtime.test.ts plugins/unity-agent-kit/src/contracts/result.ts
git commit -m "feat: preserve Unity Agent Kit public result metadata"
```

## 任务 3：实现 MCP tool result mapping foundation

**文件：**
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 创建：`plugins/unity-agent-kit/src/contracts/mcp-result.ts`

- [x] **步骤 1：编写失败的 MCP mapping 测试**

将 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 替换为：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  definePublicResult,
  publicResultStatuses,
  publicResultStatusSemantics,
  publicResultStatusToIsError,
  type PublicResultStatus,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";

function samplePublicResult(overrides: Partial<UnityAgentKitPublicResult> = {}): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: "unity_editor",
    action: "get_status",
    summary: "Editor status read.",
    diagnostics: [],
    ...overrides,
  });
}

test("packageJsonUsesStripTypesNodeTestScript", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("publicResultFoundationDefinesPhase5AStatusSemantics", () => {
  assert.deepEqual(publicResultStatuses, [
    "succeeded",
    "failed",
    "uncertain",
    "cancelled",
    "timeout",
    "lost",
    "rejected",
  ]);

  assert.equal(publicResultStatusToIsError("succeeded"), false);
  for (const status of ["failed", "uncertain", "cancelled", "timeout", "lost", "rejected"] as const) {
    assert.equal(publicResultStatusToIsError(status), true);
  }

  assert.match(publicResultStatusSemantics.succeeded.description, /complete success evidence/i);
  assert.match(publicResultStatusSemantics.timeout.description, /does not prove/i);
  assert.match(publicResultStatusSemantics.lost.description, /continuity/i);
  assert.match(publicResultStatusSemantics.rejected.description, /before execution/i);
});

test("mapPublicResultPreservesDiagnosticsCodeAndAttribution", () => {
  const diagnostic = {
    source: "unity-host",
    severity: "error" as const,
    code: "host.dispatch_timeout",
    message: "Main-thread dispatch deadline expired.",
    details: { mayStillBeRunning: true, deadlineMs: 250 },
    attribution: { operation: "host.pendingDispatchTimeout", requestId: "req-timeout" },
  };

  const result = definePublicResult({
    status: "timeout",
    tool: "unity_editor",
    action: "wait_ready",
    summary: "Host-level dispatch timed out.",
    diagnostics: [diagnostic],
  });

  assert.deepEqual(result.diagnostics, [diagnostic]);
});

test("mapPublicResultPreservesFailureMetadata", () => {
  const result = definePublicResult({
    status: "lost",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: "compile.request",
    requestId: "req-compile-1",
    hostId: "host-before",
    hostEpoch: 7,
    summary: "Host restarted before the response could be trusted.",
    code: "host.stale_instance",
    message: "Host restarted before the response could be trusted.",
    data: { compilerMessagesSeen: false },
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Registry identity changed after response.",
        details: { previousHostId: "host-before", nextHostId: "host-after" },
        attribution: { operation: "compile.request", requestId: "req-compile-1" },
      },
    ],
    startedAt: "2026-05-19T10:00:00.000Z",
    completedAt: "2026-05-19T10:00:01.000Z",
    durationMs: 1000,
    metadata: { continuity: "old hostId / hostEpoch continuity is invalidated" },
  });

  assert.equal(result.operation, "compile.request");
  assert.equal(result.requestId, "req-compile-1");
  assert.equal(result.hostId, "host-before");
  assert.equal(result.hostEpoch, 7);
  assert.equal(result.code, "host.stale_instance");
  assert.equal(result.message, "Host restarted before the response could be trusted.");
  assert.deepEqual(result.data, { compilerMessagesSeen: false });
  assert.deepEqual(result.metadata, { continuity: "old hostId / hostEpoch continuity is invalidated" });
  assert.equal(result.durationMs, 1000);
});

test("definePublicResultRejectsUnknownStatus", () => {
  assert.throws(
    () =>
      definePublicResult({
        status: "completed",
        tool: "unity_compile",
        action: "request",
        summary: "v2 status should not pass as a public result status.",
        diagnostics: [],
      } as unknown as UnityAgentKitPublicResult),
    /Unknown public result status: completed/,
  );
});

test("mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence", () => {
  const publicResult = samplePublicResult({
    status: "failed",
    tool: "unity_compile",
    action: "compile_and_check",
    summary: "Compilation failed.",
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "compile.compiler_error",
        message: "Assembly-CSharp failed.",
        details: { file: "Assets/Scripts/Broken.cs", line: 12 },
        attribution: { phase: "compiler-messages" },
      },
    ],
    evidence: { compilerMessages: 1 },
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent, publicResult);
  assert.deepEqual(mapped.content, [{ type: "text", text: "Compilation failed." }]);
  assert.equal(mapped.isError, true);
  assert.doesNotMatch(mapped.content[0].text, /compile.compiler_error|compilerMessages|Assets\/Scripts\/Broken.cs/);
});

test("mapPublicResultToMcpToolResultPreservesEnvelopeMetadata", () => {
  const publicResult = samplePublicResult({
    status: "lost",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: "compile.request",
    requestId: "req-envelope-1",
    hostId: "host-envelope",
    hostEpoch: 12,
    summary: "Host identity changed after response.",
    code: "host.stale_instance",
    message: "Host identity changed after response.",
    data: { ok: false, compilerMessagesSeen: false },
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Registry identity changed after response.",
      },
    ],
    startedAt: "2026-05-19T10:00:00.000Z",
    completedAt: "2026-05-19T10:00:01.250Z",
    durationMs: 1250,
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.operation, "compile.request");
  assert.equal(mapped.structuredContent.requestId, "req-envelope-1");
  assert.equal(mapped.structuredContent.hostId, "host-envelope");
  assert.equal(mapped.structuredContent.hostEpoch, 12);
  assert.deepEqual(mapped.structuredContent.data, { ok: false, compilerMessagesSeen: false });
  assert.equal(mapped.structuredContent.startedAt, "2026-05-19T10:00:00.000Z");
  assert.equal(mapped.structuredContent.completedAt, "2026-05-19T10:00:01.250Z");
  assert.equal(mapped.structuredContent.durationMs, 1250);
  assert.equal(mapped.structuredContent.code, "host.stale_instance");
  assert.equal(mapped.structuredContent.message, "Host identity changed after response.");
});

test("mapPublicResultToMcpToolResultPreservesResourceReferences", () => {
  const publicResult = samplePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Screenshot captured.",
    resource: {
      uri: "unity://screenshots/shot-1",
      name: "shot-1.png",
      mimeType: "image/png",
      description: "Game View screenshot.",
      metadata: { artifactId: "shot-1" },
    },
    resources: [
      {
        uri: "unity://console-snapshots/console-1",
        name: "console-1.json",
        mimeType: "application/json",
      },
    ],
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.resource, publicResult.resource);
  assert.deepEqual(mapped.structuredContent.resources, publicResult.resources);
  assert.deepEqual(mapped.content, [{ type: "text", text: "Screenshot captured." }]);
  assert.equal(mapped.isError, false);
});

test("mapPublicResultPreservesFutureWorkflowFields", () => {
  const publicResult = samplePublicResult({
    status: "uncertain",
    tool: "unity_test",
    action: "run_and_verify",
    summary: "Test report collection is uncertain.",
    job: { jobId: "job-1", status: "running" },
    nextStep: {
      tool: "unity_test",
      action: "get_status",
      reason: "Poll the existing test job instead of starting another run.",
    },
    safeToRetry: false,
    mayStillBeRunning: true,
    metadata: { workflowOwner: "ts" },
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.job, { jobId: "job-1", status: "running" });
  assert.deepEqual(mapped.structuredContent.nextStep, publicResult.nextStep);
  assert.equal(mapped.structuredContent.safeToRetry, false);
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
  assert.deepEqual(mapped.structuredContent.metadata, { workflowOwner: "ts" });
});

test("publicResultMappingPreservesSafeToRetryAndNextStep", () => {
  const publicResult = samplePublicResult({
    status: "timeout",
    tool: "unity_playmode",
    action: "enter_and_verify",
    summary: "PlayMode verification timed out.",
    nextStep: {
      tool: "unity_playmode",
      action: "get_state",
      reason: "Read settled PlayMode state before deciding recovery.",
    },
    safeToRetry: false,
    mayStillBeRunning: true,
    diagnostics: [
      {
        source: "ts-workflow",
        severity: "warning",
        code: "host.request_timeout",
        message: "Request deadline expired while waiting for host response.",
      },
    ],
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.safeToRetry, false);
  assert.equal(mapped.structuredContent.nextStep?.action, "get_state");
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
  assert.equal(mapped.isError, true);
});

test("workflowTimeoutFieldsArePreservedButNotProducedBy5A", () => {
  const publicResult = samplePublicResult({
    status: "timeout",
    tool: "unity_editor",
    action: "wait_ready",
    summary: "Host-level dispatch timeout preserved.",
    metadata: { timeoutLayer: "host" },
    mayStillBeRunning: true,
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "host.dispatch_timeout",
        message: "Host-level dispatch timed out without proving operation failure.",
        details: { timeoutLayer: "host", mayStillBeRunning: true },
      },
    ],
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.metadata?.timeoutLayer, "host");
  assert.notEqual(mapped.structuredContent.metadata?.timeoutLayer, "workflow");
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
});

test("nonSucceededStatusesMapToMcpErrors", () => {
  const expected: Record<PublicResultStatus, boolean> = {
    succeeded: false,
    failed: true,
    uncertain: true,
    cancelled: true,
    timeout: true,
    lost: true,
    rejected: true,
  };

  for (const [status, isError] of Object.entries(expected) as Array<[PublicResultStatus, boolean]>) {
    const mapped = mapPublicResultToMcpToolResult(
      samplePublicResult({
        status,
        summary: `${status} summary`,
        diagnostics:
          status === "succeeded"
            ? []
            : [{ source: "ts-result", severity: "error", code: `result.${status}`, message: `${status} diagnostic` }],
      }),
    );

    assert.equal(mapped.isError, isError, status);
    assert.deepEqual(mapped.structuredContent.status, status);
    assert.deepEqual(mapped.content, [{ type: "text", text: `${status} summary` }]);
  }
});
```

- [x] **步骤 2：运行测试验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，输出包含：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
src/contracts/mcp-result.ts
```

证明：该失败证明 tests 已要求 MCP mapping module，而该 foundation 尚未实现。

- [x] **步骤 3：编写 `mapPublicResultToMcpToolResult` 最少实现**

创建 `plugins/unity-agent-kit/src/contracts/mcp-result.ts`：

```ts
import { publicResultStatusToIsError, type UnityAgentKitPublicResult } from "./result.ts";

export interface UnityAgentKitMcpTextContent {
  type: "text";
  text: string;
}

export interface UnityAgentKitMcpToolResult {
  structuredContent: UnityAgentKitPublicResult;
  content: UnityAgentKitMcpTextContent[];
  isError: boolean;
}

export function mapPublicResultToMcpToolResult(publicResult: UnityAgentKitPublicResult): UnityAgentKitMcpToolResult {
  return {
    structuredContent: publicResult,
    content: [{ type: "text", text: publicResult.summary }],
    isError: publicResultStatusToIsError(publicResult.status),
  };
}
```

- [x] **步骤 4：运行测试验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含：

```text
# pass 12
# fail 0
```

证明：该检查证明 MCP mapping foundation 保留完整 public result 于 `structuredContent`，`content` 只包含 summary text，resource/evidence/diagnostic/future fields 不丢失，并且所有非 `succeeded` status 都映射为 `isError: true`。

- [x] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/tests/host-runtime.test.ts plugins/unity-agent-kit/src/contracts/mcp-result.ts
git commit -m "feat: map Unity Agent Kit results to MCP payloads"
```

## 5A-01 Completion Evidence

执行完本 plan 后，记录以下 evidence；该 evidence 只完成 5A-01，不完成整个 Phase 5A：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期输出包含：

```text
# pass 12
# fail 0
```

Evidence groups：

- `5A-RESULT-01`：`publicResultFoundationDefinesPhase5AStatusSemantics` 证明 status enum 与 `isError` 语义。
- `5A-RESULT-02`：`mapPublicResultPreservesDiagnosticsCodeAndAttribution`、`mapPublicResultPreservesFailureMetadata`、`mapPublicResultPreservesFutureWorkflowFields` 证明 diagnostics、top-level `code` / `message`、metadata、failure context、future-safe fields 被完整保留。
- `5A-MCP-01`：`mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence`、`mapPublicResultToMcpToolResultPreservesEnvelopeMetadata`、`mapPublicResultToMcpToolResultPreservesResourceReferences`、`nonSucceededStatusesMapToMcpErrors` 证明 MCP payload preservation、envelope metadata preservation、summary-only content 和 `isError` status rule。

## Roadmap Phase Upgrade Check

| 检查项 | 结论 | 说明 |
|---|---|---|
| independent roadmap goal? | no | 5A-01 只是 Phase 5A execution plan set 的第一个 sibling execution plan。 |
| cross-phase blocker/current-state needs? | no | 5A-01 不改变 roadmap phase 结构，也不单独形成 blocker。 |
| independently unlock Phase 6/7/8? | no | 5A-01 只提供 result/MCP mapping foundation，不能单独解锁后续 phase。 |
| singly satisfy Phase 5A success criteria? | no | Phase 5A 还需要 5A-02 到 5A-08 的 Unity host、registry/probe/operations/rebind 和 vertical smoke evidence。 |
| remains Phase 5 internal execution plan? | yes | 继续受 Phase 5 plan index 与 Phase 5A execution index 管理。 |

## Plan-set Review Gate

在执行本 plan 前，先使用 `superpowers:reviewing-specs` 做 spec/plan consistency review。审查输入应包含：

```text
/superpowers:reviewing-specs docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-01-ts-result-mcp-mapping.md
```

审查时必须确认：

1. 本 plan 只覆盖 `5A-RESULT-01`、`5A-RESULT-02`、`5A-MCP-01`。
2. 本 plan 没有加入 registry/probe/rebind/Unity host/MCP tool registration 范围。
3. 每个行为任务都有具体失败测试、预期 FAIL、最小实现、预期 PASS、验证命令和 commit 步骤。
4. `content` 没有重新采用 v2 的 full JSON text wrapper；full payload 只作为 `structuredContent`。
5. `timeout`、`lost`、`rejected` 保持 public result 一等状态，并映射为 `isError: true`。
6. `code`、`message` 和 envelope metadata 在 public result 与 MCP `structuredContent` 中逐字段保留。

审查通过后，才将本 expanded plan 交给：

```text
/superpowers:subagent-driven-development docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-01-ts-result-mcp-mapping.md
```

## 自检记录

- **规格覆盖度：** `5A-RESULT-01`、`5A-RESULT-02`、`5A-MCP-01` 均映射到任务、测试名和 evidence group。
- **占位符扫描：** 本计划未使用 writing-plans 禁止的占位式措辞；每个任务步骤都包含具体文件、代码、命令、FAIL/PASS 预期和 evidence。
- **类型一致性：** `PublicResultStatus`、`UnityAgentKitDiagnostic`、`UnityAgentKitPublicResult`、`UnityAgentKitMcpToolResult`、`mapPublicResultToMcpToolResult` 在测试和实现步骤中命名一致。
- **拆分检查：** 本计划是 5A-01 plan card 的 expanded strict execution plan，包含 3 个任务，未触发第 9 个 sibling plan 或 nested batch plan。
- **上游约束覆盖：** Roadmap、5A technical contract、execution index、v2 reference mapping 和用户确认的 no legacy compatibility / no weak stub 规则均进入上游约束和参考输入映射。
- **参考输入映射：** 已说明 v2 envelope/action-tools/http-client/server 的采用内容、不采用内容、不采用原因和落地任务。
- **验证强度：** 行为任务验证 status semantics、diagnostic preservation、top-level `code` / `message` preservation、envelope metadata preservation、MCP payload preservation 和 `isError` rule，不只检查文件或符号存在。
