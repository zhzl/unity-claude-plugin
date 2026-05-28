import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitJobReference, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { readUnityResource } from "../resources/readback.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import {
  hasVerifiedTestPassMismatch,
  isTerminalTestReportState,
  parseTestReportData,
  parseTestReportPayloadData,
  rejectUnsupportedSelectorMode,
  reportPayloadMatchesSummary,
  testJobResultFromHostResult,
  testListOperation,
  testListResultFromHostResult,
  testResultOperation,
  testReportSummaryFromHostResult,
  testStartOperation,
  testStatusOperation,
  type TestSelector,
} from "../diagnostics/test.ts";

export interface TestWorkflowOptions { registryPath: string; projectRoot: string; transport: HostTransport; readRegistry?: RegistryReader; }
export interface TestSelectorActionOptions { selector: TestSelector; requestId?: string; }
export interface TestJobActionOptions { jobId: string; requestId?: string; }
export interface RunAndCollectTestOptions extends TestSelectorActionOptions { timeoutMs?: number; pollIntervalMs?: number; sleep?: (ms: number) => Promise<void>; now?: () => number; }
export interface RunAndVerifyTestOptions extends RunAndCollectTestOptions {}

export async function listTests(workflow: TestWorkflowOptions, options: TestSelectorActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-list-${Date.now()}`;
  if (options.selector.mode === "all") return rejectUnsupportedSelectorMode("list", requestId);
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: testListOperation, requestId, inputJson: JSON.stringify({ selector: options.selector }) },
  });
  return testListResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function startTestRun(workflow: TestWorkflowOptions, options: TestSelectorActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-start-${Date.now()}`;
  if (options.selector.mode === "all") return rejectUnsupportedSelectorMode("start", requestId);
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: testStartOperation, requestId, inputJson: JSON.stringify({ selector: options.selector }) },
  });
  return testJobResultFromHostResult(hostResult.result, "start", workflow.projectRoot);
}

export async function getTestStatus(workflow: TestWorkflowOptions, options: TestJobActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-status-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: testStatusOperation, requestId, inputJson: JSON.stringify({ jobId: options.jobId }) },
  });
  const mapped = testJobResultFromHostResult(hostResult.result, "get_status", workflow.projectRoot);
  if (mapped.status !== "succeeded") return mapped;

  const job = mapped.data as Record<string, unknown>;
  if (job.jobId !== options.jobId) {
    return jobIdMismatchFailure(
      mapped,
      "get_status",
      testStatusOperation,
      options.jobId,
      typeof job.jobId === "string" ? job.jobId : undefined,
    );
  }

  return mapped;
}

