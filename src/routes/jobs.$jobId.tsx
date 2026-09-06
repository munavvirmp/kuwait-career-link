import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Wallet,
  BriefcaseBusiness,
  GraduationCap,
  CalendarDays,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ErrorState, LoadingList } from "@/components/site/States";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import { fetchJob } from "@/lib/api";
import { formatSalary, statusLabel, timeAgo } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — KuwaitJobs" },
      { name: "description", content: "Full job description, requirements, benefits and application details for this Kuwait vacancy." },
      { property: "og:title", content: "Job Details — KuwaitJobs" },
      { property: "og:description", content: "Description, requirements and benefits for this Kuwait vacancy." },
    ],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const job = useQuery({ queryKey: ["job", jobId], queryFn: () => fetchJob(jobId) });

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: job.data?.title ?? "Job on KuwaitJobs", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Job link copied");
      }
    } catch {
      /* user cancelled */
    }
  }

  if (job.isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <LoadingList count={2} />
        </div>
      </SiteLayout>
    );
  }

  if (job.isError) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <ErrorState />
        </div>
      </SiteLayout>
    );
  }

  const data = job.data;
  if (!data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">This job is no longer available</h1>
          <Button asChild className="mt-4">
            <Link to="/jobs">Browse other jobs</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const facts = [
    { icon: MapPin, label: "Location", value: data.location },
    { icon: Wallet, label: "Salary", value: formatSalary(data.salary_min, data.salary_max, data.currency) },
    { icon: BriefcaseBusiness, label: "Job type", value: data.job_type },
    { icon: GraduationCap, label: "Experience", value: data.experience_years ?? data.experience_level },
    { icon: GraduationCap, label: "Education", value: data.education ?? "Not specified" },
    {
      icon: CalendarDays,
      label: "Deadline",
      value: data.deadline ? new Date(data.deadline).toLocaleDateString() : "Open until filled",
    },
  ];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="gap-4 p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
                {data.is_featured ? <Badge>Featured</Badge> : null}
                {data.is_demo ? <Badge variant="secondary">Sample data</Badge> : null}
              </div>
              <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4" /> {data.companies?.name ?? "Company"} · posted {timeAgo(data.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ApplyDialog jobId={data.id} jobTitle={data.title} />
              <SaveJobButton jobId={data.id} showLabel />
              <Button variant="outline" onClick={share}>
                <Share2 className="size-4" /> Share
              </Button>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-2">
                <fact.icon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="text-sm font-medium">{fact.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6 gap-6 p-6 shadow-card">
          <Section title="Job description">
            <p className="whitespace-pre-line text-sm text-muted-foreground">{data.description}</p>
          </Section>
          <BulletSection title="Responsibilities" items={data.responsibilities} />
          <BulletSection title="Requirements" items={data.requirements} />
          <BulletSection title="Benefits" items={data.benefits} />
        </Card>
      </div>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const MAX_CV_BYTES = 10 * 1024 * 1024;

function ApplyDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cover_letter: "" });
  const [file, setFile] = useState<File | null>(null);
  const [useSavedCv, setUseSavedCv] = useState(true);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const existing = useQuery({
    queryKey: ["application-exists", user?.id, jobId],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status")
        .eq("applicant_id", user!.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setForm((prev) => ({
      ...prev,
      full_name: prev.full_name || profile.data?.full_name || "",
      email: prev.email || profile.data?.email || user?.email || "",
      phone: prev.phone || profile.data?.phone || "",
    }));
  }, [profile.data, user?.email]);

  const savedCv = profile.data?.cv_url ?? null;

  const apply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to apply for this job.");
      const fullName = form.full_name.trim();
      if (fullName.length < 2 || fullName.length > 100) throw new Error("Please enter your full name (2-100 characters).");
      const email = form.email.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255)
        throw new Error("Please enter a valid email address.");
      const phone = form.phone.trim();
      if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new Error("Please enter a valid phone number.");
      if (form.cover_letter.length > 3000) throw new Error("Cover letter must be under 3000 characters.");

      let cvPath = useSavedCv && savedCv ? savedCv : null;
      if (!cvPath) {
        if (!file) throw new Error("Please attach your CV (PDF, DOC or DOCX).");
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["pdf", "doc", "docx"].includes(ext)) throw new Error("CV must be a PDF, DOC or DOCX file.");
        if (file.size > MAX_CV_BYTES) throw new Error("CV must be smaller than 10 MB.");
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
        if (uploadError) throw new Error("Could not upload your CV. Please try again.");
        cvPath = path;
      }

      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        applicant_id: user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        cover_letter: form.cover_letter.trim() || null,
        cv_url: cvPath,
        status: "applied",
      });
      if (error) {
        if (error.code === "23505") throw new Error("You have already applied for this job.");
        throw new Error("Could not submit your application. Please try again.");
      }
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Application submitted successfully.");
      void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["application-exists", user?.id, jobId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDone(false);
      }}
    >
      <DialogTrigger asChild>
        <Button>Apply Now</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{done ? "Application sent" : `Apply for ${jobTitle}`}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <div className="grid gap-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">Please sign in to your job seeker account to apply for this job.</p>
            <Button asChild>
              <Link to="/auth" search={{ mode: "login" }}>Sign in to apply</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>Create a free account</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="grid gap-4 py-4 text-center">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <p className="text-sm">Application submitted successfully.</p>
            <p className="text-xs text-muted-foreground">You can track its status under Applied Jobs in your dashboard.</p>
            <Button asChild variant="outline">
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : existing.data ? (
          <div className="grid gap-4 py-4 text-center">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <p className="text-sm">You already applied for this job.</p>
            <p className="text-xs text-muted-foreground">Current status: {statusLabel(existing.data.status)}</p>
            <Button asChild variant="outline">
              <Link to="/dashboard">View my applications</Link>
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              apply.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+965 ..." />
            </div>
            {savedCv ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useSavedCv} onChange={(e) => setUseSavedCv(e.target.checked)} className="size-4" />
                Use the CV saved on my profile{profile.data?.cv_name ? ` (${profile.data.cv_name})` : ""}
              </label>
            ) : null}
            {!savedCv || !useSavedCv ? (
              <div className="grid gap-1.5">
                <Label htmlFor="cv">CV (PDF, DOC, DOCX — max 10 MB)</Label>
                <Input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="cover">Cover letter</Label>
              <Textarea
                id="cover"
                rows={4}
                maxLength={3000}
                value={form.cover_letter}
                onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                placeholder="Tell the employer why you are a good fit"
              />
              <p className="text-xs text-muted-foreground">{form.cover_letter.length}/3000</p>
            </div>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

