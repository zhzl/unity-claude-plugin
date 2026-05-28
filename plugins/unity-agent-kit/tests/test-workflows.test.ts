import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getTestResult,
  getTestStatus,
  listTests,
  startTestRun,
  type TestWorkflowOptions,
} from "../src/workflows/test.ts";
import {
  parseTestJobData,
  parseTestListData,
  parseTestReportData,
  parseTestReportPayloadData,
  testListOperation,
  testResultOperation,
  testStartOperation,
  testStatusOperation,
  type TestJobSnapshot,
  type TestListSnapshot,
  type TestReportPayloadSummary,
  type TestReportSummary,
  type TestSelector,
} from "../src/diagnostics/test.ts";
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
    hostId: "host-test",
    hostEpoch: 21,
    port: 49400,
    status: "ready",
    startedAt: "2026-05-28T10:00:00.000Z",
    lastProbeAt: "2026-05-28T10:00:01.000Z",
    ...overrides,
  };
}

function selector(overrides: Partial<TestSelector> = {}): TestSelector {
  return {
    mode: "editmode",
    assembly: "UnityAgentKit.Editor.Tests",
    className: "UnityAgentKit.Editor.Tests.TestWorkflowTests",
    methodName: "SamplePassingTest",
    ...overrides,
  };
}

function listSnapshot(overrides: Partial<TestListSnapshot> = {}): TestListSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    selector: selector(),
    tests: [
      {
        id: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
        name: "SamplePassingTest",
        fullName: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
        assembly: "UnityAgentKit.Editor.Tests",
        className: "UnityAgentKit.Editor.Tests.TestWorkflowTests",
        mode: "editmode",
      },
    ],
    total: 1,
    diagnostics: [],
    ...overrides,
  };
}

function jobSnapshot(overrides: Partial<TestJobSnapshot> = {}): TestJobSnapshot {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    jobId: "test-job-1",
    state: "accepted",
    selector: selector(),
    createdAt: "2026-05-28T10:00:02.000Z",
    updatedAt: "2026-05-28T10:00:02.000Z",
    reportId: "",
    diagnostics: [],
    ...overrides,
  };
}

function reportSummary(overrides: Partial<TestReportSummary> = {}): TestReportSummary {
  return {
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    hostId: "host-test",
    hostEpoch: 21,
    jobId: "test-job-1",
    reportId: "test-report-1",
    uri: "unity://test-reports/test-report-1",
    mode: "editmode",
    selector: selector(),
    total: 1,
    passed: 0,
    failed: 1,
    errors: 0,
    skipped: 0,
    inconclusive: 0,
    verifiedTestPass: false,
    terminalState: "failed",
    failures: [
      {
        name: "SamplePassingTest",
        fullName: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
        message: "Expected true but got false.",
        stackTrace: "at UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest()",
      },
    ],
    diagnostics: [],
    ...overrides,
  };
}

function reportPayload(overrides: Partial<TestReportPayloadSummary> = {}): TestReportPayloadSummary {
  return {
    schemaVersion: 1,
    reportId: "test-report-1",
    uri: "unity://test-reports/test-report-1",
    total: 1,
    passed: 0,
    failed: 1,
    errors: 0,
    skipped: 0,
    inconclusive: 0,
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
    startedAt: "2026-05-28T10:00:00.000Z",
    completedAt: "2026-05-28T10:00:00.010Z",
    durationMs: 10,
  };
}

