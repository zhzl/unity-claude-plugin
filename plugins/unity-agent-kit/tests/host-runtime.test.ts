import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  definePublicResult,
  publicResultStatuses,
  publicResultStatusSemantics,
  publicResultStatusToIsError,
  type PublicResultStatus,
  type UnityAgentKitPublicResult,
} from "../src/contracts/result.ts";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";

function samplePublicResult(overrides: Partial<UnityAgentKitPublicResult> = {}): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "succeeded",
    tool: "unity_editor",
    action: "get_status",
    summary: "Editor status read.",
    diagnostics: [],
    ...overrides,
  });
}

test("packageJsonUsesStripTypesNodeTestScript", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node --experimental-strip-types --test tests/host-runtime.test.ts");
});

test("publicResultFoundationDefinesPhase5AStatusSemantics", () => {
  assert.deepEqual(publicResultStatuses, [
    "succeeded",
    "failed",
    "uncertain",
    "cancelled",
    "timeout",
    "lost",
    "rejected",
  ]);

  assert.equal(publicResultStatusToIsError("succeeded"), false);
  for (const status of ["failed", "uncertain", "cancelled", "timeout", "lost", "rejected"] as const) {
    assert.equal(publicResultStatusToIsError(status), true);
  }

  assert.match(publicResultStatusSemantics.succeeded.description, /complete success evidence/i);
  assert.match(publicResultStatusSemantics.timeout.description, /does not prove/i);
  assert.match(publicResultStatusSemantics.lost.description, /continuity/i);
  assert.match(publicResultStatusSemantics.rejected.description, /before execution/i);
});

test("mapPublicResultPreservesDiagnosticsCodeAndAttribution", () => {
  const diagnostic = {
    source: "unity-host",
    severity: "error" as const,
    code: "host.dispatch_timeout",
    message: "Main-thread dispatch deadline expired.",
    details: { mayStillBeRunning: true, deadlineMs: 250 },
    attribution: { operation: "host.pendingDispatchTimeout", requestId: "req-timeout" },
  };

  const result = definePublicResult({
    status: "timeout",
    tool: "unity_editor",
    action: "wait_ready",
    summary: "Host-level dispatch timed out.",
    diagnostics: [diagnostic],
  });

  assert.deepEqual(result.diagnostics, [diagnostic]);
});

test("mapPublicResultPreservesFailureMetadata", () => {
  const result = definePublicResult({
    status: "lost",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: "compile.request",
    requestId: "req-compile-1",
    hostId: "host-before",
    hostEpoch: 7,
    summary: "Host restarted before the response could be trusted.",
    code: "host.stale_instance",
    message: "Host restarted before the response could be trusted.",
    data: { compilerMessagesSeen: false },
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Registry identity changed after response.",
        details: { previousHostId: "host-before", nextHostId: "host-after" },
        attribution: { operation: "compile.request", requestId: "req-compile-1" },
      },
    ],
    startedAt: "2026-05-19T10:00:00.000Z",
    completedAt: "2026-05-19T10:00:01.000Z",
    durationMs: 1000,
    metadata: { continuity: "old hostId / hostEpoch continuity is invalidated" },
  });

  assert.equal(result.operation, "compile.request");
  assert.equal(result.requestId, "req-compile-1");
  assert.equal(result.hostId, "host-before");
  assert.equal(result.hostEpoch, 7);
  assert.equal(result.code, "host.stale_instance");
  assert.equal(result.message, "Host restarted before the response could be trusted.");
  assert.deepEqual(result.data, { compilerMessagesSeen: false });
  assert.deepEqual(result.metadata, { continuity: "old hostId / hostEpoch continuity is invalidated" });
  assert.equal(result.durationMs, 1000);
});

test("definePublicResultRejectsUnknownStatus", () => {
  assert.throws(
    () =>
      definePublicResult({
        status: "completed",
        tool: "unity_compile",
        action: "request",
        summary: "v2 status should not pass as a public result status.",
        diagnostics: [],
      } as unknown as UnityAgentKitPublicResult),
    /Unknown public result status: completed/,
  );
});

test("mapPublicResultToMcpToolResultPreservesStatusDiagnosticsAndEvidence", () => {
  const publicResult = samplePublicResult({
    status: "failed",
    tool: "unity_compile",
    action: "compile_and_check",
    summary: "Compilation failed.",
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "compile.compiler_error",
        message: "Compiler error reported.",
        details: { file: "Assets/Scripts/Broken.cs", line: 12 },
        attribution: { phase: "compiler-messages" },
      },
    ],
    evidence: { compilerMessages: 1 },
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent, publicResult);
  assert.deepEqual(mapped.content, [{ type: "text", text: "Compilation failed." }]);
  assert.equal(mapped.isError, true);
  assert.doesNotMatch(mapped.content[0].text, /compile.compiler_error|compilerMessages|Assets\/Scripts\/Broken.cs/);
});

