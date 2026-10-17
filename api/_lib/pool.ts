/**
 * Puzzle pool.
 *
 * Every upstream call costs quota and latency, so generated puzzles are kept
 * in a short lived in-memory pool per difficulty. Serving a puzzle from the
 * pool is instant; the refill happens in the background.
 */
import type { Difficulty } from '../../src/core/types.ts';
import { POOL_SIZE } from './config.ts';
import { fetchUpstreamPuzzle } from './upstream.ts';
import type { PuzzleEntry } from './upstream.ts';

const POOL_TTL_MS = 10 * 60 * 1000;
const inflight = new Map<Difficulty, Promise<PuzzleEntry>>();

interface PooledEntry extends PuzzleEntry {
  createdAt: number;
}

const pools = new Map<Difficulty, PooledEntry[]>();

function fresh(entry: PooledEntry): boolean {
  return Date.now() - entry.createdAt <= POOL_TTL_MS;
}

export function takeFromPool(difficulty: Difficulty): PuzzleEntry | null {
  const pool = pools.get(difficulty);
  if (!pool) return null;
  while (pool.length > 0) {
    const entry = pool.pop() as PooledEntry;
    if (fresh(entry)) return entry;
  }
  return null;
}

export function poolSize(difficulty: Difficulty): number {
  return (pools.get(difficulty) ?? []).filter(fresh).length;
}

export function addToPool(entry: PuzzleEntry): void {
  const pool = pools.get(entry.difficulty) ?? [];
  if (pool.length >= POOL_SIZE) return;
  const key = entry.puzzle.join('');
  if (pool.some((existing) => existing.puzzle.join('') === key)) return;
  pool.push({ ...entry, createdAt: Date.now() });
  pools.set(entry.difficulty, pool);
}

/** Fetches one entry from upstream, de-duplicated per difficulty. */
function fetchOnce(difficulty: Difficulty): Promise<PuzzleEntry> {
  const existing = inflight.get(difficulty);
  if (existing) return existing;
  const request = fetchUpstreamPuzzle(difficulty).finally(() => inflight.delete(difficulty));
  inflight.set(difficulty, request);
  return request;
}

/** Top the pool up without blocking the response. */
export function scheduleRefill(difficulty: Difficulty): void {
  if (poolSize(difficulty) >= POOL_SIZE) return;
  void fetchOnce(difficulty)
    .then((entry) => addToPool(entry))
    .catch(() => {
      /* upstream is unavailable - the caller falls back to local generation */
    });
}

/** Returns a puzzle: pool first, then upstream. Throws when both fail. */
export async function takePuzzle(difficulty: Difficulty): Promise<PuzzleEntry> {
  const pooled = takeFromPool(difficulty);
  if (pooled) return pooled;
  const entry = await fetchOnce(difficulty);
  return entry;
}

/** Test helper. */
export function resetPool(): void {
  pools.clear();
  inflight.clear();
}
