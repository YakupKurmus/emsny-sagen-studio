// Schnelles KI-TTS-Modell für flüssiges Vorlesen (mit Standard-Modell als Fallback)
export const SPEECH_MODEL = "gemini-3.8-flash-lite-tts";
export const SPEECH_MODEL_FALLBACK = "gemini-3.8-flash-tts";

export type VoiceProvider = "google-cloud-hd" | "gemini-hd";
export type VoiceGender = "male" | "female" | "neutral";

export interface ReaderVoice {
  id: string;
  name: string;
  provider: VoiceProvider;
  geminiVoice: string;
  cloudTtsVoice: string;
  requiresApiKey: true;
  subtitle: string;
  gender: VoiceGender;
  badge: string;
  description: string;
  sampleSentence: string;
  rate: number;
  pitch: number;
  lang: string;
  label: string;
}

export type VoicePackage = ReaderVoice;

/**
 * Echte Google Cloud Chirp 3: HD & Gemini HD Stimmen (erfordern einen API-Key).
 * Alle älteren Standard-/Browser-Stimmen wurden vollständig entfernt.
 */
export const CLOUD_HD_VOICES: readonly ReaderVoice[] = [
  // --- Deutsch (de-DE) ---
  {
    id: "de-DE-Chirp3-HD-Aoede",
    name: "Aoede (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Aoede",
    cloudTtsVoice: "de-DE-Chirp3-HD-Aoede",
    requiresApiKey: true,
    subtitle: "Weiblich · Warm, melodisch & ausdrucksstark",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD & Gemini HD Stimme (de-DE-Chirp3-HD-Aoede) mit natürlicher Betonung und Wärme.",
    sampleSentence:
      "Hallo! Hier spricht Aoede in HD-Qualität über die Google Cloud Text-to-Speech API.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Aoede (Weiblich · Warm)",
  },
  {
    id: "de-DE-Chirp3-HD-Kore",
    name: "Kore (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Kore",
    cloudTtsVoice: "de-DE-Chirp3-HD-Kore",
    requiresApiKey: true,
    subtitle: "Weiblich · Kristallklar & studioreif",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Glasklare deutsche HD-Stimme (de-DE-Chirp3-HD-Kore) mit präziser Artikulation für Lerninhalte und Texte.",
    sampleSentence:
      "Mit Kore verstehst du jedes Wort klar, natürlich und studioreif.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Kore (Weiblich · Studio)",
  },
  {
    id: "de-DE-Chirp3-HD-Leda",
    name: "Leda (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Leda",
    cloudTtsVoice: "de-DE-Chirp3-HD-Leda",
    requiresApiKey: true,
    subtitle: "Weiblich · Hell, freundlich & lebhaft",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD Stimme Leda mit heller, motivierender Klangfarbe.",
    sampleSentence:
      "Lass uns gemeinsam neue Vokabeln und Dialoge auf Deutsch üben.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Leda (Weiblich · Freundlich)",
  },
  {
    id: "de-DE-Chirp3-HD-Zephyr",
    name: "Zephyr (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Zephyr",
    cloudTtsVoice: "de-DE-Chirp3-HD-Zephyr",
    requiresApiKey: true,
    subtitle: "Weiblich · Sanft, ruhig & entspannt",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Ruhige, sanfte Google Cloud / Gemini HD Stimme für konzentriertes Zuhören.",
    sampleSentence:
      "Still ruhte das Wasser im sanften Licht des Morgens.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Zephyr (Weiblich · Ruhig)",
  },
  {
    id: "de-DE-Chirp3-HD-Puck",
    name: "Puck (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Puck",
    cloudTtsVoice: "de-DE-Chirp3-HD-Puck",
    requiresApiKey: true,
    subtitle: "Männlich · Lebendig, frisch & narrativ",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD & Gemini HD Stimme (de-DE-Chirp3-HD-Puck) mit natürlichem Schwung.",
    sampleSentence:
      "Hallo! Ich bin Puck und lese deine Texte in natürlicher Google Cloud HD-Qualität vor.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Puck (Männlich · Lebendig)",
  },
  {
    id: "de-DE-Chirp3-HD-Charon",
    name: "Charon (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Charon",
    cloudTtsVoice: "de-DE-Chirp3-HD-Charon",
    requiresApiKey: true,
    subtitle: "Männlich · Tief, sonor & getragen",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Tiefe, würdevolle Bariton-HD-Stimme von Google Cloud & Gemini für eindringliche Erzählungen.",
    sampleSentence:
      "In uralten Zeiten erhoben sich mächtige Gipfel über das weite Tal.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Charon (Männlich · Tief)",
  },
  {
    id: "de-DE-Chirp3-HD-Fenrir",
    name: "Fenrir (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Fenrir",
    cloudTtsVoice: "de-DE-Chirp3-HD-Fenrir",
    requiresApiKey: true,
    subtitle: "Männlich · Kraftvoll & dynamisch",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Markante, energiegeladene Google Cloud Chirp 3 HD Stimme (de-DE-Chirp3-HD-Fenrir).",
    sampleSentence:
      "Mutig stellte er sich jeder neuen Herausforderung.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Fenrir (Männlich · Kraftvoll)",
  },
  {
    id: "de-DE-Chirp3-HD-Orus",
    name: "Orus (Chirp 3 HD · Deutsch)",
    provider: "google-cloud-hd",
    geminiVoice: "Orus",
    cloudTtsVoice: "de-DE-Chirp3-HD-Orus",
    requiresApiKey: true,
    subtitle: "Männlich · Klar, sachlich & präzise",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Souveräne, klar strukturierte Google Cloud HD Stimme für Berichte und Sachtexte.",
    sampleSentence:
      "Eine strukturierte Argumentation überzeugt durch klare Beispiele.",
    rate: 1.0,
    pitch: 1.0,
    lang: "de-DE",
    label: "de-DE-Chirp3-HD-Orus (Männlich · Klar)",
  },

  // --- Englisch US (en-US) ---
  {
    id: "en-US-Chirp3-HD-Aoede",
    name: "Aoede (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Aoede",
    cloudTtsVoice: "en-US-Chirp3-HD-Aoede",
    requiresApiKey: true,
    subtitle: "Female · Warm & expressive (US)",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Aoede).",
    sampleSentence:
      "Hello! Let's practice your B2 English reading and listening tasks together.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Aoede (Female · US)",
  },
  {
    id: "en-US-Chirp3-HD-Kore",
    name: "Kore (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Kore",
    cloudTtsVoice: "en-US-Chirp3-HD-Kore",
    requiresApiKey: true,
    subtitle: "Female · Crisp studio clarity (US)",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Kore).",
    sampleSentence:
      "Listen carefully to every detail in the passage.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Kore (Female · US Studio)",
  },
  {
    id: "en-US-Chirp3-HD-Leda",
    name: "Leda (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Leda",
    cloudTtsVoice: "en-US-Chirp3-HD-Leda",
    requiresApiKey: true,
    subtitle: "Female · Bright & conversational (US)",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Leda).",
    sampleSentence:
      "That sounds like a really exciting project for next semester!",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Leda (Female · US Bright)",
  },
  {
    id: "en-US-Chirp3-HD-Zephyr",
    name: "Zephyr (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Zephyr",
    cloudTtsVoice: "en-US-Chirp3-HD-Zephyr",
    requiresApiKey: true,
    subtitle: "Female · Calm & gentle (US)",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Zephyr).",
    sampleSentence:
      "Take your time to compare the two arguments carefully.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Zephyr (Female · US Calm)",
  },
  {
    id: "en-US-Chirp3-HD-Puck",
    name: "Puck (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Puck",
    cloudTtsVoice: "en-US-Chirp3-HD-Puck",
    requiresApiKey: true,
    subtitle: "Male · Upbeat & natural (US)",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Puck).",
    sampleSentence:
      "Ready to review the key vocabulary and idioms?",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Puck (Male · US)",
  },
  {
    id: "en-US-Chirp3-HD-Charon",
    name: "Charon (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Charon",
    cloudTtsVoice: "en-US-Chirp3-HD-Charon",
    requiresApiKey: true,
    subtitle: "Male · Deep & steady (US)",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Charon).",
    sampleSentence:
      "Over the last decade, technology has transformed how students learn languages.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Charon (Male · US Deep)",
  },
  {
    id: "en-US-Chirp3-HD-Fenrir",
    name: "Fenrir (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Fenrir",
    cloudTtsVoice: "en-US-Chirp3-HD-Fenrir",
    requiresApiKey: true,
    subtitle: "Male · Dynamic & resonant (US)",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Fenrir).",
    sampleSentence:
      "In today's debate, both speakers presented compelling evidence.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Fenrir (Male · US Dynamic)",
  },
  {
    id: "en-US-Chirp3-HD-Orus",
    name: "Orus (Chirp 3 HD · English US)",
    provider: "google-cloud-hd",
    geminiVoice: "Orus",
    cloudTtsVoice: "en-US-Chirp3-HD-Orus",
    requiresApiKey: true,
    subtitle: "Male · Clear & articulate (US)",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD US English voice (en-US-Chirp3-HD-Orus).",
    sampleSentence:
      "First, summarize the main idea before moving on to details.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-US",
    label: "en-US-Chirp3-HD-Orus (Male · US Clear)",
  },

  // --- Englisch UK (en-GB) ---
  {
    id: "en-GB-Chirp3-HD-Aoede",
    name: "Aoede (Chirp 3 HD · English UK)",
    provider: "google-cloud-hd",
    geminiVoice: "Aoede",
    cloudTtsVoice: "en-GB-Chirp3-HD-Aoede",
    requiresApiKey: true,
    subtitle: "Female · British warm storytelling",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD British English voice (en-GB-Chirp3-HD-Aoede).",
    sampleSentence:
      "Good afternoon! Welcome to today's British English listening session.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-GB",
    label: "en-GB-Chirp3-HD-Aoede (Female · UK)",
  },
  {
    id: "en-GB-Chirp3-HD-Kore",
    name: "Kore (Chirp 3 HD · English UK)",
    provider: "google-cloud-hd",
    geminiVoice: "Kore",
    cloudTtsVoice: "en-GB-Chirp3-HD-Kore",
    requiresApiKey: true,
    subtitle: "Female · British clear studio",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD British English voice (en-GB-Chirp3-HD-Kore).",
    sampleSentence:
      "Please read the questions carefully before selecting your answer.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-GB",
    label: "en-GB-Chirp3-HD-Kore (Female · UK Studio)",
  },
  {
    id: "en-GB-Chirp3-HD-Puck",
    name: "Puck (Chirp 3 HD · English UK)",
    provider: "google-cloud-hd",
    geminiVoice: "Puck",
    cloudTtsVoice: "en-GB-Chirp3-HD-Puck",
    requiresApiKey: true,
    subtitle: "Male · British natural & lively",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD British English voice (en-GB-Chirp3-HD-Puck).",
    sampleSentence:
      "That's a brilliant example of formal vs. informal register.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-GB",
    label: "en-GB-Chirp3-HD-Puck (Male · UK)",
  },
  {
    id: "en-GB-Chirp3-HD-Charon",
    name: "Charon (Chirp 3 HD · English UK)",
    provider: "google-cloud-hd",
    geminiVoice: "Charon",
    cloudTtsVoice: "en-GB-Chirp3-HD-Charon",
    requiresApiKey: true,
    subtitle: "Male · British deep narrator",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Official Google Cloud Chirp 3 HD British English voice (en-GB-Chirp3-HD-Charon).",
    sampleSentence:
      "Historical landmarks across London attract millions of visitors each year.",
    rate: 1.0,
    pitch: 1.0,
    lang: "en-GB",
    label: "en-GB-Chirp3-HD-Charon (Male · UK Deep)",
  },

  // --- Italienisch (it-IT) ---
  {
    id: "it-IT-Chirp3-HD-Aoede",
    name: "Aoede (Chirp 3 HD · Italiano)",
    provider: "google-cloud-hd",
    geminiVoice: "Aoede",
    cloudTtsVoice: "it-IT-Chirp3-HD-Aoede",
    requiresApiKey: true,
    subtitle: "Weiblich · Italienisch HD",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD Stimme für Italienisch (it-IT-Chirp3-HD-Aoede).",
    sampleSentence:
      "Ciao! Impariamo insieme l'italiano con una pronuncia naturale.",
    rate: 1.0,
    pitch: 1.0,
    lang: "it-IT",
    label: "it-IT-Chirp3-HD-Aoede (Italiano · Femminile)",
  },
  {
    id: "it-IT-Chirp3-HD-Puck",
    name: "Puck (Chirp 3 HD · Italiano)",
    provider: "google-cloud-hd",
    geminiVoice: "Puck",
    cloudTtsVoice: "it-IT-Chirp3-HD-Puck",
    requiresApiKey: true,
    subtitle: "Männlich · Italienisch HD",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD Stimme für Italienisch (it-IT-Chirp3-HD-Puck).",
    sampleSentence:
      "Buongiorno! Ecco la tua prossima lezione di ascolto.",
    rate: 1.0,
    pitch: 1.0,
    lang: "it-IT",
    label: "it-IT-Chirp3-HD-Puck (Italiano · Maschile)",
  },

  // --- Spanisch (es-ES) ---
  {
    id: "es-ES-Chirp3-HD-Aoede",
    name: "Aoede (Chirp 3 HD · Español)",
    provider: "google-cloud-hd",
    geminiVoice: "Aoede",
    cloudTtsVoice: "es-ES-Chirp3-HD-Aoede",
    requiresApiKey: true,
    subtitle: "Weiblich · Spanisch HD",
    gender: "female",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD Stimme für Spanisch (es-ES-Chirp3-HD-Aoede).",
    sampleSentence:
      "¡Hola! Vamos a practicar español con voces HD reales.",
    rate: 1.0,
    pitch: 1.0,
    lang: "es-ES",
    label: "es-ES-Chirp3-HD-Aoede (Español · Femenino)",
  },
  {
    id: "es-ES-Chirp3-HD-Puck",
    name: "Puck (Chirp 3 HD · Español)",
    provider: "google-cloud-hd",
    geminiVoice: "Puck",
    cloudTtsVoice: "es-ES-Chirp3-HD-Puck",
    requiresApiKey: true,
    subtitle: "Männlich · Spanisch HD",
    gender: "male",
    badge: "Chirp 3 HD · API-Key",
    description:
      "Offizielle Google Cloud Chirp 3 HD Stimme für Spanisch (es-ES-Chirp3-HD-Puck).",
    sampleSentence:
      "¡Buenos días! Empecemos con el siguiente ejercicio.",
    rate: 1.0,
    pitch: 1.0,
    lang: "es-ES",
    label: "es-ES-Chirp3-HD-Puck (Español · Masculino)",
  },
] as const;

