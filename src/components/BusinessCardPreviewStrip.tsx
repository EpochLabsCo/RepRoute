import { useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { uiText } from '../constants/uiText'
import BusinessCardScanButton from './BusinessCardScanButton'

type BusinessCardPreviewStripProps = {
  prospectId: string
  previewUrl: string | null
  onCapture: (file: File) => void
  onRemoveCard: () => void
}

function BusinessCardPreviewStrip({
  prospectId,
  previewUrl,
  onCapture,
  onRemoveCard,
}: BusinessCardPreviewStripProps) {
  const [viewerOpen, setViewerOpen] = useState(false)

  if (!previewUrl) {
    return null
  }

  return (
    <div className="business-card-preview-strip">
      <div className="business-card-preview-strip__thumb">
        <img src={previewUrl} alt={uiText.routes.businessCard.previewAlt(prospectId)} />
      </div>
      <div className="business-card-preview-strip__actions">
        <button type="button" className="route-action-button" onClick={() => setViewerOpen(true)}>
          <Eye size={16} />
          {uiText.routes.businessCard.viewCard}
        </button>
        <BusinessCardScanButton
          label={uiText.routes.businessCard.replaceCard}
          onFileSelected={onCapture}
        />
        <button type="button" className="route-action-button button--danger-outline" onClick={onRemoveCard}>
          <Trash2 size={16} />
          {uiText.routes.businessCard.removeCard}
        </button>
      </div>

      {viewerOpen ? (
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
    </div>
  )
}

export default BusinessCardPreviewStrip
