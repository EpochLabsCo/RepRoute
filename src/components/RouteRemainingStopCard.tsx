import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight } from 'lucide-react'
import type { RouteNavigationLegSummary } from './RouteNavigationView'
import PickUpFoodPrompt from './PickUpFoodPrompt'
import RouteReorderHandle from './RouteReorderHandle'
import { uiText } from '../constants/uiText'

type RouteRemainingStopCardProps = {
  id: string
  stopNumber: number
  businessName: string
  leg: RouteNavigationLegSummary | null
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
  leg,
  completed,
  isFoodStop,
  isOpen = false,
  onOpenDetails,
  onPickUpFood,
}: RouteRemainingStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const distance = leg?.distanceText?.trim() || null
  const eta = leg?.durationText?.trim() || null
  const metrics = [distance, eta].filter(Boolean).join(' · ')
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
            {metrics ? <span className="route-remaining-stop__metrics">{metrics}</span> : null}
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
