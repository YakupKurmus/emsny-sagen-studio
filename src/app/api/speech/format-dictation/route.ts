import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applySpokenPunctuationCommands,
  isStrictlyVerbatimPolish,
} from "@/lib/dictation-utils";
import {
  FAST_WRITING_MODEL,
  GeminiConfigError,
  checkRateLimit,
  getRequestApiKey,
  runStatelessTextInteraction,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const RequestSchema = z.object({
  rawText: z.string().min(1).max(6000),
  customVocabulary: z.array(z.string().min(1).max(60)).max(40).optional(),
  contextHint: z.string().max(240).optional(),
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
      return NextResponse.json({ error: "Ungültiger Diktat-Text." }, { status: 400 });
    }

    const { rawText, customVocabulary, contextHint } = parsed.data;
    const deterministicFallback = applySpokenPunctuationCommands(rawText);

    const vocabInfo =
      customVocabulary && customVocabulary.length > 0
        ? `\nMögliche Eigennamen/Begriffe aus der Sage (nur korrigieren, wenn phonetisch klar dasselbe gemeint war): ${customVocabulary.join(", ")}.`
        : "";
    const contextInfo = contextHint ? `\nKontext: ${contextHint}` : "";

    const systemInstruction = `Du bist ein strikt wortgetreuer Diktier-Formatierer für österreichisches/deutsches Deutsch (6. Schulstufe).
STRENGE REGELN:
1. Schreibe WIRKLICH NUR das, was diktiert wurde! Erfinde NIEMALS neue Wörter, ergänze KEINE eigenen Satzteile, formuliere NICHT um und lasse KEINE diktierten Wörter weg.
2. Wandle gesprochene Diktierbefehle um:
   - "Punkt" -> . (außer wenn es offensichtlich als Nomen gemeint ist, z. B. "an diesem Punkt")
   - "Beistrich" oder "Komma" -> ,
   - "Fragezeichen" -> ?
   - "Rufzeichen" oder "Ausrufezeichen" -> !
   - "Doppelpunkt" -> :
   - "Strichpunkt" / "Semikolon" -> ;
   - "neue Zeile" / "nächste Zeile" -> echter Zeilenumbruch (\\n)
   - "neuer Absatz" -> doppelter Zeilenumbruch (\\n\\n)
   - "Anführungszeichen auf" / "zu" -> „ / “
3. Füge fehlende deutsche Satzzeichen (Punkt, Beistrich, Fragezeichen, Rufzeichen) und korrekte deutsche Groß-/Kleinschreibung automatisch hinzu.
4. Korrigiere nur offensichtliche Hörfehler bei Eigennamen oder getrennten Zusammensetzungen (z. B. "Wörthersee Mandl" -> "Wörtherseemandl").
5. Antworte AUSSCHLIESSLICH mit dem formatierten Text ohne Einleitung, ohne Erklärungen und ohne umschließende Anführungszeichen.${vocabInfo}${contextInfo}`;

    const aiFormatted = await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      systemInstruction,
      input: rawText,
      apiKey: getRequestApiKey(request),
    });

    const cleaned = aiFormatted.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim();

    // Sicherheitsnetz: Falls das Modell entgegen der Regel etwas hinzudichtet, nutze den strikten lokalen Formatierer
    if (!isStrictlyVerbatimPolish(rawText, cleaned)) {
      return NextResponse.json({
        formattedText: deterministicFallback,
        source: "deterministic-guard",
      });
    }

    return NextResponse.json({
      formattedText: cleaned,
      source: "gemini",
    });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "KI-Diktat-Formatierung vorübergehend nicht erreichbar." },
      { status: 500 }
    );
  }
}
