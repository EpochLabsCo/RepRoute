export type MapsApp = 'google-maps' | 'apple-maps' | 'waze'

export const MAPS_APP_PREFERENCE_STORAGE_KEY = 'reproute:maps-app-preference'

export type MapsLocation = {
  lat: number
  lng: number
}

export type MapsDestination = {
  label?: string
  address?: string
  location?: MapsLocation | null
  placeId?: string
}

export type MapsNavigationRequest = {
  destinations: MapsDestination[]
  origin?: string | MapsLocation | null
  travelMode?: 'driving'
}

export type OpenMapsNavigationResult = {
  opened: boolean
  usedWebFallback: boolean
  app: MapsApp
}

function isFiniteLatLng(value: MapsLocation | null | undefined) {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  )
}

export function detectPlatformDefaultMapsApp(): MapsApp {
  if (typeof navigator === 'undefined') {
    return 'google-maps'
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'apple-maps'
  }

  if (/Android/i.test(navigator.userAgent)) {
    return 'google-maps'
  }

  return 'google-maps'
}

export function sanitizeMapsAppPreference(value: unknown): MapsApp {
  if (value === 'google-maps' || value === 'apple-maps' || value === 'waze') {
    return value
  }

  return detectPlatformDefaultMapsApp()
}

export function readMapsAppPreference(): MapsApp {
  if (typeof window === 'undefined') {
    return detectPlatformDefaultMapsApp()
  }

  try {
    const stored = window.localStorage.getItem(MAPS_APP_PREFERENCE_STORAGE_KEY)
    if (stored) {
      return sanitizeMapsAppPreference(JSON.parse(stored))
    }
  } catch {
    // Ignore invalid storage payloads.
  }

  return detectPlatformDefaultMapsApp()
}

function formatOriginParam(origin: string | MapsLocation) {
  return typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
}

function resolveDestinationQuery(destination: MapsDestination) {
  if (isFiniteLatLng(destination.location ?? undefined)) {
    const { lat, lng } = destination.location as MapsLocation
    return {
      lat,
      lng,
      query: destination.address?.trim() || `${lat},${lng}`,
      label: destination.label?.trim() || destination.address?.trim() || '',
      placeId: destination.placeId?.trim() || '',
    }
  }

  const query = destination.address?.trim() || destination.label?.trim() || ''
  return {
    lat: undefined,
    lng: undefined,
    query,
    label: destination.label?.trim() || query,
    placeId: destination.placeId?.trim() || '',
  }
}

function buildGoogleMapsWebUrl(request: MapsNavigationRequest) {
  const destinations = request.destinations
    .map((destination) => resolveDestinationQuery(destination))
    .filter((destination) => destination.query)

  if (destinations.length === 0) {
    return ''
  }

  if (destinations.length === 1) {
    const destination = destinations[0]
    const url = new URL('https://www.google.com/maps/dir/')
    url.searchParams.set('api', '1')
    url.searchParams.set('destination', destination.query)
    url.searchParams.set('travelmode', request.travelMode ?? 'driving')

    if (request.origin) {
      url.searchParams.set('origin', formatOriginParam(request.origin))
    }

    if (destination.placeId) {
      url.searchParams.set('destination_place_id', destination.placeId)
    }

    return url.toString()
  }

  const url = new URL('https://www.google.com/maps/dir/')
  const orderedStops = destinations.map((destination) => destination.query)

  url.searchParams.set('api', '1')
  if (request.origin) {
    url.searchParams.set('origin', formatOriginParam(request.origin))
  }
  url.searchParams.set('destination', orderedStops[orderedStops.length - 1] ?? '')
  url.searchParams.set('travelmode', request.travelMode ?? 'driving')

  const waypoints = orderedStops.slice(0, -1)
  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join('|'))
  }

  return url.toString()
}

function buildGoogleMapsNativeUrl(request: MapsNavigationRequest) {
  const destination = resolveDestinationQuery(request.destinations[0] ?? {})
  if (!destination.query) {
    return ''
  }

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

  if (isAndroid && destination.lat !== undefined && destination.lng !== undefined) {
    return `google.navigation:q=${destination.lat},${destination.lng}`
  }

  if (destination.lat !== undefined && destination.lng !== undefined) {
    const url = new URL('comgooglemaps://')
    url.searchParams.set('daddr', `${destination.lat},${destination.lng}`)
    url.searchParams.set('directionsmode', 'driving')
    return url.toString()
  }

  const url = new URL('comgooglemaps://')
  url.searchParams.set('q', destination.query)
  url.searchParams.set('directionsmode', 'driving')
  return url.toString()
}

