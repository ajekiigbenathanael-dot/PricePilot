/**
 * GET    /api/products/:id — one product by its deterministic UUIDv5 id, or 404.
 * DELETE /api/products/:id — remove a product, but ONLY for the signed-in user
 *                            who originally added it via their own live search.
 *
 * The GET mirrors the old `fetchProductById` Supabase `.maybeSingle()` read —
 * the frontend's `apiFetch(..., { notFoundAsNull: true })` turns the 404 back
 * into `null` so the detail page keeps its graceful "not found" state. It also
 * resolves the session (optional) to stamp `added_by_me`, which gates the
 * client's remove control.
 *
 * The DELETE enforces ownership SERVER-SIDE and atomically: the conditional
 * `deleteOne({ _id, added_by: userId })` removes the row only when both match,
 * so a client can never delete a product it didn't add regardless of what it
 * claims. `added_by_me` in the read payload is a UI hint only, never trusted here.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage, UUID_RE } from '../_lib/http';
import { resolveUserId } from '../_lib/session';
import { serializeProduct, type ProductDoc } from '../_lib/serialize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ error: 'A product id is required.' });

  if (req.method === 'GET') {
    try {
      const userId = await resolveUserId(req);
      const db = await getDb();
      const doc = await db.collection<ProductDoc>('products').findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: 'Product not found.' });
      return res.status(200).json(serializeProduct(doc, userId));
    } catch (e) {
      return res.status(500).json({ error: `Failed to load product: ${errMessage(e)}` });
    }
  }

  if (req.method === 'DELETE') {
    // Product ids are deterministic UUIDv5 strings; reject anything else early.
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid product id.' });

    try {
      const userId = await resolveUserId(req);
      if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

      const db = await getDb();
      const products = db.collection<ProductDoc>('products');

      // Atomic, ownership-scoped delete: matches only this user's own product.
      const result = await products.deleteOne({ _id: id, added_by: userId });
      if (result.deletedCount === 1) return res.status(204).send(null);

      // Nothing removed → explain why. This lookup is only for the error code;
      // the delete above was already atomic, so there's no privilege race here.
      const existing = await products.findOne({ _id: id }, { projection: { _id: 1 } });
      if (!existing) return res.status(404).json({ error: 'Product not found.' });
      return res.status(403).json({ error: 'You can only remove products you added.' });
    } catch (e) {
      return res.status(500).json({ error: `Failed to delete product: ${errMessage(e)}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
