import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import {
  definePublicResult,
  publicResultStatuses,
  publicResultStatusSemantics,
  publicResultStatusToIsError,
  type PublicResultStatus,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";
import {
  continuityIdentity,
  readHostRegistry,
  supportedHostStatuses,
  UNITY_AGENT_KIT_HOST_NAME,
  UNITY_AGENT_KIT_PROTOCOL_VERSION,
  type UnityAgentKitHostRecord,
} from "../src/host/registry.ts";
import {
  invokeOperationOnce,
  mapTransportFailureToPublicResult,
  probeActiveHost,
} from "../src/host/http-client.ts";
import { executeWithRebind, type RegistryReader } from "../src/host/rebind.ts";
import {
  createNodeHostTransport,
  type HostTransport,
  type HostTransportResult,
} from "../src/host/transport.ts";

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

async function withTempRegistry(testBody: (registryPath: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-registry-"));
  try {
    await testBody(path.join(root, "host.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

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

async function assertPathDoesNotExist(pathUrl: URL): Promise<void> {
  try {
    await stat(pathUrl);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }

  assert.fail(`Expected path not to exist: ${pathUrl.href}`);
}

async function assertPathExists(pathUrl: URL): Promise<void> {
  const details = await stat(pathUrl);
  assert.ok(details.isFile() || details.isDirectory(), `Expected path to exist: ${pathUrl.href}`);
}

test("packageJsonUsesStripTypesNodeTestScript", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("nodeTransportProbeParsesJsonResponse", async () => {
  await withHttpServer((_request, response) => {
    writeJson(response, 200, sampleHostRecord());
  }, async (port) => {
    const transport: HostTransport = createNodeHostTransport({ timeoutMs: 250 });
    const result: HostTransportResult = await transport.probe(port);

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
      writeJson(response, 200, {
        status: "succeeded",
        operation: "host.echo",
        requestId: "req-1",
        summary: "ok",
        diagnostics: [],
      });
    });
  }, async (port) => {
    const transport: HostTransport = createNodeHostTransport({ timeoutMs: 250 });
    const result: HostTransportResult = await transport.invokeOperation(port, {
      operation: "host.echo",
      requestId: "req-1",
      inputJson: "{}",
    });

    assert.equal(result.ok, true);
    assert.equal((result.ok ? result.body : {})["status"], "succeeded");
  });
});

test("nodeTransportClassifiesInvalidJsonResponse", async () => {
  await withHttpServer((_request, response) => {
    response.statusCode = 200;
    response.end("not-json");
  }, async (port) => {
    const transport: HostTransport = createNodeHostTransport({ timeoutMs: 250 });
    const result: HostTransportResult = await transport.probe(port);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_json_response");
  });
});

test("nodeTransportClassifiesHttpStatusFailure", async () => {
  await withHttpServer((_request, response) => {
    writeJson(response, 404, { status: "not_ready", code: "http.not_found", message: "No route." });
  }, async (port) => {
    const transport: HostTransport = createNodeHostTransport({ timeoutMs: 250 });
    const result: HostTransportResult = await transport.probe(port);

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
    const transport: HostTransport = createNodeHostTransport({ timeoutMs: 25 });
    const result: HostTransportResult = await transport.probe(port);

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "request_timeout");
  });
});

test("nodeTransportClassifiesTransportUnavailable", async () => {
  const transport: HostTransport = createNodeHostTransport({ timeoutMs: 50 });
  const result: HostTransportResult = await transport.probe(9);

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.reason, "transport_unavailable");
});

test("probeActiveHostValidatesRegistryAndProbeIdentity", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(record, fakeTransport({ ok: true, statusCode: 200, body: record }));

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.record.hostId : undefined, "host-a");
});

test("probeActiveHostRejectsNotReadyProbe", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(
    record,
    fakeTransport({
      ok: true,
      statusCode: 200,
      body: { ...record, status: "not_ready", code: "host.not_ready", message: "Editor busy." },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.not_ready");
});

test("probeActiveHostRejectsNotReadyProbeWithIdentityMismatch", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(
    record,
    fakeTransport({
      ok: true,
      statusCode: 200,
      body: { ...record, status: "not_ready", hostId: "host-other", code: "host.not_ready", message: "Editor busy." },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.identity_mismatch");
});

test("probeActiveHostRejectsNotReadyProbeWithProtocolMismatch", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(
    record,
    fakeTransport({
      ok: true,
      statusCode: 200,
      body: {
        ...record,
        status: "not_ready",
        protocolVersion: "unsupported",
        code: "host.not_ready",
        message: "Editor busy.",
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.protocol_mismatch");
});

test("probeActiveHostRejectsProtocolMismatch", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: { ...record, protocolVersion: "unsupported" } }),
  );

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
  const result = await probeActiveHost(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: { ...record, status: "starting" } }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "failed");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.probe_invalid_shape");
});

test("probeActiveHostRejectsIdentityMismatch", async () => {
  const record = sampleHostRecord();
  const result = await probeActiveHost(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: { ...record, hostId: "host-other" } }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? undefined : result.result.status, "lost");
  assert.equal(result.ok ? undefined : result.result.diagnostics[0].code, "host.identity_mismatch");
});

test("invokeOperationMapsSucceededEnvelopeToPublicResult", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope() }),
    {
      operation: "host.echo",
      requestId: "req-echo",
    },
  );

  assert.equal(result.status, "succeeded");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-echo");
  assert.equal(result.hostId, "host-a");
  assert.equal(result.hostEpoch, 3);
});

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
    evidence: { phase: "5B-contract" },
    resource: {
      uri: "unity://screenshots/shot-opaque",
      type: "screenshot",
      artifactId: "shot-opaque",
      validationStatus: "valid",
      summary: "Opaque host screenshot reference using the Phase 5B shape.",
    },
    resources: [
      {
        uri: "unity://console-snapshots/console-opaque",
        type: "console_snapshot",
        artifactId: "console-opaque",
        validationStatus: "uncertain",
        summary: "Opaque host console snapshot reference using the Phase 5B shape.",
      },
    ],
    metadata: { owner: "unity-host", timeoutLayer: "host" },
    job: {
      jobId: "job-opaque",
      tool: "unity_test",
      action: "run_and_collect",
      state: "running",
      createdAt: "2026-05-22T10:00:00.000Z",
      lastKnownContinuity: "current",
    },
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-opaque",
      reason: "The host reported an opaque running job with a Phase 5B next step.",
    },
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

