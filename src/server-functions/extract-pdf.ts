import { createServerFn } from "@tanstack/react-start";
import { extractText } from "unpdf";

export const extractPdfText = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { pdfBase64: string } }) => {
    if (!data.pdfBase64) {
      throw new Error("PDF file is required");
    }

    const base64 = data.pdfBase64.replace(
      /^data:application\/pdf;base64,/,
      ""
    );

    const pdfBuffer = Buffer.from(base64, "base64");

    const { text, totalPages } = await extractText(pdfBuffer);

    return {
      success: true,
      text: text.join("\n").trim(),
      pages: totalPages,
    };
  }
);