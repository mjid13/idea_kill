import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  description: string;
  formula?: string;
}

/** Small (i) affordance used next to every calculated/derived metric label (spec section 30). */
export function InfoTooltip({ description, formula }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex align-middle text-muted-foreground hover:text-foreground">
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <div className="space-y-1.5">
          <p>{description}</p>
          {formula && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-background/70 uppercase">Formula</p>
              <code className="block text-[11px]">{formula}</code>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
