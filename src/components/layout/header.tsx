"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Gauge, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";

export function Header() {
  const { locale, setLocale } = useLanguage();
  const t = useAppTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight" onClick={closeMenu}>
          <Gauge className="size-4.5 text-primary" />
          <span>{t("IdeaUp")}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
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
          <Button variant="ghost" size="sm" render={<Link href="/how-to-use">{t("How to use")}</Link>} />
          <Button variant="ghost" size="sm" render={<Link href="/settings/connections">MCP</Link>} />
          <Button size="sm" render={<Link href="/new">{t("Evaluate an Idea")}</Link>} />
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </div>
      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-border bg-background px-4 py-3 shadow-sm md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto grid max-w-6xl gap-1">
            <Button variant="ghost" className="h-10 w-full justify-start" render={<Link href="/projects" onClick={closeMenu}>{t("Projects")}</Link>} />
            <Button variant="ghost" className="h-10 w-full justify-start" render={<Link href="/compare" onClick={closeMenu}>{t("Compare")}</Link>} />
            <Button variant="ghost" className="h-10 w-full justify-start" render={<Link href="/how-to-use" onClick={closeMenu}>{t("How to use")}</Link>} />
            <Button variant="ghost" className="h-10 w-full justify-start" render={<Link href="/settings/connections" onClick={closeMenu}>MCP</Link>} />
            <Button
              variant="ghost"
              className="h-10 w-full justify-start"
              onClick={() => {
                setLocale(locale === "en" ? "ar" : "en");
                closeMenu();
              }}
            >
              {locale === "en" ? "العربية" : "English"}
            </Button>
            <Button className="mt-2 h-10 w-full" render={<Link href="/new" onClick={closeMenu}>{t("Evaluate an Idea")}</Link>} />
          </div>
        </nav>
      )}
    </header>
  );
}
