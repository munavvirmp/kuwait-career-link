export const KUWAIT_LOCATIONS = [
  "Kuwait City",
  "Hawally",
  "Farwaniya",
  "Shuwaikh",
  "Ahmadi",
  "Salmiya",
  "Jahra",
] as const;

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"] as const;

export const EXPERIENCE_LEVELS = [
  "Entry level",
  "Mid level",
  "Senior level",
  "Management",
] as const;

export const EDUCATION_LEVELS = [
  "High School",
  "Diploma",
  "Bachelor Degree",
  "Master Degree",
] as const;

export const SALARY_RANGES = [
  { label: "Any salary", value: "any", min: 0, max: 100000 },
  { label: "Up to 300 KWD", value: "0-300", min: 0, max: 300 },
  { label: "300 - 600 KWD", value: "300-600", min: 300, max: 600 },
  { label: "600 - 1000 KWD", value: "600-1000", min: 600, max: 1000 },
  { label: "1000+ KWD", value: "1000-plus", min: 1000, max: 100000 },
];

export const POSTED_WITHIN = [
  { label: "Any time", value: "any", days: 3650 },
  { label: "Last 24 hours", value: "1", days: 1 },
  { label: "Last 7 days", value: "7", days: 7 },
  { label: "Last 30 days", value: "30", days: 30 },
];

export const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSalary(min: number | null, max: number | null, currency = "KWD") {
  if (!min && !max) return "Salary not disclosed";
  if (min && max) return `${min} - ${max} ${currency}`;
  return `${min ?? max} ${currency}`;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
