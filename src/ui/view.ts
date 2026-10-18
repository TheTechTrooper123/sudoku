/**
 * View orchestrator.
 *
 * Wires the controller (`App`) to the DOM: builds the dynamic regions, keeps
 * them in sync with the app events and owns the global input handling
 * (keyboard, theme).
 */
import type { App, DialogKind } from '../state/app.ts';
import { append, qs, setText, toggleClass } from './dom.ts';
import { BoardView } from './board.ts';
import { ConfirmDialog, SettingsDialog, Toast, WinDialog } from './dialogs.ts';
import { applyDocumentMeta, applyTranslations } from './i18n-dom.ts';
import { icon } from './icons.ts';
import { Controls, DifficultySelector, Keypad, StatusBar } from './panel.ts';
import { applyTheme, watchSystemTheme } from './theme.ts';

const SLOW_LOADING_MS = 3_000;

/** Touch-first devices start with the on-screen number pad visible. */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export class AppView {
  private readonly board: BoardView;
  private readonly status: StatusBar;
  private readonly difficulty: DifficultySelector;
  private readonly keypad: Keypad;
  private readonly controls: Controls;
  private readonly settingsDialog: SettingsDialog;
  private readonly winDialog: WinDialog;
  private readonly confirmDialog: ConfirmDialog;
  private readonly toast: Toast;
  private readonly gameSection: HTMLElement;
  private readonly keypadCard: HTMLElement;
  private readonly loadingOverlay: HTMLElement;
  private readonly loadingLabel: HTMLElement;
  private readonly liveRegion: HTMLElement;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly app: App) {
    this.gameSection = qs('#game');
    this.keypadCard = qs('#keypad-card');
    this.board = new BoardView(app, qs('#board-container'));
    this.status = new StatusBar(app, qs('#status-container'));
    this.difficulty = new DifficultySelector(app, qs('#difficulty-container'));
    this.keypad = new Keypad(app, qs('#keypad-container'));
    this.controls = new Controls(app, qs('#controls-container'));
    this.settingsDialog = new SettingsDialog(app);
    this.winDialog = new WinDialog(app);
    this.confirmDialog = new ConfirmDialog(app);
    this.toast = new Toast(app);

    this.loadingOverlay = qs('#loading-overlay');
    this.loadingLabel = qs('#loading-label');
    this.liveRegion = qs('#live-region');

    // The header is a single quiet icon (the same at every screen size); CSS
    // scales it up slightly on desktop/laptop.
    append(qs('#nav-settings .nav-button__icon'), [icon('sliders', 18)]);

    this.bindHeader();
    this.subscribe();
    this.bindInput();
  }

  /** Boots the view: theme, translations, first game. */
  async init(): Promise<void> {
    applyTheme(this.app.settings.theme);
    watchSystemTheme(() => {
      if (this.app.settings.theme === 'system') applyTheme('system');
    });

    this.applyLanguage();
    this.app.ui.keypadOpen = isTouchDevice();
    this.renderAll();

    document.body.classList.add('is-ready');
    if (!this.app.game) {
      await this.app.startNewGame(this.app.ui.selectedDifficulty);
    }
  }

  // ------------------------------------------------------------- rendering

  private bindHeader(): void {
    qs('#nav-settings').addEventListener('click', () => this.app.openSettings());
  }

  private renderAll(): void {
    this.board.render();
    this.status.render();
    this.difficulty.render();
    this.keypad.render();
    this.renderKeypad();
    this.controls.render();
    this.renderLoading();
    this.renderDialogs();
    this.toast.render();
  }

  private renderBoard(): void {
    this.board.render();
    this.announceSelection();
  }

  private renderPanel(): void {
    this.board.render();
    this.status.render();
    this.difficulty.render();
    this.keypad.render();
    this.renderKeypad();
    this.controls.render();
  }

  private renderKeypad(): void {
    const open = this.app.ui.keypadOpen;
    toggleClass(this.keypadCard, 'is-open', open);
    toggleClass(this.gameSection, 'keypad-open', open);
  }

  private renderLoading(): void {
    const phase = this.app.ui.loading;
    toggleClass(this.loadingOverlay, 'is-visible', phase !== null);
    toggleClass(this.gameSection, 'is-busy', phase !== null);
    toggleClass(this.board.root, 'is-loading', phase !== null);
    if (phase === null) {
      if (this.slowTimer !== null) clearTimeout(this.slowTimer);
      this.slowTimer = null;
      return;
    }
    setText(this.loadingLabel, this.app.t(phase === 'generating' ? 'loading.generating' : 'loading.puzzle'));
    if (this.slowTimer === null) {
      this.slowTimer = setTimeout(() => {
        this.slowTimer = null;
        if (this.app.ui.loading !== null) {
          this.loadingLabel.textContent = `${this.app.t(
            this.app.ui.loading === 'generating' ? 'loading.generating' : 'loading.puzzle',
          )} ${this.app.t('loading.slow')}`;
        }
      }, SLOW_LOADING_MS);
    }
  }

  private renderDialogs(): void {
    const kind: DialogKind = this.app.ui.dialog;

    if (kind === 'settings') {
      this.settingsDialog.render();
      this.settingsDialog.open();
    } else {
      this.settingsDialog.close();
    }

    if (kind === 'win') {
      this.winDialog.render();
      this.winDialog.open();
    } else {
      this.winDialog.close();
    }

    if (kind === 'confirm-new-game') {
      this.confirmDialog.configure(
        'dialog.newGameTitle',
        'dialog.newGameMessage',
        'dialog.startNew',
        () => {
          void this.app.startNewGame(this.app.ui.selectedDifficulty);
        },
      );
      this.confirmDialog.open();
    } else {
      this.confirmDialog.close();
    }
  }

  private applyLanguage(): void {
    const t = this.app.t.bind(this.app);
    applyDocumentMeta(t, this.app.language);
    applyTranslations(document, t);
    this.board.render();
    this.status.translate();
    this.difficulty.translate();
    this.controls.translate();
    this.keypad.render();
    this.renderLoading();
    if (this.settingsDialog.isOpen) this.settingsDialog.render();
    if (this.winDialog.isOpen) this.winDialog.render();
  }

  private announceSelection(): void {
    const game = this.app.game;
    if (!game || game.selected < 0) return;
    const cell = this.board.root.querySelector<HTMLElement>(
      `[data-index="${game.selected}"]`,
    );
    const label = cell?.getAttribute('aria-label');
    if (label) setText(this.liveRegion, label);
  }

  // ------------------------------------------------------------- eventing

  private subscribe(): void {
    const { events } = this.app;

    events.on('board', () => this.renderBoard());
    events.on('panel', () => this.renderPanel());
    events.on('loading', () => this.renderLoading());
    events.on('dialog', () => this.renderDialogs());
    events.on('toast', () => this.toast.render());
    events.on('language', () => this.applyLanguage());
    events.on('settings', () => {
      applyTheme(this.app.settings.theme);
      if (this.settingsDialog.isOpen) this.settingsDialog.render();
      this.renderPanel();
    });
  }

  // -------------------------------------------------------------- input

  private bindInput(): void {
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  private handleKeydown(event: KeyboardEvent): void {
    const app = this.app;

    if (event.key === 'Escape') {
      if (app.ui.dialog !== 'none') {
        event.preventDefault();
        app.closeDialog();
      }
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return;
      }
    }
    if (this.anyDialogOpen()) return;
    if (app.ui.loading !== null) return;

    const modified = event.ctrlKey || event.metaKey;
    const key = event.key;

    if (modified && (key === 'z' || key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) app.redo();
      else app.undo();
      return;
    }
    if (modified && (key === 'y' || key === 'Y')) {
      event.preventDefault();
      app.redo();
      return;
    }
    if (modified || event.altKey) return;

    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return;

    const digit = Number(key);
    if (key.length === 1 && Number.isInteger(digit) && digit >= 1 && digit <= 9) {
      event.preventDefault();
      app.inputDigit(digit);
      return;
    }

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        app.moveSelection(-1, 0);
        return;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        app.moveSelection(1, 0);
        return;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        app.moveSelection(0, -1);
        return;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        app.moveSelection(0, 1);
        return;
      case 'Backspace':
      case 'Delete':
      case '0':
        event.preventDefault();
        app.eraseCell();
        return;
      case 'n':
        app.toggleNotesMode();
        return;
      default:
        return;
    }
  }

  private anyDialogOpen(): boolean {
    return (
      this.settingsDialog.isOpen ||
      this.winDialog.isOpen ||
      this.confirmDialog.isOpen
    );
  }
}
