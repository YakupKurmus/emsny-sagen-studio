import type { Saga } from "@/data/sagen-catalog";
import { SAGA_SECTIONS_META, type SagaDraft } from "@/lib/writing-types";

export interface PrintStoryOptions {
  saga: Saga;
  draft: SagaDraft;
  totalWords: number;
  includeGlossary?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Erkennt iOS/iPadOS Standalone-PWA-Modus, in dem window.print() von WebKit
 * häufig stumm ignoriert wird.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

/**
 * Erstellt eine saubere Nur-Text-Version der Nacherzählung für Teilen/Kopieren.
 */
export function buildPlainTextStory({
  saga,
  draft,
  totalWords,
  includeGlossary = false,
}: PrintStoryOptions): string {
  const lines: string[] = [
    `${saga.title} – Meine Nacherzählung`,
    `${saga.region} · ${totalWords} Wörter`,
    "",
  ];

  let hasAnyContent = false;
  for (const meta of SAGA_SECTIONS_META) {
    const content = draft.sections[meta.id].trim();
    if (!content) continue;
    hasAnyContent = true;
    lines.push(`${meta.number}. ${meta.shortTitle} (${meta.subtitle})`);
    lines.push(content);
    lines.push("");
  }

  if (!hasAnyContent) {
    lines.push("(Noch kein Text geschrieben.)");
    lines.push("");
  }

  if (includeGlossary && saga.glossary && saga.glossary.length > 0) {
    lines.push("Anhang: B2-Wortschatz");
    for (const g of saga.glossary) {
      lines.push(`- ${g.term}: ${g.explanation}`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * Erstellt ein eigenständiges, druckfertiges A4-HTML-Dokument.
 * Funktioniert zuverlässig in Safari (iOS/iPadOS), Chrome (Android) und am Desktop –
 * auch als Fallback, wenn In-App-Browser oder PWAs window.print() blockieren.
 */
export function buildPrintableHtml({
  saga,
  draft,
  totalWords,
  includeGlossary = true,
}: PrintStoryOptions): string {
  const sectionsHtml = SAGA_SECTIONS_META.map((meta) => {
    const content = draft.sections[meta.id].trim();
    if (!content) return "";
    return `
      <section class="story-section">
        <h2>${escapeHtml(`${meta.number}. ${meta.shortTitle} (${meta.subtitle})`)}</h2>
        <p>${escapeHtml(content)}</p>
      </section>
    `;
  })
    .filter(Boolean)
    .join("\n");

  const bodyContent =
    sectionsHtml ||
    `<p class="empty-note">Du hast noch keinen Text geschrieben. Kehre in die Schreibwerkstatt zurück und ergänze mindestens einen Abschnitt.</p>`;

  const glossaryHtml =
    includeGlossary && saga.glossary && saga.glossary.length > 0
      ? `
      <section class="glossary">
        <h2>Anhang: B2-Wortschatz</h2>
        <ul>
          ${saga.glossary
            .map(
              (g) =>
                `<li><strong>${escapeHtml(g.term)}:</strong> ${escapeHtml(g.explanation)}</li>`
            )
            .join("\n")}
        </ul>
      </section>
    `
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(saga.title)} – Meine Nacherzählung</title>
  <style>
    @page {
      size: A4;
      margin: 16mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .toolbar-tip {
      font-size: 13px;
      color: #475569;
      margin: 0;
    }
    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      appearance: none;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-weight: 700;
      font-size: 14px;
      padding: 10px 16px;
      border-radius: 10px;
      cursor: pointer;
    }
    .btn-primary {
      background: #047857;
      border-color: #047857;
      color: #ffffff;
    }
    .sheet {
      max-width: 740px;
      margin: 20px auto;
      background: #ffffff;
      padding: 32px;
      border-radius: 14px;
      box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
    }
    .doc-header {
      border-bottom: 2px solid #065f46;
      padding-bottom: 14px;
      margin-bottom: 24px;
    }
    .kicker {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
      color: #64748b;
      margin: 0;
    }
    h1 {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      line-height: 1.2;
      margin: 6px 0 4px;
      color: #0f172a;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .story-section {
      margin-bottom: 20px;
      break-inside: avoid;
    }
    .story-section h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #064e3b;
      margin: 0 0 6px;
    }
    .story-section p {
      font-size: 15px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .empty-note {
      color: #64748b;
      font-style: italic;
      font-size: 14px;
    }
    .glossary {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #cbd5e1;
      break-before: page;
    }
    .glossary h2 {
      font-size: 15px;
      margin: 0 0 10px;
      color: #0f172a;
    }
    .glossary ul {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
    }
    .glossary li {
      margin-bottom: 4px;
    }
    @media (max-width: 640px) {
      .sheet {
        margin: 12px;
        padding: 20px;
      }
    }
    @media print {
      body {
        background: #ffffff;
      }
      .toolbar {
        display: none !important;
      }
      .sheet {
        max-width: none;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p class="toolbar-tip">
      <strong>Druckansicht:</strong> Tippe auf „Drucken“ oder nutze im Browser <em>Teilen → Drucken / Als PDF sichern</em>.
    </p>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-primary" onclick="window.print()">Drucken / PDF</button>
      <button type="button" class="btn" onclick="window.close()">Schließen</button>
    </div>
  </div>
  <article class="sheet">
    <header class="doc-header">
      <p class="kicker">Meine Nacherzählung · 6. Schulstufe</p>
      <h1>${escapeHtml(saga.title)}</h1>
      <p class="meta">${escapeHtml(saga.region)} · ${totalWords} Wörter</p>
    </header>
    ${bodyContent}
    ${glossaryHtml}
  </article>
</body>
</html>`;
}

/**
 * Öffnet die eigenständige Druckansicht in einem neuen Tab (muss synchron im Click-Handler
 * aufgerufen werden, damit mobile Browser das Fenster nicht blockieren).
 * Fällt auf HTML-Download zurück, falls Pop-ups blockiert sind.
 */
export function openPrintableDocument(html: string, filenameBase: string): "window" | "download" {
  if (typeof window === "undefined") return "download";

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const popup = window.open(blobUrl, "_blank");
  if (popup) {
    try {
      popup.focus();
    } catch {
      // ignore focus restrictions
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return "window";
  }

  // Fallback: Datei direkt herunterladen (lässt sich auf iPad/iPhone/Android in Safari/Chrome drucken)
  const safeName = filenameBase
    .toLowerCase()
    .replace(/[^a-z0-9äöüß-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${safeName || "meine-sage"}-druckansicht.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  return "download";
}

/**
 * Löst window.print() mobil- und tablet-sicher aus:
 * 1) Schließt zuerst die Bildschirmtastatur durch blur() auf dem aktiven Element.
 * 2) Wartet einen kurzen Frame, damit iOS/iPadOS das Layout sauber neu berechnet.
 */
export function triggerMobileSafePrint(): boolean {
  if (typeof window === "undefined" || typeof window.print !== "function") {
    return false;
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }

  window.setTimeout(() => {
    window.print();
  }, 120);

  return true;
}
