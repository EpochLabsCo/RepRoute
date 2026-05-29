export type FollowUpRouteStatus = 'on-route' | 'saved' | 'not-in-route'

export type FollowUpStatus = 'pending' | 'scheduled' | 'completed'

export type FollowUpEntry = {
  id: string
  prospectId: string
  googlePlaceId: string
  businessName: string
  address: string
  category: string
  city: string
  phone: string
  contactName: string
  contactTitle: string
  contactEmail: string
  followUpDate: string
  followUpTime: string
  notes: string
  priority: string
  routeStatus: FollowUpRouteStatus
  status: FollowUpStatus
  completed: boolean
  completedAt: string
  createdAt: string
  updatedAt: string
}

export type FollowUpSection = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'completed'

export const DEFAULT_FOLLOW_UP_TIME = '09:00'

export function getFollowUpEntryId(prospectId: string) {
  return `followup:${prospectId}`
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveFollowUpRouteStatus(
  prospectId: string,
  routeIds: string[],
  savedIds: string[],
): FollowUpRouteStatus {
  if (routeIds.includes(prospectId)) {
    return 'on-route'
  }

  if (savedIds.includes(prospectId)) {
    return 'saved'
  }

  return 'not-in-route'
}

export function resolveFollowUpStatus(
  followUpDate: string,
  completed: boolean,
): FollowUpStatus {
  if (completed) {
    return 'completed'
  }

  if (followUpDate && isValidFollowUpDate(followUpDate)) {
    return 'scheduled'
  }

  return 'pending'
}

export function buildFollowUpSnapshot({
  prospectId,
  googlePlaceId = '',
  businessName,
  address,
  category,
  city,
  phone,
  contactName,
  contactTitle,
  contactEmail,
  notes,
  priority,
  routeIds,
  savedIds,
  followUpDate,
  followUpTime = DEFAULT_FOLLOW_UP_TIME,
  completed = false,
  completedAt = '',
  existing,
}: {
  prospectId: string
  googlePlaceId?: string
  businessName: string
  address: string
  category: string
  city: string
  phone: string
  contactName: string
  contactTitle: string
  contactEmail: string
  notes: string
  priority: string
  routeIds: string[]
  savedIds: string[]
  followUpDate: string
  followUpTime?: string
  completed?: boolean
  completedAt?: string
  existing?: FollowUpEntry | null
}) {
  const now = new Date().toISOString()
  const normalizedDate = followUpDate.trim()
  const status = resolveFollowUpStatus(normalizedDate, completed)

  return {
    id: existing?.id ?? getFollowUpEntryId(prospectId),
    prospectId,
    googlePlaceId: googlePlaceId.trim() || existing?.googlePlaceId || '',
    businessName: businessName.trim() || existing?.businessName || 'Unknown business',
    address: address.trim() || existing?.address || '',
    category: category.trim() || existing?.category || 'Business',
    city: city.trim() || existing?.city || '',
    phone: phone.trim() || existing?.phone || '',
    contactName: contactName.trim() || existing?.contactName || '',
    contactTitle: contactTitle.trim() || existing?.contactTitle || '',
    contactEmail: contactEmail.trim() || existing?.contactEmail || '',
    followUpDate: normalizedDate,
    followUpTime: followUpTime.trim() || existing?.followUpTime || DEFAULT_FOLLOW_UP_TIME,
    notes: notes.trim() || existing?.notes || '',
    priority: priority.trim() || existing?.priority || 'Unassigned',
    routeStatus: resolveFollowUpRouteStatus(prospectId, routeIds, savedIds),
    status,
    completed: completed ?? existing?.completed ?? false,
    completedAt: completedAt ?? existing?.completedAt ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  } satisfies FollowUpEntry
}

export function isValidFollowUpDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function getFollowUpSection(entry: FollowUpEntry, todayKey = getLocalDateKey()): FollowUpSection {
  if (entry.completed || entry.status === 'completed') {
    return 'completed'
  }

  if (!entry.followUpDate || !isValidFollowUpDate(entry.followUpDate)) {
    return 'unscheduled'
  }

  if (entry.followUpDate < todayKey) {
    return 'overdue'
  }

  if (entry.followUpDate === todayKey) {
    return 'today'
  }

  return 'upcoming'
}

export function compareFollowUpEntries(left: FollowUpEntry, right: FollowUpEntry, todayKey = getLocalDateKey()) {
  if (left.completed !== right.completed) {
    return left.completed ? 1 : -1
  }

  if (left.completed && right.completed) {
    return right.completedAt.localeCompare(left.completedAt)
  }

  const leftSection = getFollowUpSection(left, todayKey)
  const rightSection = getFollowUpSection(right, todayKey)
  const sectionRank: Record<FollowUpSection, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    unscheduled: 3,
    completed: 4,
  }

  if (leftSection !== rightSection) {
    return sectionRank[leftSection] - sectionRank[rightSection]
  }

  if (leftSection === 'unscheduled') {
    return right.createdAt.localeCompare(left.createdAt)
  }

  if (left.followUpDate !== right.followUpDate) {
    return left.followUpDate.localeCompare(right.followUpDate)
  }

  if (left.followUpTime !== right.followUpTime) {
    return left.followUpTime.localeCompare(right.followUpTime)
  }

  return left.businessName.localeCompare(right.businessName)
}

