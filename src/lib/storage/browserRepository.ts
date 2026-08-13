"use client";

import type { Project } from "@/types";
import type { ProjectRepository } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message ?? "Project request failed.");
  return body as T;
}

class BrowserProjectRepository implements ProjectRepository {
  getAll() { return request<Project[]>("/api/projects"); }
  async getById(id: string) {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) return null;
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Project request failed.");
    return body as Project;
  }
  async save(project: Project) {
    const saved = await request<Project>(`/api/projects/${encodeURIComponent(project.id)}`, {
      method: "PUT", body: JSON.stringify(project),
    });
    Object.assign(project, saved);
  }
  async saveImported(project: Project) {
    const saved = await request<Project>(`/api/projects/${encodeURIComponent(project.id)}`, {
      method: "PUT", body: JSON.stringify(project), headers: { "x-project-action": "import" },
    });
    Object.assign(project, saved);
  }
  async delete(id: string) {
    await request<unknown>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

export const projectRepository = new BrowserProjectRepository();
