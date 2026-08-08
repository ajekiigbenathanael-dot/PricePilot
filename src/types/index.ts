/**
 * Shared domain types — mirror the Supabase schema in `supabase/migrations`.
 * Maintained by hand for now; can be swapped for generated types later via
 * `supabase gen types typescript`.
 */
import type { CategorySlug, PlatformSlug } from '@/lib/constants';

/** One authenticated user's profile row (1:1 with auth.users). */
export interface Profile {
  id: string; // == auth.users.id
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One platform's offer for a product — a single row of the comparison table.
 * PricePilot never sells: `url` is an outbound link to the store where the user
 * completes the purchase ("View on Jumia"). `platform` ties the offer to a
 * known store (Jumia, Konga, …); `retailer` is the human label shown.
 */
export interface RetailerOffer {
  platform: PlatformSlug; // e.g. "jumia"
  retailer: string; // display label, e.g. "Jumia"
  price: number; // item price (Naira)
  shipping: number; // delivery cost (total = price + shipping)
  inStock: boolean; // out-of-stock offers are shown but not "cheapest"
  url: string; // outbound link to the store's listing/search
}

/** One point in a product's price history (placeholder sparkline data). */
export interface PricePoint {
  date: string; // ISO date, "YYYY-MM-DD"
  price: number;
}

/**
 * A recent price movement on one platform, powering each card's "live" ticker
 * (e.g. "Price dropped ₦2,500 on Jumia · 3h ago"). Sample data for now;
 * structured so a real change-feed can populate it unchanged later.
 */
export interface PriceEvent {
  platform: PlatformSlug;
  retailer: string;
  direction: 'down' | 'up';
  delta: number; // absolute change in Naira
  /** Minutes since the change — rendered as a relative time ("3h ago"). */
  minutesAgo: number;
}

/** A public product in the catalog (public read, no public write). */
export interface Product {
  id: string;
  title: string;
  category: CategorySlug;
  brand: string | null;
  image_url: string | null;
  description: string | null;
  /** Lowest total (item price + shipping) across offers — precomputed for browse. */
  lowest_price: number;
  /** Per-platform offers, rendered as the product-detail comparison table. */
  offers: RetailerOffer[];
  /** Historical price points for the sparkline (placeholder until ingestion). */
  price_history: PricePoint[];
  /** Recent per-platform changes for the live ticker (placeholder for now). */
  price_events: PriceEvent[];
  created_at: string;
  updated_at: string;
}

/** A product a user has saved (per-user, RLS-protected). */
export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

/** A "notify me below target_price" rule for a product (RLS-protected). */
export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  is_active: boolean;
  /** Set by the (future) checker when the target is met; null until then. */
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

/* --------------------------------------------------------------------------
 * Search — modeled as if each platform were scraped independently.
 *
 * `searchProducts()` (lib/search.ts) fans a query out to one "adapter" per
 * platform, each returning that store's cheapest matching offer. The UI shows
 * this per-platform breakdown, not just a filtered product list. When real
 * scraping lands, only the adapter internals change — these shapes stay put.
 * ------------------------------------------------------------------------ */

/** The cheapest matching offer a single platform returned for a query. */
export interface PlatformQuote {
  platform: PlatformSlug;
  retailer: string;
  /** Cheapest matching product's total (price + shipping) on this platform. */
  total: number;
  price: number;
  shipping: number;
  /** The product this quote came from (for title/image in the summary row). */
  product: Product;
  /** Outbound link to this platform's results for the query. */
  url: string;
  /** True on the platform with the lowest total across all platforms. */
  isCheapest: boolean;
}

/** A platform that matched nothing for the query (shown as "no match"). */
export interface PlatformMiss {
  platform: PlatformSlug;
  retailer: string;
  /** Store search URL, so the user can still check the platform themselves. */
  url: string;
}

/** Full result of a query: per-platform breakdown + the matched products. */
export interface SearchResult {
  query: string;
  /** One entry per platform that had a match, cheapest total first. */
  quotes: PlatformQuote[];
  /** Platforms with no match for this query. */
  misses: PlatformMiss[];
  /** All products that matched, for the card grid below the summary. */
  products: Product[];
}
