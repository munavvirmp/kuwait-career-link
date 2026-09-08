import { createFileRoute, Link, useNavigate } from “@tanstack/react-router”;
import { useMutation, useQuery, useQueryClient } from “@tanstack/react-query”;
import { useEffect, useState } from “react”;
import { toast } from “sonner”;

import { Badge } from “@/components/ui/badge”;
import { Button } from “@/components/ui/button”;
import { Card } from “@/components/ui/card”;
import { Input } from “@/components/ui/input”;
import { Label } from “@/components/ui/label”;
import {
Tabs,
TabsContent,
TabsList,
TabsTrigger,
} from “@/components/ui/tabs”;

import { SiteLayout, PageHeader } from “@/components/site/SiteLayout”;
import { EmptyState, LoadingList } from “@/components/site/States”;
import { JobCard } from “@/components/jobs/JobCard”;
import { useAuth } from “@/hooks/useAuth”;
import { supabase } from “@/integrations/supabase/client”;
import { statusLabel, timeAgo } from “@/lib/constants”;
import type { Application, Job } from “@/lib/api”;

const JOB_SELECT =
“*, companies:company_id(id,name,industry,location,is_demo), categories:category_id(id,name,slug)”;

export const Route = createFileRoute(”/dashboard”)({
head: () => ({
meta: [
{
title: “My Dashboard — Kuwait Career Link”,
},
{
name: “description”,
content:
“Manage your profile, CV, saved jobs and job applications on Kuwait Career Link.”,
},
{
property: “og:title”,
content: “Job Seeker Dashboard — Kuwait Career Link”,
},
{
property: “og:description”,
content:
“Profile, CV, saved jobs and application status in one place.”,
},
],
}),
component: DashboardPage,
});

function DashboardPage() {
const { user, loading } = useAuth();
const navigate = useNavigate();
const queryClient = useQueryClient();

const [form, setForm] = useState({
full_name: “”,
phone: “”,
location: “”,
headline: “”,
});

useEffect(() => {
if (loading) return;
if (user) return;

void navigate({
  to: "/auth",
  search: { mode: "login" },
  replace: true,
});

}, [loading, user, navigate]);

const profile = useQuery({
queryKey: [“profile”, user?.id],
enabled: Boolean(user?.id),
queryFn: async () => {
if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
},

});

useEffect(() => {
if (!profile.data) return;

setForm({
  full_name: profile.data.full_name ?? "",
  phone: profile.data.phone ?? "",
  location: profile.data.location ?? "",
  headline: profile.data.headline ?? "",
});

}, [profile.data]);

const saved = useQuery({
queryKey: [“saved-jobs”, user?.id],
enabled: Boolean(user?.id),
queryFn: async () => {
if (!user) return [];

  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`id, jobs:job_id(${JOB_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.jobs as unknown as Job)
    .filter(Boolean);
},

});

const applications = useQuery({
queryKey: [“my-applications”, user?.id],
enabled: Boolean(user?.id),
queryFn: async () => {
if (!user) return [];

  const { data, error } = await supabase
    .from("applications")
    .select(`*, jobs:job_id(${JOB_SELECT})`)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Application[];
},

});

/*

* Load public jobs.
* We intentionally do not filter by profile location.
* This prevents jobs from disappearing because of different
* spellings such as “Farwaniya” and “Al Farwaniyah”.
    */
    const recommended = useQuery({
    queryKey: [“recommended-jobs”, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
    const { data, error } = await supabase
    .from(“jobs”)
    .select(JOB_SELECT)
    .in(“status”, [“approved”, “active”, “published”])
    .order(“created_at”, { ascending: false })
    .limit(8);
    if (error) throw error;
    return (data ?? []) as unknown as Job[];
    },
    });

const saveProfile = useMutation({
mutationFn: async () => {
if (!user) {
throw new Error(“You must be signed in.”);
}

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      headline: form.headline.trim(),
    })
    .eq("id", user.id);
  if (error) {
    throw new Error(error.message);
  }
},
onSuccess: () => {
  toast.success("Profile updated successfully.");
  void queryClient.invalidateQueries({
    queryKey: ["profile", user?.id],
  });
},
onError: (error: Error) => {
  toast.error(error.message);
},

});

const uploadCv = useMutation({
mutationFn: async (file: File) => {
if (!user) {
throw new Error(“You must be signed in.”);
}

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "doc", "docx"].includes(extension)) {
    throw new Error("CV must be a PDF, DOC or DOCX file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("CV file must be smaller than 10 MB.");
  }
  const path = `${user.id}/cv-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      cv_url: path,
      cv_name: file.name,
    })
    .eq("id", user.id);
  if (profileError) {
    throw new Error(profileError.message);
  }
},
onSuccess: () => {
  toast.success("CV uploaded successfully.");
  void queryClient.invalidateQueries({
    queryKey: ["profile", user?.id],
  });
},
onError: (error: Error) => {
  toast.error(error.message);
},

});

