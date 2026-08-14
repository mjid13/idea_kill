"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { formatCurrency } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function MarketplaceStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const currency = useWatch({ control, name: "basicInfo.currency" });
  const currentCustomers = useWatch({ control, name: "pricing.currentCustomers.value" }) ?? 0;
  const aov = useWatch({ control, name: "marketplace.averageOrderValue.value" }) ?? 0;
  const aovQuality = useWatch({ control, name: "marketplace.averageOrderValue.quality" });
  const takeRatePct = useWatch({ control, name: "marketplace.takeRatePct.value" }) ?? 0;
  const takeRateQuality = useWatch({ control, name: "marketplace.takeRatePct.quality" });
  const transactionsPerCustomer = useWatch({ control, name: "marketplace.transactionsPerCustomerPerMonth.value" }) ?? 0;
  const transactionsQuality = useWatch({ control, name: "marketplace.transactionsPerCustomerPerMonth.quality" });

  const hasData = aovQuality !== "unknown" || takeRateQuality !== "unknown" || transactionsQuality !== "unknown";
  const gmv = hasData ? currentCustomers * transactionsPerCustomer * aov : null;
  const takeRateRevenue = gmv === null ? null : gmv * (takeRatePct / 100);
  const effectiveArpu = takeRateRevenue === null || currentCustomers <= 0 ? null : takeRateRevenue / currentCustomers;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="marketplace.averageOrderValue"
        label={t("Average order value")}
        prefix="$"
        description={t("The average value of a single transaction on the marketplace.")}
      />
      <AssumptionField
        control={control}
        name="marketplace.transactionsPerCustomerPerMonth"
        label={t("Transactions per customer per month")}
        step={0.1}
        description={t("How often the average active customer transacts each month.")}
      />
      <AssumptionField
        control={control}
        name="marketplace.takeRatePct"
        label={t("Take rate")}
        suffix="%"
        step={0.5}
        description={t("The % of each transaction's value that you keep as revenue.")}
      />
      <ComputedField
        label={t("Gross Merchandise Value (GMV)")}
        description={t("Total transaction volume flowing through the marketplace each month.")}
        formula={t("Customers x Transactions per Customer x Average Order Value")}
        value={gmv === null ? t("Enter marketplace assumptions above") : formatCurrency(gmv, currency)}
      />
      <ComputedField
        label={t("Take-rate revenue")}
        description={t("Your actual monthly revenue — GMV multiplied by your take rate.")}
        formula={t("GMV x Take Rate")}
        value={takeRateRevenue === null ? t("Enter marketplace assumptions above") : formatCurrency(takeRateRevenue, currency)}
      />
      <ComputedField
        label={t("Effective revenue per customer")}
        description={t("Take-rate revenue divided by current customers — replaces a flat subscription-style ARPU for marketplaces.")}
        formula={t("Take-Rate Revenue / Current Customers")}
        value={effectiveArpu === null ? t("Enter marketplace assumptions above") : formatCurrency(effectiveArpu, currency)}
      />
    </div>
  );
}
