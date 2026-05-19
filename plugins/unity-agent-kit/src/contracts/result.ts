export const publicResultStatuses = [
  "succeeded",
  "failed",
  "uncertain",
  "cancelled",
  "timeout",
  "lost",
  "rejected",
] as const;

export type PublicResultStatus = (typeof publicResultStatuses)[number];

export function isPublicResultStatus(value: unknown): value is PublicResultStatus {
  return typeof value === "string" && publicResultStatuses.includes(value as PublicResultStatus);
}

export type UnityAgentKitDiagnosticSeverity = "info" | "warning" | "error";

export interface UnityAgentKitDiagnostic {
  source: string;
  severity: UnityAgentKitDiagnosticSeverity;
  code?: string;
  message: string;
  details?: unknown;
  attribution?: unknown;
}

export interface UnityAgentKitResourceReference {
  [key: string]: unknown;
}

export interface UnityAgentKitJobReference {
  [key: string]: unknown;
}

export interface UnityAgentKitNextStep {
  [key: string]: unknown;
}

export interface UnityAgentKitPublicResult {
  status: PublicResultStatus;
  tool: string;
  action: string;
  summary: string;
  code?: string;
  message?: string;
  operation?: string;
  requestId?: string;
  hostId?: string;
  hostEpoch?: number;
  data?: unknown;
  diagnostics: UnityAgentKitDiagnostic[];
  evidence?: unknown;
  resource?: UnityAgentKitResourceReference;
  resources?: UnityAgentKitResourceReference[];
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  job?: UnityAgentKitJobReference;
  nextStep?: UnityAgentKitNextStep;
  safeToRetry?: boolean;
  mayStillBeRunning?: boolean;
  [key: string]: unknown;
}

export interface PublicResultStatusSemantic {
  isError: boolean;
  description: string;
}

export const publicResultStatusSemantics = {
  succeeded: {
    isError: false,
    description: "Operation has complete success evidence for the requested action.",
  },
  failed: {
    isError: true,
    description: "Operation has clear failure evidence.",
  },
  uncertain: {
    isError: true,
    description: "Available evidence cannot prove success or failure.",
  },
  cancelled: {
    isError: true,
    description: "Operation was cancelled before producing a successful result.",
  },
  timeout: {
    isError: true,
    description: "Timeout does not prove the Unity operation failed.",
  },
  lost: {
    isError: true,
    description: "Host continuity was lost before the result could be trusted.",
  },
  rejected: {
    isError: true,
    description: "Request was rejected before execution.",
  },
} as const satisfies Record<PublicResultStatus, PublicResultStatusSemantic>;

export function publicResultStatusToIsError(status: PublicResultStatus): boolean {
  return publicResultStatusSemantics[status].isError;
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  const hasValidCode = diagnostic.code === undefined || typeof diagnostic.code === "string";

  return (
    typeof diagnostic.source === "string" &&
    diagnostic.source.length > 0 &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    typeof diagnostic.message === "string" &&
    diagnostic.message.length > 0 &&
    hasValidCode
  );
}

export function definePublicResult(result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  if (!isPublicResultStatus(result.status)) {
    throw new Error(`Unknown public result status: ${String(result.status)}`);
  }

  if (!Array.isArray(result.diagnostics) || !result.diagnostics.every(isDiagnostic)) {
    throw new Error("Public result diagnostics must use the UnityAgentKitDiagnostic shape.");
  }

  return result;
}
