import { NextResponse } from "next/server";
import type { Interactions } from "@google/genai";
import { z } from "zod";
import {
  ANALYSIS_MODEL,
  GeminiConfigError,
  checkRateLimit,
  extractJsonString,
  getRequestApiKey,
  runStatelessTextInteraction,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

const RequestSchema = z.object({
  fileName: z.string().max(160).optional(),
  mimeType: z.string().min(3).max(120),
  base64Data: z.string().max(12_000_000).optional(),
  plainText: z.string().max(30_000).optional(),
});

const ExtractedSagaSchema = z.object({
  title: z.string().min(2),
  region: z.string().min(2),
  summary: z.string().min(10),
  historicalContext: z.string().min(10),
  sections: z
    .array(
      z.object({
        heading: z.string().min(2),
        text: z.string().min(10),
      })
    )
    .min(1)
    .max(4),
  glossary: z
    .array(
      z.object({
        term: z.string().min(1),
        explanation: z.string().min(2),
      })
    )
    .default([]),
  comprehensionTasks: z
    .array(
      z.object({
        title: z.string().min(1),
        question: z.string().min(3),
        sampleAnswer: z.string().min(2),
      })
    )
    .default([]),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Uploads in kurzer Zeit. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Upload-Daten." }, { status: 400 });
    }

    const { mimeType, base64Data, plainText, fileName } = parsed.data;
    if (!plainText && !base64Data) {
      return NextResponse.json({ error: "Kein Dateiinhalt empfangen." }, { status: 400 });
    }

    const systemInstruction = `Du bist ein Redakteur für österreichische Schul-Sagen (6. Schulstufe AHS, B2-Niveau).
Extrahiere den deutschen Sagentext aus dem Dokument/Bild/Text und gliedere ihn sauber in die 4 klassischen Sagen-Aufbausteine:
- "1. Die Einführung: ..."
- "2. Das Thema: ..."
- "3. Die Wende: ..."
- "4. Das Bleibende: ..."
Falls im Material bereits ein Glossar oder Verständnisaufgaben stehen, übernimm sie. Falls nicht, erstelle 4-6 hilfreiche B2-Glossareinträge und 2-3 Verständnisfragen mit Musterlösung.
Antworte ausschließlich als JSON-Objekt gemäß Schema.`;

    const contentParts: Interactions.Content[] = [
      {
        type: "text",
        text: plainText
          ? `Strukturiere folgenden Sagentext (${fileName ?? "Eigene Sage"}):\n\n${plainText}`
          : `Lies den gesamten deutschen Text aus dieser Datei (${fileName ?? "Upload"}) aus und strukturiere ihn als Sage mit 4 Aufbausteinen, Glossar und Aufgaben.`,
      },
    ];

    if (base64Data) {
      if (mimeType.startsWith("image/")) {
        contentParts.push({
          type: "image",
          mime_type: mimeType,
          data: base64Data,
        });
      } else {
        contentParts.push({
          type: "document",
          mime_type: mimeType,
          data: base64Data,
        });
      }
    }

    const raw = await runStatelessTextInteraction({
      model: ANALYSIS_MODEL,
      systemInstruction,
      apiKey: getRequestApiKey(request),
      input: [
        {
          type: "user_input",
          content: contentParts,
        },
      ],
      responseFormat: {
        type: "object",
        properties: {
          title: { type: "string" },
          region: { type: "string" },
          summary: { type: "string" },
          historicalContext: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                text: { type: "string" },
              },
              required: ["heading", "text"],
            },
          },
          glossary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                term: { type: "string" },
                explanation: { type: "string" },
              },
              required: ["term", "explanation"],
            },
          },
          comprehensionTasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                question: { type: "string" },
                sampleAnswer: { type: "string" },
              },
              required: ["title", "question", "sampleAnswer"],
            },
          },
        },
        required: [
          "title",
          "region",
          "summary",
          "historicalContext",
          "sections",
          "glossary",
          "comprehensionTasks",
        ],
      },
    });

    const extracted = ExtractedSagaSchema.parse(JSON.parse(extractJsonString(raw)));
    const fullWordCount = extracted.sections
      .map((s) => s.text)
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return NextResponse.json({
      saga: {
        id: `upload-${Date.now()}`,
        title: extracted.title,
        subtitle: "Eigene hochgeladene Sage • B2-Aufbereitung",
        category: "Ortssagen",
        secondaryCategories: ["Eigene Sage"],
        region: extracted.region,
        readingTimeMin: Math.max(1, Math.ceil(fullWordCount / 130)),
        wordCount: fullWordCount,
        summary: extracted.summary,
        historicalContext: extracted.historicalContext,
        sections: extracted.sections,
        glossary: extracted.glossary,
        comprehensionTasks: extracted.comprehensionTasks,
      },
    });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Die Datei konnte leider nicht ausgewertet werden." },
      { status: 500 }
    );
  }
}
