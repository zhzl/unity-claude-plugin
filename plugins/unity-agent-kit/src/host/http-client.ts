import {
  definePublicResult,
  isPublicResultStatus,
  type UnityAgentKitDiagnostic,
  type UnityAgentKitPublicResult,
} from "../contracts/result.ts";
import {
  continuityIdentity,
  type UnityAgentKitHostRecord,
} from "./registry.ts";
import {
  type HostTransport,
  type HostTransportResult,
  type UnityAgentKitOperationRequest,
} from "./transport.ts";

interface HostProbeEnvelope {
  hostId: string;
  hostEpoch: number;
  projectRoot: string;
  protocolVersion: string;
  port: number;
  status: "ready" | "not_ready";
  [key: string]: unknown;
}

export type ActiveProbeResult =
  | {
      ok: true;
      record: UnityAgentKitHostRecord;
      probe: HostProbeEnvelope;
    }
  | {
      ok: false;
      result: UnityAgentKitPublicResult;
    };

interface OperationEnvelopeContext {
  record: UnityAgentKitHostRecord;
  request: UnityAgentKitOperationRequest;
}

const optionalPublicResultFields = [
  "evidence",
  "resource",
  "resources",
  "metadata",
  "job",
  "nextStep",
  "safeToRetry",
  "mayStillBeRunning",
] as const;

export async function probeActiveHost(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
): Promise<ActiveProbeResult> {
  const response = await transport.probe(record.port);
  if (!response.ok) {
    return { ok: false, result: mapTransportFailureToPublicResult(response, "host.probe", "probe") };
  }

  if (!isHostProbeEnvelope(response.body)) {
    return { ok: false, result: invalidProbeResult(record, "Host probe response has an invalid shape.") };
  }

  if (response.body.protocolVersion !== record.protocolVersion) {
    return {
      ok: false,
      result: definePublicResult({
        status: "lost",
        tool: "unity_editor",
        action: "host.probe",
        operation: "host.probe",
        requestId: "probe",
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        summary: "Unity host protocol version does not match the registry record.",
        code: "host.protocol_mismatch",
        message: "Unity host protocol version does not match the registry record.",
        diagnostics: [
          diagnostic("host.protocol_mismatch", "Unity host protocol version does not match the registry record."),
        ],
      }),
    };
  }

  if (!matchesActiveIdentity(record, response.body)) {
    return {
      ok: false,
      result: definePublicResult({
        status: "lost",
        tool: "unity_editor",
        action: "host.probe",
        operation: "host.probe",
        requestId: "probe",
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        summary: "Unity host identity does not match the registry record.",
        code: "host.identity_mismatch",
        message: "Unity host identity does not match the registry record.",
        diagnostics: [
          diagnostic("host.identity_mismatch", "Unity host identity does not match the registry record."),
        ],
      }),
    };
  }

  if (response.body.status === "not_ready") {
    const message = readOptionalString(response.body.message) ?? "Unity host is not ready.";
    return {
      ok: false,
      result: definePublicResult({
        status: "lost",
        tool: "unity_editor",
        action: "host.probe",
        operation: "host.probe",
        requestId: "probe",
        hostId: record.hostId,
        hostEpoch: record.hostEpoch,
        summary: readOptionalString(response.body.messageText) ?? message,
        code: readOptionalString(response.body.code) ?? "host.not_ready",
        message,
        diagnostics: [diagnostic("host.not_ready", message)],
      }),
    };
  }

  return { ok: true, record, probe: response.body };
}

