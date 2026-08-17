"use client";

import { useMemo } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateFundingRequirement } from "@/lib/calculations";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { CalculatedMetrics, Project } from "@/types";

/**
 * How much the plan needs to raise, derived from the forecast rather than
 * entered by the founder. Sibling dashboard computation like EfficiencyPanel:
 * the requirement consumes a forecast, which consumes CalculatedMetrics.
 */
export function FundingRequirementPanel({ project, metrics }: { project: Project; metrics: CalculatedMetrics }) {
  const t = useAppTranslations();
  const currency = project.basicInfo.currency;
  const requirement = useMemo(() => calculateFundingRequirement(project, metrics), [project, metrics]);
  const money = (value: number) => formatCurrency(value, currency, { compact: true });

  const breakdown: Array<{ label: string; value: number; sign: "plus" | "minus" }> = [
    {
      label: t("Cash needed until milestone ({months} months)", { months: requirement.monthsToMilestone }),
      value: requirement.operatingSpendToMilestone,
      sign: "plus",
    },
    { label: t("Safety buffer"), value: requirement.safetyBuffer, sign: "plus" },
    { label: t("Working capital"), value: requirement.workingCapital, sign: "plus" },
    { label: t("CAPEX"), value: requirement.capex, sign: "plus" },
    { label: t("Expected cash receipts"), value: requirement.expectedCashReceipts, sign: "minus" },
    { label: t("Cash on hand"), value: requirement.cashOnHand, sign: "minus" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Funding requirement")}</CardTitle>
        <CardDescription>
          {t("Sized from the forecast: what the plan spends before the milestone, less what it collects.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Required financing")}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {requirement.isSelfFunded ? t("No raise needed") : money(requirement.requiredFinancing)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Recommended raise")}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {requirement.isSelfFunded ? "—" : money(requirement.recommendedRaise)}
            </p>
            {!requirement.isSelfFunded && (
              <p className="text-[11px] text-muted-foreground">
                {t("{pct} contingency included.", { pct: formatPercentage(requirement.contingencyPct, 0) })}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-1 border-t border-border pt-3">
          {breakdown.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">
                <span className="mr-1 font-medium text-foreground">{line.sign === "plus" ? "+" : "−"}</span>
                {line.label}
              </dt>
              <dd className="tabular-nums text-foreground">{money(line.value)}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted-foreground">
          {requirement.isSelfFunded
            ? t("Projected receipts and cash on hand already cover this plan — no external financing required.")
            : requirement.breakEvenMonth === null
              ? t("The forecast does not reach break-even within 36 months.")
              : t("Forecast reaches break-even in month {month}.", { month: requirement.breakEvenMonth })}
        </p>
      </CardContent>
    </Card>
  );
}
