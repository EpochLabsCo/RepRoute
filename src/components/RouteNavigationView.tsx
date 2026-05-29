import { ArrowLeft, ExternalLink, MapPin, Trash2 } from 'lucide-react'
import RouteFocusCard from './RouteFocusCard'
import RepRouteNavigationMap, { type RouteNavigationStop } from './RepRouteNavigationMap'
import { type RouteLineRenderStatus } from './RepRouteMap'
import type { RouteSegmentLeg } from '../lib/routeDistanceMetrics'
import type { RouteStopEtaDisplay } from '../lib/routeStopEtas'
import type { RouteStopDistanceDisplay } from '../lib/routeStopDistanceDisplay'
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
  isFoodStop: boolean
  visitNote: string
  visitOutcome: OutcomeTag | ''
}

export type RouteNavigationLegSummary = RouteSegmentLeg

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
  etaByStopId?: Record<string, RouteStopEtaDisplay>
  distanceByStopId?: Record<string, RouteStopDistanceDisplay | null>
  gpsProximityByStopId?: Record<string, string | null>
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
  onOpenVisitWorkflow: (prospectId: string) => void
  onPickUpFood: (prospectId: string) => void
  onRemoveFromRoute: (prospectId: string) => void
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
  etaByStopId = {},
  distanceByStopId = {},
  gpsProximityByStopId = {},
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
  onOpenVisitWorkflow,
  onPickUpFood,
  onRemoveFromRoute,
}: RouteNavigationViewProps) {
  const activeStop =
    routeProspects.find((prospect) => prospect.id === activeStopId) ??
    routeProspects.find((prospect) => !prospect.routeCompleted) ??
    routeProspects[0] ??
    null
  const activeStopIndex = activeStop ? routeProspects.findIndex((prospect) => prospect.id === activeStop.id) : -1
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
            <span>
              {uiText.routes.distanceMetrics.totalRouteDistance}: {routeMiles.toFixed(1)} mi
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {uiText.routes.distanceMetrics.totalDriveTime}: {formatDriveTime(estimatedDriveMinutes)}
            </span>
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
            distanceDisplay={activeStop ? distanceByStopId[activeStop.id] : null}
            gpsProximityText={activeStop ? gpsProximityByStopId[activeStop.id] : null}
            schedule={activeStop ? etaByStopId[activeStop.id] : null}
            variant="active"
            isFoodStop={activeStop.isFoodStop}
            onPickUpFood={
              !activeStop.routeCompleted && !activeStop.isFoodStop
                ? () => onPickUpFood(activeStop.id)
                : undefined
            }
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
              distanceDisplay={distanceByStopId[prospect.id]}
              gpsProximityText={gpsProximityByStopId[prospect.id]}
              schedule={etaByStopId[prospect.id]}
              onSelect={() => onSelectStop(prospect.id)}
              onMarkArrived={() => onMarkArrived(prospect.id)}
              onMarkCompleted={() => onMarkCompleted(prospect.id)}
              onOpenVisitWorkflow={() => onOpenVisitWorkflow(prospect.id)}
              onPickUpFood={() => onPickUpFood(prospect.id)}
              onRemoveFromRoute={() => onRemoveFromRoute(prospect.id)}
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
  distanceDisplay,
  gpsProximityText,
  schedule,
  onSelect,
  onMarkArrived,
  onMarkCompleted,
  onOpenVisitWorkflow,
  onPickUpFood,
  onRemoveFromRoute,
}: {
  prospect: RouteNavigationProspect
  index: number
  isActive: boolean
  isArrived: boolean
  distanceDisplay?: RouteStopDistanceDisplay | null
  gpsProximityText?: string | null
  schedule?: RouteStopEtaDisplay | null
  onSelect: () => void
  onMarkArrived: () => void
  onMarkCompleted: () => void
  onOpenVisitWorkflow: () => void
  onPickUpFood: () => void
  onRemoveFromRoute: () => void
}) {
  return (
    <article
      className={`route-navigation-stop-card ${isActive ? 'route-navigation-stop-card--active' : ''} ${
        prospect.routeCompleted ? 'route-navigation-stop-card--completed' : ''
      } ${prospect.isFoodStop ? 'route-navigation-stop-card--food' : ''}`}
    >
      <button type="button" className="route-navigation-stop-card__select" onClick={onSelect}>
        <RouteFocusCard
          stopNumber={index + 1}
          businessName={prospect.businessName}
          address={prospect.address}
          distanceDisplay={distanceDisplay}
          gpsProximityText={gpsProximityText}
          schedule={schedule}
          variant={isActive ? 'active' : 'next'}
          isFoodStop={prospect.isFoodStop}
          statusNote={
            prospect.routeCompleted
              ? null
              : isArrived
                ? uiText.routes.inAppNavigation.arrived
                : null
          }
          onPickUpFood={
            !prospect.routeCompleted && !prospect.isFoodStop ? onPickUpFood : undefined
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
        <CardMoreMenuButton onClick={onOpenVisitWorkflow}>
          {uiText.routes.visitWorkflow.heading}
        </CardMoreMenuButton>
        {prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={onMarkCompleted}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        <CardMoreMenuButton onClick={onRemoveFromRoute}>
          <Trash2 size={16} />
          {uiText.routes.removal.removeFromRoute}
        </CardMoreMenuButton>
      </CardMoreActions>
    </article>
  )
}

export default RouteNavigationView
