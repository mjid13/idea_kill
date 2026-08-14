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
});
