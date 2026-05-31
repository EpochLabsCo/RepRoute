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

function formatOriginParam(origin: string | MapsLocation) {
  return typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
}

function resolveDestinationQuery(destination: MapsDestination) {
  if (isFiniteLatLng(destination.location ?? undefined)) {
    const { lat, lng } = destination.location as MapsLocation
    return {
      query: destination.address?.trim() || `${lat},${lng}`,
      placeId: destination.placeId?.trim() || '',
    }
  }

  const query = destination.address?.trim() || destination.label?.trim() || ''
  return {
    query,
    placeId: destination.placeId?.trim() || '',
  }
}

export function buildGoogleMapsDirectionsUrl(request: MapsNavigationRequest) {
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

export function openGoogleMapsUrl(url: string) {
  if (!url) {
    return false
  }

  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!openedWindow) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return true
}

export function openMapsNavigation(request: MapsNavigationRequest): OpenMapsNavigationResult {
  const destinations = request.destinations.filter(
    (destination) =>
      destination.address?.trim() ||
      destination.label?.trim() ||
      isFiniteLatLng(destination.location ?? undefined),
  )

  if (destinations.length === 0) {
    return { opened: false }
  }

  const url = buildGoogleMapsDirectionsUrl({ ...request, destinations })
  return { opened: openGoogleMapsUrl(url) }
}

export function openMapsSearch(query: string): OpenMapsNavigationResult {
  const trimmed = query.trim()
  if (!trimmed) {
    return { opened: false }
  }

  return openMapsNavigation({
    destinations: [{ address: trimmed, label: trimmed }],
  })
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
