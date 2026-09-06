import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { EmptyState, ErrorState, LoadingList } from "@/components/site/States";
import { fetchCompanies, fetchCompanyJobCounts } from "@/lib/api";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Companies Hiring in Kuwait — KuwaitJobs" },
      { name: "description", content: "Browse companies hiring in Kuwait and see how many open vacancies each one has." },
      { property: "og:title", content: "Companies Hiring in Kuwait" },
      { property: "og:description", content: "Employers with open vacancies across Kuwait." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const companies = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const counts = useQuery({ queryKey: ["company-job-counts"], queryFn: fetchCompanyJobCounts });

  return (
    <SiteLayout>
      <PageHeader title="Popular Companies" subtitle="Employers currently listed on KuwaitJobs." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {companies.isLoading ? <LoadingList /> : null}
        {companies.isError ? <ErrorState /> : null}
        {companies.data?.length === 0 ? (
          <EmptyState title="No companies yet" description="Company profiles will appear here once employers register." />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.data?.map((company) => (
            <Card key={company.id} className="gap-2 p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{company.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{company.industry ?? "Various industries"}</p>
                </div>
              </div>
              {company.is_demo ? <Badge variant="secondary" className="w-fit">Sample data</Badge> : null}
              <p className="line-clamp-2 text-sm text-muted-foreground">{company.description ?? "No description provided."}</p>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> {company.location ?? "Kuwait"}
                </span>
                <Link to="/jobs" search={{ keyword: company.name }} className="flex items-center gap-1.5 font-medium text-primary">
                  <Briefcase className="size-4" /> {counts.data?.[company.id] ?? 0} jobs
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
