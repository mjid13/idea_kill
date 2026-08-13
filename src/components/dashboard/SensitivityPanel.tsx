"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { applyMultipliers, calculateMetrics, calculateSensitivityRanking, DEFAULT_MULTIPLIERS, type SensitivityMultipliers } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { formatCurrency, formatMultiple, formatMonths } from "@/lib/format";
import type { Project } from "@/types";

const LEVERS: Array<{ key: keyof SensitivityMultipliers; label: string; description: string }> = [
  { key: "price", label: "Price", description: "Adjusts product price and revenue per customer." },
  { key: "cac", label: "CAC", description: "Adjusts marketing + sales spend, which scales CAC proportionally." },
  { key: "churn", label: "Churn", description: "Adjusts the monthly churn rate." },
  { key: "growth", label: "Growth rate", description: "Adjusts the monthly customer growth rate." },
];

export function SensitivityPanel({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const [multipliers, setMultipliers] = useState<SensitivityMultipliers>(DEFAULT_MULTIPLIERS);

  const ranking = useMemo(() => calculateSensitivityRanking(project), [project]);

  const adjustedProject = useMemo(() => applyMultipliers(project, multipliers), [project, multipliers]);
  const adjustedMetrics = useMemo(() => calculateMetrics(adjustedProject), [adjustedProject]);
  const adjustedScore = useMemo(() => calculateScoreBreakdown(adjustedProject, adjustedMetrics), [adjustedProject, adjustedMetrics]);

  const isDefault = Object.values(multipliers).every((v) => v === 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Assumption sensitivity")}</CardTitle>
        <CardDescription>{t("Flex the assumptions that move the score the most and see the dashboard recalculate instantly.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">{t("Most sensitive assumptions")}</p>
          <ol className="space-y-1">
            {ranking.map((item, i) => (
              <li key={item.key} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {i + 1}. {t(item.label)}
                </span>
                <span className="text-xs text-muted-foreground">{t("±{points} score pts across ±50%", { points: item.impact.toFixed(1) })}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-5">
          {LEVERS.map((lever) => (
            <div key={lever.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{t(lever.label)}</p>
                  <p className="text-[11px] text-muted-foreground">{t(lever.description)}</p>
                </div>
                <span className="text-xs font-medium tabular-nums text-foreground">
                  {multipliers[lever.key] >= 1 ? "+" : ""}
                  {Math.round((multipliers[lever.key] - 1) * 100)}%
                </span>
              </div>
              <Slider
                value={[multipliers[lever.key]]}
                min={0.5}
                max={1.5}
                step={0.05}
                onValueChange={(v) => setMultipliers((m) => ({ ...m, [lever.key]: Array.isArray(v) ? v[0] : v }))}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">{t("Score")}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{adjustedScore.overall}/100</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("MRR")}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(adjustedMetrics.revenue.mrr, project.basicInfo.currency, { compact: true })}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("LTV:CAC")}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatMultiple(adjustedMetrics.unitEconomics.ltvToCacRatio)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("Runway")}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {adjustedMetrics.funding.isProfitable ? t("Profitable") : formatMonths(adjustedMetrics.funding.runwayMonths, 1, locale)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMultipliers(DEFAULT_MULTIPLIERS)} disabled={isDefault}>
            <RotateCcw /> {t("Reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
