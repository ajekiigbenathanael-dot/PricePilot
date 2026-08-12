import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types';
import { fetchProducts, type FetchProductsOptions } from '@/lib/products';

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  /** A human-readable message when the fetch failed, else `null`. */
  error: string | null;
  /** Re-run the fetch (e.g. from a "Try again" button after an error). */
  refetch: () => void;
}

/**
 * Load the product catalog from Supabase once, exposing `{ products, loading,
 * error, refetch }` for the page to render its loading / error / empty states.
 *
 * Browse fetches the WHOLE catalog (no category argument) and filters it
 * client-side: browse-mode narrows by category, and search-mode hands the full
 * list to `searchProducts`, which applies the category pre-filter itself. That
 * makes category switching instant (no refetch flicker) and gives the search
 * engine the complete catalog it expects. A `category` option is still accepted
 * for callers that want a server-side narrow.
 */
export function useProducts(options: FetchProductsOptions = {}): UseProductsResult {
  const { category } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the effect below — the retry mechanism.
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // Ignore a resolved fetch whose inputs are already stale (category changed,
    // component unmounted) so we never write results from a superseded request.
    let active = true;
    setLoading(true);
    setError(null);

    fetchProducts({ category })
      .then((result) => {
        if (!active) return;
        setProducts(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Failed to load products.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, reloadKey]);

  return { products, loading, error, refetch };
}
