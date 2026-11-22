"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Headphones,
  Info,
  Pause,
  PenLine,
  Play,
  ScrollText,
  Sliders,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { VOICE_STORAGE_KEY } from "@/lib/google-voices";
import {
  DEFAULT_READER_SETTINGS,
  READER_DESIGNS_CONFIG,
  loadSavedReaderSettings,
  paginateContent,
  saveReaderSettings,
  splitGermanSentences,
  tokenizeSentenceWords,
  type ReaderDesignTheme,
  type ReaderPage,
  type ReaderSettings,
} from "@/lib/speech-reader";
import { SAGEN_CATALOG, type Saga, type SagaGlossaryItem } from "@/data/sagen-catalog";
import {
  createGlossaryIndex,
  findGlossaryMatch,
  type GlossaryMatcherIndex,
} from "@/lib/glossary-matcher";
import { loadDraft, toggleComprehensionTask } from "@/lib/local-store";
import { useSagaAudioPlayer } from "@/lib/use-saga-audio-player";
import { HdVoiceSelect } from "./HdVoiceSelect";
import { SagaLibrary } from "./SagaLibrary";
import { ReaderSettingsDialog } from "./ReaderSettingsDialog";

/**
 * Minimalistischer Dokument-Abschnittskopf (einheitlich für Buchansicht und Fließtext:
 * linksbündige Kicker-Zeile + klare Überschrift ohne bunte Boxen).
 */
function renderSectionHeader(
  heading: string,
  isActive: boolean,
  onJump: () => void,
  theme: ReaderDesignTheme,
  compact = false
) {
  const match = heading.match(
    /^(\d\.\s*(?:Die Einführung|Das Thema|Die Wende|Das Bleibende))(?::\s*(.*))?$/i
  );

  if (!match) {
    return (
      <h3
        className={`${
          compact ? "text-[1em] sm:text-[1.05em] pt-0.5" : "text-[17px] sm:text-[18px] pt-2"
        } font-bold tracking-tight ${theme.headingClass}`}
      >
        {heading}
      </h3>
    );
  }

  const stage = match[1]!;
  const subtitle = match[2];

  let icon = "📖";
  if (stage.includes("Thema")) icon = "🐉";
  else if (stage.includes("Wende")) icon = "⚔️";
  else if (stage.includes("Bleibende")) icon = "🏰";

  return (
    <div className={compact ? "space-y-1 pt-0.5" : "space-y-2.5"}>
      <button
        type="button"
        onClick={onJump}
        title={`Ab "${stage}" vorlesen`}
        className={`inline-flex items-center gap-1.5 ${
          compact ? "text-[11px]" : "text-xs"
        } font-medium transition-colors duration-150 cursor-pointer ${
          isActive ? theme.accentClass : `${theme.mutedClass} hover:opacity-100`
        }`}
      >
        <span>{icon}</span>
        <span>{stage}</span>
        <span className="opacity-75">· B2 Niveau</span>
      </button>
      {subtitle && (
        <h3
          className={`${
            compact
              ? "text-[1em] sm:text-[1.05em]"
              : "text-[17px] sm:text-[19px]"
          } font-bold tracking-tight ${theme.headingClass} leading-snug`}
        >
          {subtitle}
        </h3>
      )}
    </div>
  );
}

function formatAudioClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface SentenceWordsProps {
  sentText: string;
  globalIdx: number;
  isCurrentSentence: boolean;
  activeWordIdx: number;
  activeWordRef: RefObject<HTMLSpanElement | null>;
  onJumpToWord: (globalIdx: number, wordIdx: number) => void;
  theme: ReaderDesignTheme;
  glossaryIndex?: GlossaryMatcherIndex;
  onGlossaryMatch?: (item: SagaGlossaryItem) => void;
}

/**
 * Rendert die Wörter eines Satzes mit reiner Farb-/Schatten-Markierung (ohne Schriftgewicht-,
 * Padding- oder Border-Änderung), damit Wortbreiten und Zeilenumbrüche beim Mitlesen fix bleiben.
 */
const SentenceWords = memo(function SentenceWords({
  sentText,
  globalIdx,
  isCurrentSentence,
  activeWordIdx,
  activeWordRef,
  onJumpToWord,
  theme,
  glossaryIndex,
  onGlossaryMatch,
}: SentenceWordsProps) {
  const { tokens } = useMemo(() => tokenizeSentenceWords(sentText), [sentText]);

  return (
    <>
      {tokens.map((tok, tIdx) => {
        if (tok.wordIndex === null) {
          return <span key={tIdx}>{tok.text}</span>;
        }
        const wordIdx = tok.wordIndex;
        const isCurrentWord = isCurrentSentence && wordIdx === activeWordIdx;
        const isSpokenWord = isCurrentSentence && wordIdx < activeWordIdx;
        const glossaryHit = glossaryIndex ? findGlossaryMatch(tok.text, glossaryIndex) : null;

        return (
          <span
            key={tIdx}
            ref={isCurrentWord ? activeWordRef : null}
            data-active-word={isCurrentWord ? "true" : undefined}
            data-glossary-term={glossaryHit ? glossaryHit.term : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onJumpToWord(globalIdx, wordIdx);
              if (glossaryHit && onGlossaryMatch) {
                onGlossaryMatch(glossaryHit);
              }
            }}
            className={`cursor-pointer inline rounded-[3px] transition-[background-color,color,box-shadow] duration-150 ease-out ${
              glossaryHit ? "underline decoration-dotted decoration-current/55 underline-offset-4" : ""
            } ${
              isCurrentWord
                ? theme.activeWordClass
                : isSpokenWord
                  ? theme.spokenWordClass
                  : theme.hoverWordClass
            }`}
            title={
              glossaryHit
                ? `${glossaryHit.term}: ${glossaryHit.explanation}`
                : "Klicken, um ab diesem Wort anzuhören"
            }
          >
            {tok.text}
          </span>
        );
      })}
    </>
  );
});

