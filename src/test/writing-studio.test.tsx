import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiKeyMenu } from "@/components/ApiKeyMenu";
import { DatenschutzView } from "@/components/DatenschutzView";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PortfolioView } from "@/components/PortfolioView";
import { SpeechReader } from "@/components/SpeechReader/SpeechReader";
import { WritingStudio } from "@/components/WritingStudio/WritingStudio";
import {
  applySpokenPunctuationCommands,
  isStrictlyVerbatimPolish,
  mergeDictatedChunk,
} from "@/lib/dictation-utils";
import { createGlossaryIndex, findGlossaryMatch } from "@/lib/glossary-matcher";
import {
  buildPlainTextStory,
  buildPrintableHtml,
  generateStoryPdf,
} from "@/lib/print-story";
import { createSpeechRecognizer } from "@/lib/speech-reader";
import {
  GEMINI_API_KEY_STORAGE,
  buildAiRequestHeaders,
  clearStoredApiKey,
  getStoredApiKey,
  maskApiKey,
  saveStoredApiKey,
} from "@/lib/api-key-store";
import { CLOUD_TTS_KEY_STORAGE } from "@/lib/google-speech";
import {
  STORAGE_KEY_CUSTOM_SAGAS,
  STORAGE_KEY_DRAFTS,
  deleteCustomSaga,
  exportLocalBackupJson,
  findSagaById,
  importLocalBackupJson,
  loadDraft,
  markSagaRead,
  saveCustomSaga,
  saveDraft,
  toggleComprehensionTask,
} from "@/lib/local-store";
import { calculateDraftStats, createEmptyDraft } from "@/lib/writing-types";
import type { Saga } from "@/data/sagen-catalog";

