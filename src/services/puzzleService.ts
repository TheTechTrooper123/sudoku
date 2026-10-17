/**
 * Puzzle supply chain.
 *
 * Order of preference when a new game is started:
 *
 * 1. a puzzle from the local cache (instant, no network)
 * 2. the backend endpoint (which talks to YouDoSudoku)
 * 3. a puzzle generated in the browser (offline, API outage, quota issues)
 *
 * In the background the cache is refilled so the next new game feels instant.
 */
import { loadJson, saveJson, STORAGE_KEYS } from '../core/storage.ts';
import { DIFFICULTIES } from '../core/types.ts';
import type { Difficulty, Puzzle } from '../core/types.ts';
import { requestPuzzle } from './apiClient.ts';
import { generatePuzzleLocally } from './localGenerator.ts';

export type PuzzleOrigin = 'api' | 'cache' | 'local';
export type PuzzlePhase = 'requesting' | 'generating';

export interface DeliveredPuzzle {
  puzzle: Puzzle;
  origin: PuzzleOrigin;
}

export interface DeliverOptions {
  signal?: AbortSignal;
  /** Timeout for the backend request in milliseconds. */
  timeoutMs?: number;
  onPhase?: (phase: PuzzlePhase) => void;
}

interface PuzzlePool {
  version: 1;
  byDifficulty: Record<Difficulty, Puzzle[]>;
}

const MAX_PER_DIFFICULTY = 2;
const inFlight = new Map<Difficulty, Promise<Puzzle>>();

function emptyPool(): PuzzlePool {
  const byDifficulty = {} as Record<Difficulty, Puzzle[]>;
  for (const difficulty of DIFFICULTIES) byDifficulty[difficulty] = [];
  return { version: 1, byDifficulty };
}

function readPool(): PuzzlePool {
  const raw = loadJson<Partial<PuzzlePool>>(STORAGE_KEYS.pool);
  const pool = emptyPool();
  if (!raw || typeof raw !== 'object' || typeof raw.byDifficulty !== 'object') return pool;
  for (const difficulty of DIFFICULTIES) {
    const entries = raw.byDifficulty?.[difficulty];
    if (!Array.isArray(entries)) continue;
    pool.byDifficulty[difficulty] = entries
      .filter(isUsablePuzzle)
      .slice(0, MAX_PER_DIFFICULTY);
  }
  return pool;
}

function isUsablePuzzle(value: unknown): value is Puzzle {
  if (typeof value !== 'object' || value === null) return false;
  const puzzle = value as Partial<Puzzle>;
  return (
    Array.isArray(puzzle.puzzle) &&
    puzzle.puzzle.length === 81 &&
    Array.isArray(puzzle.solution) &&
    puzzle.solution.length === 81
  );
}

function writePool(pool: PuzzlePool): void {
  saveJson(STORAGE_KEYS.pool, pool);
}

/** Takes a cached puzzle for a level, if one is available. */
export function takeFromCache(difficulty: Difficulty): Puzzle | null {
  const pool = readPool();
  const puzzle = pool.byDifficulty[difficulty].shift() ?? null;
  if (puzzle) writePool(pool);
  return puzzle;
}

/** Adds a puzzle to the cache (ignores duplicates). */
export function addToCache(puzzle: Puzzle): void {
  const pool = readPool();
  const entries = pool.byDifficulty[puzzle.difficulty];
  if (entries.length >= MAX_PER_DIFFICULTY) return;
  const key = puzzle.puzzle.join('');
  if (entries.some((entry) => entry.puzzle.join('') === key)) return;
  entries.push(puzzle);
  writePool(pool);
}

/** Fetches one puzzle from the backend, de-duplicated per difficulty. */
function fetchOnce(difficulty: Difficulty, options: DeliverOptions): Promise<Puzzle> {
  const existing = inFlight.get(difficulty);
  if (existing) return existing;
  const request = requestPuzzle(difficulty, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  }).finally(() => inFlight.delete(difficulty));
  inFlight.set(difficulty, request);
  return request;
}

/** Delivers a playable puzzle, falling back gracefully at every step. */
export async function deliverPuzzle(
  difficulty: Difficulty,
  options: DeliverOptions = {},
): Promise<DeliveredPuzzle> {
  const cached = takeFromCache(difficulty);
  if (cached) {
    void refillCache(cached.difficulty);
    return { puzzle: cached, origin: 'cache' };
  }

  options.onPhase?.('requesting');
  try {
    const puzzle = await fetchOnce(difficulty, options);
    void refillCache(puzzle.difficulty);
    return { puzzle, origin: 'api' };
  } catch {
    options.onPhase?.('generating');
    const puzzle = await generatePuzzleLocally(difficulty);
    addToCache(puzzle);
    return { puzzle, origin: 'local' };
  }
}

/** Warms the cache in the background; never throws. */
export async function refillCache(difficulty: Difficulty): Promise<void> {
  const pool = readPool();
  if (pool.byDifficulty[difficulty].length > 0) return;
  try {
    const puzzle = await fetchOnce(difficulty, { timeoutMs: 8_000 });
    addToCache(puzzle);
  } catch {
    /* offline or quota exceeded - the generator covers us */
  }
}

/** Clears the puzzle cache (used by the settings reset). */
export function clearCache(): void {
  writePool(emptyPool());
}
