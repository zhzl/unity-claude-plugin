# Unity Agent Kit Phase 5A-07 TS Host Client Rebind Classification 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现 Phase 5A-07 TS non-live host client classification：strict registry validation、active probe validation、`/operations` invoke、bounded pre-operation rebind、in-flight no replay、post-response identity drift classification，以及 Unity envelope → public result foundation mapping。

**架构：** 新增 `plugins/unity-agent-kit/src/host/` 下四个小模块：`registry.ts` 读取和分类 registry，`transport.ts` 提供最小 Node HTTP transport seam，`http-client.ts` 只映射单个 trusted envelope，`rebind.ts` 拥有 operation lifecycle finalization。测试全部落在现有 `plugins/unity-agent-kit/tests/host-runtime.test.ts`，使用真实临时 registry 文件、本地 Node HTTP server 和可控 `HostTransport` adapter，不创建 live vertical smoke。

**技术栈：** TypeScript ESM、Node.js built-in test runner、Node built-in `fs/promises`、`http`、global `fetch` / `AbortController`、existing public result foundation。
**拆分检查：** 已检查；无需拆分。5A-07 是一个独立可验证的软件单元，范围限定为 TS non-live host client classification；live vertical smoke、Unity harness、Phase 5A completion evidence 留给 5A-08。

**Roadmap:** `docs/superpowers/roadmaps/2026-05-16-unity-agent-kit/ROADMAP.md`
**Phase:** Phase 5
**Spec:** `docs/superpowers/specs/2026-05-21-unity-agent-kit-phase-5a-07-ts-host-client-rebind-design.md`
**Contract:** `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md`
**Execution Index:** `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`
**Plan Card:** 5A-07 — TS registry/probe/invoke/rebind classification

---

## 执行权限说明

本计划包含 Commit 步骤。执行阶段只有在用户明确授权创建 commit 时才运行这些 Commit 步骤；若未授权，跳过 Commit 步骤，并在最终汇报中列出未提交的修改文件。

## 文件结构

- 创建：`plugins/unity-agent-kit/src/host/registry.ts` — registry DTO type、supported status/protocol constants、strict shape validation、missing-before/after-seen classification、diagnostic creation。
- 创建：`plugins/unity-agent-kit/src/host/transport.ts` — narrow `HostTransport` interface、Node HTTP implementation、low-level transport result classification only。
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts` — active probe validation、single trusted operation envelope validation、Unity envelope → `UnityAgentKitPublicResult` mapping。
- 创建：`plugins/unity-agent-kit/src/host/rebind.ts` — bounded pre-operation rebind、in-flight no replay、post-response registry identity drift override、diagnostic priority finalization。
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts` — extend existing TS host runtime tests with registry, transport, http-client, rebind, diagnostic-priority and scope-guard coverage。
- 不创建：`plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts`。
- 不创建：`unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs`。
- 不创建：MCP public tool registration code、tool registry/export wiring、public action dispatch wiring。

## 上游约束摘要

- **Roadmap Shared Constraints:** TS 负责 host binding、rebind handling、timeout/cancellation 分类、diagnostics convergence 和最终 status judgment；Unity C# host 只负责短主线程动作、状态读取、operation envelope 和 registry 写入。不把 long workflow orchestration 或 workflow timeout 移入 Unity C# host。
- **Phase Scope:** Phase 5A 建立 Host Runtime foundation。5A-07 覆盖 `5A-REG-03`、`5A-REBIND-01`、`5A-REBIND-02`、`5A-REBIND-03`、`5A-REBIND-04`、`5A-TIMEOUT-02`。
- **Phase Out-of-scope:** 不实现 public action business logic、artifact/resource store、workflow timeout、MCP server registration、`/unity` skill、live vertical smoke、Unity harness 或 final daily loop E2E。
- **Success Criteria:** TS tests 覆盖 strict registry validation、active probe validation、operation envelope mapping、bounded pre-operation rebind、in-flight no replay、post-response stale/lost classification、diagnostic priority、host-level timeout vs transport/request timeout vs workflow timeout out-of-scope，并通过 `node --experimental-strip-types --test tests/host-runtime.test.ts`。
- **用户确认事项:** 5A-07 strictly TS non-live；使用真实临时 registry 文件、本地 Node HTTP server、可控 `HostTransport` adapter；continuity failure 使用 public result `lost`；`transport.ts` 不承担 policy；`http-client.ts` 不做 lifecycle finalization；`rebind.ts` 拥有 final result；non-2xx HTTP status 映射为 `failed + host.http_status_failure`；supported host status 只含 `ready` / `not_ready`。
- **本计划不包含:** 不创建 `phase5a-vertical-smoke.test.ts`、不创建 `HostRuntimeVerticalSmokeTests.cs`、不修改 Unity C# host runtime、不注册 MCP public tools、不写 `/unity` skill、不实现 workflow timeout / polling / artifact / resource / final E2E、不把 Phase 5A 或 Phase 5 标记 completed。

## Phase 1-4 Compliance Matrix

| 上游 Phase | 适用约束 | 本计划如何满足 | 落地任务 | 验证 |
|---|---|---|---|---|
| Phase 1 | 单一 Unity C# host runtime；TS / Unity C# 边界清楚 | 只新增 TS host client；不复制 C# host，不修改 Unity runtime | 任务 1-5 | Scope guard 证明无 Unity vertical smoke / MCP public registration 文件 |
| Phase 2 | `/unity` 是薄路由和 recipe 指导层；实现逻辑留在 MCP tools / host client | 本计划不写 `/unity` skill，只提供 Phase 5E recipe 可依赖的 TS host foundation | 任务 5 | Scope guard 检查 `plugins/unity-agent-kit/skills/unity.md` 不存在 |
| Phase 3 | public result status / diagnostics / bounded schema | `http-client.ts` 映射 Unity envelope 到 existing public result foundation，unknown status fail closed | 任务 3-4 | TS tests 覆盖 envelope metadata、invalid envelope、unknown status |
| Phase 4 | workflow timeout 不在 5A；不能无证据报成功 | `host.request_timeout` 仅为 transport/request timeout，不产生 workflow polling/job evidence | 任务 2-5 | `transportRequestTimeoutDoesNotProduceWorkflowTimeoutEvidence` |

## 参考输入映射