export async function getTestResult(workflow: TestWorkflowOptions, options: TestJobActionOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-result-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: testResultOperation, requestId, inputJson: JSON.stringify({ jobId: options.jobId }) },
  });

  const mapped = testReportSummaryFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") return mapped;

  const summary = parseTestReportData(mapped.data);
  if (summary === null) return mapped;

  if (summary.jobId !== options.jobId) {
    return jobIdMismatchFailure(mapped, "get_result", testResultOperation, options.jobId, summary.jobId);
  }

  const readback = await readUnityResource(workflow.projectRoot, summary.uri);
  if (!readback.ok) {
    const diagnostic: UnityAgentKitDiagnostic = { ...readback.diagnostic, code: "test.report_resource_failed" };
    return definePublicResult({
      status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation,
      requestId: mapped.requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch,
      summary: "Test report resource readback failed.", code: "test.report_resource_failed", message: "Test report resource readback failed.",
      data: summary, diagnostics: [...mapped.diagnostics, diagnostic],
      evidence: { completion: "artifact_readback_failed", reportId: summary.reportId, resourceUri: summary.uri, reason: readback.reason },
      startedAt: mapped.startedAt, completedAt: mapped.completedAt, durationMs: mapped.durationMs,
      nextStep: { kind: "get_job_result", jobId: options.jobId, reason: "Retry get_result after the report artifact is available." },
    });
  }

  const payloadSummary = parseTestReportPayloadData(readback.contentBytes);
  if (payloadSummary === null) {
    return payloadFailure(mapped, summary, "test.report_payload_invalid", "Test report payload summary is invalid.", options.jobId);
  }

  if (!reportPayloadMatchesSummary(payloadSummary, summary)) {
    return payloadFailure(mapped, summary, "test.report_payload_mismatch", "Test report payload summary does not match host metadata.", options.jobId, payloadSummary);
  }

  if (!resourceMetadataMatchesSummary(readback.metadata, summary, readback.contentBytes.byteLength)) {
    return payloadFailure(mapped, summary, "test.report_resource_mismatch", "Test report resource metadata does not match host metadata.", options.jobId, {
      hostId: readback.metadata.hostId,
      hostEpoch: readback.metadata.hostEpoch,
      producerJobId: readback.metadata.producerJobId,
      sizeBytes: readback.metadata.sizeBytes,
      contentBytes: readback.contentBytes.byteLength,
      id: readback.metadata.id,
      uri: readback.metadata.uri,
    });
  }

  if (!isTerminalTestReportState(summary.terminalState)) {
    return payloadFailure(mapped, summary, "test.report_not_terminal", "Test report terminalState is not terminal.", options.jobId);
  }

  if (hasVerifiedTestPassMismatch(summary)) {
    return payloadFailure(mapped, summary, "test.report_verdict_mismatch", "Test report verifiedTestPass does not match terminal state or failure counts.", options.jobId);
  }

  return definePublicResult({
    status: "succeeded", tool: "unity_test", action: "get_result", operation: testResultOperation,
    requestId: mapped.requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch,
    summary: "Test report resource read back successfully.", data: { ...summary, payloadSummary }, diagnostics: mapped.diagnostics,
    evidence: { completion: "artifact_complete", reportId: summary.reportId, verifiedTestPass: summary.verifiedTestPass },
    resource: readback.resource,
    metadata: { resourceFilePath: readback.filePath, resourceContentBytes: readback.contentBytes.byteLength },
    startedAt: mapped.startedAt, completedAt: mapped.completedAt, durationMs: mapped.durationMs,
  });
}

