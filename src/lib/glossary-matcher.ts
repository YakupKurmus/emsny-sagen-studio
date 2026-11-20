import type { SagaGlossaryItem } from "@/data/sagen-catalog";

export interface GlossaryMatcherIndex {
  exactMap: Map<string, SagaGlossaryItem>;
  stemEntries: Array<{ stem: string; item: SagaGlossaryItem }>;
}

const ARTICLE_PREFIX = /^(?:der|die|das|ein|eine|einen|einem|einer|sich|etwas|jemanden|jemandem)\s+/i;

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-zäöüß-]/gi, "")
    .trim();
}

function buildStem(word: string): string {
  if (word.length < 5) return word;
  // Einfache deutsche Flexions-Stämme für Verben/Adjektive/Nomen (z. B. prassen -> prass, ungeheuerlich -> ungeheuerlich)
  if (word.endsWith("en") && word.length >= 6) return word.slice(0, -2);
  if (word.endsWith("er") && word.length >= 6) return word.slice(0, -1);
  if (word.endsWith("e") && word.length >= 6) return word.slice(0, -1);
  return word;
}

export function createGlossaryIndex(
  glossary?: readonly SagaGlossaryItem[]
): GlossaryMatcherIndex {
  const exactMap = new Map<string, SagaGlossaryItem>();
  const stemEntries: Array<{ stem: string; item: SagaGlossaryItem }> = [];

  if (!glossary || glossary.length === 0) {
    return { exactMap, stemEntries };
  }

  for (const item of glossary) {
    // Entferne führende Artikel/Reflexivpronomen (ggf. mehrfach, z. B. "sich etwas...")
    let core = item.term.trim();
    while (ARTICLE_PREFIX.test(core)) {
      core = core.replace(ARTICLE_PREFIX, "").trim();
    }
    // Auch Klammerzusätze ignorieren, z. B. "gefeit sein (gegen)"
    core = core.replace(/\(.*?\)/g, "").trim();

    const parts = core
      .split(/[\s/,]+/)
      .map(normalizeToken)
      .filter((p) => p.length >= 4 && !["sein", "haben", "werden", "machen", "fallen"].includes(p));

    for (const part of parts) {
      if (!exactMap.has(part)) {
        exactMap.set(part, item);
      }
      const stem = buildStem(part);
      if (stem.length >= 4) {
        stemEntries.push({ stem, item });
      }
    }
  }

  // Längste Stämme zuerst für präzisere Treffer
  stemEntries.sort((a, b) => b.stem.length - a.stem.length);

  return { exactMap, stemEntries };
}

export function findGlossaryMatch(
  tokenText: string,
  index: GlossaryMatcherIndex
): SagaGlossaryItem | null {
  if (index.exactMap.size === 0) return null;
  const clean = normalizeToken(tokenText);
  if (clean.length < 4) return null;

  const exact = index.exactMap.get(clean);
  if (exact) return exact;

  for (const entry of index.stemEntries) {
    if (clean.startsWith(entry.stem) && clean.length <= entry.stem.length + 4) {
      return entry.item;
    }
  }

  return null;
}
