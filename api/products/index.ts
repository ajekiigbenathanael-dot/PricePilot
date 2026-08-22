/**
 * GET /api/products?category=<slug>
 *
 * Returns the whole catalog as `Product` rows, optionally narrowed to one
 * category (`all` or omitted = everything). Mirrors the old
 * `fetchProducts` Supabase query; ordering is left to the client (Browse
 * re-sorts by its own key). Replaces the direct `supabase.from('products')` read.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import { serializeProduct, type ProductDoc } from '../_lib/serialize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const filter = category && category !== 'all' ? { category } : {};

  try {
    const db = await getDb();
    const docs = await db.collection<ProductDoc>('products').find(filter).toArray();
    return res.status(200).json(docs.map(serializeProduct));
  } catch (e) {
    return res.status(500).json({ error: `Failed to load products: ${errMessage(e)}` });
  }
}
