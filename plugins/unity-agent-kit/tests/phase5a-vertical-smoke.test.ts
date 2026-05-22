import test from "node:test";
import assert from "node:assert/strict";
import { definePublicResult, type UnityAgentKitPublicResult } from "../src/contracts/result.ts";
import { mapPublicResultToMcpToolResult } from "../src/contracts/mcp-result.ts";
import { readHostRegistry } from "../src/host/registry.ts";
import { probeActiveHost, invokeOperationOnce } from "../src/host/http-client.ts";
import { createNodeHostTransport } from "../src/host/transport.ts";

test("phase5aVerticalSmokeProbesAndInvokesLiveUnityHost", async () => {
  const projectRoot = requiredEnv("UNITY_AGENT_KIT_PROJECT_ROOT");
  const registryPath = requiredEnv("UNITY_AGENT_KIT_REGISTRY_PATH");
  const transport = createNodeHostTransport({ timeoutMs: readTimeoutMs() });

  const registry = await readHostRegistry(registryPath, { projectRoot });
  assert.equal(registry.ok, true, formatValue(registry));
  if (!registry.ok) {
    return;
  }

  const probe = await probeActiveHost(registry.record, transport);
  assert.equal(probe.ok, true, formatValue(probe));
  if (!probe.ok) {
    return;
  }

  assert.equal(probe.record.hostId, registry.record.hostId);
  assert.equal(probe.record.hostEpoch, registry.record.hostEpoch);
  assert.equal(probe.probe.projectRoot, projectRoot);
  assert.equal(probe.probe.port, registry.record.port);
  assert.equal(probe.probe.status, "ready");

  const result = await invokeOperationOnce(registry.record, transport, {
    operation: "host.threadCheck",
    requestId: "phase5a-vertical-smoke-thread-check",
  });

  assert.equal(result.status, "succeeded", formatValue(result));
  assert.equal(result.operation, "host.threadCheck");
  assert.equal(result.requestId, "phase5a-vertical-smoke-thread-check");
  assert.equal(result.hostId, registry.record.hostId);
  assert.equal(result.hostEpoch, registry.record.hostEpoch);
  assert.equal(typeof result.summary, "string");
  assert.ok(result.summary.length > 0);
  assert.ok(Array.isArray(result.diagnostics));
  assert.equal(result.diagnostics.length, 0);
  assert.equal(typeof result.startedAt, "string");
  assert.equal(typeof result.completedAt, "string");
  assert.equal(typeof result.durationMs, "number");

  const threadCheck = parseJsonObject(result.data, "host.threadCheck data");
  assert.equal(threadCheck.ranOnMainThread, true);
  assert.equal(threadCheck.capturedMainThreadId, threadCheck.executionThreadId);

  const publicResult = definePublicResult({
    ...result,
    evidence: {
      phase: "5A-08",
      path: [
        "Unity writes registry",
        "TS reads registry",
        "TS probes /probe",
        "TS invokes real HTTP /operations",
        "Unity dispatches host.threadCheck on captured main thread",
        "TS maps envelope/public result",
      ],
      capturedMainThreadId: threadCheck.capturedMainThreadId,
      executionThreadId: threadCheck.executionThreadId,
    },
  } as UnityAgentKitPublicResult);

  const mcpResult = mapPublicResultToMcpToolResult(publicResult);
  assert.deepEqual(mcpResult.structuredContent, publicResult);
  assert.equal(mcpResult.structuredContent.status, "succeeded");
  assert.equal(mcpResult.structuredContent.operation, "host.threadCheck");
  assert.equal(mcpResult.structuredContent.requestId, "phase5a-vertical-smoke-thread-check");
  assert.equal(mcpResult.structuredContent.hostId, registry.record.hostId);
  assert.equal(mcpResult.structuredContent.hostEpoch, registry.record.hostEpoch);
  assert.deepEqual(mcpResult.structuredContent.diagnostics, []);
  assert.equal((mcpResult.structuredContent.evidence as Record<string, unknown>).phase, "5A-08");
  assert.equal(mcpResult.content[0].text, publicResult.summary);
  assert.doesNotMatch(mcpResult.content[0].text, /capturedMainThreadId|hostEpoch|diagnostics/);
  assert.equal(mcpResult.isError, false);
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value && value.length > 0, `${name} is required for Phase 5A vertical smoke.`);
  return value;
}

function readTimeoutMs(): number {
  const raw = process.env.UNITY_AGENT_KIT_REQUEST_TIMEOUT_MS;
  if (raw === undefined || raw.length === 0) {
    return 3000;
  }

  const parsed = Number(raw);
  assert.ok(Number.isFinite(parsed) && parsed > 0, "UNITY_AGENT_KIT_REQUEST_TIMEOUT_MS must be a positive number.");
  return Math.floor(parsed);
}

function parseJsonObject(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "string", `${label} must be a JSON string.`);
  const parsed = JSON.parse(value as string);
  assert.equal(typeof parsed, "object", `${label} must parse to an object.`);
  assert.notEqual(parsed, null, `${label} must not parse to null.`);
  assert.equal(Array.isArray(parsed), false, `${label} must not parse to an array.`);
  return parsed as Record<string, unknown>;
}

function formatValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
