/**
 * English strings. This file is the source of truth for translation keys -
 * every other language file is typed against it, so a missing key is a
 * compile error.
 */
export const en = {
  'meta.title': 'Sudoku - Play Online for Free',
  'meta.description':
    'Play Sudoku online for free: four difficulty levels, pencil marks, hints, undo and statistics. No sign-up required, works on mobile and desktop.',

  'brand.name': 'Sudoku',
  'brand.tagline': 'Play, think, relax',

  'nav.skip': 'Skip to the board',
  'nav.statistics': 'Statistics',
  'nav.settings': 'Settings',

  'difficulty.label': 'Difficulty',
  'difficulty.easy': 'Easy',
  'difficulty.medium': 'Medium',
  'difficulty.hard': 'Hard',
  'difficulty.expert': 'Expert',

  'board.label': 'Sudoku board',
  'board.cellEmpty': 'row {row}, column {col}, empty',
  'board.cellGiven': 'row {row}, column {col}, given {value}',
  'board.cellFilled': 'row {row}, column {col}, {value}',
  'board.cellNotes': 'row {row}, column {col}, notes {notes}',
  'board.cellWrong': 'row {row}, column {col}, {value} - wrong',
  'board.cellConflict': 'row {row}, column {col}, {value} - duplicate',
  'board.cellSelected': 'selected',

  'status.mistakes': 'Mistakes',
  'status.hints': 'Hints',
  'status.source.api': 'Puzzle from YouDoSudoku',
  'status.source.cache': 'Puzzle from cache',
  'status.source.local': 'Puzzle generated locally',

  'loading.puzzle': 'Loading puzzle…',
  'loading.generating': 'Generating puzzle…',
  'loading.slow': 'Still working on it - thanks for your patience.',

  'action.newGame': 'New game',
  'action.restart': 'Restart this puzzle',
  'action.undo': 'Undo',
  'action.redo': 'Redo',
  'action.erase': 'Erase',
  'action.notes': 'Notes',
  'action.notesOn': 'Notes on',
  'action.notesOff': 'Notes off',
  'action.hint': 'Hint',
  'action.autoNotes': 'Fill notes',
  'action.close': 'Close',
  'action.cancel': 'Cancel',
  'action.resetStats': 'Reset statistics',
  'action.clearCache': 'Clear puzzle cache',
  'action.playAgain': 'Play again',

  'win.title': 'Solved!',
  'win.subtitle': 'Nicely done - every cell is correct.',
  'win.mistakes': 'Mistakes',
  'win.hints': 'Hints',
  'win.flawless': 'Perfect: no mistakes and no hints used.',
  'win.newRecord': 'New personal best!',
  'win.streak': 'Winning streak: {count}',
  'win.share': 'Share result',
  'win.copied': 'Result copied to the clipboard.',

  'dialog.newGameTitle': 'Start a new game?',
  'dialog.newGameMessage': 'The current puzzle will be lost.',
  'dialog.startNew': 'Start new',

  'toast.notesFilled': 'Pencil marks filled in.',
  'toast.notesNothing': 'There is nothing left to fill in.',
  'toast.hintUsed': 'A cell was revealed for you.',
  'toast.puzzleFromLocal': 'API unavailable - this puzzle was generated in your browser.',
  'toast.copied': 'Copied to the clipboard.',
  'toast.statsReset': 'Statistics cleared.',
  'toast.cacheCleared': 'Puzzle cache cleared.',

  'stats.title': 'Statistics for {difficulty}',
  'stats.played': 'Played',
  'stats.won': 'Solved',
  'stats.winRate': 'Win rate',
  'stats.streak': 'Current streak',
  'stats.streakBest': 'Best streak',
  'stats.empty': 'No games recorded yet for this level.',

  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Colour scheme',
  'settings.themeSystem': 'System',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.language': 'Language',
  'settings.languageAuto': 'Browser language',
  'settings.gameplay': 'Gameplay',
  'settings.highlightConflicts': 'Highlight duplicates',
  'settings.highlightConflictsHint': 'Mark digits that break the rules of Sudoku.',
  'settings.highlightSameNumber': 'Highlight equal digits',
  'settings.highlightSameNumberHint': 'Shade every cell that holds the selected digit.',
  'settings.highlightPeers': 'Highlight row, column and box',
  'settings.highlightPeersHint': 'Shade the units of the selected cell.',
  'settings.autoRemoveNotes': 'Clean up pencil marks',
  'settings.autoRemoveNotesHint': 'Remove a digit from the notes of its row, column and box.',
  'settings.animations': 'Animations',
  'settings.animationsHint': 'Subtle transitions and a small celebration when you win.',
  'settings.data': 'Data',
  'settings.dataHint':
    'Statistics and settings are stored in your browser only. Nothing is sent to a server.',

  'shortcuts.title': 'Keyboard shortcuts',
  'shortcuts.move': 'Move the selection',
  'shortcuts.digit': 'Enter a digit',
  'shortcuts.notes': 'Toggle notes mode',
  'shortcuts.undoRedo': 'Undo / redo',
  'shortcuts.erase': 'Erase a cell',
  'shortcuts.hint': 'Reveal a cell',
  'shortcuts.newGame': 'New game',

  'content.intro.title': 'Sudoku online - free, fast and without sign-up',

  'footer.credit': 'Puzzles by YouDoSudoku',
  'footer.privacy': 'Privacy',
  'footer.imprint': 'Legal notice',
  'footer.note': 'No tracking, no cookies, no account.',
} as const;

export type TranslationKey = keyof typeof en;
