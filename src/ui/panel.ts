/**
 * The control panel: status readout, difficulty selector, number pad and
 * action buttons.
 */
import { DIFFICULTIES } from '../core/types.ts';
import type { Difficulty } from '../core/types.ts';
import type { TranslationKey } from '../i18n/index.ts';
import type { App } from '../state/app.ts';
import { el, setAttr, setText, toggleClass } from './dom.ts';
import { icon } from './icons.ts';

function difficultyKey(difficulty: Difficulty): TranslationKey {
  return `difficulty.${difficulty}` as TranslationKey;
}

// --------------------------------------------------------------------- status

export class StatusBar {
  readonly root: HTMLDivElement;
  private readonly mistakesValue: HTMLElement;
  private readonly hintsValue: HTMLElement;

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.mistakesValue = el('strong', { class: 'status-line__value', text: '0' });
    this.hintsValue = el('strong', { class: 'status-line__value', text: '0' });

    const item = (key: TranslationKey, valueNode: HTMLElement) =>
      el('span', { class: 'status-line__item' }, [
        el('span', { class: 'status-line__label', dataset: { i18n: key } }),
        valueNode,
      ]);

    this.root = el('div', {
      class: 'status-line',
      attrs: { 'aria-live': 'polite' },
    }, [
      item('status.mistakes', this.mistakesValue),
      item('status.hints', this.hintsValue),
    ]);
    container.appendChild(this.root);
  }

  render(): void {
    const game = this.app.game;
    setText(this.mistakesValue, game ? String(game.mistakes) : '0');
    setText(this.hintsValue, game ? String(game.hints) : '0');
  }

  translate(): void {
    this.render();
  }
}

// ---------------------------------------------------------------- difficulty

export class DifficultySelector {
  readonly root: HTMLDivElement;
  private readonly buttons = new Map<Difficulty, HTMLButtonElement>();

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.root = el('div', {
      class: 'difficulty',
      attrs: { role: 'radiogroup', 'aria-label': app.t('difficulty.label') },
    });
    for (const difficulty of DIFFICULTIES) {
      const button = el('button', {
        class: 'difficulty__option',
        text: app.t(difficultyKey(difficulty)),
        attrs: { type: 'button', role: 'radio', 'aria-checked': 'false' },
        dataset: { difficulty },
        on: {
          click: () => this.app.setDifficulty(difficulty),
        },
      });
      this.buttons.set(difficulty, button);
      this.root.appendChild(button);
    }
    container.appendChild(this.root);
  }

  render(): void {
    // The board on screen decides the highlight: the API may hand back a
    // puzzle rated differently than the level that was requested.
    const selected = this.app.game?.difficulty ?? this.app.ui.selectedDifficulty;
    for (const [difficulty, button] of this.buttons) {
      setAttr(button, 'aria-checked', difficulty === selected ? 'true' : 'false');
      toggleClass(button, 'is-active', difficulty === selected);
    }
  }

  translate(): void {
    setAttr(this.root, 'aria-label', this.app.t('difficulty.label'));
    for (const [difficulty, button] of this.buttons) {
      setText(button, this.app.t(difficultyKey(difficulty)));
    }
  }
}

// ------------------------------------------------------------------- keypad

export class Keypad {
  readonly root: HTMLDivElement;
  private readonly keys = new Map<number, { button: HTMLButtonElement; count: HTMLElement }>();
  private readonly deleteButton: HTMLButtonElement;

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.root = el('div', {
      class: 'keypad',
      attrs: { role: 'group', 'aria-label': app.t('keypad.label') },
    });
    for (let digit = 1; digit <= 9; digit++) {
      const count = el('span', { class: 'keypad__count' });
      const button = el(
        'button',
        {
          class: 'keypad__key',
          attrs: { type: 'button' },
          dataset: { digit },
          on: { click: () => this.app.inputDigit(digit) },
        },
        [el('span', { class: 'keypad__digit', text: String(digit) }), count],
      );
      this.keys.set(digit, { button, count });
      this.root.appendChild(button);
    }

    // The delete key rounds the pad out to two rows of five on touch screens;
    // CSS hides it on pointer devices, where Backspace does the same job.
    this.deleteButton = el(
      'button',
      {
        class: 'keypad__key keypad__key--delete',
        attrs: { type: 'button' },
        dataset: { action: 'erase' },
        on: { click: () => this.app.eraseCell() },
      },
      [icon('erase', 20)],
    );
    this.root.appendChild(this.deleteButton);

