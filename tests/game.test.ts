import { describe, expect, it } from 'vitest';
import { CELL_COUNT, PEERS } from '../src/core/board.ts';
import { Game } from '../src/core/game.ts';
import { easyPuzzle, gridOf, nearlySolvedPuzzle, EASY_SOLUTION_STRING } from './helpers.ts';

function newGame(): Game {
  return new Game(easyPuzzle());
}

/** Index of the first empty cell of the fixture. */
function firstEmpty(game: Game): number {
  for (let index = 0; index < CELL_COUNT; index++) {
    if (game.cells[index].value === 0) return index;
  }
  throw new Error('no empty cell');
}

describe('Game basics', () => {
  it('starts from the puzzle with the first editable cell selected', () => {
    const game = newGame();
    expect(game.status).toBe('playing');
    expect(game.puzzle.some((value) => value === 0)).toBe(true);
    expect(game.isEditable(game.selected)).toBe(true);
    expect(game.progress()).toBeGreaterThan(0);
    expect(game.progress()).toBeLessThan(1);
  });

  it('accepts correct digits without counting a mistake', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    expect(game.placeDigit(game.solution[index])).toBe(true);
    expect(game.cells[index].value).toBe(game.solution[index]);
    expect(game.mistakes).toBe(0);
    expect(game.isWrong(index)).toBe(false);
  });

  it('counts wrong digits as mistakes', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = game.candidatesAt(index).find((digit) => digit !== game.solution[index]);
    expect(wrong).toBeDefined();
    game.select(index);
    game.placeDigit(wrong as number);
    expect(game.mistakes).toBe(1);
    expect(game.isWrong(index)).toBe(true);
    expect(game.isConflict(index)).toBe(false);
  });

  it('toggles a digit off when the same digit is entered twice', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);
    game.placeDigit(game.solution[index]);
    expect(game.cells[index].value).toBe(0);
  });

  it('never edits given cells', () => {
    const game = newGame();
    const given = game.puzzle.findIndex((value) => value !== 0);
    game.select(given);
    expect(game.placeDigit(5)).toBe(false);
    expect(game.erase()).toBe(false);
    expect(game.toggleNote(5)).toBe(false);
  });

  it('moves the selection with wrapping', () => {
    const game = newGame();
    game.select(0);
    expect(game.moveSelection(-1, 0)).toBe(true);
    expect(game.selected).toBe(72);
    expect(game.moveSelection(0, -1)).toBe(true);
    expect(game.selected).toBe(80);
  });
});

describe('notes', () => {
  it('toggles pencil marks in notes mode', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.toggleNotesMode();
    expect(game.notesMode).toBe(true);
    game.input(3);
    game.input(7);
    expect(game.cells[index].notes).toBe((1 << 3) | (1 << 7));
    game.input(7);
    expect(game.cells[index].notes).toBe(1 << 3);
  });

  it('cleans up notes of peers when a digit is placed', () => {
    const game = newGame();
    game.select(firstEmpty(game));
    game.fillAutoNotes();
    const index = firstEmpty(game);
    const digit = game.solution[index];
    game.select(index);
    game.placeDigit(digit);
    for (const peer of PEERS[index]) {
      expect(game.cells[peer].notes & (1 << digit), `peer ${peer}`).toBe(0);
    }
  });

  it('keeps notes when auto cleanup is disabled', () => {
    const game = newGame();
    game.autoRemoveNotes = false;
    game.select(firstEmpty(game));
    game.fillAutoNotes();
    const index = firstEmpty(game);
    const digit = game.solution[index];
    game.select(index);
    game.placeDigit(digit);
    const withNote = game.cells.filter(
      (cell) => cell.value === 0 && (cell.notes & (1 << digit)) !== 0,
    );
    expect(withNote.length).toBeGreaterThan(0);
  });
});

