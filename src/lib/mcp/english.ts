import type { AudienceCheck, Insight } from "@/types";

/**
 * Fills `{key}` placeholders for MCP's plain-English output. Also strips ICU
 * format suffixes (`{amount, number}`), which the UI layer renders through
 * use-intl but a plain string replace would leave behind verbatim.
 */
export function interpolate(template: string, params?: Record<string, string | number>) {
  return template.replace(/\{(\w+)(?:,\s*\w+)?\}/g, (match, key: string) =>
    params && key in params ? String(params[key]) : match
  );
}

export function englishInsight(item: Insight) {
  const detail = item.detail ? interpolate(item.detail, item.detailParams) : undefined;
  return detail === undefined
    ? { message: interpolate(item.message, item.messageParams) }
    : { message: interpolate(item.message, item.messageParams), detail };
}

/**
 * `label` and `requirement` are already literal English; only `detail` travels
 * with params, so it is the only field that needs interpolating before an MCP
 * client sees it.
 */
export function englishAudienceCheck(check: AudienceCheck): Omit<AudienceCheck, "detailParams"> {
  const { detailParams, detail, ...rest } = check;
  return detail === undefined ? rest : { ...rest, detail: interpolate(detail, detailParams) };
}
