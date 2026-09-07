import { ShieldAlert } from "lucide-react";
import { SAFETY_WARNING, VERIFICATION_DISCLAIMER } from "@/lib/constants";

export function SafetyNotice({ showDisclaimer = true }: { showDisclaimer?: boolean }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-destructive">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {SAFETY_WARNING}
      </p>
      {showDisclaimer ? (
        <p className="mt-2 pl-6 text-xs text-muted-foreground">{VERIFICATION_DISCLAIMER}</p>
      ) : null}
    </div>
  );
}
