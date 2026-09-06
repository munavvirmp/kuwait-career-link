import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — KuwaitJobs" },
      { name: "description", content: "The terms that apply to job seekers and employers using the KuwaitJobs portal." },
      { property: "og:title", content: "Terms of Use — KuwaitJobs" },
      { property: "og:description", content: "Rules for job seekers and employers on KuwaitJobs." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <PageHeader title="Terms of Use" subtitle="Please read these terms before using KuwaitJobs." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm text-muted-foreground">
        <p>Employers must publish accurate vacancies and may never charge job seekers a fee.</p>
        <p>Job seekers must provide truthful information in profiles and applications.</p>
        <p>Fraudulent or misleading listings are removed and the account may be suspended.</p>
        <p>All listings shown today are sample demo data for demonstration purposes only.</p>
      </div>
    </SiteLayout>
  );
}
