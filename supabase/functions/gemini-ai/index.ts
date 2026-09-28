import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    try {
      if (!GEMINI_API_KEY) {
        return Response.json(
          { error: "GEMINI_API_KEY is not configured" },
          { status: 500 }
        );
      }

      const body = await req.json();
      const prompt = body?.prompt;

      if (typeof prompt !== "string" || prompt.trim().length === 0) {
        return Response.json(
          { error: "Prompt is required" },
          { status: 400 }
        );
      }

      if (prompt.length > 120000) {
        return Response.json(
          { error: "Prompt is too large" },
          { status: 400 }
        );
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", response.status);
        return Response.json(
          { error: "Gemini API request failed" },
          { status: 502 }
        );
      }

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? "")
          .join("") ?? "";

      return Response.json({
        success: true,
        result: text,
        userId: ctx.userClaims?.sub,
      });
    } catch (error) {
      console.error("Gemini function error:", error);

      return Response.json(
        { error: "AI processing failed" },
        { status: 500 }
      );
    }
  }),
};
