import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

export const editorStatusOperation = "editor.status.get" as const;

export interface EditorStatusSnapshot {
  projectRoot: string;
  unityVersion: string;
  isCompiling: boolean;
  isUpdating: boolean;
  isPlaying: boolean;
  isPlayingOrWillChangePlaymode: boolean;
  isPlayModeChanging: boolean;
  isReady: boolean;
  capturedMainThreadId?: number;
  executionThreadId?: number;
}

export function parseEditorStatusData(data: unknown): EditorStatusSnapshot | null {
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
    typeof value.isPlaying === "boolean" &&
    typeof value.isPlayingOrWillChangePlaymode === "boolean" &&
    typeof value.isPlayModeChanging === "boolean" &&
    typeof value.isReady === "boolean" &&
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
    isPlaying: value.isPlaying,
    isPlayingOrWillChangePlaymode: value.isPlayingOrWillChangePlaymode,
    isPlayModeChanging: value.isPlayModeChanging,
    isReady: value.isReady,
    ...(value.capturedMainThreadId === undefined ? {} : { capturedMainThreadId: value.capturedMainThreadId }),
    ...(value.executionThreadId === undefined ? {} : { executionThreadId: value.executionThreadId }),
  };
}

export function isEditorReady(snapshot: EditorStatusSnapshot): boolean {
  return !snapshot.isCompiling && !snapshot.isUpdating && !snapshot.isPlayModeChanging;
}

export function editorStatusResultFromHostResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_status" | "wait_ready",
  expectedProjectRoot: string,
): UnityAgentKitPublicResult {
  if (hostResult.status !== "succeeded") {
    return definePublicResult({
      ...hostResult,
      tool: "unity_editor",
      action,
      summary: hostResult.summary || "Editor status could not be read.",
    });
  }

  const snapshot = parseEditorStatusData(hostResult.data);
  if (snapshot === null) {
    return invalidSnapshotResult(
      hostResult,
      action,
      {
        source: "workflow",
        severity: "error",
        code: "editor.status_invalid_shape",
        message: "Editor status operation returned an invalid data shape.",
        attribution: {
          operation: editorStatusOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics for the invalid editor status payload before retrying.",
    );
  }

  if (normalizeProjectRoot(snapshot.projectRoot) !== normalizeProjectRoot(expectedProjectRoot)) {
    return invalidSnapshotResult(
      hostResult,
      action,
      {
        source: "validation",
        severity: "error",
        code: "editor.project_root_mismatch",
        message: "Editor status projectRoot does not match the expected Unity project root.",
        details: {
          expectedProjectRoot,
          actualProjectRoot: snapshot.projectRoot,
        },
        attribution: {
          operation: editorStatusOperation,
          requestId: hostResult.requestId,
        },
      },
      "Inspect diagnostics before retrying because the Editor status came from a different project root.",
    );
  }

  return definePublicResult({
    status: "succeeded",
    tool: "unity_editor",
    action,
    operation: editorStatusOperation,
    requestId: hostResult.requestId,
    hostId: hostResult.hostId,
    hostEpoch: hostResult.hostEpoch,
    summary: snapshot.isReady ? "Editor is ready." : "Editor status read; Editor is not ready.",
    data: snapshot,
    diagnostics: hostResult.diagnostics,
    evidence: {
      completion: "state_snapshot",
      ready: isEditorReady(snapshot),
    },
    startedAt: hostResult.startedAt,
    completedAt: hostResult.completedAt,
    durationMs: hostResult.durationMs,
  });
}

function invalidSnapshotResult(
  hostResult: UnityAgentKitPublicResult,
  action: "get_status" | "wait_ready",
  diagnostic: UnityAgentKitDiagnostic,
  reason: string,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_editor",
    action,
    operation: editorStatusOperation,
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

function isOptionalInteger(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value));
}
