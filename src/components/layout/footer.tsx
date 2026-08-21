"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";

export function Footer() {
  const t = useAppTranslations();

  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      {t("Built for founders by.")}
      <a href="https://mjidhub.com" className="text-primary hover:underline">
        mjid
      </a>
      <a
        href="https://github.com/mjid13/ideaup"
        className="mt-2 block text-primary hover:underline"
      >
        {t("IdeaUp is open-source software")}
      </a>
    </footer>
  );
}
