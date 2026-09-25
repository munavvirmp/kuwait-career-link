import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJobDescription } from "@/server-functions/analyze-job-description";

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

function safeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ResultList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function JobAnalyzer() {
  const navigate = useNavigate();

  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<JobAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    const text = jobDescription.trim();

    if (!text) {
      setError("Please paste a job description first.");
      setResult(null);
      return;
    }

    if (text.length < 20) {
      setError("Please provide a more complete job description.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await analyzeJobDescription({
        data: {
          jobDescription: text,
        },
      });

      if (!response?.success || !response?.result) {
        throw new Error("AI returned an empty result.");
      }

      const data = response.result as JobAnalysisResult;

      const normalized: JobAnalysisResult = {
        jobTitle: safeString(data.jobTitle),
        company: safeString(data.company),
        location: safeString(data.location),
        salary: safeString(data.salary),
        employmentType: safeString(data.employmentType),
        requiredSkills: safeArray(data.requiredSkills),
        education: safeArray(data.education),
        experience: safeString(data.experience),
        languages: safeArray(data.languages),
        keywords: safeArray(data.keywords),
        responsibilities: safeArray(data.responsibilities),
        importantRequirements: safeArray(data.importantRequirements),
        summary: safeString(data.summary),
      };

      setResult(normalized);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the job.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const matchMyCv = () => {
    const text = jobDescription.trim();

    if (!text) {
      setError("Job description is missing.");
      return;
    }

    navigate({
      to: "/dashboard",
      search: {
        tab: "cv",
        jobDescription: text,
      },
    });
  };

  const clearAll = () => {
    setJobDescription("");
    setResult(null);
    setError("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 AI Job Analyzer
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Paste a job vacancy and let AI extract the important requirements,
            skills, experience, education, and ATS keywords.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder={`Paste the complete job description here...

Example:

Accountant
Kuwait City

Requirements:
- Diploma or Bachelor's degree in Accounting
- 1-2 years accounting experience
- Tally Prime
- MS Excel
- Knowledge of VAT

Responsibilities:
- Voucher entry
- Bank reconciliation
- Prepare reports`}
            className="min-h-[280px]"
            disabled={loading}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={analyze} disabled={loading}>
              {loading ? "🤖 Analyzing..." : "🤖 Analyze Job"}
            </Button>

            <Button
              variant="outline"
              onClick={clearAll}
              disabled={loading && !jobDescription}
            >
              Clear
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">
                AI is analyzing the complete job description...
              </p>

              <p className="mt-1 text-muted-foreground">
                This may take a little time because the local Ollama model is
                processing the vacancy.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Overview</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultField label="Job Title" value={result.jobTitle} />
                <ResultField label="Company" value={result.company} />
                <ResultField label="Location" value={result.location} />
                <ResultField label="Salary" value={result.salary} />

                <ResultField
                  label="Employment Type"
                  value={result.employmentType}
                />

                <ResultField
                  label="Experience"
                  value={result.experience}
                />
              </div>

              {result.summary && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold">Summary</h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {result.summary}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <ResultList
                title="Required Skills"
                items={result.requiredSkills}
              />

              <ResultList title="Education" items={result.education} />

              <ResultList title="Languages" items={result.languages} />

              <ResultList
                title="Important Requirements"
                items={result.importantRequirements}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <ResultList
                title="Responsibilities"
                items={result.responsibilities}
              />

              <ResultList
                title="ATS Keywords"
                items={result.keywords}
              />
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>📄 Check Your CV Match</CardTitle>

              <p className="text-sm text-muted-foreground">
                Use the existing AI CV Match tool to compare your CV with this
                job description.
              </p>
            </CardHeader>

            <CardContent>
              <Button
                onClick={matchMyCv}
                className="w-full sm:w-auto"
              >
                📄 Match My CV
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
            AI analysis is based only on the job description provided. Missing
            information is not automatically assumed or invented.
          </div>
        </div>
      )}
    </div>
  );
}