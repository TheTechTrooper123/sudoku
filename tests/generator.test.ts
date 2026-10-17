import { describe, expect, it } from 'vitest';
import { CELL_COUNT, conflictsOf, countFilled, isSolved } from '../src/core/board.ts';
import { ratePuzzle } from '../src/core/difficulty.ts';
import { generateFullGrid, generatePuzzle } from '../src/core/generator.ts';
import { createRng } from '../src/core/rng.ts';
import { hasUniqueSolution, solveWithSingles } from '../src/core/solver.ts';
import { DIFFICULTIES } from '../src/core/types.ts';
import { EASY_PUZZLE_STRING, gridOf, HARD_PUZZLE_STRING } from './helpers.ts';

describe('generateFullGrid', () => {
  it('creates a complete, valid board', () => {
    const rng = createRng(12345);
    for (let run = 0; run < 3; run++) {
      const grid = generateFullGrid(rng);
      expect(grid).toHaveLength(CELL_COUNT);
      expect(isSolved(grid)).toBe(true);
      expect(conflictsOf(grid).some((flag) => flag === 1)).toBe(false);
    }
  });

  it('is reproducible with a fixed seed', () => {
    expect(generateFullGrid(createRng(99))).toEqual(generateFullGrid(createRng(99)));
    expect(generateFullGrid(createRng(1))).not.toEqual(generateFullGrid(createRng(2)));
  });
});

describe('generatePuzzle', () => {
  it.each(DIFFICULTIES)('creates a unique %s puzzle', (difficulty) => {
    const rng = createRng(2024);
    const generated = generatePuzzle({ difficulty, rng, timeBudgetMs: 12_000, maxAttempts: 6 });

    expect(generated.puzzle).toHaveLength(CELL_COUNT);
    expect(generated.solution).toHaveLength(CELL_COUNT);
    expect(isSolved(generated.solution)).toBe(true);
    expect(hasUniqueSolution(generated.puzzle)).toBe(true);

    // Puzzle must be a subset of the solution.
    for (let index = 0; index < CELL_COUNT; index++) {
      if (generated.puzzle[index] !== 0) {
        expect(generated.puzzle[index]).toBe(generated.solution[index]);
      }
    }

    const clues = countFilled(generated.puzzle);
    expect(clues).toBeGreaterThanOrEqual(20);
    expect(clues).toBeLessThanOrEqual(46);
    expect(generated.clues).toBe(clues);
    expect(generated.rating.difficulty).toBe(generated.difficulty);
  });

  it('produces distinguishable boards for different seeds', () => {
    const a = generatePuzzle({ difficulty: 'medium', rng: createRng(7), timeBudgetMs: 8_000 });
    const b = generatePuzzle({ difficulty: 'medium', rng: createRng(8), timeBudgetMs: 8_000 });
    expect(a.puzzle.join('')).not.toBe(b.puzzle.join(''));
  });

  it('reaches easier levels with singles', () => {
    const generated = generatePuzzle({
      difficulty: 'easy',
      rng: createRng(4711),
      timeBudgetMs: 12_000,
      maxAttempts: 8,
    });
    const singles = solveWithSingles(generated.puzzle);
    expect(singles.solved).toBe(true);
    expect(generated.rating.technique).toBe('singles');
  });
});

describe('ratePuzzle', () => {
  it('rates a singles puzzle as easy or medium', () => {
    const rating = ratePuzzle(gridOf(EASY_PUZZLE_STRING));
    expect(['easy', 'medium']).toContain(rating.difficulty);
    expect(rating.technique).toBe('singles');
    expect(rating.clues).toBe(38);
  });

  it('rates a puzzle that needs guessing as hard or expert', () => {
    const rating = ratePuzzle(gridOf(HARD_PUZZLE_STRING));
    expect(['hard', 'expert']).toContain(rating.difficulty);
    expect(rating.technique).toBe('search');
    expect(rating.guesses).toBeGreaterThan(0);
  });
});
