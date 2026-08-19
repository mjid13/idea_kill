import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { MetricCard } from "./MetricCard";
import { findFactorScore, scoreToHealth, type HealthStatus } from "@/lib/health";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import type { CalculatedMetrics, ConcentrationRiskLevel, Currency, ScoreBreakdown } from "@/types";

const CONCENTRATION_HEALTH: Record<ConcentrationRiskLevel, HealthStatus> = {
  low: "Strong",
  moderate: "Weak",
  high: "Risky",
  severe: "Risky",
};

export function KeyMetricsGrid({ metrics, scores, currency }: { metrics: CalculatedMetrics; scores: ScoreBreakdown; currency: Currency }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const samScore = findFactorScore(scores, "market", "SAM");
  const somScore = findFactorScore(scores, "market", "SOM");
  const marginScore = findFactorScore(scores, "unitEconomics", "Gross margin");
  const ltvCacScore = findFactorScore(scores, "unitEconomics", "LTV:CAC");
  const paybackScore = findFactorScore(scores, "unitEconomics", "CAC payback");
  const runwayScore = findFactorScore(scores, "financial", "runway");
  const burnScore = findFactorScore(scores, "financial", "Burn");
  const breakEvenScore = findFactorScore(scores, "financial", "Break-even");

  const money = (v: number | null) => formatCurrency(v, currency, { compact: true });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <MetricCard label={t("TAM")} value={money(metrics.market.tam)} description={t("Total Addressable Market — the full revenue opportunity if every potential customer bought.")} formula={t("Total Potential Customers × Average Annual Spend")} />
      <MetricCard
        label={t("SAM")}
        value={money(metrics.market.sam)}
        description={t("Serviceable Available Market — the portion of TAM realistically addressable.")}
        formula={t("TAM × Addressable Market %")}
        health={samScore !== null ? scoreToHealth(samScore) : undefined}
      />
      <MetricCard
        label={t("SOM")}
        value={money(metrics.market.som)}
        description={t("Serviceable Obtainable Market — the portion of SAM we could realistically capture.")}
        formula={t("SAM × Obtainable Market %")}
        health={somScore !== null ? scoreToHealth(somScore) : undefined}
      />
      <MetricCard label={t("MRR")} value={money(metrics.revenue.mrr)} description={t("Monthly Recurring Revenue.")} formula={t("Monthly Customers × Monthly ARPU")} />
      <MetricCard label={t("ARR")} value={money(metrics.revenue.arr)} description={t("Annual Recurring Revenue.")} formula={t("MRR × 12")} />
      <MetricCard
        label={t("CAC")}
        value={money(metrics.acquisition.cac)}
        description={t("Customer Acquisition Cost — average spend to acquire one paying customer.")}
        formula={t("(Sales + Marketing Spend) / New Customers")}
        health={paybackScore !== null ? scoreToHealth(paybackScore) : undefined}
      />
      <MetricCard
        label={t("LTV")}
        value={money(metrics.unitEconomics.ltv)}
        description={t("Customer Lifetime Value, based on contribution margin rather than raw revenue.")}
        formula={t("Monthly ARPU × Gross Margin % / Monthly Churn Rate")}
      />
      <MetricCard
        label={t("LTV:CAC")}
        value={formatMultiple(metrics.unitEconomics.ltvToCacRatio)}
        description={t("Lifetime value relative to acquisition cost. 3x+ is generally considered healthy.")}
        formula={t("LTV / CAC")}
        health={ltvCacScore !== null ? scoreToHealth(ltvCacScore) : undefined}
      />
      <MetricCard
        label={t("Gross Margin")}
        value={formatPercentage(metrics.unitEconomics.grossMarginPct)}
        description={t("Gross profit as a share of revenue, after variable costs.")}
        formula={t("Gross Profit / Revenue")}
        health={marginScore !== null ? scoreToHealth(marginScore) : undefined}
      />
      <MetricCard
        label={t("Break-even Customers")}
        value={metrics.breakEven.breakEvenCustomers === null ? t("Unreachable") : metrics.breakEven.breakEvenCustomers.toLocaleString(locale)}
        description={
          // With a mix these are subscribers, and one-time work has already
          // paid down part of the fixed base — spelling that out keeps this
          // card readable next to a forecast that includes both halves.
          metrics.revenueMix
            ? t("Subscribers needed to cover the fixed costs left after this month's one-time work.")
            : t("Customers needed to cover fixed monthly costs.")
        }
        formula={
          metrics.revenueMix
            ? t("(Fixed Monthly Costs − Monthly One-time Contribution) / Recurring Contribution Margin Per Customer")
            : t("Fixed Monthly Costs / Contribution Margin Per Customer")
        }
        health={breakEvenScore !== null ? scoreToHealth(breakEvenScore) : undefined}
      />
      <MetricCard
        label={t("Monthly Burn")}
        value={metrics.operating.isCashFlowPositive ? t("Cash Flow Positive") : money(metrics.operating.monthlyBurn)}
        description={t("Monthly expenses minus revenue. Never shown as negative — profitable months are labeled Cash Flow Positive.")}
        formula={t("Operating Expenses − Revenue")}
        health={burnScore !== null ? scoreToHealth(burnScore) : undefined}
      />
      <MetricCard
        label={t("Runway")}
        value={metrics.funding.isProfitable ? t("No finite runway") : formatMonths(metrics.funding.runwayMonths, 1, locale)}
        description={t("Months of operating cash remaining at the current burn rate.")}
        formula={t("Available Cash / Monthly Burn")}
        health={runwayScore !== null ? scoreToHealth(runwayScore) : undefined}
      />
      <MetricCard
        label={t("Net Revenue Retention")}
        value={formatPercentage(metrics.retention.netRevenueRetentionPct, 0)}
        description={t("Annualized revenue retained from existing customers after churn, contraction, and expansion. 100%+ means existing customers grow revenue on their own.")}
        formula={t("(1 − Churn − Contraction + Expansion)^12")}
      />
      <MetricCard
        label={t("Customer Concentration")}
        value={formatPercentage(metrics.concentration.topCustomersRevenueSharePct, 0)}
        description={t("Estimated share of revenue from our largest few customers.")}
        formula={t("Top Customers' Revenue / Total Revenue")}
        health={CONCENTRATION_HEALTH[metrics.concentration.riskLevel]}
        healthLabel={metrics.concentration.riskLevel}
      />
      {metrics.marketplace && (
        <>
          <MetricCard
            label={t("GMV")}
            value={money(metrics.marketplace.gmv)}
            description={t("Gross Merchandise Value — total monthly transaction volume flowing through the marketplace.")}
            formula={t("Customers x Transactions per Customer x Average Order Value")}
          />
          <MetricCard
            label={t("Take-rate Revenue")}
            value={money(metrics.marketplace.takeRateRevenue)}
            description={t("Our actual monthly revenue — GMV multiplied by our take rate.")}
            formula={t("GMV x Take Rate")}
          />
        </>
      )}
      {metrics.dilution.postMoneyValuation !== null && (
        <>
          <MetricCard
            label={t("Post-money Valuation")}
            value={money(metrics.dilution.postMoneyValuation)}
            description={t("Pre-money valuation plus the initial investment.")}
            formula={t("Pre-Money Valuation + Initial Investment")}
          />
          <MetricCard
            label={t("Equity Given Up")}
            value={formatPercentage(metrics.dilution.equityGivenUpPct, 1)}
            description={t("Share of the company traded away for this round's investment.")}
            formula={t("Initial Investment / Post-Money Valuation")}
          />
        </>
      )}
    </div>
  );
}
