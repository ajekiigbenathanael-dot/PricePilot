/**
 * Live search — invoke the `search-miss` Edge Function when the local catalog
 * has zero matches for a query. Returns a LiveSearchResult-shaped payload with
 * `live: true`, or null when the function finds nothing.
 */
import { supabase } from '@/lib/supabase';
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

  const { data, error } = await supabase.functions.invoke<LiveSearchResult>('search-miss', {
    body: { query, category, limit },
  });

  if (error) {
    let message = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.json();
        if (body && typeof body.error === 'string') message = body.error;
      } catch {
        /* keep generic message */
      }
    }
    throw new Error(message);
  }

  if (!data || !data.products || data.products.length === 0) return null;
  return data;
}
