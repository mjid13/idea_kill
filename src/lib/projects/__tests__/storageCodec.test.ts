import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import { projectFromStoredRow, storedProjectData } from "../storageCodec";

const original = { ...process.env };

beforeEach(() => {
  process.env.PROJECT_ENCRYPTION_MODE = "required";
  process.env.PROJECT_ENCRYPTION_KEYS = JSON.stringify({ test: Buffer.alloc(32, 3).toString("base64") });
  process.env.PROJECT_ENCRYPTION_ACTIVE_KEY_ID = "test";
});

afterEach(() => {
  process.env = { ...original };
});

describe("project storage codec", () => {
  it("stores ciphertext and reconstructs the validated project", () => {
    const project = createEmptyProject();
    project.basicInfo.name = "Confidential Idea";
    project.onePager!.problem = "Sensitive reconciliation";
    const data = storedProjectData(project) as Record<string, unknown>;
    expect(data).toMatchObject({ _ideaup_encrypted: true, algorithm: "A256GCM", keyId: "test" });
    expect(JSON.stringify(data)).not.toContain("Sensitive reconciliation");

    const restored = projectFromStoredRow({
      id: project.id,
      name: project.basicInfo.name,
      schema_version: project.schemaVersion,
      revision: project.revision,
      data,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    });
    expect(restored).toEqual(project);
  });
});
