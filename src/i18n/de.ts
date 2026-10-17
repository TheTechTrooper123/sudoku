/**
 * German strings. Typed against the English dictionary, so a missing or
 * misspelled key fails the type check.
 */
import type { TranslationKey } from './en.ts';

export const de: Record<TranslationKey, string> = {
  'meta.title': 'Sudoku – kostenlos online spielen',
  'meta.description':
    'Sudoku kostenlos online spielen: vier Schwierigkeitsgrade, Notizen, Hinweise und Undo. Ohne Anmeldung, auf Handy und Desktop.',

  'brand.name': 'Sudoku',

  'nav.skip': 'Direkt zum Spielfeld',
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

  'status.mistakes': 'Fehler',
  'status.hints': 'Gelöste Felder',

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
  'action.hint': 'Feld lösen',
  'action.keypad': 'Zahlen',
  'action.close': 'Schließen',
  'action.cancel': 'Abbrechen',
  'action.playAgain': 'Nochmal spielen',

  'win.title': 'Gelöst!',
  'win.subtitle': 'Sehr gut – alle Zellen sind korrekt.',
  'win.mistakes': 'Fehler',
  'win.hints': 'Gelöste Felder',
  'win.flawless': 'Perfekt: ohne Fehler und ohne Hilfe gelöst.',
  'win.share': 'Ergebnis teilen',
  'win.copied': 'Ergebnis in die Zwischenablage kopiert.',

  'dialog.newGameTitle': 'Neues Spiel starten?',
  'dialog.newGameMessage': 'Das aktuelle Rätsel geht dabei verloren.',
  'dialog.startNew': 'Neu starten',

  'toast.hintUsed': 'Ein Feld wurde gelöst.',
  'toast.puzzleFromLocal': 'API nicht erreichbar – das Rätsel wurde im Browser erzeugt.',
  'toast.copied': 'In die Zwischenablage kopiert.',

  'settings.title': 'Einstellungen',
  'settings.appearance': 'Darstellung',
  'settings.theme': 'Farbschema',
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
  'settings.animations': 'Animationen',
  'settings.animationsHint': 'Sanfte Übergänge und ein kleines Highlight beim Lösen.',

  'shortcuts.title': 'Steuerung',
  'shortcuts.move': 'Feld auswählen',
  'shortcuts.digit': 'Zahl eintragen',
  'shortcuts.notes': 'Notizen an/aus',
  'shortcuts.undoRedo': 'Rückgängig / Wiederholen',
  'shortcuts.erase': 'Feld leeren',

  'content.intro.title': 'Sudoku',

  'footer.credit': 'Rätsel von YouDoSudoku',
  'footer.privacy': 'Datenschutz',
  'footer.imprint': 'Impressum',
  'footer.note': 'Kein Tracking, keine Cookies, kein Konto.',
};
