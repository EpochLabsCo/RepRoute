import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight } from 'lucide-react'
import type { RouteSegmentLeg } from '../lib/routeDistanceMetrics'
import type { RouteStopEtaDisplay } from '../lib/routeStopEtas'
import PickUpFoodPrompt from './PickUpFoodPrompt'
import RouteReorderHandle from './RouteReorderHandle'
import RouteStopDistanceMetrics from './RouteStopDistanceMetrics'
import { uiText } from '../constants/uiText'

type RouteRemainingStopCardProps = {
  id: string
  stopNumber: number
  businessName: string
  segmentLeg: RouteSegmentLeg | null
  schedule?: RouteStopEtaDisplay | null
  completed: boolean
  isFoodStop: boolean
  isOpen?: boolean
  onOpenDetails: () => void
  onPickUpFood: () => void
}

export default function RouteRemainingStopCard({
  id,
  stopNumber,
  businessName,
  segmentLeg,
  schedule,
  completed,
  isFoodStop,
  isOpen = false,
  onOpenDetails,
  onPickUpFood,
}: RouteRemainingStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const showFoodPrompt = !completed && !isFoodStop

  return (
    <article
      ref={setNodeRef}
      className={`route-remaining-stop ${completed ? 'route-remaining-stop--completed' : ''} ${
        isFoodStop ? 'route-remaining-stop--food' : ''
      } ${isDragging ? 'route-remaining-stop--dragging' : ''} ${
        isOpen ? 'route-remaining-stop--open' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="route-remaining-stop__main">
        <button
          type="button"
          className="route-remaining-stop__open"
          aria-expanded={isOpen}
          onClick={onOpenDetails}
        >
          <span className="route-stop-badge" aria-label={uiText.routes.stopLabel(stopNumber - 1)}>
            {stopNumber}
          </span>
          <div className="route-remaining-stop__copy">
            <strong>{businessName}</strong>
            {showFoodPrompt ? <PickUpFoodPrompt onClick={onPickUpFood} /> : null}
            {isFoodStop ? (
              <span className="route-remaining-stop__food-label">{uiText.foodNearby.foodStopLabel}</span>
            ) : null}
            <RouteStopDistanceMetrics segmentLeg={segmentLeg} schedule={schedule} compact />
            <span className="route-remaining-stop__hint">{uiText.routes.remainingStop.tapForDetails}</span>
          </div>
          <ChevronRight
            size={18}
            className={`route-remaining-stop__chevron ${isOpen ? 'route-remaining-stop__chevron--open' : ''}`}
            aria-hidden
          />
        </button>
        <RouteReorderHandle dragAttributes={attributes} dragListeners={listeners} />
      </div>
    </article>
  )
}
