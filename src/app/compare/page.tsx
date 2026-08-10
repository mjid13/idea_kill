"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { calculateMetrics } from "@/lib/calculations";
import { calculateScoreBreakdown, classifyScore } from "@/lib/scoring";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import type { Project } from "@/types";

interface Row {
  project: Project;
  metrics: ReturnType<typeof calculateMetrics>;
  scores: ReturnType<typeof calculateScoreBreakdown>;
}

function bestIndex(values: Array<number | null>, higherIsBetter = true): number | null {
  const finite = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null && Number.isFinite(x.v));
  if (finite.length < 2) return null;
  const best = finite.reduce((a, b) => (higherIsBetter ? (b.v > a.v ? b : a) : b.v < a.v ? b : a));
  return best.i;
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = useMemo(() => (searchParams.get("ids") ?? "").split(",").filter(Boolean), [searchParams]);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const all = await Promise.all(ids.map((id) => projectRepository.getById(id)));
      const found = all.filter((p): p is Project => p !== null);
      setRows(
        found.map((project) => {
          const metrics = calculateMetrics(project);
          const scores = calculateScoreBreakdown(project, metrics);
          return { project, metrics, scores };
        })
      );
    })();
  }, [ids]);

  const currency = rows?.[0]?.project.basicInfo.currency ?? "USD";

  const metricRows: Array<{
    label: string;
    get: (r: Row) => string;
    raw: (r: Row) => number | null;
    higherIsBetter?: boolean;
  }> = rows
    ? [
        { label: "Viability score", get: (r) => `${r.scores.overall}/100 (${classifyScore(r.scores.overall)})`, raw: (r) => r.scores.overall },
        { label: "Confidence", get: (r) => `${r.scores.confidence}%`, raw: (r) => r.scores.confidence },
        { label: "TAM", get: (r) => formatCurrency(r.metrics.market.tam, currency, { compact: true }), raw: (r) => r.metrics.market.tam },
        { label: "SOM", get: (r) => formatCurrency(r.metrics.market.som, currency, { compact: true }), raw: (r) => r.metrics.market.som },
        { label: "ARR", get: (r) => formatCurrency(r.metrics.revenue.arr, currency, { compact: true }), raw: (r) => r.metrics.revenue.arr },
        { label: "Gross margin", get: (r) => formatPercentage(r.metrics.unitEconomics.grossMarginPct), raw: (r) => r.metrics.unitEconomics.grossMarginPct },
        { label: "CAC", get: (r) => formatCurrency(r.metrics.acquisition.cac, currency, { compact: true }), raw: (r) => r.metrics.acquisition.cac, higherIsBetter: false },
        { label: "LTV", get: (r) => formatCurrency(r.metrics.unitEconomics.ltv, currency, { compact: true }), raw: (r) => r.metrics.unitEconomics.ltv },
        { label: "LTV:CAC", get: (r) => formatMultiple(r.metrics.unitEconomics.ltvToCacRatio), raw: (r) => r.metrics.unitEconomics.ltvToCacRatio },
        {
          label: "Break-even customers",
          get: (r) => (r.metrics.breakEven.breakEvenCustomers === null ? "Unreachable" : r.metrics.breakEven.breakEvenCustomers.toLocaleString()),
          raw: (r) => r.metrics.breakEven.breakEvenCustomers,
          higherIsBetter: false,
        },
        {
          label: "Runway",
          get: (r) => (r.metrics.funding.isProfitable ? "Profitable" : formatMonths(r.metrics.funding.runwayMonths)),
          raw: (r) => r.metrics.funding.runwayMonths,
        },
        { label: "Validation", get: (r) => `${r.scores.categories.validation.score}/100`, raw: (r) => r.scores.categories.validation.score },
        { label: "Execution", get: (r) => `${r.scores.categories.execution.score}/100`, raw: (r) => r.scores.categories.execution.score },
        { label: "Risk (safety)", get: (r) => `${r.scores.categories.risk.score}/100`, raw: (r) => r.scores.categories.risk.score },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compare projects</h1>
            <p className="text-sm text-muted-foreground">Select 2 or more saved projects to compare side by side.</p>
          </div>

          {rows && rows.length < 2 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted-foreground">Select at least two projects on the Projects page to compare them.</p>
                <Button render={<Link href="/projects">Go to projects</Link>} />
              </CardContent>
            </Card>
          )}

          {rows && rows.length >= 2 && (
            <Card>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Metric</th>
                      {rows.map((r) => (
                        <th key={r.project.id} className="py-2 pr-4 text-left font-medium">
                          <Link href={`/project/${r.project.id}`} className="text-foreground hover:underline">
                            {r.project.basicInfo.name || "Untitled"}
                          </Link>
                          <div className="text-[10px] font-normal text-muted-foreground">{BUSINESS_MODEL_LABELS[r.project.basicInfo.businessModel]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map((row) => {
                      const values = rows.map(row.raw);
                      const winner = bestIndex(values, row.higherIsBetter ?? true);
                      return (
                        <tr key={row.label} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                          {rows.map((r, i) => (
                            <td
                              key={r.project.id}
                              className={`py-2 pr-4 tabular-nums ${i === winner ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                            >
                              {row.get(r)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
