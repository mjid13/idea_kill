"use client";

import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { REVENUE_STREAM_KIND_LABELS } from "@/lib/constants";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { CalculatedMetrics, Currency } from "@/types";

/**
 * Breaks a hybrid business into its actual revenue streams instead of a single
 * blended price. The two numbers a founder needs from this panel: how much of
 * the revenue repeats without new sales, and which streams are dragging the
 * blended margin down.
 */
export function RevenueMixPanel({ metrics, currency }: { metrics: CalculatedMetrics; currency: Currency }) {
  const t = useAppTranslations();
  const mix = metrics.revenueMix;
  if (!mix) return null;

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Revenue mix")}</CardTitle>
        <CardDescription>
          {t(
            "{recurring} of revenue repeats each month; the rest has to be re-sold. Blended gross margin across all streams is {margin}.",
            { recurring: formatPercentage(mix.recurringRevenueSharePct), margin: formatPercentage(mix.blendedGrossMarginPct) }
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-start font-medium">{t("Stream")}</th>
                <th className="py-2 text-end font-medium">{t("Monthly revenue")}</th>
                <th className="py-2 text-end font-medium">{t("Share")}</th>
                <th className="py-2 text-end font-medium">{t("Gross margin")}</th>
                <th className="py-2 text-end font-medium">{t("Monthly gross profit")}</th>
              </tr>
            </thead>
            <tbody>
              {mix.streams.map((stream) => (
                <tr key={stream.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{stream.name || t("Untitled stream")}</span>
                      <Badge variant="secondary">{t(REVENUE_STREAM_KIND_LABELS[stream.kind])}</Badge>
                    </div>
                  </td>
                  <td className="py-2 text-end tabular-nums">{money(stream.monthlyRevenue)}</td>
                  <td className="py-2 text-end tabular-nums">{formatPercentage(stream.revenueSharePct)}</td>
                  <td className="py-2 text-end tabular-nums">{formatPercentage(stream.grossMarginPct)}</td>
                  <td className="py-2 text-end tabular-nums">{money(stream.monthlyGrossProfit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-xs font-medium">
                <td className="py-2">{t("Total")}</td>
                <td className="py-2 text-end tabular-nums">{money(mix.totalMonthlyRevenue)}</td>
                <td className="py-2 text-end tabular-nums">100%</td>
                <td className="py-2 text-end tabular-nums">{formatPercentage(mix.blendedGrossMarginPct)}</td>
                <td className="py-2 text-end tabular-nums">
                  {money(mix.streams.reduce((sum, s) => sum + s.monthlyGrossProfit, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          {t(
            "One-time streams ({oneTime} per new customer) are billed on acquisition — they pay down CAC rather than compounding into lifetime value, so they are held out of MRR and ARR.",
            { oneTime: money(mix.oneTimeRevenuePerNewCustomer) }
          )}
        </p>
      </CardContent>
    </Card>
  );
}
