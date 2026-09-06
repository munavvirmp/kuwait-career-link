import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Building2, Briefcase, FileText, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { EmptyState, LoadingList } from "@/components/site/States";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, timeAgo } from "@/lib/constants";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — KuwaitJobs" },
      { name: "description", content: "Moderate jobs, companies, users and applications across the KuwaitJobs portal." },
      { property: "og:title", content: "Admin Dashboard — KuwaitJobs" },
      { property: "og:description", content: "Moderation and statistics for the KuwaitJobs portal." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
    else if (role !== "admin") void navigate({ to: "/dashboard", replace: true });
  }, [user, role, loading, navigate]);

  const enabled = !!user && role === "admin";

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled,
    queryFn: async () => {
      const [users, companies, activeJobs, applications, pending] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0,
        companies: companies.count ?? 0,
        activeJobs: activeJobs.count ?? 0,
        applications: applications.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  const jobs = useQuery({
    queryKey: ["admin-jobs"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies:company_id(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const companies = useQuery({
    queryKey: ["admin-companies"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const applications = useQuery({
    queryKey: ["admin-applications"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs:job_id(title)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const categories = useQuery({
    queryKey: ["admin-categories"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setJobStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Job updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Listing removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCompany = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Company updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const name = newCategory.trim();
      if (!name) throw new Error("Enter a category name.");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("categories").insert({ name, slug });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewCategory("");
      toast.success("Category added");
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Category removed");
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loading || !enabled) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10"><LoadingList count={2} /></div>
      </SiteLayout>
    );
  }

  const cards = [
    { label: "Total users", value: stats.data?.users, icon: Users },
    { label: "Total companies", value: stats.data?.companies, icon: Building2 },
    { label: "Active jobs", value: stats.data?.activeJobs, icon: Briefcase },
    { label: "Applications", value: stats.data?.applications, icon: FileText },
    { label: "Pending approvals", value: stats.data?.pending, icon: ShieldAlert },
  ];

  return (
    <SiteLayout>
      <PageHeader title="Admin dashboard" subtitle="Moderate listings and monitor portal activity." />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label} className="gap-1 p-5 shadow-card">
              <card.icon className="size-5 text-primary" />
              <p className="text-2xl font-bold">{card.value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="jobs" className="mt-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-6 grid gap-3">
            {jobs.isLoading ? <LoadingList /> : null}
            {jobs.data?.length === 0 ? <EmptyState title="No jobs yet" /> : null}
            {jobs.data?.map((job) => (
              <Card key={job.id} className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card">
                <div>
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {(job.companies as { name?: string } | null)?.name ?? "Company"} · {job.location} · {timeAgo(job.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={job.status === "approved" ? "default" : "secondary"}>{statusLabel(job.status)}</Badge>
                  {job.status !== "approved" ? (
                    <Button size="sm" onClick={() => setJobStatus.mutate({ id: job.id, status: "approved" })}>Approve</Button>
                  ) : null}
                  {job.status !== "rejected" ? (
                    <Button size="sm" variant="outline" onClick={() => setJobStatus.mutate({ id: job.id, status: "rejected" })}>Reject</Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => removeJob.mutate(job.id)}>Remove</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="companies" className="mt-6 grid gap-3">
            {companies.data?.map((company) => (
              <Card key={company.id} className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card">
                <div>
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.industry ?? "—"} · {company.location ?? "Kuwait"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleCompany.mutate({ id: company.id, is_active: !company.is_active })}>
                  {company.is_active ? "Deactivate" : "Activate"}
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-6 grid gap-3">
            {users.data?.map((profile) => (
              <Card key={profile.id} className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card">
                <div>
                  <p className="font-semibold">{profile.full_name || "Unnamed user"}</p>
                  <p className="text-sm text-muted-foreground">{profile.email ?? "—"} · joined {timeAgo(profile.created_at)}</p>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="applications" className="mt-6 grid gap-3">
            {applications.data?.map((application) => (
              <Card key={application.id} className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card">
                <div>
                  <p className="font-semibold">{application.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(application.jobs as { title?: string } | null)?.title ?? "Job"} · {timeAgo(application.created_at)}
                  </p>
                </div>
                <Badge variant="secondary">{statusLabel(application.status)}</Badge>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <Card className="max-w-xl gap-4 p-6 shadow-card">
              <div className="flex gap-2">
                <Input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                <Button onClick={() => addCategory.mutate()}>Add</Button>
              </div>
              <div className="grid gap-2">
                {categories.data?.map((category) => (
                  <div key={category.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{category.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeCategory.mutate(category.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
