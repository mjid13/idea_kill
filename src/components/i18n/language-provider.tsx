"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type Locale = "en" | "ar";
const MESSAGES: Record<Locale, Record<string, string>> = { en, ar };

const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "en",
  setLocale: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localStorage.getItem("pvc-locale") === "ar") setLocale("ar");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    localStorage.setItem("pvc-locale", locale);
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} onError={() => undefined} getMessageFallback={({ key }) => key}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
