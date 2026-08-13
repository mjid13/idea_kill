import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classifyScore, CLASSIFICATION_DESCRIPTIONS } from "@/lib/scoring";
import type { ScoreBreakdown } from "@/types";

const CLASSIFICATION_COLOR: Record<string, string> = {
  "High Risk": "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  Weak: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Promising: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Very Strong": "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function ScoreHero({ scores }: { scores: ScoreBreakdown }) {
  const t = useAppTranslations();
  const classification = classifyScore(scores.overall);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Product Viability Score")}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">{scores.overall}</span>
            <span className="text-lg text-muted-foreground">/ 100</span>
          </div>
          <Badge variant="outline" className={`mt-2 ${CLASSIFICATION_COLOR[classification]}`}>
            {t(classification)}
          </Badge>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t(CLASSIFICATION_DESCRIPTIONS[classification])}</p>
        </div>

        <div className="flex gap-6 sm:border-l sm:border-border sm:pl-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Confidence")}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{scores.confidence}%</p>
            <p className="mt-1 max-w-40 text-[11px] text-muted-foreground">{t("How much real-world evidence supports these assumptions.")}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Maturity")}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{t("Stage {stage}", { stage: scores.maturityStage.stage })}</p>
            <p className="mt-1 max-w-36 text-[11px] text-muted-foreground">{t(scores.maturityStage.label)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
