import type { TerritoryConfig, TerritoryProspectRef } from './types'

export type ProspectForTerritoryMatch = {
  id: string
  businessName: string
  city: string
  address: string
}

export type TerritoryLiveStats = {
  prospectCount: number
  routeCount: number
  stopCount: number
  prospects: TerritoryProspectRef[]
  routeStops: TerritoryProspectRef[]
  hasLiveData: boolean
}

export type TerritoryCityRank = {
  city: string
  prospectCount: number
  stopCount: number
}

export type TerritoryPriorityMatch = {
  name: string
  inCatalog: boolean
  prospectId?: string
  businessName?: string
}

export type TerritoryDashboardStats = TerritoryLiveStats & {
  topCities: TerritoryCityRank[]
  priorityAccountMatches: TerritoryPriorityMatch[]
  prospectIds: string[]
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function citySegments(value: string) {
  return value
    .split(',')
    .map((part) => normalizeToken(part))
    .filter(Boolean)
}

function territoryMatchTokens(territory: TerritoryConfig) {
  const tokens = new Set<string>()

  for (const city of territory.exampleCities) {
    const normalized = normalizeToken(city)
    if (normalized) {
      tokens.add(normalized)
    }
  }

  for (const keyword of territory.cityKeywords) {
    const normalized = normalizeToken(keyword)
    if (normalized) {
      tokens.add(normalized)
    }
  }

  return [...tokens]
}

function tokenMatchesProspect(token: string, prospect: ProspectForTerritoryMatch) {
  const prospectCity = normalizeToken(prospect.city)
  const addressNormalized = normalizeToken(prospect.address)
  const addressParts = citySegments(prospect.address)

  if (prospectCity === token) {
    return true
  }

  if (prospectCity.includes(token) || token.includes(prospectCity)) {
    return prospectCity.length > 3 && token.length > 3
  }

  if (addressParts.some((part) => part === token || part.startsWith(`${token} `))) {
    return true
  }

  if (addressNormalized.includes(` ${token} `) || addressNormalized.includes(`, ${token},`)) {
    return true
  }

  return false
}

export function prospectMatchesTerritory(
  prospect: ProspectForTerritoryMatch,
  territory: TerritoryConfig,
) {
  const tokens = territoryMatchTokens(territory)

  for (const token of tokens) {
    if (tokenMatchesProspect(token, prospect)) {
      return true
    }
  }

  return false
}

function displayCity(prospect: ProspectForTerritoryMatch) {
  const city = prospect.city.trim()
  if (city) {
    return city
  }

  const segment = prospect.address.split(',')[0]?.trim()
  return segment || 'Unknown city'
}

function toProspectRef(prospect: ProspectForTerritoryMatch): TerritoryProspectRef {
  return {
    id: prospect.id,
    businessName: prospect.businessName,
    city: prospect.city,
  }
}

export function getProspectsForTerritory(
  territory: TerritoryConfig,
  liveProspects: ProspectForTerritoryMatch[],
) {
  return liveProspects
    .filter((prospect) => prospectMatchesTerritory(prospect, territory))
    .map(toProspectRef)
}

export function getStopsForTerritory(
  territory: TerritoryConfig,
  routeStopProspects: ProspectForTerritoryMatch[],
) {
  return routeStopProspects
    .filter((prospect) => prospectMatchesTerritory(prospect, territory))
    .map(toProspectRef)
}

/**
 * RepRoute stores one active route; returns 1 when that route has stops in the territory.
 */
export function getRoutesForTerritory(
  territory: TerritoryConfig,
  routeStopProspects: ProspectForTerritoryMatch[],
) {
  const stops = getStopsForTerritory(territory, routeStopProspects)
  return {
    activeRouteCount: stops.length > 0 ? 1 : 0,
    stopCount: stops.length,
    stops,
  }
}

export function getTopCitiesForTerritory(
  territory: TerritoryConfig,
  liveProspects: ProspectForTerritoryMatch[],
  routeStopProspects: ProspectForTerritoryMatch[],
  limit = 6,
): TerritoryCityRank[] {
  const matchedProspects = liveProspects.filter((prospect) =>
    prospectMatchesTerritory(prospect, territory),
  )
  const matchedStops = routeStopProspects.filter((prospect) =>
    prospectMatchesTerritory(prospect, territory),
  )
  const cityMap = new Map<string, TerritoryCityRank>()

  for (const prospect of matchedProspects) {
    const city = displayCity(prospect)
    const entry = cityMap.get(city) ?? { city, prospectCount: 0, stopCount: 0 }
    entry.prospectCount += 1
    cityMap.set(city, entry)
  }

  for (const stop of matchedStops) {
    const city = displayCity(stop)
    const entry = cityMap.get(city) ?? { city, prospectCount: 0, stopCount: 0 }
    entry.stopCount += 1
    cityMap.set(city, entry)
  }

  return [...cityMap.values()]
    .sort((left, right) => {
      const leftScore = left.prospectCount * 2 + left.stopCount
      const rightScore = right.prospectCount * 2 + right.stopCount
      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }
      return left.city.localeCompare(right.city)
    })
    .slice(0, limit)
}

