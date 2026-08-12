/**
 * Price math for the comparison UI — the single place that turns a product's
 * raw retailer offers into the numbers the interface actually shows:
 * the best total, how much you save vs. the priciest store, and the recent
 * price trend. Shared by the landing page, browse grid, and product detail so
 * "best price" means the same thing everywhere.
 */
import type { PriceObservation, PricePoint, Product, RetailerOffer } from '@/types';
import { PLATFORMS, type PlatformSlug } from '@/lib/constants';

/** The honest price you'd pay at a store: item price + its shipping. */
export function offerTotal(offer: RetailerOffer): number {
  return offer.price + offer.shipping;
}

export interface PriceStats {
  /** Cheapest total across all offers (matches `product.lowest_price`). */
  lowest: number;
  /** Priciest total — the "before" number in a savings pitch. */
  highest: number;
  /** How much the best offer beats the worst (>= 0). */
  savings: number;
  /** Number of stores compared. */
  storeCount: number;
  /** The winning offer, highlighted green in the comparison table. */
  cheapest: RetailerOffer | null;
}

/** Summarize a product's offers into the figures the UI renders. */
export function priceStats(product: Product): PriceStats {
  const offers = product.offers ?? [];
  if (offers.length === 0) {
    return {
      lowest: product.lowest_price,
      highest: product.lowest_price,
      savings: 0,
      storeCount: 0,
      cheapest: null,
    };
  }

  let cheapest = offers[0];
  let lowest = offerTotal(offers[0]);
  let highest = lowest;

  for (const offer of offers) {
    const total = offerTotal(offer);
    if (total < lowest) {
      lowest = total;
      cheapest = offer;
    }
    if (total > highest) highest = total;
  }

  return {
    lowest,
    highest,
    savings: highest - lowest,
    storeCount: offers.length,
    cheapest,
  };
}

/** Offers sorted cheapest-first — the canonical order for comparison tables. */
export function sortedOffers(product: Product): RetailerOffer[] {
  return [...(product.offers ?? [])].sort((a, b) => offerTotal(a) - offerTotal(b));
}

export type TrendDirection = 'down' | 'up' | 'flat';

export interface PriceTrend {
  direction: TrendDirection;
  /** Absolute price change between the last two history points. */
  delta: number;
}

/**
 * Recent price movement from the last two history points. Drives the small
 * "▼ $5.01" chip — a preview of the drop alerts the product is built around.
 */
export function priceTrend(history: PricePoint[]): PriceTrend {
  if (!history || history.length < 2) return { direction: 'flat', delta: 0 };

  const latest = history[history.length - 1].price;
  const previous = history[history.length - 2].price;
  const delta = latest - previous;

  if (Math.abs(delta) < 0.01) return { direction: 'flat', delta: 0 };
  return { direction: delta < 0 ? 'down' : 'up', delta: Math.abs(delta) };
}

/* --------------------------------------------------------------------------
 * Product-detail comparison table
 * ------------------------------------------------------------------------ */

/**
 * One row of the full comparison table on the product page. Unlike
 * `sortedOffers` (which lists only stores that carry the product), this always
 * yields a row for EVERY known platform — stores that don't stock the product
 * get `offer: null`, rendered as "Not listed" (never blank, never a fake price).
 */
export interface ComparisonRow {
  platform: PlatformSlug;
  /** Display label for the store (e.g. "Jumia"). */
  retailer: string;
  /** The store's offer, or `null` when the platform doesn't list the product. */
  offer: RetailerOffer | null;
  /** Total (price + shipping), or `null` when not listed. */
  total: number | null;
  /** The single cheapest in-stock offer across all platforms — highlighted. */
  isCheapest: boolean;
}

/**
 * Build a comparison row for each of the five platforms, ordered for the table:
 * cheapest in-stock first, remaining in-stock next (cheapest → dearest),
 * out-of-stock after, and "Not listed" platforms last (in canonical order).
 */
