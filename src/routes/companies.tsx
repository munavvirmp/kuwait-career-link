import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { LoadingList, ErrorState } from "@/components/site/States";
import { fetchCompanies, fetchCompanyJobCounts } from "@/lib/api";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Top Hiring Companies in Kuwait | Kuwait Career Link" },
      { name: "description", content: "Discover leading companies and corporate employers hiring in Kuwait. View open positions and build your career with top organizations." },
      { property: "og:title", content: "Top Hiring Companies in Kuwait | Kuwait Career Link" },
      { property: "og:description", content: "Discover leading companies and corporate employers hiring in Kuwait. View open positions and build your career with top organizations." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const companies = useQuery({ queryKey: ["companies"], queryFn: fetchCompanies });
  const counts = useQuery({ queryKey: ["company-job-counts"], queryFn: fetchCompanyJobCounts });

  return (
    <SiteLayout>
      <PageHeader
        title="Top Hiring Companies in Kuwait"
        subtitle="Explore leading employers and organizations currently posting vacancies."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {companies.isLoading ? <LoadingList count={4} /> : null}
        {companies.isError ? <ErrorState /> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(companies.data ?? []).map((company) => (
            <Link key={company.id} to="/jobs" search={{ keyword: company.name }} className="group">
              <Card className="h-full justify-between gap-4 p-6 shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-elevated">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Building2 className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold group-hover:text-primary">
                      {company.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {counts.data?.[company.id] ?? 0} open positions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  View open jobs <ArrowRight className="size-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
