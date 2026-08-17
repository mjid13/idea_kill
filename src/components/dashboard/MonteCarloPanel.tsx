"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runMonteCarlo, type MonteCarloScenario } from "@/lib/calculations";
import { formatCompactNumber, formatCurrency, formatMonths, formatPercentage } from "@/lib/format";
import type { Project } from "@/types";

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const GRID_STROKE = "var(--color-border)";

/** `acquisition.monthlyMarketingSpend` -> `Acquisition · monthly marketing spend`. */
function humanizePath(path: string): string {
  return path
    .split(".")
    .map((segment) =>
      segment
        .replace(/\[(\d+)\]/g, " $1")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/Pct\b/g, "%")
        .toLowerCase()
    )
    .map((segment, i) => (i === 0 ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment))
    .join(" · ");
}

/**
 * Probabilistic view of the plan. Only renders results once at least one
 * assumption carries a low/high range — with single-point inputs there is no
 * distribution to report, so the panel explains how to create one instead.
 */
export function MonteCarloPanel({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;
  const result = useMemo(() => runMonteCarlo(project), [project]);

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("Probability analysis")}</CardTitle>
          <CardDescription>
            {t(
              "Every assumption here is a single number, which claims a precision nobody has. Switch an input to Range on the edit screen — low, most likely, high — and we simulate thousands of futures instead of one."
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const money = (value: number) => formatCurrency(value, currency, { compact: true });
  const monthLabel = (value: number | null) => (value === null ? t("Not reached") : formatMonths(value, 1, locale));

  const columns: Array<{ key: "bear" | "base" | "bull"; label: string; caption: string }> = [
    { key: "bear", label: t("Bear"), caption: t("P10") },
    { key: "base", label: t("Base"), caption: t("P50") },
    { key: "bull", label: t("Bull"), caption: t("P90") },
  ];

  const rows: Array<{ label: string; render: (s: MonteCarloScenario) => string }> = [
    { label: t("Revenue (month {month})", { month: result.months }), render: (s) => money(s.revenue) },
    { label: t("MRR (month {month})", { month: result.months }), render: (s) => money(s.mrr) },
    { label: t("Customers (month {month})", { month: result.months }), render: (s) => formatCompactNumber(s.customers) },
    { label: t("Net cash flow (month {month})", { month: result.months }), render: (s) => money(s.netCashFlow) },
    { label: t("Break-even month"), render: (s) => monthLabel(s.breakEvenMonth) },
    { label: t("Runway"), render: (s) => (s.runwayMonths === null ? t("Profitable") : monthLabel(s.runwayMonths)) },
    { label: t("Viability score"), render: (s) => `${Math.round(s.score)}/100` },
  ];

  const chartData = result.breakEvenHistogram.map((bucket) => ({
    label: bucket.month === null ? t("Never") : String(bucket.month),
    isNever: bucket.month === null,
    count: bucket.count,
    share: (bucket.count / result.iterations) * 100,
  }));

  const probability = result.probBreakEvenBeforeCashOut;
  const probabilityTone = probability >= 70 ? "text-emerald-600" : probability >= 40 ? "text-amber-600" : "text-destructive";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Probability analysis")}</CardTitle>
        <CardDescription>
          {t(
            "{iterations} simulated runs, drawing each ranged assumption from its own low/most-likely/high span. Ranges beat single numbers because they show which outcomes are actually likely, not just one.",
            { iterations: result.iterations }
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("Break-even before cash runs out")}
            </p>
            <p className={`text-3xl font-semibold tabular-nums ${probabilityTone}`}>{formatPercentage(probability, 0)}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("of {iterations} runs", { iterations: result.iterations })}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("Reaches break-even within {month} months", { month: result.months })}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatPercentage(result.probBreakEven, 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Runs out of cash")}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatPercentage(result.probCashOut, 0)}</p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-border pt-3">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{t("Metric")}</th>
                {columns.map((column) => (
                  <th key={column.key} className="py-2 pr-4 text-right font-medium">
                    {column.label}
                    <span className="ml-1 font-normal text-muted-foreground/70">{column.caption}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                  {columns.map((column) => (
                    <td key={column.key} className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {row.render(result.scenarios[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">{t("When break-even lands across the simulated runs")}</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} width={40} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: `1px solid ${GRID_STROKE}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, _name, item) => {
                    const share = (item?.payload as { share?: number } | undefined)?.share ?? 0;
                    return [`${formatCompactNumber(Number(value))} (${formatPercentage(share, 0)})`, t("Runs")];
                  }}
                  labelFormatter={(label) => (label === t("Never") ? t("Never breaks even") : t("Month {month}", { month: String(label) }))}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {chartData.map((bucket) => (
                    <Cell key={bucket.label} fill={bucket.isNever ? "var(--color-destructive)" : "var(--color-primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          <p>
            {t("Sampled {count} ranged assumptions:", { count: result.rangedFields.length })}{" "}
            <span className="text-foreground">{result.rangedFields.map((field) => humanizePath(field.path)).join(", ")}</span>
          </p>
          <p className="mt-1">
            {t(
              "Each draw uses a triangular distribution across low/most likely/high. Bear/base/bull columns are each metric's own percentile across runs, not one single simulated future."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