| 参考输入 | 采用内容 | 不采用内容 | 不采用原因 | 落地任务 |
|---|---|---|---|---|
| `docs/superpowers/specs/2026-05-21-unity-agent-kit-phase-5a-07-ts-host-client-rebind-design.md` | 已批准的 5A-07 范围、四模块边界、diagnostic/status 映射、scope guards、测试名称 | 不扩大到 5A-08 live vertical smoke 或 5B+ workflow/resource/MCP scope | 5A-07 只交付 TS non-live client classification | 任务 1-5 |
| `docs/superpowers/plans/2026-05-18-unity-agent-kit-phase-5a-host-runtime.md` Contract Area 5 | strict registry validation、active probe validation、bounded pre-operation rebind、in-flight no replay、timeout classification、metadata preservation | `tests/phase5a-vertical-smoke.test.ts` creation | live-host vertical smoke 属于 5A-08 | 任务 1-5 |
| `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md` | 5A-07 requirement IDs、depends on completed 5A-03/5A-05/5A-06、5A-08 separation | 不把 Phase 5A status 改为 completed | 5A-08 final evidence 仍 pending | 任务 5 |
| `plugins/unity-agent-kit/src/contracts/result.ts` | `UnityAgentKitPublicResult`、`UnityAgentKitDiagnostic`、`isPublicResultStatus`、`definePublicResult` | 不新增 public result status | 5A-07 应复用既有 status set | 任务 3-4 |
| `plugins/unity-agent-kit/src/contracts/mcp-result.ts` | 确认 public result payload 由 5A-01 保留到 MCP result | 不做 MCP tool registration | 5A-07 只保证 Unity envelope → public result 不丢 metadata | 任务 3 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/discovery/host-registry.ts` | registry file read / classification 的底层思路 | v2 instanceId/epoch public contract | Unity Agent Kit 使用 `hostId + hostEpoch` 和新 DTO shape | 任务 1 |
| `references/unity-mcp-v2/plugins/unity-mcp-v2/src/client/http-client.ts` | active host probe、rebind/no-replay、specific error priority 的机制参考 | v2 public action surface、legacy compatibility、unbounded retry | 5A-07 只实现 bounded TS host client classification | 任务 2-4 |
| Unity C# constants in `UnityAgentKitHostRegistry` | `HostName = "Unity Agent Kit"`、`ProtocolVersion = "2026-05-19"`、`ready` / `not_ready` statuses | 不读取 C# files at runtime from TS | TS validation uses matching constants in code | 任务 1-3 |

## Quality Gate

| 对象 | 方案摘要 | 置信度 / 10 | 低于 7 分处理 |
|---|---|---:|---|
| Registry validation | Real temp files + injected read failure for unexpected fs errors | 9 | 只修 `registry.ts` 和 registry tests；不得进入 rebind work |
| Transport seam | `HostTransport` returns low-level results only; local Node HTTP server proves behavior | 8 | Remove policy from `transport.ts`; keep rebind/result logic in other modules |
| HTTP client mapping | Validate probe/envelope shape and preserve metadata across all main status paths | 8 | Add missing mapping tests before rebind work |
| Rebind finalization | Single pre-operation rebind, no replay after sent, post-response drift override | 8 | Keep logic in `rebind.ts`; do not duplicate registry reread in `http-client.ts` |
| Scope boundary | File guards + semantic MCP registration guard | 9 | Remove out-of-scope files/code before review |

## Subplan Completion Evidence

5A-07 completion evidence is TS non-live only:

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

Expected evidence groups:

- Registry: minimum host record, invalid JSON, invalid shape, invalid port, missing before/after seen, unexpected fs error, continuity identity.
- Transport/client: real local HTTP probe/invoke, unsupported status, non-2xx HTTP status failure, request timeout, transport unavailable, invalid envelope, unknown status fail closed.
- Rebind: pre-operation not_ready/stale/identity mismatch single rebind, no infinite retry, no replay after send, post-response drift stale/lost.
- Timeout layering: host-level timeout envelope preserved, transport/request timeout classified as `host.request_timeout`, workflow timeout evidence absent.
- Scope: no live vertical smoke files, no MCP public tool registration/export/action-dispatch wiring, no `/unity` skill.

## Roadmap Phase Upgrade Check

| 检查项 | 结论 | 说明 |
|---|---|---|
| independent roadmap goal? | no | 5A-07 是 Phase 5A Host Runtime foundation 内部 execution plan。 |
| cross-phase blocker/current-state needs? | no | Roadmap Current State already records 5A-06 completion and 5A-07 pending. |
| independently unlock Phase 6/7/8? | no | 5A-08 vertical smoke and Phase 5B-5E remain required. |
| singly satisfy Phase 5 success criteria? | no | No public MCP tools, `/unity` skill, resources, workflows or daily loop E2E. |
| remains Phase 5 internal subplan? | yes | No roadmap structural change. |

---

### 任务 1：Registry reader 和 strict validation

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/registry.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 registry tests**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 顶部替换 fs import，并新增 path/os imports：

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
```

在 existing imports 后新增：

```ts
import {
  continuityIdentity,
  readHostRegistry,
  supportedHostStatuses,
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
```

在 `samplePublicResult` helper 后新增：

```ts
function sampleHostRecord(overrides: Partial<UnityAgentKitHostRecord> = {}): UnityAgentKitHostRecord {
  return {
    hostName: UNITY_AGENT_KIT_HOST_NAME,
    protocolVersion: UNITY_AGENT_KIT_PROTOCOL_VERSION,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    hostId: "host-a",
    hostEpoch: 3,
    port: 49152,
    status: "ready",
    startedAt: "2026-05-21T10:00:00.000Z",
    lastProbeAt: "2026-05-21T10:00:01.000Z",
    ...overrides,
  };
}

async function withTempRegistry(testBody: (registryPath: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-registry-"));
  try {
    await testBody(path.join(root, "host.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
```

在 file end 新增 tests：

```ts
test("readHostRegistryAcceptsMinimumRecord", async () => {
  await withTempRegistry(async (registryPath) => {
    const record = sampleHostRecord();
    await writeFile(registryPath, JSON.stringify(record), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: record.projectRoot });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.record : undefined, record);
  });
});

test("readHostRegistryRejectsMissingFile", async () => {
  await withTempRegistry(async (registryPath) => {
    const result = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "missing_before_seen");
    assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_missing");
    assert.deepEqual(result.ok ? undefined : result.diagnostic.details, { classification: "missing_before_seen" });
  });
});

test("readHostRegistryRejectsInvalidJson", async () => {
  await withTempRegistry(async (registryPath) => {
    await writeFile(registryPath, "{ invalid json", "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_json");
    assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_invalid_json");
  });
});

test("readHostRegistryRejectsInvalidShape", async () => {
  await withTempRegistry(async (registryPath) => {
    await writeFile(registryPath, JSON.stringify({ ...sampleHostRecord(), hostId: "" }), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_shape");
    assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_invalid_shape");
  });
});

test("readHostRegistryRejectsInvalidPort", async () => {
  await withTempRegistry(async (registryPath) => {
    await writeFile(registryPath, JSON.stringify(sampleHostRecord({ port: 0 })), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_port");
    assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_invalid_port");
  });
});

test("readHostRegistryDistinguishesMissingBeforeAndAfterSeenRegistry", async () => {
  await withTempRegistry(async (registryPath) => {
    const beforeSeen = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });
    const afterSeen = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity", seenRegistry: true });

    assert.equal(beforeSeen.ok, false);
    assert.equal(beforeSeen.ok ? undefined : beforeSeen.reason, "missing_before_seen");
    assert.deepEqual(beforeSeen.ok ? undefined : beforeSeen.diagnostic.details, { classification: "missing_before_seen" });
    assert.equal(afterSeen.ok, false);
    assert.equal(afterSeen.ok ? undefined : afterSeen.reason, "missing_after_seen");
    assert.deepEqual(afterSeen.ok ? undefined : afterSeen.diagnostic.details, { classification: "missing_after_seen" });
  });
});

test("readHostRegistryClassifiesUnexpectedFsError", async () => {
  const result = await readHostRegistry("D:/not-readable/host.json", {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    readText: async () => {
      throw new Error("permission denied by test");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.reason, "unexpected_fs_error");
  assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_read_failed");
  assert.match(result.ok ? "" : result.diagnostic.message, /permission denied by test/);
});

test("continuityIdentityUsesHostIdAndHostEpoch", () => {
  assert.deepEqual(supportedHostStatuses, ["ready", "not_ready"]);
  assert.equal(continuityIdentity(sampleHostRecord({ hostId: "host-a", hostEpoch: 4 })), "host-a:4");
  assert.equal(continuityIdentity(sampleHostRecord({ hostId: "host-b", hostEpoch: 4 })), "host-b:4");
});
```

