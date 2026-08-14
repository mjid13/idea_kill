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
import { Slide, Prose, BulletList } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function MvpScopePage() {
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
        {project && <MvpScope project={project} />}
      </main>
    </div>
  );
}

function MvpScope({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const scope = project.mvpScope;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/mvp-scope/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("MVP / Product Scope")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Must-have functionality">
        <Prose text={scope?.mustHaveFunctionality || project.valueProp?.scope} placeholder={t("No must-have functionality entered yet.")} />
      </Slide>

      <Slide title="What is explicitly excluded">
        <Prose text={scope?.explicitlyExcluded} placeholder={t("No exclusions entered yet.")} />
      </Slide>

      <Slide title="User flow">
        <Prose text={scope?.userFlow} placeholder={t("No user flow entered yet.")} />
      </Slide>

      <Slide title="Acceptance criteria" last>
        <BulletList items={(scope?.acceptanceCriteria ?? []).map((c) => c.text)} empty={t("No acceptance criteria entered yet.")} />
      </Slide>
    </div>
  );
}
