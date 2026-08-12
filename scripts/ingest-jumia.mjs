/**
 * ingest-jumia.mjs — persist scraped Jumia prices into Supabase.
 *
 * This is the SERVER-SIDE ingest step. It reuses the scraper's discovery +
 * JSON-LD extraction (scripts/scrape-jumia.mjs → searchJumia), then does two
 * writes per product with the Supabase `service_role` key:
 *
 *   1. UPSERT public.products  — current state (title/offers/lowest_price/…),
 *      keyed by a deterministic UUIDv5 of the product URL so re-runs update the
 *      same row instead of duplicating.
 *   2. INSERT public.price_observations — one APPEND-ONLY row recording the price
 *      we actually observed (product, platform, price, timestamp). This is the
 *      real, immutable history from which "price dropped/increased by ₦X" is
 *      later DERIVED. Nothing here is estimated or faked: a movement can only
 *      exist once two genuine observations are on record (see migration 0004).
 *
 * SECURITY: the `service_role` key is read from the environment and used ONLY
 * here. It is never `VITE_`-prefixed and this file is never imported by src/**,
 * so it can never reach the frontend bundle. Run it server-side only.
 *
 * Usage (Node 20.6+ for --env-file):
 *   node --env-file=.env scripts/ingest-jumia.mjs "infinix hot" --category=phones
 *   npm run ingest:jumia -- "infinix hot" --category=phones [--limit=5]
 *
 * Requires migrations 0001–0004 applied and SUPABASE_SERVICE_ROLE_KEY in .env.
 */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { searchJumia } from './scrape-jumia.mjs';

/* --------------------------------------------------------------- config --- */

// Valid category slugs — MUST stay in sync with CATEGORIES in
// src/lib/constants.ts and the products.category CHECK (migration 0003).
const CATEGORY_SLUGS = [
  'phones',
  'accessories',
  'laptops',
  'electronics',
  'textbooks',
  'bags',
  'dorm-supplies',
  'fashion',
  'health',
];

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';

/* ------------------------------------------------------------ uuid (v5) --- */

// RFC 4122 URL namespace — a fixed, standard constant. Hashing each product URL
// under it yields a stable id: the same URL always maps to the same product row.
const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Deterministic RFC 4122 v5 (SHA-1) UUID from a name string. Zero-dep. */
function uuidv5(name, namespace = URL_NAMESPACE) {
  const hash = createHash('sha1')
    .update(Buffer.concat([uuidToBytes(namespace), Buffer.from(name, 'utf8')]))
    .digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // variant RFC 4122
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/* -------------------------------------------------------------- cli args --- */

function parseArgs(argv) {
  let category = null;
  let limit;
  const keywordParts = [];
  for (const arg of argv) {
    if (arg.startsWith('--category=')) category = arg.slice('--category='.length).trim().toLowerCase();
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length));
    else keywordParts.push(arg);
  }
  return { keyword: keywordParts.join(' ').trim(), category, limit };
}

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ main --- */

const { keyword, category, limit } = parseArgs(process.argv.slice(2));

if (!keyword) {
  die('missing product query.\n  usage: node --env-file=.env scripts/ingest-jumia.mjs "<query>" --category=<slug> [--limit=N]');
}
if (!category) {
  die(`missing --category. Pass one of: ${CATEGORY_SLUGS.join(', ')}`);
}
if (!CATEGORY_SLUGS.includes(category)) {
  die(`invalid --category "${category}". Valid slugs: ${CATEGORY_SLUGS.join(', ')}`);
}
if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
  die(`invalid --limit "${limit}". Must be a positive integer.`);
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  die('missing SUPABASE_URL / VITE_SUPABASE_URL. Did you run with `node --env-file=.env`?');
}
if (!SERVICE_ROLE_KEY) {
  die(
    'missing SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Add it to .env (server-side only — never a VITE_ var). With the new key\n' +
      '  format it is the "sb_secret_…" key (Project Settings → API → secret key),\n' +
      '  the counterpart of the sb_publishable_… anon key. Then run with\n' +
      '  `node --env-file=.env`.',
  );
}

// service_role client: no session persistence/refresh — this is a one-shot job.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const naira = (n) => '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });

console.log(`\nPricePilot · Jumia → Supabase ingest`);
console.log(`query   : "${keyword}"`);
console.log(`category: ${category}`);
console.log(`target  : ${SUPABASE_URL}\n`);

const { results } = await searchJumia(keyword, limit);

if (results.length === 0) {
  console.log('No priced products found for that query — nothing to ingest.\n');
  process.exit(0);
}

// Pair each scraped record with its deterministic product id up front, so the
// products row and its observation share the same id.
const rows = results.map((record) => ({ record, id: uuidv5(record.url) }));

// 1. Product rows (current state). price_history / price_events are omitted on
//    purpose: history now lives in price_observations, and omitting them keeps
//    the upsert non-destructive to any existing values on those columns.
const productRows = rows.map(({ record: r, id }) => ({
  id,
  title: r.title,
  category,
  brand: r.brand,
  image_url: r.image_url,
  lowest_price: r.price, // Jumia JSON-LD has no shipping → total == price
  offers: [
    {
      platform: PLATFORM,
      retailer: RETAILER,
      price: r.price,
      shipping: 0,
      // In stock unless the page explicitly says otherwise (a listed, priced
      // item with unknown availability is treated as available for the UI).
      inStock: r.inStock !== false,
      url: r.url,
    },
  ],
}));

// 2. Observation rows (append-only truth). in_stock keeps the honest raw value,
//    including null when the page didn't state availability.
const observationRows = rows.map(({ record: r, id }) => ({
  product_id: id,
  platform: PLATFORM,
  price: r.price,
  currency: r.currency ?? 'NGN',
  in_stock: r.inStock,
  scraped_at: r.scraped_at,
}));

// Parent before child: products must exist before observations reference them.
const { error: productErr } = await supabase
  .from('products')
  .upsert(productRows, { onConflict: 'id' });

if (productErr) {
  if (/category/i.test(productErr.message) && /check/i.test(productErr.message)) {
    die(`products upsert failed on the category CHECK — apply migration 0003 (widen categories).\n  ${productErr.message}`);
  }
  die(`products upsert failed: ${productErr.message}${productErr.details ? `\n  ${productErr.details}` : ''}`);
}

const { error: obsErr } = await supabase.from('price_observations').insert(observationRows);

if (obsErr) {
  if (/price_observations/i.test(obsErr.message) && /(does not exist|relation)/i.test(obsErr.message)) {
    die(`price_observations insert failed — apply migration 0004 first.\n  ${obsErr.message}`);
  }
  die(`price_observations insert failed: ${obsErr.message}${obsErr.details ? `\n  ${obsErr.details}` : ''}`);
}

/* ------------------------------------------------------------ read-back --- */

const ids = rows.map((r) => r.id);

const { data: savedProducts, error: readErr } = await supabase
  .from('products')
  .select('id, title, category, lowest_price')
  .in('id', ids);

if (readErr) die(`read-back failed: ${readErr.message}`);

// Observation counts per product, to prove history is accumulating across runs.
const { data: obs, error: obsReadErr } = await supabase
  .from('price_observations')
  .select('product_id')
  .in('product_id', ids);

if (obsReadErr) die(`observation read-back failed: ${obsReadErr.message}`);

const obsCount = new Map();
for (const o of obs ?? []) obsCount.set(o.product_id, (obsCount.get(o.product_id) ?? 0) + 1);

console.log(
  `\n✔ upserted ${productRows.length} product(s), logged ${observationRows.length} observation(s).\n`,
);

const byId = new Map((savedProducts ?? []).map((p) => [p.id, p]));
for (const [i, id] of ids.entries()) {
  const p = byId.get(id);
  if (!p) continue;
  const count = obsCount.get(id) ?? 0;
  console.log(`${i + 1}. ${p.title}`);
  console.log(`   ${naira(p.lowest_price)}  ·  ${p.category}  ·  ${count} observation(s) on record`);
}

const multiObs = ids.filter((id) => (obsCount.get(id) ?? 0) >= 2).length;
console.log(
  multiObs > 0
    ? `\n${multiObs} product(s) now have ≥2 observations — real price movement can be computed for them.\n`
    : `\nEvery product has exactly 1 observation so far. Run the ingest again later to record a\nsecond real price — only then can genuine "dropped/increased by ₦X" movement be shown.\n`,
);
