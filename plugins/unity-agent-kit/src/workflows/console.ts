import { readUnityResource } from "../resources/readback.ts";
import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import {
  consoleClearOperation,
  consoleClearResultFromHostResult,
  consoleCountOperation,
  consoleCountResultFromHostResult,
  consoleSnapshotOperation,
  consoleSnapshotSummaryFromHostResult,
  parseConsoleSnapshotData,
  validateConsoleCursor,
  type ConsoleCursor,
  type ConsoleSnapshotSummary,
} from "../diagnostics/console.ts";

export interface ConsoleWorkflowOptions { registryPath: string; projectRoot: string; transport: HostTransport; readRegistry?: RegistryReader; }
export interface ConsoleActionOptions { requestId?: string; }
export interface ConsoleCountOptions extends ConsoleActionOptions { maxSeverityScan?: number; }
export interface ConsoleSnapshotOptions extends ConsoleActionOptions { limit?: number; includeStackTrace?: boolean; cursor?: ConsoleCursor; }
export interface ConsoleClearOptions extends ConsoleActionOptions { confirmClear?: boolean; }

export async function countConsole(
  workflow: ConsoleWorkflowOptions,
  options: ConsoleCountOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-count-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleCountOperation,
      requestId,
      inputJson: JSON.stringify({ maxSeverityScan: boundedInteger(options.maxSeverityScan, 1, 1_000, 500) }),
    },
  });

  return consoleCountResultFromHostResult(hostResult.result, workflow.projectRoot);
}

