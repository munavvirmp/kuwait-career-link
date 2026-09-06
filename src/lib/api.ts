import { supabase } from "@/integrations/supabase/client";

export type Company = {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  size: string | null;
  contact_email: string | null;
  is_demo: boolean;
  is_active: boolean;
  owner_id: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type Job = {
  id: string;
  company_id: string;
  category_id: string | null;
  posted_by: string | null;
  title: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  job_type: string;
  experience_level: string;
  experience_years: string | null;
  education: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  deadline: string | null;
  status: string;
  is_featured: boolean;
  is_demo: boolean;
  created_at: string;
  companies?: Pick<Company, "id" | "name" | "industry" | "location" | "is_demo"> | null;
  categories?: Pick<Category, "id" | "name" | "slug"> | null;
};

export type Application = {
  id: string;
  job_id: string;
  applicant_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  cover_letter: string | null;
  status: string;
  created_at: string;
  jobs?: Job | null;
};

const JOB_SELECT =
  "*, companies:company_id(id,name,industry,location,is_demo), categories:category_id(id,name,slug)";

export type JobFilters = {
  keyword?: string;
  location?: string;
  category?: string;
  jobType?: string;
  experience?: string;
  education?: string;
  salaryMin?: number;
  salaryMax?: number;
  postedWithinDays?: number;
  sort?: "latest" | "salary_asc" | "salary_desc";
  page?: number;
  pageSize?: number;
};

export async function fetchJobs(filters: JobFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;

  let query = supabase
    .from("jobs")
    .select(JOB_SELECT, { count: "exact" })
    .eq("status", "approved");

  if (filters.keyword) query = query.ilike("title", `%${filters.keyword}%`);
  if (filters.location && filters.location !== "any") query = query.eq("location", filters.location);
  if (filters.category && filters.category !== "any") query = query.eq("category_id", filters.category);
  if (filters.jobType && filters.jobType !== "any") query = query.eq("job_type", filters.jobType);
  if (filters.experience && filters.experience !== "any")
    query = query.eq("experience_level", filters.experience);
  if (filters.education && filters.education !== "any") query = query.eq("education", filters.education);
  if (filters.salaryMin) query = query.gte("salary_max", filters.salaryMin);
  if (filters.salaryMax && filters.salaryMax < 100000) query = query.lte("salary_min", filters.salaryMax);
  if (filters.postedWithinDays && filters.postedWithinDays < 3650) {
    const since = new Date(Date.now() - filters.postedWithinDays * 86400000).toISOString();
    query = query.gte("created_at", since);
  }

  if (filters.sort === "salary_asc") query = query.order("salary_min", { ascending: true, nullsFirst: false });
  else if (filters.sort === "salary_desc")
    query = query.order("salary_max", { ascending: false, nullsFirst: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { jobs: (data ?? []) as Job[], total: count ?? 0 };
}

export async function fetchFeaturedJobs(limit = 6) {
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "approved")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function fetchLatestJobs(limit = 6) {
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function fetchJob(id: string) {
  const { data, error } = await supabase.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Job | null;
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function fetchCompanyJobCounts() {
  const { data, error } = await supabase.from("jobs").select("company_id").eq("status", "approved");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.company_id] = (counts[row.company_id] ?? 0) + 1;
  return counts;
}
