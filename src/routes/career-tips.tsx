import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/career-tips")({
  component: CareerTipsPage,
  head: () => ({
    meta: [
      { title: "Career Tips for Job Seekers in Kuwait | KuwaitJobs" },
      {
        name: "description",
        content:
          "Practical CV, interview and job search advice for finding work in Kuwait, from application to offer.",
      },
      { property: "og:title", content: "Career Tips for Job Seekers in Kuwait" },
      {
        property: "og:description",
        content: "CV writing, interview preparation and salary tips for the Kuwait job market.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

export const TIPS = [
  {
    title: "Write a CV built for Kuwait employers",
    body: "Keep it to two pages, list your visa/residency status, and highlight measurable results rather than duties.",
  },
  {
    title: "Tailor every application",
    body: "Mirror the wording of the job advert in your summary and skills so recruiters can match you quickly.",
  },
  {
    title: "Prepare for the interview",
    body: "Research the company, prepare three achievement stories, and be ready to discuss notice period and salary expectations.",
  },
  {
    title: "Know your salary range",
    body: "Compare similar roles on the job listings page before you negotiate, and consider allowances such as housing and transport.",
  },
  {
    title: "Stay safe from job scams",
    body: "Never pay a fee for a job offer or send personal documents outside the application form.",
  },
  {
    title: "Follow up professionally",
    body: "A short, polite message one week after applying keeps you visible without being pushy.",
  },
];

function CareerTipsPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="Career Tips"
        subtitle="Advice to help you stand out in the Kuwait job market."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {TIPS.map((tip) => (
          <Card key={tip.title} className="gap-2 p-6 shadow-card">
            <h2 className="text-base font-semibold">{tip.title}</h2>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </Card>
        ))}
      </div>
    </SiteLayout>
  );
}
