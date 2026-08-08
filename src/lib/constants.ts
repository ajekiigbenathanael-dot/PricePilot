/**
 * App-wide constants: route paths, nav config, and product categories.
 * Centralized so links stay consistent and refactors are one-line changes.
 */

/** Canonical route paths. Reference these instead of hardcoding strings. */
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  browse: '/browse',
  product: '/product/:id',
  wishlist: '/wishlist',
  settings: '/settings',
} as const;

/** Build a product detail path for a given id. */
export const productPath = (id: string): string => `/product/${id}`;

/** Primary navigation links shown in the navbar. */
export const NAV_LINKS = [
  { label: 'Browse', to: ROUTES.browse },
  { label: 'Wishlist', to: ROUTES.wishlist },
] as const;

/**
 * Product categories — the full range of things Nigerian students actually
 * shop for, not just tech and books. Slugs are the stored value (must match the
 * `products.category` CHECK constraint — widened in migrations/0003); labels
 * are shown. Kept realistic and non-redundant: phones, chargers/accessories,
 * and computing are split out because students compare them very differently.
 */
export const CATEGORIES = [
  { slug: 'phones', label: 'Phones' },
  { slug: 'accessories', label: 'Accessories & Chargers' },
  { slug: 'laptops', label: 'Laptops & Computing' },
  { slug: 'electronics', label: 'Electronics' },
  { slug: 'textbooks', label: 'Textbooks & Stationery' },
  { slug: 'bags', label: 'Bags & Backpacks' },
  { slug: 'dorm-supplies', label: 'Dorm & Room Supplies' },
  { slug: 'fashion', label: 'Fashion & Footwear' },
  { slug: 'health', label: 'Health & Personal Care' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

/**
 * Retail platforms we compare across. PricePilot never sells — each platform is
 * a destination users click through to in order to complete a purchase. The
 * `searchUrl` builder points at the store's own search results for a query;
 * when real product-level scraping lands, swap these for deep product links
 * without touching the UI.
 */
export interface Platform {
  slug: string;
  label: string;
  searchUrl: (query: string) => string;
}

export const PLATFORMS = [
  {
    slug: 'jumia',
    label: 'Jumia',
    searchUrl: (q: string) => `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(q)}`,
  },
  {
    slug: 'konga',
    label: 'Konga',
    searchUrl: (q: string) => `https://www.konga.com/search?search=${encodeURIComponent(q)}`,
  },
  {
    slug: 'slot',
    label: 'Slot',
    searchUrl: (q: string) => `https://slot.ng/?s=${encodeURIComponent(q)}&post_type=product`,
  },
  {
    slug: 'payporte',
    label: 'PayPorte',
    searchUrl: (q: string) =>
      `https://www.payporte.com/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
  {
    slug: 'temu',
    label: 'Temu',
    searchUrl: (q: string) =>
      `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}`,
  },
] as const satisfies readonly Platform[];

export type PlatformSlug = (typeof PLATFORMS)[number]['slug'];

/** Slug → platform lookup, so platform metadata is defined once (above). */
export const PLATFORM_BY_SLUG = Object.fromEntries(
  PLATFORMS.map((p) => [p.slug, p]),
) as Record<PlatformSlug, (typeof PLATFORMS)[number]>;

/** The store search URL for a platform + query (falls back to '#' if unknown). */
export const platformSearchUrl = (slug: PlatformSlug, query: string): string =>
  PLATFORM_BY_SLUG[slug]?.searchUrl(query) ?? '#';

/** Human label for a platform slug. */
export const platformLabel = (slug: PlatformSlug): string =>
  PLATFORM_BY_SLUG[slug]?.label ?? slug;

/** Slug → label lookup, so labels are defined once (in CATEGORIES above). */
export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label]),
) as Record<CategorySlug, string>;

/** Human label for a category slug. */
export const categoryLabel = (slug: CategorySlug): string => CATEGORY_LABEL[slug];

export const APP_NAME = 'PricePilot';
export const APP_TAGLINE = 'Compare prices across Nigeria’s top stores.';
