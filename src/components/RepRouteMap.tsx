import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DirectionsRenderer,
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import RouteMapLegend from './RouteMapLegend'
import { uiText } from '../constants/uiText'
import {
  createMapPinIcon,
  MAP_PIN_COLORS,
  resolveMapPinAppearance,
} from '../lib/mapPinStyles'

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 }
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places']
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

export type RepRouteMapMarkerCategory = 'search' | 'saved' | 'route' | 'food'

export type RepRouteMapMarker = {
  id: string
  businessName: string
  address: string
  phone: string
  website: string
  rating: number | null
  position: {
    lat: number
    lng: number
  }
  isSaved: boolean
  isInRoute: boolean
  isFoodStop?: boolean
  routeCompleted?: boolean
  categories: RepRouteMapMarkerCategory[]
  routeOrder?: number
}

export type RouteLineRenderStatus =
  | 'idle'
  | 'map-loading'
  | 'map-ready'
  | 'no-directions'
  | 'rendering'
  | 'rendered'

type RepRouteMapProps = {
  markers: RepRouteMapMarker[]
  directions?: google.maps.DirectionsResult | null
  directionsApiStatus?: string | null
  userLocation?: { lat: number; lng: number } | null
  activeRouteStopId?: string | null
  invalidStopIds?: Set<string>
  showLegend?: boolean
  onRouteLineRenderStatusChange?: (status: RouteLineRenderStatus) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
}

const PIN_STATE_LABELS = {
  upcoming: uiText.routes.mapLegend.upcoming,
  current: uiText.routes.mapLegend.current,
  completed: uiText.routes.mapLegend.completed,
  food: uiText.routes.mapLegend.food,
  invalid: uiText.routes.mapLegend.invalid,
  search: uiText.search.card.searchResult,
  saved: uiText.followUps.savedStatus,
} as const

function formatRating(rating: number | null) {
  if (rating === null) {
    return uiText.errors.noRatingYet
  }

  return `${rating.toFixed(1)} stars`
}

