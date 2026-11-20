import { DEFAULT_VOICE, resolveVoice } from "./google-voices";

export type ReaderDesign =
  | "flexoki"
  | "kindlesepia"
  | "nordlicht"
  | "quietgray"
  | "studio"
  | "nachtblau";
export type ReaderFont = "serif" | "sans" | "grotesk" | "dyslexic";
export type ReaderMargin = "narrow" | "normal" | "book";
export type ReaderMode = "pages" | "scroll";

export interface ReaderSettings {
  design: ReaderDesign;
  font: ReaderFont;
  fontSize: number; // 15, 17, 19, 22, 26
  lineHeight: "compact" | "normal" | "loose";
  margin: ReaderMargin;
  mode: ReaderMode;
  bookSpread: boolean; // Doppelseite (offenes Buch) auf größeren Bildschirmen
  autoScroll: boolean;
  autoScrollSpeed: number; // 1 = slow, 2 = normal, 3 = fast
  speechRate: number; // 0.5 to 2.0 (Wiedergabetempo der Google Cloud / Gemini HD Stimme)
  voiceId: string; // Echte Google Cloud / Gemini HD Stimme (z. B. de-DE-Chirp3-HD-Aoede)
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  design: "studio",
  font: "serif",
  fontSize: 19,
  lineHeight: "normal",
  margin: "book",
  mode: "pages",
  bookSpread: true,
  autoScroll: true,
  autoScrollSpeed: 2,
  speechRate: 1.0,
  voiceId: DEFAULT_VOICE.id,
};

export interface ReaderDesignTheme {
  label: string;
  badge: string;
  description: string;
  isDark: boolean;
  viewportClass: string;
  chromeClass: string;
  chromePillClass: string;
  spreadWrapperClass: string;
  sheetClass: string;
  headingClass: string;
  proseClass: string;
  mutedClass: string;
  accentClass: string;
  borderSubtleClass: string;
  spineClass: string;
  navOrbClass: string;
  hoverZoneClass: string;
  hoverZoneIconClass: string;
  activeWordClass: string;
  spokenWordClass: string;
  hoverWordClass: string;
  swatchBg: string;
  swatchText: string;
  swatchAccent: string;
}

/**
 * Kuratierte Farbschemata & Papiertöne für ermüdungsfreies Lesen,
 * angelehnt an bewährte Lesemodi (Flexoki Paper, Kindle Sepia, Apple Books Quiet/Calm,
 * ruhiges Studio-Schiefer und WCAG-AAA-Nachtlesen).
 */
