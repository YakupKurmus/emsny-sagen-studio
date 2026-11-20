import { CLOUD_TTS_KEY_STORAGE, clearGoogleSpeechCache } from "@/lib/google-speech";

export const GEMINI_API_KEY_STORAGE = "emsny-gemini-api-key";
export const API_KEY_CHANGED_EVENT = "emsny-api-key-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyApiKeyChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_KEY_CHANGED_EVENT));
  }
}

export function getStoredApiKey(): string {
  if (!isBrowser()) return "";
  try {
    return (
      window.localStorage.getItem(GEMINI_API_KEY_STORAGE)?.trim() ||
      window.localStorage.getItem(CLOUD_TTS_KEY_STORAGE)?.trim() ||
      window.localStorage.getItem("english-trainer-gemini-key")?.trim() ||
      ""
    );
  } catch {
    return "";
  }
}

export function saveStoredApiKey(rawKey: string): string {
  const cleaned = rawKey.trim();
  if (!isBrowser()) return cleaned;
  try {
    if (!cleaned) {
      clearStoredApiKey();
      return "";
    }
    window.localStorage.setItem(GEMINI_API_KEY_STORAGE, cleaned);
    window.localStorage.setItem(CLOUD_TTS_KEY_STORAGE, cleaned);
    clearGoogleSpeechCache();
    notifyApiKeyChanged();
  } catch {
    // ignore storage errors
  }
  return cleaned;
}

export function clearStoredApiKey(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    window.localStorage.removeItem(CLOUD_TTS_KEY_STORAGE);
    window.localStorage.removeItem("english-trainer-gemini-key");
    clearGoogleSpeechCache();
    notifyApiKeyChanged();
  } catch {
    // ignore storage errors
  }
}

export function maskApiKey(key: string): string {
  const clean = key.trim();
  if (!clean) return "";
  if (clean.length <= 10) {
    return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 6)}••••${clean.slice(-4)}`;
}

export function buildAiRequestHeaders(overrideKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = (overrideKey ?? getStoredApiKey()).trim();
  if (key) {
    headers["x-gemini-api-key"] = key;
  }
  return headers;
}
