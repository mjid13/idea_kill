import { projectFormSchema } from "@/lib/validation/projectSchema";
import type { Project } from "@/types";
import { DomainError } from "./errors";

export interface FieldChange { path: string; value: unknown; quality?: "known" | "estimated" | "unknown" }

const FORBIDDEN = new Set(["id", "user_id", "createdAt", "updatedAt", "schemaVersion", "revision", "metrics", "score", "analysis"]);

/** Guards against a pathological document turning path discovery into a hang. */
const MAX_PATHS = 5000;

/**
 * Every writable leaf, plus each array's own path so a client can still replace
 * a whole list in one change. Array items that carry a stable `id` are also
 * descended into as `list[<id>].field`, which is what makes a single revenue
 * stream addressable without rewriting its siblings.
 */
export function leafPaths(value: unknown, prefix = "", output = new Set<string>()): Set<string> {
  if (output.size >= MAX_PATHS) return output;
  if (!value || typeof value !== "object") {
    if (prefix) output.add(prefix);
    return output;
  }
  if (Array.isArray(value)) {
    if (prefix) output.add(prefix);
    for (const item of value) {
      const id = item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id : null;
      if (id) leafPaths(item, `${prefix}[${id}]`, output);
    }
    return output;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    // An item's own id addresses it; letting it be rewritten would orphan every
    // path a client is holding.
    if (key === "id" && prefix.endsWith("]")) continue;
    leafPaths(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const RANGE_LEAF = /\.range\.(low|high)$/;
const SEGMENT = /^([^[\]]+)(?:\[([^[\]]+)\])?$/;

export interface ResolvedSegment { container: Record<string, unknown>; key: string | number }

/**
 * Resolves one dotted segment, which may carry an item selector:
 * `revenueStreams[rs_1]` or `stages[0]`. Ids win over indexes so a client that
 * holds an id keeps addressing the same item after a reorder; a numeric
 * fallback exists because `collectRangedFields` already emits `[0]` paths.
 */
export function resolveSegment(parent: Record<string, unknown>, segment: string): ResolvedSegment | null {
  const match = SEGMENT.exec(segment);
  if (!match) return null;
  const [, name, selector] = match;
  if (selector === undefined) return { container: parent, key: name };
  const list = parent[name];
  if (!Array.isArray(list)) return null;
  const byId = list.findIndex((item) => item && typeof item === "object" && (item as { id?: unknown }).id === selector);
  const index = byId >= 0 ? byId : /^\d+$/.test(selector) ? Number(selector) : -1;
  if (index < 0 || index >= list.length) return null;
  return { container: list as unknown as Record<string, unknown>, key: index };
}

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

function rootName(path: string): string {
  return path.split(".")[0].split("[")[0];
}

export function applyProjectChanges(project: Project, changes: FieldChange[]): { project: Project; diff: FieldChange[] } {
  if (!changes.length) throw new DomainError("VALIDATION_FAILED", "At least one change is required.");
  const raw = projectFormSchema.parse(project);
  const allowed = leafPaths(raw);
  const next = clone(raw) as Record<string, unknown>;
  const diff: FieldChange[] = [];
  for (const change of changes) {
    const segments = change.path.split(".");
    if (!segments.length || FORBIDDEN.has(rootName(change.path)) || !isWritablePath(change.path, allowed)) {
      throw new DomainError("VALIDATION_FAILED", `Field is not writable: ${change.path}`);
    }
    let parent = next;
    for (const segment of segments.slice(0, -1)) {
      // Materialize the `range` container the first time a bound is written.
      if (segment === "range" && parent.range === undefined && RANGE_LEAF.test(change.path)) {
        const likely = typeof parent.value === "number" ? parent.value : 0;
        parent.range = { low: likely, high: likely };
      }
      const resolved = resolveSegment(parent, segment);
      const child = resolved ? (resolved.container as Record<string, unknown>)[resolved.key] : undefined;
      if (!child || typeof child !== "object" || Array.isArray(child)) {
        throw new DomainError("VALIDATION_FAILED", `Field is not writable: ${change.path}`);
      }
      parent = child as Record<string, unknown>;
    }
    const last = resolveSegment(parent, segments.at(-1)!);
    if (!last) throw new DomainError("VALIDATION_FAILED", `Field is not writable: ${change.path}`);
    const container = last.container as Record<string | number, unknown>;
    const previous = container[last.key];
    container[last.key] = change.value;
    if (change.quality !== undefined) {
      const assumptionPath = segments.at(-1) === "value";
      if (!assumptionPath) throw new DomainError("VALIDATION_FAILED", "Quality is only valid with an assumption value path.");
      (parent as Record<string, unknown>).quality = change.quality;
    }
    const diffEntry = { path: change.path, value: change.value, previous } as FieldChange & { previous: unknown };
    if (change.quality !== undefined) diffEntry.quality = change.quality;
    diff.push(diffEntry);
  }
  return { project: validate(project, next), diff };
}

/**
 * Re-parses the whole document, so array length caps and cross-field refinements
 * in `projectFormSchema` apply to every mutation path — scalar or list — and a
 * rejected change leaves the caller's project untouched (everything above
 * mutates a clone).
 */
export function validate(project: Project, candidate: Record<string, unknown>): Project {
  const validated = projectFormSchema.safeParse(candidate);
  if (!validated.success) throw new DomainError("VALIDATION_FAILED", "Changes make the project invalid.", {
    issues: validated.error.issues,
  });
  return { ...project, ...validated.data, basicInfo: validated.data.basicInfo };
}

export { clone as cloneProjectData };
