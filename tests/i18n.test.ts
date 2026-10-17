import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de.ts';
import { en } from '../src/i18n/en.ts';
import { detectLanguage, LANGUAGES, translate } from '../src/i18n/index.ts';

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe('translations', () => {
  it('provides both dictionaries', () => {
    expect(LANGUAGES).toEqual(['de', 'en']);
  });

  it('has a non empty value for every key in both languages', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.length, `en:${key}`).toBeGreaterThan(0);
      const german = de[key as keyof typeof de];
      expect(german, `de:${key}`).toBeTruthy();
      expect(german.length, `de:${key}`).toBeGreaterThan(0);
    }
  });

  it('uses the same placeholders in both languages', () => {
    for (const [key, value] of Object.entries(en)) {
      const german = de[key as keyof typeof de];
      expect(placeholders(german), `de:${key}`).toEqual(placeholders(value));
    }
  });

  it('replaces parameters', () => {
    expect(translate('de', 'board.cellGiven', { row: 2, col: 3, value: 7 })).toBe(
      'Zeile 2, Spalte 3, Vorgabe 7',
    );
    expect(translate('en', 'board.cellNotes', { row: 1, col: 1, notes: '3 5' })).toBe(
      'row 1, column 1, notes 3 5',
    );
  });

  it('falls back to the key for unknown input', () => {
    const unknown = 'does.not.exist' as keyof typeof en;
    expect(translate('en', unknown)).toBe('does.not.exist');
  });

  it('honours an explicit language preference', () => {
    expect(detectLanguage('de')).toBe('de');
    expect(detectLanguage('en')).toBe('en');
    expect(LANGUAGES).toContain(detectLanguage('auto'));
  });
});
