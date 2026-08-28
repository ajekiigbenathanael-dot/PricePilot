/**
 * POST /api/check-price  { productId }
 *
 * A bounded, on-demand live price check for ONE product — the Node/Mongo port of
 * the retired Supabase `check-price` edge function. The browser can't do this
 * itself (store fetch is CORS-blocked, needs an honest bot UA, and the write
 * needs server-only Mongo creds), so the "Check current price" button calls here.
 *
 * It:
 *   1. loads the product and finds its re-fetchable Jumia offer (a real product
 *      page — a `….html` URL, not a search URL);
 *   2. RATE-GUARD: if we already recorded a price in the last few minutes, it
 *      returns that reading instead of hitting Jumia again (protects the store
 *      and keeps the append-only log from filling with click-spam duplicates);
 *   3. otherwise does ONE polite, time-bounded fetch of that product page and
 *      reads the price from its JSON-LD (reuses scripts/scrape-jumia.mjs);
 *   4. APPENDS a `price_observations` doc — the immutable truth from which price
 *      movement is later derived (never a stored/faked delta), and
 *   5. reflects the new price on the `products` doc (offer + `lowest_price`).
 *
 * Integrity: every non-throttled check records a genuine observation of the
 * price at that moment — even an unchanged price is real evidence it held.
 * Movement still needs two real rows, so a first-ever check shows no change.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/db';
import { errMessage, UUID_RE } from './_lib/http';
import type { ObservationDoc, ProductDoc } from './_lib/serialize';
import { UA, scrapeProduct } from '../scripts/scrape-jumia.mjs';
import { checkRateLimit, clientIp } from './_lib/ratelimit';

// Serverless: allow up to 30s for the single outbound store fetch + writes.
export const config = { maxDuration: 30 };

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';
const FETCH_TIMEOUT_MS = 10_000;
// Don't re-fetch the same product more than once per window.
const RATE_GUARD_MS = 10 * 60 * 1000;
// Per-IP rate limit: max 6 checks per minute (one every 10s).
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_REFILL_PER_SEC = 1 / 10;

/** A stored offer (loose — validated where used). */
interface Offer {
  platform?: string;
  retailer?: string;
  price?: number;
  shipping?: number;
  inStock?: boolean;
  url?: string;
}

/** A Jumia offer we can actually re-fetch: a product page (.html), not a search URL. */
function isJumiaProductUrl(url: string | undefined): url is string {
  return typeof url === 'string' && /jumia\./i.test(url) && /\.html($|[?#])/i.test(url);
}

/** True when `now` differs from a previous price by at least one kobo. */
function priceChanged(now: number, before: number | null): boolean {
  return before != null && Math.abs(now - before) >= 0.01;
}

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
  const rl = checkRateLimit(`check-price:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_REFILL_PER_SEC);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: `Too many price checks. Try again in ${rl.retryAfter}s.` });
  }

  // ---- input -------------------------------------------------------------
  const productId = String(readBody(req).productId ?? '').trim();
  if (!UUID_RE.test(productId)) {
    return res.status(400).json({ error: 'A valid productId is required.' });
  }

  try {
    const db = await getDb();
    const products = db.collection<ProductDoc>('products');
    const observations = db.collection<ObservationDoc>('price_observations');

    // ---- load product + its re-fetchable Jumia offer ---------------------
    const product = await products.findOne({ _id: productId });
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const offers = ((product.offers ?? []) as Offer[]).slice();
    const targetIdx = offers.findIndex(
      (o) => o.platform === PLATFORM && isJumiaProductUrl(o.url),
    );
    if (targetIdx === -1) {
      return res
        .status(422)
        .json({ error: 'This product has no live Jumia product link to check.' });
    }
    const targetUrl = offers[targetIdx].url as string;

    // ---- rate guard: reuse the last reading if it's fresh enough ---------
    const recent = await observations
      .find({ product_id: productId, platform: PLATFORM })
      .sort({ scraped_at: -1 })
      .limit(2)
      .toArray();

    const latest = recent[0] ?? null;
    const prior = recent[1] ?? null;

    if (latest && Date.now() - new Date(latest.scraped_at).getTime() < RATE_GUARD_MS) {
      const price = Number(latest.price);
      const previousPrice = prior ? Number(prior.price) : null;
      return res.status(200).json({
        status: 'throttled',
        price,
        currency: latest.currency ?? 'NGN',
        inStock: null,
        observedAt: new Date(latest.scraped_at).toISOString(),
        previousPrice,
        changed: priceChanged(price, previousPrice),
      });
    }

    // ---- one bounded, polite fetch of the product page -------------------
    let html: string;
    try {
      const storeRes = await fetch(targetUrl, {
        headers: { 'user-agent': UA, 'accept-language': 'en-NG,en;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!storeRes.ok) return res.status(502).json({ error: `Store returned HTTP ${storeRes.status}.` });
      html = await storeRes.text();
    } catch (e) {
      const timedOut = e instanceof Error && e.name === 'TimeoutError';
      return res.status(504).json({
        error: timedOut ? 'The store took too long to respond.' : 'Could not reach the store.',
      });
    }

    const scraped = scrapeProduct(html, targetUrl);
    if (!scraped || scraped.price == null || !Number.isFinite(scraped.price)) {
      return res.status(502).json({ error: 'Could not read a current price from the store page.' });
    }

    const price = Number(scraped.price);
    const currency = scraped.currency ?? 'NGN';
    const observedAt = new Date();

    // ---- append the observation (immutable truth) ------------------------
    await observations.insertOne({
      product_id: productId,
      platform: PLATFORM,
      price,
      currency,
      in_stock: scraped.inStock,
      scraped_at: observedAt,
    });

    // ---- reflect the new price on the product (current state) ------------
    // Best-effort: the observation above is the source of truth; if this derived
    // update fails, the next ingest/check reconciles it. Don't fail the call.
    offers[targetIdx] = {
      ...offers[targetIdx],
      price,
      retailer: offers[targetIdx].retailer ?? RETAILER,
      inStock: scraped.inStock !== false,
    };
    const lowestPrice = Math.min(
      ...offers.map((o) => (Number(o.price) || 0) + (Number(o.shipping) || 0)),
    );
    try {
      await products.updateOne(
        { _id: productId },
        { $set: { offers, lowest_price: lowestPrice, updated_at: observedAt } },
      );
    } catch {
      /* derived state only — the observation is already recorded */
    }

    const previousPrice = latest ? Number(latest.price) : null;
    return res.status(200).json({
      status: 'updated',
      price,
      currency,
      inStock: scraped.inStock,
      observedAt: observedAt.toISOString(),
      previousPrice,
      changed: priceChanged(price, previousPrice),
    });
  } catch (e) {
    return res.status(500).json({ error: `Price check failed: ${errMessage(e)}` });
  }
}
