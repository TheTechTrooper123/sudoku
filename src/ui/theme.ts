/**
 * Theme handling: follows the system preference unless the player chose a
 * fixed colour scheme.
 */
import type { ThemePreference } from '../state/settings.ts';

export type ResolvedTheme = 'light' | 'dark';

/** Browser UI colour per theme - must stay in sync with `--bg` in main.css. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f4efe4',
  dark: '#171615',
};

export function systemTheme(): ResolvedTheme {
  if (typeof globalThis.matchMedia !== 'function') return 'light';
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

/** Applies the theme to the document and keeps the browser UI in sync. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const theme = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_COLORS[theme];
  }
  return theme;
}

/** Calls the listener whenever the system colour scheme changes. */
export function watchSystemTheme(listener: () => void): () => void {
  if (typeof globalThis.matchMedia !== 'function') return () => {};
  const query = globalThis.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
