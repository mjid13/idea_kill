"use client";

import { useMemo } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateEfficiencyMetrics, forecastProject, isRecurring } from "@/lib/calculations";
import { formatMultiple } from "@/lib/format";
import { MetricCard } from "./MetricCard";
import type { CalculatedMetrics, Project } from "@/types";

/**
 * SaaS efficiency ratios, derived from a projected 12-month forecast rather
 * than trailing actuals — this app has no historical-actuals concept, only
 * projections. Kept as a sibling dashboard computation (not part of
 * CalculatedMetrics) since the forecast itself depends on CalculatedMetrics.
 */
export function EfficiencyPanel({ project, metrics }: { project: Project; metrics: CalculatedMetrics }) {
  const t = useAppTranslations();
  const forecast = useMemo(() => forecastProject(project, metrics, 12), [project, metrics]);
  const efficiency = useMemo(() => calculateEfficiencyMetrics(project, metrics, forecast), [project, metrics, forecast]);

  if (!isRecurring(project.pricing.billingPeriod)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Efficiency ratios")}</CardTitle>
        <CardDescription>{t("Projected 12 months out from your current assumptions — not trailing actuals.")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label={t("Rule of 40")}
          value={efficiency.ruleOf40Score === null ? "—" : efficiency.ruleOf40Score.toFixed(0)}
          description={t("Projected annual revenue growth % plus projected profit margin %. 40+ is the commonly-cited healthy bar.")}
          formula={t("Annual Growth % + Profit Margin %")}
        />
        <MetricCard
          label={t("Burn Multiple")}
          value={efficiency.burnMultiple === null ? "—" : formatMultiple(efficiency.burnMultiple)}
          description={t("How much cash is burned to generate $1 of new annual recurring revenue. Lower is more efficient.")}
          formula={t("Net Burn / Net New ARR")}
        />
        <MetricCard
          label={t("Magic Number")}
          value={efficiency.magicNumber === null ? "—" : formatMultiple(efficiency.magicNumber)}
          description={t("Sales efficiency — new annual recurring revenue generated per dollar of sales & marketing spend.")}
          formula={t("Net New ARR / Annualized Sales & Marketing Spend")}
        />
        <MetricCard
          label={t("Quick Ratio")}
          value={efficiency.quickRatio === null ? "—" : formatMultiple(efficiency.quickRatio)}
          description={t("Growth efficiency — new and expansion revenue relative to churned and contraction revenue. 4x+ is considered healthy.")}
          formula={t("(New + Expansion MRR) / (Churned + Contraction MRR)")}
        />
      </CardContent>
      {efficiency.ruleOf40Score !== null && efficiency.ruleOf40Score < 40 && (
        <CardContent className="pt-0 text-xs text-muted-foreground">{t("Rule of 40 is below the commonly-cited healthy bar.")}</CardContent>
      )}
    </Card>
  );
}
