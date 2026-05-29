import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { ArrowUpDown } from 'lucide-react'
import { uiText } from '../constants/uiText'

type RouteReorderHandleProps = {
  dragAttributes: DraggableAttributes
  dragListeners: DraggableSyntheticListeners
}

export default function RouteReorderHandle({ dragAttributes, dragListeners }: RouteReorderHandleProps) {
  return (
    <button
      type="button"
      className="route-reorder-handle"
      aria-label={uiText.routes.reorder.stopAria}
      title={uiText.routes.reorder.dragHint}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      {...dragAttributes}
      {...dragListeners}
    >
      <span className="route-reorder-handle__icon" aria-hidden="true">
        <ArrowUpDown size={20} strokeWidth={2.25} />
      </span>
      <span className="route-reorder-handle__label">{uiText.routes.reorder.handleLabel}</span>
    </button>
  )
}
