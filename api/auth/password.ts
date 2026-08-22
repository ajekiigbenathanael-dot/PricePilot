/**
 * POST /api/auth/password
 *
 * Changes the current user's password. Requires authentication.
 * Validates the current password before setting the new one.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import { scryptSync, randomBytes } from 'node:crypto';

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) return res.status(401).json({ error: 'Not authenticated.' });

  const body = req.body;
  const currentPassword =
    body && typeof body === 'object' && 'current_password' in body
      ? String((body as Record<string, unknown>).current_password ?? '')
      : '';
  const newPassword =
    body && typeof body === 'object' && 'new_password' in body
      ? String((body as Record<string, unknown>).new_password ?? '')
      : '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const db = await getDb();
    const sessions = db.collection<{ _id: string; user_id: string; expires_at: string }>('sessions');
    const session = await sessions.findOne({ _id: sessionToken } as Record<string, unknown>);
    if (!session) return res.status(401).json({ error: 'Not authenticated.' });
    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ _id: sessionToken } as Record<string, unknown>);
      return res.status(401).json({ error: 'Session expired.' });
    }

    const users = db.collection<{ _id: string; password_hash: string; salt: string }>('users');
    const user = await users.findOne({ _id: session.user_id } as Record<string, unknown>);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentHash = hashPassword(currentPassword, user.salt);
    if (currentHash !== user.password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newSalt = randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    await users.updateOne(
      { _id: session.user_id } as Record<string, unknown>,
      { $set: { password_hash: newHash, salt: newSalt, updated_at: new Date().toISOString() } },
    );

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: `Password change failed: ${errMessage(e)}` });
  }
}
