"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { createTranslator } from "use-intl/core";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type TranslationValue = string | number | Date;
export type AppTranslator = (key: string, values?: Record<string, TranslationValue>) => string;

const keys = Object.keys(en);
const keyIds = new Map(keys.map((key, index) => [key, String(index)]));
const indexedMessages = {
  en: Object.fromEntries(keys.map((key, index) => [String(index), en[key as keyof typeof en]])),
  ar: Object.fromEntries(keys.map((key, index) => [String(index), ar[key as keyof typeof ar]])),
};

export function useAppTranslations(): AppTranslator {
  const locale = useLocale() === "ar" ? "ar" : "en";
  const translator = useMemo(
    () =>
      createTranslator({
        locale: locale === "ar" ? "ar-u-nu-arab" : "en",
        messages: indexedMessages[locale],
        onError: () => undefined,
        getMessageFallback: ({ key }) => key,
      }),
    [locale]
  );

  return (key, values) => {
    const id = keyIds.get(key);
    if (id === undefined) return key;
    return translator(id, values as never);
  };
}
