/**
 * GET /api/observations?productId=<id>&platform=<slug>
 *
 * The real, append-only price history for a product — oldest first, so the
 * series feeds the sparkline and movement helpers directly. Optional `platform`
 * scope (movement is only meaningful within a single store). Mirrors the old
 * `fetchObservations` query.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/db';
import { errMessage } from './_lib/http';
import { serializeObservation, type ObservationDoc } from './_lib/serialize';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
  if (!productId) return res.status(400).json({ error: 'A productId is required.' });

  const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
  const filter: Record<string, unknown> = { product_id: productId };
  if (platform) filter.platform = platform;

  try {
    const db = await getDb();
    const docs = await db
      .collection<ObservationDoc>('price_observations')
      .find(filter)
      .sort({ scraped_at: 1 })
      .toArray();
    return res.status(200).json(docs.map(serializeObservation));
  } catch (e) {
    return res.status(500).json({ error: `Failed to load price history: ${errMessage(e)}` });
  }
}
