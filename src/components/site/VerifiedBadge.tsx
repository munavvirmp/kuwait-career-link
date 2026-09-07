import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VERIFICATION_DISCLAIMER } from "@/lib/constants";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={`gap-1 border-primary/30 bg-primary/10 text-primary ${className ?? ""}`}>
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Verified company
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{VERIFICATION_DISCLAIMER}</TooltipContent>
    </Tooltip>
  );
}
