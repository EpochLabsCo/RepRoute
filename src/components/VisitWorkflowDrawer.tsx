import { Bookmark, MapPin, Phone, Trash2 } from 'lucide-react'
import PickUpFoodPrompt from './PickUpFoodPrompt'
import QuickVisitNoteField from './QuickVisitNoteField'
import BusinessCardContactFields from './BusinessCardContactFields'
import BusinessCardPreviewStrip from './BusinessCardPreviewStrip'
import BusinessCardScanButton from './BusinessCardScanButton'
import { MarkCompletedButton } from './ProspectCardActions'
import { uiText } from '../constants/uiText'

export type VisitWorkflowOutcomeTag =
  | 'No Answer'
  | 'Decision Maker Met'
  | 'Follow-Up Needed'
  | 'Quote Opportunity'
  | 'Not Interested'
  | 'Bad Address'
  | 'Existing Customer'

export type VisitWorkflowPriority = 'Hot' | 'Warm' | 'Cold' | 'Unassigned'

export type VisitWorkflowProspect = {
  id: string
  businessName: string
  address: string
  website: string
  notes: string
  visitNote: string
  followUpDate: string
  followUpTime: string
  priority: VisitWorkflowPriority
  visitOutcome: VisitWorkflowOutcomeTag | ''
  contactName: string
  contactTitle: string
  phone: string
  contactEmail: string
  routeCompleted: boolean
  isFoodStop: boolean
}

type VisitWorkflowDrawerProps = {
  prospect: VisitWorkflowProspect
  cardPreviewUrl: string | null
  isArrived: boolean
  isSaved: boolean
  outcomeOptions: readonly VisitWorkflowOutcomeTag[]
  priorityOptions: readonly VisitWorkflowPriority[]
  onClose: () => void
  onDone: () => void
  onMarkArrived: () => void
  onToggleCompleted: () => void
  onUpdateContactDetails: (
    fields: Partial<{
      contactName: string
      contactTitle: string
      contactEmail: string
      contactPhone: string
      contactWebsite: string
    }>,
  ) => void
  onUpdateNotes: (notes: string) => void
  onUpdateVisitNote: (note: string) => void
  onUpdateFollowUp: (followUpDate: string, followUpTime?: string, confirmSave?: boolean) => void
  onSavePendingFollowUp: () => void
  onUpdatePriority: (priority: VisitWorkflowPriority) => void
  onUpdateOutcome: (outcome: VisitWorkflowOutcomeTag | '') => void
  onRouteBusinessCardCapture: (file: File) => void
  onRemoveBusinessCard: () => void
  onPickUpFood: () => void
  onToggleSaved: () => void
  onRemoveFromRoute: () => void
}

