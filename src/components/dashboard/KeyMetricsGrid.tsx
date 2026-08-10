import { MetricCard } from "./MetricCard";
import { findFactorScore, scoreToHealth } from "@/lib/health";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import type { CalculatedMetrics, Currency, ScoreBreakdown } from "@/types";

export function KeyMetricsGrid({ metrics, scores, currency }: { metrics: CalculatedMetrics; scores: ScoreBreakdown; currency: Currency }) {
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
      <MetricCard label="TAM" value={money(metrics.market.tam)} description="Total Addressable Market — the full revenue opportunity if every potential customer bought." formula="Total Potential Customers × Average Annual Spend" />
      <MetricCard
        label="SAM"
        value={money(metrics.market.sam)}
        description="Serviceable Available Market — the portion of TAM realistically addressable."
        formula="TAM × Addressable Market %"
        health={samScore !== null ? scoreToHealth(samScore) : undefined}
      />
      <MetricCard
        label="SOM"
        value={money(metrics.market.som)}
        description="Serviceable Obtainable Market — the portion of SAM you could realistically capture."
        formula="SAM × Obtainable Market %"
        health={somScore !== null ? scoreToHealth(somScore) : undefined}
      />
      <MetricCard label="MRR" value={money(metrics.revenue.mrr)} description="Monthly Recurring Revenue." formula="Monthly Customers × Monthly ARPU" />
      <MetricCard label="ARR" value={money(metrics.revenue.arr)} description="Annual Recurring Revenue." formula="MRR × 12" />
      <MetricCard
        label="CAC"
        value={money(metrics.acquisition.cac)}
        description="Customer Acquisition Cost — average spend to acquire one paying customer."
        formula="(Sales + Marketing Spend) / New Customers"
        health={paybackScore !== null ? scoreToHealth(paybackScore) : undefined}
      />
      <MetricCard
        label="LTV"
        value={money(metrics.unitEconomics.ltv)}
        description="Customer Lifetime Value, based on contribution margin rather than raw revenue."
        formula="Monthly ARPU × Gross Margin % / Monthly Churn Rate"
      />
      <MetricCard
        label="LTV:CAC"
        value={formatMultiple(metrics.unitEconomics.ltvToCacRatio)}
        description="Lifetime value relative to acquisition cost. 3x+ is generally considered healthy."
        formula="LTV / CAC"
        health={ltvCacScore !== null ? scoreToHealth(ltvCacScore) : undefined}
      />
      <MetricCard
        label="Gross Margin"
        value={formatPercentage(metrics.unitEconomics.grossMarginPct)}
        description="Gross profit as a share of revenue, after variable costs."
        formula="Gross Profit / Revenue"
        health={marginScore !== null ? scoreToHealth(marginScore) : undefined}
      />
      <MetricCard
        label="Break-even Customers"
        value={metrics.breakEven.breakEvenCustomers === null ? "Unreachable" : metrics.breakEven.breakEvenCustomers.toLocaleString()}
        description="Customers needed to cover fixed monthly costs."
        formula="Fixed Monthly Costs / Contribution Margin Per Customer"
        health={breakEvenScore !== null ? scoreToHealth(breakEvenScore) : undefined}
      />
      <MetricCard
        label="Monthly Burn"
        value={metrics.operating.isCashFlowPositive ? "Cash Flow Positive" : money(metrics.operating.monthlyBurn)}
        description="Monthly expenses minus revenue. Never shown as negative — profitable months are labeled Cash Flow Positive."
        formula="Operating Expenses − Revenue"
        health={burnScore !== null ? scoreToHealth(burnScore) : undefined}
      />
      <MetricCard
        label="Runway"
        value={metrics.funding.isProfitable ? "No finite runway" : formatMonths(metrics.funding.runwayMonths)}
        description="Months of operating cash remaining at the current burn rate."
        formula="Available Cash / Monthly Burn"
        health={runwayScore !== null ? scoreToHealth(runwayScore) : undefined}
      />
    </div>
  );
}
