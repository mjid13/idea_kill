"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Pencil, Printer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AudienceChecklist, AudienceVerdict, STATUS_COLOR } from "@/components/audience/AudienceChecklist";
import { calculateMetrics, calculateLenderMetrics, val } from "@/lib/calculations";
import { assessLenderReadiness } from "@/lib/lender/assessment";
import { formatCompactNumber, formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AudienceCheckStatus, LenderVerdict, Project } from "@/types";

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const GRID_STROKE = "var(--color-border)";

const VERDICT_TONE: Record<LenderVerdict, AudienceCheckStatus> = {
  bankable: "pass",
  conditional: "warn",
  not_bankable: "fail",
};

/**
 * Lender Mode. A bank underwrites repayment capacity, not upside: coverage
 * every month, liquidity, the downside case, and what secures the loan when
 * both of those are wrong. Every figure here comes from the same forecast the
 * dashboard uses, so the two never disagree.
 */
export function LenderView({ project }: { project: Project }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const currency = project.basicInfo.currency;

  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const lender = useMemo(() => calculateLenderMetrics(project, metrics), [project, metrics]);
  const assessment = useMemo(() => assessLenderReadiness(lender, metrics, project, locale), [lender, metrics, project, locale]);

  const money = (v: number | null) => formatCurrency(v, currency, { compact: true });
  const tooltipStyle = {
    backgroundColor: "var(--color-foreground)",
    color: "var(--color-background)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
  };

  const chartData = useMemo(
    () =>
      lender.service.map((m) => ({
        month: m.month,
        cashAvailableForDebtService: m.cashAvailableForDebtService,
        debtService: m.debtService,
        // A DSCR of 6x flattens the interesting range around 1x, so the plotted
        // line is capped and the real figure stays in the table below.
        dscr: m.dscr === null ? null : Math.min(m.dscr, 4),
      })),
    [lender.service]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 print:max-w-none print:px-0">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`} />}>
            <ArrowLeft /> {t("Back to dashboard")}
          </Button>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("Lender Mode")}</h1>
            <Badge variant="secondary">{project.basicInfo.name || t("Untitled project")}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("How a bank reads this plan: can it service the debt every month, what happens when revenue disappoints, and what backs the loan if it does.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/investor`} />}>
            <TrendingUp /> {t("Investor Mode")}
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/lender/edit`} />}>
            <Pencil /> {t("Edit loan terms")}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      {lender.loanAmountIsDerived && (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {t("No loan amount entered yet, so this is modelled on the financing the plan itself requires ({amount}). Enter real terms to underwrite the actual facility.", {
            amount: money(lender.loanAmount),
          })}
        </p>
      )}

      <AudienceVerdict
        audience="Credit assessment"
        title={assessment.title}
        description={assessment.description}
        tone={VERDICT_TONE[assessment.verdict]}
        figures={[
          { label: "Loan amount", value: money(lender.loanAmount) },
          { label: "Monthly instalment", value: money(lender.monthlyPayment) },
          {
            label: "DSCR",
            value: formatMultiple(lender.aggregateDscr, 2),
            hint: "Target {target}",
            hintParams: { target: formatMultiple(lender.targetDscr, 2) },
          },
          { label: "Term", value: formatMonths(lender.termMonths, 0, locale) },
          { label: "Interest rate", value: formatPercentage(lender.annualInterestRatePct, 2) },
          { label: "Total interest", value: money(lender.totalInterest) },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label={t("DSCR")}
          value={formatMultiple(lender.aggregateDscr, 2)}
          description={t("Debt Service Coverage Ratio — cash available for debt service divided by what the loan costs, across the whole term.")}
          formula={t("Total CFADS / Total Debt Service")}
        />
        <MetricCard
          label={t("Lowest monthly DSCR")}
          value={formatMultiple(lender.minDscr, 2)}
          description={t("The worst single month of the term. A lender underwrites this number, not the average.")}
          formula={t("Min(Monthly CFADS / Monthly Debt Service)")}
        />
        <MetricCard
          label={t("Months below target")}
          value={`${lender.monthsBelowTargetDscr} / ${lender.termMonths}`}
          description={t("Months where coverage falls under the lender's minimum DSCR.")}
        />
        <MetricCard
          label={t("Debt capacity")}
          value={money(lender.debtCapacity)}
          description={t("The largest loan this plan's own cash flow services at the target coverage.")}
          formula={t("PV(Average CFADS / Target DSCR − Existing Debt Service)")}
        />
        <MetricCard
          label={t("Monthly debt service")}
          value={money(lender.totalMonthlyDebtService)}
          description={t("This loan's instalment plus debt service already committed elsewhere.")}
        />
        <MetricCard
          label={t("Break-even month")}
          value={lender.breakEvenMonth === null ? t("Not reached") : formatMonths(lender.breakEvenMonth, 0, locale)}
          description={t("First month monthly cash flow turns positive without borrowing.")}
        />
        <MetricCard
          label={t("Lowest cash balance")}
          value={money(lender.lowestCashBalance)}
          description={t("Worst projected balance after every instalment, starting from cash on hand plus founder money plus the loan.")}
        />
        <MetricCard
          label={t("Collateral cover")}
          value={lender.collateralCoverageRatio === null ? "—" : formatMultiple(lender.collateralCoverageRatio, 2)}
          description={t("Pledged security measured against the loan.")}
          formula={t("Collateral Value / Loan Amount")}
        />
        <MetricCard
          label={t("Founder contribution")}
          value={formatPercentage(lender.founderContributionPct, 0)}
          description={t("The founders' own cash as a share of total funding — the first loss taken before the bank's.")}
          formula={t("Founder Contribution / (Founder Contribution + Loan)")}
        />
        <MetricCard
          label={t("Contracted revenue cover")}
          value={lender.contractedRevenueCover === null ? "—" : formatMultiple(lender.contractedRevenueCover, 2)}
          description={t("Signed-contract revenue against the monthly instalment. Forecast revenue is not committed revenue.")}
          formula={t("Contracted Monthly Revenue / Monthly Debt Service")}
        />
        <MetricCard
          label={t("Receivables")}
          value={money(lender.receivablesBalance)}
          description={t("Cash tied up waiting to be collected at the current revenue run rate.")}
          formula={t("Receivable Days / 30 × Monthly Revenue")}
        />
        <MetricCard
          label={t("Total repayment")}
          value={money(lender.totalRepayment)}
          description={t("Principal plus interest over the full term.")}
        />
      </div>

      <AudienceChecklist
        title="Credit checks"
        description="The tests a credit committee runs, in the order it runs them."
        checks={assessment.checks}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("Cash flow against debt service")}</CardTitle>
          <CardDescription>
            {t("Bars are what the business generates and what the loan costs each month; the line is the resulting coverage against the {target} target.", {
              target: formatMultiple(lender.targetDscr, 2),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis yAxisId="cash" tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={52} />
              <YAxis yAxisId="dscr" orientation="right" tickLine={false} axisLine={false} tick={AXIS_TICK} width={36} domain={[0, 4]} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(m) => t("Month {month}", { month: Number(m) })} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="dscr" y={lender.targetDscr} stroke="var(--color-chart-4)" strokeDasharray="4 4" />
              <ReferenceLine yAxisId="cash" y={0} stroke="var(--color-border)" />
              <Bar yAxisId="cash" dataKey="cashAvailableForDebtService" name={t("Cash available for debt service")} fill="var(--color-chart-1)" />
              <Bar yAxisId="cash" dataKey="debtService" name={t("Debt service")} fill="var(--color-chart-3)" />
              <Line yAxisId="dscr" type="monotone" dataKey="dscr" name={t("DSCR")} stroke="var(--color-chart-5)" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Coverage by year")}</CardTitle>
            <CardDescription>{t("The annual DSCR a credit memo quotes, and the cash behind it.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">{t("Year")}</th>
                  <th className="pb-2 text-right font-medium">{t("CFADS")}</th>
                  <th className="pb-2 text-right font-medium">{t("Debt service")}</th>
                  <th className="pb-2 text-right font-medium">{t("DSCR")}</th>
                </tr>
              </thead>
              <tbody>
                {lender.annual.map((year) => {
                  const tone: AudienceCheckStatus =
                    year.dscr === null ? "warn" : year.dscr >= lender.targetDscr ? "pass" : year.dscr >= 1 ? "warn" : "fail";
                  return (
                    <tr key={year.year} className="border-b border-border last:border-b-0">
                      <td className="py-2 text-foreground">{t("Year {year}", { year: year.year })}</td>
                      <td className="py-2 text-right tabular-nums text-foreground">{money(year.cashAvailableForDebtService)}</td>
                      <td className="py-2 text-right tabular-nums text-foreground">{money(year.debtService)}</td>
                      <td className={cn("py-2 text-right font-medium tabular-nums", STATUS_COLOR[tone])}>
                        {formatMultiple(year.dscr, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Downside case")}</CardTitle>
            <CardDescription>
              {t("The same schedule against revenue {haircut} below plan — the question a lender asks before the good case.", {
                haircut: formatPercentage(lender.downside.revenueHaircutPct, 0),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={cn("text-lg font-semibold", STATUS_COLOR[lender.downside.survives ? "pass" : "fail"])}>
              {lender.downside.survives
                ? t("The stressed plan still repays every instalment.")
                : t("The stressed plan cannot repay on schedule.")}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t("Stressed DSCR")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{formatMultiple(lender.downside.aggregateDscr, 2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Lowest monthly DSCR")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{formatMultiple(lender.downside.minDscr, 2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Months below 1.00x")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">
                  {lender.downside.monthsBelowOne} / {lender.termMonths}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Lowest cash balance")}</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{money(lender.downside.lowestCashBalance)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Security, guarantees and founder money")}</CardTitle>
          <CardDescription>{t("What the bank holds if the forecast is wrong.")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Collateral pledged")}</dt>
              <dd className="text-sm text-foreground">
                {money(val(project.debt?.collateralValue))}
                {project.debt?.collateralDescription ? ` — ${project.debt.collateralDescription}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Personal guarantee")}</dt>
              <dd className="text-sm text-foreground">{project.debt?.personalGuarantee ? t("Yes") : t("No")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Founder contribution")}</dt>
              <dd className="text-sm text-foreground">
                {money(val(project.debt?.founderContribution))} ({formatPercentage(lender.founderContributionPct, 0)})
              </dd>
            </div>
          </dl>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">{t("Contracted monthly revenue")}</dt>
              <dd className="text-sm text-foreground">{money(val(project.debt?.contractedMonthlyRevenue))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Existing monthly debt service")}</dt>
              <dd className="text-sm text-foreground">{money(val(project.debt?.existingMonthlyDebtService))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("Receivable days")}</dt>
              <dd className="text-sm text-foreground">{formatMonths(val(project.funding.receivableDays) / 30, 1, locale)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Repayment schedule")}</CardTitle>
          <CardDescription>
            {lender.gracePeriodMonths > 0
              ? t("Interest-only for the first {grace} months, then level instalments. Interest accrues throughout the grace period.", {
                  grace: lender.gracePeriodMonths,
                })
              : t("Level instalments across the full term.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">{t("Month")}</th>
                  <th className="pb-2 text-right font-medium">{t("Opening balance")}</th>
                  <th className="pb-2 text-right font-medium">{t("Interest")}</th>
                  <th className="pb-2 text-right font-medium">{t("Principal")}</th>
                  <th className="pb-2 text-right font-medium">{t("Instalment")}</th>
                  <th className="pb-2 text-right font-medium">{t("Closing balance")}</th>
                </tr>
              </thead>
              <tbody>
                {lender.schedule.map((row) => (
                  <tr key={row.month} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 text-foreground">{row.month}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{money(row.openingBalance)}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{money(row.interest)}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{money(row.principal)}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{money(row.payment)}</td>
                    <td className="py-1.5 text-right tabular-nums text-foreground">{money(row.closingBalance)}</td>
                  </tr>
                ))}
                {lender.schedule.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-muted-foreground">
                      {t("No loan amount to amortize yet.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