- [x] **步骤 2：运行 registry tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/host/registry.ts'` 或 missing exported symbol `readHostRegistry`。

- [x] **步骤 3：实现 registry reader 最少代码**

创建 `plugins/unity-agent-kit/src/host/registry.ts`：

```ts
import { readFile } from "node:fs/promises";
import { type UnityAgentKitDiagnostic } from "../contracts/result.ts";

export const UNITY_AGENT_KIT_HOST_NAME = "Unity Agent Kit";
export const UNITY_AGENT_KIT_PROTOCOL_VERSION = "2026-05-19";
export const supportedHostStatuses = ["ready", "not_ready"] as const;

export type UnityAgentKitHostStatus = (typeof supportedHostStatuses)[number];
export type HostRegistryFailureReason =
  | "missing_before_seen"
  | "missing_after_seen"
  | "invalid_json"
  | "invalid_shape"
  | "invalid_port"
  | "unexpected_fs_error";

export interface UnityAgentKitHostRecord {
  hostName: string;
  protocolVersion: string;
  projectRoot: string;
  hostId: string;
  hostEpoch: number;
  port: number;
  status: UnityAgentKitHostStatus;
  startedAt: string;
  lastProbeAt?: string;
}

export interface HostRegistryReadOptions {
  projectRoot: string;
  seenRegistry?: boolean;
  readText?: (filePath: string) => Promise<string>;
}

export type HostRegistryReadResult =
  | { ok: true; record: UnityAgentKitHostRecord }
  | { ok: false; reason: HostRegistryFailureReason; diagnostic: UnityAgentKitDiagnostic };

export function continuityIdentity(record: Pick<UnityAgentKitHostRecord, "hostId" | "hostEpoch">): string {
  return `${record.hostId}:${record.hostEpoch}`;
}

function diagnostic(code: string, message: string, details?: unknown): UnityAgentKitDiagnostic {
  return {
    source: "ts-host-client",
    severity: "error",
    code,
    message,
    details,
  };
}

function failure(reason: HostRegistryFailureReason, code: string, message: string, details?: unknown): HostRegistryReadResult {
  return { ok: false, reason, diagnostic: diagnostic(code, message, details) };
}

function isRecordShape(value: unknown, projectRoot: string): value is UnityAgentKitHostRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const lastProbeAtValid = record.lastProbeAt === undefined || typeof record.lastProbeAt === "string";

  return (
    record.hostName === UNITY_AGENT_KIT_HOST_NAME &&
    record.protocolVersion === UNITY_AGENT_KIT_PROTOCOL_VERSION &&
    record.projectRoot === projectRoot &&
    typeof record.hostId === "string" &&
    record.hostId.length > 0 &&
    Number.isInteger(record.hostEpoch) &&
    Number(record.hostEpoch) >= 0 &&
    typeof record.startedAt === "string" &&
    record.startedAt.length > 0 &&
    lastProbeAtValid &&
    (record.status === "ready" || record.status === "not_ready")
  );
}

export async function readHostRegistry(
  registryPath: string,
  options: HostRegistryReadOptions,
): Promise<HostRegistryReadResult> {
  const readText = options.readText ?? ((filePath: string) => readFile(filePath, "utf8"));
  let raw: string;

  try {
    raw = await readText(registryPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT") || message.includes("no such file") || message.includes("cannot find")) {
      const classification = options.seenRegistry ? "missing_after_seen" : "missing_before_seen";
      return failure(classification, "host.registry_missing", "Unity Agent Kit host registry is missing.", { classification });
    }

    return failure("unexpected_fs_error", "host.registry_read_failed", `Failed to read Unity Agent Kit host registry: ${message}`, {
      registryPath,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure("invalid_json", "host.registry_invalid_json", `Unity Agent Kit host registry JSON is invalid: ${message}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    return failure("invalid_shape", "host.registry_invalid_shape", "Unity Agent Kit host registry must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  if (!Number.isInteger(record.port) || Number(record.port) <= 0) {
    return failure("invalid_port", "host.registry_invalid_port", "Unity Agent Kit host registry port must be a positive integer.");
  }

  if (!isRecordShape(parsed, options.projectRoot)) {
    return failure("invalid_shape", "host.registry_invalid_shape", "Unity Agent Kit host registry shape is invalid.");
  }

  return { ok: true, record: parsed };
}
```

- [x] **步骤 4：运行 registry tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS。证明：registry reader 覆盖 minimum shape、invalid JSON/shape/port、missing before/after seen、unexpected fs error 和 `hostId + hostEpoch` continuity identity。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/registry.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: add ts host registry validation

Implement strict Unity Agent Kit host registry validation and stable failure classification for Phase 5A-07 rebind decisions.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 2：Transport seam 和 Node HTTP implementation

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/transport.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 transport tests**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 顶部新增 import：

```ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  createNodeHostTransport,
  type HostTransport,
  type HostTransportResult,
} from "../src/host/transport.ts";
```

在 helpers 后新增：

```ts
type TestRouteHandler = (request: IncomingMessage, response: ServerResponse) => void;

async function withHttpServer(handler: TestRouteHandler, testBody: (port: number) => Promise<void>): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  try {
    await testBody((address as { port: number }).port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const text = JSON.stringify(body);
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("content-length", Buffer.byteLength(text));
  response.end(text);
}
```

新增 tests：

```ts
test("nodeTransportProbeParsesJsonResponse", async () => {
  await withHttpServer((_request, response) => {
    writeJson(response, 200, sampleHostRecord());
  }, async (port) => {
    const transport = createNodeHostTransport({ timeoutMs: 250 });
    const result = await transport.probe(port);

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.body : undefined, sampleHostRecord());
  });
});

