/**
 * Board geometry and cell helpers.
 *
 * Everything is index based: a board is a flat array of 81 numbers where the
 * cell at row `r` and column `c` lives at `r * 9 + c`.
 */
import type { Grid } from './types.ts';

export const SIZE = 9;
export const CELL_COUNT = 81;

/** Bit mask containing the bits for the digits 1-9 (bit 0 is unused). */
export const ALL_DIGITS_MASK = 0b1111111110;

/** Bit for a single digit (1-9). */
export function digitBit(digit: number): number {
  return 1 << digit;
}

/** All digits contained in a bit mask, ascending. */
export function maskDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let digit = 1; digit <= SIZE; digit++) {
    if ((mask & digitBit(digit)) !== 0) digits.push(digit);
  }
  return digits;
}

/** Number of digits contained in a bit mask. */
export function maskSize(mask: number): number {
  let count = 0;
  let value = mask;
  while (value !== 0) {
    value &= value - 1;
    count++;
  }
  return count;
}

export function rowOf(index: number): number {
  return (index / SIZE) | 0;
}

export function colOf(index: number): number {
  return index % SIZE;
}

export function boxOf(index: number): number {
  return ((rowOf(index) / 3) | 0) * 3 + ((colOf(index) / 3) | 0);
}

export function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

/** The 27 units of a board: 9 rows, 9 columns, 9 boxes. */
export const UNITS: readonly (readonly number[])[] = (() => {
  const units: number[][] = [];
  for (let row = 0; row < SIZE; row++) {
    units.push(Array.from({ length: SIZE }, (_, col) => indexOf(row, col)));
  }
  for (let col = 0; col < SIZE; col++) {
    units.push(Array.from({ length: SIZE }, (_, row) => indexOf(row, col)));
  }
  for (let box = 0; box < SIZE; box++) {
    const baseRow = ((box / 3) | 0) * 3;
    const baseCol = (box % 3) * 3;
    const cells: number[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) cells.push(indexOf(baseRow + r, baseCol + c));
    }
    units.push(cells);
  }
  return units;
})();

/** The three units (row, column, box) a cell belongs to. */
export const UNITS_OF: readonly (readonly (readonly number[])[])[] = (() => {
  const result: (readonly number[])[][] = [];
  for (let index = 0; index < CELL_COUNT; index++) {
    const row = UNITS[rowOf(index)];
    const col = UNITS[SIZE + colOf(index)];
    const box = UNITS[2 * SIZE + boxOf(index)];
    result.push([row, col, box]);
  }
  return result;
})();

/** All cells that share a unit with a given cell (excluding the cell itself). */
export const PEERS: readonly (readonly number[])[] = (() => {
  const result: number[][] = [];
  for (let index = 0; index < CELL_COUNT; index++) {
    const peers = new Set<number>();
    for (const unit of UNITS_OF[index]) {
      for (const cell of unit) {
        if (cell !== index) peers.add(cell);
      }
    }
    result.push([...peers].sort((a, b) => a - b));
  }
  return result;
})();

/** `true` when both cells share a row, column or box. */
export function sharesUnit(a: number, b: number): boolean {
  return (
    rowOf(a) === rowOf(b) ||
    colOf(a) === colOf(b) ||
    boxOf(a) === boxOf(b)
  );
}

/** Number of empty cells. */
export function countEmpty(grid: Grid): number {
  let empty = 0;
  for (let index = 0; index < CELL_COUNT; index++) {
    if (grid[index] === 0) empty++;
  }
  return empty;
}

/** Number of filled cells (clues for an untouched puzzle). */
export function countFilled(grid: Grid): number {
  return CELL_COUNT - countEmpty(grid);
}

/** Candidates for an empty cell as a bit mask; `0` for a filled cell. */
export function candidatesMask(grid: Grid, index: number): number {
  if (grid[index] !== 0) return 0;
  let used = 0;
  for (const peer of PEERS[index]) {
    used |= digitBit(grid[peer]);
  }
  return ALL_DIGITS_MASK & ~used;
}

/** Candidate masks for every empty cell of a board. */
export function allCandidates(grid: Grid): number[] {
  const masks = new Array<number>(CELL_COUNT).fill(0);
  for (let index = 0; index < CELL_COUNT; index++) {
    masks[index] = candidatesMask(grid, index);
  }
  return masks;
}

/**
 * Cells that violate the rules (duplicate digit inside a row, column or box).
 * The returned array is indexed by cell.
 */
export function conflictsOf(grid: Grid): Uint8Array {
  const flags = new Uint8Array(CELL_COUNT);
  for (const unit of UNITS) {
    const seen = new Map<number, number>();
    for (const index of unit) {
      const value = grid[index];
      if (value === 0) continue;
      const first = seen.get(value);
      if (first === undefined) {
        seen.set(value, index);
      } else {
        flags[first] = 1;
        flags[index] = 1;
      }
    }
  }
  return flags;
}

/** `true` when every cell is filled and no rule is violated. */
export function isSolved(grid: Grid): boolean {
  for (let index = 0; index < CELL_COUNT; index++) {
    if (grid[index] === 0) return false;
  }
  return conflictsOf(grid).every((flag) => flag === 0);
}

/** `true` when a partially filled board contains no rule violation. */
export function isValid(grid: Grid): boolean {
  return conflictsOf(grid).every((flag) => flag === 0);
}

/** How often each digit appears on the board (index 0 = empty cells). */
export function valueCounts(grid: Grid): number[] {
  const counts = new Array<number>(SIZE + 1).fill(0);
  for (let index = 0; index < CELL_COUNT; index++) counts[grid[index]]++;
  return counts;
}

/** Compares two boards cell by cell and returns every differing index. */
export function diffIndices(a: Grid, b: Grid): number[] {
  const result: number[] = [];
  for (let index = 0; index < CELL_COUNT; index++) {
    if (a[index] !== b[index]) result.push(index);
  }
  return result;
}

export function cloneGrid(grid: Grid): Grid {
  return grid.slice();
}
