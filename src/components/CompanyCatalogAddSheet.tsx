import { useState } from 'react'
import { X } from 'lucide-react'
import { uiText } from '../constants/uiText'

export type CatalogAddCompanyInput = {
  businessName: string
  address: string
  phone: string
  website: string
  category: string
  priority: 'Hot' | 'Warm' | 'Cold'
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string
  notes: string
}

type CompanyCatalogAddSheetProps = {
  onClose: () => void
  onSave: (input: CatalogAddCompanyInput) => void
}

const PRIORITY_OPTIONS = ['Hot', 'Warm', 'Cold'] as const

export default function CompanyCatalogAddSheet({ onClose, onSave }: CompanyCatalogAddSheetProps) {
  const [businessName, setBusinessName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm')
  const [contactName, setContactName] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit() {
    onSave({
      businessName,
      address,
      phone,
      website,
      category,
      priority,
      contactName,
      contactTitle,
      contactPhone,
      contactEmail,
      notes,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet company-catalog-add"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-catalog-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <header className="company-catalog-add__header">
          <div>
            <div className="eyebrow eyebrow--tight">{uiText.companyCatalog.addSheet.eyebrow}</div>
            <h2 id="company-catalog-add-title">{uiText.companyCatalog.addSheet.heading}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={uiText.companyCatalog.addSheet.cancel}>
            <X size={18} />
          </button>
        </header>

        <div className="company-catalog-add__body">
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.businessName}</span>
            <input
              className="text-input"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              autoFocus
            />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.address}</span>
            <input className="text-input" value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.phone}</span>
            <input className="text-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.website}</span>
            <input className="text-input" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.industry}</span>
            <input className="text-input" value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.priority}</span>
            <select
              className="text-input filter-select"
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'Hot' | 'Warm' | 'Cold')}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.contactName}</span>
            <input className="text-input" value={contactName} onChange={(event) => setContactName(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.contactTitle}</span>
            <input className="text-input" value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.contactPhone}</span>
            <input className="text-input" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.contactEmail}</span>
            <input className="text-input" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">{uiText.companyCatalog.fields.notes}</span>
            <textarea
              className="text-input text-input--textarea"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={uiText.companyCatalog.fields.notesPlaceholder}
            />
          </label>
        </div>

        <div className="modal-sheet__actions">
          <button type="button" className="button button--wide" onClick={handleSubmit}>
            {uiText.companyCatalog.addSheet.save}
          </button>
          <button type="button" className="button button--ghost button--wide" onClick={onClose}>
            {uiText.companyCatalog.addSheet.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
