import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parsePngHeaderDimensions,
  parseScreenshotCaptureData,
  screenshotCaptureOperation,
  screenshotCaptureResultFromHostResult,
  type ScreenshotCaptureSummary,
} from "../src/diagnostics/screenshot.ts";
import { definePublicResult, type UnityAgentKitPublicResult } from "../src/contracts/result.ts";
import { captureGameViewScreenshot, type ScreenshotWorkflowOptions } from "../src/workflows/screenshot.ts";
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
    hostId: "host-shot",
    hostEpoch: 11,
    port: 49520,
    status: "ready",
    startedAt: "2026-05-29T10:00:00.000Z",
    lastProbeAt: "2026-05-29T10:00:01.000Z",
    ...overrides,
  };
}

function pngBytes(width: number, height: number, chunkType = "IHDR"): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set(Buffer.from(chunkType, "ascii"), 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  bytes.set([0x00, 0x00, 0x00, 0x00], 29);
  return bytes;
}

function screenshotSummary(overrides: Partial<ScreenshotCaptureSummary> = {}): ScreenshotCaptureSummary {
  const payload = pngBytes(2, 3);
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-shot",
    hostEpoch: 11,
    artifactId: "shot-20260529-smoke",
    uri: "unity://screenshots/shot-20260529-smoke",
    relativePath: "screenshots/shot-20260529-smoke.png",
    width: 2,
    height: 3,
    sizeBytes: payload.byteLength,
    captureMethod: "screen_capture_capture_screenshot",
    validationStatus: "valid",
    label: "smoke",
    capturedMainThreadId: 1,
    executionThreadId: 1,
    diagnostics: [],
    ...overrides,
  };
}

async function withArtifactProject(
  testBody: (projectRoot: string, artifactRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-screenshots-"));
  const artifactRoot = path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeScreenshotResource(
  artifactRoot: string,
  summary: ScreenshotCaptureSummary,
  payload: Uint8Array,
  metadataOverrides: Record<string, unknown> = {},
): Promise<void> {
  const metadataPath = path.join(artifactRoot, "metadata", "screenshots", `${summary.artifactId}.json`);
  const payloadPath = path.join(artifactRoot, summary.relativePath);
  const metadata = {
    schemaVersion: 1,
    id: summary.artifactId,
    type: "screenshot",
    uri: summary.uri,
    relativePath: summary.relativePath,
    createdAt: "2026-05-29T10:00:06.000Z",
    validationStatus: "valid",
    hostId: summary.hostId,
    hostEpoch: summary.hostEpoch,
    producerTool: "unity_screenshot",
    producerAction: "capture_game_view",
    sizeBytes: payload.byteLength,
    diagnostics: [],
    ...metadataOverrides,
  };

  await mkdir(path.dirname(metadataPath), { recursive: true });
  await mkdir(path.dirname(payloadPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  await writeFile(payloadPath, payload);
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: ScreenshotWorkflowOptions["readRegistry"];
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
  requestId?: string;
  operation: string;
  inputJson?: string;
  result: HostTransportResult;
};

function transportWithProbesAndInvokes(probes: ProbeExpectation[], invokes: InvokeExpectation[]): {
  transport: HostTransport;
  invocations: { port: number; requestId: string; operation: string; inputJson?: string }[];
  assertConsumed(): void;
} {
  const probeQueue = [...probes];
  const invokeQueue = [...invokes];
  const invocations: { port: number; requestId: string; operation: string; inputJson?: string }[] = [];
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
        if (next.requestId !== undefined) {
          assert.equal(request.requestId, next.requestId);
        }
        if (next.inputJson !== undefined) {
          assert.equal(request.inputJson, next.inputJson);
        }
        invocations.push({
          port,
          requestId: request.requestId,
          operation: request.operation,
          inputJson: request.inputJson,
        });
        return next.result;
      },
    },
    invocations,
    assertConsumed() {
      assert.deepEqual(probeQueue, []);
      assert.deepEqual(invokeQueue, []);
    },
  };
}

function options(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
  overrides: Partial<ScreenshotWorkflowOptions> = {},
): ScreenshotWorkflowOptions {
  return {
    registryPath: "ignored",
    projectRoot: record.projectRoot,
    transport,
    readRegistry: overrides.readRegistry ?? registrySequence([{ ok: true, record }, { ok: true, record }]).readRegistry,
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

function defineHostSuccess(record: UnityAgentKitHostRecord, data: unknown, requestId: string): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: "unity_editor",
    action: screenshotCaptureOperation,
    operation: screenshotCaptureOperation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: `${screenshotCaptureOperation} completed.`,
    data: JSON.stringify(data),
    diagnostics: [],
    startedAt: "2026-05-29T10:00:00.000Z",
    completedAt: "2026-05-29T10:00:00.010Z",
    durationMs: 10,
  });
}

