"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  FileText,
  Headphones,
  Loader2,
  LogOut,
  Mail,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SAGEN_CATALOG, type Saga } from "@/data/sagen-catalog";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import {
  consumeAuthCallbackFromHash,
  getStoredCloudSession,
  isCloudSyncConfigured,
  sendCloudMagicLink,
  signOutCloudSession,
  syncWithSupabaseCloud,
  type CloudSession,
} from "@/lib/cloud-sync";
import {
  exportLocalBackupJson,
  importLocalBackupJson,
  loadAllDrafts,
  loadCustomSagas,
} from "@/lib/local-store";
import { calculateDraftStats, type SagaDraft } from "@/lib/writing-types";

export function PortfolioView() {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [drafts, setDrafts] = useState<Record<string, SagaDraft>>({});
  const [customSagas, setCustomSagas] = useState<Saga[]>([]);

  // Optional Cloud Sync (Supabase EU)
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshLocalState = () => {
    setDrafts(loadAllDrafts());
    setCustomSagas(loadCustomSagas());
  };

  useEffect(() => {
    refreshLocalState();
    const configured = isCloudSyncConfigured();
    setCloudConfigured(configured);

    if (configured) {
      const existing = getStoredCloudSession();
      if (existing) setCloudSession(existing);

      void consumeAuthCallbackFromHash().then((session) => {
        if (session) {
          setCloudSession(session);
          toast.success(`Angemeldet als ${session.email}. Starte Cloud-Sync…`);
          void handleCloudSync(session);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSagas = useMemo(() => [...customSagas, ...SAGEN_CATALOG], [customSagas]);

  const portfolioEntries = useMemo(() => {
    return allSagas
      .map((saga) => {
        const draft = drafts[saga.id];
        const stats = draft ? calculateDraftStats(draft.sections) : null;
        const hasActivity = Boolean(
          draft &&
            (draft.readCompleted ||
              (stats && stats.totalWords > 0) ||
              draft.completedTaskTitles.length > 0)
        );
        return { saga, draft, stats, hasActivity };
      })
      .sort((a, b) => {
        const tsA = a.draft?.updatedAt ? Date.parse(a.draft.updatedAt) : 0;
        const tsB = b.draft?.updatedAt ? Date.parse(b.draft.updatedAt) : 0;
        return tsB - tsA;
      });
  }, [allSagas, drafts]);

  const summary = useMemo(() => {
    let readCount = 0;
    let totalWords = 0;
    let completedRetellings = 0;
    let completedTasks = 0;
    let factScoreSum = 0;
    let factScoreCount = 0;

    for (const { draft, stats } of portfolioEntries) {
      if (!draft) continue;
      if (draft.readCompleted) readCount += 1;
      if (stats) {
        totalWords += stats.totalWords;
        if (stats.startedSections === 4) completedRetellings += 1;
      }
      completedTasks += draft.completedTaskTitles.length;
      if (draft.lastFactCheck) {
        factScoreSum += draft.lastFactCheck.score;
        factScoreCount += 1;
      }
    }

    return {
      readCount,
      totalWords,
      completedRetellings,
      completedTasks,
      avgFactScore: factScoreCount > 0 ? Math.round(factScoreSum / factScoreCount) : null,
    };
  }, [portfolioEntries]);

  const activeEntries = useMemo(
    () => portfolioEntries.filter((e) => e.hasActivity),
    [portfolioEntries]
  );

  const handleDownloadBackup = () => {
    const json = exportLocalBackupJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emsny-sagen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup als JSON heruntergeladen.");
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const result = importLocalBackupJson(text);
      refreshLocalState();
      toast.success(
        `Backup importiert: ${result.draftsCount} Entwürfe & ${result.customSagasCount} eigene Sagen übernommen.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup konnte nicht importiert werden.");
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSendingLink(true);
    try {
      await sendCloudMagicLink(emailInput);
      toast.success("Anmelde-Link gesendet! Öffne den Link in deiner E-Mail.");
      setEmailInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login-Link konnte nicht gesendet werden.");
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleCloudSync = async (sessionOverride?: CloudSession) => {
    const active = sessionOverride ?? cloudSession;
    if (!active) return;
    setIsSyncing(true);
    try {
      const res = await syncWithSupabaseCloud(active);
      refreshLocalState();
      toast.success(
        `Cloud-Sync fertig! ${res.uploadedDrafts} Entwürfe gesichert (${res.mergedDrafts} aktualisiert).`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Synchronisation fehlgeschlagen.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    signOutCloudSession();
    setCloudSession(null);
    toast.success("Abgemeldet. Deine lokalen Entwürfe bleiben auf diesem Gerät erhalten.");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 pb-24 md:pb-0">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 pt-safe">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Alle Sagen</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              <Award className="h-5 w-5 text-emerald-700 shrink-0" />
              <h1 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                Mein Sagen-Portfolio
              </h1>
            </div>
          </div>

          <ApiKeyMenu onDownloadBackup={handleDownloadBackup} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Summary Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-2xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sagen gelesen
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {summary.readCount}
              <span className="text-base font-medium text-slate-400">/{allSagas.length}</span>
            </div>
            <p className="text-xs text-slate-500">{summary.completedTasks} Verständnisaufgaben abgehakt</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-2xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Geschriebene Wörter
            </div>
            <div className="text-3xl font-bold text-emerald-700 tabular-nums">
              {summary.totalWords}
            </div>
            <p className="text-xs text-slate-500">In deinen eigenen Worten erzählt</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-2xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Komplette Sagen
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {summary.completedRetellings}
            </div>
            <p className="text-xs text-slate-500">Alle 4 Bausteine ausgefüllt</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-1 shadow-2xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ø Fakten-Check
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {summary.avgFactScore !== null ? `${summary.avgFactScore}%` : "–"}
            </div>
            <p className="text-xs text-slate-500">
              {summary.avgFactScore !== null
                ? "Aus deinen geprüften Nacherzählungen"
                : "Noch keine Prüfung durchgeführt"}
            </p>
          </div>
        </section>

        {/* Started & Completed Stories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              Deine Arbeiten ({activeEntries.length})
            </h2>
            <Link
              href="/"
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Neue Sage auswählen →
            </Link>
          </div>

          {activeEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-800">Noch keine Sagen begonnen</div>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Wähle in der Bibliothek eine Sage aus, höre sie im Lesestudio an und schreibe deine
                erste Nacherzählung. Alles wird automatisch hier gesammelt!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5"
              >
                Zur Sagen-Bibliothek
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEntries.map(({ saga, draft, stats }) => {
                if (!draft || !stats) return null;
                const excerpt =
                  Object.values(draft.sections)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .join(" ")
                    .slice(0, 170) || "";

                const updatedLabel = draft.updatedAt
                  ? new Date(draft.updatedAt).toLocaleDateString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "";

                return (
                  <article
                    key={saga.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            className="text-lg font-bold text-slate-900"
                            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                          >
                            {saga.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {saga.region} {updatedLabel ? `· Zuletzt bearbeitet ${updatedLabel}` : ""}
                          </p>
                        </div>
                        {draft.lastFactCheck && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shrink-0">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {draft.lastFactCheck.score}%
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>{stats.startedSections}/4 Bausteine geschrieben</span>
                          <span>{stats.totalWords} Wörter</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${stats.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {excerpt ? (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 italic">
                          „{excerpt}
                          {excerpt.length >= 170 ? " …" : ""}“
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Im Lesestudio gestartet – bereit für deine Nacherzählung.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        {draft.readCompleted && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Gelesen
                          </span>
                        )}
                        {draft.completedTaskTitles.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                            <FileText className="h-3 w-3" />
                            {draft.completedTaskTitles.length} Aufgaben erledigt
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/sage/${saga.id}/lesen`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2 px-3 transition"
                      >
                        <Headphones className="h-3.5 w-3.5 text-emerald-700" />
                        Lesestudio
                      </Link>
                      <Link
                        href={`/sage/${saga.id}/schreiben`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-3 transition"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Weiter schreiben
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Backup & Optional Cloud-Sync Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
          {/* Local JSON Backup Export / Import */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Ohne Konto · 100% Lokal
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Geräte-Backup (Export &amp; Import)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Sichere alle deine geschriebenen Sagen, Checklisten und eigenen Uploads als
                JSON-Datei – oder lade ein Backup von deinem Laptop oder iPad wieder ein.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handleDownloadBackup}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-2 rounded-xl"
              >
                <Download className="h-4 w-4" />
                Backup speichern (JSON)
              </Button>

              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                className="border-slate-300 text-slate-700 text-xs font-bold gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                Backup einlesen
              </Button>
            </div>
          </div>

          {/* Optional Supabase EU Cloud-Sync */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Optionaler Account (Supabase EU)
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Cloud-Sync zwischen Geräten
                </h3>
              </div>
              {cloudSession ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">
                  <Cloud className="h-3.5 w-3.5" />
                  Verbunden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[11px] font-bold">
                  <CloudOff className="h-3.5 w-3.5" />
                  Gast-Modus
                </span>
              )}
            </div>

            {!cloudConfigured ? (
              <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  Du arbeitest aktuell komplett <strong>ohne Login</strong> – alle Texte werden
                  automatisch lokal gespeichert.
                </p>
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Für optionalen Cloud-Sync zwischen Laptop, iPad und Smartphone später einfach{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> &amp;{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> setzen und{" "}
                  <code>supabase/schema.sql</code> ausführen.
                </p>
              </div>
            ) : cloudSession ? (
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-600">
                  Angemeldet als <strong>{cloudSession.email}</strong>. Alle lokalen Entwürfe werden
                  beim Synchronisieren automatisch mit der Cloud zusammengeführt.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    onClick={() => void handleCloudSync()}
                    disabled={isSyncing}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-2 rounded-xl"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isSyncing ? "Synchronisiere…" : "Jetzt synchronisieren"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="border-slate-300 text-slate-700 text-xs font-bold gap-2 rounded-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Abmelden
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-600">
                  Melde dich optional per E-Mail-Link an, um deine lokalen Sagen zwischen Laptop,
                  iPad und Smartphone zu synchronisieren.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="deine@email.at"
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <Button
                    type="submit"
                    disabled={isSendingLink}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 rounded-xl h-10 px-4"
                  >
                    {isSendingLink ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Login-Link senden
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <MobileBottomNav />
    </div>
  );
}
