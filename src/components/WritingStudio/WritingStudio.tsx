"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Headphones,
  Lightbulb,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  PenLine,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Saga } from "@/data/sagen-catalog";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { Button } from "@/components/ui/button";
import { buildAiRequestHeaders } from "@/lib/api-key-store";
import {
  findSagaById,
  loadDraft,
  saveDraft,
} from "@/lib/local-store";
import { useDictation } from "@/lib/use-dictation";
import {
  savedVoice,
  speakGoogle,
  stopGoogleSpeech,
} from "@/lib/google-speech";
import {
  SAGA_SECTIONS_META,
  calculateDraftStats,
  createEmptyDraft,
  getSagaFullPlainText,
  type AnalysisErrorItem,
  type AssistanceMode,
  type ChecklistState,
  type SagaDraft,
  type SectionId,
  type WritingAnalysisResult,
} from "@/lib/writing-types";

interface CompiledHighlight {
  section: SectionId;
  start: number;
  end: number;
  word: string;
  type: "error" | "verb" | "adjective";
  number?: number;
  correction?: string;
  explanation?: string;
  category?: AnalysisErrorItem["category"];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSectionHighlights(
  sectionId: SectionId,
  text: string,
  analysis: WritingAnalysisResult,
  startErrorNumber: number
): {
  highlights: CompiledHighlight[];
  unmatchedErrors: CompiledHighlight[];
  nextErrorNumber: number;
} {
  const raw: CompiledHighlight[] = [];
  const unmatchedErrors: CompiledHighlight[] = [];

  const collect = (
    items: Array<{
      word: string;
      type: "error" | "verb" | "adjective";
      correction?: string;
      explanation?: string;
      category?: AnalysisErrorItem["category"];
    }>
  ) => {
    for (const item of items) {
      const target = item.word.trim();
      if (!target) continue;
      const safe = escapeRegExp(target);
      const isSingleWord = /^[a-zA-ZÄÖÜäöüß-]+$/.test(target);
      const regex = isSingleWord
        ? new RegExp(`(?<![a-zA-ZÄÖÜäöüß])${safe}(?![a-zA-ZÄÖÜäöüß])`, "g")
        : new RegExp(safe, "g");
      let match: RegExpExecArray | null;
      let matchedAny = false;
      while ((match = regex.exec(text)) !== null) {
        matchedAny = true;
        raw.push({
          section: sectionId,
          start: match.index,
          end: match.index + match[0].length,
          word: match[0],
          type: item.type,
          correction: item.correction,
          explanation: item.explanation,
          category: item.category,
        });
      }
      if (!matchedAny && item.type === "error") {
        unmatchedErrors.push({
          section: sectionId,
          start: -1,
          end: -1,
          word: target,
          type: "error",
          correction: item.correction,
          explanation: item.explanation,
          category: item.category,
        });
      }
    }
  };

  collect(
    analysis.errors
      .filter((e) => e.section === sectionId)
      .map((e) => ({
        word: e.wrong,
        type: "error" as const,
        correction: e.correction,
        explanation: e.explanation,
        category: e.category,
      }))
  );
  collect(
    analysis.verbs
      .filter((v) => v.section === sectionId)
      .map((v) => ({ word: v.word, type: "verb" as const }))
  );
  collect(
    analysis.adjectives
      .filter((a) => a.section === sectionId)
      .map((a) => ({ word: a.word, type: "adjective" as const }))
  );

  raw.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.type === "error" && b.type !== "error") return -1;
    if (b.type === "error" && a.type !== "error") return 1;
    return b.end - a.end;
  });

  const merged: CompiledHighlight[] = [];
  let cursor = 0;
  let errorNum = startErrorNumber;

  for (const h of raw) {
    if (h.start >= cursor) {
      if (h.type === "error") {
        merged.push({ ...h, number: errorNum++ });
      } else {
        merged.push(h);
      }
      cursor = h.end;
    }
  }

  const numberedUnmatched = unmatchedErrors.map((e) => ({
    ...e,
    number: errorNum++,
  }));

  return { highlights: merged, unmatchedErrors: numberedUnmatched, nextErrorNumber: errorNum };
}

const ASSISTANCE_LABELS: Record<
  AssistanceMode,
  { label: string; hint: string; maxContinuations: number }
> = {
  starter: {
    label: "Starter",
    hint: "Satzanfänge + unbegrenzte KI-Fortsetzungen",
    maxContinuations: 99,
  },
  standard: {
    label: "Standard",
    hint: "Satzanfänge + bis zu 2 KI-Schubser pro Abschnitt",
    maxContinuations: 2,
  },
  profi: {
    label: "Profi",
    hint: "Eigenständiges Schreiben – KI-Feedback erst bei der Prüfung",
    maxContinuations: 0,
  },
};

const ERROR_CATEGORY_LABELS: Record<NonNullable<AnalysisErrorItem["category"]>, string> = {
  rechtschreibung: "Rechtschreibung",
  grammatik: "Grammatik",
  zeitform: "Erzählzeit (Präteritum)",
  satzbau: "Satzbau",
};