test("nodeTransportInvokePostsOperationRequest", async () => {
  await withHttpServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/operations");
      assert.deepEqual(JSON.parse(body), { operation: "host.echo", requestId: "req-1", inputJson: "{}" });
      writeJson(response, 200, { status: "succeeded", operation: "host.echo", requestId: "req-1", summary: "ok", diagnostics: [] });
    });
  }, async (port) => {
    const transport = createNodeHostTransport({ timeoutMs: 250 });
    const result = await transport.invokeOperation(port, { operation: "host.echo", requestId: "req-1", inputJson: "{}" });

    assert.equal(result.ok, true);
    assert.equal((result.ok ? result.body : {})["status"], "succeeded");
  });
});

test("nodeTransportClassifiesInvalidJsonResponse", async () => {
  await withHttpServer((_request, response) => {
    response.statusCode = 200;
    response.end("not-json");
  }, async (port) => {
    const transport = createNodeHostTransport({ timeoutMs: 250 });
    const result = await transport.probe(port);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_json_response");
  });
});

test("nodeTransportClassifiesHttpStatusFailure", async () => {
  await withHttpServer((_request, response) => {
    writeJson(response, 404, { status: "not_ready", code: "http.not_found", message: "No route." });
  }, async (port) => {
    const transport = createNodeHostTransport({ timeoutMs: 250 });
    const result = await transport.probe(port);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "http_status_failure");
    assert.equal(result.ok ? undefined : result.statusCode, 404);
    assert.match(result.ok ? "" : result.bodyText, /http.not_found/);
  });
});

test("nodeTransportClassifiesRequestTimeout", async () => {
  await withHttpServer((_request, _response) => {
    return;
  }, async (port) => {
    const transport = createNodeHostTransport({ timeoutMs: 25 });
    const result = await transport.probe(port);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "request_timeout");
  });
});

test("nodeTransportClassifiesTransportUnavailable", async () => {
  const transport = createNodeHostTransport({ timeoutMs: 50 });
  const result = await transport.probe(9);

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.reason, "transport_unavailable");
});
```

- [x] **步骤 2：运行 transport tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/host/transport.ts'` 或 missing export `createNodeHostTransport`。

- [x] **步骤 3：实现 transport seam 最少代码**

创建 `plugins/unity-agent-kit/src/host/transport.ts`：

```ts
export type HostTransportFailureReason =
  | "transport_unavailable"
  | "request_timeout"
  | "invalid_json_response"
  | "http_status_failure";

export interface UnityAgentKitOperationRequest {
  operation: string;
  requestId: string;
  inputJson?: string;
}

export type HostTransportResult =
  | { ok: true; statusCode: number; body: Record<string, unknown> }
  | { ok: false; reason: HostTransportFailureReason; statusCode?: number; bodyText?: string; message: string };

export interface HostTransport {
  probe(port: number): Promise<HostTransportResult>;
  invokeOperation(port: number, request: UnityAgentKitOperationRequest): Promise<HostTransportResult>;
}

export interface NodeHostTransportOptions {
  timeoutMs: number;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<HostTransportResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const bodyText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        reason: "http_status_failure",
        statusCode: response.status,
        bodyText,
        message: `HTTP ${response.status} from Unity Agent Kit host.`,
      };
    }

    try {
      const body = JSON.parse(bodyText) as Record<string, unknown>;
      return { ok: true, statusCode: response.status, body };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: "invalid_json_response", statusCode: response.status, bodyText, message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("aborted") || error instanceof DOMException) {
      return { ok: false, reason: "request_timeout", message: `Timed out after ${timeoutMs}ms.` };
    }

    return { ok: false, reason: "transport_unavailable", message };
  } finally {
    clearTimeout(timeout);
  }
}

export function createNodeHostTransport(options: NodeHostTransportOptions): HostTransport {
  return {
    probe(port: number) {
      return requestJson(`http://127.0.0.1:${port}/probe`, { method: "GET" }, options.timeoutMs);
    },
    invokeOperation(port: number, request: UnityAgentKitOperationRequest) {
      return requestJson(
        `http://127.0.0.1:${port}/operations`,
        {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(request),
        },
        options.timeoutMs,
      );
    },
  };
}
```

- [x] **步骤 4：运行 transport tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS。证明：`transport.ts` 只返回 low-level probe/invoke result、invalid JSON、non-2xx HTTP status、request timeout 和 transport unavailable，不判断 registry identity、rebind policy 或 public result status。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/transport.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: add ts host transport seam

Add a narrow Node HTTP transport for 5A-07 probe and operation calls while keeping retry, rebind, and result policy out of the transport layer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 3：HTTP client active validation 和 envelope mapping

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/http-client.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 http-client tests**

新增 import：

```ts
import {
  invokeOperationOnce,
  mapTransportFailureToPublicResult,
  probeActiveHost,
} from "../src/host/http-client.ts";
```

新增 helpers：

```ts
function succeededEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: "succeeded",
    operation: "host.echo",
    requestId: "req-echo",
    hostId: "host-a",
    hostEpoch: 3,
    summary: "Echo completed.",
    data: { echoed: true },
    diagnostics: [],
    startedAt: "2026-05-21T10:00:00.000Z",
    completedAt: "2026-05-21T10:00:00.010Z",
    durationMs: 10,
    code: "host.ok",
    message: "OK",
    ...overrides,
  };
}

function fakeTransport(result: HostTransportResult): HostTransport {
  return {
    async probe() {
      return result;
    },
    async invokeOperation() {
      return result;
    },
  };
}
```

新增 tests：

```ts
test("probeActiveHostValidatesRegistryAndProbeIdentity", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: record }));

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.record.hostId : undefined, "host-a");
});

test("probeActiveHostRejectsNotReadyProbe", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: { ...record, status: "not_ready", code: "host.not_ready", message: "Editor busy." } }));

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.not_ready");
});

test("probeActiveHostRejectsProtocolMismatch", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: { ...record, protocolVersion: "unsupported" } }));

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.protocol_mismatch");
});

test("probeActiveHostRejectsInvalidProbeShape", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: { status: "ready" } }));

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "failed");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.probe_invalid_shape");
});

test("probeActiveHostRejectsUnsupportedStatus", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: { ...record, status: "starting" } }));

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "failed");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.probe_invalid_shape");
});

test("probeActiveHostRejectsIdentityMismatchAfterSingleRebindFails", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: { ...record, hostId: "host-other" } }));

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.identity_mismatch");
});

test("invokeOperationMapsSucceededEnvelopeToPublicResult", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope() }), {
    operation: "host.echo",
    requestId: "req-echo",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.hostId, "host-a");
  assert.equal(result.hostEpoch, 3);
});

test("invokeOperationPreservesFailedRejectedLostAndTimeoutEnvelopeMetadata", async () => {
  const record = sampleHostRecord();
  for (const status of ["failed", "rejected", "lost", "timeout"] as const) {
    const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ status, code: `host.${status}`, message: `${status} message` }) }), {
      operation: "host.echo",
      requestId: `req-${status}`,
    });

    assert.equal(result.status, status);
    assert.equal(result.operation, "host.echo");
    assert.equal(result.hostId, "host-a");
    assert.equal(result.hostEpoch, 3);
    assert.equal(result.startedAt, "2026-05-21T10:00:00.000Z");
    assert.equal(result.completedAt, "2026-05-21T10:00:00.010Z");
    assert.equal(result.durationMs, 10);
    assert.equal(result.code, `host.${status}`);
    assert.equal(result.message, `${status} message`);
  }
});

