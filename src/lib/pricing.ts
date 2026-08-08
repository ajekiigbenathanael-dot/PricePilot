/**
 * Price math for the comparison UI — the single place that turns a product's
 * raw retailer offers into the numbers the interface actually shows:
 * the best total, how much you save vs. the priciest store, and the recent
 * price trend. Shared by the landing page, browse grid, and product detail so
 * "best price" means the same thing everywhere.
 */
import type { PricePoint, Product, RetailerOffer } from '@/types';

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
