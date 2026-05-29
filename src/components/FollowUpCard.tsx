import { CalendarClock, CheckCircle2, MapPin, NotebookPen, Pencil, Trash2 } from 'lucide-react'
import type { FollowUpEntry } from '../lib/followUps'
import { uiText } from '../constants/uiText'

type FollowUpCardProps = {
  entry: FollowUpEntry
  statusLabel: string
  isUnscheduled?: boolean
  isEditing: boolean
  editDate: string
  editTime: string
  editNotes: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditDateChange: (value: string) => void
  onEditTimeChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onMarkComplete: () => void
  onReschedule: (date: string) => void
  onNavigate: () => void
  onRemove: () => void
  onSetDate?: () => void
}

function formatFollowUpDateTime(date: string, time: string) {
  if (!date) {
    return uiText.followUps.unscheduledDateLabel
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))

  return time ? `${formattedDate} · ${time}` : formattedDate
}

function FollowUpCard({
  entry,
  statusLabel,
  isUnscheduled = false,
  isEditing,
  editDate,
  editTime,
  editNotes,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDateChange,
  onEditTimeChange,
  onEditNotesChange,
  onMarkComplete,
  onReschedule,
  onNavigate,
  onRemove,
  onSetDate,
}: FollowUpCardProps) {
  const routeStatusLabel =
    entry.routeStatus === 'on-route'
      ? uiText.followUps.routeStatusOnRoute
      : entry.routeStatus === 'saved'
        ? uiText.followUps.routeStatusSaved
        : uiText.followUps.routeStatusNotInRoute

  return (
    <article className={`follow-up-card ${entry.completed ? 'follow-up-card--completed' : ''}`}>
      <div className="follow-up-card__header">
        <div>
          <div className="eyebrow eyebrow--tight">{entry.category}</div>
          <h3>{entry.businessName}</h3>
          <p>{entry.city || entry.address}</p>
        </div>
        <span
          className={`meta-pill ${
            statusLabel === uiText.followUps.statuses.dueNow
              ? 'meta-pill--hot'
              : statusLabel === uiText.followUps.statuses.tomorrow ||
                  statusLabel === uiText.followUps.statuses.thisWeek
                ? 'meta-pill--warm'
                : isUnscheduled
                  ? 'meta-pill--cold'
                  : entry.completed
                    ? 'meta-pill--accent'
                    : 'meta-pill--cold'
          }`}
        >
          {entry.completed ? uiText.followUps.completedLabel : statusLabel}
        </span>
      </div>

      <div className="follow-up-card__meta">
        <span>{formatFollowUpDateTime(entry.followUpDate, entry.followUpTime)}</span>
        <span>{uiText.followUps.priorityLabel(entry.priority)}</span>
        <span>{routeStatusLabel}</span>
      </div>

      {(entry.contactName || entry.contactEmail || entry.phone) && (
        <div className="follow-up-card__contact">
          {entry.contactName ? <span>{entry.contactName}</span> : null}
          {entry.contactTitle ? <span>{entry.contactTitle}</span> : null}
          {entry.phone ? <span>{entry.phone}</span> : null}
          {entry.contactEmail ? <span>{entry.contactEmail}</span> : null}
        </div>
      )}

      {isEditing ? (
        <div className="follow-up-card__editor">
          <div className="field-group">
            <span className="field-label">{uiText.search.prospectCard.followUpDate}</span>
            <input className="text-input" type="date" value={editDate} onChange={(e) => onEditDateChange(e.target.value)} />
          </div>
          <div className="field-group">
            <span className="field-label">{uiText.followUps.timeLabel}</span>
            <input
              className="text-input"
              type="time"
              value={editTime}
              disabled={!editDate}
              onChange={(e) => onEditTimeChange(e.target.value)}
            />
          </div>
          <label className="field-group">
            <span className="field-label">{uiText.followUps.notesLabel}</span>
            <textarea className="text-area text-area--compact" rows={3} value={editNotes} onChange={(e) => onEditNotesChange(e.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" className="button" onClick={onSaveEdit}>
              {uiText.followUps.saveChanges}
            </button>
            <button type="button" className="button button--ghost" onClick={onCancelEdit}>
              {uiText.routes.invalidStops.cancel}
            </button>
          </div>
        </div>
      ) : (
        <p className="follow-up-card__notes">{entry.notes.trim() || uiText.followUps.notesEmpty}</p>
      )}

      <div className="follow-up-card__actions">
        {!entry.completed && isUnscheduled && onSetDate ? (
          <button type="button" className="route-action-button" onClick={onSetDate}>
            <CalendarClock size={16} />
            {uiText.followUps.setDate}
          </button>
        ) : null}
        {!entry.completed ? (
          <button type="button" className="route-action-button" onClick={onMarkComplete}>
            <CheckCircle2 size={16} />
            {uiText.followUps.markComplete}
          </button>
        ) : null}
        <button type="button" className="route-action-button" onClick={onStartEdit}>
          <Pencil size={16} />
          {uiText.followUps.edit}
        </button>
        {!entry.completed && entry.followUpDate ? (
          <button
            type="button"
            className="route-action-button"
            onClick={() => {
              const nextDate = getTomorrowDateKey()
              onReschedule(nextDate)
            }}
          >
            <CalendarClock size={16} />
            {uiText.followUps.rescheduleTomorrow}
          </button>
        ) : null}
        <button type="button" className="route-action-button" onClick={onNavigate}>
          <MapPin size={16} />
          {uiText.followUps.navigate}
        </button>
        <button type="button" className="route-action-button" onClick={onStartEdit}>
          <NotebookPen size={16} />
          {uiText.followUps.addNotes}
        </button>
        <button type="button" className="route-action-button button--danger-outline" onClick={onRemove}>
          <Trash2 size={16} />
          {uiText.followUps.remove}
        </button>
      </div>
    </article>
  )
}

function getTomorrowDateKey() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default FollowUpCard
