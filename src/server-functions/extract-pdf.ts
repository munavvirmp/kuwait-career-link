import { createServerFn } from "@tanstack/react-start";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
    }).promise;

    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      text += pageText + "\n";
    }

    return {
      success: true,
      text: text.trim(),
      pages: pdf.numPages,
    };
  }
);