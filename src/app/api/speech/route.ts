import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/gemini";
import { handleSpeechRequest } from "@/server/speech-api";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }
  return handleSpeechRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte kurz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }
  return handleSpeechRequest(request);
}
