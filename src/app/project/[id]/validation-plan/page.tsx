"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Printer, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/browserRepository";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { getUnverifiedAssumptions } from "@/lib/documents/derive";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose, BulletList } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function ValidationPlanPage() {
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
        {project && <ValidationPlan project={project} />}
      </main>
    </div>
  );
}

function ValidationPlan({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const plan = project.validationPlan;
  const unverified = useMemo(() => getUnverifiedAssumptions(project), [project]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/validation-plan/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Customer Validation Plan")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Assumptions to test">
        {unverified.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Every assumption in this project is marked known — nothing flagged as a guess.")}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
            {unverified.map((a) => (
              <li key={a.label}>
                {t(a.label)}: <span className="tabular-nums">{a.value.toLocaleString(locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Slide>

      <Slide title="Interview questions">
        <BulletList items={(plan?.interviewQuestions ?? []).map((q) => q.text)} empty={t("No interview questions entered yet.")} ordered />
      </Slide>

      <Slide title="Target number of interviews">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{plan?.targetInterviews ?? "—"}</p>
      </Slide>

      <Slide title="Success / failure criteria" last>
        <Prose text={plan?.successFailureCriteria} placeholder={t("No success/failure criteria entered yet.")} />
      </Slide>
    </div>
  );
}
