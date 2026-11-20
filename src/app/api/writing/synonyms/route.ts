import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FAST_WRITING_MODEL,
  GeminiConfigError,
  checkRateLimit,
  extractJsonString,
  getRequestApiKey,
  runStatelessTextInteraction,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const RequestSchema = z.object({
  word: z.string().min(1).max(60),
  wordType: z.enum(["verb", "adjective"]),
  contextText: z.string().max(4000),
});

const ResponseSchema = z.object({
  alternatives: z.array(z.string().min(1)).min(1).max(6),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const { word, wordType, contextText } = parsed.data;

    const systemInstruction = `Du bist ein altersgerechter Synonym-Coach für 11-12-jährige Schüler:innen in Österreich.
Finde für das gesuchte ${wordType === "verb" ? "Verb" : "Adjektiv"} genau 4 passende, ausdrucksstarke, aber leicht verständliche Synonyme in derselben grammatikalischen Form (z. B. Präteritum bzw. passende Endung), sodass man das Wort direkt im Satz austauschen kann.
Antworte ausschließlich als JSON-Objekt mit "alternatives" (Array mit 4 Strings).`;

    const userPrompt = `Satzkontext:\n"${contextText.slice(0, 1500)}"\n\nZu ersetzendes Wort: "${word}"\n\nLiefere 4 passende Synonyme:`;

    const raw = await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      systemInstruction,
      input: userPrompt,
      apiKey: getRequestApiKey(request),
      responseFormat: {
        type: "object",
        properties: {
          alternatives: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["alternatives"],
      },
    });

    const json = JSON.parse(extractJsonString(raw));
    const validated = ResponseSchema.parse(
      Array.isArray(json) ? { alternatives: json } : json
    );

    return NextResponse.json({ alternatives: validated.alternatives.slice(0, 4) });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Keine Synonyme gefunden." },
      { status: 500 }
    );
  }
}
