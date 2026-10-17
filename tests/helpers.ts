/**
 * Shared fixtures for the test suite.
 */
import { CELL_COUNT } from '../src/core/board.ts';
import type { Difficulty, Grid, Puzzle } from '../src/core/types.ts';

/** Real puzzle served by the YouDoSudoku API (easy, 38 clues). */
export const EASY_PUZZLE_STRING =
  '009042000805009604000005109000080000410500086358700401060254800281007003074318000';

/** Matching solution of {@link EASY_PUZZLE_STRING}. */
export const EASY_SOLUTION_STRING =
  '139642758825179634746835129692481375417593286358726491963254817281967543574318962';

/** A puzzle that needs more than naked/hidden singles. */
export const HARD_PUZZLE_STRING =
  '100007090030020008009600500005300900010080002600004000300000010040000007007000300';

export function gridOf(value: string): Grid {
  return value.split('').map(Number);
}

export function puzzleFrom(
  puzzleString: string,
  solutionString: string,
  difficulty: Difficulty = 'easy',
): Puzzle {
  return {
    difficulty,
    puzzle: gridOf(puzzleString),
    solution: gridOf(solutionString),
    source: 'youdosudoku',
  };
}

export function easyPuzzle(): Puzzle {
  return puzzleFrom(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING);
}

/**
 * A puzzle whose solution is complete except for the given indices - handy to
 * test the win detection.
 */
export function nearlySolvedPuzzle(missing: number[]): Puzzle {
  const solution = gridOf(EASY_SOLUTION_STRING);
  const puzzle = solution.slice();
  for (const index of missing) puzzle[index] = 0;
  return { difficulty: 'easy', puzzle, solution, source: 'youdosudoku' };
}

export function emptyGrid(): Grid {
  return new Array<number>(CELL_COUNT).fill(0);
}
