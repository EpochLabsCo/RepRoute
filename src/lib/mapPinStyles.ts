export const MAP_PIN_COLORS = {
  upcoming: '#4a7bff',
  current: '#31c4be',
  completed: '#8d99ae',
  food: '#3ecf8e',
  invalid: '#ff6b6b',
  search: '#5ca8ff',
  saved: '#f7b955',
  userLocation: '#44d1c8',
} as const

export type MapPinRouteState = 'upcoming' | 'current' | 'completed' | 'food' | 'invalid'

export type MapPinAppearance = {
  fill: string
  scale: number
  zIndex: number
  label?: string
  routeState: MapPinRouteState | 'search' | 'saved' | 'user'
  legendKey?: keyof typeof MAP_PIN_COLORS
  isActive: boolean
  hoverTitle: string
}

type MarkerLike = {
  id: string
  businessName: string
  categories: string[]
  routeOrder?: number
  routeCompleted?: boolean
  isFoodStop?: boolean
}

export function createMapPinIcon(fill: string, scale = 1, active = false) {
  const width = Math.round(36 * scale)
  const height = Math.round(48 * scale)
  const pulseRing = active
    ? `
      <circle cx="18" cy="17" r="13" fill="${MAP_PIN_COLORS.current}" fill-opacity="0.22">
        <animate attributeName="r" values="11;15;11" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.32;0.12;0.32" dur="2.2s" repeatCount="indefinite" />
      </circle>
    `
    : ''
  const stroke = active ? '#5ef5ed' : '#081120'
  const strokeWidth = active ? 3 : 2.5

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 48" fill="none">
      ${pulseRing}
      <path
        d="M18 2C9.163 2 2 9.163 2 18c0 11.708 14.017 26.211 15.496 27.712a.72.72 0 0 0 1.008 0C19.983 44.211 34 29.708 34 18 34 9.163 26.837 2 18 2Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
      />
      <circle cx="18" cy="18" r="6.5" fill="white" fill-opacity="0.92" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function resolveMapPinAppearance(
  marker: MarkerLike,
  options: {
    activeRouteStopId?: string | null
    invalidStopIds?: Set<string>
    stateLabels: Record<MapPinRouteState | 'search' | 'saved', string>
  },
): MapPinAppearance {
  const { activeRouteStopId = null, invalidStopIds, stateLabels } = options
  const isOnRoute = marker.categories.includes('route')
  const isFood = Boolean(marker.isFoodStop) || marker.categories.includes('food')
  const routeOrderLabel = marker.routeOrder ? String(marker.routeOrder) : undefined

  if (invalidStopIds?.has(marker.id)) {
    return {
      fill: MAP_PIN_COLORS.invalid,
      scale: 1,
      zIndex: 850,
      label: '!',
      routeState: 'invalid',
      legendKey: 'invalid',
      isActive: false,
      hoverTitle: `${marker.businessName} (${stateLabels.invalid})`,
    }
  }

  if (isOnRoute) {
    const isActive = activeRouteStopId === marker.id
    if (isActive) {
      const stopPrefix = routeOrderLabel ? `Stop ${routeOrderLabel}: ` : ''
      return {
        fill: MAP_PIN_COLORS.current,
        scale: 1.18,
        zIndex: 920,
        label: routeOrderLabel,
        routeState: 'current',
        legendKey: 'current',
        isActive: true,
        hoverTitle: `${stopPrefix}${marker.businessName} (${stateLabels.current})`,
      }
    }

    if (marker.routeCompleted) {
      const stopPrefix = routeOrderLabel ? `Stop ${routeOrderLabel}: ` : ''
      return {
        fill: MAP_PIN_COLORS.completed,
        scale: 0.94,
        zIndex: 120,
        label: routeOrderLabel,
        routeState: 'completed',
        legendKey: 'completed',
        isActive: false,
        hoverTitle: `${stopPrefix}${marker.businessName} (${stateLabels.completed})`,
      }
    }

    if (isFood) {
      return {
        fill: MAP_PIN_COLORS.food,
        scale: 1,
        zIndex: 520,
        label: 'F',
        routeState: 'food',
        legendKey: 'food',
        isActive: false,
        hoverTitle: `${marker.businessName} (${stateLabels.food})`,
      }
    }

    const stopPrefix = routeOrderLabel ? `Stop ${routeOrderLabel}: ` : ''
    return {
      fill: MAP_PIN_COLORS.upcoming,
      scale: 1,
      zIndex: 500,
      label: routeOrderLabel,
      routeState: 'upcoming',
      legendKey: 'upcoming',
      isActive: false,
      hoverTitle: `${stopPrefix}${marker.businessName} (${stateLabels.upcoming})`,
    }
  }

  if (marker.categories.includes('saved')) {
    return {
      fill: MAP_PIN_COLORS.saved,
      scale: 1,
      zIndex: 400,
      label: 'S',
      routeState: 'saved',
      legendKey: 'saved',
      isActive: false,
      hoverTitle: `${marker.businessName} (${stateLabels.saved})`,
    }
  }

  return {
    fill: MAP_PIN_COLORS.search,
    scale: 1,
    zIndex: 380,
    routeState: 'search',
    legendKey: 'search',
    isActive: false,
    hoverTitle: `${marker.businessName} (${stateLabels.search})`,
  }
}

export function resolveNavigationStopAppearance(
  stop: {
    id: string
    businessName: string
    routeOrder: number
    isActive: boolean
    isCompleted: boolean
    isFoodStop?: boolean
  },
  stateLabels: Record<MapPinRouteState, string>,
): MapPinAppearance {
  if (stop.isActive) {
    return {
      fill: MAP_PIN_COLORS.current,
      scale: 1.18,
      zIndex: 920,
      label: String(stop.routeOrder),
      routeState: 'current',
      legendKey: 'current',
      isActive: true,
      hoverTitle: `Stop ${stop.routeOrder}: ${stop.businessName} (${stateLabels.current})`,
    }
  }

  if (stop.isCompleted) {
    return {
      fill: MAP_PIN_COLORS.completed,
      scale: 0.94,
      zIndex: 120,
      label: String(stop.routeOrder),
      routeState: 'completed',
      legendKey: 'completed',
      isActive: false,
      hoverTitle: `Stop ${stop.routeOrder}: ${stop.businessName} (${stateLabels.completed})`,
    }
  }

  if (stop.isFoodStop) {
    return {
      fill: MAP_PIN_COLORS.food,
      scale: 1,
      zIndex: 520,
      label: 'F',
      routeState: 'food',
      legendKey: 'food',
      isActive: false,
      hoverTitle: `Stop ${stop.routeOrder}: ${stop.businessName} (${stateLabels.food})`,
    }
  }

  return {
    fill: MAP_PIN_COLORS.upcoming,
    scale: 1,
    zIndex: 500,
    label: String(stop.routeOrder),
    routeState: 'upcoming',
    legendKey: 'upcoming',
    isActive: false,
    hoverTitle: `Stop ${stop.routeOrder}: ${stop.businessName} (${stateLabels.upcoming})`,
  }
}