function registrySequence(results: HostRegistryReadResult[]): {
  readRegistry: TestWorkflowOptions["readRegistry"];
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
  overrides: Partial<TestWorkflowOptions> = {},
): TestWorkflowOptions {
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
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-tests-"));
  const artifactRoot = path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeTestReportFixture(
  artifactRoot: string,
  reportId: string,
  metadataOverrides: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<void> {
  const relativePath = `test-reports/${reportId}.json`;
  const payloadPath = path.join(artifactRoot, relativePath);
  const metadataPath = path.join(artifactRoot, "metadata", "test-reports", `${reportId}.json`);
  const payloadJson = JSON.stringify(payload, null, 2);
  const metadata = {
    schemaVersion: 1,
    id: reportId,
    type: "test_report",
    uri: `unity://test-reports/${reportId}`,
    reportLocator: {
      kind: "artifact_relative_path",
      relativePath,
    },
    createdAt: "2026-05-28T10:00:06.000Z",
    validationStatus: "valid",
    hostId: "host-test",
    hostEpoch: 21,
    producerTool: "unity_test",
    producerAction: "get_result",
    producerJobId: "test-job-1",
    diagnostics: [],
    sizeBytes: Buffer.byteLength(payloadJson, "utf8"),
    ...metadataOverrides,
  };

  await mkdir(path.dirname(payloadPath), { recursive: true });
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(payloadPath, payloadJson, "utf8");
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
}

test("parser contracts accept default editmode list/job/report/payload shapes", () => {
  const list = listSnapshot();
  const job = jobSnapshot();
  const report = reportSummary();
  const payload = reportPayload();

  assert.deepEqual(parseTestListData(JSON.stringify(list)), list);
  assert.deepEqual(parseTestJobData(JSON.stringify(job)), job);
  assert.deepEqual(parseTestReportData(JSON.stringify(report)), report);
  assert.deepEqual(parseTestReportPayloadData(JSON.stringify(payload)), payload);
});

test("parser contracts accept legal playmode list shape", () => {
  const playmodeSelector = selector({
    mode: "playmode",
    assembly: "UnityAgentKit.PlayMode.Tests",
    className: "UnityAgentKit.PlayMode.Tests.TestWorkflowTests",
    methodName: "SamplePlayModeTest",
  });
  const playmodeList = listSnapshot({
    selector: playmodeSelector,
    tests: [
      {
        id: "UnityAgentKit.PlayMode.Tests.TestWorkflowTests.SamplePlayModeTest",
        name: "SamplePlayModeTest",
        fullName: "UnityAgentKit.PlayMode.Tests.TestWorkflowTests.SamplePlayModeTest",
        assembly: "UnityAgentKit.PlayMode.Tests",
        className: "UnityAgentKit.PlayMode.Tests.TestWorkflowTests",
        mode: "playmode",
      },
    ],
  });

  assert.deepEqual(parseTestListData(JSON.stringify(playmodeList)), playmodeList);
});

test("parser contracts accept reserved all selector list shape", () => {
  const allModeList = listSnapshot({ selector: selector({ mode: "all" }) });

  assert.deepEqual(parseTestListData(JSON.stringify(allModeList)), allModeList);
});

test("parser contracts reject invalid JSON", () => {
  assert.equal(parseTestListData("not-json"), null);
  assert.equal(parseTestJobData("not-json"), null);
  assert.equal(parseTestReportData("not-json"), null);
  assert.equal(parseTestReportPayloadData("not-json"), null);
});

test("parser contracts reject invalid selector mode edit", () => {
  const list = listSnapshot({ selector: { ...selector(), mode: "edit" as TestSelector["mode"] } });

  assert.equal(parseTestListData(JSON.stringify(list)), null);
});

test("parser contracts reject known legacy substitutes but allow unknown extras", () => {
  const list = listSnapshot();
  const job = jobSnapshot();
  const listWithFilterMode = { ...list, filterMode: "editmode" };
  const jobWithRequestedMode = { ...job, requestedMode: "editmode" };
  const listCaseWithAssemblyName = listSnapshot({
    tests: [
      {
        id: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
        name: "SamplePassingTest",
        fullName: "UnityAgentKit.Editor.Tests.TestWorkflowTests.SamplePassingTest",
        assembly: "UnityAgentKit.Editor.Tests",
        assemblyName: "UnityAgentKit.Editor.Tests",
        className: "UnityAgentKit.Editor.Tests.TestWorkflowTests",
        mode: "editmode",
      } as TestListSnapshot["tests"][number] & { assemblyName: string },
    ],
  });
  const listWithFutureField = { ...list, futureField: "ok" };

  assert.equal(parseTestListData(JSON.stringify(listWithFilterMode)), null);
  assert.equal(parseTestJobData(JSON.stringify(jobWithRequestedMode)), null);
  assert.equal(parseTestListData(JSON.stringify(listCaseWithAssemblyName)), null);
  assert.deepEqual(parseTestListData(JSON.stringify(listWithFutureField)), list);
});

test("parser contracts reject minimal invalid job/report/payload shapes", () => {
  assert.equal(parseTestJobData(JSON.stringify({ jobId: "test-job-1" })), null);
  assert.equal(parseTestReportData(JSON.stringify({ reportId: "test-report-1" })), null);
  assert.equal(parseTestReportPayloadData(JSON.stringify({ reportId: "test-report-1" })), null);
});

test("parser contracts reject invalid job state", () => {
  assert.equal(parseTestJobData(JSON.stringify(jobSnapshot({ state: "bogus" }))), null);
});

test("parser contracts reject invalid report terminalState", () => {
  assert.equal(parseTestReportData(JSON.stringify(reportSummary({ terminalState: "bogus" }))), null);
});

test("selector rejection: listTests rejects mode all before calling Unity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await listTests(options(record, transport.transport), {
    requestId: "req-list-rejected",
    selector: { ...selector(), mode: "all" },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.action, "list");
  assert.equal(result.code, "unsupported_selector_mode");
  assert.equal(result.diagnostics[0]?.code, "unsupported_selector_mode");
  transport.assertConsumed();
});

