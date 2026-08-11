"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Printer, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { calculateMetrics, generateScenarios } from "@/lib/calculations";
import { calculateScoreBreakdown, classifyScore, CLASSIFICATION_DESCRIPTIONS } from "@/lib/scoring";
import { generateInsights, generateDecisionSummary } from "@/lib/insights";
import { BUSINESS_MODEL_LABELS } from "@/lib/constants";
import { formatCurrency, formatMonths, formatMultiple, formatPercentage } from "@/lib/format";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { translateReason, translateInsightMessage } from "@/components/i18n/translate-insight";
import type { Project } from "@/types";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const t = useTranslations();

  useEffect(() => {
    projectRepository.getById(params.id).then(setProject);
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print">
        <Header />
      </div>
      <main className="flex-1">
        {project === undefined && <div className="p-10 text-center text-sm text-muted-foreground">{t("Loading…")}</div>}
        {project === null && <div className="p-10 text-center text-sm text-muted-foreground">{t("Project not found.")}</div>}
        {project && <Report project={project} />}
      </main>
    </div>
  );
}

function Report({ project }: { project: Project }) {
  const t = useTranslations();
  const currency = project.basicInfo.currency;
  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const scores = useMemo(() => calculateScoreBreakdown(project, metrics), [project, metrics]);
  const insights = useMemo(() => generateInsights(metrics, scores, project), [metrics, scores, project]);
  const decision = useMemo(() => generateDecisionSummary(scores), [scores]);
  const scenarios = useMemo(() => generateScenarios(project, metrics), [project, metrics]);
  const classification = classifyScore(scores.overall);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`} />}>
          <ArrowLeft /> {t("Back to dashboard")}
        </Button>
        <div className="flex gap-2">
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Product Viability Report")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {project.basicInfo.currency} ·{" "}
          {t("Generated {date}", { date: new Date().toLocaleDateString() })}
        </p>
        {project.basicInfo.description && <p className="mt-3 text-sm text-foreground">{project.basicInfo.description}</p>}
      </header>

      <Section title="Viability score">
        <div className="flex items-baseline gap-6">
          <div>
            <p className="text-4xl font-semibold tabular-nums text-foreground">{scores.overall}/100</p>
            <p className="text-sm text-muted-foreground">
              {t(classification)} — {t(CLASSIFICATION_DESCRIPTIONS[classification])}
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{scores.confidence}%</p>
            <p className="text-xs text-muted-foreground">{t("Confidence")}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{t("Stage {stage}", { stage: scores.maturityStage.stage })}</p>
            <p className="text-xs text-muted-foreground">{t(scores.maturityStage.label)}</p>
          </div>
        </div>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {Object.values(scores.categories).map((c) => (
              <tr key={c.category} className="border-b border-border/60">
                <td className="py-1.5 text-muted-foreground">{t(c.label)}</td>
                <td className="py-1.5 text-right font-medium tabular-nums text-foreground">{c.score}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Market">
        <KeyValueGrid
          items={[
            ["TAM", formatCurrency(metrics.market.tam, currency, { compact: true })],
            ["SAM", formatCurrency(metrics.market.sam, currency, { compact: true })],
            ["SOM", formatCurrency(metrics.market.som, currency, { compact: true })],
            ["Required penetration", formatPercentage(metrics.market.requiredMarketPenetrationPct)],
          ]}
        />
      </Section>

      <Section title="Revenue & unit economics">
        <KeyValueGrid
          items={[
            ["MRR", formatCurrency(metrics.revenue.mrr, currency, { compact: true })],
            ["ARR", formatCurrency(metrics.revenue.arr, currency, { compact: true })],
            ["Gross margin", formatPercentage(metrics.unitEconomics.grossMarginPct)],
            ["CAC", formatCurrency(metrics.acquisition.cac, currency, { compact: true })],
            ["LTV", formatCurrency(metrics.unitEconomics.ltv, currency, { compact: true })],
            ["LTV:CAC", formatMultiple(metrics.unitEconomics.ltvToCacRatio)],
            ["CAC payback", formatMonths(metrics.unitEconomics.cacPaybackMonths)],
          ]}
        />
      </Section>

      <Section title="Financial viability">
        <KeyValueGrid
          items={[
            ["Monthly burn", metrics.operating.isCashFlowPositive ? t("Cash Flow Positive") : formatCurrency(metrics.operating.monthlyBurn, currency, { compact: true })],
            ["Runway", metrics.funding.isProfitable ? t("Profitable / no finite runway") : formatMonths(metrics.funding.runwayMonths)],
            [
              "Break-even customers",
              metrics.breakEven.breakEvenCustomers === null
                ? t("Unreachable at current margins")
                : metrics.breakEven.breakEvenCustomers.toLocaleString(),
            ],
            ["Break-even revenue", formatCurrency(metrics.breakEven.breakEvenRevenue, currency, { compact: true })],
          ]}
        />
      </Section>

      <Section title="Scenario analysis (24-month)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5">{t("Metric")}</th>
              <th className="py-1.5 text-right">{t("Conservative")}</th>
              <th className="py-1.5 text-right">{t("Base")}</th>
              <th className="py-1.5 text-right">{t("Optimistic")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-1.5 text-muted-foreground">{t("Revenue")}</td>
              {(["conservative", "base", "optimistic"] as const).map((k) => (
                <td key={k} className="py-1.5 text-right tabular-nums">
                  {formatCurrency(scenarios.scenarios[k].revenue, currency, { compact: true })}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-1.5 text-muted-foreground">{t("Customers")}</td>
              {(["conservative", "base", "optimistic"] as const).map((k) => (
                <td key={k} className="py-1.5 text-right tabular-nums">
                  {scenarios.scenarios[k].customers.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Should you pursue this idea?">
        <p className="font-medium text-foreground">{t(decision.title)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(decision.description)}</p>
        <ul className="mt-2 list-inside list-decimal space-y-1 text-sm text-foreground">
          {decision.reasons.map((r, i) => (
            <li key={i}>{translateReason(t, r)}</li>
          ))}
        </ul>
      </Section>

      <Section title="Strengths">
        <BulletList items={insights.strengths.map((i) => translateInsightMessage(t, i))} empty={t("None identified.")} />
      </Section>

      <Section title="Risks">
        <BulletList items={[...insights.criticalRisks, ...insights.warnings].map((i) => translateInsightMessage(t, i))} empty={t("None identified.")} />
      </Section>

      <Section title="Opportunities">
        <BulletList items={insights.opportunities.map((i) => translateInsightMessage(t, i))} empty={t("None identified.")} />
      </Section>

      <Section title="Recommended next experiments">
        <BulletList items={insights.recommendedActions.map((i) => translateInsightMessage(t, i))} ordered />
      </Section>

      <Section title="Assumptions" last>
        <p className="text-xs text-muted-foreground">
          {t("This report evaluates the economics of the assumptions entered on")} {new Date(project.createdAt).toLocaleDateString()}
          {t(", last updated")} {new Date(project.updatedAt).toLocaleDateString()}.{" "}
          {t("It does not predict success — it assesses whether the current numbers add up.")}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  const t = useTranslations();
  return (
    <section className={`py-5 ${last ? "" : "border-b border-border"}`}>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground uppercase">{t(title)}</h2>
      {children}
    </section>
  );
}

function KeyValueGrid({ items }: { items: Array<[string, string]> }) {
  const t = useTranslations();
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{t(label)}</dt>
          <dd className="text-sm font-medium tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BulletList({ items, empty, ordered }: { items: string[]; empty?: string; ordered?: boolean }) {
  const t = useTranslations();
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty ?? t("None.")}</p>;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1 text-sm text-foreground ${ordered ? "list-inside list-decimal" : "list-inside list-disc"}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}
