import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countSolutions, hasUniqueSolution } from '../src/core/solver.ts';
import {
  parsePuzzleResponse,
  PuzzleRequestError,
  requestPuzzle,
  toGrid,
} from '../src/services/apiClient.ts';
import { deliverPuzzle } from '../src/services/puzzleService.ts';
import { EASY_PUZZLE_STRING, EASY_SOLUTION_STRING } from './helpers.ts';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): unknown {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function validPayload(): unknown {
  return {
    difficulty: 'easy',
    puzzle: EASY_PUZZLE_STRING,
    solution: EASY_SOLUTION_STRING,
    source: 'youdosudoku',
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toGrid', () => {
  it('accepts flat strings, flat arrays and 9x9 arrays', () => {
    expect(toGrid(EASY_PUZZLE_STRING)).toEqual(EASY_PUZZLE_STRING.split('').map(Number));
    expect(toGrid(EASY_PUZZLE_STRING.split(''))).toHaveLength(81);
    const rows = Array.from({ length: 9 }, (_, row) =>
      EASY_PUZZLE_STRING.slice(row * 9, row * 9 + 9).split(''),
    );
    expect(toGrid(rows)).toHaveLength(81);
  });

  it('rejects malformed boards', () => {
    expect(toGrid('123')).toBeNull();
    expect(toGrid(['a', 'b'])).toBeNull();
    expect(toGrid(42)).toBeNull();
    expect(toGrid(null)).toBeNull();
    expect(toGrid(new Array(81).fill('x'))).toBeNull();
  });
});

describe('parsePuzzleResponse', () => {
  it('parses and normalises a valid payload', () => {
    const puzzle = parsePuzzleResponse(validPayload(), 'medium');
    expect(puzzle.difficulty).toBe('easy');
    expect(puzzle.puzzle).toHaveLength(81);
    expect(puzzle.solution).toHaveLength(81);
    expect(puzzle.source).toBe('youdosudoku');
  });

  it('falls back to the requested difficulty for unknown labels', () => {
    const payload = { ...(validPayload() as object), difficulty: 'nightmare' };
    expect(parsePuzzleResponse(payload, 'expert').difficulty).toBe('expert');
  });

  it('rejects contradictory puzzles', () => {
    const chars = EASY_PUZZLE_STRING.split('');
    chars[2] = chars[2] === '5' ? '4' : '5';
    const payload = { ...(validPayload() as object), puzzle: chars.join('') };
    expect(() => parsePuzzleResponse(payload, 'easy')).toThrow(PuzzleRequestError);
  });

  it('rejects incomplete or invalid solutions', () => {
    expect(() =>
      parsePuzzleResponse({ ...(validPayload() as object), solution: '0'.repeat(81) }, 'easy'),
    ).toThrow(PuzzleRequestError);
    // Duplicate digit in the first row of the solution.
    const brokenSolution = '3' + EASY_SOLUTION_STRING.slice(1);
    expect(() =>
      parsePuzzleResponse(
        { ...(validPayload() as object), puzzle: EASY_PUZZLE_STRING, solution: brokenSolution },
        'easy',
      ),
    ).toThrow(PuzzleRequestError);
  });

  it('rejects garbage', () => {
    expect(() => parsePuzzleResponse(null, 'easy')).toThrow(PuzzleRequestError);
    expect(() => parsePuzzleResponse({ puzzle: 'x' }, 'easy')).toThrow(PuzzleRequestError);
  });
});

describe('requestPuzzle', () => {
  it('calls the app endpoint and returns a puzzle', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validPayload()));
    const puzzle = await requestPuzzle('easy');
    expect(puzzle.puzzle).toHaveLength(81);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/api/puzzle?difficulty=easy');
  });

  it('throws on HTTP errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'nope' }, 500));
    await expect(requestPuzzle('easy')).rejects.toThrow(PuzzleRequestError);
  });

  it('throws on invalid payloads', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ puzzle: 'oops', solution: 'oops' }));
    await expect(requestPuzzle('easy')).rejects.toThrow(PuzzleRequestError);
  });
});

describe('deliverPuzzle', () => {
  it('returns the puzzle from the API when available', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validPayload()));
    const delivered = await deliverPuzzle('easy', { timeoutMs: 2_000 });
    expect(delivered.origin).toBe('api');
    expect(delivered.puzzle.solution).toHaveLength(81);
  });

  it('generates a puzzle locally when the endpoint fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const phases: string[] = [];
    const delivered = await deliverPuzzle('easy', {
      timeoutMs: 2_000,
      onPhase: (phase) => phases.push(phase),
    });

    expect(delivered.origin).toBe('local');
    expect(delivered.puzzle.source).toBe('local');
    expect(phases).toContain('requesting');
    expect(phases).toContain('generating');
    expect(hasUniqueSolution(delivered.puzzle.puzzle)).toBe(true);
    const solved = countSolutions(delivered.puzzle.puzzle, 1);
    expect(solved.count).toBe(1);
    expect(solved.solution).toEqual(delivered.puzzle.solution);
  });
});
