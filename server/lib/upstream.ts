/**
 * Client for the upstream YouDoSudoku API.
 *
 * The service is a small Vercel function that talks to
 * `https://www.youdosudoku.com/api/` with the secret API key. Responses are
 * validated before they are handed to a player.
 */
import { CELL_COUNT, conflictsOf } from '../../src/core/board.ts';
import { isDifficulty } from '../../src/core/types.ts';
import type { Difficulty, Grid } from '../../src/core/types.ts';
import { apiKey, UPSTREAM_URL, upstreamTimeoutMs } from './config.ts';

export type PuzzleSource = 'youdosudoku' | 'local';

export interface PuzzleEntry {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  source: PuzzleSource;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/** Fetches one puzzle from YouDoSudoku. Throws `UpstreamError` on failure. */
export async function fetchUpstreamPuzzle(difficulty: Difficulty): Promise<PuzzleEntry> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('upstream timeout')), upstreamTimeoutMs());

  try {
    const response = await fetch(UPSTREAM_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-api-key': apiKey(),
      },
      body: JSON.stringify({ difficulty, solution: true, array: true }),
    });

    if (response.status === 401 || response.status === 403) {
      throw new UpstreamError('upstream rejected the api key', 502);
    }
    if (!response.ok) {
      throw new UpstreamError(`upstream responded with ${response.status}`, 502);
    }

    const payload = (await response.json()) as unknown;
    return parseUpstreamPuzzle(payload, difficulty);
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError(
      error instanceof Error ? `upstream request failed: ${error.message}` : 'upstream request failed',
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Validates the upstream payload and converts it into a flat grid. */
export function parseUpstreamPuzzle(payload: unknown, requested: Difficulty): PuzzleEntry {
  if (typeof payload !== 'object' || payload === null) {
    throw new UpstreamError('upstream payload is not an object');
  }
  const raw = payload as { difficulty?: unknown; puzzle?: unknown; solution?: unknown; error?: unknown };
  if (typeof raw.error === 'string') {
    throw new UpstreamError(`upstream error: ${raw.error}`);
  }

  const puzzle = toGrid(raw.puzzle);
  const solution = toGrid(raw.solution);
  if (puzzle === null || solution === null) {
    throw new UpstreamError('upstream board has an unexpected shape');
  }
  if (solution.some((value) => value === 0)) {
    throw new UpstreamError('upstream solution is incomplete');
  }
  if (conflictsOf(solution).some((flag) => flag === 1)) {
    throw new UpstreamError('upstream solution violates sudoku rules');
  }
  for (let index = 0; index < CELL_COUNT; index++) {
    if (puzzle[index] !== 0 && puzzle[index] !== solution[index]) {
      throw new UpstreamError('upstream puzzle contradicts its solution');
    }
  }

  return {
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : requested,
    puzzle,
    solution,
    source: 'youdosudoku',
  };
}

function toGrid(value: unknown): Grid | null {
  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length !== CELL_COUNT) return null;
    return digits.split('').map(Number);
  }
  if (Array.isArray(value)) {
    const flat = value.flat(2);
    if (flat.length !== CELL_COUNT) return null;
    const grid: Grid = [];
    for (const entry of flat) {
      const digit = typeof entry === 'string' ? Number(entry) : entry;
      if (typeof digit !== 'number' || !Number.isInteger(digit) || digit < 0 || digit > 9) {
        return null;
      }
      grid.push(digit);
    }
    return grid;
  }
  return null;
}