test("mapPublicResultToMcpToolResultPreservesEnvelopeMetadata", () => {
  const publicResult = samplePublicResult({
    status: "lost",
    tool: "unity_compile",
    action: "compile_and_check",
    operation: "compile.request",
    requestId: "req-envelope-1",
    hostId: "host-envelope",
    hostEpoch: 12,
    summary: "Host identity changed after response.",
    code: "host.stale_instance",
    message: "Host identity changed after response.",
    data: { ok: false, compilerMessagesSeen: false },
    diagnostics: [
      {
        source: "ts-host-client",
        severity: "error",
        code: "host.stale_instance",
        message: "Registry identity changed after response.",
      },
    ],
    startedAt: "2026-05-19T10:00:00.000Z",
    completedAt: "2026-05-19T10:00:01.250Z",
    durationMs: 1250,
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.operation, "compile.request");
  assert.equal(mapped.structuredContent.requestId, "req-envelope-1");
  assert.equal(mapped.structuredContent.hostId, "host-envelope");
  assert.equal(mapped.structuredContent.hostEpoch, 12);
  assert.deepEqual(mapped.structuredContent.data, { ok: false, compilerMessagesSeen: false });
  assert.equal(mapped.structuredContent.startedAt, "2026-05-19T10:00:00.000Z");
  assert.equal(mapped.structuredContent.completedAt, "2026-05-19T10:00:01.250Z");
  assert.equal(mapped.structuredContent.durationMs, 1250);
  assert.equal(mapped.structuredContent.code, "host.stale_instance");
  assert.equal(mapped.structuredContent.message, "Host identity changed after response.");
});

test("mapPublicResultToMcpToolResultPreservesResourceReferences", () => {
  const resource = {
    uri: "unity://screenshots/shot-1",
    name: "shot-1.png",
    mimeType: "image/png",
    description: "Game View screenshot.",
    metadata: { artifactId: "shot-1" },
  };
  const resources = [
    {
      uri: "unity://console-snapshots/console-1",
      name: "console-1.json",
      mimeType: "application/json",
    },
  ];
  const publicResult = samplePublicResult({
    status: "succeeded",
    tool: "unity_screenshot",
    action: "capture_game_view",
    summary: "Game View screenshot captured.",
    resource,
    resources,
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.resource, resource);
  assert.deepEqual(mapped.structuredContent.resources, resources);
  assert.deepEqual(mapped.content, [{ type: "text", text: "Game View screenshot captured." }]);
  assert.equal(mapped.isError, false);
});

test("mapPublicResultPreservesFutureWorkflowFields", () => {
  const job = { jobId: "job-1", status: "running" };
  const nextStep = {
    tool: "unity_test",
    action: "get_status",
    reason: "Poll the existing test job instead of starting another run.",
  };
  const publicResult = samplePublicResult({
    status: "uncertain",
    tool: "unity_test",
    action: "run_and_verify",
    summary: "Test run is still in progress.",
    job,
    nextStep,
    safeToRetry: false,
    mayStillBeRunning: true,
    metadata: { workflowOwner: "ts" },
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.deepEqual(mapped.structuredContent.job, job);
  assert.deepEqual(mapped.structuredContent.nextStep, nextStep);
  assert.equal(mapped.structuredContent.safeToRetry, false);
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
  assert.deepEqual(mapped.structuredContent.metadata, { workflowOwner: "ts" });
});

test("publicResultMappingPreservesSafeToRetryAndNextStep", () => {
  const nextStep = {
    tool: "unity_playmode",
    action: "get_state",
    reason: "Poll PlayMode state before retrying.",
  };
  const publicResult = samplePublicResult({
    status: "timeout",
    tool: "unity_playmode",
    action: "enter_and_verify",
    summary: "PlayMode verification timed out.",
    nextStep,
    safeToRetry: false,
    mayStillBeRunning: true,
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "host.request_timeout",
        message: "Host request timed out.",
      },
    ],
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.safeToRetry, false);
  assert.equal(mapped.structuredContent.nextStep?.action, "get_state");
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
  assert.equal(mapped.isError, true);
});

test("workflowTimeoutFieldsArePreservedButNotProducedBy5A", () => {
  const publicResult = samplePublicResult({
    status: "timeout",
    tool: "unity_editor",
    action: "wait_ready",
    summary: "Host-level dispatch timeout preserved.",
    metadata: { timeoutLayer: "host" },
    mayStillBeRunning: true,
    diagnostics: [
      {
        source: "unity-host",
        severity: "error",
        code: "host.dispatch_timeout",
        message: "Host-level dispatch timed out.",
        details: { timeoutLayer: "host", mayStillBeRunning: true },
      },
    ],
  });

  const mapped = mapPublicResultToMcpToolResult(publicResult);

  assert.equal(mapped.structuredContent.metadata?.timeoutLayer, "host");
  assert.notEqual(mapped.structuredContent.metadata?.timeoutLayer, "workflow");
  assert.equal(mapped.structuredContent.mayStillBeRunning, true);
});

test("nonSucceededStatusesMapToMcpErrors", () => {
  const expected = new Map<PublicResultStatus, boolean>([
    ["succeeded", false],
    ["failed", true],
    ["uncertain", true],
    ["cancelled", true],
    ["timeout", true],
    ["lost", true],
    ["rejected", true],
  ]);

  for (const [status, isError] of expected) {
    const publicResult = samplePublicResult({
      status,
      summary: `${status} summary`,
      diagnostics:
        status === "succeeded"
          ? []
          : [
              {
                source: "unity-host",
                severity: "error",
                code: `${status}.diagnostic`,
                message: `${status} diagnostic`,
              },
            ],
    });

    const mapped = mapPublicResultToMcpToolResult(publicResult);

    assert.equal(mapped.isError, isError);
    assert.equal(mapped.structuredContent.status, status);
    assert.deepEqual(mapped.content, [{ type: "text", text: `${status} summary` }]);
  }
});
