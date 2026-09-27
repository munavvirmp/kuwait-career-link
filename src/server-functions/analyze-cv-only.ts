import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CvExperience = {
  title: string;
  company: string;
  location: string;
  dates: string;
  description: string;
};

type CvOnlyResult = {
  atsScore: number;
  summary: string;
  skills: string[];
  experience: CvExperience[];
  education: string[];
  languages: string[];
  strengths: string[];
  cvImprovements: string[];
  atsIssues: string[];
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const value = item.trim();

    if (!value) {
      return false;
    }

    const key = value.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        return String(item);
      }

      if (
        item &&
        typeof item === "object"
      ) {
        const obj =
          item as Record<string, unknown>;

        return (
          cleanString(obj.text) ||
          cleanString(obj.value) ||
          cleanString(obj.name) ||
          cleanString(obj.title) ||
          cleanString(obj.label) ||
          cleanString(obj.description) ||
          ""
        );
      }

      return "";
    })
    .filter(Boolean);

  return uniqueStrings(items);
}

function removeInvalidMessages(
  items: string[]
): string[] {
  return items.filter((item) => {
    const normalized =
      item.toLowerCase().trim();

    return (
      normalized !== "" &&
      normalized !== "no information found" &&
      normalized !== "information not found" &&
      normalized !== "not found" &&
      normalized !== "none" &&
      normalized !== "n/a" &&
      normalized !== "na"
    );
  });
}

/* =========================================================
   EXPERIENCE NORMALIZATION
========================================================= */

function cleanExperience(
  value: unknown
): CvExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          title: item.trim(),
          company: "",
          location: "",
          dates: "",
          description: "",
        };
      }

      if (
        !item ||
        typeof item !== "object"
      ) {
        return {
          title: "",
          company: "",
          location: "",
          dates: "",
          description: "",
        };
      }

      const obj =
        item as Record<string, unknown>;

      let responsibilities = "";

      if (
        Array.isArray(
          obj.responsibilities
        )
      ) {
        responsibilities =
          obj.responsibilities
            .map((item) =>
              cleanString(item)
            )
            .filter(Boolean)
            .join("; ");
      }

      const description =
        cleanString(
          obj.description
        ) ||
        responsibilities ||
        cleanString(obj.details) ||
        cleanString(obj.tasks);

      return {
        title:
          cleanString(obj.title) ||
          cleanString(obj.jobTitle) ||
          cleanString(obj.position),

        company:
          cleanString(obj.company) ||
          cleanString(obj.employer) ||
          cleanString(obj.organization),

        location:
          cleanString(obj.location),

        dates:
          cleanString(obj.dates) ||
          cleanString(obj.duration) ||
          cleanString(obj.period) ||
          cleanString(obj.date),

        description,
      };
    })
    .filter(
      (item) =>
        item.title ||
        item.company ||
        item.location ||
        item.dates ||
        item.description
    );
}

/* =========================================================
   JSON PARSER
========================================================= */

function parseJsonResponse(
  raw: string
): Record<string, unknown> {
  let text = raw.trim();

  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object"
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    // Continue to fallback extraction.
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {
    const extracted = text.slice(
      start,
      end + 1
    );

    try {
      const parsed =
        JSON.parse(extracted);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }
    } catch {
      // handled below
    }
  }

  throw new Error(
    "AI returned invalid JSON. Please try again."
  );
}

/* =========================================================
   SUMMARY CLEANING
========================================================= */

