/**
 * Application controller.
 *
 * Owns the game, the settings, the statistics and the UI state. Every user
 * action goes through this class, which keeps the persistence and the
 * rendering in sync: whoever calls a method here can rely on the affected
 * views being notified through `events`.
 */
import { Game } from '../core/game.ts';
import { loadJson, removeKey, saveJson, STORAGE_KEYS } from '../core/storage.ts';
import { normalizeStats, createStats, recordStart, recordWin, winRate } from '../core/stats.ts';
import type { Stats } from '../core/stats.ts';
import type { Difficulty, Puzzle } from '../core/types.ts';
import { createTranslator, detectLanguage } from '../i18n/index.ts';
import type { Language, TranslationKey, Translator } from '../i18n/index.ts';
import { clearCache, deliverPuzzle } from '../services/puzzleService.ts';
import type { PuzzleOrigin } from '../services/puzzleService.ts';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.ts';
import type { Settings } from './settings.ts';
import { Emitter } from './store.ts';

export type AppEvent =
  | 'loading'
  | 'board'
  | 'panel'
  | 'dialog'
  | 'settings'
  | 'stats'
  | 'language'
  | 'tick'
  | 'toast';

export type DialogKind =
  | 'none'
  | 'settings'
  | 'stats'
  | 'win'
  | 'paused'
  | 'confirm-new-game';

export type LoadingPhase = 'requesting' | 'generating';

export interface WinSummary {
  difficulty: Difficulty;
  timeMs: number;
  mistakes: number;
  hints: number;
  flawless: boolean;
  newRecord: boolean;
  streak: number;
}

export interface UiState {
  loading: LoadingPhase | null;
  dialog: DialogKind;
  selectedDifficulty: Difficulty;
  /** `true` after the player pressed "check": wrong cells stay marked. */
  revealErrors: boolean;
  lastWin: WinSummary | null;
}

export interface ToastMessage {
  text: string;
  tone: 'info' | 'success';
}

const SAVE_DELAY_MS = 400;
const TICK_INTERVAL_MS = 250;

export class App {
  readonly events = new Emitter<AppEvent>();

  game: Game | null = null;
  origin: PuzzleOrigin = 'cache';
  settings: Settings;
  stats: Stats;
  ui: UiState;
  toast: ToastMessage | null = null;

  private translator: Translator;
  private currentLanguage: Language;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRequest: AbortController | null = null;

  constructor() {
    this.settings = loadSettings();
    this.stats = normalizeStats(loadJson<unknown>(STORAGE_KEYS.stats));
    this.currentLanguage = detectLanguage(this.settings.language);
    this.translator = createTranslator(this.currentLanguage);

    const restored = Game.restore(loadJson<unknown>(STORAGE_KEYS.game));
    this.game = restored && !restored.puzzle.every((value) => value === 0) ? restored : null;
    if (this.game) {
      this.game.autoRemoveNotes = this.settings.autoRemoveNotes;
      this.origin = this.game.source === 'youdosudoku' ? 'api' : 'local';
    }

    this.ui = {
      loading: null,
      dialog: this.game?.paused ? 'paused' : 'none',
      selectedDifficulty: this.game?.difficulty ?? 'easy',
      revealErrors: false,
      lastWin: null,
    };
  }

  // ------------------------------------------------------------------ basics

  get language(): Language {
    return this.currentLanguage;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.translator(key, params);
  }

  get winRate(): number | null {
    return this.game ? winRate(this.stats, this.game.difficulty) : null;
  }

  get isBusy(): boolean {
    return this.ui.loading !== null;
  }

  // ------------------------------------------------------------- lifecycle

  /** Starts the clock ticker and the auto-save lifecycle hooks. */
  start(): void {
    this.ensureTicker();
  }

  dispose(): void {
    this.stopTicker();
    this.flushSave();
  }

  // --------------------------------------------------------------- new game

  /** Starts a new game, asking no questions. */
  async startNewGame(difficulty: Difficulty): Promise<void> {
    if (this.isBusy) return;
    this.ui.selectedDifficulty = difficulty;
    this.ui.loading = 'requesting';
    this.ui.lastWin = null;
    this.ui.revealErrors = false;
    this.setDialog('none');
    this.events.emit('loading');
    this.events.emit('panel');

    this.pendingRequest?.abort();
    const controller = new AbortController();
    this.pendingRequest = controller;

    try {
      const { puzzle, origin } = await deliverPuzzle(difficulty, {
        signal: controller.signal,
        onPhase: (phase) => {
          this.ui.loading = phase;
          this.events.emit('loading');
        },
      });
      if (controller.signal.aborted) return;
      this.adoptPuzzle(puzzle, origin);
      if (origin === 'local' && puzzle.source !== 'local') {
        this.showToast(this.t('toast.puzzleFromLocal'), 'info');
      }
    } catch {
      this.showToast(this.t('toast.puzzleFromLocal'), 'info');
    } finally {
      if (this.pendingRequest === controller) this.pendingRequest = null;
      this.ui.loading = null;
      this.events.emit('loading');
    }
  }

