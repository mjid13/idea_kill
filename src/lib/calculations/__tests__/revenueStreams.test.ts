import { describe, expect, it } from "vitest";
import { calculateRevenueMix } from "../revenueStreams";
import { calculateUnitEconomicsMetrics } from "../unitEconomics";
import { calculateMetrics } from "../metrics";
import { forecastProject } from "../projectForecast";
import { exampleProject } from "@/lib/example";
import { estimated, known, unknownValue } from "@/types";
import type { Project, RevenueStream, UnitEconomicsAssumptions } from "@/types";

function stream(overrides: Partial<RevenueStream> & Pick<RevenueStream, "id" | "kind">): RevenueStream {
  return {
    name: overrides.id,
    price: known(0),
    billingPeriod: "monthly",
    attachRatePct: estimated(100),
    unitsPerCustomerPerMonth: estimated(1),
    deliveryCostPct: known(0),
    ...overrides,
  };
}

/**
 * The mix the user described: an AI consultancy that sells an audit, an
 * implementation project, a platform subscription, metered AI usage, and an
 * enterprise support retainer — five streams, three economic shapes.
 */
function hybridStreams(): RevenueStream[] {
  return [
    stream({ id: "audit", kind: "one_time", name: "AI audit", price: known(5000), deliveryCostPct: known(60) }),
    stream({ id: "impl", kind: "one_time", name: "Implementation", price: known(20000), deliveryCostPct: known(50) }),
    stream({ id: "platform", kind: "recurring", name: "Platform", price: known(1000), deliveryCostPct: known(10) }),
    stream({ id: "usage", kind: "usage", name: "AI usage", price: known(2), unitsPerCustomerPerMonth: known(250), deliveryCostPct: known(40) }),
    stream({ id: "support", kind: "recurring", name: "Support", price: known(500), attachRatePct: known(50), deliveryCostPct: known(30) }),
  ];
}

const context = { currentCustomers: 10, newCustomersPerMonth: 2 };

describe("calculateRevenueMix", () => {
  it("returns null when there are no streams, or none carry a price yet", () => {
    expect(calculateRevenueMix(undefined, context)).toBeNull();
    expect(calculateRevenueMix([], context)).toBeNull();
    expect(calculateRevenueMix([stream({ id: "a", kind: "recurring", price: unknownValue(0) })], context)).toBeNull();
  });

  it("splits recurring from one-time instead of averaging them into one price", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;

    // Recurring per customer: 1000 platform + 500 usage (2 x 250) + 250 support (500 x 50% attach).
    expect(mix.recurringArpu).toBe(1750);
    // One-time per acquired customer: 5000 audit + 20000 implementation.
    expect(mix.oneTimeRevenuePerNewCustomer).toBe(25000);

    expect(mix.monthlyRecurringRevenue).toBe(1750 * 10);
    expect(mix.monthlyOneTimeRevenue).toBe(25000 * 2);
    expect(mix.totalMonthlyRevenue).toBe(17500 + 50000);
    expect(mix.recurringRevenueSharePct).toBeCloseTo((17500 / 67500) * 100, 6);
  });

  it("weights margins by revenue, so services drag the blend down proportionally", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;

    // Recurring: 1000 @ 90% + 500 @ 60% + 250 @ 70% = (900 + 300 + 175) / 1750.
    expect(mix.recurringGrossMarginPct).toBeCloseTo((1375 / 1750) * 100, 6);
    // One-time: 5000 @ 40% + 20000 @ 50% = (2000 + 10000) / 25000.
    expect(mix.oneTimeGrossMarginPct).toBeCloseTo((12000 / 25000) * 100, 6);
    expect(mix.blendedGrossMarginPct).toBeCloseTo(((1375 + 12000) / 26750) * 100, 6);
  });

  it("normalizes annual recurring contracts into a monthly figure", () => {
    const mix = calculateRevenueMix(
      [stream({ id: "annual", kind: "recurring", price: known(12000), billingPeriod: "annual" })],
      context
    )!;
    expect(mix.recurringArpu).toBe(1000);
  });

  it("applies attach rate to every kind", () => {
    const mix = calculateRevenueMix(
      [stream({ id: "setup", kind: "one_time", price: known(1000), attachRatePct: known(30) })],
      context
    )!;
    expect(mix.oneTimeRevenuePerNewCustomer).toBe(300);
  });

  it("prices a transactional stream off GMV and its take rate", () => {
    const mix = calculateRevenueMix(
      [
        stream({
          id: "fees",
          kind: "transactional",
          price: known(40),
          unitsPerCustomerPerMonth: known(3),
          takeRatePct: known(20),
        }),
      ],
      context
    )!;
    expect(mix.monthlyGmv).toBe(40 * 3 * 10);
    expect(mix.recurringArpu).toBe(24);
    expect(mix.monthlyRecurringRevenue).toBe(240);
  });

  it("treats an unset attach rate as 100% and unset units as 1, so a price alone still counts", () => {
    const mix = calculateRevenueMix(
      [
        stream({
          id: "bare",
          kind: "usage",
          price: known(9),
          attachRatePct: unknownValue(0),
          unitsPerCustomerPerMonth: unknownValue(0),
        }),
      ],
      context
    )!;
    expect(mix.recurringArpu).toBe(9);
  });
});

