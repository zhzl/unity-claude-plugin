import { publicResultStatusToIsError, type UnityAgentKitPublicResult } from "./result.ts";

export interface UnityAgentKitMcpTextContent {
  type: "text";
  text: string;
}

export interface UnityAgentKitMcpToolResult {
  structuredContent: UnityAgentKitPublicResult;
  content: UnityAgentKitMcpTextContent[];
  isError: boolean;
}

export function mapPublicResultToMcpToolResult(publicResult: UnityAgentKitPublicResult): UnityAgentKitMcpToolResult {
  return {
    structuredContent: publicResult,
    content: [{ type: "text", text: publicResult.summary }],
    isError: publicResultStatusToIsError(publicResult.status),
  };
}
