/**
 * Live search — invoke the `/api/search-miss` function when the local catalog
 * has zero matches for a query. Returns a LiveSearchResult-shaped payload with
 * `live: true`, or null when the function finds nothing.
 */
import { apiFetch } from '@/lib/api';
import type { LiveSearchResult } from '@/types';
import type { CategorySlug } from '@/lib/constants';

export interface LiveSearchOptions {
  query: string;
  category?: CategorySlug | 'all';
  limit?: number;
}

export async function invokeLiveSearch(
  options: LiveSearchOptions,
): Promise<LiveSearchResult | null> {
  const { query, category, limit = 5 } = options;

  const data = await apiFetch<LiveSearchResult>('/api/search-miss', {
    method: 'POST',
    json: { query, category, limit },
  });

  if (!data || !data.products || data.products.length === 0) return null;
  return data;
}
