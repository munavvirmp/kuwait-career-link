import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { EmptyState, LoadingList } from "@/components/site/States";
import { JobCard } from "@/components/jobs/JobCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, timeAgo } from "@/lib/constants";
import type { Application, Job } from "@/lib/api";

const JOB_SELECT =
  "*, companies:company_id(id,name,industry,location,is_demo), categories:category_id(id,name,slug)";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — KuwaitJobs" },
      {
        name: "description",
        content:
          "Manage your profile, CV, saved jobs and job applications on KuwaitJobs.",
      },
      {
        property: "og:title",
        content: "Job Seeker Dashboard — KuwaitJobs",
      },
      {
        property: "og:description",
        content:
          "Profile, CV, saved jobs and application status in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    queryKey: ["profile", user?.id],
    enabled: !!user,
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

  const saved = useQuery({
    queryKey: ["saved-jobs", user?.id],
    enabled: !!user,
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
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
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

  const recommended = useQuery({
    queryKey: ["recommended-jobs", user?.id, profile.data?.location],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("status", "approved")
        .limit(4);

      if (profile.data?.location) {
        query = query.eq("location", profile.data.location);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      return (data ?? []) as unknown as Job[];
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    location: "",
    headline: "",
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

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");

      const { error } = await supabase
        .from("profiles")
        .update(form)
        .eq("id", user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated");

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
      if (!user) throw new Error("You must be signed in.");

      const ext = file.name.split(".").pop()?.toLowerCase();

      if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
        throw new Error("CV must be a PDF, DOC or DOCX file.");
      }

      const path = `${user.id}/cv-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(path, file, {
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          cv_url: path,
          cv_name: file.name,
        })
        .eq("id", user.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("CV uploaded");

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
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <LoadingList count={2} />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        title="My dashboard"
        subtitle="Profile, CV, saved jobs and applications."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="cv">CV</TabsTrigger>
            <TabsTrigger value="saved">Saved Jobs</TabsTrigger>
            <TabsTrigger value="applied">Applied Jobs</TabsTrigger>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card className="max-w-xl gap-4 p-6 shadow-card">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Full name</Label>

                <Input
                  id="name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="headline">Headline</Label>

                <Input
                  id="headline"
                  value={form.headline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      headline: e.target.value,
                    })
                  }
                  placeholder="Accountant with 5 years in Kuwait"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>

                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="location">Location</Label>

                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                    })
                  }
                  placeholder="Kuwait City"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Signed in as {user.email}
              </p>

              <Button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
              >
                {saveProfile.isPending ? "Saving..." : "Save changes"}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="mt-6">
            <Card className="max-w-xl gap-4 p-6 shadow-card">
              <h2 className="text-base font-semibold">Upload your CV</h2>

              <p className="text-sm text-muted-foreground">
                {profile.data?.cv_name
                  ? `Current file: ${profile.data.cv_name}`
                  : "No CV uploaded yet."}
              </p>

              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={uploadCv.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    uploadCv.mutate(file);
                  }
                }}
              />

              <p className="text-xs text-muted-foreground">
                {uploadCv.isPending
                  ? "Uploading..."
                  : "Accepted formats: PDF, DOC, DOCX."}
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {saved.isLoading ? <LoadingList /> : null}

            {saved.data?.length === 0 ? (
              <EmptyState
                title="No saved jobs yet"
                description="Bookmark jobs to find them here later."
                action={
                  <Button asChild className="mt-2">
                    <Link to="/jobs">Browse jobs</Link>
                  </Button>
                }
              />
            ) : null}

            <div className="grid gap-4">
              {saved.data?.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applied" className="mt-6">
            {applications.isLoading ? <LoadingList /> : null}

            {applications.data?.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Your submitted applications and their status appear here."
              />
            ) : null}

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
            {recommended.isLoading ? <LoadingList /> : null}

            {recommended.data?.length === 0 ? (
              <EmptyState
                title="No recommended jobs"
                description="New approved jobs matching your location will appear here."
              />
            ) : null}

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