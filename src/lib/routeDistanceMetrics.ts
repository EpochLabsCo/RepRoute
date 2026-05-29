export type RouteSegmentLeg = {
  distanceText: string
  durationText: string
  distanceMeters: number | null
  durationSeconds: number | null
  source: 'google-directions' | 'at-route-start' | 'unavailable'
}

type RouteProspectLike = {
  id: string
}

export function buildStopLegMap(
  routeProspects: RouteProspectLike[],
  directions: google.maps.DirectionsResult | null,
  originIsFirstStop: boolean,
  atStartLabel: string,
): Record<string, RouteSegmentLeg | null> {
  const legs = directions?.routes?.[0]?.legs ?? []
  const map: Record<string, RouteSegmentLeg | null> = {}
  let legIndex = 0

  for (let index = 0; index < routeProspects.length; index += 1) {
    const stop = routeProspects[index]

    if (index === 0 && originIsFirstStop) {
      map[stop.id] = {
        distanceText: atStartLabel,
        durationText: '',
        distanceMeters: 0,
        durationSeconds: 0,
        source: 'at-route-start',
      }
      continue
    }

    const leg = legs[legIndex]
    legIndex += 1
    map[stop.id] = leg
      ? {
          distanceText: leg.distance?.text ?? '',
          durationText: leg.duration?.text ?? '',
          distanceMeters: leg.distance?.value ?? null,
          durationSeconds:
            typeof leg.duration?.value === 'number' ? leg.duration.value : null,
          source: 'google-directions',
        }
      : {
          distanceText: '',
          durationText: '',
          distanceMeters: null,
          durationSeconds: null,
          source: 'unavailable',
        }
  }

  return map
}

export function sumDirectionsRouteMeters(directions: google.maps.DirectionsResult | null) {
  const legs = directions?.routes?.[0]?.legs ?? []
  if (legs.length === 0) {
    return null
  }

  let total = 0
  for (const leg of legs) {
    if (typeof leg.distance?.value !== 'number') {
      return null
    }
    total += leg.distance.value
  }

  return total
}

export function sumDirectionsDriveSeconds(directions: google.maps.DirectionsResult | null) {
  const legs = directions?.routes?.[0]?.legs ?? []
  if (legs.length === 0) {
    return null
  }

  let total = 0
  for (const leg of legs) {
    if (typeof leg.duration?.value !== 'number') {
      return null
    }
    total += leg.duration.value
  }

  return total
}

export function metersToMiles(meters: number) {
  return meters / 1609.344
}

export function formatMilesOneDecimal(miles: number) {
  return `${miles.toFixed(1)} mi`
}

export function formatProximityFromUserMiles(miles: number, label: (formatted: string) => string) {
  return label(formatMilesOneDecimal(miles))
}

export function calculateHaversineMiles(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const earthRadiusMeters = 6_371_000
  const lat1 = (origin.lat * Math.PI) / 180
  const lat2 = (destination.lat * Math.PI) / 180
  const deltaLat = ((destination.lat - origin.lat) * Math.PI) / 180
  const deltaLng = ((destination.lng - origin.lng) * Math.PI) / 180
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return metersToMiles(earthRadiusMeters * c)
}
