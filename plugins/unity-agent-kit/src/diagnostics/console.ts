import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const consoleCountOperation = "console.count" as const;
export const consoleSnapshotOperation = "console.snapshot" as const;
export const consoleClearOperation = "console.clear" as const;

export type ConsoleSeverity = "error" | "warning" | "log";

export interface ConsoleCounts {
  error: number;
  warning: number;
  log: number;
}

export interface ConsoleCursor {
  hostId: string;
  hostEpoch: number;
  consoleGeneration: number;
  startIndex: number;
  createdAt: string;
}

export interface ConsoleSeverityScan {
  scannedCount: number;
  startIndex: number;
  endIndexExclusive: number;
  limit: number;
  severityBreakdownComplete: boolean;
}

export interface ConsoleCountSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  totalCount: number;
  counts: ConsoleCounts;
  severityScan: ConsoleSeverityScan;
  cursor: ConsoleCursor;
  consoleGeneration: number;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ConsoleSnapshotRange {
  startIndex: number;
  endIndexExclusive: number;
  totalCountAtCapture: number;
  limit: number;
  truncated: boolean;
}

export interface ConsoleSnapshotSummary {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  artifactId: string;
  uri: string;
  counts: ConsoleCounts;
  cursor: ConsoleCursor;
  range: ConsoleSnapshotRange;
  entryCount: number;
  includeStackTrace: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ConsoleClearSnapshot {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  explicitClear: boolean;
  cleared: boolean;
  countBeforeClear: number;
  countAfterClear: number;
  consoleGenerationBeforeClear: number;
  consoleGenerationAfterClear: number;
  cursor: ConsoleCursor;
  capturedMainThreadId?: number;
  executionThreadId?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export function parseConsoleCountData(data: unknown): ConsoleCountSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) &&
    isNonNegativeInteger(value.hostEpoch) &&
    isNonNegativeInteger(value.totalCount) &&
    isConsoleCounts(value.counts) &&
    isConsoleSeverityScan(value.severityScan) &&
    isConsoleCursor(value.cursor) &&
    isNonNegativeInteger(value.consoleGeneration) &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId) &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    totalCount: value.totalCount,
    counts: cloneConsoleCounts(value.counts),
    severityScan: cloneConsoleSeverityScan(value.severityScan),
    cursor: cloneConsoleCursor(value.cursor),
    consoleGeneration: value.consoleGeneration,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function parseConsoleSnapshotData(data: unknown): ConsoleSnapshotSummary | null {
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
    typeof value.hostId === "string" &&
    value.hostId.length > 0 &&
    isNonNegativeInteger(value.hostEpoch) &&
    typeof value.artifactId === "string" &&
    value.artifactId.length > 0 &&
    typeof value.uri === "string" &&
    value.uri === `unity://console-snapshots/${value.artifactId}` &&
    isConsoleCounts(value.counts) &&
    isConsoleCursor(value.cursor) &&
    isConsoleSnapshotRange(value.range) &&
    isNonNegativeInteger(value.entryCount) &&
    typeof value.includeStackTrace === "boolean" &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId) &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    artifactId: value.artifactId,
    uri: value.uri,
    counts: cloneConsoleCounts(value.counts),
    cursor: cloneConsoleCursor(value.cursor),
    range: cloneConsoleSnapshotRange(value.range),
    entryCount: value.entryCount,
    includeStackTrace: value.includeStackTrace,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function parseConsoleClearData(data: unknown): ConsoleClearSnapshot | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  if (!(
    typeof value.projectRoot === "string" &&
    value.projectRoot.length > 0 &&
    isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) &&
    isNonNegativeInteger(value.hostEpoch) &&
    typeof value.explicitClear === "boolean" &&
    typeof value.cleared === "boolean" &&
    isNonNegativeInteger(value.countBeforeClear) &&
    isNonNegativeInteger(value.countAfterClear) &&
    isNonNegativeInteger(value.consoleGenerationBeforeClear) &&
    isNonNegativeInteger(value.consoleGenerationAfterClear) &&
    isConsoleCursor(value.cursor) &&
    isOptionalInteger(value.capturedMainThreadId) &&
    isOptionalInteger(value.executionThreadId) &&
    isDiagnosticArray(value.diagnostics)
  )) {
    return null;
  }

  return {
    projectRoot: value.projectRoot,
    unityVersion: value.unityVersion,
    hostId: value.hostId,
    hostEpoch: value.hostEpoch,
    explicitClear: value.explicitClear,
    cleared: value.cleared,
    countBeforeClear: value.countBeforeClear,
    countAfterClear: value.countAfterClear,
    consoleGenerationBeforeClear: value.consoleGenerationBeforeClear,
    consoleGenerationAfterClear: value.consoleGenerationAfterClear,
    cursor: cloneConsoleCursor(value.cursor),
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function validateConsoleCursor(
  cursor: ConsoleCursor,
  current: Pick<ConsoleCountSnapshot, "hostId" | "hostEpoch" | "consoleGeneration" | "totalCount">,
): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  const currentRecord = current as Pick<ConsoleCountSnapshot, "hostId" | "hostEpoch" | "consoleGeneration" | "totalCount"> & {
    cursor?: ConsoleCursor;
  };
  const expectedHostId = currentRecord.hostId ?? currentRecord.cursor?.hostId;
  const expectedHostEpoch = currentRecord.hostEpoch ?? currentRecord.cursor?.hostEpoch;

  if (!isConsoleCursor(cursor)) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console cursor shape is invalid.",
      },
    };
  }

  if (expectedHostId === undefined || expectedHostEpoch === undefined) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console cursor validation requires current host identity evidence.",
      },
    };
  }

  if (cursor.hostId !== expectedHostId || cursor.hostEpoch !== expectedHostEpoch) {
    return {
      ok: false,
      diagnostic: {
        source: "host",
        severity: "error",
        code: "host.continuity_lost",
        message: "Console cursor host identity does not match the current console host.",
        details: {
          expectedHostId,
          expectedHostEpoch,
          actualHostId: cursor.hostId,
          actualHostEpoch: cursor.hostEpoch,
        },
      },
    };
  }

  if (cursor.consoleGeneration !== current.consoleGeneration) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_generation_mismatch",
        message: "Console cursor generation does not match the current console generation.",
        details: {
          expectedConsoleGeneration: current.consoleGeneration,
          actualConsoleGeneration: cursor.consoleGeneration,
        },
      },
    };
  }

  if (cursor.startIndex > current.totalCount) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console cursor startIndex exceeds the current total console count.",
        details: {
          startIndex: cursor.startIndex,
          totalCount: current.totalCount,
        },
      },
    };
  }

  return { ok: true };
}

