import type { UnityAgentKitResourceReadResult } from "../artifacts/types.ts";
import {
  definePublicResult,
  type UnityAgentKitJobReference,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";

interface BaseCompletionInput {
  tool: string;
  action: string;
  requestId?: string;
  summary: string;
}

export function requestAcceptedResult(input: BaseCompletionInput & { jobId: string }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: `${input.summary} Request accepted, not completed.`,
    diagnostics: [],
    job: {
      jobId: input.jobId,
      tool: input.tool,
      action: input.action,
      state: "accepted",
      createdAt: new Date().toISOString(),
      lastKnownContinuity: "current",
    },
  });
}

export function stateSettledResult(input: BaseCompletionInput): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: `${input.summary} State settled, not verified business success.`,
    diagnostics: [],
    evidence: { completion: "state_settled" },
  });
}

export function artifactCompleteResult(input: BaseCompletionInput & { readback: UnityAgentKitResourceReadResult }): UnityAgentKitPublicResult {
  if (!input.readback.ok) {
    return resourceReadFailureResult({ ...input, readback: input.readback });
  }

  return definePublicResult({
    status: "succeeded",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [],
    resource: input.readback.resource,
    evidence: {
      completion: "artifact_complete",
      resourceUri: input.readback.resource.uri,
    },
  });
}

export function jobReportRequiredResult(input: BaseCompletionInput & { jobId: string; job?: UnityAgentKitJobReference }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: "job.report_required",
        message: "A completed job requires a readable report before public success can be claimed.",
      },
    ],
    job: input.job ?? {
      jobId: input.jobId,
      tool: input.tool,
      action: input.action,
      state: "completed",
      createdAt: new Date().toISOString(),
      lastKnownContinuity: "current",
    },
    nextStep: {
      kind: "get_job_result",
      tool: input.tool,
      action: "get_result",
      jobId: input.jobId,
      reason: "Read the job report before treating the job as verified success.",
    },
  });
}

export function uncertainEvidenceResult(input: BaseCompletionInput & { code: string }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "uncertain",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: input.code,
        message: input.summary,
      },
    ],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: "Available evidence cannot prove success or failure.",
    },
  });
}

export function resourceReadFailureResult(input: BaseCompletionInput & { readback: Extract<UnityAgentKitResourceReadResult, { ok: false }> }): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [input.readback.diagnostic],
    nextStep: {
      kind: "inspect_diagnostics",
      reason: `Resource readback failed with ${input.readback.reason}.`,
    },
  });
}
