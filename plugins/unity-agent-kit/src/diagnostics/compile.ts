import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

export const compileStateOperation = "compile.state.get" as const;
export const compileRequestOperation = "compile.request" as const;

export interface CompileStateSnapshot {
  projectRoot: string;
  unityVersion: string;
  isCompiling: boolean;
  isUpdating: boolean;
  isIdle: boolean;
  invalidationToken: number;
  hasRecentCompileReport: boolean;
  recentCompileReportId?: string;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export interface CompileRequestSnapshot {
  projectRoot: string;
  unityVersion: string;
  requested: boolean;
  noOpReason: string;
  usedAssetDatabaseRefresh: boolean;
  usedCompilationPipeline: boolean;
  invalidationTokenBeforeRequest: number;
  invalidationTokenAfterRequest: number;
  isCompiling: boolean;
  isUpdating: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export function parseCompileStateData(data: unknown): CompileStateSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" &&
    value.unityVersion.length > 0 &&
    typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" &&
    typeof value.isIdle === "boolean" &&
    isNonNegativeInteger(value.invalidationToken) &&
    typeof value.hasRecentCompileReport === "boolean" &&
    isOptionalString(value.recentCompileReportId) &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    isIdle: value.isIdle,
    invalidationToken: value.invalidationToken,
    hasRecentCompileReport: value.hasRecentCompileReport,
    ...(value.recentCompileReportId === undefined ? {} : { recentCompileReportId: value.recentCompileReportId }),
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function parseCompileRequestData(data: unknown): CompileRequestSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" &&
    value.unityVersion.length > 0 &&
    typeof value.requested === "boolean" &&
    typeof value.noOpReason === "string" &&
    typeof value.usedAssetDatabaseRefresh === "boolean" &&
    typeof value.usedCompilationPipeline === "boolean" &&
    isNonNegativeInteger(value.invalidationTokenBeforeRequest) &&
    isNonNegativeInteger(value.invalidationTokenAfterRequest) &&
    typeof value.isCompiling === "boolean" &&
    typeof value.isUpdating === "boolean" &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    requested: value.requested,
    noOpReason: value.noOpReason,
    usedAssetDatabaseRefresh: value.usedAssetDatabaseRefresh,
    usedCompilationPipeline: value.usedCompilationPipeline,
    invalidationTokenBeforeRequest: value.invalidationTokenBeforeRequest,
    invalidationTokenAfterRequest: value.invalidationTokenAfterRequest,
    isCompiling: value.isCompiling,
    isUpdating: value.isUpdating,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function isCompileIdle(snapshot: CompileStateSnapshot): boolean {
  return !snapshot.isCompiling && !snapshot.isUpdating;
}

export function compileStateResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_state" | "wait_for_idle",
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_compile",
      action,
      summary: hostResult.summary || "Compile state could not be read.",
    });
  }

  const snapshot = parseCompileStateData(hostResult.data);
  if (snapshot === null) {
    return invalidSnapshotResult(
      hostResult,
      compileStateOperation,
      action,
      {
        source: "workflow",
        severity: "error",
        code: "compile.state_invalid_shape",
        message: "Compile state operation returned an invalid data shape.",
        attribution: {
          operation: compileStateOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics for the invalid compile state payload before retrying.",
    );
  }

  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidSnapshotResult(
      hostResult,
      compileStateOperation,
      action,
      {
        source: "validation",
        severity: "error",
        code: "compile.project_root_mismatch",
        message: "Compile state projectRoot does not match the expected Unity project root.",
        details: {
          expectedProjectRoot,
          actualProjectRoot: snapshot.projectRoot,
        },
        attribution: {
          operation: compileStateOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics before retrying because the compile state came from a different project root.",
    );
  }

  const idle = isCompileIdle(snapshot);
  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action,
    operation: compileStateOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: idle ? "Compile state is idle." : "Compile state read; Unity is still compiling or updating.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "state_snapshot",
      idle,
      verifiedCompileSuccess: false,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function compileRequestResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_compile",
      action: "request",
      summary: hostResult.summary || "Compile request could not be completed.",
    });
  }

  const snapshot = parseCompileRequestData(hostResult.data);
  if (snapshot === null) {
    return invalidSnapshotResult(
      hostResult,
      compileRequestOperation,
      "request",
      {
        source: "workflow",
        severity: "error",
        code: "compile.request_invalid_shape",
        message: "Compile request operation returned an invalid data shape.",
        attribution: {
          operation: compileRequestOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics for the invalid compile request payload before retrying.",
    );
  }

  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidSnapshotResult(
      hostResult,
      compileRequestOperation,
      "request",
      {
        source: "validation",
        severity: "error",
        code: "compile.project_root_mismatch",
        message: "Compile request projectRoot does not match the expected Unity project root.",
        details: {
          expectedProjectRoot,
          actualProjectRoot: snapshot.projectRoot,
        },
        attribution: {
          operation: compileRequestOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics before retrying because the compile request came from a different project root.",
    );
  }

  if (snapshot.requested) {
    return definePublicResult({
      status: "succeeded",
      tool: "unity_compile",
      action: "request",
      operation: compileRequestOperation,
      requestId: hostResult.requestId,
      hostId: hostResult.hostId,
      hostEpoch: hostResult.hostEpoch,
      summary: "Compile request accepted. Compile success is not yet verified.",
      data: snapshot,
      diagnostics: hostResult.diagnostics,
      evidence: {
        completion: "request_accepted",
        requested: true,
        verifiedCompileSuccess: false,
      },
      startedAt: hostResult.startedAt,
      completedAt: hostResult.completedAt,
      durationMs: hostResult.durationMs,
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action: "request",
    operation: compileRequestOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: snapshot.noOpReason.length > 0
      ? `Compile request was a no-op (${snapshot.noOpReason}). Compile success is not verified.`
      : "Compile request was a no-op. Compile success is not verified.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "no_op",
      requested: false,
      noOpReason: snapshot.noOpReason,
      verifiedCompileSuccess: false,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function invalidSnapshotResult(
  hostResult: UnityAgentKitPublicResult,
  operation: typeof compileStateOperation | typeof compileRequestOperation,
  action: "get_state" | "wait_for_idle" | "request",
  diagnostic: UnityAgentKitDiagnostic,
  reason: string,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_compile",
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
    nextStep: {
      kind: "inspect_diagnostics",
      reason,
    },
  });
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isOptionalInteger(value: unknown): value is number | undefined {
  return value === undefined || isInteger(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
