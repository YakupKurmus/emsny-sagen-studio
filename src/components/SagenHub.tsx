"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Headphones,
  Loader2,
  MapPin,
  Mic,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  SAGEN_CATALOG,
  SAGA_CATEGORIES,
  type Saga,
  type SagaCategory,
} from "@/data/sagen-catalog";
import { Button } from "@/components/ui/button";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { DictationModal } from "@/components/SpeechReader/DictationModal";
import { buildAiRequestHeaders } from "@/lib/api-key-store";
import {
  deleteCustomSaga,
  exportLocalBackupJson,
  loadAllDrafts,
  loadCustomSagas,
  saveCustomSaga,
} from "@/lib/local-store";
import {
  SAGA_SECTIONS_META,
  calculateDraftStats,
  type SagaDraft,
} from "@/lib/writing-types";

type HubCategory = SagaCategory | "Eigene Sagen";

const HUB_CATEGORIES: readonly HubCategory[] = [...SAGA_CATEGORIES, "Eigene Sagen"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const str = String(reader.result ?? "");
      const idx = str.indexOf(",");
      resolve(idx >= 0 ? str.slice(idx + 1) : str);
    };
    reader.onerror = (err) => reject(err);
  });
}

function buildLocalTextSaga(fileName: string, rawText: string): Saga {
  const cleanTitle =
    rawText.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") ||
    "Eigene Sage";

  const mainText = rawText.replace(/^#\s+.+\n?/m, "").trim();
  const paragraphs = mainText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / 4));
  const sections = SAGA_SECTIONS_META.map((meta, index) => {
    const slice = paragraphs.slice(index * chunkSize, (index + 1) * chunkSize);
    return {
      heading: meta.curriculumTitle,
      text: slice.join("\n\n") || (index === 0 ? mainText : ""),
    };
  }).filter((sec) => sec.text.length > 0);

  const wordCount = mainText.split(/\s+/).filter(Boolean).length;

  return {
    id: `upload-${Date.now()}`,
    title: cleanTitle,
    subtitle: "Eigene hochgeladene Textdatei",
    category: "Ortssagen",
    secondaryCategories: ["Eigene Sage"],
    region: "Eigener Upload",
    readingTimeMin: Math.max(1, Math.ceil(wordCount / 130)),
    wordCount,
    summary: mainText.slice(0, 180) + (mainText.length > 180 ? " …" : ""),
    historicalContext:
      "Eigene hochgeladene Sage, lokal auf deinem Gerät gespeichert und bereit zum Lesen und Nacherzählen.",
    sections: sections.length > 0 ? sections : [{ heading: "1. Die Einführung", text: mainText }],
  };
}

