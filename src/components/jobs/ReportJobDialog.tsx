import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_REASONS, SAFETY_WARNING } from "@/lib/constants";

export function ReportJobDialog({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("fake_job");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to report a job.");
      if (!REPORT_REASONS.some((r) => r.value === reason)) throw new Error("Choose a reason for the report.");
      if (details.length > 1000) throw new Error("Details must be under 1000 characters.");
      if (reason === "other" && details.trim().length < 10) {
        throw new Error("Please describe the problem in a little more detail.");
      }
      const { error } = await supabase.from("job_reports").insert({
        job_id: jobId,
        reporter_id: user.id,
        reason,
        details: details.trim() || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("You have already reported this job. Our team is reviewing it.");
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Report submitted. Thank you for helping keep KuwaitJobs safe.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDone(false);
          setDetails("");
          setReason("fake_job");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="size-4" /> Report job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report this job</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Please sign in so our team can follow up on your report.</p>
            <Button asChild>
              <Link to="/auth" search={{ mode: "login", role: "job_seeker" }}>Sign in</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="grid gap-3">
            <p className="text-sm">Thank you. Our moderation team will review this listing.</p>
            <p className="text-xs text-muted-foreground">{SAFETY_WARNING}</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Why are you reporting it?</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <RadioGroupItem value={r.value} /> {r.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-details">More details (optional)</Label>
              <Textarea
                id="report-details"
                rows={4}
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us what looks wrong with this listing."
              />
            </div>
            <p className="text-xs text-muted-foreground">{SAFETY_WARNING}</p>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Sending…" : "Submit report"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
