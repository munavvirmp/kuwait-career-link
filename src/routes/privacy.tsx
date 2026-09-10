import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { seoTags } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — KuwaitJobs" },
      { name: "description", content: "How KuwaitJobs collects, uses and protects your personal data and CV files." },
      { property: "og:title", content: "Privacy Policy — KuwaitJobs" },
      { property: "og:description", content: "How KuwaitJobs handles personal data and CV files." },
      seoTags("/privacy").urlMeta,
    ],
    links: seoTags("/privacy").links,
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHeader title="Privacy Policy" subtitle="Last updated: this is a demonstration policy." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm text-muted-foreground">
        <p>We collect the account details you provide: name, email, phone, location and your CV.</p>
        <p>Your CV is stored privately and is only shared with employers whose jobs you apply to.</p>
        <p>We never sell personal data. You can request deletion of your account at any time.</p>
        <p>This text is placeholder content for a demonstration project and is not legal advice.</p>
      </div>
    </SiteLayout>
  );
}