export const GERMAN_HD_VOICES = CLOUD_HD_VOICES.filter((v) => v.lang === "de-DE");
export const ENGLISH_US_HD_VOICES = CLOUD_HD_VOICES.filter((v) => v.lang === "en-US");
export const ENGLISH_GB_HD_VOICES = CLOUD_HD_VOICES.filter((v) => v.lang === "en-GB");
export const ITALIAN_HD_VOICES = CLOUD_HD_VOICES.filter((v) => v.lang === "it-IT");
export const SPANISH_HD_VOICES = CLOUD_HD_VOICES.filter((v) => v.lang === "es-ES");

// Kompatibilitäts-Aliase (nur noch echte HD-Stimmen enthalten)
export const GEMINI_HD_VOICES = CLOUD_HD_VOICES;
export const GEMINI_VOICES = CLOUD_HD_VOICES;
export const ALL_READER_VOICES = CLOUD_HD_VOICES;
export const REALISTIC_VOICE_PACKAGES = CLOUD_HD_VOICES;

export const DEFAULT_VOICE: ReaderVoice = CLOUD_HD_VOICES[0]!;

export const LEGACY_VOICE_ALIASES: Record<string, string> = {
  "erzaehler-episch": "de-DE-Chirp3-HD-Charon",
  "maerchen-warm": "de-DE-Chirp3-HD-Aoede",
  "heldensaga-dynamisch": "de-DE-Chirp3-HD-Fenrir",
  "hoerbuch-studio": "de-DE-Chirp3-HD-Kore",
  "gemini-charon": "de-DE-Chirp3-HD-Charon",
  "gemini-aoede": "de-DE-Chirp3-HD-Aoede",
  "gemini-fenrir": "de-DE-Chirp3-HD-Fenrir",
  "gemini-kore": "de-DE-Chirp3-HD-Kore",
  "gemini-puck": "de-DE-Chirp3-HD-Puck",
  "gemini-zephyr": "de-DE-Chirp3-HD-Zephyr",
  "google-de-standard": "de-DE-Chirp3-HD-Kore",
  "google-de-female": "de-DE-Chirp3-HD-Aoede",
  "google-de-male": "de-DE-Chirp3-HD-Charon",
  "google-at-austria": "de-DE-Chirp3-HD-Aoede",
  Charon: "de-DE-Chirp3-HD-Charon",
  Aoede: "de-DE-Chirp3-HD-Aoede",
  Fenrir: "de-DE-Chirp3-HD-Fenrir",
  Kore: "de-DE-Chirp3-HD-Kore",
  Puck: "de-DE-Chirp3-HD-Puck",
  Zephyr: "de-DE-Chirp3-HD-Zephyr",
  Leda: "de-DE-Chirp3-HD-Leda",
  Orus: "de-DE-Chirp3-HD-Orus",
};

