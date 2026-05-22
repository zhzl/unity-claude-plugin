import test from "node:test";
import assert from "node:assert/strict";
import type { UnityAgentKitResourceReadResult } from "../src/artifacts/types.ts";
import {
  timeoutContinuationResult,
  timeoutPolicies,
} from "../src/workflows/timeout.ts";
import {
  artifactCompleteResult,
  jobReportRequiredResult,
  requestAcceptedResult,
  resourceReadFailureResult,
  stateSettledResult,
  uncertainEvidenceResult,
} from "../src/workflows/completion.ts";

test("timeoutPoliciesEncodeCategoryCapsAndRetryRules", () => {
  assert.equal(timeoutPolicies.lightweightRead.maxCapMs, 10_000);
  assert.equal(timeoutPolicies.readiness.maxCapMs, 60_000);
  assert.equal(timeoutPolicies.screenshotArtifact.maxCapMs, 60_000);
  assert.equal(timeoutPolicies.resourceReadback.maxCapMs, 30_000);
  assert.equal(timeoutPolicies.test.safeToRetry, "false");
  assert.ok(timeoutPolicies.test.nextStepKinds.includes("check_job_status"));
  assert.ok(timeoutPolicies.resourceReadback.nextStepKinds.includes("read_resource"));
});

test("timeoutContinuationResultIncludesBoundedNextStepAndDoesNotClaimFailure", () => {
  const result = timeoutContinuationResult({
    tool: "unity_test",
    action: "run_and_collect",
    requestId: "req-test-timeout",
    summary: "Test run timed out before report collection.",
    mayStillBeRunning: true,
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-1",
      reason: "The test job may still be running after the workflow timeout.",
    },
    job: {
      jobId: "job-1",
      tool: "unity_test",
      action: "run_and_collect",
      state: "timeout",
      createdAt: "2026-05-22T10:00:00.000Z",
      lastKnownContinuity: "current",
    },
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.safeToRetry, false);
  assert.equal(result.mayStillBeRunning, true);
  assert.equal(result.nextStep?.kind, "check_job_status");
  assert.equal(result.job?.jobId, "job-1");
  assert.equal(result.diagnostics[0].code, "workflow.timeout");
});

test("completionHelpersSeparateAcceptedSettledArtifactAndVerifiedSuccess", () => {
  const accepted = requestAcceptedResult({
    tool: "unity_test",
    action: "start",
    requestId: "req-start",
    jobId: "job-1",
    summary: "Test request accepted.",
  });
  assert.equal(accepted.status, "succeeded");
  assert.equal(accepted.job?.state, "accepted");
  assert.match(accepted.summary, /accepted/i);
  assert.match(accepted.summary, /not completed/i);

  const settled = stateSettledResult({
    tool: "unity_compile",
    action: "wait_for_idle",
    summary: "Unity compile state is idle.",
  });
  assert.equal(settled.status, "succeeded");
  assert.match(settled.summary, /state settled/i);
  assert.match(settled.summary, /not verified/i);

  const uncertain = uncertainEvidenceResult({
    tool: "unity_console",
    action: "snapshot",
    summary: "Console snapshot evidence is incomplete.",
    code: "console.snapshot_uncertain",
  });
  assert.equal(uncertain.status, "uncertain");
  assert.equal(uncertain.diagnostics[0].code, "console.snapshot_uncertain");
});

test("artifactCompleteRequiresSuccessfulReadbackAndJobReportRequiresReadableReport", () => {
  const readback: UnityAgentKitResourceReadResult = {
    ok: true,
    resource: {
      uri: "unity://screenshots/shot-1",
      type: "screenshot",
      artifactId: "shot-1",
      validationStatus: "valid",
      summary: "Synthetic screenshot resource.",
    },
    metadata: {
      schemaVersion: 1,
      id: "shot-1",
      type: "screenshot",
      uri: "unity://screenshots/shot-1",
      relativePath: "screenshots/shot-1.txt",
      createdAt: "2026-05-22T10:00:00.000Z",
      validationStatus: "valid",
      producerTool: "unity_screenshot",
      producerAction: "capture_game_view",
      sizeBytes: 10,
      diagnostics: [],
    },
    filePath: "/tmp/artifacts/screenshots/shot-1.txt",
    contentBytes: new Uint8Array([1]),
  };

  const artifact = artifactCompleteResult({
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Screenshot artifact is complete.",
    readback,
  });
  assert.equal(artifact.status, "succeeded");
  assert.equal(artifact.resource?.uri, "unity://screenshots/shot-1");
  assert.deepEqual(artifact.evidence, { completion: "artifact_complete", resourceUri: "unity://screenshots/shot-1" });

  const missingReport = jobReportRequiredResult({
    tool: "unity_test",
    action: "run_and_verify",
    jobId: "job-1",
    summary: "Test job completed but report is not readable.",
  });
  assert.equal(missingReport.status, "uncertain");
  assert.equal(missingReport.nextStep?.kind, "get_job_result");

  const failedReadback = resourceReadFailureResult({
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Screenshot resource cannot be read.",
    readback: {
      ok: false,
      reason: "file_missing",
      diagnostic: {
        source: "resource-readback",
        severity: "error",
        code: "resource.file_missing",
        message: "Resource file is missing.",
      },
    },
  });
  assert.equal(failedReadback.status, "failed");
  assert.equal(failedReadback.diagnostics[0].code, "resource.file_missing");
});
