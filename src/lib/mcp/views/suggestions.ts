import type { DocumentSlug } from "@/lib/documents/registry";
import {
  composeMessaging,
  getUnverifiedAssumptions,
  suggestCurrentAlternatives,
  suggestInterviewQuestions,
  suggestPaymentTerms,
  suggestPilotDecision,
  suggestProposalTemplate,
  suggestSalesTargets,
  suggestWhoContacted,
} from "@/lib/documents/derive";
import { analyzeProject } from "@/lib/projects/analysis";
import { createProjectId } from "@/lib/storage/factory";
import type { Project } from "@/types";
import { interpolate } from "../english";

export interface DocumentSuggestion {
  label: string;
  value: unknown;
  source: string;
  /** How to persist it, or null when the suggestion is context rather than content. */
  apply: { tool: "update_project" | "edit_list"; operation: "set" | "append"; path: string; value: unknown } | null;
}

function set(path: string, value: unknown): DocumentSuggestion["apply"] {
  return { tool: "update_project", operation: "set", path, value };
}

/**
 * The app's "Suggest" buttons, wired to the exact public path each suggestion
 * writes to — so a client can apply one without guessing the field name. Purely
 * read-only: nothing here persists anything.
 */
export function suggestionsView(project: Project, document: DocumentSlug) {
  const suggestions: DocumentSuggestion[] = [];
  const unverified = getUnverifiedAssumptions(project);

  switch (document) {
    case "one-pager":
      suggestions.push({
        label: "Key assumptions still unverified",
        value: unverified,
        source: "getUnverifiedAssumptions",
        apply: null,
      });
      break;
    case "icp": {
      const alternatives = suggestCurrentAlternatives(project);
      if (alternatives) suggestions.push({
        label: "Current alternatives, from the pitch deck competitors",
        value: alternatives,
        source: "suggestCurrentAlternatives",
        apply: set("icp.currentAlternatives", alternatives),
      });
      break;
    }
    case "validation-plan":
      for (const question of suggestInterviewQuestions(unverified)) {
        // `params.label` is itself a translation key, so the template has to be
        // interpolated here or the client would receive a raw `{label}`.
        const text = interpolate(question.template, question.params);
        suggestions.push({
          label: "Interview question for an unverified assumption",
          value: text,
          source: "suggestInterviewQuestions",
          apply: {
            tool: "edit_list", operation: "append",
            path: "validation_plan.interviewQuestions", value: { id: createProjectId(), text },
          },
        });
      }
      break;
    case "gtm-plan": {
      const messaging = composeMessaging(project.valueProp);
      if (messaging) suggestions.push({
        label: "Messaging, composed from the value proposition",
        value: messaging, source: "composeMessaging", apply: set("gtm_plan.messaging", messaging),
      });
      const targets = suggestSalesTargets(project);
      if (targets !== undefined) suggestions.push({
        label: "Sales target, from the 12-month customer target",
        value: targets, source: "suggestSalesTargets", apply: set("gtm_plan.salesTargets", targets),
      });
      break;
    }
    case "sales-docs": {
      const template = suggestProposalTemplate(project);
      suggestions.push({
        label: "Proposal template, pre-filled with this project's pricing",
        value: template, source: "suggestProposalTemplate", apply: set("sales_docs.proposalTemplate", template),
      });
      break;
    }
    case "contract-terms": {
      const payment = suggestPaymentTerms(project);
      suggestions.push({
        label: "Payment clause, pre-filled with this project's pricing",
        value: payment, source: "suggestPaymentTerms", apply: set("contract_terms.payment", payment),
      });
      break;
    }
    case "pilot-report": {
      const contacted = suggestWhoContacted(project);
      if (contacted) suggestions.push({
        label: "Who was contacted, from the GTM prospect list",
        value: contacted, source: "suggestWhoContacted", apply: set("pilot_report.whoContacted", contacted),
      });
      const decision = suggestPilotDecision(analyzeProject(project, 0).decision.verdict);
      suggestions.push({
        label: "Pilot decision, from the viability verdict",
        value: decision, source: "suggestPilotDecision", apply: set("pilot_report.decision", decision),
      });
      break;
    }
    case "value-prop":
    case "mvp-scope":
    case "financial-model":
      break;
  }

  return {
    document,
    suggestions,
    notice: suggestions.length === 0
      ? "This document has no derived suggestions; write its fields directly with update_project."
      : "Suggestions are deterministic drafts from data already in the project. Review before applying.",
  };
}
