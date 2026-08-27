/**
 * api/_lib/session.ts — resolve the signed-in user from the session cookie.
 *
 * The auth routes store a random token in an httpOnly `session` cookie and a
 * `sessions` document mapping that token → `user_id` (which, in this backend, is
 * the user's email — see api/auth/register.ts). Handlers that need to answer
 * "who is calling?" would otherwise each re-implement the cookie-parse +
 * session-lookup + expiry-check dance; it lives here once.
 *
 * This is the OPTIONAL form: it returns the user id when a valid session is
 * present, or `null` otherwise (no cookie, unknown token, or expired). It never
 * writes a response, so callers decide what a missing user means:
 *   • optional auth (product reads, live search) — treat null as "anonymous";
 *   • required auth (product delete) — return 401 when it comes back null.
 */
import type { VercelRequest } from '@vercel/node';
import { getDb } from './db';

interface SessionDoc {
  _id: string;
  user_id: string;
  expires_at: string;
}

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

/**
 * The current user's id (email) from the `session` cookie, or `null` when the
 * request carries no valid, unexpired session. An expired session is deleted as
 * a side effect (matching the other auth handlers). Throws only on a DB error.
 */
export async function resolveUserId(req: VercelRequest): Promise<string | null> {
  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const token = parseCookie(cookie, 'session');
  if (!token) return null;

  const db = await getDb();
  const sessions = db.collection<SessionDoc>('sessions');
  const session = await sessions.findOne({ _id: token });
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await sessions.deleteOne({ _id: token });
    return null;
  }

  return session.user_id;
}
