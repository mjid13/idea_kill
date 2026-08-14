"use client";

import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { formatMonths, formatPercentage } from "@/lib/format";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { getBenchmarks } from "@/lib/scoring/benchmarks";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function RetentionStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const monthlyChurn = useWatch({ control, name: "retention.monthlyChurnPct.value" }) ?? 0;
  const monthlyChurnQuality = useWatch({ control, name: "retention.monthlyChurnPct.quality" });
  const businessModel = useWatch({ control, name: "basicInfo.businessModel" });
  const expansionPct = useWatch({ control, name: "retention.monthlyExpansionRevenuePct.value" }) ?? 0;
  const expansionQuality = useWatch({ control, name: "retention.monthlyExpansionRevenuePct.quality" });
  const contractionPct = useWatch({ control, name: "retention.monthlyContractionRevenuePct.value" }) ?? 0;
  const contractionQuality = useWatch({ control, name: "retention.monthlyContractionRevenuePct.quality" });

  const hasChurn = monthlyChurnQuality !== "unknown" && monthlyChurn > 0;
  const annualChurn = hasChurn ? (1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100 : null;
  const lifetimeMonths = hasChurn ? 100 / monthlyChurn : null;
  const typicalChurn = getBenchmarks(businessModel).typicalMonthlyChurnPct;

  const hasExpansionData = expansionQuality !== "unknown" || contractionQuality !== "unknown";
  const netMonthlyRetentionPct = Math.max(0, 100 - monthlyChurn - contractionPct + expansionPct);
  const nrr = hasExpansionData ? Math.pow(netMonthlyRetentionPct / 100, 12) * 100 : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField
        control={control}
        name="retention.monthlyChurnPct"
        label={t("Monthly churn rate")}
        suffix="%"
        step={0.5}
        formula={t("Customer Lifetime (months) = 1 / Monthly Churn Rate")}
        description={t("Percentage of customers who cancel each month. Annual churn and customer lifetime below are calculated from this automatically.")}
        hint={t("Typical for {model}: {range} monthly", {
          model: t(BUSINESS_MODEL_LABELS[businessModel]),
          range: typicalChurn,
        })}
      />
      <ComputedField
        label={t("Annual churn rate")}
        description={t("Derived from monthly churn — compounded over 12 months.")}
        formula={t("1 − (1 − Monthly Churn)^12")}
        value={annualChurn === null ? t("Enter monthly churn above") : formatPercentage(annualChurn)}
      />
      <ComputedField
        label={t("Average customer lifetime")}
        description={t("Derived from monthly churn.")}
        formula={t("1 / Monthly Churn Rate")}
        value={lifetimeMonths === null ? t("Enter monthly churn above") : formatMonths(lifetimeMonths, 1, locale)}
      />
      <AssumptionField
        control={control}
        name="retention.monthlyExpansionRevenuePct"
        label={t("Monthly expansion revenue")}
        suffix="%"
        step={0.5}
        description={t("Revenue added each month from upsells/upgrades to existing customers, as a % of MRR.")}
      />
      <AssumptionField
        control={control}
        name="retention.monthlyContractionRevenuePct"
        label={t("Monthly contraction revenue")}
        suffix="%"
        step={0.5}
        description={t("Revenue lost each month from downgrades among existing customers, as a % of MRR.")}
      />
      <ComputedField
        label={t("Net revenue retention (annualized)")}
        description={t("Revenue retained from existing customers after churn, contraction, and expansion. Point-in-time — forecasts below apply this month over month.")}
        formula={t("(1 − Churn − Contraction + Expansion)^12")}
        value={nrr === null ? t("Enter expansion or contraction above") : formatPercentage(nrr, 0)}
      />
    </div>
  );
}
