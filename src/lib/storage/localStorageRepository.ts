import type { Project } from "@/types";
import type { ProjectRepository } from "./types";

const STORAGE_KEY = "pvc:projects:v1";

function readAll(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(projects: Project[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

/** MVP persistence backend. Wraps synchronous localStorage in the async ProjectRepository contract. */
export class LocalStorageProjectRepository implements ProjectRepository {
  async getAll(): Promise<Project[]> {
    return readAll().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getById(id: string): Promise<Project | null> {
    return readAll().find((p) => p.id === id) ?? null;
  }

  async save(project: Project): Promise<void> {
    const all = readAll();
    const index = all.findIndex((p) => p.id === project.id);
    const updated: Project = { ...project, updatedAt: new Date().toISOString() };
    if (index === -1) {
      all.push(updated);
    } else {
      all[index] = updated;
    }
    writeAll(all);
  }

  async delete(id: string): Promise<void> {
    writeAll(readAll().filter((p) => p.id !== id));
  }
}

export const projectRepository = new LocalStorageProjectRepository();