export const READER_DESIGNS_CONFIG: Record<ReaderDesign, ReaderDesignTheme> = {
  flexoki: {
    label: "Flexoki Papier",
    badge: "Warmweiß",
    description: "Elfenbein-Papier & warme Tinte (Flexoki)",
    isDark: false,
    viewportClass: "bg-[#EFECE1] text-[#1C1B1A]",
    chromeClass: "bg-[#F7F4EA]/95 border-[#D8D3C4] text-[#1C1B1A]",
    chromePillClass:
      "border-[#CEC8B6] text-[#282726] hover:bg-black/[0.05]",
    spreadWrapperClass:
      "border-[#D8D3C4] bg-[#E2DDD0] shadow-[0_14px_40px_rgba(32,26,18,0.14)]",
    sheetClass: "bg-[#FFFCF0] text-[#282726] border-[#DFDACC]",
    headingClass: "text-[#100F0F]",
    proseClass: "text-[#282726]",
    mutedClass: "text-[#6F6E69]",
    accentClass: "text-[#BC5215]",
    borderSubtleClass: "border-[#E6E2D5]",
    spineClass: "bg-[#D5CFC0] shadow-[inset_0_0_5px_rgba(40,34,20,0.18)]",
    navOrbClass:
      "bg-[#F7F4EA] text-[#1C1B1A] border-[#D8D3C4] hover:bg-[#BC5215] hover:text-white hover:border-[#BC5215]",
    hoverZoneClass: "hover:bg-black/[0.03]",
    hoverZoneIconClass: "bg-[#F7F4EA]/95 text-[#1C1B1A] border border-[#D8D3C4]",
    activeWordClass:
      "bg-[#FCE5A5] text-[#100F0F] shadow-[0_0_0_2px_rgba(245,196,81,0.9),0_2px_6px_rgba(188,82,21,0.14)]",
    spokenWordClass: "bg-[#F5EDD1]/70 text-[#1C1B1A]",
    hoverWordClass: "hover:bg-[#E6E2D5]/70",
    swatchBg: "#FFFCF0",
    swatchText: "#282726",
    swatchAccent: "#D18B28",
  },
  kindlesepia: {
    label: "Warmes Sepia",
    badge: "Kindle",
    description: "Bernstein-Buchseiten ohne Blaulicht",
    isDark: false,
    viewportClass: "bg-[#E7DBC1] text-[#3B2E20]",
    chromeClass: "bg-[#F2E6CD]/95 border-[#D5C4A1] text-[#3B2E20]",
    chromePillClass:
      "border-[#C8B48D] text-[#3B2E20] hover:bg-[#3B2E20]/[0.06]",
    spreadWrapperClass:
      "border-[#D5C4A1] bg-[#DCCBAE] shadow-[0_14px_40px_rgba(58,42,20,0.16)]",
    sheetClass: "bg-[#FBF0D9] text-[#3D3022] border-[#DFCFAF]",
    headingClass: "text-[#291E12]",
    proseClass: "text-[#3D3022]",
    mutedClass: "text-[#7A6751]",
    accentClass: "text-[#9A4D10]",
    borderSubtleClass: "border-[#E6D6B7]",
    spineClass: "bg-[#D1BF9B] shadow-[inset_0_0_5px_rgba(61,48,34,0.2)]",
    navOrbClass:
      "bg-[#F2E6CD] text-[#3B2E20] border-[#D5C4A1] hover:bg-[#9A4D10] hover:text-white hover:border-[#9A4D10]",
    hoverZoneClass: "hover:bg-[#3B2E20]/[0.04]",
    hoverZoneIconClass: "bg-[#F2E6CD]/95 text-[#3B2E20] border border-[#D5C4A1]",
    activeWordClass:
      "bg-[#F3D18A] text-[#23190F] shadow-[0_0_0_2px_rgba(226,177,86,0.9),0_2px_6px_rgba(154,77,16,0.16)]",
    spokenWordClass: "bg-[#EAD9B5]/65 text-[#291E12]",
    hoverWordClass: "hover:bg-[#E4D1AA]/75",
    swatchBg: "#FBF0D9",
    swatchText: "#3D3022",
    swatchAccent: "#C27124",
  },
  nordlicht: {
    label: "Ruhe & Salbei",
    badge: "Calm",
    description: "Mattes Salbeigrün für konzentriertes Lesen",
    isDark: false,
    viewportClass: "bg-[#D9E3DC] text-[#1F2B26]",
    chromeClass: "bg-[#E3ECE6]/95 border-[#C0CFC6] text-[#1F2B26]",
    chromePillClass:
      "border-[#B3C5BA] text-[#1F2B26] hover:bg-[#1F2B26]/[0.06]",
    spreadWrapperClass:
      "border-[#C0CFC6] bg-[#CBD8CF] shadow-[0_14px_40px_rgba(20,38,28,0.12)]",
    sheetClass: "bg-[#ECF2EE] text-[#23312B] border-[#C9D8CE]",
    headingClass: "text-[#131D19]",
    proseClass: "text-[#23312B]",
    mutedClass: "text-[#586B62]",
    accentClass: "text-[#1F6E58]",
    borderSubtleClass: "border-[#D3E0D7]",
    spineClass: "bg-[#B8C9BE] shadow-[inset_0_0_5px_rgba(20,38,28,0.16)]",
    navOrbClass:
      "bg-[#E3ECE6] text-[#1F2B26] border-[#C0CFC6] hover:bg-[#1F6E58] hover:text-white hover:border-[#1F6E58]",
    hoverZoneClass: "hover:bg-[#1F2B26]/[0.04]",
    hoverZoneIconClass: "bg-[#E3ECE6]/95 text-[#1F2B26] border border-[#C0CFC6]",
    activeWordClass:
      "bg-[#C4E3D0] text-[#0E241C] shadow-[0_0_0_2px_rgba(116,184,150,0.82),0_2px_6px_rgba(31,110,88,0.14)]",
    spokenWordClass: "bg-[#D5E6DC]/75 text-[#131D19]",
    hoverWordClass: "hover:bg-[#CFDCD4]",
    swatchBg: "#ECF2EE",
    swatchText: "#23312B",
    swatchAccent: "#1F6E58",
  },
  quietgray: {
    label: "Apple Quiet",
    badge: "Mineral",
    description: "Blendfreies Steingrau wie im E-Book-Lesemodus",
    isDark: false,
    viewportClass: "bg-[#D5D9DF] text-[#1F2328]",
    chromeClass: "bg-[#DFE2E7]/95 border-[#C1C7D0] text-[#1F2328]",
    chromePillClass:
      "border-[#B5BCC6] text-[#1F2328] hover:bg-black/[0.05]",
    spreadWrapperClass:
      "border-[#C1C7D0] bg-[#CFD4DC] shadow-[0_14px_40px_rgba(18,24,33,0.14)]",
    sheetClass: "bg-[#EAECEF] text-[#262A30] border-[#C8CDD5]",
    headingClass: "text-[#16191D]",
    proseClass: "text-[#262A30]",
    mutedClass: "text-[#5B626E]",
    accentClass: "text-[#2563EB]",
    borderSubtleClass: "border-[#D4D9E0]",
    spineClass: "bg-[#BDC3CC] shadow-[inset_0_0_5px_rgba(18,24,33,0.16)]",
    navOrbClass:
      "bg-[#DFE2E7] text-[#1F2328] border-[#C1C7D0] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB]",
    hoverZoneClass: "hover:bg-black/[0.04]",
    hoverZoneIconClass: "bg-[#DFE2E7]/95 text-[#1F2328] border border-[#C1C7D0]",
    activeWordClass:
      "bg-[#FDE68A] text-[#16191D] shadow-[0_0_0_2px_rgba(245,180,65,0.85),0_2px_6px_rgba(180,120,20,0.14)]",
    spokenWordClass: "bg-[#DCE1E9]/85 text-[#16191D]",
    hoverWordClass: "hover:bg-[#D5DAE3]",
    swatchBg: "#EAECEF",
    swatchText: "#262A30",
    swatchAccent: "#D99B26",
  },
  studio: {
    label: "Lesestudio Schiefer",
    badge: "Standard",
    description: "Samtiges Anthrazit-Dokumentpapier für Ruhe & Fokus",
    isDark: true,
    viewportClass: "bg-[#303033] text-[#ececef]",
    chromeClass: "bg-[#262629]/95 border-white/10 text-[#ececef]",
    chromePillClass: "border-white/20 text-[#e4e4e7] hover:bg-white/10",
    spreadWrapperClass:
      "border-white/10 bg-[#353439] shadow-[0_14px_40px_rgba(0,0,0,0.45)]",
    sheetClass: "bg-[#434247] text-[#e6e6ea] border-white/10",
    headingClass: "text-[#f4f4f6]",
    proseClass: "text-[#e2e2e6]",
    mutedClass: "text-[#b7b7be]",
    accentClass: "text-amber-300",
    borderSubtleClass: "border-white/10",
    spineClass: "bg-[#262629] shadow-[inset_0_0_6px_rgba(0,0,0,0.65)]",
    navOrbClass:
      "bg-[#262629] text-[#ececef] border-white/15 hover:bg-primary hover:text-primary-foreground",
    hoverZoneClass: "hover:bg-white/[0.03]",
    hoverZoneIconClass:
      "bg-[#262629]/90 text-[#ececef] border border-white/15",
    activeWordClass:
      "bg-amber-400/35 text-white shadow-[0_0_0_2px_rgba(252,211,77,0.72),0_0_10px_rgba(251,191,36,0.22)]",
    spokenWordClass: "bg-amber-300/12 text-[#f4f4f6]",
    hoverWordClass: "hover:bg-white/10",
    swatchBg: "#434247",
    swatchText: "#ECECEF",
    swatchAccent: "#FCD34D",
  },
  nachtblau: {
    label: "Mitternacht Tinte",
    badge: "Nachtlesen",
    description: "Tiefes Nachtschiefer & gebrochenes Elfenbein ohne Blenden",
    isDark: true,
    viewportClass: "bg-[#0E131A] text-[#E2DFD7]",
    chromeClass: "bg-[#121821]/95 border-white/10 text-[#E2DFD7]",
    chromePillClass: "border-white/15 text-[#E2DFD7] hover:bg-white/10",
    spreadWrapperClass:
      "border-[#293545] bg-[#131922] shadow-[0_14px_45px_rgba(0,0,0,0.65)]",
    sheetClass: "bg-[#18202B] text-[#E2DFD7] border-[#293545]",
    headingClass: "text-[#F3F1EB]",
    proseClass: "text-[#DEDAD1]",
    mutedClass: "text-[#97A3B4]",
    accentClass: "text-sky-300",
    borderSubtleClass: "border-white/10",
    spineClass: "bg-[#0D1219] shadow-[inset_0_0_6px_rgba(0,0,0,0.8)]",
    navOrbClass:
      "bg-[#121821] text-[#E2DFD7] border-white/15 hover:bg-sky-400 hover:text-[#0B1118]",
    hoverZoneClass: "hover:bg-white/[0.03]",
    hoverZoneIconClass:
      "bg-[#121821]/90 text-[#E2DFD7] border border-white/15",
    activeWordClass:
      "bg-sky-400/30 text-white shadow-[0_0_0_2px_rgba(125,211,252,0.68),0_0_10px_rgba(56,189,248,0.2)]",
    spokenWordClass: "bg-sky-300/12 text-[#F3F1EB]",
    hoverWordClass: "hover:bg-white/10",
    swatchBg: "#18202B",
    swatchText: "#E2DFD7",
    swatchAccent: "#7DD3FC",
  },
};

