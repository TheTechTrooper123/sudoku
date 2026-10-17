/**
 * Puzzle supply chain.
 *
 * A new game asks the backend endpoint (which talks to YouDoSudoku) and falls
 * back to a puzzle generated in the browser when the request fails. Nothing is
 * cached or persisted.
 */
import type { Difficulty, Puzzle } from '../core/types.ts';
import { requestPuzzle } from './apiClient.ts';
import { generatePuzzleLocally } from './localGenerator.ts';

export type PuzzleOrigin = 'api' | 'local';
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

/** De-duplicates concurrent requests per difficulty. */
const inFlight = new Map<Difficulty, Promise<Puzzle>>();

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

/** Delivers a playable puzzle, falling back to the local generator. */
export async function deliverPuzzle(
  difficulty: Difficulty,
  options: DeliverOptions = {},
): Promise<DeliveredPuzzle> {
  options.onPhase?.('requesting');
  try {
    const puzzle = await fetchOnce(difficulty, options);
    return { puzzle, origin: 'api' };
  } catch {
    options.onPhase?.('generating');
    const puzzle = await generatePuzzleLocally(difficulty);
    return { puzzle, origin: 'local' };
  }
}