test("invokeOperationMapsHostTimeoutEnvelopeToTimeoutResult", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ status: "timeout", code: "host.dispatch_timeout", diagnostics: [{ source: "unity-host", severity: "error", code: "host.dispatch_timeout", message: "deadline", details: { mayStillBeRunning: true } }] }) }), {
    operation: "host.pendingDispatchTimeout",
    requestId: "req-timeout",
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.code, "host.dispatch_timeout");
  assert.deepEqual(result.diagnostics[0].details, { mayStillBeRunning: true });
});

test("invokeOperationRejectsInvalidEnvelope", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: { status: "succeeded" } }), {
    operation: "host.echo",
    requestId: "req-invalid",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
});

test("invokeOperationFailsClosedOnUnknownStatus", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ status: "completed" }) }), {
    operation: "host.echo",
    requestId: "req-unknown",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
});

test("httpStatusFailureMapsToFailedDiagnostic", () => {
  const result = mapTransportFailureToPublicResult({ ok: false, reason: "http_status_failure", statusCode: 404, bodyText: "{\"code\":\"http.not_found\"}", message: "HTTP 404 from host." }, "host.echo", "req-http-status");

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.http_status_failure");
});

test("httpStatusFailureBodyIsOnlyDiagnosticEvidence", () => {
  const result = mapTransportFailureToPublicResult({ ok: false, reason: "http_status_failure", statusCode: 404, bodyText: "{\"status\":\"succeeded\"}", message: "HTTP 404 from host." }, "host.echo", "req-http-status-body");

  assert.equal(result.status, "failed");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.diagnostics[0].code, "host.http_status_failure");
  assert.deepEqual(result.diagnostics[0].details, { statusCode: 404, bodyText: "{\"status\":\"succeeded\"}" });
});
```

- [x] **步骤 2：运行 http-client tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/host/http-client.ts'` 或 missing export `invokeOperationOnce`。

- [x] **步骤 3：实现 http-client 最少代码**

创建 `plugins/unity-agent-kit/src/host/http-client.ts`：

```ts
import { definePublicResult, isPublicResultStatus, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { continuityIdentity, type UnityAgentKitHostRecord } from "./registry.ts";
import { type HostTransport, type HostTransportResult, type UnityAgentKitOperationRequest } from "./transport.ts";

export type ActiveProbeResult =
  | { ok: true; record: UnityAgentKitHostRecord; probe: Record<string, unknown> }
  | { ok: false; result: UnityAgentKitPublicResult };

function diagnostic(code: string, message: string, details?: unknown): UnityAgentKitDiagnostic {
  return { source: "ts-host-client", severity: "error", code, message, details };
}

function failure(status: UnityAgentKitPublicResult["status"], code: string, message: string, details?: unknown): UnityAgentKitPublicResult {
  return definePublicResult({ status, tool: "unity_editor", action: "host_runtime", summary: message, code, message, diagnostics: [diagnostic(code, message, details)] });
}

function validProbeShape(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const probe = value as Record<string, unknown>;
  return (
    typeof probe.hostId === "string" &&
    Number.isInteger(probe.hostEpoch) &&
    typeof probe.projectRoot === "string" &&
    typeof probe.protocolVersion === "string" &&
    Number.isInteger(probe.port) &&
    (probe.status === "ready" || probe.status === "not_ready")
  );
}

export async function probeActiveHost(record: UnityAgentKitHostRecord, transport: HostTransport): Promise<ActiveProbeResult> {
  const response = await transport.probe(record.port);
  if (!response.ok) {
    return { ok: false, result: mapTransportFailureToPublicResult(response, "host.probe", "probe") };
  }

  if (!validProbeShape(response.body)) {
    return { ok: false, result: failure("failed", "host.probe_invalid_shape", "Unity Agent Kit probe response shape is invalid.") };
  }

  if (response.body.status === "not_ready") {
    return { ok: false, result: failure("lost", "host.not_ready", String(response.body.message ?? "Unity Agent Kit host is not ready."), response.body) };
  }

  if (response.body.protocolVersion !== record.protocolVersion) {
    return {
      ok: false,
      result: failure("lost", "host.protocol_mismatch", "Unity Agent Kit probe protocol version does not match the TS client.", {
        registryProtocolVersion: record.protocolVersion,
        probeProtocolVersion: response.body.protocolVersion,
      }),
    };
  }

  const identityMatches =
    response.body.hostId === record.hostId &&
    response.body.hostEpoch === record.hostEpoch &&
    response.body.projectRoot === record.projectRoot &&
    response.body.port === record.port;

  if (!identityMatches) {
    return {
      ok: false,
      result: failure("lost", "host.identity_mismatch", "Unity Agent Kit probe identity does not match the registry record.", {
        registryIdentity: continuityIdentity(record),
        probeIdentity: `${String(response.body.hostId)}:${String(response.body.hostEpoch)}`,
      }),
    };
  }

  return { ok: true, record, probe: response.body };
}

function validEnvelope(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const envelope = value as Record<string, unknown>;
  return (
    typeof envelope.status === "string" &&
    typeof envelope.operation === "string" &&
    typeof envelope.requestId === "string" &&
    typeof envelope.hostId === "string" &&
    Number.isInteger(envelope.hostEpoch) &&
    typeof envelope.summary === "string" &&
    Array.isArray(envelope.diagnostics) &&
    typeof envelope.startedAt === "string" &&
    typeof envelope.completedAt === "string" &&
    typeof envelope.durationMs === "number"
  );
}

export function mapTransportFailureToPublicResult(
  transportFailure: Extract<HostTransportResult, { ok: false }>,
  operation: string,
  requestId: string,
): UnityAgentKitPublicResult {
  if (transportFailure.reason === "request_timeout") {
    return definePublicResult({
      status: "timeout",
      tool: "unity_editor",
      action: "host_runtime",
      operation,
      requestId,
      summary: "Unity Agent Kit host request timed out.",
      code: "host.request_timeout",
      message: transportFailure.message,
      diagnostics: [diagnostic("host.request_timeout", transportFailure.message)],
    });
  }

  if (transportFailure.reason === "http_status_failure") {
    return definePublicResult({
      status: "failed",
      tool: "unity_editor",
      action: "host_runtime",
      operation,
      requestId,
      summary: "Unity Agent Kit host returned an HTTP status failure.",
      code: "host.http_status_failure",
      message: transportFailure.message,
      diagnostics: [diagnostic("host.http_status_failure", transportFailure.message, { statusCode: transportFailure.statusCode, bodyText: transportFailure.bodyText })],
    });
  }

  const code = transportFailure.reason === "invalid_json_response" ? "host.invalid_envelope" : "host.transport_unavailable";
  const status = transportFailure.reason === "invalid_json_response" ? "failed" : "lost";
  return definePublicResult({
    status,
    tool: "unity_editor",
    action: "host_runtime",
    operation,
    requestId,
    summary: transportFailure.message,
    code,
    message: transportFailure.message,
    diagnostics: [diagnostic(code, transportFailure.message, { bodyText: transportFailure.bodyText })],
  });
}

export function mapEnvelopeToPublicResult(envelope: Record<string, unknown>): UnityAgentKitPublicResult {
  if (!validEnvelope(envelope) || !isPublicResultStatus(envelope.status)) {
    return failure("failed", "host.invalid_envelope", "Unity Agent Kit operation envelope is invalid.", envelope);
  }

  return definePublicResult({
    status: envelope.status,
    tool: "unity_editor",
    action: "host_runtime",
    operation: envelope.operation,
    requestId: envelope.requestId,
    hostId: envelope.hostId,
    hostEpoch: envelope.hostEpoch,
    summary: envelope.summary,
    data: envelope.data,
    diagnostics: envelope.diagnostics as UnityAgentKitDiagnostic[],
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    durationMs: envelope.durationMs,
    code: typeof envelope.code === "string" ? envelope.code : undefined,
    message: typeof envelope.message === "string" ? envelope.message : undefined,
    mayStillBeRunning: envelope.status === "timeout" ? true : undefined,
  });
}

export async function invokeOperationOnce(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
  request: UnityAgentKitOperationRequest,
): Promise<UnityAgentKitPublicResult> {
  const response = await transport.invokeOperation(record.port, request);
  if (!response.ok) {
    return mapTransportFailureToPublicResult(response, request.operation, request.requestId);
  }

  return mapEnvelopeToPublicResult(response.body);
}
```

