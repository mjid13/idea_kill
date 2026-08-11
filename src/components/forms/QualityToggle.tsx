"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { DataQuality } from "@/types";

const OPTIONS: Array<{ value: DataQuality; label: string }> = [
  { value: "known", label: "Known" },
  { value: "estimated", label: "Est." },
  { value: "unknown", label: "Unknown" },
];

interface QualityToggleProps {
  value: DataQuality;
  onChange: (value: DataQuality) => void;
}

/** Lets the user mark whether an assumption is a real number, an estimate, or unknown (spec section 31). */
export function QualityToggle({ value, onChange }: QualityToggleProps) {
  const t = useTranslations();
  return (
    <div className="inline-flex rounded-md border border-border p-0.5 text-[11px]">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[5px] px-1.5 py-0.5 font-medium transition-colors",
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t(opt.label)}
        </button>
      ))}
    </div>
  );
}
