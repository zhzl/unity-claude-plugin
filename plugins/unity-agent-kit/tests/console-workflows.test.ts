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
    consoleGeneration: 41,
    startIndex: 120,
    createdAt: "2026-05-27T09:00:02.000Z",
    ...overrides,
  };
}

function countSnapshot(overrides: Partial<ConsoleCountSnapshot> = {}): ConsoleCountSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "6000.0.0f1",
    hostId: "host-console",
    hostEpoch: 12,
    totalCount: 1000,
    counts: {
      error: 1,
      warning: 2,
      log: 497,
    },
    severityScan: {
      scannedCount: 500,
      startIndex: 500,
      endIndexExclusive: 1000,
      limit: 500,
      severityBreakdownComplete: false,
    },
    cursor: cursor(),
    consoleGeneration: 41,
    diagnostics: [
      {
        source: "console",
        severity: "warning",
        code: "console.severity_breakdown_partial",
        message: "Severity breakdown scanned the bounded tail window only.",
      },
    ],
    ...overrides,
  };
}

function snapshotSummary(overrides: Partial<ConsoleSnapshotSummary> = {}): ConsoleSnapshotSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "6000.0.0f1",
    hostId: "host-console",
    hostEpoch: 12,
    artifactId: "console-1",
    uri: "unity://console-snapshots/console-1",
    counts: {
      error: 12,
      warning: 40,
      log: 148,
    },
    cursor: cursor({ startIndex: 320 }),
    range: {
      startIndex: 120,
      endIndexExclusive: 320,
      totalCountAtCapture: 320,
      limit: 200,
      truncated: true,
    },
    entryCount: 200,
    includeStackTrace: false,
    diagnostics: [],
    ...overrides,
  };
}

function clearSnapshot(overrides: Partial<ConsoleClearSnapshot> = {}): ConsoleClearSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "6000.0.0f1",
    hostId: "host-console",
    hostEpoch: 12,
    explicitClear: true,
    cleared: true,
    countBeforeClear: 12,
    countAfterClear: 0,
    consoleGenerationBeforeClear: 2,
    consoleGenerationAfterClear: 3,
    cursor: cursor({
      consoleGeneration: 3,
      startIndex: 0,
      createdAt: "2026-05-27T09:00:05.000Z",
    }),
    diagnostics: [],
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
  inputJson?: string;
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
  artifactId: string,
  payload: string,
): Promise<void> {
  const metadataPath = path.join(artifactRoot, "metadata", "console-snapshots", `${artifactId}.json`);
  const payloadPath = path.join(artifactRoot, "console-snapshots", `${artifactId}.json`);
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await mkdir(path.dirname(payloadPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify({
    schemaVersion: 1,
    id: artifactId,
    type: "console_snapshot",
    uri: `unity://console-snapshots/${artifactId}`,
    relativePath: `console-snapshots/${artifactId}.json`,
    createdAt: "2026-05-27T09:00:04.000Z",
    producerTool: "unity_console",
    producerAction: "snapshot",
    validationStatus: "valid",
    sizeBytes: Buffer.byteLength(payload),
    diagnostics: [],
  }, null, 2), "utf8");
  await writeFile(payloadPath, payload, "utf8");
}

test("parseConsoleCountDataRequiresHostIdentityFields", () => {
  const snapshot = countSnapshot();

  assert.deepEqual(parseConsoleCountData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleCountData("not-json"), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ totalCount: 1 })), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ ...snapshot, unityVersion: "" })), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ ...snapshot, hostId: "" })), null);
  assert.equal(parseConsoleCountData(JSON.stringify({ ...snapshot, hostEpoch: undefined })), null);
});

test("parseConsoleSnapshotDataPreservesCursorRangeAndResourceFields", () => {
  const summary = snapshotSummary();
  const parsed = parseConsoleSnapshotData(JSON.stringify(summary));

  assert.deepEqual(parsed, summary);
  assert.equal(parsed?.cursor.startIndex, summary.cursor.startIndex);
  assert.deepEqual(parsed?.range, summary.range);
  assert.equal(parsed?.artifactId, "console-1");
  assert.equal(parsed?.uri, "unity://console-snapshots/console-1");
});

test("parseConsoleClearDataRequiresHostIdentityGenerationAndCountEvidence", () => {
  const snapshot = clearSnapshot();

  assert.deepEqual(parseConsoleClearData(JSON.stringify(snapshot)), snapshot);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, consoleGenerationAfterClear: undefined })), null);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, countAfterClear: undefined })), null);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, unityVersion: "" })), null);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, hostId: "" })), null);
  assert.equal(parseConsoleClearData(JSON.stringify({ ...snapshot, hostEpoch: undefined })), null);
});

