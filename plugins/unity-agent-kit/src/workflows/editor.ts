import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import {
  editorStatusOperation,
  editorStatusResultFromHostResult,
  isEditorReady,
  parseEditorStatusData,
} from "../diagnostics/editor.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import { timeoutContinuationResult } from "./timeout.ts";
import { executeWithRebindAwareness } from "./rebind.ts";

export interface EditorWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface EditorActionOptions {
  requestId?: string;
}

export interface WaitForEditorReadyOptions extends EditorActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getEditorStatus(
  workflow: EditorWorkflowOptions,
  action: EditorActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = action.requestId ?? `editor-status-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: {
      operation: editorStatusOperation,
      requestId,
    },
  });

  return editorStatusResultFromHostResult(hostResult.result, "get_status", workflow.projectRoot);
}

export async function waitForEditorReady(
  workflow: EditorWorkflowOptions,
  options: WaitForEditorReadyOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const baseRequestId = options.requestId ?? `editor-wait-ready-${Date.now()}`;
  const deadline = now() + timeoutMs;
  const carriedDiagnostics: UnityAgentKitDiagnostic[] = [];
  let attempt = 0;

  while (true) {
    attempt += 1;
    const statusResult = await getEditorStatus(workflow, { requestId: `${baseRequestId}-${attempt}` });
    collectReboundDiagnostics(statusResult.diagnostics, carriedDiagnostics);
    if (statusResult.status !== "succeeded") {
      return withCarriedDiagnostics(remapEditorAction(statusResult, "wait_ready"), carriedDiagnostics);
    }

    const snapshot = parseEditorStatusData(statusResult.data);
    if (snapshot === null) {
      return withCarriedDiagnostics(
        editorStatusResultFromHostResult(statusResult, "wait_ready", workflow.projectRoot),
        carriedDiagnostics,
      );
    }

    if (isEditorReady(snapshot)) {
      const readyResult = definePublicResult({
        ...statusResult,
        action: "wait_ready",
        summary: "Editor is ready.",
        evidence: {
          completion: "state_settled",
          ready: true,
          playModeMutation: "none",
        },
      });
      return withCarriedDiagnostics(readyResult, carriedDiagnostics);
    }

    const statusReadAt = now();
    if (statusReadAt >= deadline) {
      const timeoutResult = timeoutContinuationResult({
        tool: "unity_editor",
        action: "wait_ready",
        requestId: baseRequestId,
        summary: "Timed out waiting for Unity Editor to become ready.",
        mayStillBeRunning: false,
        safeToRetry: true,
        nextStep: {
          kind: "read_state",
          tool: "unity_editor",
          action: "get_status",
          reason: "Read the latest Editor status before retrying readiness wait.",
        },
      });
      return withCarriedDiagnostics(timeoutResult, carriedDiagnostics);
    }

    await sleep(Math.min(pollIntervalMs, deadline - statusReadAt));

    if (now() >= deadline) {
      const timeoutResult = timeoutContinuationResult({
        tool: "unity_editor",
        action: "wait_ready",
        requestId: baseRequestId,
        summary: "Timed out waiting for Unity Editor to become ready.",
        mayStillBeRunning: false,
        safeToRetry: true,
        nextStep: {
          kind: "read_state",
          tool: "unity_editor",
          action: "get_status",
          reason: "Read the latest Editor status before retrying readiness wait.",
        },
      });
      return withCarriedDiagnostics(timeoutResult, carriedDiagnostics);
    }
  }
}

function remapEditorAction(
  result: UnityAgentKitPublicResult,
  action: "get_status" | "wait_ready",
): UnityAgentKitPublicResult {
  return definePublicResult({
    ...result,
    tool: "unity_editor",
    action,
    summary: result.summary || "Editor readiness could not be established.",
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
