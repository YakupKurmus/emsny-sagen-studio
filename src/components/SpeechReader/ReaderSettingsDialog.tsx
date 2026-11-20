"use client";

import {
  X,
  Check,
  Type,
  Sliders,
  Palette,
  BookOpen,
  Headphones,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  READER_DESIGNS_CONFIG,
  type ReaderDesign,
  type ReaderFont,
  type ReaderSettings,
} from "@/lib/speech-reader";
import { HdVoiceSelect } from "./HdVoiceSelect";

interface ReaderSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onChange: (next: ReaderSettings) => void;
}

export function ReaderSettingsDialog({
  isOpen,
  onClose,
  settings,
  onChange,
}: ReaderSettingsDialogProps) {
  if (!isOpen) return null;

  const update = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const designs = Object.entries(READER_DESIGNS_CONFIG) as [
    ReaderDesign,
    (typeof READER_DESIGNS_CONFIG)[ReaderDesign],
  ][];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-2xl border-t-2 sm:border-2 border-foreground bg-card text-card-foreground shadow-2xl overflow-hidden pb-safe sm:pb-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 id="reader-settings-title" className="text-lg font-bold sm:text-xl">
                Kindle-Ansicht & Hörbuch-Optionen
              </h2>
              <p className="text-xs text-muted-foreground">
                Wiedergabetempo, Seitenaufteilung, Papierton und Schriftart anpassen.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 text-sm">
          {/* 1. FARBSCHEMA & PAPIERTON */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                  Farbschema & Papierton
                </h3>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Gilt für Buchansicht &amp; Fließtext
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {designs.map(([key, cfg]) => {
                const isSelected = settings.design === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => update("design", key)}
                    className={`group flex items-center gap-2.5 rounded-xl border-2 p-2 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/8 ring-2 ring-primary/20 shadow-xs"
                        : "border-border hover:border-foreground/30 bg-card"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-black/15 shadow-xs font-serif text-xs font-bold leading-none"
                      style={{
                        backgroundColor: cfg.swatchBg,
                        color: cfg.swatchText,
                      }}
                    >
                      <span>Aa</span>
                      <span
                        className="mt-0.5 h-1 w-4.5 rounded-full"
                        style={{ backgroundColor: cfg.swatchAccent }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold truncate text-foreground">
                          {cfg.label}
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {cfg.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {cfg.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. GOOGLE CLOUD / GEMINI HD STIMME & WIEDERGABE */}
          <section className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" />
              <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                Google Cloud / Gemini HD Stimme & Wiedergabe
              </h3>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <label className="text-xs font-bold text-foreground block">
                Vorlesestimme (API-Key erforderlich)
              </label>
              <HdVoiceSelect
                value={settings.voiceId}
                onChange={(voiceId) => update("voiceId", voiceId)}
                showRefresh
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Abspielgeschwindigkeit
                  </label>
                  <button
                    type="button"
                    onClick={() => update("speechRate", 1.0)}
                    className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/25 rounded-md px-2 py-0.5 hover:bg-primary/20 transition tabular-nums"
                    title="Auf 1.00× Normaltempo zurücksetzen"
                  >
                    {settings.speechRate.toFixed(2)}×{" "}
                    {Math.abs(settings.speechRate - 1.0) < 0.02 ? "(Normal)" : ""}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0.5, Math.round((settings.speechRate - 0.05) * 100) / 100);
                      update("speechRate", next);
                    }}
                    disabled={settings.speechRate <= 0.5}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-sm font-black hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    title="Langsamer (-0.05×)"
                    aria-label="Langsamer"
                  >
                    −
                  </button>

                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={settings.speechRate}
                    onChange={(e) => update("speechRate", parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    aria-label="Abspielgeschwindigkeit stufenlos einstellen"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(2.0, Math.round((settings.speechRate + 0.05) * 100) / 100);
                      update("speechRate", next);
                    }}
                    disabled={settings.speechRate >= 2.0}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-sm font-black hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    title="Schneller (+0.05×)"
                    aria-label="Schneller"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-0.5 pt-0.5">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => update("speechRate", preset)}
                      className={`hover:text-foreground transition rounded px-1 py-0.5 ${
                        Math.abs(settings.speechRate - preset) < 0.02
                          ? "bg-primary/15 text-primary font-bold"
                          : ""
                      }`}
                    >
                      {preset === 1.0 ? "1.0×" : `${preset}×`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Mitlesen & automatisches Umblättern
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Markiert synchron den gerade gesprochenen Satz und blättert automatisch weiter.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => update("autoScroll", !settings.autoScroll)}
                  className={`w-full rounded-md border py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
                    settings.autoScroll
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${settings.autoScroll ? "opacity-100" : "opacity-0"}`} />
                  <span>{settings.autoScroll ? "Mitlesen Aktiv (Synchronisiert)" : "Mitlesen Aus"}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. DARSTELLUNG ALS BUCH & LESEMODUS */}
          <section className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                  Buch-Darstellung & Layout
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => update("mode", "pages")}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  settings.mode === "pages"
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>📖 Kindle-Buchansicht (Seiten)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ohne Scrollen lesen, mit E-Reader-Fortschritt, Seitenanimation und automatischem Umblättern.
                </p>
              </div>

              <div
                onClick={() => update("mode", "scroll")}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  settings.mode === "scroll"
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span>📜 Fließtext mit Autoscroll</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Durchgehender Textfluss mit sanftem Heran-Scrollen zum jeweils gesprochenen Satz.
                </p>
              </div>
            </div>

            {settings.mode === "pages" && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <span className="text-xs font-bold block">Doppelseite auf breiten Bildschirmen</span>
                  <span className="text-[11px] text-muted-foreground">
                    Zeigt links und rechts je eine Seite wie bei einem echten aufgeschlagenen Buch.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => update("bookSpread", !settings.bookSpread)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                    settings.bookSpread
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {settings.bookSpread ? "Doppelseite Aktiv" : "Einzelseite"}
                </button>
              </div>
            )}
          </section>

          {/* 4. SCHRIFTART & GRÖSSE */}
          <section className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground">
                Schrift & Buch-Typografie
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: "serif", label: "Buch-Serife", desc: "Merriweather" },
                { id: "sans", label: "Moderne Sans", desc: "Nunito" },
                { id: "grotesk", label: "Grotesk", desc: "Bricolage" },
                { id: "dyslexic", label: "Große Abstände", desc: "Lesefreundlich" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => update("font", f.id as ReaderFont)}
                  className={`rounded-xl border-2 p-2.5 text-left transition ${
                    settings.font === f.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="block text-xs font-bold text-foreground">{f.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{f.desc}</span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                Schriftgröße: {settings.fontSize}px
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[15, 17, 19, 22, 26].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update("fontSize", s)}
                    className={`rounded-md border py-1.5 text-center text-xs font-semibold transition ${
                      settings.fontSize === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 sm:p-5">
          <span className="text-xs text-muted-foreground">
            Alle Einstellungen werden automatisch im Browser gespeichert.
          </span>
          <Button onClick={onClose} className="font-bold px-6">
            Fertig
          </Button>
        </div>
      </div>
    </div>
  );
}
