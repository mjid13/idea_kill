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
  const scenarios = [result.scenarios.conservative, result.scenarios.base, result.scenarios.optimistic];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario analysis</CardTitle>
        <CardDescription>Conservative applies weaker growth/CAC/churn; optimistic applies stronger. Base uses your entered assumptions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Metric</th>
                {scenarios.map((s) => (
                  <th key={s.name} className="py-2 pr-4 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                  {scenarios.map((s) => (
                    <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {row.isCurrency ? formatCurrency(s[row.key], currency, { compact: true }) : formatCompactNumber(s[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-border/60">
                <td className="py-2 pr-4 text-muted-foreground">Runway</td>
                {scenarios.map((s) => (
                  <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                    {s.runwayMonths === null ? "Profitable" : formatMonths(s.runwayMonths)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-4 text-muted-foreground">Break-even month</td>
                {scenarios.map((s) => (
                  <td key={s.name} className="py-2 pr-4 text-right tabular-nums text-foreground">
                    {s.breakEvenMonth === null ? "Not reached" : `Month ${s.breakEvenMonth}`}
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
