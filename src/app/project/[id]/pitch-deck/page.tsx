"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Printer, ArrowLeft, Pencil } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { projectRepository } from "@/lib/storage/localStorageRepository";
import { calculateMetrics, generateScenarios, val } from "@/lib/calculations";
import { calculateScoreBreakdown, classifyScore } from "@/lib/scoring";
import { generateInsights } from "@/lib/insights";
import { BUSINESS_MODEL_LABELS, BILLING_PERIOD_LABELS, FUNDING_ROUND_LABELS } from "@/lib/constants";
import { formatCurrency, formatCompactNumber, formatMonths, formatPercentage } from "@/lib/format";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { translateInsightMessage } from "@/components/i18n/translate-insight";
import type { Project } from "@/types";

export default function PitchDeckPage() {
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
        {project && <PitchDeck project={project} />}
      </main>
    </div>
  );
}

function PitchDeck({ project }: { project: Project }) {
  const t = useTranslations();
  const currency = project.basicInfo.currency;
  const metrics = useMemo(() => calculateMetrics(project), [project]);
  const scores = useMemo(() => calculateScoreBreakdown(project, metrics), [project, metrics]);
  const insights = useMemo(() => generateInsights(metrics, scores, project), [metrics, scores, project]);
  const scenarios = useMemo(() => generateScenarios(project, metrics), [project, metrics]);
  const classification = classifyScore(scores.overall);
  const pitch = project.pitch;
  const round = pitch?.round;

  const fundingAsk = val(pitch?.fundingAsk);
  const availableCash = val(project.funding.availableCash);
  const monthlyBurn = metrics.operating.isCashFlowPositive ? 0 : metrics.operating.monthlyBurn;
  const extendedRunwayMonths = monthlyBurn > 0 ? (availableCash + fundingAsk) / monthlyBurn : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}`} />}>
          <ArrowLeft /> {t("Back to dashboard")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/project/${project.id}/pitch-deck/edit`} />}>
            <Pencil /> {t("Edit deck details")}
          </Button>
          <ExportMenu project={project} />
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> {t("Print / Save as PDF")}
          </Button>
        </div>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("Investor Pitch Deck")}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{project.basicInfo.name || t("Untitled project")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(BUSINESS_MODEL_LABELS[project.basicInfo.businessModel])} · {currency} · {new Date().toLocaleDateString()}
        </p>
        {project.basicInfo.description && <p className="mt-3 text-base text-foreground">{project.basicInfo.description}</p>}
      </header>

      <Slide title="The problem">
        <Prose text={pitch?.problemStatement} placeholder={t("No problem statement entered yet — add one in the Pitch narrative step.")} />
      </Slide>

      <Slide title="The solution">
        <Prose
          text={project.basicInfo.description}
          placeholder={t("No solution summary entered yet — add a short description in the Basic information step.")}
        />
      </Slide>

      <Slide title="Market opportunity">
        <KeyValueGrid
          items={[
            ["TAM", formatCurrency(metrics.market.tam, currency, { compact: true })],
            ["SAM", formatCurrency(metrics.market.sam, currency, { compact: true })],
            ["SOM", formatCurrency(metrics.market.som, currency, { compact: true })],
            ["Target penetration", formatPercentage(metrics.market.requiredMarketPenetrationPct)],
          ]}
        />
      </Slide>

      <Slide title="Business model">
        <KeyValueGrid
          items={[
            ["Pricing", formatCurrency(val(project.pricing.productPrice), currency)],
            ["Billing", t(BILLING_PERIOD_LABELS[project.pricing.billingPeriod])],
            ["Current customers", val(project.pricing.currentCustomers).toLocaleString()],
            ["Gross margin", formatPercentage(metrics.unitEconomics.grossMarginPct)],
          ]}
        />
      </Slide>

      <Slide title="Traction">
        <TractionChart points={pitch?.tractionHistory ?? []} />
        <Prose text={pitch?.traction} placeholder={t("No traction summary entered yet — add one from the deck's Edit deck details page.")} />
        {insights.strengths.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground">
            {insights.strengths.slice(0, 4).map((s) => (
              <li key={s.id}>{translateInsightMessage(t, s)}</li>
            ))}
          </ul>
        )}
      </Slide>

      <Slide title="Unit economics">
        <KeyValueGrid
          items={[
            ["CAC", formatCurrency(metrics.acquisition.cac, currency, { compact: true })],
            ["LTV", formatCurrency(metrics.unitEconomics.ltv, currency, { compact: true })],
            ["LTV:CAC", metrics.unitEconomics.ltvToCacRatio === null ? "—" : `${metrics.unitEconomics.ltvToCacRatio.toFixed(1)}x`],
            ["CAC payback", formatMonths(metrics.unitEconomics.cacPaybackMonths)],
          ]}
        />
      </Slide>

      <Slide title="Financial outlook (24-month)">
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
      </Slide>

      <Slide title="Competitive landscape">
        {pitch?.competitors && pitch.competitors.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4">{t("Competitor")}</th>
                <th className="py-1.5">{t("Your edge")}</th>
              </tr>
            </thead>
            <tbody>
              {pitch.competitors.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-4 align-top font-medium whitespace-nowrap text-foreground">{c.name}</td>
                  <td className="py-1.5 align-top text-foreground">{c.edge || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Prose
            text={pitch?.competitiveLandscape}
            placeholder={t("No competitive landscape entered yet — add named competitors from the deck's Edit deck details page.")}
          />
        )}
      </Slide>

      <Slide title="Team">
        {pitch?.teamMembers && pitch.teamMembers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pitch.teamMembers.map((m) => (
              <div key={m.id} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium text-foreground">{m.name || t("Unnamed")}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
                {m.bio && <p className="mt-1.5 text-sm text-foreground">{m.bio}</p>}
              </div>
            ))}
          </div>
        ) : (
          <Prose text={pitch?.teamBios} placeholder={t("No team bios entered yet — add named team members from the deck's Edit deck details page.")} />
        )}
      </Slide>

      <Slide title="Risks">
        <BulletList
          items={[...insights.criticalRisks, ...insights.warnings].map((i) => translateInsightMessage(t, i))}
          empty={t("No significant risks flagged.")}
        />
      </Slide>

      <Slide title="The ask">
        {fundingAsk > 0 ? (
          <>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(fundingAsk, currency, { compact: true })}</p>
            {extendedRunwayMonths !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Extends runway to approximately")} {formatMonths(extendedRunwayMonths)} {t("at the current burn rate.")}
              </p>
            )}
            {round && (round.roundType || round.valuation || round.previousInvestors) && (
              <KeyValueGrid
                items={[
                  ...(round.roundType ? ([["Round", t(FUNDING_ROUND_LABELS[round.roundType])]] as Array<[string, string]>) : []),
                  ...(round.valuation ? ([["Valuation", formatCurrency(round.valuation, currency, { compact: true })]] as Array<[string, string]>) : []),
                  ...(round.previousInvestors ? ([["Previous investors", round.previousInvestors]] as Array<[string, string]>) : []),
                ]}
              />
            )}
            <Prose text={pitch?.useOfFunds} placeholder={t("No use-of-funds breakdown entered yet.")} className="mt-3" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No funding ask entered — add an amount in the Pitch narrative step if you're raising.")}</p>
        )}
      </Slide>

      <Slide title="Vision" last={!pitch?.vision}>
        <Prose text={pitch?.vision} placeholder={t("No vision statement entered yet — add one in the Pitch narrative step.")} />
      </Slide>

      <Slide title="Independent viability read" last>
        <div className="flex items-baseline gap-6">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{scores.overall}/100</p>
            <p className="text-sm text-muted-foreground">{t(classification)}</p>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            {t("Independently modeled from the assumptions in this deck — not a guarantee of outcome, a check on whether the current numbers add up.")}
          </p>
        </div>
      </Slide>
    </div>
  );
}

