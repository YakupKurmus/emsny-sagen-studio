const NOUN_GUARD_BEFORE_COMMAND =
  /(?:^|\s)(?:ein|eine|einen|einem|einer|der|die|das|dem|den|dieser|dieses|diesem|diesen|jeder|jedem|jeden|kein|keine|keinen|keinem|am|zum|im|auf|mit|nach|vor|ab|bis|den|nächsten|ersten|letzten|wichtigen|kleinen|großen)$/i;

function replaceCommandGuarded(
  input: string,
  pattern: RegExp,
  replacement: string,
  allowNounGuard = true
): string {
  return input.replace(pattern, (match, offset: number, full: string) => {
    if (allowNounGuard) {
      const before = full.slice(0, offset).trimEnd();
      if (NOUN_GUARD_BEFORE_COMMAND.test(before)) {
        return match;
      }
    }
    return replacement;
  });
}

/**
 * Wandelt gesprochene österreichische/deutsche Satzzeichen- und Formatbefehle
 * deterministisch um (z. B. "Punkt", "Beistrich", "Komma", "Fragezeichen",
 * "Rufzeichen", "neue Zeile", "neuer Absatz", "Doppelpunkt", "Anführungszeichen").
 * Erfindet niemals Wörter dazu und behält Wendungen wie "an diesem Punkt" bei.
 */
export function applySpokenPunctuationCommands(raw: string): string {
  if (!raw) return "";

  let text = raw.replace(/\r\n/g, "\n");

  // Mehrwort-Befehle zuerst (ohne Nomen-Guard, da eindeutig als Diktierbefehl)
  text = text.replace(/\b(?:neuer\s+absatz|nächster\s+absatz)\b/gi, "\n\n");
  text = text.replace(/\b(?:neue\s+zeile|nächste\s+zeile|zeilenumbruch)\b/gi, "\n");
  text = text.replace(/\b(?:anführungszeichen\s+auf|gänsefüßchen\s+auf|anführungszeichen\s+oben|anführungszeichen\s+unten)\b/gi, "„");
  text = text.replace(/\b(?:anführungszeichen\s+zu|gänsefüßchen\s+zu|anführungszeichen\s+ende)\b/gi, "“");

  // Einzelwort-Befehle (Nomen-Guard nur bei "Punkt", damit z. B. "Halt ein Rufzeichen" -> "Halt ein!" klappt)
  text = replaceCommandGuarded(text, /\bfragezeichen\b/gi, "?", false);
  text = replaceCommandGuarded(text, /\b(?:rufzeichen|ausrufezeichen)\b/gi, "!", false);
  text = replaceCommandGuarded(text, /\bdoppelpunkt\b/gi, ":", false);
  text = replaceCommandGuarded(text, /\b(?:strichpunkt|semikolon)\b/gi, ";", false);
  text = replaceCommandGuarded(text, /\b(?:beistrich|komma)\b/gi, ",", false);
  text = replaceCommandGuarded(text, /\bpunkt\b/gi, ".", true);
  text = replaceCommandGuarded(text, /\bgedankenstrich\b/gi, " – ", false);

  // Leerzeichen rund um Satzzeichen & Zeilenumbrüche sauber bereinigen
  text = text
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .replace(/([.,!?;:])([^\s\n.,!?;:“"'\)\]])/g, "$1 $2")
    .replace(/„\s+/g, "„")
    .replace(/\s+“/g, "“")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Satzanfänge & Zeilenanfänge sauber großschreiben
  text = capitalizeSentenceStarts(text);

  return text;
}

export function capitalizeSentenceStarts(text: string): string {
  if (!text) return text;
  // Erstes Buchstabenzeichen am Textanfang (ggf. nach „)
  let out = text.replace(/^(\s*„?)([a-zäöüß])/, (_, p: string, ch: string) => p + ch.toUpperCase());
  // Nach Satzende (. ! ?), Zeilenumbruch oder direkter Rede (: „)
  out = out.replace(
    /([.!?]\s+„?|\n\s*„?|:\s*„)([a-zäöüß])/g,
    (_, p: string, ch: string) => p + ch.toUpperCase()
  );
  return out;
}

function tokenizeComparableWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:„“"'\-–—()\[\]\n]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Sicherheitsprüfung: Stellt sicher, dass die KI beim Formatieren wirklich NUR
 * die diktierten Wörter übernommen hat und keine neuen Sätze erfunden oder
 * wesentliche Teile weggelassen hat.
 */
export function isStrictlyVerbatimPolish(spokenRaw: string, polished: string): boolean {
  const cleanPolished = polished.trim();
  if (!cleanPolished) return false;

  const commandCleaned = applySpokenPunctuationCommands(spokenRaw);
  const baseWords = tokenizeComparableWords(commandCleaned);
  const polishedWords = tokenizeComparableWords(cleanPolished);

  if (baseWords.length === 0) return polishedWords.length === 0;

  // Kleine Toleranz für zusammengeschriebene Wörter (z. B. "Wörthersee Mandl" -> "Wörtherseemandl")
  const minAllowed = Math.max(1, Math.floor(baseWords.length * 0.72) - 1);
  const maxAllowed = Math.ceil(baseWords.length * 1.25) + 2;

  return polishedWords.length >= minAllowed && polishedWords.length <= maxAllowed;
}

/**
 * Fügt diktierten Text sauber in bestehenden Text ein und erhält dabei echte
 * Zeilenumbrüche ("\n", "\n\n"), Satzzeichen und Großschreibung.
 */
export function mergeDictatedChunk(existingText: string, spokenChunk: string): string {
  const chunk = spokenChunk
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!chunk) return existingText;

  if (!existingText.trim()) {
    return capitalizeSentenceStarts(chunk);
  }

  const trimmedRight = existingText.replace(/[ \t]+$/, "");
  const startsWithNewline = spokenChunk.startsWith("\n");
  const startsWithPunctuation = /^[.,!?;:)\]]/.test(chunk);
  const endsWithNewline = trimmedRight.endsWith("\n");
  const endsWithSentenceEnd = /[.!?…]\s*$/.test(trimmedRight) || endsWithNewline;

  const normalizedChunk = endsWithSentenceEnd ? capitalizeSentenceStarts(chunk) : chunk;

  if (startsWithNewline) {
    const leadingBreaks = spokenChunk.match(/^\n+/)?.[0] ?? "\n";
    return `${trimmedRight}${leadingBreaks}${capitalizeSentenceStarts(chunk)}`;
  }

  if (startsWithPunctuation) {
    return `${trimmedRight}${normalizedChunk}`;
  }

  // Duplikat-Schutz bei doppelten Final-Events
  const existingWords = trimmedRight.split(/\s+/);
  const incomingWords = normalizedChunk.split(/\s+/);
  if (incomingWords.length >= 2 && existingWords.length >= incomingWords.length) {
    const tail = existingWords.slice(-incomingWords.length).join(" ").toLowerCase();
    if (tail === normalizedChunk.toLowerCase()) {
      return existingText;
    }
  }

  const separator = endsWithNewline ? "" : " ";
  return `${trimmedRight}${separator}${normalizedChunk}`;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Audiodatei konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}

export function selectBestAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}
