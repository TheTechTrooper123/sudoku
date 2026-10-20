/**
 * Translation layer.
 *
 * - The starting language is the device/browser language, limited to German
 *   and English; the user can then switch between the two at any time.
 * - Placeholders use `{name}` syntax.
 */
import { de } from './de.ts';
import { en } from './en.ts';
import type { TranslationKey } from './en.ts';

export type { TranslationKey };
export type Language = 'de' | 'en';

export const LANGUAGES: Language[] = ['de', 'en'];

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { de, en };

/** The start language: German for a German device, English otherwise. */
export function detectDeviceLanguage(): Language {
  const candidates = [
    ...(Array.isArray(globalThis.navigator?.languages) ? globalThis.navigator.languages : []),
    globalThis.navigator?.language ?? '',
  ];
  for (const candidate of candidates) {
    if (String(candidate).toLowerCase().startsWith('de')) return 'de';
  }
  return 'en';
}

/**
 * Language of the first render. An explicit `?lang=de|en` wins - the language
 * alternates declared in `index.html`, `sitemap.xml` and the share links point
 * at those URLs - and the device language decides otherwise. There is no
 * visible switch and nothing is stored.
 */
export function startLanguage(search: string): Language {
  const requested = new URLSearchParams(search).get('lang');
  if (requested === 'de' || requested === 'en') return requested;
  return detectDeviceLanguage();
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

