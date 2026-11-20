"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pauseGoogleSpeech,
  prefetchGoogleSpeech,
  resumeGoogleSpeech,
  speakGoogle,
  stopGoogleSpeech,
  updateCurrentPlaybackRate,
} from "./google-speech";
import { estimateTimeForWordInSpan, estimateWordIndexInSpan } from "./speech-reader";

function findSectionForSentence(
  sentenceIndex: number,
  sectionOffsets: readonly number[]
): number {
  if (sentenceIndex < 0 || sectionOffsets.length === 0) return 0;
  let sectionIdx = 0;
  for (let i = 0; i < sectionOffsets.length; i++) {
    if (sentenceIndex >= (sectionOffsets[i] ?? 0)) {
      sectionIdx = i;
    } else {
      break;
    }
  }
  return sectionIdx;
}

function findSentenceAtTime(
  currentTimeSec: number,
  timings: readonly number[] | undefined,
  totalSentences: number,
  durationSec: number
): number {
  if (totalSentences <= 0) return 0;
  if (timings && timings.length > 0) {
    let matched = 0;
    const t = currentTimeSec + 0.08;
    const limit = Math.min(timings.length, totalSentences);
    for (let i = 0; i < limit; i++) {
      if (t >= (timings[i] ?? 0)) {
        matched = i;
      } else {
        break;
      }
    }
    return matched;
  }
  if (durationSec > 0 && Number.isFinite(durationSec)) {
    const ratio = Math.max(0, Math.min(0.9999, currentTimeSec / durationSec));
    return Math.min(totalSentences - 1, Math.floor(ratio * totalSentences));
  }
  return 0;
}

