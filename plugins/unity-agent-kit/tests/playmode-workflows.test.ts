import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlayModeRequestData,
  parsePlayModeStateData,
  playModeEnterRequestOperation,
  playModeExitRequestOperation,
  playModeStateOperation,
  type PlayModeRequestResult,
  type PlayModeStateSnapshot,
} from "../src/diagnostics/playmode.ts";
import {
  enterPlayModeAndVerify,
  exitPlayModeAndVerify,
  getPlayModeState,
  type PlayModeWorkflowOptions,
} from "../src/workflows/playmode.ts";
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
    hostId: "host-playmode",
    hostEpoch: 7,
    port: 49510,
    status: "ready",
    startedAt: "2026-05-29T10:00:00.000Z",
    lastProbeAt: "2026-05-29T10:00:01.000Z",
    ...overrides,
  };
}

function stateSnapshot(overrides: Partial<PlayModeStateSnapshot> = {}): PlayModeStateSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-playmode",
    hostEpoch: 7,
    state: "editmode",
    stable: true,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: false,
    isPlayModeChanging: false,
    isCompiling: false,
    isUpdating: false,
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

function requestResult(overrides: Partial<PlayModeRequestResult> = {}): PlayModeRequestResult {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-playmode",
    hostEpoch: 7,
    targetState: "playmode",
    requested: true,
    noOp: false,
    noOpReason: "",
    stateBeforeRequest: stateSnapshot(),
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
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
    summary: `${operation} completed.`,
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-29T10:00:00.000Z",
    completedAt: "2026-05-29T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: PlayModeWorkflowOptions["readRegistry"];
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
type InvokeExpectation = { port: number; requestId: string; operation: string; inputJson?: string; result: HostTransportResult };

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): {
  transport: HostTransport;
  assertConsumed(): void;
} {
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
        assert.equal(request.requestId, next.requestId);
        assert.equal(request.operation, next.operation);
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

function options(record: UnityAgentKitHostRecord, transport: HostTransport, overrides: Partial<PlayModeWorkflowOptions> = {}): PlayModeWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: overrides.readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
    ...overrides,
  };
}

test("parser contracts accept editmode, playmode, and transitioning snapshots", () => {
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot())), stateSnapshot());
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  }))), stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  }));
  assert.deepEqual(parsePlayModeStateData(JSON.stringify(stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  }))), stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  }));
});

test("parser contracts reject invalid playmode state and request shapes", () => {
  assert.equal(parsePlayModeStateData("not-json"), null);
  assert.equal(parsePlayModeStateData(JSON.stringify({ state: "editmode" })), null);
  assert.equal(parsePlayModeStateData(JSON.stringify(stateSnapshot({ state: "bad" as PlayModeStateSnapshot["state"] }))), null);
  assert.equal(parsePlayModeRequestData("not-json"), null);
  assert.equal(parsePlayModeRequestData(JSON.stringify({ requested: true })), null);
  assert.equal(parsePlayModeRequestData(JSON.stringify(requestResult({ targetState: "bad" as PlayModeRequestResult["targetState"] }))), null);
});

