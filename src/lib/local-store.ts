import { SAGEN_CATALOG, type Saga } from "@/data/sagen-catalog";
import { clearStoredApiKey } from "@/lib/api-key-store";
import { CLOUD_SESSION_STORAGE } from "@/lib/cloud-sync";
import { VOICE_STORAGE_KEY } from "@/lib/google-voices";
import { STORAGE_KEY_SETTINGS } from "@/lib/speech-reader";
import {
  DEFAULT_CHECKLIST,
  createEmptyDraft,
  type SagaDraft,
} from "@/lib/writing-types";

export const STORAGE_KEY_DRAFTS = "emsny-sagen-drafts-v1";
export const STORAGE_KEY_CUSTOM_SAGAS = "emsny-sagen-custom-sagas-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeDraft(id: string, item: Partial<SagaDraft>): SagaDraft {
  const base = createEmptyDraft(id);
  return {
    ...base,
    ...item,
    sagaId: id,
    sections: {
      ...base.sections,
      ...(item.sections ?? {}),
    },
    checklist: {
      ...DEFAULT_CHECKLIST,
      ...(item.checklist ?? {}),
    },
    completedTaskTitles: Array.isArray(item.completedTaskTitles)
      ? item.completedTaskTitles.filter((t): t is string => typeof t === "string")
      : [],
  };
}

export function loadAllDrafts(): Record<string, SagaDraft> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DRAFTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<SagaDraft>>;
    const normalized: Record<string, SagaDraft> = {};
    for (const [id, item] of Object.entries(parsed)) {
      if (!item || typeof item !== "object") continue;
      normalized[id] = normalizeDraft(id, item);
    }
    return normalized;
  } catch {
    return {};
  }
}

export function loadDraft(sagaId: string): SagaDraft {
  const all = loadAllDrafts();
  return all[sagaId] ?? createEmptyDraft(sagaId);
}

export function saveDraft(draft: SagaDraft): void {
  if (!isBrowser()) return;
  try {
    const all = loadAllDrafts();
    all[draft.sagaId] = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(all));
  } catch {
    // Storage quota or private mode fallback
  }
}

export function markSagaRead(sagaId: string): SagaDraft {
  const draft = loadDraft(sagaId);
  const next: SagaDraft = {
    ...draft,
    readCompleted: true,
    updatedAt: new Date().toISOString(),
  };
  saveDraft(next);
  return next;
}

export function toggleComprehensionTask(sagaId: string, taskTitle: string): SagaDraft {
  const draft = loadDraft(sagaId);
  const exists = draft.completedTaskTitles.includes(taskTitle);
  const nextTitles = exists
    ? draft.completedTaskTitles.filter((t) => t !== taskTitle)
    : [...draft.completedTaskTitles, taskTitle];

  const next: SagaDraft = {
    ...draft,
    completedTaskTitles: nextTitles,
    updatedAt: new Date().toISOString(),
  };
  saveDraft(next);
  return next;
}

export function loadCustomSagas(): Saga[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_SAGAS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Saga[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomSaga(saga: Saga): Saga[] {
  const current = loadCustomSagas().filter((item) => item.id !== saga.id);
  const next = [saga, ...current];
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY_CUSTOM_SAGAS, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

export function deleteCustomSaga(sagaId: string): Saga[] {
  const next = loadCustomSagas().filter((item) => item.id !== sagaId);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY_CUSTOM_SAGAS, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

export function findSagaById(sagaId: string, customSagas?: Saga[]): Saga | undefined {
  const custom = customSagas ?? loadCustomSagas();
  return custom.find((s) => s.id === sagaId) ?? SAGEN_CATALOG.find((s) => s.id === sagaId);
}

export function exportLocalBackupJson(): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      drafts: loadAllDrafts(),
      customSagas: loadCustomSagas(),
    },
    null,
    2
  );
}

export function mergeLocalData(
  incomingDrafts: Record<string, Partial<SagaDraft>>,
  incomingCustomSagas: Saga[]
): { draftsCount: number; customSagasCount: number } {
  const localDrafts = loadAllDrafts();
  let draftsMerged = 0;

  for (const [id, rawDraft] of Object.entries(incomingDrafts)) {
    if (!rawDraft || typeof rawDraft !== "object") continue;
    const normalized = normalizeDraft(id, rawDraft);
    const existing = localDrafts[id];
    const incomingTs = Date.parse(normalized.updatedAt || "") || 0;
    const existingTs = existing ? Date.parse(existing.updatedAt || "") || 0 : -1;

    if (!existing || incomingTs >= existingTs) {
      localDrafts[id] = normalized;
      draftsMerged += 1;
    }
  }

  const localCustom = loadCustomSagas();
  const customMap = new Map<string, Saga>();
  for (const s of localCustom) customMap.set(s.id, s);

  let customAdded = 0;
  for (const saga of incomingCustomSagas) {
    if (!saga || typeof saga !== "object" || typeof saga.id !== "string" || !saga.title) continue;
    if (!customMap.has(saga.id)) customAdded += 1;
    customMap.set(saga.id, saga);
  }

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(localDrafts));
      window.localStorage.setItem(
        STORAGE_KEY_CUSTOM_SAGAS,
        JSON.stringify(Array.from(customMap.values()))
      );
    } catch {
      // ignore
    }
  }

  return { draftsCount: draftsMerged, customSagasCount: customAdded };
}

export function importLocalBackupJson(rawJson: string): {
  draftsCount: number;
  customSagasCount: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON-Format.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ungültige Backup-Datei.");
  }

  const obj = parsed as {
    drafts?: Record<string, Partial<SagaDraft>>;
    customSagas?: Saga[];
  };

  if (!obj.drafts && !obj.customSagas) {
    throw new Error("Diese Backup-Datei enthält keine Sagen oder Entwürfe.");
  }

  return mergeLocalData(
    obj.drafts && typeof obj.drafts === "object" ? obj.drafts : {},
    Array.isArray(obj.customSagas) ? obj.customSagas : []
  );
}

export function clearAllLocalAppData(): void {
  clearStoredApiKey();
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_DRAFTS);
    window.localStorage.removeItem(STORAGE_KEY_CUSTOM_SAGAS);
    window.localStorage.removeItem(STORAGE_KEY_SETTINGS);
    window.localStorage.removeItem(VOICE_STORAGE_KEY);
    window.localStorage.removeItem(CLOUD_SESSION_STORAGE);
  } catch {
    // ignore
  }
}
