import { useAppTranslations } from "@/components/i18n/use-app-translations";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "@/components/forms/InfoTooltip";
import { HEALTH_TEXT_COLOR, type HealthStatus } from "@/lib/health";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  formula?: string;
  health?: HealthStatus;
  healthLabel?: string;
}

export function MetricCard({ label, value, description, formula, health, healthLabel }: MetricCardProps) {
  const t = useAppTranslations();
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {label}
          <InfoTooltip description={description} formula={formula} />
        </div>
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        {health && (
          <p className={cn("text-[11px] font-medium", HEALTH_TEXT_COLOR[health])}>{t(healthLabel ?? health)}</p>
        )}
      </CardContent>
    </Card>
  );
}
