"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import type { AppTranslator } from "@/components/i18n/use-app-translations";

/**
 * Renders a translated string from a server component. The locale lives in
 * localStorage (client-side), so server pages use this instead of useAppTranslations.
 */
export function Trans({ text, values }: { text: string; values?: Parameters<AppTranslator>[1] }) {
  const t = useAppTranslations();
  return <>{t(text, values)}</>;
}
