/**
 * Entry point: creates the controller, mounts the view and exposes a small
 * hook for debugging in the console.
 */
import './styles/main.css';
import { App } from './state/app.ts';
import { AppView } from './ui/view.ts';

const app = new App();
const view = new AppView(app);

void view.init().catch((error: unknown) => {
  console.error('[sudoku] failed to start', error);
  const label = document.getElementById('loading-label');
  if (label) label.textContent = app.t('toast.puzzleFromLocal');
});

declare global {
  interface Window {
    /** The running app instance - handy for debugging in the console. */
    sudokuApp?: App;
  }
}

window.sudokuApp = app;
