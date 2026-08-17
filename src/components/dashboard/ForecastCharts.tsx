"use client";

import { useMemo, useState } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forecastProject } from "@/lib/calculations";
import { formatCompactNumber, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalculatedMetrics, Project } from "@/types";

const HORIZONS = [12, 24, 36] as const;

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const GRID_STROKE = "var(--color-border)";

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastCharts({ project, metrics }: { project: Project; metrics: CalculatedMetrics }) {
  const t = useAppTranslations();
  const [months, setMonths] = useState<(typeof HORIZONS)[number]>(24);
  const forecast = useMemo(() => forecastProject(project, metrics, months), [project, metrics, months]);
  const currency = project.basicInfo.currency;

  const data = useMemo(
    () => forecast.map((m) => ({ ...m, totalExpenses: m.variableCosts + m.operatingExpenses })),
    [forecast]
  );

  const tooltipStyle = {
    backgroundColor: "var(--color-foreground)",
    color: "var(--color-background)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
  };
  const currencyFormatter = (v: unknown) => formatCurrency(typeof v === "number" ? v : Number(v), currency, { compact: true });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("Forecast")}</CardTitle>
          <CardDescription>{t("Month-by-month projection built from our current assumptions.")}</CardDescription>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setMonths(h)}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors",
                months === h ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h}
              {t("mo")}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ChartBlock title={t("Revenue growth")}>
          <LineChart data={data} margin={{ left: -12, right: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={48} />
            <Tooltip contentStyle={tooltipStyle} formatter={currencyFormatter} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
            <Line type="monotone" dataKey="revenue" name={t("Revenue")} stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBlock>

        <ChartBlock title={t("Customers")}>
          <LineChart data={data} margin={{ left: -12, right: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={48} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
            <Line type="monotone" dataKey="endingCustomers" name={t("Customers")} stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBlock>

        <ChartBlock title={t("Revenue vs. expenses")}>
          <LineChart data={data} margin={{ left: -12, right: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={48} />
            <Tooltip contentStyle={tooltipStyle} formatter={currencyFormatter} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="revenue" name={t("Revenue")} stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totalExpenses" name={t("Expenses")} stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBlock>

        <ChartBlock title={t("Cash balance")}>
          <LineChart data={data} margin={{ left: -12, right: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={48} />
            <Tooltip contentStyle={tooltipStyle} formatter={currencyFormatter} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
            <ReferenceLine y={0} stroke="var(--color-destructive)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="cashBalance" name={t("Cash balance")} stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBlock>
      </CardContent>
    </Card>
  );
}
