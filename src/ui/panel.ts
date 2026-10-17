/**
 * The control panel: status readout, difficulty selector, number pad,
 * action buttons and a compact statistics summary.
 */
import { winRate } from '../core/stats.ts';
import { formatPercent } from '../core/format.ts';
import { DIFFICULTIES } from '../core/types.ts';
import type { Difficulty } from '../core/types.ts';
import { localeOf } from '../i18n/index.ts';
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
  private readonly progressBar: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly meta: HTMLElement;

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.mistakesValue = el('strong', { class: 'status__value', text: '0' });
    this.hintsValue = el('strong', { class: 'status__value', text: '0' });
    this.progressFill = el('span', { class: 'progress__fill' });
    this.progressBar = el(
      'div',
      {
        class: 'progress',
        attrs: {
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 81,
          'aria-valuenow': 0,
        },
      },
      [this.progressFill],
    );
    this.meta = el('p', { class: 'puzzle-meta' });

    const item = (iconName: 'info' | 'bulb', key: TranslationKey, valueNode: HTMLElement) =>
      el('div', { class: 'status__item' }, [
        icon(iconName, 16),
        el('span', { class: 'status__label', dataset: { i18n: key } }),
        valueNode,
      ]);

    this.root = el('div', { class: 'status' }, [
      item('bulb', 'status.mistakes', this.mistakesValue),
      item('info', 'status.hints', this.hintsValue),
      this.progressBar,
      this.meta,
    ]);
    container.appendChild(this.root);
  }

  render(): void {
    const game = this.app.game;
    if (!game) {
      setText(this.mistakesValue, '0');
      setText(this.hintsValue, '0');
      this.progressFill.style.width = '0%';
      setText(this.meta, '');
      return;
    }
    setText(this.mistakesValue, String(game.mistakes));
    setText(this.hintsValue, String(game.hints));
    const filled = 81 - game.remaining()[0];
    this.progressFill.style.width = `${(filled / 81) * 100}%`;
    setAttr(this.progressBar, 'aria-valuenow', String(filled));

    const sourceKey: TranslationKey =
      this.app.origin === 'api'
        ? 'status.source.api'
        : this.app.origin === 'cache'
          ? 'status.source.cache'
          : 'status.source.local';
    setText(
      this.meta,
      `${this.app.t(difficultyKey(game.difficulty))} · ${this.app.t(sourceKey)}`,
    );
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
    const selected = this.app.ui.selectedDifficulty;
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

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.root = el('div', { class: 'keypad', attrs: { role: 'group' } });
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
    container.appendChild(this.root);
  }

  render(): void {
    const game = this.app.game;
    const remaining = game ? game.remaining() : new Array<number>(10).fill(9);
    for (const [digit, key] of this.keys) {
      const left = remaining[digit];
      setText(key.count, left > 0 ? String(left) : '✓');
      toggleClass(key.button, 'is-complete', left <= 0);
      setAttr(key.button, 'aria-label', `${digit} – ${left}`);
    }
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
        id: 'fill-notes',
        icon: 'list',
        labelKey: 'action.autoNotes',
        action: () => app.fillNotes(),
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
    setDisabled('fill-notes', busy || !playing);
    setDisabled('restart', busy || !game);

    const notesEntry = this.buttons.get('notes');
    if (notesEntry) {
      notesEntry.button.disabled = busy || !playing;
      setAttr(notesEntry.button, 'aria-pressed', game?.notesMode ? 'true' : 'false');
      toggleClass(notesEntry.button, 'is-active', game?.notesMode === true);
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
  }
}

// ------------------------------------------------------------ statistics card

export class StatsSummary {
  readonly root: HTMLDivElement;
  private readonly solved: HTMLElement;
  private readonly rate: HTMLElement;
  private readonly streak: HTMLElement;

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    const tile = (key: TranslationKey, value: HTMLElement) =>
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat__label', dataset: { i18n: key } }),
        value,
      ]);

    this.solved = el('strong', { class: 'stat__value', text: '0' });
    this.rate = el('strong', { class: 'stat__value', text: '–' });
    this.streak = el('strong', { class: 'stat__value', text: '0' });

    this.root = el('div', { class: 'stats-summary' }, [
      tile('stats.won', this.solved),
      tile('stats.winRate', this.rate),
      tile('stats.streak', this.streak),
    ]);
    container.appendChild(this.root);
  }

  render(): void {
    const difficulty = this.app.game?.difficulty ?? this.app.ui.selectedDifficulty;
    const stats = this.app.stats.byDifficulty[difficulty];
    const locale = localeOf(this.app.language);
    const rate = winRate(this.app.stats, difficulty);

    setText(this.solved, String(stats.won));
    setText(this.rate, rate === null ? '–' : formatPercent(rate, locale));
    setText(this.streak, String(stats.streak));
    toggleClass(this.root, 'is-empty', stats.played === 0);
  }
}
