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
import { val } from "@/lib/calculations/helpers";
import { BUSINESS_MODEL_LABELS, BILLING_PERIOD_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { getUnverifiedAssumptions } from "@/lib/documents/derive";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose, KeyValueGrid } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function OnePagerPage() {
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
        {project && <OnePager project={project} />}
      </main>
    </div>
  );
}

function OnePager({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;
  const onePager = project.onePager;
  const unverified = useMemo(() => getUnverifiedAssumptions(project), [project]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/one-pager/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Business One-Pager")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {currency} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Problem">
        <Prose text={onePager?.problem} placeholder={t("No problem statement entered yet.")} />
      </Slide>

      <Slide title="Customer">
        <Prose text={onePager?.customer} placeholder={t("No customer description entered yet.")} />
      </Slide>

      <Slide title="Solution">
        <Prose text={onePager?.solution || project.basicInfo.description} placeholder={t("No solution summary entered yet.")} />
      </Slide>

      <Slide title="Business model">
        <KeyValueGrid
          items={[
            ["Model", t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])],
            ["Pricing", formatCurrency(val(project.pricing.productPrice), currency)],
            ["Billing", t(BILLING_PERIOD_LABELS[project.pricing.billingPeriod])],
            ["Current customers", val(project.pricing.currentCustomers).toLocaleString(locale)],
          ]}
        />
      </Slide>

      <Slide title="Differentiation">
        <Prose text={onePager?.differentiation} placeholder={t("No differentiation entered yet.")} />
      </Slide>

      <Slide title="Key assumptions" last>
        {unverified.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Every assumption in this project is marked known — nothing flagged as a guess.")}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
            {unverified.map((a) => (
              <li key={a.label}>
                {t(a.label)}: <span className="tabular-nums">{a.value.toLocaleString(locale)}</span>{" "}
                <span className="text-xs text-muted-foreground">({t(a.quality === "estimated" ? "Estimated" : "Unknown")})</span>
              </li>
            ))}
          </ul>
        )}
      </Slide>
    </div>
  );
}
