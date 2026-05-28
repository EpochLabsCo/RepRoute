import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react'
import RouteFocusCard from './RouteFocusCard'
import RepRouteNavigationMap, { type RouteNavigationStop } from './RepRouteNavigationMap'
import { type RouteLineRenderStatus } from './RepRouteMap'
import {
  CardMoreActions,
  CardMoreMenuButton,
  MarkCompletedButton,
} from './ProspectCardActions'
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
  directionsApiStatus?: string | null
  directionsLoading: boolean
  directionsError: string | null
  onRouteLineRenderStatusChange?: (status: RouteLineRenderStatus) => void
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
  directionsApiStatus = null,
  directionsLoading,
  directionsError,
  onRouteLineRenderStatusChange,
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

        <div className="route-navigation-view__heading">
          <h2>{uiText.routes.inAppNavigation.heading}</h2>
          <p className="route-navigation-view__stats">
            {activeStopIndex >= 0 ? (
              <span>{uiText.routes.inAppNavigation.stopOrder(activeStopIndex + 1, routeProspects.length)}</span>
            ) : null}
            {activeStopIndex >= 0 ? <span aria-hidden="true">·</span> : null}
            <span>{routeMiles.toFixed(1)} mi</span>
            <span aria-hidden="true">·</span>
            <span>{formatDriveTime(estimatedDriveMinutes)}</span>
          </p>
        </div>

        <div className="route-progress-track" aria-hidden="true">
          <span className="route-progress-track__fill" style={{ width: `${completionPercentage}%` }} />
        </div>

        <p className="route-navigation-view__progress">
          <span>{uiText.routes.inAppNavigation.completedCount(completedStops)}</span>
          <span aria-hidden="true">·</span>
          <span>{uiText.routes.inAppNavigation.remainingCount(remainingStops)}</span>
          <span aria-hidden="true">·</span>
          <span>{uiText.routes.inAppNavigation.percentComplete(completionPercentage)}</span>
        </p>

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
          directionsApiStatus={directionsApiStatus}
          stops={navigationStops}
          userLocation={userLocation}
          onRouteLineRenderStatusChange={onRouteLineRenderStatusChange}
        />
      </section>

      {activeStop ? (
        <section className="panel section-panel route-navigation-view__active-card">
          <RouteFocusCard
            stopNumber={activeStopIndex >= 0 ? activeStopIndex + 1 : 1}
            businessName={activeStop.businessName}
            address={activeStop.address}
            leg={activeLeg}
            variant="active"
          />
        </section>
      ) : null}

      <section className="panel section-panel route-navigation-view__stops">
        <h2 className="route-navigation-view__stops-title">{uiText.routes.inAppNavigation.stopsHeading}</h2>

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
        <RouteFocusCard
          stopNumber={index + 1}
          businessName={prospect.businessName}
          address={prospect.address}
          leg={leg}
          variant={isActive ? 'active' : 'next'}
          statusNote={
            prospect.routeCompleted
              ? uiText.routes.completed
              : isArrived
                ? uiText.routes.inAppNavigation.arrived
                : null
          }
        />
      </button>

      <div className="prospect-primary-actions prospect-primary-actions--nav">
        <button
          type="button"
          className="prospect-action-btn prospect-action-btn--outline"
          onClick={onMarkArrived}
          disabled={prospect.routeCompleted}
        >
          <MapPin size={16} />
          <span>{uiText.routes.inAppNavigation.markArrived}</span>
        </button>
        <MarkCompletedButton completed={prospect.routeCompleted} onClick={onMarkCompleted} />
      </div>

      <CardMoreActions>
        <CardMoreMenuButton onClick={() => setNotesOpen((current) => !current)}>
          {uiText.routes.inAppNavigation.addNotes}
        </CardMoreMenuButton>
        {prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={onMarkCompleted}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
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
      </CardMoreActions>
    </article>
  )
}

export default RouteNavigationView
