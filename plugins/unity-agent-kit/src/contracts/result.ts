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

export type UnityAgentKitResourceType = "screenshot" | "test_report" | "console_snapshot";
export type UnityAgentKitValidationStatus = "valid" | "invalid" | "uncertain";

interface UnityAgentKitResourceReferenceBase {
  uri: string;
  validationStatus: UnityAgentKitValidationStatus;
  summary: string;
}

export type UnityAgentKitResourceReference =
  | (UnityAgentKitResourceReferenceBase & {
      type: "test_report";
      reportId: string;
      artifactId?: never;
    })
  | (UnityAgentKitResourceReferenceBase & {
      type: "screenshot" | "console_snapshot";
      artifactId: string;
      reportId?: never;
    });

export type UnityAgentKitJobState =
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout"
  | "lost"
  | "unknown";

export type UnityAgentKitJobContinuity = "current" | "recovered" | "lost" | "unknown";

export interface UnityAgentKitJobReference {
  jobId: string;
  tool: string;
  action: string;
  state: UnityAgentKitJobState;
  createdAt: string;
  updatedAt?: string;
  hostId?: string;
  hostEpoch?: number;
  reportId?: string;
  artifactIds?: string[];
  lastKnownContinuity: UnityAgentKitJobContinuity;
  diagnostics?: UnityAgentKitDiagnostic[];
}

export type UnityAgentKitNextStepKind =
  | "read_resource"
  | "check_job_status"
  | "get_job_result"
  | "read_state"
  | "rerun_with_confirmation"
  | "inspect_diagnostics";

export interface UnityAgentKitNextStep {
  kind: UnityAgentKitNextStepKind;
  tool?: string;
  action?: string;
  resourceUri?: string;
  jobId?: string;
  reason: string;
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

const resourceTypes = ["screenshot", "test_report", "console_snapshot"] as const;
const validationStatuses = ["valid", "invalid", "uncertain"] as const;
const jobStates = ["accepted", "running", "completed", "failed", "cancelled", "timeout", "lost", "unknown"] as const;
const jobContinuities = ["current", "recovered", "lost", "unknown"] as const;
const nextStepKinds = ["read_resource", "check_job_status", "get_job_result", "read_state", "rerun_with_confirmation", "inspect_diagnostics"] as const;

function isResourceReference(value: unknown): value is UnityAgentKitResourceReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const resource = value as Record<string, unknown>;
  if (!(
    typeof resource.uri === "string" &&
    resource.uri.length > 0 &&
    typeof resource.type === "string" &&
    resourceTypes.includes(resource.type as UnityAgentKitResourceType) &&
    typeof resource.validationStatus === "string" &&
    validationStatuses.includes(resource.validationStatus as UnityAgentKitValidationStatus) &&
    typeof resource.summary === "string" &&
    resource.summary.length > 0
  )) {
    return false;
  }

  if (resource.type === "test_report") {
    return typeof resource.reportId === "string" && resource.reportId.length > 0 && resource.artifactId === undefined;
  }

  return typeof resource.artifactId === "string" && resource.artifactId.length > 0 && resource.reportId === undefined;
}

function isJobReference(value: unknown): value is UnityAgentKitJobReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const job = value as Record<string, unknown>;
  return (
    typeof job.jobId === "string" &&
    job.jobId.length > 0 &&
    typeof job.tool === "string" &&
    job.tool.length > 0 &&
    typeof job.action === "string" &&
    job.action.length > 0 &&
    typeof job.state === "string" &&
    jobStates.includes(job.state as UnityAgentKitJobState) &&
    typeof job.createdAt === "string" &&
    job.createdAt.length > 0 &&
    (job.updatedAt === undefined || typeof job.updatedAt === "string") &&
    (job.hostId === undefined || typeof job.hostId === "string") &&
    (job.hostEpoch === undefined || (typeof job.hostEpoch === "number" && Number.isInteger(job.hostEpoch))) &&
    (job.reportId === undefined || typeof job.reportId === "string") &&
    (job.artifactIds === undefined || (Array.isArray(job.artifactIds) && job.artifactIds.every((id) => typeof id === "string" && id.length > 0))) &&
    typeof job.lastKnownContinuity === "string" &&
    jobContinuities.includes(job.lastKnownContinuity as UnityAgentKitJobContinuity) &&
    (job.diagnostics === undefined || (Array.isArray(job.diagnostics) && job.diagnostics.every(isDiagnostic)))
  );
}

function isNextStep(value: unknown): value is UnityAgentKitNextStep {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const nextStep = value as Record<string, unknown>;
  return (
    typeof nextStep.kind === "string" &&
    nextStepKinds.includes(nextStep.kind as UnityAgentKitNextStepKind) &&
    (nextStep.tool === undefined || typeof nextStep.tool === "string") &&
    (nextStep.action === undefined || typeof nextStep.action === "string") &&
    (nextStep.resourceUri === undefined || typeof nextStep.resourceUri === "string") &&
    (nextStep.jobId === undefined || typeof nextStep.jobId === "string") &&
    typeof nextStep.reason === "string" &&
    nextStep.reason.length > 0
  );
}

export function definePublicResult(result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  if (!isPublicResultStatus(result.status)) {
    throw new Error(`Unknown public result status: ${String(result.status)}`);
  }

  if (!Array.isArray(result.diagnostics) || !result.diagnostics.every(isDiagnostic)) {
    throw new Error("Public result diagnostics must use the UnityAgentKitDiagnostic shape.");
  }

  if (result.resource !== undefined && !isResourceReference(result.resource)) {
    throw new Error("Public result resource must use the UnityAgentKitResourceReference shape.");
  }

  if (result.resources !== undefined && (!Array.isArray(result.resources) || !result.resources.every(isResourceReference))) {
    throw new Error("Public result resources must use the UnityAgentKitResourceReference shape.");
  }

  if (result.job !== undefined && !isJobReference(result.job)) {
    throw new Error("Public result job must use the UnityAgentKitJobReference shape.");
  }

  if (result.nextStep !== undefined && !isNextStep(result.nextStep)) {
    throw new Error("Public result nextStep must use the UnityAgentKitNextStep shape.");
  }

  return result;
}
