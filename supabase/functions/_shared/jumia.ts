/**
 * Portable Jumia product-page parser — the SAME JSON-LD extraction used by
 * `scripts/scrape-jumia.mjs`, ported to TypeScript for the Deno Edge runtime.
 *
 * Pure string/JSON work only (no Node, no Deno, no network APIs): the Edge
 * Function does the one bounded, robots-compliant fetch and passes the HTML
 * here — this file never makes a request itself.
 *
 * WHY JSON-LD: Jumia server-renders a `<script type="application/ld+json">`
 * Product block (name / price / priceCurrency / availability) on every product
 * page — the crawler-sanctioned way to read a price with no browser needed. See
 * `scripts/scrape-jumia.mjs` for the full robots.txt rationale.
 */

export interface ScrapedProduct {
  title: string | null;
  price: number | null;
  currency: string | null;
  /** The bare availability token, e.g. "InStock" / "OutOfStock" (or null). */
  availability: string | null;
  /** true/false when the page states availability; null when it doesn't. */
  inStock: boolean | null;
  brand: string | null;
  image_url: string | null;
}

type LdNode = Record<string, unknown>;

/** All JSON-LD nodes on a page (flattening arrays and `@graph` containers). */
function ldJsonNodes(html: string): LdNode[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1].trim());

  const nodes: LdNode[] = [];
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

function isType(node: LdNode, type: string): boolean {
  const t = node?.['@type'];
  return t === type || (Array.isArray(t) && t.includes(type));
}

interface OfferShape {
  price?: number | string;
  lowPrice?: number | string;
  priceCurrency?: string;
  availability?: string;
}

/** Read price/currency/availability from an Offer or AggregateOffer (or array). */
function readOffer(offers: unknown): {
  price: number | null;
  currency: string | null;
  availability: string | null;
} {
  const o = (Array.isArray(offers) ? offers[0] : offers) as OfferShape | undefined;
  if (!o) return { price: null, currency: null, availability: null };
  const raw = o.price ?? o.lowPrice ?? null;
  return {
    price: raw != null ? Number(raw) : null,
    currency: o.priceCurrency ?? null,
    availability:
      typeof o.availability === 'string' ? (o.availability.split('/').pop() ?? null) : null,
  };
}

/**
 * Normalize JSON-LD `image` to a single URL string. It can be a string, an
 * array of strings, or an ImageObject with `contentUrl`/`url` (itself possibly
 * an array) — so unwrap all of those to the first usable URL.
 */
function normalizeImage(image: unknown): string | null {
  const first = Array.isArray(image) ? image[0] : image;
  if (!first) return null;
  if (typeof first === 'string') return first;
  const obj = first as { contentUrl?: string | string[]; url?: string | string[] };
  const src = obj.contentUrl ?? obj.url ?? null;
  return Array.isArray(src) ? (src[0] ?? null) : src;
}

/** Extract one normalized product record from a product page's HTML. */
export function scrapeProduct(html: string): ScrapedProduct | null {
  const product = ldJsonNodes(html).find((n) => isType(n, 'Product'));
  if (!product) return null;

  const { price, currency, availability } = readOffer(product.offers);
  const brandRaw = product.brand;
  const brand =
    typeof brandRaw === 'string'
      ? brandRaw
      : ((brandRaw as { name?: string } | undefined)?.name ?? null);

  return {
    title: typeof product.name === 'string' ? product.name : null,
    price,
    currency,
    availability,
    inStock: availability ? /instock/i.test(availability) : null,
    brand,
    image_url: normalizeImage(product.image),
  };
}