describe("hybrid unit economics", () => {
  const costs: UnitEconomicsAssumptions = {
    revenuePerCustomer: known(0),
    directCostPerCustomer: known(0),
    paymentProcessingPct: known(0),
    infrastructureCostPerCustomer: known(0),
    supportCostPerCustomer: known(0),
    otherVariableCostPerCustomer: known(0),
  };

  it("collects one-time contribution once and recurring contribution over the lifetime", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;
    const metrics = calculateUnitEconomicsMetrics(costs, mix.recurringArpu, 6000, 5, mix);

    expect(metrics.oneTimeGrossProfitPerCustomer).toBe(12000);
    expect(metrics.recurringGrossProfitPerCustomer).toBe(1375);
    // 20-month lifetime at 5% monthly churn.
    expect(metrics.ltv).toBe(12000 + 1375 * 20);
  });

  it("pays CAC down with the upfront work before amortizing the remainder", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;

    // A $6k CAC is already covered by $12k of implementation margin.
    expect(calculateUnitEconomicsMetrics(costs, mix.recurringArpu, 6000, 5, mix).cacPaybackMonths).toBe(0);

    // A $15k CAC leaves $3k for the recurring stream to work off.
    expect(calculateUnitEconomicsMetrics(costs, mix.recurringArpu, 15000, 5, mix).cacPaybackMonths).toBeCloseTo(
      3000 / 1375,
      6
    );
  });

  it("charges customer-level costs against the recurring half only", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;
    const withCosts = calculateUnitEconomicsMetrics(
      { ...costs, supportCostPerCustomer: known(75), infrastructureCostPerCustomer: known(25) },
      mix.recurringArpu,
      null,
      5,
      mix
    );
    expect(withCosts.recurringGrossProfitPerCustomer).toBe(1375 - 100);
    expect(withCosts.oneTimeGrossProfitPerCustomer).toBe(12000);
  });

  it("charges payment processing against both halves", () => {
    const mix = calculateRevenueMix(hybridStreams(), context)!;
    const withProcessing = calculateUnitEconomicsMetrics({ ...costs, paymentProcessingPct: known(3) }, mix.recurringArpu, null, 5, mix);
    expect(withProcessing.recurringGrossProfitPerCustomer).toBeCloseTo(1375 - 1750 * 0.03, 6);
    expect(withProcessing.oneTimeGrossProfitPerCustomer).toBeCloseTo(12000 - 25000 * 0.03, 6);
  });

  it("leaves single-stream projects on the original formulas", () => {
    const single = calculateUnitEconomicsMetrics({ ...costs, revenuePerCustomer: known(100), directCostPerCustomer: known(20) }, 100, 200, 5);
    expect(single.grossProfitPerCustomer).toBe(80);
    expect(single.recurringGrossProfitPerCustomer).toBe(80);
    expect(single.oneTimeGrossProfitPerCustomer).toBe(0);
    expect(single.cacPaybackMonths).toBe(2.5);
  });
});

function hybridProject(): Project {
  return {
    ...exampleProject,
    pricing: { ...exampleProject.pricing, currentCustomers: known(10), expectedMonthlyCustomerGrowthPct: known(0) },
    acquisition: { ...exampleProject.acquisition, newCustomersAcquiredMonthly: known(2) },
    retention: { ...exampleProject.retention, monthlyChurnPct: known(5), monthlyExpansionRevenuePct: known(0), monthlyContractionRevenuePct: known(0) },
    unitEconomics: {
      revenuePerCustomer: known(0),
      directCostPerCustomer: known(0),
      paymentProcessingPct: known(0),
      infrastructureCostPerCustomer: known(0),
      supportCostPerCustomer: known(0),
      otherVariableCostPerCustomer: known(0),
    },
    revenueStreams: hybridStreams(),
  };
}

describe("calculateMetrics — hybrid revenue mix", () => {
  it("keeps one-time revenue out of MRR/ARR but inside total revenue", () => {
    const metrics = calculateMetrics(hybridProject());
    expect(metrics.revenueMix).not.toBeNull();
    expect(metrics.revenue.mrr).toBe(17500);
    expect(metrics.revenue.arr).toBe(17500 * 12);
    expect(metrics.revenue.monthlyRevenue).toBe(67500);
    expect(metrics.revenue.monthlyArpu).toBe(1750);
  });

  it("wins over the single-price pricing model", () => {
    const project = hybridProject();
    const withoutStreams = calculateMetrics({ ...project, revenueStreams: [] });
    const withStreams = calculateMetrics(project);
    expect(withStreams.revenue.mrr).not.toBe(withoutStreams.revenue.mrr);
    expect(withoutStreams.revenueMix).toBeNull();
  });

  it("counts one-time work against the fixed cost base when sizing break-even", () => {
    const project = hybridProject();
    const metrics = calculateMetrics(project);
    // $24k/month of one-time contribution (2 customers x $12k) covers a fixed
    // cost base far smaller than that, so no subscribers are needed to break even.
    expect(metrics.breakEven.breakEvenCustomers).toBe(0);
  });
});

