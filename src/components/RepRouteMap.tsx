import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DirectionsRenderer,
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import { uiText } from '../constants/uiText'

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
  categories: RepRouteMapMarkerCategory[]
  routeOrder?: number
}

type RepRouteMapProps = {
  markers: RepRouteMapMarker[]
  directions?: google.maps.DirectionsResult | null
  userLocation?: { lat: number; lng: number } | null
  activeRouteStopId?: string | null
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
}

function getPrimaryMarkerCategory(marker: RepRouteMapMarker) {
  if (marker.categories.includes('route')) {
    return 'route'
  }

  if (marker.categories.includes('food')) {
    return 'food'
  }

  if (marker.categories.includes('saved')) {
    return 'saved'
  }

  return 'search'
}

function createMarkerIcon(fill: string, scale = 1) {
  const width = Math.round(36 * scale)
  const height = Math.round(48 * scale)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 48" fill="none">
      <path
        d="M18 2C9.163 2 2 9.163 2 18c0 11.708 14.017 26.211 15.496 27.712a.72.72 0 0 0 1.008 0C19.983 44.211 34 29.708 34 18 34 9.163 26.837 2 18 2Z"
        fill="${fill}"
        stroke="#081120"
        stroke-width="2.5"
      />
      <circle cx="18" cy="18" r="6.5" fill="white" fill-opacity="0.9" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

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

function RepRouteMap({
  markers,
  directions = null,
  userLocation: userLocationProp = null,
  activeRouteStopId = null,
  onToggleSaved,
  onToggleRoute,
}: RepRouteMapProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [center, setCenter] = useState(AUSTIN_CENTER)
  const [internalUserLocation, setInternalUserLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const userLocation = userLocationProp ?? internalUserLocation

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const hasApiKey = apiKey.length > 0

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'reproute-google-map',
    googleMapsApiKey: hasApiKey ? apiKey : 'missing-api-key',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

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
        {directions ? (
          <DirectionsRenderer
            options={{
              directions,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: '#4a7bff',
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
            icon={createMarkerIcon('#44d1c8', 1.05)}
          />
        ) : null}

        {markers.map((marker) => {
          const primaryCategory = getPrimaryMarkerCategory(marker)
          const isActiveRouteStop = activeRouteStopId === marker.id && marker.categories.includes('route')
          const fill = isActiveRouteStop
            ? '#31c4be'
            : primaryCategory === 'route'
              ? '#4a7bff'
              : primaryCategory === 'food'
                ? '#c77dff'
                : primaryCategory === 'saved'
                  ? '#f7b955'
                  : '#44d1c8'
          const scale = isActiveRouteStop ? 1.12 : 1
          const label =
            primaryCategory === 'route'
              ? `${marker.routeOrder ?? ''}`
              : primaryCategory === 'food'
                ? 'F'
                : primaryCategory === 'saved'
                  ? 'S'
                  : undefined

          return (
            <MarkerF
              key={marker.id}
              position={marker.position}
              title={marker.businessName}
              zIndex={isActiveRouteStop ? 900 : primaryCategory === 'route' ? 500 : 400}
              icon={createMarkerIcon(fill, scale)}
              label={label}
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
    </div>
  )
}

export default RepRouteMap
