export const MAX_OPTIMIZED_WAYPOINTS = 10

export type RouteDirectionsStop = {
  id: string
  businessName: string
  address: string
  googlePlaceId: string
  location: { lat: number; lng: number }
}

export type RouteStopValidationIssue = 'address' | 'coordinates' | 'placeId'

export type RouteStopValidationResult = {
  valid: RouteDirectionsStop[]
  invalid: Array<{ stop: RouteDirectionsStop; missing: RouteStopValidationIssue[] }>
  duplicateRemoved: Array<{ stop: RouteDirectionsStop; reason: string }>
}

export type RouteDirectionsFetchResult = {
  result: google.maps.DirectionsResult | null
  status: string
  usedFallback: boolean
  optimizeWaypoints: boolean
  waypointCount: number
  request: google.maps.DirectionsRequest | null
}

export function isFiniteLatLng(value: { lat: number; lng: number } | null | undefined) {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  )
}

export function resolveDirectionsLocation(stop: RouteDirectionsStop): string | { lat: number; lng: number } | null {
  if (isFiniteLatLng(stop.location)) {
    return stop.location
  }

  const trimmed = stop.address?.trim()
  if (trimmed) {
    return trimmed
  }

  return null
}

export function validateRouteStopsForDirections(stops: RouteDirectionsStop[]): RouteStopValidationResult {
  const valid: RouteDirectionsStop[] = []
  const invalid: RouteStopValidationResult['invalid'] = []

  for (const stop of stops) {
    const missing: RouteStopValidationIssue[] = []

    if (!stop.address?.trim()) {
      missing.push('address')
    }

    if (!isFiniteLatLng(stop.location)) {
      missing.push('coordinates')
    }

    if (!stop.googlePlaceId?.trim()) {
      missing.push('placeId')
    }

    const location = resolveDirectionsLocation(stop)
    if (!location) {
      invalid.push({ stop, missing })
      continue
    }

    valid.push(stop)
  }

  const seen = new Set<string>()
  const deduped: RouteDirectionsStop[] = []
  const duplicateRemoved: RouteStopValidationResult['duplicateRemoved'] = []

  for (const stop of valid) {
    const key = isFiniteLatLng(stop.location)
      ? `${stop.location.lat.toFixed(5)},${stop.location.lng.toFixed(5)}`
      : stop.address.trim().toLowerCase()

    if (seen.has(key)) {
      duplicateRemoved.push({
        stop,
        reason: 'Duplicate coordinates',
      })
      continue
    }

    seen.add(key)
    deduped.push(stop)
  }

  return { valid: deduped, invalid, duplicateRemoved }
}

export function buildDirectionsRequest({
  origin,
  orderedStops,
  travelMode,
  optimizeWaypoints,
}: {
  origin: string | { lat: number; lng: number }
  orderedStops: RouteDirectionsStop[]
  travelMode: google.maps.TravelMode
  optimizeWaypoints: boolean
}): google.maps.DirectionsRequest | null {
  if (orderedStops.length === 0) {
    return null
  }

  const resolved = orderedStops
    .map((stop) => ({
      id: stop.id,
      location: resolveDirectionsLocation(stop),
    }))
    .filter((entry): entry is { id: string; location: string | { lat: number; lng: number } } =>
      Boolean(entry.location),
    )

  if (resolved.length === 0) {
    return null
  }

  const destination = resolved[resolved.length - 1]?.location
  const waypointEntries = resolved.slice(0, -1)

  return {
    origin,
    destination,
    travelMode,
    optimizeWaypoints: optimizeWaypoints && waypointEntries.length > 0,
    waypoints:
      waypointEntries.length > 0
        ? waypointEntries.map((entry) => ({
            location: entry.location,
            stopover: true,
          }))
        : undefined,
  }
}

export async function waitForGoogleMaps(maxMs = 12000) {
  if (typeof window === 'undefined') {
    return false
  }

  if (window.google?.maps) {
    return true
  }

  return new Promise<boolean>((resolve) => {
    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      if (window.google?.maps) {
        window.clearInterval(intervalId)
        resolve(true)
        return
      }

      if (Date.now() - startedAt >= maxMs) {
        window.clearInterval(intervalId)
        resolve(false)
      }
    }, 120)
  })
}

async function requestDirections(request: google.maps.DirectionsRequest) {
  const service = new google.maps.DirectionsService()

  return new Promise<{ result: google.maps.DirectionsResult | null; status: string }>((resolve) => {
    service.route(request, (response, responseStatus) => {
      resolve({
        result: response ?? null,
        status: String(responseStatus),
      })
    })
  })
}

export async function fetchRouteDirectionsWithFallback({
  origin,
  orderedStops,
  travelMode,
}: {
  origin: string | { lat: number; lng: number }
  orderedStops: RouteDirectionsStop[]
  travelMode: google.maps.TravelMode
}): Promise<RouteDirectionsFetchResult> {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return {
      result: null,
      status: 'NO_MAPS',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount: 0,
      request: null,
    }
  }

  if (orderedStops.length === 0) {
    return {
      result: null,
      status: 'NO_STOPS',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount: 0,
      request: null,
    }
  }

  const waypointCount = Math.max(0, orderedStops.length - 1)

  if (waypointCount > MAX_OPTIMIZED_WAYPOINTS) {
    return {
      result: null,
      status: 'WAYPOINT_LIMIT_EXCEEDED',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount,
      request: null,
    }
  }

  const shouldOptimize = orderedStops.length > 2

  const optimizedRequest = buildDirectionsRequest({
    origin,
    orderedStops,
    travelMode,
    optimizeWaypoints: shouldOptimize,
  })

  if (!optimizedRequest) {
    return {
      result: null,
      status: 'INVALID_STOPS',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount,
      request: null,
    }
  }

  console.groupCollapsed('[RepRoute] DirectionsService request')
  console.info('origin', origin)
  console.info('orderedStopCount', orderedStops.length)
  console.info('waypointCount', waypointCount)
  console.info('optimizeWaypoints', optimizedRequest.optimizeWaypoints)
  console.info('request', optimizedRequest)

  const optimized = await requestDirections(optimizedRequest)
  console.info('DirectionsService status (optimized)', optimized.status)
  console.info('DirectionsService result (optimized)', optimized.result)

  if (optimized.result && optimized.status === String(google.maps.DirectionsStatus.OK)) {
    console.groupEnd()
    return {
      result: optimized.result,
      status: optimized.status,
      usedFallback: false,
      optimizeWaypoints: Boolean(optimizedRequest.optimizeWaypoints),
      waypointCount,
      request: optimizedRequest,
    }
  }

  if (!shouldOptimize) {
    console.groupEnd()
    return {
      result: optimized.result,
      status: optimized.status,
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount,
      request: optimizedRequest,
    }
  }

  const sequentialRequest = buildDirectionsRequest({
    origin,
    orderedStops,
    travelMode,
    optimizeWaypoints: false,
  })

  if (!sequentialRequest) {
    console.groupEnd()
    return {
      result: null,
      status: optimized.status,
      usedFallback: true,
      optimizeWaypoints: false,
      waypointCount,
      request: optimizedRequest,
    }
  }

  console.info('DirectionsService fallback request (sequential)', sequentialRequest)
  const sequential = await requestDirections(sequentialRequest)
  console.info('DirectionsService status (sequential)', sequential.status)
  console.info('DirectionsService result (sequential)', sequential.result)
  console.groupEnd()

  return {
    result: sequential.result,
    status: sequential.status,
    usedFallback: true,
    optimizeWaypoints: false,
    waypointCount,
    request: sequentialRequest,
  }
}
