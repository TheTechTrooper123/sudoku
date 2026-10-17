/**
 * Runs the puzzle generator in a Web Worker so that generating a fallback
 * puzzle never blocks the UI. Falls back to synchronous generation when
 * workers are not available.
 */
import { generatePuzzle } from '../core/generator.ts';
import type { Difficulty, Puzzle } from '../core/types.ts';

let requestCounter = 0;
let worker: Worker | null = null;
let workerBroken = false;

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/generator.worker.ts', import.meta.url), {
      type: 'module',
      name: 'sudoku-generator',
    });
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function generateSync(difficulty: Difficulty): Puzzle {
  const generated = generatePuzzle({ difficulty });
  return {
    difficulty: generated.difficulty,
    puzzle: generated.puzzle,
    solution: generated.solution,
    source: 'local',
  };
}

function generateInWorker(target: Worker, difficulty: Difficulty): Promise<Puzzle> {
  const requestId = ++requestCounter;
  return new Promise<Puzzle>((resolve, reject) => {
    const cleanup = (): void => {
      target.removeEventListener('message', onMessage);
      target.removeEventListener('error', onError);
      target.removeEventListener('messageerror', onError);
    };
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as { requestId?: number; puzzle?: Puzzle; error?: string };
      if (data?.requestId !== requestId) return;
      cleanup();
      if (data.puzzle) resolve(data.puzzle);
      else reject(new Error(data.error ?? 'generator failed'));
    };
    const onError = (): void => {
      cleanup();
      workerBroken = true;
      reject(new Error('generator worker failed'));
    };
    target.addEventListener('message', onMessage);
    target.addEventListener('error', onError);
    target.addEventListener('messageerror', onError);
    target.postMessage({ requestId, difficulty });
  });
}

/** Generates a puzzle locally, preferring the worker. */
export async function generatePuzzleLocally(difficulty: Difficulty): Promise<Puzzle> {
  const target = getWorker();
  if (target) {
    try {
      return await generateInWorker(target, difficulty);
    } catch {
      /* fall through to synchronous generation */
    }
  }
  return generateSync(difficulty);
}
