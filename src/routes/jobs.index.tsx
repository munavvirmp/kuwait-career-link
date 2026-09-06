import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { EmptyState, ErrorState, LoadingList } from "@/components/site/States";
import { JobCard } from "@/components/jobs/JobCard";
import { fetchCategories, fetchJobs } from "@/lib/api";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  JOB_TYPES,
  KUWAIT_LOCATIONS,
  POSTED_WITHIN,
  SALARY_RANGES,
} from "@/lib/constants";

type JobSearch = {
  keyword?: string;
  location?: string;
  category?: string;
  jobType?: string;
  experience?: string;
  education?: string;
  salary?: string;
  posted?: string;
  sort?: "latest" | "salary_asc" | "salary_desc";
  page?: number;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): JobSearch => ({
    keyword: str(search.keyword),
    location: str(search.location),
    category: str(search.category),
    jobType: str(search.jobType),
    experience: str(search.experience),
    education: str(search.education),
    salary: str(search.salary),
    posted: str(search.posted),
    sort:
      search.sort === "salary_asc" || search.sort === "salary_desc" ? search.sort : "latest",
    page: Number(search.page ?? 1) || 1,
  }),
  head: () => ({
    meta: [
      { title: "Browse Jobs in Kuwait — KuwaitJobs" },
      { name: "description", content: "Search and filter vacancies across Kuwait by location, salary, category, experience and job type." },
      { property: "og:title", content: "Browse Jobs in Kuwait" },
      { property: "og:description", content: "Filter Kuwait vacancies by location, salary, category and experience." },
    ],
  }),
  component: JobsPage,
});

const PAGE_SIZE = 8;

function JobsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [keyword, setKeyword] = useState(search.keyword ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const salaryRange = SALARY_RANGES.find((r) => r.value === search.salary);
  const posted = POSTED_WITHIN.find((p) => p.value === search.posted);

  const jobs = useQuery({
    queryKey: ["jobs", search],
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchJobs({
        keyword: search.keyword,
        location: search.location,
        category: search.category,
        jobType: search.jobType,
        experience: search.experience,
        education: search.education,
        salaryMin: salaryRange?.min,
        salaryMax: salaryRange?.max,
        postedWithinDays: posted?.days,
        sort: search.sort,
        page: search.page ?? 1,
        pageSize: PAGE_SIZE,
      }),
  });

  function update(patch: Partial<JobSearch>) {
    void navigate({ to: ".", search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });
  }

  const total = jobs.data?.total ?? 0;
  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterSelect = (
    label: string,
    value: string | undefined,
    options: { label: string; value: string }[],
    key: keyof JobSearch,
  ) => (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? "any"}
        onValueChange={(v) => update({ [key]: v === "any" ? undefined : v } as Partial<JobSearch>)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <SiteLayout>
      <PageHeader title="Jobs in Kuwait" subtitle="All listings shown are clearly labelled sample demo data." />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            update({ keyword: keyword || undefined });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Job title or keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Button type="submit">Search Jobs</Button>
          <Button type="button" variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="size-4" /> Filters
          </Button>
        </form>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className={`h-fit gap-4 p-5 shadow-card ${showFilters ? "" : "hidden lg:flex"}`}>
            <h2 className="text-sm font-semibold">Filters</h2>
            {filterSelect("Location", search.location, KUWAIT_LOCATIONS.map((l) => ({ label: l, value: l })), "location")}
            {filterSelect(
              "Category",
              search.category,
              (categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
              "category",
            )}
            {filterSelect("Salary range", search.salary, SALARY_RANGES.filter((s) => s.value !== "any").map((s) => ({ label: s.label, value: s.value })), "salary")}
            {filterSelect("Experience level", search.experience, EXPERIENCE_LEVELS.map((l) => ({ label: l, value: l })), "experience")}
            {filterSelect("Job type", search.jobType, JOB_TYPES.map((l) => ({ label: l, value: l })), "jobType")}
            {filterSelect("Education", search.education, EDUCATION_LEVELS.map((l) => ({ label: l, value: l })), "education")}
            {filterSelect("Posted date", search.posted, POSTED_WITHIN.filter((p) => p.value !== "any").map((p) => ({ label: p.label, value: p.value })), "posted")}
            <Button
              variant="outline"
              onClick={() => {
                setKeyword("");
                void navigate({ to: ".", search: () => ({ sort: "latest", page: 1 }) });
              }}
            >
              Clear filters
            </Button>
          </Card>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {jobs.isLoading ? "Loading jobs…" : `${total} job${total === 1 ? "" : "s"} found`}
              </p>
              <Select value={search.sort ?? "latest"} onValueChange={(v) => update({ sort: v as JobSearch["sort"] })}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="salary_asc">Salary: Low to High</SelectItem>
                  <SelectItem value="salary_desc">Salary: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {jobs.isLoading ? <LoadingList /> : null}
            {jobs.isError ? <ErrorState /> : null}
            {jobs.data && jobs.data.jobs.length === 0 ? (
              <EmptyState title="No jobs match your filters" description="Try widening your search or clearing some filters." />
            ) : null}

            <div className="grid gap-4">
              {jobs.data?.jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>

            {pages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {pages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: page + 1 })}>
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
