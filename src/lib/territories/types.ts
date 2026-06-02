export type TerritoryProspectRef = {
  id: string
  businessName: string
  city: string
  priority?: string
}

export type TerritoryCustomerRef = {
  id: string
  businessName: string
  city: string
  lastOrder?: string
}

export type TerritoryRouteRef = {
  id: string
  name: string
  stopCount: number
  status: 'planned' | 'active' | 'completed'
}

/**
 * Core territory record for RepRoute field-first CRM organization.
 * Region metadata is static; prospect/route/stop counts are computed from live RepRoute data.
 */
export type Territory = {
  id: string
  name: string
  description: string
  region: string
  cities: string[]
  color: string
  prospects: TerritoryProspectRef[]
  customers: TerritoryCustomerRef[]
  routes: TerritoryRouteRef[]
  notes: string
  createdAt: string
  updatedAt: string
}

/**
 * Map geometry for a territory region on the static Texas SVG.
 */
export type TerritoryMapRegion = {
  territoryId: Territory['id']
  /** SVG path `d` attribute */
  path: string
  /** Optional short label on map */
  mapLabel: string
  labelX: number
  labelY: number
}
