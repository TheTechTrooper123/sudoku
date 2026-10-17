import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/puzzle.ts';
import { resetPool } from '../api/_lib/pool.ts';
import { resetRateLimits } from '../api/_lib/rateLimit.ts';
import { hasUniqueSolution } from '../src/core/solver.ts';
import { EASY_PUZZLE_STRING, EASY_SOLUTION_STRING, gridOf } from './helpers.ts';

interface FakeResponse extends ServerResponse {
  status: number;
  body: unknown;
  headers: Map<string, string>;
}

function makeRequest(options: {
  method?: string;
  url?: string;
  body?: string;
  headers?: Record<string, string>;
  ip?: string;
}): IncomingMessage {
  const stream = Readable.from(options.body ? [Buffer.from(options.body)] : []);
  const request = stream as unknown as IncomingMessage;
  request.method = options.method ?? 'GET';
  request.url = options.url ?? '/api/puzzle?difficulty=easy';
  request.headers = { host: 'localhost', ...(options.headers ?? {}) };
  (request as unknown as { socket: { remoteAddress: string } }).socket = {
    remoteAddress: options.ip ?? '203.0.113.7',
  };
  return request;
}

function makeResponse(): FakeResponse {
  const headers = new Map<string, string>();
  const response = {
    statusCode: 200,
    headers,
    get status(): number {
      return response.statusCode;
    },
    set body(value: unknown) {
      response.payload = value;
    },
    get body(): unknown {
      return response.payload;
    },
    payload: undefined as unknown,
    setHeader(name: string, value: string): void {
      headers.set(name.toLowerCase(), String(value));
    },
    end(chunk?: string): void {
      if (typeof chunk === 'string') {
        try {
          response.payload = JSON.parse(chunk);
        } catch {
          response.payload = chunk;
        }
      }
    },
  };
  return response as unknown as FakeResponse;
}

/** Builds an upstream-like 9x9 array response. */
function upstreamPayload(
  puzzle: string,
  solution: string,
  difficulty = 'medium',
): unknown {
  const toRows = (value: string): string[][] => {
    const digits = value.split('');
    return Array.from({ length: 9 }, (_, row) => digits.slice(row * 9, row * 9 + 9));
  };
  return { difficulty, puzzle: toRows(puzzle), solution: toRows(solution) };
}

const fetchMock = vi.fn();

beforeEach(() => {
  resetPool();
  resetRateLimits();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ALLOWED_ORIGINS;
});

describe('GET /api/puzzle', () => {
  it('serves a validated puzzle from the upstream API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING),
    });

    const response = makeResponse();
    await handler(makeRequest({ url: '/api/puzzle?difficulty=medium' }), response);

    expect(response.status).toBe(200);
    const firstCall = fetchMock.mock.calls[0] as [string];
    expect(firstCall[0]).toContain('youdosudoku.com');
    const body = response.body as { difficulty: string; puzzle: string; solution: string; source: string };
    expect(body.source).toBe('youdosudoku');
    expect(body.puzzle).toHaveLength(81);
    expect(body.solution).toHaveLength(81);
    expect(body.difficulty).toBe('medium');
    expect(body.puzzle).toBe(EASY_PUZZLE_STRING);
  });

  it('forwards the api key and the requested difficulty upstream', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING),
    });

    await handler(makeRequest({ url: '/api/puzzle?difficulty=hard' }), makeResponse());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('youdosudoku.com');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBeTruthy();
    expect(JSON.parse(String(init.body))).toMatchObject({ difficulty: 'hard' });
  });

  it('falls back to a locally generated puzzle when upstream fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const response = makeResponse();
    await handler(makeRequest({ url: '/api/puzzle?difficulty=easy' }), response);

    expect(response.status).toBe(200);
    const body = response.body as { difficulty: string; puzzle: string; solution: string; source: string };
    expect(body.source).toBe('local');
    expect(body.puzzle).toHaveLength(81);
    const puzzle = gridOf(body.puzzle);
    expect(hasUniqueSolution(puzzle)).toBe(true);
  });

  it('rejects an invalid difficulty', async () => {
    const response = makeResponse();
    await handler(makeRequest({ url: '/api/puzzle?difficulty=impossible' }), response);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods', async () => {
    const response = makeResponse();
    await handler(makeRequest({ method: 'PUT' }), response);
    expect(response.status).toBe(405);
  });

  it('accepts the difficulty in a JSON body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING),
    });
    const response = makeResponse();
    await handler(
      makeRequest({
        method: 'POST',
        url: '/api/puzzle',
        body: JSON.stringify({ difficulty: 'medium' }),
        headers: { 'content-type': 'application/json' },
      }),
      response,
    );
    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({ difficulty: 'medium' });
  });

  it('rate limits by client', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING),
    });
    let last = makeResponse();
    for (let attempt = 0; attempt < 13; attempt++) {
      last = makeResponse();
      await handler(makeRequest({ url: '/api/puzzle?difficulty=easy' }), last);
    }
    expect(last.status).toBe(429);
  });

  it('serves follow-up requests from the pool', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING, 'easy'),
    });

    const first = makeResponse();
    await handler(makeRequest({ url: '/api/puzzle?difficulty=easy' }), first);
    expect((first.body as { source: string }).source).toBe('youdosudoku');

    // Let the background refill finish, then break the upstream connection:
    // a pooled puzzle still arrives, an upstream call would fall back to
    // local generation.
    await new Promise((resolve) => setTimeout(resolve, 30));
    fetchMock.mockRejectedValue(new Error('upstream down'));

    const second = makeResponse();
    await handler(makeRequest({ url: '/api/puzzle?difficulty=easy' }), second);
    expect(second.status).toBe(200);
    expect((second.body as { source: string }).source).toBe('youdosudoku');
  });

  it('only sends CORS headers for allowed origins', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamPayload(EASY_PUZZLE_STRING, EASY_SOLUTION_STRING),
    });

    const blocked = makeResponse();
    await handler(
      makeRequest({ url: '/api/puzzle?difficulty=easy', headers: { origin: 'https://evil.example' } }),
      blocked,
    );
    expect(blocked.headers.has('access-control-allow-origin')).toBe(false);

    process.env.ALLOWED_ORIGINS = 'https://sudoku.example';
    const allowed = makeResponse();
    await handler(
      makeRequest({
        url: '/api/puzzle?difficulty=easy',
        headers: { origin: 'https://sudoku.example' },
      }),
      allowed,
    );
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://sudoku.example');
  });
});
