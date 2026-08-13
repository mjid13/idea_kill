import type { Project } from "@/types";

/**
 * Storage-agnostic contract for authenticated project persistence. The browser adapter calls request-scoped APIs while server and MCP code use the Supabase repository directly.
 */
export interface ProjectRepository {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  saveImported?(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}
