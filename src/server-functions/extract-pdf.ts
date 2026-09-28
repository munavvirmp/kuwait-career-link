import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractText } from "unpdf";

export const extractPdfText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
      data,
    }: {
      context: any;
      data: { pdfBase64: string };
    }) => {
      if (!data.pdfBase64) {
        throw new Error("PDF file is required");
      }

      const base64 = data.pdfBase64.replace(
        /^data:application\/pdf;base64,/,
        ""
      );

      const MAX_PDF_BYTES = 10 * 1024 * 1024;
      const MAX_PDF_TEXT_LENGTH = 100_000;

      const base64Length = base64.length;
      const padding = base64.endsWith("==")
        ? 2
        : base64.endsWith("=")
          ? 1
          : 0;
      const decodedSize = Math.floor(
        (base64Length * 3) / 4
      ) - padding;

      if (decodedSize > MAX_PDF_BYTES) {
        throw new Error("PDF file is too large.");
      }

      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        throw new Error("Invalid PDF data.");
      }

      const binary = Uint8Array.from(
        Buffer.from(base64, "base64")
      );

      if (binary.length > MAX_PDF_BYTES) {
        throw new Error("PDF file is too large.");
      }

      const { data: allowed, error: rateLimitError } =
        await context.supabase.rpc("check_ai_rate_limit", {
          _endpoint: "extract-pdf",
        });

      if (rateLimitError) {
        console.error("AI rate-limit check failed:", rateLimitError);
        throw new Error(
          `AI rate-limit check failed: ${rateLimitError.message ?? "Unknown error"}`
        );
      }

      if (!allowed) {
        throw new Error("AI rate limit exceeded. Please try again later.");
      }

      const { text, totalPages } = await extractText(binary);
      const extractedText = text.join("\n").trim();

      if (extractedText.length > MAX_PDF_TEXT_LENGTH) {
        throw new Error("Extracted PDF text is too large.");
      }

      return {
        success: true,
        text: extractedText,
        pages: totalPages,
      };
    }
  );