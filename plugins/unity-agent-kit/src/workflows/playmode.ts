import type { UnityAgentKitPublicResult } from "../contracts/result.ts";
import type { RegistryReader } from "../host/rebind.ts";
import type { HostTransport } from "../host/transport.ts";
import {
  playModeStateOperation,
  playModeStateResultFromHostResult,
} from "../diagnostics/playmode.ts";
import { executeWithRebindAwareness } from "./rebind.ts";

export interface PlayModeWorkflowOptions {
  registryPath: string;
  projectRoot: string;
  transport: HostTransport;
  readRegistry?: RegistryReader;
}

export interface PlayModeActionOptions {
  requestId?: string;
}

export interface PlayModeVerifyOptions extends PlayModeActionOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export async function getPlayModeState(
  workflow: PlayModeWorkflowOptions,
  options: PlayModeActionOptions = {},
): Promise<UnityAgentKitPublicResult> {
  const requestId = options.requestId ?? `playmode-state-${Date.now()}`;
  const hostResult = await executeWithRebindAwareness({
    registryPath: workflow.registryPath,
    projectRoot: workflow.projectRoot,
    readRegistry: workflow.readRegistry,
    transport: workflow.transport,
    request: { operation: playModeStateOperation, requestId },
  });

  return playModeStateResultFromHostResult(hostResult.result, workflow.projectRoot);
}
