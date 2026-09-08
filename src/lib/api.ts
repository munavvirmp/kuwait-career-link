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
  cr_number: string | null;
  phone: string | null;
  address: string | null;
  representative_name: string | null;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  verification_notes: string | null;
  verified_at: string | null;
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
  companies?: Pick<Company, "id" | "name" | "industry" | "location" | "is_demo" | "verification_status"> | null;
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
  "*, companies:company_id(id,name,industry,location,is_demo,verification_status), categories:category_id(id,name,slug)";

export type JobFilters = {
  keyword?: string | undefined;
  location?: string | undefined;
  category?: string | undefined;
  jobType?: string | undefined;
  experience?: string | undefined;
  education?: string | undefined;
  salaryMin?: number | undefined;
  salaryMax?: number | undefined;
  postedWithinDays?: number | undefined;
  sort?: "latest" | "salary_asc" | "salary_desc" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
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
    .eq("verification_status", "verified")
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
export type ApplicationStatus =
| “Applied”
| “Shortlisted”
| “Interview”
| “Selected”
| “Rejected”;

export type SubmitApplicationInput = {
jobId: string;
fullName: string;
email: string;
phone?: string | null;
coverLetter?: string | null;
cvFile?: File | null;
};

const ALLOWED_CV_TYPES = [
“application/pdf”,
“application/msword”,
“application/vnd.openxmlformats-officedocument.wordprocessingml.document”,
];

const ALLOWED_CV_EXTENSIONS = [“pdf”, “doc”, “docx”];
const MAX_CV_SIZE = 10 * 1024 * 1024;

export async function submitApplication(
input: SubmitApplicationInput,
): Promise {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();

if (authError) {
throw new Error(“Unable to verify your login session.”);
}

if (!user) {
throw new Error(“Please log in before applying for a job.”);
}

if (!input.jobId) {
throw new Error(“Invalid job.”);
}

if (!input.fullName.trim()) {
throw new Error(“Please enter your full name.”);
}

if (!input.email.trim()) {
throw new Error(“Please enter your email address.”);
}

if (!input.cvFile) {
throw new Error(“Please upload your CV.”);
}

const file = input.cvFile;
const extension = file.name.split(”.”).pop()?.toLowerCase();

if (!extension || !ALLOWED_CV_EXTENSIONS.includes(extension)) {
throw new Error(“CV must be a PDF, DOC or DOCX file.”);
}

if (file.type && !ALLOWED_CV_TYPES.includes(file.type)) {
throw new Error(“Invalid CV file type.”);
}

if (file.size > MAX_CV_SIZE) {
throw new Error(“CV file must be smaller than 10 MB.”);
}

/*

* Make sure the job exists and is publicly available.
    */
    const { data: job, error: jobError } = await supabase
    .from(“jobs”)
    .select(“id,status”)
    .eq(“id”, input.jobId)
    .maybeSingle();

if (jobError) {
throw new Error(“Unable to verify this job.”);
}

if (!job) {
throw new Error(“This job no longer exists.”);
}

if (job.status !== “approved”) {
throw new Error(“This job is no longer accepting applications.”);
}

/*

* Prevent duplicate applications.
    */
    const { data: existingApplication, error: duplicateError } =
    await supabase
    .from(“applications”)
    .select(“id”)
    .eq(“job_id”, input.jobId)
    .eq(“applicant_id”, user.id)
    .maybeSingle();

if (duplicateError) {
throw new Error(“Unable to check your previous application.”);
}

if (existingApplication) {
throw new Error(“You have already applied for this job.”);
}

/*

* Create the application first so the CV can use the
* application ID in its storage path.
    /
    const { data: application, error: applicationError } = await supabase
    .from(“applications”)
    .insert({
    job_id: input.jobId,
    applicant_id: user.id,
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    cover_letter: input.coverLetter?.trim() || null,
    status: “Applied”,
    cv_url: null,
    })
    .select(””)
    .single();

if (applicationError || !application) {
if (applicationError?.code === “23505”) {
throw new Error(“You have already applied for this job.”);
}

throw new Error(
  applicationError?.message ||
    "Unable to submit your application.",
);

}

/*

* Upload CV using a private user/application-specific path.
    */
    const cvPath = ${user.id}/${application.id}/cv-${Date.now()}.${extension};

const { error: uploadError } = await supabase.storage
.from(“cvs”)
.upload(cvPath, file, {
upsert: false,
contentType: file.type || undefined,
});

if (uploadError) {
/*
* Remove the application if CV upload fails so we do not
* leave an incomplete application in the database.
*/
await supabase
.from(“applications”)
.delete()
.eq(“id”, application.id)
.eq(“applicant_id”, user.id);

throw new Error(
  "CV upload failed. Your application was not submitted.",
);

}

/*

* Save the private storage path in the application.
    /
    const { data: updatedApplication, error: updateError } =
    await supabase
    .from(“applications”)
    .update({
    cv_url: cvPath,
    })
    .eq(“id”, application.id)
    .eq(“applicant_id”, user.id)
    .select(””)
    .single();

if (updateError || !updatedApplication) {
await supabase.storage.from(“cvs”).remove([cvPath]);

await supabase
  .from("applications")
  .delete()
  .eq("id", application.id)
  .eq("applicant_id", user.id);
throw new Error(
  updateError?.message ||
    "Unable to complete your application.",
);

}

return updatedApplication as Application;
}

export async function fetchMyApplications(): Promise<Application[]> {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
throw new Error(“Please log in.”);
}

const { data, error } = await supabase
.from(“applications”)
.select(*, jobs:job_id(${JOB_SELECT}))
.eq(“applicant_id”, user.id)
.order(“created_at”, { ascending: false });

if (error) throw error;

return (data ?? []) as unknown as Application[];
}

export async function checkExistingApplication(
jobId: string,
): Promise {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) return false;

const { data, error } = await supabase
.from(“applications”)
.select(“id”)
.eq(“job_id”, jobId)
.eq(“applicant_id”, user.id)
.maybeSingle();

if (error) throw error;

return Boolean(data);
}

export async function fetchEmployerApplications(
companyId: string,
): Promise<Application[]> {
if (!companyId) {
throw new Error(“Invalid company.”);
}

const { data, error } = await supabase
.from(“applications”)
.select(*, jobs:job_id(${JOB_SELECT}))
.eq(“jobs.company_id”, companyId)
.order(“created_at”, { ascending: false });

if (error) throw error;

return (data ?? []) as unknown as Application[];
}

export async function updateApplicationStatus(
applicationId: string,
status: ApplicationStatus,
) {
const validStatuses: ApplicationStatus[] = [
“Applied”,
“Shortlisted”,
“Interview”,
“Selected”,
“Rejected”,
];

if (!validStatuses.includes(status)) {
throw new Error(“Invalid application status.”);
}

if (!applicationId) {
throw new Error(“Invalid application.”);
}

const { data, error } = await supabase
.from(“applications”)
.update({
status,
})
.eq(“id”, applicationId)
.select(”*”)
.single();

if (error) throw error;

return data as Application;
}

export async function getApplicationCvUrl(
cvPath: string,
): Promise {
if (!cvPath) {
throw new Error(“CV is not available.”);
}

const { data, error } = await supabase.storage
.from(“cvs”)
.createSignedUrl(cvPath, 60 * 5);

if (error || !data?.signedUrl) {
throw new Error(“Unable to open CV.”);
}

return data.signedUrl;
}