if (loading || !user) {
return (
);
}

return (
  <div className="mx-auto max-w-6xl px-4 py-8">
    <Tabs defaultValue="profile">
      <TabsList className="flex flex-wrap gap-1">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="cv">CV</TabsTrigger>
        <TabsTrigger value="saved">Saved Jobs</TabsTrigger>
        <TabsTrigger value="applied">Applied Jobs</TabsTrigger>
        <TabsTrigger value="recommended">Latest Jobs</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-6">
        <Card className="max-w-xl gap-4 p-6 shadow-card">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              placeholder="Your full name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="headline">Professional headline</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  headline: event.target.value,
                }))
              }
              placeholder="Administrative Assistant"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="+965 XXXXXXXX"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="Farwaniya, Kuwait"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </Card>
      </TabsContent>
      <TabsContent value="cv" className="mt-6">
        <Card className="max-w-xl gap-4 p-6 shadow-card">
          <h2 className="text-base font-semibold">Upload Your CV</h2>
          <p className="text-sm text-muted-foreground">
            {profile.data?.cv_name
              ? `Current file: ${profile.data.cv_name}`
              : "No CV uploaded yet."}
          </p>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            disabled={uploadCv.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadCv.mutate(file);
              }
              event.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            {uploadCv.isPending
              ? "Uploading your CV..."
              : "Accepted formats: PDF, DOC, DOCX. Maximum size: 10 MB."}
          </p>
        </Card>
      </TabsContent>
      <TabsContent value="saved" className="mt-6">
        {saved.isLoading && <LoadingList />}
        {saved.isError && (
          <EmptyState
            title="Unable to load saved jobs"
            description="Please refresh the page and try again."
          />
        )}
        {!saved.isLoading &&
          !saved.isError &&
          saved.data?.length === 0 && (
            <EmptyState
              title="No saved jobs yet"
              description="Bookmark jobs to find them here later."
              action={
                <Button asChild className="mt-2">
                  <Link to="/jobs">Browse Jobs</Link>
                </Button>
              }
            />
          )}
        <div className="grid gap-4">
          {saved.data?.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="applied" className="mt-6">
        {applications.isLoading && <LoadingList />}
        {applications.isError && (
          <EmptyState
            title="Unable to load applications"
            description="Please refresh the page and try again."
          />
        )}
        {!applications.isLoading &&
          !applications.isError &&
          applications.data?.length === 0 && (
            <EmptyState
              title="No applications yet"
              description="Your submitted applications and their status will appear here."
              action={
                <Button asChild className="mt-2">
                  <Link to="/jobs">Find Jobs</Link>
                </Button>
              }
            />
          )}
        <div className="grid gap-3">
          {applications.data?.map((application) => (
            <Card
              key={application.id}
              className="flex-row flex-wrap items-center justify-between gap-3 p-5 shadow-card"
            >
              <div>
                <p className="font-semibold">
                  {application.jobs?.title ?? "Job"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {application.jobs?.companies?.name ?? "Company"} · applied{" "}
                  {timeAgo(application.created_at)}
                </p>
              </div>
              <Badge variant="secondary">
                {statusLabel(application.status)}
              </Badge>
            </Card>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="recommended" className="mt-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Latest Jobs</h2>
            <p className="text-sm text-muted-foreground">
              Recently published opportunities in Kuwait.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/jobs">View All Jobs</Link>
          </Button>
        </div>
        {recommended.isLoading && <LoadingList count={4} />}
        {recommended.isError && (
          <EmptyState
            title="Unable to load jobs"
            description={
              recommended.error instanceof Error
                ? recommended.error.message
                : "Please check your connection and try again."
            }
            action={
              <Button
                className="mt-2"
                onClick={() => void recommended.refetch()}
              >
                Try Again
              </Button>
            }
          />
        )}
        {!recommended.isLoading &&
          !recommended.isError &&
          recommended.data?.length === 0 && (
            <EmptyState
              title="No jobs available yet"
              description="There are currently no published jobs available."
              action={
                <Button asChild className="mt-2">
                  <Link to="/jobs">Browse Jobs</Link>
                </Button>
              }
            />
          )}
        <div className="grid gap-4">
          {recommended.data?.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
</SiteLayout>

);
}