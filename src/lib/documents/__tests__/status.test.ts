import { describe, expect, it } from "vitest";
import { createEmptyProject } from "@/lib/storage/factory";
import type { Project } from "@/types";
import { DOCUMENT_REGISTRY } from "../registry";
import { computeDocumentCompleteness, computeDocumentStatus } from "../status";

function project(): Project {
  const value = createEmptyProject();
  value.basicInfo.name = "Test";
  return value;
}

describe("document completeness", () => {
  it("reports not_started with zero filled fields on a fresh project", () => {
    for (const meta of DOCUMENT_REGISTRY) {
      const { filled, total } = computeDocumentCompleteness(meta.slug, project());
      expect(total, meta.slug).toBeGreaterThan(0);
      if (meta.slug === "financial-model") {
        // Fully derived — always available, never "started".
        expect(computeDocumentStatus(meta.slug, project())).toBe("complete");
      } else {
        expect(filled, meta.slug).toBe(0);
        expect(computeDocumentStatus(meta.slug, project()), meta.slug).toBe("not_started");
      }
    }
  });

  it("derives the status from the same counts it reports", () => {
    const value = project();
    value.icp = { customerProfile: "SMB", buyerDecisionMaker: "Owner" };
    expect(computeDocumentCompleteness("icp", value)).toEqual({ filled: 2, total: 5 });
    expect(computeDocumentStatus("icp", value)).toBe("in_progress");

    value.valueProp = { whatYouSell: "a", customerOutcome: "b", scope: "c", whyBuyNow: "d" };
    expect(computeDocumentStatus("value-prop", value)).toBe("complete");
  });

  it("counts a list as one filled field, matching the app's badges", () => {
    const value = project();
    value.validationPlan = { interviewQuestions: [{ id: "q1", text: "Would you pay?" }] };
    expect(computeDocumentCompleteness("validation-plan", value)).toEqual({ filled: 1, total: 3 });
  });

  it("ignores whitespace-only text", () => {
    const value = project();
    value.onePager = { problem: "   ", customer: "SMBs" };
    expect(computeDocumentCompleteness("one-pager", value)).toEqual({ filled: 1, total: 3 });
  });
});
