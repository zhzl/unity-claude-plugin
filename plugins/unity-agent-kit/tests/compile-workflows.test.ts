import test from "node:test";
import assert from "node:assert/strict";
import {
  getCompileState,
  requestCompile,
  waitForCompileIdle,
  type CompileWorkflowOptions,
} from "../src/workflows/compile.ts";
import {
  compileRequestOperation,
  compileStateOperation,
  isCompileIdle,
  parseCompileRequestData,
  parseCompileStateData,
  type CompileRequestSnapshot,
  type CompileStateSnapshot,
} from "../src/diagnostics/compile.ts";
import {
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type HostRegistryReadResult,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
import type { HostTransport, HostTransportResult } from "../src/host/transport.ts";

function sampleHostRecord(overrides: Partial<UnityAgentKitHostRecord> = {}): UnityAgentKitHostRecord {
  return {
    hostName: UNITY_AGENT_KIT_HOST_NAME,
    protocolVersion: UNITY_AGENT_KIT_PROTOCOL_VERSION,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    hostId: "host-compile",
    hostEpoch: 7,
    port: 49300,
    status: "ready",
    startedAt: "2026-05-24T10:00:00.000Z",
    lastProbeAt: "2026-05-24T10:00:01.000Z",
    ...overrides,
  };
}

function compileState(overrides: Partial<CompileStateSnapshot> = {}): CompileStateSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    isCompiling: false,
    isUpdating: false,
    isIdle: true,
    invalidationToken: 3,
    hasRecentCompileReport: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function compileRequest(overrides: Partial<CompileRequestSnapshot> = {}): CompileRequestSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    requested: true,
    noOpReason: "",
    usedAssetDatabaseRefresh: true,
    usedCompilationPipeline: true,
    invalidationTokenBeforeRequest: 3,
    invalidationTokenAfterRequest: 4,
    isCompiling: false,
    isUpdating: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, operation: string, data: unknown, requestId: string): Record<string, unknown> {
  return {
    status: "succeeded",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: "Compile operation completed.",
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-24T10:00:00.000Z",
    completedAt: "2026-05-24T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: CompileWorkflowOptions["readRegistry"];
  assertConsumed(): void;
} {
  const queue = [...results];
  return {
    readRegistry: async () => {
      const next = queue.shift();
      assert.ok(next, "registry queue exhausted");
      return next;
    },
    assertConsumed() {
      assert.deepEqual(queue, []);
    },
  };
}

type ProbeExpectation = { port: number; result: HostTransportResult };
type InvokeExpectation = { port: number; operation: string; requestId: string; inputJson?: string; result: HostTransportResult };
type TransportHarness = { transport: HostTransport; assertConsumed(): void };

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): TransportHarness {
  const probeQueue = [...probes];
  const invokeQueue = [...invokes];
  return {
    transport: {
      async probe(port) {
        const next = probeQueue.shift();
        assert.ok(next, "probe queue exhausted");
        assert.equal(port, next.port);
        return next.result;
      },
      async invokeOperation(port, request) {
        const next = invokeQueue.shift();
        assert.ok(next, "invoke queue exhausted");
        assert.equal(port, next.port);
        assert.equal(request.operation, next.operation);
        assert.equal(request.requestId, next.requestId);
        if (next.inputJson !== undefined) {
          assert.equal(request.inputJson, next.inputJson);
        }
        return next.result;
      },
    },
    assertConsumed() {
      assert.deepEqual(probeQueue, []);
      assert.deepEqual(invokeQueue, []);
    },
  };
}

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: CompileWorkflowOptions["readRegistry"]): CompileWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
  };
}

function diagnosticCount(result: { diagnostics: { code?: string }[] }, code: string): number {
  return result.diagnostics.filter((diagnostic) => diagnostic.code === code).length;
}

test("parseCompileStateDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const state = compileState();

  assert.deepEqual(parseCompileStateData(JSON.stringify(state)), state);
  assert.equal(parseCompileStateData("not-json"), null);
  assert.equal(parseCompileStateData(JSON.stringify({ projectRoot: state.projectRoot })), null);
});

test("parseCompileRequestDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const request = compileRequest();

  assert.deepEqual(parseCompileRequestData(JSON.stringify(request)), request);
  assert.equal(parseCompileRequestData("not-json"), null);
  assert.equal(parseCompileRequestData(JSON.stringify({ requested: true })), null);
});

