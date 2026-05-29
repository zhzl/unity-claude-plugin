import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import {
  isStablePlayModeTarget,
  parsePlayModeStateData,
  playModeEnterRequestOperation,
  playModeExitRequestOperation,
  playModeRequestResultFromHostResult,
  playModeStateOperation,
  playModeStateResultFromHostResult,
  type PlayModeStateName,
  type PlayModeStateSnapshot,
  type PlayModeTargetState,
} from "../diagnostics/playmode.ts";
import { executeWithRebindAwareness, type RebindAwareWorkflowResult } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";

export interface PlayModeWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface PlayModeActionOptions {
  requestId?: string;
}

export interface PlayModeVerifyOptions extends PlayModeActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getPlayModeState(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `playmode-state-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: playModeStateOperation, requestId },
  });

  return playModeStateResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function enterPlayModeAndVerify(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeVerifyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  return verifyPlayModeTarget(workflow, options, {
    targetState: "playmode",
    action: "enter_and_verify",
    operation: playModeEnterRequestOperation,
  });
}

export async function exitPlayModeAndVerify(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeVerifyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  return verifyPlayModeTarget(workflow, options, {
    targetState: "editmode",
    action: "exit_and_verify",
    operation: playModeExitRequestOperation,
  });
}

type PlayModeVerifyAction = "enter_and_verify" | "exit_and_verify";
type PlayModeRequestOperation = typeof playModeEnterRequestOperation | typeof playModeExitRequestOperation;

interface PlayModeVerifyTarget {
  targetState: PlayModeTargetState;
  action: PlayModeVerifyAction;
  operation: PlayModeRequestOperation;
}

async function verifyPlayModeTarget(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeVerifyOptions,
  target: PlayModeVerifyTarget,
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `playmode-${target.targetState}-${Date.now()}`;
  const timeoutMs = positiveFiniteOrDefault(options.timeoutMs, 60_000);
  const pollIntervalMs = positiveFiniteOrDefault(options.pollIntervalMs, 500);
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const startedAt = now();
  const carriedDiagnostics: UnityAgentKitDiagnostic[] = [];

  let pollIndex = 1;
  const initialResult = await getPlayModeState(workflow, { requestId: `${requestId}-state-${pollIndex++}` });
  collectReboundDiagnostics(carriedDiagnostics, initialResult);
  if (initialResult.status !== "succeeded") {
    return withCarriedDiagnostics(carriedDiagnostics, remapPlayModeAction(initialResult, target.action));
  }

  const initialState = parsePlayModeStateData(initialResult.data);
  if (initialState === null) {
    return withCarriedDiagnostics(carriedDiagnostics, remapPlayModeAction(initialResult, target.action));
  }

  if (isStablePlayModeTarget(initialState, target.targetState)) {
    if (remainingTimeoutMs(startedAt, timeoutMs, now) <= 0) {
      return withCarriedDiagnostics(carriedDiagnostics, playModeTimeoutResult(target.action, requestId, false));
    }
    return withCarriedDiagnostics(carriedDiagnostics, settledPlayModeResult(initialResult, target.action, target.targetState, "noop", initialState.state, initialState));
  }

  let latestState = initialState;
  let latestResult = initialResult;
  let requestSent = false;
  let requestAttempted = false;

  while (remainingTimeoutMs(startedAt, timeoutMs, now) > 0) {
    if (!requestAttempted && latestState.stable) {
      const requestResult = await requestPlayModeTarget(workflow, `${requestId}-request`, target.action, target.operation);
      requestAttempted = true;
      collectReboundDiagnostics(carriedDiagnostics, requestResult.raw);
      if (requestResult.result.status !== "succeeded") {
        return withCarriedDiagnostics(carriedDiagnostics, requestResult.result);
      }
      if (!sameWorkflowHost(initialState, requestResult.result)) {
        return withCarriedDiagnostics(carriedDiagnostics, hostContinuityLostResult(requestId, requestResult.result, target.action, target.operation, initialState));
      }
      requestSent = playModeRequestWasSent(requestResult.result);
    }

    const remainingMs = remainingTimeoutMs(startedAt, timeoutMs, now);
    if (remainingMs <= 0) {
      break;
    }

    await sleep(Math.min(pollIntervalMs, remainingMs));

    if (remainingTimeoutMs(startedAt, timeoutMs, now) <= 0) {
      return withCarriedDiagnostics(carriedDiagnostics, playModeTimeoutResult(target.action, requestId, requestSent));
    }

    latestResult = await getPlayModeState(workflow, { requestId: `${requestId}-state-${pollIndex++}` });
    collectReboundDiagnostics(carriedDiagnostics, latestResult);
    if (latestResult.status !== "succeeded") {
      return withCarriedDiagnostics(carriedDiagnostics, remapPlayModeAction(latestResult, target.action));
    }

    const parsedState = parsePlayModeStateData(latestResult.data);
    if (parsedState === null) {
      return withCarriedDiagnostics(carriedDiagnostics, remapPlayModeAction(latestResult, target.action));
    }
    latestState = parsedState;

    if (!sameWorkflowHost(initialState, latestState)) {
      return withCarriedDiagnostics(carriedDiagnostics, hostContinuityLostResult(requestId, latestResult, target.action, target.operation, initialState));
    }

    if (isStablePlayModeTarget(latestState, target.targetState)) {
      if (remainingTimeoutMs(startedAt, timeoutMs, now) <= 0) {
        return withCarriedDiagnostics(carriedDiagnostics, playModeTimeoutResult(target.action, requestId, requestSent));
      }
      return withCarriedDiagnostics(carriedDiagnostics, settledPlayModeResult(latestResult, target.action, target.targetState, requestSent ? "accepted" : "observed_transition", initialState.state, latestState));
    }
  }

  return withCarriedDiagnostics(carriedDiagnostics, playModeTimeoutResult(target.action, requestId, requestSent));
}

async function requestPlayModeTarget(
  workflow: PlayModeWorkflowOptions,
  requestId: string,
  action: PlayModeVerifyAction,
  operation: PlayModeRequestOperation,
): Promise<{ raw: RebindAwareWorkflowResult; result: UnityAgentKitPublicResult }> {
  const raw = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation, requestId },
  });

  return {
    raw,
    result: playModeRequestResultFromHostResult(raw.result, action, operation, workflow.projectRoot),
  };
}

function settledPlayModeResult(
  stateResult: UnityAgentKitPublicResult,
  action: PlayModeVerifyAction,
  targetState: PlayModeTargetState,
  request: "noop" | "accepted" | "observed_transition",
  initialState: PlayModeStateName,
  finalState: PlayModeStateSnapshot,
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...stateResult,
    action,
    summary: `PlayMode reached stable ${targetState}.`,
    data: finalState,
    evidence: {
      completion: "state_settled",
      targetState,
      request,
      initialState,
      finalState: finalState.state,
      stable: true,
    },
  });
}

function remapPlayModeAction(result: UnityAgentKitPublicResult, action: PlayModeVerifyAction): UnityAgentKitPublicResult {
  return definePublicResult({ ...result, action });
}

function playModeRequestWasSent(result: UnityAgentKitPublicResult): boolean {
  return result.data?.["requested"] === true;
}

function playModeTimeoutResult(action: PlayModeVerifyAction, requestId: string, requestSent: boolean): UnityAgentKitPublicResult {
  return timeoutContinuationResult({
    tool: "unity_playmode",
    action,
    requestId,
    summary: "Timed out waiting for PlayMode state to settle.",
    mayStillBeRunning: requestSent,
    safeToRetry: false,
    nextStep: {
      kind: "read_state",
      tool: "unity_playmode",
      action: "get_state",
      reason: "Read the current PlayMode state before deciding whether to retry.",
    },
  });
}

function hostContinuityLostResult(
  requestId: string,
  result: UnityAgentKitPublicResult,
  action: PlayModeVerifyAction,
  operation: PlayModeRequestOperation,
  expected: PlayModeStateSnapshot,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "error",
    code: "host.continuity_lost",
    message: "PlayMode host continuity changed before the result could be trusted.",
    details: {
      expectedHostId: expected.hostId,
      expectedHostEpoch: expected.hostEpoch,
      actualHostId: result.hostId,
      actualHostEpoch: result.hostEpoch,
    },
    attribution: { operation, requestId },
  };

  return definePublicResult({
    status: "lost",
    tool: "unity_playmode",
    action,
    operation,
    requestId,
    hostId: result.hostId,
    hostEpoch: result.hostEpoch,
    summary: diagnostic.message,
    code: diagnostic.code,
    message: diagnostic.message,
    diagnostics: [...result.diagnostics, diagnostic],
    nextStep: {
      kind: "read_state",
      tool: "unity_playmode",
      action: "get_state",
      reason: "Read the current PlayMode state from the active Unity host before retrying.",
    },
    safeToRetry: false,
  });
}

function sameWorkflowHost(expected: Pick<PlayModeStateSnapshot, "hostId" | "hostEpoch">, actual: Pick<PlayModeStateSnapshot, "hostId" | "hostEpoch"> | UnityAgentKitPublicResult): boolean {
  return expected.hostId === actual.hostId && expected.hostEpoch === actual.hostEpoch;
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, now: () => number): number {
  return Math.max(0, timeoutMs - (now() - startedAt));
}

function positiveFiniteOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function collectReboundDiagnostics(carriedDiagnostics: UnityAgentKitDiagnostic[], result: UnityAgentKitPublicResult | RebindAwareWorkflowResult): void {
  const publicResult = "result" in result ? result.result : result;
  for (const diagnostic of publicResult.diagnostics) {
    if (diagnostic.code === "host.rebound" && !carriedDiagnostics.some((existing) => diagnosticIdentity(existing) === diagnosticIdentity(diagnostic))) {
      carriedDiagnostics.push(diagnostic);
    }
  }
}

function withCarriedDiagnostics(carriedDiagnostics: UnityAgentKitDiagnostic[], result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  const diagnostics = [...result.diagnostics];
  for (const diagnostic of carriedDiagnostics) {
    if (!diagnostics.some((existing) => diagnosticIdentity(existing) === diagnosticIdentity(diagnostic))) {
      diagnostics.push(diagnostic);
    }
  }
  return definePublicResult({ ...result, diagnostics });
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
