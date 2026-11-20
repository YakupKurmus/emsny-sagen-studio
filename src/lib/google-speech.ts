import {
  DEFAULT_VOICE,
  VOICE_STORAGE_KEY,
  resolveVoice,
  type ReaderVoice,
} from "./google-voices";

export const CLOUD_TTS_KEY_STORAGE = "sprachtrainer-cloud-tts-key";

let activeAudioElement: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let currentAbortController: AbortController | null = null;

interface CachedAudioResult {
  blob: Blob;
  provider: string;
  voice: string;
  cloudStatus?: string;
  cloudError?: string;
}

const MAX_CLIENT_AUDIO_CACHE = 80;
const audioResultCache = new Map<string, CachedAudioResult>();
const inFlightAudioRequests = new Map<string, Promise<CachedAudioResult>>();

function getCachedAudio(key: string): CachedAudioResult | null {
  const hit = audioResultCache.get(key);
  if (!hit) return null;
  audioResultCache.delete(key);
  audioResultCache.set(key, hit);
  return hit;
}

function setCachedAudio(key: string, value: CachedAudioResult): void {
  if (audioResultCache.has(key)) {
    audioResultCache.delete(key);
  } else if (audioResultCache.size >= MAX_CLIENT_AUDIO_CACHE) {
    const oldest = audioResultCache.keys().next().value;
    if (oldest !== undefined) audioResultCache.delete(oldest);
  }
  audioResultCache.set(key, value);
}

export function clearGoogleSpeechCache(): void {
  audioResultCache.clear();
}

export function readStoredCloudTtsKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (
      localStorage.getItem("emsny-gemini-api-key") ||
      localStorage.getItem(CLOUD_TTS_KEY_STORAGE) ||
      localStorage.getItem("english-trainer-gemini-key") ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export function savedVoice(): string {
  try {
    const v = localStorage.getItem(VOICE_STORAGE_KEY);
    if (v) return resolveVoice(v).id;
  } catch {
    /* optional */
  }
  return DEFAULT_VOICE.id;
}

/**
 * Normalisiert Text und löst Abkürzungen auf, damit die Cloud-TTS-Stimme
 * flüssig und ohne Buchstabier-Pausen liest.
 */
export function prepareTextForFluentSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bSt\.\s*/g, "Sankt ")
    .replace(/\bz\.\s*B\.(?!\w)/gi, "zum Beispiel")
    .replace(/\bd\.\s*h\.(?!\w)/gi, "das heißt")
    .replace(/\bu\.\s*a\.(?!\w)/gi, "unter anderem")
    .replace(/\bu\.\s*[äÄ]\.(?!\w)/gi, "und ähnliche")
    .replace(/\busw\.(?!\w)/gi, "und so weiter")
    .replace(/\betc\.(?!\w)/gi, "et cetera")
    .replace(/\bbzw\.(?!\w)/gi, "beziehungsweise")
    .replace(/\bca\.(?!\w)/gi, "circa")
    .replace(/\bDr\.(?!\w)/g, "Doktor")
    .replace(/\bProf\.(?!\w)/g, "Professor")
    .replace(/\bNr\.(?!\w)/g, "Nummer")
    .replace(/\bsog\.(?!\w)/gi, "sogenannt")
    .replace(/\bbspw\.(?!\w)/gi, "beispielsweise")
    .replace(/\bvgl\.(?!\w)/gi, "vergleiche")
    .replace(/\bincl\.|\binkl\.(?!\w)/gi, "inklusive")
    .replace(/\bevtl\.(?!\w)/gi, "eventuell")
    .replace(/(\d+)\s*v\.\s*Chr\./gi, "$1 vor Christus")
    .replace(/(\d+)\s*n\.\s*Chr\./gi, "$1 nach Christus")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/;\s*/g, ", ")
    .replace(/[„"“”»«]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupActiveAudio(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.removeAttribute("src");
      activeAudioElement.load();
    } catch {
      /* ignore */
    }
    activeAudioElement = null;
  }
  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      /* ignore */
    }
    activeObjectUrl = null;
  }
}

