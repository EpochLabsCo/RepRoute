import { useMemo, useState } from 'react'
import TexasTerritoryMap from './TexasTerritoryMap'
import TerritoryDashboard from './TerritoryDashboard'
import TerritoryList from './TerritoryList'
import {
  computeAllTerritoryStats,
  countUniqueProspectsInTerritories,
  TEXAS_MAP_REGIONS,
  TEXAS_TERRITORIES,
  type ProspectForTerritoryMatch,
  type TerritoryConfig,
} from '../lib/territories'
import { uiText } from '../constants/uiText'

type TerritoriesViewProps = {
  territories?: TerritoryConfig[]
  liveProspects: ProspectForTerritoryMatch[]
  routeStopProspects: ProspectForTerritoryMatch[]
  onViewProspects: (territory: TerritoryConfig) => void
  onCreateRoute: (territory: TerritoryConfig) => void
  onGenerateReport: (territory: TerritoryConfig) => void
}

export default function TerritoriesView({
  territories = TEXAS_TERRITORIES,
  liveProspects,
  routeStopProspects,
  onViewProspects,
  onCreateRoute,
  onGenerateReport,
}: TerritoriesViewProps) {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
  const [mapExpanded, setMapExpanded] = useState(false)

  const territoryRows = useMemo(() => {
    const rows = computeAllTerritoryStats(territories, liveProspects, routeStopProspects)
    return [...rows].sort((left, right) => {
      const leftScore = left.stats.prospectCount * 2 + left.stats.stopCount
      const rightScore = right.stats.prospectCount * 2 + right.stats.stopCount
      return rightScore - leftScore
    })
  }, [liveProspects, routeStopProspects, territories])

  const selectedRow = useMemo(
    () => territoryRows.find((row) => row.territory.id === selectedTerritoryId) ?? null,
    [selectedTerritoryId, territoryRows],
  )

  const matchedProspectCount = useMemo(
    () => countUniqueProspectsInTerritories(territories, liveProspects),
    [liveProspects, territories],
  )

  return (
    <div className="territories-view">
      <section className="panel section-panel section-panel--compact territories-view__intro">
        <div className="eyebrow eyebrow--tight">{uiText.territories.eyebrow}</div>
        <h2 className="territories-view__title">{uiText.territories.title}</h2>
        <p className="section-copy">{uiText.territories.subtitle}</p>
        <div className="territories-view__summary">
          <span className="meta-pill">{uiText.territories.regionCount(territories.length)}</span>
          <span className="meta-pill meta-pill--search">
            {uiText.territories.liveProspects(matchedProspectCount)}
          </span>
        </div>
      </section>

      <TerritoryList
        items={territoryRows}
        selectedTerritoryId={selectedTerritoryId}
        onSelectTerritory={setSelectedTerritoryId}
      />

      {selectedRow ? (
        <TerritoryDashboard
          key={selectedRow.territory.id}
          territory={selectedRow.territory}
          stats={selectedRow.stats}
          onViewProspects={() => onViewProspects(selectedRow.territory)}
          onCreateRoute={() => onCreateRoute(selectedRow.territory)}
          onGenerateReport={() => onGenerateReport(selectedRow.territory)}
        />
      ) : (
        <section className="panel section-panel territories-view__prompt">
          <h3>{uiText.territories.dashboard.selectTitle}</h3>
          <p>{uiText.territories.selectPrompt}</p>
        </section>
      )}

      <section className="panel section-panel territories-view__map-panel">
        <button
          type="button"
          className="territories-view__map-toggle"
          onClick={() => setMapExpanded((current) => !current)}
          aria-expanded={mapExpanded}
        >
          {mapExpanded ? uiText.territories.dashboard.hideMap : uiText.territories.dashboard.showMap}
        </button>
        {mapExpanded ? (
          <>
            <TexasTerritoryMap
              territories={territories}
              mapRegions={TEXAS_MAP_REGIONS}
              selectedTerritoryId={selectedTerritoryId}
              onSelectTerritory={setSelectedTerritoryId}
            />
            <p className="editor-hint territories-view__map-hint">{uiText.territories.mapHint}</p>
          </>
        ) : null}
      </section>
    </div>
  )
}
