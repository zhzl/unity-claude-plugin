import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  clearConsole,
  countConsole,
  snapshotConsole,
  type ConsoleWorkflowOptions,
} from "../src/workflows/console.ts";
import {
  consoleClearOperation,
  consoleCountOperation,
  consoleSnapshotOperation,
  parseConsoleClearData,
  parseConsoleCountData,
  parseConsoleSnapshotData,
  validateConsoleCursor,
  type ConsoleClearSnapshot,
  type ConsoleCountSnapshot,
  type ConsoleCursor,
  type ConsoleSnapshotSummary,
} from "../src/diagnostics/console.ts";
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
    hostId: "host-console",
    hostEpoch: 12,
    port: 49200,
    status: "ready",
    startedAt: "2026-05-27T09:00:00.000Z",
    lastProbeAt: "2026-05-27T09:00:01.000Z",
    ...overrides,
  };
}

function cursor(overrides: Partial<ConsoleCursor> = {}): ConsoleCursor {
  return {
    hostId: "host-console",
    hostEpoch: 12,
    generation: 41,
    startIndex: 120,
    createdAt: "2026-05-27T09:00:02.000Z",
    ...overrides,
  };
}

function countSnapshot(overrides: Partial<ConsoleCountSnapshot> = {}): ConsoleCountSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    totalCount: 250,
    boundedCount: 200,
    truncated: true,
    severityBreakdown: {
      error: 12,
      warning: 40,
      log: 148,
      partial: true,
    },
    cursor: cursor(),
    capturedAt: "2026-05-27T09:00:03.000Z",
    ...overrides,
  };
}

function snapshotSummary(overrides: Partial<ConsoleSnapshotSummary> = {}): ConsoleSnapshotSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    artifactId: "console-1",
    uri: "unity://console-snapshots/console-1",
    validationStatus: "valid",
    totalCount: 250,
    boundedCount: 200,
    truncated: true,
    cursor: cursor(),
    capturedAt: "2026-05-27T09:00:04.000Z",
    ...overrides,
  };
}

function clearSnapshot(overrides: Partial<ConsoleClearSnapshot> = {}): ConsoleClearSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    cleared: true,
    generationBefore: 41,
    generationAfter: 42,
    countBefore: 17,
    countAfter: 0,
    cursorBefore: cursor(),
    cursorAfter: cursor({ generation: 42, startIndex: 0, createdAt: "2026-05-27T09:00:05.000Z" }),
    clearedAt: "2026-05-27T09:00:05.000Z",
    ...overrides,
  };
}

function succeededEnvelope(record: UnityAgentKitHostRecord, data: unknown, requestId: string, operation: string): Record<string, unknown> {
  return {
    status: "succeeded",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: `${operation} completed.`,
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-27T09:00:00.000Z",
    completedAt: "2026-05-27T09:00:00.020Z",
    durationMs: 20,
  };
}

function uncertainEnvelope(record: UnityAgentKitHostRecord, data: unknown, requestId: string, operation: string): Record<string, unknown> {
  return {
    status: "uncertain",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: `${operation} lacks enough proof.`,
    data: JSON.stringify(data),
    diagnostics: [
      {
        source: "unity",
        severity: "warning",
        code: "console.proof_incomplete",
        message: "The host could not prove the requested console state.",
      },
    ],
    startedAt: "2026-05-27T09:00:00.000Z",
    completedAt: "2026-05-27T09:00:00.020Z",
    durationMs: 20,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: ConsoleWorkflowOptions["readRegistry"];
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
  operation: string;
  result: HostTransportResult;
};

type TransportHarness = {
  transport: HostTransport;
  assertConsumed(): void;
};

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
        assert.equal(request.requestId, next.requestId);
        assert.equal(request.operation, next.operation);
        return next.result;
      },
    },
    assertConsumed() {
      assert.deepEqual(probeQueue, []);
      assert.deepEqual(invokeQueue, []);
    },
  };
}

function options(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
  overrides: Partial<ConsoleWorkflowOptions> = {},
): ConsoleWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: overrides.readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
    ...overrides,
  };
}

async function withArtifactProject(
  testBody: (projectRoot: string, artifactRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-console-"));
  const artifactRoot = path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeConsoleSnapshotResource(
  artifactRoot: string,
  summary: ConsoleSnapshotSummary,
  payload = "[{\"message\":\"example\"}]",
): Promise<void> {
  const metadataPath = path.join(artifactRoot, "metadata", "console-snapshots", `${summary.artifactId}.json`);
  const payloadPath = path.join(artifactRoot, "console-snapshots", `${summary.artifactId}.json`);
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await mkdir(path.dirname(payloadPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify({
    schemaVersion: 1,
    id: summary.artifactId,
    type: "console_snapshot",
    uri: summary.uri,
    relativePath: `console-snapshots/${summary.artifactId}.json`,
    createdAt: summary.capturedAt,
    validationStatus: summary.validationStatus,
    hostId: summary.cursor.hostId,
    hostEpoch: summary.cursor.hostEpoch,
    producerTool: "unity_console",
    producerAction: "snapshot",
    sizeBytes: payload.length,
    diagnostics: [],
  }, null, 2), "utf8");
  await writeFile(payloadPath, payload, "utf8");
}

test("parseConsoleCountDataAcceptsRealBoundedSnapshotAndRejectsInvalidShape", () => {
  const snapshot = countSnapshot();

  assert.deepEqual(parseConsoleCountData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleCountData("not-json"), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ totalCount: 1 })), null);
});

