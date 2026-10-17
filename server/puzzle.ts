/**
 * `GET|POST /api/puzzle?difficulty=easy|medium|hard|expert`
 *
 * Serverless endpoint that hands out a playable puzzle:
 *
 * 1. the in-memory pool (instant)
 * 2. the YouDoSudoku API - the API key stays on the server
 * 3. the built-in generator (when upstream is unavailable)
 *
 * The response always contains a flat board string of 81 digits (`0` = empty)
 * for the puzzle and its solution.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { generatePuzzle } from '../src/core/generator.ts';
import { isDifficulty } from '../src/core/types.ts';
import type { Difficulty } from '../src/core/types.ts';
import { allowedOrigins } from './lib/config.ts';
import { takePuzzle, scheduleRefill } from './lib/pool.ts';
import { allowRequest } from './lib/rateLimit.ts';
import { UpstreamError } from './lib/upstream.ts';
import type { PuzzleEntry, PuzzleSource } from './lib/upstream.ts';

export interface PuzzlePayload {
  difficulty: Difficulty;
  puzzle: string;
  solution: string;
  source: PuzzleSource;
}

const MAX_BODY_BYTES = 8 * 1024;
/** Time budget for the in-process fallback generator. */
const FALLBACK_BUDGET_MS = 3_000;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  const client = clientKey(req);
  if (!allowRequest(client)) {
    res.setHeader('retry-after', '30');
    sendJson(res, 429, { error: 'Too many requests. Please slow down.' });
    return;
  }

  const requested = await readDifficulty(req);
  if (!isDifficulty(requested)) {
    sendJson(res, 400, {
      error: "Invalid 'difficulty'. Use 'easy', 'medium', 'hard' or 'expert'.",
    });
    return;
  }

  try {
    const entry = await takePuzzle(requested);
    sendJson(res, 200, toPayload(entry));
    // Keep the pool warm for the next player without delaying this response.
    scheduleRefill(requested);
  } catch (error) {
    // Upstream failed: never leave the player without a puzzle.
    const generated = generatePuzzle({ difficulty: requested, timeBudgetMs: FALLBACK_BUDGET_MS });
    const payload = toPayload({
      difficulty: generated.difficulty,
      puzzle: generated.puzzle,
      solution: generated.solution,
      source: 'local',
    });
    if (error instanceof UpstreamError) {
      console.warn('[api/puzzle] upstream failed, serving a local puzzle:', error.message);
    } else {
      console.warn('[api/puzzle] unexpected upstream failure:', error);
    }
    sendJson(res, 200, payload);
  }
}

function toPayload(entry: PuzzleEntry): PuzzlePayload {
  return {
    difficulty: entry.difficulty,
    puzzle: entry.puzzle.join(''),
    solution: entry.solution.join(''),
    source: entry.source,
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex');
  res.setHeader('content-length', Buffer.byteLength(payload));
  res.end(payload);
}

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origins = allowedOrigins();
  if (origins.length === 0) return;
  const origin = req.headers.origin;
  if (typeof origin !== 'string') return;
  if (!origins.includes(origin) && !origins.includes('*')) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('vary', 'origin');
}

function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

/** Reads the difficulty from the query string or a small JSON body. */
async function readDifficulty(req: IncomingMessage): Promise<unknown> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const fromQuery = url.searchParams.get('difficulty');
  if (fromQuery) return fromQuery;
  if (req.method !== 'POST') return 'easy';
  const body = await readJsonBody(req);
  const value = (body as { difficulty?: unknown } | null)?.difficulty;
  return value ?? 'easy';
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}
