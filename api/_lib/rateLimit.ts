/**
 * Very small in-memory rate limiter (token bucket per client).
 *
 * Serverless instances are short lived, so this is a best-effort protection
 * against accidental hammering - the upstream quota is the real boundary.
 */
interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_CLIENTS = 5_000;

export interface RateLimitOptions {
  /** Bucket size / allowed burst. */
  capacity?: number;
  /** Tokens refilled per second. */
  refillPerSecond?: number;
}

export function allowRequest(clientKey: string, options: RateLimitOptions = {}): boolean {
  const capacity = options.capacity ?? 12;
  const refillPerSecond = options.refillPerSecond ?? 1;
  const now = Date.now();

  if (buckets.size > MAX_CLIENTS) buckets.clear();

  const bucket = buckets.get(clientKey) ?? { tokens: capacity, updatedAt: now };
  const elapsedSeconds = Math.max(0, (now - bucket.updatedAt) / 1000);
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(clientKey, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(clientKey, bucket);
  return true;
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
