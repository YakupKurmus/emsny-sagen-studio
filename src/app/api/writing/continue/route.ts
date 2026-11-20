import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FAST_WRITING_MODEL,
  GeminiConfigError,
  checkRateLimit,
  getRequestApiKey,
  runStatelessTextInteraction,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const RequestSchema = z.object({
  sourceText: z.string().min(10).max(12000),
  sectionLabel: z.string().min(2).max(120),
  currentText: z.string().max(4000),
  previousSuggestion: z.string().max(500).optional(),
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

    const { sourceText, sectionLabel, currentText, previousSuggestion } = parsed.data;

    const systemInstruction = `Du bist ein KI-Schreibassistent für österreichische Schüler:innen der 6. Schulstufe (11-12 Jahre).
Beende den begonnenen Satz sinnvoll im Präteritum ODER schlage genau 1 kurzen, spannenden nächsten Satz in eigenen, kindgerechten Worten vor.
Vermeide Schachtelsätze, wörtliches Abschreiben aus dem Original und schwierige Fremdwörter.
Antworte ausschließlich mit dem reinen Fortsetzungstext ohne Einleitung und ohne Anführungszeichen.`;

    const altHint = previousSuggestion
      ? `\n\nWICHTIG: Der letzte Vorschlag ("${previousSuggestion}") wurde abgelehnt. Mache eine deutlich andere, frische Fortsetzung!`
      : "";

    const userPrompt = `Original-Sage:\n"${sourceText.slice(0, 2200)}"\n\nAktueller Abschnitt: ${sectionLabel}\n\nBisheriger Text:\n"${currentText}"${altHint}\n\nDirekte Text-Fortsetzung (maximal 1 kurzer Satz):`;

    const suggestion = await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      systemInstruction,
      input: userPrompt,
      apiKey: getRequestApiKey(request),
    });

    return NextResponse.json({
      suggestion: suggestion.replace(/^["„]+|["“]+$/g, "").trim(),
    });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Kein Schreibvorschlag verfügbar." },
      { status: 500 }
    );
  }
}
