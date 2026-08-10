import type { ReactNode } from "react";

interface StepSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Groups related fields within a wizard step under a small heading (e.g. "Problem" within Validation). */
export function StepSection({ title, description, children }: StepSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
