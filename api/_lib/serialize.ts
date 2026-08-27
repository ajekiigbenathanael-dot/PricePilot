/**
 * api/_lib/serialize.ts — map MongoDB documents to the JSON shape the frontend
 * expects. The React data layer (src/lib/products.ts) already normalizes a
 * snake_case row with `id` + string timestamps, so we serialize to exactly that:
 * `_id` → `id`, Date → ISO string. Keeping this shape means the frontend's
 * mapRow/mapObservation and its defensive normalizers stay unchanged.
 */
import type { ObjectId } from 'mongodb';

/** A `products` document as stored in Mongo (`_id` is the deterministic UUIDv5). */
export interface ProductDoc {
  _id: string;
  title: string;
  category: string;
  brand?: string | null;
  image_url?: string | null;
  description?: string | null;
  lowest_price: number;
  offers?: unknown[];
  price_history?: unknown[];
  price_events?: unknown[];
  created_at?: Date | string;
  updated_at?: Date | string;
  /**
   * The id (email) of the user who FIRST added this product via their own live
   * search, set once on insert (see api/search-miss.ts). `null`/absent for
   * products written by the ingest cron. Never serialized to clients directly —
   * only the derived `added_by_me` boolean is exposed.
   */
  added_by?: string | null;
}

/** A `price_observations` document (append-only; `_id` is an auto ObjectId). */
export interface ObservationDoc {
  _id?: ObjectId;
  product_id: string;
  platform: string;
  price: number;
  currency: string;
  in_stock?: boolean | null;
  scraped_at: Date | string;
}

/** Coerce a Date | ISO string to an ISO string (stable shape for absent values). */
function toIso(value: Date | string | undefined | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

/** products doc → the row shape `mapRow` consumes. */
export function serializeProduct(doc: ProductDoc, currentUserId?: string | null) {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category,
    brand: doc.brand ?? null,
    image_url: doc.image_url ?? null,
    description: doc.description ?? null,
    lowest_price: doc.lowest_price,
    offers: doc.offers ?? [],
    price_history: doc.price_history ?? [],
    price_events: doc.price_events ?? [],
    created_at: toIso(doc.created_at),
    updated_at: toIso(doc.updated_at),
    // Whether the CURRENT requester is the user who first added this product.
    // Derived here rather than sending the raw `added_by` (an email — PII we must
    // not leak to every visitor). Anonymous requester (no userId) ⇒ always false,
    // as are cron-added products (added_by null).
    added_by_me:
      currentUserId != null && doc.added_by != null && doc.added_by === currentUserId,
  };
}

/** price_observations doc → the row shape `mapObservation` consumes. */
export function serializeObservation(doc: ObservationDoc) {
  return {
    id: doc._id ? String(doc._id) : '',
    product_id: doc.product_id,
    platform: doc.platform,
    price: doc.price,
    currency: doc.currency,
    in_stock: doc.in_stock ?? null,
    scraped_at: toIso(doc.scraped_at),
  };
}
