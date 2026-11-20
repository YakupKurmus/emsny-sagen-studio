"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { Button } from "@/components/ui/button";
import { clearAllLocalAppData, exportLocalBackupJson } from "@/lib/local-store";

export function DatenschutzView() {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDownloadBackup = () => {
    const json = exportLocalBackupJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emsny-sagen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup gespeichert.");
  };

  const handleDeleteAll = () => {
    clearAllLocalAppData();
    setConfirmingDelete(false);
    toast.success("Alle lokalen Daten (Texte, Sagen, Einstellungen & API-Key) wurden gelöscht.");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
              <h1 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                Datenschutz &amp; KI-Transparenz
              </h1>
            </div>
          </div>

          <ApiKeyMenu compact onDownloadBackup={handleDownloadBackup} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section className="rounded-3xl bg-[#eaf1ec] border border-emerald-200/70 p-6 sm:p-8 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Schüler- &amp; Eltern-Info · DSGVO-freundlich
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-[#143a25]"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Deine Geschichten gehören dir.
          </h2>
          <p className="text-sm text-[#2f5540] leading-relaxed">
            Das Emsny Sagen-Studio funktioniert vollständig <strong>ohne Anmeldung</strong>, ohne
            Werbung und ohne Tracking. Hier siehst du verständlich, wo welche Daten gespeichert
            werden.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <HardDrive className="h-4 w-4 text-emerald-700" />
              <span>1. Lokale Speicherung im Browser</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Deine geschriebenen Nacherzählungen, Checklisten, erledigten Aufgaben, eigenen Uploads
              und Reader-Einstellungen (z. B. Papierton &amp; Schriftgröße) werden direkt lokal im{" "}
              <code>localStorage</code> dieses Geräts gespeichert.
            </p>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span>2. KI-Funktionen (Google Gemini)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Nur wenn du aktiv auf eine KI-Hilfe klickst (<em>Satzanfänge</em>,{" "}
              <em>Weiter schreiben</em>, <em>Text &amp; Fakten prüfen</em>, <em>Synonyme</em>,{" "}
              <em>Dokument-OCR</em> oder <em>HD-Vorlesen</em>), wird der jeweilige Text über das
              Backend mit <code>store: false</code> an Google Gemini gesendet. Bitte schreibe keine
              Klarnamen oder privaten Adressen in deine Sagen-Texte.
            </p>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-emerald-700" />
              <span>3. Eigener API-Key</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Wenn du über das Menü einen eigenen Gemini API-Key hinterlegst, bleibt er
              ausschließlich lokal in diesem Browser und wird nur für deine jeweiligen KI-Anfragen
              übertragen. Du kannst ihn jederzeit im Menü ändern oder löschen.
            </p>
          </article>

          <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>4. Kein Tracking &amp; optionaler Cloud-Sync</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Wir setzen keine Werbe-Cookies oder Analyse-Tracker ein. Der optionale Cloud-Sync im{" "}
              <Link href="/portfolio" className="text-emerald-700 font-bold hover:underline">
                Portfolio
              </Link>{" "}
              wird nur aktiv, wenn du dich freiwillig dafür anmeldest.
            </p>
          </article>
        </section>

        {/* Data Export & Full Local Wipe */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Deine Datenkontrolle</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Du kannst jederzeit eine Kopie aller lokalen Daten als JSON-Datei herunterladen oder
              alle auf diesem Gerät gespeicherten Daten vollständig entfernen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadBackup}
              className="gap-2 text-xs font-bold border-slate-300 text-slate-700 rounded-xl"
            >
              <Download className="h-4 w-4" />
              Alle Daten exportieren (JSON)
            </Button>

            {!confirmingDelete ? (
              <Button
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                className="gap-2 text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
                Alle lokalen Daten löschen
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-red-800">
                  Wirklich alle Entwürfe, Uploads &amp; API-Key löschen?
                </span>
                <Button
                  size="sm"
                  onClick={handleDeleteAll}
                  className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                >
                  Ja, alles löschen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                  className="h-7 text-xs font-semibold text-slate-600"
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