function normalizeWebsite(website: string) {
  if (!website || website === uiText.errors.websiteUnavailable) {
    return ''
  }

  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`
}

export default function VisitWorkflowDrawer({
  prospect,
  cardPreviewUrl,
  isArrived,
  isSaved,
  outcomeOptions,
  priorityOptions,
  onClose,
  onDone,
  onMarkArrived,
  onToggleCompleted,
  onUpdateContactDetails,
  onUpdateNotes,
  onUpdateVisitNote,
  onUpdateFollowUp,
  onSavePendingFollowUp,
  onUpdatePriority,
  onUpdateOutcome,
  onRouteBusinessCardCapture,
  onRemoveBusinessCard,
  onPickUpFood,
  onToggleSaved,
  onRemoveFromRoute,
}: VisitWorkflowDrawerProps) {
  const websiteHref = normalizeWebsite(prospect.website)
  const phoneHref = prospect.phone?.trim() ? `tel:${prospect.phone.replace(/\s+/g, '')}` : null

  return (
    <div className="modal-backdrop visit-workflow-drawer" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet visit-workflow-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-workflow-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <header className="visit-workflow-drawer__header">
          <div>
            <h2 id="visit-workflow-title">{uiText.routes.visitWorkflow.heading}</h2>
            <p className="visit-workflow-drawer__subtitle">{prospect.businessName}</p>
            {prospect.address ? (
              <p className="visit-workflow-drawer__address">{prospect.address}</p>
            ) : null}
            {!prospect.routeCompleted && !prospect.isFoodStop ? (
              <PickUpFoodPrompt onClick={onPickUpFood} className="visit-workflow-drawer__food-prompt" />
            ) : null}
          </div>
          <button type="button" className="text-button" onClick={onClose}>
            {uiText.routes.visitWorkflow.close}
          </button>
        </header>

        <div className="visit-workflow-drawer__body">
          <div className="visit-workflow-drawer__contact-row">
            {phoneHref ? (
              <a className="visit-workflow-drawer__link" href={phoneHref}>
                <Phone size={14} />
                {prospect.phone}
              </a>
            ) : (
              <span className="visit-workflow-drawer__muted">{uiText.errors.phoneUnavailable}</span>
            )}
            {websiteHref ? (
              <a className="visit-workflow-drawer__link" href={websiteHref} target="_blank" rel="noreferrer">
                {prospect.website}
              </a>
            ) : (
              <span className="visit-workflow-drawer__muted">{uiText.errors.websiteUnavailable}</span>
            )}
          </div>

          <div className="visit-workflow-drawer__steps">
            <button
              type="button"
              className={`visit-workflow-step ${isArrived ? 'visit-workflow-step--done' : ''}`}
              onClick={onMarkArrived}
              disabled={prospect.routeCompleted}
            >
              <MapPin size={16} />
              {isArrived ? uiText.routes.inAppNavigation.arrived : uiText.routes.inAppNavigation.markArrived}
            </button>
            <MarkCompletedButton completed={prospect.routeCompleted} onClick={onToggleCompleted} />
          </div>

          <QuickVisitNoteField
            key={prospect.id}
            className="visit-workflow-drawer__section"
            value={prospect.visitNote}
            onChange={onUpdateVisitNote}
          />

          <div className="visit-workflow-drawer__section visit-workflow-card-block">
            <BusinessCardScanButton
              className="button button--wide visit-workflow-card-block__scan"
              onFileSelected={onRouteBusinessCardCapture}
            />
            {cardPreviewUrl ? (
              <BusinessCardPreviewStrip
                prospectId={prospect.id}
                previewUrl={cardPreviewUrl}
                onCapture={onRouteBusinessCardCapture}
                onRemoveCard={onRemoveBusinessCard}
              />
            ) : null}
          </div>

          <div className="field-group visit-workflow-drawer__section">
            <span className="field-label">{uiText.search.prospectCard.priority}</span>
            <div className="segment-row">
              {priorityOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`segment ${prospect.priority === option ? 'segment--active' : ''}`}
                  onClick={() => onUpdatePriority(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="field-group visit-workflow-drawer__section">
            <span className="field-label">{uiText.search.prospectCard.prospectNotes}</span>
            <textarea
              className="text-area text-area--compact"
              rows={3}
              value={prospect.notes}
              placeholder={uiText.search.prospectCard.prospectNotesPlaceholder}
              onChange={(event) => onUpdateNotes(event.target.value)}
            />
          </label>

          <div className="field-group visit-workflow-drawer__section">
            <span className="field-label">{uiText.routes.visitOutcomeLabel}</span>
            <div className="route-outcome-grid">
              {outcomeOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`route-outcome-chip ${
                    prospect.visitOutcome === option ? 'route-outcome-chip--active' : ''
                  }`}
                  onClick={() => onUpdateOutcome(prospect.visitOutcome === option ? '' : option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group visit-workflow-drawer__section">
            <div className="field-header">
              <span className="field-label">{uiText.search.prospectCard.followUpDate}</span>
              {prospect.followUpDate ? (
                <button type="button" className="text-button" onClick={() => onUpdateFollowUp('')}>
                  {uiText.search.prospectCard.clear}
                </button>
              ) : null}
            </div>
            <input
              className="text-input"
              type="date"
              value={prospect.followUpDate}
              onChange={(event) => onUpdateFollowUp(event.target.value, prospect.followUpTime)}
            />
            <label className="field-group">
              <span className="field-label">{uiText.followUps.timeLabel}</span>
              <input
                className="text-input"
                type="time"
                value={prospect.followUpTime}
                disabled={!prospect.followUpDate}
                onChange={(event) => onUpdateFollowUp(prospect.followUpDate, event.target.value)}
              />
            </label>
            <div className="button-row visit-workflow-drawer__follow-up-actions">
              <button type="button" className="button button--ghost" onClick={onSavePendingFollowUp}>
                {uiText.followUps.saveWithoutDate}
              </button>
              <button
                type="button"
                className="button"
                disabled={!prospect.followUpDate}
                onClick={() => onUpdateFollowUp(prospect.followUpDate, prospect.followUpTime, true)}
              >
                {uiText.followUps.saveFollowUp}
              </button>
            </div>
          </div>

          <details className="visit-workflow-drawer__details">
            <summary>{uiText.routes.visitWorkflow.contactDetails}</summary>
            <div className="visit-workflow-drawer__details-body">
              <BusinessCardContactFields
                contact={{
                  contactName: prospect.contactName,
                  contactTitle: prospect.contactTitle,
                  contactPhone: prospect.phone,
                  contactEmail: prospect.contactEmail,
                }}
                onUpdateContact={(fields) => onUpdateContactDetails(fields)}
              />
              <div className="field-group">
                <span className="field-label">{uiText.routes.currentStop.contactFields.website}</span>
                <input
                  className="text-input"
                  type="url"
                  value={prospect.website}
                  onChange={(event) => onUpdateContactDetails({ contactWebsite: event.target.value })}
                />
              </div>
            </div>
          </details>
        </div>

        <div className="modal-sheet__actions visit-workflow-drawer__footer">
          <div className="visit-workflow-drawer__footer-row">
            <button type="button" className="button button--ghost" onClick={onToggleSaved}>
              <Bookmark size={16} />
              {isSaved ? uiText.search.card.removeSaved : uiText.routes.visitWorkflow.saveProspect}
            </button>
            <button type="button" className="button button--danger-outline" onClick={onRemoveFromRoute}>
              <Trash2 size={16} />
              {uiText.routes.removal.removeFromRoute}
            </button>
          </div>
          <button type="button" className="button button--wide" onClick={onDone}>
            {uiText.routes.visitWorkflow.done}
          </button>
        </div>
      </div>
    </div>
  )
}
