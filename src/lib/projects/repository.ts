import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { projectDocumentSchema } from "@/lib/validation/projectSchema";
import type { Project } from "@/types";
import { projectData, projectFromRow, type ProjectRow } from "./codec";
import { DomainError } from "./errors";

export class SupabaseProjectRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<Project[]> {
    const { data, error } = await this.db.from("projects").select("*").order("updated_at", { ascending: false });
    if (error) throw new DomainError("FORBIDDEN", error.message);
    return (data as ProjectRow[]).map(projectFromRow);
  }

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.db.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw new DomainError("FORBIDDEN", error.message);
    return data ? projectFromRow(data as ProjectRow) : null;
  }

  async save(input: Project): Promise<Project> {
    const project = projectDocumentSchema.parse(input) as Project;
    const existing = await this.getById(project.id);
    if (!existing) {
      const { data, error } = await this.db.from("projects").insert({
        id: project.id,
        name: project.basicInfo.name,
        schema_version: project.schemaVersion,
        revision: 1,
        data: projectData(project),
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      }).select("*").single();
      if (error) throw new DomainError("VALIDATION_FAILED", error.message);
      return projectFromRow(data as ProjectRow);
    }
    const { data, error } = await this.db.from("projects").update({
      name: project.basicInfo.name,
      schema_version: project.schemaVersion,
      revision: existing.revision + 1,
      data: projectData(project),
      updated_at: new Date().toISOString(),
    }).eq("id", project.id).eq("revision", project.revision).select("*").maybeSingle();
    if (error) throw new DomainError("VALIDATION_FAILED", error.message);
    if (!data) throw new DomainError("REVISION_CONFLICT", "Project changed since it was loaded.", {
      currentRevision: existing.revision, updatedAt: existing.updatedAt,
    });
    return projectFromRow(data as ProjectRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("projects").delete().eq("id", id);
    if (error) throw new DomainError("FORBIDDEN", error.message);
  }
}
