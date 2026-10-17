import { describe, expect, it } from 'vitest';
import { isSolved } from '../src/core/board.ts';
import { countSolutions, hasUniqueSolution, measureSearch, solveWithSingles } from '../src/core/solver.ts';
import type { Grid } from '../src/core/types.ts';

/** Real puzzle served by the YouDoSudoku API (easy). */
const EASY_PUZZLE: Grid =
  '009042000805009604000005109000080000410500086358700401060254800281007003074318000'
    .split('')
    .map(Number);

const EASY_SOLUTION: Grid =
  '139642758825179634746835129692481375417593286358726491963254817281967543574318962'
    .split('')
    .map(Number);

function toGrid(value: string): Grid {
  return value.split('').map(Number);
}

describe('solveWithSingles', () => {
  it('solves a puzzle that only needs basic techniques', () => {
    const result = solveWithSingles(EASY_PUZZLE);
    expect(result.contradiction).toBe(false);
    expect(result.solved).toBe(true);
    expect(result.grid).toEqual(EASY_SOLUTION);
    expect(result.usedNaked).toBe(true);
  });

  it('does not solve a board that needs guessing', () => {
    const hard = toGrid('100007090030020008009600500005300900010080002600004000300000010040000007007000300');
    const result = solveWithSingles(hard);
    expect(result.solved).toBe(false);
    expect(result.contradiction).toBe(false);
  });

  it('reports contradictions on an unsolvable board', () => {
    // Cell 8 (top right) has no candidate left: the row holds 1-8, the
    // column holds 9.
    const digits = new Array(81).fill(0);
    for (let index = 0; index < 8; index++) digits[index] = index + 1;
    digits[17] = 9;
    const result = solveWithSingles(digits);
    expect(result.solved).toBe(false);
    expect(result.contradiction).toBe(true);
  });
});

describe('countSolutions', () => {
  it('finds the unique solution of a proper puzzle', () => {
    const { count, solution } = countSolutions(EASY_PUZZLE, 2);
    expect(count).toBe(1);
    expect(solution).toEqual(EASY_SOLUTION);
    expect(hasUniqueSolution(EASY_PUZZLE)).toBe(true);
  });

  it('detects puzzles with several solutions', () => {
    const ambiguous = EASY_PUZZLE.slice();
    // Remove enough clues to make the puzzle ambiguous.
    for (let index = 0; index < 40; index++) ambiguous[index] = 0;
    expect(countSolutions(ambiguous, 2).count).toBe(2);
    expect(hasUniqueSolution(ambiguous)).toBe(false);
  });

  it('counts exactly up to the limit', () => {
    const empty: Grid = new Array(81).fill(0);
    expect(countSolutions(empty, 1).count).toBe(1);
    expect(countSolutions(empty, 3).count).toBe(3);
  });

  it('reports zero solutions for a contradictory board', () => {
    const broken = EASY_PUZZLE.slice();
    broken[1] = 1; // 1 already exists in the same row
    expect(countSolutions(broken, 2).count).toBe(0);
  });
});

describe('measureSearch', () => {
  it('solves easy puzzles without guessing', () => {
    const stats = measureSearch(EASY_PUZZLE);
    expect(stats.solved).toBe(true);
    expect(stats.guesses).toBe(0);
    expect(stats.nodes).toBeGreaterThan(0);
  });

  it('needs guesses for hard puzzles', () => {
    const hard = toGrid('100007090030020008009600500005300900010080002600004000300000010040000007007000300');
    const stats = measureSearch(hard);
    expect(stats.solved).toBe(true);
    expect(stats.guesses).toBeGreaterThan(0);
  });

  it('returns the solved board through countSolutions as well', () => {
    const { solution } = countSolutions(EASY_PUZZLE, 1);
    expect(solution).not.toBeNull();
    expect(isSolved(solution as Grid)).toBe(true);
  });
});
