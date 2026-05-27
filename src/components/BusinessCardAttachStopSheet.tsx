import { uiText } from '../constants/uiText'

type RouteStopOption = {
  id: string
  businessName: string
  address: string
}

type BusinessCardAttachStopSheetProps = {
  stops: RouteStopOption[]
  onSelectStop: (prospectId: string) => void
  onCancel: () => void
}

function BusinessCardAttachStopSheet({ stops, onSelectStop, onCancel }: BusinessCardAttachStopSheetProps) {
  return (
    <div className="modal-backdrop business-card-attach-sheet" role="presentation">
      <div
        className="modal-sheet business-card-attach-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-card-attach-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <h2 id="business-card-attach-title">{uiText.routes.businessCard.attachPromptHeading}</h2>
        <p className="section-copy">{uiText.routes.businessCard.attachPromptDescription}</p>

        <div className="business-card-attach-sheet__list">
          {stops.map((stop, index) => (
            <button
              key={stop.id}
              type="button"
              className="business-card-attach-sheet__stop"
              onClick={() => onSelectStop(stop.id)}
            >
              <span className="business-card-attach-sheet__stop-order">{uiText.routes.stopLabel(index)}</span>
              <span className="business-card-attach-sheet__stop-name">{stop.businessName}</span>
              <span className="business-card-attach-sheet__stop-address">{stop.address}</span>
            </button>
          ))}
        </div>

        <div className="modal-sheet__actions">
          <button type="button" className="button button--ghost button--wide" onClick={onCancel}>
            {uiText.routes.businessCard.attachPromptCancel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BusinessCardAttachStopSheet
