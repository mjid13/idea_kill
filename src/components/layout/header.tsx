"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";

export function Header() {
  const { locale, setLocale } = useLanguage();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Gauge className="size-4.5 text-primary" />
          <span>Product Viability Calculator</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            aria-label={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
            data-i18n-ignore
          >
            {locale === "en" ? "العربية" : "English"}
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/projects">Projects</Link>} />
          <Button variant="ghost" size="sm" render={<Link href="/compare">Compare</Link>} />
          <Button size="sm" render={<Link href="/new">Evaluate an Idea</Link>} />
        </nav>
      </div>
    </header>
  );
}
