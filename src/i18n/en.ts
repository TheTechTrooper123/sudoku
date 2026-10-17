/**
 * English strings. This file is the source of truth for translation keys -
 * every other language file is typed against it, so a missing key is a
 * compile error.
 */
export const en = {
  'meta.title': 'Sudoku - Play Online for Free',
  'meta.description':
    'Play Sudoku online for free: four difficulty levels, pencil marks, hints, undo, timer and statistics. No sign-up required, works on mobile and desktop.',

  'brand.name': 'Sudoku',
  'brand.tagline': 'Play, think, relax',

  'nav.skip': 'Skip to the board',
  'nav.board': 'Board',
  'nav.howToPlay': 'How to play',
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

  'status.time': 'Time',
  'status.mistakes': 'Mistakes',
  'status.hints': 'Hints',
  'status.progress': 'Progress',
  'status.source.api': 'Puzzle from YouDoSudoku',
  'status.source.cache': 'Puzzle from cache',
  'status.source.local': 'Puzzle generated locally',
  'status.paused': 'Paused',

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
  'action.pause': 'Pause',
  'action.resume': 'Resume',
  'action.check': 'Check',
  'action.close': 'Close',
  'action.cancel': 'Cancel',
  'action.apply': 'Apply',
  'action.share': 'Share result',
  'action.retry': 'Try again',
  'action.resetStats': 'Reset statistics',
  'action.clearCache': 'Clear puzzle cache',
  'action.playAgain': 'Play again',

  'pause.title': 'Paused',
  'pause.message': 'The board is hidden so you can think it over without spoilers.',
  'pause.resume': 'Continue playing',

  'win.title': 'Solved!',
  'win.subtitle': 'Nicely done - every cell is correct.',
  'win.time': 'Time',
  'win.mistakes': 'Mistakes',
  'win.hints': 'Hints',
  'win.flawless': 'Perfect: no mistakes and no hints used.',
  'win.newRecord': 'New personal best!',
  'win.streak': 'Winning streak: {count}',
  'win.share': 'Share result',
  'win.copied': 'Result copied to the clipboard.',

  'dialog.newGameTitle': 'Start a new game?',
  'dialog.newGameMessage': 'The current puzzle will be lost.',
  'dialog.unfinishedTitle': 'Unfinished puzzle',
  'dialog.unfinishedMessage':
    'You already have a game in progress. Continue where you left off, or start fresh?',
  'dialog.startNew': 'Start new',
  'dialog.keepPlaying': 'Continue game',

  'toast.notesFilled': 'Pencil marks filled in.',
  'toast.notesNothing': 'There is nothing left to fill in.',
  'toast.checkClean': 'No mistakes so far. Keep going!',
  'toast.checkFound': 'Some cells are wrong - they are highlighted now.',
  'toast.hintUsed': 'A cell was revealed for you.',
  'toast.puzzleFromLocal': 'API unavailable - this puzzle was generated in your browser.',
  'toast.copied': 'Copied to the clipboard.',
  'toast.statsReset': 'Statistics cleared.',
  'toast.cacheCleared': 'Puzzle cache cleared.',

  'stats.title': 'Statistics for {difficulty}',
  'stats.played': 'Played',
  'stats.won': 'Solved',
  'stats.winRate': 'Win rate',
  'stats.best': 'Best time',
  'stats.average': 'Average',
  'stats.streak': 'Current streak',
  'stats.streakBest': 'Best streak',
  'stats.flawless': 'Perfect solves',
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
  'settings.autoCheck': 'Check entries immediately',
  'settings.autoCheckHint': 'Show wrong digits in red as soon as you enter them.',
  'settings.showTimer': 'Show the timer',
  'settings.showTimerHint': 'Hide the clock for a relaxed game (times are still recorded).',
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
  'shortcuts.pause': 'Pause or resume',
  'shortcuts.check': 'Check the board',
  'shortcuts.newGame': 'New game',

  'content.intro.title': 'Sudoku online - free, fast and without sign-up',
  'content.intro.p1':
    'A logic puzzle on a 9x9 grid: every row, every column and every 3x3 box contains the digits 1 to 9 exactly once. You never need to guess - logic is enough.',
  'content.intro.p2':
    'Pick a difficulty, tap a cell, enter a digit - your progress is saved automatically.',

  'content.howTo.title': 'How to play',
  'content.howTo.p1':
    'Select an empty cell and type a digit (or tap it on the number pad). Correct entries stay black, wrong ones are marked in red as soon as you enable the check option.',
  'content.howTo.p2':
    'Use notes mode to write small candidates into a cell - ideal to keep track of what is still possible. Press the notes button or the N key to switch modes.',
  'content.howTo.p3':
    'Stuck? The hint button reveals a single cell. Undo and redo let you take moves back, exactly like a pencil and eraser - but without leaving marks.',
  'content.howTo.p4':
    'When every row, column and box contains the digits 1 to 9, the puzzle is solved. Your time, mistakes and hints end up in your personal statistics.',

  'content.tips.title': 'Sudoku strategies for beginners',
  'content.tips.li1':
    'Scan first: look for rows, columns and boxes that already contain eight digits - the missing one is a naked single.',
  'content.tips.li2':
    'Look for hidden singles: inside a box, check which digit has only one possible cell left.',
  'content.tips.li3':
    'Work box by box and use the highlight feature to see which digits are already used in a row, column or box.',
  'content.tips.li4':
    'Note candidates instead of guessing. Cross-hatching rows and columns is faster than trial and error.',
  'content.tips.li5':
    'If you are truly stuck, stop the clock, take a break and come back with fresh eyes.',

  'content.faq.title': 'Frequently asked questions',
  'content.faq.q1': 'Is the game free?',
  'content.faq.a1':
    'Yes. All difficulty levels are free, without registration and without advertising. There are no hidden limits.',
  'content.faq.q2': 'Can I play on my phone?',
  'content.faq.a2':
    'Yes, the board adapts to any screen size. You can also add the page to your home screen and use it like an app.',
  'content.faq.q3': 'Where do the puzzles come from?',
  'content.faq.a3':
    'Puzzles are provided by the YouDoSudoku API and rated by this app using human solving techniques. If the API is unavailable, a puzzle is generated directly in your browser.',

  'footer.credit': 'Puzzles by {provider}',
  'footer.privacy': 'Privacy',
  'footer.imprint': 'Legal notice',
  'footer.note': 'No tracking, no cookies, no account.',
} as const;

export type TranslationKey = keyof typeof en;
