/**
 * DELETE /api/wishlist/:productId
 *
 * Removes a product from the current user's wishlist. 204 on success, 404 if
 * the item wasn't saved — the frontend treats both as "not saved".
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

interface SessionDoc {
  _id: string;
  user_id: string;
  expires_at: string;
}

interface WishlistDoc {
  _id?: string;
  user_id: string;
  product_id: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed.' });

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) return res.status(401).json({ error: 'Not authenticated.' });

  const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
  if (!productId) return res.status(400).json({ error: 'A productId is required.' });

  try {
    const db = await getDb();
    const sessions = db.collection<SessionDoc>('sessions');
    const session = await sessions.findOne({ _id: sessionToken });
    if (!session) return res.status(401).json({ error: 'Not authenticated.' });
    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ _id: sessionToken });
      return res.status(401).json({ error: 'Session expired.' });
    }

    const wishlist = db.collection<WishlistDoc>('wishlist');
    const result = await wishlist.deleteOne({
      user_id: session.user_id,
      product_id: productId,
    });

    if (result.deletedCount === 0) return res.status(404).json({ error: 'Wishlist item not found.' });
    return res.status(204).send(null);
  } catch (e) {
    return res.status(500).json({ error: `Failed to remove wishlist item: ${errMessage(e)}` });
  }
}
