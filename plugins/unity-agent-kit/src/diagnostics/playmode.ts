import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const playModeStateOperation = "playmode.state.get" as const;
export const playModeEnterRequestOperation = "playmode.enter.request" as const;
export const playModeExitRequestOperation = "playmode.exit.request" as const;

export type PlayModeStateName = "editmode" | "playmode" | "transitioning";
export type PlayModeTargetState = "editmode" | "playmode";

export interface PlayModeStateSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  state: PlayModeStateName;
  stable: boolean;
  isPlaying: boolean;
  isPlayingOrWillChangePlaymode: boolean;
  isPlayModeChanging: boolean;
  isCompiling: boolean;
  isUpdating: boolean;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface PlayModeRequestResult {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  targetState: PlayModeTargetState;
  requested: boolean;
  noOp: boolean;
  noOpReason: string;
  stateBeforeRequest: PlayModeStateSnapshot;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export function parsePlayModeStateData(data: unknown): PlayModeStateSnapshot | null {
  const value = parseRecord(data);
  if (value === null || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isPlayModeStateName(value.state) && typeof value.stable === "boolean" &&
    typeof value.isPlaying === "boolean" && typeof value.isPlayingOrWillChangePlaymode === "boolean" &&
    typeof value.isPlayModeChanging === "boolean" && typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" && isNonNegativeInteger(value.capturedMainThreadId) &&
    isNonNegativeInteger(value.executionThreadId) && isDiagnosticArray(value.diagnostics)
  )) return null;

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    state: value.state,
    stable: value.stable,
    isPlaying: value.isPlaying,
    isPlayingOrWillChangePlaymode: value.isPlayingOrWillChangePlaymode,
    isPlayModeChanging: value.isPlayModeChanging,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function parsePlayModeRequestData(data: unknown): PlayModeRequestResult | null {
  const value = parseRecord(data);
  const stateBeforeRequest = value === null ? null : parsePlayModeStateData(value.stateBeforeRequest);
  if (value === null || stateBeforeRequest === null || !(
    isNonEmptyString(value.projectRoot) && isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) && isNonNegativeInteger(value.hostEpoch) &&
    isPlayModeTargetState(value.targetState) && typeof value.requested === "boolean" &&
    typeof value.noOp === "boolean" && typeof value.noOpReason === "string" &&
    isNonNegativeInteger(value.capturedMainThreadId) && isNonNegativeInteger(value.executionThreadId) &&
    isDiagnosticArray(value.diagnostics)
  )) return null;

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    targetState: value.targetState,
    requested: value.requested,
    noOp: value.noOp,
    noOpReason: value.noOpReason,
    stateBeforeRequest,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function isStablePlayModeTarget(snapshot: PlayModeStateSnapshot, targetState: PlayModeTargetState): boolean {
  if (!snapshot.stable || snapshot.isCompiling || snapshot.isUpdating || snapshot.isPlayModeChanging) return false;
  return targetState === "playmode"
    ? snapshot.isPlaying && snapshot.isPlayingOrWillChangePlaymode && snapshot.state === "playmode"
    : !snapshot.isPlaying && !snapshot.isPlayingOrWillChangePlaymode && snapshot.state === "editmode";
}

export function playModeStateResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  return mapPlayModeResult(hostResult, playModeStateOperation, "get_state", expectedProjectRoot, parsePlayModeStateData, (snapshot, diagnostics) => definePublicResult({
    status: "succeeded",
    tool: "unity_playmode",
    action: "get_state",
    operation: playModeStateOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: `PlayMode state is ${snapshot.state}.`,
    data: snapshot,
    diagnostics,
    evidence: {
      completion: "state_snapshot",
      playModeState: snapshot.state,
      stable: snapshot.stable,
      mutation: "none",
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  }));
}

export function playModeRequestResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "enter_and_verify" | "exit_and_verify",
  operation: typeof playModeEnterRequestOperation | typeof playModeExitRequestOperation,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  return mapPlayModeResult(hostResult, operation, action, expectedProjectRoot, parsePlayModeRequestData, (request, diagnostics) => definePublicResult({
    status: "succeeded",
    tool: "unity_playmode",
    action,
    operation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: request.noOp ? `PlayMode ${request.targetState} request was a no-op.` : `PlayMode ${request.targetState} request accepted.`,
    data: request,
    diagnostics,
    evidence: {
      completion: request.noOp ? "request_noop" : "request_accepted",
      targetState: request.targetState,
      requested: request.requested,
      noOp: request.noOp,
      noOpReason: request.noOpReason,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  }));
}

function mapPlayModeResult<T>(
  hostResult: UnityAgentKitPublicResult,
  operation: string,
  action: string,
  expectedProjectRoot: string,
  parse: (data: unknown) => T | null,
  success: (parsed: T, diagnostics: UnityAgentKitDiagnostic[]) => UnityAgentKitPublicResult,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_playmode",
      action,
      summary: hostResult.summary || `PlayMode ${action} could not be completed.`,
    });
  }

  const parsed = parse(hostResult.data);
  if (parsed === null) {
    return invalidPlayModeResult(hostResult, operation, action, `playmode.${action}_invalid_shape`, `PlayMode ${action} operation returned an invalid data shape.`);
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.projectRoot !== "string" || normalizeProjectRoot(record.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidPlayModeResult(hostResult, operation, action, "playmode.project_root_mismatch", `PlayMode ${action} projectRoot does not match the expected Unity project root.`, { expectedProjectRoot, actualProjectRoot: record.projectRoot });
  }

  if (record.hostId !== hostResult.hostId || record.hostEpoch !== hostResult.hostEpoch) {
    return continuityLostResult(hostResult, operation, action, { expectedHostId: hostResult.hostId, expectedHostEpoch: hostResult.hostEpoch, actualHostId: record.hostId, actualHostEpoch: record.hostEpoch });
  }

  return success(parsed, [...hostResult.diagnostics, ...(Array.isArray(record.diagnostics) ? cloneDiagnostics(record.diagnostics) : [])]);
}

function invalidPlayModeResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, code: string, message: string, details?: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "workflow", severity: "error", code, message, ...(details ? { details } : {}), attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({
    status: "failed",
    tool: "unity_playmode",
    action,
    operation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [...hostResult.diagnostics, diagnostic],
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics before retrying the PlayMode workflow." },
  });
}

function continuityLostResult(hostResult: UnityAgentKitPublicResult, operation: string, action: string, details: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = { source: "host", severity: "error", code: "host.continuity_lost", message: "PlayMode host continuity changed before the result could be trusted.", details, attribution: { operation, requestId: hostResult.requestId } };
  return definePublicResult({
    status: "lost",
    tool: "unity_playmode",
    action,
    operation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: diagnostic.message,
    code: diagnostic.code,
    message: diagnostic.message,
    diagnostics: [...hostResult.diagnostics, diagnostic],
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    nextStep: { kind: "inspect_diagnostics", reason: "Inspect diagnostics because PlayMode proof crossed a host continuity boundary." },
  });
}

function parseRecord(data: unknown): Record<string, unknown> | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPlayModeStateName(value: unknown): value is PlayModeStateName {
  return value === "editmode" || value === "playmode" || value === "transitioning";
}

function isPlayModeTargetState(value: unknown): value is PlayModeTargetState {
  return value === "editmode" || value === "playmode";
}

function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] {
  return Array.isArray(value) && value.every(isDiagnostic);
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) return false;
  const diagnostic = value as Record<string, unknown>;
  return isNonEmptyString(diagnostic.source) &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    isNonEmptyString(diagnostic.message) &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string");
}

function cloneDiagnostics(diagnostics: UnityAgentKitDiagnostic[]): UnityAgentKitDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}
