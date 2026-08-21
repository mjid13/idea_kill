"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Slide, Prose, KeyValueGrid } from "@/components/documents/DocumentPrimitives";
import { visibleSections, type ComputedRow, type DocumentSectionSpec } from "@/lib/documents/sections";
import type { Project } from "@/types";

/**
 * Renders a document from a declarative section list instead of hand-written
 * per-field JSX — the shared consumer for every document's Slide sequence.
 * `doc` is the document's own stored assumptions object (e.g. project.onePager).
 */
export function DocumentSectionsView({
  sections,
  project,
  doc,
}: {
  sections: DocumentSectionSpec[];
  project: Project;
  doc: object | undefined;
}) {
  const t = useAppTranslations();
  const visible = visibleSections(sections, project.basicInfo.businessModel);
  const record = doc as Record<string, unknown> | undefined;

  return (
    <>
      {visible.map((section, i) => (
        <Slide key={section.id} title={section.title} last={i === visible.length - 1}>
          {section.render.kind === "narrative" ? (
            <Prose
              text={(record?.[section.render.field.key] as string | undefined) || section.render.computedDefault?.(project)}
              placeholder={t(section.render.field.placeholder)}
            />
          ) : (
            <ComputedSectionBody rows={section.render.compute(project)} emptyMessage={section.render.emptyMessage} />
          )}
        </Slide>
      ))}
    </>
  );
}

function ComputedSectionBody({ rows, emptyMessage }: { rows: ComputedRow[]; emptyMessage?: string }) {
  const t = useAppTranslations();
  if (rows.length === 0) {
    return <Prose text={undefined} placeholder={t(emptyMessage ?? "Nothing to show yet.")} />;
  }
  const items: Array<[string, string]> = rows.map((r) => [
    r.label,
    r.quality && r.quality !== "known" ? `${r.value} (${t(r.quality === "estimated" ? "Estimated" : "Unknown")})` : r.value,
  ]);
  return <KeyValueGrid items={items} />;
}
