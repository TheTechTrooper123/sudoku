/**
 * Difficulty rating.
 *
 * Instead of trusting the label of an upstream puzzle provider (or the number
 * of clues alone), every puzzle is solved the way a human would and rated by
 * the techniques that are actually required:
 *
 * - naked + hidden singles only  → easy / medium
 * - needs guessing              → hard / expert (based on search effort)
 */
import { countFilled } from './board.ts';
import { measureSearch, solveWithSingles } from './solver.ts';
import { DIFFICULTIES } from './types.ts';
import type { Difficulty, Grid } from './types.ts';

export interface Rating {
  difficulty: Difficulty;
  /** Number of given cells. */
  clues: number;
  technique: 'singles' | 'search';
  /** Cells visited by the search (0 when singles were enough). */
  nodes: number;
  /** Branch points the search had to take. */
  guesses: number;
  /** `true` when hidden singles are required. */
  requiresHiddenSingles: boolean;
}

/** Position of a difficulty inside `DIFFICULTIES`, handy for comparisons. */
export function difficultyRank(difficulty: Difficulty): number {
  return DIFFICULTIES.indexOf(difficulty);
}

/**
 * Rates a puzzle. Thresholds are tuned so that puzzles generated for a
 * difficulty are rated back into the same bucket (see `tests/difficulty`).
 */
export function ratePuzzle(puzzle: Grid): Rating {
  const clues = countFilled(puzzle);
  const singles = solveWithSingles(puzzle);

  if (singles.solved) {
    const requiresHiddenSingles = singles.usedHidden;
    const difficulty: Difficulty =
      requiresHiddenSingles || clues < 33 ? 'medium' : 'easy';
    return {
      difficulty,
      clues,
      technique: 'singles',
      nodes: 0,
      guesses: 0,
      requiresHiddenSingles,
    };
  }

  const search = measureSearch(puzzle);
  const easySearch = search.guesses <= 4 && search.nodes <= 6_000;
  return {
    difficulty: easySearch ? 'hard' : 'expert',
    clues,
    technique: 'search',
    nodes: search.nodes,
    guesses: search.guesses,
    requiresHiddenSingles: singles.usedHidden,
  };
}