describe('undo and redo', () => {
  it('reverts values, notes and counters', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = (game.solution[index] % 9) + 1;
    game.select(index);
    game.placeDigit(wrong);
    expect(game.canUndo()).toBe(true);
    expect(game.mistakes).toBe(1);
    expect(game.undo()).toBe(true);
    expect(game.cells[index].value).toBe(0);
    expect(game.mistakes).toBe(0);
    expect(game.canRedo()).toBe(true);
    expect(game.redo()).toBe(true);
    expect(game.cells[index].value).toBe(wrong);
    expect(game.mistakes).toBe(1);
  });

  it('undoes compound edits (value + note cleanup) in one step', () => {
    const game = newGame();
    game.select(firstEmpty(game));
    game.fillAutoNotes();
    const before = game.cells.map((cell) => cell.notes);
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);
    game.undo();
    expect(game.cells.map((cell) => cell.notes)).toEqual(before);
    expect(game.cells[index].value).toBe(0);
  });

  it('drops the redo stack after a new move', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);
    game.undo();
    game.select(firstEmpty(game));
    game.placeDigit(1);
    expect(game.canRedo()).toBe(false);
  });

  it('erases values and notes', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.toggleNote(4);
    game.erase();
    expect(game.cells[index].notes).toBe(0);
    expect(game.cells[index].value).toBe(0);
  });
});

describe('hints', () => {
  it('reveals the selected empty cell', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    const revealed = game.hint();
    expect(revealed).toBe(index);
    expect(game.cells[index].value).toBe(game.solution[index]);
    expect(game.hints).toBe(1);
    expect(game.lastRevealed).toBe(index);
    expect(game.mistakes).toBe(0);
  });

  it('prefers a wrong entry when nothing is selected', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = (game.solution[index] % 9) + 1;
    game.select(index);
    game.placeDigit(wrong);
    game.selected = -1;
    expect(game.hint()).toBe(index);
    expect(game.cells[index].value).toBe(game.solution[index]);
  });
});

describe('win detection', () => {
  it('detects a solved board', () => {
    const game = new Game(nearlySolvedPuzzle([40]));
    game.select(40);
    game.placeDigit(game.solution[40]);
    expect(game.status).toBe('won');
  });

  it('goes back to playing when the winning move is undone', () => {
    const game = new Game(nearlySolvedPuzzle([40]));
    game.select(40);
    game.placeDigit(game.solution[40]);
    expect(game.undo()).toBe(true);
    expect(game.status).toBe('playing');
  });

  it('notices when the last cell is filled via a hint', () => {
    const game = new Game(nearlySolvedPuzzle([0, 40]));
    game.select(40);
    game.placeDigit(game.solution[40]);
    game.hint();
    expect(game.status).toBe('won');
  });
});

describe('serialisation', () => {
  it('round-trips the full state', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.toggleNotesMode();
    game.toggleNote(2);
    game.toggleNotesMode();
    game.placeDigit(game.solution[index]);
    game.hint();

    const restored = Game.restore(JSON.parse(JSON.stringify(game.serialize())));
    expect(restored).not.toBeNull();
    const other = restored as Game;
    expect(other.cells.map((cell) => cell.value)).toEqual(game.cells.map((cell) => cell.value));
    expect(other.cells.map((cell) => cell.notes)).toEqual(game.cells.map((cell) => cell.notes));
    expect(other.mistakes).toBe(game.mistakes);
    expect(other.hints).toBe(game.hints);
    expect(other.selected).toBe(game.selected);
    expect(other.status).toBe(game.status);
    expect(other.canUndo()).toBe(true);
  });

  it('returns null for damaged data', () => {
    expect(Game.restore(null)).toBeNull();
    expect(Game.restore({ puzzle: [1, 2, 3] })).toBeNull();
    expect(Game.restore('nonsense')).toBeNull();
  });

  it('restores a solved game as won', () => {
    const solution = gridOf(EASY_SOLUTION_STRING);
    const game = new Game({ difficulty: 'easy', puzzle: solution.slice(), solution, source: 'local' });
    expect(game.status).toBe('playing');
    const restored = Game.restore(game.serialize()) as Game;
    expect(restored.solution).toEqual(solution);
  });
});
