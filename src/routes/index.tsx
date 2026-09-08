import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Kuwait Career Link
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Find your next career opportunity in Kuwait.
        </p>
      </div>
    </SiteLayout>
  );
}
