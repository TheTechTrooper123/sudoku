/**
 * Shared domain types for the Sudoku game.
 */

/** Difficulty levels offered by the UI. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Ordered list of difficulties, easiest first. */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** A flat 9x9 board of 81 cells. `0` marks an empty cell, `1`-`9` a digit. */
export type Grid = number[];

/** A cell of the playable board. */
export interface Cell {
  /** Current value, `0` when empty. */
  value: number;
  /** `true` for cells that were part of the initial puzzle. */
  given: boolean;
  /** Pencil marks as a bit mask (bit 1 → digit 1, ... bit 9 → digit 9). */
  notes: number;
}

/** Identifies where a puzzle came from. */
export type PuzzleSource = 'youdosudoku' | 'local';

/** A puzzle ready to be played. */
export interface Puzzle {
  difficulty: Difficulty;
  /** Initial board with `0` for empty cells. */
  puzzle: Grid;
  /** Complete solution of `puzzle`. */
  solution: Grid;
  /** Where the puzzle was produced. */
  source: PuzzleSource;
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}
