export type TerritoryProspectRef = {
  id: string
  businessName: string
  city: string
  priority?: string
}

export type TerritoryRouteSummary = {
  /** 1 when today's route includes this territory, else 0 */
  activeRouteCount: number
  stopCount: number
  stops: TerritoryProspectRef[]
}

/**
 * Field-sales territory configuration (static metadata).
 * Live counts are computed via territoryData helpers.
 */
export type TerritoryConfig = {
  id: string
  name: string
  shortName: string
  description: string
  exampleCities: string[]
  regionType: string
  targetIndustries: string[]
  priorityAccounts: string[]
  color: string
  cityKeywords: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type TerritoryMapRegion = {
  territoryId: TerritoryConfig['id']
  /** SVG path `d` attribute */
  path: string
  labelX: number
  labelY: number
}

/** @deprecated Use TerritoryConfig */
export type Territory = TerritoryConfig & {
  region: string
  cities: string[]
  prospects: TerritoryProspectRef[]
  customers: unknown[]
  routes: unknown[]
}