export function stopGoogleSpeech(): void {
  currentAbortController?.abort();
  currentAbortController = null;
  cleanupActiveAudio();
}

export function pauseGoogleSpeech(): boolean {
  if (!activeAudioElement || activeAudioElement.paused) return false;
  try {
    activeAudioElement.pause();
    return true;
  } catch {
    return false;
  }
}

export async function resumeGoogleSpeech(): Promise<boolean> {
  if (!activeAudioElement || !activeAudioElement.paused) return false;
  try {
    await activeAudioElement.play();
    return true;
  } catch {
    return false;
  }
}

export function updateCurrentPlaybackRate(rate: number): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
      if ("preservesPitch" in activeAudioElement) {
        (activeAudioElement as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch =
          true;
      }
    } catch {
      /* ignore */
    }
  }
}

function base64ToAudioBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Ruft den Audio-Stream von der Cloud Text-to-Speech API / Gemini HD TTS (mit Cache & Deduplikation) ab.
 */
async function performCloudTtsFetch(
  clean: string,
  voice: ReaderVoice,
  apiKey: string | undefined,
  signal: AbortSignal
): Promise<CachedAudioResult> {
  // 1. Server-Proxy (/api/speech) -> nutzt Google Cloud TTS oder Gemini Flash-Lite HD TTS (mit API-Key)
  // und liefert direkt einen Audio-Stream (audio/mpeg oder audio/wav).
  // Tempo wird verlustfrei im HTML5 <audio>-Element gesteuert, sodass Cache-Treffer für alle Raten gelten.
  let serverErrorMessage = "";
  let serverStatus = 0;

  try {
    const res = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        voice: voice.cloudTtsVoice,
        rate: 1.0,
        apiKey,
      }),
      signal,
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("audio/")) {
        return {
          blob: await res.blob(),
          provider: res.headers.get("x-tts-provider") ?? "google-cloud-tts",
          voice: res.headers.get("x-tts-voice") ?? voice.cloudTtsVoice,
          ...(res.headers.get("x-tts-cloud-status")
            ? { cloudStatus: res.headers.get("x-tts-cloud-status")! }
            : {}),
          ...(res.headers.get("x-tts-cloud-error")
            ? { cloudError: res.headers.get("x-tts-cloud-error")! }
            : {}),
        };
      }
    } else {
      serverStatus = res.status;
      const errBody = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      serverErrorMessage = errBody?.message ?? "";
      if (res.status === 401 && !apiKey) {
        throw new Error(
          serverErrorMessage ||
            "Kein Google-API-Key gespeichert. Bitte API-Schlüssel für Google Cloud / Gemini HD Stimmen in den Einstellungen hinterlegen."
        );
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(
          serverErrorMessage ||
            "Google Cloud / Gemini HD Text-to-Speech hat die Anfrage abgelehnt."
        );
      }
    }
  } catch (err) {
    if (signal.aborted) throw err;
    if (serverStatus > 0 && serverStatus < 500 && serverStatus !== 404 && serverStatus !== 405 && err instanceof Error) {
      throw err;
    }
  }

  // 2. Direkter Browser-Aufruf der Google Cloud Text-to-Speech API nur bei Netzwerk-/Proxyfehler oder rein statischem Hosting
  if (apiKey && (serverStatus === 0 || serverStatus === 404 || serverStatus === 405 || serverStatus >= 500)) {
    const cloudRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: clean },
          voice: {
            languageCode: voice.lang || "de-DE",
            name: voice.cloudTtsVoice,
          },
          audioConfig: { audioEncoding: "MP3" },
        }),
        signal,
      }
    );

    if (cloudRes.ok) {
      const data = (await cloudRes.json()) as { audioContent?: string };
      if (data.audioContent) {
        return {
          blob: base64ToAudioBlob(data.audioContent, "audio/mpeg"),
          provider: "google-cloud-tts",
          voice: voice.cloudTtsVoice,
        };
      }
    } else if (!serverErrorMessage) {
      const errData = (await cloudRes.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      serverErrorMessage =
        errData?.error?.message ?? `Google Cloud TTS Fehler (HTTP ${cloudRes.status}).`;
    }
  }

  throw new Error(
    serverErrorMessage ||
      "Google Cloud / Gemini HD Text-to-Speech benötigt einen gültigen API-Key."
  );
}

