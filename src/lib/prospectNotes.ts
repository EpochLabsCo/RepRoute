const LEGACY_LIVE_SEARCH_IMPORT_NOTE = 'imported from live search'

export function isLegacyAutoImportNote(notes: string) {
  const normalized = notes.trim().replace(/\.$/, '').toLowerCase()
  return normalized === LEGACY_LIVE_SEARCH_IMPORT_NOTE
}

export function normalizeProspectNotes(notes: string) {
  return isLegacyAutoImportNote(notes) ? '' : notes
}
