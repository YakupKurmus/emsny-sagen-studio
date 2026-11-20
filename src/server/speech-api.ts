import type { IncomingMessage, ServerResponse } from "node:http";
import { SPEECH_MODEL, SPEECH_MODEL_FALLBACK, resolveVoice } from "@/lib/google-voices";

interface CachedSpeechEntry {
  bytes: Uint8Array;
  mimeType: string;
  provider: string;
  voiceHeader: string;
}

const MAX_CACHE_ENTRIES = 120;
const CLOUD_TTS_SKIP_TTL_MS = 30 * 60 * 1000;
const speechCache = new Map<string, CachedSpeechEntry>();
const cloudTtsSkipMap = new Map<string, number>();

function hashKeyFingerprint(key: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}-${key.length}`;
}

function getCachedSpeech(cacheKey: string): CachedSpeechEntry | null {
  const hit = speechCache.get(cacheKey);
  if (!hit) return null;
  speechCache.delete(cacheKey);
  speechCache.set(cacheKey, hit);
  return hit;
}

function setCachedSpeech(cacheKey: string, entry: CachedSpeechEntry): void {
  if (speechCache.has(cacheKey)) {
    speechCache.delete(cacheKey);
  } else if (speechCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = speechCache.keys().next().value;
    if (oldestKey !== undefined) {
      speechCache.delete(oldestKey);
    }
  }
  speechCache.set(cacheKey, entry);
}

function shouldSkipCloudTts(keyFingerprint: string): boolean {
  const expiresAt = cloudTtsSkipMap.get(keyFingerprint);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    cloudTtsSkipMap.delete(keyFingerprint);
    return false;
  }
  return true;
}

function markCloudTtsUnavailable(keyFingerprint: string): void {
  if (cloudTtsSkipMap.size >= 64) {
    const oldest = cloudTtsSkipMap.keys().next().value;
    if (oldest !== undefined) cloudTtsSkipMap.delete(oldest);
  }
  cloudTtsSkipMap.set(keyFingerprint, Date.now() + CLOUD_TTS_SKIP_TTL_MS);
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizeApiMessage(raw: string): string {
  return raw
    .replace(/AIza[A-Za-z0-9_-]{10,}/g, "[key]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function resolveCloudVoiceTarget(rawVoice?: string): {
  cloudVoiceName: string;
  languageCode: string;
  geminiVoice: string;
} {
  const trimmed = rawVoice?.trim();
  const voice = resolveVoice(trimmed);
  if (trimmed && /^[a-z]{2}-[A-Z]{2}-/.test(trimmed)) {
    const languageCode = trimmed.slice(0, 5);
    const parts = trimmed.split("-Chirp3-HD-");
    const geminiVoice = parts[1] || voice.geminiVoice;
    return { cloudVoiceName: trimmed, languageCode, geminiVoice };
  }
  return {
    cloudVoiceName: voice.cloudTtsVoice,
    languageCode: voice.lang || "de-DE",
    geminiVoice: voice.geminiVoice,
  };
}

interface InteractionsAudioPart {
  type?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
}

interface InteractionsResponsePayload {
  steps?: Array<{
    type?: string;
    content?: InteractionsAudioPart[];
  }>;
  outputs?: InteractionsAudioPart[];
  error?: { message?: string };
}

function extractInteractionsAudio(payload: InteractionsResponsePayload): {
  base64: string;
  mimeType: string;
} | null {
  const candidates: InteractionsAudioPart[] = [];
  for (const step of payload.steps ?? []) {
    for (const item of step.content ?? []) {
      candidates.push(item);
    }
  }
  for (const item of payload.outputs ?? []) {
    candidates.push(item);
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    const item = candidates[i];
    if (item?.type === "audio" && item.data) {
      return {
        base64: item.data,
        mimeType: item.mime_type || item.mimeType || "audio/wav",
      };
    }
  }
  return null;
}

async function callGeminiTtsModel({
  model,
  text,
  geminiVoice,
  apiKey,
  signal,
}: {
  model: string;
  text: string;
  geminiVoice: string;
  apiKey: string;
  signal: AbortSignal;
}): Promise<
  { ok: true; bytes: Uint8Array; mimeType: string } | { ok: false; status: number; message: string }
> {
  const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          type: "user_input",
          content: [{ type: "text", text }],
        },
      ],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [{ voice: geminiVoice }],
      },
    }),
    signal,
  });

  if (geminiRes.ok) {
    const payload = (await geminiRes.json()) as InteractionsResponsePayload;
    const audio = extractInteractionsAudio(payload);
    if (audio) {
      return {
        ok: true,
        bytes: decodeBase64ToBytes(audio.base64),
        mimeType: audio.mimeType,
      };
    }
    return {
      ok: false,
      status: 502,
      message: "Gemini HD TTS lieferte keine Audiodaten zurück.",
    };
  }

  const errBody = (await geminiRes.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return {
    ok: false,
    status: geminiRes.status,
    message: sanitizeApiMessage(errBody?.error?.message ?? `HTTP ${geminiRes.status}`),
  };
}

function buildAudioResponse(
  entry: CachedSpeechEntry,
  extraHeaders?: Record<string, string>,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": entry.mimeType,
    "Cache-Control": "public, max-age=86400",
    "X-TTS-Provider": entry.provider,
    "X-TTS-Voice": entry.voiceHeader,
    ...extraHeaders,
  };
  return new Response(Buffer.from(entry.bytes), {
    status: 200,
    headers,
  });
}

async function synthesizeSpeechStream({
  text,
  rawVoice,
  rate,
  clientKey,
  signal,
}: {
  text: string;
  rawVoice?: string | undefined;
  rate?: number | undefined;
  clientKey?: string | undefined;
  signal: AbortSignal;
}): Promise<Response> {
  const { cloudVoiceName, languageCode, geminiVoice } = resolveCloudVoiceTarget(rawVoice);
  const apiKey =
    clientKey?.trim() || process.env["GOOGLE_CLOUD_TTS_API_KEY"] || process.env["GEMINI_API_KEY"];

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "api_key_required",
        message:
          "Kein Google-API-Key aktiv. Bitte in den Einstellungen einen Google Cloud- oder Gemini-API-Key speichern, um HD-Stimmen abzuspielen.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const keyFp = hashKeyFingerprint(apiKey);
  const rateBucket = typeof rate === "number" && Number.isFinite(rate) ? rate.toFixed(2) : "1.00";
  const skipCloud = shouldSkipCloudTts(keyFp);
  const cacheKey = `${skipCloud ? "gemini" : "auto"}:${cloudVoiceName}:${rateBucket}:${text}`;

  const cached = getCachedSpeech(cacheKey);
  if (cached) {
    return buildAudioResponse(cached, { "X-TTS-Cache": "hit" });
  }

  let cloudFailureStatus = "";
  let cloudFailureMessage = "";

  if (!skipCloud) {
    try {
      const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
      const callCloudTts = async (includeSpeakingRate: boolean) => {
        const audioConfig: Record<string, unknown> = {
          audioEncoding: "MP3",
        };
        if (
          includeSpeakingRate &&
          typeof rate === "number" &&
          Number.isFinite(rate) &&
          rate !== 1 &&
          rate >= 0.25 &&
          rate <= 2.0
        ) {
          audioConfig["speakingRate"] = rate;
        }
        return fetch(ttsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode,
              name: cloudVoiceName,
            },
            audioConfig,
          }),
          signal,
        });
      };

      let cloudRes = await callCloudTts(true);
      if (cloudRes.status === 400 && typeof rate === "number" && rate !== 1) {
        cloudRes = await callCloudTts(false);
      }

      if (cloudRes.ok) {
        const payload = (await cloudRes.json()) as { audioContent?: string };
        if (payload.audioContent) {
          const entry: CachedSpeechEntry = {
            bytes: decodeBase64ToBytes(payload.audioContent),
            mimeType: "audio/mpeg",
            provider: "google-cloud-tts",
            voiceHeader: cloudVoiceName,
          };
          setCachedSpeech(cacheKey, entry);
          return buildAudioResponse(entry);
        }
      } else {
        cloudFailureStatus = String(cloudRes.status);
        const errBody = (await cloudRes.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        cloudFailureMessage = sanitizeApiMessage(
          errBody?.error?.message ?? `HTTP ${cloudRes.status}`,
        );
      }
    } catch (err) {
      if (signal.aborted) return new Response(null, { status: 499 });
      cloudFailureMessage = sanitizeApiMessage(
        err instanceof Error ? err.message : "Cloud TTS Netzwerkfehler",
      );
    }
  }

  let geminiFailureStatus = "";
  let geminiFailureMessage = "";
  try {
    let modelUsed = SPEECH_MODEL;
    let geminiResult = await callGeminiTtsModel({
      model: modelUsed,
      text,
      geminiVoice,
      apiKey,
      signal,
    });

    if (!geminiResult.ok && (geminiResult.status === 404 || geminiResult.status === 400)) {
      modelUsed = SPEECH_MODEL_FALLBACK;
      geminiResult = await callGeminiTtsModel({
        model: modelUsed,
        text,
        geminiVoice,
        apiKey,
        signal,
      });
    }

    if (geminiResult.ok) {
      if (
        cloudFailureStatus === "400" ||
        cloudFailureStatus === "401" ||
        cloudFailureStatus === "403" ||
        cloudFailureStatus === "404"
      ) {
        markCloudTtsUnavailable(keyFp);
      }

      const entry: CachedSpeechEntry = {
        bytes: geminiResult.bytes,
        mimeType: geminiResult.mimeType,
        provider: "gemini-hd-tts",
        voiceHeader: `${modelUsed}:${geminiVoice}`,
      };
      setCachedSpeech(`gemini:${cloudVoiceName}:${rateBucket}:${text}`, entry);
      setCachedSpeech(cacheKey, entry);

      const extra: Record<string, string> = {};
      if (cloudFailureStatus) extra["X-TTS-Cloud-Status"] = cloudFailureStatus;
      if (cloudFailureMessage) extra["X-TTS-Cloud-Error"] = cloudFailureMessage;
      return buildAudioResponse(entry, extra);
    }

    geminiFailureStatus = String(geminiResult.status);
    geminiFailureMessage = geminiResult.message;
  } catch (err) {
    if (signal.aborted) return new Response(null, { status: 499 });
    geminiFailureMessage = sanitizeApiMessage(
      err instanceof Error ? err.message : "Gemini TTS Netzwerkfehler",
    );
  }

  const numericStatus = Number(cloudFailureStatus || geminiFailureStatus);
  const responseStatus =
    numericStatus === 400 || numericStatus === 401 || numericStatus === 403 ? numericStatus : 502;

  return new Response(
    JSON.stringify({
      error: "tts_failed",
      message:
        geminiFailureMessage ||
        cloudFailureMessage ||
        "Google Cloud / Gemini HD TTS konnte mit diesem API-Key keinen Audio-Stream erzeugen.",
    }),
    {
      status: responseStatus,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/** Handles GET and POST /api/speech Web Standard requests. */
export async function handleSpeechRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const text = url.searchParams.get("text")?.trim().slice(0, 4000);
    if (!text) return new Response("Kein Text.", { status: 400 });

    const rawVoice = url.searchParams.get("voice") ?? undefined;
    const rateParam = url.searchParams.get("rate");
    const rate = rateParam ? Number(rateParam) : undefined;

    return synthesizeSpeechStream({
      text,
      rawVoice,
      rate,
      signal: request.signal,
    });
  }

  if (request.method === "POST") {
    const body = (await request.json().catch(() => null)) as {
      text?: string;
      voice?: string;
      rate?: number;
      apiKey?: string;
      geminiKey?: string;
    } | null;

    const text = body?.text?.trim().slice(0, 4000);
    if (!text) return new Response("Kein Text.", { status: 400 });

    const headerKey = request.headers.get("x-gemini-api-key")?.trim() || undefined;
    return synthesizeSpeechStream({
      text,
      rawVoice: body?.voice,
      rate: body?.rate,
      clientKey: body?.apiKey ?? body?.geminiKey ?? headerKey,
      signal: request.signal,
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
}

/** Vite/Connect HTTP middleware adapter for /api/speech. */
export function speechApiMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
): void {
  const reqUrl = req.url ?? "";
  if (!reqUrl.startsWith("/api/speech")) {
    next();
    return;
  }

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const method = (req.method ?? "GET").toUpperCase();
    const host = req.headers.host ?? "localhost";
    const fullUrl = `http://${host}${reqUrl}`;
    const bodyText =
      method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks).toString("utf8");

    const webReq = new Request(fullUrl, {
      method,
      headers: req.headers as HeadersInit,
      ...(bodyText !== undefined ? { body: bodyText } : {}),
      signal: controller.signal,
    });

    handleSpeechRequest(webReq)
      .then(async (webRes) => {
        if (controller.signal.aborted || res.writableEnded) return;
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => res.setHeader(key, value));
        const arr = new Uint8Array(await webRes.arrayBuffer());
        res.end(Buffer.from(arr));
      })
      .catch((err) => {
        if (!res.writableEnded) next(err);
      });
  });
}
