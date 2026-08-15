/** Ensure MCP structured outputs contain only valid JSON values. */
export function toJsonSafe(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, toJsonSafe(child)]),
    );
  }
  return value;
}

