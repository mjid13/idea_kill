"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AudienceCheck, AudienceCheckStatus } from "@/types";

/** Shared presentation for the pass/warn/fail tests behind an audience verdict. */

const STATUS_ICON: Record<AudienceCheckStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

export const STATUS_COLOR: Record<AudienceCheckStatus, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

const STATUS_LABEL: Record<AudienceCheckStatus, string> = {
  pass: "Clears",
  warn: "Watch",
  fail: "Fails",
};

function CheckRow({ check }: { check: AudienceCheck }) {
  const t = useAppTranslations();
  const Icon = STATUS_ICON[check.status];

  return (
    <li className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <Icon className={cn("mt-0.5 size-4 shrink-0", STATUS_COLOR[check.status])} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-foreground">{t(check.label)}</p>
          <p className={cn("text-sm font-semibold tabular-nums", STATUS_COLOR[check.status])}>
            {check.value}
            <span className="ml-2 text-[11px] font-normal text-muted-foreground">{t(check.requirement)}</span>
          </p>
        </div>
        {check.detail && <p className="mt-0.5 text-xs text-muted-foreground">{t(check.detail, check.detailParams)}</p>}
      </div>
      <span className="sr-only">{t(STATUS_LABEL[check.status])}</span>
    </li>
  );
}

export function AudienceChecklist({
  title,
  description,
  checks,
}: {
  title: string;
  description: string;
  checks: AudienceCheck[];
}) {
  const t = useAppTranslations();
  const failing = checks.filter((c) => c.status === "fail").length;
  const watching = checks.filter((c) => c.status === "warn").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(title)}</CardTitle>
        <CardDescription>{t(description)}</CardDescription>
        <p className="text-xs text-muted-foreground">
          {t("{pass} of {total} clear · {warn} to watch · {fail} failing", {
            pass: checks.length - failing - watching,
            total: checks.length,
            warn: watching,
            fail: failing,
          })}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="-my-3">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Headline verdict banner shared by both audience modes. */
export function AudienceVerdict({
  audience,
  title,
  description,
  tone,
  figures,
}: {
  audience: string;
  title: string;
  description: string;
  tone: AudienceCheckStatus;
  figures: Array<{ label: string; value: string; hint?: string; hintParams?: Record<string, string | number> }>;
}) {
  const t = useAppTranslations();
  const border: Record<AudienceCheckStatus, string> = {
    pass: "border-emerald-500/40 bg-emerald-500/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    fail: "border-red-500/40 bg-red-500/5",
  };

  return (
    <Card className={cn("border", border[tone])}>
      <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(audience)}</p>
          <p className={cn("mt-1 text-3xl font-semibold tracking-tight", STATUS_COLOR[tone])}>{t(title)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t(description)}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:border-l lg:border-border lg:pl-6">
          {figures.map((figure) => (
            <div key={figure.label}>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t(figure.label)}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{figure.value}</p>
              {figure.hint && <p className="text-[11px] text-muted-foreground">{t(figure.hint, figure.hintParams)}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
