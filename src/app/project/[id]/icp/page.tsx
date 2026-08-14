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
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function IcpPage() {
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
        {project && <Icp project={project} />}
      </main>
    </div>
  );
}

function Icp({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const icp = project.icp;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/icp/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("ICP Document")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Exact customer profile">
        <Prose text={icp?.customerProfile || project.onePager?.customer} placeholder={t("No customer profile entered yet.")} />
      </Slide>

      <Slide title="Buyer / decision maker">
        <Prose text={icp?.buyerDecisionMaker} placeholder={t("No buyer/decision maker entered yet.")} />
      </Slide>

      <Slide title="Pain points">
        <Prose text={icp?.painPoints} placeholder={t("No pain points entered yet.")} />
      </Slide>

      <Slide title="Current alternatives">
        <Prose text={icp?.currentAlternatives} placeholder={t("No current alternatives entered yet.")} />
      </Slide>

      <Slide title="Buying triggers" last>
        <Prose text={icp?.buyingTriggers} placeholder={t("No buying triggers entered yet.")} />
      </Slide>
    </div>
  );
}
