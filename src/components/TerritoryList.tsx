import type { TerritoryConfig } from '../lib/territories/types'
import type { TerritoryDashboardStats } from '../lib/territories/territoryData'
import { uiText } from '../constants/uiText'

type TerritoryListItem = {
  territory: TerritoryConfig
  stats: TerritoryDashboardStats
}

type TerritoryListProps = {
  items: TerritoryListItem[]
  selectedTerritoryId: string | null
  onSelectTerritory: (territoryId: string) => void
}

export default function TerritoryList({
  items,
  selectedTerritoryId,
  onSelectTerritory,
}: TerritoryListProps) {
  return (
    <section className="panel section-panel territory-list">
      <h3 className="territory-list__heading">{uiText.territories.listHeading}</h3>
      <p className="section-copy territory-list__copy">{uiText.territories.listCopy}</p>
      <p className="editor-hint territory-list__sort-hint">{uiText.territories.dashboard.listSortHint}</p>
      <ul className="territory-list__items">
        {items.map(({ territory, stats }) => {
          const isSelected = territory.id === selectedTerritoryId

          return (
            <li key={territory.id}>
              <button
                type="button"
                className={`territory-list__item ${isSelected ? 'territory-list__item--selected' : ''}`}
                onClick={() => onSelectTerritory(territory.id)}
                aria-pressed={isSelected}
              >
                <span className="territory-list__swatch" style={{ backgroundColor: territory.color }} />
                <span className="territory-list__main">
                  <strong>{territory.name}</strong>
                  <span>{territory.exampleCities.slice(0, 4).join(' · ')}</span>
                </span>
                <span className="territory-list__counts">
                  <span>
                    {stats.prospectCount} {uiText.territories.prospectCountShort}
                  </span>
                  <span>
                    {stats.stopCount} {uiText.territories.stopCountShort}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
