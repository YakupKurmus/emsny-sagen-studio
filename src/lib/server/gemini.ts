import { GoogleGenAI, type Interactions } from "@google/genai";

export const FAST_WRITING_MODEL = "gemini-3.5-flash-lite";
export const ANALYSIS_MODEL = "gemini-4-hydrogen";

interface RateBucket {
  count: number;
  resetAt: number;
}

const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 35;
const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(request: Request): { ok: true } | { ok: false; retryAfterSec: number } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const existing = rateBuckets.get(ip);

  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (rateBuckets.size > 500) {
      for (const [key, bucket] of rateBuckets.entries()) {
        if (now >= bucket.resetAt) rateBuckets.delete(key);
      }
    }
    return { ok: true };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { ok: true };
}

export function getRequestApiKey(request: Request): string | undefined {
  const headerKey = request.headers.get("x-gemini-api-key")?.trim();
  return headerKey || undefined;
}

export function hasServerApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiClient(overrideKey?: string): GoogleGenAI {
  const apiKey = overrideKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      "Kein Gemini API-Key hinterlegt. Bitte gib deinen API-Key oben im Menü ein (oder setze GEMINI_API_KEY in .env.local)."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export async function runStatelessTextInteraction({
  model,
  systemInstruction,
  input,
  responseFormat,
  apiKey,
  thinkingLevel = "minimal",
}: {
  model: string;
  systemInstruction: string;
  input: string | Interactions.Step[];
  responseFormat?: Record<string, unknown>;
  apiKey?: string;
  thinkingLevel?: GeminiThinkingLevel;
}): Promise<string> {
  const ai = getGeminiClient(apiKey);

  const interaction = await ai.interactions.create({
    model,
    store: false,
    system_instruction: systemInstruction,
    input,
    generation_config: {
      thinking_level: thinkingLevel,
    },
    ...(responseFormat ? { response_format: responseFormat } : {}),
  });

  const text = interaction.output_text?.trim();
  if (!text) {
    throw new Error("Das KI-Modell hat keine Textantwort geliefert.");
  }
  return text;
}
