import { describe, expect, it } from 'vitest';
import { formatCount, formatPercent } from '../src/core/format.ts';

describe('formatPercent / formatCount', () => {
  it('rounds percentages to whole numbers', () => {
    expect(formatPercent(0, 'en')).toBe('0%');
    expect(formatPercent(0.5, 'en')).toBe('50%');
    expect(formatPercent(2 / 3, 'en')).toBe('67%');
  });

  it('formats counts with the locale', () => {
    expect(formatCount(1_234, 'en')).toBe('1,234');
    expect(formatCount(1_234, 'de')).toBe('1.234');
  });
});
