/** Stops included in a single Google waypoint-optimization request (mobile-safe default). */
export const ROUTE_OPTIMIZATION_BATCH_STOPS = 20

/** Google Directions API allows up to 25 intermediate waypoints per request. */
export const DIRECTIONS_MAX_WAYPOINTS = 25

/** Max stops in one directions request when origin is separate from the first stop. */
export const DIRECTIONS_MAX_STOPS_PER_REQUEST = DIRECTIONS_MAX_WAYPOINTS + 1

/** @deprecated Use DIRECTIONS_MAX_WAYPOINTS */
export const MAX_OPTIMIZED_WAYPOINTS = DIRECTIONS_MAX_WAYPOINTS

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
  requestedStopCount: number
  partialLine: boolean
  request: google.maps.DirectionsRequest | null
}

export type RouteOptimizationResult = {
  orderedIds: string[]
  totalStopCount: number
  optimizedStopCount: number
  skippedStopCount: number
  batched: boolean
  status: string
  distanceMeters: number
  durationSeconds: number
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

function sumRouteMetrics(route: google.maps.DirectionsRoute) {
  const legs = route.legs ?? []
  const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0)
  const durationSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0)
  return { distanceMeters, durationSeconds }
}

function applyWaypointOrder(stops: RouteDirectionsStop[], waypointOrder: number[]) {
  if (stops.length <= 1) {
    return stops.map((stop) => stop.id)
  }

  const waypointStops = stops.slice(0, -1)
  const destination = stops[stops.length - 1]
  const waypointIds = waypointStops.map((stop) => stop.id)
  const optimizedWaypointIds = waypointOrder.map((index) => waypointIds[index]).filter(Boolean)

  return [...optimizedWaypointIds, destination?.id].filter(Boolean) as string[]
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

export async function optimizeRouteStopOrder({
  origin,
  stops,
  travelMode,
  batchStopLimit = ROUTE_OPTIMIZATION_BATCH_STOPS,
}: {
  origin: string | { lat: number; lng: number }
  stops: RouteDirectionsStop[]
  travelMode: google.maps.TravelMode
  batchStopLimit?: number
}): Promise<RouteOptimizationResult> {
  const totalStopCount = stops.length

  if (totalStopCount === 0) {
    return {
      orderedIds: [],
      totalStopCount: 0,
      optimizedStopCount: 0,
      skippedStopCount: 0,
      batched: false,
      status: 'NO_STOPS',
      distanceMeters: 0,
      durationSeconds: 0,
    }
  }

  if (typeof window === 'undefined' || !window.google?.maps) {
    return {
      orderedIds: stops.map((stop) => stop.id),
      totalStopCount,
      optimizedStopCount: 0,
      skippedStopCount: 0,
      batched: false,
      status: 'NO_MAPS',
      distanceMeters: 0,
      durationSeconds: 0,
    }
  }

  const batched = totalStopCount > batchStopLimit
  const stopsToOptimize = batched ? stops.slice(0, batchStopLimit) : stops
  const remainder = batched ? stops.slice(batchStopLimit) : []
  const skippedStopCount = remainder.length

  if (stopsToOptimize.length <= 2) {
    const request = buildDirectionsRequest({
      origin,
      orderedStops: stopsToOptimize,
      travelMode,
      optimizeWaypoints: false,
    })

    if (!request) {
      return {
        orderedIds: [...stopsToOptimize, ...remainder].map((stop) => stop.id),
        totalStopCount,
        optimizedStopCount: stopsToOptimize.length,
        skippedStopCount,
        batched,
        status: 'INVALID_STOPS',
        distanceMeters: 0,
        durationSeconds: 0,
      }
    }

    const { result, status } = await requestDirections(request)
    const route = result?.routes?.[0]
    const okStatus = String(google.maps.DirectionsStatus.OK)

    if (route && status === okStatus) {
      const { distanceMeters, durationSeconds } = sumRouteMetrics(route)
      return {
        orderedIds: [...stopsToOptimize, ...remainder].map((stop) => stop.id),
        totalStopCount,
        optimizedStopCount: stopsToOptimize.length,
        skippedStopCount,
        batched,
        status,
        distanceMeters,
        durationSeconds,
      }
    }

    return {
      orderedIds: stops.map((stop) => stop.id),
      totalStopCount,
      optimizedStopCount: stopsToOptimize.length,
      skippedStopCount,
      batched,
      status,
      distanceMeters: 0,
      durationSeconds: 0,
    }
  }

  const waypointCount = Math.max(0, stopsToOptimize.length - 1)
  const canOptimize =
    stopsToOptimize.length > 2 &&
    waypointCount > 0 &&
    waypointCount <= DIRECTIONS_MAX_WAYPOINTS

  const optimizedRequest = buildDirectionsRequest({
    origin,
    orderedStops: stopsToOptimize,
    travelMode,
    optimizeWaypoints: canOptimize,
  })

  if (!optimizedRequest) {
    return {
      orderedIds: stops.map((stop) => stop.id),
      totalStopCount,
      optimizedStopCount: stopsToOptimize.length,
      skippedStopCount,
      batched,
      status: 'INVALID_STOPS',
      distanceMeters: 0,
      durationSeconds: 0,
    }
  }

  const optimized = await requestDirections(optimizedRequest)
  const okStatus = String(google.maps.DirectionsStatus.OK)
  const route = optimized.result?.routes?.[0]

  if (route && optimized.status === okStatus) {
    const { distanceMeters, durationSeconds } = sumRouteMetrics(route)
    let batchOrderedIds = stopsToOptimize.map((stop) => stop.id)

    if (canOptimize && route.waypoint_order?.length) {
      const waypointIds = stopsToOptimize.slice(0, -1).map((stop) => stop.id)
      if (route.waypoint_order.length === waypointIds.length) {
        batchOrderedIds = applyWaypointOrder(stopsToOptimize, route.waypoint_order)
      }
    }

    return {
      orderedIds: [...batchOrderedIds, ...remainder.map((stop) => stop.id)],
      totalStopCount,
      optimizedStopCount: stopsToOptimize.length,
      skippedStopCount,
      batched,
      status: optimized.status,
      distanceMeters,
      durationSeconds,
    }
  }

  const sequentialRequest = buildDirectionsRequest({
    origin,
    orderedStops: stopsToOptimize,
    travelMode,
    optimizeWaypoints: false,
  })

  if (sequentialRequest) {
    const sequential = await requestDirections(sequentialRequest)
    const sequentialRoute = sequential.result?.routes?.[0]

    if (sequentialRoute && sequential.status === okStatus) {
      const { distanceMeters, durationSeconds } = sumRouteMetrics(sequentialRoute)
      return {
        orderedIds: [...stopsToOptimize, ...remainder].map((stop) => stop.id),
        totalStopCount,
        optimizedStopCount: stopsToOptimize.length,
        skippedStopCount,
        batched,
        status: sequential.status,
        distanceMeters,
        durationSeconds,
      }
    }

    return {
      orderedIds: stops.map((stop) => stop.id),
      totalStopCount,
      optimizedStopCount: stopsToOptimize.length,
      skippedStopCount,
      batched,
      status: sequential.status,
      distanceMeters: 0,
      durationSeconds: 0,
    }
  }

  return {
    orderedIds: stops.map((stop) => stop.id),
    totalStopCount,
    optimizedStopCount: stopsToOptimize.length,
    skippedStopCount,
    batched,
    status: optimized.status,
    distanceMeters: 0,
    durationSeconds: 0,
  }
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
  const requestedStopCount = orderedStops.length

  if (typeof window === 'undefined' || !window.google?.maps) {
    return {
      result: null,
      status: 'NO_MAPS',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount: 0,
      requestedStopCount,
      partialLine: false,
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
      requestedStopCount,
      partialLine: false,
      request: null,
    }
  }

  let stopsForRequest = orderedStops
  let partialLine = false

  if (orderedStops.length > DIRECTIONS_MAX_STOPS_PER_REQUEST) {
    stopsForRequest = orderedStops.slice(0, DIRECTIONS_MAX_STOPS_PER_REQUEST)
    partialLine = true
  }

  const effectiveWaypointCount = Math.max(0, stopsForRequest.length - 1)
  const shouldOptimize = stopsForRequest.length > 2 && effectiveWaypointCount <= DIRECTIONS_MAX_WAYPOINTS

  const optimizedRequest = buildDirectionsRequest({
    origin,
    orderedStops: stopsForRequest,
    travelMode,
    optimizeWaypoints: shouldOptimize,
  })

  if (!optimizedRequest) {
    return {
      result: null,
      status: 'INVALID_STOPS',
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount: effectiveWaypointCount,
      requestedStopCount,
      partialLine,
      request: null,
    }
  }

  const optimized = await requestDirections(optimizedRequest)
  const okStatus = String(google.maps.DirectionsStatus.OK)

  if (optimized.result && optimized.status === okStatus) {
    return {
      result: optimized.result,
      status: optimized.status,
      usedFallback: false,
      optimizeWaypoints: Boolean(optimizedRequest.optimizeWaypoints),
      waypointCount: effectiveWaypointCount,
      requestedStopCount,
      partialLine,
      request: optimizedRequest,
    }
  }

  if (!shouldOptimize) {
    return {
      result: optimized.result,
      status: optimized.status,
      usedFallback: false,
      optimizeWaypoints: false,
      waypointCount: effectiveWaypointCount,
      requestedStopCount,
      partialLine,
      request: optimizedRequest,
    }
  }

  const sequentialRequest = buildDirectionsRequest({
    origin,
    orderedStops: stopsForRequest,
    travelMode,
    optimizeWaypoints: false,
  })

  if (!sequentialRequest) {
    return {
      result: null,
      status: optimized.status,
      usedFallback: true,
      optimizeWaypoints: false,
      waypointCount: effectiveWaypointCount,
      requestedStopCount,
      partialLine,
      request: optimizedRequest,
    }
  }

  const sequential = await requestDirections(sequentialRequest)

  return {
    result: sequential.result,
    status: sequential.status,
    usedFallback: true,
    optimizeWaypoints: false,
    waypointCount: effectiveWaypointCount,
    requestedStopCount,
    partialLine,
    request: sequentialRequest,
  }
}
