import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent } from "@/components/ui/card";
import { HEALTH_BAR_COLOR, categoryHealth } from "@/lib/health";
import { cn } from "@/lib/utils";
import type { ScoreBreakdown as ScoreBreakdownType } from "@/types";

function ScoreBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

const CATEGORY_ORDER: Array<keyof ScoreBreakdownType["categories"]> = [
  "market",
  "unitEconomics",
  "financial",
  "validation",
  "execution",
  "risk",
];

export function ScoreBreakdown({ scores }: { scores: ScoreBreakdownType }) {
  const t = useAppTranslations();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_ORDER.map((key) => {
          const category = scores.categories[key];
          const health = categoryHealth(category);
          return (
            <Card key={key} size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{t(category.label)}</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{category.score}/100</p>
                </div>
                <ScoreBar value={category.score} colorClass={HEALTH_BAR_COLOR[health]} />
                <p className="text-[11px] text-muted-foreground">
                  {Math.round(category.weight * 100)}
                  {t("% of overall score")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <details className="group rounded-lg border border-border bg-card text-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-foreground select-none">
          {t("How this score is calculated")}
        </summary>
        <div className="space-y-4 border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground">
            {t(
              "Overall Score = Market × 20% + Unit Economics × 20% + Financial Viability × 20% + Validation × 15% + Execution × 15% + Risk × 10%. Every category score is 0-100, derived transparently from our inputs and business-model-specific benchmarks — nothing here is a guess."
            )}
          </p>
          {CATEGORY_ORDER.map((key) => {
            const category = scores.categories[key];
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-foreground">
                  {t(category.label)} — {Math.round(category.weight * 100)}%
                </p>
                <ul className="mt-1 space-y-1">
                  {category.factors.map((f) => (
                    <li key={f.label} className="flex items-start justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>
                        {t(f.label)} — {t(f.detail)}
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">{f.score}/100</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
