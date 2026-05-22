import type { ParsedUnityResource, UnityAgentKitResourceCollection } from "../artifacts/types.ts";
import type { UnityAgentKitResourceType } from "../contracts/result.ts";

const collectionByType = {
  screenshot: "screenshots",
  test_report: "test-reports",
  console_snapshot: "console-snapshots",
} as const satisfies Record<UnityAgentKitResourceType, UnityAgentKitResourceCollection>;

const typeByCollection = {
  screenshots: "screenshot",
  "test-reports": "test_report",
  "console-snapshots": "console_snapshot",
} as const satisfies Record<UnityAgentKitResourceCollection, UnityAgentKitResourceType>;

export type ResourceUriParseResult =
  | { ok: true; resource: ParsedUnityResource }
  | { ok: false; reason: "unsupported_type" };

export function formatUnityResourceUri(type: UnityAgentKitResourceType, id: string): string {
  if (!isSafeResourceId(id)) {
    throw new Error(`Resource id is not safe: ${id}`);
  }

  return `unity://${collectionByType[type]}/${id}`;
}

export function parseUnityResourceUri(uri: string): ResourceUriParseResult {
  const match = /^unity:\/\/([^/]+)\/([^/?#]+)$/.exec(uri);
  if (match === null) {
    return { ok: false, reason: "unsupported_type" };
  }

  const collection = match[1];
  const id = match[2];
  if (!isSupportedCollection(collection) || !isSafeResourceId(id)) {
    return { ok: false, reason: "unsupported_type" };
  }

  const type = typeByCollection[collection];
  return {
    ok: true,
    resource: {
      uri,
      collection,
      type,
      id,
      ...(type === "test_report" ? { reportId: id } : { artifactId: id }),
    },
  };
}

function isSupportedCollection(value: string): value is UnityAgentKitResourceCollection {
  return value === "screenshots" || value === "test-reports" || value === "console-snapshots";
}

function isSafeResourceId(id: string): boolean {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)) {
    return false;
  }

  return !id.includes("%") && !id.includes(".") && !id.includes("/") && !id.includes("\\") && !/^[A-Za-z]:/.test(id);
}
