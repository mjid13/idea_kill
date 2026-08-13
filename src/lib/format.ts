import type { Currency } from "@/types";

/** Symbols/codes used when rendering an amount. Gulf currencies conventionally render as a code, not a glyph. */
const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  OMR: "OMR",
  SAR: "SAR",
  AED: "AED",
};

function isBadNumber(value: number): boolean {
  return !Number.isFinite(value);
}

/** Guards every formatter against ever rendering NaN/Infinity/undefined (spec section 37). */
const PLACEHOLDER = "—";

function trimTrailingZero(s: string): string {
  return s.replace(/\.0$/, "");
}

export interface FormatCurrencyOptions {
  compact?: boolean;
  decimals?: number;
}

export function formatCurrency(value: number | null | undefined, currency: Currency, options: FormatCurrencyOptions = {}): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const separator = symbol.length > 1 ? " " : "";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (options.compact && abs >= 1000) {
    return `${sign}${symbol}${separator}${formatCompactNumber(abs)}`;
  }

  const decimals = options.decimals ?? (abs !== 0 && abs < 1000 ? 2 : 0);
  const grouped = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${sign}${symbol}${separator}${grouped}`;
}

const COMPACT_SUFFIXES: Array<[number, string]> = [
  [1_000_000_000_000, "T"],
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "K"],
];

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  for (const [threshold, suffix] of COMPACT_SUFFIXES) {
    if (abs >= threshold) {
      return `${sign}${trimTrailingZero((abs / threshold).toFixed(1))}${suffix}`;
    }
  }

  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;
  return `${value.toFixed(decimals)}%`;
}

export function formatMultiple(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;
  return `${value.toFixed(decimals)}x`;
}

export function formatMonths(value: number | null | undefined, decimals = 1, locale = "en-US"): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;
  const rounded = Number(value.toFixed(decimals));
  const numberLocale = locale.startsWith("ar") ? "ar-u-nu-arab" : locale;
  const label = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: decimals }).format(rounded);

  if (locale.startsWith("ar")) {
    const unit = { zero: "شهر", one: "شهر", two: "شهران", few: "أشهر", many: "شهرًا", other: "شهر" }[
      new Intl.PluralRules(locale).select(rounded)
    ];
    return `${label} ${unit}`;
  }

  return `${label} ${rounded === 1 ? "month" : "months"}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isBadNumber(value)) return PLACEHOLDER;
  return Math.round(value).toLocaleString("en-US");
}
