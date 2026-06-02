import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabaseConfig } from '../supabase/client'
import { readAuthSessionSnapshot, writeAuthSessionSnapshot } from './authStorage'
import {
  GUEST_AUTH_SNAPSHOT,
  type AuthSessionSnapshot,
  type AuthUiState,
  type PlaceholderAuthSession,
} from './types'

type AuthContextValue = {
  session: AuthSessionSnapshot
  uiState: AuthUiState
  isGuest: boolean
  isSignedIn: boolean
  isSyncPending: boolean
  supabaseReady: boolean
  signIn: () => Promise<void>
  createAccount: () => Promise<void>
  signOut: () => void
  requestSync: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function buildPlaceholderUser(kind: 'sign-in' | 'sign-up'): PlaceholderAuthSession {
  const createdAt = new Date().toISOString()

  if (kind === 'sign-up') {
    return {
      userId: `placeholder-user-${Date.now()}`,
      email: 'new-account@reproute.local',
      displayName: 'New RepRoute Account',
      createdAt,
    }
  }

  return {
    userId: 'placeholder-user-demo',
    email: 'demo@reproute.local',
    displayName: 'RepRoute Demo User',
    createdAt,
  }
}

/**
 * Placeholder auth layer. Does not replace local prospect/route storage.
 *
 * TODO(auth): Replace signIn/createAccount with `supabase.auth.signInWithPassword` / `signUp`
 * TODO(auth): Hydrate session from `supabase.auth.onAuthStateChange` on app load
 * TODO(sync): After auth, call `pullUserData` and merge with localStorage (conflict strategy TBD)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionSnapshot>(() => readAuthSessionSnapshot())

  useEffect(() => {
    writeAuthSessionSnapshot(session)
  }, [session])

  useEffect(() => {
    if (!supabaseConfig.isConfigured) {
      return
    }

    // TODO(auth): const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => { ... })
    void supabaseConfig.isConfigured
  }, [])

  const signIn = useCallback(async () => {
    // TODO(auth): const { error } = await supabase.auth.signInWithPassword({ email, password })
    const user = buildPlaceholderUser('sign-in')
    setSession({
      uiState: 'signed-in',
      provider: 'supabase-placeholder',
      user,
      lastSyncedAt: null,
    })
  }, [])

  const createAccount = useCallback(async () => {
    // TODO(auth): const { error } = await supabase.auth.signUp({ email, password })
    const user = buildPlaceholderUser('sign-up')
    setSession({
      uiState: 'signed-in',
      provider: 'supabase-placeholder',
      user,
      lastSyncedAt: null,
    })
  }, [])

  const signOut = useCallback(() => {
    // TODO(auth): await supabase.auth.signOut()
    setSession(GUEST_AUTH_SNAPSHOT)
  }, [])

  const requestSync = useCallback(async () => {
    if (session.uiState === 'guest' || !session.user) {
      return
    }

    setSession((current) => ({
      ...current,
      uiState: 'sync-pending',
    }))

    // TODO(sync): Build UserDataSyncPayload from localStorage + IndexedDB, then upsert to Supabase
    await new Promise((resolve) => window.setTimeout(resolve, 1200))

    setSession((current) => ({
      ...current,
      uiState: 'signed-in',
      lastSyncedAt: new Date().toISOString(),
    }))
  }, [session.uiState, session.user])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      uiState: session.uiState,
      isGuest: session.uiState === 'guest',
      isSignedIn: session.uiState === 'signed-in' || session.uiState === 'sync-pending',
      isSyncPending: session.uiState === 'sync-pending',
      supabaseReady: supabaseConfig.isConfigured,
      signIn,
      createAccount,
      signOut,
      requestSync,
    }),
    [session, signIn, createAccount, signOut, requestSync],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook export alongside provider — standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
