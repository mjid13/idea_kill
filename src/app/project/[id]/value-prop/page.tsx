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
import { val } from "@/lib/calculations/helpers";
import { BUSINESS_MODEL_LABELS, BILLING_PERIOD_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, Prose, KeyValueGrid } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function ValuePropPage() {
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
        {project && <ValueProp project={project} />}
      </main>
    </div>
  );
}

function ValueProp({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;
  const valueProp = project.valueProp;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/value-prop/edit`} />}>
            <Pencil /> {t("Edit")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Value Proposition & Offer")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="What you sell">
        <Prose text={valueProp?.whatYouSell || project.basicInfo.description} placeholder={t("No offer summary entered yet.")} />
      </Slide>

      <Slide title="Customer outcome">
        <Prose text={valueProp?.customerOutcome} placeholder={t("No customer outcome entered yet.")} />
      </Slide>

      <Slide title="Scope">
        <Prose text={valueProp?.scope} placeholder={t("No scope entered yet.")} />
      </Slide>

      <Slide title="Pricing">
        <KeyValueGrid
          items={[
            ["Price", formatCurrency(val(project.pricing.productPrice), currency)],
            ["Billing", t(BILLING_PERIOD_LABELS[project.pricing.billingPeriod])],
          ]}
        />
      </Slide>

      <Slide title="Why buy now" last>
        <Prose text={valueProp?.whyBuyNow} placeholder={t("No urgency reason entered yet.")} />
      </Slide>
    </div>
  );
}
