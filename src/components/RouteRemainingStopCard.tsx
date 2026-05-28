import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RouteNavigationLegSummary } from './RouteNavigationView'
import RouteReorderHandle from './RouteReorderHandle'
import { uiText } from '../constants/uiText'

type RouteRemainingStopCardProps = {
  id: string
  stopNumber: number
  businessName: string
  leg: RouteNavigationLegSummary | null
  completed: boolean
}

export default function RouteRemainingStopCard({
  id,
  stopNumber,
  businessName,
  leg,
  completed,
}: RouteRemainingStopCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const distance = leg?.distanceText?.trim() || null
  const eta = leg?.durationText?.trim() || null
  const metrics = [distance, eta].filter(Boolean).join(' · ')

  return (
    <article
      ref={setNodeRef}
      className={`route-remaining-stop ${completed ? 'route-remaining-stop--completed' : ''} ${
        isDragging ? 'route-remaining-stop--dragging' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <span className="route-stop-badge" aria-label={uiText.routes.stopLabel(stopNumber - 1)}>
        {stopNumber}
      </span>
      <div className="route-remaining-stop__copy">
        <strong>{businessName}</strong>
        {metrics ? <span className="route-remaining-stop__metrics">{metrics}</span> : null}
      </div>
      <RouteReorderHandle dragAttributes={attributes} dragListeners={listeners} />
    </article>
  )
}
