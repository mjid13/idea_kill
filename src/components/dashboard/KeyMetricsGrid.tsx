import { useTranslations } from "next-intl";
import { MetricCard } from "./MetricCard";
import { findFactorScore, scoreToHealth } from "@/lib/health";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import type { CalculatedMetrics, Currency, ScoreBreakdown } from "@/types";

export function KeyMetricsGrid({ metrics, scores, currency }: { metrics: CalculatedMetrics; scores: ScoreBreakdown; currency: Currency }) {
  const t = useTranslations();
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
        description={t("Serviceable Obtainable Market — the portion of SAM you could realistically capture.")}
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
        value={metrics.breakEven.breakEvenCustomers === null ? t("Unreachable") : metrics.breakEven.breakEvenCustomers.toLocaleString()}
        description={t("Customers needed to cover fixed monthly costs.")}
        formula={t("Fixed Monthly Costs / Contribution Margin Per Customer")}
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
        value={metrics.funding.isProfitable ? t("No finite runway") : formatMonths(metrics.funding.runwayMonths)}
        description={t("Months of operating cash remaining at the current burn rate.")}
        formula={t("Available Cash / Monthly Burn")}
        health={runwayScore !== null ? scoreToHealth(runwayScore) : undefined}
      />
    </div>
  );
}