test("invokeOperationPreservesFailedRejectedLostAndTimeoutEnvelopeMetadata", async () => {
  const record = sampleHostRecord();
  for (const status of ["failed", "rejected", "lost", "timeout"] as const) {
    const result = await invokeOperationOnce(
      record,
      fakeTransport({
        ok: true,
        statusCode: 200,
        body: succeededEnvelope({
          status,
          requestId: `req-${status}`,
          code: `host.${status}`,
          message: `${status} message`,
        }),
      }),
      {
        operation: "host.echo",
        requestId: `req-${status}`,
      },
    );

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
  const result = await invokeOperationOnce(
    record,
    fakeTransport({
      ok: true,
      statusCode: 200,
      body: succeededEnvelope({
        status: "timeout",
        operation: "host.pendingDispatchTimeout",
        requestId: "req-timeout",
        code: "host.dispatch_timeout",
        diagnostics: [
          {
            source: "unity-host",
            severity: "error",
            code: "host.dispatch_timeout",
            message: "deadline",
            details: { mayStillBeRunning: true },
          },
        ],
      }),
    }),
    {
      operation: "host.pendingDispatchTimeout",
      requestId: "req-timeout",
    },
  );

  assert.equal(result.status, "timeout");
  assert.equal(result.code, "host.dispatch_timeout");
  assert.equal(result.mayStillBeRunning, undefined);
  assert.equal(result.job, undefined);
  assert.equal(result.nextStep, undefined);
  assert.deepEqual(result.diagnostics[0].details, { mayStillBeRunning: true });
});

test("invokeOperationRejectsInvalidEnvelope", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: { status: "succeeded" } }),
    {
      operation: "host.echo",
      requestId: "req-invalid",
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
});

