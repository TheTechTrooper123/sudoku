/**
 * Modals: settings, win screen and confirmations. One shared `Modal` base class
 * handles focus management, the backdrop and the `Escape` key.
 */
import type { App } from '../state/app.ts';
import type { Settings } from '../state/settings.ts';
import { append, clear, el, qsAll, setText, toggleClass } from './dom.ts';
import type { Child } from './dom.ts';
import { icon } from './icons.ts';
import { resolveTheme } from './theme.ts';
import type { TranslationKey } from '../i18n/index.ts';

type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

// -------------------------------------------------------------------- modal

export class Modal {
  readonly root: HTMLDivElement;
  protected readonly titleNode: HTMLHeadingElement;
  protected readonly body: HTMLDivElement;
  protected readonly footer: HTMLDivElement;
  protected onClose: (() => void) | null = null;
  private opener: HTMLElement | null = null;

  constructor(titleId: string) {
    this.titleNode = el('h2', { class: 'modal__title', attrs: { id: titleId } });
    this.body = el('div', { class: 'modal__body' });
    this.footer = el('div', { class: 'modal__footer' });
    this.root = el(
      'div',
      {
        class: 'modal',
        attrs: {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': titleId,
          hidden: true,
        },
        on: {
          click: (event) => {
            if (event.target === this.root) this.close();
          },
          keydown: (event) => this.trapFocus(event as KeyboardEvent),
        },
      },
      [
        el('div', { class: 'modal__card' }, [
          el('div', { class: 'modal__head' }, [
            this.titleNode,
            el('button', {
              class: 'modal__close',
              attrs: { type: 'button', 'aria-label': 'Close' },
              on: { click: () => this.close() },
            }, [icon('close', 20)]),
          ]),
          this.body,
          this.footer,
        ]),
      ],
    );
    document.body.appendChild(this.root);
  }

  setTitle(text: string): void {
    setText(this.titleNode, text);
  }

  setContent(children: Child[]): void {
    clear(this.body);
    append(this.body, children);
  }

  setFooter(children: Child[]): void {
    clear(this.footer);
    append(this.footer, children);
  }

  open(): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.root.hidden = false;
    requestAnimationFrame(() => {
      const focusable = this.focusable()[0] ?? this.root;
      focusable.focus({ preventScroll: true });
    });
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    const opener = this.opener;
    this.opener = null;
    this.onClose?.();
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  private focusable(): HTMLElement[] {
    return qsAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      this.root,
    ).filter((node) => node.offsetParent !== null);
  }

  private trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = this.focusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

// ------------------------------------------------------------------ helpers

function section(titleKey: TranslationKey, app: App, children: Child[]): HTMLElement {
  return el('section', { class: 'modal__section' }, [
    el('h3', { class: 'modal__section-title', text: app.t(titleKey) }),
    ...children,
  ]);
}

function segmented(
  app: App,
  labelKey: TranslationKey,
  options: { value: string; labelKey?: TranslationKey; label?: string; icon?: Parameters<typeof icon>[0] }[],
  current: string,
  onSelect: (value: string) => void,
): HTMLElement {
  const group = el('div', {
    class: 'segmented',
    attrs: { role: 'group', 'aria-label': app.t(labelKey) },
  });
  for (const option of options) {
    const caption = option.label ?? (option.labelKey ? app.t(option.labelKey) : option.value);
    const button = el(
      'button',
      {
        class: 'segmented__option',
        attrs: { type: 'button', 'aria-pressed': option.value === current ? 'true' : 'false' },
        dataset: { value: option.value },
        on: { click: () => onSelect(option.value) },
      },
      [option.icon ? icon(option.icon, 16) : null, el('span', { text: caption })],
    );
    toggleClass(button, 'is-active', option.value === current);
    group.appendChild(button);
  }
  return group;
}

function settingRow(app: App, labelKey: TranslationKey, control: HTMLElement): HTMLElement {
  return el('div', { class: 'setting-row' }, [
    el('span', { class: 'setting-row__label', text: app.t(labelKey) }),
    control,
  ]);
}

function toggleRow(
  app: App,
  key: BooleanSettingKey,
  labelKey: TranslationKey,
  hintKey: TranslationKey,
  onChange: (value: boolean) => void,
): HTMLElement {
  const input = el('input', {
    attrs: { type: 'checkbox', checked: Boolean(app.settings[key]) },
    on: {
      change: (event) => onChange((event.currentTarget as HTMLInputElement).checked),
    },
  });
  return el('label', { class: 'toggle' }, [
    el('span', { class: 'toggle__text' }, [
      el('span', { class: 'toggle__label', text: app.t(labelKey) }),
      el('span', { class: 'toggle__hint', text: app.t(hintKey) }),
    ]),
    el('span', { class: 'switch' }, [input, el('span', { class: 'switch__track', attrs: { 'aria-hidden': 'true' } })]),
  ]);
}

function button(
  labelKey: TranslationKey,
  app: App,
  options: { variant?: 'primary' | 'ghost'; onClick: () => void; icon?: Parameters<typeof icon>[0] },
): HTMLButtonElement {
  const node = el(
    'button',
    {
      class: `button button--${options.variant ?? 'ghost'}`,
      attrs: { type: 'button' },
      on: { click: options.onClick },
    },
    [options.icon ? icon(options.icon, 18) : null, el('span', { text: app.t(labelKey) })],
  );
  return node;
}

