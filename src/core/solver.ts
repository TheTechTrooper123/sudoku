/**
 * Solving utilities.
 *
 * Three entry points with different trade-offs:
 *
 * - `solveWithSingles`  human style solving with naked + hidden singles only
 * - `countSolutions`    uniqueness check (stops after `limit` solutions)
 * - `measureSearch`     backtracking search that reports how much guessing a
 *                       puzzle needs; used to rate difficulty
 */
import {
  CELL_COUNT,
  PEERS,
  UNITS,
  candidatesMask,
  digitBit,
  maskDigits,
  maskSize,
} from './board.ts';
import type { Grid } from './types.ts';

export interface SinglesResult {
  /** `true` when the board could be completed using singles only. */
  solved: boolean;
  /** Board after the technique run (partially filled when `solved` is false). */
  grid: Grid;
  /** `true` when a cell ran out of candidates - the board is unsolvable. */
  contradiction: boolean;
  /** `true` when at least one cell was filled by a naked single. */
  usedNaked: boolean;
  /** `true` when at least one cell was filled by a hidden single. */
  usedHidden: boolean;
}

/**
 * Solves a board using nothing but naked and hidden singles, i.e. the
 * techniques a beginner would use. Puzzles solved this way are "easy" to
 * "medium"; everything else needs more advanced reasoning or guessing.
 */
export function solveWithSingles(input: Grid): SinglesResult {
  const grid = input.slice();
  const masks = new Array<number>(CELL_COUNT).fill(0);
  for (let index = 0; index < CELL_COUNT; index++) {
    masks[index] = grid[index] === 0 ? candidatesMask(grid, index) : 0;
  }

  let usedNaked = false;
  let usedHidden = false;
  let contradiction = false;

  const place = (index: number, digit: number): void => {
    grid[index] = digit;
    masks[index] = 0;
    const bit = digitBit(digit);
    for (const peer of PEERS[index]) {
      if (grid[peer] === 0) masks[peer] &= ~bit;
    }
  };

  for (;;) {
    let placed = false;

    for (let index = 0; index < CELL_COUNT; index++) {
      if (grid[index] !== 0) continue;
      const mask = masks[index];
      if (mask === 0) {
        contradiction = true;
        break;
      }
      if (maskSize(mask) === 1) {
        place(index, maskDigits(mask)[0]);
        usedNaked = true;
        placed = true;
      }
    }
    if (contradiction) break;
    if (placed) continue;

    for (const unit of UNITS) {
      for (let digit = 1; digit <= 9; digit++) {
        const bit = digitBit(digit);
        let present = false;
        let spot = -1;
        let possible = 0;
        for (const index of unit) {
          if (grid[index] === digit) {
            present = true;
            break;
          }
          if (grid[index] === 0 && (masks[index] & bit) !== 0) {
            possible++;
            spot = index;
          }
        }
        if (present || possible !== 1) continue;
        place(spot, digit);
        usedHidden = true;
        placed = true;
      }
    }

    if (!placed) break;
  }

  let solved = true;
  for (let index = 0; index < CELL_COUNT; index++) {
    if (grid[index] === 0) {
      solved = false;
      break;
    }
  }
  if (contradiction) solved = false;

  return { solved, grid, contradiction, usedNaked, usedHidden };
}

export interface SolutionCount {
  /** Number of solutions found, capped at the requested limit. */
  count: number;
  /** First solution found, if any. */
  solution: Grid | null;
}

/**
 * Counts solutions with a most-constrained-cell backtracking search. The
 * search stops as soon as `limit` solutions were found, which makes
 * `countSolutions(grid, 2).count === 1` an efficient uniqueness check.
 */
export function countSolutions(input: Grid, limit = 2): SolutionCount {
  const grid = input.slice();
  const masks = new Array<number>(CELL_COUNT).fill(0);
  for (let index = 0; index < CELL_COUNT; index++) {
    if (grid[index] === 0) masks[index] = candidatesMask(grid, index);
  }

  let count = 0;
  let solution: Grid | null = null;

  const search = (): void => {
    let best = -1;
    let bestMask = 0;
    let bestSize = 10;

    for (let index = 0; index < CELL_COUNT; index++) {
      if (grid[index] !== 0) continue;
      const mask = masks[index];
      const size = maskSize(mask);
      if (size === 0) return; // dead end
      if (size < bestSize) {
        bestSize = size;
        best = index;
        bestMask = mask;
        if (size === 1) break;
      }
    }

    if (best === -1) {
      count++;
      if (solution === null) solution = grid.slice();
      return;
    }

    const savedMask = masks[best];
    masks[best] = 0;
    for (const digit of maskDigits(bestMask)) {
      const bit = digitBit(digit);
      const touched: number[] = [];
      grid[best] = digit;
      for (const peer of PEERS[best]) {
        if (grid[peer] === 0 && (masks[peer] & bit) !== 0) {
          masks[peer] &= ~bit;
          touched.push(peer);
        }
      }

      search();

      for (const peer of touched) masks[peer] |= bit;
      if (count >= limit) break;
    }
    grid[best] = 0;
    masks[best] = savedMask;
  };

  search();
  return { count, solution };
}

/** `true` when the board has exactly one solution. */
export function hasUniqueSolution(grid: Grid): boolean {
  return countSolutions(grid, 2).count === 1;
}

export interface SearchStats {
  solved: boolean;
  /** Cells visited by the search. */
  nodes: number;
  /** Branch points where the search had to guess between several digits. */
  guesses: number;
  /** Deepest recursion level. */
  maxDepth: number;
}

/**
 * Backtracking search that reports how much guessing a puzzle requires.
 * Used by the difficulty rating for puzzles that the singles solver cannot
 * finish.
 */
export function measureSearch(input: Grid, nodeLimit = 200_000): SearchStats {
  const grid = input.slice();
  const masks = new Array<number>(CELL_COUNT).fill(0);
  for (let index = 0; index < CELL_COUNT; index++) {
    if (grid[index] === 0) masks[index] = candidatesMask(grid, index);
  }

  const stats: SearchStats = { solved: false, nodes: 0, guesses: 0, maxDepth: 0 };

  const search = (depth: number): boolean => {
    stats.nodes++;
    if (stats.nodes > nodeLimit) return false;
    if (depth > stats.maxDepth) stats.maxDepth = depth;

    let best = -1;
    let bestMask = 0;
    let bestSize = 10;
    for (let index = 0; index < CELL_COUNT; index++) {
      if (grid[index] !== 0) continue;
      const mask = masks[index];
      const size = maskSize(mask);
      if (size === 0) return false;
      if (size < bestSize) {
        bestSize = size;
        best = index;
        bestMask = mask;
        if (size === 1) break;
      }
    }
    if (best === -1) return true;

    const savedMask = masks[best];
    masks[best] = 0;
    if (bestSize > 1) stats.guesses++;

    const digits = maskDigits(bestMask);
    for (const digit of digits) {
      const bit = digitBit(digit);
      const touched: number[] = [];
      grid[best] = digit;
      for (const peer of PEERS[best]) {
        if (grid[peer] === 0 && (masks[peer] & bit) !== 0) {
          masks[peer] &= ~bit;
          touched.push(peer);
        }
      }

      const solved = search(depth + 1);
      for (const peer of touched) masks[peer] |= bit;
      if (solved) return true;
    }

    grid[best] = 0;
    masks[best] = savedMask;
    return false;
  };

  stats.solved = search(0);
  return stats;
}
