import {
  definePublicResult,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import { readHostRegistry, type UnityAgentKitHostRecord } from "../host/registry.ts";
import { executeWithRebind, type ExecuteWithRebindOptions, type RegistryReader } from "../host/rebind.ts";
import type { HostTransport, HostTransportResult, UnityAgentKitOperationRequest } from "../host/transport.ts";

export interface RebindAwareWorkflowResult {
  result: UnityAgentKitPublicResult;
  rebound: boolean;
}

export async function executeWithRebindAwareness(options: ExecuteWithRebindOptions): Promise<RebindAwareWorkflowResult> {
  const baseReadRegistry = options.readRegistry ?? readHostRegistry;

  let firstRecord: UnityAgentKitHostRecord | undefined;
  let latestRecord: UnityAgentKitHostRecord | undefined;
  let firstProbeRequiredRebind = false;
  let preOperationRebindSucceeded = false;
  let probeCount = 0;

  const readRegistry: RegistryReader = async (registryPath, readOptions) => {
    const result = await baseReadRegistry(registryPath, readOptions);
    if (result.ok) {
      latestRecord = result.record;
      if (firstRecord === undefined) {
        firstRecord = result.record;
      }
    }

    return result;
  };

  const transport: HostTransport = {
    async probe(port: number): Promise<HostTransportResult> {
      const result = await options.transport.probe(port);
      probeCount += 1;
      if (probeCount === 1) {
        firstProbeRequiredRebind = probeResultRequiresRebind(result, firstRecord);
      } else if (firstProbeRequiredRebind && probeCount === 2 && probeResultMatchesReadyRecord(result, latestRecord)) {
        preOperationRebindSucceeded = true;
      }
      return result;
    },
    invokeOperation(port: number, request: UnityAgentKitOperationRequest): Promise<HostTransportResult> {
      return options.transport.invokeOperation(port, request);
    },
  };

  const result = await executeWithRebind({
    ...options,
    readRegistry,
    transport,
  });

  return {
    rebound: preOperationRebindSucceeded,
    result: preOperationRebindSucceeded ? appendRebindDiagnostic(result) : result,
  };
}

function probeResultRequiresRebind(
  result: HostTransportResult,
  initialRecord: UnityAgentKitHostRecord | undefined,
): boolean {
  if (!result.ok) {
    return result.reason === "transport_unavailable";
  }

  if (initialRecord === undefined) {
    return false;
  }

  const body = result.body;
  return (
    body.status === "not_ready" ||
    body.hostId !== initialRecord.hostId ||
    body.hostEpoch !== initialRecord.hostEpoch ||
    body.projectRoot !== initialRecord.projectRoot ||
    body.port !== initialRecord.port
  );
}

function probeResultMatchesReadyRecord(
  result: HostTransportResult,
  record: UnityAgentKitHostRecord | undefined,
): boolean {
  if (!result.ok || record === undefined) {
    return false;
  }

  const body = result.body;
  return (
    body.status === "ready" &&
    body.hostId === record.hostId &&
    body.hostEpoch === record.hostEpoch &&
    body.projectRoot === record.projectRoot &&
    body.protocolVersion === record.protocolVersion &&
    body.port === record.port
  );
}

function appendRebindDiagnostic(result: UnityAgentKitPublicResult): UnityAgentKitPublicResult {
  const diagnostic: UnityAgentKitDiagnostic = {
    source: "host",
    severity: "info",
    code: "host.rebound",
    message: "Workflow continued after a successful pre-operation host rebind.",
    attribution: {
      operation: result.operation,
      requestId: result.requestId,
      hostId: result.hostId,
      hostEpoch: result.hostEpoch,
    },
  };

  return definePublicResult({
    ...result,
    diagnostics: [...result.diagnostics, diagnostic],
  });
}
