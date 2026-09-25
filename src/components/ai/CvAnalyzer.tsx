import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { extractPdfText } from "@/server-functions/extract-pdf";
import { analyzeCvAgainstJob } from "@/server-functions/analyze-cv";

type AnalysisResult = {
  matchPercentage: number;
  matchingSkills: string[];
  missingSkills: string[];
  atsKeywords: string[];
  experienceMatch: string;
  educationMatch: string;
  cvSuggestions: string[];
  interviewQuestions: string[];
  recommendedActions: string[];
};

type CvAnalyzerProps = {
  initialJobDescription?: string;
  existingCvPath?: string;
  existingCvName?: string;
};

export function CvAnalyzer({
  initialJobDescription = "",
  existingCvPath = "",
  existingCvName = "",
}: CvAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState(
    initialJobDescription
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (initialJobDescription) {
      setJobDescription(initialJobDescription);
    }
  }, [initialJobDescription]);

  const analyzeCv = async () => {
    let selectedFile = file;
    if (!selectedFile && existingCvPath) {
      try {
        const extension =
          existingCvName.split(".").pop()?.toLowerCase() ?? "";
        if (extension !== "pdf") {
          toast.error(
            "Your uploaded CV is not a PDF. Please select the PDF CV manually."
          );
          return;
        }
        const { data, error } = await supabase.storage
          .from("cvs")
          .createSignedUrl(existingCvPath, 60);
        if (error || !data?.signedUrl) {
          throw new Error(
            error?.message || "Unable to access your uploaded CV."
          );
        }
        const response = await fetch(data.signedUrl);
        if (!response.ok) {
          throw new Error("Unable to download your uploaded CV.");
        }
        const blob = await response.blob();
        selectedFile = new File(
          [blob],
          existingCvName || "uploaded-cv.pdf",
          {
            type: "application/pdf",
          }
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to use your uploaded CV."
        );
        return;
      }
    }
    if (!selectedFile) {
      toast.error("Please upload a CV PDF first.");
      return;
    }
    if (selectedFile.type !== "application/pdf") {
      toast.error("AI analysis currently supports PDF files only.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("CV file must be smaller than 10 MB.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste the job description.");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const pdfBase64 = await fileToBase64(selectedFile);
      const extracted = await extractPdfText({
        data: {
          pdfBase64,
        },
      });
      if (!extracted.text?.trim()) {
        throw new Error(
          "No readable text was found in this PDF. The CV may be scanned/image-based."
        );
      }
      const response = await analyzeCvAgainstJob({
        data: {
          cvText: extracted.text,
          jobDescription: jobDescription.trim(),
        },
      });
      let cleaned = response.result.trim();
      cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI did not return valid JSON.");
      }
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      let parsed: AnalysisResult;
      try {
        parsed = JSON.parse(cleaned) as AnalysisResult;
      } catch {
        throw new Error("AI returned invalid JSON.");
      }
      if (
        typeof parsed.matchPercentage !== "number" ||
        !Array.isArray(parsed.matchingSkills) ||
        !Array.isArray(parsed.missingSkills) ||
        !Array.isArray(parsed.atsKeywords) ||
        !Array.isArray(parsed.cvSuggestions) ||
        !Array.isArray(parsed.interviewQuestions) ||
        !Array.isArray(parsed.recommendedActions)
      ) {
        throw new Error("AI returned an incomplete analysis result.");
      }
      parsed.matchPercentage = Math.min(
        100,
        Math.max(0, Math.round(parsed.matchPercentage))
      );
      parsed.experienceMatch =
        typeof parsed.experienceMatch === "string"
          ? parsed.experienceMatch
          : "";
      parsed.educationMatch =
        typeof parsed.educationMatch === "string"
          ? parsed.educationMatch
          : "";
      setResult(parsed);
      toast.success("CV analysis completed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to analyze CV."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="mt-6 grid gap-6">
      {/* Analyzer Input */}
      <Card className="gap-5 p-6 shadow-card">
        <div>
          <h2 className="text-lg font-semibold">
            ðŸ¤– AI CV Job Match Analyzer
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Upload your CV and compare it with a job description.
          </p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            CV PDF
          </label>
{existingCvPath && existingCvName && (
  <div className="rounded-lg border bg-muted/40 px-3 py-3 text-sm">
    <p className="font-medium">ðŸ“„ Uploaded CV available</p>

    <p className="mt-1 text-xs text-muted-foreground">
      {existingCvName}
    </p>

    <p className="mt-1 text-xs text-muted-foreground">
      Click Analyze My CV to use this uploaded PDF automatically.
    </p>
  </div>
)}
          <Input
            type="file"
            accept=".pdf"
            disabled={analyzing}
            onChange={(event) => {
              const selectedFile =
                event.target.files?.[0] ?? null;

              setFile(selectedFile);
              setResult(null);
            }}
          />

          <p className="text-xs text-muted-foreground">
            PDF only Â· Maximum 10 MB
          </p>

          {file && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              ðŸ“„ {file.name}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Job Description
          </label>

          <Textarea
            value={jobDescription}
            onChange={(event) =>
              setJobDescription(event.target.value)
            }
            placeholder="Paste the complete job description here..."
            className="min-h-48"
            disabled={analyzing}
          />
        </div>

        <Button
          onClick={analyzeCv}
          disabled={analyzing}
          className="w-full sm:w-auto"
        >
          {analyzing
            ? "â³ Analyzing CV..."
            : "ðŸ¤– Analyze My CV"}
        </Button>
      </Card>

      {/* Analysis Results */}
      {result && (
        <div className="grid gap-6">
          {/* Match Score */}
          <Card className="p-6 shadow-card">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  AI CV Match
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Overall Match
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Based on skills, experience, education and job
                  requirements.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-5xl font-bold">
                  {result.matchPercentage}%
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {getMatchLabel(result.matchPercentage)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{
                  width: `${result.matchPercentage}%`,
                }}
              />
            </div>
          </Card>

          {/* Skills */}
          <div className="grid gap-6 md:grid-cols-2">
            <ResultCard
              title="âœ… Matching Skills"
              description="Skills from your CV that are relevant to this job."
              items={result.matchingSkills}
              variant="success"
            />

            <ResultCard
              title="âš ï¸ Missing Skills"
              description="Important requirements not clearly demonstrated in your CV."
              items={result.missingSkills}
              variant="warning"
            />
          </div>

          {/* ATS Keywords */}
          <Card className="p-6 shadow-card">
            <div>
              <h3 className="text-lg font-semibold">
                ðŸ”Ž ATS Keywords
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Useful job-related keywords to consider adding naturally
                to your CV.
              </p>
            </div>

            {result.atsKeywords.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.atsKeywords.map((keyword, index) => (
                  <span
                    key={`keyword-${index}`}
                    className="rounded-full border bg-muted px-3 py-1.5 text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No ATS keywords identified.
              </p>
            )}
          </Card>

          {/* Experience & Education */}
          <div className="grid gap-6 md:grid-cols-2">
            <TextResultCard
              title="ðŸ’¼ Experience Match"
              text={result.experienceMatch}
            />

            <TextResultCard
              title="ðŸŽ“ Education Match"
              text={result.educationMatch}
            />
          </div>

          {/* CV Suggestions */}
          <ListCard
            title="ðŸ“ CV Suggestions"
            description="Practical improvements you can make to your CV."
            items={result.cvSuggestions}
          />

          {/* Interview Questions */}
          <Card className="p-6 shadow-card">
            <div>
              <h3 className="text-lg font-semibold">
                ðŸŽ¤ Interview Questions
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Questions you can practice before applying or attending
                an interview.
              </p>
            </div>

            {result.interviewQuestions.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {result.interviewQuestions.map(
                  (question, index) => (
                    <div
                      key={`question-${index}`}
                      className="flex gap-3 rounded-lg border p-4"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {index + 1}
                      </span>

                      <p className="text-sm leading-6">
                        {question}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No interview questions available.
              </p>
            )}
          </Card>

          {/* Recommended Actions */}
          <ListCard
            title="ðŸš€ Recommended Actions"
            description="Suggested next steps based on this analysis."
            items={result.recommendedActions}
          />
        </div>
      )}
    </div>
  );
}

function getMatchLabel(score: number): string {
  if (score >= 80) {
    return "Strong Match";
  }

  if (score >= 60) {
    return "Good Match";
  }

  if (score >= 40) {
    return "Partial Match";
  }

  return "Low Match";
}

function ResultCard({
  title,
  description,
  items,
  variant,
}: {
  title: string;
  description: string;
  items: string[];
  variant: "success" | "warning";
}) {
  return (
    <Card className="p-6 shadow-card">
      <div>
        <h3 className="text-lg font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${title}-${index}`}
              className={
                variant === "success"
                  ? "rounded-full border bg-muted px-3 py-1.5 text-sm font-medium"
                  : "rounded-full border bg-muted px-3 py-1.5 text-sm font-medium"
              }
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          None identified.
        </p>
      )}
    </Card>
  );
}

function TextResultCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <Card className="p-6 shadow-card">
      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {text || "Not available."}
      </p>
    </Card>
  );
}

function ListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="p-6 shadow-card">
      <div>
        <h3 className="text-lg font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="flex gap-3 rounded-lg border p-4"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {index + 1}
              </span>

              <p className="text-sm leading-6">
                {item}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          None identified.
        </p>
      )}
    </Card>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read PDF file."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read PDF file."));
    };

    reader.readAsDataURL(file);
  });
}

