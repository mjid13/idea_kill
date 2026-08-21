import type { DocumentSlug } from "./registry";
import type { Project } from "@/types";

export type DocumentStatus = "not_started" | "in_progress" | "complete";

export interface DocumentCompleteness {
  filled: number;
  total: number;
}

function statusFromFilled(filled: number, total: number): DocumentStatus {
  if (filled === 0) return "not_started";
  if (filled >= total) return "complete";
  return "in_progress";
}

function filledText(...values: Array<string | undefined>): number {
  return values.filter((v) => v && v.trim()).length;
}

function filledList(list: unknown[] | undefined): number {
  return list && list.length > 0 ? 1 : 0;
}

/**
 * Filled-field counts per document. The tri-state status is derived from this
 * rather than the other way round, so a client can be told "3 of 5" instead of
 * a bare "in progress".
 */
export function computeDocumentCompleteness(slug: DocumentSlug, project: Project): DocumentCompleteness {
  switch (slug) {
    case "one-pager": {
      const d = project.onePager;
      return { filled: d ? filledText(d.problem, d.customer, d.differentiation, d.useOfFunds) : 0, total: 4 };
    }
    case "icp": {
      const d = project.icp;
      return {
        filled: d ? filledText(d.customerProfile, d.buyerDecisionMaker, d.painPoints, d.currentAlternatives, d.buyingTriggers) : 0,
        total: 5,
      };
    }
    case "value-prop": {
      const d = project.valueProp;
      return { filled: d ? filledText(d.whatYouSell, d.customerOutcome, d.scope, d.whyBuyNow) : 0, total: 4 };
    }
    case "validation-plan": {
      const d = project.validationPlan;
      return {
        filled: d ? filledList(d.interviewQuestions) + (d.targetInterviews ? 1 : 0) + filledText(d.successFailureCriteria) : 0,
        total: 3,
      };
    }
    // Financial Model is always available — it's fully computed, never stored.
    case "financial-model":
      return { filled: 1, total: 1 };
    case "mvp-scope": {
      const d = project.mvpScope;
      return {
        filled: d ? filledText(d.mustHaveFunctionality, d.explicitlyExcluded, d.userFlow) + filledList(d.acceptanceCriteria) : 0,
        total: 4,
      };
    }
    case "gtm-plan": {
      const d = project.gtmPlan;
      return {
        filled: d
          ? filledText(d.acquisitionChannels, d.salesProcess, d.messaging) + filledList(d.prospectList) + (d.salesTargets ? 1 : 0)
          : 0,
        total: 5,
      };
    }
    case "sales-docs": {
      const d = project.salesDocs;
      return {
        filled: d ? filledList(d.demoScript) + filledText(d.proposalTemplate) + filledList(d.faq) : 0,
        total: 3,
      };
    }
    case "contract-terms": {
      const d = project.contractTerms;
      return {
        filled: d ? filledText(d.scope, d.payment, d.ip, d.liability, d.cancellation, d.supportTerms) : 0,
        total: 6,
      };
    }
    case "pilot-report": {
      const d = project.pilotReport;
      return {
        filled: d
          ? filledText(d.whoContacted) + filledList(d.whatHappened) + filledText(d.salesResults)
            + filledList(d.customerFeedback) + (d.decision ? 1 : 0)
          : 0,
        total: 5,
      };
    }
  }
}

export function computeDocumentStatus(slug: DocumentSlug, project: Project): DocumentStatus {
  const { filled, total } = computeDocumentCompleteness(slug, project);
  return statusFromFilled(filled, total);
}
