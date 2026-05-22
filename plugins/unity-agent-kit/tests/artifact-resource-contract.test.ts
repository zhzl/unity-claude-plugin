import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";

const emptyDiagnostics: UnityAgentKitDiagnostic[] = [];

function baseResult(overrides: Partial<UnityAgentKitPublicResult> = {}): UnityAgentKitPublicResult {
  return {
    status: "succeeded",
    tool: "unity_test",
    action: "get_result",
    summary: "Base result.",
    diagnostics: [],
    ...overrides,
  };
}

test("publicResultAcceptsPhase5BResourceJobAndNextStepShapes", () => {
  const result = definePublicResult(baseResult({
    status: "timeout",
    summary: "Test job may still be running.",
    resource: {
      uri: "unity://screenshots/shot-1",
      type: "screenshot",
      artifactId: "shot-1",
      validationStatus: "valid",
      summary: "Synthetic screenshot artifact.",
    },
    resources: [
      {
        uri: "unity://console-snapshots/console-1",
        type: "console_snapshot",
        artifactId: "console-1",
        validationStatus: "uncertain",
        summary: "Console snapshot reference.",
      },
    ],
    job: {
      jobId: "job-1",
      tool: "unity_test",
      action: "run_and_collect",
      state: "running",
      createdAt: "2026-05-22T10:00:00.000Z",
      updatedAt: "2026-05-22T10:00:01.000Z",
      hostId: "host-a",
      hostEpoch: 3,
      reportId: "report-1",
      artifactIds: ["shot-1"],
      lastKnownContinuity: "current",
      diagnostics: emptyDiagnostics,
    },
    nextStep: {
      kind: "check_job_status",
      tool: "unity_test",
      action: "get_status",
      jobId: "job-1",
      reason: "The job was accepted and may still be running.",
    },
    safeToRetry: false,
    mayStillBeRunning: true,
  }));

  assert.equal(result.resource?.uri, "unity://screenshots/shot-1");
  assert.equal(result.resources?.[0]?.type, "console_snapshot");
  assert.equal(result.job?.state, "running");
  assert.equal(result.nextStep?.kind, "check_job_status");
});

test("publicResultRejectsMalformedResourceJobAndNextStepShapes", () => {
  assert.throws(
    () => definePublicResult(baseResult({
      resource: {
        uri: "unity://screenshots/shot-1",
        type: "test_report",
        artifactId: "shot-1",
        validationStatus: "valid",
        summary: "Mismatched resource shape.",
      },
    })),
    /resource/i,
  );

  assert.throws(
    () => definePublicResult(baseResult({
      job: {
        jobId: "job-1",
        tool: "unity_test",
        action: "run_and_collect",
        state: "done",
        createdAt: "2026-05-22T10:00:00.000Z",
        lastKnownContinuity: "current",
        diagnostics: [{ source: "workflow", severity: "info", message: "done" }],
      },
    })),
    /job/i,
  );

  assert.throws(
    () => definePublicResult(baseResult({
      nextStep: {
        kind: "retry_later",
        reason: "Invalid kind.",
      } as never,
    })),
    /nextStep/i,
  );
});