test("getPlayModeState maps state snapshot without mutation", async () => {
  const record = sampleHostRecord();
  const snapshot = stateSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-playmode-state",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, snapshot, "req-playmode-state") },
    },
  ]);

  const result = await getPlayModeState(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-playmode-state",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_playmode");
  assert.equal(result.action, "get_state");
  assert.equal(result.operation, playModeStateOperation);
  assert.equal(result.data?.["state"], "editmode");
  assert.deepEqual(result.evidence, {
    completion: "state_snapshot",
    playModeState: "editmode",
    stable: true,
    mutation: "none",
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("enterPlayModeAndVerify succeeds as no-op when already stable PlayMode", async () => {
  const record = sampleHostRecord();
  const playmode = stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-enter-noop-state-1",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, playmode, "req-enter-noop-state-1") },
    },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-noop",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "enter_and_verify");
  assert.deepEqual(result.evidence, {
    completion: "state_settled",
    targetState: "playmode",
    request: "noop",
    initialState: "playmode",
    finalState: "playmode",
    stable: true,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("exitPlayModeAndVerify succeeds as no-op when already stable EditMode", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-exit-noop-state-1",
      operation: playModeStateOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-exit-noop-state-1") },
    },
  ]);

  const result = await exitPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-exit-noop",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "exit_and_verify");
  assert.equal(result.evidence?.["request"], "noop");
  assert.equal(result.evidence?.["finalState"], "editmode");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("enterPlayModeAndVerify requests enter and waits for stable PlayMode", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const transitioning = stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  });
  const playmode = stateSnapshot({
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const request = requestResult({
    targetState: "playmode",
    requested: true,
    noOp: false,
    stateBeforeRequest: editmode,
  });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-enter-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-state-1") } },
    { port: record.port, requestId: "req-enter-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-request") } },
    { port: record.port, requestId: "req-enter-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, transitioning, "req-enter-state-2") } },
    { port: record.port, requestId: "req-enter-state-3", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, playmode, "req-enter-state-3") } },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter",
    pollIntervalMs: 1,
    sleep: async () => {},
    now: (() => {
      let current = 1_000;
      return () => current++;
    })(),
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.data?.["state"], "playmode");
  assert.deepEqual(result.evidence, {
    completion: "state_settled",
    targetState: "playmode",
    request: "accepted",
    initialState: "editmode",
    finalState: "playmode",
    stable: true,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("enterPlayModeAndVerify timeout points nextStep to get_state", async () => {
  const record = sampleHostRecord();
  const editmode = stateSnapshot();
  const transitioning = stateSnapshot({
    state: "transitioning",
    stable: false,
    isPlaying: false,
    isPlayingOrWillChangePlaymode: true,
    isPlayModeChanging: true,
  });
  const request = requestResult({ targetState: "playmode", requested: true, noOp: false, stateBeforeRequest: editmode });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, requestId: "req-enter-timeout-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-timeout-state-1") } },
    { port: record.port, requestId: "req-enter-timeout-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-timeout-request") } },
    { port: record.port, requestId: "req-enter-timeout-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, transitioning, "req-enter-timeout-state-2") } },
  ]);
  const nowValues = [1_000, 1_000, 1_004, 1_006];

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-timeout",
    timeoutMs: 5,
    pollIntervalMs: 1,
    sleep: async () => {},
    now: () => nowValues.shift() ?? 1_006,
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.mayStillBeRunning, true);
  assert.equal(result.safeToRetry, false);
  assert.equal(result.nextStep?.kind, "read_state");
  assert.equal(result.nextStep?.tool, "unity_playmode");
  assert.equal(result.nextStep?.action, "get_state");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("enterPlayModeAndVerify does not succeed when host continuity changes after request", async () => {
  const record = sampleHostRecord();
  const reboundRecord = sampleHostRecord({ hostId: "host-rebound", hostEpoch: 8 });
  const editmode = stateSnapshot();
  const request = requestResult({ targetState: "playmode", requested: true, noOp: false, stateBeforeRequest: editmode });
  const reboundPlaymode = stateSnapshot({
    hostId: "host-rebound",
    hostEpoch: 8,
    state: "playmode",
    stable: true,
    isPlaying: true,
    isPlayingOrWillChangePlaymode: true,
  });
  const registry = registrySequence([
    { ok: true, record }, { ok: true, record },
    { ok: true, record }, { ok: true, record },
    { ok: true, reboundRecord }, { ok: true, reboundRecord },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: reboundRecord.port, result: { ok: true, statusCode: 200, body: reboundRecord } },
  ], [
    { port: record.port, requestId: "req-enter-lost-state-1", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeStateOperation, editmode, "req-enter-lost-state-1") } },
    { port: record.port, requestId: "req-enter-lost-request", operation: playModeEnterRequestOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(record, playModeEnterRequestOperation, request, "req-enter-lost-request") } },
    { port: reboundRecord.port, requestId: "req-enter-lost-state-2", operation: playModeStateOperation, result: { ok: true, statusCode: 200, body: succeededEnvelope(reboundRecord, playModeStateOperation, reboundPlaymode, "req-enter-lost-state-2") } },
  ]);

  const result = await enterPlayModeAndVerify(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-enter-lost",
    sleep: async () => {},
  });

  assert.equal(result.status, "lost");
  assert.equal(result.action, "enter_and_verify");
  assert.equal(result.code, "host.continuity_lost");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "host.continuity_lost"));
  registry.assertConsumed();
  transport.assertConsumed();
});
