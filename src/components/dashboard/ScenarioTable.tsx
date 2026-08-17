import { useLocale } from "next-intl";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCompactNumber, formatCurrency, formatMonths } from "@/lib/format";
import type { Currency, ScenarioResult } from "@/types";

const ROWS: Array<{ label: string; key: "revenue" | "mrr" | "customers" | "profit"; isCurrency: boolean }> = [
  { label: "Revenue (month 24)", key: "revenue", isCurrency: true },
  { label: "MRR (month 24)", key: "mrr", isCurrency: true },
  { label: "Customers (month 24)", key: "customers", isCurrency: false },
  { label: "Net cash flow (month 24)", key: "profit", isCurrency: true },
];

export function ScenarioTable({ result, currency }: { result: ScenarioResult; currency: Currency }) {
  const t = useAppTranslations();
  const locale = useLocale();
  const scenarios = [result.scenarios.conservative, result.scenarios.base, result.scenarios.optimistic];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Scenario analysis")}</CardTitle>
        <CardDescription>{t("Conservative applies weaker growth/CAC/churn; optimistic applies stronger. Base uses our entered assumptions.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{t("Metric")}</th>
                {scenarios.map((s) => (
                  <th key={s.name} className="py-2 pr-4 text-right font-medium">
                    {t(s.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{t(row.label)}</td>
                  {scenarios.map((s) => (
                    <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {row.isCurrency ? formatCurrency(s[row.key], currency, { compact: true }) : formatCompactNumber(s[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 text-muted-foreground">{t("Runway")}</td>
                {scenarios.map((s) => (
                  <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                    {s.runwayMonths === null ? t("Profitable") : formatMonths(s.runwayMonths, 1, locale)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">{t("Break-even month")}</td>
                {scenarios.map((s) => (
                  <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                    {s.breakEvenMonth === null ? t("Not reached") : t("Month {month}", { month: s.breakEvenMonth })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