function buildAppleMapsUrls(request: MapsNavigationRequest) {
  const resolved = request.destinations
    .map((destination) => resolveDestinationQuery(destination))
    .filter((destination) => destination.query || (destination.lat !== undefined && destination.lng !== undefined))

  if (resolved.length === 0) {
    return { native: '', web: '' }
  }

  const web = new URL('https://maps.apple.com/')
  web.searchParams.set('dirflg', 'd')

  if (request.origin) {
    web.searchParams.set('saddr', formatOriginParam(request.origin))
  }

  for (const destination of resolved) {
    if (destination.lat !== undefined && destination.lng !== undefined) {
      web.searchParams.append('daddr', `${destination.lat},${destination.lng}`)
    } else {
      web.searchParams.append('daddr', destination.query)
    }
  }

  const first = resolved[0]
  const native = new URL('maps://')
  native.searchParams.set('dirflg', 'd')

  if (request.origin) {
    native.searchParams.set('saddr', formatOriginParam(request.origin))
  }

  if (first.lat !== undefined && first.lng !== undefined) {
    native.searchParams.set('daddr', `${first.lat},${first.lng}`)
    if (first.label) {
      native.searchParams.set('q', first.label)
    }
  } else {
    native.searchParams.set('daddr', first.query)
    if (first.label) {
      native.searchParams.set('q', first.label)
    }
  }

  return { native: native.toString(), web: web.toString() }
}

function buildWazeUrls(destination: MapsDestination) {
  const resolved = resolveDestinationQuery(destination)
  if (!resolved.query && resolved.lat === undefined) {
    return { native: '', web: '' }
  }

  const web = new URL('https://www.waze.com/ul')
  const native = new URL('waze://')

  if (resolved.lat !== undefined && resolved.lng !== undefined) {
    web.searchParams.set('ll', `${resolved.lat},${resolved.lng}`)
    web.searchParams.set('navigate', 'yes')
    native.searchParams.set('ll', `${resolved.lat},${resolved.lng}`)
    native.searchParams.set('navigate', 'yes')
  } else {
    web.searchParams.set('q', resolved.query)
    web.searchParams.set('navigate', 'yes')
    native.searchParams.set('q', resolved.query)
    native.searchParams.set('navigate', 'yes')
  }

  return { native: native.toString(), web: web.toString() }
}

function buildMapsUrls(request: MapsNavigationRequest, preferredApp: MapsApp) {
  const webGoogle = buildGoogleMapsWebUrl(request)
  const hasMultipleStops = request.destinations.length > 1

  if (preferredApp === 'google-maps') {
    if (hasMultipleStops) {
      return { primary: webGoogle, fallback: webGoogle }
    }

    const native = buildGoogleMapsNativeUrl(request)
    return {
      primary: native || webGoogle,
      fallback: webGoogle,
    }
  }

  if (preferredApp === 'apple-maps') {
    const apple = buildAppleMapsUrls(request)
    return {
      primary: hasMultipleStops ? apple.web : apple.native || apple.web,
      fallback: apple.web || webGoogle,
    }
  }

  if (hasMultipleStops) {
    return { primary: webGoogle, fallback: webGoogle }
  }

  const waze = buildWazeUrls(request.destinations[0] ?? {})
  return {
    primary: waze.native || waze.web || webGoogle,
    fallback: waze.web || webGoogle,
  }
}

export function openMapsUrl(primaryUrl: string, webFallbackUrl?: string) {
  if (!primaryUrl) {
    return false
  }

  const isHttp = /^https?:\/\//i.test(primaryUrl)

  if (isHttp) {
    const openedWindow = window.open(primaryUrl, '_blank', 'noopener,noreferrer')

    if (!openedWindow) {
      const anchor = document.createElement('a')
      anchor.href = primaryUrl
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    }

    return true
  }

  const fallback = webFallbackUrl?.trim() || ''
  let appLikelyOpened = false

  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      appLikelyOpened = true
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)

  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibility)

    if (!appLikelyOpened && fallback) {
      openMapsUrl(fallback)
    }
  }, 900)

  window.location.assign(primaryUrl)
  return true
}

export function openMapsNavigation(
  request: MapsNavigationRequest,
  preferredApp: MapsApp,
): OpenMapsNavigationResult {
  const sanitizedApp = sanitizeMapsAppPreference(preferredApp)
  const destinations = request.destinations.filter(
    (destination) =>
      destination.address?.trim() ||
      destination.label?.trim() ||
      isFiniteLatLng(destination.location ?? undefined),
  )

  if (destinations.length === 0) {
    return { opened: false, usedWebFallback: false, app: sanitizedApp }
  }

  const effectiveRequest = { ...request, destinations }
  const { primary, fallback } = buildMapsUrls(effectiveRequest, sanitizedApp)
  const usedWebFallback = primary === fallback || /^https?:\/\//i.test(primary)
  const opened = openMapsUrl(primary, fallback)

  return {
    opened,
    usedWebFallback,
    app: sanitizedApp,
  }
}

export function openMapsSearch(query: string, preferredApp: MapsApp) {
  const trimmed = query.trim()
  if (!trimmed) {
    return { opened: false, usedWebFallback: false, app: preferredApp }
  }

  return openMapsNavigation(
    {
      destinations: [{ address: trimmed, label: trimmed }],
    },
    preferredApp,
  )
}

export function destinationFromProspect(prospect: {
  businessName: string
  address: string
  location: MapsLocation
  googlePlaceId?: string
}): MapsDestination {
  return {
    label: prospect.businessName,
    address: prospect.address,
    location: prospect.location,
    placeId: prospect.googlePlaceId,
  }
}
