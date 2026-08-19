/**
 * Jumia search-miss discovery + polite extraction — ported from
 * `scripts/scrape-jumia.mjs` for the Deno Edge runtime.
 *
 * WHY this shape: Jumia's robots.txt permits identified bots under 200 req/min
 * but disallows /catalog/ and /search. So we use the two sanctioned surfaces:
 *   1. product sitemaps (static.jumia.com.ng/index-sitemap.xml → products-*)
 *   2. product pages themselves, which server-render JSON-LD Product blocks.
 *
 * This module does NO network I/O — the Edge Function handles fetching and
 * passes HTML in. Pure string/JSON work only.
 */

export interface ScrapedRecord {
  platform: string;
  retailer: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  inStock: boolean | null;
  brand: string | null;
  image_url: string | null;
  url: string;
  scraped_at: string;
}

const SITEMAP_INDEX = 'https://static.jumia.com.ng/index-sitemap.xml';
const REQUEST_DELAY_MS = 900;
const MAX_SITEMAP_FILES = 3;
const DEFAULT_LIMIT = 5;

/* ------------------------------------------------------------------ http -- */

let lastRequestAt = 0;

export async function politeFetch(url: string, { raw = false } = {}): Promise<string | ArrayBuffer> {
  const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const res = await fetch(url, {
    headers: {
      'user-agent': userAgent(),
      'accept-language': 'en-NG,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return raw ? res.arrayBuffer() : res.text();
}

/* -------------------------------------------------------------- discovery -- */

function locsFrom(xml: string, suffix?: string): string[] {
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return suffix ? all.filter((u) => u.includes(suffix)) : all;
}

async function productUrlsFromSitemap(gzUrl: string): Promise<string[]> {
  const buf = await politeFetch(gzUrl, { raw: true }) as ArrayBuffer;
  const bytes = new Uint8Array(buf);
  const decompressed = pakoGunzipSync(bytes);
  const xml = new TextDecoder().decode(decompressed);
  return locsFrom(xml).filter((u) => u.endsWith('.html'));
}

export async function discoverProductUrls(keyword: string, limit = DEFAULT_LIMIT): Promise<string[]> {
  const tokens = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  const indexXml = await politeFetch(SITEMAP_INDEX) as string;
  const productSitemaps = locsFrom(indexXml, 'products-sitemap');

  const matches: string[] = [];
  let scannedFiles = 0;

  for (const sm of productSitemaps) {
    if (matches.length >= limit || scannedFiles >= MAX_SITEMAP_FILES) break;
    const urls = await productUrlsFromSitemap(sm);
    scannedFiles++;
    for (const u of urls) {
      if (tokens.every((t) => u.toLowerCase().includes(t))) {
        matches.push(u);
        if (matches.length >= limit) break;
      }
    }
  }
  return matches;
}

/* -------------------------------------------------------------- extraction -- */

export function scrapeProduct(html: string): ScrapedRecord | null {
  const product = ldJsonNodes(html).find((n) => isType(n, 'Product'));
  if (!product) return null;

  const { price, currency, availability } = readOffer(product.offers);
  const brand =
    typeof product.brand === 'string'
      ? product.brand
      : (product.brand as { name?: string } | undefined)?.name ?? null;

  return {
    platform: 'jumia',
    retailer: 'Jumia',
    title: typeof product.name === 'string' ? product.name : null,
    price,
    currency,
    availability: typeof availability === 'string' ? availability.split('/').pop() ?? null : null,
    inStock: availability ? /instock/i.test(availability) : null,
    brand,
    image_url: normalizeImage(product.image),
    url: '',
    scraped_at: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------- helpers -- */

function userAgent(): string {
  const contact = Deno.env.get('SCRAPER_CONTACT') ?? 'you@example.com (set SCRAPER_CONTACT)';
  return `PricePilotBot/0.1 (+https://github.com/your-org/pricepilot; student price comparison; contact: ${contact})`;
}

function ldJsonNodes(html: string): Record<string, unknown>[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1].trim());

  const nodes: Record<string, unknown>[] = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) nodes.push(...parsed);
      else if (Array.isArray(parsed['@graph'])) nodes.push(...parsed['@graph']);
      else nodes.push(parsed);
    } catch {
      /* skip malformed block */
    }
  }
  return nodes;
}

function isType(node: Record<string, unknown>, type: string): boolean {
  const t = node['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
}

interface OfferShape {
  price?: number | string;
  lowPrice?: number | string;
  priceCurrency?: string;
  availability?: string;
}

function readOffer(offers: unknown): { price: number | null; currency: string | null; availability: string | null } {
  const o = (Array.isArray(offers) ? offers[0] : offers) as OfferShape | undefined;
  if (!o) return { price: null, currency: null, availability: null };
  const raw = o.price ?? o.lowPrice ?? null;
  return {
    price: raw != null ? Number(raw) : null,
    currency: o.priceCurrency ?? null,
    availability: typeof o.availability === 'string' ? o.availability : null,
  };
}

function normalizeImage(image: unknown): string | null {
  const first = Array.isArray(image) ? image[0] : image;
  if (!first) return null;
  if (typeof first === 'string') return first;
  const obj = first as { contentUrl?: string | string[]; url?: string | string[] };
  const src = obj.contentUrl ?? obj.url ?? null;
  return Array.isArray(src) ? (src[0] ?? null) : src;
}

/** Minimal gzip decompression for sitemaps (no external deps). */
function pakoGunzipSync(bytes: Uint8Array): Uint8Array {
  const chunkSize = 65536;
  const decompress = new DecompressionStream('gzip');
  const writer = decompress.writable.getWriter();
  const reader = decompress.readable.getReader();

  writer.write(bytes);
  writer.close();

  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
