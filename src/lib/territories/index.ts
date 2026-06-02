export type {
  TerritoryConfig,
  TerritoryMapRegion,
  TerritoryProspectRef,
  TerritoryRouteSummary,
} from './types'

export {
  computeAllTerritoryStats,
  computeTerritoryDashboardStats,
  computeTerritoryLiveStats,
  countUniqueProspectsInTerritories,
  getPriorityAccountMatches,
  getProspectsForTerritory,
  getRoutesForTerritory,
  getStopsForTerritory,
  getTopCitiesForTerritory,
  prospectMatchesTerritory,
  type ProspectForTerritoryMatch,
  type TerritoryCityRank,
  type TerritoryDashboardStats,
  type TerritoryLiveStats,
  type TerritoryPriorityMatch,
} from './territoryData'

export {
  buildTerritoryReportCsv,
  downloadTerritoryReportCsv,
  type TerritoryReportProspectRow,
} from './territoryReport'

export { getTerritoryById, TEXAS_TERRITORIES } from '../../data/texasTerritories.config'
export {
  TEXAS_CITY_MARKERS,
  TEXAS_MAP_REGIONS,
  TEXAS_MAP_VIEWBOX,
  TEXAS_OUTLINE_PATH,
} from '../../data/texasMapGeometry'

/** @deprecated Use TEXAS_TERRITORIES */
export { TEXAS_TERRITORIES as TEXAS_TERRITORY_DEFAULTS } from '../../data/texasTerritories.config'
