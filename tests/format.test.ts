import { describe, expect, it } from 'vitest';
import {
  formatCount,
  formatDuration,
  formatDurationLong,
  formatPercent,
} from '../src/core/format.ts';

describe('formatDuration', () => {
  it('pads minutes and seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(4_000)).toBe('00:04');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(10 * 60_000 + 9_000)).toBe('10:09');
  });

  it('adds hours when needed', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('never goes negative', () => {
    expect(formatDuration(-5_000)).toBe('00:00');
  });
});

describe('formatDurationLong', () => {
  it('uses seconds below one minute', () => {
    expect(formatDurationLong(42_000, 'en')).toBe('42 s');
    expect(formatDurationLong(0, 'en')).toBe('0 s');
  });

  it('uses minutes and seconds below one hour', () => {
    expect(formatDurationLong(65_000, 'en')).toBe('1:05 min');
    expect(formatDurationLong(12 * 60_000, 'en')).toBe('12:00 min');
  });

  it('uses hours above one hour', () => {
    expect(formatDurationLong(3_725_000, 'en')).toBe('1:02:05 h');
  });
});

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