export function hdVoicesForLanguage(languageCode: string): readonly ReaderVoice[] {
  const prefix = languageCode.toLowerCase().slice(0, 2);
  const matched = CLOUD_HD_VOICES.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  return matched.length > 0 ? matched : CLOUD_HD_VOICES;
}

export function resolveVoice(voiceId?: string): ReaderVoice {
  if (!voiceId) return DEFAULT_VOICE;
  const trimmed = voiceId.trim();
  const direct = CLOUD_HD_VOICES.find(
    (v) => v.id === trimmed || v.cloudTtsVoice === trimmed
  );
  if (direct) return direct;

  const aliasedId = LEGACY_VOICE_ALIASES[trimmed];
  if (aliasedId) {
    const aliased = CLOUD_HD_VOICES.find((v) => v.id === aliasedId);
    if (aliased) return aliased;
  }

  // Dynamische echte Chirp3-HD Stimme aus der Cloud TTS API unterstützen (z. B. fr-FR-Chirp3-HD-Aoede)
  const chirpMatch = trimmed.match(/^([a-z]{2}-[A-Z]{2})-Chirp3-HD-([A-Za-z0-9_-]+)$/);
  if (chirpMatch) {
    const [, lang, speaker] = chirpMatch;
    return {
      id: trimmed,
      name: `${speaker} (Chirp 3 HD · ${lang})`,
      provider: "google-cloud-hd",
      geminiVoice: speaker!,
      cloudTtsVoice: trimmed,
      requiresApiKey: true,
      subtitle: `Google Cloud Chirp 3 HD (${lang})`,
      gender: "neutral",
      badge: "Chirp 3 HD · API-Key",
      description: `Offizielle Google Cloud Chirp 3 HD Stimme (${trimmed}).`,
      sampleSentence: `Hallo, hier spricht ${speaker}.`,
      rate: 1.0,
      pitch: 1.0,
      lang: lang!,
      label: `${trimmed} (Chirp 3 HD)`,
    };
  }

  return DEFAULT_VOICE;
}

