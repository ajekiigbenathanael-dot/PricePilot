/**
 * api/_lib/ratelimit.ts — in-memory rate limiter for serverless warm invocations.
 *
 * Like the cache, this only persists within a single warm function instance. It
 * won't coordinate across instances, but it still bounds the blast radius of a
 * burst: a single user (or attacker) can't hammer the scraper endpoints from one
 * instance. For distributed rate limiting, swap this for @upstash/ratelimit —
 * the `checkRateLimit` API stays the same.
 *
 * Algorithm: token bucket. Each key starts with `max` tokens; one is consumed per
 * call; tokens refill at `refillInterval` per second. When empty, calls are
 * rejected until enough tokens refill.
 */

interface Bucket {
  tokens: number;
  refilledAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the next token is available (only meaningful when ok=false). */
  retryAfter: number;
}

/**
 * @param key      unique identifier (e.g. `check-price:<ip>`)
 * @param max      maximum burst tokens
 * @param refillPerSec  tokens refilled per second
 */
export function checkRateLimit(key: string, max: number, refillPerSec: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { tokens: max - 1, refilledAt: now });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }

  // Refill based on elapsed time since last check.
  const elapsedSec = (now - bucket.refilledAt) / 1000;
  const refill = elapsedSec * refillPerSec;
  bucket.tokens = Math.min(max, bucket.tokens + refill);
  bucket.refilledAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { ok: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
  }

  // Not enough tokens — report how long until one refills.
  const retryAfter = Math.ceil((1 - bucket.tokens) / refillPerSec);
  return { ok: false, remaining: 0, retryAfter };
}

/** Best-effort client IP from Vercel's headers, falling back to a generic key. */
export function clientIp(req: { headers: Record<string, unknown> }): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    // XFF is a chain: "client, proxy1, proxy2" — the leftmost is the original client.
    return xff.split(',')[0].trim();
  }
  return 'anonymous';
}
