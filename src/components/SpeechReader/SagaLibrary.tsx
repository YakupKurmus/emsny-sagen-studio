"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  Headphones,
  MapPin,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SAGEN_CATALOG,
  SAGA_CATEGORIES,
  type Saga,
  type SagaCategory,
} from "@/data/sagen-catalog";
import { resolveVoice } from "@/lib/google-voices";
import { HdVoiceSelect } from "./HdVoiceSelect";

interface SagaLibraryProps {
  onSelectSaga: (saga: Saga) => void;
  selectedVoiceId?: string;
  onSelectVoice?: (voiceId: string) => void;
  customSagas?: Saga[];
}

export function SagaLibrary({
  onSelectSaga,
  selectedVoiceId,
  onSelectVoice,
  customSagas = [],
}: SagaLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<SagaCategory>("Alle");
  const [searchQuery, setSearchQuery] = useState("");

  const allSagas = useMemo(() => {
    return [...customSagas, ...SAGEN_CATALOG];
  }, [customSagas]);

  const filteredSagas = useMemo(() => {
    return allSagas.filter((saga) => {
      // Category filter
      const matchesCategory =
        selectedCategory === "Alle" ||
        saga.category === selectedCategory ||
        saga.secondaryCategories.includes(selectedCategory);

      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        saga.title.toLowerCase().includes(q) ||
        saga.subtitle.toLowerCase().includes(q) ||
        saga.region.toLowerCase().includes(q) ||
        saga.summary.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allSagas, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-foreground bg-gradient-to-br from-primary/15 via-background to-amber-500/10 p-6 sm:p-10 shadow-pop">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Headphones className="h-3.5 w-3.5" />
            <span>KI-Hörbuch & Kindle-Lesestudio · B2-Niveau</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground">
            Sagen & Mythen Lesestudio
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            Entdecke berühmte Sagen aus dem Raum Klagenfurt, die Nibelungen- und Heldensagen.
            Wähle in jeder Sage frei eine echte{" "}
            <strong className="text-foreground">Google Cloud Chirp 3 HD oder Gemini HD Stimme</strong>{" "}
            (mit API-Key) und lies synchron im Kindle-Lesemodus mit.
          </p>

          {selectedVoiceId && onSelectVoice && (
            <div className="pt-2 max-w-md space-y-1.5">
              <span className="block text-xs font-bold text-foreground">
                Vorlesestimme (Google Cloud / Gemini HD):
              </span>
              <HdVoiceSelect
                value={selectedVoiceId}
                onChange={onSelectVoice}
                showRefresh
              />
            </div>
          )}
        </div>

        {/* Die 4 klassischen Aufbausteine einer Sage (Lehrplan & B2-Niveau) */}
        <div className="mt-6 pt-5 border-t border-foreground/10">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Klassischer Aufbau aller Sagen (nach Schulbuch & B2-Lehrplan):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Baustein 1 */}
            <div className="rounded-xl border border-rose-300 bg-rose-50/80 dark:bg-rose-950/40 dark:border-rose-800 p-3 flex flex-col justify-between shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-rose-800 dark:text-rose-200">
                  <span>📖</span> 1. Die Einführung
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-950/80 dark:text-rose-100/80">
                  Zuerst erfährt man, wo und wann sich die Geschichte ereignet hat und welche Personen beteiligt waren.
                </p>
              </div>
            </div>

            {/* Baustein 2 */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-800 p-3 flex flex-col justify-between shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-800 dark:text-amber-200">
                  <span>🐉</span> 2. Das Thema
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-950/80 dark:text-amber-100/80">
                  Übernatürliche Geschehnisse werden als natürlich dargestellt, unwirkliche Wesen treten auf.
                </p>
              </div>
            </div>

            {/* Baustein 3 */}
            <div className="rounded-xl border border-sky-300 bg-sky-50/80 dark:bg-sky-950/40 dark:border-sky-800 p-3 flex flex-col justify-between shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-sky-800 dark:text-sky-200">
                  <span>⚔️</span> 3. Die Wende
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-sky-950/80 dark:text-sky-100/80">
                  Auf dem Höhepunkt entscheidet sich das Schicksal. Die Guten siegen durch List oder Mut.
                </p>
              </div>
            </div>

            {/* Baustein 4 */}
            <div className="rounded-xl border border-purple-300 bg-purple-50/80 dark:bg-purple-950/40 dark:border-purple-800 p-3 flex flex-col justify-between shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-purple-800 dark:text-purple-200">
                  <span>🏰</span> 4. Das Bleibende
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-purple-950/80 dark:text-purple-100/80">
                  Zuletzt erfährt man, was heute noch an die Sage erinnert (Brunnen, Denkmal, See, Höhle).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sage, Ort oder Stichwort suchen (z. B. Lindwurm, Wörthersee) …"
              className="learning-input w-full pl-10 text-sm"
            />
          </div>

          <span className="text-xs font-semibold text-muted-foreground">
            {filteredSagas.length} {filteredSagas.length === 1 ? "Sage" : "Sagen"} verfügbar
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sagen-Kategorien">
          {SAGA_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sagas Grid */}
      {filteredSagas.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-base font-bold">Keine Sagen gefunden</p>
          <p className="text-xs text-muted-foreground mt-1">
            Versuche einen anderen Suchbegriff oder wechsle die Kategorie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSagas.map((saga) => {
            const activeVoice = selectedVoiceId ? resolveVoice(selectedVoiceId) : null;
            return (
              <article
                key={saga.id}
                className="group flex flex-col justify-between rounded-2xl border-2 border-foreground bg-card p-5 text-card-foreground shadow-pop transition hover:-translate-y-0.5 hover:shadow-pop-sm"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {saga.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {saga.region}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" />
                      4 Bausteine · B2
                    </span>
                    {saga.audioUrl && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/35 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        <Headphones className="h-3 w-3" />
                        Original-MP3
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                      {saga.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {saga.subtitle}
                    </p>
                  </div>

                  {/* Dynamic Google Cloud / Gemini HD Voice Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Headphones className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {saga.audioUrl
                        ? activeVoice
                          ? `MP3-Hörbuch & KI (${activeVoice.cloudTtsVoice})`
                          : "Original-MP3 & Google Cloud HD"
                        : activeVoice
                          ? `HD-Stimme wählbar (${activeVoice.cloudTtsVoice})`
                          : "Google Cloud / Gemini HD wählbar"}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
                    {saga.summary}
                  </p>
                </div>

                {/* Card Footer with Meta & Action */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                      <Headphones className="h-3.5 w-3.5 text-primary" />
                      ca. {saga.readingTimeMin} Min.
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {saga.wordCount} Wörter
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => onSelectSaga(saga)}
                    className="gap-1.5 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 shrink-0"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Anhören & Lesen
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
