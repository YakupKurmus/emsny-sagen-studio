"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_KEY_CHANGED_EVENT,
  buildAiRequestHeaders,
  getStoredApiKey,
} from "@/lib/api-key-store";
import {
  applySpokenPunctuationCommands,
  blobToBase64,
  mergeDictatedChunk,
  selectBestAudioMimeType,
} from "@/lib/dictation-utils";
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizerHandle,
} from "@/lib/speech-reader";

export type DictationEngine = "live" | "audio";

interface UseDictationOptions {
  language?: string;
  customVocabulary?: string[];
  contextHint?: string;
  /**
   * Wird bei Live-Diktat laufend (und nach KI-Feinschliff final) mit dem gesamten
   * aktualisierten Feld-Text (baseText + diktierter Teil) aufgerufen.
   */
  onLiveTextUpdate: (fullText: string) => void;
  /**
   * Wird am Ende einer abgeschlossenen Diktat-Sitzung aufgerufen.
   */
  onCompleted?: (finalText: string, usedAiPolish: boolean) => void;
  onError?: (message: string) => void;
  onSessionEnd?: () => void;
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

function joinRawParts(a: string, b: string): string {
  const cleanA = a.trim();
  const cleanB = b.trim();
  if (!cleanA) return cleanB;
  if (!cleanB) return cleanA;
  // Verhindere exakte Wiederholung am Ende beim Auto-Restart
  if (cleanA.toLowerCase().endsWith(cleanB.toLowerCase()) && cleanB.split(/\s+/).length >= 2) {
    return cleanA;
  }
  return `${cleanA} ${cleanB}`;
}

export function useDictation({
  language = "de-AT",
  customVocabulary,
  contextHint,
  onLiveTextUpdate,
  onCompleted,
  onError,
  onSessionEnd,
}: UseDictationOptions) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);
  const [canRecordAudio, setCanRecordAudio] = useState(false);
  const [canUseBrowserSpeech, setCanUseBrowserSpeech] = useState(false);

  const [preferredEngine, setPreferredEngine] = useState<DictationEngine>("live");
  const [isRecording, setIsRecording] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [livePreview, setLivePreview] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);

  const onLiveTextUpdateRef = useRef(onLiveTextUpdate);
  const onCompletedRef = useRef(onCompleted);
  const onErrorRef = useRef(onError);
  const onSessionEndRef = useRef(onSessionEnd);
  const vocabRef = useRef(customVocabulary);
  const contextRef = useRef(contextHint);
  const langRef = useRef(language);

  onLiveTextUpdateRef.current = onLiveTextUpdate;
  onCompletedRef.current = onCompleted;
  onErrorRef.current = onError;
  onSessionEndRef.current = onSessionEnd;
  vocabRef.current = customVocabulary;
  contextRef.current = contextHint;
  langRef.current = language;

  // Session state refs (zero race conditions!)
  const baseTextRef = useRef("");
  const committedRawRef = useRef("");
  const formattedCommittedRef = useRef("");
  const latestInterimRef = useRef("");
  const wantRecordingRef = useRef(false);
  const activeEngineRef = useRef<DictationEngine>("live");
  const polishSeqRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recognizerRef = useRef<SpeechRecognizerHandle | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);

  useEffect(() => {
    setCanRecordAudio(isMediaRecorderSupported());
    setCanUseBrowserSpeech(isSpeechRecognitionSupported());
    setHasApiKey(Boolean(getStoredApiKey()));

    const onKeyChange = () => setHasApiKey(Boolean(getStoredApiKey()));
    window.addEventListener(API_KEY_CHANGED_EVENT, onKeyChange);

    fetch("/api/key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { serverKeyConfigured?: boolean } | null) => {
        if (data?.serverKeyConfigured) setServerKeyConfigured(true);
      })
      .catch(() => {
        // optional
      });

    return () => {
      window.removeEventListener(API_KEY_CHANGED_EVENT, onKeyChange);
    };
  }, []);

  const hasAiAssistance = hasApiKey || serverKeyConfigured;
  const canUseAudioFallback = canRecordAudio && hasAiAssistance;

  // Standardmäßig IMMER Live-Diktat (mit KI-Unterstützung!), Fallback auf Audio-Aufnahme falls Browser kein Web Speech kann
  const effectiveEngine: DictationEngine =
    preferredEngine === "live" && canUseBrowserSpeech
      ? "live"
      : canUseAudioFallback
        ? "audio"
        : "live";

  const isSupported = canUseBrowserSpeech || canUseAudioFallback;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setElapsedSec(0);
  }, []);

  const cleanupMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const emitCurrentCombinedText = useCallback(() => {
    const committedDisplay =
      formattedCommittedRef.current || applySpokenPunctuationCommands(committedRawRef.current);
    const interimDisplay = latestInterimRef.current
      ? applySpokenPunctuationCommands(latestInterimRef.current)
      : "";

    const spokenMerged = interimDisplay
      ? mergeDictatedChunk(committedDisplay, interimDisplay)
      : committedDisplay;

    const full = spokenMerged
      ? mergeDictatedChunk(baseTextRef.current, spokenMerged)
      : baseTextRef.current;

    onLiveTextUpdateRef.current(full);
    return full;
  }, []);

  const runAiFormatOnRaw = useCallback(
    async (rawToPolish: string): Promise<{ text: string; usedAi: boolean }> => {
      const deterministic = applySpokenPunctuationCommands(rawToPolish);
      if (!rawToPolish.trim() || !hasAiAssistance) {
        return { text: deterministic, usedAi: false };
      }

      try {
        const res = await fetch("/api/speech/format-dictation", {
          method: "POST",
          headers: buildAiRequestHeaders(),
          body: JSON.stringify({
            rawText: rawToPolish,
            customVocabulary: vocabRef.current,
            contextHint: contextRef.current,
          }),
        });
        if (!res.ok) {
          return { text: deterministic, usedAi: false };
        }
        const data = (await res.json()) as { formattedText?: string; source?: string };
        const formatted = data.formattedText?.trim();
        if (!formatted) {
          return { text: deterministic, usedAi: false };
        }
        return { text: formatted, usedAi: data.source === "gemini" };
      } catch {
        return { text: deterministic, usedAi: false };
      }
    },
    [hasAiAssistance]
  );

  const triggerBackgroundPolish = useCallback(() => {
    const snapshot = committedRawRef.current.trim();
    if (!snapshot || !hasAiAssistance) return;

    const seq = ++polishSeqRef.current;
    void runAiFormatOnRaw(snapshot).then(({ text }) => {
      // Nur anwenden, wenn seitdem kein neuerer Final-Abschnitt eingetroffen ist
      if (polishSeqRef.current !== seq) return;
      formattedCommittedRef.current = text;
      emitCurrentCombinedText();
    });
  }, [emitCurrentCombinedText, hasAiAssistance, runAiFormatOnRaw]);

  const finishLiveSession = useCallback(async () => {
    stopTimer();
    setIsRecording(false);
    setLivePreview("");

    const finalRaw = joinRawParts(committedRawRef.current, latestInterimRef.current);
    committedRawRef.current = finalRaw;
    latestInterimRef.current = "";

    if (!finalRaw.trim()) {
      onSessionEndRef.current?.();
      return;
    }

    // Sofort deterministisch anzeigen, damit kein einziges Wort verloren geht
    formattedCommittedRef.current = applySpokenPunctuationCommands(finalRaw);
    let finalFull = emitCurrentCombinedText();
    let usedAi = false;

    if (hasAiAssistance) {
      const seq = ++polishSeqRef.current;
      setIsFormatting(true);
      try {
        const polished = await runAiFormatOnRaw(finalRaw);
        if (polishSeqRef.current === seq) {
          formattedCommittedRef.current = polished.text;
          finalFull = emitCurrentCombinedText();
          usedAi = polished.usedAi;
        }
      } finally {
        setIsFormatting(false);
      }
    }

    onCompletedRef.current?.(finalFull, usedAi);
    onSessionEndRef.current?.();
  }, [emitCurrentCombinedText, hasAiAssistance, runAiFormatOnRaw, stopTimer]);

  const cancel = useCallback(() => {
    wantRecordingRef.current = false;
    discardRecordingRef.current = true;
    polishSeqRef.current += 1;
    stopTimer();
    setLivePreview("");
    setIsRecording(false);
    setIsFormatting(false);

    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    cleanupMedia();

    // Bei Live-Diktat den Zustand vor Beginn der abgebrochenen Sitzung sauber wiederherstellen
    if (activeEngineRef.current === "live") {
      onLiveTextUpdateRef.current(baseTextRef.current);
    }
    onSessionEndRef.current?.();
  }, [cleanupMedia, stopTimer]);

  useEffect(() => {
    return () => {
      wantRecordingRef.current = false;
      discardRecordingRef.current = true;
      stopTimer();
      recognizerRef.current?.abort();
      cleanupMedia();
    };
  }, [cleanupMedia, stopTimer]);

  const stop = useCallback(() => {
    wantRecordingRef.current = false;
    stopTimer();

    if (activeEngineRef.current === "live") {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      } else {
        void finishLiveSession();
      }
      return;
    }

    discardRecordingRef.current = false;
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsFormatting(true);
      try {
        mediaRecorderRef.current.stop();
      } catch {
        setIsFormatting(false);
        cleanupMedia();
        onSessionEndRef.current?.();
      }
    } else {
      cleanupMedia();
      onSessionEndRef.current?.();
    }
  }, [cleanupMedia, finishLiveSession, stopTimer]);

  const launchBrowserRecognizer = useCallback(() => {
    const rec = createSpeechRecognizer({
      language: langRef.current,
      onResult: (chunk, isFinal) => {
        if (isFinal) {
          latestInterimRef.current = "";
          setLivePreview("");
          if (chunk.trim()) {
            committedRawRef.current = joinRawParts(committedRawRef.current, chunk);
            formattedCommittedRef.current = applySpokenPunctuationCommands(committedRawRef.current);
            emitCurrentCombinedText();
            if (wantRecordingRef.current) {
              triggerBackgroundPolish();
            }
          }
        } else {
          latestInterimRef.current = chunk;
          setLivePreview(applySpokenPunctuationCommands(chunk));
          emitCurrentCombinedText();
        }
      },
      onError: (msg) => {
        wantRecordingRef.current = false;
        setLivePreview("");
        setIsRecording(false);
        stopTimer();
        recognizerRef.current = null;
        onErrorRef.current?.(msg);
        onSessionEndRef.current?.();
      },
      onEnd: () => {
        recognizerRef.current = null;
        // Wenn der Nutzer NICHT auf "Fertig" geklickt hat (z. B. kurze Atempause in Chrome/Safari), nahtlos weiterhören!
        if (wantRecordingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!wantRecordingRef.current) return;
            try {
              launchBrowserRecognizer();
            } catch {
              wantRecordingRef.current = false;
              void finishLiveSession();
            }
          }, 150);
          return;
        }
        if (!discardRecordingRef.current) {
          void finishLiveSession();
        }
      },
    });

    if (!rec) {
      wantRecordingRef.current = false;
      setIsRecording(false);
      stopTimer();
      onErrorRef.current?.("Live-Diktat konnte in diesem Browser nicht gestartet werden.");
      onSessionEndRef.current?.();
      return false;
    }

    recognizerRef.current = rec;
    try {
      rec.start();
      return true;
    } catch {
      recognizerRef.current = null;
      wantRecordingRef.current = false;
      setIsRecording(false);
      stopTimer();
      onErrorRef.current?.("Mikrofon konnte nicht gestartet werden.");
      onSessionEndRef.current?.();
      return false;
    }
  }, [emitCurrentCombinedText, finishLiveSession, stopTimer, triggerBackgroundPolish]);

  const start = useCallback(
    async (initialBaseText: string, engineOverride?: DictationEngine) => {
      const chosen = engineOverride ?? effectiveEngine;
      activeEngineRef.current = chosen;
      baseTextRef.current = initialBaseText;
      committedRawRef.current = "";
      formattedCommittedRef.current = "";
      latestInterimRef.current = "";
      discardRecordingRef.current = false;
      setLivePreview("");

      if (chosen === "live" && canUseBrowserSpeech) {
        wantRecordingRef.current = true;
        const ok = launchBrowserRecognizer();
        if (!ok) return false;
        setIsRecording(true);
        setElapsedSec(0);
        timerRef.current = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
        return true;
      }

      // Fallback: Audio-Aufnahme -> /api/speech/transcribe (für Browser ohne Web Speech API wie Firefox)
      if (!canUseAudioFallback) {
        onErrorRef.current?.(
          "Dieser Browser unterstützt kein Live-Diktat. Hinterlege oben im Menü deinen Gemini API-Key für die Sprachaufnahme!"
        );
        return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const mimeType = selectBestAudioMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = audioChunksRef.current;
          const actualMime = recorder.mimeType || mimeType || "audio/webm";
          audioChunksRef.current = [];
          cleanupMedia();

          if (discardRecordingRef.current || chunks.length === 0) {
            setIsRecording(false);
            setIsFormatting(false);
            onSessionEndRef.current?.();
            return;
          }

          const blob = new Blob(chunks, { type: actualMime });
          if (blob.size < 400) {
            setIsFormatting(false);
            onErrorRef.current?.("Die Aufnahme war zu kurz. Bitte sprich etwas länger.");
            onSessionEndRef.current?.();
            return;
          }

          setIsFormatting(true);
          try {
            const audioBase64 = await blobToBase64(blob);
            const res = await fetch("/api/speech/transcribe", {
              method: "POST",
              headers: buildAiRequestHeaders(),
              body: JSON.stringify({
                audioBase64,
                mimeType: actualMime,
                language: langRef.current,
                customVocabulary: vocabRef.current,
                contextHint: contextRef.current,
              }),
            });
            const data = (await res.json()) as { transcript?: string; error?: string };
            if (!res.ok) {
              onErrorRef.current?.(data.error || "Sprachaufnahme konnte nicht erkannt werden.");
              return;
            }
            const rawSpoken = data.transcript?.trim() ?? "";
            if (!rawSpoken) {
              onErrorRef.current?.("Es wurde keine Sprache erkannt. Bitte sprich etwas deutlicher.");
              return;
            }
            const polished = await runAiFormatOnRaw(rawSpoken);
            const full = mergeDictatedChunk(baseTextRef.current, polished.text);
            onLiveTextUpdateRef.current(full);
            onCompletedRef.current?.(full, true);
          } catch {
            onErrorRef.current?.("Netzwerkfehler beim Transkribieren der Sprachaufnahme.");
          } finally {
            setIsFormatting(false);
            onSessionEndRef.current?.();
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
        setIsRecording(true);
        setElapsedSec(0);
        timerRef.current = setInterval(() => {
          setElapsedSec((prev) => {
            if (prev >= 89) {
              stop();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
        return true;
      } catch (err) {
        cleanupMedia();
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Mikrofonzugriff wurde blockiert. Bitte erlaube das Mikrofon in deinem Browser."
            : "Mikrofon konnte nicht gestartet werden.";
        onErrorRef.current?.(msg);
        return false;
      }
    },
    [
      canUseAudioFallback,
      canUseBrowserSpeech,
      cleanupMedia,
      effectiveEngine,
      launchBrowserRecognizer,
      runAiFormatOnRaw,
      stop,
    ]
  );

  return {
    isSupported,
    hasAiAssistance,
    canUseBrowserSpeech,
    canUseAudioFallback,
    engine: effectiveEngine,
    preferredEngine,
    setPreferredEngine,
    isRecording,
    isTranscribing: isFormatting,
    livePreview,
    elapsedSec,
    start,
    stop,
    cancel,
  };
}
