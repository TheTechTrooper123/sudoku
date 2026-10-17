# Sudoku

Ein schlankes, werbefreies Sudoku für das Web: vier Schwierigkeitsstufen,
Notizen, Hinweise, Undo/Redo, Timer, Statistik, Hell/Dunkel-Design und
zweisprachige Oberfläche (Deutsch/Englisch).

* **Stack:** Vite + TypeScript (Vanilla, kein Framework) – ca. 23 kB gzip JS/CSS
* **Rätsel:** [YouDoSudoku-API](https://www.youdosudoku.com) über eine eigene
  Serverless-Funktion; fällt bei Ausfall auf einen Generator im Browser zurück
* **Hosting:** Vercel (statisches Frontend + eine Serverless Function)
* **Tests:** 94 Unit-Tests (Vitest) – Solver, Generator, Bewertung, Spielregeln,
  i18n, Formatierung, API-Validierung, Fallback-Kette

---

## 1. Schnellstart

```sh
npm install
cp .env.example .env      # optional: eigenen API-Key eintragen
npm run dev               # http://localhost:5173
```

`npm run dev` startet Vite **und** die API-Funktion (`server/puzzle.ts`) als
Middleware – lokal verhält sich alles wie auf Vercel.

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit API-Middleware |
| `npm run build` | Typecheck + Produktionsbuild nach `dist/` |
| `npm run preview` | Build lokal ausliefern (inkl. API-Middleware) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (einmalig) |
| `npm run test:watch` | Vitest im Watch-Modus |
| `npm run verify` | Lint + Typecheck + Tests (vor jedem Commit sinnvoll) |

## 2. Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `YOUDOSUDOKU_API_KEY` | nein | API-Key für youdosudoku.com. Ist er nicht gesetzt, greift der eingebaute Fallback-Key in `server/lib/config.ts`. |
| `ALLOWED_ORIGINS` | nein | Kommagetrennte Liste erlaubter Origins (z. B. `https://sudoku.ddnsfree.com`). Gesetzt → Der Endpunkt sendet CORS-Header nur für diese Origins. Leer → kein CORS (empfohlen, da Frontend und API auf derselben Domain liegen). |
| `SITE_URL` | nein | Öffentliche Domain, für Dokumentation/Kanonisierung. |

Der Key liegt bewusst im Repository (siehe Abschnitt 5) und wird **nie** an den
Browser ausgeliefert: Er wird ausschließlich serverseitig in der
Serverless-Funktion verwendet.

## 3. Deployment auf Vercel

1. Repository zu GitHub pushen (oder Ordner direkt mit `vercel` deployen).
2. In Vercel „New Project" → Repository importieren. Framework wird über
   `vercel.json` erkannt (`framework: vite`, Build `npm run build`, Output `dist`).
3. Unter **Settings → Environment Variables** `YOUDOSUDOKU_API_KEY` setzen
   (Production + Preview). Optional `ALLOWED_ORIGINS`.
4. Deployen. `npm run build` bündelt die Function zu `api/puzzle.js`; Vercel
   liefert sie automatisch unter `/api/puzzle` aus, alles andere ist statisch.

Vor dem ersten Deploy ohne Vercel CLI:

```sh
npx vercel          # Preview-Deployment
npx vercel --prod   # Produktions-Deployment
```

### Domain und Rechtstexte

Domain und Rechtstexte sind für den Livebetrieb bereits eingetragen:

| Datei | Inhalt |
|---|---|
| `index.html` | `https://sudoku.ddnsfree.com/` in `canonical`, `hreflang`, `og:url`, `og:image` und im JSON-LD-Block |
| `public/robots.txt` | Domain in der `Sitemap:`-Zeile |
| `public/sitemap.xml` | Domain in allen `<loc>`/`href`-Angaben |
| `public/og-image.png` | Aufdruck „sudoku.ddnsfree.com" (Neu-Erzeugung: `python3 tools/make-assets.py`, siehe unten) |
| `public/privacy.html` | Verantwortlicher (Till), Kontakt, Hoster (Vercel Inc.) |
| `public/imprint.html` | Anbieter (Till), Kontakt (§ 5 DDG); bewusst ohne vollständige Anschrift (privat, nicht kommerziell) |

Bei einem Domain- oder Betreiberwechsel müssen genau diese Stellen angepasst
werden – `index.html`, `public/robots.txt`, `public/sitemap.xml`, der Aufdruck
im OG-Bild (danach `python3 tools/make-assets.py`) sowie `public/privacy.html`
und `public/imprint.html`. Beide Rechtstexte sind reine statische Seiten ohne
Build-Schritt.

## 4. Architektur

```
index.html            Statisches Grundgerüst + SEO-Inhalte (H1, Anleitung,
                      Tipps, FAQ, JSON-LD); Text wird zur Laufzeit per
                      data-i18n ausgetauscht
src/
  main.ts             Einstiegspunkt, verdrahtet DOM-IDs mit dem Controller
  core/               Reine Logik ohne DOM: board, solver, generator,
                      difficulty, game, stats, storage, rng, format
  services/           apiClient (→ /api/puzzle), localGenerator (Worker),
                      puzzleService (Kette: Cache → API → lokal)
  state/              app.ts (Controller), settings.ts, store.ts (Mini-Store)
  ui/                 Rendering: view, board, panel, dialogs, theme, i18n-dom
  i18n/               Typisierte Wörterbücher de.ts / en.ts (Schlüsselparität
                      wird von Tests erzwungen)
  workers/            generator.worker.ts – generiert im Browser ohne die
                      Oberfläche zu blockieren
server/
  puzzle.ts           API-Handler (Quelle)
  lib/                config (Key, Grenzen), upstream (HTTP + Validierung),
                      pool (Vorrat), rateLimit (Token-Bucket)
api/
  puzzle.js           Gebündelte Function (Build-Artefakt aus server/, nicht
                      eingecheckt: `npm run build:api` bzw. `npm run build`)
public/               favicon, Manifest, OG-Bild, robots.txt, sitemap.xml,
                      privacy.html, imprint.html (+ static-page.js)
tools/make-assets.py  Erzeugt OG-Bild und Touch-Icon (benötigt Pillow)
tests/                Vitest-Suite mit Fixtures in helpers.ts
```

### Rätsel-Versorgung

1. **Cache** – im Browser liegt ein kleiner Vorrat fertiger Rätsel
   (`sudoku.v1.pool` in `localStorage`), damit ein neues Spiel sofort startet.
2. **API** – `POST /api/puzzle` mit `{ difficulty, count }`; die Funktion holt
   bei youdosudoku.com, prüft die Antwort strukturell (81 Zeichen, `0` = leer,
   Lösung vollständig, Rätsel ⊆ Lösung) und liefert normalisierte Daten zurück.
3. **Lokaler Generator** – ist die API nicht erreichbar oder liefert sie
   fehlerhafte Daten, generiert der Server ersatzweise selbst; schlägt auch das
   fehl, erzeugt ein Web-Worker im Browser ein Rätsel. Der Nutzer sieht in
   keinem Fall eine Fehlermeldung, nur einen Hinweis in den Statistiken.

### Schwierigkeitsgrade

Die API kennt `easy`, `medium`, `hard` (typische Vorgabenzahl: 38 / 30 / 25).
`expert` existiert dort nicht und wird immer lokal erzeugt. Die
Schwierigkeitsstufe, die ein Rätsel trägt, entsteht so:

* **API-Rätsel:** Label der API (strukturell validiert, aber nicht neu bewertet).
* **Lokal erzeugte Rätsel:** eigene Bewertung in `core/difficulty.ts` – das
  Rätsel wird wie von einem Menschen gelöst (Naked/Hidden Singles → leicht/
  mittel, nötige Such-/Backtracking-Schritte → schwer/expert), und der
  Generator sucht so lange, bis Bewertung und gewünschte Stufe
  übereinstimmen (Vorgabenziel: 38 / 32 / 27 / 23 Vorgaben).

### Warum ein Server-Proxy?

Die YouDoSudoku-API sendet **keine CORS-Header**. Ein reines Frontend könnte sie
also technisch nicht aufrufen – ganz abgesehen davon, dass der Key dann im
Browser sichtbar wäre. Die Serverless-Funktion löst beides: Sie validiert und
normalisiert die Antwort und hält den Key aus dem Client heraus.

## 5. Hinweis zum API-Key

Der Key ist auf Wunsch des Betreibers im Code hinterlegt
(`FALLBACK_API_KEY` in `server/lib/config.ts`) und liegt damit im Repository.
Das ist vertretbar, solange der Key nicht weiterverwendet wird – er ist über
den Server-Proxy aber faktisch öffentlich: Wer die Seite aufruft, kann sie über
`/api/puzzle` benutzen, auch wenn er selbst keinen Key besitzt. Deshalb:

* `server/lib/rateLimit.ts` begrenzt Anfragen pro IP (Standard: 60 pro Minute,
  konfigurierbar),
* `server/lib/pool.ts` puffert Rätsel serverseitig, damit nicht jede Anfrage
  einen Upstream-Aufruf kostet,
* der Key kann über die Umgebungsvariable jederzeit ausgetauscht werden, ohne
  Code zu ändern.

Soll der Key nicht ins Repository, einfach `FALLBACK_API_KEY` in
`server/lib/config.ts` leeren und `YOUDOSUDOKU_API_KEY` setzen.

## 6. Bedienung

* **Spielen:** Zelle wählen (Maus/Touch), Ziffer per Tastatur `1`–`9`, Nummernblock
  oder Tastenfeld eintragen. Pfeiltasten/WASD bewegen die Auswahl.
* **Tastenkürzel:** `N` Notizmodus, `Shift+N` neues Spiel, `H` Hinweis,
  `C` Kandidaten automatisch setzen, `Leertaste` Pause, `Entf`/`0`/Rücktaste
  löschen, `Strg+Z`/`Strg+Y` rückgängig/wiederholen.
* **Hilfen:** Konflikthervorhebung, gleiche Ziffern, Peers – alle einzeln
  abschaltbar. „Falsche Eingaben prüfen" markiert Fehler sofort.
* **Automatik:** Das Spiel pausiert, wenn der Tab in den Hintergrund geht, und
  läuft nach Rückkehr automatisch weiter. Spielstand, Statistik und
  Einstellungen liegen im `localStorage` (Schlüsselpräfix `sudoku.v1.`).
* **Sprache/Thema:** In der Kopfzeile umschaltbar; `?lang=de`/`?lang=en`
  erzwingt eine Sprache, `?theme=dark`/`?theme=light` ein Design.

## 7. Assets neu erzeugen

```sh
python3 tools/make-assets.py     # benötigt Pillow + Noto-CJK-Fonts
```

Erzeugt `public/og-image.png` (1200×630) und `public/apple-touch-icon.png`
(180×180). Text und Domain im Skript anpassen.

## 8. Entwicklungshinweise

* Änderungen an der Logik gehören nach `src/core/` und brauchen einen Test in
  `tests/` – die Suite ist die Absicherung gegen Regressionsfehler.
* Beide Sprachdateien pflegen; `tests/i18n.test.ts` schlägt fehl, sobald ein
  Schlüssel nur in einer Sprache existiert.
* Neue UI-Texte in `index.html` erben ihren Inhalt über `data-i18n="…"` aus den
  Wörterbüchern – englischer Text steht als Fallback im HTML.
* `npm run verify` muss vor jedem Commit fehlerfrei durchlaufen.
* Die API-Funktion liegt als TypeScript unter `server/` und wird von
  `npm run build` mit esbuild zu **einer** Datei `api/puzzle.js` gebündelt.
  Vercel transpiliert bei Functions nur Dateien innerhalb von `api/` und
  bündelt nicht – Quellcode außerhalb würde dort zur Laufzeit scheitern
  (`ERR_MODULE_NOT_FOUND`). Deshalb: Funktion immer über `npm run build:api`
  bzw. `npm run build` erzeugen, `api/` ist Build-Artefakt und nicht
  eingecheckt. Lokal (Vite-Middleware) und in den Tests wird weiterhin direkt
  `server/puzzle.ts` verwendet.
* Layout prüfen: `npm run dev`, dann Fenster schmal ziehen (≤ 640 px: Kopfzeile
  bricht um und scrollt weg, Bedienfeld wandert unter das Brett) und
  `?theme=light`/`?theme=dark` sowie `?lang=de`/`?lang=en` durchspielen. Die
  Brettgröße folgt mit `--board-max` der Viewporthöhe, damit Tastenfeld und
  Statuszeile erreichbar bleiben.

## 9. Lizenz

MIT – siehe [LICENSE](LICENSE). Die Rätsel stammen von der
YouDoSudoku-API und unterliegen deren Bedingungen.
