/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user based on the session cookie.
 * 401 if no valid session is present.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import type { AuthResponse } from '../_lib/types';

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const db = await getDb();
    const sessions = db.collection<{ _id: string; user_id: string; expires_at: string }>('sessions');
    const users = db.collection<{ _id: string; email: string; display_name: string | null; created_at: string }>('users');

    const session = await sessions.findOne({ _id: sessionToken });
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ _id: sessionToken });
      return res.status(401).json({ error: 'Session expired.' });
    }

    const user = await users.findOne({ _id: session.user_id });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      },
    } satisfies AuthResponse);
  } catch (e) {
    return res.status(500).json({ error: `Auth check failed: ${errMessage(e)}` });
  }
}
