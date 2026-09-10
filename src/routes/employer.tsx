import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { EmptyState, LoadingList } from "@/components/site/States";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/api";
import {
import { NOINDEX_META } from "@/lib/seo";
  APPLICATION_STATUSES,
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  KUWAIT_LOCATIONS,
  formatSalary,
  statusLabel,
  timeAgo,
} from "@/lib/constants";

export const Route = createFileRoute("/employer")({
  head: () => ({
    meta: [
      { title: "Employer Dashboard — KuwaitJobs" },
      { name: "description", content: "Create your company profile, post vacancies and manage applicants on KuwaitJobs." },
      { property: "og:title", content: "Employer Dashboard — KuwaitJobs" },
      { property: "og:description", content: "Post jobs and review applicants in Kuwait." },
      ...NOINDEX_META,
    ],
  }),
  component: EmployerPage,
});

const emptyJob = {
  title: "",
  location: "Kuwait City",
  salary_min: "",
  salary_max: "",
  job_type: "Full-time",
  experience_level: "Mid level",
  education: "Bachelor Degree",
  category_id: "",
  description: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  deadline: "",
};

function EmployerPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [companyForm, setCompanyForm] = useState({ name: "", industry: "", location: "Kuwait City", website: "", contact_email: "", description: "" });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", search: { mode: "login", role: "employer" }, replace: true });
  }, [user, loading, navigate]);

  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const company = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (company.data) {
      setCompanyForm({
        name: company.data.name ?? "",
        industry: company.data.industry ?? "",
        location: company.data.location ?? "Kuwait City",
        website: company.data.website ?? "",
        contact_email: company.data.contact_email ?? "",
        description: company.data.description ?? "",
      });
    }
  }, [company.data]);

  const jobs = useQuery({
    queryKey: ["employer-jobs", company.data?.id],
    enabled: !!company.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", company.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const jobIds = (jobs.data ?? []).map((j) => j.id);

  const applicants = useQuery({
    queryKey: ["employer-applicants", company.data?.id, jobIds.join(",")],
    enabled: !!company.data?.id && !jobs.isLoading,
    queryFn: async () => {
      if (!jobIds.length) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs:job_id(id,title)")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });


  const saveCompany = useMutation({
    mutationFn: async () => {
      if (!companyForm.name.trim()) throw new Error("Company name is required.");
      if (company.data) {
        const { error } = await supabase.from("companies").update(companyForm).eq("id", company.data.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("companies").insert({ ...companyForm, owner_id: user!.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Company profile saved");
      void queryClient.invalidateQueries({ queryKey: ["my-company", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveJob = useMutation({
    mutationFn: async () => {
      if (!company.data) throw new Error("Create your company profile first.");
      if (!jobForm.title.trim() || !jobForm.description.trim()) throw new Error("Job title and description are required.");
      const payload = {
        company_id: company.data.id,
        posted_by: user!.id,
        title: jobForm.title,
        location: jobForm.location,
        salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : null,
        salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : null,
        job_type: jobForm.job_type,
        experience_level: jobForm.experience_level,
        education: jobForm.education,
        category_id: jobForm.category_id || null,
        description: jobForm.description,
        responsibilities: jobForm.responsibilities.split("\n").filter(Boolean),
        requirements: jobForm.requirements.split("\n").filter(Boolean),
        benefits: jobForm.benefits.split("\n").filter(Boolean),
        deadline: jobForm.deadline || null,
      };
      if (editingId) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("jobs").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Job updated" : "Job submitted for approval");
      setJobForm(emptyJob);
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Job deleted");
      void queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application status updated");
      void queryClient.invalidateQueries({ queryKey: ["employer-applicants"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function downloadCv(path: string | null) {
    if (!path) {
      toast.error("No CV attached");
      return;
    }
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open CV");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10"><LoadingList count={2} /></div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader title="Employer dashboard" subtitle="Manage your company profile, vacancies and applicants." />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="company">
          <TabsList className="flex-wrap">
            <TabsTrigger value="company">Company profile</TabsTrigger>
            <TabsTrigger value="post">{editingId ? "Edit job" : "Post a job"}</TabsTrigger>
            <TabsTrigger value="jobs">My jobs</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-6">
            <Card className="max-w-xl gap-4 p-6 shadow-card">
              <Field label="Company name" value={companyForm.name} onChange={(v) => setCompanyForm({ ...companyForm, name: v })} />
              <Field label="Industry" value={companyForm.industry} onChange={(v) => setCompanyForm({ ...companyForm, industry: v })} />
              <Field label="Location" value={companyForm.location} onChange={(v) => setCompanyForm({ ...companyForm, location: v })} />
              <Field label="Website" value={companyForm.website} onChange={(v) => setCompanyForm({ ...companyForm, website: v })} />
              <Field label="Contact email" value={companyForm.contact_email} onChange={(v) => setCompanyForm({ ...companyForm, contact_email: v })} />
              <div className="grid gap-1.5">
                <Label>About the company</Label>
                <Textarea rows={4} value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} />
              </div>
              <Button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>Save company profile</Button>
            </Card>
          </TabsContent>

          <TabsContent value="post" className="mt-6">
            <Card className="max-w-2xl gap-4 p-6 shadow-card">
              {!company.data ? (
                <p className="text-sm text-muted-foreground">Create your company profile first, then post vacancies.</p>
              ) : null}
              <Field label="Job title" value={jobForm.title} onChange={(v) => setJobForm({ ...jobForm, title: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Picker label="Location" value={jobForm.location} options={[...KUWAIT_LOCATIONS]} onChange={(v) => setJobForm({ ...jobForm, location: v })} />
                <Picker label="Job type" value={jobForm.job_type} options={[...JOB_TYPES]} onChange={(v) => setJobForm({ ...jobForm, job_type: v })} />
                <Picker label="Experience level" value={jobForm.experience_level} options={[...EXPERIENCE_LEVELS]} onChange={(v) => setJobForm({ ...jobForm, experience_level: v })} />
                <Picker label="Education" value={jobForm.education} options={[...EDUCATION_LEVELS]} onChange={(v) => setJobForm({ ...jobForm, education: v })} />
                <Field label="Salary from (KWD)" value={jobForm.salary_min} onChange={(v) => setJobForm({ ...jobForm, salary_min: v })} />
                <Field label="Salary to (KWD)" value={jobForm.salary_max} onChange={(v) => setJobForm({ ...jobForm, salary_max: v })} />
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select value={jobForm.category_id} onValueChange={(v) => setJobForm({ ...jobForm, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(categories.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Application deadline</Label>
                  <Input type="date" value={jobForm.deadline} onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })} />
                </div>
              </div>
              <TextareaField label="Job description" value={jobForm.description} onChange={(v) => setJobForm({ ...jobForm, description: v })} />
              <TextareaField label="Responsibilities (one per line)" value={jobForm.responsibilities} onChange={(v) => setJobForm({ ...jobForm, responsibilities: v })} />
              <TextareaField label="Requirements (one per line)" value={jobForm.requirements} onChange={(v) => setJobForm({ ...jobForm, requirements: v })} />
              <TextareaField label="Benefits (one per line)" value={jobForm.benefits} onChange={(v) => setJobForm({ ...jobForm, benefits: v })} />
              <div className="flex gap-2">
                <Button onClick={() => saveJob.mutate()} disabled={saveJob.isPending}>{editingId ? "Update job" : "Publish job"}</Button>
                {editingId ? (
                  <Button variant="outline" onClick={() => { setEditingId(null); setJobForm(emptyJob); }}>Cancel</Button>
                ) : null}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            {jobs.isLoading ? <LoadingList /> : null}
            {jobs.data?.length === 0 ? <EmptyState title="No jobs posted yet" description="Publish your first vacancy from the Post a job tab." /> : null}
            <div className="grid gap-3">
              {jobs.data?.map((job) => (
                <Card key={job.id} className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card">
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.location} · {formatSalary(job.salary_min, job.salary_max, job.currency)} · posted {timeAgo(job.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "approved" ? "default" : "secondary"}>{statusLabel(job.status)}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(job.id);
                        setJobForm({
                          title: job.title,
                          location: job.location,
                          salary_min: job.salary_min?.toString() ?? "",
                          salary_max: job.salary_max?.toString() ?? "",
                          job_type: job.job_type,
                          experience_level: job.experience_level,
                          education: job.education ?? "Bachelor Degree",
                          category_id: job.category_id ?? "",
                          description: job.description,
                          responsibilities: (job.responsibilities ?? []).join("\n"),
                          requirements: (job.requirements ?? []).join("\n"),
                          benefits: (job.benefits ?? []).join("\n"),
                          deadline: job.deadline ?? "",
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteJob.mutate(job.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applicants" className="mt-6">
            {applicants.isLoading ? <LoadingList /> : null}
            {applicants.data?.length === 0 ? <EmptyState title="No applicants yet" description="Applications to your vacancies will appear here." /> : null}
            <div className="grid gap-3">
              {applicants.data?.map((application) => (
                <Card key={application.id} className="gap-3 p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{application.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(application.jobs as { title?: string } | null)?.title ?? "Job"} · {application.email}
                        {application.phone ? ` · ${application.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Applied {timeAgo(application.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{statusLabel(application.status)}</Badge>
                      <Button size="sm" variant="outline" onClick={() => void downloadCv(application.cv_url)}>
                        <Download className="size-4" /> CV
                      </Button>
                      <Select value={application.status} onValueChange={(v) => setStatus.mutate({ id: application.id, status: v })}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APPLICATION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {application.cover_letter ? (
                    <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      {application.cover_letter}
                    </p>
                  ) : null}
                </Card>

              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Picker({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
