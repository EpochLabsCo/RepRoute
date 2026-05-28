import { GUEST_AUTH_SNAPSHOT, type AuthSessionSnapshot } from './types'

/** Placeholder session until Supabase Auth persists sessions. */
export const AUTH_SESSION_STORAGE_KEY = 'reproute:auth-session-placeholder'

export function readAuthSessionSnapshot(): AuthSessionSnapshot {
  if (typeof window === 'undefined') {
    return GUEST_AUTH_SNAPSHOT
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!raw) {
      return GUEST_AUTH_SNAPSHOT
    }

    const parsed = JSON.parse(raw) as AuthSessionSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.uiState) {
      return GUEST_AUTH_SNAPSHOT
    }

    return parsed
  } catch {
    return GUEST_AUTH_SNAPSHOT
  }
}

export function writeAuthSessionSnapshot(snapshot: AuthSessionSnapshot) {
  if (typeof window === 'undefined') {
    return
  }

  if (snapshot.uiState === 'guest' || !snapshot.user) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
}
