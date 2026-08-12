import { useCallback, useEffect, useState } from 'react';
import type { PriceObservation } from '@/types';
import type { PlatformSlug } from '@/lib/constants';
import { fetchObservations } from '@/lib/products';

export interface UseObservationsResult {
  /** Real recorded observations, oldest → newest (empty until any are found). */
  observations: PriceObservation[];
  loading: boolean;
  /** A human-readable message when the fetch failed, else `null`. */
  error: string | null;
  /** Re-run the fetch (used after a live "Check current price" writes a row). */
  refetch: () => void;
}

/**
 * Load a product's real, append-only price observations from Supabase — the
 * genuine price history behind the sparkline and movement badge. Separate from
 * {@link useProduct} on purpose: the product renders as soon as it arrives, and
 * this secondary history section fills in on its own (with its own loading state)
 * rather than blocking the whole page.
 *
 * Pass `platform` to scope to one store; omit it to load every platform's
 * observations and let the caller pick a series (see `primaryObservationSeries`).
 */
export function useObservations(
  productId: string | undefined,
  platform?: PlatformSlug,
): UseObservationsResult {
  const [observations, setObservations] = useState<PriceObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;

    if (!productId) {
      setObservations([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchObservations(productId, platform)
      .then((result) => {
        if (!active) return;
        setObservations(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setObservations([]);
        setError(err instanceof Error ? err.message : 'Failed to load price history.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, platform, reloadKey]);

  return { observations, loading, error, refetch };
}
