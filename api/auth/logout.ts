/**
 * POST /api/auth/logout
 *
 * Deletes the current session and clears the session cookie.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const db = await getDb();
    const sessions = db.collection<{ _id: string }>('sessions');

    const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
    const sessionToken = parseCookie(cookie, 'session');

    if (sessionToken) {
      await sessions.deleteOne({ _id: sessionToken });
    }

    const clearedCookie = [
      'session=',
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      'Max-Age=0',
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', clearedCookie);
    return res.status(204).send(null);
  } catch (e) {
    return res.status(500).json({ error: `Logout failed: ${errMessage(e)}` });
  }
}
