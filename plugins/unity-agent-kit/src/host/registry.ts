import { readFile } from "node:fs/promises";
import type { UnityAgentKitDiagnostic } from "../contracts/result.ts";

export const UNITY_AGENT_KIT_HOST_NAME = "Unity Agent Kit";
export const UNITY_AGENT_KIT_PROTOCOL_VERSION = "2026-05-19";
export const supportedHostStatuses = ["ready", "not_ready"] as const;

export type UnityAgentKitHostStatus = (typeof supportedHostStatuses)[number];

export type HostRegistryFailureReason =
  | "missing_before_seen"
  | "missing_after_seen"
  | "invalid_json"
  | "invalid_shape"
  | "invalid_port"
  | "unexpected_fs_error";

export interface UnityAgentKitHostRecord {
  hostName: string;
  protocolVersion: string;
  projectRoot: string;
  hostId: string;
  hostEpoch: number;
  port: number;
  status: UnityAgentKitHostStatus;
  startedAt: string;
  lastProbeAt?: string;
}

export interface HostRegistryReadOptions {
  projectRoot: string;
  seenRegistry?: boolean;
  readText?: (registryPath: string) => Promise<string>;
}

export type HostRegistryReadResult =
  | {
      ok: true;
      record: UnityAgentKitHostRecord;
    }
  | {
      ok: false;
      reason: HostRegistryFailureReason;
      diagnostic: UnityAgentKitDiagnostic;
    };

export function continuityIdentity(record: Pick<UnityAgentKitHostRecord, "hostId" | "hostEpoch">): string {
  return `${record.hostId}:${record.hostEpoch}`;
}

export async function readHostRegistry(
  registryPath: string,
  options: HostRegistryReadOptions,
): Promise<HostRegistryReadResult> {
  const readText = options.readText ?? ((path: string) => readFile(path, "utf8"));

  let text: string;
  try {
    text = await readText(registryPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      const classification = options.seenRegistry ? "missing_after_seen" : "missing_before_seen";
      return fail(classification, {
        source: "ts-host-client",
        severity: "error",
        code: "host.registry_missing",
        message: `Host registry is missing at ${registryPath}.`,
        details: { classification },
      });
    }

    return fail("unexpected_fs_error", {
      source: "ts-host-client",
      severity: "error",
      code: "host.registry_read_failed",
      message: `Failed to read host registry at ${registryPath}: ${formatErrorMessage(error)}`,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("invalid_json", {
      source: "ts-host-client",
      severity: "error",
      code: "host.registry_invalid_json",
      message: `Host registry contains invalid JSON at ${registryPath}.`,
    });
  }

  if (!isHostRecordShape(parsed, options.projectRoot)) {
    return fail("invalid_shape", {
      source: "ts-host-client",
      severity: "error",
      code: "host.registry_invalid_shape",
      message: `Host registry has an invalid shape at ${registryPath}.`,
    });
  }

  if (!isValidPort(parsed.port)) {
    return fail("invalid_port", {
      source: "ts-host-client",
      severity: "error",
      code: "host.registry_invalid_port",
      message: `Host registry port is invalid at ${registryPath}.`,
    });
  }

  return { ok: true, record: parsed };
}

function fail(reason: HostRegistryFailureReason, diagnostic: UnityAgentKitDiagnostic): HostRegistryReadResult {
  return { ok: false, reason, diagnostic };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return String(error);
}

function isHostRecordShape(value: unknown, projectRoot: string): value is UnityAgentKitHostRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.hostName === UNITY_AGENT_KIT_HOST_NAME &&
    record.protocolVersion === UNITY_AGENT_KIT_PROTOCOL_VERSION &&
    record.projectRoot === projectRoot &&
    typeof record.hostId === "string" &&
    record.hostId.length > 0 &&
    typeof record.hostEpoch === "number" &&
    Number.isInteger(record.hostEpoch) &&
    record.hostEpoch >= 0 &&
    typeof record.port === "number" &&
    Number.isInteger(record.port) &&
    typeof record.status === "string" &&
    isSupportedHostStatus(record.status) &&
    typeof record.startedAt === "string" &&
    record.startedAt.length > 0 &&
    (record.lastProbeAt === undefined || typeof record.lastProbeAt === "string")
  );
}

function isSupportedHostStatus(value: string): value is UnityAgentKitHostStatus {
  return supportedHostStatuses.includes(value as UnityAgentKitHostStatus);
}

function isValidPort(value: number): boolean {
  return value >= 1 && value <= 65535;
}
