import type { CalculatedMetrics, Project, ScenarioName, ScenarioResult, ScenarioSummary } from "@/types";
import { forecastProject } from "./projectForecast";
import { findBreakEvenMonth } from "./forecast";

interface ScenarioMultipliers {
  growthMultiplier: number;
  churnMultiplier: number;
  cacMultiplier: number; // informational; not used to alter customer forecast, kept for symmetry
  expansionMultiplier: number;
  contractionMultiplier: number;
}

/** Deltas applied to base assumptions to produce each scenario, per spec section 23. */
const SCENARIO_MULTIPLIERS: Record<ScenarioName, ScenarioMultipliers> = {
  conservative: { growthMultiplier: 0.7, churnMultiplier: 1.25, cacMultiplier: 1.25, expansionMultiplier: 0.7, contractionMultiplier: 1.25 },
  base: { growthMultiplier: 1, churnMultiplier: 1, cacMultiplier: 1, expansionMultiplier: 1, contractionMultiplier: 1 },
  optimistic: { growthMultiplier: 1.3, churnMultiplier: 0.85, cacMultiplier: 0.85, expansionMultiplier: 1.3, contractionMultiplier: 0.75 },
};

const SCENARIO_LABELS: Record<ScenarioName, string> = {
  conservative: "Conservative",
  base: "Base",
  optimistic: "Optimistic",
};

const FORECAST_MONTHS = 24;

export function generateScenarios(project: Project, metrics: CalculatedMetrics): ScenarioResult {
  const scenarios = {} as Record<ScenarioName, ScenarioSummary>;
  const forecasts = {} as Record<ScenarioName, ReturnType<typeof forecastProject>>;

  (Object.keys(SCENARIO_MULTIPLIERS) as ScenarioName[]).forEach((name) => {
    const { growthMultiplier, churnMultiplier, expansionMultiplier, contractionMultiplier } = SCENARIO_MULTIPLIERS[name];

    const forecast = forecastProject(project, metrics, FORECAST_MONTHS, {
      growthMultiplier,
      churnMultiplier,
      expansionMultiplier,
      contractionMultiplier,
    });
    forecasts[name] = forecast;

    const lastMonth = forecast[forecast.length - 1];
    const breakEvenMonth = findBreakEvenMonth(forecast);
    const cashDepletedMonth = forecast.find((m) => m.cashBalance < 0);

    scenarios[name] = {
      name,
      label: SCENARIO_LABELS[name],
      revenue: lastMonth.revenue,
      mrr: lastMonth.mrr,
      customers: lastMonth.endingCustomers,
      profit: lastMonth.netCashFlow,
      runwayMonths: cashDepletedMonth ? cashDepletedMonth.month : null,
      breakEvenMonth,
    };
  });

  return { scenarios, forecasts };
}