  /** "New game" button: asks first when a game is in progress. */
  requestNewGame(): void {
    const game = this.game;
    const inProgress =
      game !== null && game.status === 'playing' && game.progress() > 0.02;
    if (inProgress) {
      this.setDialog('confirm-new-game');
      return;
    }
    void this.startNewGame(this.ui.selectedDifficulty);
  }

  /** Restarts the current puzzle from scratch (same board). */
  restartGame(): void {
    const game = this.game;
    if (!game) {
      void this.startNewGame(this.ui.selectedDifficulty);
      return;
    }
    this.adoptPuzzle(
      {
        difficulty: game.difficulty,
        puzzle: game.puzzle.slice(),
        solution: game.solution.slice(),
        source: game.source,
      },
      this.origin,
    );
  }

  setDifficulty(difficulty: Difficulty): void {
    if (this.ui.selectedDifficulty === difficulty && this.isBusy) return;
    this.ui.selectedDifficulty = difficulty;
    this.events.emit('panel');
    void this.startNewGame(difficulty);
  }

  private adoptPuzzle(puzzle: Puzzle, origin: PuzzleOrigin): void {
    const game = new Game(puzzle);
    game.autoRemoveNotes = this.settings.autoRemoveNotes;
    this.game = game;
    this.origin = origin;
    this.ui.loading = null;
    this.ui.revealErrors = false;
    this.stats = recordStart(this.stats, puzzle.difficulty);
    this.persistStats();
    this.saveNow();
    this.ensureTicker();
    this.events.emit('board');
    this.events.emit('panel');
    this.events.emit('stats');
  }

  // ------------------------------------------------------------------ input

  selectCell(index: number): void {
    if (!this.game) return;
    if (this.game.paused) return;
    if (this.game.select(index)) {
      this.events.emit('board');
      this.events.emit('panel');
    }
  }

  moveSelection(deltaRow: number, deltaCol: number): void {
    if (!this.game || this.game.paused) return;
    if (this.game.moveSelection(deltaRow, deltaCol)) {
      this.events.emit('board');
      this.events.emit('panel');
    }
  }

  inputDigit(digit: number): void {
    if (!this.game) return;
    if (this.game.input(digit)) this.afterEdit();
  }

  eraseCell(): void {
    if (!this.game) return;
    if (this.game.erase()) this.afterEdit();
  }

  toggleNotesMode(): void {
    if (!this.game) return;
    this.game.toggleNotesMode();
    this.events.emit('panel');
    this.events.emit('board');
  }

  fillNotes(): void {
    if (!this.game) return;
    const filled = this.game.fillAutoNotes();
    this.showToast(
      filled > 0 ? this.t('toast.notesFilled') : this.t('toast.notesNothing'),
      'info',
    );
    if (filled > 0) this.afterEdit();
  }

  useHint(): void {
    if (!this.game) return;
    const index = this.game.hint();
    if (index === null) return;
    this.showToast(this.t('toast.hintUsed'), 'info');
    this.afterEdit();
  }

  undo(): void {
    if (!this.game) return;
    if (this.game.undo()) this.afterEdit();
  }

  redo(): void {
    if (!this.game) return;
    if (this.game.redo()) this.afterEdit();
  }

  /** Marks every wrong entry (the check button). */
  checkBoard(): void {
    const game = this.game;
    if (!game) return;
    this.ui.revealErrors = true;
    const hasMistakes = game.hasMistakesOnBoard();
    this.showToast(
      hasMistakes ? this.t('toast.checkFound') : this.t('toast.checkClean'),
      hasMistakes ? 'info' : 'success',
    );
    this.events.emit('board');
  }

  togglePause(): void {
    const game = this.game;
    if (!game || game.status === 'won') return;
    const paused = game.togglePause();
    this.ui.dialog = paused ? 'paused' : 'none';
    this.saveNow();
    this.events.emit('dialog');
    this.events.emit('panel');
    this.events.emit('board');
  }

  setPaused(paused: boolean): void {
    const game = this.game;
    if (!game || game.status === 'won' || game.paused === paused) return;
    if (paused) game.pause();
    else game.resume();
    this.ui.dialog = paused ? 'paused' : 'none';
    this.saveNow();
    this.events.emit('dialog');
    this.events.emit('panel');
  }

  // -------------------------------------------------------------- dialogs

  setDialog(dialog: DialogKind): void {
    if (this.ui.dialog === dialog) return;
    if (dialog !== 'paused' && this.game?.paused && this.ui.dialog === 'paused') {
      this.game.resume();
    }
    this.ui.dialog = dialog;
    this.events.emit('dialog');
  }

