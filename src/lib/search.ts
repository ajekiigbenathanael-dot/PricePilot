/**
 * Search — the per-platform comparison engine.
 *
 * PricePilot's search does NOT just filter a product list. It models what a
 * real deployment does: fan a query out to one *adapter* per store (Jumia,
 * Konga, Slot, PayPorte, Temu), let each return the cheapest matching offer it
 * carries, then assemble a per-platform breakdown with the overall cheapest
 * highlighted. Stores that carry nothing for the query come back as "misses".
 *
 * Today each adapter reads the local sample catalog. When real scraping lands,
 * only the adapter *internals* change — swap the catalog read for an HTTP call
 * to that store — and every return shape (PlatformQuote / PlatformMiss /
 * SearchResult) stays identical, so the UI never changes.
 */
import type {
  PlatformMiss,
  PlatformQuote,
  Product,
  RetailerOffer,
  SearchResult,
} from '@/types';
import type { CategorySlug, PlatformSlug } from '@/lib/constants';
import { PLATFORMS, platformSearchUrl } from '@/lib/constants';
import { FEATURED_PRODUCTS } from '@/lib/sampleProducts';
import { offerTotal } from '@/lib/pricing';

/** The catalog every adapter searches. Swap for a live source later. */
const CATALOG: Product[] = FEATURED_PRODUCTS;

/** Normalize text for loose matching: lowercase, strip punctuation, collapse space. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Does a product match the query? A product matches when every query token
 * appears somewhere in its title, brand, category or description. This makes
 * multi-word queries ("laptop charger", "power bank") behave like an AND
 * search rather than returning everything that shares a single common word.
 */
function productMatches(product: Product, tokens: string[]): boolean {
  const haystack = normalize(
    [product.title, product.brand ?? '', product.category, product.description ?? ''].join(' '),
  );
  return tokens.every((t) => haystack.includes(t));
}

/** A single platform's contribution to a query: its cheapest matching offer. */
interface AdapterHit {
  product: Product;
  offer: RetailerOffer;
  total: number;
}

/**
 * One platform "adapter". Given the matching products, find the cheapest
 * in-stock offer THIS platform actually lists. Returns null when the store
 * carries none of the matches (→ becomes a PlatformMiss). This is the seam a
 * real scraper drops into: same signature, live data inside.
 */
function runAdapter(platform: PlatformSlug, matches: Product[]): AdapterHit | null {
  let best: AdapterHit | null = null;

  for (const product of matches) {
    for (const offer of product.offers) {
      if (offer.platform !== platform || !offer.inStock) continue;
      const total = offerTotal(offer);
      if (!best || total < best.total) {
        best = { product, offer, total };
      }
    }
  }

  return best;
}

/** Optional narrowing applied before the adapters run. */
export interface SearchOptions {
  /**
   * Restrict matches to a single category. `'all'` (or omitted) searches the
   * whole catalog. Applied *before* the per-platform adapters, so every quote,
   * miss, and product below reflects the same category constraint.
   */
  category?: CategorySlug | 'all';
}

/**
 * Run a query across every platform and assemble the per-platform breakdown.
 *
 * @returns a {@link SearchResult}: one quote per platform that had a match
 * (cheapest total first, overall winner flagged), a miss per platform that had
 * none, and the flat list of matched products for the card grid.
 */
export function searchProducts(rawQuery: string, options: SearchOptions = {}): SearchResult {
  const query = rawQuery.trim();
  const tokens = normalize(query).split(' ').filter(Boolean);
  const { category } = options;

  // Empty query → no matches, but still surface every store's search link.
  let matches = tokens.length ? CATALOG.filter((p) => productMatches(p, tokens)) : [];

  // Category acts as a pre-filter: the quotes are the cheapest match *within*
  // the selected category, never leaking in an off-category product.
  if (category && category !== 'all') {
    matches = matches.filter((p) => p.category === category);
  }

  const quotes: PlatformQuote[] = [];
  const misses: PlatformMiss[] = [];

  for (const { slug, label } of PLATFORMS) {
    const hit = runAdapter(slug, matches);
    if (hit) {
      quotes.push({
        platform: slug,
        retailer: label,
        total: hit.total,
        price: hit.offer.price,
        shipping: hit.offer.shipping,
        product: hit.product,
        url: hit.offer.url,
        isCheapest: false, // set below once all quotes are in
      });
    } else {
      misses.push({
        platform: slug,
        retailer: label,
        url: platformSearchUrl(slug, query),
      });
    }
  }

  // Cheapest total first; flag the single overall winner.
  quotes.sort((a, b) => a.total - b.total);
  if (quotes.length) quotes[0].isCheapest = true;

  return { query, quotes, misses, products: matches };
}