test("selector rejection: startTestRun rejects mode all before calling Unity", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await startTestRun(options(record, transport.transport), {
    requestId: "req-start-rejected",
    selector: { ...selector(), mode: "all" },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.action, "start");
  assert.equal(result.code, "unsupported_selector_mode");
  assert.equal(result.diagnostics[0]?.code, "unsupported_selector_mode");
  transport.assertConsumed();
});

test("lifecycle mapping: listTests maps discovery snapshot without claiming pass", async () => {
  const record = sampleHostRecord();
  const snapshot = listSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-list",
      operation: testListOperation,
      inputJson: JSON.stringify({ selector: selector() }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testListOperation, snapshot, "req-list") },
    },
  ]);

  const result = await listTests(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-list",
    selector: selector(),
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "list");
  assert.deepEqual(result.evidence, {
    completion: "state_snapshot",
    total: 1,
    verifiedTestPass: false,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("lifecycle mapping: startTestRun maps accepted job without claiming completion or pass", async () => {
  const record = sampleHostRecord();
  const job = jobSnapshot();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-start",
      operation: testStartOperation,
      inputJson: JSON.stringify({ selector: selector() }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStartOperation, job, "req-start") },
    },
  ]);

  const result = await startTestRun(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-start",
    selector: selector(),
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "start");
  assert.equal(result.job?.state, "accepted");
  assert.deepEqual(result.evidence, {
    completion: "request_accepted",
    jobState: "accepted",
    verifiedTestPass: false,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("lifecycle mapping: getTestStatus maps running job without collecting report", async () => {
  const record = sampleHostRecord();
  const job = jobSnapshot({ state: "running", updatedAt: "2026-05-28T10:00:04.000Z" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-status",
      operation: testStatusOperation,
      inputJson: JSON.stringify({ jobId: "test-job-1" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, job, "req-status") },
    },
  ]);

  const result = await getTestStatus(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-status",
    jobId: "test-job-1",
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "get_status");
  assert.equal(result.job?.state, "running");
  assert.equal(result.resource, undefined);
  assert.notEqual(result.evidence?.["completion"], "artifact_complete");
  assert.equal(result.evidence?.["verifiedTestPass"], false);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("result readback: failed report succeeds with matching host and payload summaries", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({
      projectRoot,
      reportId: "test-report-1",
      jobId: "test-job-1",
      total: 5,
      passed: 3,
      failed: 1,
      errors: 0,
      skipped: 1,
      inconclusive: 0,
      terminalState: "failed",
      verifiedTestPass: false,
      uri: "unity://test-reports/test-report-1",
    });
    const expectedPayloadSummary = reportPayload({
      reportId: "test-report-1",
      uri: "unity://test-reports/test-report-1",
      total: 5,
      passed: 3,
      failed: 1,
      skipped: 1,
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
        sizeBytes: Buffer.byteLength(JSON.stringify(expectedPayloadSummary, null, 2), "utf8"),
      },
      expectedPayloadSummary,
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "get_result");
    assert.equal(result.resource?.uri, "unity://test-reports/test-report-1");
    assert.equal(result.resource?.type, "test_report");
    assert.deepEqual(result.evidence, {
      completion: "artifact_complete",
      reportId: "test-report-1",
      verifiedTestPass: false,
    });
    assert.equal(result.data?.verifiedTestPass, false);
    assert.deepEqual(result.data?.payloadSummary, expectedPayloadSummary);
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: passed report succeeds with matching host and payload summaries", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({
      projectRoot,
      reportId: "test-report-pass",
      jobId: "test-job-pass",
      total: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
      terminalState: "completed",
      verifiedTestPass: true,
      failures: [],
      uri: "unity://test-reports/test-report-pass",
    });
    const expectedPayloadSummary = reportPayload({
      reportId: "test-report-pass",
      uri: "unity://test-reports/test-report-pass",
      total: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-pass",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-pass",
        sizeBytes: Buffer.byteLength(JSON.stringify(expectedPayloadSummary, null, 2), "utf8"),
      },
      expectedPayloadSummary,
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-pass",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-pass" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-pass") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-pass",
      jobId: "test-job-pass",
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.action, "get_result");
    assert.deepEqual(result.evidence, {
      completion: "artifact_complete",
      reportId: "test-report-pass",
      verifiedTestPass: true,
    });
    assert.equal(result.data?.verifiedTestPass, true);
    assert.deepEqual(result.data?.payloadSummary, expectedPayloadSummary);
    assert.equal(result.resource?.uri, "unity://test-reports/test-report-pass");
    assert.equal(result.resource?.type, "test_report");
    assert.equal(result.metadata?.["resourceContentBytes"], Buffer.byteLength(JSON.stringify(expectedPayloadSummary, null, 2), "utf8"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("lifecycle mapping: getTestStatus rejects job id mismatch", async () => {
  const record = sampleHostRecord();
  const job = jobSnapshot({ jobId: "other-job" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-status-job-mismatch",
      operation: testStatusOperation,
      inputJson: JSON.stringify({ jobId: "test-job-1" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testStatusOperation, job, "req-status-job-mismatch") },
    },
  ]);

  const result = await getTestStatus(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-status-job-mismatch",
    jobId: "test-job-1",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "test.job_id_mismatch");
  assert.equal(result.nextStep?.kind, "get_job_result");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.job_id_mismatch"));
  registry.assertConsumed();
  transport.assertConsumed();
});

test("result readback: rejects host summary job id mismatch", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot, jobId: "other-job" });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "other-job",
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-job-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-job-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-job-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.job_id_mismatch");
    assert.equal(result.nextStep?.kind, "get_job_result");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.job_id_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: missing required provenance metadata fails with retry guidance", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: undefined,
        hostEpoch: undefined,
        producerJobId: undefined,
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-resource-metadata-missing",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-resource-metadata-missing") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-resource-metadata-missing",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_mismatch");
    assert.equal(result.nextStep?.kind, "get_job_result");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_resource_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: resource sizeBytes mismatch fails with retry guidance", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
        sizeBytes: 1,
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-resource-size-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-resource-size-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-resource-size-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_mismatch");
    assert.equal(result.nextStep?.kind, "get_job_result");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_resource_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: resource metadata identity mismatch fails with retry guidance", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: "other-host",
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-resource-metadata-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-resource-metadata-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-resource-metadata-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_mismatch");
    assert.equal(result.nextStep?.kind, "get_job_result");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_resource_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: resource metadata job mismatch fails with retry guidance", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "other-job",
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-resource-job-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-resource-job-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-resource-job-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_mismatch");
    assert.equal(result.nextStep?.kind, "get_job_result");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_resource_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: non-terminal report state fails before artifact_complete", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({
      projectRoot,
      failed: 0,
      passed: 1,
      terminalState: "running",
      verifiedTestPass: true,
      failures: [],
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      reportPayload({ failed: 0, passed: 1 }),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-running",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-running") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-running",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_not_terminal");
    assert.notEqual(result.evidence?.["completion"], "artifact_complete");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: verified false mismatch fails when completed counts prove pass", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({
      projectRoot,
      total: 1,
      passed: 1,
      failed: 0,
      errors: 0,
      skipped: 0,
      inconclusive: 0,
      terminalState: "completed",
      verifiedTestPass: false,
      failures: [],
    });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      reportPayload({ passed: 1, failed: 0, errors: 0, skipped: 0, inconclusive: 0 }),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-verdict-false-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-verdict-false-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-verdict-false-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_verdict_mismatch");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_verdict_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: verified pass mismatch fails with diagnostics code", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot, verifiedTestPass: true });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      reportPayload(),
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-verdict-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-verdict-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-verdict-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_verdict_mismatch");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_verdict_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: missing resource fails with retry guidance", async () => {
  await withArtifactProject(async (projectRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-missing-resource",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-missing-resource") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-missing-resource",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_resource_failed");
    assert.equal(result.nextStep?.kind, "get_job_result");
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: invalid payload fails with diagnostics code", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      {
        reportId: "test-report-1",
        invalid: true,
      },
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-invalid-payload",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-invalid-payload") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-invalid-payload",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_payload_invalid");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_payload_invalid"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("result readback: payload mismatch fails with diagnostics code", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const record = sampleHostRecord({ projectRoot });
    const report = reportSummary({ projectRoot });
    const payload = reportPayload({ failed: 0, passed: 1, total: 1 });
    await writeTestReportFixture(
      artifactRoot,
      "test-report-1",
      {
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        producerJobId: "test-job-1",
      },
      payload,
    );
    const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
    const transport = transportWithProbesAndInvokes([
      { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    ], [
      {
        port: record.port,
        requestId: "req-result-mismatch",
        operation: testResultOperation,
        inputJson: JSON.stringify({ jobId: "test-job-1" }),
        result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, report, "req-result-mismatch") },
      },
    ]);

    const result = await getTestResult(options(record, transport.transport, {
      projectRoot,
      readRegistry: registry.readRegistry,
    }), {
      requestId: "req-result-mismatch",
      jobId: "test-job-1",
    });

    assert.equal(result.status, "failed");
    assert.equal(result.code, "test.report_payload_mismatch");
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "test.report_payload_mismatch"));
    registry.assertConsumed();
    transport.assertConsumed();
  });
});

