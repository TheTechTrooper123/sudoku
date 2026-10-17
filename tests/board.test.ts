import { describe, expect, it } from 'vitest';
import {
  ALL_DIGITS_MASK,
  CELL_COUNT,
  candidatesMask,
  conflictsOf,
  countFilled,
  isSolved,
  isValid,
  maskDigits,
  maskSize,
  PEERS,
  rowOf,
  colOf,
  boxOf,
  sharesUnit,
  UNITS,
  valueCounts,
} from '../src/core/board.ts';
import type { Grid } from '../src/core/types.ts';

const SOLVED: Grid = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
  .split('')
  .map(Number);

describe('board geometry', () => {
  it('builds 27 units of nine cells each', () => {
    expect(UNITS).toHaveLength(27);
    for (const unit of UNITS) expect(unit).toHaveLength(9);
  });

  it('knows exactly 20 peers per cell', () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      expect(PEERS[index]).toHaveLength(20);
      expect(PEERS[index]).not.toContain(index);
    }
  });

  it('maps cells to row, column and box', () => {
    expect(rowOf(0)).toBe(0);
    expect(colOf(8)).toBe(8);
    expect(boxOf(80)).toBe(8);
    expect(boxOf(0)).toBe(0);
    expect(boxOf(40)).toBe(4);
  });

  it('detects cells sharing a unit', () => {
    expect(sharesUnit(0, 8)).toBe(true);
    expect(sharesUnit(0, 9)).toBe(true);
    expect(sharesUnit(0, 10)).toBe(true);
    expect(sharesUnit(0, 40)).toBe(false);
    expect(sharesUnit(0, 80)).toBe(false);
  });
});

describe('candidates and conflicts', () => {
  it('computes candidates for an empty board', () => {
    const empty: Grid = new Array(CELL_COUNT).fill(0);
    expect(candidatesMask(empty, 0)).toBe(ALL_DIGITS_MASK);
  });

  it('removes digits that already exist in the units', () => {
    const grid: Grid = new Array(CELL_COUNT).fill(0);
    grid[1] = 5;
    grid[9] = 3;
    grid[10] = 7;
    const mask = candidatesMask(grid, 0);
    expect(maskDigits(mask)).not.toContain(5);
    expect(maskDigits(mask)).not.toContain(3);
    expect(maskDigits(mask)).not.toContain(7);
    expect(maskSize(mask)).toBe(6);
  });

  it('returns no candidates for filled cells', () => {
    expect(candidatesMask(SOLVED, 0)).toBe(0);
  });

  it('flags duplicates in rows, columns and boxes', () => {
    const grid: Grid = new Array(CELL_COUNT).fill(0);
    grid[0] = 4;
    grid[1] = 4;
    grid[9] = 4;
    const conflicts = conflictsOf(grid);
    expect(conflicts[0]).toBe(1);
    expect(conflicts[1]).toBe(1);
    expect(conflicts[9]).toBe(1);
    expect(conflicts[2]).toBe(0);
    expect(isValid(grid)).toBe(false);
  });

  it('accepts a fully solved board', () => {
    expect(isSolved(SOLVED)).toBe(true);
    expect(isValid(SOLVED)).toBe(true);
    expect(countFilled(SOLVED)).toBe(CELL_COUNT);
  });

  it('rejects an incomplete board', () => {
    const partial = SOLVED.slice();
    partial[40] = 0;
    expect(isSolved(partial)).toBe(false);
    expect(isValid(partial)).toBe(true);
  });

  it('counts the digits on the board', () => {
    const counts = valueCounts(SOLVED);
    for (let digit = 1; digit <= 9; digit++) expect(counts[digit]).toBe(9);
    expect(counts[0]).toBe(0);
  });
});
