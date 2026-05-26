import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

export const compileStateOperation = "compile.state.get" as const;
export const compileRequestOperation = "compile.request" as const;
export const compileReportGetOperation = "compile.report.get" as const;

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

export type CompileCompilerMessageType = "error" | "warning" | "info";

export interface CompileCompilerMessageSnapshot {
  assemblyPath: string;
  file: string;
  line: number;
  column: number;
  type: CompileCompilerMessageType;
  message: string;
}

export interface CompileReportSnapshot {
  reportId: string;
  compileCycleId: string;
  hostId: string;
  hostEpoch: number;
  projectRoot: string;
  unityVersion: string;
  completedAt: string;
  invalidationTokenAtCompletion: number;
  compilerErrorCount: number;
  compilerWarningCount: number;
  compilerMessagesSummary: string;
  compilerMessages: CompileCompilerMessageSnapshot[];
  assemblyCompilationFinishedSeen: boolean;
  compilationFinishedSeen: boolean;
  editorIdleAfterCompilation: boolean;
}

export interface CompileReportJudgmentInput {
  report: CompileReportSnapshot;
  state: CompileStateSnapshot;
  hostId: string;
  hostEpoch: number;
  requestId?: string;
  usedRecentCompileReport: boolean;
  requestedInvalidationToken?: number;
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

export function parseCompileReportData(data: unknown): CompileReportSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.reportId === "string" &&
    value.reportId.length > 0 &&
    typeof value.compileCycleId === "string" &&
    value.compileCycleId.length > 0 &&
    typeof value.hostId === "string" &&
    value.hostId.length > 0 &&
    isNonNegativeInteger(value.hostEpoch) &&
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    typeof value.unityVersion === "string" &&
    value.unityVersion.length > 0 &&
    typeof value.completedAt === "string" &&
    value.completedAt.length > 0 &&
    isNonNegativeInteger(value.invalidationTokenAtCompletion) &&
    isNonNegativeInteger(value.compilerErrorCount) &&
    isNonNegativeInteger(value.compilerWarningCount) &&
    typeof value.compilerMessagesSummary === "string" &&
    Array.isArray(value.compilerMessages) &&
    value.compilerMessages.every(isCompileCompilerMessageSnapshot) &&
    typeof value.assemblyCompilationFinishedSeen === "boolean" &&
    typeof value.compilationFinishedSeen === "boolean" &&
    typeof value.editorIdleAfterCompilation === "boolean"
  )) {
    return null;
  }

  return {
    reportId: value.reportId,
    compileCycleId: value.compileCycleId,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    completedAt: value.completedAt,
    invalidationTokenAtCompletion: value.invalidationTokenAtCompletion,
    compilerErrorCount: value.compilerErrorCount,
    compilerWarningCount: value.compilerWarningCount,
    compilerMessagesSummary: value.compilerMessagesSummary,
    compilerMessages: value.compilerMessages.map((message) => ({ ...(message as CompileCompilerMessageSnapshot) })),
    assemblyCompilationFinishedSeen: value.assemblyCompilationFinishedSeen,
    compilationFinishedSeen: value.compilationFinishedSeen,
    editorIdleAfterCompilation: value.editorIdleAfterCompilation,
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

export function internalCompileReportResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_compile_internal",
      action: "read_compile_report",
      summary: hostResult.summary || "Compile report could not be read.",
      ...(internalMetadata(hostResult.metadata) === undefined ? {} : { metadata: internalMetadata(hostResult.metadata) }),
    });
  }

  const report = parseCompileReportData(hostResult.data);
  if (report === null) {
    return internalCompileReportValidationResult(hostResult, "compile.report_invalid_shape", "Compile report operation returned an invalid data shape.", {
      source: "workflow",
      severity: "error",
      code: "compile.report_invalid_shape",
      message: "Compile report operation returned an invalid data shape.",
      attribution: {
        operation: compileReportGetOperation,
        requestId: hostResult.requestId,
      },
    });
  }

  if (normalizeProjectRoot(report.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return internalCompileReportValidationResult(hostResult, "compile.project_root_mismatch", "Compile report projectRoot does not match the expected Unity project root.", {
      source: "validation",
      severity: "error",
      code: "compile.project_root_mismatch",
      message: "Compile report projectRoot does not match the expected Unity project root.",
      details: {
        expectedProjectRoot,
        actualProjectRoot: report.projectRoot,
      },
      attribution: {
        operation: compileReportGetOperation,
        requestId: hostResult.requestId,
      },
    });
  }

  if (report.hostId !== hostResult.hostId || report.hostEpoch !== hostResult.hostEpoch) {
    return internalCompileReportValidationResult(hostResult, "host.continuity_lost", "Compile report host identity did not match the responding Unity host.", {
      source: "validation",
      severity: "error",
      code: "host.continuity_lost",
      message: "Compile report host identity did not match the responding Unity host.",
      details: {
        responseHostId: hostResult.hostId,
        responseHostEpoch: hostResult.hostEpoch,
        reportHostId: report.hostId,
        reportHostEpoch: report.hostEpoch,
      },
      attribution: {
        operation: compileReportGetOperation,
        requestId: hostResult.requestId,
      },
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile_internal",
    action: "read_compile_report",
    operation: compileReportGetOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: "Compile report read successfully.",
    data: report,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "compile_report",
      complete: true,
      verifiedCompileSuccess: false,
    },
    ...(internalMetadata(hostResult.metadata) === undefined ? {} : { metadata: internalMetadata(hostResult.metadata) }),
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

export function judgeCompileReport(input: CompileReportJudgmentInput): UnityAgentKitPublicResult {
  const proof = input.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report";
  const data = compileReportJudgmentData(input);
  const compilerDiagnostics = compileReportDiagnostics(input.report, input.requestId);

  if (input.report.hostId !== input.hostId || input.report.hostEpoch !== input.hostEpoch) {
    return compileReportJudgmentResult(
      "uncertain",
      "host.continuity_lost",
      "Host continuity changed before compile success could be proven from the compile report.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "host.continuity_lost",
        message: "Host continuity changed before compile success could be proven from the compile report.",
        details: {
          expectedHostId: input.hostId,
          expectedHostEpoch: input.hostEpoch,
          reportHostId: input.report.hostId,
          reportHostEpoch: input.report.hostEpoch,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (
    normalizeProjectRoot(input.report.projectRoot) !== normalizeProjectRoot(input.state.projectRoot) ||
    input.report.unityVersion !== input.state.unityVersion
  ) {
    return compileReportJudgmentResult(
      "uncertain",
      "compile.report_binding_mismatch",
      "Compile report bindings did not match the active compile state.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "compile.report_binding_mismatch",
        message: "Compile report bindings did not match the active compile state.",
        details: {
          stateProjectRoot: input.state.projectRoot,
          reportProjectRoot: input.report.projectRoot,
          stateUnityVersion: input.state.unityVersion,
          reportUnityVersion: input.report.unityVersion,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (!isCompileIdle(input.state) || !input.report.editorIdleAfterCompilation) {
    return compileReportJudgmentResult(
      "uncertain",
      "compile.editor_idle_missing",
      "Compile report could not prove the editor was idle after compilation completed.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "compile.editor_idle_missing",
        message: "Compile report could not prove the editor was idle after compilation completed.",
        details: {
          stateIsIdle: isCompileIdle(input.state),
          reportEditorIdleAfterCompilation: input.report.editorIdleAfterCompilation,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (!input.report.assemblyCompilationFinishedSeen || !input.report.compilationFinishedSeen) {
    return compileReportJudgmentResult(
      "uncertain",
      "compile.lifecycle_incomplete",
      "Compile report did not capture a complete Unity compilation lifecycle.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "compile.lifecycle_incomplete",
        message: "Compile report did not capture a complete Unity compilation lifecycle.",
        details: {
          assemblyCompilationFinishedSeen: input.report.assemblyCompilationFinishedSeen,
          compilationFinishedSeen: input.report.compilationFinishedSeen,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (input.report.invalidationTokenAtCompletion !== input.state.invalidationToken) {
    return compileReportJudgmentResult(
      "uncertain",
      "compile.recent_report_invalidated",
      "Compile report was invalidated before the compile check completed.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "compile.recent_report_invalidated",
        message: "Compile report was invalidated before the compile check completed.",
        details: {
          invalidationTokenAtCheck: input.state.invalidationToken,
          invalidationTokenAtReport: input.report.invalidationTokenAtCompletion,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (
    input.requestedInvalidationToken !== undefined &&
    input.report.invalidationTokenAtCompletion < input.requestedInvalidationToken
  ) {
    return compileReportJudgmentResult(
      "uncertain",
      "compile.current_cycle_not_proven",
      "Compile report did not prove completion of the requested compile cycle.",
      input,
      data,
      [{
        source: "validation",
        severity: "error",
        code: "compile.current_cycle_not_proven",
        message: "Compile report did not prove completion of the requested compile cycle.",
        details: {
          requestedInvalidationToken: input.requestedInvalidationToken,
          invalidationTokenAtReport: input.report.invalidationTokenAtCompletion,
        },
        attribution: {
          operation: compileReportGetOperation,
          requestId: input.requestId,
        },
      }],
    );
  }

  if (input.report.compilerErrorCount > 0) {
    return definePublicResult({
      status: "failed",
      tool: "unity_compile",
      action: "compile_and_check",
      operation: compileReportGetOperation,
      requestId: input.requestId,
      hostId: input.hostId,
      hostEpoch: input.hostEpoch,
      summary: "Compile completed with compiler errors.",
      code: "compile.compiler_error",
      message: "Compile completed with compiler errors.",
      data,
      diagnostics: [
        {
          source: "validation",
          severity: "error",
          code: "compile.compiler_error",
          message: "Compile completed with compiler errors.",
          details: {
            compilerErrorCount: input.report.compilerErrorCount,
            compilerWarningCount: input.report.compilerWarningCount,
            compilerMessagesSummary: input.report.compilerMessagesSummary,
          },
          attribution: {
            operation: compileReportGetOperation,
            requestId: input.requestId,
          },
        },
        ...compilerDiagnostics,
      ],
      evidence: {
        completion: "compile_verified",
        proof,
        verifiedCompileSuccess: false,
      },
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: compileReportGetOperation,
    requestId: input.requestId,
    hostId: input.hostId,
    hostEpoch: input.hostEpoch,
    summary: input.report.compilerWarningCount > 0
      ? "Compile succeeded and the compile report attributed compiler warnings."
      : "Compile succeeded and the compile report verified the result.",
    data,
    diagnostics: compilerDiagnostics,
    evidence: {
      completion: "compile_verified",
      proof,
      verifiedCompileSuccess: true,
    },
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

function internalCompileReportResultMetadata(): Record<string, unknown> {
  return { publicAction: false };
}

function internalCompileReportValidationResult(
  hostResult: UnityAgentKitPublicResult,
  code: string,
  message: string,
  diagnostic: UnityAgentKitDiagnostic,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: "unity_compile_internal",
    action: "read_compile_report",
    operation: compileReportGetOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [...hostResult.diagnostics, diagnostic],
    evidence: {
      verifiedCompileSuccess: false,
    },
    metadata: internalCompileReportResultMetadata(),
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Inspect diagnostics before relying on the compile report result.",
    },
  });
}

function compileReportJudgmentData(input: CompileReportJudgmentInput): Record<string, unknown> {
  return {
    compileCycleId: input.report.compileCycleId,
    compilerMessagesAttributed: true,
    compilerErrorCount: input.report.compilerErrorCount,
    compilerWarningCount: input.report.compilerWarningCount,
    compilerMessagesSummary: input.report.compilerMessagesSummary,
    usedRecentCompileReport: input.usedRecentCompileReport,
    ...(input.usedRecentCompileReport && input.state.recentCompileReportId !== undefined
      ? { recentCompileReportId: input.state.recentCompileReportId }
      : {}),
    invalidationTokenAtCheck: input.state.invalidationToken,
    invalidationTokenAtReport: input.report.invalidationTokenAtCompletion,
  };
}

function compileReportJudgmentResult(
  status: "uncertain",
  code: string,
  message: string,
  input: CompileReportJudgmentInput,
  data: Record<string, unknown>,
  diagnostics: UnityAgentKitDiagnostic[],
): UnityAgentKitPublicResult {
  return definePublicResult({
    status,
    tool: "unity_compile",
    action: "compile_and_check",
    operation: compileReportGetOperation,
    requestId: input.requestId,
    hostId: input.hostId,
    hostEpoch: input.hostEpoch,
    summary: message,
    code,
    message,
    data,
    diagnostics,
    evidence: {
      completion: "compile_proof_incomplete",
      proof: input.usedRecentCompileReport ? "recent_complete_report" : "current_cycle_report",
      verifiedCompileSuccess: false,
    },
  });
}

function compileReportDiagnostics(
  report: CompileReportSnapshot,
  requestId?: string,
): UnityAgentKitDiagnostic[] {
  return report.compilerMessages.map((message) => ({
    source: "unity-compiler",
    severity: compilerMessageSeverity(message.type),
    message: message.message,
    details: {
      assemblyPath: message.assemblyPath,
      file: message.file,
      line: message.line,
      column: message.column,
      type: message.type,
      compileCycleId: report.compileCycleId,
      reportId: report.reportId,
    },
    attribution: {
      operation: compileReportGetOperation,
      requestId,
    },
  }));
}

function compilerMessageSeverity(type: CompileCompilerMessageType): UnityAgentKitDiagnostic["severity"] {
  if (type === "warning") {
    return "warning";
  }

  if (type === "info") {
    return "info";
  }

  return "error";
}

function internalMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return internalCompileReportResultMetadata();
  }

  return {
    ...(metadata as Record<string, unknown>),
    ...internalCompileReportResultMetadata(),
  };
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

function isCompileCompilerMessageType(value: unknown): value is CompileCompilerMessageType {
  return value === "error" || value === "warning" || value === "info";
}

function isCompileCompilerMessageSnapshot(value: unknown): value is CompileCompilerMessageSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    typeof message.assemblyPath === "string" &&
    typeof message.file === "string" &&
    isNonNegativeInteger(message.line) &&
    isNonNegativeInteger(message.column) &&
    isCompileCompilerMessageType(message.type) &&
    typeof message.message === "string"
  );
}
