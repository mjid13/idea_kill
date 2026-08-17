import type { CalculatedMetrics, Insight, Project } from "@/types";
import { isRecurring, val } from "@/lib/calculations/helpers";
import { forecastProject } from "@/lib/calculations/projectForecast";

/**
 * Contradiction Detector — cross-checks assumptions that are entered in
 * different parts of the model and quietly disagree with each other:
 *
 * - `pricing.expectedCustomers12mo` vs the customer count the acquisition
 *   model actually projects at month 12 (the user says "6", the model says 5).
 * - `retention.averageCustomerLifetimeMonths` vs the lifetime the churn rate
 *   implies (a 2% churn and a 48-month lifetime cannot both be right).
 * - `market.averageAnnualCustomerSpend` vs the annualized price of the
 *   financial model (a TAM built on one ARPU and a forecast on another).
 * - CAC payback vs customer lifetime (customers who leave before they pay for
 *   their own acquisition — the economics contradict the retention story).
 *
 * Every rule reads the same derived metrics the rest of the report uses, so
 * the findings are reproducible and auditable — no AI. Messages/details are
 * translation keys with values travelling as params, matching the engine.
 */
export function detectContradictions(project: Project, metrics: CalculatedMetrics): Insight[] {
  const findings: Insight[] = [];

  checkCustomerTrajectory(project, metrics, findings);
  checkLifetimeVsChurn(project, metrics, findings);
  checkTamArpuVsPricing(project, metrics, findings);
  checkPaybackVsLifetime(metrics, findings);

  return findings;
}

let idCounter = 0;
function contradiction(
  message: string,
  detail?: string,
  messageParams?: Record<string, string | number>,
  detailParams?: Record<string, string | number>
): Insight {
  idCounter += 1;
  return { id: `contradiction-${idCounter}`, message, messageParams, detail, detailParams };
}

/**
 * Two figures are contradictory when they diverge by more than 15% — wide
 * enough that rounded inputs and the forecast's integer churn rounding never
 * trip it, narrow enough that "6 expected vs 5 projected" still does.
 */
function diverges(a: number, b: number): boolean {
  const relative = Math.abs(a - b) / Math.max(a, b, 1);
  return relative > 0.15;
}

/**
 * expectedCustomers12mo vs what the forecast actually produces. The forecast
 * is the same engine that drives the report's projections — it compounds the
 * acquisition rate at the growth rate and subtracts churn, so the gap between
 * its month-12 count and the founder's target is a real contradiction, not a
 * difference in rounding. Skipped when either side was never modeled.
 */
function checkCustomerTrajectory(project: Project, metrics: CalculatedMetrics, findings: Insight[]): void {
  const target = project.pricing.expectedCustomers12mo;
  if (!target || target.quality === "unknown" || val(target) <= 0) return;
  const acquired = project.acquisition.newCustomersAcquiredMonthly;
  if (!acquired || acquired.quality === "unknown" || val(acquired) <= 0) return;

  const forecast = forecastProject(project, metrics, 12);
  const implied = forecast.length >= 12 ? forecast[11].endingCustomers : null;
  // implied === 0 is still a finding: the model churns away the whole base
  // while the founder expects customers.
  if (implied === null) return;

  const expected = val(target);
  if (!diverges(expected, implied)) return;

  findings.push(
    contradiction(
      "Expected customer count contradicts the acquisition model.",
      "{expected} customers are expected in 12 months, but the acquisition model projects {implied}.",
      undefined,
      { expected: Math.round(expected), implied: Math.round(implied) }
    )
  );
}

/**
 * An entered customer-lifetime override vs the lifetime the churn rate
 * implies (1 / monthly churn). Both live on the same screen — the retention
 * section derives one from the other — so an override that disagrees is a
 * sign the founder changed one number without noticing the other.
 */
function checkLifetimeVsChurn(project: Project, metrics: CalculatedMetrics, findings: Insight[]): void {
  const entered = project.retention.averageCustomerLifetimeMonths;
  if (!entered || entered.quality === "unknown" || val(entered) <= 0) return;
  const churnPct = metrics.retention.monthlyChurnPct;
  // Churn of zero means an indefinite lifetime — nothing to contradict.
  if (churnPct <= 0) return;
  // The metrics module prefers an entered override, so the churn-implied
  // lifetime has to be derived here: 1 / monthly churn rate.
  const implied = 100 / churnPct;

  const lifetime = val(entered);
  if (!diverges(lifetime, implied)) return;

  findings.push(
    contradiction(
      "Customer lifetime contradicts the churn assumption.",
      "Lifetime is entered as {entered} months, but {churn}% monthly churn implies {implied} months.",
      undefined,
      {
        entered: lifetime.toFixed(1),
        churn: churnPct.toFixed(1),
        implied: implied.toFixed(1),
      }
    )
  );
}

/**
 * The market sizing builds TAM on `averageAnnualCustomerSpend`; the financial
 * model prices the same customer at `productPrice` (or the revenue mix's
 * recurring ARPU). Both are "what a customer is worth per year" — when they
 * diverge, the market section and the financial section tell the investor
 * different stories. Marketplace take rates are excluded: there the platform's
 * cut is *supposed* to be a fraction of what customers spend.
 */
function checkTamArpuVsPricing(project: Project, metrics: CalculatedMetrics, findings: Insight[]): void {
  if (metrics.marketplace !== null) return;

  const spend = project.market.averageAnnualCustomerSpend;
  if (!spend || spend.quality === "unknown" || val(spend) <= 0) return;

  const mix = metrics.revenueMix;
  const recurringArpu =
    mix && mix.recurringArpu > 0 ? mix.recurringArpu : isRecurring(project.pricing.billingPeriod) ? metrics.revenue.monthlyArpu : 0;
  if (recurringArpu <= 0) return;

  const modelAnnual = recurringArpu * 12;
  const marketAnnual = val(spend);
  if (!diverges(marketAnnual, modelAnnual)) return;

  findings.push(
    contradiction(
      "TAM revenue per customer contradicts the pricing model.",
      "Market sizing assumes {currency} {tam, number} per customer per year, but the pricing model implies {currency} {model, number}.",
      undefined,
      { currency: project.basicInfo.currency, tam: marketAnnual, model: modelAnnual }
    )
  );
}

/**
 * Payback longer than lifetime means a customer leaves before contributing
 * enough gross profit to repay what it cost to win them — the acquisition
 * math and the retention math cannot both hold.
 */
function checkPaybackVsLifetime(metrics: CalculatedMetrics, findings: Insight[]): void {
  const payback = metrics.unitEconomics.cacPaybackMonths;
  const lifetime = metrics.retention.customerLifetimeMonths;
  if (payback === null || payback <= 0 || lifetime === null || lifetime <= 0) return;
  if (payback <= lifetime) return;

  findings.push(
    contradiction(
      "Customers churn before paying back acquisition cost.",
      "Payback takes {payback} months, but customers stay only {lifetime} months.",
      undefined,
      { payback: payback.toFixed(1), lifetime: lifetime.toFixed(1) }
    )
  );
}