async function waitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

async function fetchCloudTtsAudioResult(
  text: string,
  voice: ReaderVoice,
  _rate: number,
  apiKey: string | undefined,
  signal: AbortSignal
): Promise<CachedAudioResult> {
  const clean = prepareTextForFluentSpeech(text);
  if (!clean) {
    throw new Error("Kein vorlesbarer Text vorhanden.");
  }

  const cacheKey = `${apiKey ? apiKey.slice(-6) : "env"}::${voice.cloudTtsVoice}::${clean}`;
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return cached;
  }

  const existing = inFlightAudioRequests.get(cacheKey);
  if (existing) {
    return waitWithAbort(existing, signal);
  }

  const fetchCtrl = new AbortController();
  const promise = performCloudTtsFetch(clean, voice, apiKey, fetchCtrl.signal)
    .then((result) => {
      setCachedAudio(cacheKey, result);
      return result;
    })
    .finally(() => {
      inFlightAudioRequests.delete(cacheKey);
    });

  inFlightAudioRequests.set(cacheKey, promise);
  return waitWithAbort(promise, signal);
}

/**
 * Lädt den nächsten Satz / Textabschnitt lautlos in den Browser-Cache vor,
 * damit beim Übergang zum nächsten Satz keine Ladepause entsteht.
 */
export function prefetchGoogleSpeech(
  text: string,
  voiceId = savedVoice()
): void {
  if (typeof window === "undefined") return;
  const clean = prepareTextForFluentSpeech(text);
  if (!clean) return;
  const apiKey = readStoredCloudTtsKey();
  if (!apiKey) return;

  const voice = resolveVoice(voiceId);
  const cacheKey = `${apiKey.slice(-6)}::${voice.cloudTtsVoice}::${clean}`;
  if (getCachedAudio(cacheKey) || inFlightAudioRequests.has(cacheKey)) {
    return;
  }

  const ctrl = new AbortController();
  void fetchCloudTtsAudioResult(clean, voice, 1.0, apiKey, ctrl.signal).catch(
    () => undefined
  );
}

async function fetchCloudTtsAudioBlob(
  text: string,
  voice: ReaderVoice,
  rate: number,
  apiKey: string | undefined,
  signal: AbortSignal
): Promise<Blob> {
  const result = await fetchCloudTtsAudioResult(text, voice, rate, apiKey, signal);
  return result.blob;
}

/**
 * Spielt einen Audio-Blob über das HTML5 <audio>-Element ab.
 */
function playBlobWithHtmlAudio(
  blob: Blob,
  rate: number,
  signal: AbortSignal,
  onProgress?: (currentTimeSec: number, durationSec: number) => void
): Promise<void> {
  cleanupActiveAudio();

  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  audio.preload = "auto";
  audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  if ("preservesPitch" in audio) {
    (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
  }

  activeAudioElement = audio;
  activeObjectUrl = objectUrl;

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let rafId: number | null = null;
    let fallbackTimer: number | null = null;

    const emitProgress = () => {
      if (settled || !onProgress) return;
      onProgress(audio.currentTime || 0, audio.duration || 0);
    };

    const stopProgressLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      stopProgressLoop();
      signal.removeEventListener("abort", onAbort);
      audio.removeEventListener("playing", emitProgress);
      audio.removeEventListener("timeupdate", emitProgress);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      if (activeAudioElement === audio) {
        cleanupActiveAudio();
      } else {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* ignore */
        }
      }
      if (err) reject(err);
      else resolve();
    };

    const onEnded = () => finish();
    const onError = () => finish(new Error("HTML5 Audio-Wiedergabe fehlgeschlagen."));
    const onAbort = () => finish(new DOMException("Aborted", "AbortError"));

    if (onProgress) {
      const tickRaf = () => {
        if (settled) return;
        if (!audio.paused && !audio.ended) {
          emitProgress();
        }
        rafId = window.requestAnimationFrame(tickRaf);
      };
      audio.addEventListener("playing", emitProgress);
      audio.addEventListener("timeupdate", emitProgress);
      if (typeof window.requestAnimationFrame === "function") {
        rafId = window.requestAnimationFrame(tickRaf);
      }
      fallbackTimer = window.setInterval(() => {
        if (!audio.paused && !audio.ended) {
          emitProgress();
        }
      }, 250);
    }

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });

    audio.play().catch((err) => {
      if (signal.aborted) finish(new DOMException("Aborted", "AbortError"));
      else finish(err instanceof Error ? err : new Error("Audio konnte nicht gestartet werden."));
    });
  });
}

