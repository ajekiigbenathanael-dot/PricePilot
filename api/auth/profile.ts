/**
 * PATCH /api/auth/profile
 *
 * Updates the current user's profile (display_name, email_alerts). Requires authentication.
 * Returns the updated user object.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import type { User } from '../_lib/types';

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed.' });

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) return res.status(401).json({ error: 'Not authenticated.' });

  const body = req.body;
  const displayName =
    body && typeof body === 'object' && 'display_name' in body
      ? String((body as Record<string, unknown>).display_name ?? '').trim()
      : '';
  const emailAlerts =
    body && typeof body === 'object' && 'email_alerts' in body
      ? Boolean((body as Record<string, unknown>).email_alerts)
      : undefined;

  try {
    const db = await getDb();
    const sessions = db.collection<{ _id: string; user_id: string; expires_at: string }>('sessions');
    const session = await sessions.findOne({ _id: sessionToken } as Record<string, unknown>);
    if (!session) return res.status(401).json({ error: 'Not authenticated.' });
    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ _id: sessionToken } as Record<string, unknown>);
      return res.status(401).json({ error: 'Session expired.' });
    }

    const users = db.collection<{ _id: string; email: string; display_name: string | null; created_at: string; email_alerts?: boolean }>('users');
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (displayName !== undefined) {
      update.display_name = displayName || null;
    }
    if (emailAlerts !== undefined) {
      update.email_alerts = emailAlerts;
    }

    const updated = await users.findOneAndUpdate(
      { _id: session.user_id } as Record<string, unknown>,
      { $set: update },
      { returnDocument: 'after' },
    );

    if (!updated) return res.status(404).json({ error: 'User not found.' });

    const user = updated as { _id: string; email: string; display_name: string | null; created_at: string };
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      } satisfies User,
    });
  } catch (e) {
    return res.status(500).json({ error: `Profile update failed: ${errMessage(e)}` });
  }
}
