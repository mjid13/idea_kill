import { projectFormSchema } from "@/lib/validation/projectSchema";
import { leafPaths } from "@/lib/projects/mutations";
import { EDITABLE_LISTS } from "@/lib/projects/listMutations";
import type { Project } from "@/types";
import { publicMcpPath } from "../paths";
import { assumptionUnit } from "../units";

export interface WritablePathsOptions { section?: string; includeValues: boolean; limit: number }

function readValue(project: Project, internalPath: string): unknown {
  let current: unknown = project;
  for (const segment of internalPath.split(".")) {
    const match = /^([^[\]]+)(?:\[([^[\]]+)\])?$/.exec(segment);
    if (!match || !current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[match[1]];
    if (match[2] !== undefined) {
      if (!Array.isArray(current)) return undefined;
      current = current.find((item) => (item as { id?: string })?.id === match[2]) ?? current[Number(match[2])];
    }
  }
  return current;
}

function kindOf(path: string, value: unknown): "assumption" | "list" | "scalar" {
  if (Array.isArray(value)) return "list";
  return path.endsWith(".value") || path.endsWith(".range.low") || path.endsWith(".range.high") ? "assumption" : "scalar";
}

/**
 * Every path `update_project` will accept, with its unit. Without this a client
 * has to guess a field name and learn from a rejection; the guessing is where
 * agent writes actually fail.
 */
export function writablePathsView(project: Project, options: WritablePathsOptions) {
  const raw = projectFormSchema.parse(project);
  const all = [...leafPaths(raw)].sort();
  const rows = [];
  for (const internalPath of all) {
    const path = publicMcpPath(internalPath);
    if (options.section && !path.startsWith(`${options.section}.`) && path !== options.section) continue;
    if (rows.length >= options.limit) return { paths: rows, truncated: true, editableLists: Object.keys(EDITABLE_LISTS) };
    const value = readValue(project, internalPath);
    rows.push({
      path,
      kind: kindOf(path, value),
      unit: assumptionUnit(path),
      ...(options.includeValues ? { value: value as never } : {}),
    });
  }
  return { paths: rows, truncated: false, editableLists: Object.keys(EDITABLE_LISTS) };
}
