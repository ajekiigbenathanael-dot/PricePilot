import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types';
import { fetchProductById } from '@/lib/products';

export interface UseProductResult {
  /** The product, or `null` once the fetch resolves with no matching row. */
  product: Product | null;
  loading: boolean;
  /** A human-readable message when the fetch failed, else `null`. */
  error: string | null;
  /** Re-run the fetch (e.g. from a "Try again" button after an error). */
  refetch: () => void;
}

/**
 * Load a single product by id from Supabase, exposing `{ product, loading,
 * error, refetch }` so the detail page can render a loading skeleton first and
 * only show "not found" AFTER the fetch resolves (never a flash of not-found
 * while the request is still in flight).
 *
 * A missing `id` (no route param) resolves immediately to `product: null`
 * without loading — the page treats that as "not found" too.
 */
export function useProduct(id: string | undefined): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the effect below — the retry mechanism.
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // Ignore a resolved fetch whose id is already stale (route changed,
    // component unmounted) so we never write results from a superseded request.
    let active = true;

    if (!id) {
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchProductById(id)
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setProduct(null);
        setError(err instanceof Error ? err.message : 'Failed to load product.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  return { product, loading, error, refetch };
}
