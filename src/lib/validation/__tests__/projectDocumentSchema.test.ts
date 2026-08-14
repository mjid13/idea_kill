import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import { projectDocumentSchema } from "../projectSchema";

describe("projectDocumentSchema", () => {
  it("validates revision metadata and structured pitch extras", () => {
    const project = createEmptyProject();
    project.basicInfo.name = "Validated";
    project.pitch = {
      ...project.pitch,
      tractionHistory: [{ id: "m1", label: "Month 1", customers: 3, mrr: 100 }],
      teamMembers: [{ id: "t1", name: "Ada", role: "Founder" }],
      competitors: [{ id: "c1", name: "Incumbent", edge: "Faster" }],
      round: { roundType: "seed", valuation: 1_000_000 },
    };
    expect(projectDocumentSchema.parse(project).pitch?.round?.roundType).toBe("seed");
  });

  it("rejects invalid revisions", () => {
    expect(projectDocumentSchema.safeParse({ ...createEmptyProject(), revision: 0 }).success).toBe(false);
  });

  it("accepts PostgreSQL timestamptz values with numeric offsets", () => {
    const project = {
      ...createEmptyProject(),
      basicInfo: { ...createEmptyProject().basicInfo, name: "Offset timestamps" },
      createdAt: "2026-08-14T10:30:00.123456+00:00",
      updatedAt: "2026-08-14T14:30:00+04:00",
    };

    expect(projectDocumentSchema.safeParse(project).success).toBe(true);
  });
});
