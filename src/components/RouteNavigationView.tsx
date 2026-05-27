import { useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  MapPin,
  Navigation,
} from 'lucide-react'
import RepRouteNavigationMap, { type RouteNavigationStop } from './RepRouteNavigationMap'
import { uiText } from '../constants/uiText'

type OutcomeTag =
  | 'No Answer'
  | 'Decision Maker Met'
  | 'Follow-Up Needed'
  | 'Quote Opportunity'
  | 'Not Interested'
  | 'Bad Address'
  | 'Existing Customer'

export type RouteNavigationProspect = {
  id: string
  businessName: string
  address: string
  routeCompleted: boolean
  visitNote: string
  visitOutcome: OutcomeTag | ''
}

export type RouteNavigationLegSummary = {
  distanceText: string
  durationText: string
}

type RouteNavigationViewProps = {
  routeProspects: RouteNavigationProspect[]
  navigationStops: RouteNavigationStop[]
  directions: google.maps.DirectionsResult | null
  directionsLoading: boolean
  directionsError: string | null
  userLocation: { lat: number; lng: number } | null
  activeStopId: string | null
  arrivedStopIds: Record<string, boolean>
  legByStopId: Record<string, RouteNavigationLegSummary | null>
  completedStops: number
  remainingStops: number
  completionPercentage: number
  routeMiles: number
  estimatedDriveMinutes: number
  onClose: () => void
  onOpenMaps: () => void
  onSelectStop: (prospectId: string) => void
  onMarkArrived: (prospectId: string) => void
  onMarkCompleted: (prospectId: string) => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
}

function formatDriveTime(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
}

