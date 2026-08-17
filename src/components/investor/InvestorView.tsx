"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Landmark, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AudienceChecklist, AudienceVerdict, STATUS_COLOR } from "@/components/audience/AudienceChecklist";
import { calculateMetrics, forecastProject } from "@/lib/calculations";
import { calculateScoreBreakdown } from "@/lib/scoring";
import { buildInvestorSummary, assessInvestorReadiness } from "@/lib/investor/summary";
import { FUNDING_ROUND_LABELS } from "@/lib/constants";
import { formatCompactNumber, formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import { Prose } from "@/components/documents/DocumentPrimitives";
import { cn } from "@/lib/utils";
import type { AudienceCheckStatus, InvestorVerdict, Project } from "@/types";

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const GRID_STROKE = "var(--color-border)";

const VERDICT_TONE: Record<InvestorVerdict, AudienceCheckStatus> = {
  fundable: "pass",
  promising: "warn",
  too_early: "fail",
};

/**
 * Investor Mode. A fund buys the upside distribution — market, growth, moat,
 * expansion, the round and what it buys — which is a different question from
 * the one Lender Mode answers, and reads a different half of the same project.
 */
export function InvestorView({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;

  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const scores = useMemo(() => calculateScoreBreakdown(project, metrics), [project, metrics]);
  const summary = useMemo(() => buildInvestorSummary(project, metrics), [project, metrics]);
  const assessment = useMemo(() => assessInvestorReadiness(summary, scores), [summary, scores]);
  const forecast = useMemo(() => forecastProject(project, metrics, 24), [project, metrics]);

  const money = (v: number | null) => formatCurrency(v, currency, { compact: true });
  const tooltipStyle = {
    backgroundColor: "var(--color-foreground)",
    color: "var(--color-background)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
  };

  const growthData = useMemo(
    () => forecast.map((m) => ({ month: m.month, arr: m.mrr * 12, customers: m.endingCustomers })),
    [forecast]
  );

  const round = project.pitch?.round;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 print:max-w-none print:px-0">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`} />}>
            <ArrowLeft /> {t("Back to dashboard")}
          </Button>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("Investor Mode")}</h1>
            <Badge variant="secondary">{project.basicInfo.name || t("Untitled project")}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("How a fund reads this plan: how big it can get, how fast it grows, what keeps competitors out, and what this round buys.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/lender`} />}>
            <Landmark /> {t("Lender Mode")}
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pitch-deck/edit`} />}>
            <Pencil /> {t("Edit round details")}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <AudienceVerdict
        audience="Investment assessment"
        title={assessment.title}
        description={assessment.description}
        tone={VERDICT_TONE[assessment.verdict]}
        figures={[
          { label: "ARR today", value: money(summary.arrNow) },
          { label: "ARR in 12 months", value: money(summary.arrMonth12) },
          {
            label: "Growth",
            value: summary.growthMultiple12mo === null ? "—" : formatMultiple(summary.growthMultiple12mo, 1),
            hint: "over 12 months",
          },
          { label: "SAM", value: money(metrics.market.sam) },
          { label: "LTV:CAC", value: formatMultiple(metrics.unitEconomics.ltvToCacRatio) },
          { label: "Funding ask", value: money(summary.fundingAsk), hint: summary.fundingAskIsDerived ? "derived from the plan" : undefined },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label={t("TAM")}
          value={money(metrics.market.tam)}
          description={t("Total Addressable Market — the full revenue opportunity if every potential customer bought.")}
        />
        <MetricCard
          label={t("SAM")}
          value={money(metrics.market.sam)}
          description={t("Serviceable Available Market — the portion of TAM realistically addressable.")}
        />
        <MetricCard
          label={t("SOM")}
          value={money(metrics.market.som)}
          description={t("Serviceable Obtainable Market — the portion of SAM we could realistically capture.")}
        />
        <MetricCard
          label={t("Required penetration")}
          value={formatPercentage(summary.requiredMarketPenetrationPct, 1)}
          description={t("Share of the serviceable market the plan needs to win. The lower it is, the more credible the plan.")}
        />
        <MetricCard label={t("ARR")} value={money(summary.arrNow)} description={t("Annual Recurring Revenue today.")} formula={t("MRR × 12")} />
        <MetricCard
          label={t("ARR in 24 months")}
          value={money(summary.arrMonth24)}
          description={t("Where the current growth assumptions land two years out.")}
        />
        <MetricCard
          label={t("Customers in 12 months")}
          value={summary.customersMonth12.toLocaleString(locale)}
          description={t("Installed base a year out, after churn.")}
        />
        <MetricCard
          label={t("Net Revenue Retention")}
          value={formatPercentage(summary.netRevenueRetentionPct, 0)}
          description={t("Annualized revenue retained from existing customers after churn, contraction, and expansion. 100%+ means existing customers grow revenue on their own.")}
        />
        <MetricCard
          label={t("Expansion revenue")}
          value={formatPercentage(summary.monthlyExpansionRevenuePct, 1)}
          description={t("Monthly upsell and cross-sell into the existing base — the cheapest growth there is.")}
        />
        <MetricCard
          label={t("LTV:CAC")}
          value={formatMultiple(summary.ltvToCacRatio)}
          description={t("Lifetime value relative to acquisition cost. 3x+ is generally considered healthy.")}
        />
        <MetricCard
          label={t("CAC payback")}
          value={formatMonths(summary.cacPaybackMonths, 1, locale)}
          description={t("Months of contribution needed to earn back one customer's acquisition cost.")}
        />
        <MetricCard
          label={t("Gross Margin")}
          value={formatPercentage(summary.grossMarginPct)}
          description={t("Gross profit as a share of revenue, after variable costs.")}
        />
        <MetricCard
          label={t("Rule of 40")}
          value={summary.ruleOf40Score === null ? "—" : formatPercentage(summary.ruleOf40Score, 0)}
          description={t("Growth rate plus profit margin — the trade-off an investor allows between the two.")}
        />
        <MetricCard
          label={t("Burn multiple")}
          value={summary.burnMultiple === null ? "—" : formatMultiple(summary.burnMultiple, 1)}
          description={t("Cash burned for every unit of new ARR added. Lower is more efficient.")}
        />
        <MetricCard
          label={t("Magic number")}
          value={summary.magicNumber === null ? "—" : formatMultiple(summary.magicNumber, 1)}
          description={t("New ARR generated per unit of sales and marketing spend.")}
        />
        <MetricCard
          label={t("Defensibility")}
          value={formatPercentage(summary.moatScore, 0)}
          description={t("Differentiation, switching cost, competitive intensity and owned distribution, scored from the validation ratings.")}
        />
      </div>

      <AudienceChecklist
        title="Investment checks"
        description="What a fund tests before it takes the meeting seriously."
        checks={summary.checks}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("Growth trajectory")}</CardTitle>
          <CardDescription>{t("Annualized recurring revenue and installed base over the next 24 months.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis yAxisId="arr" tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={52} />
              <YAxis
                yAxisId="customers"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK}
                tickFormatter={formatCompactNumber}
                width={44}
              />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                yAxisId="arr"
                type="monotone"
                dataKey="arr"
                name={t("ARR")}
                stroke="var(--color-chart-1)"
                fill="var(--color-chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Line yAxisId="customers" type="monotone" dataKey="customers" name={t("Customers")} stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Milestones this plan reaches")}</CardTitle>
            <CardDescription>{t("What the money buys, in the order it arrives.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {summary.milestones.map((milestone) => (
                <li key={milestone.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-6 min-w-14 shrink-0 items-center justify-center rounded-md border border-border px-2 text-[11px] font-medium tabular-nums",
                      milestone.month === null ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {milestone.month === null ? t("Beyond 24mo") : t("Month {month}", { month: milestone.month })}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t(milestone.label, milestone.labelParams)}</p>
                    <p className="text-xs text-muted-foreground">{t(milestone.detail, milestone.detailParams)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("The round")}</CardTitle>
            <CardDescription>
              {summary.fundingAskIsDerived
                ? t("No ask entered, so this is the raise the plan itself implies.")
                : t("The ask entered in the pitch narrative, and what it costs in ownership.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("Funding ask")}</dt>
                <dd className="text-lg font-semibold tabular-nums text-foreground">{money(summary.fundingAsk)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Round")}</dt>
                <dd className="text-sm font-medium text-foreground">
                  {round?.roundType ? t(FUNDING_ROUND_LABELS[round.roundType]) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Post-money valuation")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{money(summary.postMoneyValuation)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Equity given up")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{formatPercentage(summary.equityGivenUpPct, 1)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Runway this round buys")}</dt>
                <dd className={cn("text-sm font-medium tabular-nums", summary.runwayFromAskMonths === null ? STATUS_COLOR.pass : "text-foreground")}>
                  {summary.runwayFromAskMonths === null
                    ? t("Beyond the 24-month horizon")
                    : formatMonths(summary.runwayFromAskMonths, 0, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Traction evidence")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{formatPercentage(summary.tractionScore, 0)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">{t("Use of funds")}</p>
              <Prose text={project.pitch?.useOfFunds} placeholder={t("Not written yet — investors read this line before the model.")} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Moat and traction")}</CardTitle>
          <CardDescription>{t("The two things a fund cannot get from a spreadsheet.")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Competitive landscape")}</p>
            <Prose text={project.pitch?.competitiveLandscape} placeholder={t("Not written yet.")} />
            {project.pitch?.competitors && project.pitch.competitors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-foreground">
                {project.pitch.competitors.map((competitor) => (
                  <li key={competitor.id}>
                    <span className="font-medium">{competitor.name}</span>
                    {competitor.edge ? ` — ${competitor.edge}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Traction")}</p>
            <Prose text={project.pitch?.traction} placeholder={t("Not written yet.")} />
            {project.pitch?.tractionHistory && project.pitch.tractionHistory.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-foreground">
                {project.pitch.tractionHistory.map((point) => (
                  <li key={point.id} className="tabular-nums">
                    {point.label}: {point.customers ?? 0} {t("customers")} · {money(point.mrr ?? 0)} {t("MRR")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
