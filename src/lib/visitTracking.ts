export type VisitTrackingFields = {
  createdAt?: string
  catalogAddedAt?: string
  lastVisitedAt?: string | null
  visitCount?: number
  visitCompletedAt?: string
  routeCompleted?: boolean
  lastContactDate?: string
}

export function resolveVisitCount(record: VisitTrackingFields | undefined) {
  if (typeof record?.visitCount === 'number' && Number.isFinite(record.visitCount)) {
    return Math.max(0, Math.floor(record.visitCount))
  }

  if (record?.lastVisitedAt || record?.routeCompleted) {
    return 1
  }

  return 0
}

export function resolveCreatedAt(
  record: VisitTrackingFields | undefined,
  fallbackIso?: string,
) {
  if (record?.createdAt) {
    return record.createdAt
  }

  if (record?.catalogAddedAt) {
    return record.catalogAddedAt
  }

  return fallbackIso ?? new Date().toISOString()
}

export function resolveLastVisitedAt(record: VisitTrackingFields | undefined) {
  if (record?.lastVisitedAt) {
    return record.lastVisitedAt
  }

  if (record?.visitCompletedAt) {
    return record.visitCompletedAt
  }

  return null
}

export function buildVisitCompletionPatch(
  current: VisitTrackingFields | undefined,
  completedAt = new Date().toISOString(),
): VisitTrackingFields {
  return {
    ...current,
    routeCompleted: true,
    visitCompletedAt: completedAt,
    lastVisitedAt: completedAt,
    visitCount: resolveVisitCount(current) + 1,
    lastContactDate: completedAt.slice(0, 10),
  }
}

export function buildVisitUncompletePatch(
  current: VisitTrackingFields | undefined,
): VisitTrackingFields {
  return {
    ...current,
    routeCompleted: false,
    visitCompletedAt: '',
  }
}
