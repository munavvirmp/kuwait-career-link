import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: TestPage,
});

function TestPage() {
  return <div style={{ padding: "40px" }}>TEST OK</div>;
}