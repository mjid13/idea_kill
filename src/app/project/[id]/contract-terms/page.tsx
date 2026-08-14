"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Printer, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/browserRepository";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { suggestPaymentTerms } from "@/lib/documents/derive";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function ContractTermsPage() {
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
        {project && <ContractTerms project={project} />}
      </main>
    </div>
  );
}

function ContractTerms({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const terms = project.contractTerms;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/contract-terms/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Contract / Terms")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{t("A starting draft, not legal advice — have a lawyer review before use.")}</p>
      </header>

      <Slide title="Scope">
        <Prose text={terms?.scope || project.mvpScope?.mustHaveFunctionality} placeholder={t("No scope entered yet.")} />
      </Slide>

      <Slide title="Payment">
        <Prose text={terms?.payment || suggestPaymentTerms(project)} placeholder={t("No payment terms entered yet.")} />
      </Slide>

      <Slide title="IP">
        <Prose text={terms?.ip} placeholder={t("No IP terms entered yet.")} />
      </Slide>

      <Slide title="Liability">
        <Prose text={terms?.liability} placeholder={t("No liability terms entered yet.")} />
      </Slide>

      <Slide title="Cancellation">
        <Prose text={terms?.cancellation} placeholder={t("No cancellation terms entered yet.")} />
      </Slide>

      <Slide title="Support terms" last>
        <Prose text={terms?.supportTerms} placeholder={t("No support terms entered yet.")} />
      </Slide>
    </div>
  );
}
