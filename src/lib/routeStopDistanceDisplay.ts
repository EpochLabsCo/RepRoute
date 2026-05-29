import type { RouteSegmentLeg } from './routeDistanceMetrics'

export type RouteStopDistanceSource =
  | 'google-directions-segment'
  | 'at-route-start'
  | 'unavailable'

export type RouteStopDistanceDisplay = {
  scopeLabel: string
  metricsLine: string | null
  source: RouteStopDistanceSource
  sourceLabel: string
}

export type RouteStopDistanceInput = {
  id: string
  routeCompleted: boolean
}

export function formatSegmentMetricsLine(
  distanceText: string | null | undefined,
  driveTimeText: string | null | undefined,
) {
  const parts: string[] = []

  if (distanceText?.trim()) {
    parts.push(distanceText.trim())
  }

  if (driveTimeText?.trim()) {
    const normalized = driveTimeText.trim()
    parts.push(normalized.toLowerCase().includes('drive') ? normalized : `${normalized} drive`)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

export function buildRouteStopDistanceById({
  routeStops,
  legByStopId,
  labels,
}: {
  routeStops: RouteStopDistanceInput[]
  legByStopId: Record<string, RouteSegmentLeg | null | undefined>
  labels: {
    fromPreviousStop: string
    fromRouteStart: string
    sourceDirectionsSegment: string
    sourceAtRouteStart: string
    sourceUnavailable: string
  }
}): Record<string, RouteStopDistanceDisplay | null> {
  const map: Record<string, RouteStopDistanceDisplay | null> = {}

  for (const stop of routeStops) {
    if (stop.routeCompleted) {
      map[stop.id] = null
      continue
    }

    const leg = legByStopId[stop.id] ?? null

    if (!leg || leg.source === 'unavailable') {
      map[stop.id] = unavailableDisplay(labels.fromPreviousStop, labels.sourceUnavailable)
      continue
    }

    if (leg.source === 'at-route-start') {
      map[stop.id] = toDisplay(leg, labels.fromRouteStart, {
        source: 'at-route-start',
        sourceLabel: labels.sourceAtRouteStart,
      })
      continue
    }

    map[stop.id] = toDisplay(leg, labels.fromPreviousStop, {
      source: 'google-directions-segment',
      sourceLabel: labels.sourceDirectionsSegment,
    })
  }

  return map
}

function toDisplay(
  leg: RouteSegmentLeg,
  scopeLabel: string,
  meta: { source: RouteStopDistanceSource; sourceLabel: string },
): RouteStopDistanceDisplay {
  return {
    scopeLabel,
    metricsLine: formatSegmentMetricsLine(leg.distanceText, leg.durationText),
    source: meta.source,
    sourceLabel: meta.sourceLabel,
  }
}

function unavailableDisplay(scopeLabel: string, sourceLabel: string): RouteStopDistanceDisplay {
  return {
    scopeLabel,
    metricsLine: null,
    source: 'unavailable',
    sourceLabel,
  }
}

export function formatRouteStopCoordinates(location: { lat: number; lng: number } | null | undefined) {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
    return null
  }

  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
}

export function formatGpsProximityMiles(miles: number) {
  if (miles < 1) {
    return miles.toFixed(2)
  }

  return miles.toFixed(1)
}
