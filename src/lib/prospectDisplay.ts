const PHONE_UNAVAILABLE = 'Phone unavailable'
const WEBSITE_UNAVAILABLE = 'Website unavailable'

export function safePhone(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || trimmed === PHONE_UNAVAILABLE) {
    return ''
  }

  return trimmed
}

export function formatPhoneDisplay(value: string | null | undefined) {
  const safe = safePhone(value)
  return safe || PHONE_UNAVAILABLE
}

export function safeWebsite(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || trimmed === WEBSITE_UNAVAILABLE) {
    return ''
  }

  return trimmed
}

export function formatWebsiteDisplay(value: string | null | undefined) {
  const safe = safeWebsite(value)
  return safe || WEBSITE_UNAVAILABLE
}

export function safeAddress(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed || 'Address not set'
}

export function isUsablePhone(value: string | null | undefined) {
  return Boolean(safePhone(value))
}

export function isUsableWebsite(value: string | null | undefined) {
  return Boolean(safeWebsite(value))
}
