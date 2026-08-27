/**
 * POST /api/auth/register
 *
 * Creates a new user account. Passwords are hashed with scrypt before storage.
 * On success, creates a session and returns the user object.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import type { RegisterRequest, AuthResponse } from '../_lib/types';
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

  const body = req.body as RegisterRequest;
  const { email, password, display_name } = body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const db = await getDb();
    const users = db.collection<{ _id: string; email: string; password_hash: string; salt: string; display_name: string | null; created_at: string }>('users');
    const sessions = db.collection<{ _id: string; user_id: string; created_at: string; expires_at: string }>('sessions');

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await users.findOne({ _id: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = randomBytes(16).toString('hex');
    const password_hash = hashPassword(password, salt);

    const user = {
      _id: normalizedEmail,
      email: normalizedEmail,
      password_hash,
      salt,
      display_name: display_name?.trim() || null,
      created_at: new Date().toISOString(),
    };

    await users.insertOne(user);

    const sessionToken = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

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

    return res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      },
    } satisfies AuthResponse);
  } catch (e) {
    return res.status(500).json({ error: `Registration failed: ${errMessage(e)}` });
  }
}
