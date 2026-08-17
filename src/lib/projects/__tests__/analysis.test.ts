import { describe, expect, it } from "vitest";
import { analyzeProject } from "../analysis";
import { exampleProject } from "@/lib/example";
import { known, type Project } from "@/types";

describe("analyzeProject insights", () => {
  it("interpolates ICU-typed placeholders ({key, number}) instead of leaking them", () => {
    const project: Project = {
      ...exampleProject,
      market: { ...exampleProject.market, averageAnnualCustomerSpend: known(6000) },
    };
    const { insights } = analyzeProject(project);
    const contradiction = (insights.contradictions as Array<{ message: string; detail?: string }>).find((i) =>
      i.message.includes("TAM revenue per customer")
    );
    expect(contradiction).toBeDefined();
    expect(contradiction?.detail).toContain("USD 6000");
    expect(contradiction?.detail).toContain("USD 600");
    expect(contradiction?.detail).not.toMatch(/\{/);
  });

  it("keeps interpolating plain placeholders in decision reasons", () => {
    const { decision } = analyzeProject(exampleProject);
    for (const reason of decision.reasons) {
      expect(reason).not.toMatch(/\{/);
    }
  });
});
