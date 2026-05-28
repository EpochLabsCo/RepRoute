import type { ReactNode } from 'react'
import { Check, CheckCircle2, Circle, Navigation, Phone, Plus } from 'lucide-react'
import { uiText } from '../constants/uiText'

export function CardMoreActions({ children }: { children: ReactNode }) {
  return (
    <details className="card-more">
      <summary className="card-more__trigger">{uiText.common.more}</summary>
      <div className="card-more__panel">{children}</div>
    </details>
  )
}

export function CardMoreMenuButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button type="button" className={`card-more__action ${className}`.trim()} onClick={onClick}>
      {children}
    </button>
  )
}

export function CardMoreMenuLink({
  children,
  href,
}: {
  children: ReactNode
  href: string
}) {
  return (
    <a className="card-more__action" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function MarkCompletedButton({
  completed,
  onClick,
  disabled = false,
}: {
  completed: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`prospect-action-btn prospect-action-btn--complete ${
        completed ? 'prospect-action-btn--complete-done' : 'prospect-action-btn--outline'
      }`}
      onClick={onClick}
      disabled={disabled}
      aria-label={
        completed ? uiText.routes.markStopIncompleteAria : uiText.routes.markStopCompleteAria
      }
    >
      {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      <span>{completed ? uiText.routes.completed : uiText.routes.inAppNavigation.markCompleted}</span>
    </button>
  )
}

export function RouteToggleButton({
  isInRoute,
  onClick,
  addLabel,
  removeLabel,
}: {
  isInRoute: boolean
  onClick: () => void
  addLabel: string
  removeLabel: string
}) {
  return (
    <button
      type="button"
      className={`prospect-action-btn route-toggle-button ${
        isInRoute ? 'route-toggle-button--active prospect-action-btn--route-active' : 'prospect-action-btn--outline'
      }`}
      onClick={onClick}
    >
      <span className="route-toggle-button__icon" aria-hidden="true">
        {isInRoute ? <Check size={16} /> : <Plus size={16} />}
      </span>
      <span className="route-toggle-button__label">{isInRoute ? removeLabel : addLabel}</span>
    </button>
  )
}

export function ProspectPrimaryActions({
  callHref,
  onNavigate,
  navigateLabel,
  isInRoute,
  onToggleRoute,
  addRouteLabel,
  removeRouteLabel,
  showMarkCompleted = false,
  routeCompleted = false,
  onToggleCompleted,
}: {
  callHref?: string | null
  onNavigate: () => void
  navigateLabel: string
  isInRoute: boolean
  onToggleRoute: () => void
  addRouteLabel: string
  removeRouteLabel: string
  showMarkCompleted?: boolean
  routeCompleted?: boolean
  onToggleCompleted?: () => void
}) {
  return (
    <div className="prospect-primary-actions">
      {callHref ? (
        <a className="prospect-action-btn prospect-action-btn--outline" href={callHref}>
          <Phone size={16} />
          <span>{uiText.routes.actions.callBusiness}</span>
        </a>
      ) : null}
      <button type="button" className="prospect-action-btn prospect-action-btn--outline" onClick={onNavigate}>
        <Navigation size={16} />
        <span>{navigateLabel}</span>
      </button>
      <RouteToggleButton
        isInRoute={isInRoute}
        onClick={onToggleRoute}
        addLabel={addRouteLabel}
        removeLabel={removeRouteLabel}
      />
      {showMarkCompleted && onToggleCompleted ? (
        <MarkCompletedButton completed={routeCompleted} onClick={onToggleCompleted} />
      ) : null}
    </div>
  )
}