export function normalizeReaderDesign(raw?: string | null): ReaderDesign {
  if (raw && raw in READER_DESIGNS_CONFIG) {
    return raw as ReaderDesign;
  }
  switch (raw) {
    case "klassisch":
      return "quietgray";
    case "sanft":
      return "nordlicht";
    case "nacht":
      return "nachtblau";
    case "mokka":
      return "kindlesepia";
    case "pergament":
    default:
      return DEFAULT_READER_SETTINGS.design;
  }
}

export const FONT_CLASSES: Record<ReaderFont, string> = {
  serif: "font-['Merriweather',Georgia,'Times_New_Roman',serif]",
  sans: "font-['Nunito',system-ui,-apple-system,sans-serif]",
  grotesk: "font-['Bricolage_Grotesque',system-ui,sans-serif]",
  dyslexic: "font-['Nunito',Verdana,sans-serif] tracking-wide word-spacing-wide",
};

export const MARGIN_CLASSES: Record<ReaderMargin, { outer: string; inner: string; label: string }> = {
  narrow: {
    outer: "max-w-5xl",
    inner: "px-4 sm:px-6 py-6",
    label: "Schmal (Vollbreite)",
  },
  normal: {
    outer: "max-w-4xl",
    inner: "px-6 sm:px-10 py-8",
    label: "Standard",
  },
  book: {
    outer: "max-w-5xl",
    inner: "px-6 sm:px-12 py-8",
    label: "Buchrand (Großzügig)",
  },
};

