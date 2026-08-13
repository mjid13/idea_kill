import type { AppTranslator } from "@/components/i18n/use-app-translations";
import type { DecisionReason, Insight } from "@/types";

type Translator = AppTranslator;

/**
 * decision.ts passes the category label itself (an English translation key, e.g.
 * "Unit Economics") as a `label` param rather than pre-translated text, so it has
 * to be resolved through `t()` before being interpolated into the reason template.
 */
export function translateReason(t: Translator, reason: DecisionReason): string {
  const params = reason.params;
  if (params && typeof params.label === "string") {
    return t(reason.template, { ...params, label: t(params.label) });
  }
  return t(reason.template, params);
}

export function translateInsightMessage(t: Translator, insight: Insight): string {
  return t(insight.message, insight.messageParams);
}

export function translateInsightDetail(t: Translator, insight: Insight): string | undefined {
  if (!insight.detail) return undefined;
  return t(insight.detail, insight.detailParams);
}
