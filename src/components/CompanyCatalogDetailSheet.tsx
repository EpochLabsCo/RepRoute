import { useState } from 'react'
import {
  Bookmark,
  CalendarClock,
  Download,
  ExternalLink,
  Plus,
  Route,
  Trash2,
  X,
} from 'lucide-react'
import BusinessCardPreviewStrip from './BusinessCardPreviewStrip'
import BusinessCardScanButton from './BusinessCardScanButton'
import type { CatalogCompany, CompanyContact } from '../lib/companyCatalog'
import { createContactId } from '../lib/companyCatalog'
import { uiText } from '../constants/uiText'

type CompanyCatalogDetailSheetProps = {
  company: CatalogCompany
  cardPreviewUrl: string | null
  onClose: () => void
  onSaveCompany: (fields: {
    businessName: string
    address: string
    phone: string
    website: string
    category: string
    priority: 'Hot' | 'Warm' | 'Cold'
    notes: string
  }) => void
  onSaveContacts: (contacts: CompanyContact[]) => void
  onToggleRoute: () => void
  onToggleSaved: () => void
  onSetFollowUp: () => void
  onExportCrm: () => void
  onScanBusinessCard: (file: File) => void
  onRemoveBusinessCard: () => void
  onNavigate: () => void
}

const PRIORITY_OPTIONS = ['Hot', 'Warm', 'Cold'] as const