test("validateConsoleCursorRequiresHostEpochGenerationStartIndexAndCreatedAt", () => {
  const currentCountSnapshot = countSnapshot({ totalCount: 250, cursor: cursor(), consoleGeneration: 41, hostId: "host-console", hostEpoch: 12 });

  assert.deepEqual(validateConsoleCursor(cursor(), currentCountSnapshot), { ok: true });
  assert.equal(validateConsoleCursor({ ...cursor(), hostId: "other-host" }, currentCountSnapshot).ok, false);
  assert.equal(validateConsoleCursor({ ...cursor(), hostEpoch: -1 }, currentCountSnapshot).ok, false);
  assert.equal(validateConsoleCursor({ ...cursor(), consoleGeneration: -1 }, currentCountSnapshot).ok, false);
  assert.equal(validateConsoleCursor({ ...cursor(), startIndex: 251 }, currentCountSnapshot).ok, false);
  assert.equal(validateConsoleCursor({ ...cursor(), createdAt: "" }, currentCountSnapshot).ok, false);
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
      inputJson: JSON.stringify({ maxSeverityScan: 500 }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-count", consoleCountOperation) },
    },
  ]);

  const result = await countConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-count",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_console");
  assert.equal(result.action, "count");
  assert.deepEqual(result.evidence, {
    completion: "state_snapshot",
    totalCount: 1000,
    severityBreakdownComplete: false,
  });
  assert.equal(result.data?.["totalCount"], 1000);
  assert.deepEqual(result.data?.["counts"], {
    error: 1,
    warning: 2,
    log: 497,
  });
  assert.deepEqual(result.data?.["severityScan"], {
    scannedCount: 500,
    startIndex: 500,
    endIndexExclusive: 1000,
    limit: 500,
    severityBreakdownComplete: false,
  });
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "console.severity_breakdown_partial"), true);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("snapshotConsoleRequiresPhase5BResourceReadbackBeforeSuccess", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({ projectRoot });
    await writeConsoleSnapshotResource(artifactRoot, summary.artifactId, "[{\"message\":\"example\"}]");
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot",
        operation: consoleSnapshotOperation,
        inputJson: JSON.stringify({ limit: 200, includeStackTrace: false }),
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
    assert.equal(result.resource?.artifactId, summary.artifactId);
    assert.equal(result.resource?.validationStatus, "valid");
    assert.equal(result.evidence?.["completion"], "artifact_complete");
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
        inputJson: JSON.stringify({ limit: 200, includeStackTrace: false }),
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
    assert.equal(result.code, "console.snapshot_resource_failed");
    assert.equal(result.resource, undefined);
    assert.equal(result.nextStep?.kind, "inspect_diagnostics");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleMapsInvalidCursorToUncertainWithoutReadingResource", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({
      projectRoot,
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      cursor: cursor({ hostId: "other-host" }),
    });
    await writeConsoleSnapshotResource(artifactRoot, summary.artifactId, "[{\"message\":\"should-not-be-read\"}]");
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot-uncertain",
        operation: consoleSnapshotOperation,
        inputJson: JSON.stringify({ limit: 200, includeStackTrace: false }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, summary, "req-snapshot-uncertain", consoleSnapshotOperation) },
      },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-snapshot-uncertain",
    });

    assert.equal(result.status, "uncertain");
    assert.equal(result.code, "console.cursor_invalid");
    assert.equal(result.resource, undefined);
    assert.equal(result.data, undefined);
    assert.equal(result.nextStep?.kind, "inspect_diagnostics");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("snapshotConsoleRejectsRangeAndEntryCountMismatchAsInvalidCursorProof", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = snapshotSummary({
      projectRoot,
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      range: {
        startIndex: 120,
        endIndexExclusive: 320,
        totalCountAtCapture: 400,
        limit: 200,
        truncated: true,
      },
      cursor: cursor({ startIndex: 300 }),
      entryCount: 150,
    });
    await writeConsoleSnapshotResource(artifactRoot, summary.artifactId, "[{\"message\":\"should-not-be-read\"}]");
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-snapshot-range-invalid",
        operation: consoleSnapshotOperation,
        inputJson: JSON.stringify({ limit: 200, includeStackTrace: false }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, summary, "req-snapshot-range-invalid", consoleSnapshotOperation) },
      },
    ]);

    const result = await snapshotConsole(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-snapshot-range-invalid",
    });

    assert.equal(result.status, "uncertain");
    assert.equal(result.code, "console.cursor_invalid");
    assert.equal(result.resource, undefined);
    assert.equal(result.data, undefined);
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
      inputJson: JSON.stringify({ confirmClear: true }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-clear", consoleClearOperation) },
    },
  ]);

  const result = await clearConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-clear",
    confirmClear: true,
  });

  assert.equal(result.status, "succeeded");
  assert.deepEqual(result.evidence, {
    completion: "effect_verified",
    countBeforeClear: 12,
    countAfterClear: 0,
    consoleGenerationBeforeClear: 2,
    consoleGenerationAfterClear: 3,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("clearConsoleReturnsFailedWhenUnityCannotVerifyCountAfterClear", async () => {
  const record = sampleHostRecord();
  const snapshot = clearSnapshot({
    cleared: false,
    countAfterClear: 3,
    consoleGenerationAfterClear: 2,
    cursor: cursor({ consoleGeneration: 2, startIndex: 0, createdAt: "2026-05-27T09:00:05.000Z" }),
  });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-clear-failed",
      operation: consoleClearOperation,
      inputJson: JSON.stringify({ confirmClear: true }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, snapshot, "req-clear-failed", consoleClearOperation) },
    },
  ]);

  const result = await clearConsole(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-clear-failed",
    confirmClear: true,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "console.clear_verification_failed");
  assert.equal(result.evidence?.["consoleGenerationAfterClear"], 2);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("countConsoleRecordsSuccessfulRebindDiagnostic", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 1, port: 49200 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 2, port: 49201 });
  const snapshot = countSnapshot({
    projectRoot: rebound.projectRoot,
    hostId: rebound.hostId,
    hostEpoch: rebound.hostEpoch,
    cursor: cursor({ hostId: rebound.hostId, hostEpoch: rebound.hostEpoch }),
  });
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
      inputJson: JSON.stringify({ maxSeverityScan: 500 }),
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
