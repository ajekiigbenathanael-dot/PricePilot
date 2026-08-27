/**
 * POST /api/auth/login
 *
 * Validates credentials and creates a new session. Returns the user object
 * and sets an httpOnly session cookie.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import type { LoginRequest, AuthResponse } from '../_lib/types';
import { scryptSync, randomBytes } from 'node:crypto';

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required.' });
  }

  const body = req.body as LoginRequest;
  const { email, password } = body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = await getDb();
    const users = db.collection<{ _id: string; email: string; password_hash: string; salt: string; display_name: string | null; created_at: string }>('users');
    const sessions = db.collection<{ _id: string; user_id: string; created_at: string; expires_at: string }>('sessions');

    const normalizedEmail = email.toLowerCase().trim();
    const user = await users.findOne({ _id: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const expectedHash = hashPassword(password, user.salt);
    if (expectedHash !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await sessions.insertOne({
      _id: sessionToken,
      user_id: user._id,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    const sessionCookie = [
      `session=${sessionToken}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', sessionCookie);

    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      },
    } satisfies AuthResponse);
  } catch (e) {
    return res.status(500).json({ error: `Login failed: ${errMessage(e)}` });
  }
}
