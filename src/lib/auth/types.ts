/**
 * Auth UI states for RepRoute (local MVP + future Supabase Auth).
 *
 * - guest: localStorage MVP only; no cloud user session
 * - signed-in: Supabase Auth session active (placeholder uses local session record)
 * - sync-pending: upload/download of user-owned records in progress
 */
export type AuthUiState = 'guest' | 'signed-in' | 'sync-pending'

export type AuthProviderId = 'guest' | 'supabase-placeholder'

export type PlaceholderAuthSession = {
  userId: string
  email: string
  displayName: string
  createdAt: string
}

export type AuthSessionSnapshot = {
  uiState: AuthUiState
  provider: AuthProviderId
  user: PlaceholderAuthSession | null
  lastSyncedAt: string | null
}

export const GUEST_AUTH_SNAPSHOT: AuthSessionSnapshot = {
  uiState: 'guest',
  provider: 'guest',
  user: null,
  lastSyncedAt: null,
}
