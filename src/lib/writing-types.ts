import type { Saga } from "@/data/sagen-catalog";

export type SectionId = "einfuehrung" | "thema" | "wende" | "bleibendes";

export type AssistanceMode = "starter" | "standard" | "profi";

export interface SagaSectionMeta {
  id: SectionId;
  number: string;
  shortTitle: string;
  curriculumTitle: string;
  subtitle: string;
  placeholder: string;
  accent: "emerald" | "blue" | "red" | "amber";
}

export const SAGA_SECTIONS_META: readonly SagaSectionMeta[] = [
  {
    id: "einfuehrung",
    number: "01",
    shortTitle: "Einführung",
    curriculumTitle: "1. Die Einführung (Einleitung)",
    subtitle: "Ort, Zeit & Personen",
    placeholder: "Wo und wann spielte die Sage? Wer war dabei?",
    accent: "emerald",
  },
  {
    id: "thema",
    number: "02",
    shortTitle: "Thema",
    curriculumTitle: "2. Das Thema (Aufbau)",
    subtitle: "Handlung, Geheimnis & Konflikt",
    placeholder: "Welches Geheimnis, welcher Regelbruch oder Konflikt brachte alles ins Rollen?",
    accent: "blue",
  },
  {
    id: "wende",
    number: "03",
    shortTitle: "Wende",
    curriculumTitle: "3. Die Wende (Höhepunkt)",
    subtitle: "Unheimliches Ereignis & Wendung",
    placeholder: "Was geschah plötzlich? Wie änderte sich alles?",
    accent: "red",
  },
  {
    id: "bleibendes",
    number: "04",
    shortTitle: "Bleibendes",
    curriculumTitle: "4. Das Bleibende (Ausklang)",
    subtitle: "Folgen, Lehre & Denkmal",
    placeholder: "Was bleibt zurück? Was erinnert noch heute an die Sage?",
    accent: "amber",
  },
] as const;

export interface ChecklistState {
  placeAndTime: boolean;
  secretOrConflict: boolean;
  supernatural: boolean;
  moralOrMemory: boolean;
}

export const DEFAULT_CHECKLIST: ChecklistState = {
  placeAndTime: false,
  secretOrConflict: false,
  supernatural: false,
  moralOrMemory: false,
};

export interface SavedFactCheckSummary {
  status: "super" | "gut" | "ausbaufähig";
  score: number;
  checkedAt: string;
}

export interface SagaDraft {
  sagaId: string;
  sections: Record<SectionId, string>;
  checklist: ChecklistState;
  assistanceMode: AssistanceMode;
  readCompleted: boolean;
  completedTaskTitles: string[];
  lastFactCheck?: SavedFactCheckSummary;
  updatedAt: string;
}

export function createEmptyDraft(sagaId: string): SagaDraft {
  return {
    sagaId,
    sections: {
      einfuehrung: "",
      thema: "",
      wende: "",
      bleibendes: "",
    },
    checklist: { ...DEFAULT_CHECKLIST },
    assistanceMode: "standard",
    readCompleted: false,
    completedTaskTitles: [],
    updatedAt: new Date().toISOString(),
  };
}

export interface AnalysisErrorItem {
  section: SectionId;
  wrong: string;
  correction: string;
  explanation: string;
  category?: "rechtschreibung" | "grammatik" | "zeitform" | "satzbau";
}

export interface WordTypeItem {
  section: SectionId;
  word: string;
}

export interface FactCheckResult {
  status: "super" | "gut" | "ausbaufähig";
  score: number; // 0-100
  summary: string;
  missingDetails: string[];
  originalityNote: string;
  checklistAssessment: ChecklistState;
}

export interface WritingAnalysisResult {
  errors: AnalysisErrorItem[];
  verbs: WordTypeItem[];
  adjectives: WordTypeItem[];
  styleTips: string[];
  factCheck: FactCheckResult;
}

export interface DraftStats {
  totalWords: number;
  wordsBySection: Record<SectionId, number>;
  startedSections: number;
  readingTimeMin: number;
  progressPercent: number;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function calculateDraftStats(sections: Record<SectionId, string>): DraftStats {
  const wordsBySection: Record<SectionId, number> = {
    einfuehrung: countWords(sections.einfuehrung),
    thema: countWords(sections.thema),
    wende: countWords(sections.wende),
    bleibendes: countWords(sections.bleibendes),
  };

  const totalWords =
    wordsBySection.einfuehrung +
    wordsBySection.thema +
    wordsBySection.wende +
    wordsBySection.bleibendes;

  const startedSections = (Object.values(wordsBySection) as number[]).filter((n) => n > 0).length;
  const readingTimeMin = totalWords === 0 ? 0 : Math.max(1, Math.ceil(totalWords / 130));
  const progressPercent = Math.round((startedSections / 4) * 100);

  return {
    totalWords,
    wordsBySection,
    startedSections,
    readingTimeMin,
    progressPercent,
  };
}

export function getSagaFullPlainText(saga: Saga): string {
  return saga.sections
    .map((sec) => (sec.heading ? `${sec.heading}\n${sec.text}` : sec.text))
    .join("\n\n");
}
