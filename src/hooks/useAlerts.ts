import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface Alert {
  id: string;
  product_id: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
  product: {
    id: string;
    title: string;
    image_url: string | null;
    lowest_price: number;
  } | null;
}

export interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  create: (productId: string, targetPrice: number) => Promise<void>;
  remove: (alertId: string) => Promise<void>;
  refetch: () => void;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiFetch<Alert[]>('/api/alerts')
      .then((data) => {
        if (!active) return;
        setAlerts(data ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAlerts([]);
        setError(err instanceof Error ? err.message : 'Failed to load alerts.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const create = useCallback(
    async (productId: string, targetPrice: number) => {
      setError(null);
      try {
        await apiFetch('/api/alerts', {
          method: 'POST',
          json: { productId, target_price: targetPrice },
        });
        refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create alert.');
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (alertId: string) => {
      setError(null);
      try {
        await apiFetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
          method: 'DELETE',
        });
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove alert.');
      }
    },
    [],
  );

  return { alerts, loading, error, create, remove, refetch };
}
