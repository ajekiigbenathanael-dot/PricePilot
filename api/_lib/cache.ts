/**
 * api/_lib/cache.ts — lightweight in-memory cache for serverless warm invocations.
 *
 * Each Vercel function instance holds its own memory, so this cache only survives
 * within a single warm instance — not across cold starts or between instances.
 * That's still meaningful: repeated requests during a warm window skip MongoDB
 * entirely. Combined with CDN caching (Cache-Control on the response), most reads
 * never reach this layer at all.
 *
 * For cross-instance caching (e.g. a shared Redis), swap this module's internals
 * for @upstash/redis — the getCached/setCache API stays the same.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Return a cached value if it exists and hasn't expired, else null. */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Store a value with a TTL in milliseconds. */
export function setCache(key: string, value: unknown, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Build a cache key from a prefix + query params so different filters don't collide. */
export function cacheKey(prefix: string, params: Record<string, string | undefined>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${prefix}:${sorted.map(([k, v]) => `${k}=${v}`).join('&')}`;
}
