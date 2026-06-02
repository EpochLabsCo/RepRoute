import { useMemo, useState } from 'react'
import TexasTerritoryMap from './TexasTerritoryMap'
import TerritoryDetailSheet from './TerritoryDetailSheet'
import {
  computeTerritoryLiveStats,
  countProspectsInTerritories,
  getTerritoryById,
  TEXAS_MAP_REGIONS,
  TEXAS_TERRITORY_DEFAULTS,
  type ProspectForTerritoryMatch,
  type Territory,
} from '../lib/territories'
import { uiText } from '../constants/uiText'

type TerritoriesViewProps = {
  territories?: Territory[]
  liveProspects: ProspectForTerritoryMatch[]
  routeStopProspects: ProspectForTerritoryMatch[]
  onViewProspects: () => void
  onViewRoutes: () => void
  onCreateRoute: () => void
  onEditTerritory: (territory: Territory) => void
}

export default function TerritoriesView({
  territories = TEXAS_TERRITORY_DEFAULTS,
  liveProspects,
  routeStopProspects,
  onViewProspects,
  onViewRoutes,
  onCreateRoute,
  onEditTerritory,
}: TerritoriesViewProps) {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)

  const selectedTerritory = useMemo(
    () => (selectedTerritoryId ? getTerritoryById(selectedTerritoryId, territories) : null),
    [selectedTerritoryId, territories],
  )

  const selectedStats = useMemo(() => {
    if (!selectedTerritory) {
      return null
    }

    return computeTerritoryLiveStats(
      selectedTerritory.cities,
      liveProspects,
      routeStopProspects,
    )
  }, [liveProspects, routeStopProspects, selectedTerritory])

  const territoryMatchedProspectCount = useMemo(
    () => countProspectsInTerritories(
      territories.map((territory) => territory.cities),
      liveProspects,
    ),
    [liveProspects, territories],
  )

  return (
    <div className="territories-view">
      <section className="panel section-panel section-panel--compact territories-view__intro">
        <div className="eyebrow eyebrow--tight">{uiText.territories.eyebrow}</div>
        <h2 className="territories-view__title">{uiText.territories.title}</h2>
        <p className="section-copy">{uiText.territories.subtitle}</p>
        <p className="editor-hint territories-view__hint">{uiText.territories.mapHint}</p>
      </section>

      <section className="panel section-panel territories-view__map-panel">
        <div className="territories-view__summary">
          <span className="meta-pill">{uiText.territories.regionCount(territories.length)}</span>
          <span className="meta-pill meta-pill--search">
            {uiText.territories.liveProspects(territoryMatchedProspectCount)}
          </span>
        </div>
        <TexasTerritoryMap
          territories={territories}
          mapRegions={TEXAS_MAP_REGIONS}
          selectedTerritoryId={selectedTerritoryId}
          onSelectTerritory={setSelectedTerritoryId}
        />
        {!selectedTerritoryId ? (
          <p className="editor-hint territories-view__select-prompt">{uiText.territories.selectPrompt}</p>
        ) : null}
      </section>

      {selectedTerritory && selectedStats ? (
        <TerritoryDetailSheet
          key={selectedTerritory.id}
          territory={selectedTerritory}
          stats={selectedStats}
          onClose={() => setSelectedTerritoryId(null)}
          onViewProspects={() => {
            setSelectedTerritoryId(null)
            onViewProspects()
          }}
          onViewRoutes={() => {
            setSelectedTerritoryId(null)
            onViewRoutes()
          }}
          onCreateRoute={() => {
            setSelectedTerritoryId(null)
            onCreateRoute()
          }}
          onEditTerritory={() => onEditTerritory(selectedTerritory)}
        />
      ) : null}
    </div>
  )
}