export function getPriorityAccountMatches(
  territory: TerritoryConfig,
  liveProspects: ProspectForTerritoryMatch[],
): TerritoryPriorityMatch[] {
  return territory.priorityAccounts.map((accountName) => {
    const token = normalizeToken(accountName)
    const match = liveProspects.find((prospect) => {
      if (!prospectMatchesTerritory(prospect, territory)) {
        return false
      }
      const businessName = normalizeToken(prospect.businessName)
      return businessName.includes(token) || token.includes(businessName)
    })

    return {
      name: accountName,
      inCatalog: Boolean(match),
      prospectId: match?.id,
      businessName: match?.businessName,
    }
  })
}

export function computeTerritoryLiveStats(
  territory: TerritoryConfig,
  liveProspects: ProspectForTerritoryMatch[],
  routeStopProspects: ProspectForTerritoryMatch[],
): TerritoryLiveStats {
  const prospects = getProspectsForTerritory(territory, liveProspects)
  const routeStops = getStopsForTerritory(territory, routeStopProspects)
  const routes = getRoutesForTerritory(territory, routeStopProspects)

  return {
    prospectCount: prospects.length,
    routeCount: routes.activeRouteCount,
    stopCount: routeStops.length,
    prospects,
    routeStops,
    hasLiveData: prospects.length > 0 || routeStops.length > 0,
  }
}

export function computeTerritoryDashboardStats(
  territory: TerritoryConfig,
  liveProspects: ProspectForTerritoryMatch[],
  routeStopProspects: ProspectForTerritoryMatch[],
): TerritoryDashboardStats {
  const live = computeTerritoryLiveStats(territory, liveProspects, routeStopProspects)

  return {
    ...live,
    topCities: getTopCitiesForTerritory(territory, liveProspects, routeStopProspects),
    priorityAccountMatches: getPriorityAccountMatches(territory, liveProspects),
    prospectIds: live.prospects.map((prospect) => prospect.id),
  }
}

export function computeAllTerritoryStats(
  territories: TerritoryConfig[],
  liveProspects: ProspectForTerritoryMatch[],
  routeStopProspects: ProspectForTerritoryMatch[],
) {
  return territories.map((territory) => ({
    territory,
    stats: computeTerritoryDashboardStats(territory, liveProspects, routeStopProspects),
  }))
}

export function countUniqueProspectsInTerritories(
  territories: TerritoryConfig[],
  liveProspects: ProspectForTerritoryMatch[],
) {
  const matched = new Set<string>()

  for (const territory of territories) {
    for (const prospect of liveProspects) {
      if (prospectMatchesTerritory(prospect, territory)) {
        matched.add(prospect.id)
      }
    }
  }

  return matched.size
}
