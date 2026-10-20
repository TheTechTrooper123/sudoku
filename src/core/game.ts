/**
 * Game state machine.
 *
 * Holds the playable board, the move history (undo/redo), the mistake and
 * hint counters and knows when the puzzle is solved. It is completely
 * independent from the DOM - the UI subscribes to changes and re-renders.
 */
import {
  CELL_COUNT,
  PEERS,
  candidatesMask,
  conflictsOf,
  digitBit,
  maskDigits,
  valueCounts,
} from './board.ts';
import type { Cell, Difficulty, Grid, Puzzle, PuzzleSource } from './types.ts';

export type GameStatus = 'playing' | 'won';

export interface CellSnapshot {
  value: number;
  notes: number;
}

export interface CellChange {
  index: number;
  before: CellSnapshot;
  after: CellSnapshot;
}

export interface Move {
  /** `true` when the placed digit does not match the solution. */
  mistake: boolean;
  changes: CellChange[];
}

/** Collects before/after snapshots so a group of edits can be undone at once. */
class ChangeSet {
  private readonly before = new Map<number, CellSnapshot>();

  constructor(private readonly cells: Cell[]) {}

  private snapshot(index: number): CellSnapshot {
    const cell = this.cells[index];
    return { value: cell.value, notes: cell.notes };
  }

  setValue(index: number, value: number): void {
    if (!this.before.has(index)) this.before.set(index, this.snapshot(index));
    this.cells[index].value = value;
  }

  setNotes(index: number, notes: number): void {
    if (!this.before.has(index)) this.before.set(index, this.snapshot(index));
    this.cells[index].notes = notes;
  }

  toChanges(): CellChange[] {
    const changes: CellChange[] = [];
    for (const [index, before] of this.before) {
      const after = this.snapshot(index);
      if (before.value === after.value && before.notes === after.notes) continue;
      changes.push({ index, before, after });
    }
    return changes;
  }
}

export class Game {
  readonly puzzle: Grid;
  readonly solution: Grid;
  readonly difficulty: Difficulty;
  readonly source: PuzzleSource;

  cells: Cell[];
  history: Move[] = [];
  future: Move[] = [];
  selected = -1;
  notesMode = false;
  /** When `true`, placing a digit also clears it from the notes of its peers. */
  autoRemoveNotes = true;
  mistakes = 0;
  hints = 0;
  status: GameStatus = 'playing';
  /** Index of the cell that was revealed by the last hint. */
  lastRevealed: number | null = null;

