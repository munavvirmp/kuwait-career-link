import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, MapPin, LayoutGrid, ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteLayout } from "@/components/site/SiteLayout";
import { EmptyState, LoadingList } from "@/components/site/States";
import { JobCard } from "@/components/jobs/JobCard";
import { TIPS } from "./career-tips";
import { fetchCategories, fetchCompanies, fetchFeaturedJobs, fetchLatestJobs, fetchCompanyJobCounts } from "@/lib/api";
import { KUWAIT_LOCATIONS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KuwaitJobs — Find Your Next Job in Kuwait" },
      { name: "description", content: "Search jobs in Kuwait City, Hawally, Farwaniya, Ahmadi and more. Browse vacancies by category and apply online." },
      { property: "og:title", content: "KuwaitJobs — Find Your Next Job in Kuwait" },
      { property: "og:description", content: "Browse and apply to vacancies across Kuwait, or post a job as an employer." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("any");
  const [category, setCategory] = useState("any");

  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const featured = useQuery({ queryKey: ["featured-jobs"], queryFn: () => fetchFeaturedJobs(4) });
  const latest = useQuery({ queryKey: ["latest-jobs"], queryFn: () => fetchLatestJobs(4) });
  const companies = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const counts = useQuery({ queryKey: ["company-job-counts"], queryFn: fetchCompanyJobCounts });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      to: "/jobs",
      search: {
        keyword: keyword || undefined,
        location: location === "any" ? undefined : location,
        category: category === "any" ? undefined : category,
      },
    });
  }

  return (
    <SiteLayout>
      <section className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <Badge variant="secondary" className="mb-4">Sample demo listings only</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Find Your Next Job in Kuwait</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            Thousands of roles across Kuwait City, Hawally, Farwaniya, Shuwaikh, Ahmadi, Salmiya and Jahra.
          </p>

          <form onSubmit={submit} className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-xl bg-card p-4 shadow-elevated sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Job title or keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><MapPin className="size-4" /><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All locations</SelectItem>
                {KUWAIT_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><LayoutGrid className="size-4" /><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All categories</SelectItem>
                {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">Search Jobs</Button>
          </form>
        </div>
      </section>

      <Section title="Popular categories" href="/jobs" linkLabel="All jobs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(categories.data ?? []).map((c) => (
            <Link key={c.id} to="/jobs" search={{ category: c.id }}>
              <Card className="h-full gap-1 p-5 shadow-card transition-shadow hover:shadow-elevated">
                <LayoutGrid className="size-5 text-primary" />
                <p className="text-sm font-semibold">{c.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Featured jobs" href="/jobs" linkLabel="View all">
        {featured.isLoading ? <LoadingList count={2} /> : null}
        {featured.data?.length === 0 ? <EmptyState title="No featured jobs right now" /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {featured.data?.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      </Section>

      <Section title="Latest jobs" href="/jobs" linkLabel="View all">
        {latest.isLoading ? <LoadingList count={2} /> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {latest.data?.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      </Section>

      <Section title="Popular companies" href="/companies" linkLabel="All companies">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(companies.data ?? []).slice(0, 8).map((company) => (
            <Card key={company.id} className="gap-2 p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Building2 className="size-5" />
              </span>
              <p className="truncate text-sm font-semibold">{company.name}</p>
              <p className="text-xs text-muted-foreground">{counts.data?.[company.id] ?? 0} open jobs</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Career tips" href="/career-tips" linkLabel="Read more">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TIPS.slice(0, 3).map((tip) => (
            <Card key={tip.title} className="gap-2 p-6 shadow-card">
              <h3 className="text-base font-semibold">{tip.title}</h3>
              <p className="text-sm text-muted-foreground">{tip.body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </SiteLayout>
  );
}

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: "/jobs" | "/companies" | "/career-tips";
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <Link to={href} className="flex items-center gap-1 text-sm font-medium text-primary">
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
