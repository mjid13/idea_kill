"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Printer, ArrowLeft, Pencil, FileText, Presentation } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/browserRepository";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function SalesDocsPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const t = useAppTranslations();

  useEffect(() => {
    projectRepository.getById(params.id).then(setProject);
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print">
        <Header />
      </div>
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">{t("Loading…")}</div>}
        {project === null && <div className="p-10 text-center text-sm text-muted-foreground">{t("Project not found.")}</div>}
        {project && <SalesDocs project={project} />}
      </main>
    </div>
  );
}

function SalesDocs({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const docs = project.salesDocs;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/sales-docs/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Sales Documents")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Sales one-pager / deck">
        <p className="mb-3 text-sm text-muted-foreground">
          {t("Reused directly from your other documents — no need to write this twice.")}
        </p>
        <div className="no-print flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/one-pager`} target="_blank" />}>
            <FileText /> {t("Business One-Pager")}
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pitch-deck`} target="_blank" />}>
            <Presentation /> {t("Investor Pitch Deck")}
          </Button>
        </div>
      </Slide>

      <Slide title="Demo script">
        {docs?.demoScript && docs.demoScript.length > 0 ? (
          <ol className="list-inside list-decimal space-y-1 text-sm text-foreground">
            {docs.demoScript.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No demo script entered yet.")}</p>
        )}
      </Slide>

      <Slide title="Proposal / quotation template">
        <Prose text={docs?.proposalTemplate} placeholder={t("No proposal template entered yet.")} />
      </Slide>

      <Slide title="FAQ / objection handling" last>
        {docs?.faq && docs.faq.length > 0 ? (
          <dl className="space-y-3">
            {docs.faq.map((f) => (
              <div key={f.id}>
                <dt className="text-sm font-medium text-foreground">{f.question}</dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">{f.answer || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No FAQ entries yet.")}</p>
        )}
      </Slide>
    </div>
  );
}