export function groupFollowUpsBySection(entries: FollowUpEntry[], todayKey = getLocalDateKey()) {
  const groups: Record<FollowUpSection, FollowUpEntry[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    unscheduled: [],
    completed: [],
  }

  for (const entry of [...entries].sort((left, right) => compareFollowUpEntries(left, right, todayKey))) {
    groups[getFollowUpSection(entry, todayKey)].push(entry)
  }

  return groups
}

export function migrateFollowUpsFromProspectRecords(
  records: Record<string, { followUpDate?: string; followUpTime?: string; notes?: string; followUpCompleted?: boolean; followUpCompletedAt?: string }>,
  existing: Record<string, FollowUpEntry>,
  routeIds: string[],
  savedIds: string[],
  resolveProspect: (prospectId: string) => {
    businessName: string
    address: string
    category: string
    city: string
    phone: string
    contactName: string
    contactTitle: string
    contactEmail: string
    notes: string
    priority: string
    googlePlaceId?: string
  } | null,
) {
  const merged = { ...existing }

  for (const [prospectId, record] of Object.entries(records)) {
    if (!record.followUpDate || !isValidFollowUpDate(record.followUpDate)) {
      continue
    }

    if (merged[prospectId]) {
      continue
    }

    const prospect = resolveProspect(prospectId)

    merged[prospectId] = buildFollowUpSnapshot({
      prospectId,
      googlePlaceId: prospect?.googlePlaceId ?? '',
      businessName: prospect?.businessName ?? prospectId,
      address: prospect?.address ?? '',
      category: prospect?.category ?? 'Business',
      city: prospect?.city ?? '',
      phone: prospect?.phone ?? '',
      contactName: prospect?.contactName ?? '',
      contactTitle: prospect?.contactTitle ?? '',
      contactEmail: prospect?.contactEmail ?? '',
      notes: record.notes ?? prospect?.notes ?? '',
      priority: prospect?.priority ?? 'Unassigned',
      routeIds,
      savedIds,
      followUpDate: record.followUpDate,
      followUpTime: record.followUpTime,
      completed: record.followUpCompleted ?? false,
      completedAt: record.followUpCompletedAt ?? '',
    })
  }

  return merged
}

export function sanitizeFollowUpEntry(value: unknown): FollowUpEntry | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const prospectId = typeof record.prospectId === 'string' ? record.prospectId : ''
  const followUpDate = typeof record.followUpDate === 'string' ? record.followUpDate : ''

  if (!prospectId) {
    return null
  }

  if (followUpDate && !isValidFollowUpDate(followUpDate)) {
    return null
  }

  const routeStatus =
    record.routeStatus === 'on-route' || record.routeStatus === 'saved' || record.routeStatus === 'not-in-route'
      ? record.routeStatus
      : 'not-in-route'

  const completed = record.completed === true
  const status =
    record.status === 'pending' || record.status === 'scheduled' || record.status === 'completed'
      ? record.status
      : resolveFollowUpStatus(followUpDate, completed)

  return {
    id: typeof record.id === 'string' ? record.id : getFollowUpEntryId(prospectId),
    prospectId,
    googlePlaceId: typeof record.googlePlaceId === 'string' ? record.googlePlaceId : '',
    businessName: typeof record.businessName === 'string' ? record.businessName : 'Unknown business',
    address: typeof record.address === 'string' ? record.address : '',
    category: typeof record.category === 'string' ? record.category : 'Business',
    city: typeof record.city === 'string' ? record.city : '',
    phone: typeof record.phone === 'string' ? record.phone : '',
    contactName: typeof record.contactName === 'string' ? record.contactName : '',
    contactTitle: typeof record.contactTitle === 'string' ? record.contactTitle : '',
    contactEmail: typeof record.contactEmail === 'string' ? record.contactEmail : '',
    followUpDate,
    followUpTime:
      typeof record.followUpTime === 'string' && record.followUpTime.trim()
        ? record.followUpTime
        : DEFAULT_FOLLOW_UP_TIME,
    notes: typeof record.notes === 'string' ? record.notes : '',
    priority: typeof record.priority === 'string' ? record.priority : 'Unassigned',
    routeStatus,
    status,
    completed,
    completedAt: typeof record.completedAt === 'string' ? record.completedAt : '',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  }
}

export function sanitizeFollowUpStore(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const next: Record<string, FollowUpEntry> = {}

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    const entry = sanitizeFollowUpEntry(entryValue)
    if (entry) {
      next[entry.prospectId || key] = entry
    }
  }

  return next
}
