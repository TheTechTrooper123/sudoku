import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/state/app.ts';
import { nearlySolvedPuzzle } from './helpers.ts';

// The supply chain is mocked: this file is about what the app does with the
// answer, not about fetching or generating.
vi.mock('../src/services/puzzleService.ts', () => ({
  deliverPuzzle: vi.fn(async () => ({
    puzzle: { ...nearlySolvedPuzzle([40]), difficulty: 'medium' },
    origin: 'local',
  })),
}));

describe('App with a locally generated puzzle', () => {
  it('tells the player that the API was unavailable', async () => {
    const app = new App();
    await app.startNewGame('easy');

    expect(app.game).not.toBeNull();
    expect(app.origin).toBe('local');
    expect(app.toast?.text).toBe(app.t('toast.puzzleFromLocal'));
  });

  it('adopts the difficulty of the delivered puzzle', async () => {
    const app = new App();
    await app.startNewGame('easy');

    // The level that was requested and the level that arrived differ; the UI
    // must follow the board, not the request.
    expect(app.ui.selectedDifficulty).toBe('medium');
    expect(app.game?.difficulty).toBe('medium');
  });

  it('clears the loading state when the request is done', async () => {
    const app = new App();
    await app.startNewGame('easy');
    expect(app.isBusy).toBe(false);
    expect(app.ui.loading).toBeNull();
  });
});