  private conflictsCache: Uint8Array | null = null;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle.puzzle.slice();
    this.solution = puzzle.solution.slice();
    this.difficulty = puzzle.difficulty;
    this.source = puzzle.source;
    this.cells = Array.from({ length: CELL_COUNT }, (_, index) => ({
      value: puzzle.puzzle[index],
      given: puzzle.puzzle[index] !== 0,
      notes: 0,
    }));
    this.selected = this.firstEditableCell();
  }

  // ---------------------------------------------------------------- reading

  /** Current board values (`0` for empty cells). */
  values(): Grid {
    const grid = new Array<number>(CELL_COUNT);
    for (let index = 0; index < CELL_COUNT; index++) grid[index] = this.cells[index].value;
    return grid;
  }

  cell(index: number): Cell {
    return this.cells[index];
  }

  /**
   * A cell is locked once it holds the correct digit - either a given or a
   * digit the player solved correctly. Locked cells can no longer be changed,
   * erased or annotated, so a solved digit can never be turned wrong again.
   */
  isLocked(index: number): boolean {
    const cell = this.cells[index];
    return cell.value !== 0 && cell.value === this.solution[index];
  }

  /** A cell can be edited while it is empty or holds a wrong entry. */
  isEditable(index: number): boolean {
    return index >= 0 && index < CELL_COUNT && !this.isLocked(index);
  }

  /**
   * Cells that break the rules of Sudoku (duplicates in a unit). Used to decide
   * whether the puzzle is finished and to point out the *reason* a wrong digit
   * is wrong - the duplicate is marked in a neutral tone, never as an error.
   */
  conflicts(): Uint8Array {
    if (this.conflictsCache === null) this.conflictsCache = conflictsOf(this.values());
    return this.conflictsCache;
  }

  isConflict(index: number): boolean {
    return this.conflicts()[index] === 1;
  }

  /** `true` when a filled cell does not match the solution. */
  isWrong(index: number): boolean {
    const cell = this.cells[index];
    return cell.value !== 0 && cell.value !== this.solution[index];
  }

  /** Candidate digits of an empty cell, based on the current board. */
  candidatesAt(index: number): number[] {
    if (this.cells[index].value !== 0) return [];
    return maskDigits(candidatesMask(this.values(), index));
  }

  /** How many of each digit are still missing (index 0 carries empty cells). */
  remaining(): number[] {
    const counts = valueCounts(this.values());
    const result = new Array<number>(10).fill(0);
    for (let digit = 1; digit <= 9; digit++) result[digit] = 9 - (counts[digit] ?? 0);
    result[0] = counts[0] ?? 0;
    return result;
  }

  /** Share of filled cells, `0`-`1`. */
  progress(): number {
    return (CELL_COUNT - this.remaining()[0]) / CELL_COUNT;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  // --------------------------------------------------------------- editing

  select(index: number): boolean {
    if (index < 0 || index >= CELL_COUNT || this.selected === index) return false;
    this.selected = index;
    return true;
  }

  /** Moves the selection by rows/columns; wraps around at the board edges. */
  moveSelection(deltaRow: number, deltaCol: number): boolean {
    const current = this.selected >= 0 ? this.selected : 0;
    const row = (((current / 9) | 0) + deltaRow + 9) % 9;
    const col = ((current % 9) + deltaCol + 9) % 9;
    return this.select(row * 9 + col);
  }

  /** Handles a digit tap/keystroke for the selected cell. */
  input(digit: number): boolean {
    if (this.status !== 'playing') return false;
    if (this.notesMode) return this.toggleNote(digit);
    return this.placeDigit(digit);
  }

  /** Places a digit in the selected cell (or clears it when it is the same). */
  placeDigit(digit: number): boolean {
    const index = this.selected;
    if (this.status !== 'playing') return false;
    if (!this.isEditable(index)) return false;

    if (this.cells[index].value === digit) return this.erase();

    const changes = new ChangeSet(this.cells);
    const mistake = this.solution[index] !== digit;
    changes.setValue(index, digit);
    changes.setNotes(index, 0);

    if (this.autoRemoveNotes) {
      const bit = digitBit(digit);
      for (const peer of PEERS[index]) {
        const peerCell = this.cells[peer];
        if (peerCell.value === 0 && (peerCell.notes & bit) !== 0) {
          changes.setNotes(peer, peerCell.notes & ~bit);
        }
      }
    }

    this.commit({ mistake, changes: changes.toChanges() });
    this.checkWin();
    return true;
  }

  /** Toggles a pencil mark on the selected cell. */
  toggleNote(digit: number): boolean {
    const index = this.selected;
    if (this.status !== 'playing') return false;
    if (!this.isEditable(index) || this.cells[index].value !== 0) return false;

    const changes = new ChangeSet(this.cells);
    changes.setNotes(index, this.cells[index].notes ^ digitBit(digit));
    this.commit({ mistake: false, changes: changes.toChanges() });
    this.checkWin();
    return true;
  }

  /** Clears the selected cell. */
  erase(): boolean {
    const index = this.selected;
    if (this.status !== 'playing') return false;
    if (!this.isEditable(index)) return false;
    const cell = this.cells[index];
    if (cell.value === 0 && cell.notes === 0) return false;

    const changes = new ChangeSet(this.cells);
    changes.setValue(index, 0);
    changes.setNotes(index, 0);
    this.commit({ mistake: false, changes: changes.toChanges() });
    this.checkWin();
    return true;
  }

  toggleNotesMode(): boolean {
    this.notesMode = !this.notesMode;
    return this.notesMode;
  }

  /** Fills every empty cell with its pencil marks. */
  fillAutoNotes(): number {
    if (this.status !== 'playing') return 0;
    const values = this.values();
    const changes = new ChangeSet(this.cells);
    let filled = 0;
    for (let index = 0; index < CELL_COUNT; index++) {
      if (values[index] !== 0) continue;
      const mask = candidatesMask(values, index);
      if (mask === 0 || mask === this.cells[index].notes) continue;
      changes.setNotes(index, mask);
      filled++;
    }
    if (filled === 0) return 0;
    this.commit({ mistake: false, changes: changes.toChanges() });
    this.checkWin();
    return filled;
  }

  /** Reveals a correct digit. Returns the affected index, or `null`. */
  hint(): number | null {
    if (this.status !== 'playing') return null;
    const target = this.hintTarget();
    if (target === null) return null;

    const digit = this.solution[target];
    const changes = new ChangeSet(this.cells);
    changes.setValue(target, digit);
    changes.setNotes(target, 0);
    if (this.autoRemoveNotes) {
      const bit = digitBit(digit);
      for (const peer of PEERS[target]) {
        const peerCell = this.cells[peer];
        if (peerCell.value === 0 && (peerCell.notes & bit) !== 0) {
          changes.setNotes(peer, peerCell.notes & ~bit);
        }
      }
    }

    this.commit({ mistake: false, changes: changes.toChanges() });
    this.hints++;
    this.selected = target;
    this.lastRevealed = target;
    this.checkWin();
    return target;
  }

  // --------------------------------------------------------------- history

  undo(): boolean {
    const move = this.history.pop();
    if (!move) return false;
    for (const change of move.changes) {
      const cell = this.cells[change.index];
      cell.value = change.before.value;
      cell.notes = change.before.notes;
    }
    // The mistake and hint counters are deliberately NOT refunded here. A wrong
    // digit is charged the moment it is entered, and a revealed cell cannot be
    // un-seen; otherwise undo would be a free pass around both counters.
    // Jumping back to the edited cell (like `redo` does) keeps the change visible.
    const changed = move.changes[0];
    if (changed) this.selected = changed.index;
    this.future.push(move);
    if (this.status === 'won') this.status = 'playing';
    this.conflictsCache = null;
    return true;
  }

  redo(): boolean {
    const move = this.future.pop();
    if (!move) return false;
    for (const change of move.changes) {
      const cell = this.cells[change.index];
      cell.value = change.after.value;
      cell.notes = change.after.notes;
    }
    // Re-applying a move must not charge a second time - see `undo`.
    this.history.push(move);
    // Same rule as `undo`: the first change is the cell the player edited.
    const changed = move.changes[0];
    if (changed) this.selected = changed.index;
    this.conflictsCache = null;
    this.checkWin();
    return true;
  }

  // --------------------------------------------------------------- internals

  private firstEditableCell(): number {
    for (let index = 0; index < CELL_COUNT; index++) {
      if (!this.isLocked(index)) return index;
    }
    return -1;
  }

  private commit(move: Move): void {
    this.history.push(move);
    this.future.length = 0;
    this.conflictsCache = null;
    if (move.mistake) this.mistakes++;
  }

  private checkWin(): void {
    const counts = valueCounts(this.values());
    if ((counts[0] ?? 0) !== 0) return;
    const conflicts = this.conflicts();
    for (let index = 0; index < CELL_COUNT; index++) {
      if (conflicts[index] === 1) return;
    }
    this.status = 'won';
  }

  private hintTarget(): number | null {
    const cells = this.cells;
    const selected = this.selected;
    if (selected >= 0 && cells[selected].value === 0 && this.isEditable(selected)) return selected;

    for (let index = 0; index < CELL_COUNT; index++) {
      if (cells[index].value === 0) continue;
      if (this.isWrong(index)) return index;
    }
    for (let index = 0; index < CELL_COUNT; index++) {
      if (cells[index].value === 0 && this.isEditable(index)) return index;
    }
    return null;
  }
}
