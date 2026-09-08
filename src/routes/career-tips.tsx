import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { TIPS } from "./career-tips";

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