export function SagenHub() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<HubCategory>("Alle");
  const [searchQuery, setSearchQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, SagaDraft>>({});
  const [customSagas, setCustomSagas] = useState<Saga[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDictationOpen, setIsDictationOpen] = useState(false);

  useEffect(() => {
    setDrafts(loadAllDrafts());
    setCustomSagas(loadCustomSagas());
  }, []);

  const allSagas = useMemo(
    () => [...customSagas, ...SAGEN_CATALOG],
    [customSagas]
  );

  const filteredSagas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allSagas.filter((saga) => {
      const isCustom = customSagas.some((c) => c.id === saga.id);
      const matchesCat =
        selectedCategory === "Alle" ||
        (selectedCategory === "Eigene Sagen" && isCustom) ||
        saga.category === selectedCategory ||
        saga.secondaryCategories.includes(selectedCategory);

      const matchesQuery =
        !q ||
        saga.title.toLowerCase().includes(q) ||
        saga.region.toLowerCase().includes(q) ||
        saga.summary.toLowerCase().includes(q);

      return matchesCat && matchesQuery;
    });
  }, [allSagas, customSagas, searchQuery, selectedCategory]);

  const totalWrittenWords = useMemo(() => {
    return Object.values(drafts).reduce(
      (sum, draft) => sum + calculateDraftStats(draft.sections).totalWords,
      0
    );
  }, [drafts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    const isMedia = file.type.startsWith("image/") || file.type === "application/pdf";

    if (!isText && !isMedia) {
      toast.error("Bitte lade eine PDF-, Bild- (.jpg/.png) oder Textdatei (.txt) hoch.");
      return;
    }

    setIsUploading(true);
    try {
      if (isText) {
        const text = await file.text();
        if (!text.trim()) {
          toast.error("Die Textdatei ist leer.");
          return;
        }
        // Versuche KI-Strukturierung; bei fehlendem API-Key sauberer lokaler Fallback
        try {
          const res = await fetch("/api/sagas/extract", {
            method: "POST",
            headers: buildAiRequestHeaders(),
            body: JSON.stringify({
              fileName: file.name,
              mimeType: "text/plain",
              plainText: text,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { saga: Saga };
            const updated = saveCustomSaga(data.saga);
            setCustomSagas(updated);
            toast.success(`„${data.saga.title}“ mit Glossar & Aufgaben erstellt!`);
            router.push(`/sage/${data.saga.id}/lesen`);
            return;
          }
        } catch {
          // Fallback auf lokale Strukturierung
        }
        const localSaga = buildLocalTextSaga(file.name, text);
        const updated = saveCustomSaga(localSaga);
        setCustomSagas(updated);
        toast.success(`„${localSaga.title}“ lokal gespeichert!`);
        router.push(`/sage/${localSaga.id}/lesen`);
        return;
      }

      // Bild oder PDF via Gemini OCR
      const base64Data = await fileToBase64(file);
      const res = await fetch("/api/sagas/extract", {
        method: "POST",
        headers: buildAiRequestHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        }),
      });
      const payload = (await res.json()) as { saga?: Saga; error?: string };
      if (!res.ok || !payload.saga) {
        toast.error(payload.error || "Dokument konnte nicht ausgelesen werden.");
        return;
      }
      const updated = saveCustomSaga(payload.saga);
      setCustomSagas(updated);
      toast.success(`„${payload.saga.title}“ erfolgreich aus dem Dokument erkannt!`);
      router.push(`/sage/${payload.saga.id}/lesen`);
    } catch {
      toast.error("Beim Hochladen ist ein Fehler aufgetreten.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadDictatedSaga = (saga: Saga) => {
    const updated = saveCustomSaga(saga);
    setCustomSagas(updated);
    toast.success(`Diktierte Sage „${saga.title}“ gespeichert!`);
    router.push(`/sage/${saga.id}/lesen`);
  };

  const handleDeleteCustomSaga = (saga: Saga) => {
    const updated = deleteCustomSaga(saga.id);
    setCustomSagas(updated);
    toast.success(`„${saga.title}“ entfernt.`);
  };

  const handleDownloadBackup = () => {
    const json = exportLocalBackupJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emsny-sagen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lokales Backup als JSON gespeichert.");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 pb-24 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 truncate">
                  Emsny Sagen-Studio
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
                  6. Schulstufe · B2
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Lesestudio &amp; Schreibwerkstatt in einer App
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 rounded-full px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ohne Login · Lokal gespeichert
            </span>
            <Link
              href="/portfolio"
              className="hidden md:inline-flex items-center gap-1.5 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <Award className="h-4 w-4 text-emerald-700" />
              <span>Portfolio</span>
            </Link>
            <ApiKeyMenu onDownloadBackup={handleDownloadBackup} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#eaf1ec] border border-emerald-200/70 p-5 sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 border border-emerald-200 px-3 py-1 text-[11px] sm:text-xs font-bold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Lesen, Hören &amp; Nacherzählen</span>
              </div>
              <h1
                className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#143a25] leading-tight"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Erst eintauchen, dann selbst erzählen.
              </h1>
              <p className="text-sm sm:text-base text-[#2f5540] leading-relaxed max-w-2xl">
                Wähle eine Sage aus oder lade deine eigene hoch: erst im{" "}
                <strong>Lesestudio</strong> anhören, dann in der <strong>Schreibwerkstatt</strong>{" "}
                mit KI-Feedback nacherzählen.
              </p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt,.pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 rounded-xl h-11 px-3 sm:px-4 text-xs sm:text-sm shadow-sm"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Upload className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {isUploading ? "Lese aus…" : "Sage hochladen"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsDictationOpen(true)}
                  className="bg-white/95 hover:bg-white border-emerald-300 text-emerald-900 font-bold gap-2 rounded-xl h-11 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <Mic className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span className="truncate">Sage einsprechen</span>
                </Button>
              </div>
            </div>

            {/* 2-Step Overview Card (kompakt auf Handy, ausführlich ab Tablet) */}
            <div className="hidden sm:grid lg:col-span-5 grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="rounded-2xl bg-white/90 border border-emerald-200/70 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <Headphones className="h-4 w-4" />
                  Schritt 01 · Lesestudio
                </div>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                  Original-MP3 mit wortgenauem Mitlesen, 6 ruhigen Papiertönen, B2-Glossar &amp;
                  Verständnisaufgaben.
                </p>
              </div>
              <div className="rounded-2xl bg-white/90 border border-emerald-200/70 p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <PenLine className="h-4 w-4" />
                    Schritt 02 · Schreibwerkstatt
                  </span>
                  {totalWrittenWords > 0 && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded-full px-2 py-0.5">
                      {totalWrittenWords} Wörter geschrieben
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                  Die 4 Sagen-Bausteine mit Satzanfängen, Ghost-Text, Live-Diktat, Fakten- &amp;
                  Präteritum-Check sowie PDF-Export.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Building Blocks Strip (horizontal wischbar am Handy, 4er Grid am Desktop) */}
        <section className="flex overflow-x-auto no-scrollbar gap-2.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
          {SAGA_SECTIONS_META.map((sec) => {
            const palette =
              sec.accent === "emerald"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : sec.accent === "blue"
                  ? "bg-blue-50/70 border-blue-200 text-blue-900"
                  : sec.accent === "red"
                    ? "bg-rose-50/70 border-rose-200 text-rose-900"
                    : "bg-amber-50/70 border-amber-200 text-amber-900";
            return (
              <div
                key={sec.id}
                className={`min-w-[165px] sm:min-w-0 shrink-0 rounded-2xl border p-3 sm:p-3.5 ${palette}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black opacity-60">{sec.number}</span>
                  <span className="text-sm font-bold">{sec.shortTitle}</span>
                </div>
                <p className="text-[11px] sm:text-xs opacity-80 mt-0.5 sm:mt-1">{sec.subtitle}</p>
              </div>
            );
          })}
        </section>

        {/* Filter & Search */}
        <section className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
            {HUB_CATEGORIES.map((cat) => {
              if (cat === "Eigene Sagen" && customSagas.length === 0) return null;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 sm:px-3.5 sm:py-1.5 text-xs font-bold transition cursor-pointer border ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-800"
                  }`}
                >
                  {cat}
                  {cat === "Eigene Sagen" ? ` (${customSagas.length})` : ""}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sage oder Region suchen…"
              className="w-full h-11 sm:h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
        </section>

        {/* Sagas Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSagas.map((saga) => {
            const draft = drafts[saga.id];
            const stats = draft ? calculateDraftStats(draft.sections) : null;
            const isCustom = customSagas.some((c) => c.id === saga.id);

            return (
              <article
                key={saga.id}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {isCustom ? "Eigene Sage" : saga.category}
                      </span>
                      {saga.audioUrl && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          <Headphones className="h-3 w-3" />
                          MP3
                        </span>
                      )}
                    </div>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomSaga(saga)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Eigene Sage löschen"
                        aria-label={`${saga.title} löschen`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h2
                      className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug"
                      style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      {saga.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{saga.region}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {saga.summary}
                  </p>

                  {/* Meta & Progress */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {saga.wordCount} Wörter · {saga.readingTimeMin} Min.
                    </span>
                    {draft?.readCompleted && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Gelesen
                      </span>
                    )}
                    {stats && stats.totalWords > 0 && (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        {stats.startedSections}/4 Abschnitte · {stats.totalWords} W.
                      </span>
                    )}
                    {draft?.lastFactCheck && (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <ShieldCheck className="h-3 w-3" />
                        Check {draft.lastFactCheck.score}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Footer (44px+ Touch-Ziele) */}
                <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                  <Link
                    href={`/sage/${saga.id}/lesen`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 text-xs sm:text-sm font-bold min-h-[44px] px-3 transition"
                  >
                    <Headphones className="h-4 w-4 text-emerald-700" />
                    01 Lesen
                  </Link>
                  <Link
                    href={`/sage/${saga.id}/schreiben`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs sm:text-sm font-bold min-h-[44px] px-3 transition shadow-xs"
                  >
                    <PenLine className="h-4 w-4" />
                    02 Schreiben
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {filteredSagas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
            <p className="font-bold text-slate-700">Keine passende Sage gefunden.</p>
            <p className="text-sm text-slate-500">
              Probiere einen anderen Suchbegriff oder lade deine eigene Sage hoch.
            </p>
          </div>
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Emsny Sagen-Studio · 6. Schulstufe AHS (B2-Niveau)</span>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/portfolio" className="hover:text-emerald-700 transition">
              Mein Portfolio
            </Link>
            <Link href="/datenschutz" className="hover:text-emerald-700 transition">
              Datenschutz &amp; KI-Info
            </Link>
          </div>
        </div>
      </footer>

      <MobileBottomNav />

      <DictationModal
        isOpen={isDictationOpen}
        onClose={() => setIsDictationOpen(false)}
        onLoadCustomSaga={handleLoadDictatedSaga}
      />
    </div>
  );
}
