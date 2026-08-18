import { toJsonSafe } from "./serialization";

export interface ResultExtras {
  /** Resource URIs a client can follow instead of making another tool call. */
  links?: Array<{ uri: string; name: string; description?: string }>;
  meta?: Record<string, unknown>;
}

export function result(data: unknown, summary = "Request completed.", extras: ResultExtras = {}) {
  const safeData = toJsonSafe(data);
  return {
    structuredContent: { data: safeData as never },
    content: [
      { type: "text" as const, text: `${summary}\n${JSON.stringify(safeData)}` },
      ...(extras.links ?? []).map((link) => ({
        type: "resource_link" as const,
        uri: link.uri,
        name: link.name,
        ...(link.description ? { description: link.description } : {}),
        mimeType: "application/json",
      })),
    ],
    _meta: { "ideaup/computedAt": new Date().toISOString(), "ideaup/schemaVersion": 1, ...(extras.meta ?? {}) },
  };
}

export function resourceResult(uri: string, data: unknown) {
  return {
    contents: [{
      uri, mimeType: "application/json", text: JSON.stringify(toJsonSafe(data)),
      annotations: { audience: ["user" as const, "assistant" as const], lastModified: new Date().toISOString() },
    }],
  };
}

export function projectLinks(projectId: string, kinds: string[]) {
  return kinds.map((kind) => ({
    uri: `ideaup://projects/${projectId}/${kind}`,
    name: `${kind} for project ${projectId}`,
  }));
}