export function SpeechReader({
  initialSagaId,
  initialSaga,
  customSagas = [],
  onExit,
  onBackToHub,
  onStartWriting,
}: {
  initialSagaId?: string;
  initialSaga?: Saga;
  customSagas?: Saga[];
  onExit?: () => void;
  onBackToHub?: () => void;
  onStartWriting?: (saga: Saga) => void;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [activeSaga, setActiveSaga] = useState<Saga | null>(initialSaga ?? null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [activeGlossaryItem, setActiveGlossaryItem] = useState<SagaGlossaryItem | null>(null);
  const [completedTaskTitles, setCompletedTaskTitles] = useState<string[]>([]);
  const [preferOriginalAudio, setPreferOriginalAudio] = useState(Boolean(initialSaga?.audioUrl ?? true));

  // Book Page-Turn Animation States
  const [turnDirection, setTurnDirection] = useState<"next" | "prev" | "none">("none");
  const [isTurning, setIsTurning] = useState(false);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track viewport width so small screens (< lg / 1024px) always turn 1 page at a time
  const [isWideScreen, setIsWideScreen] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => setIsWideScreen(window.innerWidth >= 1024);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const effectiveBookSpread = settings.bookSpread && isWideScreen;

  // Load saved settings on hydration
  useEffect(() => {
    setSettings(loadSavedReaderSettings());
  }, []);

  // Update and persist settings (also sync chosen HD voice to global voice storage)
  const updateSettings = useCallback((next: ReaderSettings) => {
    setSettings(next);
    saveReaderSettings(next);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, next.voiceId);
    } catch {
      /* optional */
    }
  }, []);

  const handleSelectVoice = useCallback(
    (voiceId: string) => {
      setSettings((prev) => {
        const next = { ...prev, voiceId };
        saveReaderSettings(next);
        return next;
      });
      if (activeSaga?.audioUrl) {
        setPreferOriginalAudio(false);
      }
      try {
        localStorage.setItem(VOICE_STORAGE_KEY, voiceId);
      } catch {
        /* optional */
      }
    },
    [activeSaga?.audioUrl]
  );

  // Set initial saga if provided
  useEffect(() => {
    if (initialSaga) {
      setActiveSaga(initialSaga);
      setPreferOriginalAudio(Boolean(initialSaga.audioUrl));
      setIsGlossaryOpen(false);
      return;
    }
    if (initialSagaId) {
      const found =
        customSagas.find((s) => s.id === initialSagaId) ??
        SAGEN_CATALOG.find((s) => s.id === initialSagaId);
      if (found) {
        setActiveSaga(found);
        setPreferOriginalAudio(Boolean(found.audioUrl));
        setIsGlossaryOpen(false);
      }
    }
  }, [initialSaga, initialSagaId, customSagas]);

  // Compute glossary index & load saved task progress whenever activeSaga changes
  const glossaryIndex = useMemo(
    () => createGlossaryIndex(activeSaga?.glossary),
    [activeSaga?.glossary]
  );

  useEffect(() => {
    setActiveGlossaryItem(null);
    if (activeSaga) {
      setCompletedTaskTitles(loadDraft(activeSaga.id).completedTaskTitles);
    } else {
      setCompletedTaskTitles([]);
    }
  }, [activeSaga]);

  const handleToggleTaskDone = useCallback(
    (taskTitle: string) => {
      if (!activeSaga) return;
      const updated = toggleComprehensionTask(activeSaga.id, taskTitle);
      setCompletedTaskTitles(updated.completedTaskTitles);
    },
    [activeSaga]
  );

  // Compute all flattened sentences and per-section offsets for the active saga
  const { allSentences, sectionSentenceOffsets } = useMemo(() => {
    if (!activeSaga) return { allSentences: [] as string[], sectionSentenceOffsets: [] as number[] };
    const flat: string[] = [];
    const offsets: number[] = [];
    for (const sec of activeSaga.sections) {
      offsets.push(flat.length);
      flat.push(...splitGermanSentences(sec.text));
    }
    return { allSentences: flat, sectionSentenceOffsets: offsets };
  }, [activeSaga]);

  // Compute paginated content for "pages" mode
  const pages: ReaderPage[] = useMemo(() => {
    if (!activeSaga) return [];
    return paginateContent(activeSaga.sections, settings.fontSize);
  }, [activeSaga, settings.fontSize]);

  // Ensure currentPage is within range
  useEffect(() => {
    if (currentPage > pages.length && pages.length > 0) {
      setCurrentPage(pages.length);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [pages.length, currentPage]);

  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const lastAutoScrollAtRef = useRef(0);
  const lastAutoScrolledSentenceRef = useRef(-1);

  // Kindle Page Turn Navigation with 3D animation
  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > pages.length) return;
      if (targetPage === currentPage) return;

      const dir = targetPage > currentPage ? "next" : "prev";
      setTurnDirection(dir);
      setIsTurning(true);
      setCurrentPage(targetPage);

      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      turnTimerRef.current = setTimeout(() => {
        setIsTurning(false);
        setTurnDirection("none");
      }, 350);
    },
    [currentPage, pages.length]
  );

  // Auto-page turn logic during speech playback with animated transition
  const handleSentenceChange = useCallback(
    (index: number) => {
      if (settings.mode === "pages" && pages.length > 0) {
        const targetPage = pages.find(
          (p) => index >= p.firstSentenceIndex && index <= p.lastSentenceIndex
        );
        if (targetPage) {
          const targetNum = targetPage.pageNumber;
          if (effectiveBookSpread) {
            const spreadStart = targetNum % 2 === 0 ? targetNum - 1 : targetNum;
            const currentSpreadStart = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
            if (spreadStart !== currentSpreadStart) {
              goToPage(spreadStart);
            }
          } else if (targetNum !== currentPage) {
            goToPage(targetNum);
          }
        }
      }
    },
    [settings.mode, effectiveBookSpread, pages, currentPage, goToPage]
  );

  const useOriginalAudio = Boolean(activeSaga?.audioUrl && preferOriginalAudio);

  // Initialize audio player hook (supports synchronized Original-MP3 + Google Cloud / Gemini HD TTS)
  const {
    hasAudio,
    isTrackMode,
    trackCurrentTime,
    trackDuration,
    isPlaying,
    isPaused,
    isLoading,
    currentSentenceIndex,
    currentWordIndex,
    currentSectionIndex,
    totalSentences,
    error: audioError,
    play,
    pause,
    stop,
    jumpToSentence,
    jumpToWord,
    jumpToSection,
    nextSentence,
    prevSentence,
    seekSentence,
  } = useSagaAudioPlayer({
    sentences: allSentences,
    sectionSentenceOffsets,
    voiceId: settings.voiceId,
    playbackRate: settings.speechRate,
    onSentenceChange: handleSentenceChange,
    audioUrl: activeSaga?.audioUrl,
    audioTimings: activeSaga?.audioTimings,
    audioSpeechSpans: activeSaga?.audioSpeechSpans,
    useOriginalAudio,
  });

  // AUTOSCROLL EFFECT: Führt die Ansicht sanft und entprellt mit, sobald das aktive Wort aus dem Lesefenster wandert
  useEffect(() => {
    if (!settings.autoScroll || currentSentenceIndex < 0) return;
    const rafId = requestAnimationFrame(() => {
      const el = activeWordRef.current;
      if (!el || typeof el.scrollIntoView !== "function") return;
      const rect = el.getBoundingClientRect();
      const topGuard = 84;
      const bottomGuard = window.innerHeight - 104;
      if (rect.top < topGuard || rect.bottom > bottomGuard) {
        const now = performance.now();
        if (
          currentSentenceIndex !== lastAutoScrolledSentenceRef.current ||
          now - lastAutoScrollAtRef.current >= 420
        ) {
          lastAutoScrollAtRef.current = now;
          lastAutoScrolledSentenceRef.current = currentSentenceIndex;
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentSentenceIndex, currentWordIndex, currentPage, settings.autoScroll]);

  // Keyboard navigation for page mode (ArrowLeft, ArrowRight) and Space for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        isSettingsOpen ||
        isGlossaryOpen
      ) {
        return;
      }

      const step = effectiveBookSpread ? 2 : 1;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (settings.mode === "pages" && currentPage < pages.length) {
          e.preventDefault();
          goToPage(Math.min(pages.length, currentPage + step));
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (settings.mode === "pages" && currentPage > 1) {
          e.preventDefault();
          goToPage(Math.max(1, currentPage - step));
        }
      } else if (e.key === " " && hasAudio) {
        e.preventDefault();
        if (isPlaying) {
          pause();
        } else {
          void play();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    settings.mode,
    effectiveBookSpread,
    currentPage,
    pages.length,
    hasAudio,
    isPlaying,
    play,
    pause,
    isSettingsOpen,
    isGlossaryOpen,
    goToPage,
  ]);

  // When changing sagas, reset page and stop audio
  const handleSelectSaga = (saga: Saga) => {
    stop();
    setActiveSaga(saga);
    setPreferOriginalAudio(Boolean(saga.audioUrl));
    setIsGlossaryOpen(false);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToLibrary = () => {
    stop();
    if (onBackToHub) {
      onBackToHub();
      return;
    }
    setActiveSaga(null);
    setIsGlossaryOpen(false);
    setCurrentPage(1);
  };

  // Active reader theme & paper tone (applies uniformly to Book & Flow modes)
  const activeTheme =
    READER_DESIGNS_CONFIG[settings.design] ??
    READER_DESIGNS_CONFIG[DEFAULT_READER_SETTINGS.design];

  // Render library view if no saga is active
  if (!activeSaga) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          {onExit && (
            <Button variant="ghost" onClick={onExit} className="mb-4 gap-2 font-bold">
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Übersicht
            </Button>
          )}

          <SagaLibrary
            onSelectSaga={handleSelectSaga}
            selectedVoiceId={settings.voiceId}
            onSelectVoice={handleSelectVoice}
            customSagas={customSagas}
          />
        </div>
      </div>
    );
  }

  // Active spread calculation for Book Mode (single-page on mobile/tablet < 1024px)
  const leftPageNum = effectiveBookSpread
    ? currentPage % 2 === 0
      ? currentPage - 1
      : currentPage
    : currentPage;
  const rightPageNum = leftPageNum + 1;

  const leftPageData = pages[leftPageNum - 1] ?? pages[0];
  const rightPageData = pages[rightPageNum - 1] ?? null;

  const pageStep = effectiveBookSpread ? 2 : 1;
  const canGoPrevPage = leftPageNum > 1;
  const canGoNextPage = effectiveBookSpread
    ? rightPageNum < pages.length && Boolean(rightPageData)
    : leftPageNum < pages.length;

  const handlePrevPage = () => {
    if (!canGoPrevPage) return;
    goToPage(Math.max(1, leftPageNum - pageStep));
  };

  const handleNextPage = () => {
    if (!canGoNextPage) return;
    goToPage(Math.min(pages.length, leftPageNum + pageStep));
  };

  const handleBookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleBookTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const cycleMobileSpeed = () => {
    const presets = [0.75, 1.0, 1.25, 1.5];
    const next = presets.find((p) => p > settings.speechRate + 0.04) ?? presets[0]!;
    updateSettings({ ...settings, speechRate: next });
  };

  const isBookMode = settings.mode === "pages";

  const renderBookPageSheet = (pageData: ReaderPage, side: "left" | "right") => {
    const showSideClass = side === "right" ? "hidden lg:flex" : "flex";

    return (
      <article
        className={`${showSideClass} relative flex-1 min-h-0 flex-col justify-between rounded-none border-0 px-5 sm:px-11 lg:px-14 pt-5 sm:pt-9 lg:pt-10 pb-4 sm:pb-6 overflow-hidden transition-colors duration-200 ${activeTheme.sheetClass}`}
      >
        <div
          className={`min-h-0 flex-1 overflow-y-auto font-sans text-left text-[0.84em] sm:text-[0.87em] leading-[1.68] space-y-4 px-1 -mx-1 ${activeTheme.proseClass}`}
        >
          {pageData.pageNumber === 1 && (
            <h2
              className={`text-xl sm:text-[22px] font-bold tracking-tight mb-3.5 leading-tight font-sans ${activeTheme.headingClass}`}
            >
              {activeSaga.title}
            </h2>
          )}

          {pageData.paragraphs.map((para, pIdx) => {
            const firstSentenceIndex = para.sentences[0]?.globalIndex;
            let paraSectionIdx = 0;
            if (firstSentenceIndex !== undefined) {
              for (let i = sectionSentenceOffsets.length - 1; i >= 0; i--) {
                if (firstSentenceIndex >= (sectionSentenceOffsets[i] ?? 0)) {
                  paraSectionIdx = i;
                  break;
                }
              }
            }
            const isParaSectionActive =
              paraSectionIdx === currentSectionIndex &&
              (isPlaying || currentSentenceIndex >= 0);

            return (
              <div key={pIdx} className="space-y-2">
                {para.heading &&
                  renderSectionHeader(
                    para.heading,
                    isParaSectionActive,
                    () => {
                      if (firstSentenceIndex !== undefined) {
                        jumpToSentence(firstSentenceIndex);
                      }
                    },
                    activeTheme,
                    true
                  )}

                <p className={`leading-[1.68] ${activeTheme.proseClass}`}>
                  {para.sentences.map((sent, sIdx) => {
                    const isSentActive = sent.globalIndex === currentSentenceIndex;
                    return (
                      <span
                        key={sent.globalIndex}
                        onClick={() => jumpToSentence(sent.globalIndex)}
                        className="cursor-pointer inline"
                      >
                        <SentenceWords
                          sentText={sent.text}
                          globalIdx={sent.globalIndex}
                          isCurrentSentence={isSentActive}
                          activeWordIdx={
                            isSentActive ? Math.max(0, currentWordIndex) : -1
                          }
                          activeWordRef={activeWordRef}
                          onJumpToWord={jumpToWord}
                          theme={activeTheme}
                          glossaryIndex={glossaryIndex}
                          onGlossaryMatch={setActiveGlossaryItem}
                        />
                        {sIdx < para.sentences.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })}
        </div>

        <footer
          className={`pt-3 shrink-0 font-sans text-xs tabular-nums select-none flex items-center justify-between gap-2 ${activeTheme.mutedClass}`}
        >
          {side === "right" ? (
            <span className="ml-auto" aria-label={`Seite ${pageData.pageNumber}`}>
              {pageData.pageNumber}
            </span>
          ) : (
            <>
              <span aria-label={`Seite ${pageData.pageNumber}`}>{pageData.pageNumber}</span>
              {pages.length > 1 && pageData.pageNumber === 1 && (
                <span className="lg:hidden text-[10px] opacity-60 font-medium">
                  ← Wischen zum Blättern →
                </span>
              )}
            </>
          )}
        </footer>
      </article>
    );
  };

  return (
    <div
      className={`${
        activeTheme.isDark ? "dark [color-scheme:dark]" : "[color-scheme:light]"
      } transition-colors duration-200 select-none ${
        !isBookMode
          ? `fixed inset-0 z-30 flex flex-col overflow-y-auto ${activeTheme.viewportClass}`
          : `fixed inset-0 z-30 flex flex-col overflow-hidden ${activeTheme.viewportClass}`
      }`}
      style={{ fontSize: `${settings.fontSize}px` }}
    >
      {/* 1. TOP CONTROL BAR */}
      <header
        className={`shrink-0 pt-safe z-40 border-b flex items-center transition-colors ${activeTheme.chromeClass}`}
      >
        <div className="mx-auto flex h-13 sm:h-12 w-full max-w-7xl items-center justify-between gap-1.5 px-2.5 sm:px-6">
          {/* Back button & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLibrary}
              className="h-9 sm:h-8 gap-1 font-bold hover:bg-black/5 dark:hover:bg-white/5 px-2 shrink-0"
              aria-label="Zurück zur Sagen-Auswahl"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Alle Sagen</span>
            </Button>

            {onExit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  stop();
                  onExit();
                }}
                className="h-8 gap-1 font-bold text-xs text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 px-2 hidden sm:inline-flex"
                title="Lesemodus beenden und zurück zum Sprachtrainer"
              >
                <span>Übersicht</span>
              </Button>
            )}

            <div className="min-w-0 border-l border-foreground/15 pl-2 sm:pl-3 flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold truncate max-w-[115px] sm:max-w-[200px] md:max-w-none">
                {activeSaga.title}
              </h1>
              <div className="hidden sm:block">
                <HdVoiceSelect
                  compact
                  value={settings.voiceId}
                  onChange={handleSelectVoice}
                  ariaLabel="Google Cloud / Gemini HD Stimme wählen"
                />
              </div>
            </div>
          </div>

          {/* Controls: Audio source, Glossary, Spread, Mode switch (Buch vs Scroll), Settings */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {activeSaga.audioUrl && (
              <button
                type="button"
                onClick={() => setPreferOriginalAudio((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 rounded-full border px-2 sm:px-2.5 text-xs font-semibold transition cursor-pointer ${
                  useOriginalAudio
                    ? activeTheme.isDark
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                      : "border-amber-600/45 bg-amber-500/15 text-amber-900 hover:bg-amber-500/25"
                    : activeTheme.chromePillClass
                }`}
                title={
                  useOriginalAudio
                    ? "Original-Hörbuch (MP3) aktiv – klicken für Google Cloud KI-Stimme"
                    : "Zur Original-MP3-Audiodatei wechseln"
                }
              >
                <Headphones className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {useOriginalAudio ? "Original-MP3" : "KI-Stimme"}
                </span>
              </button>
            )}

            {(activeSaga.glossary?.length || activeSaga.comprehensionTasks?.length) && (
              <button
                type="button"
                onClick={() => setIsGlossaryOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 rounded-full border px-2 sm:px-2.5 text-xs font-semibold transition cursor-pointer ${activeTheme.chromePillClass}`}
                title="Wortschatz (B2-Glossar) und Aufgaben zum Textverständnis öffnen"
              >
                <BookMarked className="h-3.5 w-3.5 text-primary" />
                <span className="hidden xl:inline">Glossar &amp; Aufgaben</span>
                <span className="xl:hidden hidden sm:inline">Glossar</span>
              </button>
            )}

            {isBookMode && (
              <button
                type="button"
                onClick={() => updateSettings({ ...settings, bookSpread: !settings.bookSpread })}
                className={`hidden lg:inline-flex items-center gap-1.5 h-8 rounded-full border px-2.5 text-xs font-semibold transition cursor-pointer ${activeTheme.chromePillClass}`}
                title={settings.bookSpread ? "Zu Einzelseite wechseln" : "Zu Doppelseite wechseln"}
              >
                <Columns2 className="h-3.5 w-3.5 text-primary" />
                <span>{settings.bookSpread ? "Doppelseite" : "Einzelseite"}</span>
              </button>
            )}

            {/* View Mode Toggle: Book vs Scroll */}
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  ...settings,
                  mode: isBookMode ? "scroll" : "pages",
                })
              }
              className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 rounded-full border border-foreground/20 px-2 sm:px-2.5 text-xs font-bold transition hover:bg-foreground/5 cursor-pointer"
              title="Zwischen Buch-Darstellung (ohne Scrollen) und Fließtext umschalten"
            >
              {isBookMode ? (
                <>
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Buchansicht</span>
                </>
              ) : (
                <>
                  <ScrollText className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Fließtext</span>
                </>
              )}
            </button>

            {/* Settings button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 sm:h-8 gap-1.5 text-xs font-bold border-foreground/20 px-2 sm:px-3"
              title={`Ansicht, Papierton (${activeTheme.label}), Tempo & Mitlesen anpassen`}
            >
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full border border-black/20 dark:border-white/25 shrink-0"
                style={{ backgroundColor: activeTheme.swatchBg }}
              />
              <span className="hidden sm:inline">Ansicht & Tempo</span>
            </Button>

            {onStartWriting && (
              <Button
                size="sm"
                onClick={() => {
                  stop();
                  onStartWriting(activeSaga);
                }}
                className="h-9 sm:h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3.5 shadow-sm"
                title="Weiter zu Schritt 02: Diese Sage in eigenen Worten nacherzählen"
              >
                <PenLine className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Nacherzählen</span>
              </Button>
            )}

            <ApiKeyMenu compact variant="adaptive" />
          </div>
        </div>
      </header>

      {/* 2. MAIN READING CANVAS */}
      <main
        className={
          isBookMode
            ? "flex-1 min-h-0 flex flex-col justify-center items-center px-1.5 sm:px-6 lg:px-14 pt-1 pb-28 sm:pb-24 overflow-hidden relative"
            : "flex-1 pb-32 sm:pb-28 pt-3 sm:pt-8"
        }
      >
        {/* A. KLARE DOPPELSEITEN-BUCHANSICHT WIE IM ANHANG */}
        {isBookMode && leftPageData && (
          <div
            className={`relative w-full h-full max-h-[calc(100dvh-164px)] sm:max-h-[calc(100dvh-118px)] flex flex-col justify-center items-center ${
              effectiveBookSpread && rightPageData ? "max-w-[1060px]" : "max-w-[560px]"
            }`}
          >
            {/* Desktop Linker Schwebender Blätter-Button */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={!canGoPrevPage}
              className={`hidden lg:flex absolute -left-5 xl:-left-14 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full border shadow-xl hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition cursor-pointer ${activeTheme.navOrbClass}`}
              title="Vorherige Seite (Pfeiltaste links)"
              aria-label="Vorherige Seite"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Desktop Rechter Schwebender Blätter-Button */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!canGoNextPage}
              className={`hidden lg:flex absolute -right-5 xl:-right-14 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full border shadow-xl hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none transition cursor-pointer ${activeTheme.navOrbClass}`}
              title="Nächste Seite (Pfeiltaste rechts)"
              aria-label="Nächste Seite"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Buchblatt / Doppelseite im einheitlichen Lesemodus-Farbschema (mit Touch-Wischen) */}
            <div
              onTouchStart={handleBookTouchStart}
              onTouchEnd={handleBookTouchEnd}
              className={`relative w-full flex-1 min-h-0 flex overflow-hidden rounded-[4px] border transition-colors duration-200 ${activeTheme.spreadWrapperClass}`}
            >
              {/* Klick-Blätter-Zone links */}
              <div
                onClick={handlePrevPage}
                className={`absolute left-0 inset-y-0 w-[8%] sm:w-[6%] z-20 cursor-pointer flex items-center justify-start pl-1.5 transition-opacity group ${
                  !canGoPrevPage ? "pointer-events-none opacity-0" : activeTheme.hoverZoneClass
                }`}
                title="Vorherige Seite"
              >
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${activeTheme.hoverZoneIconClass}`}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Klick-Blätter-Zone rechts */}
              <div
                onClick={handleNextPage}
                className={`absolute right-0 inset-y-0 w-[8%] sm:w-[6%] z-20 cursor-pointer flex items-center justify-end pr-1.5 transition-opacity group ${
                  !canGoNextPage
                    ? "pointer-events-none opacity-0"
                    : activeTheme.hoverZoneClass
                }`}
                title="Nächste Seite"
              >
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${activeTheme.hoverZoneIconClass}`}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Doppelseiten-Canvas */}
              <div
                key={`${leftPageNum}-${turnDirection}-${isTurning ? "anim" : "static"}`}
                className={`flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden ${
                  isTurning
                    ? turnDirection === "next"
                      ? "animate-kindle-next"
                      : "animate-kindle-prev"
                    : ""
                }`}
              >
                {renderBookPageSheet(leftPageData, "left")}

                {effectiveBookSpread && rightPageData && (
                  <div
                    className={`hidden lg:block w-[2px] shrink-0 ${activeTheme.spineClass}`}
                    aria-hidden="true"
                  />
                )}

                {effectiveBookSpread && rightPageData && renderBookPageSheet(rightPageData, "right")}
              </div>
            </div>
          </div>
        )}

        {/* B. FLIESSTEXT MODUS (RUHIGES DOKUMENT-BLATT IM GEWÄHLTEN PAPIERTON) */}
        {!isBookMode && (
          <div className="mx-auto w-full max-w-[780px] px-2.5 sm:px-6 pt-2 sm:pt-4 pb-6">
            <article
              className={`rounded-[4px] border shadow-[0_14px_40px_rgba(0,0,0,0.18)] px-5 sm:px-14 md:px-16 py-6 sm:py-12 transition-colors duration-200 ${activeTheme.sheetClass}`}
            >
              <h2
                className={`text-2xl sm:text-[28px] font-bold tracking-tight mb-5 leading-tight font-sans ${activeTheme.headingClass}`}
              >
                {activeSaga.title}
              </h2>

              <div className="font-sans space-y-8 text-left">
                {activeSaga.sections.map((section, sIdx) => {
                  const sectionSentences = splitGermanSentences(section.text);
                  const baseOffset = sectionSentenceOffsets[sIdx] ?? 0;
                  const isSectionActive =
                    currentSectionIndex === sIdx && (isPlaying || currentSentenceIndex >= 0);

                  return (
                    <section key={sIdx} className="space-y-3">
                      {section.heading &&
                        renderSectionHeader(
                          section.heading,
                          isSectionActive,
                          () => jumpToSection(sIdx),
                          activeTheme
                        )}
                      <p className={`text-[0.95em] leading-[1.78] ${activeTheme.proseClass}`}>
                        {sectionSentences.map((sentText, localIdx) => {
                          const globalIdx = baseOffset + localIdx;
                          const isSentActive = globalIdx === currentSentenceIndex;

                          return (
                            <span
                              key={localIdx}
                              onClick={() => jumpToSentence(globalIdx)}
                              className="cursor-pointer inline"
                            >
                              <SentenceWords
                                sentText={sentText}
                                globalIdx={globalIdx}
                                isCurrentSentence={isSentActive}
                                activeWordIdx={
                                  isSentActive
                                    ? Math.max(0, currentWordIndex)
                                    : -1
                                }
                                activeWordRef={activeWordRef}
                                onJumpToWord={jumpToWord}
                                theme={activeTheme}
                                glossaryIndex={glossaryIndex}
                                onGlossaryMatch={setActiveGlossaryItem}
                              />
                              {localIdx < sectionSentences.length - 1 ? " " : ""}
                            </span>
                          );
                        })}
                      </p>
                    </section>
                  );
                })}
              </div>

              <aside
                className={`mt-10 pt-6 border-t space-y-6 text-xs sm:text-sm font-sans ${activeTheme.borderSubtleClass} ${activeTheme.mutedClass}`}
              >
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 font-semibold ${activeTheme.headingClass}`}>
                    <Info className={`h-4 w-4 ${activeTheme.mutedClass}`} />
                    <span>Hintergrund &amp; Sagenkunde</span>
                  </div>
                  <p className="leading-relaxed">{activeSaga.historicalContext}</p>
                </div>

                {activeSaga.glossary && activeSaga.glossary.length > 0 && (
                  <div className={`space-y-2.5 pt-4 border-t ${activeTheme.borderSubtleClass}`}>
                    <h3 className={`font-semibold ${activeTheme.headingClass}`}>
                      Wortschatz und Ausdrücke (B2-Glossar)
                    </h3>
                    <ul className="space-y-1.5 leading-relaxed">
                      {activeSaga.glossary.map((item) => (
                        <li key={item.term}>
                          <strong className={activeTheme.headingClass}>{item.term}:</strong>{" "}
                          {item.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeSaga.comprehensionTasks && activeSaga.comprehensionTasks.length > 0 && (
                  <div className={`space-y-2.5 pt-4 border-t ${activeTheme.borderSubtleClass}`}>
                    <h3 className={`font-semibold ${activeTheme.headingClass}`}>
                      Aufgaben zum Textverständnis
                    </h3>
                    <ol className="space-y-2 leading-relaxed">
                      {activeSaga.comprehensionTasks.map((task) => (
                        <li key={task.title} className="space-y-1">
                          <div>
                            <strong className={activeTheme.headingClass}>{task.title}:</strong>{" "}
                            {task.question}
                          </div>
                          {task.sampleAnswer && (
                            <details className={`text-[11px] sm:text-xs pl-1 ${activeTheme.mutedClass}`}>
                              <summary
                                className={`cursor-pointer select-none font-medium hover:underline transition ${activeTheme.accentClass}`}
                              >
                                Musterlösung anzeigen
                              </summary>
                              <p className={`mt-1 leading-relaxed ${activeTheme.proseClass}`}>
                                {task.sampleAnswer}
                              </p>
                            </details>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </aside>
            </article>
          </div>
        )}
      </main>

      {/* 3. EINGEFRORENE STEUERUNGSKONSOLE AM UNTEREN BILDSCHIRMRAND (FROZEN BOTTOM CONTROL CONSOLE) */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 border-t shadow-2xl transition-colors pb-safe ${activeTheme.chromeClass}`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-6 py-2">
          {/* Mobile Row 1 / Desktop Center: Google Cloud / Gemini HD Player */}
          <div className="order-1 sm:order-2 flex items-center gap-1.5 min-w-0 sm:flex-1 justify-center">
            {audioError && (
              <span
                role="alert"
                className="text-[11px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded max-w-[160px] sm:max-w-[260px] truncate"
                title={audioError}
              >
                {audioError}
              </span>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={prevSentence}
              disabled={!hasAudio || currentSentenceIndex <= 0}
              title="Vorheriger Satz"
              aria-label="Vorheriger Satz"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full border-foreground/20 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => {
                if (!hasAudio) return;
                if (isPlaying) pause();
                else void play();
              }}
              disabled={!hasAudio}
              className={`h-10 sm:h-9 px-4 rounded-full font-bold gap-1.5 shadow-sm text-xs transition shrink-0 ${
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>{isLoading ? "Lädt …" : "Pause"}</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isPaused ? "Weiter" : "Abspielen"}</span>
                </>
              )}
            </Button>

            {(isPlaying || isPaused || currentSentenceIndex >= 0) && (
              <Button
                variant="outline"
                size="icon"
                onClick={stop}
                title="Wiedergabe stoppen & zurück zum Anfang"
                aria-label="Hörbuch stoppen"
                className="h-9 w-9 sm:h-8 sm:w-8 rounded-full border-foreground/20 text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={nextSentence}
              disabled={!hasAudio || currentSentenceIndex >= totalSentences - 1}
              title="Nächster Satz"
              aria-label="Nächster Satz"
              className="h-9 w-9 sm:h-8 sm:w-8 rounded-full border-foreground/20 shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Mobile Quick-Speed Pill (cycles 0.75× / 1.00× / 1.25× / 1.50×) */}
            <button
              type="button"
              onClick={cycleMobileSpeed}
              className="sm:hidden h-9 px-2.5 rounded-full border border-foreground/20 bg-background/80 font-mono text-[11px] font-bold text-primary tabular-nums shrink-0 active:scale-95 transition"
              title="Tempo umschalten (0.75×, 1.00×, 1.25×, 1.50×)"
              aria-label={`Tempo wechseln, aktuell ${settings.speechRate.toFixed(2)}×`}
            >
              {settings.speechRate.toFixed(2)}×
            </button>

            {/* Interaktive Satz-Fortschrittsleiste (Tablet/Desktop) */}
            {hasAudio && totalSentences > 0 && (
              <div className="hidden md:flex items-center gap-2 pl-1.5 min-w-[140px] max-w-[260px] flex-1">
                <span className="font-mono text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">
                  {isTrackMode && (trackDuration > 0 || activeSaga.audioDurationSec)
                    ? `${formatAudioClock(trackCurrentTime)} / ${formatAudioClock(trackDuration || activeSaga.audioDurationSec || 0)} · `
                    : ""}
                  Satz {Math.max(0, currentSentenceIndex + 1)}/{totalSentences}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalSentences - 1)}
                  step={1}
                  value={Math.max(0, currentSentenceIndex)}
                  onChange={(e) => seekSentence(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Satz-Position"
                  title="Direkt zu einer Satzstelle springen"
                />
              </div>
            )}
          </div>

          {/* Mobile Row 2 / Desktop Left & Right via sm:contents */}
          <div className="order-2 flex items-center justify-between gap-2 sm:contents">
            {/* Konsole 1: Buchseiten-Steuerung (im Buchmodus) */}
            {isBookMode ? (
              <div className="sm:order-1 flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={!canGoPrevPage}
                  className="h-9 sm:h-8 gap-1 font-bold text-xs px-2.5 rounded-lg border-foreground/20 hover:bg-foreground/5"
                  title={effectiveBookSpread ? "Vorherige Doppelseite (Pfeiltaste links)" : "Vorherige Seite"}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden md:inline">{effectiveBookSpread ? "Zurück" : "Vorherige"}</span>
                </Button>

                <span className="bg-foreground/5 px-2.5 py-1 rounded-lg border border-foreground/15 text-xs font-bold whitespace-nowrap tabular-nums">
                  {effectiveBookSpread && rightPageData
                    ? `S. ${leftPageNum}–${rightPageNum} / ${pages.length}`
                    : `S. ${leftPageNum} / ${pages.length}`}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!canGoNextPage}
                  className="h-9 sm:h-8 gap-1 font-bold text-xs px-2.5 rounded-lg border-foreground/20 hover:bg-foreground/5"
                  title={effectiveBookSpread ? "Nächste Doppelseite (Pfeiltaste rechts)" : "Nächste Seite"}
                >
                  <span className="hidden md:inline">{effectiveBookSpread ? "Weiter" : "Nächste"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="sm:order-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground shrink-0">
                <ScrollText className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Fließtext</span>
                {hasAudio && totalSentences > 0 && (
                  <span className="sm:hidden font-mono text-[11px] tabular-nums">
                    Satz {Math.max(0, currentSentenceIndex + 1)}/{totalSentences}
                  </span>
                )}
              </div>
            )}

            {/* Konsole 3: Stufenloses Tempo & Mitlesen */}
            <div className="sm:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Stufenloser Abspielgeschwindigkeits-Regler (Desktop/Tablet) */}
              <div
                className="hidden sm:flex items-center gap-1 sm:gap-1.5 rounded-lg border border-foreground/15 bg-background/90 px-1.5 sm:px-2 py-1 shadow-xs"
                title={`Abspielgeschwindigkeit stufenlos einstellen (aktuell: ${settings.speechRate.toFixed(2)}×)`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0.5, Math.round((settings.speechRate - 0.05) * 100) / 100);
                    updateSettings({ ...settings, speechRate: next });
                  }}
                  disabled={settings.speechRate <= 0.5}
                  className="h-5 w-5 rounded flex items-center justify-center text-xs font-black text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Langsamer (-0.05×)"
                  aria-label="Abspielgeschwindigkeit langsamer"
                >
                  −
                </button>

                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.speechRate}
                  onChange={(e) => {
                    updateSettings({ ...settings, speechRate: parseFloat(e.target.value) });
                  }}
                  className="w-12 sm:w-20 md:w-24 h-1.5 bg-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  aria-label="Abspielgeschwindigkeit stufenlos einstellen"
                />

                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(2.0, Math.round((settings.speechRate + 0.05) * 100) / 100);
                    updateSettings({ ...settings, speechRate: next });
                  }}
                  disabled={settings.speechRate >= 2.0}
                  className="h-5 w-5 rounded flex items-center justify-center text-xs font-black text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Schneller (+0.05×)"
                  aria-label="Abspielgeschwindigkeit schneller"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ ...settings, speechRate: 1.0 });
                  }}
                  className="font-mono text-[11px] font-bold text-primary hover:underline px-1 rounded hover:bg-primary/10 transition tabular-nums shrink-0"
                  title="Klicken für 1.00× (Normaltempo)"
                >
                  {settings.speechRate.toFixed(2)}×
                </button>
              </div>

              {/* Autoscroll Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ ...settings, autoScroll: !settings.autoScroll })}
                className={`h-9 sm:h-7 px-2.5 sm:px-2 text-xs font-bold rounded-lg border transition ${
                  settings.autoScroll
                    ? "bg-emerald-600/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "border-foreground/15 text-muted-foreground"
                }`}
                title="Automatisches Mitführen & Umblättern aktivieren/deaktivieren"
              >
                <span>Mitlesen: {settings.autoScroll ? "An" : "Aus"}</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* 3b. FLOATING IN-TEXT B2 GLOSSARY POPUP */}
      {activeGlossaryItem && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-28 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md font-sans"
        >
          <div
            className={`rounded-2xl border p-4 shadow-2xl flex items-start justify-between gap-3 ${activeTheme.sheetClass}`}
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.accentClass}`}
                >
                  B2-Worterklärung
                </span>
              </div>
              <div className={`text-sm font-bold ${activeTheme.headingClass}`}>
                {activeGlossaryItem.term}
              </div>
              <p className={`text-xs leading-relaxed ${activeTheme.proseClass}`}>
                {activeGlossaryItem.explanation}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveGlossaryItem(null)}
                aria-label="Worterklärung schließen"
                className="p-1 rounded-full hover:bg-foreground/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveGlossaryItem(null);
                  setIsGlossaryOpen(true);
                }}
                className={`text-[11px] font-bold hover:underline cursor-pointer ${activeTheme.accentClass}`}
              >
                Alle Begriffe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODALS & DIALOGS */}
      {isGlossaryOpen &&
        (activeSaga.glossary?.length || activeSaga.comprehensionTasks?.length) && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 select-text"
            role="dialog"
            aria-modal="true"
            aria-label="Wortschatz und Aufgaben zum Textverständnis"
            onClick={() => setIsGlossaryOpen(false)}
          >
            <div
              className={`w-full max-w-2xl max-h-[90dvh] sm:max-h-[82dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border-t sm:border p-5 sm:p-6 pb-safe sm:pb-6 shadow-2xl space-y-5 sm:space-y-6 font-sans ${activeTheme.sheetClass}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-foreground/20 sm:hidden" aria-hidden="true" />
              <div className={`flex items-center justify-between gap-4 border-b pb-3 ${activeTheme.borderSubtleClass}`}>
                <div>
                  <h2 className={`text-base sm:text-lg font-bold ${activeTheme.headingClass}`}>
                    {activeSaga.title}
                  </h2>
                  <p className={`text-xs ${activeTheme.mutedClass}`}>
                    Wortschatz (B2-Glossar) &amp; Aufgaben zum Textverständnis
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsGlossaryOpen(false)}
                  aria-label="Glossar schließen"
                  className="h-9 w-9 sm:h-8 sm:w-8 rounded-full hover:bg-foreground/10 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {activeSaga.glossary && activeSaga.glossary.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className={`text-sm font-bold ${activeTheme.accentClass}`}>
                    Wortschatz und Ausdrücke (B2-Glossar)
                  </h3>
                  <ul className={`space-y-2 text-xs sm:text-sm leading-relaxed ${activeTheme.proseClass}`}>
                    {activeSaga.glossary.map((item) => (
                      <li key={item.term} className="rounded-lg bg-foreground/[0.04] px-3 py-2">
                        <strong className={activeTheme.headingClass}>{item.term}:</strong>{" "}
                        {item.explanation}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {activeSaga.comprehensionTasks && activeSaga.comprehensionTasks.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-bold ${activeTheme.accentClass}`}>
                      Aufgaben zum Textverständnis
                    </h3>
                    <span className={`text-xs font-semibold ${activeTheme.mutedClass}`}>
                      {completedTaskTitles.length}/{activeSaga.comprehensionTasks.length} erledigt
                    </span>
                  </div>
                  <ol className={`space-y-2 text-xs sm:text-sm leading-relaxed ${activeTheme.proseClass}`}>
                    {activeSaga.comprehensionTasks.map((task) => {
                      const isDone = completedTaskTitles.includes(task.title);
                      return (
                        <li key={task.title} className="rounded-lg bg-foreground/[0.04] px-3 py-2.5 space-y-1.5">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => handleToggleTaskDone(task.title)}
                              className="mt-1 h-4 w-4 rounded border-foreground/30 accent-emerald-600 cursor-pointer shrink-0"
                            />
                            <span className={isDone ? "line-through opacity-70" : ""}>
                              <strong className={activeTheme.headingClass}>{task.title}:</strong>{" "}
                              {task.question}
                            </span>
                          </label>
                          {task.sampleAnswer && (
                            <details className={`pl-6 text-xs ${activeTheme.mutedClass}`}>
                              <summary className={`cursor-pointer select-none font-medium hover:underline transition ${activeTheme.accentClass}`}>
                                Musterlösung anzeigen
                              </summary>
                              <p className={`mt-1 leading-relaxed ${activeTheme.proseClass}`}>
                                {task.sampleAnswer}
                              </p>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {onStartWriting && (
                <div className={`pt-4 border-t flex justify-end ${activeTheme.borderSubtleClass}`}>
                  <Button
                    onClick={() => {
                      setIsGlossaryOpen(false);
                      stop();
                      onStartWriting(activeSaga);
                    }}
                    className="w-full sm:w-auto min-h-[44px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <PenLine className="h-4 w-4" />
                    Verstanden – Jetzt selbst nacherzählen
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      <ReaderSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
      />
    </div>
  );
}
