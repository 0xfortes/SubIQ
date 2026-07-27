/**
 * In-memory sliding-window rate limiter for v1.
 *
 * Limitation (accepted, documented): state is per server instance — a
 * multi-instance deploy divides the effective limit. The interface is the
 * contract; swapping in Redis later touches only this file.
 */

interface RateLimitOptions {
  /** Max events per window. */
  limit: number;
  windowMs: number;
}

type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now;
    buckets.set(key, timestamps);
    return { ok: false, retryAfterMs: oldest + windowMs - now };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  // Opportunistic cleanup so abandoned keys can't grow unbounded.
  if (buckets.size > MAX_KEYS) {
    for (const [k, ts] of buckets) {
      if (ts.every((t) => t <= windowStart)) buckets.delete(k);
    }
  }

  return { ok: true };
}
