import { Card, CardContent } from "@/components/ui/card";
import type { DecisionSummary as DecisionSummaryType } from "@/types";

const VERDICT_COLOR: Record<DecisionSummaryType["verdict"], string> = {
  strong_candidate: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  explore_further: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  validate_before_building: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  improve_economics: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high_risk: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
};

export function DecisionSummary({ summary }: { summary: DecisionSummaryType }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Should you pursue this idea?</p>
          <div className={`mt-2 inline-flex rounded-lg border px-3 py-1.5 text-base font-semibold ${VERDICT_COLOR[summary.verdict]}`}>
            {summary.title}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{summary.description}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Top reasons</p>
          <ul className="mt-1.5 space-y-1.5">
            {summary.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-foreground">{i + 1}.</span> {reason}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
