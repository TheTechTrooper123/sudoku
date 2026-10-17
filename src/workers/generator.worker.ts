/**
 * Worker entry point: generates puzzles off the main thread.
 */
import { generatePuzzle } from '../core/generator.ts';
import type { Difficulty, Puzzle } from '../core/types.ts';

interface GenerateRequest {
  requestId: number;
  difficulty: Difficulty;
}

self.addEventListener('message', (event: MessageEvent<GenerateRequest>) => {
  const { requestId, difficulty } = event.data ?? ({} as GenerateRequest);
  if (typeof requestId !== 'number' || !difficulty) return;
  try {
    const generated = generatePuzzle({ difficulty });
    const puzzle: Puzzle = {
      difficulty: generated.difficulty,
      puzzle: generated.puzzle,
      solution: generated.solution,
      source: 'local',
    };
    self.postMessage({ requestId, puzzle });
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : 'generation failed',
    });
  }
});
