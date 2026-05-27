import { uiText } from '../constants/uiText'

export type BusinessCardContactValues = {
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string
}

type BusinessCardContactFieldsProps = {
  contact: BusinessCardContactValues
  onUpdateContact: (fields: Partial<BusinessCardContactValues>) => void
}

function BusinessCardContactFields({ contact, onUpdateContact }: BusinessCardContactFieldsProps) {
  return (
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
  )
}

export default BusinessCardContactFields
