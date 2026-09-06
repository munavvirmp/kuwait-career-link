import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { formatSalary, timeAgo } from "@/lib/constants";
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

function ApplyDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cover_letter: "" });
  const [file, setFile] = useState<File | null>(null);

  const apply = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Please enter your full name.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) throw new Error("Please enter a valid email address.");
      if (!file) throw new Error("Please attach your CV (PDF, DOC or DOCX).");
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "doc", "docx"].includes(ext)) throw new Error("CV must be a PDF, DOC or DOCX file.");
      if (!user) throw new Error("Please sign in to apply for this job.");

      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        applicant_id: user.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        cover_letter: form.cover_letter || null,
        cv_url: path,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDone(true);
      toast.success("Application submitted successfully.");
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
        {done ? (
          <div className="grid gap-4 py-4 text-center">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <p className="text-sm">Application submitted successfully.</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
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
            <div className="grid gap-1.5">
              <Label htmlFor="cv">CV (PDF, DOC, DOCX)</Label>
              <Input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cover">Cover letter</Label>
              <Textarea id="cover" rows={4} value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} />
            </div>
            {!user ? (
              <p className="text-sm text-muted-foreground">
                You need an account to apply.{" "}
                <Link to="/auth" search={{ mode: "login" }} className="font-medium text-primary">
                  Sign in
                </Link>
              </p>
            ) : null}
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
