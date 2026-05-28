import { MapIcon } from 'lucide-react'
import { uiText } from '../constants/uiText'

type RouteDiagnosticsSheetProps = {
  routeStartLocation: string
  onRouteStartLocationChange: (value: string) => void
  onUseCurrentLocation: () => void
  routeProspectCount: number
  routeDirectionsApiStatus: string | null
  routeLineRenderStatus: string
  routeOptimizationStatus: string
  devDiagnostics?: unknown
  onClose: () => void
}

export default function RouteDiagnosticsSheet({
  routeStartLocation,
  onRouteStartLocationChange,
  onUseCurrentLocation,
  routeProspectCount,
  routeDirectionsApiStatus,
  routeLineRenderStatus,
  routeOptimizationStatus,
  devDiagnostics,
  onClose,
}: RouteDiagnosticsSheetProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet route-diagnostics-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-diagnostics-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <h2 id="route-diagnostics-title">{uiText.routes.routeRender.diagnosticsHeading}</h2>

        <label className="field-group">
          <span className="field-label">{uiText.routes.optimization.startingLocationLabel}</span>
          <div className="search-field">
            <MapIcon size={18} />
            <input
              type="search"
              value={routeStartLocation}
              onChange={(event) => onRouteStartLocationChange(event.target.value)}
              placeholder={uiText.routes.optimization.startingLocationPlaceholder}
              aria-label={uiText.routes.optimization.startingLocationLabel}
            />
          </div>
          <button type="button" className="button button--ghost" onClick={onUseCurrentLocation}>
            {uiText.routes.optimization.useCurrentLocation}
          </button>
        </label>

        <ul className="route-diagnostics-sheet__list">
          <li>{uiText.routes.routeRender.stopCount(routeProspectCount)}</li>
          <li>
            {uiText.routes.routeRender.directionsStatus}: {routeDirectionsApiStatus ?? '—'}
          </li>
          <li>
            {uiText.routes.routeRender.rendererStatus}: {routeLineRenderStatus}
          </li>
          <li>Optimize: {routeOptimizationStatus}</li>
        </ul>

        {import.meta.env.DEV && devDiagnostics ? (
          <pre className="editor-hint route-diagnostics-sheet__json">
            {JSON.stringify(devDiagnostics, null, 2)}
          </pre>
        ) : null}

        <div className="modal-sheet__actions">
          <button type="button" className="button button--wide" onClick={onClose}>
            {uiText.routes.visitWorkflow.close}
          </button>
        </div>
      </div>
    </div>
  )
}