/**
 * Lädt optional alle live verfügbaren Chirp3-HD Stimmen direkt aus der Google Cloud Text-to-Speech API.
 */
export async function fetchGoogleCloudHdVoices(apiKey: string): Promise<ReaderVoice[]> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error("Bitte Google Cloud API-Key eingeben.");
  }

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(key)}`
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message || `Cloud TTS Stimmenabruf fehlgeschlagen (${res.status}).`);
  }

  const data = (await res.json()) as {
    voices?: Array<{
      name?: string;
      languageCodes?: string[];
      ssmlGender?: string;
    }>;
  };

  const allowedLocales = new Set(["de-DE", "en-US", "en-GB", "it-IT", "es-ES"]);
  const liveVoices: ReaderVoice[] = [];
  const seen = new Set<string>();

  for (const v of data.voices ?? []) {
    const name = v.name ?? "";
    if (!name.includes("-Chirp3-HD-")) continue;
    const lang = v.languageCodes?.[0] ?? name.slice(0, 5);
    if (!allowedLocales.has(lang) || seen.has(name)) continue;
    seen.add(name);

    const existing = CLOUD_HD_VOICES.find((c) => c.cloudTtsVoice === name);
    if (existing) {
      liveVoices.push(existing);
      continue;
    }

    const speaker = name.split("-Chirp3-HD-")[1] ?? name;
    const gender: VoiceGender =
      v.ssmlGender === "FEMALE" ? "female" : v.ssmlGender === "MALE" ? "male" : "neutral";
    liveVoices.push({
      id: name,
      name: `${speaker} (Chirp 3 HD · ${lang})`,
      provider: "google-cloud-hd",
      geminiVoice: speaker,
      cloudTtsVoice: name,
      requiresApiKey: true,
      subtitle: `${gender === "female" ? "Weiblich" : gender === "male" ? "Männlich" : "Neutral"} · Google Cloud HD`,
      gender,
      badge: "Chirp 3 HD · API-Key",
      description: `Live aus Google Cloud Text-to-Speech API geladen (${name}).`,
      sampleSentence: `Hallo, hier spricht ${speaker} in HD-Qualität.`,
      rate: 1.0,
      pitch: 1.0,
      lang,
      label: `${name} (${gender === "female" ? "Weiblich" : gender === "male" ? "Männlich" : "HD"})`,
    });
  }

  return liveVoices.sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
}

export type CloudHdVoiceId = (typeof CLOUD_HD_VOICES)[number]["id"];
export type ReaderVoiceId = CloudHdVoiceId;

export const VOICE_STORAGE_KEY = "sprachtrainer-google-voice";