export const LINE_HEIGHT_CLASSES: Record<ReaderSettings["lineHeight"], string> = {
  compact: "leading-relaxed",
  normal: "leading-[1.85]",
  loose: "leading-[2.2]",
};

export interface SentenceItem {
  globalIndex: number;
  text: string;
  sectionIndex: number;
}

export interface ReaderParagraph {
  heading?: string | undefined;
  sentences: SentenceItem[];
}

export interface ReaderPage {
  pageNumber: number;
  totalPages: number;
  paragraphs: ReaderParagraph[];
  firstSentenceIndex: number;
  lastSentenceIndex: number;
  wordCount: number;
}

/**
 * Splits German text into proper sentences while handling quotes,
 * numbers, and common abbreviations (z. B., Dr., bzw., etc.).
 */
export function splitGermanSentences(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  // Protect common German abbreviations and ordinals by replacing dot temporarily
  const protectedText = clean
    .replace(/\bSt\.\s*(?=[A-ZÄÖÜ])/g, "St_ ")
    .replace(/(z\.\s*B\.)/gi, "z_B_")
    .replace(/(d\.\s*h\.)/gi, "d_h_")
    .replace(/(u\.\s*a\.)/gi, "u_a_")
    .replace(/(u\.\s*[äÄ]\.)/gi, "u_ae_")
    .replace(/(Dr\.)/g, "Dr_")
    .replace(/(Prof\.)/g, "Prof_")
    .replace(/(bzw\.)/gi, "bzw_")
    .replace(/(ca\.)/gi, "ca_")
    .replace(/(Nr\.)/gi, "Nr_")
    .replace(/(usw\.)/gi, "usw_")
    .replace(/(etc\.)/gi, "etc_")
    .replace(/(inkl\.)/gi, "inkl_")
    .replace(/(evtl\.)/gi, "evtl_")
    .replace(/(sog\.)/gi, "sog_")
    .replace(/(bspw\.)/gi, "bspw_")
    .replace(/(vgl\.)/gi, "vgl_")
    .replace(/(v\.\s*Chr\.)/gi, "v_Chr_")
    .replace(/(n\.\s*Chr\.)/gi, "n_Chr_")
    .replace(/(\b\d+)\.\s+(Jh\.|Jhd\.|Jahrhundert)/gi, "$1_dot_ $2")
    .replace(/(\b\d+)\.\s+([A-Za-zÄÖÜäöüß]+)/g, "$1_dot_ $2");

  const rawSentences = protectedText.split(
    /(?<=[.!?][»"“‘']?)\s+(?=[A-ZÄÖÜ»"„])|(?<=:)\s+(?=[„»"])/g
  );

  return rawSentences
    .map((s) =>
      s
        .replace(/St_\s*/g, "St. ")
        .replace(/z_B_/g, "z. B.")
        .replace(/d_h_/g, "d. h.")
        .replace(/u_a_/g, "u. a.")
        .replace(/u_ae_/g, "u. ä.")
        .replace(/Dr_/g, "Dr.")
        .replace(/Prof_/g, "Prof.")
        .replace(/bzw_/g, "bzw.")
        .replace(/ca_/g, "ca.")
        .replace(/Nr_/g, "Nr.")
        .replace(/usw_/g, "usw.")
        .replace(/etc_/g, "etc.")
        .replace(/inkl_/g, "inkl.")
        .replace(/evtl_/g, "evtl.")
        .replace(/sog_/g, "sog.")
        .replace(/bspw_/g, "bspw.")
        .replace(/vgl_/g, "vgl.")
        .replace(/v_Chr_/g, "v. Chr.")
        .replace(/n_Chr_/g, "n. Chr.")
        .replace(/(\d+)_dot_\s+/g, "$1. ")
        .trim()
    )
    .filter(Boolean);
}

/**
 * Paginates a structured list of sections into reader pages.
 * Word budget per page is tailored so the entire page fits on screen without vertical scrolling.
 */
export function paginateContent(
  sections: { heading?: string | undefined; text: string }[],
  fontSize: number
): ReaderPage[] {
  // Target words per page tailored for the clean full-height book spread without scrollbars
  const baseWordsPerPage = Math.round(125 - (fontSize - 19) * 5);
  const wordsPerPage = Math.max(65, Math.min(170, baseWordsPerPage));

  // Flatten into list of sentence entries
  let globalIndex = 0;
  type SentenceEntry = {
    globalIndex: number;
    text: string;
    sectionIndex: number;
    wordCount: number;
    heading?: string | undefined;
  };

  const sentenceEntries: SentenceEntry[] = [];
  sections.forEach((sec, sIdx) => {
    const rawSentences = splitGermanSentences(sec.text);
    rawSentences.forEach((txt, idx) => {
      const words = txt.split(/\s+/).filter(Boolean).length;
      sentenceEntries.push({
        globalIndex: globalIndex++,
        text: txt,
        sectionIndex: sIdx,
        wordCount: words,
        heading: idx === 0 ? sec.heading : undefined,
      });
    });
  });

  if (sentenceEntries.length === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        paragraphs: [],
        firstSentenceIndex: 0,
        lastSentenceIndex: 0,
        wordCount: 0,
      },
    ];
  }

  const rawPages: { paragraphs: ReaderParagraph[]; wordCount: number }[] = [];
  let currentSentences: SentenceItem[] = [];
  let currentHeading: string | undefined = undefined;
  let currentWordCount = 0;

  for (let i = 0; i < sentenceEntries.length; i++) {
    const entry = sentenceEntries[i]!;
    // Page 1 has the chapter title block, so its budget is slightly lower to guarantee no scroll
    const isFirstPage = rawPages.length === 0;
    const pageBudget = isFirstPage ? Math.round(wordsPerPage * 0.75) : wordsPerPage;

    const hasNewHeading = Boolean(entry.heading);
    const wouldExceedBudget =
      currentSentences.length > 0 && currentWordCount + entry.wordCount > pageBudget;
    const headingAtBottom =
      hasNewHeading && currentSentences.length > 0 && currentWordCount > pageBudget * 0.55;

    if (wouldExceedBudget || headingAtBottom) {
      rawPages.push({
        paragraphs: [{ heading: currentHeading, sentences: currentSentences }],
        wordCount: currentWordCount,
      });
      currentSentences = [];
      currentHeading = undefined;
      currentWordCount = 0;
    }

    if (entry.heading && !currentHeading) {
      currentHeading = entry.heading;
    }

    currentSentences.push({
      globalIndex: entry.globalIndex,
      text: entry.text,
      sectionIndex: entry.sectionIndex,
    });
    currentWordCount += entry.wordCount;
  }

  if (currentSentences.length > 0) {
    rawPages.push({
      paragraphs: [{ heading: currentHeading, sentences: currentSentences }],
      wordCount: currentWordCount,
    });
  }

  const totalPages = rawPages.length;

  return rawPages.map((page, idx) => {
    const allSentences = page.paragraphs.flatMap((p) => p.sentences);
    const firstSentenceIndex = allSentences[0]?.globalIndex ?? 0;
    const lastSentenceIndex = allSentences[allSentences.length - 1]?.globalIndex ?? 0;

    return {
      pageNumber: idx + 1,
      totalPages,
      paragraphs: page.paragraphs,
      firstSentenceIndex,
      lastSentenceIndex,
      wordCount: page.wordCount,
    };
  });
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
}