test("isCompileIdleUsesCompilingAndUpdatingOnly", () => {
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: false, isIdle: false })), true);
  assert.equal(isCompileIdle(compileState({ isCompiling: true, isUpdating: false, isIdle: true })), false);
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: true, isIdle: true })), false);
});

test("getCompileStateMapsTrustedHostEnvelopeToUnityCompileAction", async () => {
  const record = sampleHostRecord();
  const state = compileState();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-state", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, state, "req-state") } },
  ]);

  const result = await getCompileState(options(record, transport.transport, registry.readRegistry), { requestId: "req-state" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile");
  assert.equal(result.action, "get_state");
  assert.equal(result.operation, compileStateOperation);
  assert.deepEqual(result.data, state);
  assert.deepEqual(result.evidence, { completion: "state_snapshot", idle: true, verifiedCompileSuccess: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getCompileStateRejectsSnapshotProjectRootMismatch", async () => {
  const record = sampleHostRecord();
  const mismatched = compileState({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-state-root", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, mismatched, "req-state-root") } },
  ]);

  const result = await getCompileState(options(record, transport.transport, registry.readRegistry), { requestId: "req-state-root" });

  assert.equal(result.status, "failed");
  assert.equal(result.action, "get_state");
  assert.equal(result.diagnostics[0]?.code, "compile.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("requestCompileMapsAcceptedRequestWithoutClaimingCompileSuccess", async () => {
  const record = sampleHostRecord();
  const request = compileRequest();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const inputJson = JSON.stringify({ reason: "unit-test" });
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileRequestOperation, requestId: "req-compile", inputJson, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-compile") } },
  ]);

  const result = await requestCompile(options(record, transport.transport, registry.readRegistry), { requestId: "req-compile", reason: "unit-test" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile");
  assert.equal(result.action, "request");
  assert.deepEqual(result.evidence, { completion: "request_accepted", requested: true, verifiedCompileSuccess: false });
  assert.equal(result.data?.["requested"], true);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("requestCompileMapsBusyNoOpEvidence", async () => {
  const record = sampleHostRecord();
  const noOp = compileRequest({
    requested: false,
    noOpReason: "already_compiling_or_updating",
    usedAssetDatabaseRefresh: false,
    usedCompilationPipeline: false,
    invalidationTokenAfterRequest: 3,
    isCompiling: true,
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileRequestOperation, requestId: "req-compile-busy", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, noOp, "req-compile-busy") } },
  ]);

  const result = await requestCompile(options(record, transport.transport, registry.readRegistry), { requestId: "req-compile-busy" });

  assert.equal(result.status, "succeeded");
  assert.deepEqual(result.evidence, { completion: "no_op", requested: false, noOpReason: "already_compiling_or_updating", verifiedCompileSuccess: false });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getCompileStateRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49300 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49301 });
  const registry = registrySequence([{ ok: true, record: first }, { ok: true, record: rebound }, { ok: true, record: rebound }]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, operation: compileStateOperation, requestId: "req-rebound-state", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, compileStateOperation, compileState(), "req-rebound-state") } },
  ]);

  const result = await getCompileState({ registryPath: "ignored", projectRoot: first.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, { requestId: "req-rebound-state" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.equal(diagnosticCount(result, "host.rebound"), 1);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdlePollsUntilIdleWithoutVerifyingCompileSuccess", async () => {
  const record = sampleHostRecord();
  const busy = compileState({ isCompiling: true, isIdle: false });
  const idle = compileState();
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, busy, "req-idle-1") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-idle-2", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, idle, "req-idle-2") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-idle",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_for_idle");
  assert.deepEqual(result.evidence, { completion: "state_settled", idle: true, verifiedCompileSuccess: false });
  assert.deepEqual(sleeps, [25]);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdleStopsOnHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-lost-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(stale, compileStateOperation, compileState({ isCompiling: true, isIdle: false }), "req-lost-1") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-lost",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "wait_for_idle");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForCompileIdleReturnsReadStateTimeoutWithoutClaimingCompileFailure", async () => {
  const record = sampleHostRecord();
  const busy = compileState({ isUpdating: true, isIdle: false });
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-timeout-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, busy, "req-timeout-1") } },
  ]);

  const result = await waitForCompileIdle(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-timeout",
    timeoutMs: 0,
    pollIntervalMs: 25,
    sleep: async (ms) => { sleeps.push(ms); },
    now: (() => {
      const values = [0, 0];
      return () => values.shift() ?? 0;
    })(),
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_for_idle");
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});
