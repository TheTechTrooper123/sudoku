/**
 * Local player statistics - one record per difficulty.
 * All functions are pure and return a new `Stats` object, which keeps them
 * easy to test and to persist.
 */
import { DIFFICULTIES } from '../core/types.ts';
import type { Difficulty } from '../core/types.ts';

export interface DifficultyStats {
  /** Games started. */
  played: number;
  /** Games finished. */
  won: number;
  /** Wins without a single wrong entry. */
  flawless: number;
  /** Current winning streak. */
  streak: number;
  /** Longest winning streak so far. */
  bestStreak: number;
  /** Total wrong entries across all games. */
  mistakes: number;
  /** Total hints used across all games. */
  hints: number;
}

export interface Stats {
  version: 1;
  byDifficulty: Record<Difficulty, DifficultyStats>;
}

export interface WinResult {
  mistakes: number;
  hints: number;
}

export function emptyDifficultyStats(): DifficultyStats {
  return {
    played: 0,
    won: 0,
    flawless: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: 0,
    hints: 0,
  };
}

export function createStats(): Stats {
  const byDifficulty = {} as Record<Difficulty, DifficultyStats>;
  for (const difficulty of DIFFICULTIES) byDifficulty[difficulty] = emptyDifficultyStats();
  return { version: 1, byDifficulty };
}

/** Normalises data read from storage (fills in missing fields). */
export function normalizeStats(data: unknown): Stats {
  const stats = createStats();
  if (typeof data !== 'object' || data === null) return stats;
  const raw = (data as Partial<Stats>).byDifficulty;
  if (typeof raw !== 'object' || raw === null) return stats;

  for (const difficulty of DIFFICULTIES) {
    const entry = (raw as Record<string, Partial<DifficultyStats>>)[difficulty];
    if (typeof entry !== 'object' || entry === null) continue;
    const base = emptyDifficultyStats();
    base.played = numberOr(entry.played, 0);
    base.won = numberOr(entry.won, 0);
    base.flawless = numberOr(entry.flawless, 0);
    base.streak = numberOr(entry.streak, 0);
    base.bestStreak = numberOr(entry.bestStreak, 0);
    base.mistakes = numberOr(entry.mistakes, 0);
    base.hints = numberOr(entry.hints, 0);
    stats.byDifficulty[difficulty] = base;
  }
  return stats;
}

/** Registers a started game. */
export function recordStart(stats: Stats, difficulty: Difficulty): Stats {
  const next = cloneStats(stats);
  next.byDifficulty[difficulty].played++;
  return next;
}

/** Registers a finished game and updates the streaks. */
export function recordWin(stats: Stats, difficulty: Difficulty, result: WinResult): Stats {
  const next = cloneStats(stats);
  const entry = next.byDifficulty[difficulty];
  entry.won++;
  entry.mistakes += result.mistakes;
  entry.hints += result.hints;
  if (result.mistakes === 0) entry.flawless++;
  entry.streak++;
  entry.bestStreak = Math.max(entry.bestStreak, entry.streak);
  return next;
}

/** Breaks the winning streak of a level (used when a game is abandoned). */
export function recordAbandon(stats: Stats, difficulty: Difficulty): Stats {
  const next = cloneStats(stats);
  next.byDifficulty[difficulty].streak = 0;
  return next;
}

export function winRate(stats: Stats, difficulty: Difficulty): number | null {
  const entry = stats.byDifficulty[difficulty];
  if (entry.played === 0) return null;
  return entry.won / entry.played;
}

function cloneStats(stats: Stats): Stats {
  const byDifficulty = {} as Record<Difficulty, DifficultyStats>;
  for (const difficulty of DIFFICULTIES) {
    byDifficulty[difficulty] = { ...stats.byDifficulty[difficulty] };
  }
  return { version: 1, byDifficulty };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