test("invokeOperationFailsClosedOnUnknownStatus", async () => {
  const record = sampleHostRecord();
  const result = await invokeOperationOnce(
    record,
    fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ status: "completed" }) }),
    {
      operation: "host.echo",
      requestId: "req-unknown",
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.invalid_envelope");
});

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
    ], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-b", hostEpoch: 2, requestId: "req-rebind-not-ready" }) }]),
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
    ], [{ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-b", hostEpoch: 2, requestId: "req-rebind-identity" }) }]),
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
  const result = await invokeOperationOnce(record, fakeTransport({ ok: true, statusCode: 200, body: succeededEnvelope({ hostId: "host-a", hostEpoch: 1, requestId: "req-trusted-only" }) }), {
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

test("postResponseIdentityDriftStripsUntrustedOperationPayload", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: before },
    ], [
      {
        ok: true,
        statusCode: 200,
        body: succeededEnvelope({
          hostId: "host-before",
          hostEpoch: 1,
          data: { echoed: true, fromHost: "old-host" },
        }),
      },
    ]),
    request: { operation: "host.echo", requestId: "req-strip-payload" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
  assert.equal(result.data, undefined);
  assert.equal(result.evidence, undefined);
  assert.equal(result.resource, undefined);
  assert.equal(result.resources, undefined);
  assert.equal(result.metadata, undefined);
  assert.equal(result.job, undefined);
  assert.equal(result.nextStep, undefined);
  assert.equal(result.safeToRetry, undefined);
  assert.equal(result.mayStillBeRunning, undefined);
});

test("postResponseIdentityDriftUsesOriginalRequestIdentityForLifecycleAttribution", async () => {
  const before = sampleHostRecord({ hostId: "host-before", hostEpoch: 1 });
  const after = sampleHostRecord({ hostId: "host-after", hostEpoch: 2 });
  const result = await executeWithRebind({
    registryPath: "ignored",
    projectRoot: before.projectRoot,
    readRegistry: registrySequence([{ ok: true, record: before }, { ok: true, record: after }]),
    transport: transportWithProbeAndInvoke([
      { ok: true, statusCode: 200, body: before },
    ], [
      {
        ok: true,
        statusCode: 200,
        body: succeededEnvelope({
          operation: "host.other",
          requestId: "req-stale-host",
          hostId: "host-before",
          hostEpoch: 1,
        }),
      },
    ]),
    request: { operation: "host.echo", requestId: "req-original" },
  });

  assert.equal(result.status, "lost");
  assert.equal(result.diagnostics[0].code, "host.stale_instance");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.requestId, "req-original");
  assert.equal(result.action, "host.echo");
  assert.deepEqual(result.diagnostics[0].attribution, {
    operation: "host.echo",
    requestId: "req-original",
  });
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

test("phase5a08ScopeGuardAllowsOnlyVerticalSmokeEvidenceFiles", async () => {
  const requiredEvidencePaths = [
    new URL("phase5a-vertical-smoke.test.ts", import.meta.url),
    new URL("../../../unity/Assets/UnityAgentKit/Editor/Tests/HostRuntimeVerticalSmokeTests.cs", import.meta.url),
  ];

  for (const requiredPath of requiredEvidencePaths) {
    await assertPathExists(requiredPath);
  }

  const forbiddenPaths = [
    new URL("../src/tools", import.meta.url),
    new URL("../src/mcp", import.meta.url),
    new URL("../src/actions", import.meta.url),
    new URL("../skills/unity.md", import.meta.url),
  ];

  for (const forbiddenPath of forbiddenPaths) {
    await assertPathDoesNotExist(forbiddenPath);
  }
});

test("httpStatusFailureMapsToFailedDiagnostic", () => {
  const result = mapTransportFailureToPublicResult(
    {
      ok: false,
      reason: "http_status_failure",
      statusCode: 404,
      bodyText: "{\"code\":\"http.not_found\"}",
      message: "HTTP 404 from host.",
    },
    "host.echo",
    "req-http-status",
  );

  assert.equal(result.status, "failed");
  assert.equal(result.diagnostics[0].code, "host.http_status_failure");
});

test("httpStatusFailureBodyIsOnlyDiagnosticEvidence", () => {
  const result = mapTransportFailureToPublicResult(
    {
      ok: false,
      reason: "http_status_failure",
      statusCode: 404,
      bodyText: "{\"status\":\"succeeded\"}",
      message: "HTTP 404 from host.",
    },
    "host.echo",
    "req-http-status-body",
  );

  assert.equal(result.status, "failed");
  assert.equal(result.operation, "host.echo");
  assert.equal(result.diagnostics[0].code, "host.http_status_failure");
  assert.deepEqual(result.diagnostics[0].details, { statusCode: 404, bodyText: "{\"status\":\"succeeded\"}" });
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
        message: "Compiler error reported.",
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
  const resource = {
    uri: "unity://screenshots/shot-1",
    type: "screenshot",
    artifactId: "shot-1",
    validationStatus: "valid",
    summary: "Game View screenshot.",
  };
  const resources = [
    {
      uri: "unity://console-snapshots/console-1",
      type: "console_snapshot",
      artifactId: "console-1",
      validationStatus: "uncertain",
      summary: "Console snapshot.",
    },
  ];
  const publicResult = samplePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Game View screenshot captured.",
    resource,
    resources,
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.resource, resource);
  assert.deepEqual(mapped.structuredContent.resources, resources);
  assert.deepEqual(mapped.content, [{ type: "text", text: "Game View screenshot captured." }]);
  assert.equal(mapped.isError, false);
});

test("mapPublicResultPreservesFutureWorkflowFields", () => {
  const job = {
    jobId: "job-1",
    tool: "unity_test",
    action: "run_and_verify",
    state: "running",
    createdAt: "2026-05-22T10:00:00.000Z",
    lastKnownContinuity: "current",
  };
  const nextStep = {
    kind: "check_job_status",
    tool: "unity_test",
    action: "get_status",
    jobId: "job-1",
    reason: "Poll the existing test job instead of starting another run.",
  };
  const publicResult = samplePublicResult({
    status: "uncertain",
    tool: "unity_test",
    action: "run_and_verify",
    summary: "Test run is still in progress.",
    job,
    nextStep,
    safeToRetry: false,
    mayStillBeRunning: true,
    metadata: { workflowOwner: "ts" },
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.job, job);
  assert.deepEqual(mapped.structuredContent.nextStep, nextStep);
  assert.equal(mapped.structuredContent.safeToRetry, false);
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
  assert.deepEqual(mapped.structuredContent.metadata, { workflowOwner: "ts" });
});

test("publicResultMappingPreservesSafeToRetryAndNextStep", () => {
  const nextStep = {
    kind: "read_state",
    tool: "unity_playmode",
    action: "get_state",
    reason: "Poll PlayMode state before retrying.",
  };
  const publicResult = samplePublicResult({
    status: "timeout",
    tool: "unity_playmode",
    action: "enter_and_verify",
    summary: "PlayMode verification timed out.",
    nextStep,
    safeToRetry: false,
    mayStillBeRunning: true,
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "host.request_timeout",
        message: "Host request timed out.",
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
        message: "Host-level dispatch timed out.",
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
  const expected = new Map<PublicResultStatus, boolean>([
    ["succeeded", false],
    ["failed", true],
    ["uncertain", true],
    ["cancelled", true],
    ["timeout", true],
    ["lost", true],
    ["rejected", true],
  ]);

  for (const [status, isError] of expected) {
    const publicResult = samplePublicResult({
      status,
      summary: `${status} summary`,
      diagnostics:
        status === "succeeded"
          ? []
          : [
              {
                source: "unity-host",
                severity: "error",
                code: `${status}.diagnostic`,
                message: `${status} diagnostic`,
              },
            ],
    });

    const mapped = mapPublicResultToMcpToolResult(publicResult);

    assert.equal(mapped.isError, isError);
    assert.equal(mapped.structuredContent.status, status);
    assert.deepEqual(mapped.content, [{ type: "text", text: `${status} summary` }]);
  }
});

test("readHostRegistryAcceptsMinimumRecordWithoutLastProbeAt", async () => {
  await withTempRegistry(async (registryPath) => {
    const { lastProbeAt: _lastProbeAt, ...record } = sampleHostRecord();
    await writeFile(registryPath, JSON.stringify(record), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: record.projectRoot });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.record : undefined, record);
  });
});

test("readHostRegistryAcceptsStringLastProbeAtIncludingEmptyString", async () => {
  await withTempRegistry(async (registryPath) => {
    const record = sampleHostRecord({ lastProbeAt: "" });
    await writeFile(registryPath, JSON.stringify(record), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: record.projectRoot });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.record : undefined, record);
  });
});

test("readHostRegistryRejectsNonStringLastProbeAt", async () => {
  await withTempRegistry(async (registryPath) => {
    await writeFile(registryPath, JSON.stringify({ ...sampleHostRecord(), lastProbeAt: 123 }), "utf8");

    const result = await readHostRegistry(registryPath, { projectRoot: "D:/ai/unity-claude-plugin/unity" });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? undefined : result.reason, "invalid_shape");
    assert.equal(result.ok ? undefined : result.diagnostic.code, "host.registry_invalid_shape");
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
