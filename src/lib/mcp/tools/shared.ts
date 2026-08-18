import { z } from "zod";
import type { Project } from "@/types";
import { SECTION_KEY_MAP } from "../paths";
import { assumptionUnit } from "../units";

export const jsonOutput = z.object({ data: z.json() });
export const projectId = z.object({ project_id: z.string().uuid() });
export const quality = z.enum(["known", "estimated", "unknown"]);

/**
 * Shared by `get_project`'s `sections` filter, `rawSections()`, and the
 * per-document resource templates, so a new stored slice only needs one entry
 * in SECTION_KEY_MAP to become readable through every MCP surface at once.
 * Financial Model has no entry — it's fully derived, exposed through
 * `get_project_analysis` and the `financial_model` resource instead.
 */
export const sections = z.enum(Object.keys(SECTION_KEY_MAP) as [string, ...string[]]);

export const businessModel = z.enum([
  "saas", "subscription", "marketplace", "ecommerce", "one_time", "service", "usage_based", "other",
]);

export const readOnly = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;
export const writeHints = { readOnlyHint: false, destructiveHint: false, idempotentHint: true } as const;

function annotateAssumptions(value: unknown, path: string, includeUnknown: boolean): unknown {
  if (Array.isArray(value)) return value.map((item, index) => annotateAssumptions(item, `${path}.${index}`, includeUnknown));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("value" in record && "quality" in record) {
    if (!includeUnknown && record.quality === "unknown") return undefined;
    return { ...record, unit: assumptionUnit(path), description: `User-entered assumption: ${path}` };
  }
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, child]) => [key, annotateAssumptions(child, `${path}.${key}`, includeUnknown)])
      .filter(([, child]) => child !== undefined),
  );
}

export function rawSections(project: Project, requested?: string[], includeUnknown = true) {
  const names = requested?.length ? requested : Object.keys(SECTION_KEY_MAP);
  const selected: Record<string, unknown> = {};
  for (const name of names) {
    selected[name] = annotateAssumptions(project[SECTION_KEY_MAP[name as keyof typeof SECTION_KEY_MAP]], name, includeUnknown);
  }
  return selected;
}
