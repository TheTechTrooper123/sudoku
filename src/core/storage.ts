/**
 * Safe localStorage wrapper.
 *
 * Storage can be unavailable (private mode, disabled cookies) and full, so
 * every access is guarded. All keys are namespaced and versioned.
 */
const PREFIX = 'sudoku.v1';

export const STORAGE_KEYS = {
  game: `${PREFIX}.game`,
  stats: `${PREFIX}.stats`,
  settings: `${PREFIX}.settings`,
  pool: `${PREFIX}.pool`,
} as const;

function storage(): Storage | null {
  try {
    const local = globalThis.localStorage;
    if (!local) return null;
    const probe = `${PREFIX}.probe`;
    local.setItem(probe, '1');
    local.removeItem(probe);
    return local;
  } catch {
    return null;
  }
}

export function loadJson<T>(key: string): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}
