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
  sourceText: z.string().min(10).max(12000),
  sectionLabel: z.string().min(2).max(120),
  currentText: z.string().max(4000),
});

const ResponseSchema = z.object({
  starters: z.array(z.string().min(1)).min(1).max(6),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte einen kurzen Moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
    }

    const { sourceText, sectionLabel, currentText } = parsed.data;

    const systemInstruction = `Du bist ein freundlicher KI-Schreibassistent für österreichische Schüler:innen der 6. Schulstufe (11-12 Jahre).
Generiere für die aktuelle Stelle genau 4 abwechslungsreiche, spannende und inhaltlich zur Sage passende Satzanfänge im Präteritum (je 2-5 Wörter lang).
Verwende kindgerechte, einfache Sprache ohne Fremdwörter.
Antworte ausschließlich als JSON-Objekt mit dem Feld "starters" (Array aus genau 4 Strings).`;

    const userPrompt = `Original-Sage:\n"${sourceText.slice(0, 2200)}"\n\nAktueller Abschnitt: ${sectionLabel}\n\nBisheriger Text des Kindes:\n"${currentText}"\n\nGeneriere 4 passende Satzanfänge:`;

    const raw = await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      systemInstruction,
      input: userPrompt,
      apiKey: getRequestApiKey(request),
      responseFormat: {
        type: "object",
        properties: {
          starters: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["starters"],
      },
    });

    const json = JSON.parse(extractJsonString(raw));
    const validated = ResponseSchema.parse(
      Array.isArray(json) ? { starters: json } : json
    );

    return NextResponse.json({ starters: validated.starters.slice(0, 4) });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Satzanfänge konnten gerade nicht erstellt werden." },
      { status: 500 }
    );
  }
}
