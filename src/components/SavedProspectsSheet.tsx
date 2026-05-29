import type { ReactNode } from 'react'
import { Bookmark, X } from 'lucide-react'
import { uiText } from '../constants/uiText'

type SavedProspectsSheetProspect = {
  id: string
  businessName: string
}

type SavedProspectsSheetProps = {
  open: boolean
  prospects: SavedProspectsSheetProspect[]
  renderProspectCard: (prospect: SavedProspectsSheetProspect) => ReactNode
  onClose: () => void
  onBrowseSearch: () => void
}

export default function SavedProspectsSheet({
  open,
  prospects,
  renderProspectCard,
  onClose,
  onBrowseSearch,
}: SavedProspectsSheetProps) {
  if (!open) {
    return null
  }

  return (
    <div className="saved-prospects-sheet" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet saved-prospects-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-prospects-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <header className="saved-prospects-sheet__header">
          <div>
            <h2 id="saved-prospects-title">{uiText.saved.heading}</h2>
            <p className="saved-prospects-sheet__subtitle">{uiText.saved.countLabel(prospects.length)}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={uiText.saved.closeSheet}>
            <X size={18} />
          </button>
        </header>

        <div className="saved-prospects-sheet__body">
          {prospects.length > 0 ? (
            <div className="stack">{prospects.map((prospect) => renderProspectCard(prospect))}</div>
          ) : (
            <div className="saved-prospects-sheet__empty">
              <Bookmark size={28} />
              <p>{uiText.emptyStates.noSavedCopy}</p>
              <button type="button" className="button" onClick={onBrowseSearch}>
                {uiText.saved.emptyAction}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
