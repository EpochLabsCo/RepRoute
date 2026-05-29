import type { RouteSegmentLeg } from '../lib/routeDistanceMetrics'
import { uiText } from '../constants/uiText'

type RouteStopDistanceMetricsProps = {
  segmentLeg?: RouteSegmentLeg | null
  proximityText?: string | null
  compact?: boolean
}

export default function RouteStopDistanceMetrics({
  segmentLeg,
  proximityText,
  compact = false,
}: RouteStopDistanceMetricsProps) {
  const segmentDistance = segmentLeg?.distanceText?.trim() || ''
  const segmentDuration = segmentLeg?.durationText?.trim() || ''
  const hasSegment = Boolean(segmentDistance || segmentDuration)

  if (!hasSegment && !proximityText) {
    return null
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
