/**
 * Offline puzzle generator.
 *
 * Used as a resilience layer in front of the remote puzzle API: whenever the
 * API is unreachable, rate limited or too slow, the app generates a puzzle in
 * the browser instead. Generation follows the classic approach:
 *
 * 1. build a random, complete board
 * 2. remove clues until the target clue count is reached, keeping the
 *    solution unique (180 degree rotational symmetry is preferred)
 * 3. rate the result and retry when the rating does not match the request
 */
import { CELL_COUNT, candidatesMask, countFilled, maskDigits } from './board.ts';
import { difficultyRank, ratePuzzle } from './difficulty.ts';
import type { Rating } from './difficulty.ts';
import { createRng, randomSeed, shuffle } from './rng.ts';
import type { Rng } from './rng.ts';
import { countSolutions } from './solver.ts';
import type { Difficulty, Grid } from './types.ts';

export interface GeneratedPuzzle {
  puzzle: Grid;
  solution: Grid;
  /** Rating of the generated puzzle (may differ slightly from the request). */
  difficulty: Difficulty;
  rating: Rating;
  clues: number;
}

export interface GenerateOptions {
  difficulty: Difficulty;
  rng?: Rng;
  /** Wall clock budget in milliseconds; the best attempt so far is returned. */
  timeBudgetMs?: number;
  /** Maximum number of full generation attempts. */
  maxAttempts?: number;
}

interface ClueTarget {
  /** Clue count the digger aims for. */
  ideal: number;
  /** Accepted range while scoring attempts. */
  min: number;
  max: number;
}

const CLUE_TARGETS: Record<Difficulty, ClueTarget> = {
  easy: { ideal: 38, min: 35, max: 44 },
  medium: { ideal: 32, min: 29, max: 36 },
  hard: { ideal: 27, min: 25, max: 31 },
  expert: { ideal: 23, min: 21, max: 26 },
};

const DEFAULT_TIME_BUDGET_MS = 4_000;
const DEFAULT_MAX_ATTEMPTS = 12;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Builds a random, completely filled and valid board. */
export function generateFullGrid(rng: Rng = createRng(randomSeed())): Grid {
  const grid = new Array<number>(CELL_COUNT).fill(0);
  fillGrid(grid, 0, rng);
  return grid;
}

function fillGrid(grid: Grid, index: number, rng: Rng): boolean {
  if (index === CELL_COUNT) return true;
  if (grid[index] !== 0) return fillGrid(grid, index + 1, rng);

  const digits = shuffle(maskDigits(candidatesMask(grid, index)), rng);
  for (const digit of digits) {
    grid[index] = digit;
    if (fillGrid(grid, index + 1, rng)) return true;
    grid[index] = 0;
  }
  return false;
}

/** Generates a puzzle for the requested difficulty. Never returns `null`. */
export function generatePuzzle(options: GenerateOptions): GeneratedPuzzle {
  const target = options.difficulty;
  const rng = options.rng ?? createRng(randomSeed());
  const deadline = nowMs() + (options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS);
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  let best: GeneratedPuzzle | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateFullGrid(rng);
    const puzzle = digPuzzle(solution, target, rng, deadline);
    const rating = ratePuzzle(puzzle);
    const clues = countFilled(puzzle);
    const score = scoreAttempt(rating, clues, target);

    if (score < bestScore) {
      bestScore = score;
      best = { puzzle, solution, difficulty: rating.difficulty, rating, clues };
    }
    if (bestScore === 0) break;
    if (nowMs() > deadline) break;
  }

  // The loop always runs at least once, so `best` is set.
  return best as GeneratedPuzzle;
}

function scoreAttempt(rating: Rating, clues: number, target: Difficulty): number {
  const rankDistance = Math.abs(difficultyRank(rating.difficulty) - difficultyRank(target));
  const wanted = CLUE_TARGETS[target];
  const clueDistance =
    clues < wanted.min ? wanted.min - clues : clues > wanted.max ? clues - wanted.max : 0;
  return rankDistance * 100 + clueDistance;
}

/** Removes clues while keeping the puzzle uniquely solvable. */
function digPuzzle(solution: Grid, target: Difficulty, rng: Rng, deadline: number): Grid {
  const wanted = CLUE_TARGETS[target];
  const puzzle = solution.slice();
  let filled = CELL_COUNT;

  const half = Math.ceil(CELL_COUNT / 2);
  const pairs = shuffle(
    Array.from({ length: half }, (_, index) => index),
    rng,
  );

  for (const index of pairs) {
    if (filled <= wanted.ideal) break;
    const mirror = CELL_COUNT - 1 - index;
    const first = puzzle[index];
    const second = puzzle[mirror];
    if (first === 0 && second === 0) continue;

    puzzle[index] = 0;
    puzzle[mirror] = 0;
    if (countSolutions(puzzle, 2).count === 1) {
      // The centre cell (index 40) is its own mirror, so it must only count
      // once - otherwise `filled` drifts and the digger stops one clue early.
      const removed = (first === 0 ? 0 : 1) + (mirror === index || second === 0 ? 0 : 1);
      filled -= removed;
    } else {
      puzzle[index] = first;
      puzzle[mirror] = second;
    }
    if (nowMs() > deadline) return puzzle;
  }

  if (filled <= wanted.ideal) return puzzle;

  // Symmetry occasionally blocks further digging - fall back to single cells.
  const singles = shuffle(
    Array.from({ length: CELL_COUNT }, (_, index) => index),
    rng,
  );
  for (const index of singles) {
    if (filled <= wanted.ideal) break;
    const saved = puzzle[index];
    if (saved === 0) continue;
    puzzle[index] = 0;
    if (countSolutions(puzzle, 2).count === 1) {
      filled--;
    } else {
      puzzle[index] = saved;
    }
    if (nowMs() > deadline) return puzzle;
  }

  return puzzle;
}
