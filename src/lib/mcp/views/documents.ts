import { DOCUMENT_REGISTRY, type DocumentGroup, type DocumentSlug } from "@/lib/documents/registry";
import { computeDocumentCompleteness, computeDocumentStatus } from "@/lib/documents/status";
import type { Project } from "@/types";

/**
 * Document slug -> the public MCP section that stores it. Financial Model is
 * absent because it has no stored fields at all; its numbers come from
 * get_project_analysis and the financial_model resource.
 */
export const DOCUMENT_SECTIONS: Record<DocumentSlug, string | null> = {
  "one-pager": "one_pager",
  icp: "icp",
  "value-prop": "value_prop",
  "validation-plan": "validation_plan",
  "financial-model": null,
  "mvp-scope": "mvp_scope",
  "gtm-plan": "gtm_plan",
  "sales-docs": "sales_docs",
  "contract-terms": "contract_terms",
  "pilot-report": "pilot_report",
};

export function documentsView(project: Project, group?: DocumentGroup) {
  const documents = DOCUMENT_REGISTRY
    .filter((meta) => !group || meta.group === group)
    .map((meta) => ({
      slug: meta.slug,
      title: meta.title,
      description: meta.description,
      group: meta.group,
      editable: meta.hasEdit,
      status: computeDocumentStatus(meta.slug, project),
      ...computeDocumentCompleteness(meta.slug, project),
      section: DOCUMENT_SECTIONS[meta.slug],
      resourceUri: DOCUMENT_SECTIONS[meta.slug]
        ? `ideaup://projects/${project.id}/${DOCUMENT_SECTIONS[meta.slug]}`
        : `ideaup://projects/${project.id}/financial_model`,
    }));
  return {
    documents,
    completeCount: documents.filter((document) => document.status === "complete").length,
    totalCount: documents.length,
  };
}
