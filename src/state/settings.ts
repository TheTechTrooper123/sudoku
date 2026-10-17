/**
 * In-session user settings. Kept deliberately small - the game should feel
 * light, not like a control panel. Nothing is persisted: on every reload the
 * defaults below apply again.
 */
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
  animations: true,
};

/** A fresh, mutable copy of the defaults. */
export function createSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}
