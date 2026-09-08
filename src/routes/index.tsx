import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KuwaitJobs — Jobs in Kuwait" },
      {
        name: "description",
        content: "KuwaitJobs — Find jobs in Kuwait.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">
          KuwaitJobs
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          Website is working.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Homepage diagnostic test
        </p>
      </div>
    </main>
  );
}