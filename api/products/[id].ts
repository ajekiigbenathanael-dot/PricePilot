/**
 * GET /api/products/:id
 *
 * One product by its deterministic UUIDv5 id, or 404 when absent. Mirrors the
 * old `fetchProductById` Supabase `.maybeSingle()` read — the frontend's
 * `apiFetch(..., { notFoundAsNull: true })` turns this 404 back into `null` so
 * the detail page keeps its graceful "not found" state.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';
import { serializeProduct, type ProductDoc } from '../_lib/serialize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ error: 'A product id is required.' });

  try {
    const db = await getDb();
    const doc = await db.collection<ProductDoc>('products').findOne({ _id: id });
    if (!doc) return res.status(404).json({ error: 'Product not found.' });
    return res.status(200).json(serializeProduct(doc));
  } catch (e) {
    return res.status(500).json({ error: `Failed to load product: ${errMessage(e)}` });
  }
}