describe("forecastProject — hybrid revenue mix", () => {
  it("bills recurring streams to the base and one-time streams to new customers", () => {
    const project = hybridProject();
    const metrics = calculateMetrics(project);
    const [first] = forecastProject(project, metrics, 3);

    // Month 1: 10 starting customers + 2 new - 1 churned (5% of 10, rounded) = 11.
    expect(first.endingCustomers).toBe(11);
    expect(first.recurringRevenue).toBe(11 * 1750);
    expect(first.oneTimeRevenue).toBe(2 * 25000);
    expect(first.revenue).toBe(first.recurringRevenue + first.oneTimeRevenue);
  });

  it("applies each half's own margin to gross profit", () => {
    const project = hybridProject();
    const metrics = calculateMetrics(project);
    const [first] = forecastProject(project, metrics, 1);
    const mix = metrics.revenueMix!;

    expect(first.grossProfit).toBeCloseTo(
      first.recurringRevenue * (mix.recurringGrossMarginPct / 100) +
        first.oneTimeRevenue * (mix.oneTimeGrossMarginPct / 100),
      6
    );
  });

  it("does not double-count a mix made entirely of one-time streams", () => {
    const project: Project = {
      ...hybridProject(),
      revenueStreams: [stream({ id: "audit", kind: "one_time", price: known(5000), deliveryCostPct: known(60) })],
    };
    const metrics = calculateMetrics(project);
    const [first] = forecastProject(project, metrics, 1);

    expect(first.recurringRevenue).toBe(0);
    expect(first.oneTimeRevenue).toBe(2 * 5000);
    expect(first.revenue).toBe(10000);
  });
});

/**
 * The double-counting report: `deliveryCostPct` and the Unit Economics cost
 * lines are additive by design, so both have to reach the forecast *and* the
 * break-even figure. When only one of them did, a project could show positive
 * monthly cash flow while the break-even section called break-even impossible.
 */
describe("cost model — forecast and unit economics agree", () => {
  function costedProject(): Project {
    return {
      ...hybridProject(),
      unitEconomics: {
        revenuePerCustomer: known(1750),
        directCostPerCustomer: known(50),
        paymentProcessingPct: known(3),
        infrastructureCostPerCustomer: known(100),
        supportCostPerCustomer: known(80),
        otherVariableCostPerCustomer: known(20),
      },
    };
  }

  it("subtracts customer-level costs and payment processing from forecast gross profit", () => {
    const project = costedProject();
    const metrics = calculateMetrics(project);
    const mix = metrics.revenueMix!;
    const [first] = forecastProject(project, metrics, 1);

    expect(first.grossProfit).toBeCloseTo(
      first.recurringRevenue * (mix.recurringGrossMarginPct / 100) +
        first.oneTimeRevenue * (mix.oneTimeGrossMarginPct / 100) -
        first.endingCustomers * 250 -
        first.revenue * 0.03,
      6
    );
  });

  it("reconstructs forecast gross profit from the same contributions break-even divides by", () => {
    const project = costedProject();
    const metrics = calculateMetrics(project);
    const [first] = forecastProject(project, metrics, 1);

    expect(first.grossProfit).toBeCloseTo(
      first.endingCustomers * metrics.unitEconomics.recurringGrossProfitPerCustomer +
        first.newCustomers * metrics.unitEconomics.oneTimeGrossProfitPerCustomer,
      6
    );
  });

  it("never reports positive cash flow off a customer base whose contribution is negative", () => {
    // Customer-level costs alone exceed the $1,375 recurring contribution, and
    // the one-time streams are removed so nothing else can carry the month.
    const project: Project = {
      ...costedProject(),
      revenueStreams: hybridStreams().filter((s) => s.kind !== "one_time"),
      unitEconomics: { ...costedProject().unitEconomics, supportCostPerCustomer: known(2000) },
    };
    const metrics = calculateMetrics(project);
    const [first] = forecastProject(project, metrics, 1);

    expect(metrics.unitEconomics.recurringGrossProfitPerCustomer).toBeLessThan(0);
    expect(metrics.breakEven.breakEvenCustomers).toBeNull();
    expect(first.grossProfit).toBeLessThan(0);
    expect(first.netCashFlow).toBeLessThan(0);
  });

  it("leaves projects with no customer-level costs entered exactly where they were", () => {
    const project = hybridProject();
    const metrics = calculateMetrics(project);
    const mix = metrics.revenueMix!;
    const [first] = forecastProject(project, metrics, 1);

    expect(first.grossProfit).toBeCloseTo(
      first.recurringRevenue * (mix.recurringGrossMarginPct / 100) +
        first.oneTimeRevenue * (mix.oneTimeGrossMarginPct / 100),
      6
    );
  });
});
