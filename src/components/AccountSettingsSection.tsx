import { CheckCircle2, Cloud, LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { supabaseConfig } from '../lib/supabase/client'
import { uiText } from '../constants/uiText'

export default function AccountSettingsSection() {
  const { session, uiState, isGuest, isSignedIn, isSyncPending, signIn, createAccount, signOut, requestSync } =
    useAuth()

  const statusCopy = uiText.settings.account.status[uiState]
  const statusClassName =
    uiState === 'signed-in'
      ? 'account-status-banner--signed-in'
      : uiState === 'sync-pending'
        ? 'account-status-banner--sync-pending'
        : 'account-status-banner--guest'

  return (
    <section className="panel section-panel section-panel--compact account-settings">
      <div className="section-heading">
        <h2>{uiText.settings.account.heading}</h2>
        <span className={`meta-pill account-status-pill account-status-pill--${uiState}`}>{statusCopy}</span>
      </div>

      <p className="section-copy">{uiText.settings.account.description}</p>

      <div className={`account-status-banner ${statusClassName}`} role="status" aria-live="polite">
        {uiState === 'signed-in' ? <CheckCircle2 size={20} aria-hidden /> : null}
        {uiState === 'sync-pending' ? <RefreshCw size={20} className="account-sync-spinner" aria-hidden /> : null}
        {uiState === 'guest' ? <Cloud size={20} aria-hidden /> : null}
        <div>
          <strong>{statusCopy}</strong>
          <p>
            {isGuest
              ? uiText.settings.account.guestDetail
              : isSyncPending
                ? uiText.settings.account.syncPendingDetail
                : uiText.settings.account.signedInDetail(session.user?.email ?? '')}
          </p>
        </div>
      </div>

      {!supabaseConfig.isConfigured ? (
        <p className="account-settings__todo">{uiText.settings.account.supabaseNotConfigured}</p>
      ) : null}

      <div className="account-settings__actions">
        <button
          type="button"
          className="button button--wide"
          onClick={() => void signIn()}
          disabled={isSignedIn || isSyncPending}
        >
          <LogIn size={16} />
          {uiText.settings.account.signIn}
        </button>
        <button
          type="button"
          className="button button--wide button--ghost"
          onClick={() => void createAccount()}
          disabled={isSignedIn || isSyncPending}
        >
          <UserPlus size={16} />
          {uiText.settings.account.createAccount}
        </button>
        <button
          type="button"
          className="button button--wide button--ghost"
          onClick={() => void requestSync()}
          disabled={isGuest || isSyncPending}
        >
          <RefreshCw size={16} />
          {uiText.settings.account.syncData}
        </button>
        <button
          type="button"
          className="button button--wide button--ghost account-settings__sign-out"
          onClick={signOut}
          disabled={isGuest || isSyncPending}
        >
          <LogOut size={16} />
          {uiText.settings.account.signOut}
        </button>
      </div>

      <p className="account-settings__footnote">{uiText.settings.account.localFirstNote}</p>
    </section>
  )
}
