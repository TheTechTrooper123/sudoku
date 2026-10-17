/**
 * Game state machine.
 *
 * Holds the playable board, the move history (undo/redo), the timer, mistake
 * and hint counters and knows when the puzzle is solved. It is completely
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
export type MoveKind = 'value' | 'notes' | 'erase' | 'hint' | 'auto-notes';

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
  kind: MoveKind;
  /** Digit that was placed or noted (`0` for erase). */
  digit: number;
  /** `true` when the placed digit does not match the solution. */
  mistake: boolean;
  changes: CellChange[];
}

export interface SerializedGame {
  version: 1;
  puzzle: Grid;
  solution: Grid;
  difficulty: Difficulty;
  source: PuzzleSource;
  entries: { value: number; notes: number }[];
  history: Move[];
  future: Move[];
  selected: number;
  notesMode: boolean;
  mistakes: number;
  hints: number;
  status: GameStatus;
  paused: boolean;
  startedAt: number;
  elapsedBefore: number;
  runningSince: number | null;
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
  paused = false;
  startedAt: number;
  elapsedBefore = 0;
  runningSince: number | null;
  /** Index of the cell that was revealed by the last hint (for animations). */
  lastRevealed: number | null = null;

  private conflictsCache: Uint8Array | null = null;

  constructor(puzzle: Puzzle, now: number = Date.now()) {
    this.puzzle = puzzle.puzzle.slice();
    this.solution = puzzle.solution.slice();
    this.difficulty = puzzle.difficulty;
    this.source = puzzle.source;
    this.cells = Array.from({ length: CELL_COUNT }, (_, index) => ({
      value: puzzle.puzzle[index],
      given: puzzle.puzzle[index] !== 0,
      notes: 0,
    }));
    this.startedAt = now;
    this.runningSince = now;
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

  isEditable(index: number): boolean {
    return index >= 0 && index < CELL_COUNT && !this.cells[index].given;
  }

  /** Cells that break the rules of Sudoku (duplicates in a unit). */
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

  hasMistakesOnBoard(): boolean {
    for (let index = 0; index < CELL_COUNT; index++) {
      if (this.isWrong(index)) return true;
    }
    return false;
  }

  /** Candidate digits of an empty cell, based on the current board. */
  candidatesAt(index: number): number[] {
    if (this.cells[index].value !== 0) return [];
    return maskDigits(candidatesMask(this.values(), index));
  }

  /** How many of each digit are still missing (index 0 carries empty cells). */
  remaining(): number[] {
    const counts = valueCounts(this.values());
    const empty = CELL_COUNT - (counts[0] ?? 0);
    const result = new Array<number>(10).fill(0);
    for (let digit = 1; digit <= 9; digit++) result[digit] = 9 - (counts[digit] ?? 0);
    result[0] = empty;
    return result;
  }

  /** Share of filled cells, `0`-`1`. */
  progress(): number {
    return (CELL_COUNT - this.remaining()[0]) / CELL_COUNT;
  }

  /** Elapsed play time in milliseconds, excluding pauses. */
  elapsedMs(now: number = Date.now()): number {
    const running = this.runningSince === null ? 0 : Math.max(0, now - this.runningSince);
    return this.elapsedBefore + running;
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
  input(digit: number, now: number = Date.now()): boolean {
    if (this.status !== 'playing' || this.paused) return false;
    if (this.notesMode) return this.toggleNote(digit);
    return this.placeDigit(digit, now);
  }

  /** Places a digit in the selected cell (or clears it when it is the same). */
  placeDigit(digit: number, now: number = Date.now()): boolean {
    const index = this.selected;
    if (this.status !== 'playing' || this.paused) return false;
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

    this.commit({ kind: 'value', digit, mistake, changes: changes.toChanges() });
    this.afterEdit(now);
    return true;
  }

  /** Toggles a pencil mark on the selected cell. */
  toggleNote(digit: number, now: number = Date.now()): boolean {
    const index = this.selected;
    if (this.status !== 'playing' || this.paused) return false;
    if (!this.isEditable(index) || this.cells[index].value !== 0) return false;

    const changes = new ChangeSet(this.cells);
    changes.setNotes(index, this.cells[index].notes ^ digitBit(digit));
    this.commit({ kind: 'notes', digit, mistake: false, changes: changes.toChanges() });
    this.afterEdit(now);
    return true;
  }

  /** Clears the selected cell. */
  erase(now: number = Date.now()): boolean {
    const index = this.selected;
    if (this.status !== 'playing' || this.paused) return false;
    if (!this.isEditable(index)) return false;
    const cell = this.cells[index];
    if (cell.value === 0 && cell.notes === 0) return false;

    const changes = new ChangeSet(this.cells);
    changes.setValue(index, 0);
    changes.setNotes(index, 0);
    this.commit({ kind: 'erase', digit: 0, mistake: false, changes: changes.toChanges() });
    this.afterEdit(now);
    return true;
  }

  toggleNotesMode(): boolean {
    this.notesMode = !this.notesMode;
    return this.notesMode;
  }

  /** Fills every empty cell with its pencil marks. */
  fillAutoNotes(now: number = Date.now()): number {
    if (this.status !== 'playing' || this.paused) return 0;
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
    this.commit({ kind: 'auto-notes', digit: 0, mistake: false, changes: changes.toChanges() });
    this.afterEdit(now);
    return filled;
  }

  /** Reveals a correct digit. Returns the affected index, or `null`. */
  hint(now: number = Date.now()): number | null {
    if (this.status !== 'playing' || this.paused) return null;
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

    this.commit({ kind: 'hint', digit, mistake: false, changes: changes.toChanges() });
    this.hints++;
    this.selected = target;
    this.lastRevealed = target;
    this.afterEdit(now);
    return target;
  }

  // --------------------------------------------------------------- history

  undo(now: number = Date.now()): boolean {
    const move = this.history.pop();
    if (!move) return false;
    for (const change of move.changes) {
      const cell = this.cells[change.index];
      cell.value = change.before.value;
      cell.notes = change.before.notes;
    }
    if (move.mistake) this.mistakes = Math.max(0, this.mistakes - 1);
    if (move.kind === 'hint') this.hints = Math.max(0, this.hints - 1);
    this.future.push(move);
    if (this.status === 'won') this.status = 'playing';
    this.conflictsCache = null;
    if (now >= 0) this.afterEdit(now);
    return true;
  }

  redo(now: number = Date.now()): boolean {
    const move = this.future.pop();
    if (!move) return false;
    for (const change of move.changes) {
      const cell = this.cells[change.index];
      cell.value = change.after.value;
      cell.notes = change.after.notes;
    }
    if (move.mistake) this.mistakes++;
    if (move.kind === 'hint') this.hints++;
    this.history.push(move);
    this.selected = move.changes[move.changes.length - 1]?.index ?? this.selected;
    this.conflictsCache = null;
    this.checkWin(now);
    return true;
  }

  // ----------------------------------------------------------------- timer

  pause(now: number = Date.now()): void {
    if (this.paused || this.status === 'won') return;
    this.elapsedBefore = this.elapsedMs(now);
    this.runningSince = null;
    this.paused = true;
  }

  resume(now: number = Date.now()): void {
    if (!this.paused || this.status === 'won') return;
    this.paused = false;
    this.runningSince = now;
  }

  togglePause(now: number = Date.now()): boolean {
    if (this.paused) this.resume(now);
    else this.pause(now);
    return this.paused;
  }

  // ------------------------------------------------------------ persistence

  serialize(): SerializedGame {
    return {
      version: 1,
      puzzle: this.puzzle.slice(),
      solution: this.solution.slice(),
      difficulty: this.difficulty,
      source: this.source,
      entries: this.cells.map((cell) => ({ value: cell.value, notes: cell.notes })),
      history: this.history,
      future: this.future,
      selected: this.selected,
      notesMode: this.notesMode,
      mistakes: this.mistakes,
      hints: this.hints,
      status: this.status,
      paused: this.paused,
      startedAt: this.startedAt,
      elapsedBefore: this.elapsedBefore,
      runningSince: this.runningSince,
    };
  }

  /** Restores a game from localStorage. Returns `null` for damaged data. */
  static restore(data: unknown): Game | null {
    if (typeof data !== 'object' || data === null) return null;
    const raw = data as Partial<SerializedGame>;
    if (
      !Array.isArray(raw.puzzle) ||
      raw.puzzle.length !== CELL_COUNT ||
      !Array.isArray(raw.solution) ||
      raw.solution.length !== CELL_COUNT ||
      !Array.isArray(raw.entries) ||
      raw.entries.length !== CELL_COUNT
    ) {
      return null;
    }

    let game: Game;
    try {
      game = new Game({
        puzzle: raw.puzzle,
        solution: raw.solution,
        difficulty: (raw.difficulty ?? 'easy') as Difficulty,
        source: (raw.source ?? 'local') as PuzzleSource,
      });
    } catch {
      return null;
    }
    game.cells = raw.entries.map((entry, index) => ({
      value: entry?.value ?? 0,
      given: raw.puzzle![index] !== 0,
      notes: entry?.notes ?? 0,
    }));
    game.history = Array.isArray(raw.history) ? raw.history : [];
    game.future = Array.isArray(raw.future) ? raw.future : [];
    game.selected = typeof raw.selected === 'number' ? raw.selected : -1;
    game.notesMode = raw.notesMode === true;
    game.mistakes = typeof raw.mistakes === 'number' ? raw.mistakes : 0;
    game.hints = typeof raw.hints === 'number' ? raw.hints : 0;
    game.status = raw.status === 'won' ? 'won' : 'playing';
    game.startedAt = typeof raw.startedAt === 'number' ? raw.startedAt : Date.now();
    game.elapsedBefore = typeof raw.elapsedBefore === 'number' ? raw.elapsedBefore : 0;
    game.paused = raw.paused === true;
    game.runningSince =
      game.status === 'won' || game.paused
        ? null
        : typeof raw.runningSince === 'number'
          ? raw.runningSince
          : Date.now();
    return game;
  }

  // --------------------------------------------------------------- internals

  private firstEditableCell(): number {
    for (let index = 0; index < CELL_COUNT; index++) {
      if (!this.cells[index].given) return index;
    }
    return -1;
  }

  private commit(move: Move): void {
    this.history.push(move);
    this.future.length = 0;
    this.conflictsCache = null;
    if (move.mistake) this.mistakes++;
  }

  private afterEdit(now: number): void {
    this.checkWin(now);
  }

  private checkWin(now: number): void {
    const counts = valueCounts(this.values());
    if ((counts[0] ?? 0) !== 0) return;
    const conflicts = this.conflicts();
    for (let index = 0; index < CELL_COUNT; index++) {
      if (conflicts[index] === 1) return;
    }
    this.status = 'won';
    this.elapsedBefore = this.elapsedMs(now);
    this.runningSince = null;
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
