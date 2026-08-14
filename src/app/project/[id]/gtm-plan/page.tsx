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
import { composeMessaging } from "@/lib/documents/derive";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function GtmPlanPage() {
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
        {project && <GtmPlan project={project} />}
      </main>
    </div>
  );
}

function GtmPlan({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const gtm = project.gtmPlan;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/gtm-plan/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Go-To-Market Plan")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Acquisition channels">
        <Prose text={gtm?.acquisitionChannels} placeholder={t("No acquisition channels entered yet.")} />
      </Slide>

      <Slide title="Sales process">
        <Prose text={gtm?.salesProcess} placeholder={t("No sales process entered yet.")} />
      </Slide>

      <Slide title="Messaging">
        <Prose text={gtm?.messaging || composeMessaging(project.valueProp)} placeholder={t("No messaging entered yet.")} />
      </Slide>

      <Slide title="Initial prospect list">
        {gtm?.prospectList && gtm.prospectList.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4">{t("Company")}</th>
                <th className="py-1.5 pr-4">{t("Contact")}</th>
                <th className="py-1.5">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {gtm.prospectList.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-4 align-top font-medium text-foreground">{p.company}</td>
                  <td className="py-1.5 pr-4 align-top text-foreground">{p.contact || "—"}</td>
                  <td className="py-1.5 align-top text-foreground">{p.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No prospects entered yet.")}</p>
        )}
      </Slide>

      <Slide title="Sales targets" last>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {gtm?.salesTargets ?? "—"} {gtm?.salesTargets ? t("customers") : ""}
        </p>
      </Slide>
    </div>
  );
}