/**
 * Reine Text-zu-Sprache-Umwandlung im Browser über die Cloud Text-to-Speech API
 * (z. B. de-DE-Chirp3-HD-Aoede oder de-DE-Chirp3-HD-Puck) und Wiedergabe über HTML5 <audio>.
 */
export async function speakGoogle(
  text: string,
  voiceId = savedVoice(),
  signal?: AbortSignal,
  rateOrSlow: number | boolean = 1.0,
  onProgress?: (currentTimeSec: number, durationSec: number) => void
): Promise<void> {
  const rate = typeof rateOrSlow === "boolean" ? (rateOrSlow ? 0.8 : 1.0) : rateOrSlow;
  const clean = text.trim();
  if (!clean) return;

  const voice = resolveVoice(voiceId);
  const controller = new AbortController();
  currentAbortController = controller;

  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    const apiKey = readStoredCloudTtsKey();
    const audioBlob = await fetchCloudTtsAudioBlob(
      clean,
      voice,
      rate,
      apiKey,
      controller.signal
    );
    if (controller.signal.aborted) return;

    await playBlobWithHtmlAudio(audioBlob, rate, controller.signal, onProgress);
  } finally {
    signal?.removeEventListener("abort", onParentAbort);
    if (currentAbortController === controller) {
      currentAbortController = null;
    }
  }
}

export function sayGoogle(text: string, rateOrSlow: number | boolean = 1.0) {
  stopGoogleSpeech();
  const c = new AbortController();
  return speakGoogle(text, savedVoice(), c.signal, rateOrSlow).catch((e) => {
    if (c.signal.aborted) return;
    import("sonner").then(({ toast }) =>
      toast.error(e instanceof Error ? e.message : "Vorlesen fehlgeschlagen.")
    );
  });
}

export async function testCloudTtsStream(
  voiceId = "de-DE-Chirp3-HD-Aoede",
  apiKeyOverride?: string
): Promise<{
  provider: string;
  voice: string;
  cloudStatus?: string;
  cloudError?: string;
}> {
  stopGoogleSpeech();
  const voice = resolveVoice(voiceId);
  const controller = new AbortController();
  currentAbortController = controller;
  try {
    const apiKey = apiKeyOverride?.trim() || readStoredCloudTtsKey();
    const res = await fetchCloudTtsAudioResult(
      "Hallo! Die Cloud Text-to-Speech Stimme ist bereit.",
      voice,
      1.0,
      apiKey,
      controller.signal
    );
    await playBlobWithHtmlAudio(res.blob, 1.0, controller.signal);
    return {
      provider: res.provider,
      voice: res.voice,
      ...(res.cloudStatus ? { cloudStatus: res.cloudStatus } : {}),
      ...(res.cloudError ? { cloudError: res.cloudError } : {}),
    };
  } finally {
    if (currentAbortController === controller) {
      currentAbortController = null;
    }
  }
}

// Abwärtskompatibilitäts-Exporte für ältere Module
export function unlockAudioForSafari(): AudioContext {
  return {} as AudioContext;
}

export function getOrCreateAudioContext(): AudioContext {
  return {} as AudioContext;
}

export function findBestFluentVoice(_voice?: ReaderVoice): SpeechSynthesisVoice | null {
  return null;
}

export async function fetchAndDecodeServerAudio(
  _text?: string,
  _voice?: ReaderVoice,
  _rate?: number,
  _geminiKey?: string,
  _signal?: AbortSignal
): Promise<AudioBuffer | null> {
  return null;
}
