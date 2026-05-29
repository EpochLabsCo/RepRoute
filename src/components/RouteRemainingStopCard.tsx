import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RouteNavigationLegSummary } from './RouteNavigationView'
import PickUpFoodButton from './PickUpFoodButton'
import RouteReorderHandle from './RouteReorderHandle'
import { uiText } from '../constants/uiText'

type RouteRemainingStopCardProps = {
  id: string
  stopNumber: number
  businessName: string
  leg: RouteNavigationLegSummary | null
  completed: boolean
  isFoodStop: boolean
  onPickUpFood: () => void
}

export default function RouteRemainingStopCard({
  id,
  stopNumber,
  businessName,
  leg,
  completed,
  isFoodStop,
  onPickUpFood,
}: RouteRemainingStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const distance = leg?.distanceText?.trim() || null
  const eta = leg?.durationText?.trim() || null
  const metrics = [distance, eta].filter(Boolean).join(' · ')

  return (
    <article
      ref={setNodeRef}
      className={`route-remaining-stop ${completed ? 'route-remaining-stop--completed' : ''} ${
        isFoodStop ? 'route-remaining-stop--food' : ''
      } ${isDragging ? 'route-remaining-stop--dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="route-remaining-stop__main">
        <span className="route-stop-badge" aria-label={uiText.routes.stopLabel(stopNumber - 1)}>
          {stopNumber}
        </span>
        <div className="route-remaining-stop__copy">
          <strong>{businessName}</strong>
          {isFoodStop ? (
            <span className="route-remaining-stop__food-label">{uiText.foodNearby.foodStopLabel}</span>
          ) : null}
          {metrics ? <span className="route-remaining-stop__metrics">{metrics}</span> : null}
        </div>
        <RouteReorderHandle dragAttributes={attributes} dragListeners={listeners} />
      </div>
      <PickUpFoodButton onClick={onPickUpFood} wide />
    </article>
  )
}
