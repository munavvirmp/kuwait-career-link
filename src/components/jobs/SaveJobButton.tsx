import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function SaveJobButton({ jobId, showLabel = false }: { jobId: string; showLabel?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ["saved-job", user?.id, jobId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("user_id", user!.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (saved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: jobId });
      if (error) throw error;
      return true;
    },
    onSuccess: (isSaved) => {
      toast.success(isSaved ? "Job saved" : "Removed from saved jobs");
      void queryClient.invalidateQueries({ queryKey: ["saved-job", user?.id, jobId] });
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message === "auth" ? "Please sign in to save jobs" : "Could not save job");
    },
  });

  return (
    <Button
      type="button"
      variant={showLabel ? "outline" : "ghost"}
      size={showLabel ? "default" : "icon"}
      aria-label={saved ? "Remove saved job" : "Save job"}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
    >
      <Bookmark className={cn("size-4", saved && "fill-current text-primary")} />
      {showLabel ? (saved ? "Saved" : "Save Job") : null}
    </Button>
  );
}
