"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { useWatch, type Control } from "react-hook-form";
import { AssumptionField } from "@/components/forms/AssumptionField";
import { ComputedField } from "@/components/forms/ComputedField";
import { formatPercentage } from "@/lib/format";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";

export function AcquisitionStep({ control }: { control: Control<ProjectFormValues> }) {
  const t = useAppTranslations();
  const leads = useWatch({ control, name: "acquisition.monthlyLeads.value" }) ?? 0;
  const leadsQuality = useWatch({ control, name: "acquisition.monthlyLeads.quality" });
  const newCustomers = useWatch({ control, name: "acquisition.newCustomersAcquiredMonthly.value" }) ?? 0;

  const hasLeads = leadsQuality !== "unknown" && leads > 0;
  const conversion = hasLeads ? (newCustomers / leads) * 100 : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <AssumptionField control={control} name="acquisition.monthlyMarketingSpend" label={t("Monthly marketing spend")} prefix="$" />
      <AssumptionField control={control} name="acquisition.monthlySalesSpend" label={t("Monthly sales spend")} prefix="$" />
      <AssumptionField
        control={control}
        name="acquisition.newCustomersAcquiredMonthly"
        label={t("New customers acquired / month")}
        description={t("Drives CAC = (marketing + sales spend) / new customers.")}
        formula={t("(Marketing + Sales Spend) / New Customers")}
      />
      <AssumptionField
        control={control}
        name="acquisition.monthlyLeads"
        label={t("Monthly leads")}
        description={t("Optional — enter this to have lead-to-customer conversion calculated automatically below.")}
      />
      <ComputedField
        label={t("Lead-to-customer conversion rate")}
        description={t("Calculated from monthly leads and new customers acquired — no need to enter it separately.")}
        formula={t("New Customers / Monthly Leads")}
        value={conversion === null ? t("Enter monthly leads above") : formatPercentage(conversion)}
      />
    </div>
  );
}
