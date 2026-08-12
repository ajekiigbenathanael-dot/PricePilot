/**
 * scrape-jumia.mjs — PricePilot's first *real* price source (MVP, Jumia only).
 *
 * WHY THIS SHAPE (read before changing it):
 * Jumia's robots.txt explicitly permits scraping by identified bots under
 * 200 req/min, but DISALLOWS the search + catalog pages (`/catalog/`, `/*q=`).
 * So we do NOT scrape "search results". Instead we use the two things Jumia
 * *sanctions* for crawlers:
 *   1. the product sitemaps (static.jumia.com.ng/index-sitemap.xml → products-*),
 *      to discover product-page URLs, and
 *   2. the product pages themselves, which server-render a JSON-LD
 *      <script type="application/ld+json"> Product block containing
 *      name / price / priceCurrency / availability — no browser needed.
 *
 * This is also why the production system is a *periodic ingest job*, not a
 * live-per-search call: you crawl the sitemap on a schedule, extract prices,
 * and store them; the app's own search.ts then queries the stored catalog.
 *
 * Good-citizen rules encoded below: an honest, identifying User-Agent (never a
 * fake browser), one request at a time with a delay (~66 rpm, far under the
 * 200 rpm ceiling), and a hard cap on how much we crawl per run.
 *
 * Usage:  node scripts/scrape-jumia.mjs "infinix hot"
 * Output: printed table + scraper-out/jumia-<slug>.json
 *
 * Zero external deps (native fetch + node:zlib), matching scripts/gen-seed.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

/* --------------------------------------------------------------- config --- */

// Honest bot identity. Swap the URL/email for your real project + contact
// before running at any volume — Jumia's policy requires a reachable owner.
const UA =
  'PricePilotBot/0.1 (+https://github.com/your-org/pricepilot; ' +
  'student price comparison; contact: you@example.com)';

const PLATFORM = 'jumia';
const RETAILER = 'Jumia';
const SITEMAP_INDEX = 'https://static.jumia.com.ng/index-sitemap.xml';

const REQUEST_DELAY_MS = 900; // ~66 req/min — well under Jumia's 200 rpm ceiling
const MAX_SITEMAP_FILES = 3; // product sitemaps to scan per run (demo bound)
const DEFAULT_LIMIT = 5; // how many products to fetch + price per run

/* ---------------------------------------------------------- http (polite) - */

let lastRequestAt = 0;

/** One request at a time, spaced by REQUEST_DELAY_MS. Returns text or Buffer. */
async function politeFetch(url, { raw = false } = {}) {
  const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-language': 'en-NG,en;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return raw ? Buffer.from(await res.arrayBuffer()) : res.text();
}

/* -------------------------------------------------------------- discovery - */

/** Pull every <loc> from a sitemap XML string, optionally filtered by suffix. */
function locsFrom(xml, suffix) {
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return suffix ? all.filter((u) => u.includes(suffix)) : all;
}

/** Download a gzipped product sitemap and return its product-page URLs. */
async function productUrlsFromSitemap(gzUrl) {
  const buf = await politeFetch(gzUrl, { raw: true });
  const xml = zlib.gunzipSync(buf).toString('utf8');
  return locsFrom(xml).filter((u) => u.endsWith('.html'));
}

/**
 * Find product URLs whose slug contains every keyword token. This per-query
 * sitemap scan is a DEMO shortcut — in production the ingest job downloads the
 * sitemaps once and indexes them into the DB, then search runs over the DB.
 */
async function discoverProductUrls(keyword, limit) {
  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  const indexXml = await politeFetch(SITEMAP_INDEX);
  const productSitemaps = locsFrom(indexXml, 'products-sitemap');

  const matches = [];
  let scannedFiles = 0;
  let scannedUrls = 0;

  for (const sm of productSitemaps) {
    if (matches.length >= limit || scannedFiles >= MAX_SITEMAP_FILES) break;
    const urls = await productUrlsFromSitemap(sm);
    scannedFiles++;
    scannedUrls += urls.length;
    for (const u of urls) {
      if (tokens.every((t) => u.toLowerCase().includes(t))) {
        matches.push(u);
        if (matches.length >= limit) break;
      }
    }
  }
  return { matches, scannedFiles, scannedUrls };
}

/* -------------------------------------------------------------- extraction */

/** All JSON-LD nodes on a page (flattening arrays and @graph containers). */
function ldJsonNodes(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1].trim());

  const nodes = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) nodes.push(...parsed);
      else if (Array.isArray(parsed['@graph'])) nodes.push(...parsed['@graph']);
      else nodes.push(parsed);
    } catch {
      /* skip a malformed block rather than fail the whole page */
    }
  }
  return nodes;
}

