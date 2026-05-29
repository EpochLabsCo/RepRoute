import type { RouteSegmentLeg } from '../lib/routeDistanceMetrics'
import type { RouteStopEtaDisplay } from '../lib/routeStopEtas'
import { uiText } from '../constants/uiText'

type RouteStopDistanceMetricsProps = {
  segmentLeg?: RouteSegmentLeg | null
  proximityText?: string | null
  schedule?: RouteStopEtaDisplay | null
  compact?: boolean
}

export default function RouteStopDistanceMetrics({
  segmentLeg,
  proximityText,
  schedule,
  compact = false,
}: RouteStopDistanceMetricsProps) {
  const segmentDistance = segmentLeg?.distanceText?.trim() || ''
  const segmentDuration = segmentLeg?.durationText?.trim() || ''
  const hasSegment = Boolean(segmentDistance || segmentDuration)
  const driveAndDistance = [schedule?.distanceLabel, schedule?.driveTimeLabel].filter(Boolean).join(' · ')

  if (!schedule && !hasSegment && !proximityText) {
    return null
  }

  if (schedule?.status === 'completed' || schedule?.status === 'unavailable') {
    return (
      <div className={`route-stop-metrics${compact ? ' route-stop-metrics--compact' : ''}`}>
        <p
          className={`route-stop-eta route-stop-eta--${
            schedule.status === 'completed' ? 'completed' : 'unavailable'
          }`}
        >
          {schedule.primaryLabel}
        </p>
        {proximityText ? (
          <p className="route-stop-metrics__row route-stop-metrics__row--proximity">
            <span className="route-stop-metrics__value">{proximityText}</span>
          </p>
        ) : null}
      </div>
    )
  }

  if (schedule?.status === 'scheduled') {
    return (
      <div className={`route-stop-metrics${compact ? ' route-stop-metrics--compact' : ''}`}>
        <p className="route-stop-eta route-stop-eta--primary">{schedule.primaryLabel}</p>
        {driveAndDistance ? (
          <p className="route-stop-metrics__row route-stop-metrics__value">{driveAndDistance}</p>
        ) : null}
        {proximityText ? (
          <p className="route-stop-metrics__row route-stop-metrics__row--proximity">
            <span className="route-stop-metrics__value">{proximityText}</span>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`route-stop-metrics${compact ? ' route-stop-metrics--compact' : ''}`}>
      {hasSegment ? (
        <p className="route-stop-metrics__row">
          <span className="route-stop-metrics__label">{uiText.routes.distanceMetrics.fromPreviousStop}</span>
          <span className="route-stop-metrics__value">
            {[segmentDistance, segmentDuration].filter(Boolean).join(' · ')}
          </span>
        </p>
      ) : null}
      {proximityText ? (
        <p className="route-stop-metrics__row route-stop-metrics__row--proximity">
          <span className="route-stop-metrics__value">{proximityText}</span>
        </p>
      ) : null}
    </div>
  )
}