export function consoleCountResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  return mapConsoleStateResult({
    hostResult,
    expectedProjectRoot,
    operation: consoleCountOperation,
    action: "count",
    parse: parseConsoleCountData,
    success: (snapshot, diagnostics) => {
      const cursorValidation = validateCountTailCursorProof(snapshot);
      if (!cursorValidation.ok) {
        return definePublicResult({
          status: "uncertain",
          tool: "unity_console",
          action: "count",
          operation: consoleCountOperation,
          requestId: hostResult.requestId,
          hostId: hostResult.hostId,
          hostEpoch: hostResult.hostEpoch,
          summary: cursorValidation.diagnostic.message,
          code: cursorValidation.diagnostic.code,
          message: cursorValidation.diagnostic.message,
          diagnostics: [...diagnostics, withAttribution(cursorValidation.diagnostic, consoleCountOperation, hostResult.requestId)],
          evidence: {
            completion: "console_proof_incomplete",
            totalCount: snapshot.totalCount,
            severityBreakdownComplete: snapshot.severityScan.severityBreakdownComplete,
          },
          startedAt: hostResult.startedAt,
          completedAt: hostResult.completedAt,
          durationMs: hostResult.durationMs,
          nextStep: {
            kind: "inspect_diagnostics",
            reason: "Inspect diagnostics because console count cursor proof could not be trusted.",
          },
        });
      }

      return definePublicResult({
        status: "succeeded",
        tool: "unity_console",
        action: "count",
        operation: consoleCountOperation,
        requestId: hostResult.requestId,
        hostId: hostResult.hostId,
        hostEpoch: hostResult.hostEpoch,
        summary: "Console count snapshot captured.",
        data: snapshot,
        diagnostics,
        evidence: {
          completion: "state_snapshot",
          totalCount: snapshot.totalCount,
          severityBreakdownComplete: snapshot.severityScan.severityBreakdownComplete,
        },
        startedAt: hostResult.startedAt,
        completedAt: hostResult.completedAt,
        durationMs: hostResult.durationMs,
      });
    },
  });
}

export function consoleSnapshotSummaryFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  return mapConsoleStateResult({
    hostResult,
    expectedProjectRoot,
    operation: consoleSnapshotOperation,
    action: "snapshot",
    parse: parseConsoleSnapshotData,
    success: (summary, diagnostics) => definePublicResult({
      status: "succeeded",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId: hostResult.requestId,
      hostId: hostResult.hostId,
      hostEpoch: hostResult.hostEpoch,
      summary: "Console snapshot metadata captured.",
      data: summary,
      diagnostics,
      evidence: {
        completion: "artifact_metadata_written",
        resourceUri: summary.uri,
        bounded: true,
      },
      startedAt: hostResult.startedAt,
      completedAt: hostResult.completedAt,
      durationMs: hostResult.durationMs,
    }),
  });
}

export function consoleClearResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapNonSucceededHostResult(hostResult, "clear");
  }

  const snapshot = parseConsoleClearData(hostResult.data);
  if (snapshot === null) {
    return invalidConsoleResult(hostResult, consoleClearOperation, "clear", {
      source: "workflow",
      severity: "error",
      code: "console.clear_invalid_shape",
      message: "Console clear operation returned an invalid data shape.",
      attribution: {
        operation: consoleClearOperation,
        requestId: hostResult.requestId,
      },
    });
  }

  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidConsoleResult(hostResult, consoleClearOperation, "clear", {
      source: "validation",
      severity: "error",
      code: "console.project_root_mismatch",
      message: "Console clear projectRoot does not match the expected Unity project root.",
      details: {
        expectedProjectRoot,
        actualProjectRoot: snapshot.projectRoot,
      },
      attribution: {
        operation: consoleClearOperation,
        requestId: hostResult.requestId,
      },
    });
  }

  if (
    snapshot.hostId !== undefined &&
    snapshot.hostEpoch !== undefined &&
    (snapshot.hostId !== hostResult.hostId || snapshot.hostEpoch !== hostResult.hostEpoch)
  ) {
    return continuityLostResult(hostResult, "clear", consoleClearOperation, {
      expectedHostId: hostResult.hostId,
      expectedHostEpoch: hostResult.hostEpoch,
      actualHostId: snapshot.hostId,
      actualHostEpoch: snapshot.hostEpoch,
    });
  }

  const diagnostics = [...hostResult.diagnostics, ...snapshot.diagnostics];
  const verified =
    snapshot.explicitClear &&
    snapshot.cleared &&
    snapshot.countAfterClear === 0 &&
    snapshot.consoleGenerationAfterClear > snapshot.consoleGenerationBeforeClear;

  if (!verified) {
    return definePublicResult({
      status: "failed",
      tool: "unity_console",
      action: "clear",
      operation: consoleClearOperation,
      requestId: hostResult.requestId,
      hostId: hostResult.hostId,
      hostEpoch: hostResult.hostEpoch,
      summary: "Console clear could not be verified.",
      code: "console.clear_verification_failed",
      message: "Console clear could not be verified.",
      data: snapshot,
      diagnostics: [
        ...diagnostics,
        {
          source: "validation",
          severity: "error",
          code: "console.clear_verification_failed",
          message: "Console clear could not be verified.",
          details: {
            explicitClear: snapshot.explicitClear,
            cleared: snapshot.cleared,
            countAfterClear: snapshot.countAfterClear,
            consoleGenerationBeforeClear: snapshot.consoleGenerationBeforeClear,
            consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
          },
          attribution: {
            operation: consoleClearOperation,
            requestId: hostResult.requestId,
          },
        },
      ],
      evidence: {
        completion: "effect_unverified",
        countBeforeClear: snapshot.countBeforeClear,
        countAfterClear: snapshot.countAfterClear,
        consoleGenerationBeforeClear: snapshot.consoleGenerationBeforeClear,
        consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
      },
      startedAt: hostResult.startedAt,
      completedAt: hostResult.completedAt,
      durationMs: hostResult.durationMs,
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Inspect diagnostics before assuming the Unity console was cleared.",
      },
    });
  }

  const cursorValidation = validateClearPostStateCursorProof(snapshot);
  if (!cursorValidation.ok) {
    return definePublicResult({
      status: "uncertain",
      tool: "unity_console",
      action: "clear",
      operation: consoleClearOperation,
      requestId: hostResult.requestId,
      hostId: hostResult.hostId,
      hostEpoch: hostResult.hostEpoch,
      summary: cursorValidation.diagnostic.message,
      code: cursorValidation.diagnostic.code,
      message: cursorValidation.diagnostic.message,
      data: snapshot,
      diagnostics: [...diagnostics, withAttribution(cursorValidation.diagnostic, consoleClearOperation, hostResult.requestId)],
      evidence: {
        completion: "console_proof_incomplete",
        countBeforeClear: snapshot.countBeforeClear,
        countAfterClear: snapshot.countAfterClear,
        consoleGenerationBeforeClear: snapshot.consoleGenerationBeforeClear,
        consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
      },
      startedAt: hostResult.startedAt,
      completedAt: hostResult.completedAt,
      durationMs: hostResult.durationMs,
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Inspect diagnostics because console clear cursor proof could not be trusted.",
      },
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_console",
    action: "clear",
    operation: consoleClearOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: "Console clear verified.",
    data: snapshot,
    diagnostics,
    evidence: {
      completion: "effect_verified",
      countBeforeClear: snapshot.countBeforeClear,
      countAfterClear: snapshot.countAfterClear,
      consoleGenerationBeforeClear: snapshot.consoleGenerationBeforeClear,
      consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function validateCountTailCursorProof(
  snapshot: ConsoleCountSnapshot,
): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  const cursorValidation = validateConsoleCursor(snapshot.cursor, snapshot);
  if (!cursorValidation.ok) {
    return cursorValidation;
  }

  if (snapshot.cursor.startIndex !== snapshot.totalCount) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console count cursor must point at the current tail count.",
        details: {
          cursorStartIndex: snapshot.cursor.startIndex,
          totalCount: snapshot.totalCount,
        },
      },
    };
  }

  return { ok: true };
}

