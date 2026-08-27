/**
 * Ambient types for uuid.mjs (a zero-dep JS module) so TypeScript callers in
 * /api can import it without `allowJs`. Keep in sync with the exports there.
 */

/** RFC 4122 URL namespace — the fixed constant product ids are hashed under. */
export const URL_NAMESPACE: string;

/** Deterministic RFC 4122 v5 (SHA-1) UUID from a name string. */
export function uuidv5(name: string, namespace?: string): string;
