/**
 * Server side configuration.
 *
 * The API key never reaches the browser: the upstream YouDoSudoku API does not
 * send CORS headers, so it can only be called from a server anyway.
 */
import type { Difficulty } from '../../src/core/types.ts';

/**
 * Convenience default. Set `YOUDOSUDOKU_API_KEY` in the hosting environment
 * (Vercel: Project → Settings → Environment Variables) to override it - for
 * example when you rotate the key or share the repository publicly.
 */
export const FALLBACK_API_KEY = 'r8Lwa8aKysPGyDiasjjGDcF7WHBCJzIV7mgsH4YcRk0';

export const UPSTREAM_URL =
  process.env.YOUDOSUDOKU_API_URL?.trim() || 'https://www.youdosudoku.com/api/';

export function apiKey(): string {
  return process.env.YOUDOSUDOKU_API_KEY?.trim() || FALLBACK_API_KEY;
}

/** Timeout for upstream requests in milliseconds. */
export function upstreamTimeoutMs(): number {
  const parsed = Number(process.env.YOUDOSUDOKU_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7_000;
}

/**
 * Optional comma separated list of origins that may call the endpoint from a
 * browser. Leave empty for same-origin usage only.
 */
export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Puzzles kept ready per difficulty to absorb traffic spikes. */
export const POOL_SIZE = Number(process.env.PUZZLE_POOL_SIZE ?? 2);

export type { Difficulty };