test("parseConsoleSnapshotDataPreservesCursorRangeAndResourceFields", () => {
  const summary = snapshotSummary();
  const parsed = parseConsoleSnapshotData(JSON.stringify(summary));

  assert.deepEqual(parsed, summary);
  assert.equal(parsed?.cursor.startIndex, summary.cursor.startIndex);
  assert.equal(parsed?.artifactId, "console-1");
  assert.equal(parsed?.uri, "unity://console-snapshots/console-1");
});

test("parseConsoleClearDataRequiresGenerationAndCountEvidence", () => {
  const snapshot = clearSnapshot();

  assert.deepEqual(parseConsoleClearData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, generationAfter: undefined })), null);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, countAfter: undefined })), null);
});

test("validateConsoleCursorRequiresHostEpochGenerationStartIndexAndCreatedAt", () => {
  assert.equal(validateConsoleCursor(cursor()), true);
  assert.equal(validateConsoleCursor({ ...cursor(), hostEpoch: -1 }), false);
  assert.equal(validateConsoleCursor({ ...cursor(), generation: -1 }), false);
  assert.equal(validateConsoleCursor({ ...cursor(), startIndex: -1 }), false);
  assert.equal(validateConsoleCursor({ ...cursor(), createdAt: "" }), false);
});

test("countConsoleMapsRealTotalAndBoundedPartialSeverityWithoutClaimingExactBreakdown", async () => {
  const record = sampleHostRecord();
  const snapshot = countSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-count",
      operation: consoleCountOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-count", consoleCountOperation) },
    },
  ]);

  const result = await countConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-count",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_console");
  assert.equal(result.action, "count");
  assert.equal(result.evidence?.["totalCount"], snapshot.totalCount);
  assert.equal(result.evidence?.["boundedCount"], snapshot.boundedCount);
  assert.equal(result.evidence?.["severityBreakdownExact"], false);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({ projectRoot });
    await writeConsoleSnapshotResource(artifactRoot, summary);
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot",
        operation: consoleSnapshotOperation,
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, summary, "req-snapshot", consoleSnapshotOperation) },
      },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-snapshot",
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.resource?.uri, summary.uri);
    assert.equal(result.resource?.type, "console_snapshot");
    assert.equal(result.evidence?.["resourceReadback"], "verified");
    assert.equal((await readFile(path.join(artifactRoot, "console-snapshots", "console-1.json"), "utf8")).length > 0, true);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleFailsWhenResourceReadbackFails", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot-missing",
        operation: consoleSnapshotOperation,
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, summary, "req-snapshot-missing", consoleSnapshotOperation) },
      },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-snapshot-missing",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.resource, undefined);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "resource.metadata_missing" || diagnostic.code === "resource.file_missing"), true);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleMapsInvalidCursorToUncertainWithoutReadingResource", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({ projectRoot, cursor: cursor({ generation: -1 }) });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot-uncertain",
        operation: consoleSnapshotOperation,
        result: { ok: true, statusCode: 200, body: uncertainEnvelope(record, summary, "req-snapshot-uncertain", consoleSnapshotOperation) },
      },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-snapshot-uncertain",
    });

    assert.equal(result.status, "uncertain");
    assert.equal(result.resource, undefined);
    assert.equal(result.nextStep?.kind, "inspect_diagnostics");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("clearConsoleRejectsWithoutExplicitConfirmationBeforeCallingUnity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await clearConsole(options(record, transport.transport), {
    requestId: "req-clear-rejected",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.action, "clear");
  assert.equal(result.nextStep?.kind, "rerun_with_confirmation");
  transport.assertConsumed();
});

test("clearConsoleMapsVerifiedClearGenerationAndCountEvidence", async () => {
  const record = sampleHostRecord();
  const snapshot = clearSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-clear",
      operation: consoleClearOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-clear", consoleClearOperation) },
    },
  ]);

  const result = await clearConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-clear",
    confirm: true,
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.evidence?.["generationAdvanced"], true);
  assert.equal(result.evidence?.["countAfter"], 0);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("clearConsoleReturnsFailedWhenUnityCannotVerifyCountAfterClear", async () => {
  const record = sampleHostRecord();
  const snapshot = clearSnapshot({ countAfter: 3, cleared: false });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-clear-failed",
      operation: consoleClearOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-clear-failed", consoleClearOperation) },
    },
  ]);

  const result = await clearConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-clear-failed",
    confirm: true,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.evidence?.["verifiedClear"], false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "console.clear_verification_failed"), true);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("countConsoleRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const snapshot = countSnapshot();
  const registry = registrySequence([
    { ok: true, record: first },
    { ok: true, record: rebound },
    { ok: true, record: rebound },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: { ...first, status: "not_ready", code: "host.not_ready", message: "Console is rebinding." } } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    {
      port: rebound.port,
      requestId: "req-count-rebound",
      operation: consoleCountOperation,
      result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, snapshot, "req-count-rebound", consoleCountOperation) },
    },
  ]);

  const result = await countConsole({
    registryPath: "ignored",
    projectRoot: first.projectRoot,
    readRegistry: registry.readRegistry,
    transport: transport.transport,
  }, {
    requestId: "req-count-rebound",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.hostId, "host-after");
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "host.rebound"), true);
  registry.assertConsumed();
  transport.assertConsumed();
});
