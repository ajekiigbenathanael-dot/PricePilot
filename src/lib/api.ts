/**
 * api.ts — the single client the app uses to talk to its own `/api` backend.
 *
 * MongoDB has no browser SDK (unlike the Supabase client this replaces), so the
 * React app never touches the database directly: every read/write goes through
 * same-origin serverless functions under `/api`. This helper centralizes that
 * transport — base URL, JSON headers, and the `{ error }` extraction the live
 * calls used to do inline — so the data-access modules stay declarative.
 *
 * Base URL: same-origin by default (`/api/...`). Set `VITE_API_BASE_URL` only to
 * point the browser at a different origin (rare — e.g. a separate API host).
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  /** JSON body to send — stringified, with `content-type: application/json` set. */
  json?: unknown;
  /** Raw body (rarely needed; prefer `json`). */
  body?: BodyInit | null;
  /** When true, a 404 resolves to `null` instead of throwing (for optional reads). */
  notFoundAsNull?: boolean;
}

/**
 * Fetch JSON from the API. Throws `Error(body.error)` (the server's own message)
 * on any non-2xx response, so callers can surface it directly. With
 * `{ notFoundAsNull: true }`, a 404 returns `null` instead — used by the product
 * detail read so a missing product renders "not found" rather than an error.
 */
export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T>;
export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit & { notFoundAsNull: true },
): Promise<T | null>;
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T | null> {
  const { json, notFoundAsNull, headers, body: rawBody, ...rest } = init;

  const finalHeaders = new Headers(headers);
  let body = rawBody ?? undefined;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!finalHeaders.has('content-type')) finalHeaders.set('content-type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      body,
      credentials: 'include',
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 404 && notFoundAsNull) return null;

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status}).`;
    try {
      const errBody = await res.json();
      if (errBody && typeof errBody.error === 'string') message = errBody.error;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return (await res.json()) as T;
}
