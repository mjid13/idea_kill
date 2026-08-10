import { createProjectId } from "@/lib/storage/factory";
import type { Project } from "@/types";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

/** The form shape matches Project minus the persistence-only fields (id/timestamps). */
export function projectToFormValues(project: Project): ProjectFormValues {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = project;
  void _id;
  void _createdAt;
  void _updatedAt;
  return rest as ProjectFormValues;
}

export function formValuesToProject(
  values: ProjectFormValues,
  existing?: Pick<Project, "id" | "createdAt">
): Project {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? createProjectId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...values,
  };
}
