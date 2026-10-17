/**
 * User settings. Kept deliberately small - the game should feel light, not
 * like a control panel.
 */
import { loadJson, saveJson, STORAGE_KEYS } from '../core/storage.ts';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'auto' | 'de' | 'en';

export interface Settings {
  theme: ThemePreference;
  language: LanguagePreference;
  /** Highlight duplicate digits in rows, columns and boxes. */
  highlightConflicts: boolean;
  /** Highlight all cells that share the selected digit. */
  highlightSameNumber: boolean;
  /** Highlight row/column/box of the selected cell. */
  highlightPeers: boolean;
  /** Remove a digit from the notes of its peers when placing it. */
  autoRemoveNotes: boolean;
  /** Mark wrong entries immediately. */
  autoCheck: boolean;
  /** Show the timer. */
  showTimer: boolean;
  /** Play a subtle animation when the puzzle is solved. */
  animations: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'auto',
  highlightConflicts: true,
  highlightSameNumber: true,
  highlightPeers: true,
  autoRemoveNotes: true,
  autoCheck: false,
  showTimer: true,
  animations: true,
};

export function loadSettings(): Settings {
  const raw = loadJson<Partial<Settings>>(STORAGE_KEYS.settings);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const settings = { ...DEFAULT_SETTINGS };
  if (raw.theme === 'system' || raw.theme === 'light' || raw.theme === 'dark') {
    settings.theme = raw.theme;
  }
  if (raw.language === 'auto' || raw.language === 'de' || raw.language === 'en') {
    settings.language = raw.language;
  }
  for (const key of [
    'highlightConflicts',
    'highlightSameNumber',
    'highlightPeers',
    'autoRemoveNotes',
    'autoCheck',
    'showTimer',
    'animations',
  ] as const) {
    if (typeof raw[key] === 'boolean') settings[key] = raw[key] as boolean;
  }
  return settings;
}

export function saveSettings(settings: Settings): void {
  saveJson(STORAGE_KEYS.settings, settings);
}
