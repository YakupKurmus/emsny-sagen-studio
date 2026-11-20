import { NextResponse } from "next/server";
import type { Interactions } from "@google/genai";
import { z } from "zod";
import { applySpokenPunctuationCommands } from "@/lib/dictation-utils";
import {
  ANALYSIS_MODEL,
  GeminiConfigError,
  checkRateLimit,
  getGeminiClient,
  getRequestApiKey,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const TRANSCRIBE_MODEL = "gemini-3.5-transcribe";

const RequestSchema = z.object({
  audioBase64: z.string().min(50).max(20_000_000),
  mimeType: z.string().min(3).max(120),
  language: z.string().min(2).max(20).optional(),
  customVocabulary: z.array(z.string().min(1).max(60)).max(40).optional(),
  contextHint: z.string().max(300).optional(),
});

function normalizeAudioMimeType(rawMime: string): string {
  const base = rawMime.split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "audio/mp4" || base === "audio/x-m4a") return "audio/m4a";
  if (base === "audio/wave" || base === "audio/x-wav") return "audio/wav";
  return base;
}

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Aufnahmen in kurzer Zeit. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Audiodaten." }, { status: 400 });
    }

    const { audioBase64, mimeType, language, customVocabulary, contextHint } = parsed.data;
    const cleanMime = normalizeAudioMimeType(mimeType);
    const apiKey = getRequestApiKey(request);
    const ai = getGeminiClient(apiKey);

    const langCodes = language ? [language, "de-AT", "de-DE"] : ["de-AT", "de-DE"];
    const uniqueLangs = Array.from(new Set(langCodes));

    const audioPart: Interactions.Content = {
      type: "audio",
      mime_type: cleanMime,
      data: audioBase64,
    };

    // 1. Primär: spezialisiertes Gemini 3.5 Transcribe Modell im Smart-Modus (mit Satzzeichen & Sagen-Vokabular)
    try {
      const interaction = await ai.interactions.create({
        model: TRANSCRIBE_MODEL,
        store: false,
        input: [
          {
            type: "user_input",
            content: [audioPart],
          },
        ],
        generation_config: {
          transcription_config: {
            mode: "smart",
            language_codes: uniqueLangs,
            ...(customVocabulary && customVocabulary.length > 0
              ? { custom_vocabulary: customVocabulary }
              : {}),
          },
        },
      });

      const rawTranscript = interaction.output_text?.trim() ?? "";
      if (rawTranscript) {
        return NextResponse.json({
          transcript: applySpokenPunctuationCommands(rawTranscript),
          provider: TRANSCRIBE_MODEL,
        });
      }
    } catch {
      // Fallback auf multimodales Gemini-Modell, falls gemini-3.5-transcribe für diesen Key/MimeType fehlschlägt
    }

    // 2. Fallback: Multimodale Audio-Transkription mit gemini-4-hydrogen
    const vocabHint =
      customVocabulary && customVocabulary.length > 0
        ? ` Wichtige mögliche Eigennamen und Begriffe aus der Sage: ${customVocabulary.join(", ")}.`
        : "";
    const extraHint = contextHint ? ` Thema: ${contextHint}.` : "";

    const fallback = await ai.interactions.create({
      model: ANALYSIS_MODEL,
      store: false,
      system_instruction:
        "Du bist ein strikt wortgetreuer Transkriptions-Assistent für österreichisches/deutsches Deutsch. Schreibe WIRKLICH NUR das, was gesprochen wurde – erfinde nichts dazu und formuliere nicht um. Wandle gesprochene Diktierbefehle (Punkt, Beistrich/Komma, Fragezeichen, Rufzeichen, Doppelpunkt, neue Zeile, neuer Absatz) in die entsprechenden Zeichen/Umbrüche um und ergänze fehlende deutsche Satzzeichen und Groß-/Kleinschreibung. Gib AUSSCHLIESSLICH den Text zurück.",
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: `Transkribiere diese Sprachaufnahme streng wortgetreu auf Deutsch (${uniqueLangs[0]}).${extraHint}${vocabHint}`,
            },
            audioPart,
          ],
        },
      ],
    });

    const fallbackText = fallback.output_text?.trim().replace(/^["„]+|["“]+$/g, "") ?? "";
    return NextResponse.json({
      transcript: applySpokenPunctuationCommands(fallbackText),
      provider: ANALYSIS_MODEL,
    });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Die Sprachaufnahme konnte nicht transkribiert werden." },
      { status: 500 }
    );
  }
}
