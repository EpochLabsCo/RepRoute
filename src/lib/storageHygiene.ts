export function uniqueProspectIds(ids: string[]) {
  const seen = new Set<string>()
  const next: string[] = []

  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue
    }

    seen.add(id)
    next.push(id)
  }

  return next
}

export function pruneIdList(ids: string[], validIds: Set<string>) {
  return uniqueProspectIds(ids.filter((id) => validIds.has(id)))
}

export function pruneRecordKeys<T extends Record<string, unknown>>(
  records: T,
  validIds: Set<string>,
): T {
  const next = { ...records }
  let changed = false

  for (const key of Object.keys(next)) {
    if (!validIds.has(key)) {
      delete next[key]
      changed = true
    }
  }

  return changed ? next : records
}

export type StorageHygieneSnapshot<
  TProspectRecord extends Record<string, unknown>,
  TFollowUpEntry extends Record<string, unknown>,
> = {
  liveProspectIds: Set<string>
  savedIds: string[]
  routeIds: string[]
  prospectRecords: Record<string, TProspectRecord>
  followUpEntries: Record<string, TFollowUpEntry>
}

export function applyStorageHygiene<
  TProspectRecord extends Record<string, unknown>,
  TFollowUpEntry extends Record<string, unknown>,
>(snapshot: StorageHygieneSnapshot<TProspectRecord, TFollowUpEntry>) {
  const validIds = snapshot.liveProspectIds

  const savedIds = pruneIdList(snapshot.savedIds, validIds)
  const routeIds = pruneIdList(snapshot.routeIds, validIds)
  const prospectRecords = pruneRecordKeys(snapshot.prospectRecords, validIds)
  const followUpEntries = pruneRecordKeys(snapshot.followUpEntries, validIds)

  return {
    savedIds,
    routeIds,
    prospectRecords,
    followUpEntries,
    changed:
      savedIds.length !== snapshot.savedIds.length ||
      routeIds.length !== snapshot.routeIds.length ||
      savedIds.join('|') !== snapshot.savedIds.join('|') ||
      routeIds.join('|') !== snapshot.routeIds.join('|') ||
      prospectRecords !== snapshot.prospectRecords ||
      followUpEntries !== snapshot.followUpEntries,
  }
}
