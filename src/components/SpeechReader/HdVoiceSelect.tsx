"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CLOUD_HD_VOICES,
  ENGLISH_GB_HD_VOICES,
  ENGLISH_US_HD_VOICES,
  GERMAN_HD_VOICES,
  ITALIAN_HD_VOICES,
  SPANISH_HD_VOICES,
  fetchGoogleCloudHdVoices,
  resolveVoice,
  type ReaderVoice,
} from "@/lib/google-voices";
import { readStoredCloudTtsKey } from "@/lib/google-speech";

interface HdVoiceSelectProps {
  value: string;
  onChange: (voiceId: string) => void;
  compact?: boolean;
  showRefresh?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function HdVoiceSelect({
  value,
  onChange,
  compact = false,
  showRefresh = false,
  className = "",
  ariaLabel = "Google Cloud / Gemini HD Stimme wählen",
}: HdVoiceSelectProps) {
  const [voices, setVoices] = useState<readonly ReaderVoice[]>(CLOUD_HD_VOICES);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(Boolean(readStoredCloudTtsKey()));
  }, []);

  const resolved = resolveVoice(value);
  const effectiveList = voices.some((v) => v.id === resolved.id)
    ? voices
    : [resolved, ...voices];

  const byLocale = (locale: string, fallback: readonly ReaderVoice[]) => {
    const matched = effectiveList.filter((v) => v.lang === locale);
    return matched.length > 0 ? matched : fallback;
  };

  const groups = [
    { label: "✨ Chirp 3 HD / Gemini HD · Deutsch", items: byLocale("de-DE", GERMAN_HD_VOICES) },
    { label: "✨ Chirp 3 HD / Gemini HD · English (US)", items: byLocale("en-US", ENGLISH_US_HD_VOICES) },
    { label: "✨ Chirp 3 HD / Gemini HD · English (UK)", items: byLocale("en-GB", ENGLISH_GB_HD_VOICES) },
    { label: "✨ Chirp 3 HD / Gemini HD · Italiano", items: byLocale("it-IT", ITALIAN_HD_VOICES) },
    { label: "✨ Chirp 3 HD / Gemini HD · Español", items: byLocale("es-ES", SPANISH_HD_VOICES) },
  ];

  const handleRefresh = async () => {
    const apiKey = readStoredCloudTtsKey();
    setHasApiKey(Boolean(apiKey));
    if (!apiKey) {
      setRefreshError("Bitte zuerst einen Google Cloud / Gemini API-Key in den Einstellungen speichern.");
      return;
    }
    setRefreshing(true);
    setRefreshError("");
    try {
      const live = await fetchGoogleCloudHdVoices(apiKey);
      if (live.length > 0) {
        setVoices(live);
        if (!live.some((v) => v.id === resolved.id)) {
          onChange(live[0]!.id);
        }
      }
    } catch (e) {
      setRefreshError(
        e instanceof Error ? e.message : "Live-Stimmenabruf fehlgeschlagen."
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5">
        <select
          aria-label={ariaLabel}
          value={resolved.id}
          onChange={(e) => onChange(e.target.value)}
          className={
            compact
              ? "h-8 max-w-[230px] truncate rounded-lg border border-foreground/20 bg-background/95 px-2 text-xs font-semibold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              : "learning-input w-full text-sm font-medium"
          }
          title={`${resolved.name} · ${resolved.cloudTtsVoice} (${hasApiKey ? "API-Key aktiv" : "API-Key erforderlich"})`}
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.cloudTtsVoice}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {showRefresh && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Alle Chirp 3 HD Stimmen live über Google Cloud API laden"
            aria-label="Live-Stimmen über Google Cloud API laden"
            className="h-9 w-9 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {showRefresh && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {hasApiKey
            ? "API-Key aktiv · Google Cloud Chirp 3 HD & Gemini HD bereit."
            : "Für das Vorlesen ist ein Google Cloud TTS- oder Gemini-API-Key erforderlich."}
        </p>
      )}
      {refreshError && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {refreshError}
        </p>
      )}
    </div>
  );
}
