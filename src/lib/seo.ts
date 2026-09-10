export const SITE_URL = "https://kuwait-career-link.lovable.app";
export const SITE_NAME = "KuwaitJobs";

/** Absolute canonical URL for a path such as "/jobs". */
export function canonical(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

/** Canonical <link> + og:url meta for a public page. */
export function seoTags(path: string) {
  const href = canonical(path);
  return {
    links: [{ rel: "canonical", href }],
    urlMeta: { property: "og:url", content: href },
  };
}

/** Meta entries that keep private pages out of search results. */
export const NOINDEX_META = [
  { name: "robots", content: "noindex, nofollow" },
  { name: "googlebot", content: "noindex, nofollow" },
];

/**
 * Public contact details. Replace these with the real business details when
 * they are available — they are intentionally left as clearly configurable
 * placeholders rather than invented information.
 */
export const SITE_CONTACT = {
  email: "",
  phone: "",
  address: "Kuwait",
} as const;
