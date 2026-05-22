import { isSafeArtifactRelativePath } from "./paths.ts";
import type { ParsedUnityResource, UnityAgentKitArtifactMetadata, UnityAgentKitReadbackFailureReason } from "./types.ts";
import type { UnityAgentKitDiagnostic } from "../contracts/result.ts";

export type MetadataValidationResult =
  | { ok: true; metadata: UnityAgentKitArtifactMetadata; payloadRelativePath: string }
  | { ok: false; reason: UnityAgentKitReadbackFailureReason; diagnostic: UnityAgentKitDiagnostic };

export function validateArtifactMetadata(value: unknown, resource: ParsedUnityResource): MetadataValidationResult {
  if (typeof value !== "object" || value === null) {
    return fail("validation_failed", "artifact.metadata_invalid_shape", "Artifact metadata is not an object.");
  }

  const metadata = value as Record<string, unknown>;
  if (!(
    metadata.schemaVersion === 1 &&
    metadata.id === resource.id &&
    metadata.type === resource.type &&
    metadata.uri === resource.uri &&
    typeof metadata.createdAt === "string" &&
    metadata.createdAt.length > 0 &&
    (metadata.validationStatus === "valid" || metadata.validationStatus === "invalid" || metadata.validationStatus === "uncertain") &&
    typeof metadata.producerTool === "string" &&
    metadata.producerTool.length > 0 &&
    typeof metadata.producerAction === "string" &&
    metadata.producerAction.length > 0 &&
    Array.isArray(metadata.diagnostics) &&
    metadata.diagnostics.every(isDiagnostic) &&
    (metadata.hostId === undefined || typeof metadata.hostId === "string") &&
    (metadata.hostEpoch === undefined || (typeof metadata.hostEpoch === "number" && Number.isInteger(metadata.hostEpoch))) &&
    (metadata.producerJobId === undefined || typeof metadata.producerJobId === "string") &&
    (metadata.sizeBytes === undefined || (typeof metadata.sizeBytes === "number" && metadata.sizeBytes > 0))
  )) {
    return fail("validation_failed", "artifact.metadata_invalid_shape", "Artifact metadata failed Phase 5B schema validation.");
  }

  if (metadata.validationStatus !== "valid") {
    return fail("validation_failed", "artifact.validation_status_not_valid", "Artifact metadata validationStatus is not valid.");
  }

  const payloadRelativePath = payloadPathFromMetadata(metadata, resource);
  if (payloadRelativePath === null) {
    return fail("path_outside_artifact_root", "artifact.locator_invalid", "Artifact metadata locator is invalid for the resource type.");
  }

  if (metadata.sizeBytes !== undefined && metadata.sizeBytes <= 0) {
    return fail("validation_failed", "artifact.size_invalid", "Artifact metadata sizeBytes must be greater than zero.");
  }

  return { ok: true, metadata: metadata as unknown as UnityAgentKitArtifactMetadata, payloadRelativePath };
}

function payloadPathFromMetadata(metadata: Record<string, unknown>, resource: ParsedUnityResource): string | null {
  if (resource.type === "test_report") {
    const locator = metadata.reportLocator;
    if (typeof locator !== "object" || locator === null) {
      return null;
    }

    const reportLocator = locator as Record<string, unknown>;
    if (reportLocator.kind !== "artifact_relative_path" || typeof reportLocator.relativePath !== "string") {
      return null;
    }

    if (!reportLocator.relativePath.startsWith("test-reports/") || !isSafeArtifactRelativePath(reportLocator.relativePath)) {
      return null;
    }

    return reportLocator.relativePath;
  }

  if (typeof metadata.relativePath !== "string" || !isSafeArtifactRelativePath(metadata.relativePath)) {
    return null;
  }

  const expectedPrefix = resource.type === "screenshot" ? "screenshots/" : "console-snapshots/";
  return metadata.relativePath.startsWith(expectedPrefix) ? metadata.relativePath : null;
}

function fail(reason: UnityAgentKitReadbackFailureReason, code: string, message: string): MetadataValidationResult {
  return {
    ok: false,
    reason,
    diagnostic: {
      source: "resource-readback",
      severity: "error",
      code,
      message,
    },
  };
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