function cleanSummary(
  summary: string,
  cvText: string
): string {
  let value = summary.trim();

  if (!value) {
    return "";
  }

  const firstLine =
    cvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0] || "";

  /*
   * If AI starts the summary with the candidate's
   * name from the first CV line, remove it.
   */
  if (
    firstLine &&
    firstLine.length <= 80 &&
    value
      .toLowerCase()
      .startsWith(
        firstLine.toLowerCase()
      )
  ) {
    value = value
      .slice(firstLine.length)
      .replace(
        /^\s*(is|:|-)\s*/i,
        ""
      )
      .trim();
  }

  /*
   * Remove common "Name is ..." pattern.
   */
  value = value.replace(
    /^([A-Z][A-Za-z.' -]{2,60})\s+is\s+/,
    (match, name) => {
      /*
       * Only remove if the apparent name
       * looks like a personal name.
       */
      if (
        typeof name === "string" &&
        name.trim().split(/\s+/).length >= 2
      ) {
        return "";
      }

      return match;
    }
  );

  return value.trim();
}

/* =========================================================
   EDUCATION EXTRACTION
========================================================= */

function extractEducationFromCv(
  cvText: string
): string[] {
  const lines = cvText
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const result: string[] = [];

  const educationHeader =
    /^(education|educational background|academic background|qualifications|academic qualifications)$/i;

  const stopHeader =
    /^(work experience|experience|employment|skills|technical skills|languages|achievements|interests|references|projects|professional experience|contact)$/i;

  const educationKeywords =
    /(diploma|degree|bachelor|master|higher secondary|plus two|secondary education|school|college|university|institute|nios|certificate|certification)/i;

  const skillOnly =
    /^(tally\s*prime|quickbooks|advanced\s*ms\s*excel|ms\s*excel|ms\s*word|word|powerpoint|gcc\s*vat|gcc\s*vat\s*concept|accounting software|office administration)$/i;

  /*
   * First try to identify the actual EDUCATION section.
   */
  const educationStart =
    lines.findIndex((line) =>
      educationHeader.test(line)
    );

  if (educationStart !== -1) {
    for (
      let i = educationStart + 1;
      i < lines.length;
      i++
    ) {
      const line = lines[i];

      if (stopHeader.test(line)) {
        break;
      }

      if (
        skillOnly.test(line)
      ) {
        continue;
      }

      /*
       * Avoid accidentally adding a huge block
       * of CV text.
       */
      if (line.length > 180) {
        continue;
      }

      if (
        educationKeywords.test(line)
      ) {
        result.push(line);

        /*
         * Usually the next line is the
         * institution/provider.
         */
        const next =
          lines[i + 1];

        if (
          next &&
          next.length <= 120 &&
          !stopHeader.test(next) &&
          !skillOnly.test(next) &&
          !educationKeywords.test(next)
        ) {
          result.push(next);
        }
      }
    }
  }

  /*
   * Second fallback:
   * search the whole CV only for clear
   * education-specific lines.
   */
  if (result.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (
        skillOnly.test(line)
      ) {
        continue;
      }

      if (
        educationKeywords.test(line) &&
        line.length <= 150
      ) {
        result.push(line);

        const next =
          lines[i + 1];

        if (
          next &&
          next.length <= 120 &&
          !skillOnly.test(next) &&
          !stopHeader.test(next)
        ) {
          /*
           * Only add a likely institution/provider.
           */
          if (
            /(ciat|nios|college|university|school|institute|academy)/i.test(
              next
            )
          ) {
            result.push(next);
          }
        }
      }
    }
  }

  return uniqueStrings(
    removeInvalidMessages(result)
  ).slice(0, 10);
}

/* =========================================================
   LANGUAGE EXTRACTION
========================================================= */

function extractLanguagesFromCv(
  cvText: string
): string[] {
  const lines = cvText
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const languages = [
    "English",
    "Arabic",
    "Malayalam",
    "Hindi",
    "Tamil",
    "Urdu",
    "French",
    "German",
  ];

  const proficiencyPattern =
    /(Limited Working Proficiency|Elementary Proficiency|Basic Proficiency|Intermediate Proficiency|Advanced Proficiency|Professional Proficiency|Native|Fluent|Basic|Intermediate|Advanced)/i;

  const result: string[] = [];

  /*
   * Prefer lines containing a language name.
   */
  for (const line of lines) {
    for (const language of languages) {
      const languagePattern =
        new RegExp(
          `\\b${language}\\b`,
          "i"
        );

      if (
        !languagePattern.test(line)
      ) {
        continue;
      }

      /*
       * Avoid treating generic CV sentences
       * as language entries.
       */
      if (
        line.length > 120 &&
        !proficiencyPattern.test(line)
      ) {
        continue;
      }

      const proficiency =
        line.match(
          proficiencyPattern
        );

      const value = proficiency
        ? `${language} — ${proficiency[0]}`
        : language;

      result.push(value);
    }
  }

  return uniqueStrings(result);
}

