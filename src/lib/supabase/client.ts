/**
 * Supabase client placeholder for future Auth + Postgres sync.
 *
 * TODO(auth): `npm install @supabase/supabase-js`
 * TODO(auth): Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
 * TODO(auth): Replace `getSupabaseClient()` with:
 *   import { createClient } from '@supabase/supabase-js'
 *   export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)
 */

export type SupabaseClientPlaceholder = null

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  get isConfigured() {
    return Boolean(this.url && this.anonKey)
  },
}

/**
 * Returns `null` until Supabase is wired. Auth and sync layers should guard on
 * `supabaseConfig.isConfigured` before calling database APIs.
 */
export function getSupabaseClient(): SupabaseClientPlaceholder {
  if (!supabaseConfig.isConfigured) {
    return null
  }

  // TODO(auth): return createClient(supabaseConfig.url, supabaseConfig.anonKey)
  return null
}

/**
 * TODO(auth): Call after sign-in — `supabase.auth.getSession()` / `onAuthStateChange`
 */
export async function getSupabaseAuthSession() {
  const client = getSupabaseClient()
  if (!client) {
    return { session: null, user: null }
  }

  // TODO(auth): const { data } = await supabase.auth.getSession()
  return { session: null, user: null }
}