export function comparisonRows(product: Product): ComparisonRow[] {
  const offerByPlatform = new Map<PlatformSlug, RetailerOffer>(
    (product.offers ?? []).map((o) => [o.platform, o]),
  );

  // The cheapest *in-stock* total is the one row we highlight as "Best price".
  let bestPlatform: PlatformSlug | null = null;
  let bestTotal = Infinity;
  for (const offer of product.offers ?? []) {
    if (offer.inStock && offerTotal(offer) < bestTotal) {
      bestTotal = offerTotal(offer);
      bestPlatform = offer.platform;
    }
  }

  const rows: ComparisonRow[] = PLATFORMS.map((p) => {
    const offer = offerByPlatform.get(p.slug) ?? null;
    return {
      platform: p.slug,
      retailer: p.label,
      offer,
      total: offer ? offerTotal(offer) : null,
      isCheapest: offer !== null && p.slug === bestPlatform,
    };
  });

  // Rank groups, then sort by total within a group. Not-listed rows keep the
  // canonical platform order (their total is null).
  const rank = (r: ComparisonRow): number => {
    if (r.isCheapest) return 0;
    if (r.offer && r.offer.inStock) return 1;
    if (r.offer && !r.offer.inStock) return 2;
    return 3; // not listed
  };

  return rows.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.total === null || b.total === null) return 0;
    return a.total - b.total;
  });
}

/* --------------------------------------------------------------------------
 * Price history (sparkline)
 * ------------------------------------------------------------------------ */

export interface HistoryStats {
  /** Oldest recorded price in the series. */
  first: number;
  /** Most recent recorded price. */
  last: number;
  /** Lowest and highest prices in the series (sparkline y-axis bounds). */
  min: number;
  max: number;
  /** Signed change from first → last (negative = price fell). */
  change: number;
  /** Rounded percentage change relative to the first price. */
  pct: number;
  direction: TrendDirection;
}

/**
 * Summarize a price-history series for the sparkline + change badge. Returns
 * `null` for series too short to chart (fewer than two points).
 */
export function priceHistoryStats(history: PricePoint[]): HistoryStats | null {
  if (!history || history.length < 2) return null;

  const prices = history.map((p) => p.price);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = last - first;
  const pct = first === 0 ? 0 : Math.round((change / first) * 100);
  const direction: TrendDirection =
    Math.abs(change) < 0.01 ? 'flat' : change < 0 ? 'down' : 'up';

  return {
    first,
    last,
    min: Math.min(...prices),
    max: Math.max(...prices),
    change,
    pct,
    direction,
  };
}

/* --------------------------------------------------------------------------
 * Real price history (from price_observations)
 * ------------------------------------------------------------------------ */

export interface ObservationSeries {
  /** Platform whose history is charted, or `null` when there's nothing to chart. */
  platform: PlatformSlug | null;
  /** Oldest → newest points for `platform` (empty when `platform` is null). */
  points: PricePoint[];
}

/**
 * Choose which platform's price history to chart for a product. Movement is only
 * meaningful WITHIN one store — a line that hops between Jumia and Konga prices
 * would be nonsense — so we pick a single platform's series:
 *
 *   1. the platform with the cheapest current offer (the price the user acts on),
 *      when it has any observations on record; otherwise
 *   2. the platform with the most observations (the best-charted history we have).
 *
 * Observations are assumed oldest → newest (as `fetchObservations` returns them).
 * Returns an empty series when the product has no observations at all.
 */
export function primaryObservationSeries(
  product: Product,
  observations: PriceObservation[],
): ObservationSeries {
  if (observations.length === 0) return { platform: null, points: [] };

  // Group observations by platform, preserving their oldest → newest order.
  const byPlatform = new Map<PlatformSlug, PriceObservation[]>();
  for (const obs of observations) {
    const list = byPlatform.get(obs.platform) ?? [];
    list.push(obs);
    byPlatform.set(obs.platform, list);
  }

  const cheapestPlatform = priceStats(product).cheapest?.platform ?? null;
  let chosen: PlatformSlug | null =
    cheapestPlatform && byPlatform.has(cheapestPlatform) ? cheapestPlatform : null;

  if (!chosen) {
    // Fall back to the platform we've recorded the most prices for.
    let mostSoFar = -1;
    for (const [platform, list] of byPlatform) {
      if (list.length > mostSoFar) {
        mostSoFar = list.length;
        chosen = platform;
      }
    }
  }

  const list = chosen ? (byPlatform.get(chosen) ?? []) : [];
  return {
    platform: chosen,
    // scraped_at is an ISO timestamp; the sparkline only needs the date part.
    points: list.map((obs) => ({ date: obs.scraped_at.slice(0, 10), price: obs.price })),
  };
}