export function mapTransportFailureToPublicResult(
  response: Extract<HostTransportResult, { ok: false }>,
  operation: string,
  requestId: string,
): UnityAgentKitPublicResult {
  switch (response.reason) {
    case "request_timeout":
      return definePublicResult({
        status: "timeout",
        tool: "unity_editor",
        action: operation,
        operation,
        requestId,
        summary: response.message,
        code: "host.request_timeout",
        message: response.message,
        diagnostics: [diagnostic("host.request_timeout", response.message)],
      });
    case "http_status_failure":
      return definePublicResult({
        status: "failed",
        tool: "unity_editor",
        action: operation,
        operation,
        requestId,
        summary: response.message,
        code: "host.http_status_failure",
        message: response.message,
        diagnostics: [
          diagnostic("host.http_status_failure", response.message, {
            statusCode: response.statusCode,
            bodyText: response.bodyText,
          }),
        ],
      });
    case "invalid_json_response":
      return definePublicResult({
        status: "failed",
        tool: "unity_editor",
        action: operation,
        operation,
        requestId,
        summary: response.message,
        code: "host.invalid_envelope",
        message: response.message,
        diagnostics: [diagnostic("host.invalid_envelope", response.message)],
      });
    case "transport_unavailable":
      return definePublicResult({
        status: "lost",
        tool: "unity_editor",
        action: operation,
        operation,
        requestId,
        summary: response.message,
        code: "host.transport_unavailable",
        message: response.message,
        diagnostics: [diagnostic("host.transport_unavailable", response.message)],
      });
  }
}

export function mapEnvelopeToPublicResult(
  envelope: unknown,
  context: OperationEnvelopeContext,
): UnityAgentKitPublicResult {
  if (!isTrustedEnvelope(envelope)) {
    return invalidEnvelopeResult(context, "Host operation response has an invalid envelope.");
  }

  if (envelope.operation !== context.request.operation) {
    return invalidEnvelopeResult(context, "Host operation response operation does not match the request.", {
      expectedOperation: context.request.operation,
      actualOperation: envelope.operation,
    });
  }

  if (envelope.requestId !== context.request.requestId) {
    return invalidEnvelopeResult(context, "Host operation response requestId does not match the request.", {
      expectedRequestId: context.request.requestId,
      actualRequestId: envelope.requestId,
    });
  }

  if (envelope.hostId !== context.record.hostId) {
    return identityMismatchResult(context, "Host operation response hostId does not match the registry record.", {
      expectedHostId: context.record.hostId,
      actualHostId: envelope.hostId,
    });
  }

  if (envelope.hostEpoch !== context.record.hostEpoch) {
    return identityMismatchResult(context, "Host operation response hostEpoch does not match the registry record.", {
      expectedHostEpoch: context.record.hostEpoch,
      actualHostEpoch: envelope.hostEpoch,
    });
  }

  return definePublicResult({
    status: envelope.status,
    tool: "unity_editor",
    action: envelope.operation,
    operation: envelope.operation,
    requestId: envelope.requestId,
    hostId: envelope.hostId,
    hostEpoch: envelope.hostEpoch,
    summary: envelope.summary,
    data: envelope.data,
    diagnostics: envelope.diagnostics,
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    durationMs: envelope.durationMs,
    code: envelope.code,
    message: envelope.message,
    ...readOptionalPublicResultFields(envelope.raw),
  });
}

export async function invokeOperationOnce(
  record: UnityAgentKitHostRecord,
  transport: HostTransport,
  request: UnityAgentKitOperationRequest,
): Promise<UnityAgentKitPublicResult> {
  const response = await transport.invokeOperation(record.port, request);
  return response.ok
    ? mapEnvelopeToPublicResult(response.body, { record, request })
    : mapTransportFailureToPublicResult(response, request.operation, request.requestId);
}

function invalidProbeResult(record: UnityAgentKitHostRecord, message: string): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_editor",
    action: "host.probe",
    operation: "host.probe",
    requestId: "probe",
    hostId: record.hostId,
    hostEpoch: record.hostEpoch,
    summary: message,
    code: "host.probe_invalid_shape",
    message,
    diagnostics: [diagnostic("host.probe_invalid_shape", message)],
  });
}

function invalidEnvelopeResult(
  context: OperationEnvelopeContext,
  message: string,
  details?: Record<string, unknown>,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "failed",
    tool: "unity_editor",
    action: context.request.operation,
    operation: context.request.operation,
    requestId: context.request.requestId,
    hostId: context.record.hostId,
    hostEpoch: context.record.hostEpoch,
    summary: message,
    code: "host.invalid_envelope",
    message,
    diagnostics: [diagnostic("host.invalid_envelope", message, details)],
  });
}

