import { Pencil, Route, Search, Users, X } from 'lucide-react'
import type { Territory } from '../lib/territories/types'
import type { TerritoryLiveStats } from '../lib/territories/matchProspects'
import { uiText } from '../constants/uiText'

type TerritoryDetailSheetProps = {
  territory: Territory
  stats: TerritoryLiveStats
  onClose: () => void
  onViewProspects: () => void
  onViewRoutes: () => void
  onCreateRoute: () => void
  onEditTerritory: () => void
}

export default function TerritoryDetailSheet({
  territory,
  stats,
  onClose,
  onViewProspects,
  onViewRoutes,
  onCreateRoute,
  onEditTerritory,
}: TerritoryDetailSheetProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-sheet territory-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="territory-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <header className="territory-detail-sheet__header">
          <div className="territory-detail-sheet__title-wrap">
            <span
              className="territory-detail-sheet__swatch"
              style={{ backgroundColor: territory.color }}
              aria-hidden
            />
            <div>
              <div className="eyebrow eyebrow--tight">{territory.region}</div>
              <h2 id="territory-detail-title">{territory.name}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={uiText.territories.close}>
            <X size={18} />
          </button>
        </header>

        <div className="territory-detail-sheet__body">
          <p className="section-copy">{territory.description}</p>

          <div className="territory-detail-sheet__cities">
            <span className="field-label">{uiText.territories.exampleCities}</span>
            <p>{territory.cities.join(' · ')}</p>
          </div>

          {stats.hasLiveData ? (
            <>
              <div className="territory-detail-sheet__stats">
                <div className="territory-detail-sheet__stat">
                  <span className="territory-detail-sheet__stat-value">{stats.prospectCount}</span>
                  <span className="territory-detail-sheet__stat-label">{uiText.territories.prospectCount}</span>
                </div>
                <div className="territory-detail-sheet__stat">
                  <span className="territory-detail-sheet__stat-value">{stats.routeCount}</span>
                  <span className="territory-detail-sheet__stat-label">{uiText.territories.routeCount}</span>
                </div>
                <div className="territory-detail-sheet__stat">
                  <span className="territory-detail-sheet__stat-value">{stats.stopCount}</span>
                  <span className="territory-detail-sheet__stat-label">{uiText.territories.stopCount}</span>
                </div>
              </div>

              {stats.prospectCount > 0 ? (
                <ul className="territory-detail-sheet__preview-list">
                  {stats.prospects.slice(0, 4).map((prospect) => (
                    <li key={prospect.id}>
                      <strong>{prospect.businessName}</strong>
                      <span>{prospect.city}</span>
                    </li>
                  ))}
                  {stats.prospectCount > 4 ? (
                    <li className="territory-detail-sheet__preview-more">
                      +{stats.prospectCount - 4} more
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="editor-hint">{uiText.territories.emptyProspects}</p>
              )}

              {stats.stopCount === 0 ? (
                <p className="editor-hint">{uiText.territories.emptyStops}</p>
              ) : null}
            </>
          ) : (
            <div className="territory-detail-sheet__empty">
              <h3>{uiText.territories.emptyTitle}</h3>
              <p className="section-copy">{uiText.territories.emptyCopy}</p>
            </div>
          )}

          {territory.notes ? (
            <div className="territory-detail-sheet__notes">
              <span className="field-label">{uiText.territories.notes}</span>
              <p className="editor-hint">{territory.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="modal-sheet__actions territory-detail-sheet__actions">
          <button type="button" className="button button--wide" onClick={onViewProspects}>
            <Users size={16} />
            {uiText.territories.viewProspects}
          </button>
          <button type="button" className="button button--ghost button--wide" onClick={onViewRoutes}>
            <Route size={16} />
            {uiText.territories.viewRoutes}
          </button>
          <button type="button" className="button button--ghost button--wide" onClick={onCreateRoute}>
            <Search size={16} />
            {uiText.territories.createRoute}
          </button>
          <button type="button" className="button button--ghost button--wide" onClick={onEditTerritory}>
            <Pencil size={16} />
            {uiText.territories.editTerritory}
          </button>
        </div>
      </div>
    </div>
  )
}
