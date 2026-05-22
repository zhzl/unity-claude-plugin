import type {
  UnityAgentKitDiagnostic,
  UnityAgentKitResourceReference,
  UnityAgentKitResourceType,
  UnityAgentKitValidationStatus,
} from "../contracts/result.ts";

export type UnityAgentKitArtifactType = UnityAgentKitResourceType;
export type UnityAgentKitResourceCollection = "screenshots" | "test-reports" | "console-snapshots";
export type UnityAgentKitReadbackFailureReason =
  | "metadata_missing"
  | "file_missing"
  | "path_outside_artifact_root"
  | "validation_failed"
  | "unsupported_type"
  | "host_unavailable"
  | "artifact_lost";

export interface UnityAgentKitReportLocator {
  kind: "artifact_relative_path";
  relativePath: string;
}

export interface UnityAgentKitArtifactMetadata {
  schemaVersion: 1;
  id: string;
  type: UnityAgentKitArtifactType;
  uri: string;
  relativePath?: string;
  reportLocator?: UnityAgentKitReportLocator;
  createdAt: string;
  validationStatus: UnityAgentKitValidationStatus;
  hostId?: string;
  hostEpoch?: number;
  producerTool: string;
  producerAction: string;
  producerJobId?: string;
  sizeBytes?: number;
  diagnostics: UnityAgentKitDiagnostic[];
}

export interface ParsedUnityResource {
  uri: string;
  collection: UnityAgentKitResourceCollection;
  type: UnityAgentKitArtifactType;
  id: string;
  artifactId?: string;
  reportId?: string;
}

export type UnityAgentKitResourceReadResult =
  | {
      ok: true;
      resource: UnityAgentKitResourceReference;
      metadata: UnityAgentKitArtifactMetadata;
      filePath: string;
      contentBytes: Uint8Array;
    }
  | {
      ok: false;
      reason: UnityAgentKitReadbackFailureReason;
      diagnostic: UnityAgentKitDiagnostic;
    };
