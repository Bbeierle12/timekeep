import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client using the anon (public) key.
 * This client respects Row Level Security policies.
 *
 * Currently used for:
 *   - Real-time subscriptions (future)
 *   - Supabase Storage (future)
 *
 * Authentication is still handled via the Express API with JWT/sessions.
 * The Supabase anon client does NOT manage auth state for this app.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. ' +
    'Supabase features (real-time, storage) will not be available.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // We use our own auth system — disable Supabase Auth
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export { supabaseUrl, supabaseAnonKey };