/* =========================================================
   STRENGTH NORMALIZATION
========================================================= */

function normalizeStrength(
  strength: string
): string {
  let value =
    strength
      .replace(/\s+/g, " ")
      .trim();

  value = value.replace(
    /\s+knowledge\s+knowledge$/i,
    " knowledge"
  );

  value = value.replace(
    /\s+experience\s+experience$/i,
    " experience"
  );

  value = value.replace(
    /^GCC VAT Knowledge knowledge$/i,
    "GCC VAT knowledge"
  );

  value = value.replace(
    /^Office Administration knowledge$/i,
    "Office administration"
  );

  value = value.replace(
    /^Office administration knowledge$/i,
    "Office administration"
  );

  value = value.replace(
    /^Advanced MS Excel knowledge$/i,
    "Advanced MS Excel knowledge"
  );

  return value.trim();
}

function cleanStrengths(
  items: string[]
): string[] {
  const cleaned =
    removeInvalidMessages(items)
      .map(normalizeStrength)
      .filter((item) => {
        /*
         * Do not treat dated achievements
         * as strengths.
         */
        if (
          /\(\s*\d{1,2}\/\d{4}/i.test(
            item
          )
        ) {
          return false;
        }

        if (
          /^data organization\b/i.test(
            item
          )
        ) {
          return false;
        }

        if (
          /^achievement\b/i.test(
            item
          )
        ) {
          return false;
        }

        return true;
      });

  return uniqueStrings(
    cleaned
  ).slice(0, 6);
}

/* =========================================================
   STRENGTH FALLBACK
========================================================= */

function ensureStrengths(
  strengths: string[],
  result: {
    skills: string[];
    experience: CvExperience[];
    education: string[];
  }
): string[] {
  const output =
    cleanStrengths(strengths);

  const skillMap: Record<
    string,
    string
  > = {
    "tally prime":
      "Tally Prime knowledge",

    quickbooks:
      "QuickBooks knowledge",

    "advanced ms excel":
      "Advanced MS Excel knowledge",

    "gcc vat knowledge":
      "GCC VAT knowledge",

    "office administration":
      "Office administration",

    "ms word":
      "MS Word knowledge",

    powerpoint:
      "PowerPoint knowledge",

    "accounting software":
      "Accounting software knowledge",
  };

  for (const skill of result.skills) {
    const key =
      skill
        .toLowerCase()
        .trim();

    const mapped =
      skillMap[key];

    if (
      mapped &&
      !output.some(
        (item) =>
          item.toLowerCase() ===
          mapped.toLowerCase()
      )
    ) {
      output.push(mapped);
    }
  }

  const descriptions =
    result.experience
      .map(
        (item) =>
          item.description
      )
      .join(" ");

  if (
    /data management/i.test(
      descriptions
    )
  ) {
    output.push(
      "Data management experience"
    );
  }

  if (
    /voucher/i.test(
      descriptions
    )
  ) {
    output.push(
      "Voucher entry experience"
    );
  }

  if (
    /report/i.test(
      descriptions
    )
  ) {
    output.push(
      "Reporting experience"
    );
  }

  if (
    result.education.length > 0
  ) {
    output.push(
      "Accounting education"
    );
  }

  return cleanStrengths(
    output
  ).slice(0, 6);
}

/* =========================================================
   IMPROVEMENTS
========================================================= */

function ensureImprovements(
  improvements: string[],
  result: {
    experience: CvExperience[];
    education: string[];
    languages: string[];
  }
): string[] {
  const valid =
    uniqueStrings(
      removeInvalidMessages(
        improvements
      )
    ).slice(0, 5);

  if (valid.length > 0) {
    return valid;
  }

  const fallback: string[] = [];

  const hasBriefExperience =
    result.experience.some(
      (item) =>
        item.description.trim()
          .length > 0 &&
        item.description.trim()
          .length < 100
    );

  if (hasBriefExperience) {
    fallback.push(
      "Expand the work responsibilities with specific tasks already performed."
    );
  }

  if (
    result.education.length > 0
  ) {
    fallback.push(
      "Keep formal education and courses or training clearly separated where applicable."
    );
  }

  if (
    result.languages.length > 0
  ) {
    const hasProficiency =
      result.languages.some(
        (language) =>
          /limited|elementary|basic|intermediate|advanced|fluent|proficiency/i.test(
            language
          )
      );

    if (!hasProficiency) {
      fallback.push(
        "Add language proficiency levels if they are known and can be stated truthfully."
      );
    }
  }

  if (fallback.length === 0) {
    fallback.push(
      "Review the CV for consistent formatting and clear presentation of existing information."
    );
  }

  return uniqueStrings(
    fallback
  ).slice(0, 4);
}

/* =========================================================
   ATS ISSUES
========================================================= */

function buildAtsIssues(
  aiIssues: string[],
  result: {
    summary: string;
    skills: string[];
    experience: CvExperience[];
    education: string[];
    languages: string[];
  }
): string[] {
  const issues =
    cleanAtsIssues(aiIssues);

  const finalIssues: string[] = [];

  /*
   * Real issue:
   * experience description is too short.
   */
  const hasBriefExperience =
    result.experience.some(
      (item) => {
        const description =
          item.description.trim();

        return (
          description.length > 0 &&
          description.length < 100
        );
      }
    );

  if (hasBriefExperience) {
    finalIssues.push(
      "Work experience responsibilities are very brief; add more specific duties already performed."
    );
  }

  /*
   * If AI found a genuine additional issue,
   * keep it unless it is a false/missing-section claim.
   */
  for (const issue of issues) {
    const normalized =
      issue.toLowerCase();

    if (
      finalIssues.some(
        (existing) =>
          existing.toLowerCase() ===
          normalized
      )
    ) {
      continue;
    }

    finalIssues.push(issue);
  }

  if (
    finalIssues.length === 0
  ) {
    finalIssues.push(
      "No significant ATS issues identified"
    );
  }

  return uniqueStrings(
    finalIssues
  ).slice(0, 5);
}

function cleanAtsIssues(
  issues: string[]
): string[] {
  const invalidPatterns = [
    /missing contact/i,
    /missing email/i,
    /missing phone/i,
    /missing dates/i,
    /missing education/i,
    /missing language/i,
    /missing skills section/i,
    /missing experience section/i,
    /missing standard section/i,
    /no education/i,
    /no languages/i,
  ];

  return removeInvalidMessages(
    issues
  ).filter((issue) => {
    return !invalidPatterns.some(
      (pattern) =>
        pattern.test(issue)
    );
  });
}

/* =========================================================
   FINAL ATS SCORE
========================================================= */

/*
 * IMPORTANT:
 *
 * AI DOES NOT CONTROL THIS SCORE.
 *
 * Maximum:
 *
 * Contact                10
 * Summary               10
 * Skills                15
 * Experience            25
 * Education             10
 * Languages              5
 * ATS structure         15
 * Clarity/consistency   10
 *
 * Total                 100
 */

function calculateAtsScore(
  cvText: string,
  result: {
    summary: string;
    skills: string[];
    experience: CvExperience[];
    education: string[];
    languages: string[];
  }
): number {
  let score = 0;

  /* -------------------------------------------------------
     1. CONTACT — 10
  ------------------------------------------------------- */

  const hasEmail =
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(
      cvText
    );

  const hasPhone =
    /(?:\+?\d[\d\s().-]{7,}\d)/.test(
      cvText
    );

  if (hasEmail) {
    score += 5;
  }

  if (hasPhone) {
    score += 5;
  }

  /* -------------------------------------------------------
     2. SUMMARY — 10
  ------------------------------------------------------- */

  const summaryLength =
    result.summary.trim().length;

  if (summaryLength >= 120) {
    score += 10;
  } else if (summaryLength >= 80) {
    score += 9;
  } else if (summaryLength >= 50) {
    score += 8;
  } else if (summaryLength >= 30) {
    score += 6;
  } else if (summaryLength > 0) {
    score += 3;
  }

  /* -------------------------------------------------------
     3. SKILLS — 15
  ------------------------------------------------------- */

  const skillCount =
    result.skills.length;

  if (skillCount >= 8) {
    score += 15;
  } else if (skillCount >= 6) {
    score += 13;
  } else if (skillCount >= 4) {
    score += 11;
  } else if (skillCount >= 3) {
    score += 9;
  } else if (skillCount >= 1) {
    score += 5;
  }

  /* -------------------------------------------------------
     4. EXPERIENCE — 25
  ------------------------------------------------------- */

  let experienceScore = 0;

  if (
    result.experience.length > 0
  ) {
    /*
     * Experience exists.
     */
    experienceScore += 10;

    const hasTitle =
      result.experience.some(
        (item) =>
          item.title.trim()
            .length > 0
      );

    const hasCompany =
      result.experience.some(
        (item) =>
          item.company.trim()
            .length > 0
      );

    const hasDates =
      result.experience.some(
        (item) =>
          item.dates.trim()
            .length > 0
      );

    const longestDescription =
      Math.max(
        0,
        ...result.experience.map(
          (item) =>
            item.description
              .trim()
              .length
        )
      );

    if (hasTitle) {
      experienceScore += 3;
    }

    if (hasCompany) {
      experienceScore += 3;
    }

    if (hasDates) {
      experienceScore += 4;
    }

    /*
     * Experience detail quality.
     *
     * Short:
     * 25–59 chars = 2
     *
     * Moderate:
     * 60–99 chars = 3
     *
     * Good:
     * 100–149 chars = 4
     *
     * Detailed:
     * 150+ chars = 5
     */
    if (
      longestDescription >= 150
    ) {
      experienceScore += 5;
    } else if (
      longestDescription >= 100
    ) {
      experienceScore += 4;
    } else if (
      longestDescription >= 60
    ) {
      experienceScore += 3;
    } else if (
      longestDescription >= 25
    ) {
      experienceScore += 2;
    }

    experienceScore =
      Math.min(
        25,
        experienceScore
      );
  }

  score += experienceScore;

  /* -------------------------------------------------------
     5. EDUCATION — 10
  ------------------------------------------------------- */

  if (
    result.education.length >= 3
  ) {
    score += 10;
  } else if (
    result.education.length === 2
  ) {
    score += 9;
  } else if (
    result.education.length === 1
  ) {
    score += 7;
  }

  /* -------------------------------------------------------
     6. LANGUAGES — 5
  ------------------------------------------------------- */

  const languageCount =
    result.languages.length;

  const hasLanguageProficiency =
    result.languages.some(
      (language) =>
        /proficiency|fluent|native|basic|elementary|intermediate|advanced/i.test(
          language
        )
    );

  if (
    languageCount >= 2 &&
    hasLanguageProficiency
  ) {
    score += 5;
  } else if (
    languageCount >= 2
  ) {
    score += 4;
  } else if (
    languageCount === 1 &&
    hasLanguageProficiency
  ) {
    score += 3;
  } else if (
    languageCount === 1
  ) {
    score += 2;
  }

  /* -------------------------------------------------------
     7. ATS STRUCTURE — 15
  ------------------------------------------------------- */

  const hasSummarySection =
    /(^|\n)\s*(professional summary|summary|profile|objective)\s*($|\n)/i.test(
      cvText
    ) ||
    result.summary.length > 0;

  const hasSkillsSection =
    /(^|\n)\s*(skills|technical skills|core skills)\s*($|\n)/i.test(
      cvText
    ) ||
    result.skills.length > 0;

  const hasExperienceSection =
    /(^|\n)\s*(work experience|experience|employment|professional experience)\s*($|\n)/i.test(
      cvText
    ) ||
    result.experience.length > 0;

  const hasEducationSection =
    /(^|\n)\s*(education|educational background|academic background|qualifications)\s*($|\n)/i.test(
      cvText
    ) ||
    result.education.length > 0;

  const hasLanguagesSection =
    /(^|\n)\s*(languages|language)\s*($|\n)/i.test(
      cvText
    ) ||
    result.languages.length > 0;

  const sections = [
    hasSummarySection,
    hasSkillsSection,
    hasExperienceSection,
    hasEducationSection,
    hasLanguagesSection,
  ].filter(Boolean).length;

  if (sections >= 5) {
    score += 15;
  } else if (sections === 4) {
    score += 13;
  } else if (sections === 3) {
    score += 10;
  } else if (sections === 2) {
    score += 7;
  } else if (sections === 1) {
    score += 4;
  }

  /* -------------------------------------------------------
     8. CLARITY / CONSISTENCY — 10
  ------------------------------------------------------- */

  let clarityScore = 0;

  if (
    hasEmail &&
    hasPhone
  ) {
    clarityScore += 2;
  }

  if (
    result.experience.length > 0
  ) {
    clarityScore += 2;
  }

  if (
    result.education.length > 0
  ) {
    clarityScore += 2;
  }

  if (
    result.languages.length > 0
  ) {
    clarityScore += 1;
  }

  if (
    result.skills.length >= 3
  ) {
    clarityScore += 1;
  }

  if (
    summaryLength >= 50
  ) {
    clarityScore += 1;
  }

  /*
   * Dates are present in experience.
   */
  if (
    result.experience.some(
      (item) =>
        item.dates.trim()
          .length > 0
    )
  ) {
    clarityScore += 1;
  }

  score += Math.min(
    10,
    clarityScore
  );

  /* -------------------------------------------------------
     FINAL CALIBRATION
  ------------------------------------------------------- */

  const coreSections = [
    hasEmail,
    hasPhone,
    summaryLength >= 50,
    skillCount >= 3,
    result.experience.length > 0,
    result.education.length > 0,
    result.languages.length > 0,
  ].filter(Boolean).length;

  const longestDescription =
    Math.max(
      0,
      ...result.experience.map(
        (item) =>
          item.description
            .trim()
            .length
      )
    );

  /*
   * Complete CV but short work description.
   *
   * This prevents the previous 93% problem.
   */
  if (
    coreSections >= 7 &&
    longestDescription > 0 &&
    longestDescription < 100
  ) {
    score = Math.min(
      score,
      84
    );
  }

  /*
   * Complete CV with moderate experience detail.
   */
  if (
    coreSections >= 7 &&
    longestDescription >= 100 &&
    longestDescription < 150
  ) {
    score = Math.min(
      score,
      88
    );
  }

  /*
   * Do not give 90+ simply because every section exists.
   *
   * 90+ requires genuinely detailed experience.
   */
  if (
    score >= 90 &&
    longestDescription < 150
  ) {
    score = 89;
  }

  /*
   * Minimum reasonable score for a complete CV.
   */
  if (
    coreSections >= 7 &&
    score < 75
  ) {
    score = 75;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

/* =========================================================
   SERVER FUNCTION
========================================================= */

export const analyzeCvOnly =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .handler(
      async ({
        context,
        data,
      }: {
        context: any;
        data: {
          cvText: string;
        };
      }) => {
      const cvText =
        data.cvText?.trim();

      const MAX_CV_TEXT_LENGTH = 100_000;

      if (!cvText) {
        throw new Error(
          "CV text is required"
        );
      }

      if (cvText.length > MAX_CV_TEXT_LENGTH) {
        throw new Error(
          "CV text is too large."
        );
      }

      const { data: allowed, error: rateLimitError } =
        await context.supabase.rpc("check_ai_rate_limit", {
          _endpoint: "analyze-cv-only",
        });

      if (rateLimitError) {
        console.error("AI rate-limit check failed:", rateLimitError);
        throw new Error("Unable to process AI request.");
      }

      if (!allowed) {
        throw new Error("AI rate limit exceeded. Please try again later.");
      }

      const prompt = `
You are a professional ATS CV information extractor.

Analyze ONLY the CV below.

The CV is the ONLY source of truth.

Do NOT compare it with a job description.

Do NOT invent information.

Never invent:

- skills
- employers
- job titles
- responsibilities
- achievements
- qualifications
- certifications
- languages
- proficiency levels
- dates
- years of experience

Read the ENTIRE CV before answering.

==================================================
PROFESSIONAL SUMMARY
==================================================

Create a concise professional summary.

Do NOT unnecessarily use the candidate's name.

Use only information explicitly supported by the CV.

==================================================
SKILLS
==================================================

Extract explicitly stated skills.

Do not infer additional skills.

==================================================
WORK EXPERIENCE
==================================================

Extract every actual work experience.

Use:

{
  "title": "",
  "company": "",
  "location": "",
  "dates": "",
  "description": ""
}

The description must contain only actual responsibilities
or duties stated in the CV.

Do not invent detailed duties.

==================================================
EDUCATION
==================================================

Search the ENTIRE CV.

Extract actual education, such as:

- Diploma
- Degree
- Bachelor
- Master
- Higher Secondary
- Plus Two
- School
- College
- University
- NIOS
- Institute
- clearly identified courses
- clearly identified training
- clearly identified certifications

IMPORTANT:

Do NOT classify these ordinary skills as education:

Tally Prime
QuickBooks
MS Excel
Advanced MS Excel
MS Word
PowerPoint
GCC VAT
Office Administration
Accounting Software

Only classify them as education/training if the CV explicitly
identifies them as a course, training or certification.

If education exists, extract it.

Never return "No information found" when education
is visibly present.

==================================================
LANGUAGES
==================================================

Search the ENTIRE CV.

Extract every visible language.

Preserve proficiency exactly.

For example:

English — Limited Working Proficiency

Arabic — Elementary Proficiency

Do NOT upgrade or change proficiency.

==================================================
STRENGTHS
==================================================

Return genuine strengths supported by the CV.

Examples:

Tally Prime knowledge
Advanced MS Excel knowledge
GCC VAT knowledge
Voucher entry experience
Data management experience
Reporting experience
Office administration

Do not turn dates or achievements into strengths.

Do not duplicate words such as:

"GCC VAT Knowledge knowledge"

==================================================
CV IMPROVEMENTS
==================================================

Give practical improvements based only on the actual CV.

For example:

Expand brief work responsibilities.

Separate formal education from training.

Improve formatting.

Make dates consistent.

Do not recommend fake achievements or fake experience.

If the CV is already strong, still return only useful minor
improvements.

Never return "No information found".

==================================================
ATS ISSUES
==================================================

Only report genuine issues visible in the CV.

Do NOT report:

missing contact information when contact information exists.

missing education when education exists.

missing languages when languages exist.

missing dates when dates exist.

missing skills when skills exist.

If work responsibilities are very short, that is a valid issue.

If there are no significant issues, return:

[
  "No significant ATS issues identified"
]

==================================================
PRELIMINARY SCORE
==================================================

You may provide an approximate preliminary atsScore.

IMPORTANT:

The application will NOT use this value as the final ATS score.

The final score is calculated separately by the application.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

No markdown.

No explanation outside JSON.

Use exactly:

{
  "atsScore": 0,
  "summary": "",
  "skills": [],
  "experience": [
    {
      "title": "",
      "company": "",
      "location": "",
      "dates": "",
      "description": ""
    }
  ],
  "education": [],
  "languages": [],
  "strengths": [],
  "cvImprovements": [],
  "atsIssues": []
}

==================================================
FINAL CHECK
==================================================

Before returning:

1. Read the entire CV.
2. Extract education from the entire CV.
3. Do not classify ordinary skills as education.
4. Extract every language.
5. Preserve language proficiency.
6. Extract all skills.
7. Extract all work experience.
8. Do not invent information.
9. Do not turn dates into strengths.
10. Do not create false ATS issues.
11. Do not unnecessarily use the candidate's name.
12. Return valid JSON only.

==================================================
CV START
==================================================

${cvText}

==================================================
CV END
==================================================
`;

      let response: Response;

      try {
        response =
          await fetch(
            "http://localhost:11434/api/generate",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                model:
                  "qwen2.5-coder:3b",
                prompt,
                stream: false,
                options: {
                  temperature: 0.1,
                },
              }),
            }
          );
      } catch {
        throw new Error(
          "Cannot connect to Ollama. Make sure Ollama is running on your computer."
        );
      }

      if (!response.ok) {
        throw new Error(
          `Ollama request failed: ${response.status}`
        );
      }

      let ollamaResult: {
        response?: string;
      };

      try {
        ollamaResult =
          (await response.json()) as {
            response?: string;
          };
      } catch {
        throw new Error(
          "Ollama returned an invalid response."
        );
      }

      const raw =
        ollamaResult.response
          ?.trim() || "";

      if (!raw) {
        throw new Error(
          "AI returned an empty response. Please try again."
        );
      }

      let parsed: Record<
        string,
        unknown
      >;

      try {
        parsed =
          parseJsonResponse(raw);
      } catch {
        throw new Error(
          "AI could not analyze this CV correctly. Please try again."
        );
      }

      /* =====================================================
         NORMALIZE AI RESULT
      ===================================================== */

      const aiSummary =
        cleanString(
          parsed.summary
        );

      const summary =
        cleanSummary(
          aiSummary,
          cvText
        );

      const skills =
        removeInvalidMessages(
          cleanStringArray(
            parsed.skills
          )
        );

      const experience =
        cleanExperience(
          parsed.experience
        );

      /*
       * Education:
       * Always use AI first, then fallback.
       */
      let education =
        removeInvalidMessages(
          cleanStringArray(
            parsed.education
          )
        );

      /*
       * Remove obvious skill-only values.
       */
      education =
        education.filter(
          (item) =>
            !/^(tally\s*prime|quickbooks|advanced\s*ms\s*excel|ms\s*excel|ms\s*word|word|powerpoint|gcc\s*vat|gcc\s*vat\s*concept|accounting software|office administration)$/i.test(
              item.trim()
            )
        );

      /*
       * If AI extraction is bad,
       * use deterministic extraction.
       */
      const fallbackEducation =
        extractEducationFromCv(
          cvText
        );

      if (
        education.length === 0 ||
        education.some(
          (item) =>
            item.length > 180
        )
      ) {
        education =
          fallbackEducation;
      }

      /*
       * Language extraction.
       */
      let languages =
        removeInvalidMessages(
          cleanStringArray(
            parsed.languages
          )
        );

      const fallbackLanguages =
        extractLanguagesFromCv(
          cvText
        );

      if (
        languages.length === 0
      ) {
        languages =
          fallbackLanguages;
      }

      /*
       * Clean language values and prevent
       * giant CV text from becoming a language.
       */
      languages =
        uniqueStrings(
          languages
            .filter(
              (item) =>
                item.length <= 100
            )
            .map((item) =>
              item.trim()
            )
        );

      /*
       * Strengths.
       */
      const aiStrengths =
        cleanStringArray(
          parsed.strengths
        );

      const strengths =
        ensureStrengths(
          aiStrengths,
          {
            skills,
            experience,
            education,
          }
        );

      /*
       * Improvements.
       */
      const aiImprovements =
        cleanStringArray(
          parsed.cvImprovements
        );

      const cvImprovements =
        ensureImprovements(
          aiImprovements,
          {
            experience,
            education,
            languages,
          }
        );

      /*
       * ATS issues.
       */
      const aiAtsIssues =
        cleanStringArray(
          parsed.atsIssues
        );

      const atsIssues =
        buildAtsIssues(
          aiAtsIssues,
          {
            summary,
            skills,
            experience,
            education,
            languages,
          }
        );

      /* =====================================================
         FINAL DETERMINISTIC ATS SCORE
      ===================================================== */

      /*
       * IMPORTANT:
       *
       * parsed.atsScore is deliberately ignored.
       *
       * Only the deterministic calculation is used.
       */
      const finalAtsScore =
        calculateAtsScore(
          cvText,
          {
            summary,
            skills,
            experience,
            education,
            languages,
          }
        );

      const finalResult:
        CvOnlyResult = {
        atsScore:
          finalAtsScore,

        summary,

        skills,

        experience,

        education,

        languages,

        strengths,

        cvImprovements,

        atsIssues,
      };

      return {
        success: true,
        result: finalResult,
      };
    }
  );