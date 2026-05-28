import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { readUnityResource } from "../resources/readback.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
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