export interface SpeechRecognizerHandle {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function createSpeechRecognizer({
  language = "de-AT",
  onResult,
  onError,
  onEnd,
}: {
  language?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}): SpeechRecognizerHandle | null {
  if (typeof window === "undefined") return null;
  const SpeechRec =
    (window as unknown as { SpeechRecognition?: new () => any }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

  if (!SpeechRec) return null;

  const recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = language;

  // Verfolgt bereits übernommene Final-Indizes, damit Safari/Chrome/Android keine Wörter doppeln oder verlieren
  const committedIndices = new Set<number>();
  let latestInterim = "";
  let stoppedIntentionally = false;
  let ended = false;

  const flushPendingInterim = () => {
    const pending = latestInterim.trim();
    if (pending) {
      latestInterim = "";
      onResult(pending, true);
    }
  };

  recognition.onresult = (event: any) => {
    const results = event?.results;
    if (!results) return;

    let newFinalParts: string[] = [];
    let currentInterimParts: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const piece = results[i];
      const text = String(piece?.[0]?.transcript ?? "").trim();
      if (!text) continue;

      if (piece.isFinal) {
        if (!committedIndices.has(i)) {
          committedIndices.add(i);
          newFinalParts.push(text);
        }
      } else {
        currentInterimParts.push(text);
      }
    }

    if (newFinalParts.length > 0) {
      latestInterim = "";
      onResult(newFinalParts.join(" "), true);
    }

    const interim = currentInterimParts.join(" ").trim();
    latestInterim = interim;
    onResult(interim, false);
  };

  recognition.onerror = (event: any) => {
    const code = event?.error;
    // Kein Fehler-Popup anzeigen, wenn der Nutzer die Aufnahme selbst beendet hat
    if (stoppedIntentionally && (code === "aborted" || code === "no-speech")) {
      return;
    }
    let msg = "Spracherkennung fehlgeschlagen.";
    if (code === "not-allowed" || code === "service-not-allowed") {
      msg = "Mikrofonzugriff verweigert. Bitte erlaube das Mikrofon im Browser.";
    } else if (code === "no-speech") {
      msg = "Keine Sprache erkannt. Bitte sprich etwas näher ins Mikrofon.";
    } else if (code === "network") {
      msg =
        "Browser-Spracherkennung meldet einen Netzwerkfehler. Nutze am besten das KI-Diktat (Gemini)!";
    } else if (code === "audio-capture") {
      msg = "Kein Mikrofon gefunden. Bitte prüfe deine Mikrofon-Einstellungen.";
    }
    onError(msg);
  };

  recognition.onend = () => {
    if (ended) return;
    ended = true;
    flushPendingInterim();
    onEnd();
  };

  return {
    start: () => {
      stoppedIntentionally = false;
      ended = false;
      committedIndices.clear();
      latestInterim = "";
      recognition.start();
    },
    stop: () => {
      stoppedIntentionally = true;
      try {
        recognition.stop();
      } catch {
        flushPendingInterim();
        if (!ended) {
          ended = true;
          onEnd();
        }
      }
    },
    abort: () => {
      stoppedIntentionally = true;
      latestInterim = "";
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    },
  };
}

export const STORAGE_KEY_SETTINGS = "sprachtrainer-reader-settings";

export function loadSavedReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_READER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      ...DEFAULT_READER_SETTINGS,
      ...parsed,
      design: normalizeReaderDesign(parsed?.design),
      voiceId: resolveVoice(parsed?.voiceId).id,
    };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // optional storage
  }
}

