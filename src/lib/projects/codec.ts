import { projectDocumentSchema, projectFormSchema } from "@/lib/validation/projectSchema";
import type { Project } from "@/types";

export interface ProjectRow {
  id: string;
  name: string;
  schema_version: number;
  revision: number;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export function projectFromRow(row: ProjectRow): Project {
  return projectDocumentSchema.parse({
    ...projectFormSchema.parse(row.data),
    id: row.id,
    schemaVersion: row.schema_version,
    revision: Number(row.revision),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }) as Project;
}

export function projectData(project: Project) {
  return projectFormSchema.parse(project);
}
