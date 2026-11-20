import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SpeechReader } from "@/components/SpeechReader/SpeechReader";
import { SAGEN_CATALOG } from "@/data/sagen-catalog";
import {
  DEFAULT_READER_SETTINGS,
  READER_DESIGNS_CONFIG,
  STORAGE_KEY_SETTINGS,
  estimateTimeForWordInSpan,
  estimateWordIndexInSpan,
  normalizeReaderDesign,
  paginateContent,
  splitGermanSentences,
  tokenizeSentenceWords,
  type ReaderDesign,
} from "@/lib/speech-reader";
import {
  CLOUD_HD_VOICES,
  GERMAN_HD_VOICES,
  ENGLISH_US_HD_VOICES,
  ALL_READER_VOICES,
  hdVoicesForLanguage,
  resolveVoice,
} from "@/lib/google-voices";
import { prepareTextForFluentSpeech } from "@/lib/google-speech";

describe("Sagen-Katalog", () => {
  it("enthält die neuen Wörtherseemandl-, Lindwurm- und Siegfried-Sagen (MP3 + MD) statt der alten Sagen", () => {
    const ids = SAGEN_CATALOG.map((s) => s.id);
    expect(ids).not.toContain("woerthersee-mandl");
    expect(ids).not.toContain("lindwurm-klagenfurt");
    expect(ids).not.toContain("siegfried-lindwurm");
    expect(ids).toContain("sage-vom-woertherseemandl");
    expect(ids).toContain("das-ungeheuer-vom-woerthersee-lindwurm");
    expect(ids).toContain("siegfried-kampf-gegen-das-ungeheuer");
    expect(ids).toContain("der-steinerne-fischer-vom-woerthersee");
    expect(ids).toContain("daedalus-ikarus");
    expect(ids).toContain("drachenhoehle-mixnitz");
  });

  it("deckt Raum Klagenfurt, Heldensagen, Ortssagen, Nibelungensagen und Antike ab", () => {
    const woerthersee = SAGEN_CATALOG.find((s) => s.id === "sage-vom-woertherseemandl")!;
    expect(woerthersee.title).toBe("Das Wörtherseemandl");
    expect(woerthersee.category).toBe("Raum Klagenfurt");
    expect(woerthersee.secondaryCategories).toContain("Ortssagen");
    expect(woerthersee.audioUrl).toBe("/audio/die-sage-vom-woertherseemandl.mp3");
    expect(woerthersee.glossary).toHaveLength(9);
    expect(woerthersee.comprehensionTasks).toHaveLength(3);
    expect(woerthersee.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const totalSentences = woerthersee.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(woerthersee.audioTimings).toHaveLength(totalSentences);
    expect(woerthersee.audioSpeechSpans).toHaveLength(totalSentences);

    const lindwurm = SAGEN_CATALOG.find(
      (s) => s.id === "das-ungeheuer-vom-woerthersee-lindwurm"
    )!;
    expect(lindwurm.title).toBe("Der Lindwurm von Klagenfurt");
    expect(lindwurm.region).toContain("Klagenfurt");
    expect(lindwurm.secondaryCategories).toContain("Heldensagen");
    expect(lindwurm.audioUrl).toBe("/audio/das-ungeheuer-vom-woerthersee-lindwurm.mp3");
    expect(lindwurm.glossary).toHaveLength(8);
    expect(lindwurm.comprehensionTasks).toHaveLength(3);
    expect(lindwurm.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const lindwurmSentences = lindwurm.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(lindwurm.audioTimings).toHaveLength(lindwurmSentences);
    expect(lindwurm.audioSpeechSpans).toHaveLength(lindwurmSentences);

    const siegfried = SAGEN_CATALOG.find(
      (s) => s.id === "siegfried-kampf-gegen-das-ungeheuer"
    )!;
    expect(siegfried.title).toBe("Siegfried der Drachentöter");
    expect(siegfried.category).toBe("Nibelungensagen");
    expect(siegfried.secondaryCategories).toContain("Heldensagen");
    expect(siegfried.audioUrl).toBe("/audio/siegfried-der-drachentoeter.mp3");
    expect(siegfried.glossary).toHaveLength(8);
    expect(siegfried.comprehensionTasks).toHaveLength(3);
    expect(siegfried.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const siegfriedSentences = siegfried.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(siegfried.audioTimings).toHaveLength(siegfriedSentences);
    expect(siegfried.audioSpeechSpans).toHaveLength(siegfriedSentences);

    const fischer = SAGEN_CATALOG.find(
      (s) => s.id === "der-steinerne-fischer-vom-woerthersee"
    )!;
    expect(fischer.title).toBe("Der steinerne Fischer vom Wörthersee");
    expect(fischer.category).toBe("Raum Klagenfurt");
    expect(fischer.secondaryCategories).toContain("Ortssagen");
    expect(fischer.audioUrl).toBe("/audio/der-steinerne-fischer-vom-woerthersee.mp3");
    expect(fischer.glossary).toHaveLength(8);
    expect(fischer.comprehensionTasks).toHaveLength(3);
    expect(fischer.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const fischerSentences = fischer.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(fischer.audioTimings).toHaveLength(fischerSentences);
    expect(fischer.audioSpeechSpans).toHaveLength(fischerSentences);

    const daedalus = SAGEN_CATALOG.find((s) => s.id === "daedalus-ikarus")!;
    expect(daedalus.title).toBe("Dädalus und Ikarus");
    expect(daedalus.secondaryCategories).toContain("Heldensagen");
    expect(daedalus.category).toBe("Antike Mythen");
    expect(daedalus.audioUrl).toBe("/audio/daedalus-und-ikarus.mp3");
    expect(daedalus.glossary).toHaveLength(9);
    expect(daedalus.comprehensionTasks).toHaveLength(3);
    expect(daedalus.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const daedalusSentences = daedalus.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(daedalus.audioTimings).toHaveLength(daedalusSentences);
    expect(daedalus.audioSpeechSpans).toHaveLength(daedalusSentences);

    const mixnitz = SAGEN_CATALOG.find((s) => s.id === "drachenhoehle-mixnitz")!;
    expect(mixnitz.title).toBe("Die Drachenhöhle bei Mixnitz");
    expect(mixnitz.category).toBe("Ortssagen");
    expect(mixnitz.secondaryCategories).toContain("Heldensagen");
    expect(mixnitz.region).toContain("Mixnitz");
    expect(mixnitz.audioUrl).toBe("/audio/die-drachenhoehle-bei-mixnitz.mp3");
    expect(mixnitz.glossary).toHaveLength(9);
    expect(mixnitz.comprehensionTasks).toHaveLength(3);
    expect(mixnitz.comprehensionTasks?.every((t) => Boolean(t.sampleAnswer))).toBe(true);
    const mixnitzSentences = mixnitz.sections.flatMap((sec) =>
      splitGermanSentences(sec.text)
    ).length;
    expect(mixnitz.audioTimings).toHaveLength(mixnitzSentences);
    expect(mixnitz.audioSpeechSpans).toHaveLength(mixnitzSentences);
  });

  it("jede Sage besitzt Abschnitte, Lesedauer, Wortanzahl und Hintergrundwissen", () => {
    for (const saga of SAGEN_CATALOG) {
      expect(saga.title.length).toBeGreaterThan(3);
      expect(saga.summary.length).toBeGreaterThan(20);
      expect(saga.historicalContext.length).toBeGreaterThan(30);
      expect(saga.readingTimeMin).toBeGreaterThanOrEqual(1);
      expect(saga.wordCount).toBeGreaterThan(200);
      expect(saga.sections.length).toBe(4);
    }
  });

  it("jede Sage ist exakt nach den 4 Aufbausteinen der Sage gegliedert (Einführung, Thema, Wende, Bleibendes)", () => {
    for (const saga of SAGEN_CATALOG) {
      expect(saga.sections).toHaveLength(4);
      expect(saga.sections[0]?.heading).toMatch(/1\.\s*Die Einführung/i);
      expect(saga.sections[1]?.heading).toMatch(/2\.\s*Das Thema/i);
      expect(saga.sections[2]?.heading).toMatch(/3\.\s*Die Wende/i);
      expect(saga.sections[3]?.heading).toMatch(/4\.\s*Das Bleibende/i);

      for (const section of saga.sections) {
        expect(section.text.length).toBeGreaterThan(150);
        // Prüft B2-Vokabular & Satzkomplexität (z. B. Nebensätze, Satzgefüge)
        expect(section.text).toMatch(/,|:|»|«|!|\?/);
      }
    }
  });
});

describe("Satz-Segmentierung (splitGermanSentences)", () => {
  it("trennt Sätze korrekt und beachtet deutsche Abkürzungen", () => {
    const text =
      "Vor vielen Jahren stand dort eine prächtige Stadt. Das Wörtherseemandl trug z. B. ein gelbes Röckchen! Niemand hörte auf die Warnung?";
    const sentences = splitGermanSentences(text);
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toBe("Vor vielen Jahren stand dort eine prächtige Stadt.");
    expect(sentences[1]).toBe("Das Wörtherseemandl trug z. B. ein gelbes Röckchen!");
    expect(sentences[2]).toBe("Niemand hörte auf die Warnung?");
  });

  it("verhindert abgehackte Sätze bei Ortsnamen mit St. (Sankt) und Jahrhunderten", () => {
    const text =
      "In St. Veit an der Glan lebte im 14. Jahrhundert ein tapferer Ritter. Er bezwang den Lindwurm usw. mit List!";
    const sentences = splitGermanSentences(text);
    expect(sentences.length).toBe(2);
    expect(sentences[0]).toBe(
      "In St. Veit an der Glan lebte im 14. Jahrhundert ein tapferer Ritter."
    );
    expect(sentences[1]).toBe("Er bezwang den Lindwurm usw. mit List!");
  });

  it("trennt direkte Rede nach Doppelpunkt und Anführungszeichen sauber für Audio-Timings", () => {
    const text =
      'Sie riefen spöttisch: „Was willst du uns schon antun? Willst du uns ertränken?“ Unter dem Gejohle wurde er fortgeschickt.';
    const sentences = splitGermanSentences(text);
    expect(sentences).toHaveLength(4);
    expect(sentences[0]).toBe("Sie riefen spöttisch:");
    expect(sentences[1]).toBe("„Was willst du uns schon antun?");
    expect(sentences[2]).toBe("Willst du uns ertränken?“");
    expect(sentences[3]).toBe("Unter dem Gejohle wurde er fortgeschickt.");
  });
});

describe("Text-Bereinigung für flüssiges Vorlesen (prepareTextForFluentSpeech)", () => {
  it("löst St., z. B., usw., etc. in flüssig gesprochene Wörter auf", () => {
    const raw = 'In St. Veit lebte z. B. der Ritter; er kämpfte tapfer – „ohne Furcht“ – usw.!';
    const clean = prepareTextForFluentSpeech(raw);
    expect(clean).toContain("Sankt Veit");
    expect(clean).toContain("zum Beispiel");
    expect(clean).toContain("und so weiter");
    expect(clean).not.toContain("„");
    expect(clean).not.toContain("“");
    expect(clean).not.toContain(";");
  });
});

describe("Seitenaufteilung (Pagination)", () => {
  it("teilt langen Text in Seiten auf, wenn Text länger als Budget", () => {
    const woerthersee = SAGEN_CATALOG.find((s) => s.id === "sage-vom-woertherseemandl")!;
    const pages = paginateContent(woerthersee.sections, 19);

    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]?.pageNumber).toBe(1);
    expect(pages[0]?.totalPages).toBe(pages.length);
    expect(pages[0]?.paragraphs.length).toBeGreaterThan(0);
    expect(pages[0]?.firstSentenceIndex).toBe(0);
    expect(pages[0]?.lastSentenceIndex).toBeGreaterThan(0);
  });

  it("passt die Wortmenge pro Seite an die Schriftgröße an", () => {
    const siegfried = SAGEN_CATALOG.find(
      (s) => s.id === "siegfried-kampf-gegen-das-ungeheuer"
    )!;
    const pagesSmallFont = paginateContent(siegfried.sections, 15);
    const pagesLargeFont = paginateContent(siegfried.sections, 26);

    // Größere Schrift benötigt mehr Seiten für denselben Text
    expect(pagesLargeFont.length).toBeGreaterThanOrEqual(pagesSmallFont.length);
  });
});

describe("Designs & Stimmen (Google & Gemini)", () => {
  it("ersetzt alle alten Designs durch 6 kuratierte Leseschemen & Papiertöne (Flexoki, Sepia, Salbei, Quiet, Schiefer, Nacht)", () => {
    const designs = Object.keys(READER_DESIGNS_CONFIG) as ReaderDesign[];
    expect(designs).toHaveLength(6);
    expect(designs).not.toContain("pergament");
    expect(designs).not.toContain("klassisch");
    expect(designs).not.toContain("sanft");
    expect(designs).not.toContain("nacht");
    expect(designs).not.toContain("mokka");

    expect(designs).toContain("flexoki");
    expect(designs).toContain("kindlesepia");
    expect(designs).toContain("nordlicht");
    expect(designs).toContain("quietgray");
    expect(designs).toContain("studio");
    expect(designs).toContain("nachtblau");

    // Veraltete gespeicherte Design-IDs werden sauber auf neue Schemen migriert
    expect(normalizeReaderDesign("pergament")).toBe("studio");
    expect(normalizeReaderDesign("klassisch")).toBe("quietgray");
    expect(normalizeReaderDesign("sanft")).toBe("nordlicht");
    expect(normalizeReaderDesign("nacht")).toBe("nachtblau");
    expect(normalizeReaderDesign("mokka")).toBe("kindlesepia");
  });

  it("wendet ein neu gewähltes Farbschema live auf Buchansicht und Fließtext an", () => {
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    const { container } = render(<SpeechReader initialSagaId="sage-vom-woertherseemandl" />);

    // Standard-Schema in Buchansicht ist "studio" (#434247)
    expect(container.querySelector("article")?.className).toContain("bg-[#434247]");

    // In den Einstellungen "Warmes Sepia" wählen
    fireEvent.click(screen.getByRole("button", { name: /Ansicht & Tempo/i }));
    const sepiaBtn = screen.getByRole("button", { name: /Warmes Sepia/i });
    fireEvent.click(sepiaBtn);
    expect(sepiaBtn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Fertig/i }));

    // Buchseite trägt sofort Sepia-Papierton (#FBF0D9)
    expect(container.querySelector("article")?.className).toContain("bg-[#FBF0D9]");

    // Wechsel in den Fließtext -> gleiches Sepia-Papier bleibt aktiv
    fireEvent.click(
      screen.getByTitle(/Zwischen Buch-Darstellung \(ohne Scrollen\) und Fließtext umschalten/i)
    );
    expect(container.querySelector("article")?.className).toContain("bg-[#FBF0D9]");
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
  });

  it("enthält ausschließlich echte Google Cloud / Gemini HD Stimmen mit API-Key-Pflicht", () => {
    expect(CLOUD_HD_VOICES.length).toBeGreaterThanOrEqual(20);
    expect(ALL_READER_VOICES.length).toBe(CLOUD_HD_VOICES.length);
    const ids = CLOUD_HD_VOICES.map((v) => v.id);

    // Echte Chirp 3 HD & Gemini HD Stimmen vorhanden
    expect(ids).toContain("de-DE-Chirp3-HD-Aoede");
    expect(ids).toContain("de-DE-Chirp3-HD-Puck");
    expect(ids).toContain("de-DE-Chirp3-HD-Charon");
    expect(ids).toContain("en-US-Chirp3-HD-Aoede");
    expect(GERMAN_HD_VOICES.length).toBeGreaterThanOrEqual(6);
    expect(ENGLISH_US_HD_VOICES.length).toBeGreaterThanOrEqual(4);
    expect(hdVoicesForLanguage("de-DE").every((v) => v.lang === "de-DE")).toBe(true);

    // Alle alten Standard-/Platzhalter-Stimmen vollständig entfernt
    expect(ids).not.toContain("google-de-standard");
    expect(ids).not.toContain("google-de-female");
    expect(ids).not.toContain("google-de-male");
    expect(ids).not.toContain("google-at-austria");
    expect(ids.some((id) => id.includes("Neural2") || id.includes("Standard"))).toBe(false);

    for (const v of CLOUD_HD_VOICES) {
      expect(v.requiresApiKey).toBe(true);
      expect(["google-cloud-hd", "gemini-hd"]).toContain(v.provider);
      expect(v.cloudTtsVoice).toMatch(/-Chirp3-HD-/);
      expect(v.geminiVoice.length).toBeGreaterThan(2);
      expect(v.name.length).toBeGreaterThan(3);
      expect(v.description.length).toBeGreaterThan(15);
      expect(v.sampleSentence.length).toBeGreaterThan(15);
      expect(v.rate).toBeGreaterThan(0.7);
    }
  });

  it("löst Legacy-Stimmen-IDs nahtlos auf echte HD-Stimmen auf", () => {
    expect(resolveVoice("erzaehler-episch").id).toBe("de-DE-Chirp3-HD-Charon");
    expect(resolveVoice("maerchen-warm").id).toBe("de-DE-Chirp3-HD-Aoede");
    expect(resolveVoice("heldensaga-dynamisch").id).toBe("de-DE-Chirp3-HD-Fenrir");
    expect(resolveVoice("hoerbuch-studio").id).toBe("de-DE-Chirp3-HD-Kore");
    expect(resolveVoice("google-de-standard").id).toBe("de-DE-Chirp3-HD-Kore");
    expect(resolveVoice("de-DE-Chirp3-HD-Puck").id).toBe("de-DE-Chirp3-HD-Puck");
  });

  it("unterstützt stufenlose Abspielgeschwindigkeiten von 0.5× bis 2.0×", () => {
    const rates = [0.5, 0.65, 0.85, 1.0, 1.15, 1.35, 1.7, 2.0];
    for (const r of rates) {
      expect(r).toBeGreaterThanOrEqual(0.5);
      expect(r).toBeLessThanOrEqual(2.0);
    }
  });

  it("rendert alle 6 Sagen im sauberen Doppelseiten-Buchlayout und mit Auswahl echter Google Cloud / Gemini HD Stimmen", () => {
    expect(DEFAULT_READER_SETTINGS.voiceId).toMatch(/-Chirp3-HD-/);

    for (const saga of SAGEN_CATALOG) {
      const { unmount } = render(<SpeechReader initialSagaId={saga.id} />);
      expect(screen.getAllByText(new RegExp(saga.title, "i")).length).toBeGreaterThanOrEqual(1);
      // Sauberes Buchlayout ohne E-Reader-Geräterahmen oder Statusleiste im Blatt
      expect(screen.queryByText(/KINDLE PAPERWHITE/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/gelesen/i)).not.toBeInTheDocument();
      // Erste Buchseite & Doppelseiten-Seitenzahlen
      expect(screen.getByLabelText("Seite 1")).toHaveTextContent("1");
      expect(screen.getByLabelText("Seite 2")).toHaveTextContent("2");
      expect(screen.getAllByText(/1\. Die Einführung/i).length).toBeGreaterThanOrEqual(1);
      // Doppelseiten-Umschalter und direkter Player
      expect(screen.getByRole("button", { name: /Doppelseite|Einzelseite/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Abspielen/i })).toBeInTheDocument();

      // Keine fest eingebundene Erzählstimme mehr
      expect(screen.queryByText(/Elena \(KI-Erzählerin\)/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Thorsten \(KI-Erzähler\)/i)).not.toBeInTheDocument();

      // Echte Google Cloud / Gemini HD Stimmen frei wählbar
      const voiceSelect = screen.getByLabelText(
        /Google Cloud \/ Gemini HD Stimme wählen/i
      ) as HTMLSelectElement;
      expect(voiceSelect).toBeInTheDocument();
      const optionValues = Array.from(voiceSelect.options).map((o) => o.value);
      expect(optionValues).toContain("de-DE-Chirp3-HD-Aoede");
      expect(optionValues).toContain("de-DE-Chirp3-HD-Puck");
      expect(optionValues.every((v) => v.includes("-Chirp3-HD-"))).toBe(true);
      unmount();
    }
  });

  it("rendert SpeechReader in der Bibliothek ebenfalls mit HD-Stimmenauswahl und ohne feste Sagenstimmen", () => {
    // 1. Bibliotheks-Modus (activeSaga = null)
    const { unmount } = render(<SpeechReader />);
    expect(screen.getByText(/Sagen & Mythen Lesestudio/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Anhören & Lesen/i })).toHaveLength(
      SAGEN_CATALOG.length
    );
    expect(screen.queryByText(/Elena \(KI-Erzählerin\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Thorsten \(KI-Erzähler\)/i)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/Google Cloud \/ Gemini HD Stimme wählen/i)
    ).toBeInTheDocument();
    unmount();

    // 2. Aktive Buchansicht (activeSaga vorhanden)
    render(<SpeechReader initialSagaId="sage-vom-woertherseemandl" />);
    expect(screen.getAllByText(/Das Wörtherseemandl/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Original-MP3|KI-Stimme/i })).toBeInTheDocument();
  });

  it("wechselt in das ruhige Dokument-Layout für den Fließtext-Modus inklusive Glossar & Aufgaben", () => {
    render(<SpeechReader initialSagaId="sage-vom-woertherseemandl" />);
    const toggleBtn = screen.getByTitle(
      /Zwischen Buch-Darstellung \(ohne Scrollen\) und Fließtext umschalten/i
    );
    fireEvent.click(toggleBtn);

    expect(
      screen.getByText("Das Wörtherseemandl", { selector: "h2" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Die prächtige Stadt am Wörthersee und der Übermut/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Wortschatz und Ausdrücke \(B2-Glossar\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Aufgaben zum Textverständnis/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/· B2 Niveau/i).length).toBe(4);
    expect(screen.queryByText(/KINDLE PAPERWHITE/i)).not.toBeInTheDocument();
  });

  it("markiert beim Mitlesen immer nur genau ein Wort statt der ganzen Zeile", async () => {
    const sample = "Ein stiller See – der heutige Wörthersee.";
    const parsed = tokenizeSentenceWords(sample);
    // Standalone Gedankenstrich "–" zählt nicht als hervorzuhebendes Wort
    expect(parsed.wordCount).toBe(6);
    expect(estimateWordIndexInSpan(sample, 10.0, 10.0, 14.0)).toBe(0);
    expect(estimateWordIndexInSpan(sample, 13.99, 10.0, 14.0)).toBe(5);
    expect(estimateTimeForWordInSpan(sample, 0, 10.0, 14.0)).toBe(10.0);
    expect(estimateTimeForWordInSpan(sample, 3, 10.0, 14.0)).toBeGreaterThan(10.5);

    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());
    const pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined);
    const loadSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "load")
      .mockImplementation(() => undefined);

    try {
      const { container, unmount } = render(
        <SpeechReader initialSagaId="sage-vom-woertherseemandl" />
      );

      // 1. Wort-für-Wort in der Buchansicht
      const wordBtn = screen.getByText("Wellen");
      fireEvent.click(wordBtn);

      const activeWords = container.querySelectorAll('[data-active-word="true"]');
      expect(activeWords).toHaveLength(1);
      expect(activeWords[0]).toHaveTextContent("Wellen");
      expect(activeWords[0]!.className).not.toMatch(/font-semibold|font-bold|px-0\.5/);
      expect(screen.getByText("langer")).not.toHaveAttribute("data-active-word", "true");

      // 2. Wechsel in den Fließtext-Modus -> weiterhin genau 1 aktives Wort markiert
      const toggleBtn = screen.getByTitle(
        /Zwischen Buch-Darstellung \(ohne Scrollen\) und Fließtext umschalten/i
      );
      fireEvent.click(toggleBtn);

      const activeFlowWords = container.querySelectorAll('[data-active-word="true"]');
      expect(activeFlowWords).toHaveLength(1);
      expect(activeFlowWords[0]).toHaveTextContent("Wellen");
      expect(activeFlowWords[0]!.className).not.toMatch(/font-semibold|font-bold|px-0\.5/);
      unmount();
      await Promise.resolve();
    } finally {
      playSpy.mockRestore();
      pauseSpy.mockRestore();
      loadSpy.mockRestore();
    }
  });

  it("startet das Wort-für-Wort Mitlesen sofort nach Klick auf Abspielen ohne Textklick", async () => {
    const createdAudios: HTMLAudioElement[] = [];
    const OriginalAudio = window.Audio;
    const AudioMock = vi.fn(function (this: unknown, src?: string) {
      const el = new OriginalAudio(src);
      createdAudios.push(el);
      return el;
    }) as unknown as typeof Audio;
    AudioMock.prototype = OriginalAudio.prototype;
    window.Audio = AudioMock;

    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());
    const pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined);
    const loadSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "load")
      .mockImplementation(() => undefined);

    try {
      const { container, unmount } = render(
        <SpeechReader initialSagaId="sage-vom-woertherseemandl" />
      );

      // Direkt auf "Abspielen" klicken ohne vorher auf den Text zu klicken
      fireEvent.click(screen.getByRole("button", { name: /Abspielen/i }));
      expect(playSpy).toHaveBeenCalledTimes(1);
      expect(createdAudios).toHaveLength(1);

      // Erstes Wort sofort aktiv markiert
      let activeWords = container.querySelectorAll('[data-active-word="true"]');
      expect(activeWords).toHaveLength(1);
      expect(activeWords[0]).toHaveTextContent("Vor");

      // Nach Abschluss von audio.play() darf pause() nicht fälschlich ausgelöst werden
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(pauseSpy).not.toHaveBeenCalled();

      // Fortschritt im Audio aktualisiert automatisch das markierte Wort
      const audio = createdAudios[0]!;
      Object.defineProperty(audio, "duration", { value: 149.62, configurable: true });
      await act(async () => {
        audio.currentTime = 3.25;
        fireEvent(audio, new Event("timeupdate"));
      });

      activeWords = container.querySelectorAll('[data-active-word="true"]');
      expect(activeWords).toHaveLength(1);
      expect(activeWords[0]).toHaveTextContent("langer");

      unmount();
      await Promise.resolve();
    } finally {
      window.Audio = OriginalAudio;
      playSpy.mockRestore();
      pauseSpy.mockRestore();
      loadSpy.mockRestore();
    }
  });
});
