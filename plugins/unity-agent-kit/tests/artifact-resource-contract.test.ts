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
import {
  artifactRootForProject,
  metadataRelativePathForParsedResource,
  resolveArtifactRelativePath,
} from "../src/artifacts/paths.ts";
import { formatUnityResourceUri, parseUnityResourceUri } from "../src/resources/uri.ts";
import { readUnityResource } from "../src/resources/readback.ts";

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

test("resourceUriParsingAcceptsOnlyPhase5BSupportedTypes", () => {
  assert.deepEqual(parseUnityResourceUri("unity://screenshots/shot-1"), {
    ok: true,
    resource: {
      uri: "unity://screenshots/shot-1",
      collection: "screenshots",
      type: "screenshot",
      id: "shot-1",
      artifactId: "shot-1",
    },
  });
  assert.deepEqual(parseUnityResourceUri("unity://test-reports/report-1"), {
    ok: true,
    resource: {
      uri: "unity://test-reports/report-1",
      collection: "test-reports",
      type: "test_report",
      id: "report-1",
      reportId: "report-1",
    },
  });
  assert.deepEqual(parseUnityResourceUri("unity://console-snapshots/console-1"), {
    ok: true,
    resource: {
      uri: "unity://console-snapshots/console-1",
      collection: "console-snapshots",
      type: "console_snapshot",
      id: "console-1",
      artifactId: "console-1",
    },
  });

  assert.equal(formatUnityResourceUri("screenshot", "shot-2"), "unity://screenshots/shot-2");
  assert.equal(formatUnityResourceUri("test_report", "report-2"), "unity://test-reports/report-2");
  assert.equal(formatUnityResourceUri("console_snapshot", "console-2"), "unity://console-snapshots/console-2");
});

test("resourceUriParsingRejectsMalformedUnsupportedAndPathLikeIds", () => {
  for (const uri of [
    "unity://validation-reports/report-1",
    "unity://screenshots/",
    "unity://screenshots/../secret",
    "unity://screenshots/%2e%2e%2fsecret",
    "unity://screenshots/C:%5Csecret",
    "unity://screenshots/shot/extra",
    "file:///tmp/shot-1",
  ]) {
    const parsed = parseUnityResourceUri(uri);
    assert.equal(parsed.ok, false, uri);
  }
});

test("artifactPathsUseDeterministicMetadataLayoutAndRejectTraversal", () => {
  const projectRoot = path.join(os.tmpdir(), "phase5b-project");
  const artifactRoot = artifactRootForProject(projectRoot);
  assert.equal(
    artifactRoot,
    path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts"),
  );

  const screenshot = parseUnityResourceUri("unity://screenshots/shot-1");
  assert.equal(screenshot.ok, true);
  if (screenshot.ok) {
    assert.equal(metadataRelativePathForParsedResource(screenshot.resource), "metadata/screenshots/shot-1.json");
  }

  const report = parseUnityResourceUri("unity://test-reports/report-1");
  assert.equal(report.ok, true);
  if (report.ok) {
    assert.equal(metadataRelativePathForParsedResource(report.resource), "metadata/test-reports/report-1.json");
  }

  assert.equal(resolveArtifactRelativePath(artifactRoot, "screenshots/shot-1.txt").ok, true);
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "../outside.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "screenshots/%2e%2e/secret.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "C:/secret.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
  assert.deepEqual(resolveArtifactRelativePath(artifactRoot, "screenshots\\shot-1.txt"), {
    ok: false,
    reason: "path_outside_artifact_root",
  });
});

async function withArtifactProject(testBody: (projectRoot: string, artifactRoot: string) => Promise<void>): Promise<void> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "unity-agent-kit-phase5b-"));
  const artifactRoot = artifactRootForProject(projectRoot);
  try {
    await testBody(projectRoot, artifactRoot);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function writeArtifactFixture(
  artifactRoot: string,
  metadataRelativePath: string,
  metadata: Record<string, unknown>,
  payloadRelativePath: string,
  payload: string,
): Promise<void> {
  const payloadPath = path.join(artifactRoot, ...payloadRelativePath.split("/"));
  const metadataPath = path.join(artifactRoot, ...metadataRelativePath.split("/"));
  await writeFile(payloadPath, payload, { encoding: "utf8", flag: "w" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await import("node:fs/promises").then(async ({ mkdir }) => {
      await mkdir(path.dirname(payloadPath), { recursive: true });
      await writeFile(payloadPath, payload, "utf8");
    });
  });
  await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
  await writeJsonFile(metadataPath, metadata);
}

function screenshotMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "shot-1",
    type: "screenshot",
    uri: "unity://screenshots/shot-1",
    relativePath: "screenshots/shot-1.txt",
    createdAt: "2026-05-22T10:00:00.000Z",
    validationStatus: "valid",
    hostId: "host-a",
    hostEpoch: 3,
    producerTool: "unity_screenshot",
    producerAction: "capture_game_view",
    sizeBytes: 12,
    diagnostics: [],
    ...overrides,
  };
}

function reportMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "report-1",
    type: "test_report",
    uri: "unity://test-reports/report-1",
    reportLocator: {
      kind: "artifact_relative_path",
      relativePath: "test-reports/report-1.txt",
    },
    createdAt: "2026-05-22T10:00:00.000Z",
    validationStatus: "valid",
    producerTool: "unity_test",
    producerAction: "run_and_collect",
    sizeBytes: 13,
    diagnostics: [],
    ...overrides,
  };
}

test("resourceReadbackSucceedsForExistingMetadataAndReadableFileWithoutLiveHost", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    await writeArtifactFixture(
      artifactRoot,
      "metadata/screenshots/shot-1.json",
      screenshotMetadata(),
      "screenshots/shot-1.txt",
      "synthetic image",
    );

    const result = await readUnityResource(projectRoot, "unity://screenshots/shot-1");

    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) {
      return;
    }
    assert.equal(result.resource.uri, "unity://screenshots/shot-1");
    assert.equal(result.resource.type, "screenshot");
    assert.equal(result.resource.artifactId, "shot-1");
    assert.equal(result.resource.validationStatus, "valid");
    assert.equal(Buffer.from(result.contentBytes).toString("utf8"), "synthetic image");
  });
});

test("resourceReadbackUsesReportLocatorOnlyUnderTestReports", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    await writeArtifactFixture(
      artifactRoot,
      "metadata/test-reports/report-1.json",
      reportMetadata(),
      "test-reports/report-1.txt",
      "synthetic report",
    );

    const result = await readUnityResource(projectRoot, "unity://test-reports/report-1");

    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) {
      return;
    }
    assert.equal(result.resource.type, "test_report");
    assert.equal(result.resource.reportId, "report-1");
    assert.equal(Buffer.from(result.contentBytes).toString("utf8"), "synthetic report");
  });
});

test("resourceReadbackRejectsInvalidIrrelevantLocatorFields", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    await writeArtifactFixture(
      artifactRoot,
      "metadata/screenshots/shot-1.json",
      screenshotMetadata({ reportLocator: 123 }),
      "screenshots/shot-1.txt",
      "synthetic image",
    );

    const result = await readUnityResource(projectRoot, "unity://screenshots/shot-1");

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "validation_failed");
    }
  });
});

test("resourceReadbackDoesNotScanPayloadDirectoriesWhenMetadataIsMissing", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const payloadPath = path.join(artifactRoot, "screenshots", "shot-1.txt");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(payloadPath), { recursive: true }));
    await writeFile(payloadPath, "orphaned evidence", "utf8");

    const result = await readUnityResource(projectRoot, "unity://screenshots/shot-1");

    assert.deepEqual(result.ok ? result : { ok: result.ok, reason: result.reason }, {
      ok: false,
      reason: "metadata_missing",
    });
  });
});

test("resourceReadbackClassifiesFileMissingAndValidationFailures", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const metadataPath = path.join(artifactRoot, "metadata", "screenshots", "shot-1.json");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
    await writeJsonFile(metadataPath, screenshotMetadata({ sizeBytes: 12 }));

    const missingFile = await readUnityResource(projectRoot, "unity://screenshots/shot-1");
    assert.equal(missingFile.ok, false);
    if (!missingFile.ok) {
      assert.equal(missingFile.reason, "file_missing");
    }

    await writeJsonFile(metadataPath, screenshotMetadata({ validationStatus: "uncertain" }));
    const uncertain = await readUnityResource(projectRoot, "unity://screenshots/shot-1");
    assert.equal(uncertain.ok, false);
    if (!uncertain.ok) {
      assert.equal(uncertain.reason, "validation_failed");
    }
  });
});

test("resourceReadbackRejectsUnsafeReportLocatorAndUnsupportedValidationReports", async () => {
  await withArtifactProject(async (projectRoot, artifactRoot) => {
    const metadataPath = path.join(artifactRoot, "metadata", "test-reports", "report-1.json");
    await import("node:fs/promises").then(async ({ mkdir }) => mkdir(path.dirname(metadataPath), { recursive: true }));
    await writeJsonFile(metadataPath, reportMetadata({
      reportLocator: {
        kind: "artifact_relative_path",
        relativePath: "screenshots/not-a-report.txt",
      },
    }));

    const invalidLocator = await readUnityResource(projectRoot, "unity://test-reports/report-1");
    assert.equal(invalidLocator.ok, false);
    if (!invalidLocator.ok) {
      assert.equal(invalidLocator.reason, "path_outside_artifact_root");
    }
  });

  const unsupported = await readUnityResource(os.tmpdir(), "unity://validation-reports/report-1");
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(unsupported.reason, "unsupported_type");
  }
});