export interface WordToken {
  text: string;
  wordIndex: number | null;
  weight: number;
}

/**
 * Zerlegt einen Satz in Wort-, Leerzeichen- und Satzzeichen-Tokens,
 * weist jedem gesprochenen Wort einen fortlaufenden Index (0..N-1)
 * sowie eine gesprochene Dauergewichtung zu.
 */
export function tokenizeSentenceWords(sentence: string): {
  tokens: WordToken[];
  wordCount: number;
  cumulativeWeights: number[];
  totalWeight: number;
} {
  if (!sentence) {
    return { tokens: [], wordCount: 0, cumulativeWeights: [], totalWeight: 0 };
  }

  const rawParts = sentence.split(/(\s+)/);
  const tokens: WordToken[] = [];
  const cumulativeWeights: number[] = [];
  let wordCount = 0;
  let accWeight = 0;

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      tokens.push({ text: part, wordIndex: null, weight: 0 });
      continue;
    }

    if (!/[A-Za-zÄÖÜäöüß0-9]/.test(part)) {
      tokens.push({ text: part, wordIndex: null, weight: 0 });
      continue;
    }

    const core = part.replace(/[„“»«"'.,!?;:–—()]/g, "");
    let weight = Math.max(2.2, core.length * 0.9 + 1.2);
    if (/[,;:][»"“‘']?$/.test(part)) {
      weight += 3.2;
    }
    const nextNonSpace = rawParts[i + 2];
    if (nextNonSpace && /^[–—]$/.test(nextNonSpace)) {
      weight += 4.0;
    }

    const wordIndex = wordCount;
    wordCount += 1;
    accWeight += weight;
    cumulativeWeights.push(accWeight);
    tokens.push({ text: part, wordIndex, weight });
  }

  return {
    tokens,
    wordCount,
    cumulativeWeights,
    totalWeight: accWeight,
  };
}

/**
 * Bestimmt anhand der aktuellen Wiedergabezeit im Satzzeitfenster [speechStartSec, speechEndSec],
 * welches einzelne Wort (0..wordCount-1) gerade vorgelesen wird.
 */
export function estimateWordIndexInSpan(
  sentence: string,
  currentTimeSec: number,
  speechStartSec: number,
  speechEndSec: number
): number {
  const { wordCount, cumulativeWeights, totalWeight } = tokenizeSentenceWords(sentence);
  if (wordCount <= 1 || totalWeight <= 0) return 0;

  const span = Math.max(0.15, speechEndSec - speechStartSec);
  const progress = Math.max(0, Math.min(0.9999, (currentTimeSec - speechStartSec) / span));
  const targetWeight = progress * totalWeight;

  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (targetWeight <= (cumulativeWeights[i] ?? totalWeight)) {
      return i;
    }
  }
  return wordCount - 1;
}

/**
 * Berechnet die geschätzte Startzeit (in Sekunden) eines angeklickten Wortes
 * innerhalb des Satzzeitfensters [speechStartSec, speechEndSec].
 */
export function estimateTimeForWordInSpan(
  sentence: string,
  wordIndex: number,
  speechStartSec: number,
  speechEndSec: number
): number {
  const { wordCount, cumulativeWeights, totalWeight } = tokenizeSentenceWords(sentence);
  if (wordCount <= 1 || totalWeight <= 0 || wordIndex <= 0) return speechStartSec;
  const clampedIdx = Math.min(wordCount - 1, wordIndex);
  const prevCum = clampedIdx > 0 ? (cumulativeWeights[clampedIdx - 1] ?? 0) : 0;
  const span = Math.max(0.15, speechEndSec - speechStartSec);
  return speechStartSec + (prevCum / totalWeight) * span;
}
