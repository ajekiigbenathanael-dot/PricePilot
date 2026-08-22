/**
 * GET  /api/wishlist        — list current user's saved products
 * POST /api/wishlist  { productId } — save a product
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import { serializeProduct, type ProductDoc } from '../_lib/serialize';

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

async function requireSession(req: VercelRequest, res: VercelResponse) {
  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const db = await getDb();
  const sessions = db.collection<SessionDoc>('sessions');
  const session = await sessions.findOne({ _id: sessionToken });
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });
  if (new Date(session.expires_at) < new Date()) {
    await sessions.deleteOne({ _id: sessionToken });
    return res.status(401).json({ error: 'Session expired.' });
  }
  return { db, userId: session.user_id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const sessionResult = await requireSession(req, res);
      if ('error' in sessionResult) return sessionResult;
      const { db, userId } = sessionResult as { db: ReturnType<typeof getDb> extends Promise<infer D> ? D : never; userId: string };

      const wishlist = db.collection<WishlistDoc>('wishlist');
      const items = await wishlist.find({ user_id: userId }).toArray();
      const productIds = items.map((i) => i.product_id);

      if (productIds.length === 0) return res.status(200).json([]);

      const products = db.collection<ProductDoc>('products');
      const docs = await products.find({ _id: { $in: productIds } }).toArray();
      const productMap = new Map(docs.map((d) => [d._id, serializeProduct(d)]));

      return res.status(200).json(
        productIds.map((id) => productMap.get(id)).filter(Boolean),
      );
    } catch (e) {
      return res.status(500).json({ error: `Failed to load wishlist: ${errMessage(e)}` });
    }
  }

  if (req.method === 'POST') {
    const body = req.body;
    const productId =
      body && typeof body === 'object' && 'productId' in body
        ? String((body as Record<string, unknown>).productId ?? '').trim()
        : '';
    if (!productId) return res.status(400).json({ error: 'A productId is required.' });

    try {
      const sessionResult = await requireSession(req, res);
      if ('error' in sessionResult) return sessionResult;
      const { db, userId } = sessionResult as { db: ReturnType<typeof getDb> extends Promise<infer D> ? D : never; userId: string };

      const wishlist = db.collection<WishlistDoc>('wishlist');
      await wishlist.updateOne(
        { user_id: userId, product_id: productId },
        { $setOnInsert: { user_id: userId, product_id: productId } },
        { upsert: true },
      );
      return res.status(204).send(null);
    } catch (e) {
      return res.status(500).json({ error: `Failed to save wishlist item: ${errMessage(e)}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
