/**
 * DELETE /api/alerts/:id
 *
 * Deletes a price alert. Only the owner can delete it.
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
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed.' });

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) return res.status(401).json({ error: 'Not authenticated.' });

  const alertId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!alertId) return res.status(400).json({ error: 'An alert id is required.' });

  try {
    const db = await getDb();
    const sessions = db.collection<{ user_id: string; expires_at: string }>('sessions');
    const session = await sessions.findOne({ _id: sessionToken } as Record<string, unknown>);
    if (!session) return res.status(401).json({ error: 'Not authenticated.' });
    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ _id: sessionToken } as Record<string, unknown>);
      return res.status(401).json({ error: 'Session expired.' });
    }

    const alerts = db.collection<{ _id: string; user_id: string }>('price_alerts');
    const result = await alerts.deleteOne({ _id: alertId, user_id: session.user_id } as Record<string, unknown>);

    if (result.deletedCount === 0) return res.status(404).json({ error: 'Alert not found.' });
    return res.status(204).send(null);
  } catch (e) {
    return res.status(500).json({ error: `Failed to delete alert: ${errMessage(e)}` });
  }
}
