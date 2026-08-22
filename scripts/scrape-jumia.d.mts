/**
 * Ambient types for scrape-jumia.mjs (a zero-dep JS module) so TypeScript callers
 * in /api can import it without `allowJs`. Keep in sync with the exports there.
 */

/** One normalized product record extracted from a Jumia product page's JSON-LD. */
export interface ScrapedRecord {
  platform: string;
  retailer: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  /** True when the page's availability explicitly says in-stock; null when unstated. */
  inStock: boolean | null;
  brand: string | null;
  image_url: string | null;
  /** Set by the caller/driver to the product-page URL this record came from. */
  url?: string;
  scraped_at: string;
}

/** The honest, identifying bot User-Agent (reused by server-side single fetches). */
export const UA: string;

/** Extract one normalized product record from a product page's HTML (null if none). */
export function scrapeProduct(html: string, url?: string): ScrapedRecord | null;

/** Discover + scrape up to `limit` priced Jumia products matching `keyword`. */
export function searchJumia(
  keyword: string,
  limit?: number,
): Promise<{
  results: ScrapedRecord[];
  scannedFiles: number;
  scannedUrls: number;
  discovered: number;
}>;
