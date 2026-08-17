"use client";

import { useMemo } from "react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useController, useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { Button } from "@/components/ui/button";
import { formValuesToProject } from "@/components/forms/formMapping";
import { calculateMetrics, calculateFundingRequirement } from "@/lib/calculations";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { Currency, FundingRequirementMetrics } from "@/types";

/**
 * The requirement is derived from the same forecast the dashboard uses, which
 * needs a whole project — so this step watches the entire form rather than a
 * few fields. Recomputing on every keystroke is cheap relative to a render:
 * the forecast is a bounded loop over at most 36 months.
 */
function useFundingRequirement(control: Control<ProjectFormValues>): FundingRequirementMetrics | null {
  const values = useWatch({ control }) as unknown as ProjectFormValues;
  return useMemo(() => {
    try {
      const project = formValuesToProject(values);
      return calculateFundingRequirement(project, calculateMetrics(project));
    } catch {
      // Mid-edit values can be transiently incomplete; the panel just waits.
      return null;
    }
  }, [values]);
}

function RequirementLine({ label, value, sign }: { label: string; value: string; sign: "plus" | "minus" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">
        <span className="mr-1 font-medium text-foreground">{sign === "plus" ? "+" : "−"}</span>
        {label}
      </span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function FundingRequirementSummary({
  requirement,
  currency,
  onUseAsFundingAsk,
}: {
  requirement: FundingRequirementMetrics;
  currency: Currency;
  onUseAsFundingAsk: () => void;
}) {
  const t = useAppTranslations();
  const money = (value: number) => formatCurrency(value, currency, { compact: true });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Required financing")}</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {requirement.isSelfFunded ? t("No raise needed") : money(requirement.requiredFinancing)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t("Recommended raise")}</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {requirement.isSelfFunded ? "—" : money(requirement.recommendedRaise)}
          </p>
          {!requirement.isSelfFunded && (
            <p className="text-[11px] text-muted-foreground">
              {t("{pct} contingency included.", { pct: formatPercentage(requirement.contingencyPct, 0) })}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-3">
        <RequirementLine
          sign="plus"
          label={t("Cash needed until milestone ({months} months)", { months: requirement.monthsToMilestone })}
          value={money(requirement.operatingSpendToMilestone)}
        />
        <RequirementLine sign="plus" label={t("Safety buffer")} value={money(requirement.safetyBuffer)} />
        <RequirementLine sign="plus" label={t("Working capital")} value={money(requirement.workingCapital)} />
        <RequirementLine sign="plus" label={t("CAPEX")} value={money(requirement.capex)} />
        <RequirementLine sign="minus" label={t("Expected cash receipts")} value={money(requirement.expectedCashReceipts)} />
        <RequirementLine sign="minus" label={t("Cash on hand")} value={money(requirement.cashOnHand)} />
      </div>

      {requirement.isSelfFunded ? (
        <p className="text-xs text-muted-foreground">
          {t("Projected receipts and cash on hand already cover this plan — no external financing required.")}
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {requirement.breakEvenMonth === null
              ? t("The forecast does not reach break-even within 36 months.")
              : t("Forecast reaches break-even in month {month}.", { month: requirement.breakEvenMonth })}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onUseAsFundingAsk}>
            {t("Use as funding ask")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function FundingStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const currency = useWatch({ control, name: "basicInfo.currency" });
  const preMoneyValuation = useWatch({ control, name: "funding.preMoneyValuation.value" }) ?? 0;
  const preMoneyQuality = useWatch({ control, name: "funding.preMoneyValuation.quality" });
  const initialInvestment = useWatch({ control, name: "funding.initialInvestment.value" }) ?? 0;
  const requirement = useFundingRequirement(control);

  const fundingAskValue = useController({ control, name: "pitch.fundingAsk.value" });
  const fundingAskQuality = useController({ control, name: "pitch.fundingAsk.quality" });

  const hasPreMoney = preMoneyQuality !== "unknown" && preMoneyValuation > 0;
  const postMoneyValuation = hasPreMoney ? preMoneyValuation + initialInvestment : null;
  const equityGivenUpPct = postMoneyValuation && postMoneyValuation > 0 ? (initialInvestment / postMoneyValuation) * 100 : null;
  const founderRemainingOwnershipPct = equityGivenUpPct === null ? null : 100 - equityGivenUpPct;

  function applyRecommendedRaiseAsFundingAsk() {
    if (!requirement || requirement.isSelfFunded) return;
    fundingAskValue.field.onChange(requirement.recommendedRaise);
    fundingAskQuality.field.onChange("estimated");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssumptionField control={control} name="funding.availableCash" label={t("Available cash")} prefix="$" />
        <AssumptionField control={control} name="funding.initialInvestment" label={t("Initial investment")} prefix="$" description={t("Cash being raised or contributed this round.")} />
        <AssumptionField control={control} name="funding.otherMonthlyIncome" label={t("Other monthly income")} prefix="$" description={t("Grants, interest, or other non-operating income that offsets burn.")} />
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t("Funding requirement")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("Describe the plan and the raise is sized from it — no need to guess an amount.")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AssumptionField
            control={control}
            name="funding.monthsToMilestone"
            label={t("Months to milestone")}
            suffix={t("mo")}
            description={t("How many months of the plan this raise has to fund before the next milestone is reached.")}
          />
          <AssumptionField
            control={control}
            name="funding.safetyBufferMonths"
            label={t("Safety buffer")}
            suffix={t("mo")}
            description={t("Extra months of net burn held back beyond the milestone window.")}
          />
          <AssumptionField
            control={control}
            name="funding.receivableDays"
            label={t("Customer payment terms")}
            suffix={t("days")}
            description={t("Average days between invoicing a customer and collecting the cash. Drives the working-capital requirement.")}
          />
          <AssumptionField
            control={control}
            name="funding.capex"
            label={t("One-time CAPEX")}
            prefix="$"
            description={t("Equipment, fit-out, deposits, or licenses this plan has to pay for up front.")}
          />
          <AssumptionField
            control={control}
            name="funding.contingencyPct"
            label={t("Contingency")}
            suffix="%"
            description={t("Added on top of required financing to produce the recommended raise.")}
          />
        </div>
        {requirement && (
          <FundingRequirementSummary
            requirement={requirement}
            currency={currency}
            onUseAsFundingAsk={applyRecommendedRaiseAsFundingAsk}
          />
        )}
      </div>

      <div className="space-y-1.5 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">{t("Dilution & valuation (optional — only relevant if we're raising)")}</p>
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
