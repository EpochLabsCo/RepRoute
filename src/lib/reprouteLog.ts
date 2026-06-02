/**
 * Recoverable issues: warn in the console for debugging without surfacing raw API text in the UI.
 */
export function warnRecoverable(scope: string, message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.warn(`[RepRoute] ${scope}: ${message}`, detail)
    return
  }

  console.warn(`[RepRoute] ${scope}: ${message}`)
}

export function logRecoverable(scope: string, message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info(`[RepRoute] ${scope}: ${message}`, detail)
    return
  }

  console.info(`[RepRoute] ${scope}: ${message}`)
}
