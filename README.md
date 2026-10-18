# Sudoku

**Live:** <https://sudoku-game.ddnsfree.com> · **Repository:**
<https://github.com/TheTechTrooper123/sudoku> · **Vercel-Projekt:** `sudoku`

Ein schlankes, werbefreies Sudoku für das Web: vier Schwierigkeitsstufen,
Notizen, Felder lösen, Undo/Redo, Hell/Dunkel-Design und zweisprachige
Oberfläche (Deutsch/Englisch). Ohne Konten, ohne Tracking – und ohne Speicherung:
ein Reload startet immer ein frisches Spiel.

* **Stack:** Vite + TypeScript (Vanilla, kein Framework) – ca. 23 kB gzip JS/CSS
* **Rätsel:** [YouDoSudoku-API](https://www.youdosudoku.com) über eine eigene
  Serverless-Funktion; fällt bei Ausfall auf einen Generator im Browser zurück
* **Hosting:** Vercel (statisches Frontend + eine Serverless Function),
  erreichbar unter der Dynu-Subdomain `sudoku-game.ddnsfree.com`
* **Tests:** 79 Unit-Tests (Vitest) – Solver, Generator, Bewertung, Spielregeln,
  i18n, API-Validierung, Fallback-Kette

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
| `ALLOWED_ORIGINS` | nein | Kommagetrennte Liste erlaubter Origins (z. B. `https://sudoku-game.ddnsfree.com`). Gesetzt → Der Endpunkt sendet CORS-Header nur für diese Origins. Leer → kein CORS (empfohlen, da Frontend und API auf derselben Domain liegen). |
| `SITE_URL` | nein | Öffentliche Domain, für Dokumentation/Kanonisierung. |

Der Key liegt bewusst im Repository (siehe Abschnitt 5) und wird **nie** an den
Browser ausgeliefert: Er wird ausschließlich serverseitig in der
Serverless-Funktion verwendet.

## 3. Deployment auf Vercel

Das Projekt ist bereits deployt (`sudoku` im Vercel-Team `till9`,
<https://sudoku-game.ddnsfree.com>) und das lokale Arbeitsverzeichnis ist mit
`vercel link` daran gebunden. Ein neuer Stand geht so live:

```sh
npm run verify      # muss grün sein
vercel --prod       # Produktions-Deployment
```

Für ein neues Projekt/Umgebung von Grund auf:

1. Repository zu GitHub pushen (oder Ordner direkt mit `vercel` deployen).
2. In Vercel „New Project" → Repository importieren. Framework wird über
   `vercel.json` erkannt (`framework: vite`, Build `npm run build`, Output `dist`).
3. Unter **Settings → Environment Variables** `YOUDOSUDOKU_API_KEY` setzen
   (Production + Preview). Optional `ALLOWED_ORIGINS`.
4. Deployen. `npm run build` bündelt die Function zu `api/puzzle.js`; Vercel
   liefert sie automatisch unter `/api/puzzle` aus, alles andere ist statisch.

Automatisches Deployment bei jedem Push ist **nicht** eingerichtet: `vercel git
connect` scheitert derzeit mit „You need admin or write access", weil dem
Vercel-Konto der GitHub-Namespace `TheTechTrooper123` nicht freigegeben ist.
Dafür im Vercel-Dashboard unter *Account Settings → Git* die GitHub-App für
diesen Account installieren/autorisieren; danach `vercel git connect` erneut
ausführen.

### Domain und Rechtstexte

Domain und Rechtstexte sind für den Livebetrieb bereits eingetragen:

| Datei | Inhalt |
|---|---|
| `index.html` | `https://sudoku-game.ddnsfree.com/` in `canonical`, `hreflang`, `og:url`, `og:image` und im JSON-LD-Block |
| `public/robots.txt` | Domain in der `Sitemap:`-Zeile |
| `public/sitemap.xml` | Domain in allen `<loc>`/`href`-Angaben |
| `public/og-image.png` | Aufdruck „sudoku-game.ddnsfree.com" (Neu-Erzeugung: `python3 tools/make-assets.py`, siehe unten) |
| `public/privacy.html` | Verantwortlicher (privater Betreiber, ohne Namensnennung), Hoster (Vercel Inc.) |
| `public/imprint.html` | Anbieter (privater Betreiber, neutrale Angabe); benennt bewusst keine Person, Anschrift oder E-Mail |

Bei einem Domain- oder Betreiberwechsel müssen genau diese Stellen angepasst
werden – `index.html`, `public/robots.txt`, `public/sitemap.xml`, der Aufdruck
im OG-Bild (danach `python3 tools/make-assets.py`) sowie `public/privacy.html`
und `public/imprint.html`. Beide Rechtstexte sind reine statische Seiten ohne
Build-Schritt.

## 4. Architektur

```
index.html            Statisches Grundgerüst + SEO-Basis (Titel, Meta,
                      H1, JSON-LD); Texte werden zur Laufzeit per data-i18n
                      ausgetauscht
src/
  main.ts             Einstiegspunkt, verdrahtet DOM-IDs mit dem Controller
  core/               Reine Logik ohne DOM: board, solver, generator,
                      difficulty, game, rng
  services/           apiClient (→ /api/puzzle), localGenerator (Worker),
                      puzzleService (Kette: API → lokal)
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

1. **API** – `POST /api/puzzle` mit `{ difficulty, count }`; die Funktion holt
   bei youdosudoku.com, prüft die Antwort strukturell (81 Zeichen, `0` = leer,
   Lösung vollständig, Rätsel ⊆ Lösung) und liefert normalisierte Daten zurück.
2. **Lokaler Generator** – ist die API nicht erreichbar oder liefert sie
   fehlerhafte Daten, erzeugt ein Web-Worker im Browser ein Rätsel. Der Nutzer
   sieht statt einer Fehlermeldung nur einen kurzen Hinweis.

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

* **Spielen:** Zelle wählen (Maus/Touch), Ziffer per Tastatur `1`–`9` oder über
  das Tastenfeld eintragen. Pfeiltasten/WASD bewegen die Auswahl. Falsche Zahlen
  werden sofort rot markiert; richtig gelöste Felder werden gesperrt und wie die
  Vorgaben fest geschrieben (kein Überschreiben/Löschen mehr möglich).
* **Zwei Markierungen, klar getrennt:** Rot = die Zahl passt nicht zur Lösung
  (die zu löschende Zahl). Bernstein = eine *richtige* Zahl, die sich mit einer
  anderen Zahl in Zeile/Spalte/Block doppelt – fast immer die Folge eines falschen
  Eintrags. So wird eine korrekte Zelle nie fälschlich rot, und man sieht sofort,
  welche Zahl weg muss. Vorgaben werden nie als doppelt markiert.
* **Tastenfeld:** Auf dem Handy ist der Zahlenblock automatisch sichtbar und
  enthält in der zweiten Reihe eine Löschen-Taste (`⨯`) für den schnellen Weg zur
  richtigen Zahl; am Computer ist er standardmäßig ausgeblendet (Löschen per
  `Rücktaste` oder „Löschen"-Schaltfläche) und lässt sich über „Zahlen
  einblenden" ein- und ausklappen.
* **Tastenkürzel:** `N` Notizmodus, `Entf`/`0`/Rücktaste löschen,
  `Strg+Z`/`Strg+Y` rückgängig/wiederholen. „Feld lösen" deckt ein einzelnes
  Feld auf.
* **Hilfen:** Konflikthervorhebung, gleiche Ziffern, Peers – alle einzeln
  abschaltbar.
* **Status:** Unter dem Brett steht eine dezente Zeile mit Fehlern und gelösten
  Feldern; die Schwierigkeitsauswahl ist bewusst zurückhaltend gestaltet.
* **Keine Speicherung:** Es wird nichts in `localStorage` oder an einen Server
  geschrieben. Ein Reload startet ein frisches Spiel und setzt alle
  Einstellungen auf die Standardwerte zurück.
* **Sprache/Thema:** Die Sprache startet in der Gerätesprache und lässt sich nur
  in den Einstellungen zwischen Deutsch und Englisch umschalten; das Thema folgt
  anfangs dem System und lässt sich in den Einstellungen nur zwischen Hell und
  Dunkel wählen. Beides gilt für die laufende Sitzung. Die statischen Rechtsseiten
  verstehen `?lang=de`/`?lang=en`.
* **Kopfleiste:** Statt einer klassischen Leiste gibt es auf allen Bildschirmgrößen
  nur ein einzelnes, zurückhaltendes Einstellungen-Symbol oben rechts – auf einer
  Höhe mit der Überschrift „Sudoku“. Thema und Sprache liegen in den Einstellungen.

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
* Layout prüfen: `npm run dev`, dann Fenster schmal ziehen (≤ 640 px:
  Bedienfeld wandert unter das Brett) und Hell/Dunkel sowie Deutsch/Englisch
  (beides nur in den Einstellungen) durchspielen.
  Das Brett füllt den verfügbaren Platz und wird über `--board-max` an Breite und
  Viewporthöhe gekoppelt.

## 9. Lizenz

MIT – siehe [LICENSE](LICENSE). Die Rätsel stammen von der
YouDoSudoku-API und unterliegen deren Bedingungen.
