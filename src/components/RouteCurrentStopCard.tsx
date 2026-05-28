import {
  Bookmark,
  ExternalLink,
  Navigation,
  Phone,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import RouteFocusCard from './RouteFocusCard'
import BusinessCardScanButton from './BusinessCardScanButton'
import {
  CardMoreActions,
  CardMoreMenuButton,
  CardMoreMenuLink,
  MarkCompletedButton,
} from './ProspectCardActions'
import type { RouteNavigationLegSummary } from './RouteNavigationView'
import { uiText } from '../constants/uiText'

type RouteCurrentStopCardProps = {
  businessName: string
  address: string
  stopNumber: number
  leg: RouteNavigationLegSummary | null
  distanceOverride: string | null
  statusNote: string | null
  callHref: string | null
  websiteHref: string | null
  navigateLabel: string
  isSaved: boolean
  routeCompleted: boolean
  onNavigate: () => void
  onToggleCompleted: () => void
  onOpenVisitWorkflow: (intent: 'complete' | 'notes') => void
  onOpenSaved: () => void
  onToggleSaved: () => void
  onFindFoodNearby: () => void
  onRequestRemove: () => void
  onScanBusinessCard: (file: File) => void
}

export default function RouteCurrentStopCard({
  businessName,
  address,
  stopNumber,
  leg,
  distanceOverride,
  statusNote,
  callHref,
  websiteHref,
  navigateLabel,
  isSaved,
  routeCompleted,
  onNavigate,
  onToggleCompleted,
  onOpenVisitWorkflow,
  onOpenSaved,
  onToggleSaved,
  onFindFoodNearby,
  onRequestRemove,
  onScanBusinessCard,
}: RouteCurrentStopCardProps) {
  return (
    <section className="panel section-panel route-current-stop-card">
      <RouteFocusCard
        stopNumber={stopNumber}
        businessName={businessName}
        address={address}
        leg={leg}
        distanceOverride={distanceOverride}
        variant="current"
        statusNote={statusNote}
      />

      <div className="route-current-stop-card__primary">
        <button type="button" className="button button--wide route-primary-action" onClick={onNavigate}>
          <Navigation size={18} />
          {navigateLabel}
        </button>
        {callHref ? (
          <a className="button button--ghost route-primary-action" href={callHref}>
            <Phone size={18} />
            {uiText.routes.actions.callBusiness}
          </a>
        ) : null}
        <MarkCompletedButton
          completed={routeCompleted}
          onClick={() => onOpenVisitWorkflow('complete')}
        />
      </div>

      <CardMoreActions>
        <BusinessCardScanButton className="card-more__action" onFileSelected={onScanBusinessCard} />
        <CardMoreMenuButton onClick={() => onOpenVisitWorkflow('notes')}>
          {uiText.routes.currentStop.quickActions.addVisitNotes}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => (isSaved ? onOpenSaved() : onToggleSaved())}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved
            ? uiText.routes.currentStop.quickActions.openSaved
            : uiText.routes.currentStop.quickActions.saveProspect}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => onOpenVisitWorkflow('notes')}>
          {uiText.routes.currentStop.quickActions.editContactInfo}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={onFindFoodNearby}>
          <UtensilsCrossed size={16} />
          {uiText.foodNearby.findFoodNearby}
        </CardMoreMenuButton>
        {websiteHref ? (
          <CardMoreMenuLink href={websiteHref}>
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </CardMoreMenuLink>
        ) : null}
        {routeCompleted ? (
          <CardMoreMenuButton onClick={onToggleCompleted}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        <CardMoreMenuButton onClick={onRequestRemove}>
          <Trash2 size={16} />
          {uiText.routes.actions.removeProspect}
        </CardMoreMenuButton>
      </CardMoreActions>
    </section>
  )
}