export function WritingStudio({ sagaId }: { sagaId: string }) {
  const [saga, setSaga] = useState<Saga | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<SagaDraft>(() => createEmptyDraft(sagaId));
  const [lastSavedLabel, setLastSavedLabel] = useState<string>("Lokal gespeichert");

  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WritingAnalysisResult | null>(null);

  // Per-section AI helpers
  const [startersState, setStartersState] = useState<{
    sectionId: SectionId | null;
    loading: boolean;
    items: string[];
  }>({ sectionId: null, loading: false, items: [] });

  const [suggestionState, setSuggestionState] = useState<{
    sectionId: SectionId | null;
    loading: boolean;
    text: string;
  }>({ sectionId: null, loading: false, text: "" });

  const [continuationCounts, setContinuationCounts] = useState<Record<SectionId, number>>({
    einfuehrung: 0,
    thema: 0,
    wende: 0,
    bleibendes: 0,
  });

  // Synonym replacement modal
  const [synonymTarget, setSynonymTarget] = useState<{
    sectionId: SectionId;
    start: number;
    end: number;
    word: string;
    wordType: "verb" | "adjective";
    loading: boolean;
    alternatives: string[];
  } | null>(null);

  // Dictation per section (KI-Diktat via Gemini 3.5 Transcribe + Browser Live-Diktat Fallback)
  const [dictatingSection, setDictatingSection] = useState<SectionId | null>(null);
  const dictatingSectionRef = useRef<SectionId | null>(null);
  dictatingSectionRef.current = dictatingSection;

  const sagaVocabulary = useMemo(() => {
    if (!saga) return [] as string[];
    const terms = new Set<string>();
    terms.add(saga.title);
    for (const part of saga.region.split(/[,()]+/)) {
      const clean = part.trim();
      if (clean.length >= 3) terms.add(clean);
    }
    for (const g of saga.glossary ?? []) {
      const clean = g.term.replace(/^(?:der|die|das|ein|eine|sich)\s+/i, "").trim();
      if (clean.length >= 3) terms.add(clean);
    }
    return Array.from(terms).slice(0, 30);
  }, [saga]);

  const dictation = useDictation({
    language: "de-AT",
    customVocabulary: sagaVocabulary,
    contextHint: saga ? `Nacherzählung der Sage "${saga.title}" (${saga.region})` : undefined,
    onLiveTextUpdate: (fullSectionText) => {
      const target = dictatingSectionRef.current;
      if (!target) return;
      setDraft((prev) => {
        const next: SagaDraft = {
          ...prev,
          sections: {
            ...prev.sections,
            [target]: fullSectionText,
          },
          updatedAt: new Date().toISOString(),
        };
        saveDraft(next);
        return next;
      });
      const time = new Date().toLocaleTimeString("de-AT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSavedLabel(`Gespeichert um ${time}`);
    },
    onCompleted: (_finalText, usedAi) => {
      toast.success(
        usedAi
          ? "Diktat fertig – Satzzeichen & Großschreibung per KI ergänzt!"
          : "Diktat sauber übernommen!"
      );
    },
    onError: (errMsg) => {
      toast.error(errMsg);
    },
    onSessionEnd: () => {
      setDictatingSection(null);
      dictatingSectionRef.current = null;
    },
  });

  // Read own retelling aloud
  const [isReadingOwnText, setIsReadingOwnText] = useState(false);

  const textareaRefs = useRef<Record<SectionId, HTMLTextAreaElement | null>>({
    einfuehrung: null,
    thema: null,
    wende: null,
    bleibendes: null,
  });
  const cardRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    einfuehrung: null,
    thema: null,
    wende: null,
    bleibendes: null,
  });
  const analysisRef = useRef<HTMLDivElement | null>(null);

  // Load saga & local draft on mount
  useEffect(() => {
    const found = findSagaById(sagaId) ?? null;
    setSaga(found);
    setDraft(loadDraft(sagaId));
    setLoaded(true);

    return () => {
      stopGoogleSpeech();
    };
  }, [sagaId]);

  // Auto-resize all textareas whenever section text changes
  useEffect(() => {
    for (const sec of SAGA_SECTIONS_META) {
      const el = textareaRefs.current[sec.id];
      if (!el) continue;
      el.style.height = "auto";
      el.style.height = `${Math.max(128, el.scrollHeight)}px`;
    }
  }, [draft.sections, loaded]);

  const persistDraft = useCallback((next: SagaDraft) => {
    setDraft(next);
    saveDraft(next);
    const time = new Date().toLocaleTimeString("de-AT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLastSavedLabel(`Gespeichert um ${time}`);
  }, []);

  const updateSectionText = useCallback(
    (sectionId: SectionId, value: string) => {
      const next: SagaDraft = {
        ...draft,
        sections: {
          ...draft.sections,
          [sectionId]: value,
        },
        updatedAt: new Date().toISOString(),
      };
      persistDraft(next);
      if (suggestionState.sectionId === sectionId) {
        setSuggestionState({ sectionId: null, loading: false, text: "" });
      }
    },
    [draft, persistDraft, suggestionState.sectionId]
  );

  const updateChecklist = (key: keyof ChecklistState, checked: boolean) => {
    persistDraft({
      ...draft,
      checklist: {
        ...draft.checklist,
        [key]: checked,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const updateAssistanceMode = (mode: AssistanceMode) => {
    persistDraft({
      ...draft,
      assistanceMode: mode,
      updatedAt: new Date().toISOString(),
    });
    if (mode === "profi") {
      setSuggestionState({ sectionId: null, loading: false, text: "" });
      setStartersState({ sectionId: null, loading: false, items: [] });
    }
    toast.success(`Hilfestufe „${ASSISTANCE_LABELS[mode].label}“ aktiviert`);
  };

  const stats = useMemo(() => calculateDraftStats(draft.sections), [draft.sections]);
  const sourcePlainText = useMemo(() => (saga ? getSagaFullPlainText(saga) : ""), [saga]);

  const compiledReview = useMemo(() => {
    if (!analysis) return null;
    const bySection: Record<SectionId, CompiledHighlight[]> = {
      einfuehrung: [],
      thema: [],
      wende: [],
      bleibendes: [],
    };
    const allErrors: CompiledHighlight[] = [];
    let errNum = 1;

    for (const meta of SAGA_SECTIONS_META) {
      const { highlights, unmatchedErrors, nextErrorNumber } = buildSectionHighlights(
        meta.id,
        draft.sections[meta.id],
        analysis,
        errNum
      );
      bySection[meta.id] = highlights;
      errNum = nextErrorNumber;
      for (const h of highlights) {
        if (h.type === "error") allErrors.push(h);
      }
      allErrors.push(...unmatchedErrors);
    }

    return { bySection, allErrors };
  }, [analysis, draft.sections]);

  const handleRequestStarters = async (sectionId: SectionId) => {
    if (!saga) return;
    if (draft.assistanceMode === "profi") {
      toast.info("Im Profi-Modus sind Schreibhilfen deaktiviert. Du kannst oben jederzeit wechseln.");
      return;
    }

    const meta = SAGA_SECTIONS_META.find((m) => m.id === sectionId)!;
    setStartersState({ sectionId, loading: true, items: [] });

    try {
      const res = await fetch("/api/writing/starters", {
        method: "POST",
        headers: buildAiRequestHeaders(),
        body: JSON.stringify({
          sourceText: sourcePlainText,
          sectionLabel: `${meta.curriculumTitle} (${meta.subtitle})`,
          currentText: draft.sections[sectionId],
        }),
      });
      const data = (await res.json()) as { starters?: string[]; error?: string };
      if (!res.ok || !data.starters) {
        toast.error(data.error || "Satzanfänge konnten nicht geladen werden.");
        setStartersState({ sectionId: null, loading: false, items: [] });
        return;
      }
      setStartersState({ sectionId, loading: false, items: data.starters });
    } catch {
      toast.error("Verbindungsfehler beim Laden der Satzanfänge.");
      setStartersState({ sectionId: null, loading: false, items: [] });
    }
  };

  const handleInsertStarter = (sectionId: SectionId, starter: string) => {
    const textarea = textareaRefs.current[sectionId];
    const current = draft.sections[sectionId];
    const pos = textarea?.selectionStart ?? current.length;
    const before = current.slice(0, pos);
    const after = current.slice(pos);
    const prefix =
      before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
    const insertion = `${prefix}${starter} `;
    const nextValue = `${before}${insertion}${after}`;

    updateSectionText(sectionId, nextValue);
    setStartersState({ sectionId: null, loading: false, items: [] });

    requestAnimationFrame(() => {
      const el = textareaRefs.current[sectionId];
      if (!el) return;
      el.focus();
      const newPos = pos + insertion.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const handleRequestContinuation = async (sectionId: SectionId, isRetry = false) => {
    if (!saga) return;
    const modeConfig = ASSISTANCE_LABELS[draft.assistanceMode];
    if (modeConfig.maxContinuations === 0) {
      toast.info("Im Profi-Modus schreibst du komplett selbstständig.");
      return;
    }
    if (!isRetry && continuationCounts[sectionId] >= modeConfig.maxContinuations) {
      toast.info(
        `Du hast in diesem Abschnitt schon ${modeConfig.maxContinuations} KI-Schubser genutzt – probier den nächsten Satz selbst oder wechsle auf „Starter“.`
      );
      return;
    }

    const meta = SAGA_SECTIONS_META.find((m) => m.id === sectionId)!;
    const prevSuggestion =
      isRetry && suggestionState.sectionId === sectionId ? suggestionState.text : undefined;

    setSuggestionState({ sectionId, loading: true, text: prevSuggestion ?? "" });

    try {
      const res = await fetch("/api/writing/continue", {
        method: "POST",
        headers: buildAiRequestHeaders(),
        body: JSON.stringify({
          sourceText: sourcePlainText,
          sectionLabel: `${meta.curriculumTitle} (${meta.subtitle})`,
          currentText: draft.sections[sectionId],
          previousSuggestion: prevSuggestion,
        }),
      });
      const data = (await res.json()) as { suggestion?: string; error?: string };
      if (!res.ok || !data.suggestion) {
        toast.error(data.error || "Kein Vorschlag verfügbar.");
        setSuggestionState({ sectionId: null, loading: false, text: "" });
        return;
      }
      setSuggestionState({ sectionId, loading: false, text: data.suggestion });
      if (!isRetry) {
        setContinuationCounts((prev) => ({ ...prev, [sectionId]: prev[sectionId] + 1 }));
      }
    } catch {
      toast.error("Verbindungsfehler beim Weiter-Schreiben.");
      setSuggestionState({ sectionId: null, loading: false, text: "" });
    }
  };

  const handleAcceptSuggestion = (sectionId: SectionId) => {
    if (suggestionState.sectionId !== sectionId || !suggestionState.text) return;
    const current = draft.sections[sectionId];
    const sug = suggestionState.text;
    const needsSpace =
      current.length > 0 &&
      !current.endsWith(" ") &&
      !current.endsWith("\n") &&
      !/^[.,!?]/.test(sug);
    const nextValue = `${current}${needsSpace ? " " : ""}${sug}`;
    updateSectionText(sectionId, nextValue);
    setSuggestionState({ sectionId: null, loading: false, text: "" });
    requestAnimationFrame(() => {
      const el = textareaRefs.current[sectionId];
      if (el) {
        el.focus();
        el.setSelectionRange(nextValue.length, nextValue.length);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, sectionId: SectionId) => {
    if (
      e.key === "Tab" &&
      suggestionState.sectionId === sectionId &&
      suggestionState.text &&
      !suggestionState.loading
    ) {
      e.preventDefault();
      handleAcceptSuggestion(sectionId);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
      e.preventDefault();
      void handleRequestContinuation(sectionId, suggestionState.sectionId === sectionId);
    }
  };

  const handleToggleDictation = async (sectionId: SectionId) => {
    if (dictation.isTranscribing) return;

    if (dictatingSection === sectionId && dictation.isRecording) {
      dictation.stop();
      return;
    }

    if (dictation.isRecording) {
      dictation.cancel();
    }

    setDictatingSection(sectionId);
    dictatingSectionRef.current = sectionId;
    const started = await dictation.start(draft.sections[sectionId]);
    if (!started) {
      setDictatingSection(null);
      dictatingSectionRef.current = null;
    }
  };

  const handleAnalyze = async () => {
    if (!saga) return;
    if (stats.totalWords === 0) {
      toast.info("Schreibe zuerst mindestens einen Satz, bevor du die Prüfung startest.");
      return;
    }

    setIsAnalyzing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 35_000);
    try {
      const res = await fetch("/api/writing/analyze", {
        method: "POST",
        headers: buildAiRequestHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          sagaTitle: saga.title,
          sourceText: sourcePlainText,
          sections: draft.sections,
        }),
      });
      const data = (await res.json()) as WritingAnalysisResult & { error?: string };
      if (!res.ok || !data.factCheck) {
        toast.error(data.error || "Analyse konnte nicht durchgeführt werden.");
        return;
      }

      setAnalysis(data);
      // Checkliste & Fakten-Check-Ergebnis automatisch lokal speichern
      persistDraft({
        ...draft,
        lastFactCheck: {
          status: data.factCheck.status,
          score: data.factCheck.score,
          checkedAt: new Date().toISOString(),
        },
        checklist: {
          placeAndTime: draft.checklist.placeAndTime || data.factCheck.checklistAssessment.placeAndTime,
          secretOrConflict:
            draft.checklist.secretOrConflict || data.factCheck.checklistAssessment.secretOrConflict,
          supernatural:
            draft.checklist.supernatural || data.factCheck.checklistAssessment.supernatural,
          moralOrMemory:
            draft.checklist.moralOrMemory || data.factCheck.checklistAssessment.moralOrMemory,
        },
        updatedAt: new Date().toISOString(),
      });

      toast.success("Textprüfung & Fakten-Check abgeschlossen!");
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Die Prüfung hat zu lange gedauert. Bitte versuche es noch einmal.");
      } else {
        toast.error("Verbindungsfehler bei der Textprüfung.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  const handleFixSingleError = (err: CompiledHighlight) => {
    if (!err.correction) return;
    const current = draft.sections[err.section];
    let updated: string;
    if (err.start >= 0 && current.slice(err.start, err.end) === err.word) {
      updated = `${current.slice(0, err.start)}${err.correction}${current.slice(err.end)}`;
    } else if (current.includes(err.word)) {
      updated = current.replace(err.word, err.correction);
    } else {
      updated = current.replace(new RegExp(escapeRegExp(err.word), "i"), err.correction);
    }

    updateSectionText(err.section, updated);

    // Entferne genau diesen behobenen Fehler aus der Analyse, damit nichts doppelt erscheint
    setAnalysis((prev) => {
      if (!prev) return prev;
      let removed = false;
      return {
        ...prev,
        errors: prev.errors.filter((item) => {
          if (!removed && item.section === err.section && item.wrong === err.word) {
            removed = true;
            return false;
          }
          return true;
        }),
      };
    });
    toast.success(`„${err.word}“ → „${err.correction}“ ausgebessert`);
  };

  const handleFixAllErrors = () => {
    if (!compiledReview || compiledReview.allErrors.length === 0) return;
    const nextSections = { ...draft.sections };

    for (const meta of SAGA_SECTIONS_META) {
      const errs = compiledReview.allErrors
        .filter((e) => e.section === meta.id && e.correction)
        .sort((a, b) => b.start - a.start);
      let text = nextSections[meta.id];
      for (const err of errs) {
        if (err.start >= 0 && text.slice(err.start, err.end) === err.word) {
          text = `${text.slice(0, err.start)}${err.correction}${text.slice(err.end)}`;
        } else if (text.includes(err.word)) {
          text = text.replace(err.word, err.correction!);
        } else {
          text = text.replace(new RegExp(escapeRegExp(err.word), "i"), err.correction!);
        }
      }
      nextSections[meta.id] = text;
    }

    persistDraft({
      ...draft,
      sections: nextSections,
      updatedAt: new Date().toISOString(),
    });
    setAnalysis((prev) => (prev ? { ...prev, errors: [] } : prev));
    toast.success("Alle gefundenen Fehler ausgebessert!");
  };

  const handleOpenSynonyms = async (h: CompiledHighlight) => {
    if (h.type !== "verb" && h.type !== "adjective") return;
    setSynonymTarget({
      sectionId: h.section,
      start: h.start,
      end: h.end,
      word: h.word,
      wordType: h.type,
      loading: true,
      alternatives: [],
    });

    try {
      const res = await fetch("/api/writing/synonyms", {
        method: "POST",
        headers: buildAiRequestHeaders(),
        body: JSON.stringify({
          word: h.word,
          wordType: h.type,
          contextText: draft.sections[h.section],
        }),
      });
      const data = (await res.json()) as { alternatives?: string[]; error?: string };
      if (!res.ok || !data.alternatives) {
        toast.error(data.error || "Keine Synonyme gefunden.");
        setSynonymTarget(null);
        return;
      }
      setSynonymTarget((prev) =>
        prev ? { ...prev, loading: false, alternatives: data.alternatives ?? [] } : null
      );
    } catch {
      toast.error("Fehler beim Laden der Synonyme.");
      setSynonymTarget(null);
    }
  };

  const handleApplySynonym = (newWord: string) => {
    if (!synonymTarget) return;
    const { sectionId, start, end, word, wordType } = synonymTarget;
    const current = draft.sections[sectionId];
    const updated =
      current.slice(start, end) === word
        ? `${current.slice(0, start)}${newWord}${current.slice(end)}`
        : current.replace(word, newWord);

    updateSectionText(sectionId, updated);

    // Update Highlight-Wort im aktuellen Analyse-Stand
    setAnalysis((prev) => {
      if (!prev) return prev;
      const listKey = wordType === "verb" ? "verbs" : "adjectives";
      return {
        ...prev,
        [listKey]: prev[listKey].map((item) =>
          item.section === sectionId && item.word === word ? { ...item, word: newWord } : item
        ),
      };
    });

    setSynonymTarget(null);
    toast.success(`„${word}“ ersetzt durch „${newWord}“`);
  };

  const handleToggleReadOwnStory = async () => {
    if (isReadingOwnText) {
      stopGoogleSpeech();
      setIsReadingOwnText(false);
      return;
    }

    const fullStory = SAGA_SECTIONS_META.map((m) => draft.sections[m.id].trim())
      .filter(Boolean)
      .join(" ");

    if (!fullStory) {
      toast.info("Schreibe zuerst ein paar Sätze, dann kannst du dir deine Sage anhören.");
      return;
    }

    setIsReadingOwnText(true);
    try {
      await speakGoogle(fullStory, savedVoice(), undefined, 1.0);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Vorlesen benötigt einen aktiven Google/Gemini API-Key."
        );
      }
    } finally {
      setIsReadingOwnText(false);
    }
  };

  const handleResetDraft = () => {
    if (stats.totalWords === 0) return;
    if (!window.confirm("Möchtest du deinen Entwurf für diese Sage wirklich leeren?")) return;
    persistDraft(createEmptyDraft(sagaId));
    setAnalysis(null);
    setContinuationCounts({ einfuehrung: 0, thema: 0, wende: 0, bleibendes: 0 });
    toast.success("Entwurf zurückgesetzt.");
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!saga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Sage nicht gefunden</h1>
        <p className="text-sm text-slate-600 max-w-md">
          Diese Sage existiert nicht (mehr) auf diesem Gerät. Wähle bitte eine Sage aus der
          Bibliothek.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col">
      {/* Top Sticky Header */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Alle Sagen</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 truncate">
                  {saga.title}
                </span>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 hidden sm:inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {lastSavedLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href={`/sage/${saga.id}/lesen`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-700 transition-colors"
              title="Zurück zu Schritt 01: Lesestudio & Hörbuch"
            >
              <Headphones className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden md:inline">01 Lesestudio</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsSourceOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 sm:px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Original-Sage</span>
            </button>

            <button
              type="button"
              onClick={handleToggleReadOwnStory}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                isReadingOwnText
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              title="Deine eigene Nacherzählung anhören"
            >
              {isReadingOwnText ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-700" />
              )}
              <span className="hidden lg:inline">
                {isReadingOwnText ? "Stopp" : "Vorlesen"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-2.5 sm:px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Als PDF speichern oder drucken"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF / Drucken</span>
            </button>

            <ApiKeyMenu compact />
          </div>
        </div>
      </header>

      {/* Main Writing Workspace */}
      <main className="flex-1 no-print">
        {/* Hero Header */}
        <section className="bg-[#eaf1ec] px-4 sm:px-8 md:px-14 pt-10 pb-16 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-5xl relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-[#2f5540] uppercase mb-2">
                Schritt 02 • Mach die Sage zu deiner
              </div>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#143a25] tracking-tight"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Jetzt bist du Erzähler.
              </h1>
              <p className="text-[#2f5540] text-sm font-medium mt-2">
                {saga.title} · {saga.region}
              </p>
            </div>

            {/* Assistance Mode Switcher */}
            <div className="bg-white/85 backdrop-blur-xs border border-emerald-200/80 rounded-2xl p-2 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/70 px-2 pb-1">
                KI-Hilfestufe
              </div>
              <div className="flex items-center gap-1">
                {(["starter", "standard", "profi"] as AssistanceMode[]).map((mode) => {
                  const active = draft.assistanceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateAssistanceMode(mode)}
                      title={ASSISTANCE_LABELS[mode].hint}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        active
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
                      }`}
                    >
                      {ASSISTANCE_LABELS[mode].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Live Stats Card */}
        <div className="mx-auto max-w-5xl px-4 sm:px-8 -mt-8 relative z-20 mb-10">
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="p-4 flex items-center gap-3.5">
              <span className="text-2xl font-bold text-slate-800 tabular-nums">
                {stats.totalWords}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                Wörter
                <br />
                geschrieben
              </span>
            </div>

            <div className="p-4 flex items-center gap-3.5">
              <Clock className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-slate-700">
                  {stats.readingTimeMin === 0 ? "–" : `${stats.readingTimeMin} Min.`}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Lesezeit
                </div>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3.5">
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-slate-800">{stats.startedSections}</span>
                <span className="text-sm font-medium text-slate-400">/4</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                Abschnitte
                <br />
                begonnen
              </span>
            </div>

            <div className="p-4 flex items-center gap-3">
              {(() => {
                const factSummary = analysis?.factCheck ?? draft.lastFactCheck;
                return (
                  <>
                    <div
                      className={`rounded-full p-1.5 shrink-0 ${
                        !factSummary
                          ? "bg-slate-100 text-slate-500"
                          : factSummary.status === "super"
                            ? "bg-emerald-100 text-emerald-700"
                            : factSummary.status === "gut"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate">
                        {!factSummary
                          ? "Bereit zur Prüfung"
                          : factSummary.status === "super"
                            ? `Super (${factSummary.score}%)`
                            : factSummary.status === "gut"
                              ? `Gut (${factSummary.score}%)`
                              : `Ausbaufähig (${factSummary.score}%)`}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Fakten- &amp; Sagen-Check
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Editor Core */}
        <div className="mx-auto max-w-5xl px-4 sm:px-8 pb-20 space-y-8">
          {/* Title & Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Meine Nacherzählung
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                {ASSISTANCE_LABELS[draft.assistanceMode].hint}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {stats.totalWords > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDraft}
                  className="text-xs font-semibold text-slate-400 hover:text-red-600 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Leeren
                </Button>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 rounded-xl px-5 shadow-sm"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isAnalyzing ? "KI prüft deinen Text…" : "Text & Fakten prüfen"}
              </Button>
            </div>
          </div>

          {/* Clickable Progress Tabs */}
          <nav
            aria-label="Abschnitte der Sage"
            className="flex items-center border-b border-slate-200 overflow-x-auto gap-1"
          >
            {SAGA_SECTIONS_META.map((meta, idx) => {
              const hasContent = stats.wordsBySection[meta.id] > 0;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() =>
                    cardRefs.current[meta.id]?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  className={`flex-1 py-3 px-3 text-sm font-bold border-b-2 transition flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap cursor-pointer ${
                    hasContent
                      ? "text-emerald-700 border-emerald-600"
                      : "text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {hasContent ? (
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-xs font-bold opacity-70">{idx + 1}</span>
                  )}
                  <span>{meta.shortTitle}</span>
                </button>
              );
            })}
          </nav>

          {/* Visible Loading Banner during AI Check */}
          {isAnalyzing && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 flex items-center gap-3 text-sm font-bold text-emerald-900 shadow-2xs">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700 shrink-0" />
              <span>
                KI prüft Rechtschreibung, Präteritum, Wortarten &amp; Fakten deiner Sage…
              </span>
            </div>
          )}

          {/* AI Analysis Results Container */}
          {analysis && compiledReview && (
            <section ref={analysisRef} className="space-y-5">
              {/* Fact-Check & Style Card */}
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                <div className="bg-emerald-50/80 px-5 py-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 font-bold text-emerald-950">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    <span>Fakten- &amp; Sagen-Check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-2 rounded-full bg-emerald-200/70 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${analysis.factCheck.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-emerald-800">
                      {analysis.factCheck.score}%
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800 leading-relaxed">
                    {analysis.factCheck.summary}
                  </p>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs sm:text-sm text-slate-600">
                    <strong className="text-slate-800">Eigene Worte:</strong>{" "}
                    {analysis.factCheck.originalityNote}
                  </div>
                  {analysis.factCheck.missingDetails.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Das könntest du noch ergänzen:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        {analysis.factCheck.missingDetails.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.styleTips.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Stil- &amp; Erzählzeit-Tipps:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        {analysis.styleTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Full Text Review (Click/Tap Verbs & Adjectives for Synonyms) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-700" />
                    <span>Deine komplette Sage (Überprüft)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">Fehler</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Verben (antippen für Synonyme)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Adjektive (antippen für Synonyme)
                    </span>
                  </div>
                </div>
                <div className="p-5 sm:p-6 space-y-4 text-[15px] leading-relaxed text-slate-800">
                  {SAGA_SECTIONS_META.map((meta) => {
                    const text = draft.sections[meta.id];
                    if (!text.trim()) return null;
                    const highlights = compiledReview.bySection[meta.id];

                    const nodes: React.ReactNode[] = [];
                    let cursor = 0;

                    highlights.forEach((h, idx) => {
                      if (h.start > cursor) {
                        nodes.push(
                          <span key={`t-${idx}`}>{text.slice(cursor, h.start)}</span>
                        );
                      }
                      if (h.type === "error") {
                        nodes.push(
                          <span
                            key={`h-${idx}`}
                            className="inline-flex items-baseline bg-red-100 text-red-900 border-b-2 border-red-500 rounded-xs px-0.5 mx-0.5 relative"
                          >
                            {h.word}
                            <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold h-4 w-4 -translate-y-1.5">
                              {h.number}
                            </span>
                          </span>
                        );
                      } else if (h.type === "verb") {
                        nodes.push(
                          <button
                            key={`h-${idx}`}
                            type="button"
                            onClick={() => handleOpenSynonyms(h)}
                            className="inline bg-blue-100 hover:bg-blue-200 text-blue-900 border-b-2 border-blue-400 rounded-xs px-0.5 cursor-pointer transition-colors"
                            title="Klicken für Synonym-Vorschläge (Verb)"
                          >
                            {h.word}
                          </button>
                        );
                      } else {
                        nodes.push(
                          <button
                            key={`h-${idx}`}
                            type="button"
                            onClick={() => handleOpenSynonyms(h)}
                            className="inline bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-b-2 border-emerald-400 rounded-xs px-0.5 cursor-pointer transition-colors"
                            title="Klicken für Synonym-Vorschläge (Adjektiv)"
                          >
                            {h.word}
                          </button>
                        );
                      }
                      cursor = h.end;
                    });

                    if (cursor < text.length) {
                      nodes.push(<span key="tail">{text.slice(cursor)}</span>);
                    }

                    return (
                      <div key={meta.id} className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {meta.number} · {meta.shortTitle}
                        </div>
                        <p className="whitespace-pre-wrap">{nodes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error List */}
              {compiledReview.allErrors.length === 0 ? (
                <div className="bg-emerald-50 text-emerald-900 p-4 rounded-2xl border border-emerald-200 font-bold text-sm flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
                  Hervorragend! Aktuell sind keine Rechtschreib-, Grammatik- oder Zeitformfehler
                  mehr offen.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                  <div className="bg-red-50/80 px-5 py-4 border-b border-red-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-red-950">
                      Gefundene Verbesserungen ({compiledReview.allErrors.length})
                    </span>
                    <Button
                      size="sm"
                      onClick={handleFixAllErrors}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Alle auf einmal ausbessern
                    </Button>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    {compiledReview.allErrors.map((err) => (
                      <div
                        key={`${err.section}-${err.number}-${err.start}`}
                        className="flex gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80"
                      >
                        <div className="shrink-0 bg-red-600 text-white font-bold h-7 w-7 rounded-full flex items-center justify-center text-xs">
                          {err.number}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="line-through text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">
                                {err.word}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                {err.correction}
                              </span>
                              {err.category && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                  {ERROR_CATEGORY_LABELS[err.category]}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFixSingleError(err)}
                              className="h-7 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                            >
                              Ausbessern
                            </Button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200/70">
                            {err.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 4 Writing Section Cards */}
          <div className="space-y-8">
            {SAGA_SECTIONS_META.map((meta) => {
              const headerColors =
                meta.accent === "emerald"
                  ? "bg-[#f0f7f2] border-emerald-100 text-[#143a25] focus-within:ring-emerald-500/15 focus-within:border-emerald-400"
                  : meta.accent === "blue"
                    ? "bg-[#f0f4f7] border-blue-100 text-[#14263a] focus-within:ring-blue-500/15 focus-within:border-blue-400"
                    : meta.accent === "red"
                      ? "bg-[#f7f0f0] border-red-100 text-[#3a1414] focus-within:ring-red-500/15 focus-within:border-red-400"
                      : "bg-[#f7f5f0] border-amber-100 text-[#3a3214] focus-within:ring-amber-500/15 focus-within:border-amber-400";

              const numberColor =
                meta.accent === "emerald"
                  ? "text-emerald-700/30"
                  : meta.accent === "blue"
                    ? "text-blue-700/30"
                    : meta.accent === "red"
                      ? "text-red-700/30"
                      : "text-amber-700/30";

              const showStarters = startersState.sectionId === meta.id;
              const showSuggestion = suggestionState.sectionId === meta.id;
              const isDictatingHere =
                dictatingSection === meta.id && (dictation.isRecording || dictation.isTranscribing);
              const isProfi = draft.assistanceMode === "profi";

              return (
                <section
                  key={meta.id}
                  ref={(el) => {
                    cardRefs.current[meta.id] = el as HTMLDivElement | null;
                  }}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-400 transition-all shadow-xs"
                >
                  {/* Section Card Header */}
                  <div
                    className={`px-5 sm:px-6 py-4 flex items-center justify-between border-b ${headerColors}`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-3xl sm:text-4xl font-light ${numberColor}`}
                        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        {meta.number}
                      </span>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg leading-tight">
                          {meta.shortTitle}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-65">
                          {meta.subtitle}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">
                      {stats.wordsBySection[meta.id]} Wörter
                    </span>
                  </div>

                  {/* Auto-Growing Textarea */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <textarea
                      ref={(el) => {
                        textareaRefs.current[meta.id] = el;
                      }}
                      value={draft.sections[meta.id]}
                      readOnly={isDictatingHere}
                      onChange={(e) => updateSectionText(meta.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, meta.id)}
                      placeholder={meta.placeholder}
                      rows={4}
                      className="w-full min-h-[128px] resize-none border-0 bg-transparent text-base leading-7 text-slate-700 font-medium placeholder:text-slate-300 focus:outline-none"
                      aria-label={meta.curriculumTitle}
                    />

                    {/* Active Dictation Status & Live Preview Panel */}
                    {isDictatingHere && (
                      <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                            {dictation.isTranscribing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                                <span className="text-emerald-900">
                                  KI ergänzt Satzzeichen &amp; Großschreibung (wortgetreu)…
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                                <span>
                                  Live-Diktat ({Math.floor(dictation.elapsedSec / 60)}:
                                  {String(dictation.elapsedSec % 60).padStart(2, "0")})
                                </span>
                                <span className="rounded-full bg-white/85 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  {dictation.hasAiAssistance
                                    ? "Live + KI-Satzzeichen"
                                    : "Live-Diktat"}
                                </span>
                              </>
                            )}
                          </div>

                          {!dictation.isTranscribing && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => dictation.stop()}
                                className="h-7 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Fertig
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => dictation.cancel()}
                                className="h-7 text-xs text-slate-600 hover:text-red-700"
                              >
                                Abbrechen
                              </Button>
                            </div>
                          )}
                        </div>

                        {dictation.isRecording && (
                          <p className="text-[11px] sm:text-xs text-slate-600 bg-white/85 rounded-lg border border-red-100 px-3 py-2 leading-relaxed">
                            <strong className="text-slate-800">Sprich einfach los:</strong> Es wird
                            nur genau das geschrieben, was du diktierst. Satzzeichen wie{" "}
                            <span className="font-semibold text-emerald-800">
                              „Punkt“, „Beistrich“, „Fragezeichen“, „Rufzeichen“, „Doppelpunkt“,
                              „neue Zeile“
                            </span>{" "}
                            oder{" "}
                            <span className="font-semibold text-emerald-800">„neuer Absatz“</span>{" "}
                            werden automatisch umgesetzt.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Touch- & Desktop-friendly Inline Ghost Suggestion Bar */}
                    {showSuggestion && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            KI-Fortsetzung
                          </span>
                          <span className="text-[11px] text-amber-700/80 hidden sm:inline">
                            Tipp: Tab zum Übernehmen
                          </span>
                        </div>

                        {suggestionState.loading ? (
                          <div className="flex items-center gap-2 text-sm text-amber-800">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Überlege eine passende Fortsetzung…
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-800 italic">
                              „… {suggestionState.text}“
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptSuggestion(meta.id)}
                                className="h-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Übernehmen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestContinuation(meta.id, true)}
                                className="h-8 text-xs font-bold gap-1.5 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Andere Idee
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setSuggestionState({ sectionId: null, loading: false, text: "" })
                                }
                                className="h-8 text-xs text-slate-500 hover:text-slate-800"
                              >
                                Verwerfen
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Sentence Starters Chip Tray */}
                    {showStarters && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Satzanfänge (antippen zum Einfügen)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setStartersState({ sectionId: null, loading: false, items: [] })
                            }
                            className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                            aria-label="Satzanfänge schließen"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {startersState.loading ? (
                          <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Suche passende Satzanfänge…
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {startersState.items.map((starter, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleInsertStarter(meta.id, starter)}
                                className="rounded-lg bg-white hover:bg-blue-100 border border-blue-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-950 transition cursor-pointer shadow-2xs"
                              >
                                {starter} …
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Bar */}
                  <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        disabled={isProfi}
                        onClick={() => handleRequestStarters(meta.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800 hover:bg-emerald-100/60 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Satzanfänge
                      </button>

                      <button
                        type="button"
                        disabled={isProfi}
                        onClick={() => handleRequestContinuation(meta.id, false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800 hover:bg-emerald-100/60 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition cursor-pointer"
                        title="KI schlägt den nächsten kurzen Satz vor (Strg+M)"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Weiter schreiben
                      </button>

                      {dictation.isSupported && (
                        <button
                          type="button"
                          disabled={dictation.isTranscribing && !isDictatingHere}
                          onClick={() => void handleToggleDictation(meta.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-40 ${
                            isDictatingHere
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-100/60"
                          }`}
                          title={
                            dictation.hasAiAssistance
                              ? "Live-Diktat mit automatischen Satzzeichen per KI"
                              : "Live-Diktat über Mikrofon"
                          }
                        >
                          {isDictatingHere && dictation.isTranscribing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isDictatingHere ? (
                            <MicOff className="h-3.5 w-3.5" />
                          ) : (
                            <Mic className="h-3.5 w-3.5" />
                          )}
                          {isDictatingHere && dictation.isTranscribing
                            ? "Formatiere…"
                            : isDictatingHere
                              ? "Diktat beenden"
                              : "Live-Diktat"}
                        </button>
                      )}
                    </div>

                    {draft.assistanceMode === "standard" && (
                      <span className="text-[11px] font-medium text-slate-400">
                        KI-Schubser: {continuationCounts[meta.id]}/2
                      </span>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Bottom Persisted Checklist */}
          <section className="pt-8 border-t border-slate-200 space-y-4">
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Der letzte Blick
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <h3
                className="text-2xl sm:text-3xl font-bold text-slate-800"
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                Ist deine Sage rund?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["placeAndTime", "Ein echter Ort & eine Zeit"],
                    ["secretOrConflict", "Ein Geheimnis oder Konflikt"],
                    ["supernatural", "Etwas Übernatürliches / Besonderes"],
                    ["moralOrMemory", "Eine Lehre oder Erinnerung"],
                  ] as [keyof ChecklistState, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 text-sm text-slate-700 font-semibold cursor-pointer hover:text-emerald-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-2xs"
                  >
                    <input
                      type="checkbox"
                      checked={draft.checklist[key]}
                      onChange={(e) => updateChecklist(key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Clean A4 Print / PDF View (Visible only when printing) */}
      <article className="hidden print:block p-8 max-w-3xl mx-auto text-slate-900 space-y-6">
        <div className="border-b-2 border-emerald-800 pb-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">
            Meine Nacherzählung · 6. Schulstufe
          </p>
          <h1
            className="text-3xl font-bold text-slate-900 mt-1"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            {saga.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {saga.region} · {stats.totalWords} Wörter
          </p>
        </div>

        {SAGA_SECTIONS_META.map((meta) => {
          const content = draft.sections[meta.id].trim();
          if (!content) return null;
          return (
            <section key={meta.id} className="space-y-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900">
                {meta.number}. {meta.shortTitle} ({meta.subtitle})
              </h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
            </section>
          );
        })}

        {saga.glossary && saga.glossary.length > 0 && (
          <section className="pt-6 border-t border-slate-300 space-y-2 break-before-page">
            <h2 className="text-base font-bold text-slate-900">Anhang: B2-Wortschatz</h2>
            <ul className="space-y-1 text-sm">
              {saga.glossary.map((g) => (
                <li key={g.term}>
                  <strong>{g.term}:</strong> {g.explanation}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      {/* Original-Sage Reader Drawer/Modal */}
      {isSourceOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Original-Sage lesen"
          onClick={() => setIsSourceOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{saga.region}</span>
                </div>
                <h3
                  className="font-bold text-xl sm:text-2xl text-slate-900"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                >
                  {saga.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSourceOpen(false)}
                className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-[#fdfbf7] space-y-6">
              {saga.sections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  {sec.heading && (
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      {sec.heading}
                    </h4>
                  )}
                  <p className="text-[15px] leading-[1.8] text-slate-800 font-medium whitespace-pre-wrap">
                    {sec.text}
                  </p>
                </div>
              ))}

              {saga.glossary && saga.glossary.length > 0 && (
                <div className="pt-6 border-t border-[#e5e0d8] space-y-3">
                  <h4 className="font-bold text-base text-slate-900">
                    Wortschatz und Ausdrücke (B2-Glossar)
                  </h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    {saga.glossary.map((item) => (
                      <div key={item.term}>
                        <strong className="text-slate-900">{item.term}:</strong> {item.explanation}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {saga.comprehensionTasks && saga.comprehensionTasks.length > 0 && (
                <div className="pt-6 border-t border-[#e5e0d8] space-y-4">
                  <h4 className="font-bold text-base text-slate-900">
                    Aufgaben zum Textverständnis
                  </h4>
                  <div className="space-y-4 text-sm text-slate-800">
                    {saga.comprehensionTasks.map((task) => (
                      <div key={task.title} className="space-y-1">
                        <div className="font-bold">
                          {task.title}: {task.question}
                        </div>
                        {task.sampleAnswer && (
                          <details className="group cursor-pointer">
                            <summary className="text-amber-800 hover:text-amber-950 text-xs font-bold">
                              ▸ Musterlösung anzeigen
                            </summary>
                            <p className="mt-2 pl-3 text-slate-600 border-l-2 border-[#e5e0d8]">
                              {task.sampleAnswer}
                            </p>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <Link
                href={`/sage/${saga.id}/lesen`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
              >
                <Headphones className="h-4 w-4" />
                Im Lesestudio mit MP3-Hörbuch öffnen
              </Link>
              <Button
                onClick={() => setIsSourceOpen(false)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
              >
                Schließen &amp; Weiter schreiben
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Synonym Replacement Popover Modal (Touch & Desktop friendly) */}
      {synonymTarget && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Alternative Wörter"
          onClick={() => setSynonymTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-50 px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-700" />
                Synonyme für „{synonymTarget.word}“
              </span>
              <button
                type="button"
                onClick={() => setSynonymTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              {synonymTarget.loading ? (
                <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                  Suche passende Alternativen…
                </div>
              ) : (
                <div className="space-y-1.5">
                  {synonymTarget.alternatives.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => handleApplySynonym(alt)}
                      className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-slate-700 hover:text-emerald-900 transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{alt}</span>
                      <span className="text-xs text-emerald-700 font-bold">Ersetzen</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
