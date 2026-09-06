import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact KuwaitJobs — Support & Enquiries" },
      { name: "description", content: "Get in touch with the KuwaitJobs team for support, employer enquiries or feedback." },
      { property: "og:title", content: "Contact KuwaitJobs" },
      { property: "og:description", content: "Support and employer enquiries for the KuwaitJobs portal." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHeader title="Contact us" subtitle="We usually reply within one business day." />
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-10 sm:grid-cols-3">
        <Card className="gap-2 p-5 shadow-card">
          <Mail className="size-5 text-primary" />
          <p className="text-sm font-semibold">Email</p>
          <p className="text-sm text-muted-foreground">support@kuwaitjobs.example</p>
        </Card>
        <Card className="gap-2 p-5 shadow-card">
          <Phone className="size-5 text-primary" />
          <p className="text-sm font-semibold">Phone</p>
          <p className="text-sm text-muted-foreground">+965 0000 0000</p>
        </Card>
        <Card className="gap-2 p-5 shadow-card">
          <MapPin className="size-5 text-primary" />
          <p className="text-sm font-semibold">Office</p>
          <p className="text-sm text-muted-foreground">Kuwait City, Kuwait</p>
        </Card>
      </div>
      <p className="mx-auto max-w-3xl px-4 pb-10 text-sm text-muted-foreground">
        These contact details are placeholders for this demonstration project. Share your real email,
        phone number and address and we will put them here.
      </p>
    </SiteLayout>
  );
}
