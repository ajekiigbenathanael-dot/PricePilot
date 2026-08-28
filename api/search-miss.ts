/**
 * POST /api/search-miss  { query, category?, limit? }
 *
 * Live Jumia scrape triggered when the local catalog has zero matches for a
 * query — the Node/Mongo port of the retired Supabase `search-miss` edge
 * function. Unlike that version (whose `CryptoHash` stub produced all-zero,
 * colliding UUIDs), this uses the real `uuidv5`, so each product URL maps to a
 * stable, distinct id — the same scheme the ingest uses.
 *
 * Flow:
 *   1. Validate input (query required; optional category; limit clamped ≤ 5).
 *   2. `searchJumia` discovers product URLs from Jumia's product sitemaps and
 *      scrapes price/title/brand/image from each page's JSON-LD (robots-compliant,
 *      honest UA, one request at a time — see scripts/scrape-jumia.mjs).
 *   3. UPSERT discovered products + INSERT observations so the next normal search
 *      hits cached data.
 *   4. Return a `LiveSearchResult`-shaped payload with `live: true`.
 *
 * The single outbound-fetch pace is bounded by the platform via `maxDuration`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/db';
import { errMessage } from './_lib/http';
import { resolveUserId } from './_lib/session';
import type { ObservationDoc, ProductDoc } from './_lib/serialize';
import { searchJumia } from '../scripts/scrape-jumia.mjs';
import { uuidv5 } from '../scripts/uuid.mjs';
import { checkRateLimit, clientIp } from './_lib/ratelimit';

export const config = { maxDuration: 30 };

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';
// Per-IP rate limit: max 2 live searches per minute (each can scrape up to 5 pages).
const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_REFILL_PER_SEC = 1 / 30;

/** Vercel parses a JSON body into req.body; be tolerant of a raw string too. */
function readBody(req: VercelRequest): Record<string, unknown> {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return b as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  // ---- per-IP rate limit -------------------------------------------------
  const ip = clientIp(req);
  const rl = checkRateLimit(`search-miss:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_REFILL_PER_SEC);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: `Too many live searches. Try again in ${rl.retryAfter}s.` });
  }

  // ---- input -------------------------------------------------------------
  const body = readBody(req);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) return res.status(400).json({ error: 'A non-empty "query" is required.' });

  const rawCat = typeof body.category === 'string' ? body.category : undefined;
  if (rawCat !== undefined && rawCat !== 'all' && !/^[a-z0-9-]+$/.test(rawCat)) {
    return res.status(400).json({ error: 'Invalid category format.' });
  }
  // 'all' is a UI filter, not a real product category — store real matches under
  // a concrete slug so they surface in normal category-scoped browsing.
  const storeCategory = rawCat && rawCat !== 'all' ? rawCat : 'electronics';

  let limit = typeof body.limit === 'number' ? Math.floor(body.limit) : 5;
  if (!Number.isFinite(limit) || limit < 1) limit = 5;
  if (limit > 5) limit = 5;

  try {
    // ---- discover + scrape (bounded by maxDuration) ----------------------
    const { results } = await searchJumia(query, limit);
    const priced = results.filter((r) => r.price != null && r.url);

    // No live matches → empty payload; the frontend treats this as "nothing".
    if (priced.length === 0) {
      return res.status(200).json({ query, quotes: [], misses: [], products: [], live: true });
    }

    const db = await getDb();
    const productsCol = db.collection<ProductDoc>('products');
    const obsCol = db.collection<ObservationDoc>('price_observations');
    const now = new Date();

    // Optional auth: a signed-in searcher is recorded as each new product's
    // adder, so they (and only they) can later remove it. Anonymous search still
    // works and simply leaves the product unattributed (not user-deletable).
    const userId = await resolveUserId(req);

    // Build one stable id + offer per priced record.
    const built = priced.map((r) => ({
      id: uuidv5(r.url as string),
      record: r,
      offer: {
        platform: PLATFORM,
        retailer: RETAILER,
        price: r.price ?? 0,
        shipping: 0,
        inStock: r.inStock !== false,
        url: r.url as string,
      },
    }));

    // ---- upsert products (stable id → update-in-place, never duplicate) --
    // `added_by` is written ONLY on insert ($setOnInsert), so re-discovering a
    // product someone else added first never transfers ownership. We read the
    // after-image to tell this searcher which live results they own (and may
    // delete) — the update path can't infer that from the write result alone.
    const ownedById = new Map<string, boolean>();
    for (const p of built) {
      const doc = await productsCol.findOneAndUpdate(
        { _id: p.id },
        {
          $set: {
            title: p.record.title ?? 'Untitled',
            category: storeCategory,
            brand: p.record.brand ?? null,
            image_url: p.record.image_url ?? null,
            lowest_price: p.record.price ?? 0,
            offers: [p.offer],
            updated_at: now,
          },
          $setOnInsert: { created_at: now, added_by: userId ?? null },
        },
        { upsert: true, returnDocument: 'after' },
      );
      ownedById.set(
        p.id,
        userId != null && doc?.added_by != null && doc.added_by === userId,
      );
    }

    // ---- append observations (immutable history) -------------------------
    await obsCol.insertMany(
      built.map((p) => ({
        product_id: p.id,
        platform: PLATFORM,
        price: p.record.price ?? 0,
        currency: p.record.currency ?? 'NGN',
        in_stock: p.record.inStock,
        scraped_at: new Date(p.record.scraped_at),
      })),
    );

    // ---- build the LiveSearchResult response -----------------------------
    const products = built.map((p) => ({
      id: p.id,
      title: p.record.title ?? 'Untitled',
      category: storeCategory,
      brand: p.record.brand ?? null,
      image_url: p.record.image_url ?? null,
      description: null,
      lowest_price: p.record.price ?? 0,
      offers: [p.offer],
      price_history: [],
      price_events: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      added_by_me: ownedById.get(p.id) ?? false,
    }));

    const quotes = products.map((product) => {
      const offer = product.offers[0];
      return {
        platform: PLATFORM,
        retailer: RETAILER,
        total: Number(offer.price) + Number(offer.shipping),
        price: Number(offer.price),
        shipping: Number(offer.shipping),
        product,
        url: offer.url,
        isCheapest: true,
      };
    });

    return res.status(200).json({ query, quotes, misses: [], products, live: true });
  } catch (e) {
    return res.status(500).json({ error: `Live search failed: ${errMessage(e)}` });
  }
}
