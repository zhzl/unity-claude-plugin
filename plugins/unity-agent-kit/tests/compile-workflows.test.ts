import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  compileAndCheck,
  getCompileReport,
  getCompileState,
  requestCompile,
  waitForCompileIdle,
  type CompileWorkflowOptions,
} from "../src/workflows/compile.ts";
import {
  compileReportGetOperation,
  compileRequestOperation,
  compileStateOperation,
  isCompileIdle,
  judgeCompileReport,
  parseCompileReportData,
  parseCompileRequestData,
  parseCompileStateData,
  type CompileReportSnapshot,
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

function compileReport(overrides: Partial<CompileReportSnapshot> = {}): CompileReportSnapshot {
  return {
    reportId: "compile-report-3",
    compileCycleId: "compile-cycle-3",
    hostId: "host-compile",
    hostEpoch: 7,
    projectRoot: "D:/ai/unity-claude-plugin/unity",
    unityVersion: "2022.3.61f1",
    completedAt: "2026-05-25T10:00:05.000Z",
    invalidationTokenAtCompletion: 3,
    compilerErrorCount: 0,
    compilerWarningCount: 0,
    compilerMessagesSummary: "0 errors, 0 warnings",
    compilerMessages: [],
    assemblyCompilationFinishedSeen: true,
    compilationFinishedSeen: true,
    editorIdleAfterCompilation: true,
    ...overrides,
  };
}

function uncertainEnvelope(record: UnityAgentKitHostRecord, operation: string, requestId: string, code: string, message: string): Record<string, unknown> {
  return {
    status: "uncertain",
    operation,
    requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: message,
    data: "",
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code,
        message,
        attribution: { operation, requestId },
      },
    ],
    startedAt: "2026-05-25T10:00:00.000Z",
    completedAt: "2026-05-25T10:00:00.010Z",
    durationMs: 10,
    code,
    message,
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

test("compile workflow exports CompileRequestOptions as the public request type", async () => {
  const source = await readFile(new URL("../src/workflows/compile.ts", import.meta.url), "utf8");

  assert.match(source, /export interface CompileRequestOptions extends CompileActionOptions \{/);
  assert.match(source, /options: CompileRequestOptions = \{\}/);
});

test("parseCompileStateDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const state = compileState();

  assert.deepEqual(parseCompileStateData(JSON.stringify(state)), state);
  assert.equal(parseCompileStateData("not-json"), null);
  assert.equal(parseCompileStateData(JSON.stringify({ projectRoot: state.projectRoot })), null);
});

test("parseCompileStateDataPreservesRecentCompileReportIdWhenPresent", () => {
  const state = compileState({
    hasRecentCompileReport: true,
    recentCompileReportId: "compile-report-123",
  });

  assert.deepEqual(parseCompileStateData(JSON.stringify(state)), state);
});

test("parseCompileStateDataRejectsNegativeInvalidationToken", () => {
  const state = compileState({ invalidationToken: -1 });

  assert.equal(parseCompileStateData(JSON.stringify(state)), null);
});

test("parseCompileRequestDataAcceptsJsonStringAndRejectsInvalidShape", () => {
  const request = compileRequest();

  assert.deepEqual(parseCompileRequestData(JSON.stringify(request)), request);
  assert.equal(parseCompileRequestData("not-json"), null);
  assert.equal(parseCompileRequestData(JSON.stringify({ requested: true })), null);
});

test("parseCompileRequestDataRejectsNegativeInvalidationTokens", () => {
  const beforeRequestNegative = compileRequest({ invalidationTokenBeforeRequest: -1 });
  const afterRequestNegative = compileRequest({ invalidationTokenAfterRequest: -1 });

  assert.equal(parseCompileRequestData(JSON.stringify(beforeRequestNegative)), null);
  assert.equal(parseCompileRequestData(JSON.stringify(afterRequestNegative)), null);
});

test("isCompileIdleUsesCompilingAndUpdatingOnly", () => {
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: false, isIdle: false })), true);
  assert.equal(isCompileIdle(compileState({ isCompiling: true, isUpdating: false, isIdle: true })), false);
  assert.equal(isCompileIdle(compileState({ isCompiling: false, isUpdating: true, isIdle: true })), false);
});

