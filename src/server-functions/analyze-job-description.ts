import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JobAnalysisResult = {
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  employmentType: string;
  requiredSkills: string[];
  education: string[];
  experience: string;
  languages: string[];
  keywords: string[];
  responsibilities: string[];
  importantRequirements: string[];
  summary: string;
};

function cleanString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const result: string[] = [];

  for (const value of values) {
    const cleaned = cleanString(value);

    if (!cleaned) {
      continue;
    }

    if (!result.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      result.push(cleaned);
    }
  }

  return result;
}

function parseJsonResponse(value: string): unknown {
  let cleaned = value.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("AI returned invalid JSON");
    }

    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new Error("AI returned invalid JSON");
    }
  }
}

function normalizeResult(value: unknown): JobAnalysisResult {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    jobTitle: cleanString(data.jobTitle),
    company: cleanString(data.company),
    location: cleanString(data.location),
    salary: cleanString(data.salary),
    employmentType: cleanString(data.employmentType),
    requiredSkills: uniqueStrings(data.requiredSkills),
    education: uniqueStrings(data.education),
    experience: cleanString(data.experience),
    languages: uniqueStrings(data.languages),
    keywords: uniqueStrings(data.keywords),
    responsibilities: uniqueStrings(data.responsibilities),
    importantRequirements: uniqueStrings(data.importantRequirements),
    summary: cleanString(data.summary),
  };
}

/**
 * Remove obvious metadata and sentence-like values from ATS keywords.
 * Keywords should be short, job-relevant terms rather than company,
 * location, salary, employment type, or complete requirement sentences.
 */
function cleanAtsKeywords(
  keywords: string[],
  result: JobAnalysisResult
): string[] {
  const metadata = new Set(
    [
      result.jobTitle,
      result.company,
      result.location,
      result.salary,
      result.employmentType,
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase())
  );

  const cleaned: string[] = [];

  for (const keyword of keywords) {
    const value = keyword.trim();

    if (!value) {
      continue;
    }

    const lower = value.toLowerCase();

    // Remove exact metadata values.
    if (metadata.has(lower)) {
      continue;
    }

    // Remove long sentence-like values.
    const wordCount = value.split(/\s+/).filter(Boolean).length;

    if (wordCount > 6) {
      continue;
    }

    // Remove common sentence starters.
    if (
      /^(knowledge of|good |excellent |strong |minimum |must have|should have|ability to|responsible for|experience in|degree in|diploma in|we are looking|the candidate)/i.test(
        value
      )
    ) {
      continue;
    }

    // Remove values that are primarily salary/location/contact metadata.
    if (
      /(?:\b\d+\s*(?:kd|kwd|years?|months?)\b|\bkuwait\b|\bkuwait city\b|@|https?:\/\/)/i.test(
        value
      )
    ) {
      continue;
    }

    if (
      !cleaned.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      )
    ) {
      cleaned.push(value);
    }
  }

  return cleaned.slice(0, 20);
}

function buildFallbackKeywords(result: JobAnalysisResult): string[] {
  const candidates = [
    ...result.requiredSkills,
    ...result.languages,
  ];

  const resultKeywords: string[] = [];

  for (const value of candidates) {
    const cleaned = value.trim();

    if (!cleaned) {
      continue;
    }

    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

    if (wordCount > 6) {
      continue;
    }

    if (
      !resultKeywords.some(
        (item) => item.toLowerCase() === cleaned.toLowerCase()
      )
    ) {
      resultKeywords.push(cleaned);
    }
  }

  return resultKeywords.slice(0, 20);
}

export const analyzeJobDescription = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
      data,
    }: {
      context: any;
      data: { jobDescription: string };
    }) => {
  const jobDescription = data.jobDescription?.trim();

  if (!jobDescription) {
    throw new Error("Job description is required");
  }

  const MAX_JOB_DESCRIPTION_LENGTH = 50_000;

  if (jobDescription.length < 20) {
    throw new Error("Please provide a more complete job description");
  }

  if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    throw new Error("Job description is too large.");
  }

  const { data: allowed, error: rateLimitError } =
    await context.supabase.rpc("check_ai_rate_limit", {
      _endpoint: "analyze-job-description",
    });

  if (rateLimitError) {
    console.error("AI rate-limit check failed:", rateLimitError);
    throw new Error("Unable to process AI request.");
  }

  if (!allowed) {
    throw new Error("AI rate limit exceeded. Please try again later.");
  }

  const prompt = `
You are a professional job-description analyzer for a Kuwait jobs portal.

Analyze the COMPLETE job description below.

IMPORTANT RULES:

1. Read the entire job description before answering.
2. Extract only information actually present.
3. NEVER invent salary, company, location, qualifications, experience,
   skills, responsibilities, benefits, or language requirements.
4. If information is not present, return an empty string or empty array.
5. Keep salary exactly as mentioned when available.
6. Keep experience requirements based only on the vacancy.
7. Separate education from skills and training.
8. Responsibilities must contain actual job duties.
9. Required skills must contain actual skills/tools/competencies.
10. Languages must contain actual language requirements.
11. ATS keywords must contain SHORT, job-relevant search terms only.
12. ATS keywords MUST NOT contain:
    - company name
    - location
    - salary
    - employment type
    - full sentences
    - full education requirements
    - long responsibility sentences
13. Good ATS keyword examples:
    "Tally Prime"
    "MS Excel"
    "GCC VAT"
    "Bank Reconciliation"
    "Voucher Entry"
    "Accounting"
    "Financial Reporting"
14. Do not put "ABC Trading Company", "Kuwait City", "250 KD",
    "Full Time", or similar metadata in ATS keywords.
15. Prefer specific professional terms that could realistically appear
    in a candidate CV.
16. Return ONLY valid JSON.
17. Do not use markdown code fences.
18. Do not add explanations outside the JSON.

Return exactly:

{
  "jobTitle": "",
  "company": "",
  "location": "",
  "salary": "",
  "employmentType": "",
  "requiredSkills": [],
  "education": [],
  "experience": "",
  "languages": [],
  "keywords": [],
  "responsibilities": [],
  "importantRequirements": [],
  "summary": ""
}

JOB DESCRIPTION:
${jobDescription}
`;

  let response: Response;

  try {
    response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5-coder:3b",
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });
  } catch {
    throw new Error(
      "Unable to connect to Ollama. Please make sure Ollama is running."
    );
  }

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    response?: string;
    error?: string;
  };

  if (result.error) {
    throw new Error(`Ollama error: ${result.error}`);
  }

  const rawResponse = result.response?.trim();

  if (!rawResponse) {
    throw new Error("Ollama returned an empty response");
  }

  const parsed = parseJsonResponse(rawResponse);
  const normalized = normalizeResult(parsed);

  normalized.keywords = cleanAtsKeywords(
    normalized.keywords,
    normalized
  );

  if (normalized.keywords.length === 0) {
    normalized.keywords = buildFallbackKeywords(normalized);
  }

  return {
    success: true,
    result: normalized,
  };
});