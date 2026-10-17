/**
 * Translation layer.
 *
 * - `auto` follows the browser language (German browsers get German),
 *   an explicit choice always wins for the current session.
 * - Placeholders use `{name}` syntax.
 */
import type { LanguagePreference } from '../state/settings.ts';
import { de } from './de.ts';
import { en } from './en.ts';
import type { TranslationKey } from './en.ts';

export type { TranslationKey };
export type Language = 'de' | 'en';

export const LANGUAGES: Language[] = ['de', 'en'];

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { de, en };

export function detectLanguage(preference: LanguagePreference): Language {
  if (preference === 'de' || preference === 'en') return preference;
  const candidates = [
    ...(Array.isArray(globalThis.navigator?.languages) ? globalThis.navigator.languages : []),
    globalThis.navigator?.language ?? '',
  ];
  for (const candidate of candidates) {
    const tag = String(candidate).toLowerCase();
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

export interface TranslateParams {
  [key: string]: string | number;
}

/** Translates a key and replaces `{placeholders}`. */
export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const dictionary = DICTIONARIES[language] ?? en;
  const template = dictionary[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type Translator = (key: TranslationKey, params?: TranslateParams) => string;

export function createTranslator(language: Language): Translator {
  return (key, params) => translate(language, key, params);
}

export function htmlLang(language: Language): string {
  return language;
}

export function localeOf(language: Language): string {
  return language === 'de' ? 'de-DE' : 'en-GB';
}
