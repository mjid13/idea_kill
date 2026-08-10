import type { Project } from "@/types";

/**
 * Storage-agnostic contract for reading/writing projects. The MVP ships
 * `LocalStorageProjectRepository`; swapping in a Postgres/Supabase-backed
 * implementation later means writing a new class against this interface —
 * no application code above the repository needs to change.
 */
export interface ProjectRepository {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}
