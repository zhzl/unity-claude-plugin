import { readFile } from "node:fs/promises";
import { artifactRootForProject, metadataRelativePathForParsedResource, resolveArtifactRelativePath } from "../artifacts/paths.ts";
import { validateArtifactMetadata } from "../artifacts/metadata.ts";
import type { UnityAgentKitResourceReadResult, UnityAgentKitReadbackFailureReason } from "../artifacts/types.ts";
import type { UnityAgentKitDiagnostic, UnityAgentKitResourceReference } from "../contracts/result.ts";
import { parseUnityResourceUri } from "./uri.ts";

export async function readUnityResource(projectRoot: string, uri: string): Promise<UnityAgentKitResourceReadResult> {
  const parsed = parseUnityResourceUri(uri);
  if (!parsed.ok) {
    return fail("unsupported_type", "resource.unsupported_type", `Resource URI is not supported in Phase 5B: ${uri}`);
  }

  const artifactRoot = artifactRootForProject(projectRoot);
  const metadataPathResolution = resolveArtifactRelativePath(artifactRoot, metadataRelativePathForParsedResource(parsed.resource));
  if (!metadataPathResolution.ok) {
    return fail(metadataPathResolution.reason, "resource.metadata_path_invalid", "Resource metadata path is outside the artifact root.");
  }

  let metadataJson: string;
  try {
    metadataJson = await readFile(metadataPathResolution.path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("metadata_missing", "resource.metadata_missing", `Resource metadata is missing for ${uri}.`);
    }

    return fail("validation_failed", "resource.metadata_read_failed", formatErrorMessage(error));
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(metadataJson);
  } catch {
    return fail("validation_failed", "resource.metadata_invalid_json", `Resource metadata is not valid JSON for ${uri}.`);
  }

  const validation = validateArtifactMetadata(metadata, parsed.resource);
  if (!validation.ok) {
    return validation;
  }

  const payloadPathResolution = resolveArtifactRelativePath(artifactRoot, validation.payloadRelativePath);
  if (!payloadPathResolution.ok) {
    return fail(payloadPathResolution.reason, "resource.payload_path_invalid", "Resource payload path is outside the artifact root.");
  }

  let contentBytes: Uint8Array;
  try {
    contentBytes = await readFile(payloadPathResolution.path);
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("file_missing", "resource.file_missing", `Resource payload is missing for ${uri}.`);
    }

    return fail("artifact_lost", "resource.file_read_failed", formatErrorMessage(error));
  }

  if (contentBytes.byteLength === 0) {
    return fail("validation_failed", "resource.content_empty", `Resource payload is empty for ${uri}.`);
  }

  return {
    ok: true,
    resource: toResourceReference(validation.metadata),
    metadata: validation.metadata,
    filePath: payloadPathResolution.path,
    contentBytes,
  };
}

function toResourceReference(metadata: { uri: string; type: string; id: string; validationStatus: string }): UnityAgentKitResourceReference {
  return {
    uri: metadata.uri,
    type: metadata.type as UnityAgentKitResourceReference["type"],
    ...(metadata.type === "test_report" ? { reportId: metadata.id } : { artifactId: metadata.id }),
    validationStatus: metadata.validationStatus as UnityAgentKitResourceReference["validationStatus"],
    summary: `${metadata.type} resource ${metadata.id} is readable.`,
  };
}

function fail(reason: UnityAgentKitReadbackFailureReason, code: string, message: string): UnityAgentKitResourceReadResult {
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return String(error);
}
