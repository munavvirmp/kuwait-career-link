import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  MapPin,
  LayoutGrid,
  ArrowRight,
  Building2,
  Briefcase,
  Calculator,
  Laptop,
  Truck,
  UtensilsCrossed,
  TrendingUp,
  HardHat,
  Stethoscope,
  Car,
  Fuel,
  Sparkles,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "office-administration": Briefcase,
  "accounting-finance": Calculator,
  "it-technology": Laptop,
  "warehouse-logistics": Truck,
  hospitality: UtensilsCrossed,
  sales: TrendingUp,
  engineering: HardHat,
  healthcare: Stethoscope,
  driver: Car,
  "oil-gas": Fuel,
};
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
      {/* Attractive Hero Section with Glow and Gradient */}
      <section className="relative overflow-hidden border-b border-border bg-hero-gradient py-16 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs font-semibold shadow-sm">
            <Sparkles className="size-3.5 text-primary" /> Kuwait's Premier Career Hub
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Find Your Dream Job <span className="text-primary-foreground/90 underline decoration-primary/50 decoration-wavy">in Kuwait</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
            Explore thousands of verified vacancies across Kuwait City, Hawally, Farwaniya, Ahmadi, and Salmiya.
          </p>

          {/* Floating Glassmorphism Search Bar */}
          <form onSubmit={submit} className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl bg-card/95 p-3 text-left shadow-2xl backdrop-blur-md sm:mt-10 sm:p-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] border border-border/50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-12 pl-10 border-muted bg-background/50 text-base" placeholder="Job title, keyword, or company" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-12 w-full border-muted bg-background/50"><MapPin className="size-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All locations</SelectItem>
                {KUWAIT_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-12 w-full border-muted bg-background/50"><LayoutGrid className="size-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All categories</SelectItem>
                {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" size="lg" className="h-12 px-8 font-semibold shadow-md transition-transform active:scale-95">
              Search Jobs
            </Button>
          </form>

          {/* Stats Bar */}
          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6">
            {[
              { label: "Active Openings", value: `${latest.data ? "500+" : "—"}` },
              { label: "Top Employers", value: `${(companies.data ?? []).length || "—"}` },
              { label: "Job Sectors", value: `${(categories.data ?? []).length || "—"}` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-card/10 px-3 py-4 backdrop-blur-md border border-white/10 sm:px-6">
                <dt className="text-xl font-black text-primary-foreground sm:text-3xl">{s.value}</dt>
                <dd className="text-xs font-medium text-primary-foreground/80 sm:text-sm mt-0.5">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Why Choose Us / Highlights Banner */}
      <section className="border-b border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-xs">
            <span className="p-3 rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-6" /></span>
            <div>
              <h3 className="font-semibold text-sm">Verified Listings</h3>
              <p className="text-xs text-muted-foreground">100% genuine job postings</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-xs">
            <span className="p-3 rounded-lg bg-primary/10 text-primary"><Zap className="size-6" /></span>
            <div>
              <h3 className="font-semibold text-sm">Instant Apply</h3>
              <p className="text-xs text-muted-foreground">Quick application process</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border shadow-xs">
            <span className="p-3 rounded-lg bg-primary/10 text-primary"><Briefcase className="size-6" /></span>
            <div>
              <h3 className="font-semibold text-sm">Top Companies</h3>
              <p className="text-xs text-muted-foreground">Hiring across Kuwait</p>
            </div>
          </div>
        </div>
      </section>

      <Section title="Popular job categories" href="/jobs" linkLabel="All jobs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.data ?? []).map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? LayoutGrid;
            return (
              <Link key={c.id} to="/jobs" search={{ category: c.id }} className="group">
                <Card className="h-full items-start gap-3 p-5 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg rounded-2xl bg-card">
                  <span className="grid size-12 place-items-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-xs">
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-snug group-hover:text-primary transition-colors">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Explore roles</p>
                  </div>
                </Card>
              </Link>
            );
          })}
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
            <Card key={company.id} className="gap-3 p-5 shadow-sm hover:shadow-md transition-all rounded-2xl border-border/60">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/5 text-primary">
                <Building2 className="size-6" />
              </span>
              <div>
                <p className="truncate text-sm font-bold">{company.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{counts.data?.[company.id] ?? 0} open positions</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Career tips" href="/career-tips" linkLabel="Read more">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TIPS.slice(0, 3).map((tip) => (
            <Card key={tip.title} className="gap-3 p-6 shadow-sm hover:shadow-md transition-all rounded-2xl border-border/60">
              <h3 className="text-base font-bold">{tip.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{tip.body}</p>
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
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
        <Link to={href} className="group flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          {linkLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}