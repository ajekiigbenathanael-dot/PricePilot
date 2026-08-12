/**
 * Products data access — the single place the app reads its catalog from
 * Supabase. Pages and hooks import from here (never the raw client), so the
 * column list, the query, and the row → `Product` normalization all live in one
 * spot and change together.
 *
 * WHY A MAPPING LAYER: a `products` row is close to our `Product` type but not
 * identical, and the differences are exactly the kind that cause silent bugs if
 * left to each caller:
 *   • `offers` / `price_history` arrive as jsonb — already parsed to JS values,
 *     but with no guarantee of shape, so we normalize defensively.
 *   • `lowest_price` is a SQL `numeric`, which PostgREST may serialize as a
 *     string — coerce every money value through `toNumber`.
 *   • `category` is stored as plain `text` (guarded by a CHECK) — cast to the
 *     `CategorySlug` union the UI expects.
 *   • there is NO `price_events` column: the live ticker was always sample-only,
 *     so live products get an empty `price_events` (real movement is derived
 *     from `price_observations`, see `fetchObservations`).
 */
import { supabase } from '@/lib/supabase';
import { platformLabel, type CategorySlug, type PlatformSlug } from '@/lib/constants';
import type { PriceObservation, PricePoint, Product, RetailerOffer } from '@/types';

/* ----------------------------------------------------------------- columns - */

/** Columns selected for a full `Product`. Explicit so the read shape is obvious. */
const PRODUCT_COLUMNS =
  'id, title, category, brand, image_url, description, lowest_price, offers, price_history, created_at, updated_at';

/** Columns selected for a `PriceObservation` (the real, append-only history). */
const OBSERVATION_COLUMNS = 'id, product_id, platform, price, currency, in_stock, scraped_at';

/* ------------------------------------------------------------- raw db rows - */

/** A jsonb offer as stored by the ingest — every field treated as untrusted. */
interface RawOffer {
  platform?: string;
  retailer?: string;
  price?: number | string;
  shipping?: number | string;
  inStock?: boolean;
  url?: string;
}

/** A jsonb price-history point as stored on the product row. */
interface RawPricePoint {
  date?: string;
  price?: number | string;
}

/** The `products` row as PostgREST returns it, before normalization. */
interface ProductRow {
  id: string;
  title: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  description: string | null;
  lowest_price: number | string;
  offers: RawOffer[] | null;
  price_history: RawPricePoint[] | null;
  created_at: string;
  updated_at: string;
}

/** The `price_observations` row as PostgREST returns it. */
interface ObservationRow {
  id: string;
  product_id: string;
  platform: string;
  price: number | string;
  currency: string;
  in_stock: boolean | null;
  scraped_at: string;
}

/* ------------------------------------------------------------ normalizers - */

/** Coerce a `numeric`/jsonb value to a finite number (0 when absent/garbage). */
function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** jsonb offers → typed `RetailerOffer[]`, dropping anything without a platform. */
function normalizeOffers(raw: RawOffer[] | null | undefined): RetailerOffer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is RawOffer & { platform: string } => Boolean(o?.platform))
    .map((o) => {
      const platform = o.platform as PlatformSlug;
      return {
        platform,
        retailer: o.retailer ?? platformLabel(platform),
        price: toNumber(o.price),
        shipping: toNumber(o.shipping),
        // Absent availability is treated as in stock (a listed, priced offer).
        inStock: o.inStock !== false,
        url: o.url ?? '#',
      };
    });
}

/** jsonb history → typed `PricePoint[]`, dropping points missing a date/price. */
function normalizeHistory(raw: RawPricePoint[] | null | undefined): PricePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p?.date != null && p.price != null)
    .map((p) => ({ date: String(p.date), price: toNumber(p.price) }));
}

/** Normalize one `products` row into the `Product` the rest of the app consumes. */
export function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    category: row.category as CategorySlug,
    brand: row.brand ?? null,
    image_url: row.image_url ?? null,
    description: row.description ?? null,
    lowest_price: toNumber(row.lowest_price),
    offers: normalizeOffers(row.offers),
    price_history: normalizeHistory(row.price_history),
    // No DB column — sample-only concept; live movement comes from observations.
    price_events: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Normalize one `price_observations` row into a `PriceObservation`. */
function mapObservation(row: ObservationRow): PriceObservation {
  return {
    id: row.id,
    product_id: row.product_id,
    platform: row.platform as PlatformSlug,
    price: toNumber(row.price),
    currency: row.currency,
    in_stock: row.in_stock,
    scraped_at: row.scraped_at,
  };
}

/* -------------------------------------------------------------- fetchers -- */

export interface FetchProductsOptions {
  /** Restrict to one category. `'all'` (or omitted) returns the whole catalog. */
  category?: CategorySlug | 'all';
}

/**
 * Load the catalog (optionally narrowed to one category). Ordering/sorting is
 * left to the caller — Browse re-sorts by its own selected key — so this just
 * returns every matching product as a normalized `Product[]`.
 */
export async function fetchProducts(options: FetchProductsOptions = {}): Promise<Product[]> {
  const { category } = options;
  const base = supabase.from('products').select(PRODUCT_COLUMNS);

  const { data, error } =
    category && category !== 'all' ? await base.eq('category', category) : await base;

  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return ((data ?? []) as ProductRow[]).map(mapRow);
}

/**
 * Load a single product by id. Returns `null` (not an error) when no such row
 * exists, so the detail page can render its own "not found" state.
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data ? mapRow(data as ProductRow) : null;
}

/**
 * Load the real, append-only price observations for a product — oldest first,
 * so the series feeds the sparkline and movement helpers directly. Optionally
 * scoped to one platform (movement is only meaningful within a single store).
 */
export async function fetchObservations(
  productId: string,
  platform?: PlatformSlug,
): Promise<PriceObservation[]> {
  const base = supabase
    .from('price_observations')
    .select(OBSERVATION_COLUMNS)
    .eq('product_id', productId)
    .order('scraped_at', { ascending: true });

  const { data, error } = platform ? await base.eq('platform', platform) : await base;

  if (error) throw new Error(`Failed to load price history: ${error.message}`);
  return ((data ?? []) as ObservationRow[]).map(mapObservation);
}
