/** Google Places location bias / nearby search maximum radius. */
export const MAX_RADIUS_METERS = 50_000

export const MILES_TO_METERS = 1609.34

/** Largest mileage preset allowed in Live Search (stays under {@link MAX_RADIUS_METERS}). */
export const MAX_SEARCH_RADIUS_MILES = 30

export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS
}

export function clampPlacesRadiusMeters(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) {
    return 0
  }

  return Math.min(meters, MAX_RADIUS_METERS)
}

export function capSearchRadiusMiles(miles: number): number {
  if (!Number.isFinite(miles) || miles <= 0) {
    return miles
  }

  return Math.min(miles, MAX_SEARCH_RADIUS_MILES)
}

export function resolvePlacesSearchRadius(miles: number) {
  const selectedMiles = miles
  const convertedMeters = milesToMeters(miles)
  const finalMeters = clampPlacesRadiusMeters(convertedMeters)

  return {
    selectedMiles,
    convertedMeters,
    finalMeters,
    wasClamped: convertedMeters > MAX_RADIUS_METERS,
  }
}

type FailedPlacesSearch = {
  term: string
  result: { ok: false; error: string; details: unknown }
}

export function resolveLiveSearchFailureMessage(
  failedResults: FailedPlacesSearch[],
  {
    fallbackMessage,
    radiusTooLargeMessage,
  }: {
    fallbackMessage: string
    radiusTooLargeMessage: string
  },
): { message: string } {
  if (failedResults.length === 0) {
    return { message: fallbackMessage }
  }

  const hasRadiusError = failedResults.some((entry) =>
    isGooglePlacesRadiusLimitError(entry.result.error, entry.result.details),
  )

  if (hasRadiusError) {
    return { message: radiusTooLargeMessage }
  }

  console.warn(
    '[RepRoute] Live Search failed terms',
    failedResults.map((entry) => ({ term: entry.term, error: entry.result.error })),
  )

  const uniqueErrors = [...new Set(failedResults.map((entry) => entry.result.error))]

  if (uniqueErrors.length === 1) {
    return { message: uniqueErrors[0] }
  }

  return { message: fallbackMessage }
}

export function isGooglePlacesRadiusLimitError(error: string, details?: unknown): boolean {
  const haystack = `${error} ${JSON.stringify(details ?? '')}`.toLowerCase()

  return (
    haystack.includes('50000') ||
    (haystack.includes('radius') &&
      (haystack.includes('exceed') ||
        haystack.includes('invalid') ||
        haystack.includes('maximum') ||
        haystack.includes('must be')))
  )
}
