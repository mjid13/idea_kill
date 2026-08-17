"use client";

import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";

export function Header() {
  const { locale, setLocale } = useLanguage();
  const t = useAppTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Gauge className="size-4.5 text-primary" />
          <span>{t("IdeaUp")}</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
          >
            {locale === "en" ? "العربية" : "English"}
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/projects">{t("Projects")}</Link>} />
          <Button variant="ghost" size="sm" render={<Link href="/compare">{t("Compare")}</Link>} />
          <Button variant="ghost" size="sm" render={<Link href="/settings/connections">MCP</Link>} />
          <Button size="sm" render={<Link href="/new">{t("Evaluate an Idea")}</Link>} />
        </nav>
      </div>
    </header>
  );
}
