import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Product } from '@/types';
import { apiFetch } from '@/lib/api';

export interface UseWishlistResult {
  /** Saved products, in the order they were added. */
  items: Product[];
  /** Fast lookup: is this product id saved? */
  savedIds: Set<string>;
  loading: boolean;
  error: string | null;
  /** Add a product to the wishlist. No-op if already saved. */
  add: (productId: string) => Promise<void>;
  /** Remove a product from the wishlist. No-op if not saved. */
  remove: (productId: string) => Promise<void>;
  /** Toggle — add if missing, remove if present. */
  toggle: (productId: string) => Promise<void>;
  /** Re-fetch the full list (e.g. after a mutation). */
  refetch: () => void;
}

export function useWishlist(): UseWishlistResult {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<Product[]>('/api/wishlist')
      .then((data) => {
        if (!active) return;
        setItems(data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setItems([]);
        setError(err instanceof Error ? err.message : 'Failed to load wishlist.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const savedIds = useMemo(() => new Set(items.map((p) => p.id)), [items]);

  const add = useCallback(
    async (productId: string) => {
      setError(null);
      try {
        await apiFetch('/api/wishlist', {
          method: 'POST',
          json: { productId },
        });
        refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save.');
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (productId: string) => {
      setError(null);
      try {
        await apiFetch(`/api/wishlist/${encodeURIComponent(productId)}`, {
          method: 'DELETE',
        });
        setItems((prev) => prev.filter((p) => p.id !== productId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove.');
      }
    },
    [],
  );

  const toggle = useCallback(
    async (productId: string) => {
      if (savedIds.has(productId)) {
        await remove(productId);
      } else {
        await add(productId);
      }
    },
    [savedIds, add, remove],
  );

  return { items, savedIds, loading, error, add, remove, toggle, refetch };
}
