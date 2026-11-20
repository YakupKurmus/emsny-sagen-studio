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

const SectionEnum = z.enum(["einfuehrung", "thema", "wende", "bleibendes"]);

const RequestSchema = z.object({
  sagaTitle: z.string().min(1).max(200),
  sourceText: z.string().min(10).max(16000),
  sections: z.object({
    einfuehrung: z.string().max(4000),
    thema: z.string().max(4000),
    wende: z.string().max(4000),
    bleibendes: z.string().max(4000),
  }),
});

const AnalysisResponseSchema = z.object({
  errors: z
    .array(
      z.object({
        section: SectionEnum,
        wrong: z.string().min(1),
        correction: z.string().min(1),
        explanation: z.string().min(1),
        category: z
          .enum(["rechtschreibung", "grammatik", "zeitform", "satzbau"])
          .optional(),
      })
    )
    .default([]),
  verbs: z
    .array(
      z.object({
        section: SectionEnum,
        word: z.string().min(1),
      })
    )
    .default([]),
  adjectives: z
    .array(
      z.object({
        section: SectionEnum,
        word: z.string().min(1),
      })
    )
    .default([]),
  styleTips: z.array(z.string()).default([]),
  factCheck: z.object({
    status: z.enum(["super", "gut", "ausbaufähig"]).catch("gut"),
    score: z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n)))),
    summary: z.string().default("Deine Nacherzählung wurde geprüft."),
    missingDetails: z.array(z.string()).default([]),
    originalityNote: z.string().default("Gut in eigenen Worten erzählt."),
    checklistAssessment: z
      .object({
        placeAndTime: z.boolean().default(false),
        secretOrConflict: z.boolean().default(false),
        supernatural: z.boolean().default(false),
        moralOrMemory: z.boolean().default(false),
      })
      .default({
        placeAndTime: false,
        secretOrConflict: false,
        supernatural: false,
        moralOrMemory: false,
      }),
  }),
});

interface CachedAnalysis {
  data: z.infer<typeof AnalysisResponseSchema>;
  expiresAt: number;
}

const ANALYSIS_CACHE_TTL_MS = 10 * 60 * 1000;
const ANALYSIS_CACHE_MAX = 60;
const analysisCache = new Map<string, CachedAnalysis>();