test("continuity guards: host identity mismatch maps to lost continuity", async () => {
  const record = sampleHostRecord();
  const mismatchedReport = reportSummary({ hostId: "other-host" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-result-host-mismatch",
      operation: testResultOperation,
      inputJson: JSON.stringify({ jobId: "test-job-1" }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testResultOperation, mismatchedReport, "req-result-host-mismatch") },
    },
  ]);

  const result = await getTestResult(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-result-host-mismatch",
    jobId: "test-job-1",
  });

  assert.equal(result.status, "lost");
  assert.equal(result.code, "host.continuity_lost");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("continuity guards: projectRoot mismatch maps to failed", async () => {
  const record = sampleHostRecord();
  const mismatchedList = listSnapshot({ projectRoot: "D:/other/unity" });
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    {
      port: record.port,
      requestId: "req-list-root-mismatch",
      operation: testListOperation,
      inputJson: JSON.stringify({ selector: selector() }),
      result: { ok: true, statusCode: 200, body: succeededEnvelope(record, testListOperation, mismatchedList, "req-list-root-mismatch") },
    },
  ]);

  const result = await listTests(options(record, transport.transport, { readRegistry: registry.readRegistry }), {
    requestId: "req-list-root-mismatch",
    selector: selector(),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "test.project_root_mismatch");
  registry.assertConsumed();
  transport.assertConsumed();
});
