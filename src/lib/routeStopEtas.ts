import type { RouteSegmentLeg } from './routeDistanceMetrics'

export type RouteStopEtaStatus = 'completed' | 'scheduled' | 'unavailable'

export type RouteStopEtaDisplay = {
  status: RouteStopEtaStatus
  primaryLabel: string
  driveTimeLabel: string | null
  distanceLabel: string | null
}

export type RouteStopEtaInput = {
  id: string
  routeCompleted: boolean
  visitCompletedAt: string
}

export const DEFAULT_STOP_DURATION_OPTIONS = [0, 10, 15, 30, 45] as const

export type DefaultStopDurationMinutes = (typeof DEFAULT_STOP_DURATION_OPTIONS)[number]

export function sanitizeDefaultStopDurationMinutes(value: unknown): DefaultStopDurationMinutes {
  const numeric = typeof value === 'number' ? value : Number(value)
  return DEFAULT_STOP_DURATION_OPTIONS.includes(numeric as DefaultStopDurationMinutes)
    ? (numeric as DefaultStopDurationMinutes)
    : 15
}

export function parseDurationSecondsFromText(text: string) {
  const normalized = text.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  let total = 0
  const hourMatch = normalized.match(/(\d+)\s*h(?:our|rs?)?/)
  const minuteMatch = normalized.match(/(\d+)\s*m(?:in|ins?)?/)

  if (hourMatch) {
    total += Number(hourMatch[1]) * 3600
  }

  if (minuteMatch) {
    total += Number(minuteMatch[1]) * 60
  }

  return total > 0 ? total : null
}

export function getLegDriveSeconds(leg: RouteSegmentLeg | null | undefined) {
  if (!leg) {
    return null
  }

  if (leg.source === 'at-route-start') {
    return 0
  }

  if (typeof leg.durationSeconds === 'number' && Number.isFinite(leg.durationSeconds)) {
    return leg.durationSeconds
  }

  return parseDurationSecondsFromText(leg.durationText)
}

function formatDriveTimeLabel(seconds: number, label: (minutes: number) => string) {
  if (seconds <= 0) {
    return null
  }

  return label(Math.max(1, Math.round(seconds / 60)))
}

function formatDistanceLabel(leg: RouteSegmentLeg | null | undefined) {
  const distance = leg?.distanceText?.trim()
  if (!distance || leg?.source === 'at-route-start') {
    return null
  }

  return distance
}

export function buildRouteStopEtaSchedule({
  routeStops,
  legByStopId,
  nowMs,
  defaultStopDurationMinutes,
  gpsDriveSecondsToNextStop,
  labels,
}: {
  routeStops: RouteStopEtaInput[]
  legByStopId: Record<string, RouteSegmentLeg | null | undefined>
  nowMs: number
  defaultStopDurationMinutes: number
  gpsDriveSecondsToNextStop: number | null
  labels: {
    arriveBy: (timeLabel: string) => string
    completedAt: (timeLabel: string) => string
    etaUnavailable: string
    minDrive: (minutes: number) => string
    formatTime: (timestampMs: number) => string
  }
}): Record<string, RouteStopEtaDisplay> {
  const schedule: Record<string, RouteStopEtaDisplay> = {}
  const firstIncompleteIndex = routeStops.findIndex((stop) => !stop.routeCompleted)
  const stopBufferMs = Math.max(0, defaultStopDurationMinutes) * 60 * 1000

  if (firstIncompleteIndex === -1) {
    for (const stop of routeStops) {
      schedule[stop.id] = buildCompletedDisplay(stop, labels)
    }

    return schedule
  }

  let arrivalMs = nowMs

  for (let index = 0; index < routeStops.length; index += 1) {
    const stop = routeStops[index]
    const leg = legByStopId[stop.id] ?? null

    if (stop.routeCompleted) {
      schedule[stop.id] = buildCompletedDisplay(stop, labels)
      continue
    }

    const driveSeconds =
      index === firstIncompleteIndex && gpsDriveSecondsToNextStop != null
        ? gpsDriveSecondsToNextStop
        : getLegDriveSeconds(leg)

    if (driveSeconds === null) {
      schedule[stop.id] = {
        status: 'unavailable',
        primaryLabel: labels.etaUnavailable,
        driveTimeLabel: null,
        distanceLabel: formatDistanceLabel(leg),
      }
      continue
    }

    if (index === firstIncompleteIndex) {
      arrivalMs = nowMs + driveSeconds * 1000
    } else if (index > firstIncompleteIndex) {
      arrivalMs += stopBufferMs + driveSeconds * 1000
    }

    schedule[stop.id] = {
      status: 'scheduled',
      primaryLabel: labels.arriveBy(labels.formatTime(arrivalMs)),
      driveTimeLabel: formatDriveTimeLabel(driveSeconds, labels.minDrive),
      distanceLabel: formatDistanceLabel(leg),
    }
  }

  return schedule
}

function buildCompletedDisplay(
  stop: RouteStopEtaInput,
  labels: {
    completedAt: (timeLabel: string) => string
    etaUnavailable: string
    formatTime: (timestampMs: number) => string
  },
): RouteStopEtaDisplay {
  const completedMs = Date.parse(stop.visitCompletedAt)

  if (!Number.isFinite(completedMs)) {
    return {
      status: 'completed',
      primaryLabel: labels.etaUnavailable,
      driveTimeLabel: null,
      distanceLabel: null,
    }
  }

  return {
    status: 'completed',
    primaryLabel: labels.completedAt(labels.formatTime(completedMs)),
    driveTimeLabel: null,
    distanceLabel: null,
  }
}
