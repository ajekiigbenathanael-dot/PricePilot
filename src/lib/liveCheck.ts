import { apiFetch } from '@/lib/api';
import type { Product, RetailerOffer } from '@/types';

/** What POST /api/check-price returns on success. */
export interface LiveCheckResult {
  /** `updated` = a fresh reading was fetched + recorded; `throttled` = we reused
   *  a very recent reading instead of hitting the store again. */
  status: 'updated' | 'throttled';
  price: number;
  currency: string;
  inStock: boolean | null;
  /** ISO timestamp of the observation this result reflects. */
  observedAt: string;
  /** The previously recorded price, or null when this is the first reading. */
  previousPrice: number | null;
  /** True when `price` differs from `previousPrice` (a real, derived movement). */
  changed: boolean;
}

/**
 * The single Jumia offer we can re-check live: a real product page (`….html`),
 * not a store *search* URL. Sample/seed offers point at search results, so they
 * return `null` here — and the "Check current price" button stays hidden for
 * them (we never pretend to live-check a link we can't actually re-fetch).
 */
export function liveCheckableOffer(product: Product): RetailerOffer | null {
  return (
    product.offers.find(
      (o) => o.platform === 'jumia' && /jumia\./i.test(o.url) && /\.html($|[?#])/i.test(o.url),
    ) ?? null
  );
}

/**
 * Ask POST /api/check-price to fetch this product's current Jumia price right
 * now. The serverless function does the server-side, robots-compliant fetch,
 * appends a real `price_observations` row, and updates the product; we just
 * relay the result. `apiFetch` throws with the server's own message on failure.
 */
export async function checkCurrentPrice(productId: string): Promise<LiveCheckResult> {
  return apiFetch<LiveCheckResult>('/api/check-price', {
    method: 'POST',
    json: { productId },
  });
}
