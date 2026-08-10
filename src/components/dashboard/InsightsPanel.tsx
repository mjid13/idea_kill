import { AlertTriangle, CheckCircle2, Lightbulb, ShieldAlert, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight, InsightReport } from "@/types";

function InsightGroup({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: typeof CheckCircle2;
  items: Insight[];
  tone: "emerald" | "amber" | "red" | "blue";
}) {
  if (items.length === 0) return null;
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  }[tone];

  return (
    <div>
      <div className={`mb-2 flex items-center gap-1.5 text-sm font-semibold ${toneClass}`}>
        <Icon className="size-4" />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-background/50 p-2.5">
            <p className="text-sm text-foreground">{item.message}</p>
            {item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsPanel({ report }: { report: InsightReport }) {
  const hasAny =
    report.strengths.length + report.warnings.length + report.criticalRisks.length + report.opportunities.length > 0;

  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <InsightGroup title="Critical risks" icon={ShieldAlert} items={report.criticalRisks} tone="red" />
        <InsightGroup title="Warnings" icon={AlertTriangle} items={report.warnings} tone="amber" />
        <InsightGroup title="Strengths" icon={CheckCircle2} items={report.strengths} tone="emerald" />
        <InsightGroup title="Opportunities" icon={Lightbulb} items={report.opportunities} tone="blue" />
      </CardContent>
    </Card>
  );
}

export function RecommendedActions({ items }: { items: Insight[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <ListChecks className="size-4" /> Recommended next experiments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li key={item.id} className="flex gap-2.5 text-sm text-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                {i + 1}
              </span>
              {item.message}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
