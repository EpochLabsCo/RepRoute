import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DirectionsRenderer,
  GoogleMap,
  MarkerF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import RouteMapLegend from './RouteMapLegend'
import { uiText } from '../constants/uiText'
import {
  createMapPinIcon,
  MAP_PIN_COLORS,
  resolveNavigationStopAppearance,
} from '../lib/mapPinStyles'
import { type RouteLineRenderStatus } from './RepRouteMap'

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
  isFoodStop?: boolean
}

const PIN_STATE_LABELS = {
  upcoming: uiText.routes.mapLegend.upcoming,
  current: uiText.routes.mapLegend.current,
  completed: uiText.routes.mapLegend.completed,
  food: uiText.routes.mapLegend.food,
  invalid: uiText.routes.mapLegend.invalid,
} as const

function directionsResponseReady(
  directions: google.maps.DirectionsResult | null,
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

type RepRouteNavigationMapProps = {
  directions: google.maps.DirectionsResult | null
  directionsApiStatus?: string | null
  stops: RouteNavigationStop[]
  userLocation: { lat: number; lng: number } | null
  onRouteLineRenderStatusChange?: (status: RouteLineRenderStatus) => void
}

function RepRouteNavigationMap({
  directions,
  directionsApiStatus = null,
  stops,
  userLocation,
  onRouteLineRenderStatusChange,
}: RepRouteNavigationMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const hasApiKey = apiKey.length > 0

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'reproute-google-map',
    googleMapsApiKey: hasApiKey ? apiKey : 'missing-api-key',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const canRenderRouteLine = Boolean(
    map && isLoaded && directionsResponseReady(directions, directionsApiStatus),
  )

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

        {stops.map((stop) => {
          const appearance = resolveNavigationStopAppearance(stop, PIN_STATE_LABELS)

          return (
            <MarkerF
              key={stop.id}
              position={stop.position}
              title={appearance.hoverTitle}
              zIndex={appearance.zIndex}
              icon={createMapPinIcon(appearance.fill, appearance.scale, appearance.isActive)}
              label={
                appearance.label
                  ? {
                      text: appearance.label,
                      color: '#081120',
                      fontWeight: '700',
                      fontSize: stop.isFoodStop ? '11px' : '12px',
                    }
                  : undefined
              }
            />
          )
        })}
      </GoogleMap>

      <RouteMapLegend />
    </div>
  )
}

export default RepRouteNavigationMap
