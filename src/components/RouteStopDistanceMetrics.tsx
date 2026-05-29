import type { RouteStopEtaDisplay } from '../lib/routeStopEtas'
import type { RouteStopDistanceDisplay } from '../lib/routeStopDistanceDisplay'
import { uiText } from '../constants/uiText'

type RouteStopDistanceMetricsProps = {
  distanceDisplay?: RouteStopDistanceDisplay | null
  gpsProximityText?: string | null
  schedule?: RouteStopEtaDisplay | null
  compact?: boolean
}

export default function RouteStopDistanceMetrics({
  distanceDisplay,
  gpsProximityText,
  schedule,
  compact = false,
}: RouteStopDistanceMetricsProps) {
  const hasSegment = Boolean(distanceDisplay?.metricsLine)
  const hasUnavailableSegment = distanceDisplay?.source === 'unavailable'
  const hasGpsProximity = Boolean(gpsProximityText?.trim())

  if (!schedule && !hasSegment && !hasUnavailableSegment && !hasGpsProximity) {
    return null
  }

  return (
    <div className={`route-stop-metrics${compact ? ' route-stop-metrics--compact' : ''}`}>
      {schedule ? (
        <p
          className={`route-stop-eta route-stop-eta--${
            schedule.status === 'completed'
              ? 'completed'
              : schedule.status === 'unavailable'
                ? 'unavailable'
                : 'primary'
          }`}
        >
          {schedule.primaryLabel}
        </p>
      ) : null}

      {distanceDisplay ? (
        <div className="route-stop-metrics__segment">
          <p className="route-stop-metrics__label">{distanceDisplay.scopeLabel}</p>
          {hasSegment ? (
            <p className="route-stop-metrics__value">{distanceDisplay.metricsLine}</p>
          ) : (
            <p className="route-stop-metrics__value route-stop-metrics__value--muted">
              {uiText.routes.distanceMetrics.distanceUnavailable}
            </p>
          )}
        </div>
      ) : null}

      {hasGpsProximity ? (
        <div className="route-stop-metrics__proximity">
          <p className="route-stop-metrics__value">{gpsProximityText}</p>
        </div>
      ) : null}
    </div>
  )
}
