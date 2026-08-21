"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";

/** Shared print-friendly building blocks for every document view (report, pitch deck, and the business documents). */

export function Slide({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  const t = useAppTranslations();
  return (
    <section className={`py-5 print:break-inside-avoid ${last ? "" : "border-b border-border"}`}>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-foreground uppercase">{t(title)}</h2>
      {children}
    </section>
  );
}

export function Prose({ text, placeholder, className }: { text: string | undefined; placeholder: string; className?: string }) {
  if (!text || !text.trim()) {
    return <p className={`text-sm text-muted-foreground italic ${className ?? ""}`}>{placeholder}</p>;
  }
  return <p className={`text-sm whitespace-pre-wrap text-foreground ${className ?? ""}`}>{text}</p>;
}

export function KeyValueGrid({ items }: { items: Array<[string, string]> }) {
  const t = useAppTranslations();
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 min-[380px]:grid-cols-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{t(label)}</dt>
          <dd className="text-sm font-medium tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({ items, empty, ordered }: { items: string[]; empty: string; ordered?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1 text-sm text-foreground ${ordered ? "list-inside list-decimal" : "list-inside list-disc"}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}
