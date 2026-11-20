"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Menu,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  API_KEY_CHANGED_EVENT,
  buildAiRequestHeaders,
  clearStoredApiKey,
  getStoredApiKey,
  maskApiKey,
  saveStoredApiKey,
} from "@/lib/api-key-store";

interface ApiKeyMenuProps {
  compact?: boolean;
  onDownloadBackup?: () => void;
  variant?: "light" | "adaptive";
}

export function ApiKeyMenu({
  compact = false,
  onDownloadBackup,
  variant = "light",
}: ApiKeyMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [storedKey, setStoredKey] = useState("");
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);

  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refreshKeyState = () => {
    setStoredKey(getStoredApiKey());
  };

  useEffect(() => {
    refreshKeyState();

    const onKeyChanged = () => refreshKeyState();
    window.addEventListener(API_KEY_CHANGED_EVENT, onKeyChanged);
    window.addEventListener("storage", onKeyChanged);

    // Prüfe dezent, ob serverseitig bereits ein GEMINI_API_KEY aktiv ist
    fetch("/api/key")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { serverKeyConfigured?: boolean } | null) => {
        if (data?.serverKeyConfigured) setServerKeyConfigured(true);
      })
      .catch(() => {
        // optional
      });

    return () => {
      window.removeEventListener(API_KEY_CHANGED_EVENT, onKeyChanged);
      window.removeEventListener("storage", onKeyChanged);
    };
  }, []);

  // Dropdown schließen bei Außenklick oder Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  const openModal = () => {
    const current = getStoredApiKey();
    setStoredKey(current);
    setInputKey(current);
    setShowKey(false);
    setTestResult(null);
    setMenuOpen(false);
    setModalOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSaveKey = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) {
      toast.error("Bitte gib einen gültigen Gemini API-Key ein.");
      return;
    }
    const wasExisting = Boolean(storedKey);
    saveStoredApiKey(trimmed);
    setStoredKey(trimmed);
    setTestResult(null);
    setModalOpen(false);
    toast.success(wasExisting ? "API-Key erfolgreich geändert!" : "API-Key lokal gespeichert!");
  };

  const handleDeleteKey = () => {
    clearStoredApiKey();
    setStoredKey("");
    setInputKey("");
    setTestResult(null);
    setMenuOpen(false);
    setModalOpen(false);
    toast.success("Gespeicherter API-Key wurde gelöscht.");
  };

  const handleTestKey = async (keyToTest?: string) => {
    const candidate = (keyToTest ?? inputKey).trim();
    if (!candidate && !serverKeyConfigured) {
      setTestResult({
        type: "error",
        message: "Bitte gib zuerst einen API-Key ein.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/key", {
        method: "POST",
        headers: buildAiRequestHeaders(candidate || undefined),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setTestResult({
          type: "success",
          message: "Verbindung zu Google Gemini erfolgreich getestet!",
        });
        toast.success("API-Key funktioniert einwandfrei!");
      } else {
        const msg = data.error || "API-Key wurde abgelehnt.";
        setTestResult({ type: "error", message: msg });
        toast.error(msg);
      }
    } catch {
      const msg = "Netzwerkfehler beim Prüfen des API-Keys.";
      setTestResult({ type: "error", message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const hasAnyKey = Boolean(storedKey) || serverKeyConfigured;

  const triggerButtonClasses =
    variant === "adaptive"
      ? "inline-flex items-center gap-1.5 h-8 rounded-lg border border-foreground/20 px-2.5 text-xs font-bold hover:bg-foreground/10 transition cursor-pointer"
      : "inline-flex items-center gap-1.5 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 sm:px-3 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs";

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Menü & API-Key verwalten"
          className={triggerButtonClasses}
          title={
            storedKey
              ? `API-Key aktiv (${maskApiKey(storedKey)}) – Klicken zum Verwalten`
              : serverKeyConfigured
                ? "Server-API-Key aktiv – Menü öffnen"
                : "Menü öffnen & Gemini API-Key hinterlegen"
          }
        >
          <Menu className="h-4 w-4 shrink-0" />
          {!compact && <span className="hidden sm:inline">Menü</span>}
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full shrink-0 ${
              hasAnyKey ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white text-slate-800 border border-slate-200 shadow-2xl z-50 overflow-hidden ring-1 ring-black/5"
          >
            {/* Status Header */}
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Gemini API-Key
                </span>
                {storedKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3" />
                    Aktiv
                  </span>
                ) : serverKeyConfigured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    Server-Key
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                    Nicht gesetzt
                  </span>
                )}
              </div>

              {storedKey ? (
                <div className="font-mono text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <span>{maskApiKey(storedKey)}</span>
                  <span className="text-[10px] font-sans text-slate-400">Lokal gespeichert</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {serverKeyConfigured
                    ? "Serverseitiger Key aktiv. Du kannst optional einen eigenen Key hinterlegen."
                    : "Gib deinen Gemini API-Key ein, um KI-Schreibhilfen, Fakten-Check, OCR & HD-Stimmen zu nutzen."}
                </p>
              )}
            </div>

            {/* Menu Actions */}
            <div className="p-2 space-y-1">
              {!storedKey ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={openModal}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 shrink-0" />
                  <span>API-Key eingeben &amp; speichern</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openModal}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer text-left"
                  >
                    <Pencil className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>API-Key ändern</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    disabled={isTesting}
                    onClick={() => void handleTestKey(storedKey)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer text-left disabled:opacity-50"
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    )}
                    <span>{isTesting ? "Prüfe Verbindung…" : "API-Key testen"}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDeleteKey}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer text-left"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span>API-Key löschen</span>
                  </button>
                </>
              )}

              <div className="h-px bg-slate-100 my-1.5 mx-2" />
              <Link
                href="/portfolio"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-left"
              >
                <Award className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Mein Sagen-Portfolio &amp; Sync</span>
              </Link>

              <Link
                href="/datenschutz"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-left"
              >
                <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Datenschutz &amp; Daten verwalten</span>
              </Link>

              {onDownloadBackup && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDownloadBackup();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer text-left"
                >
                  <Download className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Lokales Backup herunterladen (JSON)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* API-Key Input / Edit / Delete Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gemini API-Key verwalten"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white text-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {storedKey ? "Gemini API-Key ändern" : "Gemini API-Key eingeben"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Gilt für Schreibwerkstatt, Fakten-Check, OCR &amp; HD-Stimmen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="gemini-api-key-input"
                  className="block text-xs font-bold text-slate-700"
                >
                  Google Gemini API-Key
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="gemini-api-key-input"
                    type={showKey ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showKey ? "API-Key verbergen" : "API-Key anzeigen"}
                    title={showKey ? "Verbergen" : "Anzeigen"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dein Schlüssel wird ausschließlich lokal im Browser dieses Geräts gespeichert und
                  kann jederzeit geändert oder gelöscht werden.
                </p>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold flex items-start gap-2 border ${
                    testResult.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {testResult.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div>
                  {storedKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteKey}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Key löschen
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTesting || !inputKey.trim()}
                    onClick={() => void handleTestKey(inputKey)}
                    className="text-xs font-bold border-slate-300 text-slate-700 gap-1.5"
                  >
                    {isTesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Testen
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputKey.trim()}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4"
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