async function runScreenshotCaptureAgainstSummary(
  record: UnityAgentKitHostRecord,
  projectRoot: string,
  summary: ScreenshotCaptureSummary,
): Promise<UnityAgentKitPublicResult> {
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-shot",
      operation: screenshotCaptureOperation,
      inputJson: JSON.stringify({ label: "smoke" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot") },
    },
  ]);

  const result = await captureGameViewScreenshot(options(record, transport.transport, {
    projectRoot,
    readRegistry: registry.readRegistry,
  }), {
    requestId: "req-shot",
    label: "smoke",
    timeoutMs: 50,
    pollIntervalMs: 0,
  });

  registry.assertConsumed();
  transport.assertConsumed();
  return result;
}

async function withValidHostAndResource(
  payload: Uint8Array,
  summaryOverrides: Partial<ScreenshotCaptureSummary>,
  assertResult: (result: UnityAgentKitPublicResult) => Promise<void> | void,
): Promise<void> {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({
      projectRoot,
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      sizeBytes: payload.byteLength,
      ...summaryOverrides,
    });

    await writeScreenshotResource(artifactRoot, summary, payload);
    await assertResult(await runScreenshotCaptureAgainstSummary(record, projectRoot, summary));
  });
}

test("screenshot parser accepts Game View artifact summary and rejects invalid shapes", () => {
  const summary = screenshotSummary();

  const parsed = parseScreenshotCaptureData(JSON.stringify(summary));

  assert.deepEqual(parsed, summary);
  assert.equal(parsed?.artifactId, "shot-20260529-smoke");
  assert.equal(parsed?.uri, "unity://screenshots/shot-20260529-smoke");
  assert.equal(parsed?.relativePath, "screenshots/shot-20260529-smoke.png");
  assert.equal(parsed?.width, 2);
  assert.equal(parsed?.height, 3);
  assert.equal(parsed?.sizeBytes, pngBytes(2, 3).byteLength);
  assert.equal(parsed?.captureMethod, "screen_capture_capture_screenshot");
  assert.equal(parsed?.validationStatus, "valid");
  assert.equal(parsed?.label, "smoke");
  assert.deepEqual(parsed?.diagnostics, []);

  assert.equal(parseScreenshotCaptureData("not-json"), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify({ artifactId: "shot" })), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ width: 0 }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ captureMethod: "texture_readback" }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ relativePath: "other/shot.png" }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ relativePath: "screenshots/shot.txt" }))), null);
  assert.equal(parseScreenshotCaptureData(JSON.stringify(screenshotSummary({ uri: "file://screenshots/shot-20260529-smoke" }))), null);
});

test("PNG header parser validates signature, IHDR, and positive dimensions", () => {
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(2, 3)), { ok: true, width: 2, height: 3 });

  const badSignature = pngBytes(2, 3);
  badSignature[0] = 0x00;
  assert.deepEqual(parsePngHeaderDimensions(badSignature), { ok: false, reason: "invalid_signature" });
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(2, 3, "IDAT")), { ok: false, reason: "missing_ihdr" });
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(0, 3)), { ok: false, reason: "invalid_dimensions" });
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(2, 0)), { ok: false, reason: "invalid_dimensions" });
  assert.deepEqual(parsePngHeaderDimensions(pngBytes(2, 3).subarray(0, 20)), { ok: false, reason: "too_short" });
});

test("PNG header parser handles non-zero Uint8Array byteOffset views", () => {
  const backing = new Uint8Array(43);
  backing.set(pngBytes(4, 5), 7);

  assert.deepEqual(parsePngHeaderDimensions(backing.subarray(7, 40)), { ok: true, width: 4, height: 5 });
});

test("screenshot host mapper preserves non-success public result statuses", () => {
  const hostResult: UnityAgentKitPublicResult = {
    status: "timeout",
    tool: "unity_editor",
    action: screenshotCaptureOperation,
    operation: screenshotCaptureOperation,
    requestId: "req-timeout",
    hostId: "host-shot",
    hostEpoch: 11,
    summary: "Host request timed out.",
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.request_timeout",
        message: "Host request timed out.",
      },
    ],
  };

  const result = screenshotCaptureResultFromHostResult(hostResult, "D:/ai/unity-claude-plugin/unity");

  assert.equal(result.status, "timeout");
  assert.equal(result.tool, "unity_screenshot");
  assert.equal(result.action, "capture_game_view");
  assert.equal(result.operation, screenshotCaptureOperation);
  assert.equal(result.summary, "Host request timed out.");
});

test("captureGameViewScreenshot rejects labels with path syntax before host invocation", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await captureGameViewScreenshot(options(record, transport.transport), {
    requestId: "req-shot-bad-label",
    label: "../escape",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "screenshot.label_invalid");
  transport.assertConsumed();
});