test("parseCompileReportDataAcceptsCompleteReportAndRejectsInvalidShape", () => {
  const report = compileReport();

  assert.deepEqual(parseCompileReportData(JSON.stringify(report)), report);
  assert.equal(parseCompileReportData("not-json"), null);
  assert.equal(parseCompileReportData(JSON.stringify({ reportId: report.reportId })), null);
});

test("parseCompileReportDataPreservesCompilerMessages", () => {
  const report = compileReport({
    compilerErrorCount: 1,
    compilerWarningCount: 1,
    compilerMessagesSummary: "1 error, 1 warning",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "CS1002: ; expected",
      },
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Warning.cs",
        line: 3,
        column: 1,
        type: "warning",
        message: "CS0168: variable is declared but never used",
      },
    ],
  });

  assert.deepEqual(parseCompileReportData(JSON.stringify(report)), report);
});

test("parseCompileReportDataRejectsEmptyCompilerMessage", () => {
  const report = compileReport({
    compilerErrorCount: 1,
    compilerMessagesSummary: "1 error, 0 warnings",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "",
      },
    ],
  });

  assert.equal(parseCompileReportData(JSON.stringify(report)), null);
});

test("judgeCompileReportSucceedsOnlyFromCompleteMatchingReport", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport();

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-success",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "compile_and_check");
  assert.equal(result.data?.["compilerMessagesAttributed"], true);
  assert.equal(result.data?.["compilerErrorCount"], 0);
  assert.equal(result.data?.["usedRecentCompileReport"], true);
  assert.deepEqual(result.evidence, {
    completion: "compile_verified",
    proof: "recent_complete_report",
    verifiedCompileSuccess: true,
  });
});

test("judgeCompileReportFailsOnCompilerErrors", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({
    compilerErrorCount: 1,
    compilerMessagesSummary: "1 error, 0 warnings",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "CS1002: ; expected",
      },
    ],
  });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-errors",
    usedRecentCompileReport: false,
    requestedInvalidationToken: 3,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.code, "compile.compiler_error");
  assert.equal(result.data?.["compilerErrorCount"], 1);
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
});

test("judgeCompileReportReturnsUncertainForTokenMismatch", () => {
  const state = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ invalidationTokenAtCompletion: 3 });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-token",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.recent_report_invalidated");
  assert.deepEqual(result.evidence, {
    completion: "compile_proof_incomplete",
    proof: "recent_complete_report",
    verifiedCompileSuccess: false,
  });
});

test("judgeCompileReportReturnsUncertainForIncompleteLifecycle", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ compilationFinishedSeen: false });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-incomplete",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.lifecycle_incomplete");
  assert.deepEqual(result.evidence, {
    completion: "compile_proof_incomplete",
    proof: "recent_complete_report",
    verifiedCompileSuccess: false,
  });
});

test("judgeCompileReportReturnsUncertainForCompilerMessageCountMismatch", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({
    compilerMessagesSummary: "0 errors, 0 warnings",
    compilerMessages: [
      {
        assemblyPath: "Library/ScriptAssemblies/Assembly-CSharp.dll",
        file: "Assets/Broken.cs",
        line: 12,
        column: 7,
        type: "error",
        message: "CS1002: ; expected",
      },
    ],
  });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-judge-count-mismatch",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.report_count_mismatch");
  assert.equal(result.evidence?.["verifiedCompileSuccess"], false);
  assert.equal(result.diagnostics[0]?.code, "compile.report_count_mismatch");
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

