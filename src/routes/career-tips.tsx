import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const TIPS = [
  {
    title: "Write a CV that suits the Kuwait market",
    body: "Keep it to two pages, add your civil ID status, visa type (Article 18/22) and notice period. Employers filter on these first.",
  },
  {
    title: "Tailor every application",
    body: "Mirror the wording of the job advert in your summary and skills. Recruiters scan for the exact terms they published.",
  },
  {
    title: "Prepare for the interview",
    body: "Research the company, prepare salary expectations in KWD, and bring copies of your certificates and passport copy.",
  },
  {
    title: "Understand your salary package",
    body: "Compare basic salary, housing and transport allowances, annual ticket and indemnity — not just the headline number.",
  },
  {
    title: "Build a network in Kuwait",
    body: "Many roles are filled through referrals. Stay in touch with former colleagues and join industry groups in Kuwait City.",
  },
  {
    title: "Follow up professionally",
    body: "A short, polite email one week after applying keeps you visible without pressuring the hiring manager.",
  },
];

export const Route = createFileRoute("/career-tips")({
  head: () => ({
    meta: [
      { title: "Career Tips for Job Seekers in Kuwait — KuwaitJobs" },
      { name: "description", content: "Practical CV, interview and salary advice for finding a job in Kuwait." },
      { property: "og:title", content: "Career Tips for Job Seekers in Kuwait" },
      { property: "og:description", content: "CV, interview and salary guidance for the Kuwait job market." },
    ],
  }),
  component: CareerTipsPage,
});

function CareerTipsPage() {
  return (
    <SiteLayout>
      <PageHeader title="Career Tips" subtitle="Practical advice for job hunting in Kuwait." />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
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
