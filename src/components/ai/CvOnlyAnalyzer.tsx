import { useState } from "react";
import { extractPdfText } from "@/server-functions/extract-pdf";
import { analyzeCvOnly } from "@/server-functions/analyze-cv-only";
import { Button } from "@/components/ui/button";

type ExperienceItem = {
  title?: string;
  company?: string;
  location?: string;
  dates?: string;
  description?: string;
};

type CvOnlyResult = {
  atsScore: number;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: string[];
  languages: string[];
  strengths: string[];
  cvImprovements: string[];
  atsIssues: string[];
};

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return (
      safeString(obj.text) ||
      safeString(obj.value) ||
      safeString(obj.name) ||
      safeString(obj.title) ||
      safeString(obj.description) ||
      safeString(obj.label) ||
      ""
    );
  }

  return "";
}

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => safeString(item))
    .filter(Boolean);
}

function normalizeExperience(value: unknown): ExperienceItem[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (typeof item === "string") {
      return {
        title: item,
        company: "",
        location: "",
        dates: "",
        description: "",
      };
    }

    if (!item || typeof item !== "object") {
      return {
        title: "",
        company: "",
        location: "",
        dates: "",
        description: "",
      };
    }

    const obj = item as Record<string, unknown>;

    let description = safeString(obj.description);

    if (!description && Array.isArray(obj.responsibilities)) {
      description = obj.responsibilities
        .map((x) => safeString(x))
        .filter(Boolean)
        .join(" â€¢ ");
    }

    return {
      title:
        safeString(obj.title) ||
        safeString(obj.jobTitle) ||
        safeString(obj.position),

      company:
        safeString(obj.company) ||
        safeString(obj.employer),

      location: safeString(obj.location),

      dates:
        safeString(obj.dates) ||
        safeString(obj.duration) ||
        safeString(obj.period),

      description,
    };
  });
}

function normalizeResult(value: unknown): CvOnlyResult {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const score = Number(data.atsScore);

  return {
    atsScore: Number.isFinite(score)
      ? Math.max(0, Math.min(100, score))
      : 0,

    summary: safeString(data.summary),
    skills: safeArray(data.skills),
    experience: normalizeExperience(data.experience),
    education: safeArray(data.education),
    languages: safeArray(data.languages),
    strengths: safeArray(data.strengths),
    cvImprovements: safeArray(data.cvImprovements),
    atsIssues: safeArray(data.atsIssues),
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Could not read file"));
    };

    reader.readAsDataURL(file);
  });
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No information found.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={index} className="ml-5 list-disc">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExperienceCard({
  experience,
}: {
  experience: ExperienceItem[];
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">
        Work Experience
      </h3>

      {experience.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No work experience found.
        </p>
      ) : (
        <div className="space-y-4">
          {experience.map((item, index) => (
            <div
              key={index}
              className="rounded-md bg-muted/40 p-3"
            >
              {item.title && (
                <h4 className="font-semibold">
                  {item.title}
                </h4>
              )}

              {item.company && (
                <p className="text-sm font-medium">
                  {item.company}
                </p>
              )}

              {item.location && (
                <p className="text-sm text-muted-foreground">
                  {item.location}
                </p>
              )}

              {item.dates && (
                <p className="text-sm text-muted-foreground">
                  {item.dates}
                </p>
              )}

              {item.description && (
                <p className="mt-2 text-sm">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CvOnlyAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CvOnlyResult | null>(null);

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload your CV PDF.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const pdfBase64 = await fileToBase64(file);

      const extracted = await extractPdfText({
        data: {
          pdfBase64,
        },
      });

      if (!extracted?.text?.trim()) {
        throw new Error(
          "Could not extract text from the CV."
        );
      }

      const response = await analyzeCvOnly({
        data: {
          cvText: extracted.text,
        },
      });

      // Server now returns an object.
      // This also supports older string responses.
      let rawResult: unknown = response.result;

      if (typeof rawResult === "string") {
        const cleaned = rawResult
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        rawResult = JSON.parse(cleaned);
      }

      const normalized = normalizeResult(rawResult);

      setResult(normalized);
    } catch (err) {
      console.error("CV analysis error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "CV analysis failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border p-5">
      <div>
        <h2 className="text-xl font-bold">
          ðŸ¤– AI CV ATS Analyzer
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CV and get an ATS-focused analysis.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => {
            const selected =
              event.target.files?.[0] ?? null;

            if (
              selected &&
              selected.size > 10 * 1024 * 1024
            ) {
              setError("Maximum CV size is 10 MB.");
              setFile(null);
              return;
            }

            setError("");
            setResult(null);
            setFile(selected);
          }}
        />

        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name}
          </p>
        )}

        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || loading}
        >
          {loading
            ? "Analyzing CV..."
            : "Analyze My CV"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              AI CV ATS Score
            </p>

            <p className="mt-2 text-4xl font-bold">
              {result.atsScore}%
            </p>
          </div>

          {result.summary && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">
                Professional Summary
              </h3>

              <p className="text-sm">
                {result.summary}
              </p>
            </div>
          )}

          <ListCard
            title="Skills"
            items={result.skills}
          />

          <ExperienceCard
            experience={result.experience}
          />

          <ListCard
            title="Education"
            items={result.education}
          />

          <ListCard
            title="Languages"
            items={result.languages}
          />

          <ListCard
            title="Strengths"
            items={result.strengths}
          />

          <ListCard
            title="CV Improvements"
            items={result.cvImprovements}
          />

          <ListCard
            title="ATS Issues"
            items={result.atsIssues}
          />
        </div>
      )}
    </div>
  );
}

