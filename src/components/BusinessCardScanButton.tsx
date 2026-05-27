import { useId, useRef, type ChangeEvent } from 'react'
import { CreditCard } from 'lucide-react'
import { uiText } from '../constants/uiText'

type BusinessCardScanButtonProps = {
  onFileSelected: (file: File) => void
  label?: string
  className?: string
}

function BusinessCardScanButton({
  onFileSelected,
  label = uiText.routes.businessCard.scanCard,
  className = 'route-action-button',
}: BusinessCardScanButtonProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    onFileSelected(file)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        id={inputId}
        className="business-card-section__file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />
      <button type="button" className={className} onClick={openFilePicker}>
        <CreditCard size={16} />
        {label}
      </button>
    </>
  )
}

export default BusinessCardScanButton
