import { deriveBusinessModelSnapshot, deriveKeyAssumptionRows } from "@/lib/documents/derive";
import type { DocumentSectionSpec } from "@/lib/documents/sections";

/**
 * The Business One-Pager, expressed as a declarative list of sections instead
 * of hand-written JSX. Narrative sections are founder-written; computed
 * sections are auto-derived from data already entered elsewhere in the
 * project, so the one-pager stays in sync without asking for the same
 * numbers twice. First document to consume the shared section renderer
 * (src/components/documents/DocumentSectionsView.tsx) — the pattern the
 * other business documents adopt next.
 */
export const ONE_PAGER_SECTIONS: DocumentSectionSpec[] = [
  {
    id: "problem",
    title: "Problem",
    render: { kind: "narrative", field: { key: "problem", label: "Problem", placeholder: "No problem statement entered yet." } },
  },
  {
    id: "customer",
    title: "Customer",
    render: { kind: "narrative", field: { key: "customer", label: "Customer", placeholder: "No customer description entered yet." } },
  },
  {
    id: "solution",
    title: "Solution",
    render: {
      kind: "narrative",
      field: { key: "solution", label: "Solution", placeholder: "No solution summary entered yet." },
      computedDefault: (project) => project.basicInfo.description || undefined,
    },
  },
  {
    id: "business-model",
    title: "Business model & pricing",
    render: { kind: "computed", compute: deriveBusinessModelSnapshot },
  },
  {
    id: "differentiation",
    title: "Differentiation",
    render: { kind: "narrative", field: { key: "differentiation", label: "Differentiation", placeholder: "No differentiation entered yet." } },
  },
  {
    id: "key-assumptions",
    title: "Key assumptions",
    render: {
      kind: "computed",
      compute: deriveKeyAssumptionRows,
      emptyMessage: "Every assumption in this project is marked known — nothing flagged as a guess.",
    },
  },
];
