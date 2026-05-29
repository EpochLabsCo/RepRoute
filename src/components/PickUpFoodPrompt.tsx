import { UtensilsCrossed } from 'lucide-react'
import { uiText } from '../constants/uiText'

type PickUpFoodPromptProps = {
  onClick: () => void
  className?: string
}

export default function PickUpFoodPrompt({ onClick, className = '' }: PickUpFoodPromptProps) {
  return (
    <button
      type="button"
      className={`route-food-prompt${className ? ` ${className}` : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <UtensilsCrossed size={12} aria-hidden="true" />
      <span>{uiText.foodNearby.pickUpFoodPrompt}</span>
    </button>
  )
}
