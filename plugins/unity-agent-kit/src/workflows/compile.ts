import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import {
  compileRequestOperation,
  compileRequestResultFromHostResult,
  compileStateOperation,
  compileStateResultFromHostResult,
  isCompileIdle,
  parseCompileStateData,
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

export interface WaitForCompileIdleOptions extends CompileActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
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

function remapCompileAction(
  result: UnityAgentKitPublicResult,
  action: "get_state" | "request" | "wait_for_idle",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_compile",
    action,
    summary: result.summary || "Compile workflow could not establish the latest state.",
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
