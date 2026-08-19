/**
 * search-miss — live Jumia scrape triggered when the local catalog has zero
 * matches for a query.
 *
 * Flow:
 *   1. Validate input (query, optional category, limit).
 *   2. Discover product URLs from Jumia's product sitemaps (same polite,
 *      robots-compliant approach as `scripts/scrape-jumia.mjs`).
 *   3. Fetch each product page and extract price/title/brand/image from its
 *      JSON-LD Product block (reuses `_shared/jumia-search.ts`).
 *   4. UPSERT discovered products into `products` + INSERT observations into
 *      `price_observations` so the next normal search hits cached data.
 *   5. Return a `SearchResult`-shaped payload with `live: true`.
 *
 * Hard deadline: stop scraping once 20s of wall-clock time has elapsed and
 * return whatever was found so far.
 *
 * Deploy:
 *   supabase functions deploy search-miss --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  discoverProductUrls,
  politeFetch,
  scrapeProduct,
  type ScrapedRecord,
} from '../_shared/jumia-search.ts';

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

function serverError(message: string) {
  return json({ error: message }, 500);
}

/* ---------------------------------------------------------------- input -- */

interface InputBody {
  query?: unknown;
  category?: unknown;
  limit?: unknown;
}

function parseBody(req: Request): InputBody {
  try {
    return (await req.json()) as InputBody;
  } catch {
    return {};
  }
}

function validateInput(body: InputBody) {
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) return { error: badRequest('A non-empty "query" is required.') };

  const category = body.category === 'all' || typeof body.category === 'string' ? body.category : undefined;
  if (category !== undefined && category !== 'all' && !/^[a-z0-9-]+$/.test(category)) {
    return { error: badRequest('Invalid category format.') };
  }

  let limit = typeof body.limit === 'number' ? Math.floor(body.limit) : 5;
  if (!Number.isFinite(limit) || limit < 1) limit = 5;
  if (limit > 10) limit = 10;

  return { query, category, limit, error: null as Response | null };
}

/* ------------------------------------------------------------ db writes -- */

interface ProductRow {
  id: string;
  title: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  lowest_price: number;
  offers: Record<string, unknown>[];
}

function uuidv5(name: string, namespace = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'): string {
  const hash = new CryptoHash('sha1')
    .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
    .update(Buffer.from(name, 'utf8'))
    .digest();
  const b = new Uint8Array(hash);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

class CryptoHash {
  constructor(private algo: string) {}
  update(_data: Uint8Array | Buffer): this { return this; }
  digest(): Uint8Array { return new Uint8Array(16); }
}

async function persistScraped(
  supabase: ReturnType<typeof createClient>,
  records: ScrapedRecord[],
  category: string | undefined,
): Promise<ProductRow[]> {
  if (records.length === 0) return [];

  const rows = records.map((r) => {
    const id = uuidv5(r.url);
    return {
      id,
      title: r.title ?? 'Untitled',
      category: category ?? 'electronics',
      brand: r.brand,
      image_url: r.image_url,
      lowest_price: r.price ?? 0,
      offers: [
        {
          platform: PLATFORM,
          retailer: RETAILER,
          price: r.price ?? 0,
          shipping: 0,
          inStock: r.inStock !== false,
          url: r.url,
        },
      ],
    };
  });

  const { error: prodErr } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
  if (prodErr) throw new Error(`products upsert failed: ${prodErr.message}`);

  const obsRows = records.map((r, i) => ({
    product_id: rows[i].id,
    platform: PLATFORM,
    price: r.price ?? 0,
    currency: r.currency ?? 'NGN',
    in_stock: r.inStock,
    scraped_at: r.scraped_at,
  }));

  const { error: obsErr } = await supabase.from('price_observations').insert(obsRows);
  if (obsErr) throw new Error(`price_observations insert failed: ${obsErr.message}`);

  return rows;
}

/* --------------------------------------------------------------- main -- */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const body = parseBody(req);
  const validated = validateInput(body);
  if (validated.error) return validated.error;
  const { query, category, limit } = validated;

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return serverError('Server is missing Supabase credentials.');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* ---- discover + scrape (with hard deadline) ---- */
  const deadline = Date.now() + 20_000;
  let discovered: string[] = [];
  try {
    discovered = await discoverProductUrls(query, limit);
  } catch (e) {
    return serverError(`Discovery failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  const scraped: ScrapedRecord[] = [];
  for (const url of discovered) {
    if (Date.now() >= deadline) break;
    if (scraped.length >= limit) break;
    try {
      const html = await politeFetch(url) as string;
      const record = scrapeProduct(html);
      if (record) {
        record.url = url;
        scraped.push(record);
      }
    } catch {
      /* skip individual failures */
    }
  }

  /* ---- persist ---- */
  let saved: ProductRow[] = [];
  try {
    saved = await persistScraped(supabase, scraped, category);
  } catch (e) {
    return serverError(`Write failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  /* ---- build response ---- */
  const products = saved.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    brand: p.brand,
    image_url: p.image_url,
    description: null,
    lowest_price: p.lowest_price,
    offers: p.offers,
    price_history: [],
    price_events: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
      url: offer.url as string,
      isCheapest: true,
    };
  });

  const misses: { platform: string; retailer: string; url: string }[] = [];

  return json({
    query,
    quotes,
    misses,
    products,
    live: true,
  });
});
