import { createClient } from '@supabase/supabase-js';

/**
 * Supabase browser client — the single shared instance for the whole app.
 *
 * Reads credentials from Vite env vars (see `.env.example`). Only the
 * anon/public key is used here; it is safe to ship to the browser because
 * Row Level Security governs what it can actually read/write.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy `.env.example` to `.env` and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session so login survives page reloads.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