const isType = (node, type) => {
  const t = node?.['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
};

/** Read price/currency/availability from an Offer or AggregateOffer (or array). */
function readOffer(offers) {
  const o = Array.isArray(offers) ? offers[0] : offers;
  if (!o) return { price: null, currency: null, availability: null };
  const raw = o.price ?? o.lowPrice ?? null;
  return {
    price: raw != null ? Number(raw) : null,
    currency: o.priceCurrency ?? null,
    availability:
      typeof o.availability === 'string' ? o.availability.split('/').pop() : null,
  };
}

/**
 * Normalize JSON-LD `image` to a single URL string. It can be a string, an
 * array of strings, or an ImageObject with `contentUrl`/`url` (itself possibly
 * an array) — so unwrap all of those to the first usable URL.
 */
function normalizeImage(image) {
  const first = Array.isArray(image) ? image[0] : image;
  if (!first) return null;
  if (typeof first === 'string') return first;
  const src = first.contentUrl ?? first.url ?? null;
  return Array.isArray(src) ? (src[0] ?? null) : src;
}

/** Extract one normalized product record from a product page's HTML. */
export function scrapeProduct(html, url) {
  const product = ldJsonNodes(html).find((n) => isType(n, 'Product'));
  if (!product) return null;

  const { price, currency, availability } = readOffer(product.offers);
  const brand =
    typeof product.brand === 'string' ? product.brand : (product.brand?.name ?? null);

  return {
    platform: PLATFORM,
    retailer: RETAILER,
    title: product.name ?? null,
    price,
    currency,
    availability,
    inStock: availability ? /instock/i.test(availability) : null,
    brand,
    image_url: normalizeImage(product.image),
    url,
    scraped_at: new Date().toISOString(),
  };
}

/* ----------------------------------------------------------------- driver - */

export async function searchJumia(keyword, limit = DEFAULT_LIMIT) {
  const { matches, scannedFiles, scannedUrls } = await discoverProductUrls(keyword, limit);
  const results = [];

  for (const url of matches) {
    try {
      const record = scrapeProduct(await politeFetch(url), url);
      if (record?.price != null) results.push(record);
      else console.warn('  · no JSON-LD price:', url);
    } catch (e) {
      console.warn('  · skip', url, '—', e.message);
    }
  }
  return { results, scannedFiles, scannedUrls, discovered: matches.length };
}

/* -------------------------------------------------------------------- main - */

// Only run the CLI when this file is executed directly
// (`node scripts/scrape-jumia.mjs "<query>"`). When imported — e.g. by
// scripts/ingest-jumia.mjs, which reuses searchJumia — this block is skipped so
// there are no side effects (no arg parsing, no console output, no file write).
// `process.argv[1]` is absent under `node -e`, so guard before resolving it.
const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const keyword = process.argv.slice(2).join(' ').trim();
  if (!keyword) {
    console.error('usage: node scripts/scrape-jumia.mjs "<product name>"');
    process.exit(1);
  }

  const naira = (n) => '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });

  console.log(`\nPricePilot · Jumia scraper (MVP)`);
  console.log(`query   : "${keyword}"`);
  console.log(`identity: ${UA.split(' ')[0]} (identified bot)`);
  console.log(`pace    : 1 request / ${REQUEST_DELAY_MS}ms, up to ${MAX_SITEMAP_FILES} sitemaps\n`);

  const { results, scannedFiles, scannedUrls, discovered } = await searchJumia(keyword, DEFAULT_LIMIT);

  console.log(
    `\nscanned ${scannedUrls.toLocaleString()} product URLs across ${scannedFiles} sitemap(s) → ` +
      `${discovered} slug match(es) → ${results.length} priced\n`,
  );

  for (const [i, p] of results.entries()) {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   ${naira(p.price)} ${p.currency ?? ''}  ·  ${p.availability ?? 'unknown'}${p.brand ? `  ·  ${p.brand}` : ''}`);
    console.log(`   ${p.url}\n`);
  }

  if (results.length === 0) {
    console.log(
      `No priced matches in the first ${MAX_SITEMAP_FILES} sitemap(s). ` +
        `Try a broader term, or raise MAX_SITEMAP_FILES.\n`,
    );
  }

  const outDir = path.join(process.cwd(), 'scraper-out');
  fs.mkdirSync(outDir, { recursive: true });
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outFile = path.join(outDir, `jumia-${slug}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify({ query: keyword, platform: PLATFORM, scrapedAt: new Date().toISOString(), results }, null, 2),
    'utf8',
  );
  console.log(`written: ${path.relative(process.cwd(), outFile)} (${results.length} records)\n`);
}
