/**
 * check-price — a bounded, on-demand live price check for ONE product.
 *
 * The browser can't do this itself: a store fetch from the page would be blocked
 * by CORS, must carry an honest bot User-Agent, and the write needs the
 * service_role key (which must never reach the client). So the "Check current
 * price" button calls this Edge Function, which runs server-side and:
 *
 *   1. loads the product and finds its re-fetchable Jumia offer (a real product
 *      page — a `….html` URL, not a search URL);
 *   2. RATE-GUARD: if we already recorded a price in the last few minutes, it
 *      returns that reading instead of hitting Jumia again (protects the store
 *      and keeps the append-only log from filling with click-spam duplicates);
 *   3. otherwise does ONE polite, time-bounded fetch of that product page and
 *      reads the price from its JSON-LD (see `../_shared/jumia.ts`);
 *   4. APPENDS a `price_observations` row — the immutable truth from which price
 *      movement is later derived (never a stored/faked delta), and
 *   5. reflects the new price on the `products` row (offer + `lowest_price`).
 *
 * Integrity: every non-throttled check records a genuine observation of the
 * price at that moment — even an unchanged price is real evidence it held.
 * Movement still needs two real rows, so a first-ever check shows no change.
 *
 * Deploy (service_role + project URL are auto-injected by the platform):
 *   supabase functions deploy check-price --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { scrapeProduct } from '../_shared/jumia.ts';

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';

// Honest, identifying bot UA — same policy as scripts/scrape-jumia.mjs. Jumia's
// crawler policy requires a reachable owner, so set a real contact via a
// SCRAPER_CONTACT function secret (supabase secrets set SCRAPER_CONTACT=…). The
// committed fallback below is a deliberate placeholder (keeps any personal
// contact out of source and git history) and must not be used at volume.
// (Update the repo URL to the real repo once it's pushed.)
const CONTACT = Deno.env.get('SCRAPER_CONTACT') ?? 'you@example.com (set SCRAPER_CONTACT)';
const UA =
  'PricePilotBot/0.1 (+https://github.com/your-org/pricepilot; ' +
  `student price comparison; contact: ${CONTACT})`;

const FETCH_TIMEOUT_MS = 10_000;
// Don't re-fetch the same product more than once per window.
const RATE_GUARD_MS = 10 * 60 * 1000;

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A stored jsonb offer (loose — validated where used). */
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  // ---- input -------------------------------------------------------------
  let productId = '';
  try {
    const body = await req.json();
    productId = String(body?.productId ?? '').trim();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  if (!UUID_RE.test(productId)) {
    return json({ error: 'A valid productId is required.' }, 400);
  }

  // ---- clients / env (auto-injected into every Edge Function) ------------
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Server is missing Supabase credentials.' }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- load product + its re-fetchable Jumia offer -----------------------
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, offers, lowest_price')
    .eq('id', productId)
    .maybeSingle();

  if (prodErr) return json({ error: `Could not load product: ${prodErr.message}` }, 500);
  if (!product) return json({ error: 'Product not found.' }, 404);

  const offers = (product.offers ?? []) as Offer[];
  const targetIdx = offers.findIndex(
    (o) => o.platform === PLATFORM && isJumiaProductUrl(o.url),
  );
  if (targetIdx === -1) {
    return json({ error: 'This product has no live Jumia product link to check.' }, 422);
  }
  const targetUrl = offers[targetIdx].url as string;

  // ---- rate guard: reuse the last reading if it's fresh enough -----------
  const { data: recent } = await supabase
    .from('price_observations')
    .select('price, scraped_at')
    .eq('product_id', productId)
    .eq('platform', PLATFORM)
    .order('scraped_at', { ascending: false })
    .limit(2);

  const latest = recent?.[0] ?? null;
  const prior = recent?.[1] ?? null;

  if (latest && Date.now() - new Date(latest.scraped_at).getTime() < RATE_GUARD_MS) {
    const price = Number(latest.price);
    const previousPrice = prior ? Number(prior.price) : null;
    return json({
      status: 'throttled',
      price,
      currency: 'NGN',
      inStock: null,
      observedAt: latest.scraped_at,
      previousPrice,
      changed: priceChanged(price, previousPrice),
    });
  }

  // ---- one bounded, polite fetch of the product page ---------------------
  let html: string;
  try {
    const res = await fetch(targetUrl, {
      headers: { 'user-agent': UA, 'accept-language': 'en-NG,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return json({ error: `Store returned HTTP ${res.status}.` }, 502);
    html = await res.text();
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    return json(
      { error: timedOut ? 'The store took too long to respond.' : 'Could not reach the store.' },
      504,
    );
  }

  const scraped = scrapeProduct(html);
  if (!scraped || scraped.price == null || !Number.isFinite(scraped.price)) {
    return json({ error: 'Could not read a current price from the store page.' }, 502);
  }

  const price = Number(scraped.price);
  const currency = scraped.currency ?? 'NGN';
  const observedAt = new Date().toISOString();

  // ---- append the observation (immutable truth) --------------------------
  const { error: obsErr } = await supabase.from('price_observations').insert({
    product_id: productId,
    platform: PLATFORM,
    price,
    currency,
    in_stock: scraped.inStock,
    scraped_at: observedAt,
  });
  if (obsErr) return json({ error: `Could not record the price: ${obsErr.message}` }, 500);

  // ---- reflect the new price on the product (current state) --------------
  // Best-effort: the observation above is the source of truth; if this derived
  // update fails, the next ingest/check will reconcile it. Don't fail the call.
  offers[targetIdx] = {
    ...offers[targetIdx],
    price,
    retailer: offers[targetIdx].retailer ?? RETAILER,
    inStock: scraped.inStock !== false,
  };
  const lowestPrice = Math.min(
    ...offers.map((o) => (Number(o.price) || 0) + (Number(o.shipping) || 0)),
  );
  await supabase
    .from('products')
    .update({ offers, lowest_price: lowestPrice })
    .eq('id', productId);

  const previousPrice = latest ? Number(latest.price) : null;
  return json({
    status: 'updated',
    price,
    currency,
    inStock: scraped.inStock,
    observedAt,
    previousPrice,
    changed: priceChanged(price, previousPrice),
  });
});
