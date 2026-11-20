import { NextResponse } from "next/server";
import {
  FAST_WRITING_MODEL,
  GeminiConfigError,
  checkRateLimit,
  getRequestApiKey,
  hasServerApiKey,
  runStatelessTextInteraction,
} from "@/lib/server/gemini";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    serverKeyConfigured: hasServerApiKey(),
  });
}

export async function POST(request: Request) {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Tests in kurzer Zeit. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const apiKey = getRequestApiKey(request);
    await runStatelessTextInteraction({
      model: FAST_WRITING_MODEL,
      systemInstruction: "Antworte ausschließlich mit dem Wort OK.",
      input: "Ping",
      apiKey,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const rawMsg = err instanceof Error ? err.message : "API-Key konnte nicht bestätigt werden.";
    const cleanMsg = rawMsg.replace(/AIza[A-Za-z0-9_-]{10,}/g, "[key]").slice(0, 180);
    return NextResponse.json(
      {
        ok: false,
        error: cleanMsg || "Der API-Key wurde von Google abgelehnt.",
      },
      { status: 401 }
    );
  }
}
