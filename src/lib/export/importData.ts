import { z } from "zod";
import { pitchSchema, projectFormSchema } from "@/lib/validation/projectSchema";
import { pitchDeckDetailsSchema } from "@/lib/validation/pitchDeckSchema";
import { createProjectId } from "@/lib/storage/factory";
import type { Project } from "@/types";

export class ImportError extends Error {}

// pitchSchema (in projectFormSchema) only covers the narrative fields shared with the
// main wizard; the deck-only structured extras (traction history, named team/competitors,
// round terms) live in pitchDeckDetailsSchema and must be layered in so a round-trip
// export -> import doesn't silently drop them.
const importedPitchSchema = pitchSchema.extend(pitchDeckDetailsSchema.partial().shape);

const importedProjectSchema = projectFormSchema.extend({
  id: z.string().min(1),
  schemaVersion: z.number().int().positive().optional().default(1),
  revision: z.number().int().positive().optional().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  pitch: importedPitchSchema,
});

/** Matches the shape of ExportBundle (see exportData.ts) — only `project` is validated; the rest is recomputed. */
const importBundleSchema = z.object({ project: importedProjectSchema }).loose();

/**
 * Parses the JSON produced by downloadProjectJson() back into a fresh, savable Project.
 * Always assigns a new id and timestamps so importing a backup never clobbers an
 * existing project with a colliding id — pairs with buildExportBundle/downloadProjectJson.
 */
export function parseImportBundle(raw: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ImportError("This file isn't valid JSON.");
  }

  const result = importBundleSchema.safeParse(data);
  if (!result.success) {
    throw new ImportError("This file doesn't match the expected project export format.");
  }

  const now = new Date().toISOString();
  return {
    ...result.data.project,
    id: createProjectId(),
    schemaVersion: 1,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}
