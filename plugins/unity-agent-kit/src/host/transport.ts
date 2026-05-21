export type HostTransportFailureReason =
  | "transport_unavailable"
  | "request_timeout"
  | "invalid_json_response"
  | "http_status_failure";

export interface UnityAgentKitOperationRequest {
  operation: string;
  requestId: string;
  inputJson?: string;
}

export type HostTransportResult =
  | { ok: true; statusCode: number; body: Record<string, unknown> }
  | { ok: false; reason: HostTransportFailureReason; statusCode?: number; bodyText?: string; message: string };

export interface HostTransport {
  probe(port: number): Promise<HostTransportResult>;
  invokeOperation(port: number, request: UnityAgentKitOperationRequest): Promise<HostTransportResult>;
}

export interface NodeHostTransportOptions {
  timeoutMs: number;
}

async function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<HostTransportResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const bodyText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        reason: "http_status_failure",
        statusCode: response.status,
        bodyText,
        message: `HTTP ${response.status} from Unity Agent Kit host.`,
      };
    }

    try {
      const body = JSON.parse(bodyText) as Record<string, unknown>;
      return { ok: true, statusCode: response.status, body };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: "invalid_json_response", statusCode: response.status, bodyText, message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("aborted") || error instanceof DOMException) {
      return { ok: false, reason: "request_timeout", message: `Timed out after ${timeoutMs}ms.` };
    }

    return { ok: false, reason: "transport_unavailable", message };
  } finally {
    clearTimeout(timeout);
  }
}

export function createNodeHostTransport(options: NodeHostTransportOptions): HostTransport {
  return {
    probe(port: number) {
      return requestJson(`http://127.0.0.1:${port}/probe`, { method: "GET" }, options.timeoutMs);
    },
    invokeOperation(port: number, request: UnityAgentKitOperationRequest) {
      return requestJson(
        `http://127.0.0.1:${port}/operations`,
        {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(request),
        },
        options.timeoutMs,
      );
    },
  };
}
