import PickUpFoodPrompt from './PickUpFoodPrompt'
import RouteStopDistanceMetrics from './RouteStopDistanceMetrics'
import type { RouteStopEtaDisplay } from '../lib/routeStopEtas'
import type { RouteStopDistanceDisplay } from '../lib/routeStopDistanceDisplay'
import { uiText } from '../constants/uiText'

type RouteFocusCardProps = {
  stopNumber: number
  businessName: string
  address: string
  distanceDisplay?: RouteStopDistanceDisplay | null
  gpsProximityText?: string | null
  schedule?: RouteStopEtaDisplay | null
  variant?: 'current' | 'next' | 'active'
  statusNote?: string | null
  isFoodStop?: boolean
  onPickUpFood?: () => void
}

export default function RouteFocusCard({
  stopNumber,
  businessName,
  address,
  distanceDisplay,
  gpsProximityText,
  schedule,
  variant = 'current',
  statusNote,
  isFoodStop = false,
  onPickUpFood,
}: RouteFocusCardProps) {
  return (
    <div
      className={`route-focus-card route-focus-card--${variant}${
        isFoodStop ? ' route-focus-card--food' : ''
      }`}
    >
      <div className="route-focus-card__row">
        <span className="route-stop-badge" aria-label={`Stop ${stopNumber}`}>
          {stopNumber}
        </span>
      </div>
      <h3 className="route-focus-card__name">{businessName}</h3>
      {onPickUpFood ? <PickUpFoodPrompt onClick={onPickUpFood} /> : null}
      <p className="route-focus-card__address">{address}</p>
      <RouteStopDistanceMetrics
        distanceDisplay={distanceDisplay}
        gpsProximityText={gpsProximityText}
        schedule={schedule}
      />
      {isFoodStop ? <p className="route-focus-card__food-badge">{uiText.foodNearby.foodStopLabel}</p> : null}
      {statusNote ? <p className="route-focus-card__status">{statusNote}</p> : null}
    </div>
  )
}
