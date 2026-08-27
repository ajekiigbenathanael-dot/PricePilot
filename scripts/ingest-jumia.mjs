/**
 * ingest-jumia.mjs — persist scraped Jumia prices into MongoDB.
 *
 * This is the SERVER-SIDE ingest step. It reuses the scraper's discovery +
 * JSON-LD extraction (scripts/scrape-jumia.mjs → searchJumia), then does two
 * writes per product against MongoDB (connection from scripts/db.mjs):
 *
 *   1. UPSERT products  — current state (title/offers/lowest_price/…), keyed by a
 *      deterministic UUIDv5 of the product URL (`_id`) so re-runs update the same
 *      document instead of duplicating.
 *   2. INSERT price_observations — one APPEND-ONLY doc recording the price we
 *      actually observed (product, platform, price, timestamp). This is the real,
 *      immutable history from which "price dropped/increased by ₦X" is later
 *      DERIVED. Nothing here is estimated or faked: a movement can only exist once
 *      two genuine observations are on record.
 *
 * SECURITY: `MONGODB_URI` is read from the environment and used ONLY server-side.
 * It is never `VITE_`-prefixed and this file is never imported by src/**, so it
 * can never reach the frontend bundle. Run it server-side only.
 *
 * Usage (Node 20.6+ for --env-file):
 *   node --env-file=.env scripts/ingest-jumia.mjs "infinix hot" --category=phones
 *   npm run ingest:jumia -- "infinix hot" --category=phones [--limit=5]
 *
 * It also exports `createIngestClient()` and `ingestSearch()` so the scheduled
 * batch runner (scripts/ingest-all.mjs) can loop many targets through the exact
 * same write path without spawning a process per target. Importing this module
 * has no side effects — the CLI only runs when the file is executed directly.
 *
 * Requires MONGODB_URI in .env (and optionally MONGODB_DB).
 */
import { pathToFileURL } from 'node:url';
import { searchJumia } from './scrape-jumia.mjs';
import { uuidv5 } from './uuid.mjs';
import { connect, ensureIndexes } from './db.mjs';

/* --------------------------------------------------------------- config --- */