describe("Writing-Studio Statistiken & Local-First Speicher", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("berechnet Wörter, begonnene Abschnitte und Lesezeit dynamisch", () => {
    const empty = calculateDraftStats({
      einfuehrung: "",
      thema: "",
      wende: "",
      bleibendes: "",
    });
    expect(empty.totalWords).toBe(0);
    expect(empty.startedSections).toBe(0);
    expect(empty.readingTimeMin).toBe(0);
    expect(empty.progressPercent).toBe(0);

    const partial = calculateDraftStats({
      einfuehrung: "Vor langer Zeit stand am Wörthersee eine reiche Stadt.",
      thema: "Am Osterabend feierten die Bürger übermütig.",
      wende: "",
      bleibendes: "",
    });
    expect(partial.totalWords).toBe(15);
    expect(partial.wordsBySection.einfuehrung).toBe(9);
    expect(partial.wordsBySection.thema).toBe(6);
    expect(partial.startedSections).toBe(2);
    expect(partial.readingTimeMin).toBe(1);
    expect(partial.progressPercent).toBe(50);
  });

  it("speichert Entwürfe, Lesestatus und eigene Sagen sauber im localStorage", () => {
    const draft = createEmptyDraft("sage-vom-woertherseemandl");
    draft.sections.einfuehrung = "Vor vielen Jahren lebten reiche Bürger am See.";
    saveDraft(draft);

    expect(window.localStorage.getItem(STORAGE_KEY_DRAFTS)).toBeTruthy();
    const reloaded = loadDraft("sage-vom-woertherseemandl");
    expect(reloaded.sections.einfuehrung).toBe(draft.sections.einfuehrung);
    expect(reloaded.readCompleted).toBe(false);

    markSagaRead("sage-vom-woertherseemandl");
    expect(loadDraft("sage-vom-woertherseemandl").readCompleted).toBe(true);

    const custom: Saga = {
      id: "upload-test-1",
      title: "Die Test-Sage",
      subtitle: "Eigener Upload",
      category: "Ortssagen",
      secondaryCategories: ["Eigene Sage"],
      region: "Wien",
      readingTimeMin: 1,
      wordCount: 50,
      summary: "Eine kurze Beispielsage für den lokalen Speicher.",
      historicalContext: "Test-Kontext",
      sections: [{ heading: "1. Die Einführung", text: "Es war einmal in Wien." }],
    };

    saveCustomSaga(custom);
    expect(window.localStorage.getItem(STORAGE_KEY_CUSTOM_SAGAS)).toBeTruthy();
    expect(findSagaById("upload-test-1")?.title).toBe("Die Test-Sage");

    const backup = JSON.parse(exportLocalBackupJson()) as {
      drafts: Record<string, unknown>;
      customSagas: Saga[];
    };
    expect(backup.customSagas).toHaveLength(1);
    expect(backup.drafts["sage-vom-woertherseemandl"]).toBeDefined();

    deleteCustomSaga("upload-test-1");
    expect(findSagaById("upload-test-1")).toBeUndefined();
  });

  it("rendert die Schreibwerkstatt mit Live-Wortzähler, Auto-Save und Original-Sage-Modal", () => {
    render(<WritingStudio sagaId="sage-vom-woertherseemandl" />);

    expect(screen.getByText("Jetzt bist du Erzähler.")).toBeInTheDocument();
    const introField = screen.getByLabelText(/1\. Die Einführung/i);

    fireEvent.change(introField, {
      target: { value: "Vor langer Zeit gab es eine prächtige Stadt." },
    });

    expect(loadDraft("sage-vom-woertherseemandl").sections.einfuehrung).toBe(
      "Vor langer Zeit gab es eine prächtige Stadt."
    );
    expect(screen.getByText("8 Wörter")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Original-Sage/i }));
    expect(screen.getByRole("dialog", { name: /Original-Sage lesen/i })).toBeInTheDocument();
  });

  it("ermöglicht Eingeben, Speichern, Ändern und Löschen des API-Keys über das Menü", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ serverKeyConfigured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<ApiKeyMenu />);

    // 1. Menü öffnen -> API-Key eingeben
    fireEvent.click(screen.getByRole("button", { name: /Menü & API-Key verwalten/i }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /API-Key eingeben/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /API-Key eingeben/i }));

    const input = screen.getByLabelText(/Google Gemini API-Key/i);
    fireEvent.change(input, { target: { value: "AIzaSyTestKey1234567890" } });
    fireEvent.click(screen.getByRole("button", { name: /^Speichern$/i }));

    expect(getStoredApiKey()).toBe("AIzaSyTestKey1234567890");
    expect(window.localStorage.getItem(GEMINI_API_KEY_STORAGE)).toBe("AIzaSyTestKey1234567890");
    expect(window.localStorage.getItem(CLOUD_TTS_KEY_STORAGE)).toBe("AIzaSyTestKey1234567890");
    expect(maskApiKey("AIzaSyTestKey1234567890")).toBe("AIzaSy••••7890");
    expect(buildAiRequestHeaders()["x-gemini-api-key"]).toBe("AIzaSyTestKey1234567890");

    // 2. Menü erneut öffnen -> API-Key ändern
    fireEvent.click(screen.getByRole("button", { name: /Menü & API-Key verwalten/i }));
    expect(screen.getByText("AIzaSy••••7890")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /API-Key ändern/i }));

    const editInput = screen.getByLabelText(/Google Gemini API-Key/i);
    fireEvent.change(editInput, { target: { value: "AIzaSyUpdatedKey9999" } });
    fireEvent.click(screen.getByRole("button", { name: /^Speichern$/i }));

    expect(getStoredApiKey()).toBe("AIzaSyUpdatedKey9999");

    // 3. Menü erneut öffnen -> API-Key löschen
    fireEvent.click(screen.getByRole("button", { name: /Menü & API-Key verwalten/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /API-Key löschen/i }));

    expect(getStoredApiKey()).toBe("");
    expect(window.localStorage.getItem(GEMINI_API_KEY_STORAGE)).toBeNull();
    expect(window.localStorage.getItem(CLOUD_TTS_KEY_STORAGE)).toBeNull();
    expect(buildAiRequestHeaders()["x-gemini-api-key"]).toBeUndefined();

    // Direktfunktionen prüfen
    saveStoredApiKey("AIzaSyDirectSave1234");
    expect(getStoredApiKey()).toBe("AIzaSyDirectSave1234");
    clearStoredApiKey();
    expect(getStoredApiKey()).toBe("");
  });

  it("erkennt B2-Glossarbegriffe inkl. Artikel-Entfernung und Flexionsformen", () => {
    const idx = createGlossaryIndex([
      { term: "der Übermut", explanation: "Leichtsinniger Stolz" },
      { term: "ungeheuerlich", explanation: "Außergewöhnlich groß" },
      { term: "prassen", explanation: "Verschwenderisch feiern" },
    ]);

    expect(findGlossaryMatch("Übermut", idx)?.term).toBe("der Übermut");
    expect(findGlossaryMatch("ungeheuerlicher", idx)?.term).toBe("ungeheuerlich");
    expect(findGlossaryMatch("prassten", idx)?.term).toBe("prassen");
    expect(findGlossaryMatch("und", idx)).toBeNull();
  });

  it("speichert Verständnisaufgaben, importiert JSON-Backups und zeigt Daten im Portfolio", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ serverKeyConfigured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const toggled = toggleComprehensionTask("sage-vom-woertherseemandl", "1. Ursachen der Zerstörung");
    expect(toggled.completedTaskTitles).toContain("1. Ursachen der Zerstörung");

    const draft = loadDraft("sage-vom-woertherseemandl");
    draft.sections.einfuehrung = "Vor langer Zeit lag am See eine reiche Stadt.";
    draft.lastFactCheck = { status: "super", score: 92, checkedAt: new Date().toISOString() };
    saveDraft(draft);

    const backupStr = exportLocalBackupJson();
    window.localStorage.clear();
    expect(loadDraft("sage-vom-woertherseemandl").sections.einfuehrung).toBe("");

    const res = importLocalBackupJson(backupStr);
    expect(res.draftsCount).toBe(1);
    expect(loadDraft("sage-vom-woertherseemandl").lastFactCheck?.score).toBe(92);
    expect(() => importLocalBackupJson("kein-json")).toThrow();

    render(<PortfolioView />);
    expect(screen.getByText("Mein Sagen-Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Das Wörtherseemandl")).toBeInTheDocument();
    expect(screen.getAllByText("92%").length).toBeGreaterThanOrEqual(1);
  });

  it("ermöglicht vollständiges Löschen aller lokalen Daten über /datenschutz", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ serverKeyConfigured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const draft = createEmptyDraft("sage-vom-woertherseemandl");
    draft.sections.einfuehrung = "Ein Beispieltext zum Löschen.";
    saveDraft(draft);
    saveStoredApiKey("AIzaSyToDelete12345");

    render(<DatenschutzView />);
    fireEvent.click(screen.getByRole("button", { name: /Alle lokalen Daten löschen/i }));
    fireEvent.click(screen.getByRole("button", { name: /Ja, alles löschen/i }));

    expect(loadDraft("sage-vom-woertherseemandl").sections.einfuehrung).toBe("");
    expect(getStoredApiKey()).toBe("");
  });

  it("fügt diktierte Sätze sauber ein und verhindert Wortverlust sowie Duplikate", () => {
    expect(mergeDictatedChunk("", "vor langer zeit am see")).toBe("Vor langer zeit am see");
    expect(mergeDictatedChunk("Es war einmal ein Fischer.", "er war sehr geizig")).toBe(
      "Es war einmal ein Fischer. Er war sehr geizig"
    );
    expect(mergeDictatedChunk("Das Wörtherseemandl kam", ", und warnte sie.")).toBe(
      "Das Wörtherseemandl kam, und warnte sie."
    );
    // Safari/Android Duplikat-Schutz
    expect(
      mergeDictatedChunk("Es war einmal ein Fischer", "ein Fischer")
    ).toBe("Es war einmal ein Fischer");
  });

  it("flusht offene Live-Wörter beim Stoppen und unterdrückt falsche Aborted-Fehler", () => {
    let instance: any = null;
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      lang = "";
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        instance = this;
      }
      stop() {
        this.onerror?.({ error: "aborted" });
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
      MockSpeechRecognition;

    const finals: string[] = [];
    const interims: string[] = [];
    const errors: string[] = [];

    const handle = createSpeechRecognizer({
      language: "de-AT",
      onResult: (text, isFinal) => {
        if (isFinal) finals.push(text);
        else interims.push(text);
      },
      onError: (msg) => errors.push(msg),
      onEnd: () => undefined,
    });

    expect(handle).not.toBeNull();
    handle!.start();

    // 1. Final + Interim im selben Event
    instance.onresult({
      results: [
        Object.assign([{ transcript: "Vor langer Zeit" }], { isFinal: true }),
        Object.assign([{ transcript: "lebte ein Fischer" }], { isFinal: false }),
      ],
    });
    expect(finals).toEqual(["Vor langer Zeit"]);
    expect(interims.at(-1)).toBe("lebte ein Fischer");

    // 2. Safari sendet Index 0 erneut als final -> darf NICHT gedoppelt werden
    instance.onresult({
      results: [
        Object.assign([{ transcript: "Vor langer Zeit" }], { isFinal: true }),
        Object.assign([{ transcript: "lebte ein Fischer am See" }], { isFinal: false }),
      ],
    });
    expect(finals).toEqual(["Vor langer Zeit"]);

    // 3. Stoppen -> noch offenes Interim muss als Final übernommen werden, kein aborted-Fehler!
    handle!.stop();
    expect(finals).toEqual(["Vor langer Zeit", "lebte ein Fischer am See"]);
    expect(errors).toEqual([]);

    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });

  it("wandelt österreichische Diktierbefehle (Punkt, Beistrich, Rufzeichen, neue Zeile) sicher um und blockt hinzugedichtete Sätze", () => {
    expect(
      applySpokenPunctuationCommands(
        "vor langer zeit beistrich da stand eine stadt punkt neue zeile die menschen waren übermütig rufzeichen"
      )
    ).toBe("Vor langer zeit, da stand eine stadt.\nDie menschen waren übermütig!");

    expect(
      applySpokenPunctuationCommands(
        "was geschah fragezeichen neuer absatz er rief doppelpunkt anführungszeichen auf halt ein rufzeichen anführungszeichen zu"
      )
    ).toBe("Was geschah?\n\nEr rief: „Halt ein!“");

    // Nomen-Schutz: "an diesem Punkt" bleibt erhalten, nur der Befehl am Ende wird zum Punkt
    expect(applySpokenPunctuationCommands("an diesem punkt blieb er stehen punkt")).toBe(
      "An diesem punkt blieb er stehen."
    );

    // Strenger Verbatim-Guard
    expect(
      isStrictlyVerbatimPolish(
        "vor langer zeit am wörthersee lebte ein fischer",
        "Vor langer Zeit am Wörthersee lebte ein Fischer."
      )
    ).toBe(true);
    expect(
      isStrictlyVerbatimPolish(
        "es war kalt",
        "Es war ein sehr kalter Wintertag und ein riesiger Drache flog über das ganze Tal hinweg."
      )
    ).toBe(false);
  });

  it("rendert MobileBottomNav mit allen Hauptzielen und mobile Aktionsleiste in der Schreibwerkstatt", () => {
    const { unmount } = render(<MobileBottomNav />);
    const nav = screen.getByRole("navigation", { name: /Mobile Hauptnavigation/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sagen/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Portfolio/i })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: /Datenschutz/i })).toHaveAttribute(
      "href",
      "/datenschutz"
    );
    unmount();

    render(<WritingStudio sagaId="sage-vom-woertherseemandl" />);
    expect(
      screen.getAllByRole("button", { name: /Text & Fakten prüfen/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /PDF/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("blättert im SpeechReader auf Smartphones (unter 1024px) seitenweise per Wischgeste ohne Seite 2 zu überspringen", () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });

    try {
      const { container } = render(<SpeechReader initialSagaId="sage-vom-woertherseemandl" />);

      // Auf Smartphones ist Einzelseiten-Modus aktiv: Seite 1 sichtbar, Seite 2 NICHT gleichzeitig
      expect(screen.getByLabelText("Seite 1")).toHaveTextContent("1");
      expect(screen.queryByLabelText("Seite 2")).not.toBeInTheDocument();
      expect(screen.getByText(/^S\. 1 \/ \d+$/)).toBeInTheDocument();

      // Nach links wischen -> genau auf Seite 2 blättern (nicht Seite 3!)
      const bookSheet = container.querySelector("article")?.parentElement?.parentElement;
      expect(bookSheet).toBeTruthy();
      fireEvent.touchStart(bookSheet!, { touches: [{ clientX: 280, clientY: 200 }] });
      fireEvent.touchEnd(bookSheet!, { changedTouches: [{ clientX: 120, clientY: 205 }] });

      expect(screen.getByLabelText("Seite 2")).toHaveTextContent("2");
      expect(screen.getByText(/^S\. 2 \/ \d+$/)).toBeInTheDocument();

      // Nach rechts wischen -> zurück auf Seite 1
      fireEvent.touchStart(bookSheet!, { touches: [{ clientX: 120, clientY: 200 }] });
      fireEvent.touchEnd(bookSheet!, { changedTouches: [{ clientX: 280, clientY: 198 }] });

      expect(screen.getByLabelText("Seite 1")).toHaveTextContent("1");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it("öffnet eine mobil- und tablet-sichere Druckvorschau inkl. eigenständigem HTML-Export", async () => {
    const saga = findSagaById("sage-vom-woertherseemandl")!;
    const draft = createEmptyDraft(saga.id);
    draft.sections.einfuehrung = "Vor langer Zeit lebten <stolze> Menschen am See.";
    saveDraft(draft);

    const htmlWithGlossary = buildPrintableHtml({
      saga,
      draft,
      totalWords: 7,
      includeGlossary: true,
    });
    expect(htmlWithGlossary).toContain("&lt;stolze&gt;");
    expect(htmlWithGlossary).toContain("Anhang: B2-Wortschatz");
    expect(htmlWithGlossary).toContain("window.print()");

    const htmlWithoutGlossary = buildPrintableHtml({
      saga,
      draft,
      totalWords: 7,
      includeGlossary: false,
    });
    expect(htmlWithoutGlossary).not.toContain("Anhang: B2-Wortschatz");

    const plainText = buildPlainTextStory({
      saga,
      draft,
      totalWords: 7,
      includeGlossary: false,
    });
    expect(plainText).toContain(saga.title);
    expect(plainText).toContain("Vor langer Zeit lebten <stolze> Menschen am See.");

    const pdf = await generateStoryPdf({
      saga,
      draft,
      totalWords: 7,
      includeGlossary: true,
    });
    expect(pdf.blob.type).toBe("application/pdf");
    expect(pdf.blob.size).toBeGreaterThan(500);
    expect(pdf.filename).toMatch(/\.pdf$/);

    const printSpy = vi.fn();
    Object.defineProperty(window, "print", {
      writable: true,
      configurable: true,
      value: printSpy,
    });

    render(<WritingStudio sagaId={saga.id} />);

    // Klick auf den mobilen/Desktop PDF-Button öffnet die Druckvorschau
    const printButtons = screen.getAllByRole("button", { name: /PDF|drucken/i });
    fireEvent.click(printButtons[0]);

    expect(
      screen.getByRole("dialog", { name: /Drucken und PDF-Export/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Als PDF speichern \/ drucken/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Druckansicht im neuen Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Text teilen \/ kopieren/i })).toBeInTheDocument();

    // Direktdruck löst SYNCHRON im Click-Handler window.print() aus (wichtig für iOS/iPadOS User-Gesture)
    fireEvent.click(screen.getByRole("button", { name: /Direkt drucken/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});
