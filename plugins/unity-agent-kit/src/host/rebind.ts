import { definePublicResult, type UnityAgentKitDiagnostic, type UnityAgentKitPublicResult } from "../contracts/result.ts";
import {
  continuityIdentity,
  readHostRegistry,
  type HostRegistryReadResult,
  type UnityAgentKitHostRecord,
} from "./registry.ts";
import { invokeOperationOnce, probeActiveHost } from "./http-client.ts";
import type { HostTransport, UnityAgentKitOperationRequest } from "./transport.ts";

export type RegistryReader = (
  registryPath: string,
  options: { projectRoot: string; seenRegistry?: boolean },
) => Promise<HostRegistryReadResult>;

export interface ExecuteWithRebindOptions {
  registryPath: string;
  projectRoot: string;
  readRegistry?: RegistryReader;
  transport: HostTransport;
  request: UnityAgentKitOperationRequest;
}

export async function executeWithRebind(options: ExecuteWithRebindOptions): Promise<UnityAgentKitPublicResult> {
  const readRegistry = options.readRegistry ?? readHostRegistry;
  const initialRegistry = await readRegistry(options.registryPath, { projectRoot: options.projectRoot });
  if (!initialRegistry.ok) {
    return mapRegistryFailure(initialRegistry, options.request);
  }

  const initialProbe = await probeActiveHost(initialRegistry.record, options.transport);
  if (!initialProbe.ok) {
    if (!allowsSingleRebind(initialProbe.result)) {
      return initialProbe.result;
    }

    const reboundRegistry = await readRegistry(options.registryPath, {
      projectRoot: options.projectRoot,
      seenRegistry: true,
    });
    if (!reboundRegistry.ok) {
      return mapRegistryFailure(reboundRegistry, options.request);
    }

    const reboundProbe = await probeActiveHost(reboundRegistry.record, options.transport);
    if (!reboundProbe.ok) {
      return prioritizeRebindFailure(initialProbe.result, reboundProbe.result);
    }

    return finalizeOperationResult(
      reboundRegistry.record,
      await invokeOperationOnce(reboundRegistry.record, options.transport, options.request),
      readRegistry,
      options,
    );
  }

  return finalizeOperationResult(
    initialRegistry.record,
    await invokeOperationOnce(initialRegistry.record, options.transport, options.request),
    readRegistry,
    options,
  );
}

function allowsSingleRebind(result: UnityAgentKitPublicResult): boolean {
  const code = result.diagnostics[0]?.code ?? result.code;
  return code === "host.not_ready" || code === "host.identity_mismatch" || code === "host.transport_unavailable";
}

async function finalizeOperationResult(
  record: UnityAgentKitHostRecord,
  result: UnityAgentKitPublicResult,
  readRegistry: RegistryReader,
  options: ExecuteWithRebindOptions,
): Promise<UnityAgentKitPublicResult> {
  const postRegistry = await readRegistry(options.registryPath, {
    projectRoot: options.projectRoot,
    seenRegistry: true,
  });

  if (!postRegistry.ok) {
    return postRegistry.reason === "missing_after_seen" ? staleInstanceResult(record, result, options.request) : result;
  }

  if (continuityIdentity(postRegistry.record) !== continuityIdentity(record)) {
    if (result.status === "lost" && firstDiagnosticCode(result) === "host.transport_unavailable") {
      return restartedResult(record, result, options.request, postRegistry.record);
    }

    return staleInstanceResult(record, result, options.request, postRegistry.record);
  }

  return result;
}

function prioritizeRebindFailure(
  initialResult: UnityAgentKitPublicResult,
  reboundResult: UnityAgentKitPublicResult,
): UnityAgentKitPublicResult {
  if (firstDiagnosticCode(initialResult) === "host.not_ready" && firstDiagnosticCode(reboundResult) === "host.transport_unavailable") {
    return initialResult;
  }

  return reboundResult;
}

function mapRegistryFailure(
  result: Extract<HostRegistryReadResult, { ok: false }>,
  request: UnityAgentKitOperationRequest,
): UnityAgentKitPublicResult {
  const status = result.reason === "missing_before_seen" || result.reason === "missing_after_seen" ? "lost" : "failed";
  return definePublicResult({
    status,
    tool: "unity_editor",
    action: request.operation,
    operation: request.operation,
    requestId: request.requestId,
    summary: result.diagnostic.message,
    code: result.diagnostic.code,
    message: result.diagnostic.message,
    diagnostics: [result.diagnostic],
  });
}

function restartedResult(
  record: UnityAgentKitHostRecord,
  result: UnityAgentKitPublicResult,
  request: UnityAgentKitOperationRequest,
  nextRecord: Pick<UnityAgentKitHostRecord, "hostId" | "hostEpoch">,
): UnityAgentKitPublicResult {
  return overrideResult(record, result, request, "host.restarted", "Unity host restarted before the response could be trusted.", {
    previousHostId: record.hostId,
    previousHostEpoch: record.hostEpoch,
    nextHostId: nextRecord.hostId,
    nextHostEpoch: nextRecord.hostEpoch,
  });
}

function staleInstanceResult(
  record: UnityAgentKitHostRecord,
  result: UnityAgentKitPublicResult,
  request: UnityAgentKitOperationRequest,
  nextRecord?: Pick<UnityAgentKitHostRecord, "hostId" | "hostEpoch">,
): UnityAgentKitPublicResult {
  return overrideResult(record, result, request, "host.stale_instance", "Host identity changed before the response could be trusted.", nextRecord
    ? {
        previousHostId: record.hostId,
        previousHostEpoch: record.hostEpoch,
        nextHostId: nextRecord.hostId,
        nextHostEpoch: nextRecord.hostEpoch,
      }
    : { previousHostId: record.hostId, previousHostEpoch: record.hostEpoch, classification: "missing_after_seen" });
}

function overrideResult(
  record: UnityAgentKitHostRecord,
  result: UnityAgentKitPublicResult,
  request: UnityAgentKitOperationRequest,
  code: string,
  message: string,
  details: Record<string, unknown>,
): UnityAgentKitPublicResult {
  const attribution = { operation: request.operation, requestId: request.requestId };
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "ts-host-client",
    severity: "error",
    code,
    message,
    details,
    attribution,
  };

  return definePublicResult({
    status: "lost",
    tool: result.tool,
    action: request.operation,
    operation: request.operation,
    requestId: request.requestId,
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: message,
    code,
    message,
    diagnostics: [diagnostic],
  });
}

function firstDiagnosticCode(result: UnityAgentKitPublicResult): string | undefined {
  return result.diagnostics[0]?.code ?? result.code;
}