// ----------------------------------------------------------------- settings

export class SettingsDialog extends Modal {
  constructor(private readonly app: App) {
    super('settings-title');
    this.onClose = () => this.app.setDialog('none');
    this.render();
  }

  render(): void {
    const app = this.app;
    this.setTitle(app.t('settings.title'));

    const closeButton = button('action.close', app, {
      variant: 'primary',
      onClick: () => this.close(),
    });

    this.setContent([
      section('settings.appearance', app, [
        settingRow(
          app,
          'settings.theme',
          segmented(
            app,
            'settings.theme',
            [
              { value: 'light', labelKey: 'settings.themeLight', icon: 'sun' },
              { value: 'dark', labelKey: 'settings.themeDark', icon: 'moon' },
            ],
            resolveTheme(app.settings.theme),
            (value) => app.updateSetting('theme', value as Settings['theme']),
          ),
        ),
        settingRow(
          app,
          'settings.language',
          segmented(
            app,
            'settings.language',
            [
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ],
            app.settings.language,
            (value) => app.updateSetting('language', value as Settings['language']),
          ),
        ),
      ]),
      section('settings.gameplay', app, [
        toggleRow(app, 'highlightPeers', 'settings.highlightPeers', 'settings.highlightPeersHint', (value) =>
          app.updateSetting('highlightPeers', value),
        ),
        toggleRow(
          app,
          'highlightSameNumber',
          'settings.highlightSameNumber',
          'settings.highlightSameNumberHint',
          (value) => app.updateSetting('highlightSameNumber', value),
        ),
        toggleRow(
          app,
          'autoRemoveNotes',
          'settings.autoRemoveNotes',
          'settings.autoRemoveNotesHint',
          (value) => app.updateSetting('autoRemoveNotes', value),
        ),
        toggleRow(app, 'animations', 'settings.animations', 'settings.animationsHint', (value) =>
          app.updateSetting('animations', value),
        ),
      ]),
    ]);

    this.setFooter([closeButton]);
  }
}

// ---------------------------------------------------------------------- win

export class WinDialog extends Modal {
  constructor(private readonly app: App) {
    super('win-title');
    this.onClose = () => this.app.setDialog('none');
    this.render();
  }

  render(): void {
    const app = this.app;
    const summary = app.ui.lastWin;
    const game = app.game;
    if (!summary || !game) {
      this.setTitle(app.t('win.title'));
      this.setContent([]);
      this.setFooter([]);
      return;
    }

    this.setTitle(app.t('win.title'));

    const metric = (labelKey: TranslationKey, value: string): HTMLElement =>
      el('div', { class: 'metric' }, [
        el('span', { class: 'metric__label', text: app.t(labelKey) }),
        el('strong', { class: 'metric__value', text: value }),
      ]);

    this.setContent([
      el('p', { class: 'modal__lead', text: app.t('win.subtitle') }),
      el('div', { class: 'metric-row' }, [
        metric('win.mistakes', String(summary.mistakes)),
        metric('win.hints', String(summary.hints)),
      ]),
      summary.flawless
        ? el('p', { class: 'badge badge--perfect' }, [icon('check', 18), el('span', { text: app.t('win.flawless') })])
        : null,
    ]);

    this.setFooter([
      button('win.share', app, {
        icon: 'share',
        onClick: () => {
          void app.shareResult().then((ok) => {
            if (ok) app.showToast(app.t('win.copied'), 'success');
          });
        },
      }),
      button('action.playAgain', app, {
        icon: 'plus',
        variant: 'primary',
        onClick: () => {
          this.close();
          void app.startNewGame(app.ui.selectedDifficulty);
        },
      }),
    ]);
  }
}

// ------------------------------------------------------------------ confirm

export class ConfirmDialog extends Modal {
  private confirmLabel: TranslationKey = 'dialog.startNew';
  private onConfirm: (() => void) | null = null;

  constructor(private readonly app: App) {
    super('confirm-title');
    this.onClose = () => app.setDialog('none');
  }

  configure(
    titleKey: TranslationKey,
    messageKey: TranslationKey,
    confirmKey: TranslationKey,
    onConfirm: () => void,
  ): void {
    const app = this.app;
    this.confirmLabel = confirmKey;
    this.onConfirm = onConfirm;
    this.setTitle(app.t(titleKey));
    this.setContent([el('p', { class: 'modal__lead', text: app.t(messageKey) })]);
    this.setFooter([
      button('action.cancel', app, { onClick: () => this.close() }),
      button(this.confirmLabel, app, {
        variant: 'primary',
        onClick: () => {
          this.close();
          this.onConfirm?.();
        },
      }),
    ]);
  }
}

// -------------------------------------------------------------------- toast

export class Toast {
  readonly root: HTMLDivElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly app: App) {
    this.root = el('div', {
      class: 'toast',
      attrs: { role: 'status', 'aria-live': 'polite', hidden: true },
    });
    document.body.appendChild(this.root);
  }

  render(): void {
    const toast = this.app.toast;
    if (!toast) {
      this.root.hidden = true;
      return;
    }
    clear(this.root);
    append(this.root, [icon(toast.tone === 'success' ? 'check' : 'info', 18), el('span', { text: toast.text })]);
    this.root.className = `toast toast--${toast.tone}`;
    this.root.hidden = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.app.clearToast(), 4000);
  }
}
