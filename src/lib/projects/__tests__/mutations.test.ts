import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import { applyProjectChanges } from "../mutations";

function validProject() { const value = createEmptyProject(); value.basicInfo.name = "Test"; return value; }

describe("MCP project mutations", () => {
  it("applies allowlisted assumption changes without promoting quality", () => {
    const project = validProject();
    const result = applyProjectChanges(project, [{ path: "pricing.productPrice.value", value: 42 }]);
    expect(result.project.pricing.productPrice).toEqual({ value: 42, quality: "unknown" });
    expect(project.pricing.productPrice.value).toBe(0);
  });

  it.each(["id", "revision", "updatedAt", "metrics.revenue.mrr", "pricing.notAField"])(
    "rejects non-writable path %s", (path) => {
      expect(() => applyProjectChanges(validProject(), [{ path, value: 1 }])).toThrow(/not writable/);
    },
  );

  it("is atomic when a later change is invalid", () => {
    const project = validProject();
    expect(() => applyProjectChanges(project, [
      { path: "pricing.productPrice.value", value: 42 },
      { path: "id", value: "replacement" },
    ])).toThrow();
    expect(project.pricing.productPrice.value).toBe(0);
  });

  it("allows writing business-document fields, defaulted empty by createEmptyProject", () => {
    const project = validProject();
    const result = applyProjectChanges(project, [{ path: "onePager.problem", value: "Customers can't find X" }]);
    expect(result.project.onePager?.problem).toBe("Customers can't find X");
    expect(project.onePager?.problem).toBe("");
  });

  it("rejects a non-existent business-document field", () => {
    expect(() => applyProjectChanges(validProject(), [{ path: "onePager.notAField", value: 1 }])).toThrow(/not writable/);
  });

  it("turns a point estimate into a range, creating the missing range container", () => {
    const project = validProject();
    const result = applyProjectChanges(project, [
      { path: "pricing.productPrice.value", value: 4000 },
      { path: "pricing.productPrice.range.low", value: 2500 },
      { path: "pricing.productPrice.range.high", value: 5000 },
    ]);
    expect(result.project.pricing.productPrice.range).toEqual({ low: 2500, high: 5000 });
    expect(project.pricing.productPrice.range).toBeUndefined();
  });

  it("rejects a range whose most likely value falls outside it", () => {
    expect(() =>
      applyProjectChanges(validProject(), [
        { path: "pricing.productPrice.value", value: 4000 },
        { path: "pricing.productPrice.range.high", value: 3000 },
      ])
    ).toThrow(/invalid/i);
  });

  it("rejects a range bound on a field that is not an assumption", () => {
    expect(() => applyProjectChanges(validProject(), [{ path: "onePager.problem.range.low", value: 1 }])).toThrow(/not writable/);
  });
});
