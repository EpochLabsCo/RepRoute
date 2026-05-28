import type { RouteNavigationLegSummary } from './RouteNavigationView'

type RouteFocusCardProps = {
  stopNumber: number
  businessName: string
  address: string
  leg?: RouteNavigationLegSummary | null
  /** Overrides leg distance (e.g. live GPS distance to stop). */
  distanceOverride?: string | null
  variant?: 'current' | 'next' | 'active'
  statusNote?: string | null
}

export default function RouteFocusCard({
  stopNumber,
  businessName,
  address,
  leg,
  distanceOverride,
  variant = 'current',
  statusNote,
}: RouteFocusCardProps) {
  const distance = distanceOverride?.trim() || leg?.distanceText?.trim() || null
  const eta = leg?.durationText?.trim() || null
  const hasMetrics = Boolean(distance || eta)

  return (
    <div className={`route-focus-card route-focus-card--${variant}`}>
      <div className="route-focus-card__row">
        <span className="route-stop-badge" aria-label={`Stop ${stopNumber}`}>
          {stopNumber}
        </span>
        {hasMetrics ? (
          <p className="route-focus-card__metrics" aria-label="Distance and drive time">
            {distance ? <span>{distance}</span> : null}
            {distance && eta ? (
              <span className="route-focus-card__sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            {eta ? <span>{eta}</span> : null}
          </p>
        ) : null}
      </div>
      <h3 className="route-focus-card__name">{businessName}</h3>
      <p className="route-focus-card__address">{address}</p>
      {statusNote ? <p className="route-focus-card__status">{statusNote}</p> : null}
    </div>
  )
}