// Valid category slugs — MUST stay in sync with CATEGORIES in
// src/lib/constants.ts. Exported so the batch runner can validate
// ingest-targets.json up front.
export const CATEGORY_SLUGS = [
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

/* ----------------------------------------------------- category mapping --- */

/**
 * Map Jumia's own leaf category (the `category` field in each product's JSON-LD,
 * e.g. "Android Phones" or "Flip Cases", surfaced by the scraper as
 * `source_category`) onto one of our CATEGORY_SLUGS.
 *
 * WHY: a single search matches many products by slug — an "infinix" query hits
 * the phone AND its flip cases — but they are not all the query's category. Using
 * each item's real Jumia category lets the phone store as `phones` while its case
 * stores as `accessories`, instead of tarring everything with one curated slug.
 *
 * Substring keyword match over the lowercased label, in PRIORITY order: accessories
 * is checked before phones so "Flip Cases"/"Phone Cases" resolve to accessories,
 * not phones (they contain "phone"). Anything no rule matches returns `fallback` —
 * the curated per-query slug from ingest-targets.json — so an unrecognized label is
 * never worse than the old blanket behaviour, only better when a rule fires.
 *
 * Confirmed against live pages: "Android Phones" → phones, "Flip Cases" →
 * accessories. The remaining keywords are conservative, collision-checked guesses
 * at Jumia's vocabulary (deliberately omitting ambiguous stems like "pen"/"tablet"/
 * "fan"/"cap" that collide with pendants/medicine/infant-wear/capacitors — those
 * safely fall back). Add rows as real labels are observed; the raw label is stored
 * on each product (`source_category`) so this can be re-run without re-scraping.
 */
const CATEGORY_RULES = [
  ['accessories', ['case', 'cover', 'pouch', 'protector', 'tempered', 'screen guard', 'charger', 'cable', 'adapter', 'earphone', 'headphone', 'earbud', 'headset', 'memory card', 'sd card', 'flash drive', 'pendrive', 'pen drive', 'otg', 'phone holder', 'selfie stick', 'stylus']],
  ['laptops', ['laptop', 'macbook', 'computing', 'desktop', 'monitor', 'all-in-one']],
  ['phones', ['phone', 'smartphone', 'ipad']],
  ['electronics', ['television', 'tv', 'speaker', 'camera', 'audio', 'projector', 'console', 'playstation', 'xbox', 'printer', 'generator', 'inverter', 'power bank', 'powerbank', 'radio']],
  ['textbooks', ['textbook', 'book', 'stationery', 'stationary', 'pencil', 'notebook', 'diary']],
  ['bags', ['backpack', 'bag', 'luggage', 'suitcase', 'satchel']],
  ['dorm-supplies', ['kettle', 'bedsheet', 'bedding', 'duvet', 'pillow', 'blanket', 'mattress', 'bucket', 'flask', 'cookware', 'stove', 'curtain']],
  ['fashion', ['shoe', 'sneaker', 'footwear', 'sandal', 'slipper', 'clothing', 'apparel', 'dress', 'shirt', 'trouser', 'jean', 'wristwatch', 'watch', 'jewel', 'sunglass', 'belt']],
  ['health', ['lotion', 'cream', 'skincare', 'beauty', 'cosmetic', 'makeup', 'soap', 'perfume', 'fragrance', 'deodorant', 'shampoo', 'vitamin', 'supplement', 'sanitary', 'razor', 'hygiene']],
];

/**
 * Classify one Jumia leaf label to a CATEGORY_SLUG, or `fallback` if unrecognized.
 * `fallback` is assumed already validated against CATEGORY_SLUGS by the caller.
 */
export function classifyCategory(sourceCategory, fallback) {
  if (typeof sourceCategory !== 'string' || !sourceCategory.trim()) return fallback;
  const hay = sourceCategory.toLowerCase();
  for (const [slug, keywords] of CATEGORY_RULES) {
    if (keywords.some((k) => hay.includes(k))) return slug;
  }
  return fallback;
}

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';

const naira = (n) => '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });

/** Mask any user:pass@ credentials in a Mongo URI before logging it. */
export const redactUri = (uri) => String(uri).replace(/\/\/[^@/]+@/, '//***@');

/* ---------------------------------------------------------- client setup --- */

/**
 * Open the MongoDB connection from the environment and ensure the app indexes
 * exist. Fatal (process.exit) on a missing/unreachable URI — no target can run
 * without it, so this is correct for both the CLI and the batch runner. Returns
 * { client, db, uri }; the CALLER owns the client and MUST `await client.close()`
 * when done (in a `finally`), or the process hangs on the open socket.
 */
export async function createIngestClient() {
  let conn;
  try {
    conn = await connect();
  } catch (err) {
    die(err.message);
  }
  try {
    await ensureIndexes(conn.db);
  } catch (err) {
    await conn.client.close().catch(() => {});
    die(`could not create indexes: ${err.message}`);
  }
  return conn; // { client, db, uri }
}

/* ------------------------------------------------------------ core ingest --- */

/**
 * Scrape one query and persist it. Reusable by both the CLI and the batch
 * runner. Unlike the CLI arg guards, invalid input / write failures here THROW
 * (rather than exit the process) so a batch can catch, record the failure, and
 * carry on to the next target. Returns a summary of what was written.
 *
 * @param {object}  opts
 * @param {import('mongodb').Db} opts.db
 * @param {string}  opts.keyword     search query
 * @param {string}  opts.category    one of CATEGORY_SLUGS
 * @param {number} [opts.limit]      max products (defaults to the scraper's)
 * @param {string} [opts.mongoUri]   shown (redacted) in the log header only
 * @returns {Promise<{keyword:string, category:string, found:number, upserted:number, observations:number}>}
 */
export async function ingestSearch({ db, keyword, category, limit, mongoUri }) {
  if (!keyword) throw new Error('missing product query');
  if (!category) throw new Error(`missing category — one of: ${CATEGORY_SLUGS.join(', ')}`);
  if (!CATEGORY_SLUGS.includes(category)) {
    throw new Error(`invalid category "${category}". Valid slugs: ${CATEGORY_SLUGS.join(', ')}`);
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error(`invalid limit "${limit}". Must be a positive integer.`);
  }

  console.log(`\nPricePilot · Jumia → MongoDB ingest`);
  console.log(`query   : "${keyword}"`);
  console.log(`category: ${category}`);
  console.log(mongoUri ? `target  : ${redactUri(mongoUri)}\n` : '');

  const { results } = await searchJumia(keyword, limit);

  if (results.length === 0) {
    console.log('No priced products found for that query — nothing to ingest.\n');
    return { keyword, category, found: 0, upserted: 0, observations: 0 };
  }

  // Pair each scraped record with its deterministic product id up front, so the
  // product document and its observation share the same id. Each product also gets
  // its own category, classified from the item's real Jumia label (source_category)
  // and falling back to the curated query slug when the label can't be placed.
  const rows = results.map((record) => ({
    record,
    id: uuidv5(record.url),
    cat: classifyCategory(record.source_category, category),
  }));
  const now = new Date();

  // How many products the real Jumia category pulled OFF the curated slug — e.g. a
  // flip case caught by an "infinix" phone query, corrected phones → accessories.
  const reclassified = rows.filter((r) => r.cat !== category).length;

  const products = db.collection('products');
  const observations = db.collection('price_observations');

  // 1. Product upserts (current state). price_history / price_events are omitted
  //    on purpose: history lives in price_observations, and omitting them keeps
  //    the upsert non-destructive to any existing values on those fields.
  //    `created_at` is set only on insert; `updated_at` on every run.
  const productOps = rows.map(({ record: r, id }) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $set: {
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
              // In stock unless the page explicitly says otherwise (a listed,
              // priced item with unknown availability is treated as available).
              inStock: r.inStock !== false,
              url: r.url,
            },
          ],
          updated_at: now,
        },
        $setOnInsert: { created_at: now },
      },
      upsert: true,
    },
  }));

  // 2. Observation docs (append-only truth). in_stock keeps the honest raw value,
  //    including null when the page didn't state availability. Stored as a Date
  //    so time-ordered reads (latest-per-product) sort correctly.
  const observationDocs = rows.map(({ record: r, id }) => ({
    product_id: id,
    platform: PLATFORM,
    price: r.price,
    currency: r.currency ?? 'NGN',
    in_stock: r.inStock,
    scraped_at: new Date(r.scraped_at),
  }));

  // Parent before child: products must exist before observations reference them.
  try {
    await products.bulkWrite(productOps, { ordered: false });
  } catch (err) {
    throw new Error(`products upsert failed: ${err.message}`);
  }

  try {
    await observations.insertMany(observationDocs);
  } catch (err) {
    throw new Error(`price_observations insert failed: ${err.message}`);
  }

  /* ---------------------------------------------------------- read-back --- */

  const ids = rows.map((r) => r.id);

  const savedProducts = await products
    .find({ _id: { $in: ids } })
    .project({ title: 1, category: 1, lowest_price: 1 })
    .toArray();

  // Observation counts per product, to prove history is accumulating across runs.
  const obs = await observations
    .find({ product_id: { $in: ids } })
    .project({ product_id: 1 })
    .toArray();

  const obsCount = new Map();
  for (const o of obs) obsCount.set(o.product_id, (obsCount.get(o.product_id) ?? 0) + 1);

  console.log(
    `\n✔ upserted ${productOps.length} product(s), logged ${observationDocs.length} observation(s).\n`,
  );

  const byId = new Map(savedProducts.map((p) => [p._id, p]));
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

  return {
    keyword,
    category,
    found: results.length,
    upserted: productOps.length,
    observations: observationDocs.length,
  };
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

async function main() {
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

  const { client, db, uri } = await createIngestClient();

  try {
    await ingestSearch({ db, keyword, category, limit, mongoUri: uri });
  } catch (err) {
    die(err.message);
  } finally {
    // Mongo keeps the socket open; without this the CLI would hang after writing.
    await client.close();
  }
}

// Only run the CLI when executed directly (`node scripts/ingest-jumia.mjs …`).
// Importing this module (e.g. from ingest-all.mjs) must have no side effects.
// Guard argv[1] too: it's undefined under `node -e`, where we must not run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
