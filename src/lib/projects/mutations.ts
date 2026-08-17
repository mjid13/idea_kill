import { projectFormSchema } from "@/lib/validation/projectSchema";
import type { Project } from "@/types";
import { DomainError } from "./errors";

export interface FieldChange { path: string; value: unknown; quality?: "known" | "estimated" | "unknown" }

const FORBIDDEN = new Set(["id", "user_id", "createdAt", "updatedAt", "schemaVersion", "revision", "metrics", "score", "analysis"]);

function leafPaths(value: unknown, prefix = "", output = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) output.add(prefix);
    return output;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) output.add(path);
    else leafPaths(child, path, output);
  }
  return output;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const RANGE_LEAF = /\.range\.(low|high)$/;

/**
 * Assumption ranges are optional, so an assumption that is still a single
 * number has no `range` leaf to discover. Writing `…​.range.low` / `…​.range.high`
 * is allowed whenever the assumption itself exists, which is what lets a client
 * turn a point estimate into a low/high range in one call.
 */
function isWritablePath(path: string, allowed: Set<string>): boolean {
  if (allowed.has(path)) return true;
  const match = path.match(RANGE_LEAF);
  if (!match) return false;
  return allowed.has(`${path.slice(0, -match[0].length)}.value`);
}

export function applyProjectChanges(project: Project, changes: FieldChange[]): { project: Project; diff: FieldChange[] } {
  if (!changes.length) throw new DomainError("VALIDATION_FAILED", "At least one change is required.");
  const raw = projectFormSchema.parse(project);
  const allowed = leafPaths(raw);
  const next = clone(raw) as Record<string, unknown>;
  const diff: FieldChange[] = [];
  for (const change of changes) {
    const segments = change.path.split(".");
    if (!segments.length || FORBIDDEN.has(segments[0]) || !isWritablePath(change.path, allowed)) {
      throw new DomainError("VALIDATION_FAILED", `Field is not writable: ${change.path}`);
    }
    let parent = next;
    for (const segment of segments.slice(0, -1)) {
      // Materialize the `range` container the first time a bound is written.
      if (segment === "range" && parent.range === undefined && RANGE_LEAF.test(change.path)) {
        const likely = typeof parent.value === "number" ? parent.value : 0;
        parent.range = { low: likely, high: likely };
      }
      const child = parent[segment];
      if (!child || typeof child !== "object" || Array.isArray(child)) {
        throw new DomainError("VALIDATION_FAILED", `Field is not writable: ${change.path}`);
      }
      parent = child as Record<string, unknown>;
    }
    const key = segments.at(-1)!;
    const previous = parent[key];
    parent[key] = change.value;
    if (change.quality !== undefined) {
      const assumptionPath = segments.at(-1) === "value";
      if (!assumptionPath) throw new DomainError("VALIDATION_FAILED", "Quality is only valid with an assumption value path.");
      parent.quality = change.quality;
    }
    const diffEntry = { path: change.path, value: change.value, previous } as FieldChange & { previous: unknown };
    if (change.quality !== undefined) diffEntry.quality = change.quality;
    diff.push(diffEntry);
  }
  const validated = projectFormSchema.safeParse(next);
  if (!validated.success) throw new DomainError("VALIDATION_FAILED", "Changes make the project invalid.", {
    issues: validated.error.issues,
  });
  return {
    project: { ...project, ...validated.data, basicInfo: validated.data.basicInfo },
    diff,
  };
}
