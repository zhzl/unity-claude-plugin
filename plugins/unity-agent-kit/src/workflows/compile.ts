import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import {
  compileReportGetOperation,
  compileRequestOperation,
  compileRequestResultFromHostResult,
  compileStateOperation,
  compileStateResultFromHostResult,
  internalCompileReportResultFromHostResult,
  isCompileIdle,
  judgeCompileReport,
  parseCompileRequestData,
  parseCompileStateData,
  type CompileStateSnapshot,
} from "../diagnostics/compile.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import { executeWithRebindAwareness } from "./rebind.ts";

export interface CompileWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface CompileActionOptions {
  requestId?: string;
}

export interface CompileRequestOptions extends CompileActionOptions {
  reason?: string;
}

export interface CompileReportOptions extends CompileActionOptions {
  reportId?: string;
}

export interface WaitForCompileIdleOptions extends CompileActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface CompileAndCheckOptions extends CompileActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  allowLongWait?: boolean;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getCompileState(
  workflow: CompileWorkflowOptions,
  action: CompileActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = action.requestId ?? `compile-state-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileStateOperation,
      requestId,
    },
  });

  return compileStateResultFromHostResult(hostResult.result, "get_state", workflow.projectRoot);
}

export async function requestCompile(
  workflow: CompileWorkflowOptions,
  options: CompileRequestOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-request-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileRequestOperation,
      requestId,
      ...(options.reason === undefined ? {} : { inputJson: JSON.stringify({ reason: options.reason }) }),
    },
  });

  return compileRequestResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function getCompileReport(
  workflow: CompileWorkflowOptions,
  options: CompileReportOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-report-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: compileReportGetOperation,
      requestId,
      ...(options.reportId === undefined ? {} : { inputJson: JSON.stringify({ reportId: options.reportId }) }),
    },
  });

  return internalCompileReportResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function waitForCompileIdle(
  workflow: CompileWorkflowOptions,
  options: WaitForCompileIdleOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const baseRequestId = options.requestId ?? `compile-wait-for-idle-${Date.now()}`;
  const deadline = now() + timeoutMs;
  const carriedDiagnostics: UnityAgentKitDiagnostic[] = [];
  let attempt = 0;

  while (true) {
    attempt += 1;
    const stateResult = await getCompileState(workflow, { requestId: `${baseRequestId}-${attempt}` });
    collectReboundDiagnostics(stateResult.diagnostics, carriedDiagnostics);

    if (stateResult.status !== "succeeded") {
      return withCarriedDiagnostics(remapCompileAction(stateResult, "wait_for_idle"), carriedDiagnostics);
    }

    const snapshot = parseCompileStateData(stateResult.data);
    if (snapshot === null) {
      return withCarriedDiagnostics(
        compileStateResultFromHostResult(stateResult, "wait_for_idle", workflow.projectRoot),
        carriedDiagnostics,
      );
    }

    if (isCompileIdle(snapshot)) {
      const idleResult = definePublicResult({
        ...stateResult,
        action: "wait_for_idle",
        summary: "Compile state settled to idle. Compile success is not verified.",
        evidence: {
          completion: "state_settled",
          idle: true,
          verifiedCompileSuccess: false,
        },
      });
      return withCarriedDiagnostics(idleResult, carriedDiagnostics);
    }

    const stateReadAt = now();
    if (stateReadAt >= deadline) {
      return withCarriedDiagnostics(createIdleWaitTimeoutResult(baseRequestId), carriedDiagnostics);
    }

    await sleep(Math.min(pollIntervalMs, deadline - stateReadAt));

    if (now() >= deadline) {
      return withCarriedDiagnostics(createIdleWaitTimeoutResult(baseRequestId), carriedDiagnostics);
    }
  }
}

const compileAndCheckDefaultTimeoutMs = 120_000;

export async function compileAndCheck(
  workflow: CompileWorkflowOptions,
  options: CompileAndCheckOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `compile-and-check-${Date.now()}`;
  const timeoutValidation = validateCompileAndCheckTimeout(requestId, options.timeoutMs, options.allowLongWait === true);
  if (timeoutValidation.status === "rejected") {
    return timeoutValidation;
  }

  const timeoutMs = timeoutValidation.timeoutMs;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();

  const initialStateResult = await getCompileState(workflow, { requestId: `${requestId}-state-1` });
  if (initialStateResult.status !== "succeeded") {
    return remapCompileAction(initialStateResult, "compile_and_check");
  }

  const initialState = parseCompileStateData(initialStateResult.data);
  if (initialState === null) {
    return remapCompileAction(initialStateResult, "compile_and_check");
  }

  const initialHost = {
    hostId: initialStateResult.hostId,
    hostEpoch: initialStateResult.hostEpoch,
  };

  if (isCompileIdle(initialState) && initialState.hasRecentCompileReport) {
    const recentReportResult = await readReportAndJudge({
      workflow,
      baseRequestId: requestId,
      reportRequestId: `${requestId}-report`,
      state: initialState,
      usedRecentCompileReport: true,
      requestResult: undefined,
      expectedHost: initialHost,
    });

    if (!(recentReportResult.status === "uncertain" && recentReportResult.code === "compile.report_missing")) {
      return recentReportResult;
    }
  }

  const expectedHost = initialHost;

  const requestResult = await requestCompile(workflow, { requestId: `${requestId}-request`, reason: "compile_and_check" });
  if (requestResult.status !== "succeeded") {
    return requestResult.status === "lost"
      ? hostContinuityLostResult(requestId, expectedHost, requestResult, "current_cycle_report")
      : remapCompileAction(requestResult, "compile_and_check");
  }

  if (!sameWorkflowHost(expectedHost, requestResult)) {
    return hostContinuityLostResult(requestId, expectedHost, requestResult, "current_cycle_report");
  }

  const remainingAfterRequest = remainingTimeoutMs(startedAt, timeoutMs, now);
  if (remainingAfterRequest <= 0) {
    return compileAndCheckTimeoutResult(requestId);
  }

  const idleResult = await waitForCompileIdle(workflow, {
    requestId: `${requestId}-idle`,
    timeoutMs: remainingAfterRequest,
    pollIntervalMs,
    sleep,
    now,
  });
  if (idleResult.status !== "succeeded") {
    if (idleResult.status === "timeout") {
      return compileAndCheckTimeoutResult(requestId);
    }

    return idleResult.status === "lost"
      ? hostContinuityLostResult(requestId, expectedHost, idleResult, "current_cycle_report")
      : remapCompileAction(idleResult, "compile_and_check");
  }

  if (!sameWorkflowHost(expectedHost, idleResult)) {
    return hostContinuityLostResult(requestId, expectedHost, idleResult, "current_cycle_report");
  }

  const settledState = parseCompileStateData(idleResult.data);
  if (settledState === null) {
    return remapCompileAction(idleResult, "compile_and_check");
  }

  return readReportAndJudge({
    workflow,
    baseRequestId: requestId,
    reportRequestId: `${requestId}-report`,
    state: settledState,
    usedRecentCompileReport: false,
    requestResult,
    expectedHost,
  });
}

function remapCompileAction(
  result: UnityAgentKitPublicResult,
  action: "get_state" | "request" | "wait_for_idle" | "compile_and_check",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_compile",
    action,
    summary: result.summary || "Compile workflow could not establish trusted evidence.",
  });
}

function createIdleWaitTimeoutResult(requestId: string): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_compile",
    action: "wait_for_idle",
    requestId,
    summary: "Timed out waiting for Unity compile state to become idle.",
    mayStillBeRunning: false,
    safeToRetry: true,
    nextStep: {
      kind: "read_state",
      tool: "unity_compile",
      action: "get_state",
      reason: "Read the latest compile state before retrying idle wait.",
    },
  });
}

function validateCompileAndCheckTimeout(
  requestId: string,
  timeoutMs: number | undefined,
  allowLongWait: boolean,
): (UnityAgentKitPublicResult & { status: "rejected" }) | { status: "accepted"; timeoutMs: number } {
  const resolvedTimeoutMs = timeoutMs ?? compileAndCheckDefaultTimeoutMs;
  if (resolvedTimeoutMs > compileAndCheckDefaultTimeoutMs && !allowLongWait) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_compile",
      action: "compile_and_check",
      requestId,
      summary: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
      code: "compile.long_wait_requires_intent",
      message: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
      diagnostics: [
        {
          source: "workflow",
          severity: "error",
          code: "compile.long_wait_requires_intent",
          message: "compile_and_check timeout beyond 120s requires explicit long-wait intent.",
          details: {
            timeoutMs: resolvedTimeoutMs,
            maxDefaultTimeoutMs: compileAndCheckDefaultTimeoutMs,
          },
          attribution: {
            operation: "compile_and_check",
            requestId,
          },
        },
      ],
      nextStep: {
        kind: "rerun_with_confirmation",
        reason: "Rerun with allowLongWait: true if the user explicitly wants to wait beyond 120s.",
      },
    }) as UnityAgentKitPublicResult & { status: "rejected" };
  }

  return {
    status: "accepted",
    timeoutMs: resolvedTimeoutMs,
  };
}

interface ReadReportAndJudgeOptions {
  workflow: CompileWorkflowOptions;
  baseRequestId: string;
  reportRequestId: string;
  state: CompileStateSnapshot;
  usedRecentCompileReport: boolean;
  requestResult?: UnityAgentKitPublicResult;
  expectedHost?: { hostId?: string; hostEpoch?: number };
}

async function readReportAndJudge(options: ReadReportAndJudgeOptions): Promise<UnityAgentKitPublicResult> {
  const reportResult = await getCompileReport(options.workflow, {
    requestId: options.reportRequestId,
    ...(options.state.recentCompileReportId === undefined ? {} : { reportId: options.state.recentCompileReportId }),
  });

  if (reportResult.status !== "succeeded") {
    return definePublicResult({
      ...reportResult,
      tool: "unity_compile",
      action: "compile_and_check",
      summary: reportResult.summary || "Compile report proof is missing.",
      evidence: {
        completion: "compile_proof_incomplete",
        proof: options.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
        verifiedCompileSuccess: false,
      },
    });
  }

  if (options.expectedHost !== undefined && !sameWorkflowHost(options.expectedHost, reportResult)) {
    return hostContinuityLostResult(
      options.baseRequestId,
      options.expectedHost,
      reportResult,
      options.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
    );
  }

  return judgeCompileReport({
    report: reportResult.data as Parameters<typeof judgeCompileReport>[0]["report"],
    state: options.state,
    hostId: reportResult.hostId ?? "",
    hostEpoch: reportResult.hostEpoch ?? 0,
    requestId: options.baseRequestId,
    usedRecentCompileReport: options.usedRecentCompileReport,
    requestedInvalidationToken: requestedInvalidationToken(options.requestResult),
  });
}

function requestedInvalidationToken(requestResult: UnityAgentKitPublicResult | undefined): number | undefined {
  if (requestResult === undefined) {
    return undefined;
  }

  const requestSnapshot = parseCompileRequestData(requestResult.data);
  if (requestSnapshot === null || !requestSnapshot.requested) {
    return undefined;
  }

  return requestSnapshot.invalidationTokenAfterRequest;
}

function sameWorkflowHost(
  expected: { hostId?: string; hostEpoch?: number },
  result: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">,
): boolean {
  return expected.hostId === result.hostId && expected.hostEpoch === result.hostEpoch;
}

function hostContinuityLostResult(
  requestId: string,
  expected: { hostId?: string; hostEpoch?: number },
  actual: Pick<UnityAgentKitPublicResult, "hostId" | "hostEpoch">,
  proof: "recent_complete_report" | "current_cycle_report",
): UnityAgentKitPublicResult {
  const proofLabel = proof === "recent_complete_report" ? "recent compile report" : "current-cycle compile";

  return definePublicResult({
    status: "uncertain",
    tool: "unity_compile",
    action: "compile_and_check",
    requestId,
    summary: `Host continuity changed during ${proofLabel} proof.`,
    code: "host.continuity_lost",
    message: `Host continuity changed during ${proofLabel} proof.`,
    diagnostics: [
      {
        source: "host",
        severity: "error",
        code: "host.continuity_lost",
        message: `Host continuity changed during ${proofLabel} proof.`,
        details: {
          expected,
          actual: {
            hostId: actual.hostId,
            hostEpoch: actual.hostEpoch,
          },
        },
        attribution: {
          operation: "compile_and_check",
          requestId,
        },
      },
    ],
    evidence: {
      completion: "compile_proof_incomplete",
      proof,
      verifiedCompileSuccess: false,
    },
    nextStep: {
      kind: "inspect_diagnostics",
      reason: `${proofLabel} proof cannot cross host continuity changes.`,
    },
  });
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, now: () => number): number {
  return Math.max(0, startedAt + timeoutMs - now());
}

function compileAndCheckTimeoutResult(requestId: string): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_compile",
    action: "compile_and_check",
    requestId,
    summary: "Timed out waiting for Unity compile_and_check proof.",
    mayStillBeRunning: true,
    safeToRetry: false,
    nextStep: {
      kind: "read_state",
      tool: "unity_compile",
      action: "get_state",
      reason: "Read compile state and report diagnostics before retrying compile_and_check.",
    },
  });
}

function collectReboundDiagnostics(
  diagnostics: UnityAgentKitDiagnostic[],
  carriedDiagnostics: UnityAgentKitDiagnostic[],
): void {
  const carriedIdentities = new Set(carriedDiagnostics.map(diagnosticIdentity));
  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== "host.rebound") {
      continue;
    }

    const identity = diagnosticIdentity(diagnostic);
    if (!carriedIdentities.has(identity)) {
      carriedDiagnostics.push(diagnostic);
      carriedIdentities.add(identity);
    }
  }
}

function withCarriedDiagnostics(
  result: UnityAgentKitPublicResult,
  carriedDiagnostics: UnityAgentKitDiagnostic[],
): UnityAgentKitPublicResult {
  const resultIdentities = new Set(result.diagnostics.map(diagnosticIdentity));
  const diagnosticsToCarry = carriedDiagnostics.filter((diagnostic) => !resultIdentities.has(diagnosticIdentity(diagnostic)));

  if (diagnosticsToCarry.length === 0) {
    return result;
  }

  return definePublicResult({
    ...result,
    diagnostics: [...result.diagnostics, ...diagnosticsToCarry],
  });
}

function diagnosticIdentity(diagnostic: UnityAgentKitDiagnostic): string {
  return JSON.stringify({
    source: diagnostic.source,
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    attribution: diagnostic.attribution,
  });
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