export async function snapshotConsole(
  workflow: ConsoleWorkflowOptions,
  options: ConsoleSnapshotOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-snapshot-${Date.now()}`;
  const input: Record<string, unknown> = {
    limit: boundedInteger(options.limit, 1, 500, 200),
    includeStackTrace: options.includeStackTrace === true,
  };
  if (options.cursor !== undefined) {
    input.cursor = options.cursor;
  }

  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleSnapshotOperation,
      requestId,
      inputJson: JSON.stringify(input),
    },
  });

  const mapped = consoleSnapshotSummaryFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") {
    return mapped;
  }

  const summary = parseConsoleSnapshotData(mapped.data);
  if (summary === null) {
    return definePublicResult({
      status: "failed",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId: mapped.requestId,
      hostId: mapped.hostId,
      hostEpoch: mapped.hostEpoch,
      summary: "Console snapshot returned invalid metadata.",
      code: "console.snapshot_invalid_shape",
      message: "Console snapshot returned invalid metadata.",
      diagnostics: [
        ...mapped.diagnostics,
        {
          source: "workflow",
          severity: "error",
          code: "console.snapshot_invalid_shape",
          message: "Console snapshot returned invalid metadata.",
          attribution: {
            operation: consoleSnapshotOperation,
            requestId: mapped.requestId,
          },
        },
      ],
      startedAt: mapped.startedAt,
      completedAt: mapped.completedAt,
      durationMs: mapped.durationMs,
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Inspect diagnostics before retrying because snapshot metadata was invalid.",
      },
    });
  }

  const cursorValidation = validateSnapshotCursorProof(summary);
  if (!cursorValidation.ok) {
    return definePublicResult({
      status: "uncertain",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId: mapped.requestId,
      hostId: mapped.hostId,
      hostEpoch: mapped.hostEpoch,
      summary: cursorValidation.diagnostic.message,
      code: "console.cursor_invalid",
      message: cursorValidation.diagnostic.message,
      diagnostics: [...mapped.diagnostics, cursorValidation.diagnostic],
      evidence: mapped.evidence,
      startedAt: mapped.startedAt,
      completedAt: mapped.completedAt,
      durationMs: mapped.durationMs,
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Inspect diagnostics because console cursor proof could not be trusted.",
      },
    });
  }

  const readback = await readUnityResource(workflow.projectRoot, summary.uri);
  if (!readback.ok) {
    const diagnostic: UnityAgentKitDiagnostic = {
      ...readback.diagnostic,
      code: "console.snapshot_resource_failed",
    };

    return definePublicResult({
      status: "failed",
      tool: "unity_console",
      action: "snapshot",
      operation: consoleSnapshotOperation,
      requestId: mapped.requestId,
      hostId: mapped.hostId,
      hostEpoch: mapped.hostEpoch,
      summary: "Console snapshot resource readback failed.",
      code: "console.snapshot_resource_failed",
      message: "Console snapshot resource readback failed.",
      data: summary,
      diagnostics: [...mapped.diagnostics, diagnostic],
      evidence: {
        completion: "artifact_readback_failed",
        resourceUri: summary.uri,
        reason: readback.reason,
      },
      startedAt: mapped.startedAt,
      completedAt: mapped.completedAt,
      durationMs: mapped.durationMs,
      nextStep: {
        kind: "inspect_diagnostics",
        reason: "Inspect diagnostics before retrying because the snapshot artifact could not be read back.",
      },
    });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_console",
    action: "snapshot",
    operation: consoleSnapshotOperation,
    requestId: mapped.requestId,
    hostId: mapped.hostId,
    hostEpoch: mapped.hostEpoch,
    summary: "Console snapshot resource read back successfully.",
    data: summary,
    diagnostics: mapped.diagnostics,
    evidence: {
      completion: "artifact_complete",
      resourceUri: readback.resource.uri,
      bounded: true,
      entryCount: summary.entryCount,
      truncated: summary.range.truncated,
    },
    resource: readback.resource,
    metadata: {
      resourceFilePath: readback.filePath,
      resourceContentBytes: readback.contentBytes.byteLength,
    },
    startedAt: mapped.startedAt,
    completedAt: mapped.completedAt,
    durationMs: mapped.durationMs,
  });
}

export async function clearConsole(
  workflow: ConsoleWorkflowOptions,
  options: ConsoleClearOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `console-clear-${Date.now()}`;
  if (options.confirmClear !== true) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_console",
      action: "clear",
      requestId,
      summary: "Console clear requires explicit confirmation.",
      code: "console.clear_requires_explicit_confirmation",
      message: "Console clear requires explicit confirmation.",
      diagnostics: [
        {
          source: "workflow",
          severity: "error",
          code: "console.clear_requires_explicit_confirmation",
          message: "Console clear requires explicit confirmation.",
          attribution: {
            operation: consoleClearOperation,
            requestId,
          },
        },
      ],
      nextStep: {
        kind: "rerun_with_confirmation",
        reason: "Rerun with confirmClear: true only if the user explicitly wants to clear the Unity console.",
      },
    });
  }

  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: consoleClearOperation,
      requestId,
      inputJson: JSON.stringify({ confirmClear: true }),
    },
  });

  if (hostResult.result.status === "timeout") {
    return timeoutContinuationResult({
      tool: "unity_console",
      action: "clear",
      requestId,
      summary: hostResult.result.summary || "Timed out waiting for console clear verification.",
      mayStillBeRunning: hostResult.result.mayStillBeRunning ?? true,
      safeToRetry: false,
      nextStep: {
        kind: "read_state",
        tool: "unity_console",
        action: "count",
        reason: "Read the latest console count before deciding whether to retry clear.",
      },
    });
  }

  return consoleClearResultFromHostResult(hostResult.result, workflow.projectRoot);
}

function validateSnapshotCursorProof(
  summary: ConsoleSnapshotSummary,
): { ok: true } | { ok: false; diagnostic: UnityAgentKitDiagnostic } {
  const cursorValidation = validateConsoleCursor(summary.cursor, {
    hostId: summary.hostId,
    hostEpoch: summary.hostEpoch,
    consoleGeneration: summary.cursor.consoleGeneration,
    totalCount: summary.range.totalCountAtCapture,
  });
  if (!cursorValidation.ok) {
    return {
      ok: false,
      diagnostic: remapSnapshotCursorDiagnostic(cursorValidation.diagnostic),
    };
  }

  if (summary.cursor.startIndex !== summary.range.endIndexExclusive) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console snapshot cursor startIndex does not match the end of the captured range.",
        details: {
          cursorStartIndex: summary.cursor.startIndex,
          rangeEndIndexExclusive: summary.range.endIndexExclusive,
        },
      },
    };
  }

  if (
    summary.range.startIndex > summary.range.endIndexExclusive ||
    summary.range.endIndexExclusive > summary.range.totalCountAtCapture
  ) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console snapshot range is inconsistent with the total count captured.",
        details: {
          startIndex: summary.range.startIndex,
          endIndexExclusive: summary.range.endIndexExclusive,
          totalCountAtCapture: summary.range.totalCountAtCapture,
        },
      },
    };
  }

  const expectedEntryCount = summary.range.endIndexExclusive - summary.range.startIndex;
  if (summary.entryCount !== expectedEntryCount) {
    return {
      ok: false,
      diagnostic: {
        source: "validation",
        severity: "error",
        code: "console.cursor_invalid",
        message: "Console snapshot entryCount does not match the captured range length.",
        details: {
          entryCount: summary.entryCount,
          expectedEntryCount,
          startIndex: summary.range.startIndex,
          endIndexExclusive: summary.range.endIndexExclusive,
        },
      },
    };
  }

  return { ok: true };
}

function remapSnapshotCursorDiagnostic(diagnostic: UnityAgentKitDiagnostic): UnityAgentKitDiagnostic {
  return {
    ...diagnostic,
    code: "console.cursor_invalid",
  };
}

export function boundedInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
