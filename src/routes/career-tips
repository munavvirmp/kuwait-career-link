import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";

const TIPS = [
  {
    title: "Tailor Your Resume for the Kuwait Market",
    body: "Highlight local experience, valid Kuwait work visa status, and relevant certifications that employers in Kuwait City and Hawally look for."
  },
  {
    title: "Ace Your Job Interview",
    body: "Research the company thoroughly, dress professionally according to corporate standards in Kuwait, and prepare to discuss your past achievements clearly."
  },
  {
    title: "Network with Local Professionals",
    body: "Attend industry events, connect with recruiters on professional networks, and engage with local business groups in Kuwait to discover hidden job openings."
  },
  {
    title: "Understand Kuwait Labor Laws",
    body: "Familiarize yourself with the Kuwait Labor Law regarding working hours, annual leave, and end-of-service benefits to ensure a smooth employment journey."
  },
  {
    title: "Highlight In-Demand Skills",
    body: "Focus on upgrading skills that are currently in high demand across Kuwait's key sectors like IT, healthcare, engineering, and finance."
  },
  {
    title: "Follow Up After Interviews",
    body: "Send a polite thank-you email within 24 hours of your interview to express your gratitude and reiterate your enthusiasm for the position."
  }
];

export const Route = createFileRoute("/career-tips")({
  head: () => ({
    meta: [
      { title: "Job Seeker Career Tips & Interview Guides in Kuwait" },
      { name: "description", content: "Get expert career advice, resume writing tips, and interview strategies tailored for job seekers in Kuwait." },
      { property: "og:title", content: "Job Seeker Career Tips & Interview Guides in Kuwait" },
      { property: "og:description", content: "Get expert career advice, resume writing tips, and interview strategies tailored for job seekers in Kuwait." },
    ],
  }),
  component: CareerTipsPage,
});

function CareerTipsPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="Career Tips & Interview Guides"
        subtitle="Expert advice to help you secure your next job in Kuwait."
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TIPS.map((tip) => (
            <Card key={tip.title} className="gap-3 p-6 shadow-card">
              <h2 className="text-lg font-semibold">{tip.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{tip.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
