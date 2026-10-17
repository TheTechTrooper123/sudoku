/**
 * German strings. Typed against the English dictionary, so a missing or
 * misspelled key fails the type check.
 */
import type { TranslationKey } from './en.ts';

export const de: Record<TranslationKey, string> = {
  'meta.title': 'Sudoku – kostenlos online spielen',
  'meta.description':
    'Sudoku kostenlos online spielen: vier Schwierigkeitsgrade, Notizen, Hinweise, Undo, Timer und Statistiken. Ohne Anmeldung, auf Handy und Desktop.',

  'brand.name': 'Sudoku',
  'brand.tagline': 'Denken, spielen, entspannen',

  'nav.skip': 'Direkt zum Spielfeld',
  'nav.board': 'Spielfeld',
  'nav.howToPlay': 'Spielanleitung',
  'nav.statistics': 'Statistiken',
  'nav.settings': 'Einstellungen',

  'difficulty.label': 'Schwierigkeit',
  'difficulty.easy': 'Leicht',
  'difficulty.medium': 'Mittel',
  'difficulty.hard': 'Schwer',
  'difficulty.expert': 'Experte',

  'board.label': 'Sudoku-Spielfeld',
  'board.cellEmpty': 'Zeile {row}, Spalte {col}, leer',
  'board.cellGiven': 'Zeile {row}, Spalte {col}, Vorgabe {value}',
  'board.cellFilled': 'Zeile {row}, Spalte {col}, {value}',
  'board.cellNotes': 'Zeile {row}, Spalte {col}, Notizen {notes}',
  'board.cellWrong': 'Zeile {row}, Spalte {col}, {value} – falsch',
  'board.cellConflict': 'Zeile {row}, Spalte {col}, {value} – doppelt',
  'board.cellSelected': 'ausgewählt',

  'status.time': 'Zeit',
  'status.mistakes': 'Fehler',
  'status.hints': 'Hinweise',
  'status.progress': 'Fortschritt',
  'status.source.api': 'Rätsel von YouDoSudoku',
  'status.source.cache': 'Rätsel aus dem Zwischenspeicher',
  'status.source.local': 'Rätsel lokal erzeugt',
  'status.paused': 'Pausiert',

  'loading.puzzle': 'Rätsel wird geladen …',
  'loading.generating': 'Rätsel wird erzeugt …',
  'loading.slow': 'Dauert einen Moment – danke für die Geduld.',

  'action.newGame': 'Neues Spiel',
  'action.restart': 'Rätsel neu starten',
  'action.undo': 'Rückgängig',
  'action.redo': 'Wiederholen',
  'action.erase': 'Löschen',
  'action.notes': 'Notizen',
  'action.notesOn': 'Notizen an',
  'action.notesOff': 'Notizen aus',
  'action.hint': 'Hinweis',
  'action.autoNotes': 'Notizen füllen',
  'action.pause': 'Pause',
  'action.resume': 'Weiter',
  'action.check': 'Prüfen',
  'action.close': 'Schließen',
  'action.cancel': 'Abbrechen',
  'action.apply': 'Übernehmen',
  'action.share': 'Ergebnis teilen',
  'action.retry': 'Erneut versuchen',
  'action.resetStats': 'Statistik zurücksetzen',
  'action.clearCache': 'Rätsel-Cache leeren',
  'action.playAgain': 'Nochmal spielen',

  'pause.title': 'Pausiert',
  'pause.message': 'Das Spielfeld ist verdeckt, damit du in Ruhe nachdenken kannst.',
  'pause.resume': 'Weiterspielen',

  'win.title': 'Gelöst!',
  'win.subtitle': 'Sehr gut – alle Zellen sind korrekt.',
  'win.time': 'Zeit',
  'win.mistakes': 'Fehler',
  'win.hints': 'Hinweise',
  'win.flawless': 'Perfekt: ohne Fehler und ohne Hinweise gelöst.',
  'win.newRecord': 'Neue Bestzeit!',
  'win.streak': 'Siegesserie: {count}',
  'win.share': 'Ergebnis teilen',
  'win.copied': 'Ergebnis in die Zwischenablage kopiert.',

  'dialog.newGameTitle': 'Neues Spiel starten?',
  'dialog.newGameMessage': 'Das aktuelle Rätsel geht dabei verloren.',
  'dialog.unfinishedTitle': 'Angefangenes Rätsel',
  'dialog.unfinishedMessage':
    'Du hast noch ein Rätsel in Arbeit. Weitermachen oder neu starten?',
  'dialog.startNew': 'Neu starten',
  'dialog.keepPlaying': 'Weiterspielen',

  'toast.notesFilled': 'Notizen eingetragen.',
  'toast.notesNothing': 'Es gibt nichts mehr einzutragen.',
  'toast.checkClean': 'Bisher keine Fehler. Weiter so!',
  'toast.checkFound': 'Einige Zellen sind falsch – sie sind jetzt markiert.',
  'toast.hintUsed': 'Ein Feld wurde aufgedeckt.',
  'toast.puzzleFromLocal': 'API nicht erreichbar – das Rätsel wurde im Browser erzeugt.',
  'toast.copied': 'In die Zwischenablage kopiert.',
  'toast.statsReset': 'Statistik gelöscht.',
  'toast.cacheCleared': 'Rätsel-Cache geleert.',

  'stats.title': 'Statistik für {difficulty}',
  'stats.played': 'Gespielt',
  'stats.won': 'Gelöst',
  'stats.winRate': 'Erfolgsquote',
  'stats.best': 'Bestzeit',
  'stats.average': 'Durchschnitt',
  'stats.streak': 'Aktuelle Serie',
  'stats.streakBest': 'Beste Serie',
  'stats.flawless': 'Fehlerfreie Siege',
  'stats.empty': 'Für diesen Grad sind noch keine Spiele erfasst.',

  'settings.title': 'Einstellungen',
  'settings.appearance': 'Darstellung',
  'settings.theme': 'Farbschema',
  'settings.themeSystem': 'System',
  'settings.themeLight': 'Hell',
  'settings.themeDark': 'Dunkel',
  'settings.language': 'Sprache',
  'settings.languageAuto': 'Sprache des Browsers',
  'settings.gameplay': 'Spielverhalten',
  'settings.highlightConflicts': 'Doppelte Zahlen markieren',
  'settings.highlightConflictsHint': 'Zahlen hervorheben, die gegen die Sudoku-Regeln verstoßen.',
  'settings.highlightSameNumber': 'Gleiche Zahlen hervorheben',
  'settings.highlightSameNumberHint': 'Alle Felder der gewählten Zahl leicht einfärben.',
  'settings.highlightPeers': 'Zeile, Spalte und Block hervorheben',
  'settings.highlightPeersHint': 'Die Einheiten der ausgewählten Zelle einfärben.',
  'settings.autoRemoveNotes': 'Notizen aufräumen',
  'settings.autoRemoveNotesHint': 'Eine Zahl aus den Notizen in Zeile, Spalte und Block entfernen.',
  'settings.autoCheck': 'Eingaben sofort prüfen',
  'settings.autoCheckHint': 'Falsche Zahlen direkt rot markieren.',
  'settings.showTimer': 'Uhr anzeigen',
  'settings.showTimerHint': 'Uhr ausblenden für entspanntes Spielen (Zeiten werden weiter erfasst).',
  'settings.animations': 'Animationen',
  'settings.animationsHint': 'Sanfte Übergänge und ein kleines Highlight beim Lösen.',
  'settings.data': 'Daten',
  'settings.dataHint':
    'Statistik und Einstellungen liegen nur in deinem Browser. Es wird nichts an einen Server gesendet.',

  'shortcuts.title': 'Tastaturkürzel',
  'shortcuts.move': 'Auswahl bewegen',
  'shortcuts.digit': 'Zahl eintragen',
  'shortcuts.notes': 'Notizmodus umschalten',
  'shortcuts.undoRedo': 'Rückgängig / Wiederholen',
  'shortcuts.erase': 'Feld löschen',
  'shortcuts.hint': 'Feld aufdecken',
  'shortcuts.pause': 'Pause an oder aus',
  'shortcuts.check': 'Spielfeld prüfen',
  'shortcuts.newGame': 'Neues Spiel',

  'content.intro.title': 'Sudoku online – kostenlos, schnell und ohne Anmeldung',
  'content.intro.p1':
    'Ein Logikrätsel auf dem 9×9-Feld: Jede Zeile, jede Spalte und jeder 3×3-Block enthält die Zahlen 1 bis 9 genau einmal. Raten ist nie nötig – Logik reicht.',
  'content.intro.p2':
    'Schwierigkeit wählen, Feld antippen, Ziffer eintragen – der Fortschritt wird automatisch gespeichert.',

  'content.howTo.title': 'So spielst du',
  'content.howTo.p1':
    'Wähle ein leeres Feld und tippe eine Zahl – per Tastatur oder über das Zahlenfeld. Richtige Eingaben bleiben schwarz, falsche werden rot markiert, sobald die Prüfoption aktiv ist.',
  'content.howTo.p2':
    'Im Notizmodus schreibst du kleine Kandidaten in ein Feld – ideal, um den Überblick zu behalten. Umschalten mit der Notizen-Taste oder der N-Taste.',
  'content.howTo.p3':
    'Festgefahren? Der Hinweis-Knopf deckt ein einzelnes Feld auf. Rückgängig und Wiederholen nehmen Züge zurück – wie Bleistift und Radiergummi, nur ohne Spuren.',
  'content.howTo.p4':
    'Wenn jede Zeile, Spalte und jeder Block die Zahlen 1 bis 9 enthält, ist das Rätsel gelöst. Zeit, Fehler und Hinweise landen in deiner persönlichen Statistik.',

  'content.tips.title': 'Sudoku-Strategien für Einsteiger',
  'content.tips.li1':
    'Erst scannen: Suche Zeilen, Spalten und Blöcke mit acht Zahlen – die fehlende ist ein „nackter Einer“.',
  'content.tips.li2':
    'Versteckte Einer suchen: Prüfe in einem Block, welche Zahl nur noch in einem einzigen Feld möglich ist.',
  'content.tips.li3':
    'Block für Block arbeiten und die Hervorhebung nutzen, um zu sehen, welche Zahlen schon vergeben sind.',
  'content.tips.li4':
    'Lieber Kandidaten notieren als raten. Zeilen und Spalten durchzustreichen ist schneller als Ausprobieren.',
  'content.tips.li5':
    'Wenn gar nichts geht: Uhr anhalten, kurz Pause machen und mit frischem Blick weitermachen.',

  'content.faq.title': 'Häufige Fragen',
  'content.faq.q1': 'Ist das Spiel kostenlos?',
  'content.faq.a1':
    'Ja. Alle Schwierigkeitsgrade sind kostenlos, ohne Registrierung und ohne Werbung. Es gibt keine versteckten Limits.',
  'content.faq.q2': 'Kann ich auf dem Handy spielen?',
  'content.faq.a2':
    'Ja, das Spielfeld passt sich jeder Bildschirmgröße an. Du kannst die Seite auch zum Startbildschirm hinzufügen und wie eine App nutzen.',
  'content.faq.q3': 'Woher kommen die Rätsel?',
  'content.faq.a3':
    'Die Rätsel stammen von der YouDoSudoku-API und werden von dieser App nach menschlichen Lösungstechniken bewertet. Ist die API nicht erreichbar, wird das Rätsel direkt im Browser erzeugt.',

  'footer.credit': 'Rätsel von {provider}',
  'footer.privacy': 'Datenschutz',
  'footer.imprint': 'Impressum',
  'footer.note': 'Kein Tracking, keine Cookies, kein Konto.',
};
