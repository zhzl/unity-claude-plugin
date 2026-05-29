import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import { readUnityResource } from "../resources/readback.ts";
import type { UnityAgentKitArtifactMetadata, UnityAgentKitResourceReadResult } from "../artifacts/types.ts";
import type { HostTransport } from "../host/transport.ts";
import type { RegistryReader } from "../host/rebind.ts";
import {
  parsePngHeaderDimensions,
  parseScreenshotCaptureData,
  screenshotCaptureOperation,
  screenshotCaptureResultFromHostResult,
  type ScreenshotCaptureSummary,
} from "../diagnostics/screenshot.ts";
import { executeWithRebindAwareness } from "./rebind.ts";
import { timeoutContinuationResult } from "./timeout.ts";

export interface ScreenshotWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface CaptureGameViewScreenshotOptions {
  requestId?: string;
  label?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

type ScreenshotReadbackWaitResult =
  | {
      status: "ready";
      resource: Extract<UnityAgentKitResourceReadResult, { ok: true }>["resource"];
      metadata: UnityAgentKitArtifactMetadata;
      filePath: string;
      contentBytes: Uint8Array;
    }
  | { status: "result"; result: UnityAgentKitPublicResult };

export async function captureGameViewScreenshot(
  workflow: ScreenshotWorkflowOptions,
  options: CaptureGameViewScreenshotOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `screenshot-capture-${Date.now()}`;
  if (!isSafeLabel(options.label ?? "")) {
    return definePublicResult({
      status: "rejected",
      tool: "unity_screenshot",
      action: "capture_game_view",
      operation: screenshotCaptureOperation,
      requestId,
      summary: "Screenshot label must not contain path syntax.",
      code: "screenshot.label_invalid",
      message: "Screenshot label must not contain path syntax.",
      diagnostics: [{ source: "workflow", severity: "warning", code: "screenshot.label_invalid", message: "Screenshot label must not contain path syntax." }],
    });
  }

  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    transport: workflow.transport,
    readRegistry: workflow.readRegistry,
    request: { operation: screenshotCaptureOperation, requestId, inputJson: JSON.stringify({ label: options.label ?? "" }) },
  });
  const mapped = screenshotCaptureResultFromHostResult(hostResult.result, workflow.projectRoot);
  if (mapped.status !== "succeeded") {
    return mapped;
  }

  const summary = parseScreenshotCaptureData(mapped.data);
  if (summary === null) {
    return screenshotFailure(mapped, "screenshot.capture_invalid_shape", "Screenshot capture returned invalid artifact metadata.");
  }

  const readback = await waitForScreenshotResourceReadback(workflow, summary, options, mapped);
  if (readback.status !== "ready") {
    return readback.result;
  }

  const png = parsePngHeaderDimensions(readback.contentBytes);
  if (!png.ok) {
    return screenshotFailure(mapped, "screenshot.png_invalid", "Screenshot resource payload is not a valid PNG header.", { reason: png.reason });
  }

  if (png.width !== summary.width || png.height !== summary.height) {
    return screenshotFailure(mapped, "screenshot.png_dimension_mismatch", "Screenshot PNG dimensions do not match Unity producer metadata.", { producerWidth: summary.width, producerHeight: summary.height, pngWidth: png.width, pngHeight: png.height });
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
    requestId: mapped.requestId,
    hostId: mapped.hostId,
    hostEpoch: mapped.hostEpoch,
    summary: "Screenshot artifact is complete.",
    diagnostics: mapped.diagnostics,
    data: summary,
    resource: readback.resource,
    evidence: { completion: "artifact_complete", artifactId: summary.artifactId, resourceUri: summary.uri, pngHeader: "valid", width: png.width, height: png.height },
    metadata: { resourceFilePath: readback.filePath, resourceContentBytes: readback.contentBytes.byteLength, pngWidth: png.width, pngHeight: png.height },
    startedAt: mapped.startedAt,
    completedAt: mapped.completedAt,
    durationMs: mapped.durationMs,
  });
}