function RouteNavigationView({
  routeProspects,
  navigationStops,
  directions,
  directionsLoading,
  directionsError,
  userLocation,
  activeStopId,
  arrivedStopIds,
  legByStopId,
  completedStops,
  remainingStops,
  completionPercentage,
  routeMiles,
  estimatedDriveMinutes,
  onClose,
  onOpenMaps,
  onSelectStop,
  onMarkArrived,
  onMarkCompleted,
  onUpdateVisitNote,
  onUpdateOutcome,
}: RouteNavigationViewProps) {
  const activeStop =
    routeProspects.find((prospect) => prospect.id === activeStopId) ??
    routeProspects.find((prospect) => !prospect.routeCompleted) ??
    routeProspects[0] ??
    null
  const activeStopIndex = activeStop ? routeProspects.findIndex((prospect) => prospect.id === activeStop.id) : -1
  const activeLeg = activeStop ? legByStopId[activeStop.id] : null

  return (
    <div className="route-navigation-view">
      <section className="panel section-panel route-navigation-view__header">
        <div className="route-navigation-view__toolbar">
          <button
            type="button"
            className="button button--ghost route-navigation-view__back"
            onClick={onClose}
            aria-label={uiText.routes.inAppNavigation.back}
          >
            <ArrowLeft size={18} />
            {uiText.routes.inAppNavigation.back}
          </button>
          <button type="button" className="button button--ghost" onClick={onOpenMaps}>
            <ExternalLink size={16} />
            {uiText.routes.inAppNavigation.openInMaps}
          </button>
        </div>

        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow--tight">{uiText.routes.inAppNavigation.eyebrow}</div>
            <h2>{uiText.routes.inAppNavigation.heading}</h2>
          </div>
        </div>

        <div className="route-navigation-view__summary">
          <span className="meta-pill meta-pill--accent">
            {uiText.routes.inAppNavigation.nextStop(
              activeStop?.businessName ?? uiText.routes.routeReady,
            )}
          </span>
          {activeStopIndex >= 0 ? (
            <span className="meta-pill">
              {uiText.routes.inAppNavigation.stopOrder(activeStopIndex + 1, routeProspects.length)}
            </span>
          ) : null}
          <span className="meta-pill">{uiText.routes.optimization.totalDistance(routeMiles.toFixed(1))}</span>
          <span className="meta-pill">
            {uiText.routes.optimization.totalDriveTime(formatDriveTime(estimatedDriveMinutes))}
          </span>
        </div>

        <div className="route-progress-track" aria-hidden="true">
          <span className="route-progress-track__fill" style={{ width: `${completionPercentage}%` }} />
        </div>

        <div className="inline-summary route-navigation-view__progress">
          <span>{uiText.routes.inAppNavigation.completedCount(completedStops)}</span>
          <span>{uiText.routes.inAppNavigation.remainingCount(remainingStops)}</span>
          <span>{uiText.routes.inAppNavigation.percentComplete(completionPercentage)}</span>
        </div>

        {directionsLoading ? (
          <div className="status-banner status-banner--info">
            <p>{uiText.routes.inAppNavigation.loadingRoute}</p>
          </div>
        ) : null}

        {directionsError ? (
          <div className="status-banner status-banner--error">
            <p>{directionsError}</p>
          </div>
        ) : null}
      </section>

      <section className="panel section-panel route-navigation-view__map-panel">
        <RepRouteNavigationMap
          directions={directions}
          stops={navigationStops}
          userLocation={userLocation}
        />
      </section>

      {activeStop ? (
        <section className="panel section-panel route-navigation-view__next-card">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.routes.inAppNavigation.upNext}</div>
              <h3>{activeStop.businessName}</h3>
            </div>
            <span className="meta-pill meta-pill--accent">
              {uiText.routes.stopLabel(activeStopIndex >= 0 ? activeStopIndex : 0)}
            </span>
          </div>
          <p className="section-copy">{activeStop.address}</p>
          {activeLeg?.distanceText || activeLeg?.durationText ? (
            <div className="inline-summary">
              {activeLeg.distanceText ? (
                <span className="meta-pill">
                  {uiText.routes.inAppNavigation.distanceToStop(activeLeg.distanceText)}
                </span>
              ) : null}
              {activeLeg.durationText ? (
                <span className="meta-pill">
                  {uiText.routes.inAppNavigation.timeToStop(activeLeg.durationText)}
                </span>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="panel section-panel route-navigation-view__stops">
        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow--tight">{uiText.routes.inAppNavigation.stopsEyebrow}</div>
            <h2>{uiText.routes.inAppNavigation.stopsHeading}</h2>
          </div>
        </div>

        <div className="route-navigation-stop-list">
          {routeProspects.map((prospect, index) => (
            <RouteNavigationStopCard
              key={prospect.id}
              prospect={prospect}
              index={index}
              isActive={prospect.id === activeStopId}
              isArrived={Boolean(arrivedStopIds[prospect.id])}
              leg={legByStopId[prospect.id]}
              onSelect={() => onSelectStop(prospect.id)}
              onMarkArrived={() => onMarkArrived(prospect.id)}
              onMarkCompleted={() => onMarkCompleted(prospect.id)}
              onUpdateVisitNote={onUpdateVisitNote}
              onUpdateOutcome={onUpdateOutcome}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function RouteNavigationStopCard({
  prospect,
  index,
  isActive,
  isArrived,
  leg,
  onSelect,
  onMarkArrived,
  onMarkCompleted,
  onUpdateVisitNote,
  onUpdateOutcome,
}: {
  prospect: RouteNavigationProspect
  index: number
  isActive: boolean
  isArrived: boolean
  leg: RouteNavigationLegSummary | null
  onSelect: () => void
  onMarkArrived: () => void
  onMarkCompleted: () => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
}) {
  const [notesOpen, setNotesOpen] = useState(isActive)

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onUpdateVisitNote(prospect.id, event.target.value)
  }

  return (
    <article
      className={`route-navigation-stop-card ${isActive ? 'route-navigation-stop-card--active' : ''} ${
        prospect.routeCompleted ? 'route-navigation-stop-card--completed' : ''
      }`}
    >
      <button type="button" className="route-navigation-stop-card__select" onClick={onSelect}>
        <div className="route-navigation-stop-card__heading">
          <span className="route-navigation-stop-card__order">{index + 1}</span>
          <div>
            <strong>{prospect.businessName}</strong>
            <p>{prospect.address}</p>
          </div>
        </div>
        <div className="route-navigation-stop-card__meta">
          {isActive ? <span className="meta-pill meta-pill--accent">{uiText.routes.inAppNavigation.activeStop}</span> : null}
          {isArrived && !prospect.routeCompleted ? (
            <span className="meta-pill">{uiText.routes.inAppNavigation.arrived}</span>
          ) : null}
          {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
        </div>
      </button>

      {leg?.distanceText || leg?.durationText ? (
        <div className="inline-summary route-navigation-stop-card__leg">
          {leg.distanceText ? (
            <span className="meta-pill">{uiText.routes.inAppNavigation.distanceToStop(leg.distanceText)}</span>
          ) : null}
          {leg.durationText ? (
            <span className="meta-pill">{uiText.routes.inAppNavigation.timeToStop(leg.durationText)}</span>
          ) : null}
        </div>
      ) : null}

      <div className="route-navigation-stop-card__actions">
        <button
          type="button"
          className="route-action-button"
          onClick={onMarkArrived}
          disabled={prospect.routeCompleted}
        >
          <MapPin size={16} />
          {uiText.routes.inAppNavigation.markArrived}
        </button>
        <button
          type="button"
          className="route-action-button"
          onClick={onMarkCompleted}
          disabled={prospect.routeCompleted}
        >
          {prospect.routeCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {prospect.routeCompleted
            ? uiText.routes.currentStop.quickActions.markIncomplete
            : uiText.routes.inAppNavigation.markCompleted}
        </button>
        <button type="button" className="route-action-button" onClick={() => setNotesOpen((current) => !current)}>
          <Navigation size={16} />
          {uiText.routes.inAppNavigation.addNotes}
        </button>
      </div>

      {notesOpen ? (
        <div className="route-navigation-stop-card__panel">
          <label className="field-group">
            <span className="field-label">{uiText.routes.quickNoteLabel}</span>
            <textarea
              className="text-area text-area--compact"
              rows={3}
              value={prospect.visitNote}
              onChange={handleNotesChange}
              placeholder={uiText.routes.quickNotePlaceholder}
            />
          </label>

          <div className="field-group">
            <span className="field-label">{uiText.routes.visitOutcomeLabel}</span>
            <div className="route-outcome-grid">
              {uiText.routes.outcomeTags.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`route-outcome-chip ${
                    prospect.visitOutcome === option ? 'route-outcome-chip--active' : ''
                  }`}
                  onClick={() =>
                    onUpdateOutcome(prospect.id, prospect.visitOutcome === option ? '' : (option as OutcomeTag))
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <p className="editor-hint">{uiText.routes.inAppNavigation.noTurnByTurn}</p>
        </div>
      ) : null}
    </article>
  )
}

export default RouteNavigationView
