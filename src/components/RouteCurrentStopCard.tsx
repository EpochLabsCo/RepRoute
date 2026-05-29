import {
  Bookmark,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Trash2,
} from 'lucide-react'
import RouteFocusCard from './RouteFocusCard'
import PickUpFoodButton from './PickUpFoodButton'
import BusinessCardPreviewStrip from './BusinessCardPreviewStrip'
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
  isFoodStop: boolean
  callHref: string | null
  websiteHref: string | null
  navigateLabel: string
  isSaved: boolean
  isArrived: boolean
  routeCompleted: boolean
  visitNote: string
  cardPreviewUrl: string | null
  prospectId: string
  onUpdateVisitNote: (note: string) => void
  onNavigate: () => void
  onMarkArrived: () => void
  onToggleCompleted: () => void
  onOpenCompleteVisit: () => void
  onOpenVisitDetails: () => void
  onOpenSaved: () => void
  onToggleSaved: () => void
  onPickUpFood: () => void
  onRequestRemove: () => void
  onScanBusinessCard: (file: File) => void
  onRemoveBusinessCard: () => void
}

export default function RouteCurrentStopCard({
  businessName,
  address,
  stopNumber,
  leg,
  distanceOverride,
  statusNote,
  isFoodStop,
  callHref,
  websiteHref,
  navigateLabel,
  isSaved,
  isArrived,
  routeCompleted,
  visitNote,
  cardPreviewUrl,
  prospectId,
  onUpdateVisitNote,
  onNavigate,
  onMarkArrived,
  onToggleCompleted,
  onOpenCompleteVisit,
  onOpenVisitDetails,
  onOpenSaved,
  onToggleSaved,
  onPickUpFood,
  onRequestRemove,
  onScanBusinessCard,
  onRemoveBusinessCard,
}: RouteCurrentStopCardProps) {
  return (
    <section
      className={`panel section-panel route-current-stop-card${
        isFoodStop ? ' route-current-stop-card--food' : ''
      }`}
    >
      <RouteFocusCard
        stopNumber={stopNumber}
        businessName={businessName}
        address={address}
        leg={leg}
        distanceOverride={distanceOverride}
        variant="current"
        statusNote={statusNote}
        isFoodStop={isFoodStop}
      />

      <div className="route-stop-actions">
        <PickUpFoodButton onClick={onPickUpFood} wide />

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
        <button
          type="button"
          className={`button button--ghost route-primary-action ${isArrived ? 'route-primary-action--arrived' : ''}`}
          onClick={onMarkArrived}
          disabled={routeCompleted}
        >
          <MapPin size={18} />
          {isArrived ? uiText.routes.inAppNavigation.arrived : uiText.routes.inAppNavigation.markArrived}
        </button>
        <MarkCompletedButton completed={routeCompleted} onClick={onOpenCompleteVisit} />
        </div>
      </div>

      <div className="route-current-stop-card__visit-capture">
        <label className="field-group route-current-stop-card__quick-note">
          <span className="field-label">{uiText.routes.quickNoteLabel}</span>
          <textarea
            className="text-area text-area--compact"
            rows={3}
            value={visitNote}
            onChange={(event) => onUpdateVisitNote(event.target.value)}
            placeholder={uiText.routes.quickNotePlaceholder}
          />
        </label>
        <BusinessCardScanButton
          className="button button--wide route-current-stop-card__scan-card"
          onFileSelected={onScanBusinessCard}
        />
        {cardPreviewUrl ? (
          <BusinessCardPreviewStrip
            prospectId={prospectId}
            previewUrl={cardPreviewUrl}
            onCapture={onScanBusinessCard}
            onRemoveCard={onRemoveBusinessCard}
          />
        ) : null}
      </div>

      <CardMoreActions>
        <CardMoreMenuButton onClick={onOpenVisitDetails}>
          {uiText.routes.visitWorkflow.heading}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => (isSaved ? onOpenSaved() : onToggleSaved())}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved
            ? uiText.routes.currentStop.quickActions.openSaved
            : uiText.routes.currentStop.quickActions.saveProspect}
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
