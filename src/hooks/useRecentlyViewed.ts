import { useEffect, useState } from 'react';
import { fetchProductById } from '@/lib/products';
import type { Product } from '@/types';

const STORAGE_KEY = 'pricepilot-recently-viewed';
const MAX = 8;

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage full or disabled — silently ignore */
  }
}

export function recordView(productId: string) {
  const ids = readFromStorage();
  const filtered = ids.filter((id) => id !== productId);
  writeToStorage([productId, ...filtered].slice(0, MAX));
}

export function useRecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = readFromStorage();
    if (ids.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(ids.map((id) => fetchProductById(id).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const resolved = results.filter((p): p is Product => p !== null);
        setProducts(resolved);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load recently viewed products.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
}
