"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function FundingStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const currency = useWatch({ control, name: "basicInfo.currency" });
  const preMoneyValuation = useWatch({ control, name: "funding.preMoneyValuation.value" }) ?? 0;
  const preMoneyQuality = useWatch({ control, name: "funding.preMoneyValuation.quality" });
  const initialInvestment = useWatch({ control, name: "funding.initialInvestment.value" }) ?? 0;

  const hasPreMoney = preMoneyQuality !== "unknown" && preMoneyValuation > 0;
  const postMoneyValuation = hasPreMoney ? preMoneyValuation + initialInvestment : null;
  const equityGivenUpPct = postMoneyValuation && postMoneyValuation > 0 ? (initialInvestment / postMoneyValuation) * 100 : null;
  const founderRemainingOwnershipPct = equityGivenUpPct === null ? null : 100 - equityGivenUpPct;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="funding.availableCash" label={t("Available cash")} prefix="$" />
        <AssumptionField control={control} name="funding.initialInvestment" label={t("Initial investment")} prefix="$" description={t("Cash being raised or contributed this round.")} />
        <AssumptionField control={control} name="funding.otherMonthlyIncome" label={t("Other monthly income")} prefix="$" description={t("Grants, interest, or other non-operating income that offsets burn.")} />
      </div>

      <div className="space-y-1.5 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">{t("Dilution & valuation (optional — only relevant if you're raising)")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AssumptionField
            control={control}
            name="funding.preMoneyValuation"
            label={t("Pre-money valuation")}
            prefix="$"
            description={t("The company's valuation before this round's investment is added.")}
          />
          <ComputedField
            label={t("Post-money valuation")}
            description={t("Pre-money valuation plus the initial investment.")}
            formula={t("Pre-Money Valuation + Initial Investment")}
            value={postMoneyValuation === null ? t("Enter pre-money valuation above") : formatCurrency(postMoneyValuation, currency)}
          />
          <ComputedField
            label={t("Equity given up")}
            description={t("Share of the company traded away for this round's investment.")}
            formula={t("Initial Investment / Post-Money Valuation")}
            value={equityGivenUpPct === null ? t("Enter pre-money valuation above") : formatPercentage(equityGivenUpPct)}
          />
          <ComputedField
            label={t("Founder remaining ownership")}
            description={t("Approximate ownership left after this round, assuming no prior outside equity.")}
            formula={t("100% − Equity Given Up")}
            value={founderRemainingOwnershipPct === null ? t("Enter pre-money valuation above") : formatPercentage(founderRemainingOwnershipPct)}
          />
        </div>
      </div>
    </div>
  );
}
