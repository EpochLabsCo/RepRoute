import { MAP_PIN_COLORS } from '../lib/mapPinStyles'
import { uiText } from '../constants/uiText'

type RouteMapLegendProps = {
  showInvalid?: boolean
}

type LegendItem = { color: string; label: string }

export default function RouteMapLegend({ showInvalid = false }: RouteMapLegendProps) {
  const items: LegendItem[] = [
    { color: MAP_PIN_COLORS.upcoming, label: uiText.routes.mapLegend.upcoming },
    { color: MAP_PIN_COLORS.current, label: uiText.routes.mapLegend.current },
    { color: MAP_PIN_COLORS.completed, label: uiText.routes.mapLegend.completed },
    { color: MAP_PIN_COLORS.food, label: uiText.routes.mapLegend.food },
  ]

  if (showInvalid) {
    items.push({ color: MAP_PIN_COLORS.invalid, label: uiText.routes.mapLegend.invalid })
  }

  return (
    <div className="route-map-legend" aria-label={uiText.routes.mapLegend.ariaLabel}>
      {items.map((item) => (
        <span key={item.label} className="route-map-legend__item">
          <span className="route-map-legend__dot" style={{ backgroundColor: item.color }} aria-hidden />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  )
}
