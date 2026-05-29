import { UtensilsCrossed } from 'lucide-react'
import { uiText } from '../constants/uiText'

type PickUpFoodButtonProps = {
  onClick: () => void
  className?: string
  wide?: boolean
}

function PickUpFoodLabel() {
  const label = uiText.foodNearby.pickUpFood
  const questionMark = label.endsWith('?') ? '?' : ''
  const text = questionMark ? label.slice(0, -1) : label

  return (
    <span className="route-pick-up-food-btn__label">
      {text}
      {questionMark ? <span className="route-pick-up-food-btn__question">{questionMark}</span> : null}
    </span>
  )
}

export default function PickUpFoodButton({
  onClick,
  className = 'button button--ghost route-pick-up-food-btn',
  wide = false,
}: PickUpFoodButtonProps) {
  return (
    <button
      type="button"
      className={`${className}${wide ? ' button--wide' : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <UtensilsCrossed size={15} aria-hidden="true" />
      <PickUpFoodLabel />
    </button>
  )
}
