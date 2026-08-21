import type { BusinessModel, DataQuality, Project } from "@/types";

/** A single read-only row inside a computed section — the label/value pairs already used by KeyValueGrid, plus the quality flag so the renderer can mark "estimated"/"unknown" rows instead of presenting a guess as a fact. */
export interface ComputedRow {
  label: string;
  value: string;
  quality?: DataQuality;
}

export interface NarrativeFieldSpec {
  /** Key on the document's own assumptions object, e.g. "problem" on OnePagerAssumptions. */
  key: string;
  label: string;
  placeholder: string;
}

export type SectionRender =
  /** A founder-written field, rendered/edited like today's Slide + Prose/LinkedTextField. */
  | { kind: "narrative"; field: NarrativeFieldSpec; computedDefault?: (project: Project) => string | undefined }
  /** A read-only block auto-derived from data already elsewhere in the project. */
  | { kind: "computed"; compute: (project: Project) => ComputedRow[]; emptyMessage?: string };

export interface DocumentSectionSpec {
  id: string;
  title: string;
  /** Business models for which this section is not applicable and should be skipped. */
  hideFor?: BusinessModel[];
  /** If set, this section is shown only for these business models (inverse of hideFor). */
  showFor?: BusinessModel[];
  render: SectionRender;
}

/**
 * Filters a document's sections down to the ones that apply to a business model.
 * Same hideFor/showFor filter as ProjectWizard's STEPS (src/components/forms/ProjectWizard.tsx),
 * kept independent so a document's section list isn't coupled to the wizard's step list.
 */
export function visibleSections(sections: DocumentSectionSpec[], businessModel: BusinessModel): DocumentSectionSpec[] {
  return sections.filter((s) => !s.hideFor?.includes(businessModel) && (!s.showFor || s.showFor.includes(businessModel)));
}
