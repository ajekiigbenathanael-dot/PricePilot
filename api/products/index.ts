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
import { resolveUserId } from '../_lib/session';
import { serializeProduct, type ProductDoc } from '../_lib/serialize';
import { getCached, setCache, cacheKey } from '../_lib/cache';

const CATALOG_TTL_MS = 60_000; // 1 minute — fresh enough for price data, light enough on Mongo

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  try {
    const userId = await resolveUserId(req);

    // Public catalog is anonymous-safe: cache on (category) alone. The per-user
    // `added_by_me` flag is a small post-processing step, so we cache the raw
    // docs and serialize with the current user's id on cache hit.
    const key = cacheKey('products', { category });
    const cached = getCached<ProductDoc[]>(key);
    let docs: ProductDoc[];
    if (cached) {
      docs = cached;
    } else {
      const db = await getDb();
      const filter = category && category !== 'all' ? { category } : {};
      docs = await db.collection<ProductDoc>('products').find(filter).toArray();
      setCache(key, docs, CATALOG_TTL_MS);
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(docs.map((d) => serializeProduct(d, userId)));
  } catch (e) {
    return res.status(500).json({ error: `Failed to load products: ${errMessage(e)}` });
  }
}