- [x] **步骤 4：运行 http-client tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS。证明：active probe validation、supported status set、non-2xx HTTP status mapping、single trusted envelope mapping、metadata preservation、invalid envelope 和 unknown status fail-closed 均可观察。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/http-client.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: map unity host envelopes in ts client

Add TS active probe validation and single-envelope result mapping without moving lifecycle finalization into the HTTP client.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 4：Rebind lifecycle finalization 和 diagnostic priority

**文件：**
- 创建：`plugins/unity-agent-kit/src/host/rebind.ts`
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`

- [x] **步骤 1：编写失败的 rebind tests**

新增 import：

```ts
import { executeWithRebind, type RegistryReader } from "../src/host/rebind.ts";
```

新增 helpers：

```ts
function registrySequence(results: Awaited<ReturnType<typeof readHostRegistry>>[]): RegistryReader {
  const queue = [...results];
  return async () => {
    const next = queue.shift();
    assert.ok(next, "registry sequence exhausted");
    return next;
  };
}

function transportSequence(results: HostTransportResult[]): HostTransport {
  const probeResults = [...results];
  const invokeResults: HostTransportResult[] = [];
  return {
    async probe() {
      const next = probeResults.shift();
      assert.ok(next, "probe sequence exhausted");
      return next;
    },
    async invokeOperation() {
      const next = invokeResults.shift();
      assert.ok(next, "invoke sequence exhausted");
      return next;
    },
  };
}

function transportWithProbeAndInvoke(probes: HostTransportResult[], invokes: HostTransportResult[]): HostTransport {
  const probeQueue = [...probes];
  const invokeQueue = [...invokes];
  return {
    async probe() {
      const next = probeQueue.shift();
      assert.ok(next, "probe queue exhausted");
      return next;
    },
    async invokeOperation() {
      const next = invokeQueue.shift();
      assert.ok(next, "invoke queue exhausted");
      return next;
    },
  };
}
```

新增 tests：

```ts
test("preOperationProbeNotReadyAllowsSingleRebind", async () => {
  const first = sampleHostRecord({ hostId: "host-a", hostEpoch: 1 });
  const second = sampleHostRecord({ hostId: "host-b", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: first }, { ok: true, record: second }, { ok: true, record: second }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "busy" } },
      { ok: true, statusCode: 200, body: second },
    ], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-b", hostEpoch: 2 }) }]),
    request: { operation: "host.echo", requestId: "req-rebind-not-ready" },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-b");
});

test("preOperationIdentityMismatchAllowsSingleRebind", async () => {
  const first = sampleHostRecord({ hostId: "host-a", hostEpoch: 1 });
  const second = sampleHostRecord({ hostId: "host-b", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: first }, { ok: true, record: second }, { ok: true, record: second }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: { ...first, hostId: "other-host" } },
      { ok: true, statusCode: 200, body: second },
    ], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-b", hostEpoch: 2 }) }]),
    request: { operation: "host.echo", requestId: "req-rebind-identity" },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-b");
});

test("preOperationRebindDoesNotLoopIndefinitely", async () => {
  const first = sampleHostRecord({ hostId: "host-a", hostEpoch: 1 });
  const second = sampleHostRecord({ hostId: "host-b", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: first }, { ok: true, record: second }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "busy" } },
      { ok: true, statusCode: 200, body: { ...second, status: "not_ready", code: "host.not_ready", message: "still busy" } },
    ], []),
    request: { operation: "host.echo", requestId: "req-no-loop" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.not_ready");
});

test("inFlightOperationTransportFailureDoesNotReplay", async () => {
  const record = sampleHostRecord();
  let invokes = 0;
  const transport: HostTransport = {
    async probe() {
      return { ok: true, statusCode: 200, body: record };
    },
    async invokeOperation() {
      invokes += 1;
      return { ok: false, reason: "transport_unavailable", message: "socket closed" };
    },
  };

  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    readRegistry: registrySequence([{ ok: true, record }, { ok: true, record }]),
    transport,
    request: { operation: "host.echo", requestId: "req-no-replay" },
  });

  assert.equal(invokes, 1);
  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.transport_unavailable");
});

test("inFlightOperationFailureWithHostRestartDoesNotReplayToNewHost", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: false, reason: "transport_unavailable", message: "socket closed" }]),
    request: { operation: "host.echo", requestId: "req-restart-no-replay" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.restarted");
});

test("operationFailureRereadsRegistryOnlyForClassification", async () => {
  const record = sampleHostRecord();
  let readCount = 0;
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    readRegistry: async () => {
      readCount += 1;
      return { ok: true, record };
    },
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: record }], [{ ok: false, reason: "transport_unavailable", message: "socket closed" }]),
    request: { operation: "host.echo", requestId: "req-classify-only" },
  });

  assert.equal(readCount, 2);
  assert.equal(result.status, "lost");
});

test("httpClientMapsOnlyTrustedEnvelopeAndDoesNotFinalizeLifecycle", async () => {
  const record = sampleHostRecord({ hostId: "host-a", hostEpoch: 1 });
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-a", hostEpoch: 1 }) }), {
    operation: "host.echo",
    requestId: "req-trusted-only",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-a");
});

