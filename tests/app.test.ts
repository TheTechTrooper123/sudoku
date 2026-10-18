import { describe, expect, it } from 'vitest';
import { CELL_COUNT } from '../src/core/board.ts';
import { Game } from '../src/core/game.ts';
import { App } from '../src/state/app.ts';
import { nearlySolvedPuzzle } from './helpers.ts';

/** Fills every empty cell of the current board with its solution digit. */
function solve(app: App): void {
  const game = app.game;
  if (!game) throw new Error('no game');
  for (let index = 0; index < CELL_COUNT; index++) {
    if (game.cells[index].value !== 0) continue;
    app.selectCell(index);
    app.inputDigit(game.solution[index]);
  }
}

describe('App', () => {
  it('raises the win dialog again after solving a restarted puzzle', () => {
    const app = new App();
    app.game = new Game(nearlySolvedPuzzle([40, 41]));

    solve(app);
    expect(app.game?.status).toBe('won');
    expect(app.ui.dialog).toBe('win');
    expect(app.ui.lastWin?.flawless).toBe(true);

    app.closeDialog();
    app.restartGame();
    expect(app.game?.status).toBe('playing');
    // A restarted board is a new run - the previous result must not linger,
    // otherwise the second win would never be announced.
    expect(app.ui.lastWin).toBeNull();

    solve(app);
    expect(app.game?.status).toBe('won');
    expect(app.ui.dialog).toBe('win');
    expect(app.ui.lastWin?.flawless).toBe(true);
  });
});
