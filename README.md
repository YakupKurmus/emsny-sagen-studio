# Emsny Sagen-Studio (Lesestudio & Schreibwerkstatt)

Eine gemeinsame Next.js-Web-App für Schüler:innen (6. Schulstufe AHS / B2-Niveau), die das **Sagen-Lesestudio** (Kindle-Lesemodus + 6 Original-MP3-Hörbücher + B2-Glossar) und die **Sagen-Werkstatt** (Nacherzählen in 4 Bausteinen mit KI-Feedback) verbindet.

* **Ohne Login nutzbar:** Alle Entwürfe, Checklisten, Lesefortschritte und eigenen Sagen werden automatisch lokal im Browser gespeichert (inkl. JSON-Backup).
* **Für Laptop, iPad/Tablet & Smartphone:** Responsive Layout, Touch-Buttons für KI-Vorschläge & Synonyme, **Live-Diktat mit wortgetreuer KI-Unterstützung** (setzt *„Punkt“*, *„Beistrich“*, *„Fragezeichen“*, *„Rufzeichen“*, *„neue Zeile“*, *„neuer Absatz“* und fehlende Satzzeichen automatisch um) und sauberer A4-PDF/Druck-Export.

## Schnellstart

1. Abhängigkeiten installieren (falls noch nicht geschehen):
   ```bash
   npm install
   ```
2. API-Key hinterlegen (zwei Optionen):
   * **Direkt im Browser (empfohlen zum schnellen Testen):** App starten, oben rechts auf **Menü** klicken und den Gemini API-Key eingeben, speichern, testen, ändern oder wieder löschen (wird ausschließlich lokal im Browser gespeichert).
   * **Oder serverseitig via `.env.local`:**
     ```bash
     cp .env.example .env.local
     ```
     und dort `GEMINI_API_KEY=...` eintragen.
   *(Hinweis: Lesen, MP3-Hörbücher, freies Schreiben, Auto-Save, Diktat und Druck/PDF funktionieren auch komplett ohne API-Key!)*
3. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```
   Öffne danach `http://localhost:3000`.

## Wichtige Routen

* `/` — Sagen-Hub (Bibliothek, Suche, Kategorien, Upload & Diktat)
* `/sage/[id]/lesen` — Schritt 01: Kindle-Lesestudio mit MP3-Hörbuch, interaktivem B2-Glossar & Aufgaben
* `/sage/[id]/schreiben` — Schritt 02: Schreibwerkstatt mit KI-Hilfen, Fakten- & Präteritum-Check & PDF-Export
* `/portfolio` — Mein Sagen-Portfolio, JSON-Backup (Export & Import) & optionaler Supabase Cloud-Sync (`supabase/schema.sql`)
* `/datenschutz` — DSGVO- & KI-Transparenz inkl. 1-Klick-Löschfunktion für lokale Daten

## Nützliche Befehle

```bash
npm run typecheck   # TypeScript-Prüfung
npm test            # Vitest-Testsuite (Lesestudio + Schreibwerkstatt)
npm run build       # Produktions-Build
```

## Projekt-Roadmap

Den vollständigen Phasenplan findest du in [ROADMAP.md](./ROADMAP.md).
