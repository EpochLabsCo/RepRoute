import { resolveCreatedAt, resolveLastVisitedAt, resolveVisitCount } from './visitTracking'

export type TerritoryPulseProspectInput = {
  id: string
  businessName: string
  city: string
  record?: {
    createdAt?: string
    catalogAddedAt?: string
    lastVisitedAt?: string | null
    visitCount?: number
    visitCompletedAt?: string
    routeCompleted?: boolean
  }
}

export type TerritoryPulseMetrics = {
  newProspects: number
  neverVisited: number
  overdueAccounts: number
  plannedStops: number
}

export type PriorityAccount = {
  id: string
  businessName: string
  city: string
  lastVisitLabel: string
  visitCount: number
  priorityRank: 1 | 2 | 3
  daysSinceLastVisit: number | null
  isInRoute: boolean
}

const MS_PER_DAY = 86_400_000

export function daysBetween(fromMs: number, toMs: number) {
  return Math.floor((toMs - fromMs) / MS_PER_DAY)
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isNewProspect(
  prospect: TerritoryPulseProspectInput,
  nowMs: number,
  windowDays = 30,
) {
  const createdAt = resolveCreatedAt(prospect.record)
  const createdMs = parseTimestamp(createdAt)

  if (createdMs === null) {
    return false
  }

  return daysBetween(createdMs, nowMs) <= windowDays
}

export function isNeverVisited(prospect: TerritoryPulseProspectInput) {
  return resolveVisitCount(prospect.record) === 0
}

export function isOverdueAccount(prospect: TerritoryPulseProspectInput, nowMs: number, overdueDays = 90) {
  const visitCount = resolveVisitCount(prospect.record)

  if (visitCount === 0) {
    return false
  }

  const lastVisitedMs = parseTimestamp(resolveLastVisitedAt(prospect.record))

  if (lastVisitedMs === null) {
    return false
  }

  return daysBetween(lastVisitedMs, nowMs) >= overdueDays
}

export function getPriorityRank(
  prospect: TerritoryPulseProspectInput,
  nowMs: number,
): 1 | 2 | 3 | null {
  if (isNeverVisited(prospect)) {
    return 1
  }

  const lastVisitedMs = parseTimestamp(resolveLastVisitedAt(prospect.record))

  if (lastVisitedMs === null) {
    return null
  }

  const daysSince = daysBetween(lastVisitedMs, nowMs)

  if (daysSince > 180) {
    return 2
  }

  if (daysSince > 90) {
    return 3
  }

  return null
}

export function formatLastVisitLabel(
  prospect: TerritoryPulseProspectInput,
  labels: { never: string; unknown: string },
) {
  if (isNeverVisited(prospect)) {
    return labels.never
  }

  const lastVisitedAt = resolveLastVisitedAt(prospect.record)

  if (!lastVisitedAt) {
    return labels.unknown
  }

  return new Date(lastVisitedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function computeTerritoryPulseMetrics(
  prospects: TerritoryPulseProspectInput[],
  plannedStops: number,
  nowMs = Date.now(),
): TerritoryPulseMetrics {
  let newProspects = 0
  let neverVisited = 0
  let overdueAccounts = 0

  for (const prospect of prospects) {
    if (isNewProspect(prospect, nowMs)) {
      newProspects += 1
    }

    if (isNeverVisited(prospect)) {
      neverVisited += 1
    }

    if (isOverdueAccount(prospect, nowMs)) {
      overdueAccounts += 1
    }
  }

  return {
    newProspects,
    neverVisited,
    overdueAccounts,
    plannedStops,
  }
}

export function buildPriorityAccounts(
  prospects: TerritoryPulseProspectInput[],
  routeIds: string[],
  labels: { never: string; unknown: string },
  limit = 5,
  nowMs = Date.now(),
): PriorityAccount[] {
  const routeSet = new Set(routeIds)

  return prospects
    .map((prospect) => {
      const priorityRank = getPriorityRank(prospect, nowMs)

      if (!priorityRank) {
        return null
      }

      const lastVisitedMs = parseTimestamp(resolveLastVisitedAt(prospect.record))

      return {
        id: prospect.id,
        businessName: prospect.businessName,
        city: prospect.city.trim() || '—',
        lastVisitLabel: formatLastVisitLabel(prospect, labels),
        visitCount: resolveVisitCount(prospect.record),
        priorityRank,
        daysSinceLastVisit:
          lastVisitedMs === null ? null : daysBetween(lastVisitedMs, nowMs),
        isInRoute: routeSet.has(prospect.id),
      }
    })
    .filter((account): account is PriorityAccount => Boolean(account))
    .sort((left, right) => {
      if (left.priorityRank !== right.priorityRank) {
        return left.priorityRank - right.priorityRank
      }

      const leftDays = left.daysSinceLastVisit ?? Number.MAX_SAFE_INTEGER
      const rightDays = right.daysSinceLastVisit ?? Number.MAX_SAFE_INTEGER

      if (leftDays !== rightDays) {
        return rightDays - leftDays
      }

      return left.businessName.localeCompare(right.businessName, undefined, { sensitivity: 'base' })
    })
    .slice(0, limit)
}