export function useSagaAudioPlayer({
  sentences,
  sectionSentenceOffsets,
  voiceId,
  playbackRate = 1.0,
  onSentenceChange,
  audioUrl,
  audioTimings,
  audioSpeechSpans,
  useOriginalAudio = false,
}: {
  sentences: readonly string[];
  sectionSentenceOffsets: readonly number[];
  voiceId: string;
  playbackRate?: number;
  onSentenceChange?: (sentenceIndex: number) => void;
  audioUrl?: string | undefined;
  audioTimings?: readonly number[] | undefined;
  audioSpeechSpans?: readonly [number, number][] | undefined;
  useOriginalAudio?: boolean | undefined;
}) {
  const isTrackMode = Boolean(useOriginalAudio && audioUrl);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [trackCurrentTime, setTrackCurrentTime] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [error, setError] = useState("");

  const sentencesRef = useRef(sentences);
  const offsetsRef = useRef(sectionSentenceOffsets);
  const voiceRef = useRef(voiceId);
  const rateRef = useRef(playbackRate);
  const onSentenceChangeRef = useRef(onSentenceChange);
  const isTrackModeRef = useRef(isTrackMode);
  const audioUrlRef = useRef(audioUrl);
  const timingsRef = useRef(audioTimings);
  const speechSpansRef = useRef(audioSpeechSpans);

  const epochRef = useRef(0);
  const trackEpochRef = useRef(0);
  const ctrlRef = useRef<AbortController | null>(null);
  const activeIndexRef = useRef(-1);
  const activeWordIndexRef = useRef(-1);
  const lastClockSecRef = useRef(-1);
  const lastDurationRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  const trackAudioRef = useRef<HTMLAudioElement | null>(null);
  const trackAudioUrlLoadedRef = useRef<string | undefined>(undefined);
  const pendingSeekRef = useRef<number | null>(null);

  sentencesRef.current = sentences;
  offsetsRef.current = sectionSentenceOffsets;
  rateRef.current = playbackRate;
  onSentenceChangeRef.current = onSentenceChange;
  isTrackModeRef.current = isTrackMode;
  audioUrlRef.current = audioUrl;
  timingsRef.current = audioTimings;
  speechSpansRef.current = audioSpeechSpans;
  isPlayingRef.current = isPlaying;
  isPausedRef.current = isPaused;

  const cancelSpeechWork = useCallback(() => {
    epochRef.current += 1;
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    stopGoogleSpeech();
  }, []);

  const cleanupTrackAudio = useCallback(() => {
    trackEpochRef.current += 1;
    pendingSeekRef.current = null;
    const audio = trackAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* ignore */
    }
    trackAudioRef.current = null;
    trackAudioUrlLoadedRef.current = undefined;
  }, []);

  const getSpeechSpanForSentence = useCallback(
    (sentenceIdx: number, totalDurationSec = 0): [number, number] => {
      const explicitSpan = speechSpansRef.current?.[sentenceIdx];
      if (explicitSpan) {
        return explicitSpan;
      }
      const timings = timingsRef.current;
      const len = sentencesRef.current.length;
      if (timings && timings[sentenceIdx] !== undefined) {
        const start = timings[sentenceIdx]!;
        const nextStart =
          timings[sentenceIdx + 1] ?? (totalDurationSec > start ? totalDurationSec : start + 5);
        const end = Math.max(start + 0.3, nextStart - 0.25);
        return [start, end];
      }
      const dur = totalDurationSec > 0 ? totalDurationSec : Math.max(len * 4, 1);
      return [(sentenceIdx / Math.max(1, len)) * dur, ((sentenceIdx + 1) / Math.max(1, len)) * dur];
    },
    []
  );

  const syncTrackStateFromAudio = useCallback(
    (audio: HTMLAudioElement, forceClockUpdate = false) => {
      if (pendingSeekRef.current !== null) {
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = pendingSeekRef.current;
          } catch {
            /* ignore */
          }
          pendingSeekRef.current = null;
        } else if (pendingSeekRef.current <= 0.05) {
          pendingSeekRef.current = null;
        } else {
          return;
        }
      }
      const curTime = audio.currentTime || 0;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const displaySec = Math.floor(curTime);
      if (forceClockUpdate || displaySec !== lastClockSecRef.current) {
        lastClockSecRef.current = displaySec;
        setTrackCurrentTime(curTime);
      }
      if (dur > 0 && dur !== lastDurationRef.current) {
        lastDurationRef.current = dur;
        setTrackDuration(dur);
      }

      const idx = findSentenceAtTime(
        curTime,
        timingsRef.current,
        sentencesRef.current.length,
        dur
      );
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx;
        setCurrentSentenceIndex(idx);
        setCurrentSectionIndex(findSectionForSentence(idx, offsetsRef.current));
        onSentenceChangeRef.current?.(idx);
      }

      const sentText = sentencesRef.current[idx] ?? "";
      const [s0, s1] = getSpeechSpanForSentence(idx, dur);
      const wordIdx = estimateWordIndexInSpan(sentText, curTime, s0, s1);
      if (wordIdx !== activeWordIndexRef.current) {
        activeWordIndexRef.current = wordIdx;
        setCurrentWordIndex(wordIdx);
      }
    },
    [getSpeechSpanForSentence]
  );

  const ensureTrackAudio = useCallback((): HTMLAudioElement | null => {
    const rawUrl = audioUrlRef.current;
    if (!rawUrl || typeof Audio === "undefined") return null;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "/";
    const url = rawUrl.startsWith("/")
      ? `${base.endsWith("/") ? base : `${base}/`}${rawUrl.slice(1)}`
      : rawUrl;

    if (trackAudioRef.current && trackAudioUrlLoadedRef.current === url) {
      return trackAudioRef.current;
    }

    cleanupTrackAudio();
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.playbackRate = Math.max(0.5, Math.min(2.0, rateRef.current));
    if ("preservesPitch" in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }

    audio.addEventListener("loadedmetadata", () => {
      if (trackAudioRef.current !== audio) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTrackDuration(audio.duration);
      }
      if (pendingSeekRef.current !== null) {
        try {
          audio.currentTime = pendingSeekRef.current;
        } catch {
          /* ignore */
        }
        pendingSeekRef.current = null;
      }
    });

    audio.addEventListener("waiting", () => {
      if (trackAudioRef.current === audio && isPlayingRef.current) {
        setIsLoading(true);
      }
    });

    audio.addEventListener("playing", () => {
      if (trackAudioRef.current !== audio) return;
      setIsLoading(false);
    });

    audio.addEventListener("canplay", () => {
      if (trackAudioRef.current !== audio) return;
      setIsLoading(false);
    });

    audio.addEventListener("timeupdate", () => {
      if (trackAudioRef.current !== audio) return;
      if (!isPlayingRef.current && !isPausedRef.current) return;
      syncTrackStateFromAudio(audio, true);
    });

    audio.addEventListener("ended", () => {
      if (trackAudioRef.current !== audio) return;
      activeIndexRef.current = -1;
      activeWordIndexRef.current = -1;
      lastClockSecRef.current = -1;
      isPlayingRef.current = false;
      isPausedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
      setCurrentSentenceIndex(-1);
      setCurrentWordIndex(-1);
      setCurrentSectionIndex(0);
      setTrackCurrentTime(0);
    });

    audio.addEventListener("error", () => {
      if (trackAudioRef.current !== audio) return;
      isPlayingRef.current = false;
      isPausedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
      setError("Original-MP3 konnte nicht geladen oder abgespielt werden.");
    });

    trackAudioRef.current = audio;
    trackAudioUrlLoadedRef.current = url;
    return audio;
  }, [cleanupTrackAudio, syncTrackStateFromAudio]);

  const timeForWord = useCallback(
    (sentenceIdx: number, wordIdx = 0): number => {
      if (wordIdx > 0) {
        const dur =
          trackAudioRef.current?.duration && Number.isFinite(trackAudioRef.current.duration)
            ? trackAudioRef.current.duration
            : 0;
        const [s0, s1] = getSpeechSpanForSentence(sentenceIdx, dur);
        const text = sentencesRef.current[sentenceIdx] ?? "";
        return estimateTimeForWordInSpan(text, wordIdx, s0, s1);
      }
      const timings = timingsRef.current;
      if (timings && timings[sentenceIdx] !== undefined) {
        return timings[sentenceIdx]!;
      }
      const len = sentencesRef.current.length;
      const dur = trackAudioRef.current?.duration;
      if (len > 0 && dur && Number.isFinite(dur) && dur > 0) {
        return (sentenceIdx / len) * dur;
      }
      return 0;
    },
    [getSpeechSpanForSentence]
  );

  const stop = useCallback(() => {
    cancelSpeechWork();
    cleanupTrackAudio();
    isPlayingRef.current = false;
    isPausedRef.current = false;
    activeIndexRef.current = -1;
    activeWordIndexRef.current = -1;
    lastClockSecRef.current = -1;
    lastDurationRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setCurrentSentenceIndex(-1);
    setCurrentWordIndex(-1);
    setCurrentSectionIndex(0);
    setTrackCurrentTime(0);
    setTrackDuration(0);
  }, [cancelSpeechWork, cleanupTrackAudio]);

  // Reset when changing saga or track URL
  useEffect(() => {
    stop();
    setError("");
  }, [sentences, audioUrl, stop]);

  // Update HTML5 <audio> playbackRate live (both Cloud TTS & Track MP3)
  useEffect(() => {
    updateCurrentPlaybackRate(playbackRate);
    if (trackAudioRef.current) {
      try {
        trackAudioRef.current.playbackRate = Math.max(0.5, Math.min(2.0, playbackRate));
        if ("preservesPitch" in trackAudioRef.current) {
          (trackAudioRef.current as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch =
            true;
        }
      } catch {
        /* ignore */
      }
    }
  }, [playbackRate]);

  // Vsync-synchronisierte 60fps+ Audio-Abtastung für geschmeidiges, ruckelfreies Mitlesen
  useEffect(() => {
    if (!isTrackMode || !isPlaying) return;
    let rafId = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const audio = trackAudioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        syncTrackStateFromAudio(audio);
      }
      rafId = window.requestAnimationFrame(tick);
    };

    if (typeof window.requestAnimationFrame === "function") {
      rafId = window.requestAnimationFrame(tick);
    }
    const fallbackTimer = window.setInterval(() => {
      const audio = trackAudioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        syncTrackStateFromAudio(audio);
      }
    }, 250);

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearInterval(fallbackTimer);
    };
  }, [isTrackMode, isPlaying, syncTrackStateFromAudio]);

  // Unmount cleanup
  useEffect(
    () => () => {
      cancelSpeechWork();
      cleanupTrackAudio();
    },
    [cancelSpeechWork, cleanupTrackAudio]
  );

  const startTrackFromSentence = useCallback(
    async (startIdx: number, resumeFromPausedTime = false, startWordIdx = 0) => {
      const list = sentencesRef.current;
      if (list.length === 0) return;

      const clamped = Math.max(0, Math.min(list.length - 1, startIdx));
      cancelSpeechWork();

      const audio = ensureTrackAudio();
      if (!audio) {
        setError("Audio-Wiedergabe wird in dieser Umgebung nicht unterstützt.");
        return;
      }

      // Epoche erst nach ensureTrackAudio erhöhen, da cleanupTrackAudio bei Neuaufbau die Epoche hochzählt
      trackEpochRef.current += 1;
      const myEpoch = trackEpochRef.current;

      setError("");
      setIsPaused(false);
      isPausedRef.current = false;
      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsLoading(true);

      if (!resumeFromPausedTime) {
        const targetSec = timeForWord(clamped, startWordIdx);
        activeIndexRef.current = clamped;
        activeWordIndexRef.current = Math.max(0, startWordIdx);
        lastClockSecRef.current = Math.floor(targetSec);
        setCurrentSentenceIndex(clamped);
        setCurrentWordIndex(Math.max(0, startWordIdx));
        setCurrentSectionIndex(findSectionForSentence(clamped, offsetsRef.current));
        setTrackCurrentTime(targetSec);
        onSentenceChangeRef.current?.(clamped);

        if (audio.readyState >= 1) {
          try {
            audio.currentTime = targetSec;
            pendingSeekRef.current = null;
          } catch {
            pendingSeekRef.current = targetSec;
          }
        } else if (targetSec <= 0.05 && (audio.currentTime || 0) <= 0.05) {
          pendingSeekRef.current = null;
        } else {
          pendingSeekRef.current = targetSec;
        }
      }

      try {
        audio.playbackRate = Math.max(0.5, Math.min(2.0, rateRef.current));
        await audio.play();
        if (trackEpochRef.current !== myEpoch) {
          audio.pause();
          return;
        }
        setIsLoading(false);
        syncTrackStateFromAudio(audio);
      } catch (err) {
        if (trackEpochRef.current !== myEpoch) return;
        isPlayingRef.current = false;
        isPausedRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : "Original-MP3 Wiedergabe fehlgeschlagen."
        );
      }
    },
    [cancelSpeechWork, ensureTrackAudio, syncTrackStateFromAudio, timeForWord]
  );

  const startFromSentence = useCallback(
    async (startIdx: number, voiceOverride?: string, startWordIdx = 0) => {
      if (isTrackModeRef.current) {
        await startTrackFromSentence(startIdx, false, startWordIdx);
        return;
      }

      const list = sentencesRef.current;
      if (list.length === 0) return;

      const clampedStart = Math.max(0, Math.min(list.length - 1, startIdx));
      cleanupTrackAudio();
      cancelSpeechWork();

      const token = epochRef.current;
      const controller = new AbortController();
      ctrlRef.current = controller;

      setError("");
      setIsPaused(false);
      isPausedRef.current = false;
      setIsPlaying(true);
      isPlayingRef.current = true;

      try {
        for (let idx = clampedStart; idx < list.length; idx++) {
          if (controller.signal.aborted || epochRef.current !== token) return;

          const text = list[idx];
          if (!text) continue;

          activeIndexRef.current = idx;
          activeWordIndexRef.current = 0;
          setCurrentSentenceIndex(idx);
          setCurrentWordIndex(0);
          setCurrentSectionIndex(findSectionForSentence(idx, offsetsRef.current));
          onSentenceChangeRef.current?.(idx);

          setIsLoading(true);
          // Nächste 2 Sätze parallel vorladen, damit zwischen Sätzen keine Ladepause entsteht
          const activeVoice = voiceOverride ?? voiceRef.current;
          for (let ahead = 1; ahead <= 2; ahead++) {
            const nextText = list[idx + ahead];
            if (nextText) {
              prefetchGoogleSpeech(nextText, activeVoice);
            }
          }

          try {
            await speakGoogle(
              text,
              activeVoice,
              controller.signal,
              rateRef.current,
              (curSec, durSec) => {
                if (
                  controller.signal.aborted ||
                  epochRef.current !== token ||
                  activeIndexRef.current !== idx
                ) {
                  return;
                }
                setIsLoading(false);
                if (!Number.isFinite(durSec) || durSec <= 0.2) {
                  return;
                }
                const effectiveEnd = Math.max(0.25, durSec - 0.14);
                const wordIdx = estimateWordIndexInSpan(text, curSec, 0.06, effectiveEnd);
                if (wordIdx !== activeWordIndexRef.current) {
                  activeWordIndexRef.current = wordIdx;
                  setCurrentWordIndex(wordIdx);
                }
              }
            );
          } finally {
            if (epochRef.current === token) {
              setIsLoading(false);
            }
          }
        }

        if (controller.signal.aborted || epochRef.current !== token) return;
        activeIndexRef.current = -1;
        activeWordIndexRef.current = -1;
        isPlayingRef.current = false;
        isPausedRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(-1);
        setCurrentWordIndex(-1);
        setCurrentSectionIndex(0);
      } catch (err) {
        if (controller.signal.aborted || epochRef.current !== token) return;
        isPlayingRef.current = false;
        isPausedRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : "Google Cloud / Gemini HD Wiedergabe fehlgeschlagen."
        );
      }
    },
    [cancelSpeechWork, cleanupTrackAudio, startTrackFromSentence]
  );

  // Switch cleanly when toggling between Original-MP3 and KI-Stimme
  const prevTrackModeRef = useRef(isTrackMode);
  useEffect(() => {
    const prev = prevTrackModeRef.current;
    prevTrackModeRef.current = isTrackMode;
    if (prev === isTrackMode) return;

    if (isPlayingRef.current) {
      const resumeIdx = Math.max(0, activeIndexRef.current);
      if (isTrackMode) {
        cancelSpeechWork();
        void startTrackFromSentence(resumeIdx, false, Math.max(0, activeWordIndexRef.current));
      } else {
        cleanupTrackAudio();
        void startFromSentence(resumeIdx);
      }
    } else if (isPausedRef.current) {
      cancelSpeechWork();
      cleanupTrackAudio();
      setIsPaused(false);
      isPausedRef.current = false;
    }
  }, [isTrackMode, cancelSpeechWork, cleanupTrackAudio, startTrackFromSentence, startFromSentence]);

  // Switch voice live if user selects another HD voice while playing/paused (in Cloud TTS mode)
  useEffect(() => {
    const prevVoice = voiceRef.current;
    voiceRef.current = voiceId;
    if (prevVoice === voiceId || isTrackModeRef.current) return;

    if (isPlayingRef.current) {
      const resumeIdx = Math.max(0, activeIndexRef.current);
      void startFromSentence(resumeIdx, voiceId);
    } else if (isPausedRef.current) {
      // Drop paused old-voice audio so next Play uses the newly selected voice
      cancelSpeechWork();
      setIsPaused(false);
      isPausedRef.current = false;
    }
  }, [voiceId, cancelSpeechWork, startFromSentence]);

  const play = useCallback(async () => {
    if (sentencesRef.current.length === 0) return;
    setError("");

    if (isTrackModeRef.current) {
      if (isPausedRef.current && trackAudioRef.current) {
        await startTrackFromSentence(Math.max(0, activeIndexRef.current), true);
      } else {
        await startTrackFromSentence(
          Math.max(0, activeIndexRef.current),
          false,
          Math.max(0, activeWordIndexRef.current)
        );
      }
      return;
    }

    if (isPausedRef.current) {
      const resumed = await resumeGoogleSpeech();
      if (resumed) {
        isPausedRef.current = false;
        isPlayingRef.current = true;
        setIsPaused(false);
        setIsPlaying(true);
        return;
      }
    }

    const startIdx = Math.max(0, activeIndexRef.current);
    await startFromSentence(startIdx);
  }, [startFromSentence, startTrackFromSentence]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    if (isTrackModeRef.current && trackAudioRef.current) {
      trackEpochRef.current += 1;
      trackAudioRef.current.pause();
    } else {
      pauseGoogleSpeech();
    }
    isPlayingRef.current = false;
    isPausedRef.current = true;
    setIsPlaying(false);
    setIsPaused(true);
    setIsLoading(false);
  }, []);

  const jumpToSentence = useCallback(
    (globalIndex: number) => {
      void startFromSentence(globalIndex);
    },
    [startFromSentence]
  );

  const jumpToWord = useCallback(
    (globalSentenceIndex: number, wordIndex = 0) => {
      void startFromSentence(globalSentenceIndex, undefined, wordIndex);
    },
    [startFromSentence]
  );

  const jumpToSection = useCallback(
    (sectionIndex: number) => {
      const targetSentence = offsetsRef.current[sectionIndex] ?? 0;
      void startFromSentence(targetSentence);
    },
    [startFromSentence]
  );

  const nextSentence = useCallback(() => {
    const list = sentencesRef.current;
    if (list.length === 0) return;
    const nextIdx = Math.min(list.length - 1, Math.max(0, activeIndexRef.current + 1));
    void startFromSentence(nextIdx);
  }, [startFromSentence]);

  const prevSentence = useCallback(() => {
    const list = sentencesRef.current;
    if (list.length === 0) return;
    const prevIdx = Math.max(0, activeIndexRef.current - 1);
    void startFromSentence(prevIdx);
  }, [startFromSentence]);

  const seekSentence = useCallback(
    (targetIndex: number) => {
      const list = sentencesRef.current;
      if (list.length === 0) return;
      const clamped = Math.max(0, Math.min(list.length - 1, Math.round(targetIndex)));
      if (isPlayingRef.current) {
        void startFromSentence(clamped);
      } else {
        cancelSpeechWork();
        if (trackAudioRef.current) {
          const targetSec = timeForWord(clamped, 0);
          lastClockSecRef.current = Math.floor(targetSec);
          setTrackCurrentTime(targetSec);
          if (trackAudioRef.current.readyState >= 1) {
            try {
              trackAudioRef.current.currentTime = targetSec;
            } catch {
              pendingSeekRef.current = targetSec;
            }
          } else {
            pendingSeekRef.current = targetSec;
          }
        }
        activeIndexRef.current = clamped;
        activeWordIndexRef.current = 0;
        isPausedRef.current = false;
        setIsPaused(false);
        setCurrentSentenceIndex(clamped);
        setCurrentWordIndex(0);
        setCurrentSectionIndex(findSectionForSentence(clamped, offsetsRef.current));
        onSentenceChangeRef.current?.(clamped);
      }
    },
    [cancelSpeechWork, startFromSentence, timeForWord]
  );

  return {
    hasAudio: sentences.length > 0,
    isTrackMode,
    trackCurrentTime,
    trackDuration,
    isPlaying,
    isPaused,
    isLoading,
    currentSentenceIndex,
    currentWordIndex,
    currentSectionIndex,
    totalSentences: sentences.length,
    error,
    play,
    pause,
    stop,
    jumpToSentence,
    jumpToWord,
    jumpToSection,
    nextSentence,
    prevSentence,
    seekSentence,
  };
}