test("postResponseIdentityDriftReturnsStaleInstance", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-before", hostEpoch: 1 }) }]),
    request: { operation: "host.echo", requestId: "req-stale" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
});

test("postResponseMissingRegistryReturnsStaleInstance", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([
      { ok: true, record: before },
      { ok: false, reason: "missing_after_seen", diagnostic: { source: "ts-host-client", severity: "error", code: "host.registry_missing", message: "missing", details: { classification: "missing_after_seen" } } },
    ]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-before", hostEpoch: 1 }) }]),
    request: { operation: "host.echo", requestId: "req-stale-missing" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
});

test("oldHostSuccessEnvelopeIsNotCurrentSuccess", async () => {
  const before = sampleHostRecord({ hostId: "old-host", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "new-host", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "old-host", hostEpoch: 1 }) }]),
    request: { operation: "host.echo", requestId: "req-old-success" },
  });

  assert.notEqual(result.status, "succeeded");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
});
```

- [x] **步骤 2：运行 rebind tests 验证失败**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：FAIL，报错包含 `Cannot find module '../src/host/rebind.ts'` 或 missing export `executeWithRebind`。

- [x] **步骤 3：实现 rebind 最少代码**

创建 `plugins/unity-agent-kit/src/host/rebind.ts`：

```ts
import { definePublicResult, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { continuityIdentity, readHostRegistry, type HostRegistryReadResult, type UnityAgentKitHostRecord } from "./registry.ts";
import { invokeOperationOnce, probeActiveHost } from "./http-client.ts";
import { type HostTransport, type UnityAgentKitOperationRequest } from "./transport.ts";

export type RegistryReader = (registryPath: string, options: { projectRoot: string; seenRegistry?: boolean }) => Promise<HostRegistryReadResult>;

export interface ExecuteWithRebindOptions {
  registryPath: string;
  projectRoot: string;
  readRegistry?: RegistryReader;
  transport: HostTransport;
  request: UnityAgentKitOperationRequest;
}

function staleInstanceResult(mapped: UnityAgentKitPublicResult, details: Record<string, unknown>): UnityAgentKitPublicResult {
  return definePublicResult({
    ...mapped,
    status: "lost",
    summary: "Unity Agent Kit host identity changed before the operation result could be trusted.",
    code: "host.stale_instance",
    message: "Unity Agent Kit host identity changed before the operation result could be trusted.",
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Unity Agent Kit host identity changed before the operation result could be trusted.",
        details,
      },
    ],
  });
}

function restartedResult(mapped: UnityAgentKitPublicResult, before: UnityAgentKitHostRecord, after: UnityAgentKitHostRecord): UnityAgentKitPublicResult {
  return definePublicResult({
    ...mapped,
    status: "lost",
    summary: "Unity Agent Kit host restarted while the operation was in flight.",
    code: "host.restarted",
    message: "Unity Agent Kit host restarted while the operation was in flight.",
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.restarted",
        message: "Unity Agent Kit host restarted while the operation was in flight.",
        details: { previousIdentity: continuityIdentity(before), nextIdentity: continuityIdentity(after) },
      },
    ],
  });
}

async function readReadyRecord(
  registryPath: string,
  projectRoot: string,
  readRegistry: RegistryReader,
  transport: HostTransport,
): Promise<{ ok: true; record: UnityAgentKitHostRecord } | { ok: false; result: UnityAgentKitPublicResult }> {
  const first = await readRegistry(registryPath, { projectRoot });
  if (!first.ok) {
    return { ok: false, result: definePublicResult({ status: first.reason === "invalid_json" || first.reason === "invalid_shape" || first.reason === "invalid_port" || first.reason === "unexpected_fs_error" ? "failed" : "lost", tool: "unity_editor", action: "host_runtime", summary: first.diagnostic.message, code: first.diagnostic.code, message: first.diagnostic.message, diagnostics: [first.diagnostic] }) };
  }

  const firstProbe = await probeActiveHost(first.record, transport);
  if (firstProbe.ok) {
    return { ok: true, record: first.record };
  }

  const second = await readRegistry(registryPath, { projectRoot, seenRegistry: true });
  if (!second.ok) {
    return { ok: false, result: firstProbe.result };
  }

  const secondProbe = await probeActiveHost(second.record, transport);
  if (!secondProbe.ok) {
    const firstCode = firstProbe.result.diagnostics[0]?.code;
    const secondCode = secondProbe.result.diagnostics[0]?.code;
    if ((firstCode === "host.not_ready" || firstCode === "host.identity_mismatch") && secondCode === "host.transport_unavailable") {
      return { ok: false, result: firstProbe.result };
    }
    return { ok: false, result: secondProbe.result };
  }

  return { ok: true, record: second.record };
}

export async function executeWithRebind(options: ExecuteWithRebindOptions): Promise<UnityAgentKitPublicResult> {
  const readRegistry = options.readRegistry ?? readHostRegistry;
  const active = await readReadyRecord(options.registryPath, options.projectRoot, readRegistry, options.transport);
  if (!active.ok) {
    return active.result;
  }

  const mapped = await invokeOperationOnce(active.record, options.transport, options.request);
  const after = await readRegistry(options.registryPath, { projectRoot: options.projectRoot, seenRegistry: true });

  if (!after.ok) {
    if (after.reason === "missing_after_seen") {
      return staleInstanceResult(mapped, { previousIdentity: continuityIdentity(active.record), classification: "missing_after_seen" });
    }
    return mapped;
  }

  if (continuityIdentity(active.record) !== continuityIdentity(after.record)) {
    if (mapped.status === "lost" && mapped.diagnostics[0]?.code === "host.transport_unavailable") {
      return restartedResult(mapped, active.record, after.record);
    }

    return staleInstanceResult(mapped, { previousIdentity: continuityIdentity(active.record), nextIdentity: continuityIdentity(after.record) });
  }

  return mapped;
}
```

- [x] **步骤 4：运行 rebind tests 验证通过**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS。证明：pre-operation single rebind、identity mismatch rebind、no infinite retry、in-flight no replay、classification-only registry reread、post-response stale override 和 old-host success rejection 都可观察。

- [ ] **步骤 5：Commit**

```bash
git add plugins/unity-agent-kit/src/host/rebind.ts plugins/unity-agent-kit/tests/host-runtime.test.ts
git commit -m "$(cat <<'EOF'
feat: classify ts host rebind outcomes

Implement bounded pre-operation rebind, no-replay classification, and post-response stale host detection for the TS host client.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 任务 5：Final verification、scope guard 和 execution index sync

**文件：**
- 修改：`plugins/unity-agent-kit/tests/host-runtime.test.ts`
- 修改：`docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`

- [x] **步骤 1：补齐 diagnostic priority 和 scope guard tests**

在 `plugins/unity-agent-kit/tests/host-runtime.test.ts` 末尾新增：

