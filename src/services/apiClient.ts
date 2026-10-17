/**
 * Client for the app's own puzzle endpoint (`/api/puzzle`).
 *
 * The endpoint is a small serverless function that talks to the
 * YouDoSudoku API with a secret key. The browser never sees that key - which
 * is also a technical necessity, because the upstream API does not send CORS
 * headers and therefore cannot be called from the browser at all.
 */
import { CELL_COUNT, conflictsOf } from '../core/board.ts';
import { isDifficulty } from '../core/types.ts';
import type { Difficulty, Grid, Puzzle } from '../core/types.ts';

export const PUZZLE_ENDPOINT = '/api/puzzle';

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Raw response shape of the puzzle endpoint. */
export interface PuzzleResponse {
  difficulty?: unknown;
  puzzle?: unknown;
  solution?: unknown;
  source?: unknown;
}

export class PuzzleRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PuzzleRequestError';
  }
}

/** Requests a puzzle from the app backend. Throws on any kind of failure. */
export async function requestPuzzle(
  difficulty: Difficulty,
  options: RequestOptions = {},
): Promise<Puzzle> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(new Error('timeout')), timeoutMs);
  const signal = combineSignals(options.signal, timeoutController.signal);

  try {
    const response = await fetch(`${PUZZLE_ENDPOINT}?difficulty=${encodeURIComponent(difficulty)}`, {
      signal,
      headers: { accept: 'application/json' },
      credentials: 'omit',
    });
    if (!response.ok) throw new PuzzleRequestError(`HTTP ${response.status}`);
    const data = (await response.json()) as PuzzleResponse;
    return parsePuzzleResponse(data, difficulty);
  } finally {
    clearTimeout(timer);
  }
}

/** Validates and converts a response of the puzzle endpoint. */
export function parsePuzzleResponse(data: unknown, requested: Difficulty): Puzzle {
  if (typeof data !== 'object' || data === null) {
    throw new PuzzleRequestError('invalid payload');
  }
  const raw = data as PuzzleResponse;
  const puzzle = toGrid(raw.puzzle);
  const solution = toGrid(raw.solution);
  if (puzzle === null || solution === null) {
    throw new PuzzleRequestError('invalid board');
  }
  if (solution.some((value) => value === 0)) {
    throw new PuzzleRequestError('incomplete solution');
  }
  if (conflictsOf(solution).some((flag) => flag === 1)) {
    throw new PuzzleRequestError('solution violates sudoku rules');
  }
  for (let index = 0; index < CELL_COUNT; index++) {
    const given = puzzle[index];
    if (given !== 0 && given !== solution[index]) {
      throw new PuzzleRequestError('puzzle and solution disagree');
    }
  }

  return {
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : requested,
    puzzle,
    solution,
    source: raw.source === 'local' ? 'local' : 'youdosudoku',
  };
}

/** Accepts a flat string, a flat array or a 9x9 array of digits. */
export function toGrid(value: unknown): Grid | null {
  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length !== CELL_COUNT) return null;
    return digits.split('').map((char) => Number(char));
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

function combineSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  const anySignal = (AbortSignal as typeof AbortSignal & {
    any?: (signals: AbortSignal[]) => AbortSignal;
  }).any;
  if (typeof anySignal === 'function') return anySignal([a, b]);

  const controller = new AbortController();
  const abort = (signal: AbortSignal) => () => controller.abort(signal.reason);
  a.addEventListener('abort', abort(a), { once: true });
  b.addEventListener('abort', abort(b), { once: true });
  return controller.signal;
}