  openSettings(): void {
    this.setDialog('settings');
  }

  openStatistics(): void {
    this.setDialog('stats');
  }

  closeDialog(): void {
    this.setDialog('none');
  }

  // ------------------------------------------------------------- settings

  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    saveSettings(this.settings);
    if (key === 'autoRemoveNotes' && this.game) {
      this.game.autoRemoveNotes = this.settings.autoRemoveNotes;
    }
    if (key === 'language') this.applyLanguage();
    this.events.emit('settings');
    this.events.emit('panel');
    this.events.emit('board');
  }

  cycleTheme(): void {
    const order: Settings['theme'][] = ['system', 'light', 'dark'];
    const index = order.indexOf(this.settings.theme);
    this.updateSetting('theme', order[(index + 1) % order.length]);
  }

  toggleLanguage(): void {
    this.updateSetting('language', this.currentLanguage === 'de' ? 'en' : 'de');
  }

  applyLanguage(): void {
    this.currentLanguage = detectLanguage(this.settings.language);
    this.translator = createTranslator(this.currentLanguage);
    this.events.emit('language');
    this.events.emit('panel');
    this.events.emit('board');
  }

  resetStatistics(): void {
    this.stats = createStats();
    this.persistStats();
    this.events.emit('stats');
    this.showToast(this.t('toast.statsReset'), 'info');
  }

  clearPuzzleCache(): void {
    clearCache();
    this.showToast(this.t('toast.cacheCleared'), 'info');
  }

  // ----------------------------------------------------------------- toast

  showToast(text: string, tone: ToastMessage['tone'] = 'info'): void {
    this.toast = { text, tone };
    this.events.emit('toast');
  }

  clearToast(): void {
    this.toast = null;
    this.events.emit('toast');
  }

  // ----------------------------------------------------------------- share

  /** Result text for the clipboard; returns `false` when copying failed. */
  async shareResult(): Promise<boolean> {
    const game = this.game;
    if (!game) return false;
    const summary = this.ui.lastWin;
    const lines = [
      `${this.t('brand.name')} · ${this.t(`difficulty.${game.difficulty}` as TranslationKey)}`,
      `${this.t('win.time')}: ${formatDuration(game.elapsedMs())}`,
      `${this.t('win.mistakes')}: ${summary?.mistakes ?? game.mistakes}`,
      `${this.t('win.hints')}: ${summary?.hints ?? game.hints}`,
      typeof location !== 'undefined' ? location.origin : '',
    ].filter(Boolean);

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------- internals

  private afterEdit(): void {
    const game = this.game;
    if (!game) return;
    if (this.ui.revealErrors && !game.hasMistakesOnBoard()) this.ui.revealErrors = false;
    this.detectWin();
    this.scheduleSave();
    this.events.emit('board');
    this.events.emit('panel');
  }

  private detectWin(): void {
    const game = this.game;
    if (!game || game.status !== 'won' || this.ui.lastWin) return;

    const timeMs = game.elapsedMs();
    const previousBest = this.stats.byDifficulty[game.difficulty].bestMs;
    const newRecord = previousBest === null || timeMs < previousBest;
    this.stats = recordWin(this.stats, game.difficulty, {
      timeMs,
      mistakes: game.mistakes,
      hints: game.hints,
    });
    this.persistStats();
    this.ui.lastWin = {
      difficulty: game.difficulty,
      timeMs,
      mistakes: game.mistakes,
      hints: game.hints,
      flawless: game.mistakes === 0 && game.hints === 0,
      newRecord,
      streak: this.stats.byDifficulty[game.difficulty].streak,
    };
    this.stopTicker();
    this.saveNow();
    this.setDialog('win');
    this.events.emit('stats');
  }

  private ensureTicker(): void {
    if (this.ticker !== null) return;
    this.ticker = setInterval(() => {
      const game = this.game;
      if (!game || game.status === 'won' || game.paused) return;
      this.events.emit('tick');
    }, TICK_INTERVAL_MS);
  }

  private stopTicker(): void {
    if (this.ticker === null) return;
    clearInterval(this.ticker);
    this.ticker = null;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, SAVE_DELAY_MS);
  }

  saveNow(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.game) {
      removeKey(STORAGE_KEYS.game);
      return;
    }
    saveJson(STORAGE_KEYS.game, this.game.serialize());
  }

  private flushSave(): void {
    this.saveNow();
  }

  private persistStats(): void {
    saveJson(STORAGE_KEYS.stats, this.stats);
  }

  /** Default settings, exposed for the settings dialog. */
  get defaults(): Settings {
    return DEFAULT_SETTINGS;
  }
}

/** `mm:ss` (or `h:mm:ss` for very long games). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
