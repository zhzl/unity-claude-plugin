import test from "node:test";
import assert from "node:assert/strict";
import {
  getEditorStatus,
  waitForEditorReady,
  type EditorWorkflowOptions,
} from "../src/workflows/editor.ts";
import {
  editorStatusOperation,
  isEditorReady,
  parseEditorStatusData,
  type EditorStatusSnapshot,
} from "../src/diagnostics/editor.ts";
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
    hostId: "host-editor",
    hostEpoch: 5,
    port: 49200,
    status: "ready",
    startedAt: "2026-05-23T10:00:00.000Z",
    lastProbeAt: "2026-05-23T10:00:01.000Z",
    ...overrides,
  };
}

function editorSnapshot(overrides: Partial<EditorStatusSnapshot> = {}): EditorStatusSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    isCompiling: false,
    isUpdating: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: false,
    isPlayModeChanging: false,
    isReady: true,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, snapshot: EditorStatusSnapshot, requestId: string): Record<string, unknown> {
  return {
    status: "succeeded",
    operation: editorStatusOperation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: "Editor status read.",
    data: JSON.stringify(snapshot),
    diagnostics: [],
    startedAt: "2026-05-23T10:00:00.000Z",
    completedAt: "2026-05-23T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: EditorWorkflowOptions["readRegistry"];
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

type ProbeExpectation = {
  port: number;
  result: HostTransportResult;
};

type InvokeExpectation = {
  port: number;
  requestId: string;
  result: HostTransportResult;
};

type TransportHarness = {
  transport: HostTransport;
  assertConsumed(): void;
};

function transportWithInvokesCapturingRequestIds(
  probes: ProbeExpectation[],
  invokes: InvokeExpectation[],
  requestIds: string[],
): TransportHarness {
  const harness = transportWithProbesAndInvokes(probes, invokes);
  return {
    transport: {
      ...harness.transport,
      async invokeOperation(port, request) {
        requestIds.push(request.requestId);
        return harness.transport.invokeOperation(port, request);
      },
    },
    assertConsumed: harness.assertConsumed,
  };
}

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
        assert.equal(request.operation, editorStatusOperation);
        assert.equal(request.requestId, next.requestId);
        return next.result;
      },
    },
    assertConsumed() {
      assert.deepEqual(probeQueue, []);
      assert.deepEqual(invokeQueue, []);
    },
  };
}

function options(record: UnityAgentKitHostRecord, transport: HostTransport, readRegistry?: EditorWorkflowOptions["readRegistry"]): EditorWorkflowOptions {
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

test("parseEditorStatusDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const snapshot = editorSnapshot();

  assert.deepEqual(parseEditorStatusData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseEditorStatusData("not-json"), null);
  assert.equal(parseEditorStatusData(JSON.stringify({ projectRoot: snapshot.projectRoot })), null);
});

test("isEditorReadyUsesCompileUpdateAndPlayModeTransitionOnly", () => {
  assert.equal(isEditorReady(editorSnapshot()), true);
  assert.equal(isEditorReady(editorSnapshot({ isCompiling: true, isReady: true })), false);
  assert.equal(isEditorReady(editorSnapshot({ isUpdating: true, isReady: true })), false);
  assert.equal(isEditorReady(editorSnapshot({ isPlayModeChanging: true, isReady: true })), false);
  assert.equal(isEditorReady(editorSnapshot({ isPlaying: true, isPlayingOrWillChangePlaymode: true, isReady: true })), true);
});

