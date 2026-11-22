import type { jsPDF as JsPDFConstructor } from "jspdf";
import type { Saga } from "@/data/sagen-catalog";
import { SAGA_SECTIONS_META, type SagaDraft } from "@/lib/writing-types";

let cachedJsPDF: (typeof JsPDFConstructor) | null = null;
let jsPdfLoadPromise: Promise<typeof JsPDFConstructor> | null = null;

/**
 * Lädt jsPDF vorab (z. B. beim Öffnen der Druckvorschau), damit der PDF-Export
 * beim Klick auf iPad/iPhone mit 0 ms Verzögerung startet und navigator.share()
 * die iOS/iPadOS User-Gesture niemals verliert.
 */
export async function preloadPdfEngine(): Promise<typeof JsPDFConstructor> {
  if (cachedJsPDF) return cachedJsPDF;
  if (!jsPdfLoadPromise) {
    jsPdfLoadPromise = import("jspdf").then((mod) => {
      cachedJsPDF = mod.jsPDF;
      return mod.jsPDF;
    });
  }
  return jsPdfLoadPromise;
}

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

function slugifyFilename(title: string): string {
  const safe = title
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "meine-sage";
}

/**
 * Normalisiert typografische Zeichen außerhalb von Latin-1 (Windows-1252) für jsPDF-Standardschriften,
 * während alle deutschen Umlaute (äöüÄÖÜß) und gängige Zeichen vollständig erhalten bleiben.
 */
function sanitizePdfText(value: string): string {
  return value
    .replaceAll("\u201e", '"')
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u201a", "'")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2026", "...")
    .replaceAll("\u00a0", " ")
    .replace(/[^\x09\x0a\x0d\x20-\xff]/g, "");
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
 * Erzeugt eine echte A4-PDF-Datei direkt im Browser (ohne Server, offline-fähig).
 * Funktioniert zuverlässig auf iPhone, iPad, Android-Tablets und am Desktop –
 * ideal zum direkten Drucken (AirPrint / Android Print) oder Speichern in Dateien.
 */
function buildStoryPdfWithConstructor(
  JsPDFCtor: typeof JsPDFConstructor,
  { saga, draft, totalWords, includeGlossary = true }: PrintStoryOptions
): { blob: Blob; filename: string; file: File } {
  const doc = new JsPDFCtor({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const maxWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 22;
  let y = 20;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > bottomLimit) {
      doc.addPage();
      y = 20;
    }
  };

  // Kicker
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText("MEINE NACHERZÄHLUNG · 6. SCHULSTUFE"), marginX, y);
  y += 8;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(sanitizePdfText(saga.title), maxWidth) as string[];
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 8.5 + 1;

  // Meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText(`${saga.region} · ${totalWords} Wörter`), marginX, y);
  y += 4.5;

  // Emerald divider
  doc.setDrawColor(6, 95, 70);
  doc.setLineWidth(0.7);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 10;

  // Story sections
  let hasContent = false;
  for (const meta of SAGA_SECTIONS_META) {
    const content = draft.sections[meta.id].trim();
    if (!content) continue;
    hasContent = true;

    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(6, 78, 59);
    const heading = sanitizePdfText(
      `${meta.number}. ${meta.shortTitle.toUpperCase()} (${meta.subtitle.toUpperCase()})`
    );
    const headingLines = doc.splitTextToSize(heading, maxWidth) as string[];
    doc.text(headingLines, marginX, y);
    y += headingLines.length * 4.8 + 1.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);

    const paragraphs = content.split(/\r?\n/);
    for (const para of paragraphs) {
      if (!para.trim()) {
        y += 3.5;
        continue;
      }
      const lines = doc.splitTextToSize(sanitizePdfText(para), maxWidth) as string[];
      for (const line of lines) {
        ensureSpace(6);
        doc.text(line, marginX, y);
        y += 5.6;
      }
      y += 1.5;
    }

    y += 5;
  }

  if (!hasContent) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText("Noch kein Text geschrieben. Ergänze mindestens einen Abschnitt."),
      marginX,
      y
    );
    y += 10;
  }

  // Optional B2 Glossary on a fresh page
  if (includeGlossary && saga.glossary && saga.glossary.length > 0) {
    doc.addPage();
    y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText("Anhang: B2-Wortschatz"), marginX, y);
    y += 3.5;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    for (const g of saga.glossary) {
      const entry = sanitizePdfText(`${g.term}: ${g.explanation}`);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(entry, maxWidth - 4) as string[];
      ensureSpace(lines.length * 5 + 3);
      doc.text("•", marginX, y);
      doc.text(lines, marginX + 4, y);
      y += lines.length * 5 + 2;
    }
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Seite ${p} / ${totalPages}`, pageWidth - marginX, pageHeight - 10, {
      align: "right",
    });
  }

  const blob = doc.output("blob");
  const filename = `${slugifyFilename(saga.title)}-nacherzaehlung.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });
  return { blob, filename, file };
}

/**
 * Synchroner PDF-Bau (wenn preloadPdfEngine() bereits geladen wurde) –
 * erhält die User-Gesture-Kette für navigator.share() auf iPadOS & iOS!
 */
export function generateStoryPdfSync(
  options: PrintStoryOptions
): { blob: Blob; filename: string; file: File } | null {
  if (!cachedJsPDF) return null;
  return buildStoryPdfWithConstructor(cachedJsPDF, options);
}

/**
 * Erzeugt eine echte A4-PDF-Datei direkt im Browser (ohne Server, offline-fähig).
 * Funktioniert zuverlässig auf iPhone, iPad, Android-Tablets und am Desktop –
 * ideal zum direkten Drucken (AirPrint / Android Print) oder Speichern in Dateien.
 */
export async function generateStoryPdf(
  options: PrintStoryOptions
): Promise<{ blob: Blob; filename: string; file: File }> {
  const JsPDFCtor = await preloadPdfEngine();
  return buildStoryPdfWithConstructor(JsPDFCtor, options);
}

/**
 * Lädt eine erzeugte PDF-Datei herunter oder teilt sie auf Mobilgeräten/Tablets
 * direkt über das native Teilen-Menü (inkl. AirPrint / Drucken / Dateien).
 */
export async function shareOrDownloadPdf(
  pdf: { blob: Blob; filename: string; file: File },
  title: string
): Promise<"shared" | "downloaded"> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      if (navigator.canShare({ files: [pdf.file] })) {
        await navigator.share({
          title: `${title} – Meine Nacherzählung`,
          files: [pdf.file],
        });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "shared";
      }
      // Fallback to direct download below
    }
  }

  const url = URL.createObjectURL(pdf.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = pdf.filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

/**
 * Erstellt ein eigenständiges, druckfertiges A4-HTML-Dokument.
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
 * Öffnet die eigenständige Druckansicht über document.write() (statt blob:-URL,
 * die von iOS/iPadOS Safari beim Drucken häufig blockiert wird).
 */
export function openPrintableDocument(html: string, filenameBase: string): "window" | "download" {
  if (typeof window === "undefined") return "download";

  const popup = window.open("", "_blank");
  if (popup) {
    try {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      return "window";
    } catch {
      // Fall through to download
    }
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${slugifyFilename(filenameBase)}-druckansicht.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  return "download";
}

/**
 * Löst window.print() SYNCHRON im Click-Handler aus, damit iOS/iPadOS Safari
 * und Android Chrome die User-Gesture-Aktivierung nicht verlieren.
 */
export function triggerMobileSafePrint(): boolean {
  if (typeof window === "undefined" || typeof window.print !== "function") {
    return false;
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }

  window.print();
  return true;
}