async function waitForScreenshotResourceReadback(
  workflow: ScreenshotWorkflowOptions,
  summary: ScreenshotCaptureSummary,
  options: CaptureGameViewScreenshotOptions,
  mapped: UnityAgentKitPublicResult,
): Promise<ScreenshotReadbackWaitResult> {
  const timeoutMs = positiveFiniteOrDefault(options.timeoutMs, 10_000);
  const pollIntervalMs = positiveFiniteOrDefault(options.pollIntervalMs, 250);
  const now = workflow.now ?? Date.now;
  const sleep = workflow.sleep ?? defaultSleep;
  const startedAt = now();
  let lastFailureDiagnostic: UnityAgentKitDiagnostic | undefined;

  for (;;) {
    const readback = await readUnityResource(workflow.projectRoot, summary.uri);
    if (readback.ok) {
      if (!resourceMetadataMatchesSummary(readback.metadata, summary, readback.contentBytes.byteLength)) {
        return {
          status: "result",
          result: screenshotFailure(mapped, "screenshot.resource_mismatch", "Screenshot resource metadata does not match Unity producer metadata.", {
            id: readback.metadata.id,
            uri: readback.metadata.uri,
            relativePath: readback.metadata.relativePath,
            hostId: readback.metadata.hostId,
            hostEpoch: readback.metadata.hostEpoch,
            producerTool: readback.metadata.producerTool,
            producerAction: readback.metadata.producerAction,
            sizeBytes: readback.metadata.sizeBytes,
            contentBytes: readback.contentBytes.byteLength,
          }),
        };
      }

      return {
        status: "ready",
        resource: readback.resource,
        metadata: readback.metadata,
        filePath: readback.filePath,
        contentBytes: readback.contentBytes,
      };
    }

    lastFailureDiagnostic = readback.diagnostic;
    const remainingMs = remainingTimeoutMs(startedAt, timeoutMs, now);
    if (remainingMs <= 0) {
      return {
        status: "result",
        result: screenshotReadbackTimeoutResult(mapped, summary, lastFailureDiagnostic),
      };
    }

    await sleep(Math.min(pollIntervalMs, remainingMs));
  }
}

function resourceMetadataMatchesSummary(
  metadata: UnityAgentKitArtifactMetadata,
  summary: ScreenshotCaptureSummary,
  contentBytes: number,
): boolean {
  return metadata.id === summary.artifactId &&
    metadata.type === "screenshot" &&
    metadata.uri === summary.uri &&
    metadata.relativePath === summary.relativePath &&
    metadata.hostId === summary.hostId &&
    metadata.hostEpoch === summary.hostEpoch &&
    metadata.producerTool === "unity_screenshot" &&
    metadata.producerAction === "capture_game_view" &&
    metadata.sizeBytes === contentBytes &&
    summary.sizeBytes === contentBytes;
}

function screenshotFailure(
  mapped: UnityAgentKitPublicResult,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "validation",
    severity: "error",
    code,
    message,
    ...(details === undefined ? {} : { details }),
    attribution: {
      operation: screenshotCaptureOperation,
      requestId: mapped.requestId,
    },
  };

  return definePublicResult({
    status: "failed",
    tool: "unity_screenshot",
    action: "capture_game_view",
    operation: screenshotCaptureOperation,
    requestId: mapped.requestId,
    hostId: mapped.hostId,
    hostEpoch: mapped.hostEpoch,
    summary: message,
    code,
    message,
    data: mapped.data,
    diagnostics: [...mapped.diagnostics, diagnostic],
    evidence: { completion: "artifact_validation_failed" },
    startedAt: mapped.startedAt,
    completedAt: mapped.completedAt,
    durationMs: mapped.durationMs,
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Inspect diagnostics before retrying the screenshot workflow.",
    },
  });
}

function screenshotReadbackTimeoutResult(
  mapped: UnityAgentKitPublicResult,
  summary: ScreenshotCaptureSummary,
  lastFailureDiagnostic: UnityAgentKitDiagnostic | undefined,
): UnityAgentKitPublicResult {
  const timeout = timeoutContinuationResult({
    tool: "unity_screenshot",
    action: "capture_game_view",
    requestId: mapped.requestId,
    summary: "Timed out waiting for screenshot Resource readback.",
    mayStillBeRunning: true,
    safeToRetry: false,
    nextStep: { kind: "read_resource", tool: "unity_screenshot", action: "capture_game_view", resourceUri: summary.uri, reason: "Read the screenshot Resource before retrying capture." },
  });

  return definePublicResult({
    ...timeout,
    operation: screenshotCaptureOperation,
    hostId: mapped.hostId,
    hostEpoch: mapped.hostEpoch,
    data: summary,
    diagnostics: [
      ...mapped.diagnostics,
      ...(lastFailureDiagnostic === undefined ? [] : [lastFailureDiagnostic]),
      ...timeout.diagnostics,
    ],
    evidence: { completion: "artifact_readback_timeout", artifactId: summary.artifactId, resourceUri: summary.uri },
    startedAt: mapped.startedAt,
    completedAt: mapped.completedAt,
    durationMs: mapped.durationMs,
  });
}

function isSafeLabel(label: string): boolean {
  return !label.includes("/") &&
    !label.includes("\\") &&
    !label.includes(":") &&
    !label.includes("\0") &&
    !label.includes("..");
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number, now: () => number): number {
  return Math.max(0, timeoutMs - Math.max(0, now() - startedAt));
}

function positiveFiniteOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