function validateClearPostStateCursorProof(
  snapshot: ConsoleClearSnapshot,
): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  if (snapshot.cursor.hostId !== snapshot.hostId) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console clear cursor hostId does not match the clear snapshot.",
        details: {
          cursorHostId: snapshot.cursor.hostId,
          clearHostId: snapshot.hostId,
        },
      },
    };
  }

  if (snapshot.cursor.hostEpoch !== snapshot.hostEpoch) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console clear cursor hostEpoch does not match the clear snapshot.",
        details: {
          cursorHostEpoch: snapshot.cursor.hostEpoch,
          clearHostEpoch: snapshot.hostEpoch,
        },
      },
    };
  }

  if (snapshot.cursor.consoleGeneration !== snapshot.consoleGenerationAfterClear) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_generation_mismatch",
        message: "Console clear cursor generation does not match the verified post-clear generation.",
        details: {
          cursorConsoleGeneration: snapshot.cursor.consoleGeneration,
          consoleGenerationAfterClear: snapshot.consoleGenerationAfterClear,
        },
      },
    };
  }

  if (snapshot.cursor.startIndex !== snapshot.countAfterClear) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console clear cursor startIndex does not match the post-clear count.",
        details: {
          cursorStartIndex: snapshot.cursor.startIndex,
          countAfterClear: snapshot.countAfterClear,
        },
      },
    };
  }

  return { ok: true };
}

