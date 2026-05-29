import { UtensilsCrossed } from 'lucide-react'
import { uiText } from '../constants/uiText'

type PickUpFoodButtonProps = {
  onClick: () => void
  className?: string
  wide?: boolean
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
      <UtensilsCrossed size={16} />
      {uiText.foodNearby.pickUpFood}
    </button>
  )
}
