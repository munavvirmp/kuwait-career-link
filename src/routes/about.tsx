import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { seoTags } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About KuwaitJobs — Kuwait Job Portal" },
      { name: "description", content: "Learn about KuwaitJobs, a job portal connecting job seekers and employers across Kuwait." },
      { property: "og:title", content: "About KuwaitJobs" },
      { property: "og:description", content: "A modern job portal for job seekers and employers in Kuwait." },
      seoTags("/about").urlMeta,
    ],
    links: seoTags("/about").links,
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader title="About KuwaitJobs" subtitle="Connecting talent and employers across Kuwait." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-muted-foreground">
        <p>
          KuwaitJobs is a job portal built for the Kuwaiti market. Job seekers can browse openings by
          category, location and salary, save jobs and apply with a CV. Employers can publish
          vacancies, review applicants and track hiring progress.
        </p>
        <p>
          All jobs and companies currently visible on this site are clearly labelled sample demo data
          created for demonstration purposes only. They are not real vacancies.
        </p>
      </div>
    </SiteLayout>
  );
}
