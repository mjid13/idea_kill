# Product Viability Calculator

Evaluate the *economics* of a startup idea — market size, unit economics,
profitability, runway, validation, and risk — from a small set of assumptions.
The tool does not predict success. It scores the quality of your current
assumptions and tells you what to fix, validate, or test next.

**Few inputs → useful derived metrics → transparent score → clear risks → actionable next steps.**

## Contents

- [Architecture](#architecture)
- [Setup](#setup)
- [Calculation formulas](#calculation-formulas)
- [Scoring methodology](#scoring-methodology)
- [Business-model benchmarks](#business-model-benchmarks)
- [Confidence vs. viability](#confidence-vs-viability)
- [Persistence & future database migration](#persistence--future-database-migration)
- [Testing](#testing)

## Architecture

The app is a Next.js (App Router) + TypeScript + Tailwind + shadcn/ui project.
Business logic is kept entirely out of React components:

```text
/src
  /app                     Routes (landing, wizard, dashboard, projects, compare, report)
  /components
    /ui                    shadcn/ui primitives
    /forms                 Multi-step wizard, field components, form <-> domain mapping
    /dashboard              Score, metrics, insights, sensitivity, scenarios, charts
    /layout                Header
  /lib
    /calculations           Pure financial calculation engine (TAM/SAM/SOM, CAC, LTV,
                             break-even, forecasting, scenarios, sensitivity)
    /scoring                Scoring engine: benchmarks, category scorers, confidence,
                             validation maturity
    /insights               Deterministic insight + decision-summary generation
    /storage                ProjectRepository interface + LocalStorageProjectRepository
    /validation              Zod schema for the wizard
    format.ts               Currency/percentage/multiple/month formatting helpers
    example.ts               Pre-populated example project
  /types                    Domain types: Project, *Assumptions, CalculatedMetrics,
                             ScoreBreakdown, ForecastMonth, ScenarioResult, …
```

Every calculation is a pure function of typed inputs — no React, no I/O — and is
unit tested independently of the UI (see [Testing](#testing)).

## Setup

```bash
npm install
npm run dev      # start the dev server on http://localhost:3000
npm run test     # run the vitest suite
npm run lint     # eslint
npm run build    # production build (also runs the TypeScript compiler)
```

No environment variables or backend are required. All data is stored in the
browser's `localStorage`.

## Calculation formulas

All formulas live in `/src/lib/calculations` as small, single-purpose modules.
The most important ones, verbatim:

| Metric | Formula | Module |
|---|---|---|
| TAM | Total Potential Customers × Average Annual Customer Spend | `market.ts` |
| SAM | TAM × Addressable Market % | `market.ts` |
| SOM | SAM × Obtainable Market % | `market.ts` |
| Required penetration | Target Customers / Addressable Customers | `market.ts` |
| MRR | Monthly Customers × Monthly ARPU | `pricing.ts` |
| ARR | MRR × 12 | `pricing.ts` |
| CAC | (Marketing Spend + Sales Spend) / New Customers | `acquisition.ts` |
| Customer lifetime (months) | 1 / Monthly Churn Rate | `retention.ts` |
| Gross margin | Gross Profit / Revenue | `unitEconomics.ts` |
| LTV | Monthly ARPU × Gross Margin % / Monthly Churn Rate | `unitEconomics.ts` |
| LTV:CAC | LTV / CAC | `unitEconomics.ts` |
| CAC payback (months) | CAC / Monthly Gross Profit Per Customer | `unitEconomics.ts` |
| Monthly burn | max(0, Operating Expenses − Revenue) | `opex.ts` |
| Runway (months) | Available Cash / Monthly Burn | `funding.ts` |
| Break-even customers | Fixed Monthly Costs / Contribution Margin Per Customer | `breakeven.ts` |
| Break-even revenue | Break-even Customers × ARPU | `breakeven.ts` |

**Edge cases** (zero churn, zero CAC, zero revenue, negative contribution margin,
already-profitable businesses, one-time/annual/usage-based billing) are handled
explicitly in each module — see `helpers.ts` (`safeDiv`, `finiteOrZero`) and the
accompanying `__tests__` files. The UI never renders `NaN`, `Infinity`, or
`undefined`; `/src/lib/format.ts` guards every formatter.

Forecasts (`forecast.ts`, `projectForecast.ts`) generate a month-by-month
projection (customers, MRR, revenue, costs, cash balance) for any horizon;
12/24/36-month views and the scenario engine (`scenarios.ts`) all call the same
function with different inputs. The sensitivity engine (`sensitivity.ts`) flexes
price/CAC/churn/growth ±50% and re-runs the full scoring pipeline to rank which
assumptions move the score the most.

## Scoring methodology

`calculateScoreBreakdown()` in `/src/lib/scoring/index.ts` combines six category
scores (each 0-100) into one overall 0-100 score:

```text
Overall = Market × 20% + Unit Economics × 20% + Financial Viability × 20%
        + Validation × 15% + Execution × 15% + Risk × 10%
```

Each category (`/src/lib/scoring/{market,unitEconomics,financial,validation,execution,risk}.ts`)
documents exactly which inputs it considers and how they're weighted internally.
Scores are computed with `interpolateScore()` (`interpolate.ts`), which linearly
interpolates a metric value between named anchor points (e.g. LTV:CAC of 1x →
20/100, 3x → 68/100, 5x → 90/100) rather than generating arbitrary numbers — every
anchor is visible in source and in the "How this score is calculated" panel on
the dashboard.

Classification bands:

| Score | Label |
|---|---|
| 0–39 | High Risk |
| 40–54 | Weak |
| 55–69 | Promising |
| 70–84 | Strong |
| 85–100 | Very Strong |

## Business-model benchmarks

Gross margin, LTV:CAC, CAC payback, and churn benchmarks differ by business
model — a marketplace's healthy gross margin looks nothing like a SaaS
product's. `/src/lib/scoring/benchmarks.ts` exports:

```ts
const BUSINESS_MODEL_BENCHMARKS: Record<BusinessModel, BusinessModelBenchmarks> = {
  saas: { grossMarginPct: [...], ltvToCac: [...], cacPaybackMonths: [...], monthlyChurnPct: [...] },
  marketplace: { ... },
  ecommerce: { ... },
  service: { ... },
  one_time: { ... },
  // subscription and usage_based currently alias saas; "other" aliases service
};
```

**To tune a benchmark**, edit the anchor points for that business model in
`benchmarks.ts` — each array is `[metricValue, score]` pairs; no other file
needs to change. To add a new business model, add it to the `BusinessModel`
union in `/src/types/index.ts`, add a benchmark set here, and add an option to
`BUSINESS_MODEL_OPTIONS` in `/src/lib/constants.ts`.

## Confidence vs. viability

The **viability score** evaluates whether the economics work *given the
numbers entered*. The **confidence score** (`/src/lib/scoring/confidence.ts`,
0-100%) is a separate axis measuring how much real evidence backs those
numbers — the share of inputs marked "Known" vs. "Estimated" vs. "Unknown",
plus demonstrated validation evidence (interviews, users, paying customers,
LOIs) and whether CAC/churn are based on real data. A project can score 85 on
viability and 30% on confidence if the inputs are mostly guesses — the
dashboard always shows both, deliberately not conflated into one number.

**Validation maturity** (`/src/lib/scoring/maturity.ts`, Stage 0–5: Idea →
Problem Validated → Solution Validated → Revenue Validated → Growth Validated →
Scale Ready) is a third, independent signal — it does not feed the viability
score.

## Persistence & future database migration

All persistence goes through the `ProjectRepository` interface
(`/src/lib/storage/types.ts`):

```ts
interface ProjectRepository {
  getAll(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}
```

The MVP ships `LocalStorageProjectRepository`. To move to Postgres/Supabase
later, write a new class implementing the same interface (e.g.
`SupabaseProjectRepository`) and swap the single exported instance in
`/src/lib/storage/localStorageRepository.ts` — no calling code changes, because
every page/component depends on the interface, not the implementation.

## Testing

```bash
npm run test
```

58 vitest unit tests cover the calculation engine (TAM/SAM/SOM, CAC, LTV,
LTV:CAC, gross margin, break-even, runway, forecasts, scenarios — including
zero-churn, zero-CAC, zero-revenue, and negative-margin edge cases), the
scoring engine (category boundaries, weight sums, worst-case/best-case
scores), the insights engine, and the formatting helpers. Financial
correctness is treated as more important than visual polish, per the project's
own principle.
