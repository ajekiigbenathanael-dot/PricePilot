/**
 * api/_lib/http.ts — small helpers shared by the serverless handlers.
 */

/** Human-readable message from an unknown thrown value. */
export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'unknown error';
}

/** Deterministic UUID-string test (product ids are RFC 4122 v5 strings). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
