import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlayModeRequestData,
  parsePlayModeStateData,
  playModeStateOperation,
  type PlayModeRequestResult,
  type PlayModeStateSnapshot,
} from "../src/diagnostics/playmode.ts";
import { getPlayModeState, type PlayModeWorkflowOptions } from "../src/workflows/playmode.ts";
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
