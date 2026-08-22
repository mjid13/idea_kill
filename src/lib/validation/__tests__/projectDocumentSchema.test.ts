import { describe, expect, it } from "vitest";
import { exampleProject } from "@/lib/example";
import { createEmptyProject } from "@/lib/storage/factory";
import { projectDocumentSchema, projectFormSchema } from "../projectSchema";

describe("projectFormSchema", () => {
  it("normalizes an explicitly cleared preloaded range to a single number", () => {
    const formValue = {
      ...exampleProject,
      acquisition: {
        ...exampleProject.acquisition,
        newCustomersAcquiredMonthly: {
          ...exampleProject.acquisition.newCustomersAcquiredMonthly,
          range: null,
        },
      },
    };

    const parsed = projectFormSchema.parse(formValue);

    expect(parsed.acquisition.newCustomersAcquiredMonthly.value).toBe(30);
    expect(parsed.acquisition.newCustomersAcquiredMonthly.range).toBeUndefined();
  });

  it("preserves a range that was not cleared", () => {
    const parsed = projectFormSchema.parse(exampleProject);

    expect(parsed.acquisition.newCustomersAcquiredMonthly.range).toEqual({ low: 20, high: 45 });
  });
});

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
