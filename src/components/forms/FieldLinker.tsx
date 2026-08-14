"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { ProjectFormValues } from "@/lib/validation/projectSchema";
import type { Assumption, DataQuality } from "@/types";
import { normalizeToMonthlyArpu } from "@/lib/calculations/helpers";

type LinkedTargetPath =
  | "unitEconomics.revenuePerCustomer"
  | "costs.marketing"
  | "costs.sales"
  | "pricing.expectedCustomers12mo";

/**
 * Recalculate callbacks for fields that are auto-filled from another step,
 * keyed by target field path. Populated by FieldLinker; consumed by
 * AssumptionField to show a "recalculate from source" affordance.
 */
const FieldLinkContext = createContext<Partial<Record<LinkedTargetPath, () => void>>>({});

/** Returns a recalculate callback for the given field path, if it's a linked target with a usable source value right now. */
export function useFieldLink(name: string) {
  const links = useContext(FieldLinkContext);
  return links[name as LinkedTargetPath];
}

function inheritedQuality(q: DataQuality): DataQuality {
  return q === "known" ? "known" : "estimated";
}

/**
 * Auto-fills a target Assumption field from a related source field, so the
 * user never has to re-enter a number that's already known elsewhere in the
 * wizard. Only takes effect while the target still looks untouched (its
 * initial value is the pristine {value:0, quality:'unknown'} factory
 * default) — an existing project's independently-entered value is never
 * clobbered. The link also self-disables the moment the user edits the
 * target field directly, so a deliberate override always wins — the user can
 * re-sync at any time via the recalculate icon returned here.
 */
function useLinkedAssumption(
  form: UseFormReturn<ProjectFormValues>,
  targetPath: LinkedTargetPath,
  sourceValue: number,
  sourceQuality: DataQuality
) {
  const linkedRef = useRef<boolean | null>(null);
  const lastSetRef = useRef<number | null>(null);

  if (linkedRef.current === null) {
    const initial = form.getValues(targetPath) as Assumption<number>;
    linkedRef.current = initial.value === 0 && initial.quality === "unknown";
  }

  const applyFromSource = () => {
    if (sourceQuality === "unknown") return;
    const nextValue = Math.round(sourceValue * 100) / 100;
    const nextQuality = inheritedQuality(sourceQuality);
    linkedRef.current = true;
    lastSetRef.current = nextValue;
    form.setValue(`${targetPath}.value`, nextValue, { shouldDirty: true });
    form.setValue(`${targetPath}.quality`, nextQuality, { shouldDirty: true });
  };

  useEffect(() => {
    const current = form.getValues(targetPath) as Assumption<number>;
    if (lastSetRef.current !== null && current.value !== lastSetRef.current) {
      // The user (or a loaded project) changed the target independently — stop linking.
      linkedRef.current = false;
    }
    if (!linkedRef.current) return;
    if (sourceQuality === "unknown") return;

    const nextValue = Math.round(sourceValue * 100) / 100;
    const nextQuality = inheritedQuality(sourceQuality);
    lastSetRef.current = nextValue;
    form.setValue(`${targetPath}.value`, nextValue, { shouldDirty: false });
    form.setValue(`${targetPath}.quality`, nextQuality, { shouldDirty: false });
    // Only re-run when the source changes; targetPath/form are stable across the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceValue, sourceQuality]);

  return sourceQuality === "unknown" ? undefined : applyFromSource;
}

/** Wires up the cross-step field links declared below and exposes their recalculate callbacks to descendants via context. */
export function FieldLinker({ form, children }: { form: UseFormReturn<ProjectFormValues>; children: ReactNode }) {
  const { control } = form;

  // Unit economics revenue-per-customer <- pricing (normalized to monthly ARPU).
  const price = useWatch({ control, name: "pricing.productPrice.value" });
  const priceQuality = useWatch({ control, name: "pricing.productPrice.quality" });
  const billingPeriod = useWatch({ control, name: "pricing.billingPeriod" });
  const monthlyArpu = normalizeToMonthlyArpu(price ?? 0, billingPeriod);
  const recalcRevenuePerCustomer = useLinkedAssumption(form, "unitEconomics.revenuePerCustomer", monthlyArpu, priceQuality);

  // Operating-expense marketing/sales lines <- acquisition spend (same dollars, same line item).
  const marketingSpend = useWatch({ control, name: "acquisition.monthlyMarketingSpend.value" });
  const marketingQuality = useWatch({ control, name: "acquisition.monthlyMarketingSpend.quality" });
  const recalcMarketing = useLinkedAssumption(form, "costs.marketing", marketingSpend ?? 0, marketingQuality);

  const salesSpend = useWatch({ control, name: "acquisition.monthlySalesSpend.value" });
  const salesQuality = useWatch({ control, name: "acquisition.monthlySalesSpend.quality" });
  const recalcSales = useLinkedAssumption(form, "costs.sales", salesSpend ?? 0, salesQuality);

  // Pricing's 12-month customer target <- market's planning-horizon target customers.
  const targetCustomers = useWatch({ control, name: "market.targetCustomers.value" });
  const targetCustomersQuality = useWatch({ control, name: "market.targetCustomers.quality" });
  const recalcExpectedCustomers = useLinkedAssumption(form, "pricing.expectedCustomers12mo", targetCustomers ?? 0, targetCustomersQuality);

  const links: Partial<Record<LinkedTargetPath, () => void>> = {
    "unitEconomics.revenuePerCustomer": recalcRevenuePerCustomer,
    "costs.marketing": recalcMarketing,
    "costs.sales": recalcSales,
    "pricing.expectedCustomers12mo": recalcExpectedCustomers,
  };

  return <FieldLinkContext.Provider value={links}>{children}</FieldLinkContext.Provider>;
}
