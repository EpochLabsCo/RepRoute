import { useId, useRef, useState, type ChangeEvent } from 'react'
import { CreditCard, Eye, Trash2, Upload } from 'lucide-react'
import { uiText } from '../constants/uiText'

type BusinessCardContactFields = {
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string
}

type BusinessCardSectionProps = {
  prospectId: string
  previewUrl: string | null
  contact: BusinessCardContactFields
  onCapture: (file: File) => void
  onRemoveCard: () => void
  onUpdateContact: (fields: Partial<BusinessCardContactFields>) => void
}

function BusinessCardSection({
  prospectId,
  previewUrl,
  contact,
  onCapture,
  onRemoveCard,
  onUpdateContact,
}: BusinessCardSectionProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const hasCard = Boolean(previewUrl)

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    onCapture(file)
  }

  return (
    <section className="business-card-section" aria-labelledby={`${inputId}-heading`}>
      <div className="business-card-section__heading">
        <h4 id={`${inputId}-heading`}>{uiText.routes.businessCard.heading}</h4>
        <p className="section-copy">{uiText.routes.businessCard.description}</p>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        className="business-card-section__file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />

      {hasCard && previewUrl ? (
        <div className="business-card-section__preview">
          <img src={previewUrl} alt={uiText.routes.businessCard.previewAlt(prospectId)} />
        </div>
      ) : null}

      <div className="business-card-section__actions">
        <button type="button" className="route-action-button" onClick={openFilePicker}>
          <CreditCard size={16} />
          {hasCard ? uiText.routes.businessCard.replaceCard : uiText.routes.businessCard.scanCard}
        </button>
        {hasCard ? (
          <>
            <button type="button" className="route-action-button" onClick={() => setViewerOpen(true)}>
              <Eye size={16} />
              {uiText.routes.businessCard.viewCard}
            </button>
            <button type="button" className="route-action-button button--danger-outline" onClick={onRemoveCard}>
              <Trash2 size={16} />
              {uiText.routes.businessCard.removeCard}
            </button>
          </>
        ) : (
          <button type="button" className="route-action-button" onClick={openFilePicker}>
            <Upload size={16} />
            {uiText.routes.businessCard.uploadFallback}
          </button>
        )}
      </div>

      <div className="business-card-section__fields">
        <div className="field-group">
          <span className="field-label">{uiText.routes.currentStop.contactFields.contactName}</span>
          <input
            className="text-input"
            type="text"
            value={contact.contactName}
            onChange={(event) => onUpdateContact({ contactName: event.target.value })}
          />
        </div>
        <div className="field-group">
          <span className="field-label">{uiText.routes.currentStop.contactFields.contactTitle}</span>
          <input
            className="text-input"
            type="text"
            value={contact.contactTitle}
            onChange={(event) => onUpdateContact({ contactTitle: event.target.value })}
          />
        </div>
        <div className="field-group">
          <span className="field-label">{uiText.routes.currentStop.contactFields.phone}</span>
          <input
            className="text-input"
            type="tel"
            value={contact.contactPhone}
            onChange={(event) => onUpdateContact({ contactPhone: event.target.value })}
          />
        </div>
        <div className="field-group">
          <span className="field-label">{uiText.routes.currentStop.contactFields.email}</span>
          <input
            className="text-input"
            type="email"
            value={contact.contactEmail}
            onChange={(event) => onUpdateContact({ contactEmail: event.target.value })}
          />
        </div>
      </div>

      <button type="button" className="button button--ghost business-card-section__extract" disabled>
        {uiText.routes.businessCard.extractContactInfo}
      </button>

      {viewerOpen && previewUrl ? (
        <div className="business-card-viewer" role="dialog" aria-modal="true" aria-label={uiText.routes.businessCard.viewCard}>
          <button
            type="button"
            className="business-card-viewer__backdrop"
            aria-label={uiText.routes.businessCard.closeViewer}
            onClick={() => setViewerOpen(false)}
          />
          <div className="business-card-viewer__panel">
            <img src={previewUrl} alt={uiText.routes.businessCard.previewAlt(prospectId)} />
            <button type="button" className="button button--wide" onClick={() => setViewerOpen(false)}>
              {uiText.routes.businessCard.closeViewer}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default BusinessCardSection
