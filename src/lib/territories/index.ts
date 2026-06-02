export type {
  Territory,
  TerritoryCustomerRef,
  TerritoryMapRegion,
  TerritoryProspectRef,
  TerritoryRouteRef,
} from './types'

export {
  computeTerritoryLiveStats,
  countProspectsInTerritories,
  prospectMatchesTerritoryCities,
  type ProspectForTerritoryMatch,
  type TerritoryLiveStats,
} from './matchProspects'

export {
  getMapRegionForTerritory,
  getTerritoryById,
  TEXAS_MAP_REGIONS,
  TEXAS_TERRITORY_DEFAULTS,
} from '../../data/texasTerritoryDefaults'
