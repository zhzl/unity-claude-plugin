import { definePublicResult, type UnityAgentKitJobReference, type UnityAgentKitNextStep, type UnityAgentKitPublicResult } from "../contracts/result.ts";

export const timeoutPolicies = {
  lightweightRead: {
    defaultRangeMs: [1_000, 5_000],
    maxCapMs: 10_000,
    safeToRetry: "true_if_read_only",
    nextStepKinds: ["read_state", "inspect_diagnostics"],
  },
  readiness: {
    defaultRangeMs: [10_000, 30_000],
    maxCapMs: 60_000,
    safeToRetry: "true_if_no_side_effect",
    nextStepKinds: ["read_state"],
  },
  compile: {
    defaultRangeMs: [30_000, 120_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false_unless_no_op_proof",
    nextStepKinds: ["read_state", "inspect_diagnostics"],
  },
  test: {
    defaultRangeMs: [60_000, 300_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false",
    nextStepKinds: ["check_job_status", "get_job_result"],
  },
  playmodeTransition: {
    defaultRangeMs: [10_000, 60_000],
    maxCapMs: "explicit_long_wait",
    safeToRetry: "false_unless_no_op_proof",
    nextStepKinds: ["read_state"],
  },
  screenshotArtifact: {
    defaultRangeMs: [10_000, 30_000],
    maxCapMs: 60_000,
    safeToRetry: "false_unless_no_artifact_write_occurred",
    nextStepKinds: ["read_resource", "inspect_diagnostics"],
  },
  resourceReadback: {
    defaultRangeMs: [1_000, 10_000],
    maxCapMs: 30_000,
    safeToRetry: "true_if_read_only",
    nextStepKinds: ["read_resource", "inspect_diagnostics"],
  },
} as const;

export interface TimeoutContinuationInput {
  tool: string;
  action: string;
  requestId?: string;
  summary: string;
  mayStillBeRunning: boolean;
  safeToRetry?: boolean;
  nextStep: UnityAgentKitNextStep;
  job?: UnityAgentKitJobReference;
}

export function timeoutContinuationResult(input: TimeoutContinuationInput): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "timeout",
    tool: input.tool,
    action: input.action,
    requestId: input.requestId,
    summary: input.summary,
    diagnostics: [
      {
        source: "workflow",
        severity: "error",
        code: "workflow.timeout",
        message: input.summary,
        details: {
          timeoutLayer: "workflow",
          mayStillBeRunning: input.mayStillBeRunning,
          safeToRetry: input.safeToRetry ?? false,
          nextStep: input.nextStep.kind,
        },
      },
    ],
    mayStillBeRunning: input.mayStillBeRunning,
    safeToRetry: input.safeToRetry ?? false,
    nextStep: input.nextStep,
    ...(input.job === undefined ? {} : { job: input.job }),
  });
}