test("getCompileReportMapsTrustedHostEnvelopeAsInternalHelper", async () => {
  const record = sampleHostRecord();
  const report = compileReport();
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileReportGetOperation, requestId: "req-report", inputJson: JSON.stringify({ reportId: "compile-report-3" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-report") } },
  ]);

  const result = await getCompileReport(options(record, transport.transport, registry.readRegistry), { requestId: "req-report", reportId: "compile-report-3" });

  assert.equal(result.status, "succeeded");
  assert.equal(result.tool, "unity_compile_internal");
  assert.equal(result.action, "read_compile_report");
  assert.equal(result.operation, compileReportGetOperation);
  assert.equal(result.metadata?.["publicAction"], false);
  assert.deepEqual(result.data, report);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckUsesValidRecentCompleteReportWithoutRequestingCompilationOrLongWait", async () => {
  const record = sampleHostRecord();
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport();
  const sleeps: number[] = [];
  const registry = registrySequence([{ ok: true, record }, { ok: true, record }, { ok: true, record }, { ok: true, record }]);
  const transport = transportWithProbesAndInvokes([
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
    { port: record.port, result: { ok: true, statusCode: 200, body: record } },
  ], [
    { port: record.port, operation: compileStateOperation, requestId: "req-check-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, state, "req-check-state-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-check-report", inputJson: JSON.stringify({ reportId: "compile-report-3" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-check-report") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-check",
    timeoutMs: 120_000,
    sleep: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.action, "compile_and_check");
  assert.equal(result.data?.["usedRecentCompileReport"], true);
  assert.equal(result.data?.["compilerMessagesAttributed"], true);
  assert.deepEqual(sleeps, []);
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckRequestsWaitsAndChecksCurrentCycleReport", async () => {
  const record = sampleHostRecord();
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-4" });
  const report = compileReport({
    reportId: "compile-report-4",
    compileCycleId: "compile-cycle-4",
    invalidationTokenAtCompletion: 4,
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
    { port: record.port, operation: compileStateOperation, requestId: "req-cycle-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, initial, "req-cycle-state-1") } },
    { port: record.port, operation: compileRequestOperation, requestId: "req-cycle-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-cycle-request") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-cycle-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, settled, "req-cycle-idle-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-cycle-report", inputJson: JSON.stringify({ reportId: "compile-report-4" }), result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileReportGetOperation, report, "req-cycle-report") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-cycle",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.data?.["usedRecentCompileReport"], false);
  assert.equal(result.data?.["invalidationTokenAtCheck"], 4);
  assert.equal(result.evidence?.["proof"], "current_cycle_report");
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckReturnsUncertainWhenIdleSettlesWithoutCompileReport", async () => {
  const record = sampleHostRecord();
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: false });
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
    { port: record.port, operation: compileStateOperation, requestId: "req-missing-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, initial, "req-missing-state-1") } },
    { port: record.port, operation: compileRequestOperation, requestId: "req-missing-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileRequestOperation, request, "req-missing-request") } },
    { port: record.port, operation: compileStateOperation, requestId: "req-missing-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(record, compileStateOperation, settled, "req-missing-idle-1") } },
    { port: record.port, operation: compileReportGetOperation, requestId: "req-missing-report", result: { ok: true, statusCode: 200, body: uncertainEnvelope(record, compileReportGetOperation, "req-missing-report", "compile.report_missing", "No complete compile report is available.") } },
  ]);

  const result = await compileAndCheck(options(record, transport.transport, registry.readRegistry), {
    requestId: "req-missing",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "compile.report_missing");
  assert.deepEqual(result.evidence, {
    completion: "compile_proof_incomplete",
    proof: "current_cycle_report",
    verifiedCompileSuccess: false,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckReturnsUncertainWhenCurrentCycleReportReadHostDrifts", async () => {
  const stable = sampleHostRecord({ hostId: "host-stable", hostEpoch: 7, port: 49300 });
  const rebound = sampleHostRecord({ hostId: "host-rebound", hostEpoch: 8, port: 49301 });
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-4" });
  const registry = registrySequence([
    { ok: true, record: stable }, { ok: true, record: stable },
    { ok: true, record: stable }, { ok: true, record: stable },
    { ok: true, record: stable }, { ok: true, record: stable },
    { ok: true, record: rebound }, { ok: true, record: rebound },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: stable.port, result: { ok: true, statusCode: 200, body: stable } },
    { port: stable.port, result: { ok: true, statusCode: 200, body: stable } },
    { port: stable.port, result: { ok: true, statusCode: 200, body: stable } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: stable.port, operation: compileStateOperation, requestId: "req-report-drift-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(stable, compileStateOperation, initial, "req-report-drift-state-1") } },
    { port: stable.port, operation: compileRequestOperation, requestId: "req-report-drift-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(stable, compileRequestOperation, request, "req-report-drift-request") } },
    { port: stable.port, operation: compileStateOperation, requestId: "req-report-drift-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(stable, compileStateOperation, settled, "req-report-drift-idle-1") } },
    { port: rebound.port, operation: compileReportGetOperation, requestId: "req-report-drift-report", inputJson: JSON.stringify({ reportId: "compile-report-4" }), result: { ok: true, statusCode: 200, body: uncertainEnvelope(rebound, compileReportGetOperation, "req-report-drift-report", "compile.report_missing", "No complete compile report is available.") } },
  ]);

  const result = await compileAndCheck({ registryPath: "ignored", projectRoot: stable.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, {
    requestId: "req-report-drift",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "host.continuity_lost");
  assert.deepEqual(result.evidence, {
    completion: "compile_proof_incomplete",
    proof: "current_cycle_report",
    verifiedCompileSuccess: false,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});

test("compileAndCheckRejectsLongTimeoutWithoutExplicitIntent", async () => {
  const record = sampleHostRecord();
  const transport = transportWithProbesAndInvokes([], []);

  const result = await compileAndCheck(options(record, transport.transport), {
    requestId: "req-long-timeout",
    timeoutMs: 120_001,
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.code, "compile.long_wait_requires_intent");
  transport.assertConsumed();
});

test("compileAndCheckReturnsUncertainOnReportHostMismatch", () => {
  const state = compileState({ hasRecentCompileReport: true, recentCompileReportId: "compile-report-3" });
  const report = compileReport({ hostId: "other-host" });

  const result = judgeCompileReport({
    report,
    state,
    hostId: "host-compile",
    hostEpoch: 7,
    requestId: "req-host-mismatch",
    usedRecentCompileReport: true,
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "host.continuity_lost");
});

test("compileAndCheckReturnsUncertainWhenCurrentCycleIdleHostChanges", async () => {
  const first = sampleHostRecord({ hostId: "host-before", hostEpoch: 7, port: 49300 });
  const rebound = sampleHostRecord({ hostId: "host-after", hostEpoch: 8, port: 49301 });
  const initial = compileState({ invalidationToken: 3, hasRecentCompileReport: false });
  const request = compileRequest({ invalidationTokenBeforeRequest: 3, invalidationTokenAfterRequest: 4 });
  const settled = compileState({ invalidationToken: 4, hasRecentCompileReport: true, recentCompileReportId: "compile-report-4" });
  const registry = registrySequence([
    { ok: true, record: first }, { ok: true, record: first },
    { ok: true, record: first }, { ok: true, record: first },
    { ok: true, record: rebound }, { ok: true, record: rebound },
  ]);
  const transport = transportWithProbesAndInvokes([
    { port: first.port, result: { ok: true, statusCode: 200, body: first } },
    { port: first.port, result: { ok: true, statusCode: 200, body: first } },
    { port: rebound.port, result: { ok: true, statusCode: 200, body: rebound } },
  ], [
    { port: first.port, operation: compileStateOperation, requestId: "req-continuity-state-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(first, compileStateOperation, initial, "req-continuity-state-1") } },
    { port: first.port, operation: compileRequestOperation, requestId: "req-continuity-request", result: { ok: true, statusCode: 200, body: succeededEnvelope(first, compileRequestOperation, request, "req-continuity-request") } },
    { port: rebound.port, operation: compileStateOperation, requestId: "req-continuity-idle-1", result: { ok: true, statusCode: 200, body: succeededEnvelope(rebound, compileStateOperation, settled, "req-continuity-idle-1") } },
  ]);

  const result = await compileAndCheck({ registryPath: "ignored", projectRoot: first.projectRoot, readRegistry: registry.readRegistry, transport: transport.transport }, {
    requestId: "req-continuity",
    timeoutMs: 1_000,
    pollIntervalMs: 25,
    sleep: async () => {},
  });

  assert.equal(result.status, "uncertain");
  assert.equal(result.code, "host.continuity_lost");
  assert.deepEqual(result.evidence, {
    completion: "compile_proof_incomplete",
    proof: "current_cycle_report",
    verifiedCompileSuccess: false,
  });
  registry.assertConsumed();
  transport.assertConsumed();
});
