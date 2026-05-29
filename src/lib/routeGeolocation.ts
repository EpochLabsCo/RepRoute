export const GPS_STALE_MS = 2 * 60 * 1000
export const GPS_WATCH_MAX_AGE_MS = 15_000
export const GPS_REFRESH_MAX_AGE_MS = 0
export const GPS_INITIAL_MAX_AGE_MS = 0

export type UserGpsFix = {
  lat: number
  lng: number
  accuracyMeters: number | null
  updatedAt: number
}

export type GeolocationRefreshStatus = 'success' | 'denied' | 'error' | 'unsupported' | 'timeout'

export type GeolocationRefreshResult =
  | { status: 'success'; fix: UserGpsFix }
  | { status: Exclude<GeolocationRefreshStatus, 'success'> }

export function isGpsFixFresh(fix: UserGpsFix | null, maxAgeMs = GPS_STALE_MS) {
  if (!fix) {
    return false
  }

  return Date.now() - fix.updatedAt <= maxAgeMs
}

export function userGpsFixFromPosition(position: GeolocationPosition): UserGpsFix {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    updatedAt: Date.now(),
  }
}

export function refreshUserGpsPosition(maximumAge = GPS_REFRESH_MAX_AGE_MS): Promise<GeolocationRefreshResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ status: 'unsupported' })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'success',
          fix: userGpsFixFromPosition(position),
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ status: 'denied' })
          return
        }

        if (error.code === error.TIMEOUT) {
          resolve({ status: 'timeout' })
          return
        }

        resolve({ status: 'error' })
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge,
      },
    )
  })
}

export function formatGpsTimestamp(updatedAt: number | null) {
  if (!updatedAt) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(updatedAt))
}