export async function runAndCollectTests(workflow: TestWorkflowOptions, options: RunAndCollectTestOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-run-and-collect-${Date.now()}`;
  const { timeoutMs, pollIntervalMs } = coerceAggregateTimingOptions(options);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;

  const startedAt = now();
  const startResult = await startTestRun(workflow, {
    requestId: `${requestId}-start`,
    selector: options.selector,
  });
  if (startResult.status !== "succeeded") {
    return remapTestAggregateAction(startResult, "run_and_collect");
  }

  const startJob = startResult.job;
  if (startJob === undefined) {
    return aggregateEvidenceFailure(startResult, "run_and_collect", "Test start did not return a job reference.");
  }

  let lastJob: UnityAgentKitJobReference = startJob;
  let pollIndex = 1;
  for (;;) {
    const remainingMs = remainingTimeoutMs(startedAt, timeoutMs, now());
    if (remainingMs <= 0) {
      return testAggregateTimeoutResult(requestId, "run_and_collect", startJob);
    }

    const statusResult = await getTestStatus(workflow, {
      requestId: `${requestId}-status-${pollIndex++}`,
      jobId: startJob.jobId,
    });
    if (statusResult.status !== "succeeded") {
      return remapTestAggregateAction(statusResult, "run_and_collect");
    }
    if (statusResult.job !== undefined) {
      lastJob = statusResult.job;
    }

    if (isTerminalTestReportState(lastJob.state)) {
      const reportResult = await getTestResult(workflow, {
        requestId: `${requestId}-result`,
        jobId: startJob.jobId,
      });
      if (reportResult.status !== "succeeded") {
        return remapTestAggregateAction(reportResult, "run_and_collect");
      }
      return collectedReportResult(reportResult, lastJob);
    }

    const sleepMs = Math.min(pollIntervalMs, remainingMs);
    await sleep(sleepMs);
  }
}

export async function runAndVerifyTests(workflow: TestWorkflowOptions, options: RunAndVerifyTestOptions): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `test-run-and-verify-${Date.now()}`;
  const collected = await runAndCollectTests(workflow, {
    ...options,
    requestId,
  });
  if (collected.status !== "succeeded") {
    return remapTestAggregateAction(collected, "run_and_verify");
  }

  const report = collected.data as Record<string, unknown> | undefined;
  if (report === undefined) {
    return aggregateEvidenceFailure(collected, "run_and_verify", "Collected test report is missing verification data.");
  }

  const failed = typeof report.failed === "number" ? report.failed : undefined;
  const errors = typeof report.errors === "number" ? report.errors : undefined;
  const verifiedTestPass = report.verifiedTestPass === true;
  if (failed === undefined || errors === undefined) {
    return aggregateEvidenceFailure(collected, "run_and_verify", "Collected test report is missing failure counts for verification.");
  }

  if (failed === 0 && errors === 0 && verifiedTestPass) {
    return definePublicResult({
      ...collected,
      action: "run_and_verify",
      summary: "Test report collected and verified as passing.",
      evidence: {
        completion: "test_report_verified",
        reportId: collected.resource?.reportId,
        verifiedTestPass: true,
      },
    });
  }

  return testVerificationFailedResult(collected);
}

function failureCompletion(code: string): string {
  if (code === "test.report_payload_invalid") return "artifact_payload_invalid";
  if (code === "test.report_payload_mismatch") return "artifact_payload_mismatch";
  if (code === "test.report_resource_mismatch") return "artifact_resource_mismatch";
  if (code === "test.report_not_terminal") return "artifact_not_terminal";
  return "artifact_verdict_mismatch";
}

function resourceMetadataMatchesSummary(
  metadata: {
    hostId?: string;
    hostEpoch?: number;
    producerJobId?: string;
    sizeBytes?: number;
    id: string;
    uri: string;
  },
  summary: NonNullable<ReturnType<typeof parseTestReportData>>,
  contentBytes: number,
): boolean {
  return metadata.id === summary.reportId &&
    metadata.uri === summary.uri &&
    metadata.hostId === summary.hostId &&
    metadata.hostEpoch === summary.hostEpoch &&
    metadata.producerJobId === summary.jobId &&
    metadata.sizeBytes === contentBytes;
}

function remapTestAggregateAction(
  result: UnityAgentKitPublicResult,
  action: "run_and_collect" | "run_and_verify",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_test",
    action,
    summary: result.summary || "Aggregate test workflow could not establish trusted evidence.",
  });
}

function collectedReportResult(
  reportResult: UnityAgentKitPublicResult,
  job: UnityAgentKitJobReference,
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...reportResult,
    action: "run_and_collect",
    summary: "Test report collected.",
    job,
    evidence: {
      completion: "test_report_collected",
      reportId: reportResult.resource?.reportId,
      verifiedTestPass: reportResult.data !== undefined && typeof reportResult.data === "object" && reportResult.data !== null
        ? (reportResult.data as Record<string, unknown>).verifiedTestPass === true
        : false,
    },
  });
}

function testVerificationFailedResult(collected: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  const report = collected.data as Record<string, unknown>;
  const reportId = collected.resource?.reportId;
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "validation",
    severity: "error",
    code: "test.verification_failed",
    message: "Collected test report did not verify as passing.",
    details: {
      reportId,
      failed: report.failed,
      errors: report.errors,
      verifiedTestPass: report.verifiedTestPass,
    },
    attribution: {
      operation: testResultOperation,
      requestId: collected.requestId,
    },
  };

  return definePublicResult({
    ...collected,
    status: "failed",
    action: "run_and_verify",
    code: "test.verification_failed",
    message: "Collected test report did not verify as passing.",
    summary: "Collected test report did not verify as passing.",
    diagnostics: [...collected.diagnostics, diagnostic],
    evidence: {
      completion: "test_report_collected_verification_failed",
      reportId,
      verifiedTestPass: report.verifiedTestPass === true,
    },
  });
}

function aggregateEvidenceFailure(
  result: UnityAgentKitPublicResult,
  action: "run_and_collect" | "run_and_verify",
  message: string,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "workflow",
    severity: "error",
    code: "test.aggregate_evidence_missing",
    message,
    attribution: {
      operation: action === "run_and_collect" ? testStatusOperation : testResultOperation,
      requestId: result.requestId,
    },
  };

  return definePublicResult({
    ...result,
    status: "failed",
    tool: "unity_test",
    action,
    code: diagnostic.code,
    message,
    summary: message,
    diagnostics: [...result.diagnostics, diagnostic],
  });
}

function testAggregateTimeoutResult(
  requestId: string,
  action: "run_and_collect" | "run_and_verify",
  job: UnityAgentKitJobReference,
): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_test",
    action,
    requestId,
    summary: "Timed out waiting for Unity test run to reach a terminal state.",
    mayStillBeRunning: true,
    safeToRetry: false,
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: job.jobId,
      reason: "Check the latest Unity test job status before deciding whether to retry the aggregate workflow.",
    },
    job,
  });
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, currentTime: number): number {
  return timeoutMs - Math.max(0, currentTime - startedAt);
}

function coerceAggregateTimingOptions(options: RunAndCollectTestOptions): {
  timeoutMs: number;
  pollIntervalMs: number;
} {
  return {
    timeoutMs: positiveFiniteOrDefault(options.timeoutMs, 300_000),
    pollIntervalMs: positiveFiniteOrDefault(options.pollIntervalMs, 1_000),
  };
}

function positiveFiniteOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function jobIdMismatchFailure(
  mapped: UnityAgentKitPublicResult,
  action: "get_status" | "get_result",
  operation: typeof testStatusOperation | typeof testResultOperation,
  expectedJobId: string,
  actualJobId: string | undefined,
): UnityAgentKitPublicResult {
  const message = `Test ${action} jobId does not match the requested jobId.`;
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "validation",
    severity: "error",
    code: "test.job_id_mismatch",
    message,
    details: { expectedJobId, actualJobId },
    attribution: { operation, requestId: mapped.requestId },
  };

  return definePublicResult({
    status: "failed", tool: "unity_test", action, operation,
    requestId: mapped.requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch,
    summary: message, code: diagnostic.code, message,
    data: mapped.data, diagnostics: [...mapped.diagnostics, diagnostic],
    evidence: mapped.evidence,
    startedAt: mapped.startedAt, completedAt: mapped.completedAt, durationMs: mapped.durationMs,
    nextStep: { kind: "get_job_result", jobId: expectedJobId, reason: "Retry get_result for the requested Unity test job." },
  });
}

function payloadFailure(mapped: UnityAgentKitPublicResult, summary: NonNullable<ReturnType<typeof parseTestReportData>>, code: string, message: string, jobId: string, payloadSummary?: unknown): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "validation",
    severity: "error",
    code,
    message,
    details: payloadSummary === undefined ? { reportId: summary.reportId } : { reportId: summary.reportId, payloadSummary },
    attribution: { operation: testResultOperation, requestId: mapped.requestId },
  };
  return definePublicResult({
    status: "failed", tool: "unity_test", action: "get_result", operation: testResultOperation,
    requestId: mapped.requestId, hostId: mapped.hostId, hostEpoch: mapped.hostEpoch,
    summary: message, code, message, data: summary,
    diagnostics: [...mapped.diagnostics, diagnostic],
    evidence: { completion: failureCompletion(code), reportId: summary.reportId, verifiedTestPass: summary.verifiedTestPass },
    startedAt: mapped.startedAt, completedAt: mapped.completedAt, durationMs: mapped.durationMs,
    nextStep: { kind: "get_job_result", jobId, reason: "Retry get_result after Unity rewrites a valid report artifact." },
  });
}