```ts
test("preservesHostNotReadyOverTransportUnavailable", async () => {
  const record = sampleHostRecord();
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    readRegistry: registrySequence([{ ok: true, record }, { ok: true, record }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: { ...record, status: "not_ready", code: "host.not_ready", message: "busy" } },
      { ok: false, reason: "transport_unavailable", message: "connection refused" },
    ], []),
    request: { operation: "host.echo", requestId: "req-priority-not-ready" },
  });

  assert.equal(result.diagnostics[0].code, "host.not_ready");
});

test("preservesHostRestartedOverRegistryMissingAfterSeen", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: false, reason: "transport_unavailable", message: "socket closed" }]),
    request: { operation: "host.echo", requestId: "req-priority-restarted" },
  });

  assert.equal(result.diagnostics[0].code, "host.restarted");
});

test("preservesStaleInstanceOverGenericFailure", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([{ ok: true, statusCode: 200, body: before }], [{ ok: true, statusCode: 200, body: succeededEnvelope({ status: "failed", code: "host.dispatch_exception", message: "boom", hostId: "host-before", hostEpoch: 1 }) }]),
    request: { operation: "host.throw", requestId: "req-priority-stale" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
});

test("transportRequestTimeoutDoesNotProduceWorkflowTimeoutEvidence", () => {
  const result = mapTransportFailureToPublicResult({ ok: false, reason: "request_timeout", message: "Timed out after 25ms." }, "host.echo", "req-timeout-layer");

  assert.equal(result.status, "timeout");
  assert.equal(result.diagnostics[0].code, "host.request_timeout");
  assert.notEqual(result.code, "workflow.timeout");
  assert.equal(result.job, undefined);
  assert.equal(result.nextStep, undefined);
  assert.equal(result.metadata?.timeoutLayer, undefined);
});

test("phase5a07ScopeGuardDoesNotCreateVerticalSmokeOrMcpRegistration", async () => {
  const forbiddenPaths = [
    new URL("phase5a-vertical-smoke.test.ts", import.meta.url),
    new URL("../../../unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs", import.meta.url),
    new URL("../src/tools", import.meta.url),
    new URL("../skills/unity.md", import.meta.url),
  ];

  for (const forbiddenPath of forbiddenPaths) {
    await assert.rejects(readFile(forbiddenPath, "utf8"));
  }
});
```

- [x] **步骤 2：运行 final TS verification**

运行：

```bash
cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts
```

预期：PASS，输出包含 `fail 0`。证明：5A-07 的 registry、transport、http-client、rebind、priority、timeout-layering 和 scope guard 全部通过 TS non-live evidence。

- [x] **步骤 3：运行 textual scope guard**

运行：

```bash
python - <<'PY'
from pathlib import Path
forbidden_paths = [
    Path('plugins/unity-agent-kit/tests/phase5a-vertical-smoke.test.ts'),
    Path('unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs'),
    Path('plugins/unity-agent-kit/skills/unity.md'),
]
for path in forbidden_paths:
    if path.exists():
        raise SystemExit(f'forbidden path exists: {path}')
for path in Path('plugins/unity-agent-kit/src').rglob('*.ts'):
    text = path.read_text(encoding='utf-8')
    forbidden_terms = ['registerTool', 'public action dispatch', 'tool registry/export wiring']
    for term in forbidden_terms:
        if term in text:
            raise SystemExit(f'forbidden MCP registration term {term!r} in {path}')
print('PASS 5A-07 scope guard')
PY
```

预期：PASS，输出：

```text
PASS 5A-07 scope guard
```

证明：未创建 5A-08 vertical smoke、`/unity` skill 或 MCP public tool registration/export/action-dispatch wiring。

- [x] **步骤 4：更新 execution index 的 5A-07 completion facts**

仅在步骤 2 和步骤 3 都 PASS 后，修改 `docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md`：

```markdown
| 5A-07 | TS registry/probe/invoke/rebind classification | 5A-REG-03, 5A-REBIND-01, 5A-REBIND-02, 5A-REBIND-03, 5A-REBIND-04, 5A-TIMEOUT-02 | 5 | 5A-03, 5A-05, 5A-06 | `docs/superpowers/plans/2026-05-21-unity-agent-kit-phase-5a-07-ts-host-client-rebind.md` | completed |
```

Replace `Current Next Manual Action` with:

```markdown
Phase 5A-07 TS registry/probe/invoke/rebind classification has completed TS non-live implementation and verification. Evidence: `cd plugins/unity-agent-kit && node --experimental-strip-types --test tests/host-runtime.test.ts` passed with registry validation, active probe validation, operation envelope mapping, bounded pre-operation rebind, in-flight no replay, post-response stale classification, diagnostic priority, timeout layering, and scope guard coverage. Phase 5A and Phase 5 remain incomplete because 5A-08 vertical smoke + completion evidence is pending.

Next action: write and review the strict expanded execution plan for 5A-08 Vertical smoke + completion evidence, then choose an execution flow.

Do not execute this index or the technical contract.
```

- [x] **步骤 5：运行 diff 和 final status checks**

运行：

```bash
git diff --check
git status --short
```

预期：`git diff --check` 无输出；`git status --short` 仅列出 5A-07 TS host client files、`tests/host-runtime.test.ts` 和 execution index 的预期修改。证明：没有 whitespace error，没有 out-of-scope 文件。

- [ ] **步骤 6：Commit**

```bash
git add plugins/unity-agent-kit/src/host/registry.ts plugins/unity-agent-kit/src/host/transport.ts plugins/unity-agent-kit/src/host/http-client.ts plugins/unity-agent-kit/src/host/rebind.ts plugins/unity-agent-kit/tests/host-runtime.test.ts docs/superpowers/plans/2026-05-19-unity-agent-kit-phase-5a-execution-index.md
git commit -m "$(cat <<'EOF'
feat: classify ts host registry and rebind outcomes

Complete Phase 5A-07 TS host client classification for registry validation, active probe, operation invoke, bounded rebind, no-replay, stale continuity, and timeout layering.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## 最终自检清单

- 规格覆盖度：任务 1 覆盖 registry；任务 2 覆盖 transport；任务 3 覆盖 active probe + envelope mapping；任务 4 覆盖 rebind/no-replay/stale/priority；任务 5 覆盖 final verification、scope guard 和 execution index sync。
- 禁用词扫描：计划文本已检查，不包含未定实现标记或模糊补写指令。
- 类型一致性：`UnityAgentKitHostRecord`、`HostTransport`、`HostTransportResult`、`UnityAgentKitOperationRequest`、`executeWithRebind` 在任务 1-5 中命名一致。
- 拆分检查：计划头部已记录无需拆分；5A-08 live vertical smoke 不进入本计划。
- 上游约束覆盖：Roadmap、Phase 5A technical contract、execution index 和 reviewed spec 均映射到任务和验证。
- 参考输入映射：v2 registry/client references 只采用底层机制，不采用 public contract / legacy compatibility / unbounded retry。
- 验证强度：行为验收均通过 Node tests、local HTTP server、fake transport adapter 和 scope guard 证明，不只检查符号存在。