function Slide({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  const t = useTranslations();
  return (
    <section className={`py-5 print:break-inside-avoid ${last ? "" : "border-b border-border"}`}>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground uppercase">{t(title)}</h2>
      {children}
    </section>
  );
}

function Prose({ text, placeholder, className }: { text: string | undefined; placeholder: string; className?: string }) {
  if (!text || !text.trim()) {
    return <p className={`text-sm text-muted-foreground italic ${className ?? ""}`}>{placeholder}</p>;
  }
  return <p className={`text-sm whitespace-pre-wrap text-foreground ${className ?? ""}`}>{text}</p>;
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

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };
const GRID_STROKE = "var(--color-border)";

function TractionChart({ points }: { points: NonNullable<Project["pitch"]>["tractionHistory"] }) {
  const t = useTranslations();
  const data = points ?? [];
  if (data.length < 2) return null;

  const hasMrr = data.some((p) => typeof p.mrr === "number");
  const hasCustomers = data.some((p) => typeof p.customers === "number");
  if (!hasMrr && !hasCustomers) return null;

  const tooltipStyle = {
    backgroundColor: "var(--color-foreground)",
    color: "var(--color-background)",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    padding: "6px 10px",
  };

  return (
    <div className={`mb-4 grid grid-cols-1 gap-4 ${hasMrr && hasCustomers ? "sm:grid-cols-2" : ""}`}>
      {hasMrr && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("MRR over time")}</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => formatCompactNumber(Number(v))} />
              <Line type="monotone" dataKey="mrr" name={t("MRR")} stroke="var(--color-chart-1)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasCustomers && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("Customers over time")}</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={formatCompactNumber} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="customers" name={t("Customers")} stroke="var(--color-chart-2)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
