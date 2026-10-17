import { describe, expect, it } from 'vitest';
import {
  createStats,
  emptyDifficultyStats,
  normalizeStats,
  recordAbandon,
  recordStart,
  recordWin,
  winRate,
} from '../src/core/stats.ts';
import { DIFFICULTIES } from '../src/core/types.ts';

describe('statistics', () => {
  it('starts empty for every difficulty', () => {
    const stats = createStats();
    for (const difficulty of DIFFICULTIES) {
      expect(stats.byDifficulty[difficulty]).toEqual(emptyDifficultyStats());
      expect(winRate(stats, difficulty)).toBeNull();
    }
  });

  it('counts started games', () => {
    const stats = recordStart(recordStart(createStats(), 'easy'), 'easy');
    expect(stats.byDifficulty.easy.played).toBe(2);
    expect(stats.byDifficulty.medium.played).toBe(0);
  });

  it('records wins, flawless solves and streaks', () => {
    let stats = createStats();
    stats = recordStart(stats, 'hard');
    stats = recordWin(stats, 'hard', { mistakes: 2, hints: 1 });
    stats = recordWin(stats, 'hard', { mistakes: 0, hints: 0 });

    const entry = stats.byDifficulty.hard;
    expect(entry.won).toBe(2);
    expect(entry.flawless).toBe(1);
    expect(entry.streak).toBe(2);
    expect(entry.bestStreak).toBe(2);
    expect(entry.mistakes).toBe(2);
    expect(entry.hints).toBe(1);
    expect(winRate(stats, 'hard')).toBe(2);
  });

  it('breaks the streak when a game is abandoned', () => {
    let stats = recordWin(createStats(), 'medium', { mistakes: 0, hints: 0 });
    expect(stats.byDifficulty.medium.streak).toBe(1);
    stats = recordAbandon(stats, 'medium');
    expect(stats.byDifficulty.medium.streak).toBe(0);
    expect(stats.byDifficulty.medium.bestStreak).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const base = createStats();
    const next = recordStart(base, 'easy');
    expect(base.byDifficulty.easy.played).toBe(0);
    expect(next.byDifficulty.easy.played).toBe(1);
  });

  it('normalises damaged storage data', () => {
    const stats = normalizeStats({
      byDifficulty: {
        easy: { played: 3, won: 2, streak: 'x', bestMs: -5, totalMs: 1_000 },
        unknown: { played: 99 },
      },
    });
    expect(stats.byDifficulty.easy.played).toBe(3);
    expect(stats.byDifficulty.easy.won).toBe(2);
    expect(stats.byDifficulty.easy.streak).toBe(0);
    expect(stats.byDifficulty.medium.played).toBe(0);
    expect(Object.keys(stats.byDifficulty).sort()).toEqual([...DIFFICULTIES].sort());
    expect(normalizeStats(null).byDifficulty.easy.played).toBe(0);
  });
});
