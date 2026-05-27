import { uiText } from '../constants/uiText'
import BusinessCardContactFields, { type BusinessCardContactValues } from './BusinessCardContactFields'
import BusinessCardPreviewStrip from './BusinessCardPreviewStrip'
import BusinessCardScanButton from './BusinessCardScanButton'

type BusinessCardSectionProps = {
  prospectId: string
  previewUrl: string | null
  contact: BusinessCardContactValues
  onCapture: (file: File) => void
  onRemoveCard: () => void
  onUpdateContact: (fields: Partial<BusinessCardContactValues>) => void
  showScanButton?: boolean
  showContactFields?: boolean
}

function BusinessCardSection({
  prospectId,
  previewUrl,
  contact,
  onCapture,
  onRemoveCard,
  onUpdateContact,
  showScanButton = true,
  showContactFields = true,
}: BusinessCardSectionProps) {
  return (
    <section className="business-card-section">
      {showScanButton ? (
        <div className="business-card-section__toolbar">
          <BusinessCardScanButton onFileSelected={onCapture} />
        </div>
      ) : null}

      <BusinessCardPreviewStrip
        prospectId={prospectId}
        previewUrl={previewUrl}
        onCapture={onCapture}
        onRemoveCard={onRemoveCard}
      />

      {showContactFields ? (
        <>
          <div className="business-card-section__heading">
            <h4>{uiText.routes.businessCard.heading}</h4>
            <p className="section-copy">{uiText.routes.businessCard.description}</p>
          </div>
          <BusinessCardContactFields contact={contact} onUpdateContact={onUpdateContact} />
          <button type="button" className="button button--ghost business-card-section__extract" disabled>
            {uiText.routes.businessCard.extractContactInfo}
          </button>
        </>
      ) : null}
    </section>
  )
}

export default BusinessCardSection
