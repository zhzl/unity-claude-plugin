import path from "node:path";
import type { ParsedUnityResource, UnityAgentKitReadbackFailureReason } from "./types.ts";

export function artifactRootForProject(projectRoot: string): string {
  return path.join(projectRoot, ".ai-debug", "unity-agent-kit", "artifacts");
}

export function metadataRelativePathForParsedResource(resource: ParsedUnityResource): string {
  return path.posix.join("metadata", resource.collection, `${resource.id}.json`);
}

export function resolveArtifactRelativePath(
  artifactRoot: string,
  relativePath: string,
): { ok: true; path: string } | { ok: false; reason: UnityAgentKitReadbackFailureReason } {
  if (!isSafeArtifactRelativePath(relativePath)) {
    return { ok: false, reason: "path_outside_artifact_root" };
  }

  const root = path.resolve(artifactRoot);
  const target = path.resolve(root, relativePath.split("/").join(path.sep));
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (target !== root && !target.startsWith(rootPrefix)) {
    return { ok: false, reason: "path_outside_artifact_root" };
  }

  return { ok: true, path: target };
}

export function isSafeArtifactRelativePath(relativePath: string): boolean {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return false;
  }

  if (relativePath.includes("\\") || relativePath.includes("\0")) {
    return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(relativePath);
  } catch {
    return false;
  }

  if (decoded !== relativePath && hasUnsafePathSegments(decoded)) {
    return false;
  }

  if (path.isAbsolute(relativePath) || /^[A-Za-z]:/.test(relativePath)) {
    return false;
  }

  return !hasUnsafePathSegments(relativePath);
}

function hasUnsafePathSegments(value: string): boolean {
  if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/.test(value)) {
    return true;
  }

  const parts = value.split("/");
  return parts.some((part) => part.length === 0 || part === "." || part === "..");
}