function normalizeWebsite(website: string) {
  if (!website || website === uiText.errors.websiteUnavailable) {
    return ''
  }

  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`
}

function directionsResponseReady(
  directions: google.maps.DirectionsResult | null | undefined,
  directionsApiStatus: string | null | undefined,
) {
  if (!directions?.routes?.[0]) {
    return false
  }

  if (!directionsApiStatus) {
    return true
  }

  const okStatus =
    typeof google !== 'undefined' && google.maps?.DirectionsStatus
      ? String(google.maps.DirectionsStatus.OK)
      : 'OK'

  return directionsApiStatus === okStatus
}

function RepRouteMap({
  markers,
  directions = null,
  directionsApiStatus = null,
  userLocation: userLocationProp = null,
  activeRouteStopId = null,
  invalidStopIds,
  showLegend = true,
  onRouteLineRenderStatusChange,
  onToggleSaved,
  onToggleRoute,
}: RepRouteMapProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [center, setCenter] = useState(AUSTIN_CENTER)
  const [internalUserLocation, setInternalUserLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const hasApiKey = apiKey.length > 0

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'reproute-google-map',
    googleMapsApiKey: hasApiKey ? apiKey : 'missing-api-key',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const userLocation = userLocationProp ?? internalUserLocation
  const canRenderRouteLine = Boolean(
    map && isLoaded && directionsResponseReady(directions, directionsApiStatus),
  )
  const showInvalidLegend = Boolean(invalidStopIds && invalidStopIds.size > 0)

  useEffect(() => {
    if (!isLoaded) {
      onRouteLineRenderStatusChange?.('map-loading')
      return
    }

    if (!directions) {
      onRouteLineRenderStatusChange?.('no-directions')
      return
    }

    if (!map) {
      onRouteLineRenderStatusChange?.('map-ready')
      return
    }

    if (!canRenderRouteLine) {
      onRouteLineRenderStatusChange?.('no-directions')
      return
    }

    onRouteLineRenderStatusChange?.('rendering')
  }, [canRenderRouteLine, directions, isLoaded, map, onRouteLineRenderStatusChange])

  const handleDirectionsRendererLoad = useCallback(() => {
    onRouteLineRenderStatusChange?.('rendered')
  }, [onRouteLineRenderStatusChange])

  useEffect(() => {
    if (userLocationProp) {
      return
    }

    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        setCenter(nextCenter)
        setInternalUserLocation(nextCenter)
      },
      () => {
        setCenter(AUSTIN_CENTER)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    )
  }, [userLocationProp])

  useEffect(() => {
    if (userLocationProp) {
      setCenter(userLocationProp)
    }
  }, [userLocationProp])

  const fitRouteBounds = useCallback(() => {
    if (!map) {
      return
    }

    const bounds = new google.maps.LatLngBounds()

    if (userLocation) {
      bounds.extend(userLocation)
    }

    for (const marker of markers) {
      bounds.extend(marker.position)
    }

    const route = directions?.routes?.[0]
    if (route?.bounds) {
      bounds.union(route.bounds)
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 48, right: 40, bottom: 48, left: 40 })
    }
  }, [directions, map, markers, userLocation])

  useEffect(() => {
    fitRouteBounds()
  }, [fitRouteBounds])

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  )

  if (!hasApiKey) {
    return (
      <div className="google-map-shell google-map-shell--error">
        <div className="google-map-shell__state">{uiText.errors.mapApiKeyMissing}</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="google-map-shell google-map-shell--error">
        <div className="google-map-shell__state">{uiText.errors.mapFailedToLoad}</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="google-map-shell google-map-shell--loading">
        <div className="google-map-shell__state">{uiText.errors.loadingMap}</div>
      </div>
    )
  }

  return (
    <div className="google-map-shell">
      <GoogleMap
        mapContainerClassName="google-map-canvas"
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={10}
        onLoad={setMap}
        options={{
          clickableIcons: false,
          disableDefaultUI: true,
          fullscreenControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
        }}
        onClick={() => setSelectedMarkerId(null)}
      >
        {canRenderRouteLine && directions ? (
          <DirectionsRenderer
            onLoad={handleDirectionsRendererLoad}
            options={{
              directions,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: MAP_PIN_COLORS.upcoming,
                strokeOpacity: 0.92,
                strokeWeight: 6,
              },
            }}
          />
        ) : null}

        {userLocation ? (
          <MarkerF
            position={userLocation}
            title={uiText.routes.currentLocation}
            zIndex={1000}
            icon={createMapPinIcon(MAP_PIN_COLORS.userLocation, 1.05)}
          />
        ) : null}

        {markers.map((marker) => {
          const appearance = resolveMapPinAppearance(marker, {
            activeRouteStopId,
            invalidStopIds,
            stateLabels: PIN_STATE_LABELS,
          })

          return (
            <MarkerF
              key={marker.id}
              position={marker.position}
              title={appearance.hoverTitle}
              zIndex={appearance.zIndex}
              icon={createMapPinIcon(appearance.fill, appearance.scale, appearance.isActive)}
              label={
                appearance.label
                  ? {
                      text: appearance.label,
                      color: '#081120',
                      fontWeight: '700',
                      fontSize: appearance.routeState === 'food' ? '11px' : '12px',
                    }
                  : undefined
              }
              onClick={() => setSelectedMarkerId(marker.id)}
            />
          )
        })}

        {selectedMarker ? (
          <InfoWindowF
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarkerId(null)}
          >
            <article className="map-info-window">
              <div className="map-info-window__eyebrow">
                {selectedMarker.categories.includes('route')
                  ? uiText.routes.routeStopInfo(selectedMarker.routeOrder)
                  : selectedMarker.categories.includes('saved')
                    ? uiText.followUps.savedStatus
                    : uiText.search.card.searchResult}
              </div>
              <h3>{selectedMarker.businessName}</h3>
              <p>{selectedMarker.address}</p>

              <div className="map-info-window__meta">
                <span className="meta-pill">{formatRating(selectedMarker.rating)}</span>
                <span className="meta-pill">{selectedMarker.phone}</span>
              </div>

              {normalizeWebsite(selectedMarker.website) ? (
                <a
                  className="map-link"
                  href={normalizeWebsite(selectedMarker.website)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedMarker.website}
                </a>
              ) : (
                <p className="map-link map-link--muted">{uiText.errors.websiteUnavailable}</p>
              )}

              <div className="map-info-window__actions">
                <button
                  type="button"
                  className={`button ${selectedMarker.isSaved ? 'button--secondary' : ''}`}
                  onClick={() => onToggleSaved(selectedMarker.id)}
                >
                  {selectedMarker.isSaved ? uiText.search.card.removeSaved : uiText.search.card.save}
                </button>
                <button
                  type="button"
                  className={`button ${selectedMarker.isInRoute ? 'button--secondary' : ''}`}
                  onClick={() => onToggleRoute(selectedMarker.id)}
                >
                  {selectedMarker.isInRoute ? uiText.search.card.removeRoute : uiText.search.card.addToRoute}
                </button>
              </div>
            </article>
          </InfoWindowF>
        ) : null}
      </GoogleMap>

      {showLegend ? <RouteMapLegend showInvalid={showInvalidLegend} /> : null}
    </div>
  )
}

export default RepRouteMap
