import { describe, expect, it } from 'vitest';
import { CELL_COUNT, PEERS } from '../src/core/board.ts';
import { Game } from '../src/core/game.ts';
import { easyPuzzle, nearlySolvedPuzzle } from './helpers.ts';

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

  it('toggles a wrong digit off when the same digit is entered twice', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = game.candidatesAt(index).find((digit) => digit !== game.solution[index]);
    game.select(index);
    game.placeDigit(wrong as number);
    expect(game.cells[index].value).toBe(wrong);
    game.placeDigit(wrong as number);
    expect(game.cells[index].value).toBe(0);
  });

  it('locks a correctly solved cell so it can never change again', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const solution = game.solution[index];
    const other = (solution % 9) + 1;
    game.select(index);
    expect(game.placeDigit(solution)).toBe(true);
    expect(game.isLocked(index)).toBe(true);
    expect(game.isEditable(index)).toBe(false);

    // Neither overwriting, erasing nor annotating is possible any more.
    expect(game.placeDigit(other)).toBe(false);
    expect(game.erase()).toBe(false);
    expect(game.toggleNote(other)).toBe(false);
    expect(game.cells[index].value).toBe(solution);
    expect(game.mistakes).toBe(0);
  });

  it('replaces a wrong entry with the correct one and locks it', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = game.candidatesAt(index).find((digit) => digit !== game.solution[index]);
    game.select(index);
    game.placeDigit(wrong as number);
    expect(game.isEditable(index)).toBe(true);
    expect(game.placeDigit(game.solution[index])).toBe(true);
    expect(game.isLocked(index)).toBe(true);
    expect(game.isWrong(index)).toBe(false);
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
  it('reverts values and notes', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = (game.solution[index] % 9) + 1;
    game.select(index);
    game.placeDigit(wrong);
    expect(game.canUndo()).toBe(true);
    expect(game.undo()).toBe(true);
    expect(game.cells[index].value).toBe(0);
    expect(game.canRedo()).toBe(true);
    expect(game.redo()).toBe(true);
    expect(game.cells[index].value).toBe(wrong);
  });

  it('never refunds a counted mistake - undo is not a free pass', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = (game.solution[index] % 9) + 1;
    game.select(index);
    game.placeDigit(wrong);
    expect(game.mistakes).toBe(1);

    // Undo clears the cell just like "erase", but the mistake stays counted.
    game.undo();
    expect(game.cells[index].value).toBe(0);
    expect(game.mistakes).toBe(1);

    game.redo();
    expect(game.mistakes).toBe(1);

    // A second wrong attempt is a second mistake.
    game.undo();
    game.placeDigit(wrong);
    expect(game.mistakes).toBe(2);
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

  it('selects the edited cell when undoing or redoing', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);

    // Move the selection elsewhere; undoing must jump back to the change.
    game.select(firstEmpty(game));
    expect(game.undo()).toBe(true);
    expect(game.selected).toBe(index);
    expect(game.redo()).toBe(true);
    expect(game.selected).toBe(index);
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

  it('never refunds a used hint', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    expect(game.hint()).toBe(index);
    expect(game.hints).toBe(1);

    game.undo();
    expect(game.cells[index].value).toBe(0);
    expect(game.hints).toBe(1);

    game.redo();
    expect(game.hints).toBe(1);
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

describe('error marking', () => {
  /** First empty cell in the same row that needs a different digit. */
  function emptyPeerInRow(game: Game, index: number): number {
    const digit = game.solution[index];
    const row = Math.floor(index / 9);
    for (let col = 0; col < 9; col++) {
      const candidate = row * 9 + col;
      if (candidate === index) continue;
      if (game.cells[candidate].value !== 0) continue;
      if (game.solution[candidate] === digit) continue;
      return candidate;
    }
    return -1;
  }

  /** A correct cell that shares its row with a spot where its digit is wrong. */
  function pairInRow(game: Game): { target: number; intruder: number } {
    for (let target = 0; target < CELL_COUNT; target++) {
      if (game.cells[target].value !== 0) continue;
      const intruder = emptyPeerInRow(game, target);
      if (intruder >= 0) return { target, intruder };
    }
    throw new Error('no pair found');
  }

  it('marks a wrong digit as wrong', () => {
    const game = newGame();
    const index = firstEmpty(game);
    const wrong = game.candidatesAt(index).find((digit) => digit !== game.solution[index]) as number;
    game.select(index);
    game.placeDigit(wrong);
    expect(game.isWrong(index)).toBe(true);
  });

  it('does not mark a lone correct digit as a duplicate', () => {
    const game = newGame();
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);
    expect(game.isWrong(index)).toBe(false);
    expect(game.isConflict(index)).toBe(false);
  });

  it('marks the correct half of a duplicate as the reason, never as wrong', () => {
    const game = newGame();
    const { target, intruder } = pairInRow(game);
    const digit = game.solution[target];

    // A wrong entry with the same digit elsewhere in the row ...
    game.select(intruder);
    game.placeDigit(digit);
    expect(game.isWrong(intruder)).toBe(true);

    // ... is the *only* thing marked: the correct cell stays clean. This is the
    // design guarantee - a right digit must never look wrong.
    game.select(target);
    game.placeDigit(digit);
    expect(game.isLocked(target)).toBe(true);
    expect(game.isConflict(target)).toBe(true); // the rules still see the pair ...
    expect(game.isWrong(target)).toBe(false); // ... but a correct cell is never flagged
  });

  it('never flags a given clue as wrong when a wrong entry duplicates it', () => {
    const game = newGame();
    let given = -1;
    let intruder = -1;
    for (let index = 0; index < CELL_COUNT; index++) {
      if (game.puzzle[index] === 0) continue;
      const candidate = emptyPeerInRow(game, index);
      if (candidate >= 0) {
        given = index;
        intruder = candidate;
        break;
      }
    }
    expect(given).toBeGreaterThanOrEqual(0);

    game.select(intruder);
    game.placeDigit(game.cells[given].value);
    expect(game.isWrong(given)).toBe(false); // the blocking clue stays clean
    expect(game.isWrong(intruder)).toBe(true); // only the wrong entry is marked
  });
});

describe('progress', () => {
  it('reports empty cells in remaining[0] and filled cells as progress', () => {
    const game = newGame();
    const empty = game.remaining()[0];
    expect(empty).toBe(game.puzzle.filter((value) => value === 0).length);
    expect(game.progress()).toBeCloseTo((81 - empty) / 81);

    // Filling the first empty cell raises the progress.
    const before = game.progress();
    const index = firstEmpty(game);
    game.select(index);
    game.placeDigit(game.solution[index]);
    expect(game.remaining()[0]).toBe(empty - 1);
    expect(game.progress()).toBeGreaterThan(before);
  });
});
