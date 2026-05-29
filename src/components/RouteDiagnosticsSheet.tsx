import { MapIcon } from 'lucide-react'
import { uiText } from '../constants/uiText'

export type RouteLocationDiagnostics = {
  gpsCoordinates: string | null
  gpsUpdatedAt: string | null
  gpsIsFresh: boolean
  routeOriginUsed: string
  segmentDistanceSource: string
  waypointOrder: string[]
}

type RouteDiagnosticsSheetProps = {
  routeStartLocation: string
  onRouteStartLocationChange: (value: string) => void
  onUseCurrentLocation: () => void
  onRefreshLocation: () => void
  locationRefreshing?: boolean
  routeProspectCount: number
  routeDirectionsApiStatus: string | null
  routeLineRenderStatus: string
  routeOptimizationStatus: string
  locationDiagnostics?: RouteLocationDiagnostics | null
  devDiagnostics?: unknown
  onClose: () => void
}

export default function RouteDiagnosticsSheet({
  routeStartLocation,
  onRouteStartLocationChange,
  onUseCurrentLocation,
  onRefreshLocation,
  locationRefreshing = false,
  routeProspectCount,
  routeDirectionsApiStatus,
  routeLineRenderStatus,
  routeOptimizationStatus,
  locationDiagnostics,
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
          <div className="button-row">
            <button type="button" className="button button--ghost" onClick={onUseCurrentLocation}>
              {uiText.routes.optimization.useCurrentLocation}
            </button>
            <button type="button" className="button button--ghost" onClick={onRefreshLocation} disabled={locationRefreshing}>
              {locationRefreshing
                ? uiText.routes.distanceMetrics.locationRefreshing
                : uiText.routes.distanceMetrics.refreshLocation}
            </button>
          </div>
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

        {locationDiagnostics ? (
          <ul className="route-diagnostics-sheet__list route-diagnostics-sheet__list--location">
            <li>
              {uiText.routes.routeRender.gpsCoordinates}: {locationDiagnostics.gpsCoordinates ?? '—'}
            </li>
            <li>
              {uiText.routes.routeRender.gpsUpdatedAt}: {locationDiagnostics.gpsUpdatedAt ?? '—'}
              {locationDiagnostics.gpsIsFresh ? '' : ` (${uiText.routes.distanceMetrics.locationStale})`}
            </li>
            <li>
              {uiText.routes.routeRender.routeOriginUsed}: {locationDiagnostics.routeOriginUsed}
            </li>
            <li>
              {uiText.routes.routeRender.segmentDistanceSource}: {locationDiagnostics.segmentDistanceSource}
            </li>
            <li>
              {uiText.routes.routeRender.waypointOrder}:{' '}
              {locationDiagnostics.waypointOrder.length > 0
                ? locationDiagnostics.waypointOrder.join(' → ')
                : '—'}
            </li>
          </ul>
        ) : null}

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