export default function CompanyCatalogDetailSheet({
  company,
  cardPreviewUrl,
  onClose,
  onSaveCompany,
  onSaveContacts,
  onToggleRoute,
  onToggleSaved,
  onSetFollowUp,
  onExportCrm,
  onScanBusinessCard,
  onRemoveBusinessCard,
  onNavigate,
}: CompanyCatalogDetailSheetProps) {
  const [businessName, setBusinessName] = useState(company.businessName)
  const [address, setAddress] = useState(company.address)
  const [phone, setPhone] = useState(company.phone)
  const [website, setWebsite] = useState(company.website)
  const [category, setCategory] = useState(company.category)
  const [priority, setPriority] = useState<'Hot' | 'Warm' | 'Cold'>(
    company.priority === 'Hot' || company.priority === 'Warm' || company.priority === 'Cold'
      ? company.priority
      : 'Warm',
  )
  const [notes, setNotes] = useState(company.notes)
  const [contacts, setContacts] = useState<CompanyContact[]>(company.contacts)

  function handleSave() {
    onSaveCompany({
      businessName,
      address,
      phone,
      website,
      category,
      priority,
      notes,
    })
    onSaveContacts(contacts)
  }

  function updateContact(contactId: string, patch: Partial<CompanyContact>) {
    setContacts((current) =>
      current.map((contact) => (contact.id === contactId ? { ...contact, ...patch } : contact)),
    )
  }

  function addContact() {
    setContacts((current) => [
      ...current,
      {
        id: createContactId(),
        name: '',
        title: '',
        phone: '',
        email: '',
        notes: '',
      },
    ])
  }

  function removeContact(contactId: string) {
    if (contactId === 'primary') {
      return
    }

    setContacts((current) => current.filter((contact) => contact.id !== contactId))
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet company-catalog-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-catalog-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <header className="company-catalog-detail__header">
          <div>
            <div className="eyebrow eyebrow--tight">{uiText.companyCatalog.detailEyebrow}</div>
            <h2 id="company-catalog-detail-title">{company.businessName}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={uiText.companyCatalog.close}>
            <X size={18} />
          </button>
        </header>

        <div className="company-catalog-detail__body">
          <section className="company-catalog-detail__section">
            <h3>{uiText.companyCatalog.sections.company}</h3>
            <label className="field-group">
              <span className="field-label">{uiText.companyCatalog.fields.businessName}</span>
              <input
                className="text-input"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
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
              <span className="field-label">{uiText.companyCatalog.fields.notes}</span>
              <textarea
                className="text-input text-input--textarea"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={uiText.companyCatalog.fields.notesPlaceholder}
              />
            </label>
          </section>

          <section className="company-catalog-detail__section">
            <div className="company-catalog-detail__section-head">
              <h3>{uiText.companyCatalog.sections.contacts}</h3>
              <button type="button" className="text-button" onClick={addContact}>
                <Plus size={14} />
                {uiText.companyCatalog.addContact}
              </button>
            </div>
            {contacts.map((contact) => (
              <div key={contact.id} className="company-catalog-contact">
                <p className="company-catalog-contact__label">
                  {contact.isPrimary
                    ? uiText.companyCatalog.primaryContact
                    : uiText.companyCatalog.additionalContact}
                </p>
                <label className="field-group">
                  <span className="field-label">{uiText.companyCatalog.fields.contactName}</span>
                  <input
                    className="text-input"
                    value={contact.name}
                    onChange={(event) => updateContact(contact.id, { name: event.target.value })}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">{uiText.companyCatalog.fields.contactTitle}</span>
                  <input
                    className="text-input"
                    value={contact.title}
                    onChange={(event) => updateContact(contact.id, { title: event.target.value })}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">{uiText.companyCatalog.fields.contactPhone}</span>
                  <input
                    className="text-input"
                    value={contact.phone}
                    onChange={(event) => updateContact(contact.id, { phone: event.target.value })}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">{uiText.companyCatalog.fields.contactEmail}</span>
                  <input
                    className="text-input"
                    value={contact.email}
                    onChange={(event) => updateContact(contact.id, { email: event.target.value })}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">{uiText.companyCatalog.fields.contactNotes}</span>
                  <textarea
                    className="text-input text-input--textarea"
                    rows={2}
                    value={contact.notes}
                    onChange={(event) => updateContact(contact.id, { notes: event.target.value })}
                  />
                </label>
                {!contact.isPrimary ? (
                  <button
                    type="button"
                    className="text-button company-catalog-contact__remove"
                    onClick={() => removeContact(contact.id)}
                  >
                    <Trash2 size={14} />
                    {uiText.companyCatalog.removeContact}
                  </button>
                ) : null}
              </div>
            ))}
          </section>

          <section className="company-catalog-detail__section">
            <h3>{uiText.companyCatalog.sections.followUps}</h3>
            {company.hasFollowUp ? (
              <p className="section-copy">
                {company.followUpDate
                  ? `${company.followUpDate}${company.followUpTime ? ` · ${company.followUpTime}` : ''}`
                  : uiText.companyCatalog.followUpUnscheduled}
              </p>
            ) : (
              <p className="section-copy">{uiText.companyCatalog.noFollowUp}</p>
            )}
            {company.followUpNotes ? <p className="editor-hint">{company.followUpNotes}</p> : null}
          </section>

          <section className="company-catalog-detail__section">
            <h3>{uiText.companyCatalog.sections.visitHistory}</h3>
            {company.visitHistory.length > 0 ? (
              <ul className="company-catalog-detail__history">
                {company.visitHistory.map((entry) => (
                  <li key={entry.id}>
                    <strong>
                      {entry.completedAt
                        ? new Date(entry.completedAt).toLocaleString()
                        : uiText.companyCatalog.visitUndated}
                    </strong>
                    {entry.outcome ? <span> · {entry.outcome}</span> : null}
                    {entry.note ? <p>{entry.note}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-copy">{uiText.companyCatalog.noVisitHistory}</p>
            )}
          </section>

          <section className="company-catalog-detail__section">
            <h3>{uiText.companyCatalog.sections.businessCard}</h3>
            <BusinessCardScanButton
              className="button button--wide"
              onFileSelected={onScanBusinessCard}
            />
            {cardPreviewUrl ? (
              <BusinessCardPreviewStrip
                prospectId={company.id}
                previewUrl={cardPreviewUrl}
                onCapture={onScanBusinessCard}
                onRemoveCard={onRemoveBusinessCard}
              />
            ) : (
              <p className="editor-hint">{uiText.companyCatalog.noBusinessCard}</p>
            )}
          </section>

          <section className="company-catalog-detail__section">
            <h3>{uiText.companyCatalog.sections.status}</h3>
            <ul className="company-catalog-detail__status-list">
              <li>
                {uiText.companyCatalog.fields.savedStatus}:{' '}
                {company.isSaved ? uiText.companyCatalog.statusYes : uiText.companyCatalog.statusNo}
              </li>
              <li>
                {uiText.companyCatalog.fields.routeStatus}:{' '}
                {company.isInRoute ? uiText.companyCatalog.statusYes : uiText.companyCatalog.statusNo}
              </li>
              <li>
                {uiText.companyCatalog.fields.crmStatus}:{' '}
                {company.crmExportedAt
                  ? new Date(company.crmExportedAt).toLocaleString()
                  : uiText.companyCatalog.crmNotExported}
              </li>
            </ul>
          </section>
        </div>

        <div className="modal-sheet__actions company-catalog-detail__actions">
          <button type="button" className="button button--wide" onClick={handleSave}>
            {uiText.companyCatalog.saveChanges}
          </button>
          <button type="button" className="button button--ghost" onClick={onNavigate}>
            <ExternalLink size={16} />
            {uiText.routes.actions.navigate}
          </button>
          <button type="button" className="button button--ghost" onClick={onToggleRoute}>
            <Route size={16} />
            {company.isInRoute ? uiText.search.card.removeRoute : uiText.search.card.addToRoute}
          </button>
          <button type="button" className="button button--ghost" onClick={onToggleSaved}>
            <Bookmark size={16} />
            {uiText.companyCatalog.removeFromCatalog}
          </button>
          <button type="button" className="button button--ghost" onClick={onSetFollowUp}>
            <CalendarClock size={16} />
            {uiText.companyCatalog.setFollowUp}
          </button>
          <button type="button" className="button button--ghost" onClick={onExportCrm}>
            <Download size={16} />
            {uiText.companyCatalog.exportToCrm}
          </button>
        </div>
      </div>
    </div>
  )
}
