import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/jobs", priority: "0.9", changefreq: "daily" },
  { path: "/companies", priority: "0.7", changefreq: "weekly" },
  { path: "/career-tips", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.4", changefreq: "yearly" },
  { path: "/contact", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
];

function urlEntry(loc: string, lastmod?: string, priority = "0.5", changefreq = "weekly") {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function approvedJobs(): Promise<Array<{ id: string; created_at: string }>> {
  const url = process.env["SUPABASE_URL"] ?? "https://dcwkycbttaopqevmlqbn.supabase.co";
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    "sb_publishable_3C6yP7c6YR37aCaUszAC2A_1q1E5pUL";

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("jobs")
      .select("id, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; created_at: string }>;
  } catch (error) {
    console.error("sitemap: failed to load jobs", error);
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const jobs = await approvedJobs();
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...STATIC_PATHS.map((s) =>
            urlEntry(`${SITE_URL}${s.path === "/" ? "" : s.path}`, undefined, s.priority, s.changefreq),
          ),
          ...jobs.map((j) =>
            urlEntry(`${SITE_URL}/jobs/${j.id}`, j.created_at?.slice(0, 10), "0.8", "daily"),
          ),
          "</urlset>",
        ].join("\n");

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