function withAttribution(
  diagnostic: UnityAgentKitDiagnostic,
  operation: string,
  requestId: string,
): UnityAgentKitDiagnostic {
  return {
    ...diagnostic,
    attribution: diagnostic.attribution ?? {
      operation,
      requestId,
    },
  };
}

function mapConsoleStateResult<T>(options: {
  hostResult: UnityAgentKitPublicResult;
  expectedProjectRoot: string;
  operation: typeof consoleCountOperation | typeof consoleSnapshotOperation;
  action: "count" | "snapshot";
  parse: (data: unknown) => T | null;
  success: (parsed: T, diagnostics: UnityAgentKitDiagnostic[]) => UnityAgentKitPublicResult;
}): UnityAgentKitPublicResult {
  const { hostResult, expectedProjectRoot, operation, action, parse, success } = options;

  if (hostResult.status !== "succeeded") {
    return remapNonSucceededHostResult(hostResult, action);
  }

  const parsed = parse(hostResult.data);
  if (parsed === null) {
    return invalidConsoleResult(hostResult, operation, action, {
      source: "workflow",
      severity: "error",
      code: `console.${action}_invalid_shape`,
      message: `Console ${action} operation returned an invalid data shape.`,
      attribution: {
        operation,
        requestId: hostResult.requestId,
      },
    });
  }

  const dataRecord = parsed as Record<string, unknown>;
  const projectRoot = dataRecord.projectRoot;
  if (typeof projectRoot !== "string" || normalizeProjectRoot(projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidConsoleResult(hostResult, operation, action, {
      source: "validation",
      severity: "error",
      code: "console.project_root_mismatch",
      message: `Console ${action} projectRoot does not match the expected Unity project root.`,
      details: {
        expectedProjectRoot,
        actualProjectRoot: projectRoot,
      },
      attribution: {
        operation,
        requestId: hostResult.requestId,
      },
    });
  }

  const dataHostId = dataRecord.hostId;
  const dataHostEpoch = dataRecord.hostEpoch;
  if (
    dataHostId !== undefined &&
    dataHostEpoch !== undefined &&
    (dataHostId !== hostResult.hostId || dataHostEpoch !== hostResult.hostEpoch)
  ) {
    return continuityLostResult(hostResult, action, operation, {
      expectedHostId: hostResult.hostId,
      expectedHostEpoch: hostResult.hostEpoch,
      actualHostId: dataHostId,
      actualHostEpoch: dataHostEpoch,
    });
  }

  const diagnostics = [
    ...hostResult.diagnostics,
    ...(Array.isArray(dataRecord.diagnostics) ? cloneDiagnostics(dataRecord.diagnostics) : []),
  ];

  return success(parsed, diagnostics);
}

function remapNonSucceededHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "count" | "snapshot" | "clear",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...hostResult,
    tool: "unity_console",
    action,
    summary: hostResult.summary || `Console ${action} could not be completed.`,
  });
}

function invalidConsoleResult(
  hostResult: UnityAgentKitPublicResult,
  operation: string,
  action: "count" | "snapshot" | "clear",
  diagnostic: UnityAgentKitDiagnostic,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_console",
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
      reason: "Inspect diagnostics before retrying the console workflow.",
    },
  });
}

function continuityLostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "count" | "snapshot" | "clear",
  operation: string,
  details: Record<string, unknown>,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "error",
    code: "host.continuity_lost",
    message: "Console host continuity changed before the result could be trusted.",
    details,
    attribution: {
      operation,
      requestId: hostResult.requestId,
    },
  };

  return definePublicResult({
    status: "uncertain",
    tool: "unity_console",
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
      reason: "Inspect diagnostics because console proof crossed a host continuity boundary.",
    },
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
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

function isOptionalNonNegativeInteger(value: unknown): value is number | undefined {
  return value === undefined || isNonNegativeInteger(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isConsoleCounts(value: unknown): value is ConsoleCounts {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const counts = value as Record<string, unknown>;
  return isNonNegativeInteger(counts.error) && isNonNegativeInteger(counts.warning) && isNonNegativeInteger(counts.log);
}

function isConsoleCursor(value: unknown): value is ConsoleCursor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const cursor = value as Record<string, unknown>;
  return (
    isNonEmptyString(cursor.hostId) &&
    isNonNegativeInteger(cursor.hostEpoch) &&
    isNonNegativeInteger(cursor.consoleGeneration) &&
    isNonNegativeInteger(cursor.startIndex) &&
    isNonEmptyString(cursor.createdAt)
  );
}

function isConsoleSeverityScan(value: unknown): value is ConsoleSeverityScan {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const scan = value as Record<string, unknown>;
  return (
    isNonNegativeInteger(scan.scannedCount) &&
    isNonNegativeInteger(scan.startIndex) &&
    isNonNegativeInteger(scan.endIndexExclusive) &&
    isNonNegativeInteger(scan.limit) &&
    typeof scan.severityBreakdownComplete === "boolean"
  );
}

function isConsoleSnapshotRange(value: unknown): value is ConsoleSnapshotRange {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const range = value as Record<string, unknown>;
  return (
    isNonNegativeInteger(range.startIndex) &&
    isNonNegativeInteger(range.endIndexExclusive) &&
    isNonNegativeInteger(range.totalCountAtCapture) &&
    isNonNegativeInteger(range.limit) &&
    typeof range.truncated === "boolean"
  );
}

function isDiagnosticArray(value: unknown): value is UnityAgentKitDiagnostic[] {
  return Array.isArray(value) && value.every(isDiagnostic);
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  return (
    isNonEmptyString(diagnostic.source) &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    isNonEmptyString(diagnostic.message) &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string")
  );
}

function cloneConsoleCounts(counts: ConsoleCounts): ConsoleCounts {
  return { error: counts.error, warning: counts.warning, log: counts.log };
}

function cloneConsoleCursor(cursor: ConsoleCursor): ConsoleCursor {
  return {
    hostId: cursor.hostId,
    hostEpoch: cursor.hostEpoch,
    consoleGeneration: cursor.consoleGeneration,
    startIndex: cursor.startIndex,
    createdAt: cursor.createdAt,
  };
}

function cloneConsoleSeverityScan(scan: ConsoleSeverityScan): ConsoleSeverityScan {
  return {
    scannedCount: scan.scannedCount,
    startIndex: scan.startIndex,
    endIndexExclusive: scan.endIndexExclusive,
    limit: scan.limit,
    severityBreakdownComplete: scan.severityBreakdownComplete,
  };
}

function cloneConsoleSnapshotRange(range: ConsoleSnapshotRange): ConsoleSnapshotRange {
  return {
    startIndex: range.startIndex,
    endIndexExclusive: range.endIndexExclusive,
    totalCountAtCapture: range.totalCountAtCapture,
    limit: range.limit,
    truncated: range.truncated,
  };
}

function cloneDiagnostics(diagnostics: UnityAgentKitDiagnostic[]): UnityAgentKitDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}
