import type { Saga } from "@/data/sagen-catalog";
import { loadAllDrafts, loadCustomSagas, mergeLocalData } from "@/lib/local-store";
import type { SagaDraft } from "@/lib/writing-types";

export const CLOUD_SESSION_STORAGE = "emsny-supabase-session-v1";

export interface CloudSession {
  accessToken: string;
  refreshToken?: string;
  email: string;
  userId: string;
  expiresAt?: number;
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isCloudSyncConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getStoredCloudSession(): CloudSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOUD_SESSION_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudSession;
    if (!parsed.accessToken || !parsed.userId) return null;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(CLOUD_SESSION_STORAGE);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function signOutCloudSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLOUD_SESSION_STORAGE);
  } catch {
    // ignore
  }
}

export async function sendCloudMagicLink(email: string): Promise<void> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error("Supabase Cloud-Sync ist für diese Instanz noch nicht konfiguriert.");
  }

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/portfolio` : undefined;

  const res = await fetch(`${cfg.url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.anonKey,
    },
    body: JSON.stringify({
      email: email.trim(),
      create_user: true,
      ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { msg?: string; message?: string } | null;
    throw new Error(err?.msg || err?.message || "Anmelde-Link konnte nicht gesendet werden.");
  }
}

export async function consumeAuthCallbackFromHash(): Promise<CloudSession | null> {
  if (typeof window === "undefined") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const hash = window.location.hash;
  if (!hash.includes("access_token=")) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") ?? undefined;
  const expiresIn = Number(params.get("expires_in") || "3600");
  if (!accessToken) return null;

  const userRes = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { id?: string; email?: string };
  if (!user.id) return null;

  const session: CloudSession = {
    accessToken,
    refreshToken,
    userId: user.id,
    email: user.email || "Konto",
    expiresAt: Date.now() + expiresIn * 1000,
  };

  window.localStorage.setItem(CLOUD_SESSION_STORAGE, JSON.stringify(session));
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export async function syncWithSupabaseCloud(session: CloudSession): Promise<{
  uploadedDrafts: number;
  mergedDrafts: number;
  mergedCustomSagas: number;
}> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: cfg.anonKey,
    Authorization: `Bearer ${session.accessToken}`,
  };

  // 1. Remote-Stand abrufen
  const [draftsRes, sagasRes] = await Promise.all([
    fetch(`${cfg.url}/rest/v1/user_drafts?select=saga_id,payload,updated_at`, { headers }),
    fetch(`${cfg.url}/rest/v1/user_custom_sagas?select=saga_id,payload,updated_at`, { headers }),
  ]);

  if (!draftsRes.ok || !sagasRes.ok) {
    throw new Error(
      "Cloud-Tabellen nicht erreichbar. Bitte prüfe die Anmeldung und supabase/schema.sql."
    );
  }

  const remoteDraftRows = (await draftsRes.json()) as Array<{
    saga_id: string;
    payload: SagaDraft;
  }>;
  const remoteSagaRows = (await sagasRes.json()) as Array<{
    saga_id: string;
    payload: Saga;
  }>;

  const remoteDrafts: Record<string, SagaDraft> = {};
  for (const row of remoteDraftRows) {
    if (row.saga_id && row.payload) remoteDrafts[row.saga_id] = row.payload;
  }
  const remoteSagas = remoteSagaRows.map((r) => r.payload).filter(Boolean);

  // 2. Lokal + Remote nach neuestem Zeitstempel zusammenführen
  const merged = mergeLocalData(remoteDrafts, remoteSagas);

  // 3. Aktuellen zusammengeführten Stand zurück in die Cloud schreiben (Upsert)
  const finalDrafts = loadAllDrafts();
  const finalCustomSagas = loadCustomSagas();

  const draftUpserts = Object.values(finalDrafts).map((draft) => ({
    user_id: session.userId,
    saga_id: draft.sagaId,
    payload: draft,
    updated_at: draft.updatedAt || new Date().toISOString(),
  }));

  const sagaUpserts = finalCustomSagas.map((saga) => ({
    user_id: session.userId,
    saga_id: saga.id,
    payload: saga,
    updated_at: new Date().toISOString(),
  }));

  if (draftUpserts.length > 0) {
    const up = await fetch(`${cfg.url}/rest/v1/user_drafts?on_conflict=user_id,saga_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(draftUpserts),
    });
    if (!up.ok) throw new Error("Entwürfe konnten nicht in die Cloud gespeichert werden.");
  }

  if (sagaUpserts.length > 0) {
    const up = await fetch(`${cfg.url}/rest/v1/user_custom_sagas?on_conflict=user_id,saga_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(sagaUpserts),
    });
    if (!up.ok) throw new Error("Eigene Sagen konnten nicht in die Cloud gespeichert werden.");
  }

  return {
    uploadedDrafts: draftUpserts.length,
    mergedDrafts: merged.draftsCount,
    mergedCustomSagas: merged.customSagasCount,
  };
}
