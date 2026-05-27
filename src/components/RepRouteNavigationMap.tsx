import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DirectionsRenderer,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import { uiText } from '../constants/uiText'

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 }
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places']
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

export type RouteNavigationStop = {
  id: string
  businessName: string
  position: { lat: number; lng: number }
  routeOrder: number
  isActive: boolean
  isCompleted: boolean
}

type RepRouteNavigationMapProps = {
  directions: google.maps.DirectionsResult | null
  stops: RouteNavigationStop[]
  userLocation: { lat: number; lng: number } | null
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

function RepRouteNavigationMap({ directions, stops, userLocation }: RepRouteNavigationMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const hasApiKey = apiKey.length > 0

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'reproute-google-map',
    googleMapsApiKey: hasApiKey ? apiKey : 'missing-api-key',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const mapCenter = useMemo(() => {
    if (userLocation) {
      return userLocation
    }

    const activeStop = stops.find((stop) => stop.isActive) ?? stops[0]
    return activeStop?.position ?? AUSTIN_CENTER
  }, [stops, userLocation])

  const fitRouteBounds = useCallback(() => {
    if (!map) {
      return
    }

    const bounds = new google.maps.LatLngBounds()

    if (userLocation) {
      bounds.extend(userLocation)
    }

    for (const stop of stops) {
      bounds.extend(stop.position)
    }

    const route = directions?.routes?.[0]
    if (route?.bounds) {
      bounds.union(route.bounds)
    } else if (route?.legs) {
      for (const leg of route.legs) {
        if (leg.start_location) {
          bounds.extend(leg.start_location)
        }
        if (leg.end_location) {
          bounds.extend(leg.end_location)
        }
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 56, right: 40, bottom: 56, left: 40 })
    }
  }, [directions, map, stops, userLocation])

  useEffect(() => {
    fitRouteBounds()
  }, [fitRouteBounds])

  if (!hasApiKey) {
    return (
      <div className="google-map-shell google-map-shell--error route-nav-map">
        <div className="google-map-shell__state">{uiText.errors.mapApiKeyMissing}</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="google-map-shell google-map-shell--error route-nav-map">
        <div className="google-map-shell__state">{uiText.errors.mapFailedToLoad}</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="google-map-shell google-map-shell--loading route-nav-map">
        <div className="google-map-shell__state">{uiText.errors.loadingMap}</div>
      </div>
    )
  }

  return (
    <div className="google-map-shell route-nav-map">
      <GoogleMap
        mapContainerClassName="google-map-canvas route-nav-map__canvas"
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={mapCenter}
        zoom={12}
        onLoad={setMap}
        options={{
          clickableIcons: false,
          disableDefaultUI: true,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
        }}
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

        {stops.map((stop) => {
          const fill = stop.isCompleted ? '#6b7c93' : stop.isActive ? '#31c4be' : '#4a7bff'
          const scale = stop.isActive ? 1.15 : 1

          return (
            <MarkerF
              key={stop.id}
              position={stop.position}
              title={stop.businessName}
              zIndex={stop.isActive ? 900 : stop.isCompleted ? 100 : 500}
              icon={createMarkerIcon(fill, scale)}
              label={{
                text: String(stop.routeOrder),
                color: '#081120',
                fontWeight: '700',
                fontSize: '12px',
              }}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}

export default RepRouteNavigationMap
