/**
 * Application controller.
 *
 * Owns the game, the settings and the UI state. Every user action goes through
 * this class, which keeps the rendering in sync: whoever calls a method here
 * can rely on the affected views being notified through `events`.
 *
 * Nothing is persisted - a reload always starts from a fresh puzzle.
 */
import { Game } from '../core/game.ts';
import type { Difficulty, Puzzle } from '../core/types.ts';
import { createTranslator, detectDeviceLanguage } from '../i18n/index.ts';
import type { Language, TranslationKey, Translator } from '../i18n/index.ts';
import { deliverPuzzle } from '../services/puzzleService.ts';
import type { PuzzleOrigin } from '../services/puzzleService.ts';
import { createSettings } from './settings.ts';
import type { Settings } from './settings.ts';
import { Emitter } from './store.ts';
import { resolveTheme } from '../ui/theme.ts';

export type AppEvent =
  | 'loading'
  | 'board'
  | 'panel'
  | 'dialog'
  | 'settings'
  | 'language'
  | 'toast';

export type DialogKind = 'none' | 'settings' | 'win' | 'confirm-new-game';

export type LoadingPhase = 'requesting' | 'generating';

export interface WinSummary {
  difficulty: Difficulty;
  mistakes: number;
  hints: number;
  flawless: boolean;
}

export interface UiState {
  loading: LoadingPhase | null;
  dialog: DialogKind;
  selectedDifficulty: Difficulty;
  lastWin: WinSummary | null;
  /** Whether the on-screen number pad is expanded (mainly for touch devices). */
  keypadOpen: boolean;
}

export interface ToastMessage {
  text: string;
  tone: 'info' | 'success';
}

export class App {
  readonly events = new Emitter<AppEvent>();

  game: Game | null = null;
  origin: PuzzleOrigin = 'api';
  settings: Settings = createSettings();
  ui: UiState;
  toast: ToastMessage | null = null;

  private translator: Translator;
  private currentLanguage: Language;
  private pendingRequest: AbortController | null = null;

  constructor() {
    // Nothing is persisted, so the first run adopts the device language;
    // from then on the user can only choose between German and English.
    this.settings = { ...createSettings(), language: detectDeviceLanguage() };
    this.currentLanguage = this.settings.language;
    this.translator = createTranslator(this.currentLanguage);

    this.ui = {
      loading: null,
      dialog: 'none',
      selectedDifficulty: 'easy',
      lastWin: null,
      keypadOpen: false,
    };
  }

  // ------------------------------------------------------------------ basics

  get language(): Language {
    return this.currentLanguage;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.translator(key, params);
  }

  get isBusy(): boolean {
    return this.ui.loading !== null;
  }

  // --------------------------------------------------------------- new game

  /** Starts a new game, asking no questions. */
  async startNewGame(difficulty: Difficulty): Promise<void> {
    if (this.isBusy) return;
    this.ui.selectedDifficulty = difficulty;
    this.ui.loading = 'requesting';
    this.ui.lastWin = null;
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

  /** "New game" button: asks first when the player already made moves. */
  requestNewGame(): void {
    const game = this.game;
    const inProgress = game !== null && game.status === 'playing' && game.canUndo();
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
    if (this.isBusy) return;
    const current = this.game?.difficulty ?? this.ui.selectedDifficulty;
    if (difficulty === current && this.game) return;
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
    this.events.emit('board');
    this.events.emit('panel');
  }

  // ------------------------------------------------------------------ input

  selectCell(index: number): void {
    if (!this.game) return;
    if (this.game.select(index)) {
      this.events.emit('board');
      this.events.emit('panel');
    }
  }

  moveSelection(deltaRow: number, deltaCol: number): void {
    if (!this.game) return;
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

  /** Shows or hides the on-screen number pad. */
  toggleKeypad(): void {
    this.ui.keypadOpen = !this.ui.keypadOpen;
    this.events.emit('panel');
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

  // -------------------------------------------------------------- dialogs

  setDialog(dialog: DialogKind): void {
    if (this.ui.dialog === dialog) return;
    this.ui.dialog = dialog;
    this.events.emit('dialog');
  }

  openSettings(): void {
    this.setDialog('settings');
  }

  closeDialog(): void {
    this.setDialog('none');
  }

  // ------------------------------------------------------------- settings

  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    if (key === 'autoRemoveNotes' && this.game) {
      this.game.autoRemoveNotes = this.settings.autoRemoveNotes;
    }
    if (key === 'language') this.applyLanguage();
    this.events.emit('settings');
    this.events.emit('panel');
    this.events.emit('board');
  }

  /** The theme actually shown: `system` resolves to the current OS preference. */
  get resolvedTheme(): 'light' | 'dark' {
    return resolveTheme(this.settings.theme);
  }

  applyLanguage(): void {
    this.currentLanguage = this.settings.language;
    this.translator = createTranslator(this.currentLanguage);
    this.events.emit('language');
    this.events.emit('panel');
    this.events.emit('board');
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
    if (!this.game) return;
    this.detectWin();
    this.events.emit('board');
    this.events.emit('panel');
  }

  private detectWin(): void {
    const game = this.game;
    if (!game || game.status !== 'won' || this.ui.lastWin) return;
    this.ui.lastWin = {
      difficulty: game.difficulty,
      mistakes: game.mistakes,
      hints: game.hints,
      flawless: game.mistakes === 0 && game.hints === 0,
    };
    this.setDialog('win');
  }
}
