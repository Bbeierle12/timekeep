import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Server-side Supabase client using the service_role key.
 * This bypasses Row Level Security — use only on the server.
 *
 * Usage:
 *   import { supabaseAdmin } from '../db/supabase';
 *   const { data, error } = await supabaseAdmin.from('employees').select('*');
 *
 * For raw SQL queries, continue using the `pool` from './connection'.
 * The Supabase client is useful for: storage, real-time, edge functions, and
 * higher-level operations where the query builder is convenient.
 */

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
      'See .env.example for required Supabase environment variables.'
    );
  }

  _supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      // We handle auth ourselves — disable Supabase Auth auto-refresh
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _supabaseAdmin;
}

/**
 * Convenience getter (lazy-initialized).
 * Import this when you know Supabase is configured.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
