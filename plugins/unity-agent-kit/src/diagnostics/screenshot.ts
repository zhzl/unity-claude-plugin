import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const screenshotCaptureOperation = "screenshot.capture" as const;

export interface ScreenshotCaptureSummary {
  projectRoot: string;
  unityVersion: string;
  hostId: string;
  hostEpoch: number;
  artifactId: string;
  uri: string;
  relativePath: string;
  width: number;
  height: number;
  sizeBytes: number;
  captureMethod: string;
  validationStatus: "valid" | "invalid" | "uncertain";
  label: string;
  capturedMainThreadId: number;
  executionThreadId: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export type PngHeaderDimensionsResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "too_short" | "invalid_signature" | "missing_ihdr" | "invalid_dimensions" };

export function parseScreenshotCaptureData(data: unknown): ScreenshotCaptureSummary | null {
  const value = parseRecord(data);
  if (value === null) return null;
  if (!(
    isNonEmptyString(value.projectRoot) &&
    isNonEmptyString(value.unityVersion) &&
    isNonEmptyString(value.hostId) &&
    isNonNegativeInteger(value.hostEpoch) &&
    isSafeResourceId(value.artifactId) &&
    value.uri === `unity://screenshots/${value.artifactId}` &&
    isSafeScreenshotRelativePath(value.relativePath, value.artifactId) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    isPositiveInteger(value.sizeBytes) &&
    value.captureMethod === "screen_capture_capture_screenshot" &&
    value.validationStatus === "valid" &&
    typeof value.label === "string" &&
    isNonNegativeInteger(value.capturedMainThreadId) &&
    isNonNegativeInteger(value.executionThreadId) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isDiagnostic)
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
    relativePath: value.relativePath,
    width: value.width,
    height: value.height,
    sizeBytes: value.sizeBytes,
    captureMethod: value.captureMethod,
    validationStatus: value.validationStatus,
    label: value.label,
    capturedMainThreadId: value.capturedMainThreadId,
    executionThreadId: value.executionThreadId,
    diagnostics: cloneDiagnostics(value.diagnostics),
  };
}

export function parsePngHeaderDimensions(bytes: Uint8Array): PngHeaderDimensionsResult {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.byteLength < 33) return { ok: false, reason: "too_short" };
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[index] !== signature[index]) return { ok: false, reason: "invalid_signature" };
  }
  const ihdrLength = readUint32(bytes, 8);
  const ihdrType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (ihdrLength !== 13 || ihdrType !== "IHDR") return { ok: false, reason: "missing_ihdr" };
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (width <= 0 || height <= 0) return { ok: false, reason: "invalid_dimensions" };
  return { ok: true, width, height };
}

export function screenshotCaptureResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return remapNonSucceededHostResult(hostResult);
  }

  const summary = parseScreenshotCaptureData(hostResult.data);
  if (summary === null) {
    return invalidScreenshotResult(
      hostResult,
      "screenshot.capture_invalid_shape",
      "Screenshot capture operation returned an invalid data shape.",
    );
  }

  if (normalizeProjectRoot(summary.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidScreenshotResult(
      hostResult,
      "screenshot.project_root_mismatch",
      "Screenshot capture projectRoot does not match the expected Unity project root.",
      { expectedProjectRoot, actualProjectRoot: summary.projectRoot },
    );
  }

  if (summary.hostId !== hostResult.hostId || summary.hostEpoch !== hostResult.hostEpoch) {
    return continuityLostResult(hostResult, {
      expectedHostId: hostResult.hostId,
      expectedHostEpoch: hostResult.hostEpoch,
      actualHostId: summary.hostId,
      actualHostEpoch: summary.hostEpoch,
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: "Screenshot metadata captured.",
    data: summary,
    diagnostics: [...hostResult.diagnostics, ...summary.diagnostics],
    evidence: {
      completion: "artifact_metadata_written",
      artifactId: summary.artifactId,
      resourceUri: summary.uri,
      width: summary.width,
      height: summary.height,
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function remapNonSucceededHostResult(hostResult: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  return definePublicResult({
    ...hostResult,
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
    summary: hostResult.summary || "Screenshot capture could not be completed.",
  });
}

function invalidScreenshotResult(
  hostResult: UnityAgentKitPublicResult,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "workflow",
    severity: "error",
    code,
    message,
    ...(details === undefined ? {} : { details }),
    attribution: {
      operation: screenshotCaptureOperation,
      requestId: hostResult.requestId,
    },
  };

  return definePublicResult({
    status: "failed",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
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
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Inspect diagnostics before retrying the screenshot workflow.",
    },
  });
}

function continuityLostResult(hostResult: UnityAgentKitPublicResult, details: Record<string, unknown>): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "error",
    code: "screenshot.host_identity_mismatch",
    message: "Screenshot host continuity changed before the result could be trusted.",
    details,
    attribution: {
      operation: screenshotCaptureOperation,
      requestId: hostResult.requestId,
    },
  };

  return definePublicResult({
    status: "lost",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
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
      reason: "Inspect diagnostics because screenshot proof crossed a host continuity boundary.",
    },
    safeToRetry: false,
  });
}

function parseRecord(data: unknown): Record<string, unknown> | null {
  const parsed = typeof data === "string" ? parseJson(data) : data;
  return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
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

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isSafeResourceId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value) &&
    !value.includes("%") &&
    !value.includes(".") &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !/^[A-Za-z]:/.test(value);
}

function isSafeScreenshotRelativePath(value: unknown, artifactId: string): value is string {
  return value === `screenshots/${artifactId}.png`;
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
