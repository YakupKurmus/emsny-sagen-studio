"use client";

import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDictation } from "@/lib/use-dictation";
import type { Saga } from "@/data/sagen-catalog";

interface DictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomSaga: (saga: Saga) => void;
  defaultLanguage?: "de-AT" | "de-DE" | "en-US";
}

export function DictationModal({
  isOpen,
  onClose,
  onLoadCustomSaga,
  defaultLanguage = "de-AT",
}: DictationModalProps) {
  const [lang, setLang] = useState<"de-AT" | "de-DE" | "en-US">(defaultLanguage);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("Mein gesprochener Text");
  const [error, setError] = useState("");

  const dictation = useDictation({
    language: lang,
    contextHint: title,
    onLiveTextUpdate: (fullText) => {
      setError("");
      setTranscript(fullText);
    },
    onError: (errMsg) => {
      setError(errMsg);
    },
  });

  const handleToggle = () => {
    setError("");
    if (dictation.isRecording) {
      dictation.stop();
    } else if (!dictation.isTranscribing) {
      void dictation.start(transcript);
    }
  };

  const handleClose = () => {
    if (dictation.isRecording) {
      dictation.stop();
    }
    onClose();
  };

  const handleApplyToReader = () => {
    const fullText = transcript.trim();
    if (!fullText) {
      setError("Bitte sprich zuerst etwas ein oder tippe einen Text ein.");
      return;
    }

    if (dictation.isRecording) {
      dictation.stop();
    }

    const rawParagraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim());
    const sections = (rawParagraphs.length ? rawParagraphs : [fullText]).map((text, i) => ({
      heading: rawParagraphs.length > 1 ? `Abschnitt ${i + 1}` : undefined,
      text: text.trim(),
    }));

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 130));

    const customSaga: Saga = {
      id: `custom-${Date.now()}`,
      title: title.trim() || "Eigener Text",
      subtitle: `Live diktierte Sage (${lang})`,
      category: "Ortssagen",
      secondaryCategories: ["Speech-to-Text", "Eigener Text"],
      region: "Eigene Aufnahme",
      readingTimeMin,
      wordCount,
      summary: fullText.slice(0, 160) + (fullText.length > 160 ? " …" : ""),
      historicalContext:
        "Dieser Text wurde per Live-Diktat aufgenommen und lokal auf diesem Gerät gespeichert.",
      sections,
    };

    onLoadCustomSaga(customSaga);
    onClose();
  };

  if (!isOpen) return null;

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictation-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h2 id="dictation-dialog-title" className="text-base font-bold sm:text-lg text-slate-900">
                Sage live einsprechen
              </h2>
              <p className="text-xs text-slate-500">
                {dictation.hasAiAssistance
                  ? "Live-Diktat mit KI-Satzzeichen – schreibt streng wortgetreu nur das, was du sagst."
                  : "Live-Diktat im Browser – erkennt „Punkt“, „Beistrich“, „neue Zeile“ automatisch."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Schließen">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 sm:text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="flex-1">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dictation-title-input"
                className="block text-xs font-bold uppercase text-slate-500 mb-1"
              >
                Titel der Geschichte
              </label>
              <input
                id="dictation-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel eingeben …"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="dictation-lang-select"
                className="block text-xs font-bold uppercase text-slate-500 mb-1"
              >
                Sprache
              </label>
              <select
                id="dictation-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as "de-AT" | "de-DE" | "en-US")}
                disabled={dictation.isRecording || dictation.isTranscribing}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="de-AT">Deutsch (Österreich · de-AT)</option>
                <option value="de-DE">Deutsch (Deutschland · de-DE)</option>
                <option value="en-US">Englisch (USA · en-US)</option>
              </select>
            </div>
          </div>

          {/* Engine Switcher when both are available */}
          {dictation.canUseBrowserSpeech && dictation.canUseAudioFallback && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2">
              <span className="text-xs font-bold text-slate-600">Modus:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={dictation.isRecording || dictation.isTranscribing}
                  onClick={() => dictation.setPreferredEngine("live")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    dictation.engine === "live"
                      ? "bg-emerald-700 text-white"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Live-Diktat + KI (empfohlen)
                </button>
                <button
                  type="button"
                  disabled={dictation.isRecording || dictation.isTranscribing}
                  onClick={() => dictation.setPreferredEngine("audio")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                    dictation.engine === "audio"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  Audio-Aufnahme
                </button>
              </div>
            </div>
          )}

          {/* Record Button Area */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 text-center space-y-2.5">
            <button
              type="button"
              disabled={dictation.isTranscribing}
              onClick={handleToggle}
              className={`relative flex h-18 w-18 items-center justify-center rounded-full border-2 transition-all cursor-pointer disabled:opacity-60 ${
                dictation.isRecording
                  ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105"
                  : "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 hover:scale-105 shadow-md"
              }`}
              aria-label={dictation.isRecording ? "Aufnahme stoppen" : "Aufnahme starten"}
            >
              {dictation.isTranscribing ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : dictation.isRecording ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </button>

            <p className="text-sm font-bold text-slate-900">
              {dictation.isTranscribing
                ? "KI ergänzt Satzzeichen & Großschreibung…"
                : dictation.isRecording
                  ? `Live-Diktat aktiv (${Math.floor(dictation.elapsedSec / 60)}:${String(
                      dictation.elapsedSec % 60
                    ).padStart(2, "0")})`
                  : "Auf das Mikrofon tippen und direkt lossprechen"}
            </p>
            <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
              Sprich Befehle einfach mit:{" "}
              <strong className="text-emerald-800">
                „Punkt“, „Beistrich“, „Fragezeichen“, „Rufzeichen“, „Doppelpunkt“, „neue Zeile“,
                „neuer Absatz“
              </strong>{" "}
              – fehlende Satzzeichen werden zusätzlich automatisch ergänzt.
            </p>

            {dictation.isRecording && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => dictation.stop()}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Fertig
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dictation.cancel()}
                  className="text-xs text-slate-500"
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>

          {/* Editable Transcript Field */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="dictation-transcript-area"
                className="text-xs font-bold uppercase text-slate-500"
              >
                Dein diktierter Text
              </label>
              {transcript && !dictation.isRecording && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTranscript("")}
                  className="h-7 text-xs text-slate-500 hover:text-red-600"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Text leeren
                </Button>
              )}
            </div>
            <textarea
              id="dictation-transcript-area"
              value={transcript}
              readOnly={dictation.isRecording}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Deine Wörter erscheinen hier direkt live beim Sprechen …"
              rows={6}
              className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {wordCount} Wörter · ca. {Math.max(1, Math.ceil(wordCount / 130))} Min. Lesezeit
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <Button variant="outline" onClick={handleClose} className="border-slate-300">
            Abbrechen
          </Button>
          <Button
            onClick={handleApplyToReader}
            disabled={!transcript.trim() || dictation.isTranscribing}
            className="gap-2 bg-emerald-700 hover:bg-emerald-800 font-bold text-white"
          >
            <BookOpen className="h-4 w-4" />
            Im Lesemodus öffnen
          </Button>
        </div>
      </div>
    </div>
  );
}
