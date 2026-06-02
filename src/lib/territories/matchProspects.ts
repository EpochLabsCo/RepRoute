import type { TerritoryProspectRef } from './types'

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

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function citySegments(value: string) {
  return value
    .split(',')
    .map((part) => normalizeToken(part))
    .filter(Boolean)
}

/**
 * Match a prospect city or address against a territory city list.
 * Uses exact segment matching to reduce false positives (e.g. "San" vs "San Antonio").
 */
export function prospectMatchesTerritoryCities(
  prospect: ProspectForTerritoryMatch,
  territoryCities: string[],
) {
  const targets = territoryCities.map(normalizeToken).filter(Boolean)

  if (targets.length === 0) {
    return false
  }

  const prospectCity = normalizeToken(prospect.city)
  const addressSegments = citySegments(prospect.address)

  for (const target of targets) {
    if (prospectCity === target) {
      return true
    }

    if (prospectCity.startsWith(`${target},`) || prospectCity.includes(` ${target}`)) {
      return true
    }

    if (addressSegments.some((segment) => segment === target || segment.startsWith(`${target} `))) {
      return true
    }

    if (normalizeToken(prospect.address).includes(`, ${target},`) || normalizeToken(prospect.address).includes(`, ${target} `)) {
      return true
    }
  }

  return false
}

function toTerritoryProspectRef(prospect: ProspectForTerritoryMatch): TerritoryProspectRef {
  return {
    id: prospect.id,
    businessName: prospect.businessName,
    city: prospect.city,
  }
}

export function computeTerritoryLiveStats(
  territoryCities: string[],
  liveProspects: ProspectForTerritoryMatch[],
  routeStopProspects: ProspectForTerritoryMatch[],
): TerritoryLiveStats {
  const prospects = liveProspects
    .filter((prospect) => prospectMatchesTerritoryCities(prospect, territoryCities))
    .map(toTerritoryProspectRef)

  const routeStops = routeStopProspects
    .filter((prospect) => prospectMatchesTerritoryCities(prospect, territoryCities))
    .map(toTerritoryProspectRef)

  const stopCount = routeStops.length
  const routeCount = stopCount > 0 ? 1 : 0

  return {
    prospectCount: prospects.length,
    routeCount,
    stopCount,
    prospects,
    routeStops,
    hasLiveData: prospects.length > 0 || stopCount > 0,
  }
}

export function countProspectsInTerritories(
  territoryCityLists: string[][],
  liveProspects: ProspectForTerritoryMatch[],
) {
  const matchedIds = new Set<string>()

  for (const cities of territoryCityLists) {
    for (const prospect of liveProspects) {
      if (prospectMatchesTerritoryCities(prospect, cities)) {
        matchedIds.add(prospect.id)
      }
    }
  }

  return matchedIds.size
}