function identityMismatchResult(
  context: OperationEnvelopeContext,
  message: string,
  details: Record<string, unknown>,
): UnityAgentKitPublicResult {
  return definePublicResult({
    status: "lost",
    tool: "unity_editor",
    action: context.request.operation,
    operation: context.request.operation,
    requestId: context.request.requestId,
    hostId: context.record.hostId,
    hostEpoch: context.record.hostEpoch,
    summary: message,
    code: "host.identity_mismatch",
    message,
    diagnostics: [diagnostic("host.identity_mismatch", message, details)],
  });
}

function readOptionalPublicResultFields(envelope: Record<string, unknown>): Partial<UnityAgentKitPublicResult> {
  const fields: Partial<UnityAgentKitPublicResult> = {};
  for (const field of optionalPublicResultFields) {
    if (field in envelope) {
      fields[field] = envelope[field] as never;
    }
  }
  return fields;
}

function diagnostic(code: string, message: string, details?: unknown): UnityAgentKitDiagnostic {
  return {
    source: "ts-host-client",
    severity: "error",
    code,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function isHostProbeEnvelope(value: unknown): value is HostProbeEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const probe = value as Record<string, unknown>;
  return (
    typeof probe.hostId === "string" &&
    probe.hostId.length > 0 &&
    typeof probe.hostEpoch === "number" &&
    Number.isInteger(probe.hostEpoch) &&
    typeof probe.projectRoot === "string" &&
    probe.projectRoot.length > 0 &&
    typeof probe.protocolVersion === "string" &&
    probe.protocolVersion.length > 0 &&
    typeof probe.port === "number" &&
    Number.isInteger(probe.port) &&
    (probe.status === "ready" || probe.status === "not_ready")
  );
}

function matchesActiveIdentity(record: UnityAgentKitHostRecord, probe: HostProbeEnvelope): boolean {
  return (
    continuityIdentity(record) === continuityIdentity(probe) &&
    record.projectRoot === probe.projectRoot &&
    record.port === probe.port
  );
}

function isTrustedEnvelope(value: unknown): value is {
  raw: Record<string, unknown>;
  status: ReturnType<typeof readStatus>;
  operation: string;
  requestId: string;
  hostId: string;
  hostEpoch: number;
  summary: string;
  data?: unknown;
  diagnostics: UnityAgentKitDiagnostic[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  code?: string;
  message?: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  const status = readStatus(envelope.status);

  if (!(
    status !== null &&
    typeof envelope.operation === "string" &&
    envelope.operation.length > 0 &&
    typeof envelope.requestId === "string" &&
    envelope.requestId.length > 0 &&
    typeof envelope.hostId === "string" &&
    envelope.hostId.length > 0 &&
    typeof envelope.hostEpoch === "number" &&
    Number.isInteger(envelope.hostEpoch) &&
    typeof envelope.summary === "string" &&
    envelope.summary.length > 0 &&
    Array.isArray(envelope.diagnostics) &&
    envelope.diagnostics.every(isDiagnostic) &&
    typeof envelope.startedAt === "string" &&
    envelope.startedAt.length > 0 &&
    typeof envelope.completedAt === "string" &&
    envelope.completedAt.length > 0 &&
    typeof envelope.durationMs === "number" &&
    Number.isFinite(envelope.durationMs) &&
    (envelope.code === undefined || typeof envelope.code === "string") &&
    (envelope.message === undefined || typeof envelope.message === "string")
  )) {
    return false;
  }

  (envelope as Record<string, unknown> & { raw: Record<string, unknown> }).raw = envelope;
  return true;
}

function readStatus(value: unknown): UnityAgentKitPublicResult["status"] | null {
  return isPublicResultStatus(value) ? value : null;
}

function isDiagnostic(value: unknown): value is UnityAgentKitDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Record<string, unknown>;
  return (
    typeof diagnostic.source === "string" &&
    diagnostic.source.length > 0 &&
    (diagnostic.severity === "info" || diagnostic.severity === "warning" || diagnostic.severity === "error") &&
    typeof diagnostic.message === "string" &&
    diagnostic.message.length > 0 &&
    (diagnostic.code === undefined || typeof diagnostic.code === "string")
  );
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