    container.appendChild(this.root);
  }

  render(): void {
    const game = this.app.game;
    setAttr(this.root, 'aria-label', this.app.t('keypad.label'));
    const remaining = game ? game.remaining() : new Array<number>(10).fill(9);
    // Nothing can be entered while a puzzle is loading or already solved, so the
    // whole pad is disabled - the delete key used to be the only one.
    const disabled = this.app.isBusy || game?.status !== 'playing';
    for (const [digit, key] of this.keys) {
      const left = remaining[digit];
      setText(key.count, left > 0 ? String(left) : '✓');
      toggleClass(key.button, 'is-complete', left <= 0);
      // A bare "5 - 3" says nothing to a screen reader; name the action and
      // how many of that digit are still missing.
      setAttr(
        key.button,
        'aria-label',
        left > 0
          ? this.app.t('keypad.key', { digit, left })
          : this.app.t('keypad.keyDone', { digit }),
      );
      key.button.disabled = disabled;
    }
    setAttr(this.deleteButton, 'aria-label', this.app.t('action.erase'));
    this.deleteButton.disabled = disabled;
    toggleClass(this.root, 'is-notes', game?.notesMode === true);
  }
}

// ----------------------------------------------------------------- controls

interface ControlSpec {
  id: string;
  icon: Parameters<typeof icon>[0];
  labelKey: TranslationKey;
  action: () => void;
  primary?: boolean;
}

export class Controls {
  readonly root: HTMLDivElement;
  private readonly buttons = new Map<
    string,
    { button: HTMLButtonElement; label: HTMLElement; labelKey: TranslationKey }
  >();

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    const specs: ControlSpec[] = [
      { id: 'undo', icon: 'undo', labelKey: 'action.undo', action: () => app.undo(), primary: true },
      { id: 'redo', icon: 'redo', labelKey: 'action.redo', action: () => app.redo(), primary: true },
      {
        id: 'erase',
        icon: 'erase',
        labelKey: 'action.erase',
        action: () => app.eraseCell(),
        primary: true,
      },
      {
        id: 'notes',
        icon: 'pencil',
        labelKey: 'action.notes',
        action: () => app.toggleNotesMode(),
        primary: true,
      },
      {
        id: 'hint',
        icon: 'bulb',
        labelKey: 'action.hint',
        action: () => app.useHint(),
        primary: true,
      },
      {
        id: 'keypad',
        icon: 'grid',
        labelKey: 'action.keypadShow',
        action: () => app.toggleKeypad(),
      },
      { id: 'restart', icon: 'refresh', labelKey: 'action.restart', action: () => app.restartGame() },
      {
        id: 'new-game',
        icon: 'plus',
        labelKey: 'action.newGame',
        action: () => app.requestNewGame(),
      },
    ];

    this.root = el('div', { class: 'controls' });
    for (const spec of specs) {
      const label = el('span', { class: 'controls__label', text: app.t(spec.labelKey) });
      const button = el(
        'button',
        {
          class: `controls__button${spec.primary ? ' controls__button--primary' : ''}`,
          attrs: { type: 'button' },
          dataset: { action: spec.id },
          on: { click: spec.action },
        },
        [icon(spec.icon, 20), label],
      );
      this.buttons.set(spec.id, { button, label, labelKey: spec.labelKey });
      this.root.appendChild(button);
    }
    container.appendChild(this.root);
  }

  render(): void {
    const game = this.app.game;
    const busy = this.app.isBusy;
    const playing = game?.status === 'playing';
    const setDisabled = (id: string, disabled: boolean): void => {
      const entry = this.buttons.get(id);
      if (entry) entry.button.disabled = disabled;
    };

    setDisabled('undo', busy || !game?.canUndo());
    setDisabled('redo', busy || !game?.canRedo());
    setDisabled('erase', busy || !playing);
    setDisabled('hint', busy || !playing);
    setDisabled('restart', busy || !game);

    const notesEntry = this.buttons.get('notes');
    if (notesEntry) {
      notesEntry.button.disabled = busy || !playing;
      // The caption follows the mode, so it has to be refreshed on every render
      // - not only when the language changes.
      setText(notesEntry.label, this.app.t(game?.notesMode ? 'action.notesOn' : 'action.notes'));
      setAttr(notesEntry.button, 'aria-pressed', game?.notesMode ? 'true' : 'false');
      toggleClass(notesEntry.button, 'is-active', game?.notesMode === true);
    }

    const keypadEntry = this.buttons.get('keypad');
    if (keypadEntry) {
      const open = this.app.ui.keypadOpen;
      setText(keypadEntry.label, this.app.t(open ? 'action.keypadHide' : 'action.keypadShow'));
      setAttr(keypadEntry.button, 'aria-pressed', open ? 'true' : 'false');
      toggleClass(keypadEntry.button, 'is-active', open);
    }
  }

  translate(): void {
    for (const entry of this.buttons.values()) {
      setText(entry.label, this.app.t(entry.labelKey));
    }
    const notesEntry = this.buttons.get('notes');
    if (notesEntry) {
      setText(
        notesEntry.label,
        this.app.t(this.app.game?.notesMode ? 'action.notesOn' : 'action.notes'),
      );
    }
    const keypadEntry = this.buttons.get('keypad');
    if (keypadEntry) {
      setText(
        keypadEntry.label,
        this.app.t(this.app.ui.keypadOpen ? 'action.keypadHide' : 'action.keypadShow'),
      );
    }
  }
}

