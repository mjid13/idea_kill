"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Printer, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/browserRepository";
import { calculateMetrics, calculateFundingRequirement } from "@/lib/calculations";
import { val } from "@/lib/calculations/helpers";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { Slide, KeyValueGrid } from "@/components/documents/DocumentPrimitives";
import type { Project } from "@/types";

export default function FinancialModelPage() {
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
        {project && <FinancialModel project={project} />}
      </main>
    </div>
  );
}

function FinancialModel({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;
  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const requirement = useMemo(() => calculateFundingRequirement(project, metrics), [project, metrics]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/documents`} />}>
          <ArrowLeft /> {t("Back to documents")}
        </Button>
        <div className="flex gap-2">
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Financial Model")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {currency} · {new Date().toLocaleDateString(locale)}
        </p>
      </header>

      <Slide title="Pricing">
        <KeyValueGrid
          items={[
            ["Price", formatCurrency(val(project.pricing.productPrice), currency)],
            ["Current customers", val(project.pricing.currentCustomers).toLocaleString(locale)],
            ["Expected customers (12mo)", val(project.pricing.expectedCustomers12mo).toLocaleString(locale)],
          ]}
        />
      </Slide>

      {metrics.revenueMix && (
        <Slide title="Revenue streams">
          <KeyValueGrid
            items={[
              ...metrics.revenueMix.streams.map(
                (stream): [string, string] => [
                  stream.name || t("Untitled stream"),
                  `${formatCurrency(stream.monthlyRevenue, currency, { compact: true })} · ${formatPercentage(stream.grossMarginPct)}`,
                ]
              ),
              ["Recurring share of revenue", formatPercentage(metrics.revenueMix.recurringRevenueSharePct)],
              ["Blended gross margin", formatPercentage(metrics.revenueMix.blendedGrossMarginPct)],
            ]}
          />
        </Slide>
      )}

      <Slide title="Costs">
        <KeyValueGrid
          items={[
            ["Monthly operating cost", formatCurrency(metrics.operating.monthlyOperatingCost, currency, { compact: true })],
            ["Direct cost per customer", formatCurrency(val(project.unitEconomics.directCostPerCustomer), currency)],
          ]}
        />
      </Slide>

      <Slide title="Unit economics">
        <KeyValueGrid
          items={[
            ["CAC", formatCurrency(metrics.acquisition.cac, currency, { compact: true })],
            ["LTV", formatCurrency(metrics.unitEconomics.ltv, currency, { compact: true })],
            ["LTV:CAC", formatMultiple(metrics.unitEconomics.ltvToCacRatio)],
            ["Gross margin", formatPercentage(metrics.unitEconomics.grossMarginPct)],
          ]}
        />
      </Slide>

      <Slide title="Break-even">
        <KeyValueGrid
          items={[
            [
              "Break-even customers",
              metrics.breakEven.breakEvenCustomers === null
                ? t("Unreachable at current margins")
                : metrics.breakEven.breakEvenCustomers.toLocaleString(locale),
            ],
            ["Break-even revenue", formatCurrency(metrics.breakEven.breakEvenRevenue, currency, { compact: true })],
          ]}
        />
      </Slide>

      <Slide title="Funding requirement">
        <KeyValueGrid
          items={[
            [
              "Required financing",
              requirement.isSelfFunded ? t("No raise needed") : formatCurrency(requirement.requiredFinancing, currency, { compact: true }),
            ],
            [
              "Recommended raise",
              requirement.isSelfFunded ? "—" : formatCurrency(requirement.recommendedRaise, currency, { compact: true }),
            ],
            ["Contingency", formatPercentage(requirement.contingencyPct, 0)],
            ["Cash needed until milestone", formatCurrency(requirement.operatingSpendToMilestone, currency, { compact: true })],
            ["Safety buffer", formatCurrency(requirement.safetyBuffer, currency, { compact: true })],
            ["Working capital", formatCurrency(requirement.workingCapital, currency, { compact: true })],
            ["CAPEX", formatCurrency(requirement.capex, currency, { compact: true })],
            ["Expected cash receipts", formatCurrency(requirement.expectedCashReceipts, currency, { compact: true })],
            ["Cash on hand", formatCurrency(requirement.cashOnHand, currency, { compact: true })],
          ]}
        />
      </Slide>

      <Slide title="Cash required" last>
        <KeyValueGrid
          items={[
            ["Available cash", formatCurrency(val(project.funding.availableCash), currency, { compact: true })],
            [
              "Monthly burn",
              metrics.operating.isCashFlowPositive ? t("Cash Flow Positive") : formatCurrency(metrics.operating.monthlyBurn, currency, { compact: true }),
            ],
            ["Runway", metrics.funding.isProfitable ? t("Profitable / no finite runway") : formatMonths(metrics.funding.runwayMonths, 1, locale)],
          ]}
        />
      </Slide>
    </div>
  );
}