test("getEditorStatusMapsTrustedHostEnvelopeToUnityEditorAction", async () => {
  const record = sampleHostRecord();
  const snapshot = editorSnapshot();
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-editor-status", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-editor-status") } },
  ]);

  const result = await getEditorStatus(options(record, transport.transport, registry.readRegistry), { requestId: "req-editor-status" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_editor");
  assert.equal(result.action, "get_status");
  assert.equal(result.operation, editorStatusOperation);
  assert.deepEqual(result.data, snapshot);
  assert.deepEqual(result.evidence, { completion: "state_snapshot", ready: true });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getEditorStatusRejectsSnapshotProjectRootMismatch", async () => {
  const record = sampleHostRecord();
  const mismatched = editorSnapshot({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-root-mismatch", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, mismatched, "req-root-mismatch") } },
  ]);

  const result = await getEditorStatus(options(record, transport.transport, registry.readRegistry), { requestId: "req-root-mismatch" });

  assert.equal(result.status, "failed");
  assert.equal(result.action, "get_status");
  assert.equal(result.diagnostics[0]?.code, "editor.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getEditorStatusRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const snapshot = editorSnapshot();
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, requestId: "req-rebound", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, snapshot, "req-rebound") } },
  ]);

  const result = await getEditorStatus({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, { requestId: "req-rebound" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "host.rebound"));
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getEditorStatusAppendsRebindDiagnosticWhenRebindSucceedsBeforeFinalFailure", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const mismatched = editorSnapshot({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, requestId: "req-rebound-failed", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, mismatched, "req-rebound-failed") } },
  ]);

  const result = await getEditorStatus({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, { requestId: "req-rebound-failed" });

  assert.equal(result.status, "failed");
  assert.equal(result.hostId, "host-after");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "host.rebound"));
  assert.equal(result.diagnostics.at(-1)?.code, "editor.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getEditorStatusDoesNotAppendRebindDiagnosticWhenReboundProbeIsNotReady", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: { ...rebound, status: "not_ready", code: "host.not_ready", message: "Editor is still busy." } } },
  ], []);

  const result = await getEditorStatus({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, { requestId: "req-rebound-not-ready" });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0]?.code, "host.not_ready");
  assert.equal(diagnosticCount(result, "host.rebound"), 0);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("getEditorStatusPreservesHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-lost", result: { ok: true, statusCode: 200, body: succeededEnvelope(stale, editorSnapshot(), "req-lost") } },
  ]);

  const result = await getEditorStatus(options(record, transport.transport, registry.readRegistry), { requestId: "req-lost" });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "get_status");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyPollsUntilReadyWithoutMutatingPlayMode", async () => {
  const record = sampleHostRecord();
  const busy = editorSnapshot({ isCompiling: true, isReady: false });
  const ready = editorSnapshot();
  const sleeps: number[] = [];
  const requestIds: string[] = [];
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
    { ok: true, record },
    { ok: true, record },
  ]);

  const transport = transportWithInvokesCapturingRequestIds([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-ready-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-ready-1") } },
    { port: record.port, requestId: "req-ready-2", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, ready, "req-ready-2") } },
  ], requestIds);

  const result = await waitForEditorReady(options(
    record,
    transport.transport,
    registry.readRegistry,
  ), {
    requestId: "req-ready",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.evidence?.["completion"], "state_settled");
  assert.equal(result.evidence?.["playModeMutation"], "none");
  assert.deepEqual(requestIds, ["req-ready-1", "req-ready-2"]);
  assert.deepEqual(sleeps, [25]);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyCarriesRebindDiagnosticFromBusyPollToReadyResult", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const busy = editorSnapshot({ isCompiling: true, isReady: false });
  const ready = editorSnapshot();
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, requestId: "req-rebound-ready-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, busy, "req-rebound-ready-1") } },
    { port: rebound.port, requestId: "req-rebound-ready-2", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, ready, "req-rebound-ready-2") } },
  ]);

  const result = await waitForEditorReady({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, {
    requestId: "req-rebound-ready",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "wait_ready");
  assert.equal(diagnosticCount(result, "host.rebound"), 1);
  assert.deepEqual(sleeps, [25]);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyStopsOnHostContinuityFailure", async () => {
  const record = sampleHostRecord();
  const stale = sampleHostRecord({ hostId: "host-other" });
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-lost-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(stale, editorSnapshot({ isCompiling: true, isReady: false }), "req-lost-1") } },
  ]);

  const result = await waitForEditorReady(options(
    record,
    transport.transport,
    registry.readRegistry,
  ), {
    requestId: "req-lost",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyKeepsContinuityFailurePrimaryWhenCarryingRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const stale = sampleHostRecord({ hostId: "host-other", hostEpoch: 3, port: 49201 });
  const busy = editorSnapshot({ isCompiling: true, isReady: false });
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);

  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, requestId: "req-rebound-lost-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, busy, "req-rebound-lost-1") } },
    { port: rebound.port, requestId: "req-rebound-lost-2", result: { ok: true, statusCode: 200, body: succeededEnvelope(stale, busy, "req-rebound-lost-2") } },
  ]);

  const result = await waitForEditorReady({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, {
    requestId: "req-rebound-lost",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.diagnostics[0]?.code, "host.identity_mismatch");
  assert.equal(diagnosticCount(result, "host.rebound"), 1);
  assert.equal(result.diagnostics.at(-1)?.code, "host.rebound");
  assert.deepEqual(sleeps, [25]);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyCarriesRebindDiagnosticToTimeoutResult", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const busy = editorSnapshot({ isUpdating: true, isReady: false });
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Editor is busy." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: rebound.port, requestId: "req-rebound-timeout-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, busy, "req-rebound-timeout-1") } },
  ]);

  const result = await waitForEditorReady({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, {
    requestId: "req-rebound-timeout",
    timeoutMs: 0,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: (() => {
      const values = [0, 0];
      return () => values.shift() ?? 0;
    })(),
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_ready");
  assert.equal(diagnosticCount(result, "host.rebound"), 1);
  assert.equal(diagnosticCount(result, "workflow.timeout"), 1);
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyReturnsTimeoutImmediatelyAfterFirstBusyStatusAtDeadline", async () => {
  const record = sampleHostRecord();
  const busy = editorSnapshot({ isUpdating: true, isReady: false });
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-timeout-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-timeout-1") } },
  ]);

  const result = await waitForEditorReady(options(
    record,
    transport.transport,
    registry.readRegistry,
  ), {
    requestId: "req-timeout",
    timeoutMs: 0,
    pollIntervalMs: 25,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: (() => {
      const values = [0, 0];
      return () => values.shift() ?? 0;
    })(),
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("waitForEditorReadyClampsSleepAndTimesOutWithoutSecondStatusRead", async () => {
  const record = sampleHostRecord();
  const busy = editorSnapshot({ isUpdating: true, isReady: false });
  const sleeps: number[] = [];
  const registry = registrySequence([
    { ok: true, record },
    { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-clamped-timeout-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, busy, "req-clamped-timeout-1") } },
  ]);
  let currentTime = 90;
  let deadlineInitialized = false;

  const result = await waitForEditorReady(options(
    record,
    transport.transport,
    registry.readRegistry,
  ), {
    requestId: "req-clamped-timeout",
    timeoutMs: 100,
    pollIntervalMs: 500,
    sleep: async (ms) => {
      sleeps.push(ms);
      currentTime += ms;
    },
    now: () => {
      if (!deadlineInitialized) {
        deadlineInitialized = true;
        return 0;
      }
      return currentTime;
    },
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "wait_ready");
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.safeToRetry, true);
  assert.equal(result.mayStillBeRunning, false);
  assert.deepEqual(sleeps, [10]);
  registry.assertConsumed();
  transport.assertConsumed();
});