test("captureGameViewScreenshot succeeds only after screenshot Resource readback and PNG validation", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const payload = pngBytes(2, 3);
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({ projectRoot, hostId: record.hostId, hostEpoch: record.hostEpoch });
    await writeScreenshotResource(artifactRoot, summary, payload);
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-shot",
        operation: screenshotCaptureOperation,
        inputJson: JSON.stringify({ label: "smoke" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot") },
      },
    ]);

    const result = await captureGameViewScreenshot(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-shot",
      label: "smoke",
      timeoutMs: 50,
      pollIntervalMs: 0,
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.tool, "unity_screenshot");
    assert.equal(result.action, "capture_game_view");
    assert.equal(result.resource?.uri, "unity://screenshots/shot-20260529-smoke");
    assert.equal(result.resource?.type, "screenshot");
    assert.equal(result.resource?.artifactId, "shot-20260529-smoke");
    assert.deepEqual(result.evidence, {
      completion: "artifact_complete",
      artifactId: summary.artifactId,
      resourceUri: summary.uri,
      pngHeader: "valid",
      width: 2,
      height: 3,
    });

    assert.deepEqual(result.data, summary);
    assert.deepEqual(result.metadata, {
      resourceFilePath: path.join(artifactRoot, summary.relativePath),
      resourceContentBytes: payload.byteLength,
      pngWidth: 2,
      pngHeight: 3,
    });

    assert.equal(transport.invocations[0]?.operation, "screenshot.capture");
    assert.equal(JSON.parse(transport.invocations[0]?.inputJson ?? "{}").label, "smoke");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("captureGameViewScreenshot times out when screenshot Resource cannot be read back", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({
      projectRoot,
      hostId: record.hostId,
      hostEpoch: record.hostEpoch,
      artifactId: "shot-missing",
      uri: "unity://screenshots/shot-missing",
      relativePath: "screenshots/shot-missing.png",
      label: "missing",
    });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-shot-missing",
        operation: screenshotCaptureOperation,
        inputJson: JSON.stringify({ label: "missing" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot-missing") },
      },
    ]);
    let fakeTime = 0;

    const result = await captureGameViewScreenshot(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
      now: () => fakeTime,
      sleep: async (ms) => {
        assert.ok(ms > 0, "poll sleep must use a positive interval");
        fakeTime += ms;
      },
    }), {
      requestId: "req-shot-missing",
      label: "missing",
      timeoutMs: 1,
      pollIntervalMs: 0,
    });

    assert.equal(result.status, "timeout");
    assert.equal(result.mayStillBeRunning, true);
    assert.equal(result.nextStep?.kind, "read_resource");
    assert.equal(result.nextStep?.resourceUri, "unity://screenshots/shot-missing");
    assert.equal(result.safeToRetry, false);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("captureGameViewScreenshot fails invalid PNG signature after Resource readback", async () => {
  await withValidHostAndResource(Uint8Array.from([1, 2, 3, 4]), {}, async (result) => {
    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.png_invalid");
  });
});

test("captureGameViewScreenshot fails when PNG dimensions differ from producer metadata", async () => {
  await withValidHostAndResource(pngBytes(4, 3), { width: 2, height: 3 }, async (result) => {
    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.png_dimension_mismatch");
  });
});

test("captureGameViewScreenshot fails when Resource metadata identity differs from producer summary", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const summary = screenshotSummary({ projectRoot, hostId: record.hostId, hostEpoch: record.hostEpoch });
    await writeScreenshotResource(artifactRoot, summary, pngBytes(2, 3), { hostId: "other-host" });

    const result = await runScreenshotCaptureAgainstSummary(record, projectRoot, summary);

    assert.equal(result.status, "failed");
    assert.equal(result.code, "screenshot.resource_mismatch");
  });
});

test("captureGameViewScreenshot does not succeed across host identity mismatch", async () => {
  const record = sampleHostRecord();
  const summary = screenshotSummary({ hostId: "other-host" });
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-shot-host-mismatch",
      operation: screenshotCaptureOperation,
      inputJson: JSON.stringify({ label: "smoke" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, screenshotCaptureOperation, summary, "req-shot-host-mismatch") },
    },
  ]);

  const result = await captureGameViewScreenshot(options(record, transport.transport), {
    requestId: "req-shot-host-mismatch",
    label: "smoke",
  });

  assert.notEqual(result.status, "succeeded");
  assert.equal(result.status, "lost");
  assert.equal(result.code, "screenshot.host_identity_mismatch");
  transport.assertConsumed();
});

test("screenshot host mapper rejects producer projectRoot mismatch", () => {
  const record = sampleHostRecord();
  const hostResult = defineHostSuccess(record, screenshotSummary({ projectRoot: "D:/other/unity" }), "req-project-mismatch");

  const result = screenshotCaptureResultFromHostResult(hostResult, record.projectRoot);

  assert.notEqual(result.status, "succeeded");
  assert.equal(result.code, "screenshot.project_root_mismatch");
});
