import BusinessCardSection from './BusinessCardSection'
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
}

type VisitWorkflowDrawerProps = {
  prospect: VisitWorkflowProspect
  cardPreviewUrl: string | null
  outcomeOptions: readonly VisitWorkflowOutcomeTag[]
  priorityOptions: readonly VisitWorkflowPriority[]
  onClose: () => void
  onDone: () => void
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
  onUpdatePriority: (priority: VisitWorkflowPriority) => void
  onUpdateOutcome: (outcome: VisitWorkflowOutcomeTag | '') => void
  onRouteBusinessCardCapture: (file: File) => void
  onRemoveBusinessCard: () => void
}

export default function VisitWorkflowDrawer({
  prospect,
  cardPreviewUrl,
  outcomeOptions,
  priorityOptions,
  onClose,
  onDone,
  onUpdateContactDetails,
  onUpdateNotes,
  onUpdateVisitNote,
  onUpdateFollowUp,
  onUpdatePriority,
  onUpdateOutcome,
  onRouteBusinessCardCapture,
  onRemoveBusinessCard,
}: VisitWorkflowDrawerProps) {
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
          </div>
          <button type="button" className="text-button" onClick={onClose}>
            {uiText.routes.visitWorkflow.close}
          </button>
        </header>

        <div className="visit-workflow-drawer__body">
          <label className="field-group">
            <span className="field-label">{uiText.routes.quickNoteLabel}</span>
            <textarea
              className="text-area text-area--compact"
              rows={4}
              value={prospect.visitNote}
              onChange={(event) => onUpdateVisitNote(event.target.value)}
              placeholder={uiText.routes.quickNotePlaceholder}
            />
          </label>

          <div className="field-group">
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
            <button
              type="button"
              className="button button--ghost"
              disabled={!prospect.followUpDate}
              onClick={() => onUpdateFollowUp(prospect.followUpDate, prospect.followUpTime, true)}
            >
              {uiText.followUps.saveFollowUp}
            </button>
          </div>

          <div className="field-group">
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

          <BusinessCardSection
            prospectId={prospect.id}
            previewUrl={cardPreviewUrl}
            contact={{
              contactName: prospect.contactName,
              contactTitle: prospect.contactTitle,
              contactPhone: prospect.phone,
              contactEmail: prospect.contactEmail,
            }}
            onCapture={onRouteBusinessCardCapture}
            onRemoveCard={onRemoveBusinessCard}
            onUpdateContact={(fields) => onUpdateContactDetails(fields)}
            showScanButton
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

          <label className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.notes}</span>
            <textarea
              className="text-area text-area--compact"
              rows={3}
              value={prospect.notes}
              onChange={(event) => onUpdateNotes(event.target.value)}
            />
          </label>

          <div className="field-group">
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
        </div>

        <div className="modal-sheet__actions visit-workflow-drawer__footer">
          <button type="button" className="button button--wide" onClick={onDone}>
            {uiText.routes.visitWorkflow.done}
          </button>
        </div>
      </div>
    </div>
  )
}