function makeAnalysisCacheKey(sagaTitle: string, sections: Record<string, string>): string {
  const payload = `${sagaTitle}\u0000${sections.einfuehrung}\u0000${sections.thema}\u0000${sections.wende}\u0000${sections.bleibendes}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}-${payload.length}`;
}

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Prüfungen in kurzer Zeit. Bitte warte eine Minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Textdaten." }, { status: 400 });
    }

    const { sagaTitle, sourceText, sections } = parsed.data;
    const hasAnyText = Object.values(sections).some((v) => v.trim().length > 0);
    if (!hasAnyText) {
      return NextResponse.json(
        { error: "Bitte schreibe zuerst mindestens einen Abschnitt deiner Nacherzählung." },
        { status: 400 }
      );
    }

    const cacheKey = makeAnalysisCacheKey(sagaTitle, sections);
    const cached = analysisCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data, { headers: { "X-Analysis-Cache": "hit" } });
    }

    const systemInstruction = `Du bist eine freundliche, genaue Deutschlehrkraft (6. Schulstufe AHS, Österreich).
Prüfe die Nacherzählung kurz, kindgerecht und präzise gegen die Original-Sage:
1. "errors": Rechtschreibung, Grammatik, Satzbau & Erzählzeit (Präteritum -> category "zeitform"). WICHTIG: "wrong" muss EXAKT so als Wort oder kurze Wortgruppe im jeweiligen Abschnitt stehen.
2. "verbs" & "adjectives": Bis zu 10 wichtige Verben und 10 Adjektive aus dem Schülertext (EXAKT wie im Text geschrieben).
3. "styleTips": Maximal 3 kurze, ermutigende Tipps (z. B. Wortwiederholungen, Präteritum).
4. "factCheck": Abgleich gegen das Original:
   - "status": "super" (>=80), "gut" (50-79) oder "ausbaufähig" (<50)
   - "score": Zahl 0-100
   - "summary": 1-2 motivierende Sätze
   - "missingDetails": bis zu 3 wichtige fehlende Handlungspunkte
   - "originalityNote": 1 Satz, ob in eigenen Worten erzählt wurde
   - "checklistAssessment": prüft Ort/Zeit, Geheimnis/Konflikt, Übernatürliches, Lehre/Erinnerung.
Antworte ausschließlich als kompaktes JSON gemäß Schema.`;

    const nonEmptySections = Object.fromEntries(
      Object.entries(sections).filter(([, v]) => v.trim().length > 0)
    );

    const userPrompt = `Original-Sage "${sagaTitle}":\n"""\n${sourceText.slice(0, 3500)}\n"""\n\nSchülertext nach Abschnitten:\n${JSON.stringify(nonEmptySections)}`;

    const raw = await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      thinkingLevel: "minimal",
      systemInstruction,
      input: userPrompt,
      apiKey: getRequestApiKey(request),
      responseFormat: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", enum: ["einfuehrung", "thema", "wende", "bleibendes"] },
                wrong: { type: "string" },
                correction: { type: "string" },
                explanation: { type: "string" },
                category: {
                  type: "string",
                  enum: ["rechtschreibung", "grammatik", "zeitform", "satzbau"],
                },
              },
              required: ["section", "wrong", "correction", "explanation"],
            },
          },
          verbs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", enum: ["einfuehrung", "thema", "wende", "bleibendes"] },
                word: { type: "string" },
              },
              required: ["section", "word"],
            },
          },
          adjectives: {
            type: "array",
            items: {
              type: "object",
              properties: {
                section: { type: "string", enum: ["einfuehrung", "thema", "wende", "bleibendes"] },
                word: { type: "string" },
              },
              required: ["section", "word"],
            },
          },
          styleTips: { type: "array", items: { type: "string" } },
          factCheck: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["super", "gut", "ausbaufähig"] },
              score: { type: "number" },
              summary: { type: "string" },
              missingDetails: { type: "array", items: { type: "string" } },
              originalityNote: { type: "string" },
              checklistAssessment: {
                type: "object",
                properties: {
                  placeAndTime: { type: "boolean" },
                  secretOrConflict: { type: "boolean" },
                  supernatural: { type: "boolean" },
                  moralOrMemory: { type: "boolean" },
                },
                required: ["placeAndTime", "secretOrConflict", "supernatural", "moralOrMemory"],
              },
            },
            required: [
              "status",
              "score",
              "summary",
              "missingDetails",
              "originalityNote",
              "checklistAssessment",
            ],
          },
        },
        required: ["errors", "verbs", "adjectives", "styleTips", "factCheck"],
      },
    });

    const parsedOutput = AnalysisResponseSchema.parse(JSON.parse(extractJsonString(raw)));
    if (analysisCache.size >= ANALYSIS_CACHE_MAX) {
      const oldestKey = analysisCache.keys().next().value;
      if (oldestKey !== undefined) analysisCache.delete(oldestKey);
    }
    analysisCache.set(cacheKey, {
      data: parsedOutput,
      expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
    });
    return NextResponse.json(parsedOutput);
  } catch (err) {
    console.error("[/api/writing/analyze] Error:", err);
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const detail = err instanceof Error ? err.message.replace(/AIza[A-Za-z0-9_-]{10,}/g, "[key]") : "";
    return NextResponse.json(
      {
        error: detail
          ? `Die Textprüfung konnte nicht abgeschlossen werden: ${detail.slice(0, 140)}`
          : "Die KI-Analyse konnte gerade nicht abgeschlossen werden.",
      },
      { status: 500 }
    );
  }
}
