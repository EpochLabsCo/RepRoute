import { useEffect, useMemo, useState } from 'react'
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 }
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places']
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

export type RepRouteMapMarkerCategory = 'search' | 'saved' | 'route'

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
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
}

function getPrimaryMarkerCategory(marker: RepRouteMapMarker) {
  if (marker.categories.includes('route')) {
    return 'route'
  }

  if (marker.categories.includes('saved')) {
    return 'saved'
  }

  return 'search'
}

function createMarkerIcon(fill: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" fill="none">
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
    return 'No rating yet'
  }

  return `${rating.toFixed(1)} stars`
}

function normalizeWebsite(website: string) {
  if (!website || website === 'Website unavailable') {
    return ''
  }

  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`
}

function RepRouteMap({ markers, onToggleSaved, onToggleRoute }: RepRouteMapProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)
  const [center, setCenter] = useState(AUSTIN_CENTER)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const hasApiKey = apiKey.length > 0

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'reproute-google-map',
    googleMapsApiKey: hasApiKey ? apiKey : 'missing-api-key',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  useEffect(() => {
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
        setUserLocation(nextCenter)
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
  }, [])

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  )

  if (!hasApiKey) {
    return (
      <div className="google-map-shell google-map-shell--error">
        <div className="google-map-shell__state">Google Maps API key missing</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="google-map-shell google-map-shell--error">
        <div className="google-map-shell__state">Map failed to load</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="google-map-shell google-map-shell--loading">
        <div className="google-map-shell__state">Loading map...</div>
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
        {userLocation ? (
          <MarkerF
            position={userLocation}
            title="Your current location"
            icon={createMarkerIcon('#4a7bff')}
          />
        ) : null}

        {markers.map((marker) => {
          const primaryCategory = getPrimaryMarkerCategory(marker)
          const fill =
            primaryCategory === 'route'
              ? '#4a7bff'
              : primaryCategory === 'saved'
                ? '#f7b955'
                : '#44d1c8'
          const label =
            primaryCategory === 'route'
              ? `${marker.routeOrder ?? ''}`
              : primaryCategory === 'saved'
                ? 'S'
                : undefined

          return (
            <MarkerF
              key={marker.id}
              position={marker.position}
              title={marker.businessName}
              icon={createMarkerIcon(fill)}
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
                  ? `Route stop ${selectedMarker.routeOrder ?? ''}`
                  : selectedMarker.categories.includes('saved')
                    ? 'Saved prospect'
                    : 'Search result'}
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
                <p className="map-link map-link--muted">Website unavailable</p>
              )}

              <div className="map-info-window__actions">
                <button
                  type="button"
                  className={`button ${selectedMarker.isSaved ? 'button--secondary' : ''}`}
                  onClick={() => onToggleSaved(selectedMarker.id)}
                >
                  {selectedMarker.isSaved ? 'Remove Saved' : 'Save Prospect'}
                </button>
                <button
                  type="button"
                  className={`button ${selectedMarker.isInRoute ? 'button--secondary' : ''}`}
                  onClick={() => onToggleRoute(selectedMarker.id)}
                >
                  {selectedMarker.isInRoute ? 'Remove Route' : 'Add to Route'}
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
