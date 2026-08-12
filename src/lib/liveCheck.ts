import { supabase } from '@/lib/supabase';
import type { Product, RetailerOffer } from '@/types';

/** What the `check-price` Edge Function returns on success. */
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
 * Ask the `check-price` Edge Function to fetch this product's current Jumia
 * price right now. The function does the server-side, robots-compliant fetch,
 * appends a real `price_observations` row, and updates the product; we just
 * relay the result. Throws with a readable message on failure.
 */
export async function checkCurrentPrice(productId: string): Promise<LiveCheckResult> {
  const { data, error } = await supabase.functions.invoke<LiveCheckResult>('check-price', {
    body: { productId },
  });

  if (error) {
    // supabase-js wraps a non-2xx response in a FunctionsHttpError whose
    // `context` is the raw Response — surface the function's own { error }
    // message when we can, else fall back to the generic error text.
    let message = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.json();
        if (body && typeof body.error === 'string') message = body.error;
      } catch {
        /* keep the generic message */
      }
    }
    throw new Error(message);
  }

  if (!data) throw new Error('No response from the price check.');
  return data;
}
