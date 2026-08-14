import type { DocumentSlug } from "./registry";
import type { Project } from "@/types";

export type DocumentStatus = "not_started" | "in_progress" | "complete";

function statusFromFilled(filled: number, total: number): DocumentStatus {
  if (filled === 0) return "not_started";
  if (filled >= total) return "complete";
  return "in_progress";
}

/** Financial Model is always available — it's fully computed, never stored. */
export function computeDocumentStatus(slug: DocumentSlug, project: Project): DocumentStatus {
  switch (slug) {
    case "one-pager": {
      const d = project.onePager;
      if (!d) return "not_started";
      const filled = [d.problem, d.customer, d.differentiation].filter((v) => v && v.trim()).length;
      return statusFromFilled(filled, 3);
    }
    case "icp": {
      const d = project.icp;
      if (!d) return "not_started";
      const filled = [d.customerProfile, d.buyerDecisionMaker, d.painPoints, d.currentAlternatives, d.buyingTriggers].filter(
        (v) => v && v.trim()
      ).length;
      return statusFromFilled(filled, 5);
    }
    case "value-prop": {
      const d = project.valueProp;
      if (!d) return "not_started";
      const filled = [d.whatYouSell, d.customerOutcome, d.scope, d.whyBuyNow].filter((v) => v && v.trim()).length;
      return statusFromFilled(filled, 4);
    }
    case "validation-plan": {
      const d = project.validationPlan;
      if (!d) return "not_started";
      const filled =
        (d.interviewQuestions && d.interviewQuestions.length > 0 ? 1 : 0) +
        (d.targetInterviews ? 1 : 0) +
        (d.successFailureCriteria && d.successFailureCriteria.trim() ? 1 : 0);
      return statusFromFilled(filled, 3);
    }
    case "financial-model":
      return "complete";
    case "mvp-scope": {
      const d = project.mvpScope;
      if (!d) return "not_started";
      const filled =
        [d.mustHaveFunctionality, d.explicitlyExcluded, d.userFlow].filter((v) => v && v.trim()).length +
        (d.acceptanceCriteria && d.acceptanceCriteria.length > 0 ? 1 : 0);
      return statusFromFilled(filled, 4);
    }
    case "gtm-plan": {
      const d = project.gtmPlan;
      if (!d) return "not_started";
      const filled =
        [d.acquisitionChannels, d.salesProcess, d.messaging].filter((v) => v && v.trim()).length +
        (d.prospectList && d.prospectList.length > 0 ? 1 : 0) +
        (d.salesTargets ? 1 : 0);
      return statusFromFilled(filled, 5);
    }
    case "sales-docs": {
      const d = project.salesDocs;
      if (!d) return "not_started";
      const filled =
        (d.demoScript && d.demoScript.length > 0 ? 1 : 0) +
        (d.proposalTemplate && d.proposalTemplate.trim() ? 1 : 0) +
        (d.faq && d.faq.length > 0 ? 1 : 0);
      return statusFromFilled(filled, 3);
    }
    case "contract-terms": {
      const d = project.contractTerms;
      if (!d) return "not_started";
      const filled = [d.scope, d.payment, d.ip, d.liability, d.cancellation, d.supportTerms].filter((v) => v && v.trim()).length;
      return statusFromFilled(filled, 6);
    }
    case "pilot-report": {
      const d = project.pilotReport;
      if (!d) return "not_started";
      const filled =
        (d.whoContacted && d.whoContacted.trim() ? 1 : 0) +
        (d.whatHappened && d.whatHappened.length > 0 ? 1 : 0) +
        (d.salesResults && d.salesResults.trim() ? 1 : 0) +
        (d.customerFeedback && d.customerFeedback.length > 0 ? 1 : 0) +
        (d.decision ? 1 : 0);
      return statusFromFilled(filled, 5);
    }
  }
}
